# Retirement re-proof: two Cursor claims were unobserved (2026-09-16, commit 3baf6d4)

The 18:40Z receipt for `3baf6d4` shows Cursor as failed 3/5. Claude Code (7/7)
and Codex (5/5) proved the retired layout. Cursor proved three things:

- it registered `plugin-atoi-atoi`
- it started `atoi mcp serve` and relayed the bridge's `AtoiConfigError`
- `/atoi-project-work` returned its random marker

The two failed claims, `/atoi` and `/atoi-proof-review`, were never answered.
All three attempts for each ended with exit 1 and no result: Cursor's backend
dropped the session (`Connection lost, reconnecting …`). The host's one-minute
load was between 60 and 80 during the run, from other lanes. Neither
invocation returned `NOT-LOADED` or a wrong marker, so nothing contradicts the
skills loading.

The script written then counted an unanswered invocation as a failed claim.
It now records such a claim as unobserved and the client as inconclusive, and
reserves failed for a counter-observation. Each receipt now carries the
one-minute load at the start and end of the run. Following the rule that a
failure seen above load 60 is rerun before it is reported, the next GitHub
run re-proves the retired layout at the following commit.
