import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { serializeProof } from "./scrub.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const clients = ["claude-code", "codex", "cursor"] as const;
const reference = JSON.parse(readFileSync(join(root, "tooling/reference/mcp-reference.json"), "utf8"));
const toolNames: string[] = reference.tools.map((tool: { name: string }) => tool.name);

type Json = Record<string, any>;
const object = (value: unknown): Json => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

// This validates evidence supplied by a human; it does not authenticate clients
// or treat an agent's prose answer as a transport observation.
export function qualifyConnected(installText: string, observations: unknown) {
  const install = object(JSON.parse(installText));
  const input = object(observations);
  const entries = Array.isArray(input.clients) ? input.clients : [];
  const results = clients.map((client) => {
    const matches = entries.filter((entry: Json) => entry?.client === client);
    const observation = object(matches[0]);
    const installed = object(install.results?.find((entry: Json) => entry.client === client));
    const list = object(observation.listResponse);
    const listRequest = object(observation.listRequest);
    const call = object(observation.callResponse);
    const callRequest = object(observation.callRequest);
    const listed = Array.isArray(list.result?.tools) ? list.result.tools.map((tool: Json) => tool?.name) : [];
    const success = (request: Json, response: Json) =>
      request.jsonrpc === "2.0" && response.jsonrpc === "2.0" &&
      ["string", "number"].includes(typeof request.id) && response.id === request.id &&
      !Object.hasOwn(response, "error") && response.result !== null && typeof response.result === "object";
    const checks = {
      connectedOperator: install.operator?.connected === true,
      installProven: installed.status === "proven" && Array.isArray(installed.assertions) && installed.assertions.length > 0 &&
        installed.assertions.every((check: Json) => check.held === true && check.observed === true),
      sameInstall: /^[a-f0-9]{40}$/.test(install.commit ?? "") && installed.commit === install.commit &&
        observation.commit === install.commit && input.installSha256 === sha(installText),
      clientObservation: matches.length === 1 && observation.transportObserved === true &&
        typeof installed.clientVersion === "string" && installed.clientVersion.length > 0 &&
        observation.clientVersion === installed.clientVersion &&
        Number.isFinite(Date.parse(observation.observedAt)) &&
        Date.parse(observation.observedAt) >= Date.parse(install.timestamp),
      toolsListed: success(listRequest, list) && listRequest.method === "tools/list" &&
        toolNames.every((name) => listed.includes(name)) && !list.result?.nextCursor,
      readOnlyCall: success(callRequest, call) && callRequest.method === "tools/call" &&
        callRequest.params?.name === "atoi_projects" &&
        JSON.stringify(callRequest.params?.arguments) === JSON.stringify({ action: "list" }) &&
        call.result?.isError !== true && Array.isArray(call.result?.content) && call.result.content.length > 0,
    };
    return { client, status: Object.values(checks).every(Boolean) ? "proven" : "inconclusive", checks };
  });
  return {
    proofClass: "Human-supplied client transport evidence, structurally validated; not an autonomous client run.",
    timestamp: new Date().toISOString(),
    installSha256: sha(installText),
    status: results.every((entry) => entry.status === "proven") ? "proven" : "inconclusive",
    results,
  };
}

export function connectedTemplate(installText: string) {
  const install = JSON.parse(installText);
  return {
    installSha256: sha(installText),
    clients: clients.map((client) => ({
      client, commit: install.commit, clientVersion: install.results?.find((entry: Json) => entry.client === client)?.clientVersion ?? null,
      observedAt: null, transportObserved: false,
      listRequest: null, listResponse: null, callRequest: null, callResponse: null,
    })),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [mode, installPath, inputPath] = process.argv.slice(2);
    if (!["prepare", "check", "record"].includes(mode) || !installPath || (mode !== "prepare" && !inputPath)) {
      throw new Error("usage");
    }
    const installText = readFileSync(installPath, "utf8");
    if (mode === "prepare") {
      console.log(serializeProof(connectedTemplate(installText)));
    } else {
      const receipt = qualifyConnected(installText, JSON.parse(readFileSync(inputPath, "utf8")));
      const safe = serializeProof(receipt);
      if (mode === "record") {
        const directory = join(root, "docs/proofs/install/connected");
        mkdirSync(directory, { recursive: true });
        writeFileSync(join(directory, `${receipt.timestamp.replace(/[:.]/g, "-")}.json`), safe, { flag: "wx" });
      }
      console.log(safe);
      process.exitCode = receipt.status === "proven" ? 0 : 2;
    }
  } catch {
    // Never echo input, paths, or parse errors containing private evidence.
    console.error("Connected proof input invalid. Usage: pnpm proof:connected <prepare|check|record> <install-receipt> [observations]");
    process.exitCode = 1;
  }
}
