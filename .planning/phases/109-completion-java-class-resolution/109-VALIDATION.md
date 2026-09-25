---
phase: "109"
slug: "completion-java-class-resolution"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-25"
---

# Phase 109 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/<file>.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm test` |
| **Estimated runtime** | ~5 s per file; full suite several minutes (use `--maxWorkers=2` under contention) |

---

## Sampling Rate

- **After every task commit:** run the touched test file(s) with the quick command
- **After every plan wave:** full suite; judge on `numFailedTests`, local baseline is linking(11) + issue447(1); compare failing test names against the phase base commit
- **Before `/gsd-verify-work`:** full suite at baseline; if `bbj.langium` changed, private corpus harness too (no file newly enters A or A2)
- **Max feedback latency:** ~30 s per task

---

## Per-Task Verification Map

Filled in by the planner and executors. Expected coverage by requirement (from 109-RESEARCH.md § Validation Architecture):

| Requirement | Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|-----------|-------------------|-------------|--------|
| COMP-01 | `java.lang.String.` (no USE) offers statics only, same list as `String.` after USE | unit | `npx vitest run test/completion-test.test.ts` | ✅ file, ❌ W0 test | ⬜ pending |
| COMP-02 | overloaded BBj and Java calls infer the matching overload's return type; ambiguous tie with differing return types gives no type | unit | `npx vitest run test/method-return-java-type.test.ts` (or new overload-return-type test) | ❌ W0 fixtures | ⬜ pending |
| COMP-03 | measured positions inside class method bodies offer candidates; skipped `_f$`/`_t$` test un-skipped or kept with reason | unit + measurement record | `npx vitest run test/completion-test.test.ts` | ✅ (skipped) | ⬜ pending |
| JINT-01 | no backend request for primitive/void/array names; same zero-member result as before | unit (counting fake) | `npx vitest run test/<counting-interop>.test.ts` | ❌ W0 double | ⬜ pending |
| JINT-02 | `Outer.Inner` / `Outer$Inner` fetched once, same members, displayed as `Outer.Inner` | unit (counting fake) | same file | ❌ W0 double | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Counting Java-interop test double that overrides only `getRawClass` (the standard `JavaInteropTestService` overrides `resolveClassByName` and bypasses the code under test)
- [ ] `MethodDecl` overload pair with differing return types (COMP-02, BBj side)
- [ ] `JavaMethod` overload pair with differing return types on the fake classpath (COMP-02, Java side)
- [ ] COMP-03 measurement record committed in the phase directory before any fix

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Cold start with `bbj.debug` shows no `Resolving class` line for primitives/void/arrays and no `Outer.Inner`/`Outer$Inner` pair | JINT-01, JINT-02 | needs a real backend on :5008 and a real workspace | start the LS against :5008 with `bbj.debug` on, grep the output channel; unit tests with the counting fake are the automated proxy |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
