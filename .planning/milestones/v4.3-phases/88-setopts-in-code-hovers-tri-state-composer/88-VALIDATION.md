---
phase: "88"
slug: "setopts-in-code-hovers-tri-state-composer"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-09-07"
---

# Phase 88 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (bbj-vscode)** | Vitest ^4.1.10 (existing pin) |
| **Framework (bbj-intellij)** | JUnit 5 via Gradle `test` task (existing pin) |
| **Config file** | `bbj-vscode/vitest.config.ts` (existing, unmodified); `bbj-intellij/build.gradle.kts` `test {}` block (existing) |
| **Quick run command (TS)** | `npx vitest run test/setopts-code-scanner.test.ts test/hover.test.ts` |
| **Quick run command (Java)** | `cd bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.composer.*"` |
| **Full suite command** | `npm test` (bbj-vscode); `cd bbj-intellij && ./gradlew test` (bbj-intellij) |
| **Estimated runtime** | ~120 seconds (Gradle full suite dominates) |

---

## Sampling Rate

- **After every task commit:** Run the targeted `npx vitest run <file>` / `./gradlew test --tests "<class>"` for the file(s) touched
- **After every plan wave:** Run `npm test` (bbj-vscode); `./gradlew test` (bbj-intellij, if IntelliJ dialog/DTO work lands in that wave)
- **Before `/gsd-verify-work`:** Full suite must be green on both sides
- **Max feedback latency:** 120 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 88-01-01 | 01 | 1 | DISC-05 | V5 | Hover on an absolute `SETOPTS <hex>` statement decodes correctly | unit | `npx vitest run test/hover.test.ts` (extend) | ❌ W0 — new test cases | ⬜ pending |
| 88-01-02 | 01 | 1 | DISC-05 | V5 | Hover on `SETOPTS var$` where `var$` traces a safe `OPTS→IOR→IOR` chain decodes the accumulated vector | unit | `npx vitest run test/setopts-code-scanner.test.ts` | ❌ W0 — new file | ⬜ pending |
| 88-01-03 | 01 | 1 | DISC-05 | — | Hover on a single `IOR(...)`/`AND(...)` call shows the AND-mask-as-cleared-bits phrasing | unit | `npx vitest run test/setopts-code-scanner.test.ts` | ❌ W0 | ⬜ pending |
| 88-02-01 | 02 | 1-2 | DISC-06 | T-88-01 | A branch/loop/alias/intervening statement in the chain reports "unsafe" (hover-only, never an edit action) | unit | `npx vitest run test/setopts-code-scanner.test.ts` (negative cases) | ❌ W0 | ⬜ pending |
| 88-02-02 | 02 | 2 | DISC-06 | T-88-02 | Compose-new tri-state form generates a canonical block that preserves unknown/reserved bits and round-trips through the scanner as "safe" | unit + JUnit contract | `npx vitest run test/composer-commands.test.ts` (extend) + `ComposerRequestContractTest`/`ComposerModelsJsonBoundaryTest` (extend) | ⚠️ existing files to extend | ⬜ pending |
| 88-02-03 | 02 | 2 | Success Criterion 4 (perf) | — | No unbounded full-document walk per hover or keystroke (research Pitfall 11) | unit (timing) | new synthetic-large-file test, mirroring #505's convention | ❌ W0 | ⬜ pending |
| 88-03-01 | 03 | 2 | DISC-06 | — | IntelliJ `IntentionAction` trigger (D-03) opens the tri-state dialog on a recognized safe shape; absent (not disabled) on an unsafe shape | unit/source guard | `cd bbj-intellij && ./gradlew test --tests "*.composer.*" --tests "*.actions.*"` | ❌ W0 | ⬜ pending |

*Task IDs above are provisional — the planner assigned final plan/task numbering; the audit
below cross-references the actual delivered map against the phase's requirements.*

---

## Validation Audit 2026-09-11

The original per-task map above (drafted 2026-09-07, before planning finalized plan/task
numbering) was never updated after execution — this audit reconciles it against what the
completed phase (13 plans: 88-01 through 88-13, including the 88-07..88-13 gap-closure round)
actually delivered.

