# Atoi Plugins

This repository is Atoi's public `agent-plugin-companion`. It ships one plugin,
`plugins/atoi`, packaged to the Agent Plugins 1.0.0 standard
(https://agent-plugins.org, `spec/1.0.0.md` in agentplugins/agent-plugins-spec),
and the catalogs Claude Code, Codex and Cursor read to install it. The Atoi
product repo remains the runtime and schema authority.

## Source of truth

`atoi.config.ts` is the single hand-edited source for identity, version,
catalog policy, and the MCP bridge. Never hand-edit what it generates:

- `plugins/atoi/plugin.json`
- `plugins/atoi/mcp.json`
- `.claude-plugin/marketplace.json`
- `.agents/plugins/marketplace.json`
- `.cursor-plugin/marketplace.json`
- `server.json`
- the README install block between generated markers

Skills under `plugins/atoi/skills/` are edited directly.

## Layout rules

- The plugin root holds only portable files: `plugin.json`, `mcp.json`,
  `skills/`, `assets/`. OpenAI presentation lives under
  `extensions.com.openai` in `plugin.json`, never in `.codex-plugin/`.
- Claude Code does not read a root `plugin.json` or `mcp.json`; its catalog
  entry carries the metadata and points `mcpServers` at `./mcp.json`.
- A second plugin is a new directory under `plugins/` and a new entry in each
  catalog.
- Bump `plugin.version` with every change a user should receive: Claude Code
  pins installs to that string.

## Delivery loop

```sh
pnpm generate
pnpm verify
git status --short
git add <intentional-files>
git commit -m "feat: ..."
```

Run `pnpm verify` before every commit. After pushing a change to `plugins/` or a
catalog, run `pnpm proof:install --source creative-int/atoi-plugins --record`
and commit the receipt: a client install path is claimed only with a receipt.

When the product's MCP registry changes, copy
`apps/docs/src/generated/mcp-reference.json` from the Atoi repo at a named
commit into `tooling/reference/`, update `SOURCE.json`, regenerate, and bump
the version.

## Boundaries

- The client boundary is `atoi mcp serve`; never put an operator token, a raw
  deployment host, or a private path in a manifest, example, log, receipt, or
  skill.
- Never advertise a command, install route, or tool without verifying it
  against the published CLI or the product's shipped MCP registry.
- Skills may use the public Atoi CLI and documented MCP tools. They must not
  depend on private paths or another product repository.
- Do not add workspace, Turbo, Biome, Knip, Codecov, `TESTING.md`, or `.npmrc`
  machinery while this remains an `agent-plugin-companion`.
- Do not publish npm packages or MCP Registry entries from this repository.

## Platform posture

Tooling-only companion repo; no product runtime surface.

`CLAUDE.md` must remain a symlink to this file.
