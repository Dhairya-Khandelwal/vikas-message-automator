# Issue Tracker — v1.2.2

## Fixed in source (this release)

- Independent audit #1 messages/send category bypass
- Independent audit #2 setup/complete unauthenticated
- Independent audit #3 missing RBAC + pacing mass assignment
- Independent audit #4 consent laundering via phone change
- Independent audit #5 unsafe restore
- Independent audit #6 ambiguous login lookup
- CSRF timing-safe compare
- Public consent rate limit

## Prior v1.2.1 fixes retained

- switch-role disabled
- DEMO transport isolation
- Atomic DB writes
- Session regenerate on login
- No default passwords
- Public consent PENDING only
- Public opt-out confirmLast4
- 2 MB body limit
- Node engines >=20

## Operator must still verify

- Full install + test + build on Windows
- LIVE QR and delivery
- First-run UI collects setupToken from console
