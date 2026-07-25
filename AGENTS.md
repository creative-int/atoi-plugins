# Abbie Plugins

This repository is the public distribution companion for Abbie. It owns
portable skills and generated plugin/MCP manifests. It does not own the Abbie
runtime, product schema, credentials, or task execution.

## Rules

- Edit `abbie.config.ts` and run `pnpm generate`; do not hand-edit generated
  manifests or the generated README install block.
- Keep credentials out of source, examples, logs, and receipts.
- The MCP boundary is `abbie mcp serve`. Do not connect plugins directly to a
  bearer-authenticated remote URL.
- Public skills may use Abbie's public CLI and the three documented MCP tools.
  They must not reference private paths, repositories, or operator tooling.
- Run `pnpm verify` before committing. Commit and push scoped green changes.
- Do not publish packages or MCP Registry entries from this repository.
