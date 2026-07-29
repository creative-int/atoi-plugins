export type AbbiePluginsConfig = {
  product: "abbie";
  companionOf: "abbie";
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

export const abbieConfig: AbbiePluginsConfig = {
  product: "abbie",
  companionOf: "abbie",
  repoProfile: "agent-plugin-companion",
  mcp: {
    name: "abbie",
    endpoint: "https://kindly-terrier-129.convex.site/mcp",
    auth: "token",
    notes:
      "Clients connect through `abbie mcp serve`. `abbie account login` obtains the operator token, stores it in the local credential backend, and the stdio bridge forwards it as a bearer without exposing it to plugin manifests.",
  },
  skills: [
    {
      name: "abbie",
      dir: "skills/abbie",
      description:
        "Operate Abbie Projects, Workspaces, and governed Tasks through the authenticated MCP bridge.",
    },
    {
      name: "abbie-project-work",
      dir: "skills/abbie-project-work",
      description:
        "Set up or inspect an Abbie Project and Workspace, then follow governed Tasks through Result, Changes, Checks, and Proof.",
    },
    {
      name: "abbie-proof-review",
      dir: "skills/abbie-proof-review",
      description:
        "Review an authoritative Abbie Task change set and safely choose local apply or a proof-backed draft pull request.",
    },
  ],
  clients: ["claude", "codex", "cursor"],
};

export default abbieConfig;
