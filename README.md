<p align="center">
  <img src="assets/logo.png" alt="Abbie" width="88" height="88" />
</p>

<h1 align="center">Abbie plugins</h1>

<p align="center"><strong>Governed project work, from source truth to proof.</strong></p>

<p align="center">
  The public agent-plugin companion for
  <a href="https://abbie.computer">Abbie</a>.
</p>

<p align="center">
  <a href="https://docs.abbie.computer">Documentation</a> ·
  <a href="https://abbie.computer">Product</a>
</p>

---

## What this repo is

`abbie-plugins` distributes portable Abbie skills and generated setup for
Claude Code, Codex, and Cursor. It is an `agent-plugin-companion` whose
`companionOf` product is `abbie`; it does not contain Abbie's backend, task
runtime, credentials, or product schema.

Every client connects through `abbie mcp serve`. The installed Abbie CLI owns
the operator token and bridges local stdio to Abbie's authenticated MCP
endpoint without placing credentials in this repository.

## Install

<!-- AUTO-GENERATED:INSTALL START -->

### Prerequisite

Install the Abbie product CLI, connect your operator identity once, and verify the governed bridge.

```sh
abbie account login
abbie mcp status --probe
```

### Claude Code

Add the companion marketplace and install Abbie. The plugin starts the local credential-safe MCP bridge.

```text
/plugin marketplace add creative-int/abbie-plugins
/plugin install abbie@abbie
```

### Codex

Add the companion marketplace, then install Abbie from the plugin picker. The equivalent direct MCP configuration is shown below.

```sh
codex plugin marketplace add creative-int/abbie-plugins
```

```toml
[mcp_servers.abbie]
command = "abbie"
args = ["mcp", "serve"]
```

### Cursor

Add the companion marketplace in Cursor, or place the equivalent MCP configuration in `.cursor/mcp.json`.

```text
Cursor → Settings → Plugins → Add marketplace → creative-int/abbie-plugins
```

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

### Portable skills

Install the Abbie skills without a client plugin. This does not connect MCP by itself.

```sh
npx skills add creative-int/abbie-plugins
```

<!-- AUTO-GENERATED:INSTALL END -->

## Included skills

- **`abbie`** — complete MCP bridge guide: authentication, core tools, common
  Project → Workspace → Task flows, proof review, and mutation guardrails.
- **`abbie-project-work`** — set up or inspect a Project and stable Workspace,
  then follow a governed Task through Result, Changes, Checks, and Proof.
- **`abbie-proof-review`** — review the authoritative change set and choose
  local apply or a proof-backed draft pull request without bypassing
  confirmation or idempotency.

## MCP surface

The governed v1 bridge exposes:

- `abbie_projects`
- `abbie_workspace`
- `abbie_tasks`

The Abbie backend remains authoritative for every call. See the
[Abbie documentation](https://docs.abbie.computer) for product concepts and
setup.

## Develop

```sh
corepack pnpm@10.28.2 install
pnpm generate
pnpm smoke
pnpm verify
```

Generated files must never be hand-edited. Change `abbie.config.ts`, generate,
smoke, and commit the resulting artifacts together.

## License

[MIT](LICENSE) © creative-int
