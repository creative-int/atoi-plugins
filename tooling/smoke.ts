import assert from "node:assert/strict";
import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { atoiConfig } from "../atoi.config.ts";
import {
  AGENT_PLUGINS_MCP_SCHEMA,
  AGENT_PLUGINS_PLUGIN_SCHEMA,
  validateMcpConfig,
  validatePluginManifest,
} from "./agent-plugins.ts";

type Json = Record<string, any>;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { plugin, mcp, codex, marketplace } = atoiConfig;
const pluginRoot = realpathSync(join(root, plugin.dir));
const checks: string[] = [];

const readJson = (path: string): Json => JSON.parse(readFileSync(path, "utf8"));
const inside = (base: string, path: string) =>
  path === base || path.startsWith(`${base}${sep}`);

function resolvesToPlugin(catalogPath: string, source: string) {
  const resolved = realpathSync(resolve(root, source));
  assert.equal(
    resolved,
    pluginRoot,
    `${catalogPath} points at ${source}, not ${plugin.dir}`,
  );
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const info = lstatSync(path);
    assert(!info.isSymbolicLink(), `${relative(root, path)} is a symlink`);
    return info.isDirectory() ? walk(path) : [path];
  });
}

assert.deepEqual(
  validatePluginManifest({ $schema: AGENT_PLUGINS_PLUGIN_SCHEMA, name: "a", skills: "./skills" }),
  ["plugin.json has a field outside the closed schema: skills"],
  "the manifest validator must reject a field outside the closed schema",
);
assert.notDeepEqual(
  validateMcpConfig({
    $schema: AGENT_PLUGINS_MCP_SCHEMA,
    mcpServers: { x: { command: "atoi", args: ["mcp", "serve"] } },
  }),
  [],
  "the MCP validator must reject a server with no transport type",
);
checks.push("validators reject a closed-schema field and an untyped server");

