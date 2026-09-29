---
phase: "121"
slug: "java-interop-service-decomposition"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-29"
---

# Phase 121 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <targeted files>` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2 --reporter=json --outputFile=/home/coder/repos/tmp/phase-121/<name>.json` (judged on `numFailedTests: 0`; never `--reporter=basic`) |
| **Estimated runtime** | ~240 seconds (whole suite), ~20 seconds (targeted) |

---

## Sampling Rate

- **After every task commit:** Run the targeted vitest files that pin the collaborator just extracted (see RESEARCH.md extraction-order table)
- **After every plan wave:** Run the full suite plus `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run lint` and `run typecheck:test`
- **Before `/gsd-verify-work`:** Full suite must be green, `run build` green
- **Max feedback latency:** 240 seconds

---

## Per-Task Verification Map

Filled in by the planner or executor from the PLAN.md `<automated>` commands. Requirement anchors:

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| REF-09 | JavadocProvider DI-registered; getInstance() gone; two independent providers share no state | unit | `npx vitest run test/javadoc.test.ts test/inlay-hints-javadoc.test.ts test/javadoc-markdown-escape.test.ts` | ✅ (new test added) | ⬜ pending |
| REF-12 | Each collaborator importable and testable on its own | unit | `npx vitest run test/java-interop-{lock,class-index,cache,classpath,connection}.test.ts` (final names per plan) | ❌ W0 | ⬜ pending |
| REF-12 | Existing interop suites pass without assertion changes | unit+integration | `npx vitest run test/java-interop-service.test.ts test/java-interop-socket.test.ts test/java-interop-timeouts.test.ts test/java-interop-parse-lane.test.ts test/java-interop-breaker.test.ts test/java-interop-peer-guard.test.ts test/java-interop-local-types.test.ts test/java-interop-nested-class-names.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Five new collaborator unit test files, one per extracted module
- [ ] New #624 regression test in `test/javadoc.test.ts`
- [ ] Base-comparison artifacts under `/home/coder/repos/tmp/phase-121/` (base SHA, whole-suite JSON + failed names, targeted run) captured before the first code change

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hover, completion, missing-USE quick fix, Refresh Java Classes behave as before | REF-12 | No CI harness drives VS Code / IntelliJ UI against a live bbj-ls peer | Build VSIX and IntelliJ zip from the final tree (after code-review fixes); against live BBjServices, warm up large classes, then exercise each feature in both IDEs |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 240s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