| Requirement | Behavior | Automated Command | Status |
|---|---|---|---|
| DISC-05 | Hover decode — absolute literal, safe `OPTS→IOR/AND` chain, single `IOR`/`AND` call | `npx vitest run test/hover.test.ts test/setopts-code-scanner.test.ts` | ✅ COVERED (88-01, 88-02, 88-07, 88-11) |
| DISC-05 | Decoder narrowed to the grammar's actual hex-literal shape (no false-positive quoted-string decode) | `npx vitest run test/setopts-code-scanner.test.ts` | ✅ COVERED (88-11) |
| DISC-05 | Installed-bundle e2e proof (real `--node-ipc` LSP process, real installed VSIX) | `npx vitest run test/functional/installed-extension-e2e.test.ts` | ✅ COVERED (88-08, 88-09, 88-12, 88-13) |
| DISC-06 | Tri-state composer request/response contract (TS + Java) | `npx vitest run test/setopts-in-code-request.test.ts`; `./gradlew test --tests "*.composer.ComposerRequestContractTest" --tests "*.composer.ComposerModelsJsonBoundaryTest"` | ✅ COVERED (88-03, 88-04) |
| DISC-06 | Canonical hex-literal spelling shared by composer + IntelliJ writers | `npx vitest run test/setopts-catalog.test.ts test/setopts-in-code-ui.test.ts`; `./gradlew test --tests "*.composer.BbjHexLiteralTest"` | ✅ COVERED (88-10) |
| DISC-06 | VS Code Code Action entry point + IntelliJ intention/action entry points, source-guarded apart from config.bbx's own SETOPTS UI | `npx vitest run test/bbj-code-action-handler.test.ts test/setopts-in-code-ui.test.ts`; `./gradlew test --tests "*.composer.SetoptsInCodeSourceGuardTest" --tests "*.actions.SetoptsInCodeActionAvailabilityTest" --tests "*.actions.BbjComposeSetoptsInCodeActionSourceGuardTest"` | ✅ COVERED (88-05, 88-06, 88-12) |
| DISC-06 (perf) | Bounded Code Action handler — no unbounded diagnostics wait (G-88-2's server-side root cause) | `npx vitest run test/bbj-code-action-handler.test.ts` | ✅ COVERED (88-12; cold-ordering probe measured 7ms vs. pre-fix 56016ms) |

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | — |
| Escalated | 2 (pre-existing, unchanged by this audit — see Manual-Only) |

Every requirement traces to a green automated test; no MISSING or PARTIAL entries. The two
Manual-Only rows below (unchanged from the original draft) remain the only non-automatable
surface — both are staged as scripted human checks in `88-LIVE-RETEST.md` per 88-13's own
output, not new gaps this audit introduces.

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/setopts-code-scanner.test.ts` — new file covering DISC-05 (all three
  hover shapes) and DISC-06's safe-vs-unsafe traversal boundary (branch, loop, alias,
  unrelated intervening statement, comma-chained assignment) — the traceability algorithm is
  research's core, MEDIUM-confidence recommendation and needs the widest test coverage of any
  new code in this phase.
- [ ] Extend `bbj-vscode/test/hover.test.ts` — end-to-end hover-content assertions using
  `parseHelper` (never `DocumentBuilder.build`, per project memory — see
  `[[test-parsehelper-not-documentbuilder]]`), matching the existing `positionOf` helper
  pattern already in that file.
- [ ] Extend `bbj-intellij/src/test/.../composer/ComposerRequestContractTest.java` and
  `ComposerModelsJsonBoundaryTest.java` for the new in-code decode/compose request family
  (Pitfall 13's established extension pattern from Phase 87).
- [ ] Confirm `examples/issue208-and-is-also-a-function.bbj`-equivalent coverage exists in this
  phase's own scanner tests — the `AND`-as-keyword-vs-function ambiguity is load-bearing for
  hover shape (c) detection and is already solved elsewhere in the codebase
  (`bbj-token-builder.ts`), but this phase's new detection code must reuse that resolution,
  not re-derive it.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| IntelliJ tri-state composer dialog end-to-end (open via lightbulb, live debounced preview, apply/compose-new, no LS restart) | DISC-06 | This repo has no headless-Swing or live-LSP4IJ test harness (same structural gap as every prior IntelliJ composer phase, e.g. Phase 86 D-18, Phase 87) | Open a `.bbj` file with a canonical `var$=OPTS(...)`...`SETOPTS var$` block; invoke the lightbulb; toggle tri-state options; confirm live preview and apply; confirm the action is absent on an unsafe shape; watch for any LS restart |
| Hover decode content in both IDEs (VS Code + IntelliJ via LSP4IJ) | DISC-05 | Visual/rendering confirmation of hover markdown content in each IDE's native hover popup is not exercisable from an automated test | Hover over an absolute `SETOPTS` literal, a canonical `OPTS`-chain variable, and a single `IOR`/`AND` call in both IDEs; confirm the AND-mask-as-cleared-bits phrasing renders correctly |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (none found)
- [x] No watch-mode flags
- [x] Feedback latency < 120s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-09-11
