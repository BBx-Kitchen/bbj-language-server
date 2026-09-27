# Phase 114: Lint, Type-Check & Test-Suite Gates - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-27
**Phase:** 114-lint-type-check-test-suite-gates
**Areas discussed:** Lint fixes, Test type errors, Hook timeouts, CI gate placement

Scout measurements shown to the user: 221 lint errors (recommended preset) by rule/tree; 386 test type errors once tsconfig.test.json is made runnable (it currently fails TS6306/TS6310).

---

## Lint fixes

| Question | Options | Selected |
|----------|---------|----------|
| no-explicit-any (112) | Fix in src, off in test/ · Fix everywhere · Warn in test/ | Fix in src, off in test/ |
| Other rules | Fix + targeted config · Rewrite chai assertions | Fix + targeted config |
| eslint-disable | Only with a reason · None at all | Only with a reason |
| --max-warnings 0 | Yes · Errors only | Yes |

## Test type errors

| Question | Options | Selected |
|----------|---------|----------|
| Strategy | Fix all, test-only relaxations · Fix all strict · @ts-expect-error baseline | Fix all, test-only relaxations |
| Project | test/ + imported src, noEmit, `typecheck:test` · combined `typecheck` | test/ + imported src |
| Safety | numFailedTests + names identical vs base · You decide | Identical vs base |

## Hook timeouts / discovery

| Question | Options | Selected |
|----------|---------|----------|
| Approach | Measure + remove cost · Raise hookTimeout · Both | Measure + remove cost |
| Proof | 3 clean whole-suite runs · 1 run | 3 runs |
| Where | Harness preferred, src if neutral · Harness only | Harness preferred |
| Include patterns | You decide + same file set · plus guard test | You decide + same file set |

## CI gate placement

| Question | Options | Selected |
|----------|---------|----------|
| Workflow | build.yml steps · build.yml parallel job · pr-validation.yml | build.yml steps |
| Step order | Keep `success() \|\| failure()` · Stop at first failure | Keep |
| Plan split | Config → src → test, CI gate last · You decide | Config → src → test |

---

## Todos

Folded: `2026-09-20-phase-97-code-review-follow-ups` (= FIX-04). Three keyword-only matches not folded.

## Claude's Discretion

- vitest include/exclude patterns; exact test-only compiler relaxations; how the disable-reason rule is enforced.

## Deferred Ideas

- Type-checked ESLint preset (out of scope per roadmap).
