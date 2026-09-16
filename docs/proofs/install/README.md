# Install proofs

Each row is one run of `pnpm proof:install`. It clones the repository fresh, installs `plugins/atoi` into each client, and records what the client itself reports: Claude Code and Codex in isolated homes (`CLAUDE_CONFIG_DIR`, `CODEX_HOME`), Cursor through `cursor-agent --plugin-dir`, its own debug log, and a random marker requested through each skill. The receipt beside each row lists every command, its exit code, and each claim with its evidence.

| Run (UTC) | Commit | Source | Claude Code | Codex | Cursor | Operator | Receipt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-09-16 18:24 | `af47da6` | github:creative-int/atoi-plugins | proven 7/7 (2.1.273 (Claude Code)) | proven 5/5 (codex-cli 0.153.4) | proven 5/5 (2026.08.11-e8db854) | disconnected | [json](2026-09-16T18-24-10-497Z-af47da610112.json) |
| 2026-09-16 17:49 | `af47da6` | github:creative-int/atoi-plugins | proven 7/7 (2.1.273 (Claude Code)) | proven 5/5 (codex-cli 0.153.4) | failed 2/3 (2026.08.11-e8db854) | disconnected | [json](2026-09-16T17-49-52-179Z-af47da610112.json) |

## Notes

- [2026-09-16-cursor-skill-marker](2026-09-16-cursor-skill-marker.md)

Not proven by these runs: a live `tools/list` through the bridge, which needs a connected operator, and any hosted client (ChatGPT, Claude.ai).
