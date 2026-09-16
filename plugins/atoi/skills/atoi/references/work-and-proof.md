# Work and proof in Atoi

How a governed Task moves from a prompt to an applied change, and what to
report at each step.

## One model on every surface

The web, native apps, terminal, TUI and these tools are interfaces to one
store:

1. A Project holds durable intent and a default Task profile.
2. For code work, the Project has one stable source binding: repository,
   branch, and an optional directory.
3. A Task is durable work inside the Project.
4. Its outcome is Result, Changes, Checks and Proof, kept separate.

Do not invent a second project, task or proof schema on your side.

## Task profiles

- `safe`: inspection, diagnosis, audits. The Task does not prepare changes.
- `workspace-write`: the Task may prepare an authoritative change set.

A profile governs the Task. It never pre-approves a later `apply` or
`draft-pr`.

## Reading state literally

Report whatever status Atoi returns, in its own words:

- queued and running are not done.
- A paused run is waiting on someone: an approval, a steer, or a park.
- failed and canceled are not success.
- A completed Task with no change set changed no files. Report its Result and
  Proof, and do not invent changes.
- Proof has its own status: verified, partial, unverified, failed or none.
  A change set is prepared only from verified proof.

## The authoritative change set

`atoi_tasks` with `{"action": "changes", "task_id": "<id>"}` (terminal:
`atoi task changes <id> --json`) returns the change set to review. The fields
that matter are its id, status, fingerprint, files and operations, blockers,
checks, and receipt id.

Only a change set whose status is `verified` can be applied or published;
Atoi refuses the others. A file list in a model message is not a substitute for
this artifact.

## Stale-change protection

A Task can continue and produce a new change set between your inspection and
the person's confirmation. Bind the action to what they saw:

- tools: `change_set_id` and `change_set_fingerprint`
- terminal: `--expected-change-set-id` and `--expected-change-set-fingerprint`

If either no longer matches, the action fails instead of acting on a different
artifact. Inspect again and ask again.

## Idempotency

Keep one key per decision and reuse it on every retry:

- apply: `apply:<fingerprint>`
- draft pull request: `draft-pr:<fingerprint>`

These are the keys the terminal derives by default. A retry with the same key
resolves to the same governed action. Never reuse a key for a different
fingerprint, and never mint a new key only because a response did not arrive.

## Apply locally

The tools run on Atoi's servers and cannot write to the person's checkout. An
`atoi_tasks` `apply` records or prepares the governed action; with
`applied_revision` it records a revision a trusted host produced.

The terminal does both halves from the checkout: it records the action, applies
the verified operations, and reports the revision back.

```sh
atoi task apply <task-id> --confirm \
  --expected-change-set-id <id> \
  --expected-change-set-fingerprint <fingerprint> \
  [--directory <path>] --json
```

Its result carries `localApply`. An already-applied result is an idempotent
confirmation, not a second write. Afterwards read `git status --short` and
`atoi project status <project-id> --json` from the same checkout.

## Draft pull request

```sh
atoi task draft-pr <task-id> --confirm \
  --expected-change-set-id <id> \
  --expected-change-set-fingerprint <fingerprint> \
  [--head <branch>] [--title <title>] [--body <body>] --json
```

With tools: `atoi_tasks` `draft-pr` with `task_id`, `change_set_id`,
`change_set_fingerprint`, `confirmation: true`, `idempotency_key`, and optional
`head_branch`, `pull_request_title` and `pull_request_body`.

The pull request exists only when the result includes its URL or an explicit
published state. A prepared receipt is pending, not published.

## Source truth

`atoi_workspace` `report` records source facts that someone supplies:
revisions, `dirty`, `ahead` and `behind`, `sync_state` (unknown, in-sync,
ahead, behind, diverged), `preview_status` (unknown, ready, unavailable), and
`supplied_by` (connected-host, cloud, operator). It does not inspect a
checkout itself. From a real checkout, `atoi project status <id> --json`
inspects Git and checks it against the binding. `unknown` is a real state, so
keep it.

## Failure handling

- **Change set not verified:** stop. Report the blockers and ask whether to
  continue the Task.
- **Checkout does not match the binding:** stop before a local apply. Report
  the bound and the observed repository and branch.
- **Unrelated dirty files:** name them. Do not reset, stash or overwrite
  them.
- **Fingerprint changed:** inspect again and get a new confirmation.
- **Action timed out:** read the Task again, or retry with the same
  idempotency key.
- **Publication prepared but not published:** report the action id and
  receipt as pending.

## Handoff

A good handoff:

```text
Workspace: Atlas (<workspace-id>)  Project: Website (<project-id>)
Source: owner/repository @ main, in-sync at <revision>
Task: <task-id> — completed
Result: implemented the pricing page copy change
Changes: change set <change-set-id> verified, fingerprint <fingerprint>, 3 files
Checks: unit tests and typecheck passed
Proof: receipt <receipt-id>
Next decision: apply locally or open a draft pull request
```

A bad one:

```text
Done. The changes are shipped.
```

The bad one collapses identity, source truth, Task state, checks, proof and the
action boundary into a claim nobody can check.
