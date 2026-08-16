export type AtoiPluginsConfig = {
  product: "atoi";
  companionOf: "atoi";
  repoProfile: "agent-plugin-companion";
  mcp: {
    name: string;
    endpoint: string;
    auth: "oauth" | "token";
    notes?: string;
  };
  skills: Array<{ name: string; dir: string; description: string }>;
  clients: Array<"claude" | "codex" | "cursor">;
};

export const atoiConfig: AtoiPluginsConfig = {
  product: "atoi",
  companionOf: "atoi",
  repoProfile: "agent-plugin-companion",
  mcp: {
    name: "atoi",
    endpoint: "https://kindly-terrier-129.convex.site/mcp",
    auth: "token",
    notes:
      "Clients connect through `atoi mcp serve`. `atoi account login` obtains the operator token, stores it in the local credential backend, and the stdio bridge forwards it as a bearer without exposing it to plugin manifests.",
  },
  skills: [
    {
      name: "atoi",
      dir: "skills/atoi",
      description:
        "Operate Atoi Projects, Workspaces, and governed Tasks through the authenticated MCP bridge.",
    },
    {
      name: "atoi-project-work",
      dir: "skills/atoi-project-work",
      description:
        "Set up or inspect an Atoi Project and Workspace, then follow governed Tasks through Result, Changes, Checks, and Proof.",
    },
    {
      name: "atoi-proof-review",
      dir: "skills/atoi-proof-review",
      description:
        "Review an authoritative Atoi Task change set and safely choose local apply or a proof-backed draft pull request.",
    },
  ],
  clients: ["claude", "codex", "cursor"],
};

export default atoiConfig;
