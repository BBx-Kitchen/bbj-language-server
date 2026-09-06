# Phase 80: EM Token Security - Context

**Gathered:** 2026-09-04
**Status:** Ready for planning
**Mode:** `--auto` — every decision below is the recommended default, selected without user prompts. Each `[auto]` line in `80-DISCUSSION-LOG.md` records the alternatives.

<domain>
## Phase Boundary

The IntelliJ plugin's Enterprise Manager JWT handling (`bbj-intellij/`) fails closed on any token it cannot positively decode, keeps the plaintext-token temp files owner-only on Windows as well as POSIX, tells the user once when IntelliJ's PasswordSafe is not protecting the token with the native OS keychain, and stops re-validating the same token server-side on every Run within a short trust window. Requirements TOKEN-01 through TOKEN-04 (issues #535, #536, #552, #542), each locked in with a regression test under the existing plain-JUnit 5 `./gradlew test` task.

Code sites, all under `bbj-intellij/src/main/java/com/basis/bbj/intellij/`: `actions/BbjEMTokenStore.java` (#535, #552, cache invalidation for #542), `lsp/BbjProcessSecretEnv.java` (#536, Windows half), `actions/BbjRunActionBase.java` plus `actions/BbjRunBuiAction.java` / `actions/BbjRunDwcAction.java` (#542), and `actions/BbjEMLoginAction.java` (#535 login-time gate).

Not in this phase: JWT signature verification (no key material on the client; the server-side check stays the authority), forcing PasswordSafe onto a specific backend (a warning, not an override — #552's own scoping), the EM Config `--` sentinel todo in `getConfigPathArg`, any change to `em-login.bbj` / `em-validate-token.bbj` / `web.bbj`, the VS Code extension's own `isTokenExpired`, and any `BasePlatformTestCase` / live-IDE harness (REQUIREMENTS.md Out of Scope).

</domain>

<decisions>
## Implementation Decisions

### Verified state of `main` (2026-09-04)

- `BbjEMTokenStore.isTokenExpired()` (lines 57-89) has **four** `return false` sites, not three: null/empty (58-60), part count ≠ 3 (65-67), no `exp` match (77-79), and the catch-all (85-88). Only the last three are the #535 "unable to determine" branches; the first is the callers' "no token → prompt login" path and is never reached with a null token from `BbjRunBuiAction`/`BbjRunDwcAction` (they check null/empty first, lines 56-72).
- `exp` is extracted with a hand-rolled regex (`"exp"\s*:\s*(\d+)`) over the base64url-decoded payload — no JSON or JWT library on the classpath, and none is wanted.
- `BbjEMLoginAction.performLogin()` (line 152) stores whatever non-empty, non-`ERROR:` text `em-login.bbj` wrote, with no shape check — the freshly stored token is never decoded before it lands in PasswordSafe.
- #536's POSIX half is **already fixed** (commit `1b731e4`, 2026-08-22): both sites (`BbjEMLoginAction.java:110`, `BbjRunActionBase.java:301`) call `BbjProcessSecretEnv.createOwnerOnlyFile()`, which passes `PosixFilePermissions.asFileAttribute(OWNER_READ, OWNER_WRITE)` at creation. `BbjProcessSecretEnvTest` already asserts the exact permission set and its survival across a truncating reopen; `BbjSecretArgvSourceGuardTest` already asserts both call sites use it and that the attribute is set explicitly. The **non-POSIX branch (lines 120-124) is the plain two-argument `Files.createTempFile`** — that is the Windows gap TOKEN-02 closes.
- `validateTokenServerSide()` (`BbjRunActionBase.java:288-327`) is a protected instance method that spawns `bbj -q em-validate-token.bbj` with a 10 s timeout on every call; `BbjRunBuiAction`/`BbjRunDwcAction` call it unconditionally right after `isTokenExpired()` (lines 75-85 of each). `BbjRunGuiAction` never touches the token. Nothing in the module records a prior validation.
- Pinned platform `ideaIC-2024.2` (`app-client.jar`) exposes `com.intellij.credentialStore.PasswordSafeSettings` (application service, `getProviderType()`, carries an `ApiStatus` annotation — internal), `com.intellij.credentialStore.ProviderType` (`MEMORY_ONLY`, `KEYCHAIN`, `KEEPASS`, `DO_NOT_STORE`), `PasswordSafeSettingsListener.TOPIC` (`typeChanged(old, new)`), and the public `PasswordSafe.isMemoryOnly()`. `CredentialStoreManager.defaultProvider()` reports the platform default, not the user's choice.
- Notification precedents: `BbjWelcomeNotification` is the one-time pattern (`PropertiesComponent` boolean key + `Notifications.Bus.notify` in the `"BBj Language Server"` group, actions "Open Settings"/"Dismiss"); `BbjServerService` uses `NotificationGroupManager` for errors.
- Test classpath is plain JUnit 5 with **no IntelliJ platform classes** (Phase 79 D-01 still holds). Phase 79 left reusable seams in `concurrency/` (`Scheduler`, `ThreadProbe`, `RestartGate`, `KeystrokeDebouncer`, test double `ManualScheduler`) and `DownloadGuard`, `BbjNodeVersionCache` — the injectable-seam + source-guard style this phase continues. CI runs `ubuntu-latest` only; there is no Windows runner.

### Regression-test approach (all four requirements)

- **D-01:** Same shape as Phase 79: every fix is a **plain-Java seam with no IntelliJ imports** (so it runs on the existing test classpath), covered by **behavioural JUnit 5 tests**, plus **one source-guard test per production wiring site** in the existing `*SourceGuardTest` style. Seams: a JWT validity checker (D-03), an owner-only ACL builder (D-07), a backend-notice policy (D-11), and a token-validation trust cache (D-14). No new test framework, no platform test fixture. — **Reversibility:** reversible — internal classes, no published contract.
- **D-02:** Every plan writes its failing test before the production change (v4.1 red-then-green convention), and each issue's acceptance-criteria wording is the literal target of at least one test name.

### Fail-closed expiry (TOKEN-01, #535)

- **D-03:** Extract the decode into a plain-Java `JwtValidity` (name at planner's discretion) beside `BbjEMTokenStore` returning a **three-valued result `VALID` / `EXPIRED` / `MALFORMED`** (research Pitfall 5) from `check(token, nowEpochSeconds)`; the clock is a parameter so tests pin `now`. `MALFORMED` covers null/empty, part count ≠ 3, base64url decode failure, no integer `exp` claim, and any other exception — one classification, not four independent early returns. `BbjEMTokenStore.isTokenExpired(token)` becomes a thin delegate returning `true` for anything that is not `VALID` (fail closed), keeping its current callers unchanged. — **Reversibility:** reversible.
- **D-04:** Keep the dependency-free regex `exp` extraction and the strict `exp <= now` comparison (no leeway, no clock-skew allowance — the server-side check absorbs skew). A non-integer or absent `exp` is `MALFORMED`, not "unknown".
- **D-05:** `BbjEMLoginAction.performLogin()` runs the same check on the text `em-login.bbj` returned **before** `storeToken`: a `MALFORMED` or already-`EXPIRED` result is a login failure ("Enterprise Manager returned an unusable token", via the existing `showErrorOnEdt`) and nothing is stored. This is inside #535's own failure scenario ("freshly-stored token is never itself re-checked") and is what keeps fail-closed coherent — without it a non-JWT login result would "succeed" and then every Run would report the token expired. — **Reversibility:** reversible.
- **D-06:** Regression test: one **parameterized** test over the three #535 inputs (a two-part token, a well-formed payload without `exp`, a payload whose base64url decode throws) plus null/empty, asserting `MALFORMED` from the checker and `true` from `isTokenExpired`; a second test pins `now` on either side of a real `exp` to prove `VALID`/`EXPIRED` still discriminate; a source-guard asserts `BbjEMTokenStore` no longer contains the "let server decide" / "can't determine" `return false` branches and that `performLogin` invokes the check before `storeToken`.

### Owner-only temp files on Windows (TOKEN-02, #536)

- **D-07:** Replace the non-POSIX fallback in `BbjProcessSecretEnv.createOwnerOnlyFile()` with an **explicit Windows ACL set at creation**: build a `FileAttribute<List<AclEntry>>` named `acl:acl` holding exactly one `ALLOW` entry for the current user principal (no inherit flags, no other principals) and pass it to `Files.createTempFile`, so — as on POSIX — there is no window in which the file exists with a broader DACL. The ACL entry list is produced by a small pure function (`ownerOnlyAcl(UserPrincipal)`) that is unit-testable on Linux because `AclEntry` is a plain value class. Principal resolution order: `UserPrincipalLookupService.lookupPrincipalByName(System.getProperty("user.name"))`; if that lookup fails (domain accounts can), create the file in the per-user temp directory, read `Files.getOwner`, and immediately `setAcl` through `AclFileAttributeView` — the documented second-best path. — **Reversibility:** reversible.
- **D-08:** **Fail closed when neither view exists.** If the default filesystem supports neither `posix` nor `acl` attribute views, `createOwnerOnlyFile` throws an `IOException` naming the temp directory and the missing capability instead of silently creating a default-permission file; both callers already surface that as "Login failed: …" / an invalid token. The POSIX branch and the existing POSIX tests are unchanged. — **Reversibility:** reversible — a single method; loosening it later is one branch.
- **D-09:** Owner permission set for the ACL entry: at least `READ_DATA`, `WRITE_DATA`, `APPEND_DATA`, `READ_ATTRIBUTES`, `WRITE_ATTRIBUTES`, `DELETE`, `SYNCHRONIZE`, `READ_ACL` (enough for BBj to truncate-and-write in place and for the `finally` delete); whether to grant the owner full control is Claude's discretion. What is fixed: exactly one principal, `ALLOW` only, no `FILE_INHERIT`/`DIRECTORY_INHERIT` flags.
- **D-10:** Verification: (a) the existing POSIX behavioural tests stay green (that is TOKEN-02's "confirmed by test" clause); (b) a new behavioural test for `ownerOnlyAcl(principal)` asserts one entry, `ALLOW`, the given principal, no inherit flags; (c) a source-guard asserts `BbjProcessSecretEnv` references `acl:acl` / `AclEntry` in the non-POSIX branch and that the bare two-argument `Files.createTempFile(prefix, suffix)` is gone; (d) because CI has no Windows runner, the Windows ACL is proven by a **documented manual check on a Windows host** (`icacls` on the temp file while `em-login.bbj` is running, or a throwaway JShell call to `createOwnerOnlyFile`) recorded as a human UAT item, not by a CI job.

### Non-keychain backend notice (TOKEN-03, #552)

- **D-11:** One narrow method `BbjEMTokenStore.resolveBackend()` (name at planner's discretion) is the **only** place in the plugin that touches `PasswordSafeSettings` / `ProviderType`. It maps the provider to a plain enum `TokenBackend { NATIVE_KEYCHAIN, KEEPASS_FILE, MEMORY_ONLY, UNKNOWN }` (`DO_NOT_STORE` → `MEMORY_ONLY`; any exception, null, or unrecognised enum constant → `UNKNOWN`). Everything that is not `NATIVE_KEYCHAIN` — including `UNKNOWN` — is warn-worthy (research Pitfall 7: detection failure must not silently pass as keychain). — **Reversibility:** reversible; the internal-API blast radius is one method by construction.
- **D-12:** The decision *whether* to notify lives in a plain-Java `BackendNoticePolicy` seam with two injected collaborators — a last-warned-backend store (a string holder; production = `PropertiesComponent` under a `com.basis.bbj.intellij.emTokenBackendWarned` key) and a notifier callback (production = `Notifications.Bus`). Rule: **notify once per distinct non-keychain backend value**, persisted across IDE restarts; a switch back to the native keychain clears the record so a later switch away warns again. This satisfies "one-time" without hiding a later downgrade. The policy is evaluated in **both `storeToken` and `getToken`** (login and every Run) — the check is a settings-enum read, cheap, and covers the user who changed the IDE setting after logging in. No `PasswordSafeSettingsListener` subscription (lifecycle code for no extra coverage).
- **D-13:** Notification content and shape: a **non-modal `WARNING` balloon** in the existing `"BBj Language Server"` group (the login path already shows a modal success dialog; a second modal is unwelcome), titled along the lines of "Enterprise Manager token is not in the OS keychain", body naming the backend in user terms ("IntelliJ is keeping your Enterprise Manager token in a KeePass file" / "in memory only — it will be lost when the IDE restarts" / "in an unrecognised password store"), with an "Open Password Settings" action (`ShowSettingsUtil` to the IDE's Passwords page; exact configurable id is Claude's discretion) and "Dismiss". Regression tests: the policy test drives `storeToken`-then-`getToken` twice under `KEEPASS_FILE` and asserts exactly one notifier call, then flips to `NATIVE_KEYCHAIN` and back and asserts a second; a source-guard asserts `PasswordSafeSettings` appears in exactly one method of `BbjEMTokenStore` and nowhere else in `src/main`. The live balloon is a human UAT item (set "Save passwords" to "In KeePass", log in, expect one balloon; log in again, expect none).

### Validation trust window (TOKEN-04, #542)

- **D-14:** New plain-Java `TokenValidationCache` beside `BbjEMTokenStore` (package `actions`, or a small `auth` package — planner's call) with an injected clock (`LongSupplier` millis). It records **only successful** server validations as `(SHA-256 of the token's UTF-8 bytes, validatedAtMillis)` — the cache never holds the token plaintext — and `isTrusted(token)` is true only when the hash matches and `now - validatedAt <= TRUST_WINDOW_MS`. A different token value is a miss by construction (keyed on bytes, research Pitfall 6). Single static instance, guarded for concurrent Run clicks (synchronized or an `AtomicReference` to an immutable entry). — **Reversibility:** reversible.
- **D-15:** **Trust window = 5 minutes** (`TRUST_WINDOW_MS`, one constant). Rationale: the window is a UX/perf optimisation, not a security boundary — `web.bbj` still presents the token to EM on every launch, so a revoked token fails at launch regardless; five minutes covers the edit-run-edit loop that #542 describes while staying in the "minutes, not the session" band the research asks for. Claude may lower it (not below 60 s) if a reviewer prefers; it must not be raised.
- **D-16:** Invalidation: `BbjEMTokenStore.storeToken` and `deleteToken` both call `TokenValidationCache.invalidate()` unconditionally (login, logout, expiry-driven delete, failed-validation delete all pass through them); a failed server validation never populates the cache. The cache has no timer — expiry is checked on read.
- **D-17:** Wiring: the two identical BUI/DWC blocks route through one base-class method (e.g. `validateTokenTrusted(project, token)`) that consults the cache, calls the existing `validateTokenServerSide` on a miss, and records a hit on `true`. The cache's behavioural test passes a counting `BooleanSupplier` as the "server check" and calls the trusted path twice with the same token under a fixed clock, asserting **one** invocation (the #542 test wording), then advances the clock past the window and asserts a second, then `invalidate()`s and asserts a third; a source-guard asserts `BbjRunBuiAction`/`BbjRunDwcAction` no longer call `validateTokenServerSide` directly. TOKEN-01's plan must be merged before this plan starts (STATE.md sequencing constraint), and the cache test includes a `MALFORMED` token case proving the trusted path never consults the cache for a token the expiry check rejects.

### Plan split and landing

- **D-18:** Four small plans, each red-then-green: **P01** TOKEN-01 (D-03–D-06); **P02** TOKEN-02 Windows ACL (D-07–D-10); **P03** TOKEN-03 backend notice (D-11–D-13); **P04** TOKEN-04 trust cache (D-14–D-17). P04 depends on P01; P02 and P03 are independent of everything and may run in parallel with P01. The planner may merge P01+P03 (same file, `BbjEMTokenStore`) into one plan if it prefers three; P04 stays last either way.
- **D-19:** Landing follows v4.1 practice: one public PR per plan (or per phase), issue numbers in comments are fine, register-check the diff for advisory ids before pushing (none apply here — these are public issues). Each issue closes on its own acceptance criterion; #536 closes with the POSIX confirmation plus the Windows ACL and its manual verification note.

### Claude's Discretion
- Exact names/packages for `JwtValidity`, `TokenValidationCache`, `BackendNoticePolicy`, `TokenBackend`, and whether they sit in `actions/` or a new `auth/` package.
- Whether `isTokenExpired` keeps its name (thin delegate) or callers move to the three-valued result directly; keeping the name is the smaller diff.
- Owner permission set for the Windows ACL entry beyond the D-09 minimum, and whether the principal lookup uses `user.name` first or `getOwner` after creation first.
- Notification wording, the Passwords configurable id, and whether the balloon also carries "Login again" when the backend is memory-only.
- Trust window between 60 s and 5 min (D-15 upper bound is fixed).
- Test file placement (`lsp/` vs mirrored packages; Phase 79 mixed both) and source-guard scoping (substrings vs small regexes).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and roadmap
- `.planning/REQUIREMENTS.md` — §EM Token Security (TOKEN-01 … TOKEN-04, each with the exact regression-test wording; TOKEN-02 records the POSIX half as already fixed in `1b731e4`) and §Out of Scope
- `.planning/ROADMAP.md` — Phase 80 entry: goal and four success criteria; depends on Phase 78
- `.planning/STATE.md` — §Accumulated Context: "TOKEN-01 (#535) must land before TOKEN-04 (#542)"; standing v4.1 decisions (red-then-green coverage; `numFailedTests: 0` whole-suite gate; no advisory ids in source)
- `.planning/PROJECT.md` — §Key Decisions ("JWT token-based EM auth via BBjAdminFactory", "Token as 8th param to web.bbj", "Remove ? 'HIDE' from BBj scripts")

### Research (verified against `main` on 2026-09-04)
- `.planning/research/SUMMARY.md` — §Phase 3 EM Token Security (Pitfalls 5/6/7 avoidance; `PasswordSafeSettings`/`ProviderType` is `@ApiStatus.Internal`, isolate behind one method; #536 is verify-only on POSIX)
- `.planning/research/PITFALLS.md` — Pitfall 5 (single `TokenValidity` result, parameterized test), Pitfall 6 (key on token bytes, invalidate on store/delete, short window), Pitfall 7 (backend detection isolation; treat detection failure as warn-worthy)
- `.planning/research/ARCHITECTURE.md` — §1 Run/EM-login pipeline (where #535/#542/#552 land), "token-validation trust-window cache next to `BbjEMTokenStore`"

### Production files this phase edits
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMTokenStore.java` — `createAttributes()` (26-30), `storeToken`/`getToken`/`deleteToken` (32-48), `isTokenExpired()` (57-89, the three fail-open branches at 65-67, 77-79, 85-88)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjEMLoginAction.java` — `performLogin()` result handling (136-157), `storeToken` call (152), `showErrorOnEdt` (197)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnv.java` — `createOwnerOnlyFile()` (114-125): POSIX branch (115-119) stays, non-POSIX fallback (120-124) is replaced
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunActionBase.java` — `validateTokenServerSide()` (288-327)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjRunBuiAction.java`, `actions/BbjRunDwcAction.java` — token flow in `buildCommandLine()` (56-104 in each; identical apart from the client name)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjWelcomeNotification.java` — one-time notification precedent (`PropertiesComponent` key, `"BBj Language Server"` group, actions)
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` — `notificationGroup id="BBj Language Server"` (line 223); no new registrations expected

### Test patterns to follow
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjProcessSecretEnvTest.java` — existing POSIX permission tests (247-286) that TOKEN-02 keeps green; `Assumptions.assumeTrue(posixSupported)` gating style
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjSecretArgvSourceGuardTest.java` — source-guard for both `createOwnerOnlyFile` call sites and the explicit-attribute assertion (227-271); extend, don't duplicate
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNodeVersionCacheTest.java`, `DownloadGuardTest.java`, `concurrency/RestartGateTest.java` + `concurrency/ManualScheduler.java` — Phase 79 injectable-seam behavioural style (counting doubles, fixed clocks)
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/OffEdtDispatchSourceGuardTest.java`, `BbjServerServiceRestartSourceGuardTest.java` — source-guard helper shape (`readGuardedSource`, `countOccurrences`, `indexOf` ordering)
- `bbj-intellij/build.gradle.kts` — test dependencies (34-36), `useJUnitPlatform()` (40); do not add platform test frameworks

### Platform API (pinned `intellijIdeaCommunity("2024.2")`, inspected in `app-client.jar` on 2026-09-04)
- `com.intellij.credentialStore.PasswordSafeSettings` — application service; `getProviderType()`; internal API (`ApiStatus` annotated) — isolate per D-11
- `com.intellij.credentialStore.ProviderType` — `MEMORY_ONLY`, `KEYCHAIN`, `KEEPASS`, `DO_NOT_STORE`
- `com.intellij.ide.passwordSafe.PasswordSafe` — public `isMemoryOnly()`, `isPasswordStoredOnlyInMemory(attrs, creds)`; already used for `get`/`set`
- JDK 17 `java.nio.file.attribute.AclEntry`, `AclEntryType`, `AclEntryPermission`, `AclFileAttributeView`, `UserPrincipalLookupService`; `Files.createTempFile(prefix, suffix, FileAttribute...)` accepts an `acl:acl` attribute on the Windows provider

### Issues (acceptance criteria are authoritative for closure)
- GitHub #535 — three "unable to determine" branches fail closed; regression test over non-3-part, exp-less, decode-throwing inputs
- GitHub #536 — both `createTempFile` sites owner-only; POSIX confirmed by test; Windows via ACL, not default permissions
- GitHub #552 — one-time notification naming the resolved non-keychain backend; internal-API access behind one method with a regression test
- GitHub #542 — skip server-side validation within a short trust window for the same token; two quick Runs → at most one validation

### Not useful here
- `.planning/codebase/*.md` — dated 2026-02-01, predate `bbj-intellij/`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `BbjProcessSecretEnv.createOwnerOnlyFile()` — already the single choke point for both secret temp files; the Windows ACL lands here and both call sites inherit it with no edits.
- `BbjWelcomeNotification` — the one-time-balloon shape (`PropertiesComponent` key, group `"BBj Language Server"`, `NotificationAction`s) to copy for the backend notice.
- Phase 79 seams (`concurrency/Scheduler` + `ManualScheduler`, `DownloadGuard`, `BbjNodeVersionCache`) — precedents for an injected clock / counting double and a static, thread-safe memo with a package-private `clear()` for tests.
- `BbjSecretArgvSourceGuardTest` / `OffEdtDispatchSourceGuardTest` — helper methods to reuse for the four new source guards.
- `BbjProcessSecretEnvTest` — POSIX tests already prove TOKEN-02's "confirmed by test" clause; only the Windows branch needs new coverage.

### Established Patterns
- Plain-Java seam + behavioural test + source-guard per wiring site (Phase 79 D-01); the platform stays off the test classpath.
- Secrets never enter argv (`BbjProcessSecretEnv`); the cache must follow the same discipline by holding a hash, not the token.
- Off-EDT: `buildCommandLine()` and `performLogin()` already run on a pooled thread with a runtime assertion (Phase 79 D-04); the trust cache and backend check add no EDT work. Notifications go out via `Notifications.Bus.notify`, which is EDT-safe.
- Errors surface through `showErrorOnEdt` (login) and `logError` (run); reuse them, no new dialogs.

### Integration Points
- `BbjEMTokenStore.storeToken`/`deleteToken` become the invalidation hooks for the trust cache and the evaluation points for the backend notice — keep them the only writers to PasswordSafe.
- `BbjRunBuiAction`/`BbjRunDwcAction` lines 75-85 collapse onto one base-class "trusted validation" call; `BbjRunGuiAction` is untouched.
- Phase 83 (BUILD-04/05, LSP4IJ and platform-API canaries) can add a compile-time canary for `PasswordSafeSettings`; D-11's single method is the seam it will target.
- The EM Config `--` sentinel todo touches `BbjRunActionBase.getConfigPathArg()` (line 337), adjacent to but outside this phase's edits; avoid gratuitous churn in that method so the todo's eventual diff stays clean.

</code_context>

<specifics>
## Specific Ideas

- #535's test wording is literal: "a non-3-part token, an exp-less payload, and a decode-throwing payload … each is now treated as expired" — the parameterized test's three cases carry those names.
- #542's test wording is literal: "two Run invocations in quick succession with the same token … the server-side validation subprocess runs at most once" — the cache test's first assertion is exactly that.
- #552 allows "documented manual verification, given no existing IntelliJ test harness" — the policy seam gives a real unit test anyway; the manual KeePass check is a UAT bonus, not the only evidence.
- The Windows ACL cannot be executed in CI; the plan's SUMMARY must state plainly that the Windows half is proven by the pure ACL-builder test plus a recorded manual `icacls` check, not by a green Windows job.

</specifics>

<deferred>
## Deferred Ideas

- Subscribing to `PasswordSafeSettingsListener.TOPIC` to warn the instant the IDE setting changes — D-12's evaluate-on-store-and-get covers the requirement without lifecycle code; revisit if users ask for immediacy.
- A compile-time canary test for the internal `PasswordSafeSettings` API — Phase 83 (BUILD-04/05) platform-coupling coverage.
- A Windows CI runner for the ACL test — not requested; consider if a Windows regression ever surfaces.
- Client-side JWT signature verification — no key material on the client; the server-side validation remains the authority (out of scope by design).
- Applying the same fail-closed change to the VS Code extension's `isTokenExpired` (`bbj-vscode/src/extension.ts:342`, same three fail-open branches) — VS Code-side work is outside the v4.2 IntelliJ burn-down; worth a todo.

### Reviewed Todos (not folded)
Two pending todos matched Phase 80 on keyword overlap only (`run`, `backend`, `test`); the `--auto` rule would fold both, the scope guardrail wins as it did in Phases 78 and 79:
- `2026-08-22-strip-em-config-sentinel-in-getconfigpatharg-and-commands-cj.md` — a run-argument bug in `BbjRunActionBase.getConfigPathArg` / `Commands.cjs`, not a token-security item; stays pending (reviewed again 2026-09-04). Noted above so this phase's edits to `BbjRunActionBase` avoid that method.
- `2026-09-03-update-live-interop-tests-for-getallclassnames-backend.md` — vitest live-interop drift in `bbj-vscode`; unrelated to the IntelliJ plugin; stays pending.

</deferred>

---

*Phase: 80-em-token-security*
*Context gathered: 2026-09-04*
