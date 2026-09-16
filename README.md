<p align="center">
  <img src="plugins/atoi/assets/logo.png" alt="Atoi" width="88" height="88" />
</p>

<h1 align="center">Atoi plugins</h1>

<p align="center"><strong>Work in Atoi from the agent you are already in.</strong></p>

<p align="center">
  <a href="https://atoi.app">Atoi</a> ·
  <a href="https://docs.atoi.app">Documentation</a>
</p>

---

The Atoi plugin brings Atoi into Claude Code, Codex and Cursor. Your agent gets
Atoi's governed operator tools (your Projects and Workspaces, the Workspace
Thread it can send to and steer, Tasks with change sets and proof, search, and
the Inbox decisions waiting for you) plus a skill that teaches it how to use
them. It acts with exactly the authority of your own account. Consequential
actions raise the same approval card you would get in the app, and everything
it does leaves a receipt you can read back in Atoi.

## Install

<!-- AUTO-GENERATED:INSTALL START -->

### 1. Connect the Atoi CLI once

Every client reaches Atoi through the installed CLI, which keeps your operator token in the system keychain and forwards each call to Atoi's authenticated MCP endpoint. Nothing in this repository holds a credential.

```sh
npm install -g @creative-int/atoi-cli
atoi account login
atoi mcp status --probe
```

`atoi account login` opens browser device authorization for your operator identity. It is not `atoi login`, which pairs a Computer. `atoi mcp status --probe` should report `live`. If you prefer a script, `curl -fsSL https://atoi.app/install.sh | bash` installs the same CLI.

### 2. Install the plugin in your client

#### Claude Code

```text
/plugin marketplace add creative-int/atoi-plugins
/plugin install atoi@atoi
```

The same two steps from a shell are `claude plugin marketplace add creative-int/atoi-plugins` and `claude plugin install atoi@atoi`.

#### Codex

```sh
codex plugin marketplace add creative-int/atoi-plugins
codex plugin add atoi@atoi
```

Start a new Codex session afterwards; `codex mcp list` shows the `atoi` server.

#### Cursor

```sh
git clone https://github.com/creative-int/atoi-plugins.git
cursor-agent --plugin-dir ./atoi-plugins/plugins/atoi
```

`plugins/atoi` is a standard Agent Plugin: Cursor reads its `plugin.json`, `skills/` and `mcp.json` directly.

#### Any other agent

Point the agent at [`plugins/atoi/skills/atoi/SKILL.md`](plugins/atoi/skills/atoi/SKILL.md) and give it the same MCP server: `atoi mcp serve` over stdio.

<!-- AUTO-GENERATED:INSTALL END -->

## How it connects

```text
your agent ──stdio──▶ atoi mcp serve ──HTTPS + bearer──▶ Atoi /mcp
                      (token from your keychain)
```

The plugin declares one MCP server, `atoi mcp serve`. The CLI reads your
operator token from the system keychain and forwards each call to Atoi's
authenticated `/mcp` endpoint (`atoi mcp status` prints it). No manifest,
example or skill in this repository contains a credential.

ChatGPT and Claude.ai cannot start a local process, so they need Atoi's hosted
OAuth connection, which is not available yet.

## Repository layout

```text
plugins/atoi/                    the plugin (Agent Plugins 1.0.0)
  plugin.json                    portable manifest; Codex presentation under extensions.com.openai
  mcp.json                       portable MCP configuration
  skills/                        the skills your agent loads
  assets/
.claude-plugin/marketplace.json  Claude Code catalog
.agents/plugins/marketplace.json Codex catalog
.cursor-plugin/marketplace.json  Cursor catalog
atoi.config.ts                   the one hand-edited source
tooling/                         generate and smoke
```

Every manifest and catalog is generated from `atoi.config.ts`; the skills are
edited directly.

## Develop

```sh
corepack pnpm@10.28.2 install
pnpm generate
pnpm verify
```

`pnpm verify` fails when a generated file is stale, when a manifest leaves the
Agent Plugins 1.0.0 schema, when a catalog stops resolving to `plugins/atoi`, or
when a shipped file carries a private path or a token.

## License

[MIT](LICENSE) © creative-int
