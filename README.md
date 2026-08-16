<p align="center">
  <img src="assets/logo.png" alt="Atoi" width="88" height="88" />
</p>

<h1 align="center">Atoi plugins</h1>

<p align="center"><strong>Governed project work, from source truth to proof.</strong></p>

<p align="center">
  The public agent-plugin companion for
  <a href="https://atoi.app">Atoi</a>.
</p>

<p align="center">
  <a href="https://docs.atoi.app">Documentation</a> ·
  <a href="https://atoi.app">Product</a>
</p>

---

## What this repo is

`atoi-plugins` distributes portable Atoi skills and generated setup for
Claude Code, Codex, and Cursor. It is an `agent-plugin-companion` whose
`companionOf` product is `atoi`; it does not contain Atoi's backend, task
runtime, credentials, or product schema.

Every client connects through `atoi mcp serve`. The installed Atoi CLI owns
the operator token and bridges local stdio to Atoi's authenticated MCP
endpoint without placing credentials in this repository.

## Install

<!-- AUTO-GENERATED:INSTALL START -->

### Prerequisite

Install the Atoi product CLI, connect your operator identity once, and verify the governed bridge.

```sh
atoi account login
atoi mcp status --probe
```

### Claude Code

Add the companion marketplace and install Atoi. The plugin starts the local credential-safe MCP bridge.

```text
/plugin marketplace add creative-int/atoi-plugins
/plugin install atoi@atoi
```

### Codex

Add the companion marketplace, then install Atoi from the plugin picker. The equivalent direct MCP configuration is shown below.

```sh
codex plugin marketplace add creative-int/atoi-plugins
```

```toml
[mcp_servers.atoi]
command = "atoi"
args = ["mcp", "serve"]
```

### Cursor

Add the companion marketplace in Cursor, or place the equivalent MCP configuration in `.cursor/mcp.json`.

```text
Cursor → Settings → Plugins → Add marketplace → creative-int/atoi-plugins
```

```json
{
  "mcpServers": {
    "atoi": {
      "command": "atoi",
      "args": [
        "mcp",
        "serve"
      ]
    }
  }
}
```

### Portable skills

Install the Atoi skills without a client plugin. This does not connect MCP by itself.

```sh
npx skills add creative-int/atoi-plugins
```

<!-- AUTO-GENERATED:INSTALL END -->

## Included skills

- **`atoi`** — complete MCP bridge guide: authentication, core tools, common
  Project → Workspace → Task flows, proof review, and mutation guardrails.
- **`atoi-project-work`** — set up or inspect a Project and stable Workspace,
  then follow a governed Task through Result, Changes, Checks, and Proof.
- **`atoi-proof-review`** — review the authoritative change set and choose
  local apply or a proof-backed draft pull request without bypassing
  confirmation or idempotency.

## MCP surface

The governed v1 bridge exposes:

- `atoi_projects`
- `atoi_workspace`
- `atoi_tasks`

The Atoi backend remains authoritative for every call. See the
[Atoi documentation](https://docs.atoi.app) for product concepts and
setup.

## Develop

```sh
corepack pnpm@10.28.2 install
pnpm generate
pnpm smoke
pnpm verify
```

Generated files must never be hand-edited. Change `atoi.config.ts`, generate,
smoke, and commit the resulting artifacts together.

## License

[MIT](LICENSE) © creative-int
