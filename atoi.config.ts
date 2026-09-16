export type ClientId = "claude-code" | "codex" | "cursor";

export type AtoiPluginsConfig = {
  product: "atoi";
  companionOf: "atoi";
  repoProfile: "agent-plugin-companion";
  marketplace: {
    name: string;
    displayName: string;
    description: string;
    owner: { name: string; email: string; url: string };
  };
  plugin: {
    name: string;
    dir: string;
    version: string;
    displayName: string;
    description: string;
    homepage: string;
    repository: string;
    license: string;
    keywords: string[];
    logo: string;
  };
  claudeCode: {
    category: string;
  };
  codex: {
    category: string;
    installation: "AVAILABLE" | "INSTALLED_BY_DEFAULT" | "NOT_AVAILABLE";
    authentication: "ON_INSTALL" | "ON_USE";
    shortDescription: string;
    longDescription: string;
    capabilities: string[];
    defaultPrompt: string[];
  };
  mcp: {
    server: string;
    command: string;
    args: string[];
    auth: "bearer";
  };
  cli: {
    package: string;
    installCommand: string;
    installScript: string;
  };
  clients: ClientId[];
};

export const atoiConfig: AtoiPluginsConfig = {
  product: "atoi",
  companionOf: "atoi",
  repoProfile: "agent-plugin-companion",
  marketplace: {
    name: "atoi",
    displayName: "Atoi",
    description: "Atoi's first-party agent plugins.",
    owner: {
      name: "creative-int",
      email: "support@creative-int.com",
      url: "https://atoi.app",
    },
  },
  plugin: {
    name: "atoi",
    dir: "plugins/atoi",
    version: "0.2.0",
    displayName: "Atoi",
    description:
      "Work in Atoi from the agent you are already in: Projects, Workspaces, the Workspace Thread, governed Tasks with change sets and proof, search, Inbox decisions, and receipts for every action.",
    homepage: "https://atoi.app",
    repository: "https://github.com/creative-int/atoi-plugins",
    license: "MIT",
    keywords: [
      "atoi",
      "mcp",
      "agent-skills",
      "projects",
      "workspaces",
      "tasks",
      "threads",
    ],
    logo: "./assets/logo.png",
  },
  claudeCode: {
    category: "productivity",
  },
  codex: {
    category: "Developer Tools",
    installation: "AVAILABLE",
    authentication: "ON_USE",
    shortDescription: "Work in Atoi from the agent you are already in",
    longDescription:
      "Atoi brings its governed verbs into Codex: Projects and Workspaces, the Workspace Thread, Tasks with change sets and proof, search, Inbox decisions, Ideas, plans, automations, channels, skills, settings, usage, and a readiness check. Consequential actions raise the same approval card a person gets, and every action leaves a receipt you can read back in Atoi.",
    capabilities: ["Read", "Write"],
    defaultPrompt: [
      "What is waiting for me in my Atoi inbox?",
      "Start a safe Atoi task that audits this project.",
      "Review the change set on my latest Atoi task.",
    ],
  },
  mcp: {
    server: "atoi",
    command: "atoi",
    args: ["mcp", "serve"],
    auth: "bearer",
  },
  cli: {
    package: "@creative-int/atoi-cli",
    installCommand: "npm install -g @creative-int/atoi-cli",
    installScript: "curl -fsSL https://atoi.app/install.sh | bash",
  },
  clients: ["claude-code", "codex", "cursor"],
};

export default atoiConfig;
