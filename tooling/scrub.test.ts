import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createContext, runInContext } from "node:vm";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runDir = join(root, ".artifacts/synthetic-proof");
const require = createRequire(import.meta.url);
const compiled = new Map<string, string>();
const marker = "fixture-visible";
const sourceRevision = process.env.ATOI_PROOF_TEST_REVISION;
assert(!sourceRevision || /^[a-f0-9]{40}$/.test(sourceRevision), "baseline tests require a full commit SHA");
type Fixture = { label: string; text: string; secrets: string[] };

const fixtures: Fixture[] = [
  ...["service", "host", "oauth", "refresh", "code"].map((prefix) => {
    const secret = ["atoi", prefix, "a1".repeat(32)].join("_");
    return { label: `${prefix} prefix`, text: `${marker} ${secret}`, secrets: [secret] };
  }),
  ...["Authorization", "Cookie", "Set-Cookie", "code", "code_verifier", "refresh_token", "access_token"].flatMap((field) => {
    const secret = `synthetic-${field.toLowerCase()}-credential`;
    const value = field === "Authorization" ? `Bearer ${secret}` : field.includes("Cookie") ? `session=${secret}; other=${secret}` : secret;
    return [
      { label: `JSON ${field}`, text: JSON.stringify({ [field]: value, trace: marker }), secrets: [secret] },
      { label: `escaped JSON ${field}`, text: `response ${JSON.stringify({ body: JSON.stringify({ [field.toUpperCase()]: value }), trace: marker })}`, secrets: [secret] },
    ];
  }),
  ...["code", "code_verifier", "refresh_token", "access_token"].map((field) => {
    const secret = `synthetic-${field}-form`;
    return { label: `form ${field}`, text: new URLSearchParams({ [field]: secret, trace: marker }).toString(), secrets: [secret] };
  }),
  ...["Authorization", "Cookie", "Set-Cookie"].map((field) => {
    const secret = `synthetic-${field.toLowerCase()}-header`;
    return { label: `header ${field}`, text: `${field}: ${field === "Authorization" ? "Bearer " : "session="}${secret}\r\nTrace: ${marker}`, secrets: [secret] };
  }),
  { label: "callback code", text: `https://client.invalid/callback?code=synthetic-callback&state=${marker}`, secrets: ["synthetic-callback"] },
  { label: "encoded form key", text: `co%64e=synthetic%2Bencoded%2Fvalue&trace=${marker}`, secrets: ["synthetic%2Bencoded%2Fvalue", "synthetic+encoded/value"] },
  { label: "escaped JSON key", text: `response {"co\\u0064e":"synthetic-escaped-key","trace":"${marker}"}`, secrets: ["synthetic-escaped-key"] },
  { label: "quoted form", text: `code_verifier='synthetic quoted verifier' trace=${marker}`, secrets: ["synthetic quoted verifier"] },
  { label: "nested JSON log", text: `response ${JSON.stringify({ headers: { Authorization: "Bearer synthetic-nested-header" }, trace: marker })}`, secrets: ["synthetic-nested-header"] },
  { label: "nested sensitive object", text: `response ${JSON.stringify({ code: { value: "synthetic-nested-code" }, trace: marker })}`, secrets: ["synthetic-nested-code"] },
  { label: "header tuples", text: JSON.stringify({ headers: [["Authorization", "Bearer synthetic-header-tuple"], ["Cookie", "session=synthetic-cookie-tuple"]], trace: marker }), secrets: ["synthetic-header-tuple", "synthetic-cookie-tuple"] },
  { label: "split command arguments", text: JSON.stringify({ argv: ["client", "--code", "synthetic-argument-code", "--code-verifier", "synthetic-argument-verifier"], trace: marker }), secrets: ["synthetic-argument-code", "synthetic-argument-verifier"] },
  { label: "truncated JSON", text: `${marker} {"code_verifier":"synthetic-truncated-verifier`, secrets: ["synthetic-truncated-verifier"] },
  { label: "malformed encoded form", text: `co%64e=synthetic-malformed%2&trace=${marker}`, secrets: ["synthetic-malformed"] },
  { label: "encoded callback", text: new URLSearchParams({ redirect_uri: `https://client.invalid/callback?code=synthetic-nested-callback&state=${marker}` }).toString(), secrets: ["synthetic-nested-callback"] },
  { label: "long verifier", text: JSON.stringify({ code_verifier: `synthetic-long-verifier-${"v".repeat(5_000)}`, trace: marker }), secrets: ["synthetic-long-verifier"] },
];

