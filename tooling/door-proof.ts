import { randomUUID } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadavg } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { atoiConfig } from "../atoi.config.ts";
import { scrubCredentials, serializeProof } from "./scrub.ts";

type Check = { claim: string; source: string; held: boolean; observed: boolean; evidence: string };
type Exchange = { request: string; status: number | null; headers: Record<string, string>; body: string; error?: string };

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const flag = (name: string, fallback: string) => {
  const index = argv.indexOf(`--${name}`);
  return index >= 0 ? argv[index + 1] : fallback;
};
const resource = flag("resource", atoiConfig.door.resource);
const scope = flag("scope", atoiConfig.door.scope);
const probeClientId = flag("client-id", "https://claude.ai/oauth/claude-code-client-metadata");
const probeRedirect = flag("redirect-uri", "http://127.0.0.1:49152/callback");
const loadAtStart = loadavg();
const checks: Check[] = [];
const exchanges: Exchange[] = [];
const SPEC = "https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization";
const CLAUDE = "https://claude.com/docs/connectors/building/authentication";
const OPENAI = "https://developers.openai.com/plugins/build/auth";
const RULING = "~/.agents/artifacts/findings/atoi/atoi-mcp-oauth-front-spec-20260916.md";
const KEPT_HEADERS = ["location", "www-authenticate", "content-type", "cache-control", "access-control-allow-origin"];

function check(claim: string, source: string, held: boolean, evidence: string, observed = true) {
  checks.push({ claim: scrubCredentials(claim), source: scrubCredentials(source), held: observed && held, observed, evidence: scrubCredentials(evidence).slice(0, 600) });
  return observed && held;
}

function unreached(claim: string, source: string, because: string) {
  return check(claim, source, false, `unobserved: ${because}`, false);
}

async function exchange(label: string, url: string, init: RequestInit = {}): Promise<Exchange> {
  const record: Exchange = { request: `${init.method ?? "GET"} ${url}`, status: null, headers: {}, body: "" };
  try {
    const response = await fetch(url, { ...init, redirect: "manual", signal: AbortSignal.timeout(15_000) });
    record.status = response.status;
    for (const name of KEPT_HEADERS) {
      const value = response.headers.get(name);
      if (value !== null) record.headers[name] = value;
    }
    record.body = await response.text();
  } catch (error) {
    record.error = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }
  exchanges.push({
    ...record,
    request: scrubCredentials(`${label}: ${record.request}`),
    headers: Object.fromEntries(Object.entries(record.headers).map(([name, value]) => [name, scrubCredentials(value)])),
    body: scrubCredentials(record.body).slice(0, 1_500),
    ...(record.error ? { error: scrubCredentials(record.error) } : {}),
  });
  return record;
}

const describe = (response: Exchange) =>
  response.error
    ? `request failed: ${response.error}`
    : `${response.status}${response.headers.location ? ` → ${scrubCredentials(response.headers.location)}` : ""} ${response.headers["content-type"] ?? ""} ${scrubCredentials(response.body).slice(0, 160)}`.trim();

function parseChallenge(header: string | undefined) {
  if (!header || !/^\s*Bearer\b/i.test(header)) return null;
  const params: Record<string, string> = {};
  for (const match of header.matchAll(/([a-zA-Z_]+)="([^"]*)"/g)) params[match[1].toLowerCase()] = match[2];
  return params;
}

