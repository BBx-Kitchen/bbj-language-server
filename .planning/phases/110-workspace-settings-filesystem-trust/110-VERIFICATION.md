---
phase: 110-workspace-settings-filesystem-trust
verified: 2026-09-26T13:20:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "Set an invalid bbj.formatter.javaPath (e.g. a non-existent absolute path) in real VS Code user settings, with the built VSIX installed, and run Format Document on a .bbj file"
    expected: "An error notification appears naming the configured path and the reason (e.g. not found), and the document is not reformatted; PATH is never used as a fallback"
    why_human: "resolveFormatterJava and the document-formatter.ts refusal path are covered by unit tests with mocked vscode.window.showErrorMessage, but the plan's own <verification> section and 110-VALIDATION.md's Manual-Only Verifications table both defer the real-VS-Code toast/UX confirmation to a manual UAT step that has not been recorded as performed anywhere in the phase artifacts (VALIDATION.md Sign-Off is still 'pending', status: draft)"
  - test: "(Optional, per 110-VALIDATION.md) Grant Workspace Trust on a real untrusted workspace with a workspace-level bbj.configPath set, and confirm the server picks it up without a reload"
    expected: "After granting trust, the language server re-resolves bbj.configPath to the workspace value and re-arms the config watcher"
    why_human: "The extension declares no `capabilities`/`untrustedWorkspaces` block, so it never activates in Restricted Mode today (D-08) — there is no live Restricted-Mode session to test against. 110-VALIDATION.md itself marks this row 'Covered by unit tests; UAT optional', so this is informational, not blocking."
---

# Phase 110: Workspace Settings & Filesystem Trust Verification Report

**Phase Goal:** Values that a workspace controls (the interop host and port, `bbj.configPath`, USE-statement paths, and the files the extension probes or spawns) can no longer send the language server or the extension somewhere the user did not choose.
**Verified:** 2026-09-26
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | An interop host that is not a non-empty string, or a port that is not an integer 1-65535, arriving through initializationOptions or a configuration change, falls back to the default per field with a logged warning; one shared validator holds the only copy of the defaults | ✓ VERIFIED | `bbj-vscode/src/language/interop-config.ts` (`validateInteropConfig`, `DEFAULT_INTEROP_HOST='localhost'`, `DEFAULT_INTEROP_PORT=5008`); `java-interop.ts:495-496` calls it inside `setConnectionConfig`; `bbj-ws-manager.ts:75` and `main.ts:274` pass raw values with no local fallback; `grep -rlE "'localhost'|'127\.0\.0\.1'"` under `src/language` returns only `interop-config.ts`; `test/interop-config.test.ts` (part of the 160/160 passing run I executed) exercises both entry paths per field |
| 2 | In an untrusted VS Code workspace, a workspace-level `bbj.configPath` is ignored and the user-level value (or default) is used; trusted/user-level behaviour unchanged | ✓ VERIFIED (criterion shown via stubbed-vscode unit tests only, by design — see D-08 and Human Verification) | `bbj-vscode/src/config-path-trust.ts`'s `effectiveConfigPath()` reads only `inspect('configPath').globalValue` when untrusted (fail-closed on missing trust state); wired at `extension.ts` initializationOptions, the push/pull middleware (`createConfigPathTrustMiddleware`, never calls `next()` for a `bbj` section list), the trust-grant re-push (`registerTrustGrantRepush`), and `config-path-cache.ts`'s `explicitSettingPath()`; `test/extension-config-trust.test.ts` (33 tests, all passing in my run) drives all of these through `activate()` with a stubbed `vscode.workspace`; package.json confirmed to declare no `capabilities`/`restrictedConfigurations` |
| 3 | A USE statement whose path resolves outside every configured PREFIX root reads no file, in both the document builder and the scope lookup; a test asserts nothing outside the roots is opened | ✓ VERIFIED | `bbj-vscode/src/language/path-containment.ts` (`isPathInside`, `containedPrefixCandidates`); wired into `addImportedBBjDocuments`/`revalidateUseFilePathDiagnostics` (`bbj-document-builder.ts`), `getBBjClassesFromFile` (`bbj-scope.ts`), and the USE-file validator (`bbj-validator.ts`); `test/use-path-containment.test.ts` spy-`FileSystemProvider` test asserts `..`, absolute-outside and transitive-escape candidates are never read (confirmed passing) |
| 4a | Prefix membership is decided on path segments — `/libs/foo2/` is not inside `/libs/foo` | ✓ VERIFIED | `bbj-ws-manager.ts:281` `isExternalDocument()` now calls `isPathInside(...)` instead of `fsPath.startsWith`; `grep -rn "startsWith(URI.file"` across `src` returns nothing; `test/path-containment.test.ts` pins the `/libs/foo2` vs `/libs/foo` case (confirmed passing) |
| 4b | `isTokenizedFile` and `statSize` return not-a-file for a symlink, a directory or a FIFO | ✓ VERIFIED | `bbj-vscode/src/decompile-io.ts`: both functions `lstat` first and reject anything but `isFile()`; `isTokenizedFile` additionally opens with `O_NOFOLLOW`/`O_NONBLOCK` where numeric and re-checks with `fstat()`; `test/decompile-io.test.ts` covers symlink/dir/FIFO cases for both (confirmed passing, FIFO skipped on win32 only) |
| 5 | When `bbj.formatter.javaPath` is set, the formatter checks existence/executability before spawning and shows an error instead of falling back to PATH; when empty, the resolved PATH binary is checked the same way | ✓ VERIFIED (automated); manual real-VS-Code confirmation still pending — see Human Verification | `package.json` declares `bbj.formatter.javaPath` (`type: string`, `default: ""`, `scope: "machine"` — confirmed by direct read, so a workspace `.vscode/settings.json` cannot set it); `formatter-java-resolver.ts` (`resolveFormatterJava`, `checkJavaExecutable`, `findJavaOnPath`); `document-formatter.ts:153,169` calls it before `cp.spawn(javaResolution.path as string, ...)`, never `cp.spawn('java', ...)`; `test/formatter-java-resolver.test.ts` + `test/document-formatter.test.ts` cover accepted/refused/PATH-walk/Windows cases (44+ tests, confirmed passing) |