async function execute(script: string, fixture: Fixture, scanPath?: string) {
  const writes = new Map<string, string>();
  const output: string[] = [];
  const overlay = new Map<string, string>();
  if (scanPath) {
    const target = join(root, scanPath);
    const current = fs.existsSync(target) ? readFileSync(target, "utf8") : "";
    overlay.set(target, target.endsWith(".json") ? JSON.stringify({ ...JSON.parse(current), diagnostic: fixture.text }) : `${current}\n${fixture.text}\n`);
  }
  const canonical = (path: fs.PathLike) => String(path).replace(join(runDir, "claude-clone"), root);
  const lookup = (path: fs.PathLike) => writes.get(String(path)) ?? overlay.get(canonical(path));
  const files = {
    ...fs,
    mkdirSync: () => undefined,
    writeFileSync: (path: fs.PathLike, data: string) => { writes.set(String(path), String(data)); },
    readFileSync: (path: fs.PathLike, encoding?: string) => {
      const value = lookup(path);
      return value === undefined ? fs.readFileSync(canonical(path), encoding as BufferEncoding) : encoding ? value : Buffer.from(value);
    },
    realpathSync: (path: fs.PathLike) => String(path).startsWith(runDir) ? String(path) : fs.realpathSync(path),
    existsSync: (path: fs.PathLike) => lookup(path) !== undefined || String(path).startsWith(runDir) || fs.existsSync(canonical(path)),
    readdirSync: (path: fs.PathLike) => [...new Set([
      ...fs.readdirSync(canonical(path)),
      ...[...writes.keys(), ...overlay.keys()].filter((file) => dirname(file) === String(path)).map((file) => relative(String(path), file)),
    ])],
    lstatSync: (path: fs.PathLike, options?: { throwIfNoEntry?: boolean }) => lookup(path) === undefined
      ? fs.lstatSync(canonical(path), options as { throwIfNoEntry: false })
      : { isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false },
  };
  const childProcess = {
    spawnSync: (command: string, args: string[]) => {
      let stdout = `${marker} ${fixture.text}`;
      if (command === "git" && args.includes("rev-parse")) stdout = "f".repeat(40);
      if (command === "atoi") stdout = JSON.stringify({ connected: true, summary: fixture.text });
      if (command === "claude" && args[0] === "mcp") stdout = `plugin:atoi:atoi: atoi mcp serve - ${fixture.text}`;
      return { stdout, stderr: "", status: 0 };
    },
  };
  const context = createContext({
    console: { log: (value: unknown) => output.push(String(value)), error: (value: unknown) => output.push(String(value)) },
    process: {
      argv: ["node", join(root, script), "--clients", "claude-code", "--source", root, "--out", runDir, "--resource", "https://door.invalid/api/mcp", "--record"],
      env: {},
      exitCode: 0,
    },
    URL,
    URLSearchParams,
    AbortSignal,
    Buffer,
    fetch: async (url: string) => {
      const path = new URL(url).pathname;
      const body = { diagnostic: fixture.text, trace: marker };
      if (path === "/api/mcp") return new Response(JSON.stringify(body), { status: 401, headers: { "www-authenticate": 'Bearer resource_metadata="https://door.invalid/.well-known/oauth-protected-resource/api/mcp", scope="operator"' } });
      if (path.startsWith("/.well-known/oauth-protected-resource")) return Response.json({ ...body, resource: "https://door.invalid/api/mcp", authorization_servers: ["https://door.invalid"], scopes_supported: ["operator"] });
      if (path === "/.well-known/oauth-authorization-server") return Response.json({
        ...body,
        issuer: "https://door.invalid",
        authorization_endpoint: "https://door.invalid/api/oauth/authorize",
        token_endpoint: "https://door.invalid/api/oauth/token",
        registration_endpoint: "https://door.invalid/api/oauth/register",
        code_challenge_methods_supported: ["S256"],
        client_id_metadata_document_supported: true,
        token_endpoint_auth_methods_supported: ["none"],
        authorization_response_iss_parameter_supported: true,
        grant_types_supported: ["authorization_code", "refresh_token"],
        scopes_supported: ["operator", "offline_access"],
      });
      if (path === "/api/oauth/authorize") return new Response(JSON.stringify(body), { status: 302, headers: { location: `http://127.0.0.1:49152/callback?error=invalid_request&iss=https%3A%2F%2Fdoor.invalid&code=synthetic-redirect-code&trace=${marker}` } });
      if (path === "/api/oauth/token") return Response.json({ ...body, error: "invalid_grant" }, { status: 400 });
      throw new Error("Unexpected synthetic request");
    },
  });
  const modules = new Map<string, { exports: unknown }>();
  function load(path: string, main = false): unknown {
    if (modules.has(path)) return modules.get(path)?.exports;
    const module = { exports: {} };
    modules.set(path, module);
    let source = compiled.get(path);
    if (!source) {
      const input = sourceRevision
        ? execFileSync("git", ["show", `${sourceRevision}:${relative(root, path)}`], { cwd: root, encoding: "utf8" })
        : readFileSync(path, "utf8");
      source = ts.transpileModule(input.replaceAll("import.meta.url", JSON.stringify(pathToFileURL(path).href)), {
        compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
      }).outputText;
      compiled.set(path, source);
    }
    const loadImport = (name: string) => {
      if (name === "node:fs") return files;
      if (name === "node:child_process") return childProcess;
      if (name.startsWith(".")) return load(resolve(dirname(path), name));
      if (["node:assert/strict", "node:crypto", "node:os", "node:path", "node:url"].includes(name)) return require(name);
      throw new Error("Unexpected proof dependency");
    };
    const factory = runInContext(`(${main ? "async " : ""}function(require, module, exports) {\n${source}\n})`, context, { filename: path });
    const result = factory(loadImport, module, module.exports);
    return main ? result : module.exports;
  }
  let error: unknown;
  try {
    await load(join(root, script), true);
  } catch (caught) {
    error = caught;
  }
  return { writes, output: output.join("\n"), error };
}

