---
name: atoi-project-work
description: "This skill should be used when setting up or inspecting an Atoi Project, binding its stable Workspace source truth, starting or continuing a governed Task, or following work through Result, Changes, Checks, and Proof. Triggers include 'set up an Atoi project', 'bind this repo', 'run this as an Atoi task', 'check task progress', and 'continue this task'."
---

# Atoi Project Work

Use Atoi as the authority for project identity, Workspace source truth, and
durable Task outcomes. Keep the sequence intact:
Project → Workspace → Task → Result · Changes · Checks · Proof.

## Preconditions

1. Confirm the product CLI is connected:

   ```sh
   atoi account status --json
   atoi mcp status --probe --json
   ```

2. If the account is disconnected, ask the user to run:

   ```sh
   atoi account login
   ```

3. Never request, copy, print, or place an Atoi token in a plugin
   configuration. The local `atoi mcp serve` bridge owns credentials.

## Choose the Surface

- Prefer the `atoi_projects`, `atoi_workspace`, and `atoi_tasks` MCP tools
  when they are mounted in the current agent.
- Use the public `atoi` CLI when shell access is available or when the task
  requires local source inspection or local application.
- Use `--json` for machine-readable CLI calls.
- Do not invent a second project, workspace, task, or proof schema.

## Workflow

### 1. Resolve the Project

List Projects before creating one:

```sh
atoi project list --json
```

With MCP, call `atoi_projects` with `action: "list"`.

Reuse a Project when its identity and repository match. Create only when no
matching Project exists:

```sh
atoi project create \
  --name "My project" \
  --repo owner/repository \
  --branch main \
  --profile workspace-write \
  --json
```

With MCP, call `atoi_projects` with `action: "create"`, `name`, `repo_url`,
`repo_branch`, and `default_task_profile`.

Capture the returned Project ID. Treat it as the stable identifier for every
following step.

### 2. Establish Workspace Source Truth

Inspect the Project's one stable Workspace:

```sh
atoi workspace show --project <project-id> --json
```

Bind it only when the intended repository, branch, or directory is absent or
wrong:

```sh
atoi workspace bind \
  --project <project-id> \
  --repo owner/repository \
  --branch main \
  --directory /absolute/repository/path \
  --json
```

From the bound repository, report current local source truth:

```sh
atoi workspace status --project <project-id> --json
```

The status command checks repository and branch identity before reporting the
revision, dirty state, ahead/behind counts, and sync state. Do not start
workspace-writing work while the binding and local checkout disagree.

MCP clients may use `atoi_workspace` with `show`, `bind`, or `report`.
Only a local CLI can inspect the current Git checkout automatically.

### 3. Start the Governed Task

Use a prompt with a concrete outcome and proof boundary:

```sh
atoi task start \
  --project <project-id> \
  --profile workspace-write \
  --prompt "Implement the requested change and report Result, Changes, Checks, and Proof." \
  --json
```

Use `safe` for read-only or diagnostic work and `workspace-write` only when
changes are intended. With MCP, call `atoi_tasks` with `action: "start"`,
`project_id`, `prompt`, and `safety_profile`.

Capture the returned Task ID.

### 4. Follow the Task to a Decision Boundary

For a blocking CLI wait:

```sh
atoi task wait <task-id> --json
```

For MCP, poll `atoi_tasks` with `action: "get"` and `task_id`. Avoid rapid
polling; use a short interval and stop at a handoff or terminal state.

When the Task requests clarification, surface the question without guessing.
When the Task needs a changed brief, continue the same Task:

```sh
atoi task continue <task-id> \
  --prompt "Refined instruction" \
  --json
```

Do not create a replacement Task merely to answer a follow-up.

### 5. Read the Four-Part Outcome

Inspect the Task:

```sh
atoi task get <task-id> --json
```

Report each part distinctly:

- **Result** — what the Task accomplished.
- **Changes** — the exact authoritative change set.
- **Checks** — verification that ran and its outcome.
- **Proof** — durable receipts for the result and actions.

If a verified change set exists, inspect it separately:

```sh
atoi task changes <task-id> --json
```

Do not describe work as applied or published merely because a change set was
prepared. Use `atoi-proof-review` for the mutation decision.

## Completion Contract

Return:

- Project name and ID
- Workspace binding and reported source state
- Task ID and status
- Result
- Change-set status and fingerprint, if present
- Checks
- Proof receipt identifiers
- The next explicit decision, if any

## Guardrails

- Never bypass a required confirmation.
- Never claim local files changed from an MCP `apply` preparation alone.
- Never infer a draft pull request from a prepared receipt; require its URL or
  explicit published state.
- Never expose credentials or local secret storage.
- Never collapse unknown, pending, stalled, or needs-review into success.

## Reference

Read [references/project-work-contract.md](references/project-work-contract.md)
for command and MCP mappings, state semantics, and handoff examples.
