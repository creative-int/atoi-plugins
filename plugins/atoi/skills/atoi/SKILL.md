---
name: atoi
description: "Operate Atoi from this agent with the person's own authority: their Workspaces and Projects, the one Thread per Workspace (send, reply, steer, approve), governed Tasks with change sets, checks and proof, search, Inbox decisions, Ideas, plans, automations, channels, skills, settings, usage and readiness. Use when the person asks to do something in Atoi, to check what is waiting for them in Atoi, to run or review an Atoi task, or to read back what an agent did there."
---

# Atoi

Atoi is where the person's projects, conversations and governed work live.
Through this plugin you act in Atoi with exactly the authority of their own
account. Nothing you do is hidden from them: every action leaves a receipt they
can read back in the app.

## First, check you have hands

The `atoi_*` tools come from the local bridge `atoi mcp serve`, which the
person's installed Atoi CLI runs. If the tools are missing, or a call fails
with a login or transport error, check from a shell:

```sh
atoi account status --json
atoi mcp status --probe --json
```

- Disconnected, or `login-required`: ask the person to run
  `atoi account login`, which opens browser device authorization. Do not
  suggest `atoi login`; that pairs a Computer and gives you no tools.
- Never ask for, print, copy or store the operator token.
- Once connected, `atoi_doctor` with `{"action": "status"}` returns Atoi's
  readiness ledger.

## The model

- A **Workspace** is a place the person belongs to. Their **Personal**
  Workspace is used when you pass no `workspace_id`.
- Each Workspace has one **Thread**: the conversation with Atoi's agent.
- A **Project** holds durable intent and, for code work, one stable source
  binding: repository, branch, optional directory.
- A **Task** is governed work in a Project. Its outcome is four separate
  things: **Result**, **Changes** (one authoritative change set with an id and
  a fingerprint), **Checks**, and **Proof** (receipts).

## The tools

<!-- AUTO-GENERATED:TOOLS START -->

| Tool | Actions |
| --- | --- |
| `atoi_projects` | `list` `get` `create` `update` `archive` `restore` |
| `atoi_workspace` | `create` `update` `list` `show` `bind` `status` `report` `changes` |
| `atoi_tasks` | `list` `get` `start` `cancel` `continue` `changes` `apply` `draft-pr` |
| `atoi_threads` | `list` `get` `resolve` `send` `reply` `steer` `attach` `retry` `stop` `react` `approve` `deny` `launch` `pin` `unpin` `timings` |
| `atoi_search` | search by `query` |
| `atoi_inbox` | `list` `keep` `edit` `dismiss` `approve` `deny` `snooze` |
| `atoi_ideas` | `list` `refresh` `answer` `dismiss` |
| `atoi_usage` | `get` |
| `atoi_plan` | `list` `archive` `restore` |
| `atoi_automations` | `list` `get` `create` `update` `toggle` `trigger` `remove` |
| `atoi_channels` | `list` `get` `authorize` `revoke` `test` |
| `atoi_skills` | `list` `get` `enable` `disable` `remove` |
| `atoi_plugins` | `list` `get` `install` `enable` `disable` `remove` |
| `atoi_settings` | `get` `set` `unset` `authorize` `disconnect` |
| `atoi_doctor` | `status` |

<!-- AUTO-GENERATED:TOOLS END -->

Every argument, requirement and example is in
[references/tools.md](references/tools.md), generated from the reference Atoi
ships. Read a tool's entry there before you call it for the first time.

## How to work

### Read before you write

Start from reads: `atoi_inbox` `list`, `atoi_search`, `atoi_threads` `get`,
`atoi_tasks` `get`. Take ids from what a read returns; never construct one.

### Talk to a Workspace's Thread

1. `atoi_threads` `resolve` with the `workspace_id` you want, or none for
   Personal. It returns the Thread and opens it if it did not exist yet.
2. `send` with a `prompt` and a `delivery_id` you keep. Reuse that same
   `delivery_id` if you retry, so a retry never posts twice.
3. Read the answer with `get`. `timings` shows where the wait after a send
   went. `steer` redirects a reply in flight; `stop` ends it.
4. When the Thread raises an ask, put the decision in front of the person.
   Call `approve` or `deny` with its `request_id` and `confirmation: true` only
   after they have chosen.

### Run governed work

1. `atoi_projects` `list`. Reuse a matching Project; `create` one only when
   none matches.
2. `atoi_workspace` `show` with the `project_id` to see the source binding.
   `bind` only when it is missing or wrong.
3. `atoi_tasks` `start` with the `project_id`, a `prompt` that names the
   outcome and the proof you expect, and a `safety_profile`: `safe` for reading
   and auditing, `workspace-write` only when changes are intended.
4. Poll `get` at a modest interval. If the Task asks a question, put it to the
   person and answer with `continue` on the same Task. Do not start a
   replacement.
5. Read `changes`, then report Result, Changes, Checks and Proof separately.

### Cross a mutation boundary on purpose

- A request to review is not a request to apply. Show the person the
  change-set id, fingerprint, files and checks, and wait for their choice.
- `apply` and `draft-pr` take the `change_set_id`, the
  `change_set_fingerprint`, `confirmation: true`, and an `idempotency_key` you
  keep for retries. The terminal uses `apply:<fingerprint>` and
  `draft-pr:<fingerprint>`; use the same keys.
- An MCP `apply` records the governed action but cannot change files in the
  person's checkout. For the local write, run the terminal from that checkout
  and report its `localApply`:

  ```sh
  atoi task apply <task-id> --confirm \
    --expected-change-set-id <id> \
    --expected-change-set-fingerprint <fingerprint> --json
  ```

- A draft pull request exists only when the result carries its URL.

### Approvals Atoi raises for its own agent

When Atoi's agent reaches a floor verb (spending, sending outside Atoi,
deleting, publishing, force pushing), it raises an approval card instead of
acting, in every governance mode. Those cards reach you through `atoi_inbox`
and as asks on the Thread. Do not answer one on the person's behalf.

### Report ids, not adjectives

Report the Workspace, Project, Thread and Task ids; the change-set id and
fingerprint; the action id and idempotency key; the applied revision or the
pull-request URL; and the proof receipt ids. Keep every state that is not final
exactly as Atoi reports it: a `queued`, `running` or `paused` run, a `prepared`
action, a `partial` or `unverified` proof, an `unknown` source state. None of
them means done.

## The terminal twin

Each tool has a terminal equivalent, `atoi <topic> <verb> --json`, with topics
such as `workspace`, `project`, `task`, `thread`, `search`, `inbox`, `ideas`,
`plan`, `automation`, `channel`, `skill`, `plugin`, `settings`, `usage` and
`doctor` (`atoi help` lists them all). Read values from `data`, never from
`meta.cwd`. The terminal remembers a Workspace between calls
(`atoi workspace use <id>`); tool calls name `workspace_id` instead.

Read [references/work-and-proof.md](references/work-and-proof.md) for Task
states, change-set protection, idempotency, failure handling and a handoff
template.
