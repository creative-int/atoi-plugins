import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { atoiConfig } from "../atoi.config.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const generatedJson = [
  ".mcp.json",
  "server.json",
  ".claude-plugin/plugin.json",
  ".claude-plugin/marketplace.json",
  ".codex-plugin/plugin.json",
  ".cursor-plugin/plugin.json",
  ".cursor-plugin/marketplace.json",
] as const;

type JsonObject = Record<string, unknown>;

function parse(relativePath: (typeof generatedJson)[number]) {
  const content = readFileSync(join(root, relativePath), "utf8");
  try {
    return JSON.parse(content) as JsonObject;
  } catch (error) {
    throw new Error(
      `${relativePath} is not valid JSON: ${(error as Error).message}`,
    );
  }
}

const artifacts = Object.fromEntries(
  generatedJson.map((relativePath) => [relativePath, parse(relativePath)]),
) as Record<(typeof generatedJson)[number], JsonObject>;

assert.equal(atoiConfig.product, "atoi");
assert.equal(atoiConfig.companionOf, "atoi");
assert.equal(atoiConfig.repoProfile, "agent-plugin-companion");
assert.deepEqual(atoiConfig.clients, ["claude", "codex", "cursor"]);
assert.equal(atoiConfig.mcp.name, "atoi");
assert.equal(atoiConfig.mcp.auth, "token");
assert.match(atoiConfig.mcp.endpoint, /^https:\/\/.+\/mcp$/);
assert.match(atoiConfig.mcp.notes ?? "", /atoi mcp serve/);

const mcp = artifacts[".mcp.json"];
assert.deepEqual(mcp, {
  mcpServers: {
    atoi: {
      command: "atoi",
      args: ["mcp", "serve"],
    },
  },
});

for (const client of ["claude", "codex", "cursor"] as const) {
  const manifest =
    artifacts[
      `.${client === "claude" ? "claude" : client}-plugin/plugin.json`
    ];
  assert.equal(manifest.name, "atoi");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(typeof manifest.description, "string");
  assert.equal(manifest.skills, "./skills");
  assert.equal(manifest.mcpServers, "./.mcp.json");
}

const server = artifacts["server.json"];
assert.equal(server.name, "io.github.creative-int/atoi");
assert.equal(server.version, "0.1.0");
assert.equal(
  (server.repository as JsonObject).url,
  "https://github.com/creative-int/atoi-plugins",
);
const serverMeta = server._meta as JsonObject;
const companion = serverMeta["app.atoi/companion"] as JsonObject;
assert.equal(companion.repoProfile, "agent-plugin-companion");
assert.equal(companion.companionOf, "atoi");
assert.deepEqual(companion.mcp, atoiConfig.mcp);

for (const skill of atoiConfig.skills) {
  const skillPath = join(root, skill.dir, "SKILL.md");
  const content = readFileSync(skillPath, "utf8");
  assert.match(content, new RegExp(`^name:\\s*${skill.name}$`, "m"));
  assert.match(content, /^description:\s*/m);
}

console.log(
  `smoke passed: ${generatedJson.length} generated JSON files, ${atoiConfig.clients.length} clients, ${atoiConfig.skills.length} skills`,
);
console.log(
  `MCP bridge: atoi mcp serve -> ${atoiConfig.mcp.endpoint} (${atoiConfig.mcp.auth})`,
);
