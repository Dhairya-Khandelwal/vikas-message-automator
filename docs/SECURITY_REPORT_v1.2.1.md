# Vikas Message Automator v1.2.1 — Security Remediation Report

**Date:** 2026-11-11  
**Base:** v1.2.0 (Vikas_Message_Automator_FINAL.zip)  
**Target:** Production-quality local deployment for Vikas Automobiles (zero paid APIs)

---

## 1. Defect → Repair matrix

| ID | Original defect | Root cause | Files modified | Actual repair | Test |
|----|-----------------|------------|----------------|---------------|------|
| VMA-01 | Unrestricted `/api/team/switch-role` allowed any authenticated user to escalate role | Endpoint set `req.session.role` from client body with no RBAC | `server.ts` | Endpoint now returns 403 always. Session role cannot be changed via API. Users must log in as the intended account. | Manual + logic tests for requireRole |
| VMA-02 | Employees could set OPTED_IN; public form / mass assignment could force consent | Client-controlled `consentStatus` accepted without mandatory evidence or role check | `server.ts` (POST/PUT contacts), public register (already PENDING) | Create/update strip privileged fields; EMPLOYEE cannot set OPTED_IN; ADMIN/MANAGER require evidence ≥5 chars; verifiedBy/verifiedAt recorded | Consent unit tests |
| VMA-03 | Public `/api/consent/opt-out` suppressed any number without verification | Unauthenticated open endpoint | `server.ts` | Unauthenticated callers must supply `confirmLast4`; unknown numbers do not reveal existence; staff bypass with auth | Opt-out tests |
| DEMO-01 | validateDispatch required WhatsApp connection even in DEMO | Connection check not gated on environment | `server/messageDispatcher.ts` | Connection required only when `getEnvironment() === 'LIVE'` | DEMO offline test |
| DEMO-02 | Real Baileys path reachable in DEMO | Missing environment guard before `sendTextMessage` | `server/messageDispatcher.ts` (prior fix retained) | `isDemoEnvironment()` + `simulateDemoDispatch()` | DEMO dispatch test |
| LIVE-01 | LIVE switch by MANAGER; no connection check | Weak role + no session check | `server.ts` | ADMIN only + `confirmLive: true` + connected WhatsApp required | Manual checklist |
| DB-01 | Non-atomic JSON writes | Direct `writeFileSync` on DB file | `server/db.ts` (prior fix retained) | Temp file + `renameSync` | Persistence smoke test |
| AUTH-01 | Default passwords; no session regenerate | Seed hashes + direct session assign | `server/db.ts`, `server.ts` (prior fixes retained) | First-run setup; `session.regenerate` on login | Setup flow |
| QUEUE-01 | Stale PROCESSING recovery incomplete | Reclaim without annotation | `server/db.ts` | Stale reclaim clears failure reason and records recovery note; dispatcher revalidates | Stale recovery test |
| BODY-01 | 50 MB body limit | Misconfigured limits | `server.ts` (prior fix retained) | 2 MB | Config review |
| ENGINES | Node ≥18 declared; sqlite/Vite need newer | engines field | `package.json` | `>=20.0.0` | install.bat warning |

---

## 2. What still requires operator verification

| Item | Why |
|------|-----|
| Live WhatsApp QR pairing | Requires physical phone |
| Real message delivery | Requires authorised test recipient |
| Windows install.bat on target PC | Environment-specific |
| npm install / npm test / npm run build on Windows | This remediation environment could not complete a full npm install due to resource limits |

---

## 3. LIVE activation checklist (operator)

1. Complete first-run Owner setup (strong password ≥10 chars).
2. Confirm Settings show **DEMO**.
3. Connect WhatsApp via QR (WhatsApp Connection view).
4. Wait until status shows connected.
5. As ADMIN, POST `/api/environment` with `{ "environment": "LIVE", "confirmLive": true }`.
6. Send one support (non-promotional) test message to an authorised number.
7. Confirm promotional campaigns still require OPTED_IN + VERIFIED contacts.
8. Reply STOP from test phone and confirm suppression + pending cancel.

---

## 4. Remaining limitations (documented, not claimed fixed)

- Primary store remains JSON; SQLite used for counters/idempotency/consent events.
- OTP-based consent not implemented (no SMS provider; zero paid API requirement).
- Unofficial Baileys integration — Meta does not support it; account risk remains operator responsibility.
- Concurrent multi-process writers not fully serialised beyond single-process claim + atomic file rename.
