import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { atoiConfig } from "../atoi.config.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const version = "0.1.0";
const displayName = "Atoi";
const repository = `https://github.com/creative-int/${atoiConfig.product}-plugins`;
const repositorySlug = repository.replace("https://github.com/", "");
const repositoryGit = `${repository}.git`;
const homepage = `https://${atoiConfig.product}.app`;
const docs = `https://docs.${atoiConfig.product}.app`;
const author = {
  name: "creative-int",
  email: "support@creative-int.com",
};
const primarySkill = atoiConfig.skills.find(
  (skill) => skill.name === atoiConfig.product,
);

if (!primarySkill) {
  throw new Error(`Missing primary ${atoiConfig.product} skill in config.`);
}

const description = primarySkill.description;
const bridge = {
  command: atoiConfig.product,
  args: ["mcp", "serve"],
};
const mcpConfig = {
  mcpServers: {
    [atoiConfig.mcp.name]: bridge,
  },
};
const keywords = [
  atoiConfig.product,
  "agent-skills",
  "mcp",
  "projects",
  "workspaces",
  "tasks",
  "proof",
];
const profileMetadata = {
  repoProfile: atoiConfig.repoProfile,
  companionOf: atoiConfig.companionOf,
  mcp: atoiConfig.mcp,
};
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

function clientInstall(client: (typeof atoiConfig.clients)[number]) {
  if (client === "claude") {
    return [
      "### Claude Code",
      "",
      "Add the companion marketplace and install Atoi. The plugin starts the local credential-safe MCP bridge.",
      "",
      "```text",
      `/plugin marketplace add ${repositorySlug}`,
      `/plugin install ${atoiConfig.product}@${atoiConfig.product}`,
      "```",
    ].join("\n");
  }
  if (client === "codex") {
    return [
      "### Codex",
      "",
      "Add the companion marketplace, then install Atoi from the plugin picker. The equivalent direct MCP configuration is shown below.",
      "",
      "```sh",
      `codex plugin marketplace add ${repositorySlug}`,
      "```",
      "",
      "```toml",
      `[mcp_servers.${atoiConfig.mcp.name}]`,
      `command = "${bridge.command}"`,
      `args = ["${bridge.args.join('", "')}"]`,
      "```",
    ].join("\n");
  }
  return [
    "### Cursor",
    "",
    "Add the companion marketplace in Cursor, or place the equivalent MCP configuration in `.cursor/mcp.json`.",
    "",
    "```text",
    `Cursor → Settings → Plugins → Add marketplace → ${repositorySlug}`,
    "```",
    "",
    "```json",
    json(mcpConfig).trim(),
    "```",
  ].join("\n");
}

const generatedFiles: Record<string, string> = {
  ".mcp.json": json(mcpConfig),
  ".claude-plugin/plugin.json": json({
    name: atoiConfig.product,
    version,
    description,
    author,
    homepage,
    repository: repositoryGit,
    license: "MIT",
    keywords,
    displayName,
    skills: "./skills",
    mcpServers: "./.mcp.json",
  }),
  ".claude-plugin/marketplace.json": json({
    name: atoiConfig.product,
    owner: author,
    plugins: [
      {
        name: atoiConfig.product,
        displayName,
        source: "./",
        description,
      },
    ],
  }),
  ".codex-plugin/plugin.json": json({
    name: atoiConfig.product,
    version,
    description,
    author,
    homepage,
    repository: repositoryGit,
    license: "MIT",
    keywords,
    skills: "./skills",
    mcpServers: "./.mcp.json",
    interface: {
      displayName,
      shortDescription: description,
      longDescription:
        "Atoi keeps project intent, stable Workspace source truth, durable Tasks, exact change sets, checks, and proof in one governed workflow.",
      developerName: author.name,
      category: "Developer Tools",
      capabilities: ["Read", "Write"],
      defaultPrompt: [
        "Show my Atoi projects and their workspace status.",
        "Start a governed Atoi task for this project.",
        "Review this Atoi task's changes, checks, and proof.",
      ],
      logo: "./assets/logo.png",
    },
  }),
  ".cursor-plugin/plugin.json": json({
    name: atoiConfig.product,
    version,
    description,
    author,
    homepage,
    repository: repositoryGit,
    license: "MIT",
    keywords,
    displayName,
    logo: "assets/logo.png",
    skills: "./skills",
    mcpServers: "./.mcp.json",
  }),
  ".cursor-plugin/marketplace.json": json({
    name: atoiConfig.product,
    owner: author,
    metadata: {
      description,
      ...profileMetadata,
    },
    plugins: [
      {
        name: atoiConfig.product,
        source: ".",
        description,
      },
    ],
  }),
  "server.json": json({
    $schema:
      "https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json",
    name: "io.github.creative-int/atoi",
    description,
    version,
    websiteUrl: homepage,
    repository: { url: repository, source: "github" },
    _meta: {
      "app.atoi/companion": profileMetadata,
      "app.atoi/cli-bridge": {
        ...bridge,
        transport: "stdio",
        authentication:
          "The installed Atoi CLI reads the operator token locally; plugin manifests contain no credential.",
      },
    },
  }),
};

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

function installBlock() {
  return [
    "### Prerequisite",
    "",
    "Install the Atoi product CLI, connect your operator identity once, and verify the governed bridge.",
    "",
    "```sh",
    "atoi account login",
    "atoi mcp status --probe",
    "```",
    "",
    ...atoiConfig.clients.flatMap((client, index) => [
      clientInstall(client),
      ...(index === atoiConfig.clients.length - 1 ? [] : [""]),
    ]),
    "",
    "### Portable skills",
    "",
    "Install the Atoi skills without a client plugin. This does not connect MCP by itself.",
    "",
    "```sh",
    `npx skills add ${repositorySlug}`,
    "```",
  ].join("\n");
}

function generatedReadme(current: string) {
  const replacement = `${start}\n\n${installBlock()}\n\n${end}`;
  const markers = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (!markers.test(current)) {
    throw new Error("README is missing the generated install block markers.");
  }
  return current.replace(markers, replacement);
}

let stale = 0;
for (const [relativePath, content] of Object.entries(generatedFiles)) {
  if (read(join(root, relativePath)) === content) {
    continue;
  }
  stale += 1;
  console.log(`${check ? "stale" : "wrote"}: ${relativePath}`);
  if (!check) {
    write(relativePath, content);
  }
}

const readmePath = join(root, "README.md");
const currentReadme = read(readmePath);
if (currentReadme === null) {
  throw new Error("README.md is missing.");
}
const nextReadme = generatedReadme(currentReadme);
if (nextReadme !== currentReadme) {
  stale += 1;
  console.log(`${check ? "stale" : "wrote"}: README.md (install block)`);
  if (!check) {
    write("README.md", nextReadme);
  }
}

if (check && stale > 0) {
  console.error(
    `${stale} generated file(s) are stale. Run \`pnpm generate\` and commit them.`,
  );
  process.exit(1);
}

console.log(check ? "generated files are current." : "generated all adapters.");
console.log(`docs: ${docs}`);