for (const fixture of fixtures) {
  for (const script of ["tooling/install-proof.ts", "tooling/door-proof.ts"]) {
    test(`${script} removes ${fixture.label} before local and recorded writes`, async () => {
      const result = await execute(script, fixture);
      assert.equal(result.error === undefined, true, "the isolated proof completes");
      const receipts = [...result.writes].filter(([path]) => path.endsWith(".json"));
      assert.equal(receipts.length, 2, "both receipt destinations are exercised");
      for (const [, text] of receipts) {
        const receipt = JSON.parse(text);
        assert.equal(text.includes(marker), true, "non-secret evidence survives");
        if (script.includes("install")) assert.equal(receipt.results[0].steps.length > 3, true, "command output is exercised");
        else assert.equal(receipt.exchanges.length, 6, "the complete discovery exchange is exercised");
      }
      for (const [path, text] of [...result.writes, ["console", result.output]]) {
        for (const secret of fixture.secrets) assert.equal(text.includes(secret), false, `${fixture.label} is absent from ${relative(root, path)}`);
      }
    });
  }
  test(`shipped-file scan rejects ${fixture.label}`, async () => {
    const result = await execute("tooling/smoke.ts", fixture, "plugins/atoi/assets/synthetic-proof.txt");
    assert.equal(result.error !== undefined, true, "the shipped-file scan must refuse credential material");
    assert.equal(String(result.error).includes("plugins/atoi/assets/synthetic-proof.txt"), true, "the injected file triggers the refusal");
    for (const secret of fixture.secrets) assert.equal(String(result.error).includes(secret), false, "failure diagnostics withhold the credential");
  });
}

for (const path of [
  "atoi.config.ts",
  ".claude-plugin/marketplace.json",
  ".agents/plugins/marketplace.json",
  ".cursor-plugin/marketplace.json",
  "server.json",
  "docs/proofs/install/2026-09-16T18-43-26-451Z-0ccfa4a99bbe.json",
  "docs/proofs/door/2026-09-16T20-55-58-518Z.json",
]) {
  test(`credential scan covers ${path}`, async () => {
    const fixture = fixtures.find((entry) => entry.label === "JSON access_token")!;
    const result = await execute("tooling/smoke.ts", fixture, path);
    assert.equal(result.error !== undefined, true, "all distributable files and proof receipts must be scanned");
    assert.equal(String(result.error).includes(path), true, "the injected file triggers the refusal");
  });
}

test("door redirect credentials are removed while all discovery claims remain observable", async () => {
  const result = await execute("tooling/door-proof.ts", { label: "public evidence", text: marker, secrets: [] });
  assert.equal(result.error === undefined, true);
  const text = [...result.writes].find(([path]) => path.endsWith("receipt.json"))?.[1] ?? "";
  const receipt = JSON.parse(text);
  assert.equal(receipt.status, "proven");
  assert.equal(receipt.held, 19);
  assert.equal(text.includes("synthetic-redirect-code"), false, "redirect codes cannot reach the receipt");
  assert.equal(text.includes("invalid_grant"), true);
});

test("the shipped-file scan accepts the unmodified package", async () => {
  const result = await execute("tooling/smoke.ts", { label: "public evidence", text: marker, secrets: [] });
  assert.equal(result.error === undefined, true, "safe files remain eligible to ship");
});
