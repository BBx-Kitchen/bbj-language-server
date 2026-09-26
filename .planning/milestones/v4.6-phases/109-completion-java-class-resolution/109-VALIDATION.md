---
phase: "109"
slug: "completion-java-class-resolution"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: validated
nyquist_compliant: true
wave_0_complete: true
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
| COMP-01 | `java.lang.String.` / `java.lang.Class.` (no USE) offer statics only, same list as after USE | unit | `npx vitest run test/completion-class-reference.test.ts test/unknown-java-member.test.ts` | ✅ | ✅ green |
| COMP-02 | overloaded BBj and Java calls infer the matching overload's return type; undecided overload gives no type | unit | `npx vitest run test/overload-return-type.test.ts` | ✅ | ✅ green |
| COMP-03 | method-body positions offer the program-scope candidates minus program variables; `_f$`/`_t$` un-skipped; program variables stay out of METHOD scope | unit + measurement record | `npx vitest run test/completion-method-body.test.ts test/method-body-scope.test.ts test/completion-test.test.ts` | ✅ | ✅ green |
| JINT-01 | no backend request for primitive/void/array/blank names; same zero-member result | unit (counting fake) + real interop | `npx vitest run test/java-interop-local-types.test.ts`; `RUN_BBJ_TESTS=1 npx vitest run test/functional/java-class-lookups-real-interop.test.ts` | ✅ | ✅ green |
| JINT-02 | `Outer.Inner` / `Outer$Inner` fetched once, one object | unit (counting fake) + real interop | `npx vitest run test/java-interop-nested-class-names.test.ts`; real-interop file as above | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Counting Java-interop test double that overrides only `getRawClass` (the standard `JavaInteropTestService` overrides `resolveClassByName` and bypasses the code under test)
- [x] `MethodDecl` overload pair with differing return types (COMP-02, BBj side)
- [x] `JavaMethod` overload pair with differing return types on the fake classpath (COMP-02, Java side)
- [x] COMP-03 measurement record committed in the phase directory before any fix

---

## Manual-Only Verifications

None. The cold-start check planned as manual (JINT-01, JINT-02) is automated by `test/functional/java-class-lookups-real-interop.test.ts` (109-06), gated on `RUN_BBJ_TESTS=1` and a backend on :5008.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-09-26

---

## Validation Audit 2026-09-26

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Run on the final tree: 9 phase test files, 188 passed, 11 skipped (the env-gated `MEASURE_COMPLETION_OUT` recorder in `completion-method-body.test.ts`, which makes no assertions); the real-interop file passed 3/3 with `RUN_BBJ_TESTS=1` against :5008.
