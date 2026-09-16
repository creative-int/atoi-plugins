# Door proofs

Each row is one run of `pnpm proof:door`: an unauthenticated walk of the discovery chain a hosted client (Claude.ai, ChatGPT, Claude Code, Codex, Cursor) follows to reach Atoi's MCP door over OAuth. It uses no credential. `tooling/smoke.ts` refuses a remote entry in `plugins/atoi/mcp.json` until the newest receipt for that URL is proven.

| Run (UTC) | Resource | Status | Held | Load (1m, start → end) | Receipt |
| --- | --- | --- | --- | --- | --- |
| 2026-09-16 20:55 | `https://atoi.app/api/mcp` | failed | 0/19 | 71.06 → 71.06 | [json](2026-09-16T20-55-58-518Z.json) |
| 2026-09-16 20:55 | `https://atoi.app/api/mcp` | failed | 0/19 | 63.87 → 63.87 | [json](2026-09-16T20-55-40-489Z.json) |

The spec each claim cites is `~/.agents/artifacts/findings/atoi/atoi-mcp-oauth-front-spec-20260916.md` (rulings 2026-09-16: resource `https://atoi.app/api/mcp`, one `operator` scope).