function json(response: Exchange): Record<string, any> | null {
  try {
    const value = JSON.parse(response.body);
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch {
    return null;
  }
}

const isHttps = (value: unknown) => {
  try {
    return new URL(String(value)).protocol === "https:";
  } catch {
    return false;
  }
};

async function main() {
  const resourceUrl = new URL(resource);
  const mcp = await exchange("unauthenticated MCP request", resource, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2026-07-28",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
  });
  const challenge = parseChallenge(mcp.headers["www-authenticate"]);
  if (mcp.error) {
    unreached("an unauthenticated MCP request is refused by the door itself: 401 with a Bearer challenge", SPEC, mcp.error);
  } else {
    check(
      "an unauthenticated MCP request is refused by the door itself: 401 with a Bearer challenge",
      `${SPEC} §Error Handling; RFC 6750 §3`,
      mcp.status === 401 && challenge !== null,
      `${describe(mcp)} | WWW-Authenticate: ${mcp.headers["www-authenticate"] ?? "absent"}`,
    );
  }
  check(
    "the 401 carries a Bearer challenge with an https resource_metadata",
    `${CLAUDE} §DCR and CIMD details ("Always return a 401 with a WWW-Authenticate header")`,
    Boolean(challenge?.resource_metadata && isHttps(challenge.resource_metadata)),
    mcp.headers["www-authenticate"] ?? "no WWW-Authenticate header",
    !mcp.error,
  );
  check(
    `the challenge names scope="${scope}"`,
    `${SPEC} §Scope Selection Strategy; ${RULING} §3.3`,
    challenge?.scope === scope,
    mcp.headers["www-authenticate"] ?? "no WWW-Authenticate header",
    !mcp.error,
  );

  const pathMetadata = `${resourceUrl.origin}/.well-known/oauth-protected-resource${resourceUrl.pathname === "/" ? "" : resourceUrl.pathname}`;
  const rootMetadata = `${resourceUrl.origin}/.well-known/oauth-protected-resource`;
  let prm: Record<string, any> | null = null;
  for (const [label, url] of [
    ["path-inserted protected resource metadata", pathMetadata],
    ["root protected resource metadata", rootMetadata],
  ] as const) {
    const response = await exchange(label, url);
    const document = json(response);
    check(
      `${label} is served at ${url} as JSON, with no redirect`,
      `${SPEC}/authorization-server-discovery §Protected Resource Metadata Discovery Requirements`,
      response.status === 200 && document !== null,
      describe(response),
      !response.error,
    );
    prm ??= response.status === 200 ? document : null;
  }
  if (challenge?.resource_metadata && ![pathMetadata, rootMetadata].includes(challenge.resource_metadata)) {
    const response = await exchange("challenge-named protected resource metadata", challenge.resource_metadata);
    prm = response.status === 200 ? json(response) ?? prm : prm;
  }

  if (!prm) {
    for (const claim of [
      `metadata resource equals ${resource} exactly`,
      "metadata names an https authorization server first",
      `metadata scopes_supported includes ${scope} and not offline_access`,
    ]) unreached(claim, `${SPEC}/authorization-server-discovery`, "no protected resource metadata was served");
  } else {
    check(`metadata resource equals ${resource} exactly`, `${CLAUDE} ("must match your MCP server URL exactly as the user enters it")`, prm.resource === resource, JSON.stringify(prm.resource));
    check("metadata names an https authorization server first", `${SPEC}/authorization-server-discovery §Authorization Server Location`, Array.isArray(prm.authorization_servers) && isHttps(prm.authorization_servers[0]), JSON.stringify(prm.authorization_servers));
    check(
      `metadata scopes_supported includes ${scope} and not offline_access`,
      `${SPEC} §Refresh Tokens; ${RULING} §3.3`,
      Array.isArray(prm.scopes_supported) && prm.scopes_supported.includes(scope) && !prm.scopes_supported.includes("offline_access"),
      JSON.stringify(prm.scopes_supported),
    );
  }

  const issuer = Array.isArray(prm?.authorization_servers) ? String(prm?.authorization_servers[0]) : null;
  let as: Record<string, any> | null = null;
  if (issuer && isHttps(issuer)) {
    const issuerUrl = new URL(issuer);
    const suffix = issuerUrl.pathname === "/" ? "" : issuerUrl.pathname;
    const response = await exchange("authorization server metadata", `${issuerUrl.origin}/.well-known/oauth-authorization-server${suffix}`);
    as = response.status === 200 ? json(response) : null;
    check("authorization server metadata is served as JSON, with no redirect", `${SPEC}/authorization-server-discovery §Authorization Server Metadata Discovery`, as !== null, describe(response), !response.error);
  } else {
    unreached("authorization server metadata is served as JSON, with no redirect", `${SPEC}/authorization-server-discovery`, "no authorization server was named");
  }

  const asClaims: Array<[string, string, (doc: Record<string, any>) => boolean, (doc: Record<string, any>) => unknown]> = [
    ["issuer equals the named authorization server exactly", `${SPEC}/authorization-server-discovery ("MUST be identical")`, (d) => d.issuer === issuer, (d) => d.issuer],
    ["authorization_endpoint and token_endpoint are https", `${SPEC} §Authorization Flow Steps`, (d) => isHttps(d.authorization_endpoint) && isHttps(d.token_endpoint), (d) => [d.authorization_endpoint, d.token_endpoint]],
    ["code_challenge_methods_supported includes S256", `${SPEC}/security-considerations §Authorization Code Protection`, (d) => Array.isArray(d.code_challenge_methods_supported) && d.code_challenge_methods_supported.includes("S256"), (d) => d.code_challenge_methods_supported],
    ["client_id_metadata_document_supported is true and token_endpoint_auth_methods_supported includes none", `${CLAUDE} §DCR and CIMD details`, (d) => d.client_id_metadata_document_supported === true && Array.isArray(d.token_endpoint_auth_methods_supported) && d.token_endpoint_auth_methods_supported.includes("none"), (d) => [d.client_id_metadata_document_supported, d.token_endpoint_auth_methods_supported]],
    ["authorization_response_iss_parameter_supported is true", `${OPENAI} §Protect callbacks with issuer identification`, (d) => d.authorization_response_iss_parameter_supported === true, (d) => d.authorization_response_iss_parameter_supported],
    ["grant_types_supported includes authorization_code and refresh_token", `${RULING} §3.6`, (d) => Array.isArray(d.grant_types_supported) && ["authorization_code", "refresh_token"].every((g) => d.grant_types_supported.includes(g)), (d) => d.grant_types_supported],
    ["registration_endpoint is https (the DCR fallback Cursor documents)", `https://cursor.com/docs/mcp; ${RULING} §3.4`, (d) => isHttps(d.registration_endpoint), (d) => d.registration_endpoint],
    ["scopes_supported lists offline_access, so hosted clients ask for refresh", `${CLAUDE} §DCR and CIMD details`, (d) => Array.isArray(d.scopes_supported) && d.scopes_supported.includes("offline_access"), (d) => d.scopes_supported],
  ];
  for (const [claim, source, test, show] of asClaims) {
    if (as) check(claim, source, test(as), JSON.stringify(show(as)));
    else unreached(claim, source, "no authorization server metadata was served");
  }

  if (as && isHttps(as.authorization_endpoint)) {
    const authorize = new URL(as.authorization_endpoint);
    authorize.search = new URLSearchParams({
      response_type: "code",
      client_id: probeClientId,
      redirect_uri: probeRedirect,
      state: `door-proof-${randomUUID()}`,
      resource,
      scope,
    }).toString();
    const response = await exchange("authorization request without PKCE", authorize.toString());
    let location: URL | null = null;
    try {
      location = response.headers.location ? new URL(response.headers.location) : null;
    } catch {}
    const refused = location !== null && location.origin === new URL(probeRedirect).origin && location.searchParams.has("error");
    check(
      "an authorization request without PKCE is refused back to the client's redirect with error and iss",
      `${SPEC} §Authorization Response Validation; ${OPENAI} ("Return iss in every successful and error authorization response")`,
      refused && location?.searchParams.get("iss") === as.issuer,
      describe(response),
      !response.error,
    );
  } else {
    unreached("an authorization request without PKCE is refused back to the client's redirect with error and iss", SPEC, "no authorization endpoint was advertised");
  }

  if (as && isHttps(as.token_endpoint)) {
    const response = await exchange("token request with an unknown code", as.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: `door-proof-${randomUUID()}`,
        redirect_uri: probeRedirect,
        client_id: probeClientId,
        code_verifier: randomUUID() + randomUUID(),
        resource,
      }).toString(),
    });
    const body = json(response);
    check(
      "the token endpoint takes form-urlencoded and answers an unknown code with an RFC 6749 error",
      `${CLAUDE} §Token refresh ("must accept Content-Type: application/x-www-form-urlencoded")`,
      response.status === 400 && ["invalid_grant", "invalid_request", "invalid_client"].includes(String(body?.error)),
      describe(response),
      !response.error,
    );
  } else {
    unreached("the token endpoint takes form-urlencoded and answers an unknown code with an RFC 6749 error", SPEC, "no token endpoint was advertised");
  }

  const contradicted = checks.some((c) => c.observed && !c.held);
  const unobserved = checks.some((c) => !c.observed);
  const status = contradicted ? "failed" : unobserved ? "inconclusive" : "proven";
  const receipt = {
    runId: randomUUID(),
    timestamp: new Date().toISOString(),
    resource,
    scope,
    status,
    held: checks.filter((c) => c.held).length,
    total: checks.length,
    load: { start: loadAtStart.map((v) => Math.round(v * 100) / 100), end: loadavg().map((v) => Math.round(v * 100) / 100) },
    checks,
    exchanges,
    proofClass:
      "Unauthenticated discovery of the MCP door as a hosted client meets it: the 401 challenge, protected resource and authorization server metadata, an authorization request refused for missing PKCE, and a token request with an unknown code. No credential is used. Not proven here: consent, token issuance, audience binding, refresh rotation, revocation, or any real client's login.",
  };

  const runDir = join(repoRoot, ".artifacts/door-proof", receipt.runId);
  mkdirSync(runDir, { recursive: true });
  const receiptJson = serializeProof(receipt);
  writeFileSync(join(runDir, "receipt.json"), receiptJson);

  if (argv.includes("--record")) {
    const proofsDir = join(repoRoot, "docs/proofs/door");
    mkdirSync(proofsDir, { recursive: true });
    const file = `${receipt.timestamp.replace(/[:.]/g, "-")}.json`;
    writeFileSync(join(proofsDir, file), receiptJson);
    writeIndex(proofsDir);
  }

  for (const c of checks) console.error(`${c.held ? "held" : c.observed ? "FAILED" : "unobserved"}: ${c.claim}`);
  console.log(serializeProof({ resource, status, held: receipt.held, total: receipt.total, receipt: join(runDir, "receipt.json") }));
  process.exitCode = status === "proven" ? 0 : status === "failed" ? 1 : 2;
}

