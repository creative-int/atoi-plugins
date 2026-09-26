import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { clients, connectedTemplate, qualifyConnected } from "./connected-proof.ts";

function fixture() {
  const tools = JSON.parse(readFileSync(new URL("./reference/mcp-reference.json", import.meta.url), "utf8")).tools;
  const install = JSON.stringify({
    timestamp: "2026-09-26T00:00:00Z", commit: "a".repeat(40), operator: { connected: true },
    results: clients.map((client) => ({ client, commit: "a".repeat(40), clientVersion: "synthetic 1", status: "proven", assertions: [{ held: true, observed: true }] })),
  });
  const input = connectedTemplate(install);
  for (const entry of input.clients as any[]) Object.assign(entry, {
    observedAt: "2026-09-26T01:00:00Z", transportObserved: true,
    listRequest: { jsonrpc: "2.0", id: 1, method: "tools/list" },
    listResponse: { jsonrpc: "2.0", id: 1, result: { tools } },
    callRequest: { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "atoi_projects", arguments: { action: "list" } } },
    callResponse: { jsonrpc: "2.0", id: 2, result: { content: [{ type: "text", text: "synthetic private result" }] } },
  });
  return { install, input: input as any };
}

test("all three clients need matching transport evidence; raw evidence is not retained", () => {
  const { install, input } = fixture();
  const result = qualifyConnected(install, input);
  assert.equal(result.status, "proven");
  assert(!JSON.stringify(result).includes("synthetic private result"));
});

for (const [label, change] of Object.entries({
  "missing client": (x: any): unknown => x.clients.pop(),
  "duplicate client": (x: any): unknown => x.clients.push(x.clients[0]),
  "unobserved transport": (x: any): unknown => x.clients[0].transportObserved = false,
  "foreign install": (x: any): unknown => x.installSha256 = "b".repeat(64),
  "stale version": (x: any): unknown => x.clients[0].clientVersion = "old",
  "stale observation": (x: any): unknown => x.clients[0].observedAt = "2020-01-01",
  "missing tool": (x: any): unknown => x.clients[0].listResponse.result.tools = [],
  "wrong response id": (x: any): unknown => x.clients[0].callResponse.id = 3,
  "protocol failure": (x: any): unknown => x.clients[0].callResponse.error = { message: "synthetic error" },
  "tool failure": (x: any): unknown => x.clients[0].callResponse.result.isError = true,
  "mutation": (x: any): unknown => x.clients[0].callRequest.params.arguments.action = "create",
})) test(`refuses ${label}`, () => {
  const { install, input } = fixture();
  change(input);
  assert.equal(qualifyConnected(install, input).status, "inconclusive");
});

test("disconnected historical receipts cannot qualify", () => {
  const install = readFileSync(new URL("../docs/proofs/install/2026-09-16T18-43-26-451Z-0ccfa4a99bbe.json", import.meta.url), "utf8");
  const result = qualifyConnected(install, connectedTemplate(install));
  assert.equal(result.status, "inconclusive");
  assert(result.results.every((entry) => !entry.checks.connectedOperator));
});