**Score:** 5/5 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/interop-config.ts` | Validator + only copy of defaults | ✓ VERIFIED | Zero imports, exports match plan; read and confirmed directly |
| `bbj-vscode/src/language/path-containment.ts` | `isPathInside`, `containedPrefixCandidates` | ✓ VERIFIED | Read and confirmed directly, including the CR-01 empty/whitespace-prefix fix (`bf4bc57d`) |
| `bbj-vscode/src/decompile-io.ts` | Hardened `isTokenizedFile`, exported `statSize` | ✓ VERIFIED | Read and confirmed directly |
| `bbj-vscode/src/formatter-java-resolver.ts` | `resolveFormatterJava` etc. | ✓ VERIFIED | Read and confirmed directly, no `child_process` import |
| `bbj-vscode/src/config-path-trust.ts` | `effectiveConfigPath`, `gatedBbjSettings`, middleware, trust-grant repush | ✓ VERIFIED | Read and confirmed directly, including the WR-01 `__proto__` guard fix (`8f0943ae`) |
| `bbj-vscode/test/*.test.ts` (interop-config, path-containment, use-path-containment, decompile-io, formatter-java-resolver, extension-config-trust) | Test coverage for each requirement | ✓ VERIFIED | I ran these 8 files directly: 160/160 tests passed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `bbj-ws-manager.ts onInitialize` | `JavaInteropService.setConnectionConfig` | raw initializationOptions values | ✓ WIRED | Confirmed via grep + read |
| `main.ts onDidChangeConfiguration` | `JavaInteropService.setConnectionConfig` | raw pushed values | ✓ WIRED | Confirmed via grep + read |
| `BBjDocumentBuilder.addImportedBBjDocuments` | `containedPrefixCandidates` | only contained candidates reach `fsProvider.readFile` | ✓ WIRED | Confirmed via read |
| `BbjScopeProvider.getBBjClassesFromFile` / `bbj-validator.ts` | `containedPrefixCandidates` | PREFIX candidates filtered | ✓ WIRED | Confirmed via read |
| `BBjWorkspaceManager.isExternalDocument` | `isPathInside` | segment-aware membership | ✓ WIRED | Confirmed via read; no `startsWith` left anywhere in `src` |
| `DocumentFormatter.runFormatter` | `resolveFormatterJava` | called before `cp.spawn` | ✓ WIRED | Confirmed via read |
| `extension.ts startLanguageClient` | `createConfigPathTrustMiddleware` / `effectiveConfigPath` / `registerTrustGrantRepush` | initializationOptions, `clientOptions.middleware.workspace`, trust-grant subscription | ✓ WIRED | Confirmed via read |
| `config-path-cache.ts explicitSettingPath` | `effectiveConfigPath` | replaces raw settings read | ✓ WIRED | Confirmed via read |

### Behavioral Spot-Checks / Test Execution (independently run by the verifier)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Core phase-110 test files (interop-config, path-containment, use-path-containment, decompile-io, formatter-java-resolver, extension-config-trust, document-formatter, no-shell-command-construction) | `RUN_BBJ_TESTS=0 npx vitest run <8 files>` | 8 files, 160/160 tests passed | ✓ PASS |
| TypeScript compile | `npx tsc -p tsconfig.json` | exit 0, no errors | ✓ PASS |
| Regression suites (ws-manager, classes, use-project-root, imports, extensionless-use-target, lazy-prefix-loading, document-builder, config-hot-reload-wiring, java-interop-service, java-interop-timeouts) | `RUN_BBJ_TESTS=0 npx vitest run <10 files>` | 9/10 files clean; `classes.test.ts`'s "Cyclic inheritance detection" `beforeAll` timed out at the default 10s hook timeout under parallel/host load | ⚠️ see below |
| `classes.test.ts` re-run with `--hookTimeout=30000`, isolated | `npx vitest run test/classes.test.ts -t "Cyclic inheritance" --hookTimeout=30000` | 19/19 passed | ✓ PASS (confirms the failure above was host-load contention, not a code defect; file is byte-identical to phase base `c591cfe8` per `git diff --stat`) |
| Whole suite | `RUN_BBJ_TESTS=0 npx vitest run --maxWorkers=2` | 9 failed test files / 127 passed / 5 skipped; 2541 tests passed, 434 skipped, **0 tests failed** | ✓ PASS (0 failed tests) — the 9 file-level failures are `initializeWorkspace` `beforeAll` hook-timeout contention (documented project pattern) plus the one documented pre-existing `installed-extension-e2e.test.ts` SETOPTS (#475) failure that the orchestrator's own base-commit context confirms also fails on `c591cfe8` |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SEC-01 | 110-01 | Interop host/port validated in one shared place | ✓ SATISFIED | `interop-config.ts`, wired at both entry points |
| REF-02 | 110-01 | Interop defaults defined once | ✓ SATISFIED | Confirmed via grep: exactly one `'localhost'` and one `5008` under `src/language` |
| SEC-02 | 110-05 | Workspace-level `bbj.configPath` ignored when untrusted | ✓ SATISFIED (automated); manual UAT item noted | `config-path-trust.ts` + wiring |
| SEC-06 | 110-02 | USE-path resolution rejects paths outside PREFIX roots | ✓ SATISFIED | `path-containment.ts` + 3 call sites, CR-01 fix applied |
| SEC-07 | 110-02 | `isExternalDocument()` compares on segment boundaries | ✓ SATISFIED | `isPathInside` wired into `isExternalDocument` |
| SEC-08 | 110-03 | `isTokenizedFile`/`statSize` reject symlinks/non-regular files | ✓ SATISFIED | `decompile-io.ts` hardened |
| SEC-09 | 110-04 | Formatter's java binary configurable and verified before spawn | ✓ SATISFIED (automated); manual UAT item noted | `formatter-java-resolver.ts` + `document-formatter.ts` wiring |

**REQUIREMENTS.md cross-reference:** All 7 phase requirement IDs (SEC-01, SEC-02, SEC-06, SEC-07, SEC-08, SEC-09, REF-02) appear in REQUIREMENTS.md marked `[x]` and mapped to "Phase 110 / Complete". No orphaned requirements found mapped to Phase 110 that are absent from the 5 plans' `requirements` frontmatter.

### Anti-Patterns Found

Scanned all phase-modified source files for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`. Three pre-existing `TODO` comments remain in `bbj-ws-manager.ts` (lines 15, 277) and `bbj-scope.ts` (line 640); all three are confirmed byte-identical to the phase base commit `c591cfe8` (`git show c591cfe8:<file> | grep TODO` matches exactly). The `bbj-ws-manager.ts:277` TODO ("check that document is part of the workspace folders") is explicitly called out in 110-CONTEXT.md (D-15) and the 110-02 plan as intentionally out of scope for this phase. No new debt markers were introduced. No blockers.

`document-formatter.ts:173-179` has one Info-level dead-branch finding (IN-01) left open by choice in `110-REVIEW-FIX.md` ("IN-01 left alone, per explicit scope") — both branches of an `if`/`else` reject with the same `err`, a redundant no-op, not a functional defect. Non-blocking.

### Code Review Findings (110-REVIEW.md / 110-REVIEW-FIX.md)

| ID | Severity | Status | Verification |
|----|----------|--------|---------------|
| CR-01 | Critical | Fixed (`bf4bc57d`) | Confirmed in code: `containedPrefixCandidates` now skips `prefix.trim().length === 0` entries; regression tests in `path-containment.test.ts` and `use-path-containment.test.ts` pass |
| WR-01 | Warning | Fixed (`8f0943ae`) | Confirmed in code: `toPlainJSON`'s object branch uses `Object.create(null)` and skips a literal `__proto__` key; regression test in `extension-config-trust.test.ts` passes |
| IN-01 | Info | Left open (by explicit scope decision) | Non-blocking, cosmetic |

### Human Verification Required

### 1. Formatter error message on an invalid `bbj.formatter.javaPath`, in a real VS Code session

**Test:** With the built VSIX installed, set `bbj.formatter.javaPath` to a non-existent absolute path in user settings, then run Format Document on a `.bbj` file.
**Expected:** An error notification appears naming the configured path and the reason (not found), and the document is not reformatted. No PATH fallback occurs.
**Why human:** The refusal path is unit-tested with a mocked `vscode.window.showErrorMessage`, but the phase's own `110-04-PLAN.md` `<verification>` section and `110-VALIDATION.md`'s "Manual-Only Verifications" table both defer the real-VS-Code UI confirmation to a manual UAT step. Nothing in the phase artifacts (SUMMARY files, VALIDATION.md) records this step as having been performed — `110-VALIDATION.md`'s Sign-Off section is still `status: draft`, `Approval: pending`.

### 2. (Optional) Workspace Trust grant re-push, in a real VS Code session

**Test:** In an untrusted workspace with a workspace-level `bbj.configPath` set, grant Workspace Trust and observe whether the language server picks up the workspace value without a reload.
**Expected:** The server re-resolves `bbj.configPath` to the workspace value and re-arms the config watcher.
**Why human:** The extension declares no `capabilities`/`untrustedWorkspaces` block, so it never activates in Restricted Mode today (documented decision D-08) — there is no live Restricted-Mode session to exercise. `110-VALIDATION.md` itself marks this row "Covered by unit tests; UAT optional," so this item is informational rather than blocking phase completion.

### Gaps Summary

No gaps. All 7 requirement IDs (SEC-01, SEC-02, SEC-06, SEC-07, SEC-08, SEC-09, REF-02) are implemented, wired end-to-end, and covered by passing automated tests that I independently executed (160/160 on the 8 core phase test files; 0 failed tests across the whole suite; TypeScript compiles clean). Both code-review findings that reached Critical/Warning severity (CR-01, WR-01) are fixed in the current tree, not just claimed in SUMMARY — I read the fixed source directly. The phase is functionally complete; the only open item is a manual real-VS-Code UX confirmation for the formatter's error toast (SEC-09), which the phase's own VALIDATION.md already scoped as a pending manual step rather than an automated gap.

---

_Verified: 2026-09-26_
_Verifier: Claude (gsd-verifier)_
