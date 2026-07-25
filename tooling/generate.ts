import {
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { abbie } from "../abbie.config.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const repositorySlug = abbie.repository.replace("https://github.com/", "");
const repositoryGit = `${abbie.repository}.git`;
const author = abbie.owner;

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const mcpConfig = {
  mcpServers: {
    [abbie.mcp.id]: {
      command: abbie.mcp.command,
      args: abbie.mcp.args,
    },
  },
};

const installClients = [
  {
    id: "prerequisite",
    label: "Prerequisite",
    blurb:
      "Install the Abbie product CLI, connect your operator identity once, and verify the governed bridge.",
    language: "sh",
    steps: [
      "abbie account login",
      "abbie mcp status --probe",
    ],
  },
  {
    id: "skills",
    label: "Skills in any compatible agent",
    blurb:
      "Install both portable workflows in Claude Code, Codex, Cursor, Copilot, Windsurf, and other skill-aware agents.",
    language: "sh",
    steps: [`npx skills add ${repositorySlug}`],
  },
  {
    id: "claude-code",
    label: "Claude Code plugin",
    blurb: "Add the marketplace, then install the Abbie plugin.",
    language: "text",
    steps: [
      `/plugin marketplace add ${repositorySlug}`,
      `/plugin install ${abbie.name}@${abbie.name}`,
    ],
  },
  {
    id: "codex",
    label: "Codex plugin",
    blurb:
      "Add this repository as a Codex plugin marketplace, then install Abbie from the plugin picker.",
    language: "sh",
    steps: [`codex plugin marketplace add ${repositorySlug}`],
  },
  {
    id: "cursor",
    label: "Cursor plugin",
    blurb: "Add this repository as a Cursor plugin marketplace.",
    language: "text",
    steps: [
      `Cursor → Settings → Plugins → Add marketplace → ${repositorySlug}`,
    ],
  },
  {
    id: "mcp",
    label: "Any local MCP client",
    blurb:
      "Use the credential-safe stdio bridge. The configuration contains no token and works from any directory where `abbie` is on PATH.",
    language: "json",
    steps: [json(mcpConfig).trim()],
  },
];

const generatedFiles: Record<string, string> = {
  ".mcp.json": json(mcpConfig),
  ".claude-plugin/plugin.json": json({
    name: abbie.name,
    version: abbie.version,
    description: abbie.shortDescription,
    author,
    homepage: abbie.homepage,
    repository: repositoryGit,
    license: abbie.license,
    keywords: abbie.keywords,
    displayName: abbie.displayName,
    skills: "./skills",
    mcpServers: "./.mcp.json",
  }),
  ".claude-plugin/marketplace.json": json({
    name: abbie.name,
    owner: author,
    plugins: [
      {
        name: abbie.name,
        displayName: abbie.displayName,
        source: "./",
        description: abbie.shortDescription,
      },
    ],
  }),
  ".codex-plugin/plugin.json": json({
    name: abbie.name,
    version: abbie.version,
    description: abbie.shortDescription,
    author,
    homepage: abbie.homepage,
    repository: repositoryGit,
    license: abbie.license,
    keywords: abbie.keywords,
    skills: "./skills",
    mcpServers: "./.mcp.json",
    interface: {
      displayName: abbie.displayName,
      shortDescription: abbie.shortDescription,
      longDescription: abbie.longDescription,
      developerName: abbie.owner.name,
      category: abbie.category,
      logo: abbie.logo,
    },
  }),
  ".cursor-plugin/plugin.json": json({
    name: abbie.name,
    version: abbie.version,
    description: abbie.shortDescription,
    author,
    homepage: abbie.homepage,
    repository: repositoryGit,
    license: abbie.license,
    keywords: abbie.keywords,
    displayName: abbie.displayName,
    logo: abbie.logo.replace("./", ""),
    skills: "./skills",
    mcpServers: "./.mcp.json",
  }),
  ".cursor-plugin/marketplace.json": json({
    name: abbie.name,
    owner: author,
    metadata: { description: abbie.shortDescription },
    plugins: [
      {
        name: abbie.name,
        source: ".",
        description: abbie.shortDescription,
      },
    ],
  }),
  "server.json": json({
    $schema:
      "https://static.modelcontextprotocol.io/schemas/2025-09-29/server.schema.json",
    name: abbie.registryName,
    description: abbie.shortDescription,
    version: abbie.version,
    websiteUrl: abbie.homepage,
    repository: { url: abbie.repository, source: "github" },
    _meta: {
      "computer.abbie/cli-bridge": {
        command: abbie.mcp.command,
        args: abbie.mcp.args,
        transport: abbie.mcp.transport,
        authentication:
          "The installed Abbie CLI reads the operator credential locally; plugin manifests contain no credential.",
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
  return installClients
    .map(({ label, blurb, language, steps }) => {
      return [
        `### ${label}`,
        "",
        blurb,
        "",
        `\`\`\`${language}`,
        ...steps,
        "```",
      ].join("\n");
    })
    .join("\n\n");
}

function nextReadme(current: string) {
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
const generatedReadme = nextReadme(currentReadme);
if (generatedReadme !== currentReadme) {
  stale += 1;
  console.log(`${check ? "stale" : "wrote"}: README.md (install block)`);
  if (!check) {
    write("README.md", generatedReadme);
  }
}

if (check && stale > 0) {
  console.error(
    `${stale} generated file(s) are stale. Run \`pnpm generate\` and commit them.`,
  );
  process.exit(1);
}

console.log(check ? "generated files are current." : "generated all adapters.");
