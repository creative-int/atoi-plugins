# Abbie Plugins

This repository is Abbie's public `agent-plugin-companion`. It distributes
portable skills and generated Claude Code, Codex, Cursor, MCP, and registry
metadata. The Abbie product repo remains the runtime and schema authority.

## Source of truth

`abbie.config.ts` is the single hand-edited source for product identity,
companion metadata, MCP endpoint and authentication posture, supported clients,
and distributed skills.

Never hand-edit generated files:

- `.mcp.json`
- `server.json`
- `.claude-plugin/`
- `.codex-plugin/`
- `.cursor-plugin/`
- the README install block between generated markers

## Delivery loop

```sh
pnpm generate
pnpm smoke
git status --short
git add <intentional-files>
git commit -m "feat: ..."
```

Run `pnpm verify` before every commit. Publishing and pushing are owner actions
unless a task explicitly authorizes them.

## Boundaries

- The client boundary is `abbie mcp serve`; never put an operator token in a
  manifest, example, log, receipt, or skill.
- Skills may use the public Abbie CLI and documented MCP tools. They must not
  depend on private paths or another product repository.
- Do not add workspace, Turbo, Biome, Knip, Codecov, `TESTING.md`, or `.npmrc`
  machinery while this remains an `agent-plugin-companion`.
- Do not publish npm packages or MCP Registry entries from this repository.

`CLAUDE.md` must remain a symlink to this file.
