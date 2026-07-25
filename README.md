<p align="center">
  <img src="assets/logo.png" alt="Abbie" width="88" height="88" />
</p>

<h1 align="center">Abbie plugins</h1>

<p align="center"><strong>Governed project work, from source truth to proof.</strong></p>

<p align="center">
  Portable skills and credential-safe MCP wiring for
  <a href="https://abbie.computer">Abbie</a>.
</p>

---

## Install

<!-- AUTO-GENERATED:INSTALL START -->

### Prerequisite

Install the Abbie product CLI, connect your operator identity once, and verify the governed bridge.

```sh
abbie account login
abbie mcp status --probe
```

### Skills in any compatible agent

Install both portable workflows in Claude Code, Codex, Cursor, Copilot, Windsurf, and other skill-aware agents.

```sh
npx skills add creative-int/abbie-plugins
```

### Claude Code plugin

Add the marketplace, then install the Abbie plugin.

```text
/plugin marketplace add creative-int/abbie-plugins
/plugin install abbie@abbie
```

### Codex plugin

Add this repository as a Codex plugin marketplace, then install Abbie from the plugin picker.

```sh
codex plugin marketplace add creative-int/abbie-plugins
```

### Cursor plugin

Add this repository as a Cursor plugin marketplace.

```text
Cursor → Settings → Plugins → Add marketplace → creative-int/abbie-plugins
```

### Any local MCP client

Use the credential-safe stdio bridge. The configuration contains no token and works from any directory where `abbie` is on PATH.

```json
{
  "mcpServers": {
    "abbie": {
      "command": "abbie",
      "args": [
        "mcp",
        "serve"
      ]
    }
  }
}
```

<!-- AUTO-GENERATED:INSTALL END -->

The plugin does not contain an Abbie credential. `abbie mcp serve` reads the
operator credential from the installed product CLI and writes only MCP
JSON-RPC to stdout.

## Included skills

- **`abbie-project-work`** — set up or inspect a Project and stable Workspace,
  then run a governed Task through Result, Changes, Checks, and Proof.
- **`abbie-proof-review`** — review the authoritative change set and choose
  local apply or a proof-backed draft pull request without bypassing
  confirmation or idempotency.

## MCP tools

The live server exposes exactly:

- `abbie_projects`
- `abbie_workspace`
- `abbie_tasks`

The Abbie backend remains the authority for every tool call. This repository
contains no task runtime and no client-side mutation implementation.

## Develop

```sh
corepack pnpm@10.28.2 install
pnpm generate
pnpm verify
pnpm receipt
```

`server.json` is repository metadata with a publisher extension describing the
Abbie CLI bridge. It is not published to the MCP Registry until the CLI has a
compatible public package entry.

## License

[MIT](LICENSE) © creative-int
