---
phase: 80-em-token-security
verified: 2026-09-04T00:00:00Z
status: human_needed
score: 4/4 roadmap success criteria verified (49/49 plan-level must-have truths verified)
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "On a Windows host with the plugin installed, trigger Tools > Login to Enterprise Manager and, while em-login.bbj is running, run `icacls %TEMP%\\bbj-em-login-*.tmp` (a throwaway JShell call to BbjProcessSecretEnv.createOwnerOnlyFile is an acceptable substitute)."
    expected: "Exactly one ACE granting the logged-in account; no ACE for BUILTIN\\Users, Everyone, or NT AUTHORITY\\Authenticated Users; no (I) inherited entry. Login/validation still completes (write-through proof)."
    why_human: "CI is ubuntu-latest only and this verification host has a POSIX filesystem, so the acl branch of BbjProcessSecretEnv.createOwnerOnlyFile is never executed by any automated test. It is proven here by a pure value-object test (OwnerOnlyAclTest), a synthetic-view-set strategy test (BbjProcessSecretEnvTest), and a source guard (BbjSecretArgvSourceGuardTest) — not by an executed Windows run."
  - test: "In a sandbox IDE, set Settings > Appearance & Behavior > System Settings > Passwords to \"In KeePass\", then Tools > Login to Enterprise Manager. Log in again and run a BUI or DWC file."
    expected: "Exactly one WARNING balloon in the \"BBj Language Server\" group naming the KeePass file appears on first login; no further balloon on the second login/run."
    why_human: "No automated test in this repository renders an actual IntelliJ notification balloon; BackendNoticePolicyTest exercises the decision logic with a counting double, not the real Notification/NotificationType platform classes."
  - test: "Switch Passwords back to the native keychain, run once (expect no balloon), then switch to \"Do not save, forget passwords after restart\" and run again."
    expected: "A new balloon appears naming the memory-only store — a downgrade to a different weak backend re-warns after having previously cleared on a return to the keychain."
    why_human: "Same reason as above — the policy's reset/re-warn rule is proven behaviourally against a plain-Java double, not against the live PasswordSafe settings UI."
  - test: "Click the \"Open Password Settings\" action on the balloon."
    expected: "The IDE's Passwords settings page opens (ShowSettingsUtil.getInstance().showSettingsDialog(project, \"Passwords\") as written)."
    why_human: "The settings-page selector string is a flagged assumption (80-03-PLAN.md flagged assumption 2) never independently confirmed against a running IDE in this environment."
  - test: "In a sandbox IDE with EM login done, Run As BUI on a file, then immediately Run As BUI again."
    expected: "The second launch starts noticeably faster and no second em-validate-token.bbj subprocess appears."
    why_human: "No automated test drives a live IntelliJ Run action or observes an actual spawned subprocess end to end; TokenValidationCacheTest proves the cache's hit/miss arithmetic with a counting BooleanSupplier and a fixed clock, not a live Run."
  - test: "Run once (validated), log out (or let the token be deleted), log back in, then Run."
    expected: "The validation subprocess runs again on the first Run after re-login — trust does not survive a logout/re-login cycle."
    why_human: "Same reason — the invalidate()-on-storeToken/deleteToken wiring is proven by a source guard and by TokenValidationCacheTest's invalidate() unit test, not by a live logout/login/Run cycle."
---

# Phase 80: EM Token Security Verification Report

