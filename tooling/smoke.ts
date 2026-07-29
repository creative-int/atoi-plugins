import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { abbieConfig } from "../abbie.config.ts";

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

assert.equal(abbieConfig.product, "abbie");
assert.equal(abbieConfig.companionOf, "abbie");
assert.equal(abbieConfig.repoProfile, "agent-plugin-companion");
assert.deepEqual(abbieConfig.clients, ["claude", "codex", "cursor"]);
assert.equal(abbieConfig.mcp.name, "abbie");
assert.equal(abbieConfig.mcp.auth, "token");
assert.match(abbieConfig.mcp.endpoint, /^https:\/\/.+\/mcp$/);
assert.match(abbieConfig.mcp.notes ?? "", /abbie mcp serve/);

const mcp = artifacts[".mcp.json"];
assert.deepEqual(mcp, {
  mcpServers: {
    abbie: {
      command: "abbie",
      args: ["mcp", "serve"],
    },
  },
});

for (const client of ["claude", "codex", "cursor"] as const) {
  const manifest =
    artifacts[
      `.${client === "claude" ? "claude" : client}-plugin/plugin.json`
    ];
  assert.equal(manifest.name, "abbie");
  assert.equal(manifest.version, "0.1.0");
  assert.equal(typeof manifest.description, "string");
  assert.equal(manifest.skills, "./skills");
  assert.equal(manifest.mcpServers, "./.mcp.json");
}

const server = artifacts["server.json"];
assert.equal(server.name, "io.github.creative-int/abbie");
assert.equal(server.version, "0.1.0");
assert.equal(
  (server.repository as JsonObject).url,
  "https://github.com/creative-int/abbie-plugins",
);
const serverMeta = server._meta as JsonObject;
const companion = serverMeta["computer.abbie/companion"] as JsonObject;
assert.equal(companion.repoProfile, "agent-plugin-companion");
assert.equal(companion.companionOf, "abbie");
assert.deepEqual(companion.mcp, abbieConfig.mcp);

for (const skill of abbieConfig.skills) {
  const skillPath = join(root, skill.dir, "SKILL.md");
  const content = readFileSync(skillPath, "utf8");
  assert.match(content, new RegExp(`^name:\\s*${skill.name}$`, "m"));
  assert.match(content, /^description:\s*/m);
}

console.log(
  `smoke passed: ${generatedJson.length} generated JSON files, ${abbieConfig.clients.length} clients, ${abbieConfig.skills.length} skills`,
);
console.log(
  `MCP bridge: abbie mcp serve -> ${abbieConfig.mcp.endpoint} (${abbieConfig.mcp.auth})`,
);
