# Abbie Project Work Contract

## One Product Model

Abbie presents the same conceptual sequence in its web, native, CLI, TUI, and
MCP surfaces:

1. A Project contains the durable intent and default Task profile.
2. That Project owns one stable Workspace.
3. The Workspace binds repository, branch, and optional directory source
   truth.
4. A Task is durable work within the Project.
5. A Task outcome is expressed as Result, Changes, Checks, and Proof.

The CLI and MCP tools are interfaces to this model, not separate stores.

## CLI and MCP Mapping

| Intent | CLI | MCP |
| --- | --- | --- |
| List Projects | `abbie project list --json` | `abbie_projects { action: "list" }` |
| Create Project | `abbie project create ... --json` | `abbie_projects { action: "create", ... }` |
| Inspect Project | `abbie project get <id> --json` | `abbie_projects { action: "get", project_id }` |
| Inspect Workspace | `abbie workspace show --project <id> --json` | `abbie_workspace { action: "show", project_id }` |
| Bind Workspace | `abbie workspace bind ... --json` | `abbie_workspace { action: "bind", ... }` |
| Report source truth | `abbie workspace status --project <id> --json` | `abbie_workspace { action: "report", ... }` |
| Start Task | `abbie task start ... --json` | `abbie_tasks { action: "start", ... }` |
| Inspect Task | `abbie task get <id> --json` | `abbie_tasks { action: "get", task_id }` |
| Continue Task | `abbie task continue <id> ... --json` | `abbie_tasks { action: "continue", ... }` |
| Cancel Task | `abbie task cancel <id> --json` | `abbie_tasks { action: "cancel", task_id }` |
| Inspect Changes | `abbie task changes <id> --json` | `abbie_tasks { action: "changes", task_id }` |

## Workspace State

`abbie workspace status` is the preferred local truth command because it
inspects Git and validates the result against the Workspace binding before
reporting it. Pay attention to:

- repository
- branch
- base and current revision
- dirty state
- ahead and behind counts
- sync state
- preview state, when supplied
- observed timestamp and source

An `unknown` value is real product state. Preserve it in summaries.

MCP `report` accepts explicit source facts. It does not inspect the caller's
local repository. Use it only when those facts come from a trustworthy local
host or operator.

## Task Profiles

- `safe` is for inspection, diagnosis, audits, and other work that should not
  change the Workspace.
- `workspace-write` permits a Task to prepare an authoritative change set.

The profile governs the Task; it does not silently approve a later apply or
draft pull request.

## Task States

Treat status literally:

- running or queued: work is not complete
- needs review or a handoff state: a person or caller must decide
- cancelled or failed: no success claim
- completed with no verified change set: report the Result and proof, but do
  not invent file changes
- completed with a verified change set: inspect it and use the proof-review
  workflow before any durable action

## JSON Output

CLI `--json` returns a canonical envelope:

```json
{
  "data": {},
  "meta": {
    "timestamp": "...",
    "cwd": "...",
    "command": "..."
  }
}
```

Read domain values from `data`. Do not treat `meta.cwd` as the Workspace
binding or source directory.

## Good Handoff

```text
Project: Website (project id ...)
Workspace: owner/repository @ main
Source: in-sync at revision ...
Task: ... — needs review
Result: implemented ...
Changes: verified change set ..., fingerprint ...
Checks: unit tests and typecheck passed
Proof: receipt ...
Next decision: inspect the change set, then choose apply or draft PR
```

## Bad Handoff

```text
Done. The changes are shipped.
```

This collapses Project identity, source truth, Task state, checks, proof, and
the action boundary into an unsupported success claim.