**Phase Goal:** EM JWT handling fails closed on malformed tokens, stores temp files owner-only on both POSIX and Windows, warns when the token isn't backed by the native OS keychain, and avoids redundant re-validation within a short trust window.
**Verified:** 2026-09-04
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A malformed, non-3-part, exp-less, or undecodable JWT is treated as expired across all three previously fail-open branches, verified by a regression test covering each branch (#535) | ✓ VERIFIED | `JwtValidity.java` (read in full): a single `check(token, now)` collapses null/empty, segment-count≠3, base64url-decode failure, no `exp` match, non-integer/overflowing `exp` into `MALFORMED`; `exp <= now` is strict `EXPIRED`. `BbjEMTokenStore.isTokenExpired` is a one-line delegate: `JwtValidity.check(token, now) != VALID`. `JwtValidityTest` re-run fresh this session: 12/12 pass, 0 failures — covers the two-part token, exp-less payload, decode-throwing payload, null/empty, four-part/no-dot tokens, `exp==now` boundary, non-integer/overflowing `exp`, and classifier purity. `EmTokenFailClosedSourceGuardTest` re-run fresh: 7/7 pass — pins that the decode left `BbjEMTokenStore` and the login gate precedes `storeToken`. |
| 2 | EM login and validate temp files holding the plaintext JWT are owner-only on POSIX (confirmed by test) and on Windows via an explicit ACL rather than the current default-permission fallback (#536) | ✓ VERIFIED (POSIX) / present + wired, Windows behaviour is human-verified | `BbjProcessSecretEnv.createOwnerOnlyFile` (read in full): POSIX branch unchanged (byte-identical, `PosixFilePermissions.asFileAttribute` supplied at creation); ACL branch supplies `OwnerOnlyAcl.asFileAttribute(owner)` at creation for a resolvable principal, or restricts-then-deletes-on-failure for an unresolvable one; `selectOwnerOnlyStrategy` throws `IOException` naming `java.io.tmpdir` and both missing views when neither `posix` nor `acl` is supported — no default-permission fallback remains (`grep -c 'createTempFile(prefix, suffix)'` returns 0, confirmed in source). `OwnerOnlyAcl.java` (read in full): exactly one `ALLOW` entry, no inherit flags, named `acl:acl`. Re-run fresh this session: `OwnerOnlyAclTest` 6/6, `BbjProcessSecretEnvTest` 29/29 (23 pre-existing + 6 new), `BbjSecretArgvSourceGuardTest` 19/19 (12 pre-existing + 7 new) — all 0 failures. The Windows DACL itself is never exercised by any test on this POSIX host (no Windows CI runner) — see Human Verification item 1. |
| 3 | When PasswordSafe's resolved backend for the EM token is not the native OS keychain (KeePass file or memory-only), the plugin shows a one-time notification naming the backend, with the internal-API access isolated behind a single method covered by a regression test (#552) | ✓ VERIFIED (logic + wiring) / balloon rendering is human-verified | `BbjEMTokenStore.resolveBackend()` (read in full): sole method naming `PasswordSafeSettings`/`ProviderType`; maps `KEYCHAIN→NATIVE_KEYCHAIN`, `KEEPASS→KEEPASS_FILE`, `MEMORY_ONLY`/`DO_NOT_STORE→MEMORY_ONLY`, any exception/null/unrecognised constant→`UNKNOWN` (caught by `catch (Throwable t)`). `BackendNoticePolicy.evaluate` (read in full): once-per-distinct-non-keychain-backend, `synchronized`, native keychain clears the record. `evaluate(resolveBackend())` runs first in both `storeToken` and `getToken` (confirmed by direct read), never in `deleteToken`. `showBackendBalloon` builds a `NotificationType.WARNING` notification with three fixed, non-interpolated body literals and Open-Settings/Dismiss actions. Re-run fresh: `BackendNoticePolicyTest` 10/10, `EmTokenBackendNoticeSourceGuardTest` 7/7 — 0 failures. The rendered balloon itself is never exercised by any test (no IntelliJ notification-platform harness) — see Human Verification items 2-4. |
| 4 | Two Run invocations using the same recently-validated token trigger exactly one server-side validation call; the cache is keyed on the token bytes and invalidated on store/delete (#542, depends on TOKEN-01 landing first) | ✓ VERIFIED (logic + wiring) / live subprocess behaviour is human-verified | `TokenValidationCache.java` (read in full): `Entry(byte[] tokenDigest, long validatedAtMillis)` — no `String` field anywhere in the class (confirmed by direct read); `isTrusted` compares `MessageDigest.isEqual` on a fresh SHA-256 digest and checks `now - validatedAt <= TRUST_WINDOW_MS` (inclusive boundary); `validateThrough` skips `serverCheck` entirely on a hit, records only on a `true` result with a non-null/non-empty token. `TRUST_WINDOW_MS = TimeUnit.MINUTES.toMillis(5)`, a `static final` constant — not configurable. `BbjRunActionBase.validateTokenTrusted` delegates to `TokenValidationCache.SESSION.validateThrough`. `BbjRunBuiAction.java`/`BbjRunDwcAction.java` both call `isTokenExpired(token)` before `validateTokenTrusted(project, token)` (confirmed by line-order grep: line 76 then line 83 in both files) — the fail-closed expiry gate from TOKEN-01 runs first, so a malformed token never enters the cache. `BbjEMTokenStore.storeToken`/`deleteToken` both call `TokenValidationCache.SESSION.invalidate()` unconditionally (confirmed by direct read). Re-run fresh: `TokenValidationCacheTest` 11/11, `EmTokenTrustWindowSourceGuardTest` 7/7 — 0 failures. The live "second Run is faster, no second subprocess" and "logout re-validates" behaviours are never exercised end-to-end by any test — see Human Verification items 5-6. |

**Score:** 4/4 roadmap success criteria verified (0 present-but-behavior-unverified at the roadmap level — every criterion has either a fully behavioural test or a documented, non-blocking human-verification item for the platform-only slice)

### Plan-Level Must-Haves

All 49 must-have truths across the four plans (80-01: 12, 80-02: 12, 80-03: 12, 80-04: 13) were checked against the actual source files (not SUMMARY prose) and against a fresh `--rerun` of every named test class this session. Every truth's supporting artifact was read in full or grepped directly; every test-class count matches the plan's declared acceptance criterion exactly (12/7, 6/29/19, 10/7, 11/7 — see table below). No truth was accepted on SUMMARY claim alone.

| Plan | Requirement | Truths | Verification |
|------|-------------|--------|--------------|
| 80-01 | TOKEN-01 | 12/12 | `JwtValidity.java`, `BbjEMTokenStore.java`, `BbjEMLoginAction.java` read in full; `JwtValidityTest` (12) and `EmTokenFailClosedSourceGuardTest` (7) re-run fresh, 0 failures |
| 80-02 | TOKEN-02 | 12/12 | `OwnerOnlyAcl.java`, `BbjProcessSecretEnv.java` read in full; `OwnerOnlyAclTest` (6), `BbjProcessSecretEnvTest` (29), `BbjSecretArgvSourceGuardTest` (19) re-run fresh, 0 failures. The Windows-specific truth ("On a real Windows host the temp file carries exactly one ACE…") is present+wired but not test-exercised on this host — routed to human verification, not counted as a gap |
| 80-03 | TOKEN-03 | 12/12 | `TokenBackend.java`, `BackendNoticePolicy.java`, `BbjEMTokenStore.resolveBackend`/`showBackendBalloon` read in full; `BackendNoticePolicyTest` (10), `EmTokenBackendNoticeSourceGuardTest` (7) re-run fresh, 0 failures. The rendered-balloon truth is present+wired but not test-exercised — routed to human verification |
| 80-04 | TOKEN-04 | 13/13 | `TokenValidationCache.java`, `BbjRunActionBase.java`, `BbjRunBuiAction.java`, `BbjRunDwcAction.java` read in full; `TokenValidationCacheTest` (11), `EmTokenTrustWindowSourceGuardTest` (7) re-run fresh, 0 failures. The live-subprocess-count truth is present+wired but not test-exercised — routed to human verification |

### Prohibitions (must_haves.prohibitions, all `verification: judgment`)

All 13 prohibitions across the four plans are `status: resolved` in the PLAN frontmatter. Each was cross-checked against the actual code (not accepted on the planner's assertion):

| Plan | Prohibition (abbreviated) | Evidence |
|------|---------------------------|----------|
| 80-01 | No path treats an undecodable token as usable | `JwtValidity.check` has no branch returning `VALID` except a successfully parsed, non-expired `exp`; every other path is `MALFORMED`, and `isTokenExpired` treats anything not `VALID` as expired |
| 80-01 | No token/payload/exp value in error/log messages | `BbjEMLoginAction.java` line 159: fixed literal `"Enterprise Manager returned an unusable token"`, no `stdout`/classification interpolation observed |
| 80-01 | No JWT/JSON library added | `JwtValidity.java` imports only `java.nio.charset`, `java.util.Base64`, `java.util.regex` — no new classpath dependency |
| 80-02 | No file created broad-then-tightened when creation-time attribute is available | Primary ACL path supplies `OwnerOnlyAcl.asFileAttribute(owner)` directly to `Files.createTempFile`; only the principal-unresolvable fallback restricts post-creation, and deletes on restriction failure |
| 80-02 | No default-permission fallback when capability unavailable | `selectOwnerOnlyStrategy` throws `IOException` naming both missing views; no default-permission `createTempFile(prefix, suffix)` call remains in the file |
| 80-02 | POSIX branch not weakened | POSIX branch byte-identical per SUMMARY diff description; all 23 pre-existing `BbjProcessSecretEnvTest` tests still present and green (29 total, confirmed by fresh re-run) |
| 80-03 | No override of user's PasswordSafe backend setting | `resolveBackend()` only calls `settings.getProviderType()` (a read); no `setProviderType` or equivalent write call exists anywhere in the diff |
| 80-03 | No token/credential/path in notification | Three body literals in `showBackendBalloon` name only the backend kind, no variable interpolation |
| 80-03 | No detection failure treated as keychain; no one-shot boolean | `catch (Throwable t)` and null-service/null-provider both map to `UNKNOWN`; `BACKEND_WARNED_KEY` stores a backend-name string, not a boolean |
| 80-04 | No plaintext/reversible/truncated token representation retained | `TokenValidationCache.Entry` holds only `byte[] tokenDigest` (SHA-256); the class declares no `String` field (confirmed by direct read) |
| 80-04 | No persistence to disk/PropertiesComponent; no survival of storeToken/deleteToken | `entry` is an in-memory `AtomicReference` only; `invalidate()` is called unconditionally from both `storeToken` and `deleteToken` |
| 80-04 | No trust recorded for failed validation / rejected expiry / null-empty token | `validateThrough` records only when `result && token != null && !token.isEmpty()`; the expiry gate (`isTokenExpired`) runs before `validateTokenTrusted` in both run actions, confirmed by source-guard-pinned line order |
| 80-04 | Trust window not raised above 5 minutes / not configurable | `TRUST_WINDOW_MS = TimeUnit.MINUTES.toMillis(5)` is a `public static final long` constant with no setter or configuration surface |

All 13 prohibitions hold on direct code evidence. This is a non-authoritative LLM-judge disposition per the judgment-tier routing rule — flagged for human awareness, not a blocking gate, since no code path contradicts any prohibition.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-intellij/.../actions/JwtValidity.java` | Three-valued classifier | ✓ VERIFIED | Exists, no `com.intellij` import, no instance field, contains `MALFORMED` and `Pattern.compile("\"exp\"\\s*:\\s*(\\d+)…")` |
| `bbj-intellij/.../actions/BbjEMTokenStore.java` | Fail-closed delegate + backend notice + cache invalidation | ✓ VERIFIED | `isTokenExpired` delegates to `JwtValidity.check`; `resolveBackend()`/`BACKEND_NOTICE`/`showBackendBalloon` present; `TokenValidationCache.SESSION.invalidate()` in `storeToken`/`deleteToken` |
| `bbj-intellij/.../actions/BbjEMLoginAction.java` | Login-time classification gate | ✓ VERIFIED | `JwtValidity.check(stdout, now)` precedes `storeToken(stdout)`; fixed-literal failure message |
| `bbj-intellij/.../lsp/OwnerOnlyAcl.java` | Pure ACL builder | ✓ VERIFIED | One `ALLOW` entry, no inherit flags, `acl:acl` attribute name, unmodifiable list |
| `bbj-intellij/.../lsp/BbjProcessSecretEnv.java` | Three-outcome `createOwnerOnlyFile` | ✓ VERIFIED | posix / acl-at-creation / acl-restrict-then-delete-on-failure / fail-closed `IOException`; no default-permission path |
| `bbj-intellij/.../actions/TokenBackend.java` | Plain classification enum | ✓ VERIFIED | Exactly 4 constants, no import at all |
| `bbj-intellij/.../actions/BackendNoticePolicy.java` | Once-per-backend decision seam | ✓ VERIFIED | `synchronized evaluate`, injected `Supplier`/`Consumer` collaborators, no platform import |
| `bbj-intellij/.../actions/TokenValidationCache.java` | Digest-keyed trust window | ✓ VERIFIED | `TRUST_WINDOW_MS`, `SESSION`, `AtomicReference<Entry>`, `MessageDigest.getInstance("SHA-256")`, no platform import |
| `bbj-intellij/.../actions/BbjRunActionBase.java` | `validateTokenTrusted` entry point | ✓ VERIFIED | Delegates to `TokenValidationCache.SESSION.validateThrough`, placed beside `validateTokenServerSide` |
| All 9 test classes (12+7+6+29+19+10+7+11+7 = 108 test methods) | Behavioural + source-guard coverage | ✓ VERIFIED | Every class re-run fresh this session with exact counts matching the plan's declared acceptance criteria, 0 failures across all runs |

### Key Link Verification

| From | To | Via | Status |
|------|-----|-----|--------|
| `BbjEMTokenStore.isTokenExpired` | `JwtValidity.check` | delegate call | ✓ WIRED |
| `BbjEMLoginAction.performLogin` | `JwtValidity.check` | classifies before `storeToken` | ✓ WIRED (index-order confirmed: `JwtValidity.check(` at line 157 precedes `storeToken(` at line 166) |
| `BbjProcessSecretEnv.createOwnerOnlyFile` | `OwnerOnlyAcl.asFileAttribute`/`ownerOnlyAcl` | attribute supplied to `Files.createTempFile` | ✓ WIRED |
| `BbjEMTokenStore.storeToken`/`getToken` | `BackendNoticePolicy.evaluate` | `evaluate(resolveBackend())` first statement | ✓ WIRED |
| `BbjEMTokenStore.resolveBackend` | `PasswordSafeSettings.getProviderType()` | sole call site | ✓ WIRED |
| `BbjRunBuiAction`/`BbjRunDwcAction` | `BbjRunActionBase.validateTokenTrusted` | replaces direct `validateTokenServerSide` call | ✓ WIRED (index-order confirmed: `isTokenExpired(token)` line 76 precedes `validateTokenTrusted(project, token)` line 83 in both files) |
| `BbjRunActionBase.validateTokenTrusted` | `TokenValidationCache.SESSION.validateThrough` | read-through wrapper | ✓ WIRED |
| `BbjEMTokenStore.storeToken`/`deleteToken` | `TokenValidationCache.SESSION.invalidate` | unconditional last statement | ✓ WIRED |

### Behavioral Spot-Checks / Test Re-Runs

| Test class | Command | Result | Status |
|------------|---------|--------|--------|
| `JwtValidityTest` | `./gradlew test --tests …JwtValidityTest --rerun` | 12/12, 0 failures | ✓ PASS |
| `EmTokenFailClosedSourceGuardTest` | `./gradlew test --tests …EmTokenFailClosedSourceGuardTest --rerun` | 7/7, 0 failures | ✓ PASS |
| `OwnerOnlyAclTest` | `./gradlew test --tests …OwnerOnlyAclTest --rerun` | 6/6, 0 failures | ✓ PASS |
| `BbjProcessSecretEnvTest` | `./gradlew test --tests …BbjProcessSecretEnvTest --rerun` | 29/29, 0 failures | ✓ PASS |
| `BbjSecretArgvSourceGuardTest` | `./gradlew test --tests …BbjSecretArgvSourceGuardTest --rerun` | 19/19, 0 failures | ✓ PASS |
| `BackendNoticePolicyTest` | `./gradlew test --tests …BackendNoticePolicyTest --rerun` | 10/10, 0 failures | ✓ PASS |
| `EmTokenBackendNoticeSourceGuardTest` | `./gradlew test --tests …EmTokenBackendNoticeSourceGuardTest --rerun` | 7/7, 0 failures | ✓ PASS |
| `TokenValidationCacheTest` | `./gradlew test --tests …TokenValidationCacheTest --rerun` | 11/11, 0 failures | ✓ PASS |
| `EmTokenTrustWindowSourceGuardTest` | `./gradlew test --tests …EmTokenTrustWindowSourceGuardTest --rerun` | 7/7, 0 failures | ✓ PASS |
| Whole suite (orchestrator-established fact, confirmed no source changed since) | `git diff --stat e0796ea..9a64103 -- bbj-intellij/src` | 0 files changed | ✓ Confirmed: only `.planning/` docs commits landed after the 234/234 whole-suite run |

### Probe Execution

Not applicable — this phase has no `scripts/*/tests/probe-*.sh` convention; verification is via `./gradlew test` per the plan's own `<verify>` blocks, executed above.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| TOKEN-01 | 80-01 | Fail-closed JWT expiry classification (#535) | ✓ SATISFIED | `JwtValidity.java`, `JwtValidityTest` (12), `EmTokenFailClosedSourceGuardTest` (7) |
| TOKEN-02 | 80-02 | Owner-only temp files on POSIX and Windows, fail-closed otherwise (#536) | ✓ SATISFIED (code); Windows DACL is human-verified | `OwnerOnlyAcl.java`, `BbjProcessSecretEnv.java`, `OwnerOnlyAclTest` (6), `BbjProcessSecretEnvTest` (29), `BbjSecretArgvSourceGuardTest` (19) |
| TOKEN-03 | 80-03 | Non-keychain backend notice, isolated internal API (#552) | ✓ SATISFIED (code); rendered balloon is human-verified | `TokenBackend.java`, `BackendNoticePolicy.java`, `resolveBackend()`, `BackendNoticePolicyTest` (10), `EmTokenBackendNoticeSourceGuardTest` (7) |
| TOKEN-04 | 80-04 | Digest-keyed trust window, invalidated on store/delete (#542) | ✓ SATISFIED (code); live subprocess-count is human-verified | `TokenValidationCache.java`, `BbjRunActionBase.validateTokenTrusted`, `TokenValidationCacheTest` (11), `EmTokenTrustWindowSourceGuardTest` (7) |

No orphaned requirements — REQUIREMENTS.md maps exactly TOKEN-01 through TOKEN-04 to Phase 80, and each plan's frontmatter `requirements:` field claims exactly one, matching 1:1.

### Anti-Patterns Found

None. All 11 modified/created source files scanned for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/"not yet implemented"/etc. — zero matches. A separate scrub for leaked planning-decision identifiers (`GHSA`, `SEC-\d`, `D-\d{1,3}`) across the same files — zero matches, confirming D-19 ("source comments carry GitHub issue numbers only") held across all four plans despite two documented mid-execution leaks (an `OwnerOnlyAclTest` `D-09` comment in 80-02, a `TokenBackend` javadoc naming `ProviderType` in 80-03) that were caught and fixed by the executors' own source guards before landing.

### Human Verification Required

See frontmatter `human_verification` list (6 items) — the Windows ACL DACL (TOKEN-02), the live KeePass/downgrade/settings-page balloon behaviour (TOKEN-03, 3 items), and the live Run-speedup/logout-reset behaviour (TOKEN-04, 2 items). All six are pre-existing, explicitly-declared platform-only gaps the plans themselves could not close with an automated test on this ubuntu-latest/POSIX environment — not gaps introduced by this verification pass. None of them contradict any observed code; they are unexercised, not unwired.

### Gaps Summary

No gaps found. Every roadmap success criterion and every plan-level must-have truth is backed by source code read directly (not SUMMARY prose) and by a fresh, this-session re-run of the exact test class the plan declares, with test counts matching the plan's stated acceptance criteria exactly. The six items above are legitimate `human_needed` routing (platform behaviour no test on this host can exercise), not `gaps_found` — the code paths they cover are present, wired, and unit-tested at the logic/value level; only the live-platform rendering/execution is unverified in this environment.

---

*Verified: 2026-09-04*
*Verifier: Claude (gsd-verifier)*
