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

Per plan (every task's `<automated>` blocks are in the PLAN.md files; each plan's last auto task runs the whole suite against `suite-base-failed.txt`, lint, typecheck:test, build and the multiset hygiene check):

| Plan / task | Requirement | Automated evidence | New test file |
|-------------|-------------|--------------------|---------------|
| 121-01 T1 | REF-09 | base evidence present; DI wiring greps; 23 load-bearing suites; typecheck:test | — |
| 121-01 T2 | REF-09 | test wiring greps; double class bodies vs base; expect/test-name lines vs base; load-bearing suites; whole suite | — |
| 121-02 T1 | REF-09 | #624 regression test red then green (commit order check); singleton-gone greps; javadoc/hover/ws-manager suites | javadoc.test.ts block |
| 121-02 T2 | REF-09 | doubles and assertions vs base; whole suite; 18-file REF-09 set; ref09-end recorded | — |
| 121-03 T1-T2 | REF-12 | lock greps; exports check; lock unit test + 8 interop suites; scope; whole suite | java-interop-lock.test.ts |
| 121-04 T1-T3 | REF-12 | connection greps and hook counts; resetBreaker and clearCache order; exports; unit test; whole suite | java-interop-connection.test.ts |
| 121-05 T1-T2 | REF-12 | lane greps and hook counts; disconnect and clearCache order; parse-lane and parser-service suites; whole suite | (extends connection test) |
| 121-06 T1-T2 | REF-12 | class-index greps; ensureCompleteClassIndex kept on both lookups; unit test; code-action/completion suites; whole suite | java-interop-class-index.test.ts |
| 121-07 T1-T2 | REF-12 | classpath greps; bulk-path guard order; clearCache order; unit test; ws-manager/refresh suites; whole suite | java-interop-classpath.test.ts |
| 121-08 T1-T2 | REF-12 | cache greps; pipeline byte-identical to plan start; reset and clearCache order; unit test + 23 load-bearing suites; whole suite | java-interop-cache.test.ts |
| 121-09 T1-T2 | REF-12 | hook-routing counts (5 resolveClassByName, 1 getRawClass, 2 resolveClass, 0 self calls); peer-data guard order; lock-before-cache field order; unit test + load-bearing suites; whole suite | (extends cache test) |
| 121-10 T1 | REF-09, REF-12 | phase file set; API surface and protected hooks; import graph; exports; assertions and doubles vs base; each module test alone; whole suite; distributables fresh | — |
| 121-10 T2 | REF-12 | manual: live hand check in VS Code and IntelliJ (blocking checkpoint) | — |

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
