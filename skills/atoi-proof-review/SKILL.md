---
name: atoi-proof-review
description: "This skill should be used when an Atoi Task has produced a change set that needs inspection, when deciding whether to apply it locally or publish a draft pull request, or when verifying an existing action receipt. Triggers include 'review this Atoi task', 'apply the change set', 'make a draft PR', 'check the proof', and 'what did this task change'."
---

# Atoi Proof Review

Review the authoritative Task change set before any durable action. Keep
inspection separate from confirmation, and preserve Atoi's idempotency and
proof receipts.

## Preconditions

You need a Task ID and a connected Atoi operator identity:

```sh
atoi account status --json
atoi mcp status --probe --json
```

If the Task has not reached a review or terminal boundary, return to
`atoi-project-work`.

## Workflow

### 1. Inspect the Task

```sh
atoi task get <task-id> --json
atoi task changes <task-id> --json
```

With MCP, call `atoi_tasks` with `action: "get"` and then
`action: "changes"`.

Record:

- Task status
- Result
- change-set ID
- change-set status
- fingerprint
- files and operations
- blockers
- checks
- proof receipt

Stop if the change set is absent, unverified, stale, or blocked. Do not repair
or reinterpret it client-side.

### 2. Compare Workspace Truth

Before a local apply, run from the intended repository:

```sh
atoi workspace status --project <project-id> --json
```

Verify the local repository and branch match the Workspace binding. Note any
dirty files and the current revision. Do not overwrite unrelated work.

For a draft pull request, confirm the Workspace has a repository binding and
that the requested head branch is appropriate.

### 3. Present the Decision

Summarize the exact change set before asking for confirmation:

```text
Task: <id>
Change set: <id>
Fingerprint: <fingerprint>
Files: <count and paths>
Checks: <pass/fail/pending>
Proof: <receipt>
Available actions: apply locally | publish draft PR | leave unchanged
```

The user's choice is an action boundary. Never infer confirmation from an
earlier request to inspect or review.

### 4A. Apply Locally

Use the public CLI for the actual local write:

```sh
atoi task apply <task-id> \
  --confirm \
  --expected-change-set-id <change-set-id> \
  --expected-change-set-fingerprint <fingerprint> \
  --directory /absolute/repository/path \
  --json
```

The expected ID and fingerprint bind confirmation to the inspected artifact.
The default idempotency key is derived from the fingerprint. Supply an
explicit `--idempotency-key` only when the caller has a stable key to reuse.

Important: MCP `atoi_tasks` with `action: "apply"` can prepare or record the
governed action, but it cannot edit the agent's local checkout by itself.
Do not claim local application unless the CLI returns `localApply` or another
trusted local host reports an applied revision.

### 4B. Publish a Draft Pull Request

```sh
atoi task draft-pr <task-id> \
  --confirm \
  --expected-change-set-id <change-set-id> \
  --expected-change-set-fingerprint <fingerprint> \
  --head <head-branch> \
  --title "Draft: concise outcome" \
  --json
```

With MCP, call `atoi_tasks` with:

- `action: "draft-pr"`
- `task_id`
- `confirmation: true`
- `idempotency_key: "draft-pr:<fingerprint>"`
- optional `head_branch`, `pull_request_title`, and `pull_request_body`

Call this published only when the result contains a pull-request URL or
explicit published state. A prepared action receipt is not a remote PR.

### 5. Verify the Receipt

Re-read the Task:

```sh
atoi task get <task-id> --json
```

For local apply, also inspect:

```sh
git status --short
git diff --check
atoi workspace status --project <project-id> --json
```

Report the returned action ID, proof receipt, idempotency key, and applied
revision or pull-request URL. If the action was already completed, report it
as an idempotent confirmation rather than a new action.

## Mutation Rules

- Inspection never implies confirmation.
- Confirmation applies only to the inspected change-set ID and fingerprint.
- Do not use MCP-only apply as proof of local file writes.
- Do not bypass checks or blockers.
- Do not overwrite unrelated dirty files.
- Do not expose operator tokens.
- Do not claim a draft pull request without a URL or explicit publication
  result.

## Completion Contract

Return:

- Task ID and final Task status
- inspected change-set ID and fingerprint
- selected action
- action ID and idempotency key
- local applied revision or draft pull-request URL
- checks
- proof receipt
- anything left unchanged or blocked

## Reference

Read [references/proof-and-actions.md](references/proof-and-actions.md) for the
proof model, action semantics, stale-change protection, and failure handling.
