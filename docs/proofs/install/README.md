# Install proofs

Each row is one run of `pnpm proof:install`. It clones the repository fresh, installs `plugins/atoi` into each client, and records what the client itself reports: Claude Code and Codex in isolated homes (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`), Cursor through `cursor-agent --plugin-dir`, its own debug log, and a random marker requested through each skill. The receipt beside each row lists every command, its exit code, and each claim with its evidence.

Receipt fields keep their existing shape. Before either receipt copy or this index is written, all strings and nested data are sanitized by `tooling/scrub.ts`: service, host, OAuth access, refresh and authorization-code credentials; Authorization, Cookie and Set-Cookie values; and code, code_verifier, refresh_token and access_token fields in JSON, forms and callback URLs. Redacted values use `<redacted>`. Sanitization precedes evidence truncation. Run the synthetic regression suite with `node --test --test-concurrency=1 tooling/scrub.test.ts`; it mocks commands and HTTP and writes no client state.

| Run (UTC) | Commit | Source | Claude Code | Codex | Cursor | Operator | Load (1m, start → end) | Receipt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09-16 18:43 | `0ccfa4a` | github:creative-int/atoi-plugins | proven 7/7 (2.1.273 (Claude Code)) | proven 5/5 (codex-cli 0.153.4) | proven 3/3 (2026.09.15-d2fe57e) | disconnected | 48.93 → 41.25 | [json](2026-09-16T18-43-26-451Z-0ccfa4a99bbe.json) |
| 2026-09-16 18:40 | `3baf6d4` | github:creative-int/atoi-plugins | proven 7/7 (2.1.273 (Claude Code)) | proven 5/5 (codex-cli 0.153.4) | failed 3/5 (2026.09.15-d2fe57e) | disconnected | not recorded | [json](2026-09-16T18-40-40-994Z-3baf6d45b9af.json) |
| 2026-09-16 18:24 | `af47da6` | github:creative-int/atoi-plugins | proven 7/7 (2.1.273 (Claude Code)) | proven 5/5 (codex-cli 0.153.4) | proven 5/5 (2026.08.11-e8db854) | disconnected | not recorded | [json](2026-09-16T18-24-10-497Z-af47da610112.json) |
| 2026-09-16 17:49 | `af47da6` | github:creative-int/atoi-plugins | proven 7/7 (2.1.273 (Claude Code)) | proven 5/5 (codex-cli 0.153.4) | failed 2/3 (2026.08.11-e8db854) | disconnected | not recorded | [json](2026-09-16T17-49-52-179Z-af47da610112.json) |

## Notes

- [2026-09-16-retirement-cursor-unobserved](2026-09-16-retirement-cursor-unobserved.md)
- [2026-09-16-cursor-skill-marker](2026-09-16-cursor-skill-marker.md)

Not proven by these runs: a live `tools/list` through the bridge, which needs a connected operator, and any hosted client (ChatGPT, Claude.ai).
