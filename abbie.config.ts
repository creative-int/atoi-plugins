export interface AbbiePluginConfig {
  name: "abbie";
  displayName: string;
  version: string;
  tagline: string;
  shortDescription: string;
  longDescription: string;
  homepage: string;
  repository: "https://github.com/creative-int/abbie-plugins";
  license: "MIT";
  owner: { name: string; email: string };
  category: string;
  keywords: string[];
  logo: string;
  mcp: {
    id: "abbie";
    command: "abbie";
    args: ["mcp", "serve"];
    transport: "stdio";
  };
  registryName: "io.github.creative-int/abbie";
  skills: Array<{
    name: "abbie-project-work" | "abbie-proof-review";
    aliases: string[];
    description: string;
  }>;
  tools: Array<{
    name: "abbie_projects" | "abbie_workspace" | "abbie_tasks";
    scope: "operator";
    description: string;
  }>;
}

export const abbie: AbbiePluginConfig = {
  name: "abbie",
  displayName: "Abbie",
  version: "0.1.0",
  tagline: "Governed project work, from source truth to proof.",
  shortDescription:
    "Connect agents to Abbie Projects, Workspaces, governed Tasks, and proof-bound change sets.",
  longDescription:
    "Abbie keeps project intent, stable Workspace source truth, durable Tasks, exact change sets, checks, proof, local apply, and draft pull requests in one governed workflow. This companion adds portable skills and credential-safe MCP wiring through the installed Abbie CLI.",
  homepage: "https://abbie.computer",
  repository: "https://github.com/creative-int/abbie-plugins",
  license: "MIT",
  owner: { name: "creative-int", email: "support@creative-int.com" },
  category: "Developer Tools",
  keywords: [
    "abbie",
    "mcp",
    "agent-skills",
    "projects",
    "workspaces",
    "tasks",
    "proof",
    "pull-requests",
  ],
  logo: "./assets/logo.png",
  mcp: {
    id: "abbie",
    command: "abbie",
    args: ["mcp", "serve"],
    transport: "stdio",
  },
  registryName: "io.github.creative-int/abbie",
  skills: [
    {
      name: "abbie-project-work",
      aliases: ["project", "workspace", "task"],
      description:
        "Set up or inspect an Abbie Project and Workspace, then run governed Tasks through Result, Changes, Checks, and Proof.",
    },
    {
      name: "abbie-proof-review",
      aliases: ["proof", "apply", "draft-pr"],
      description:
        "Review an authoritative Abbie Task change set and safely choose local apply or a proof-backed draft pull request.",
    },
  ],
  tools: [
    {
      name: "abbie_projects",
      scope: "operator",
      description:
        "List, inspect, create, update, archive, and restore governed Projects.",
    },
    {
      name: "abbie_workspace",
      scope: "operator",
      description:
        "Inspect, bind, report, and compare stable Workspace source truth.",
    },
    {
      name: "abbie_tasks",
      scope: "operator",
      description:
        "Start, inspect, continue, cancel, apply, or publish proof-bound Tasks.",
    },
  ],
};

export default abbie;
