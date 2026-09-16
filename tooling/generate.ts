import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { atoiConfig } from "../atoi.config.ts";
import {
  AGENT_PLUGINS_MCP_SCHEMA,
  AGENT_PLUGINS_PLUGIN_SCHEMA,
} from "./agent-plugins.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const { marketplace, plugin, claudeCode, codex, mcp, cli } = atoiConfig;
const source = `./${plugin.dir}`;
const repositorySlug = plugin.repository.replace("https://github.com/", "");
const repositoryName = repositorySlug.split("/")[1];
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const author = {
  name: marketplace.owner.name,
  email: marketplace.owner.email,
  url: marketplace.owner.url,
};

const portableManifest = {
  $schema: AGENT_PLUGINS_PLUGIN_SCHEMA,
  name: plugin.name,
  version: plugin.version,
  description: plugin.description,
  author,
  homepage: plugin.homepage,
  repository: plugin.repository,
  license: plugin.license,
  keywords: plugin.keywords,
  extensions: {
    "com.openai": {
      interface: {
        displayName: plugin.displayName,
        shortDescription: codex.shortDescription,
        longDescription: codex.longDescription,
        developerName: marketplace.owner.name,
        category: codex.category,
        capabilities: codex.capabilities,
        websiteURL: plugin.homepage,
        defaultPrompt: codex.defaultPrompt,
        composerIcon: plugin.logo,
        logo: plugin.logo,
      },
    },
  },
};

const portableMcp = {
  $schema: AGENT_PLUGINS_MCP_SCHEMA,
  mcpServers: {
    [mcp.server]: {
      type: "stdio",
      command: mcp.command,
      args: mcp.args,
    },
  },
};

const claudeMarketplace = {
  name: marketplace.name,
  owner: marketplace.owner,
  description: marketplace.description,
  plugins: [
    {
      name: plugin.name,
      displayName: plugin.displayName,
      source,
      description: plugin.description,
      version: plugin.version,
      author,
      homepage: plugin.homepage,
      repository: plugin.repository,
      license: plugin.license,
      keywords: plugin.keywords,
      category: claudeCode.category,
      mcpServers: "./mcp.json",
    },
  ],
};

const codexMarketplace = {
  name: marketplace.name,
  interface: { displayName: marketplace.displayName },
  plugins: [
    {
      name: plugin.name,
      source: { source: "local", path: source },
      policy: {
        installation: codex.installation,
        authentication: codex.authentication,
      },
      category: codex.category,
    },
  ],
};

const cursorMarketplace = {
  name: marketplace.name,
  owner: { name: marketplace.owner.name, email: marketplace.owner.email },
  metadata: { description: marketplace.description },
  plugins: [
    {
      name: plugin.name,
      source,
      description: plugin.description,
      version: plugin.version,
      author: { name: marketplace.owner.name, email: marketplace.owner.email },
      homepage: plugin.homepage,
      repository: plugin.repository,
      license: plugin.license,
      keywords: plugin.keywords,
      logo: `${plugin.dir}/assets/logo.png`,
    },
  ],
};

const serverManifest = {
  $schema:
    "https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json",
  name: `io.github.creative-int/${plugin.name}`,
  description: plugin.description,
  version: plugin.version,
  websiteUrl: plugin.homepage,
  repository: { url: plugin.repository, source: "github" },
};

const generatedFiles: Record<string, string> = {
  [`${plugin.dir}/plugin.json`]: json(portableManifest),
  [`${plugin.dir}/mcp.json`]: json(portableMcp),
  ".claude-plugin/marketplace.json": json(claudeMarketplace),
  ".agents/plugins/marketplace.json": json(codexMarketplace),
  ".cursor-plugin/marketplace.json": json(cursorMarketplace),
  "server.json": json(serverManifest),
};

function fence(language: string, lines: string[]) {
  return ["```" + language, ...lines, "```"].join("\n");
}

function installBlock() {
  return [
    "### 1. Connect the Atoi CLI once",
    "",
    "Every client reaches Atoi through the installed CLI, which keeps your operator token in the system keychain and forwards each call to Atoi's authenticated MCP endpoint. Nothing in this repository holds a credential.",
    "",
    fence("sh", [
      cli.installCommand,
      "atoi account login",
      "atoi mcp status --probe",
    ]),
    "",
    `\`atoi account login\` opens browser device authorization for your operator identity. It is not \`atoi login\`, which pairs a Computer. \`atoi mcp status --probe\` should report \`live\`. If you prefer a script, \`${cli.installScript}\` installs the same CLI.`,
    "",
    "### 2. Install the plugin in your client",
    "",
    "#### Claude Code",
    "",
    fence("text", [
      `/plugin marketplace add ${repositorySlug}`,
      `/plugin install ${plugin.name}@${marketplace.name}`,
    ]),
    "",
    `The same two steps from a shell are \`claude plugin marketplace add ${repositorySlug}\` and \`claude plugin install ${plugin.name}@${marketplace.name}\`.`,
    "",
    "#### Codex",
    "",
    fence("sh", [
      `codex plugin marketplace add ${repositorySlug}`,
      `codex plugin add ${plugin.name}@${marketplace.name}`,
    ]),
    "",
    "Start a new Codex session afterwards; `codex mcp list` shows the `atoi` server.",
    "",
    "#### Cursor",
    "",
    fence("sh", [
      `git clone ${plugin.repository}.git`,
      `cursor-agent --plugin-dir ./${repositoryName}/${plugin.dir}`,
    ]),
    "",
    `\`${plugin.dir}\` is a standard Agent Plugin: Cursor reads its \`plugin.json\`, \`skills/\` and \`mcp.json\` directly.`,
    "",
    "#### Any other agent",
    "",
    `Point the agent at [\`${plugin.dir}/skills/atoi/SKILL.md\`](${plugin.dir}/skills/atoi/SKILL.md) and give it the same MCP server: \`${mcp.command} ${mcp.args.join(" ")}\` over stdio.`,
  ].join("\n");
}

const start = "<!-- AUTO-GENERATED:INSTALL START -->";
const end = "<!-- AUTO-GENERATED:INSTALL END -->";

function read(path: string) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function write(relativePath: string, content: string) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function generatedReadme(current: string) {
  const markers = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!markers.test(current)) {
    throw new Error("README is missing the generated install block markers.");
  }
  return current.replace(markers, `${start}\n\n${installBlock()}\n\n${end}`);
}

let stale = 0;
for (const [relativePath, content] of Object.entries(generatedFiles)) {
  if (read(join(root, relativePath)) === content) continue;
  stale += 1;
  console.log(`${check ? "stale" : "wrote"}: ${relativePath}`);
  if (!check) write(relativePath, content);
}

const currentReadme = read(join(root, "README.md"));
if (currentReadme === null) throw new Error("README.md is missing.");
const nextReadme = generatedReadme(currentReadme);
if (nextReadme !== currentReadme) {
  stale += 1;
  console.log(`${check ? "stale" : "wrote"}: README.md (install block)`);
  if (!check) write("README.md", nextReadme);
}

if (check && stale > 0) {
  console.error(
    `${stale} generated file(s) are stale. Run \`pnpm generate\` and commit them.`,
  );
  process.exit(1);
}

console.log(check ? "generated files are current." : "generated all files.");
