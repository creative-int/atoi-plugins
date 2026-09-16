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
the fifteen operator tools Atoi ships (your Workspaces and Projects, the
Workspace Thread it can send to and steer, Tasks with change sets and proof,
search, Inbox decisions, Ideas, plans, automations, channels, skills,
settings, usage and a readiness check) plus a skill that teaches it how to use
them. It acts with exactly the authority of your own account, never without
your confirmation on a consequential step, and everything it does leaves a
receipt you can read back in Atoi.

## Install

<!-- AUTO-GENERATED:INSTALL START -->

### 1. Connect the Atoi CLI once

Every client reaches Atoi through the installed CLI, which keeps your operator token in the system keychain and forwards each call to Atoi's authenticated MCP endpoint. Nothing in this repository holds a credential.

```sh
npm install -g @creative-int/atoi-cli
atoi account login
atoi mcp status --probe
```

`atoi account login` opens browser device authorization for your operator identity. It is not `atoi login`, which pairs a Computer. `atoi mcp status --probe` then checks the whole path: your login, the endpoint, and the tools Atoi returns. If you prefer a script, `curl -fsSL https://atoi.app/install.sh | bash` installs the same CLI.

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

## What your agent can do

<!-- AUTO-GENERATED:TOOLS START -->

| Tool | What it does |
| --- | --- |
| `atoi_projects` | List, get, create, update, archive, or restore governed Atoi Projects. A list answers one Workspace: workspace_id, or your Personal Workspace when none is given. |
| `atoi_workspace` | Create or list your Atoi Workspaces, or show and bind the stable source associated with an Atoi Project. |
| `atoi_tasks` | List, get, start, cancel, continue, inspect, apply, or publish authoritative Atoi Task change sets. Poll get for wait semantics. |
| `atoi_threads` | Drive a workspace Thread the way the app does: resolve a workspace to its one Thread, list, inspect pending decisions, send, reply, steer, attach a file to the turn that carries it, retry, stop, react, approve or deny, launch a Task, pin, unpin, or read where the wait after each send went, through the authenticated operator surface. |
| `atoi_search` | Search accessible Atoi threads, messages, projects, Tasks, files, and outputs. |
| `atoi_inbox` | List Inbox cards and answer each in its own words: keep, edit, or dismiss a memory card; approve or deny an approval; snooze any card. |
| `atoi_ideas` | Read the Ideas the agent wrote for this account, refresh them, answer the current ask, or dismiss a connection suggestion. |
| `atoi_usage` | Read what this person's turns cost: today, the last days, and the models that spent it, from the model-decision receipts. |
| `atoi_plan` | List the plans in one Workspace or Project with their ids, titles, status and progress, or retire or restore one of the person's plans. |
| `atoi_automations` | List, inspect, create, update, toggle, trigger, or remove Atoi Automations with schedule and receipt readback. |
| `atoi_channels` | List and inspect user-owned Atoi Channels, open browser-native connection flows, revoke links, or send a receipt-backed test. |
| `atoi_skills` | List, inspect, enable, disable, or remove user-owned Atoi Skills with durable skill receipts. |
| `atoi_plugins` | List, inspect, install, enable, disable, or remove the pinned first-party Atoi plugin release with durable plugin receipts. |
| `atoi_settings` | Read canonical settings and connector state from the settings registry, set any writable non-secret setting by key, return one setting to the default it came from, or connect and disconnect browser-owned Atoi connections. |
| `atoi_doctor` | Return the canonical Atoi runtime readiness ledger and compact receipt without promoting unobserved checks to ready. |

<!-- AUTO-GENERATED:TOOLS END -->

The table is generated from the MCP reference Atoi ships
(`tooling/reference/`). The skill in
[`plugins/atoi/skills/atoi`](plugins/atoi/skills/atoi/SKILL.md) teaches the
order of work: read before you write, resolve the Workspace's Thread, run
Tasks under a safety profile, and cross every mutation boundary with the
person's explicit confirmation and a stable idempotency key.

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
tooling/                         generate, smoke, install proof, the vendored MCP reference
docs/proofs/install/             per-client install proofs with receipts
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
Agent Plugins 1.0.0 schema, when a catalog stops resolving to `plugins/atoi`,
when the skill names a tool Atoi does not ship, or when a shipped file carries
a private path or a token.

`pnpm proof:install --source creative-int/atoi-plugins --record` installs the
published plugin from a fresh clone into Claude Code, Codex and Cursor, and
writes what each client reports to [`docs/proofs/install`](docs/proofs/install/README.md).

## License

[MIT](LICENSE) © creative-int
