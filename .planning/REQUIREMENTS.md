# Requirements: BBj Language Server — v4.2 IntelliJ Burn-down

**Defined:** 2026-09-04
**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Milestone scope:** every open PRIO 1 and PRIO 2 IntelliJ issue from the 2026-08-20 audit (22 GitHub issues). Each requirement names the issue(s) it closes; closing the requirement closes the issue(s). Research (`.planning/research/SUMMARY.md`) established that two issues are already fixed on `main` and need only verification plus regression coverage, and that #554 is a strict subset of #544.

## v1 Requirements

### EDT Responsiveness

- [x] **EDT-01**: Run As BUI/DWC and Login to Enterprise Manager never block the EDT on token validation or login; the existing off-EDT dispatch (v4.1 CR-02, commit 06eb1a7) is confirmed against current source and locked in with a regression test that fails if `buildCommandLine()` or `performLogin()` runs on the EDT (#506, verify-and-close)
- [x] **EDT-02**: Typing in the Settings dialog's BBj home or Node.js path field never spawns a subprocess or reads a file on the EDT; version and classpath lookups run from a debounced background task, with a regression test simulating rapid keystrokes (#541)
- [x] **EDT-03**: The missing-Node-runtime editor notification caches the last known Node.js version per configured path and re-runs `node --version` only when the setting changes; a regression test asserts at most one spawn across two consecutive refresh passes (#543)
- [x] **EDT-04**: The first-crash language-server auto-restart delay is scheduled via `restartAlarm` off the EDT, never via `Thread.sleep` inside `invokeLater`, with a regression test asserting no EDT sleep (#513)
- [x] **EDT-05**: All six language-server restart triggers (restart action, crash notification, both status-bar widgets, refresh Java classes, crash auto-restart) go through one guarded entry point so overlapping restarts cannot race; a regression test fires two triggers in quick succession and asserts one restart (#539)
- [x] **EDT-06**: At most one Node.js download runs at a time; the in-progress check-and-set is atomic, with a regression test asserting two near-simultaneous calls start one download task (#537)

### EM Token Security

- [x] **TOKEN-01**: A malformed, non-3-part, exp-less, or undecodable JWT is treated as expired (fail closed), with a regression test covering all three previously fail-open branches (#535)
- [x] **TOKEN-02**: EM login and validate temp files holding plaintext JWT output are owner-only from creation on POSIX (already fixed, commit 1b731e4, confirmed by test) and on Windows via an ACL equivalent rather than the current default-permission fallback (#536, verify plus Windows half)
- [x] **TOKEN-03**: When PasswordSafe's resolved backend for the EM token is not the native OS keychain (KeePass file or memory-only), the plugin shows a one-time notification naming the backend; the internal-API access is isolated behind a single method with a regression test (#552)
- [ ] **TOKEN-04**: Server-side token validation is skipped within a short trust window after a successful validation of the same token value; the cache is keyed on the token bytes, invalidated on store/delete, and depends on TOKEN-01 landing first; a regression test asserts one validation across two quick Run invocations (#542)

### Feature Parity and Correctness

- [ ] **PARITY-01**: "Compile BBj File" in IntelliJ sends a new `bbj/compile` request to the shared language server, which invokes bbjcpl through the existing `BBjCPLService`, and the action surfaces success or the returned diagnostics to the user; no bbjcpl invocation logic is duplicated on the IntelliJ side, and full compiler-option UI parity stays out of scope (#571)
- [ ] **PARITY-02**: Bracket characters inside BBj string literals (including `""`-doubled quotes) are not treated as structural brackets for matching, navigation, or auto-close; the lexer emits a STRING token registered as a string-literal element, with regression tests for `PRINT "value (not a bracket)"` and doubled quotes (#568)
- [ ] **PARITY-03**: The line-comment toggle recognizes `rem`, `Rem`, and `REM` (word-bounded) as already commented and removes the prefix instead of adding a second one, with regression tests for lowercase and mixed case (#540)

### Composer Robustness

- [ ] **COMP-01**: Every composer CompletableFuture chain (launcher and each dialog's refresh) has a terminal exception handler that shows a user-visible notification on failure; a regression test forces one chain to fail and asserts the notification (#538)
- [ ] **COMP-02**: Before applying a composer edit after the modal dialog closes, the launcher re-decodes the call at the captured offsets and, on mismatch with the pre-dialog decode, aborts the edit and notifies the user rather than rewriting whatever text now occupies the range; a regression test mutates the document while the dialog is open and asserts no edit is applied (#567, decision: abort and notify)

### Build and Test Foundation

- [x] **BUILD-01**: `bbj-intellij` builds and tests on any host JDK via a Gradle `toolchain` pinned to Java 17 with the foojay resolver, verified by a successful `./gradlew test` on this environment's JDK 25 (#570)
- [x] **BUILD-02**: The Gradle wrapper is regenerated to a current 8.x release with a pinned distribution checksum, the committed wrapper JAR matches the declared version, a CI wrapper-validation step guards it, and `./gradlew dependencies` enumerates the transitive tree (#503, #576)
- [x] **BUILD-03**: `./gradlew buildPlugin` on a clean clone fails fast with a directed message when `../bbj-vscode/out/language/main.cjs` is absent, instead of assembling a plugin without its language server (#517)
- [ ] **BUILD-04**: The existing `src/test/` source set (7 JUnit 5 classes, stale claim in #569 corrected) is extended with regression coverage for the Node download/extract/cache pipeline and the EDT-responsiveness paths this milestone changes; `./gradlew test` runs them green (#569, residual)
- [ ] **BUILD-05**: Every LSP4IJ `@ApiStatus.Experimental` coupling point across the seven `lsp/` and `ui/` files, plus the new compile request surface from PARITY-01, is covered by canary or source-guard regression tests that fail on a breaking LSP4IJ change (#544; closes #554 as a subset)

## v2 Requirements

Deferred to a future milestone. Tracked but not in this roadmap.

### IntelliJ Feature Parity (PRIO 3)

- **PAR-V2-01**: Formatter, denumber, tokenized-file detection, and decompile actions in IntelliJ (#634, #631)
- **PAR-V2-02**: SETOPTS composer for config.bbx in IntelliJ (#633)
- **PAR-V2-03**: Refresh Java Classes via targeted LSP request instead of full LS restart (#632)
- **PAR-V2-04**: Full BBjCPL compiler-option configuration UI in IntelliJ (follow-on to PARITY-01)

### IntelliJ Cleanups (PRIO 3)

- **CLEAN-V2-01**: Duplication cleanups across run actions, composer dialogs, intentions, widgets, and notification providers (#615-#622, #630)
- **CLEAN-V2-02**: Java-interop health probe uses a protocol handshake, not a bare TCP connect (#587, shares root cause with DEBT.md item 5)
- **CLEAN-V2-03**: Remaining PRIO 3 IntelliJ findings (#586, #588-#594, #607-#614)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| #566 VS Code shell-string exec in run commands | VS Code-side fix; appears in the IntelliJ scan only because its title compares the two IDEs |
| Tagged release and advisory publication (PROC-03), `WINDOWS.md` entry 1, DEBT.md items | v4.1 carry-overs, maintainer-owned, not GSD phases |
| Forcing PasswordSafe onto the native keychain | Overrides an IDE-wide user/org policy; #552 asks for a warning, not an override |
| General async/threading abstraction for the EDT fixes | Plugin already has two proven patterns (Alarm debounce, executeOnPooledThread); a third adds surface without value |
| BbjWordLexer or parser rewrite beyond the STRING token | Standing decision: no native IntelliJ lexer/parser rewrite |
| Gradle 9.x upgrade | Forces an intellij-platform-gradle-plugin minimum bump and sandbox-path migration; stay on 8.x this milestone |
| Version catalogs, dependency locking, broad SCA tooling | Wrapper pin plus Dependabot entry satisfies #503/#576; broader work is a separate review |
| Live IntelliJ UI test fixtures (BasePlatformTestCase) as a new harness | Existing plain-JUnit and source-guard pattern suffices for this milestone's regression tests |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| EDT-01 | Phase 79 | Complete |
| EDT-02 | Phase 79 | Complete |
| EDT-03 | Phase 79 | Complete |
| EDT-04 | Phase 79 | Complete |
| EDT-05 | Phase 79 | Complete |
| EDT-06 | Phase 79 | Complete |
| TOKEN-01 | Phase 80 | Complete |
| TOKEN-02 | Phase 80 | Complete |
| TOKEN-03 | Phase 80 | Complete |
| TOKEN-04 | Phase 80 | Pending |
| PARITY-01 | Phase 81 | Pending |
| PARITY-02 | Phase 81 | Pending |
| PARITY-03 | Phase 81 | Pending |
| COMP-01 | Phase 82 | Pending |
| COMP-02 | Phase 82 | Pending |
| BUILD-01 | Phase 78 | Complete |
| BUILD-02 | Phase 78 | Complete |
| BUILD-03 | Phase 78 | Complete |
| BUILD-04 | Phase 83 | Pending |
| BUILD-05 | Phase 83 | Pending |

**Coverage:**

- v1 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0 ✓

---
*Requirements defined: 2026-09-04*
*Last updated: 2026-09-04 after roadmap creation — 20/20 requirements mapped to Phases 78-83*
