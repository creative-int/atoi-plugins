# Hosted OAuth lifecycle qualification

The 2026-09-22 discovery receipt is 19/19 and explicitly excludes consent, token
issuance, audience binding, refresh rotation, revocation, and real client login.
A fresh unauthenticated run on 2026-09-26 also passed 19/19. Neither run qualifies
the lifecycle. No real login or credential operation was performed to prepare
this runbook.

## Stop point: Luke's sessions and test grants

Luke must log in to **ChatGPT and Claude.ai**, then initiate an Atoi connection
in each hosted client's own connection UI using `https://atoi.app/api/mcp`.
Use one newly created, disposable test grant per client, with access only to
Luke-approved test data. Luke owns account selection, consent, and any re-consent.
Do not reuse, rotate, log out, or revoke an existing operator/production grant.
The deferred operator credential rotations remain deferred.

Before testing refresh or revocation, Luke must explicitly authorize those
operations on the two named test grants. Also arrange a credential from the
same issuer legitimately bound to a different resource, and access to sanitized
authorization-server observations for the test grants. Do not send any token
through chat, a PR, command arguments, or this repository. If a wrong-audience
fixture or server-side observation is unavailable, leave that check unobserved;
rejecting an arbitrary invalid token does not establish audience binding.

Hosted clients may hide their token exchanges. A visible successful tool call
alone cannot establish token issuance, refresh, or revocation. Obtain redacted
server/client diagnostic observations through Luke's authorized product support
surface; this companion must not read private product paths, write deployment
environment variables, or change the authorization server to make a test pass.

## Public preflight

```sh
pnpm proof:door --record
```

At the 2026-09-26 check, public authorization-server metadata at
`https://atoi.app/.well-known/oauth-authorization-server` returned issuer
`https://atoi.app`, authorization `/api/oauth/authorize`, token `/api/oauth/token`,
registration `/api/oauth/register`, and revocation `/api/oauth/revoke` endpoints.
Re-discover these before testing; do not infer an endpoint from this path list.
This companion checks one protected-resource scope, `operator`; authorization
server metadata separately advertises `offline_access` and the refresh-token
grant for hosted-client refresh. These are discovery expectations, not evidence
that refresh succeeds. Use each hosted client's actual registered redirect and client identity.
A custom script impersonating that identity is not a client qualification.

The [MCP authorization specification](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization)
requires resource indicators and intended-audience validation. The following is
the qualification contract for this test, not a claim that every capability is
already implemented. Where the shipped product has a grace interval or token
lifetime, record its actual policy before testing; do not invent a timeout or
change server clocks.

## Execute separately for each hosted client

| Phase | Required observation | Pass criterion |
| --- | --- | --- |
| Login and consent denial | Luke denies one new test connection; inspect client callback and server decision. | Denial returns to the correct client; no token grant or authenticated MCP access results. |
| Consent approval | Luke starts a fresh connection, confirms account, client identity, resource, and requested scopes. | Consent names Atoi and the intended client; requested operator access is approved by Luke. Record the actual offline/refresh scope request too. |
| Callback protection | Observe the actual authorization request and callback, without retaining their secret values. | S256 PKCE was requested; state and issuer validation succeed; callback belongs to the registered client. |
| Token issuance | Observe a successful code exchange for this grant. | Authorization code, redirect, client identity, PKCE verifier, and exact Atoi resource are bound together; access and refresh credentials are issued. Record presence/type/lifetime only. |
| Invalid exchange controls | Use separate disposable authorization attempts under Luke's supervision. | Wrong verifier, code replay, and a mismatched client/redirect cannot mint credentials. A failed negative attempt must not consume the grant used for the positive test. |
| Connected use | From the real hosted client, observe tool discovery and call `atoi_projects` with `{"action":"list"}`. | Tool discovery and the read-only call succeed through `https://atoi.app/api/mcp`. This action is in the pinned shipped registry. An empty project list is valid. |
| Resource request binding | Inspect the authorization and token requests for the test grant. | Both carry the exact resource `https://atoi.app/api/mcp`; a mismatched resource cannot obtain an Atoi-authorized credential. |
| Audience enforcement | At the same Atoi MCP endpoint, compare the test grant's valid token against a legitimate same-issuer token intended for another resource. | Valid token succeeds; wrong-audience token is rejected with 401. Never send the Atoi token to a different host to test this. |
| Refresh | Wait for the documented expiry or observe an actual client refresh; do not alter production lifetimes. | The refresh grant exchanges successfully; replacement access works in the client without another login; resource and scope remain bounded. |
| Refresh replay/rotation | For a separate disposable grant, observe the shipped rotation/replay policy. | Rotation or sender constraint follows that policy; a replay outside any documented grace window is refused, and the resulting grant state is recorded. Do not assume rotated-token reuse always has an immediate rejection policy. |
| Revocation | Luke authorizes revocation of this test grant only, using the discovered endpoint or the shipped account connection control. | Record request outcome, then verify that refresh fails and access is rejected within the product's documented revocation bound. A successful revocation HTTP status or removal from the client's UI alone is insufficient. |
| Reconnection | Luke explicitly reconnects after revocation. | Fresh consent produces a new working grant; the revoked grant does not regain access. |

If a client cannot expose an exchange, mark it **unobserved**, not passed. If a
measured result contradicts the expected behavior, mark it **failed** and link
the product finding in the PR. Do not bypass the failed control or loosen the
qualification to obtain a green result.

## Receipt and review

Keep private diagnostics outside tracked files. For each client, prepare a
sanitized JSON receipt under `docs/proofs/door/lifecycle/` with:

- `proofClass: "Human-observed hosted OAuth lifecycle"`, UTC start/end, client
  name/version (or dated web build), canonical resource, and discovery receipt.
- A non-secret test-run alias, plus the shipped expiry, replay, and revocation
  policy used to evaluate the run. Do not include account IDs or grant IDs.
- One check for every phase above, with `observed`, `held`, and a short account-
  free description of the measured status/error/result. Distinguish client UI
  observations from server protocol observations. Record durations where relevant.
- Overall `status: "proven"` only if every phase is observed and held;
  `"failed"` for an observed contradiction; otherwise `"inconclusive"`.

Never store tokens, authorization codes, verifiers, cookies, callback query
strings, raw headers, private paths, or project content. Sanitize the structured
receipt with `serializeProof` from `tooling/scrub.ts` before writing it, inspect
it, then run `pnpm verify` and the dedicated credential suite. Receipt review
must also confirm that each check is supported by the human's observations;
synthetic tests and this runbook cannot replace those observations.

Keep lifecycle receipts in the nested directory: root `docs/proofs/door/*.json`
receipts feed the **discovery-only** index and manifest gate. Do not turn a
lifecycle receipt into a 19/19 discovery row or switch the plugin transport as
part of this qualification. Attach the two sanitized receipts to this item's
PR, obtain the coordinating seat's Claude review, and leave the PR unmerged.

## Exact handoff ask

Luke: in ChatGPT and Claude.ai, sign in and create separate disposable Atoi test
connections at `https://atoi.app/api/mcp`; personally perform deny/approve and
reconnect consent. Authorize refresh/replay and revocation **only for these new
test grants**, and arrange sanitized protocol observations plus a same-issuer
wrong-audience fixture through the product's supported surface. These are needed
to execute the phase table and distinguish actual OAuth behavior from discovery.
Until then, hosted lifecycle qualification remains blocked and no lifecycle
receipt is claimed.
