---
phase: "81"
slug: "feature-parity-and-correctness"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-05"
reconstructed: true
---

# Phase 81 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Reconstructed from PLAN/SUMMARY artifacts by `/gsd-validate-phase 81` after execution (State B): no VALIDATION.md was seeded at plan time.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Two runners: vitest (language server, `bbj-vscode`) and JUnit 5 via Gradle (IntelliJ plugin, `bbj-intellij`; plain JVM, no IntelliJ platform test fixture) |
| **Config file** | `bbj-vscode/vite.config.ts` / `bbj-vscode/package.json` (vitest); `bbj-intellij/build.gradle.kts` (JDK 17 daemon toolchain, phase 78) |
| **Quick run command** | `cd bbj-vscode && npx vitest run test/<file>.test.ts` or `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests '<FQCN>'` |
| **Full suite command** | `cd bbj-vscode && npx vitest run --maxWorkers=2` and `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test` (add `--rerun` when Gradle reports the task UP-TO-DATE) |
| **Estimated runtime** | vitest targeted ~5 s, whole suite ~4 min; Gradle ~5 s warm daemon, ~2 min cold |

Prerequisites: java-interop on `127.0.0.1:5008` is live in this environment, so the vitest whole suite exercises interop; `bbj-vscode/out/language/main.cjs` must exist for the Gradle packaging tasks (phase 78 fail-fast bundle check). The `bbj/compile` tests use in-repo fake `bbjcpl` fixtures (`test/test-data/cpl-fixture-compile-{ok,fatal}-bbjhome/`), so no real BBj install is needed for them.

---

## Sampling Rate

