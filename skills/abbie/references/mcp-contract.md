# Abbie MCP v1 contract

This reference records the public companion contract implemented by the
authenticated Abbie MCP bridge.

## Transport and authentication

The client-facing transport is local stdio. Its server command is `abbie` with
arguments `mcp` and `serve`.

The installed Abbie CLI resolves the configured Convex site, appends `/mcp`,
loads the operator token from its local credential backend, and forwards MCP
JSON-RPC over authenticated HTTP. The bridge accepts only stateless
`application/json` responses and rejects sessionful or SSE responses.

The default product endpoint represented by the companion config is
`https://kindly-terrier-129.convex.site/mcp`. Clients should not connect to it
directly or place bearer credentials in manifests. `ABBIE_CONVEX_SITE_URL` or
the CLI's product config may select another Abbie environment at runtime.

## `abbie_projects`

Actions:

- `list`
- `get`
- `create`
- `update`
- `archive`
- `restore`

Inputs include `project_id`, `name`, `description`, `instructions`, `kind`,
`repo_url`, `repo_branch`, `directory_path`, `include_archived`, and
`default_task_profile`.

## `abbie_workspace`

Actions:

- `show`
- `bind`
- `status`
- `report`
- `changes`

Every call requires `project_id`. Inputs may include repository, branch,
directory, Task, base/current revision, dirty state, ahead/behind counts, sync
state, preview state, supplier, and observation time.

The Workspace is stable per Project. It is source truth, not a disposable
execution directory. Remote calls cannot prove a local checkout's current Git
state without a connected host reporting it.

## `abbie_tasks`

Actions:

- `list`
- `get`
- `start`
- `cancel`
- `continue`
- `changes`
- `apply`
- `draft-pr`

Inputs include `task_id`, `project_id`, `prompt`, `brief`, `title`, `model_id`,
`safety_profile`, `limit`, `confirmation`, `idempotency_key`,
`applied_revision`, `head_branch`, `pull_request_title`, and
`pull_request_body`.

Poll `get` for wait semantics. Use `continue` for a refined instruction rather
than silently starting a replacement Task.

## Proof and mutation semantics

Abbie's backend remains authoritative for every tool call. Review exact
change-set identity and fingerprint before a mutation. `apply` and `draft-pr`
require confirmation and should use stable idempotency.

An MCP `apply` call can prepare or record the governed action, but it cannot
prove that files in the caller's local checkout changed. Use the public CLI for
the local write and verify the resulting revision. A draft pull request exists
only when the response includes a URL or explicit published state.

Report Result, Changes, Checks, and Proof separately. Do not collapse pending,
blocked, stale, unknown, or needs-review state into success.
