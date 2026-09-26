# Connected client qualification

The existing install receipts prove installation and loading only. Even a receipt
with `operator.connected: true` does not prove a client listed or called a tool.
The connected evidence harness requires both operations from **Claude Code,
Codex, and Cursor**, tied to one fresh install receipt. Hosted ChatGPT and
Claude.ai OAuth qualification is a separate door proof.

## Luke's login boundary

Luke must complete `atoi account login` and each client's own login. The published
Atoi CLI 0.3.6 exposes this command (`atoi account --help`). Do not copy credentials
into this repository or into isolated client homes. No credential rotation is
needed. Run the following only after Luke completes the logins:

```sh
pnpm proof:install --source creative-int/atoi-plugins --record
```

Keep the printed run directory. The install runner creates `claude-home` and
`codex-home` inside it; use those same homes via `CLAUDE_CONFIG_DIR` and
`CODEX_HOME` when opening the clients. Luke must log in there if the clients ask.
For Cursor, use the same run's `cursor-clone/plugins/atoi` with the existing
`--plugin-dir` route. Do not substitute a globally installed plugin or an
unrelated session. The recorded commit and client versions must match.

In each client, inspect the Atoi server's transport events for `tools/list`, then
ask the agent to call `atoi_projects` with exactly `{"action":"list"}`. This
read-only action is present in the pinned shipped MCP reference. An empty project
list is a valid result. Capture the actual JSON-RPC request/response pairs from
the client's diagnostic surface, not an agent-written description or a direct
CLI call. If the client does not expose these events, stop with that observation
unproven; do not reconstruct or invent a response. If listing is paginated,
capture a complete list before qualification (the current input expects one
complete response with no next cursor).

## Prepare and check evidence

Set `install_receipt` to the new install receipt and keep the working observations
under the ignored `.artifacts/` directory. These are local shell variable names,
not additional Atoi CLI options.

```sh
mkdir -p .artifacts/connected
pnpm --silent proof:connected prepare "$install_receipt" > .artifacts/connected/observations.json
```

Fill each client's entry with its UTC `observedAt`, set `transportObserved` only
after personally inspecting that client's events, and copy `listRequest`,
`listResponse`, `callRequest`, and `callResponse`. Keep the supplied commit,
version, and install digest. Scrub account/project content and credentials from
local evidence before sharing it; preserve JSON-RPC ids, tool names, result shape,
and error flags. Never paste tokens or private paths into a PR.

```sh
pnpm proof:connected check "$install_receipt" .artifacts/connected/observations.json
pnpm proof:connected record "$install_receipt" .artifacts/connected/observations.json
pnpm verify
```

Exit 0 means the supplied evidence satisfies every client check; exit 2 means
inconclusive and exit 1 means invalid input. The recorder writes only fixed
check names, booleans, client names, timestamp, and the install digest under
`docs/proofs/install/connected/`. It does not retain raw tool output, account
identifiers, or private paths. Review and commit that receipt alongside the
referenced install receipt. The original install index stays an install/load
index; a disconnected row cannot be promoted by this harness.

This is a structural validator of **human-supplied transport evidence**, not an
automated live client driver or independent authentication of the evidence.
No connected qualification receipt has been produced by preparing this harness.
