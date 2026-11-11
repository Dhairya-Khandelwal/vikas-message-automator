# Automated Test Report — v1.2.1

## Suite: `server/logic.test.ts`

Run on operator machine:

```
npm install --legacy-peer-deps
npm test
npm run lint
npm run build
```

### Cases included

1. New contact defaults NOT_GIVEN / blocked from promo
2. Incomplete consent evidence fails verification
3. Fully verified contact passes
4. STOP → OPTED_OUT + suppression
5. Opt-out keyword variants
6. Environment defaults DEMO
7. DEMO validateDispatch without WhatsApp connection
8. DEMO dispatchDirectMessage succeeds (simulated)
9. Promo without consent blocked
10. Error classification mapping
11. Queue claim + release
12. Stale PROCESSING reclaim after 60s
13. Suppression blocks eligibility
14. Campaign cancel cancels pending queue items
15. Atomic save / environment persistence
16. Transactional anti-circumvention (promo buzzwords)

### Results in this environment

`npm install` could not complete inside the remediation sandbox (resource/timeout limits).  
**Tests are present and must be executed on the Windows host.** Do not treat documentation claims as a substitute for a green `npm test` run.
