# Vikas Message Automator v1.2.2 — Security Report

Responds to the independent audit of v1.2.1 (11 Nov 2026).

## New findings fixed

| # | Severity | Finding | Repair |
|---|----------|---------|--------|
| 1 | Critical | `/api/messages/send` trusted client `category`; EMPLOYEE could cold-send | Server derives category. `support` only if inbound message in last 24h; otherwise promotional rules. EMPLOYEE cannot send promotional/cold. Dispatcher still enforces consent. |
| 2 | Critical | `/api/setup/complete` unauthenticated | One-time setup token generated at startup, printed to console, required in body, consumed after success. |
| 3 | Critical | Missing RBAC on campaigns, pacing, WhatsApp, templates, import | `requireRole` on connect/disconnect, campaign create/pause/cancel/resume, pacing config (ADMIN) / mode, queue clear, import, template/auto-reply/keyword write/delete. Pacing config allowlisted fields only. |
| 4 | High | Phone change kept OPTED_IN (consent laundering) | `updateContact` resets consent to NOT_GIVEN/UNVERIFIED on phone change; duplicate phone rejected; EMPLOYEE cannot change phone. |
| 5 | High | Restore trusted full payload | Structural validation; pre-restore snapshot required; `teamMembers` not replaced unless `confirmReplaceUsers: true`. |
| 6 | High | Login matched name/phone/role aliases | Login is **email only**. |

## Also hardened

- CSRF comparison uses `crypto.timingSafeEqual`
- Public consent register rate-limited (30 / 15 min)
- Stale docs marked SUPERSEDED

## Still operator-pending

- Live QR + real delivery on a real device
- `npm install` / `npm test` / `npm run build` on Windows host
- UI may need to pass `setupToken` into first-run form (token is on server console)

## LIVE decision

Do **not** enable LIVE until:

1. Setup token flow verified
2. EMPLOYEE 403 on campaign create and promotional send verified
3. Phone-change consent reset verified
4. Restore with bad payload rejected
5. Real WhatsApp test on authorised number succeeds