const manifest = readJson(join(pluginRoot, "plugin.json"));
assert.deepEqual(validatePluginManifest(manifest), [], "plugin.json");
assert.equal(manifest.name, plugin.name);
assert.equal(manifest.version, plugin.version);
const openai = manifest.extensions?.["com.openai"];
assert(openai?.interface, "plugin.json carries extensions.com.openai.interface");
assert.equal(openai.interface.category, codex.category);
for (const field of ["logo", "composerIcon"]) {
  const asset = openai.interface[field];
  assert.match(asset, /^\.\//, `${field} is plugin-relative`);
  assert(inside(pluginRoot, realpathSync(resolve(pluginRoot, asset))), `${field} stays inside the plugin`);
}
assert(openai.interface.defaultPrompt.length <= 3, "Codex shows at most three starter prompts");
checks.push("plugin.json conforms to Agent Plugins 1.0.0 and carries the Codex interface");

const mcpConfig = readJson(join(pluginRoot, "mcp.json"));
assert.deepEqual(validateMcpConfig(mcpConfig), [], "mcp.json");
assert.deepEqual(mcpConfig.mcpServers, {
  [mcp.server]: { type: "stdio", command: mcp.command, args: mcp.args },
});
checks.push("mcp.json declares only the credential-free stdio bridge `atoi mcp serve`");

for (const legacy of [".claude-plugin", ".codex-plugin", ".cursor-plugin", ".mcp.json"]) {
  assert.throws(() => lstatSync(join(pluginRoot, legacy)), `${plugin.dir}/${legacy} must not exist`);
}
for (const retired of [".claude-plugin/plugin.json", ".codex-plugin", ".cursor-plugin/plugin.json", ".mcp.json", "skills"]) {
  assert.throws(() => lstatSync(join(root, retired)), `${retired} was retired from the repository root`);
}
checks.push("neither the plugin directory nor the repository root carries a client-specific manifest");

const claude = readJson(join(root, ".claude-plugin/marketplace.json"));
assert.equal(claude.name, marketplace.name);
assert.equal(claude.plugins.length, 1);
const claudeEntry = claude.plugins[0];
assert.equal(claudeEntry.name, plugin.name);
assert.equal(claudeEntry.version, plugin.version);
resolvesToPlugin(".claude-plugin/marketplace.json", claudeEntry.source);
assert.equal(
  realpathSync(resolve(pluginRoot, claudeEntry.mcpServers)),
  realpathSync(join(pluginRoot, "mcp.json")),
  "the Claude Code entry reads the portable mcp.json",
);

const codexCatalog = readJson(join(root, ".agents/plugins/marketplace.json"));
assert.equal(codexCatalog.name, marketplace.name);
assert.equal(codexCatalog.plugins.length, 1);
const codexEntry = codexCatalog.plugins[0];
assert.equal(codexEntry.name, plugin.name);
assert.equal(codexEntry.source.source, "local");
resolvesToPlugin(".agents/plugins/marketplace.json", codexEntry.source.path);
assert(["AVAILABLE", "INSTALLED_BY_DEFAULT", "NOT_AVAILABLE"].includes(codexEntry.policy.installation));
assert(["ON_INSTALL", "ON_USE"].includes(codexEntry.policy.authentication));
assert.equal(codexEntry.category, codex.category);

const cursor = readJson(join(root, ".cursor-plugin/marketplace.json"));
assert.equal(cursor.plugins.length, 1);
resolvesToPlugin(".cursor-plugin/marketplace.json", cursor.plugins[0].source);
checks.push("Claude Code, Codex and Cursor catalogs each resolve to plugins/atoi");

const skillsRoot = join(pluginRoot, "skills");
const skills = readdirSync(skillsRoot).filter((entry) =>
  lstatSync(join(skillsRoot, entry, "SKILL.md"), { throwIfNoEntry: false })?.isFile(),
);
assert(skills.length > 0, "the plugin ships at least one skill");
for (const skill of skills) {
  const skillRoot = join(skillsRoot, skill);
  const body = readFileSync(join(skillRoot, "SKILL.md"), "utf8");
  const frontmatter = body.match(/^---\n([\s\S]*?)\n---\n/);
  assert(frontmatter, `${skill}/SKILL.md opens with frontmatter`);
  assert.match(frontmatter[1], new RegExp(`^name: ${skill}$`, "m"), `${skill} names itself`);
  assert.match(frontmatter[1], /^description: .{20,}/m, `${skill} describes when to use it`);
  for (const [, target] of body.matchAll(/\]\(((?!https?:)[^)#]+)\)/g)) {
    const path = realpathSync(resolve(skillRoot, target));
    assert(inside(realpathSync(skillRoot), path), `${skill} links ${target} outside the skill`);
    assert(readFileSync(path, "utf8").trim().length > 0, `${skill} links an empty ${target}`);
  }
}
checks.push(`${skills.length} skill(s) name themselves and link only files inside the skill`);

const reference = readJson(join(root, "tooling/reference/mcp-reference.json"));
const toolNames: string[] = reference.tools.map((tool: Json) => tool.name);
assert.equal(new Set(toolNames).size, toolNames.length, "the reference names each tool once");
assert.deepEqual(
  claudeEntry.metadata?.tools?.map((tool: Json) => tool.name),
  toolNames,
  "the Claude Code catalog lists the reference's tools in order",
);
const prose = [
  join(pluginRoot, "skills/atoi/SKILL.md"),
  join(pluginRoot, "skills/atoi/references/work-and-proof.md"),
  join(root, "README.md"),
];
for (const path of prose) {
  const named = new Set(readFileSync(path, "utf8").match(/\batoi_[a-z]+(?:_[a-z]+)*\b/g) ?? []);
  for (const name of named) {
    assert(toolNames.includes(name), `${relative(root, path)} names ${name}, which Atoi does not ship`);
  }
}
const skillBody = readFileSync(join(pluginRoot, "skills/atoi/SKILL.md"), "utf8");
for (const name of toolNames) {
  assert(skillBody.includes(`\`${name}\``), `the skill never names ${name}`);
}
const toolsDoc = readFileSync(join(pluginRoot, "skills/atoi/references/tools.md"), "utf8");
assert.deepEqual(
  [...toolsDoc.matchAll(/^## `(atoi_[a-z_]+)`$/gm)].map((match) => match[1]),
  toolNames,
  "references/tools.md documents every tool in reference order",
);
checks.push(`the skill, its references, the README and the Claude catalog name exactly the ${toolNames.length} tools the reference ships`);

const shipped = [...walk(pluginRoot), join(root, "README.md")].filter((path) => !path.endsWith(".png"));
for (const path of shipped) {
  const text = readFileSync(path, "utf8");
  const name = relative(root, path);
  assert(!text.includes("/Users/"), `${name} contains a private host path`);
  assert(!text.includes("[TODO"), `${name} contains a scaffold placeholder`);
  assert(!/atoi_(?:service|host)_[A-Za-z0-9]{12,}/.test(text), `${name} contains an Atoi token`);
  assert(!/convex\.(?:site|cloud)/.test(text), `${name} names a raw Convex deployment`);
}
checks.push("no private path, placeholder, token or raw deployment host in shipped files");

console.log(
  JSON.stringify(
    {
      status: "passed",
      plugin: `${plugin.name}@${marketplace.name}`,
      version: plugin.version,
      skills,
      checks,
      limits: [
        "a client loading the package is proven by tooling/install-proof.ts, not here",
        "a live tools/list against Atoi needs an operator login and is not run here",
      ],
    },
    null,
    2,
  ),
);
