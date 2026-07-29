---
name: abbie
description: "This skill should be used when an agent needs to operate Abbie through its authenticated MCP bridge, including listing or managing Projects, binding Workspace source truth, starting or following governed Tasks, or reviewing Task proof. Triggers include 'use Abbie', 'open this in Abbie', 'run an Abbie task', 'check the workspace', and 'review the proof'."
---

# Abbie

Operate Abbie through the installed product CLI's credential-safe MCP bridge.
Abbie remains the authority for Projects, stable Workspaces, governed Tasks,
change sets, checks, and proof.

## Use When

- The user asks to create, inspect, update, archive, or restore an Abbie Project.
- A Project needs a stable repository, branch, or local-directory binding.
- Work should run as a durable Abbie Task with explicit result and proof.
- An existing Task needs status, continuation, cancellation, or change review.
- The user wants a confirmed local apply or proof-backed draft pull request.

Do not use this skill for ordinary file edits that do not need Abbie state, or
for direct access to Abbie's remote bearer endpoint.

## Authenticate and Connect

The plugin never contains an Abbie credential. The product CLI owns the
operator token and bridges local stdio to Abbie's authenticated HTTP MCP
endpoint.

```sh
abbie account login
abbie account status --json
abbie mcp status --probe --json
```

Clients start the bridge with:

```sh
abbie mcp serve
```

`abbie account login` uses browser device authorization unless an operator
explicitly supplies `--token`. The resulting operator token stays in the
CLI's local credential backend. Never request, print, copy, or place that token
in plugin configuration.

## Core MCP Tools

- `abbie_projects` manages governed Projects with `list`, `get`, `create`,
  `update`, `archive`, and `restore`.
- `abbie_workspace` manages a Project's stable Workspace with `show`, `bind`,
  `status`, `report`, and `changes`.
- `abbie_tasks` manages durable Tasks with `list`, `get`, `start`, `cancel`,
  `continue`, `changes`, `apply`, and `draft-pr`.

Prefer these tools when they are mounted. Use the public `abbie` CLI when shell
access is needed for local Git inspection or local application.

## Workflow

### 1. Resolve the Project

Call `abbie_projects` with `action: "list"` before creating anything. Reuse a
matching Project. If none exists, call `action: "create"` with `name`,
`repo_url`, `repo_branch`, and a `default_task_profile` of `safe` or
`workspace-write`.

Capture the returned Project ID.

### 2. Establish Workspace Truth

Call `abbie_workspace` with:

```json
{
  "action": "show",
  "project_id": "<project-id>"
}
```

Use `bind` only when the repository, branch, or directory is absent or wrong.
Use `report` to record an observed revision, dirty state, ahead/behind counts,
sync state, and preview state. A remote MCP client cannot inspect a local Git
checkout automatically; use `abbie workspace status --project <id> --json`
from the intended checkout for that proof.

### 3. Start and Follow a Task

Call `abbie_tasks` with:

```json
{
  "action": "start",
  "project_id": "<project-id>",
  "prompt": "Implement the requested outcome and report Result, Changes, Checks, and Proof.",
  "safety_profile": "workspace-write"
}
```

Use `safe` for read-only work. Capture the Task ID, then poll `get` at a modest
interval. If the Task asks for clarification, surface the question. Continue
the same Task with `action: "continue"` and a refined prompt instead of
silently replacing it.

### 4. Review Result and Proof

Read `get` and `changes`. Keep these outcomes separate:

- Result: what the Task accomplished.
- Changes: the authoritative change-set ID, fingerprint, files, and operations.
- Checks: verification and blockers.
- Proof: durable receipts for the result and any action.

A prepared change set is not applied work. A prepared draft-PR action is not a
published pull request.

### 5. Cross a Mutation Boundary Deliberately

Before `apply` or `draft-pr`, present the exact change-set ID, fingerprint,
files, checks, and proof. Require explicit confirmation and a stable
idempotency key.

Use the CLI for actual local file application:

```sh
abbie task apply <task-id> \
  --confirm \
  --expected-change-set-id <change-set-id> \
  --expected-change-set-fingerprint <fingerprint> \
  --directory /absolute/repository/path \
  --json
```

Call a draft pull request published only when Abbie returns a pull-request URL
or an explicit published state.

## Example Flows

- Inspect: `abbie_projects list` → `abbie_workspace show` →
  `abbie_tasks list|get`.
- New governed work: Project `list|create` → Workspace `show|bind|report` →
  Task `start|get|continue` → `changes`.
- Apply: Task `get|changes` → local Workspace status → explicit confirmation →
  CLI `task apply` → Task and Workspace readback.
- Draft PR: Task `get|changes` → explicit confirmation →
  `abbie_tasks draft-pr` → verify returned URL and proof receipt.

## Guardrails

- Never expose the operator token or connect a plugin directly to the remote
  bearer endpoint.
- Never invent a second Project, Workspace, Task, or proof schema.
- Never turn inspection into confirmation.
- Never overwrite unrelated dirty files.
- Never claim local application from an MCP preparation alone.
- Preserve pending, blocked, needs-review, and unknown states exactly.

## Reference

Read [references/mcp-contract.md](references/mcp-contract.md) for the exact v1
tool actions, authentication boundary, and proof semantics.
