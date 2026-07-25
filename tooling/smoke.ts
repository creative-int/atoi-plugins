import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { abbie } from "../abbie.config.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const requireLive = process.env.ABBIE_PLUGIN_SMOKE_REQUIRE_LIVE === "1";
const expectedTools = abbie.tools.map((tool) => tool.name).sort();
const expectedConfig = JSON.parse(
  readFileSync(join(root, ".mcp.json"), "utf8"),
) as unknown;

function command(args: string[]) {
  return spawnSync("abbie", args, {
    encoding: "utf8",
    env: process.env,
    timeout: 20_000,
  });
}

function fail(message: string): never {
  console.error(`smoke failed: ${message}`);
  process.exit(1);
}

function skip(message: string) {
  if (requireLive) {
    fail(message);
  }
  console.log(`smoke skipped: ${message}`);
  process.exit(0);
}

function parseEnvelope(stdout: string, commandName: string) {
  try {
    return JSON.parse(stdout) as { data?: Record<string, unknown> };
  } catch {
    fail(`${commandName} did not return a JSON envelope`);
  }
}

const version = command(["version", "--json"]);
if (version.error && (version.error as NodeJS.ErrnoException).code === "ENOENT") {
  skip("the Abbie CLI is not installed");
}
if (version.status !== 0) {
  fail(`abbie version exited ${version.status}: ${version.stderr.trim()}`);
}

const configResult = command(["mcp", "config", "--client", "generic", "--json"]);
if (configResult.status !== 0) {
  fail(
    `abbie mcp config exited ${configResult.status}: ${configResult.stderr.trim()}`,
  );
}
const configEnvelope = parseEnvelope(configResult.stdout, "abbie mcp config");
if (
  JSON.stringify(configEnvelope.data?.config) !== JSON.stringify(expectedConfig)
) {
  fail("generated .mcp.json differs from the Abbie CLI generic config");
}

const accountResult = command(["account", "status", "--json"]);
if (accountResult.status !== 0) {
  skip("the Abbie operator identity is not connected");
}
const accountEnvelope = parseEnvelope(
  accountResult.stdout,
  "abbie account status",
);
if (accountEnvelope.data?.connected !== true) {
  skip("the Abbie operator identity is not connected");
}

const statusResult = command(["mcp", "status", "--probe", "--json"]);
if (statusResult.status !== 0) {
  fail(
    `abbie mcp status --probe exited ${statusResult.status}: ${statusResult.stderr.trim()}`,
  );
}
const statusEnvelope = parseEnvelope(
  statusResult.stdout,
  "abbie mcp status --probe",
);
const tools = Array.isArray(statusEnvelope.data?.tools)
  ? [...statusEnvelope.data.tools].sort()
  : [];
if (
  statusEnvelope.data?.status !== "live" ||
  statusEnvelope.data?.scope !== "operator" ||
  JSON.stringify(tools) !== JSON.stringify(expectedTools)
) {
  fail(
    `live MCP contract mismatch: ${JSON.stringify({
      status: statusEnvelope.data?.status,
      scope: statusEnvelope.data?.scope,
      tools,
    })}`,
  );
}

console.log(
  `smoke live: Abbie ${String(statusEnvelope.data?.protocolVersion)} · ${expectedTools.join(", ")}`,
);
