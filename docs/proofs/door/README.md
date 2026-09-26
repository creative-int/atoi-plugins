# Door proofs

Each row is one run of `pnpm proof:door`: an unauthenticated walk of the discovery chain a hosted client (Claude.ai, ChatGPT, Claude Code, Codex, Cursor) follows to reach Atoi's MCP door over OAuth. It uses no credential. These rows do not qualify real login, consent, token issuance, audience binding, refresh, or revocation; see [the lifecycle qualification runbook](LIFECYCLE.md). `tooling/smoke.ts` refuses a remote entry in `plugins/atoi/mcp.json` until the newest receipt for that URL is proven.

Receipt fields keep their existing shape. `tooling/scrub.ts` sanitizes every receipt field and the generated index before writing: service, host, OAuth access, refresh and authorization-code credentials; Authorization, Cookie and Set-Cookie values; and code, code_verifier, refresh_token and access_token fields in JSON, forms and callback URLs. Redacted values use `<redacted>`. Exchange bodies and check evidence are sanitized before truncation; checks still inspect the original in-memory response. Run the isolated synthetic regression suite with `node --test --test-concurrency=1 tooling/scrub.test.ts`.

| Run (UTC) | Resource | Status | Held | Load (1m, start → end) | Receipt |
| --- | --- | --- | --- | --- | --- |
| 2026-09-26 16:41 | `https://atoi.app/api/mcp` | proven | 19/19 | 35.43 → 35.43 | [json](2026-09-26T16-41-35-019Z.json) |
| 2026-09-22 04:36 | `https://atoi.app/api/mcp` | proven | 19/19 | 20.05 → 20.37 | [json](2026-09-22T04-36-54-482Z.json) |
| 2026-09-16 20:55 | `https://atoi.app/api/mcp` | failed | 0/19 | 71.06 → 71.06 | [json](2026-09-16T20-55-58-518Z.json) |
| 2026-09-16 20:55 | `https://atoi.app/api/mcp` | failed | 0/19 | 63.87 → 63.87 | [json](2026-09-16T20-55-40-489Z.json) |

Current public qualification policy is documented in [the lifecycle runbook](LIFECYCLE.md#public-preflight): resource `https://atoi.app/api/mcp`, one `operator` scope. Older receipts retain their historical source citations.