- **After every task commit:** Run the plan's targeted test file(s)/class(es)
- **After every plan wave:** Run both full-suite commands
- **Before `/gsd-verify-work`:** Full suites must be green (vitest: the 14 documented pre-existing failures only — see below)
- **Max feedback latency:** ~120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 81-01-01 | 01 | 1 | PARITY-01 | — | `bbj/compile` refuses without an explicit output location; bbjcpl spawned as an argv array, never a shell string | integration (fake bbjcpl) | `cd bbj-vscode && npx vitest run test/compile-request.test.ts` | ✅ | ✅ green (12) |
| 81-01-02 | 01 | 1 | PARITY-01 | — | Refusals carry a machine-readable `reason`; unparsed stderr becomes a failure, not silent success; concurrent compiles are independent of the validate-only path | integration | `cd bbj-vscode && npx vitest run test/compile-request.test.ts test/cpl-service.test.ts test/cpl-parser.test.ts test/cpl-integration.test.ts` | ✅ | ✅ green (12 + 28) |
| 81-01-03 | 01 | 1 | PARITY-01 | — | One option table in the repository; VS Code's adapter delegates, argv-injection guards unchanged | unit + source-guard | `cd bbj-vscode && npx vitest run test/compiler-options.test.ts test/compiler-options-single-table.test.ts test/command-argv-injection.test.ts test/no-shell-command-construction.test.ts` | ✅ | ✅ green (87 incl. 3 new) |
| 81-02-01 | 02 | 1 | PARITY-02 | — | A parenthesis inside a string literal is never emitted as a bracket token | unit | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.lexer.BbjStringCommentScannerTest'` | ✅ | ✅ green (13) |
| 81-02-02 | 02 | 1 | PARITY-02 | — | Doubled quotes, unterminated quotes, `rem` word boundaries and input edges all keep brackets inert | unit | same as 81-02-01 | ✅ | ✅ green (13) |
| 81-02-03 | 02 | 1 | PARITY-02 | — | Parser definition exposes STRING/COMMENT token sets; brace matcher refuses pairing in those contexts | source-guard | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.lexer.*'` | ✅ | ✅ green (10) |
| 81-03-01 | 03 | 1 | PARITY-03 | — | `rem foo` is recognised as commented and uncomments to `foo` | unit | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.commenter.RemToggleSeamTest'` | ✅ | ✅ green (11) |
| 81-03-02 | 03 | 1 | PARITY-03 | — | Word boundary (`remark` is code), indentation, bare `rem`, locale-independent casing, concurrent use | unit | same as 81-03-01 | ✅ | ✅ green (11) |
| 81-03-03 | 03 | 1 | PARITY-03 | — | `BbjCommenter` implements both `Commenter` and `SelfManagingCommenter` and delegates every decision to the seam | source-guard | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.commenter.*'` | ✅ | ✅ green (7) |
| 81-04-01 | 04 | 1 | PARITY-01 | — | A configured directory reaches the server as the flat `compilerOutputDirectory` initialization option | unit | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.lsp.CompilerInitOptionsTest'` | ✅ | ✅ green (8) |
| 81-04-02 | 04 | 1 | PARITY-01 | — | Unset/blank normalises to "not configured"; padded values are trimmed; interior whitespace and Windows paths are preserved untouched (one string, one argv element) | unit | same as 81-04-01 | ✅ | ✅ green (8) |
| 81-04-03 | 04 | 1 | PARITY-01 | — | All four wiring sites present; `BbjLanguageClient` deliberately untouched | source-guard | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.lsp.CompilerOutputDirectorySourceGuardTest'` | ✅ | ✅ green (7) |
| 81-05-01 | 05 | 2 | PARITY-01 | — | Success result renders "Compiled <file>"; presenter never string-matches prose | unit | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew compileJava` then `./gradlew test --tests 'com.basis.bbj.intellij.compile.CompileResultPresenterTest'` | ✅ | ✅ green (12) |
| 81-05-02 | 05 | 2 | PARITY-01 | — | Every `reason` value, an unknown reason, and both client-side failures render a distinct balloon; only `output-directory-required` offers the settings remedy | unit | same as 81-05-01 | ✅ | ✅ green (12) |
| 81-05-03 | 05 | 2 | PARITY-01 | — | Round trip runs in `Task.Backgroundable` asserting off-EDT first; save precedes dispatch; no bbjcpl process launch or command-line construction on the IntelliJ side | source-guard | `cd bbj-intellij && JAVA_HOME=/opt/java/default ./gradlew test --tests 'com.basis.bbj.intellij.compile.*'` | ✅ | ✅ green (8) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Requirement coverage (whole IntelliJ suite 312 tests / 0 failures; vitest 1175 tests with only the 14 documented pre-existing failures — 12 java-interop `getAllClassNames` drift in `linking.test.ts`/`issue447-real-interop.test.ts`, 2 stale Phase 78 wrapper fixture in `gradle-wrapper-hygiene.test.ts`, both tracked in `.planning/todos/pending/`; all re-run on 2026-09-05):

| Requirement | Covering tests | Gap type |
|-------------|----------------|----------|
| PARITY-01 (#571) | `compile-request.test.ts` (12), `compiler-options-single-table.test.ts` (3), `CompilerInitOptionsTest` (8), `CompilerOutputDirectorySourceGuardTest` (7), `CompileResultPresenterTest` (12), `BbjCompileActionSourceGuardTest` (8) | COVERED (balloon rendering and live bbjcpl round trip by seam tests + source guards; see Manual-Only) |
| PARITY-02 (#568) | `BbjStringCommentScannerTest` (13), `BbjLexerStringCommentSourceGuardTest` (10) | COVERED (editor highlight/auto-close behaviour by token-level tests + source guard; see Manual-Only) |
| PARITY-03 (#540) | `RemToggleSeamTest` (11), `BbjCommenterSelfManagingSourceGuardTest` (7) | COVERED (Ctrl+/ keystroke by seam tests + source guard; see Manual-Only) |

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 stubs were needed: every task wrote its failing test first (RED observed in each SUMMARY) against the vitest and JUnit 5 runners phases 01 and 78 provisioned. 81-01 added two fake-`bbjcpl` fixture trees under `bbj-vscode/test/test-data/` so the real-compile path is testable without a BBj install.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| "Compile BBj File" on a valid file writes the tokenized output to the configured directory and shows the success balloon; the same text appears in the language-server console | PARITY-01 | The action, balloons and round trip need the IntelliJ platform and a running language server, which the test module deliberately excludes (plain-JVM JUnit only) | Set Settings > BBj > Compile output directory to an empty folder, open a `.bbj` file, run Tools > Compile BBj File; expect a balloon "Compiled <name>" and a new file in the folder |
| A syntax error shows the error balloon with `line:col` diagnostics and the same text in the console | PARITY-01 | Same | Introduce a syntax error, compile; expect an error balloon listing the diagnostic and no output file |
| With no output directory configured the action shows an error balloon whose "Open Settings" action lands on the BBj settings page | PARITY-01 | Same | Clear the directory setting, compile; click "Open Settings" on the balloon |
| Settings dialog: BBj Compiler section visible with a working folder chooser and hint text; value persists across Apply/reopen; server restarts on Apply; Reset restores the saved value without clearing other fields | PARITY-01 | Swing dialog cannot be exercised without the platform | Open Settings > BBj, use the chooser, Apply, reopen; edit then Reset |
| Typing `PRINT "value (not a bracket)"` or `PRINT "say ""hi"" (ok)"` does not highlight, navigate to (Ctrl+Shift+M) or auto-close the parenthesis inside the literal; a real code bracket on the same line still does | PARITY-02 | Editor bracket features need the platform | Type both lines in a `.bbj` file, place the caret at the inner `(`; expect no match highlight and no jump; then place it on a code `(` after the string and expect normal behaviour |
| Ctrl+/ on `rem foo`, `Rem foo`, `REM foo` removes the prefix; on `remark` (no word boundary) adds one; a double toggle round-trips | PARITY-03 | Keystroke handling needs the platform | Toggle each line once and observe; toggle twice and expect the original text |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none)
- [x] No watch-mode flags (`vitest run` / Gradle one-shot only)
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-05 (reconstructed; all 15 task commands re-run green during the wave gates and again after the comment scrub commit)

## Validation Audit 2026-09-05
| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
