---
phase: "89"
slug: "cvs-composer-msgbox-expressions-composer-discoverability"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-12"
---

# Phase 89 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (bbj-vscode)** | Vitest (existing pin) |
| **Framework (bbj-intellij)** | JUnit 5 via Gradle `test` task (existing pin, `junit-bom:5.10.2`) |
| **Config file** | `bbj-vscode/vitest.config.ts` (existing, unmodified); `bbj-intellij/build.gradle.kts` `tasks.withType<Test>()` (existing) |
| **Quick run command (TS)** | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/cvs-composer.test.ts test/composer-codelens.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` |
| **Quick run command (Java)** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.*'` |
| **Full suite command** | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode test` (bbj-vscode); `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline` (bbj-intellij) |
| **Estimated runtime** | ~120 seconds (Gradle full suite dominates) |

---

## Sampling Rate

- **After every task commit:** Run the targeted `vitest run <file>` / `./gradlew test --tests "<class>"` for the file(s) touched
- **After every plan wave:** Run the bbj-vscode full suite; the bbj-intellij full suite if IntelliJ dialog/DTO/Code Vision work lands in that wave
- **Before `/gsd-verify-work`:** Full suite must be green on both sides, plus the IntelliJ Code Vision spike's human-verify checkpoint recorded (Roadmap Success Criterion 1)
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 89-TBD | TBD | TBD | DISC-01 | — | CodeLens fires for all 5 composer kinds (MSGBOX, addWindow, addChildWindow, CVS, SETOPTS) on a mixed-content document | unit | `vitest run test/composer-codelens.test.ts` | ❌ W0 | ⬜ pending |
| 89-TBD | TBD | TBD | DISC-01 (Success Criterion 5) | — | Cue computation does not reparse/walk the full document per keystroke (structural/call-count assertion on a synthetic large file) | unit (timing/structural) | `vitest run test/composer-codelens.test.ts` | ❌ W0 | ⬜ pending |
| 89-TBD | TBD | TBD | DISC-01 (Success Criterion 1) | — | IntelliJ Code Vision registration (`setCodeLensFeature(...)`) is wired and compiles against the plugin's `sinceBuild` | unit (source guard) + human-verify (visible render) | `./gradlew test --offline --tests '*CodeLens*'` | ❌ W0 | ⬜ pending |
| 89-TBD | TBD | TBD | DISC-02 | — | Constant-sum decode recognizes `BBjMsgBox.X+BBjMsgBox.Y`, integer-literal sums, and mixed forms | unit | `vitest run test/msgbox-composer.test.ts` (extend) | ⚠️ existing file, new cases | ⬜ pending |
| 89-TBD | TBD | TBD | DISC-02 | — | Unrecognized expression (variable/method call) opens compose-and-replace mode, never a misdecoded pre-fill | unit | `vitest run test/msgbox-composer.test.ts` | ⚠️ existing file, new cases | ⬜ pending |
| 89-TBD | TBD | TBD | DISC-03 | — | CVS bit catalog (1..128, ascending application) encode/decode round-trips | unit | `vitest run test/cvs-composer.test.ts` | ❌ W0 | ⬜ pending |
| 89-TBD | TBD | TBD | DISC-03 | — | Edit-in-place recognizes literal-mask CVS() calls and preserves the string argument verbatim | unit | `vitest run test/cvs-composer.test.ts` | ❌ W0 | ⬜ pending |
| 89-TBD | TBD | TBD | DISC-03 | — | Composed `CVS(a$, mask, chars)` produces zero arity warnings once `functions.ts` and `functions.bbl` are widened | integration | `vitest run test/validation-function-calls.test.ts` (or equivalent, extend) | ⚠️ existing file, new case | ⬜ pending |
| 89-TBD | TBD | TBD | DISC-01/02/03 | — | New CVS / MSGBOX-decode DTOs round-trip the LSP4IJ JSON boundary; new `bbj/composer/cvs/*` methods pinned on the single server interface | unit (Java) | `./gradlew test --offline --tests 'com.basis.bbj.intellij.composer.ComposerModelsJsonBoundaryTest' --tests 'com.basis.bbj.intellij.composer.ComposerRequestContractTest'` | ⚠️ existing files, extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Task IDs are provisional — the planner assigns final plan/task numbering.*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/cvs-composer.test.ts` — DISC-03 catalog, encode/decode, edit-in-place recognition
- [ ] `bbj-vscode/test/composer-codelens.test.ts` — DISC-01 aggregation across all 5 composer kinds + no-full-walk structural check
- [ ] Extend `bbj-vscode/test/msgbox-composer.test.ts` — DISC-02 constant-sum decode + compose-and-replace fallback
- [ ] Extend the function-call validation test — CVS `chars` arity fix in `functions.ts` + `functions.bbl`
- [ ] IntelliJ CVS dialog source-guard test mirroring the existing per-dialog source-guard family
- [ ] Extend `ComposerModelsJsonBoundaryTest.java` and `ComposerRequestContractTest.java` — CVS DTOs / interface methods
- [ ] Java source-guard test confirming the Code Vision / CodeLens registration is wired (automatable half of the spike)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| IntelliJ Code Vision cue renders visibly and is clickable on composer lines | DISC-01 (Success Criterion 1) | No IntelliJ sandbox in the devcontainer; visible rendering cannot be asserted headlessly | Build + install the IntelliJ plugin zip, open a `.bbj` file with MSGBOX/addWindow/addChildWindow/CVS/SETOPTS lines, confirm a cue appears above each line without caret placement, click it, confirm the matching composer opens |
| VS Code CodeLens cue renders and opens the right composer | DISC-01 | Rendering in the editor UI | Build + install the VSIX, open the same file, confirm cues and click-through |
| CVS composer dialog/webview composes and edits in place in both IDEs | DISC-03 | End-to-end UI interaction | Compose a new CVS() call with `chars`, then edit an existing literal-mask call; confirm the string argument is untouched |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 120s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
