# Abbie Proof and Action Contract

## Why the Boundary Exists

A generated diff is not the same thing as an applied change, and an applied
change is not the same thing as a published pull request. Abbie keeps those
states distinct:

1. A Task produces a Result.
2. It may produce an authoritative change set.
3. Checks determine whether that change set is verified.
4. Proof identifies the exact artifact.
5. A confirmed action applies or publishes that artifact.
6. An action receipt proves the durable action.

Clients should preserve all six states.

## Authoritative Change Set

The review anchor is the change set returned by:

```sh
abbie task changes <task-id> --json
```

Its important fields are:

- ID
- status
- fingerprint
- file operations
- blockers
- checks
- receipt ID

Only `verified` is actionable. A file list shown in prose or a model message
is not a substitute for this artifact.

## Stale-Change Protection

Between inspection and confirmation, a Task may continue and produce a new
change set. Pass both the inspected ID and fingerprint:

```sh
--expected-change-set-id <id>
--expected-change-set-fingerprint <fingerprint>
```

The action should fail rather than act on a different artifact.

## Idempotency

Abbie derives stable defaults:

- local apply: `apply:<fingerprint>`
- draft pull request: `draft-pr:<fingerprint>`

Retries with the same key should resolve to the same governed action. Reusing
a key for a different fingerprint is incorrect.

## Local Apply

The CLI performs two coordinated operations:

1. records or prepares the governed action
2. applies the verified operations to the selected local repository
3. reports the applied revision back to Abbie

The local response includes `localApply`. An already-applied result is an
idempotent success, not a second write.

The MCP server is remote and cannot directly modify an arbitrary local
checkout. An MCP apply call without `applied_revision` may produce a prepared
receipt only. Preserve that distinction.

## Draft Pull Request

Draft publication is a remote action. A complete publication result should
identify the pull request, normally with its number and URL.

If the response says only that publication was prepared, report that exact
state and action ID. Do not invent a GitHub URL.

## Checks and Proof

Checks answer whether the change set was verified. Proof answers which result
or action the report refers to. A useful closeout includes:

```text
Checks: <names and results>
Change-set proof: <receipt>
Action proof: <receipt>
Action ID: <id>
```

Keep failed, pending, skipped, and unavailable distinct.

## Failure Handling

### Change set is not verified

Stop. Report blockers and ask whether the user wants to continue the Task.

### Workspace does not match

Stop before local apply. Report the bound repository/branch and the inspected
local repository/branch.

### Local worktree is dirty

Identify unrelated paths. Do not erase, reset, or silently overwrite them.
Apply only when Abbie's baseline checks prove the operations are safe.

### Fingerprint changed

Re-run inspection and request a new confirmation for the new fingerprint.

### Action timed out

Re-read the Task or repeat with the same idempotency key. Do not create a new
key merely because the client did not receive the first response.

### Draft publication prepared but not published

Report the prepared action ID and proof receipt. Treat publication as pending,
not successful.

## Review Summary Template

```text
Task: <id> — <status>
Change set: <id> — verified
Fingerprint: <fingerprint>
Files: <paths>
Checks: <results>
Selected action: <apply | draft PR | unchanged>
Action: <id and idempotency key>
Outcome: <applied revision | PR URL | prepared | blocked>
Proof: <receipt>
```
