# Security Lab Exercise Backlog (Isolated Lab Only)

This backlog describes intentionally vulnerable training scenarios to build later as separate lab targets. It does **not** weaken the storefront, authentication, RBAC, or production code.

## Safety boundaries
- Use a dedicated Supabase Lab project, test identities, synthetic data, and private VM/network scope.
- Never deploy intentionally vulnerable routes to Production or the public storefront.
- Put vulnerable targets behind a lab-only feature flag and network allowlist; default the flag off.
- Keep a patched reference implementation beside each vulnerable exercise.
- Record exercise ID, actor, target, timestamp, request correlation ID, and outcome. Do not log credentials, cookies, bearer tokens, or secrets.

## Exercise catalogue

| ID | Red Team scenario | Blue Team telemetry to validate | Remediation / pass condition |
|---|---|---|---|
| LAB-01 | Broken access control / IDOR against synthetic records | Repeated object access across user IDs; authorization-denied events; unusual 403/404 ratio | Object-level authorization on every server request; user A cannot read or mutate user B data |
| LAB-02 | Role/permission escalation attempt | Role mutation attempts, denied permission changes, actor/target role context | Server derives actor and target roles from trusted DB state; privilege hierarchy is enforced in DB |
| LAB-03 | Missing function-level authorization | Direct invocation of restricted server actions/API routes | Every server action and route checks a permission; UI hiding is not counted as a control |
| LAB-04 | Audit trail tampering attempt | UPDATE/DELETE/TRUNCATE denials and privileged DB activity | Append-only audit permissions/triggers; independent export or protected retention |
| LAB-05 | Inventory race condition | Concurrent stock changes, failed constraints, duplicate movement IDs | Atomic transaction/RPC, row locking or conditional update, invariant checks |
| LAB-06 | Session lifecycle weakness | Session refresh/revocation events, access after logout, suspicious session reuse | Server-validated sessions, short-lived access, refresh rotation/revocation where supported |
| LAB-07 | Input validation and stored XSS in synthetic content | Rejected payload patterns, CSP reports, suspicious stored markup | Contextual output encoding, input validation, safe rendering, restrictive CSP |
| LAB-08 | Security event blind spot | Missing event coverage during known test actions | Define event schema, correlation IDs, alert thresholds, and tested detection coverage |

## Exercise workflow
1. Create a scoped test plan and identify the lab target.
2. Snapshot/seed synthetic data.
3. Execute one scenario with a dedicated Red Team account.
4. Confirm Blue Team telemetry is generated and correlated.
5. Triage the alert and preserve evidence.
6. Apply the remediation.
7. Re-run the same test and verify the attack is blocked.
8. Record detection coverage, false positives, and remaining risk.

## Current application status
The current application already has a staff gate, role hierarchy, permission lookup through `role_permissions`, and audit/security-event foundations. The current product catalogue is static TypeScript data. Granular `products.*` permissions and persistent product CRUD are not implemented by this UI update.