function writeIndex(proofsDir: string) {
  const receipts = readdirSync(proofsDir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => ({ file: entry, data: JSON.parse(readFileSync(join(proofsDir, entry), "utf8")) }))
    .sort((a, b) => b.data.timestamp.localeCompare(a.data.timestamp));
  const lines = [
    "# Door proofs",
    "",
    "Each row is one run of `pnpm proof:door`: an unauthenticated walk of the discovery chain a hosted client (Claude.ai, ChatGPT, Claude Code, Codex, Cursor) follows to reach Atoi's MCP door over OAuth. It uses no credential. `tooling/smoke.ts` refuses a remote entry in `plugins/atoi/mcp.json` until the newest receipt for that URL is proven.",
    "",
    "Receipt fields keep their existing shape. `tooling/scrub.ts` sanitizes every receipt field and the generated index before writing: service, host, OAuth access, refresh and authorization-code credentials; Authorization, Cookie and Set-Cookie values; and code, code_verifier, refresh_token and access_token fields in JSON, forms and callback URLs. Redacted values use `<redacted>`. Exchange bodies and check evidence are sanitized before truncation; checks still inspect the original in-memory response. Run the isolated synthetic regression suite with `node --test --test-concurrency=1 tooling/scrub.test.ts`.",
    "",
    "| Run (UTC) | Resource | Status | Held | Load (1m, start → end) | Receipt |",
    "| --- | --- | --- | --- | --- | --- |",
    ...receipts.map(({ file, data }) =>
      `| ${data.timestamp.replace("T", " ").slice(0, 16)} | \`${data.resource}\` | ${data.status} | ${data.held}/${data.total} | ${data.load.start[0]} → ${data.load.end[0]} | [json](${file}) |`,
    ),
    "",
    "The spec each claim cites is `~/.agents/artifacts/findings/atoi/atoi-mcp-oauth-front-spec-20260916.md` (rulings 2026-09-16: resource `https://atoi.app/api/mcp`, one `operator` scope).",
    "",
  ];
  writeFileSync(join(proofsDir, "README.md"), scrubCredentials(lines.join("\n")));
}

try {
  await main();
} catch (error) {
  console.error(scrubCredentials(error instanceof Error ? `${error.name}: ${error.message}` : String(error)));
  process.exitCode = 1;
}
