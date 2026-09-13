---
phase: "92"
slug: "host-side-hygiene-focus-guards"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-13"
---

# Phase 92 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 (bbj-vscode); JUnit Jupiter 5.10.2 via `junit-bom` (bbj-intellij) |
| **Config file** | `bbj-vscode/package.json` scripts (no separate vitest config); `bbj-intellij/build.gradle.kts` |
| **Quick run command** | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/<file>.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` · `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --tests '<FQCN>'` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run` (gate: `numFailedTests: 0`) · `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` |
| **Estimated runtime** | ~5-20 s per targeted file; whole suites several minutes |

---

## Sampling Rate

- **After every task commit:** Run the touched file's quick run command
- **After every plan wave:** Run both full suite commands (vitest gate is `numFailedTests: 0`; "failed suites" with zero failed tests are `beforeAll` hook-timeout contention — use `--maxWorkers=2`)
- **Before `/gsd-verify-work`:** Full suites green, plus `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run lint` and `run build`
- **Max feedback latency:** ~60 seconds (targeted runs)

---

## Per-Task Verification Map

Task IDs are assigned by the planner; rows below are seeded per requirement from 92-RESEARCH.md §Validation Architecture.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 92-04-T1 | 92-04 | 2 | RESP-05 | T-92-09 | A fresh listing with an earlier-looking mtime resolves promptly; `decompileInPlace` clears the leftover before bbjlst (source guard in the same file) | unit + source-scan | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/decompile-io.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ✅ | ⬜ pending |
| 92-04-T2 | 92-04 | 2 | RESP-05 | T-92-10, T-92-11 | Stale listing removed before the wait (reworked P62-D2-011); undeletable leftover fails closed; a `.lst` input is never deleted | unit | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/decompile-io.test.ts test/no-shell-command-construction.test.ts test/target-resolution.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ✅ | ⬜ pending |
| 92-02-T1, 92-02-T2 | 92-02 | 1 | RESP-06 | T-92-05, T-92-06 | Overlapping format requests with different content never share output; identical content shares the newest run; no entry leaks | unit | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/document-formatter.test.ts test/no-shell-command-construction.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ✅ (extend P62-D3-001 block) | ⬜ pending |
| 92-01-T1, 92-01-T2 | 92-01 | 1 | RESP-07 | T-92-01, T-92-02, T-92-03 | No command acts on an undefined or non-BBj target; one shared warning; web runs warn before any credential prompt | unit (new pure module) + source-scan | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/target-resolution.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ❌ W0 (created in 92-01-T1) | ⬜ pending |
| 92-05-T1, 92-05-T2 | 92-05 | 2 | RESP-08 | T-92-12, T-92-13, T-92-14 | Second `activate()` after disposal does not throw; every returned Disposable is in `context.subscriptions` | unit | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode exec -- vitest run test/extension-activation.test.ts --root /home/coder/repos/bbj-language-server/bbj-vscode` | ✅ (extend) | ⬜ pending |
| 92-03-T1 | 92-03 | 1 | RESP-09 | T-92-08 | Visibility by file type name: BBj shows; BBx Config, `.bbl` and non-BBj hide | unit | `/home/coder/repos/bbj-language-server/bbj-intellij/gradlew -p /home/coder/repos/bbj-language-server/bbj-intellij test --tests 'com.basis.bbj.intellij.ui.BbjFileVisibilityTest' --offline --console=plain -q` | ❌ W0 (created in 92-03-T1) | ⬜ pending |
| 92-03-T2 | 92-03 | 1 | RESP-09 | T-92-07 | Both widgets subscribe `FILE_EDITOR_MANAGER` once on `messageBusConnection` and delegate to the shared decision | unit (source-guard) | `/home/coder/repos/bbj-language-server/bbj-intellij/gradlew -p /home/coder/repos/bbj-language-server/bbj-intellij test --tests 'com.basis.bbj.intellij.ui.BbjStatusBarWidgetSourceGuardTest' --offline --console=plain -q` | ❌ W0 (created in 92-03-T2) | ⬜ pending |
| 92-06-T1, 92-06-T2 | 92-06 | 3 | RESP-05..09 | T-92-15, T-92-16 | Both rebuilt distributables carry the phase's code; whole suite, lint and register gates green | build + suite | `RUN_BBJ_TESTS=0 npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode test -- --maxWorkers=2` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/src/Commands/target-resolution.ts` (or equivalent) — vscode-free target resolution / language check / warning text (RESP-07)
- [ ] `bbj-vscode/test/target-resolution.test.ts` — its unit tests (RESP-07)
- [ ] `bbj-vscode/src/decompile-io.ts` — exported delete-leftover-lst helper (RESP-05)
- [ ] Source-guard assertions that `Commands.cjs` calls the extracted helpers (RESP-05, RESP-07) — `Commands.cjs` cannot load under vitest
- [ ] `bbj-intellij/src/main/java/com/basis/bbj/intellij/ui/BbjFileVisibility.java` (or equivalent) — static file-type predicate (RESP-09)
- [ ] `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjFileVisibilityTest.java` (RESP-09)
- [ ] `bbj-intellij/src/test/java/com/basis/bbj/intellij/ui/BbjStatusBarWidgetSourceGuardTest.java` (RESP-09)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Widgets follow a bare tab switch in a live IDE | RESP-09 | Platform `FILE_EDITOR_MANAGER` delivery and status-bar repaint need a running IntelliJ | With the server started and no status change: BBj tab → non-BBj tab → `config.bbx` → BBj tab; widgets show/hide/hide/show immediately (plugin rebuilt from the final tree) |

*All other phase behaviors have automated verification; the automated seam test and source guard for RESP-09 remain required alongside this step.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
