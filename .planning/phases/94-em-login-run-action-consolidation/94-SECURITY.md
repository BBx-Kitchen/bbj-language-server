---
phase: "94"
slug: "em-login-run-action-consolidation"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-19"
---

# Phase 94 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| plugin process → BBj interpreter subprocess | EM credentials and the JWT cross into a spawned process; argv is world-readable, the environment is not | EM username, password, JWT token |
| plugin process → local filesystem | login and validation subprocess results land in secret-adjacent temp files; the resolver reads the plugin directory | JWT token, bundled script paths |
| plugin process → EM server | the token is presented for server-side validation | JWT token |
| IDE user → action presentation | the enablement gate decides what the user can invoke | menu visibility state |
| build output → user's IDE installation | the distributable is what a user actually installs, including the three bundled tool scripts | plugin distributable, tool scripts |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-94-01 | Information Disclosure | relocated `validateTokenServerSide` | high | mitigate | Token travels on the process environment via `BbjProcessSecretEnv.emValidateToken`, never `addParameter`. `BbjSecretArgvSourceGuardTest` asserts `addParameter(token)` count is 0 and that the `withEnvironment(` argument is the `Invocation`'s own `.environment()` map (data-flow, not textual presence). | closed |
| T-94-02 | Information Disclosure | EM login + validator temp files | high | mitigate | `createOwnerOnlyFile` creates the file owner-only before the launch (`BbjEMLoginAction.java:124-132`); `finally { Files.deleteIfExists(tmpFile); }` (`:196-197`) spans handler construction, the subprocess run and the result read. Pinned by `EmLoginTempFileCleanupSourceGuardTest` (ordering assertion hardened in `1032030b` so it can actually fail). | closed |
| T-94-04 | Tampering | expiry-check / trust-check ordering | medium | mitigate | The client-side expiry check stays above the trusted call in `buildWebRunCommandLine`, so a malformed or expired token cannot populate the trust cache. Ordering assertion retained in the re-pointed guard. | closed |
| T-94-05 | Elevation of Privilege | enablement gate | low | accept | Presentation concern, not a security boundary: the login flow's own BBj-home and credential checks authorise the action and run regardless of menu visibility. Accepted at L1. | closed |
| T-94-07 | Tampering | `BbjToolScriptResolver.resolveToolScript` | low | accept | The script name is never user input — all call sites pass compile-time string literals, so no traversal surface exists. The resolver returns null rather than a fallback, so a missing script fails the launch instead of silently running something else. | closed |
| T-94-08 | Denial of Service | resolver called on every run | low | accept | A stateless `Files.exists` check per launch; the retired methods did the same work, so no regression. | closed |
| T-94-09 | Spoofing | trust window length | medium | mitigate | `TokenValidationCache.TRUST_WINDOW_MS` unchanged at 5 minutes and the cache file untouched by this phase; a widened window would lengthen the period a revoked token is accepted without a server round-trip. Pinned by `EmTokenTrustWindowSourceGuardTest`. | closed |
| T-94-10 | Information Disclosure | login credentials | high | mitigate | Username and password travel on the process environment through the existing secret-env invocation. `BbjSecretArgvSourceGuardTest` asserts `addParameter(username)` and `addParameter(password)` counts are 0 across all five guarded action files. | closed |
| T-94-11 | Denial of Service | `update` on the background thread | low | accept | The gate performs one null test and no I/O, so it cannot stall the action-update pass; declaring the background update thread is itself the platform-requested mitigation. | closed |
| T-94-12 | Tampering | plugin distribution copy | medium | mitigate | Verified by hand-installing the built distributable and exercising both EM login and web runs against it (UAT tests 2 and 3), rather than testing in a dev sandbox alone. | closed |
| T-94-13 | Spoofing | UAT against a stale build | medium | mitigate | The pre-existing distributable (07:30) was detected as predating the code-review fixes (`dc240d10` 08:17, `1032030b` 08:19) and rebuilt from the final tree at 09:06 before any UAT test was presented. All five UAT tests ran against the rebuilt artifact. | closed |
| T-94-SC | Tampering | npm/pip/cargo installs | n/a | accept | No package-manager install task exists in this phase; RESEARCH.md records the Package Legitimacy Audit as not applicable and `build.gradle.kts` is unchanged. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-94-01 | T-94-05 | Menu enablement is presentation, not authorisation; the login flow re-checks BBj home and credentials regardless of visibility. | Phase 94 plan (03) | 2026-09-19 |
| R-94-02 | T-94-07 | Script names are compile-time literals at every call site; resolver fails closed by returning null. | Phase 94 plan (01) | 2026-09-19 |
| R-94-03 | T-94-08 | One stateless `Files.exists` per launch; identical cost to the retired implementation. | Phase 94 plan (01) | 2026-09-19 |
| R-94-04 | T-94-11 | Gate does one null test and no I/O on the background update thread. | Phase 94 plan (03) | 2026-09-19 |
| R-94-05 | T-94-SC | No dependency added in any ecosystem; `build.gradle.kts` unchanged by the phase. | Phase 94 plans (01-04) | 2026-09-19 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-19 | 12 | 12 | 0 | Claude (gsd-secure-phase, L1 short-circuit) |

**Verification basis:** register consolidated from the `<threat_model>` blocks of all four
PLAN files (`register_authored_at_plan_time: true`). Mitigation evidence confirmed by a forced
full re-execution of the `bbj-intellij` suite against the final tree (`cleanTest test`,
114 test classes / 1004 tests / 0 failures / 0 errors), not a cached up-to-date result, plus
the five human UAT checkpoints recorded in `94-UAT.md`.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-19
