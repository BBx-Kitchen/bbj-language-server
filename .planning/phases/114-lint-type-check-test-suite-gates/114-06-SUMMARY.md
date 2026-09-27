---
phase: 114-lint-type-check-test-suite-gates
plan: "06"
subsystem: testing
tags: [eslint, typescript, no-explicit-any, no-unused-vars, lint-gate]

# Dependency graph
requires:
  - phase: 114-05
    provides: "eslint.config.js with the recommended preset plus D-01/D-02 overrides; the exact 32-finding src hand-fix list this plan closes"
provides:
  - "All 32 src lint findings left by 114-05 fixed by hand: 3 small fixes (CST-node-guard rewrite, one const merge, an underscore rename), 20 no-explicit-any replaced with real types/structural types/unknown-plus-narrowing, 9 unused names removed via optional catch bindings or underscore-prefixed/dropped parameters"
  - "npx eslint src --max-warnings 0 exits 0 with no output"
affects: [114-08, 114-13]

actuals:
  tokens: 5737
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Runtime-only interop property read as a local readSimpleName() helper (bbj-hover.ts, java-javadoc.ts): returns unknown where the caller only interpolates the value into a template literal, narrows to string | undefined via typeof where the caller assigns it to a string (java-javadoc.ts's qName, which is later .split('.')'d), in both cases keeping the exact `value ? value : node.name` fallback including an empty-string simpleName"
    - "Heterogeneous tuple-array element typed as the array's own union member type (LineBreakConfig<AstNode>[]) with a per-entry cast at construction for the four helper-built entries, instead of casting at every call site"

key-files:
  modified:
    - bbj-vscode/src/language/bbj-comment-provider.ts
    - bbj-vscode/src/language/bbj-ws-manager.ts
    - bbj-vscode/src/language/utils.ts
    - bbj-vscode/src/document-formatter.ts
    - bbj-vscode/src/extension.ts
    - bbj-vscode/src/language/bbj-document-symbol-provider.ts
    - bbj-vscode/src/language/bbj-hover.ts
    - bbj-vscode/src/language/bbj-module.ts
    - bbj-vscode/src/language/java-javadoc.ts
    - bbj-vscode/src/language/validations/line-break-validation.ts
    - bbj-vscode/src/language/bbj-completion-provider.ts
    - bbj-vscode/src/language/bbj-definition-provider.ts
    - bbj-vscode/src/language/bbj-document-builder.ts
    - bbj-vscode/src/language/bbj-linker.ts
    - bbj-vscode/src/language/java-interop.ts

key-decisions:
  - "line-break-validation.ts's lineBreakMap is typed LineBreakConfig<AstNode>[] (not a union of the nine concrete LineBreakConfig<X> members): a union-of-concrete-configs type made checkLineBreaks' generic dispatch loop uncompilable (calling a union of functions with unrelated parameter types collapses the call's parameter type to `never`); casting each of the four helper-built entries to the shared LineBreakConfig<AstNode> element type at construction, instead, type-checks cleanly and needed no change to checkLineBreaks itself"
  - "java-javadoc.ts's readSimpleName narrows to string | undefined (not unknown) because its result feeds `qName.split('.')`, which requires a string; bbj-hover.ts's readSimpleName stays unknown because its result only ever appears inside a template literal interpolation, where TypeScript imposes no such requirement"
  - "extension.ts's Commands.setOutputChannel cast uses a structural type naming only that one method (`{ setOutputChannel(channel: vscode.OutputChannel): void }`), matching the plan's <interfaces> guidance exactly, rather than a broader interface describing all of Commands.cjs's other methods (which are already correctly typed without a cast at their own call sites)"

requirements-completed: []
# TEST-01 is also declared by 114-05 (closed), 114-08 and 114-13 (both still open); requirements.ready-ids
# reported 0/1 ready, so it is intentionally NOT marked complete here per the shared-ID gate.
# The last of those plans' SUMMARY triggers the mark once all four declaring plans are done.

coverage:
  - id: D1
    description: "Three small, illustrative src fixes (bbj-comment-provider.ts's CST-node guard, bbj-ws-manager.ts's props const merge, utils.ts's assertType parameter rename) go from lint finding to clean file, with the build and the two files' own tests unchanged (tracer task)"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "npx vitest run test/comment-provider.test.ts test/ws-manager.test.ts (5/5 passed), re-run for the tracer feedback gate"
        status: pass
      - kind: other
        ref: "npx eslint src/language/bbj-comment-provider.ts src/language/bbj-ws-manager.ts src/language/utils.ts --max-warnings 0 exits 0; npm run build exits 0; grep -c '?.offset!' on bbj-comment-provider.ts prints 0; grep -c 'const props: KeyValuePairObject = getProperties(input)' on bbj-ws-manager.ts prints 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "All 20 no-explicit-any findings in src (document-formatter.ts, extension.ts, bbj-document-symbol-provider.ts, bbj-hover.ts, bbj-module.ts, java-javadoc.ts, line-break-validation.ts) replaced with real types, narrow structural types, or unknown plus narrowing, no eslint directive added, behaviour unchanged"
    requirement: TEST-01
    verification:
      - kind: unit
        ref: "npx vitest run test/hover.test.ts test/document-symbol.test.ts test/javadoc.test.ts test/line-break-validation.test.ts test/document-formatter.test.ts test/parser-ambiguity-logging.test.ts (150/150 passed)"
        status: pass
      - kind: other
        ref: "grep -cE 'as any|: any\\b|<any>' on each of the seven files prints 0; npm run build exits 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "The remaining 9 unused-name findings across extension.ts, bbj-completion-provider.ts, bbj-definition-provider.ts, bbj-document-builder.ts, bbj-linker.ts and java-interop.ts are gone (optional catch bindings or underscore/dropped parameters); npx eslint src --max-warnings 0 exits 0 with no output; the whole suite matches the D-07 invariants against baseline, with the residual FAILED_TEST gap fully investigated"
    requirement: TEST-01
    verification:
      - kind: other
        ref: "npx eslint src --max-warnings 0 exits 0 with no output; npm run build exits 0; git diff e8941d48 -- bbj-vscode/src | grep '^+[^+]' | grep -cE 'eslint-disable|as any|@ts-ignore|@ts-expect-error' prints 0; the same diff's planning-identifier grep prints 0; git diff --stat e8941d48 -- bbj-vscode/src lists only files named in plans 114-05/114-06"
        status: pass
      - kind: other
        ref: "Two whole-suite npm test runs (coverage/phase-114/114-06-run1.json, run2.json; digests committed as suite-114-06-run1.txt/run2.txt): interop5008=open and hookTimeoutSuites=0 match baseline in both; each run's FAILED_TEST set is the 11-test linking.test.ts baseline plus exactly one extra failure, rotating between two files (parser-keyword-statements.test.ts, installed-extension-e2e.test.ts) already diagnosed as pre-existing contention-timing flakiness in 114-02's and 114-05's SUMMARYs, under the same sustained external host CPU load (pipeline.knowledge_build, ~580% CPU) observed throughout this plan's execution"
        status: fail
    human_judgment: true
    rationale: "Neither run reproduces baseline/suite-before.txt's FAILED_TEST set byte-for-byte. Both extra-failure sources were independently re-confirmed here (not merely cited from prior plans): parser-keyword-statements.test.ts passes 332/332 standalone, and git diff --stat e8941d48 shows it carries only 114-02's mechanical createBBjServices -> createBBjTestServices harness migration (no assertion change) while installed-extension-e2e.test.ts is byte-identical to the phase base. Per the coordinator's standing instruction for this phase, a human should confirm this classification given the extra rigor requested on whole-suite comparisons."

duration: 18min
completed: 2026-09-27
status: complete
---

# Phase 114 Plan 06: Lint Gate — src Hand Fixes (Lint Plan B) Summary

**All 32 src lint findings 114-05 left behind are fixed by hand — 20 no-explicit-any replaced with real or narrowly-structural types, 9 unused names removed, and 3 small CST/const/parameter fixes — leaving `npx eslint src --max-warnings 0` at a clean exit with the build green and no behaviour change.**

## Performance

- **Duration:** 18 min
- **Started:** 2026-09-27T18:27:00Z (approx)
- **Completed:** 2026-09-27T18:45:00Z (approx)
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments
- `bbj-comment-provider.ts`'s CST-node comparison reads `comment.$cstNode` into a local and requires it defined before comparing offsets, removing both non-null-asserted optional-chain findings on that line without changing which comments are ever included; `bbj-ws-manager.ts`'s `parseSettings` merges `props`'s declaration and assignment into one `const`; `utils.ts`'s `assertType` renames its by-design-unused type-assertion parameter to `_x`.
- All 20 `no-explicit-any` findings in src are gone: `document-formatter.ts`'s rejection handler is `unknown` (the `instanceof` check already narrows it) and its spawned-process error reads `.code` through `NodeJS.ErrnoException`; `extension.ts` calls `Commands.setOutputChannel` through a one-method structural type; `bbj-document-symbol-provider.ts`'s two error-recovery name reads go through a `{ name?: unknown }` structural type; `bbj-hover.ts` and `java-javadoc.ts` each gained a small `readSimpleName` helper for the interop-only `simpleName` property (kept `unknown` in the hover file where the result only feeds a template literal, narrowed to `string | undefined` in the javadoc file where the result is `.split('.')`'d), preserving the exact `simpleName ? simpleName : node.name` fallback including an empty-string `simpleName`; `java-javadoc.ts`'s `isMethodDoc`/`isClassDoc` read their optional properties through structural types; `bbj-module.ts` describes the chevrotain parser internals with a `ChevrotainParserInternals` structural type; `line-break-validation.ts`'s `lineBreakMap` is typed `LineBreakConfig<AstNode>[]`.
- The remaining 9 unused-name findings are gone: four unused catch bindings became optional catch bindings (`extension.ts`, `bbj-document-builder.ts`, `bbj-linker.ts`, `java-interop.ts`) with their comments left in place; `bbj-definition-provider.ts`'s overridden `collectLocationLinks` and `bbj-document-builder.ts`'s exported `armDelayMs` renamed their unused parameter with a leading underscore (signature shape unchanged, no caller needs an edit); `bbj-completion-provider.ts`'s local default-parameter arrow and `java-interop.ts`'s local `parts.forEach` callback dropped their trailing unused parameter (no call site passes it, and JS silently ignores extra call arguments either way).
- `npx eslint src --max-warnings 0` now exits 0 with no output; `npm run build` (`tsc -b` + esbuild) stays green throughout.

## Task Commits

1. **Task 1: Three small src fixes go from finding to clean file, green build and unchanged tests** - `97e3858c` (fix)
2. **Task 2: The 20 no-explicit-any findings in src get real types or unknown plus narrowing** - `371977eb` (fix)
3. **Task 3: The unused names are gone, eslint src is at zero, and the whole suite matches the baseline** - `a7c8216f` (fix)

**Plan metadata:** (commit hash recorded after this SUMMARY is committed)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-comment-provider.ts` - CST-node existence guard replaces the non-null-asserted optional chain
- `bbj-vscode/src/language/bbj-ws-manager.ts` - `parseSettings`'s `props` is a single `const`
- `bbj-vscode/src/language/utils.ts` - `assertType`'s unused parameter renamed to `_x`
- `bbj-vscode/src/document-formatter.ts` - rejection handler typed `unknown`; spawn error read via `NodeJS.ErrnoException`
- `bbj-vscode/src/extension.ts` - `Commands.setOutputChannel` called through a one-method structural type; unused `catch (error)` is now `catch`
- `bbj-vscode/src/language/bbj-document-symbol-provider.ts` - two error-recovery name reads via `{ name?: unknown }`
- `bbj-vscode/src/language/bbj-hover.ts` - `readSimpleName` helper, four call sites
- `bbj-vscode/src/language/bbj-module.ts` - `ChevrotainParserInternals` structural type for the parser-wrapper cast
- `bbj-vscode/src/language/java-javadoc.ts` - `readSimpleName` helper (string-narrowed); `isMethodDoc`/`isClassDoc` structural-type reads
- `bbj-vscode/src/language/validations/line-break-validation.ts` - `lineBreakMap` typed `LineBreakConfig<AstNode>[]`, four helper-built entries cast to it
- `bbj-vscode/src/language/bbj-completion-provider.ts` - default-parameter arrow drops its unused index parameter
- `bbj-vscode/src/language/bbj-definition-provider.ts` - `collectLocationLinks`'s unused `params` renamed `_params`
- `bbj-vscode/src/language/bbj-document-builder.ts` - `armDelayMs`'s unused `reason` renamed `_reason`; unused `catch (e)` is now `catch`
- `bbj-vscode/src/language/bbj-linker.ts` - unused `catch (error)` is now `catch`
- `bbj-vscode/src/language/java-interop.ts` - `parts.forEach` drops its unused `index`; unused `catch (topLevelErr)` is now `catch`

## Decisions Made
- `line-break-validation.ts`'s `lineBreakMap` is typed `LineBreakConfig<AstNode>[]` rather than a union of the nine concrete `LineBreakConfig<X>` member types. The union approach was tried first and compiled the array declaration cleanly, but broke `checkLineBreaks`'s generic dispatch loop: calling a union of functions whose parameter types are unrelated interfaces (`FieldDecl`, `MethodDecl`, `BbjClass`, ...) collapses TypeScript's synthesized call-signature parameter type to `never`, so `config[1](node)` failed to type-check. Casting only the four helper-built entries (`ifStatementLineBreaks()` etc.) to the shared `LineBreakConfig<AstNode>` element type at construction — leaving each helper's own return type as its concrete `LineBreakConfig<X>` — fixed the build with no change needed to `checkLineBreaks` itself.
- `readSimpleName`'s return type differs by call site's need, not by copy-paste: `bbj-hover.ts` keeps it `unknown` because every use only interpolates the value into a template literal (which imposes no type requirement), while `java-javadoc.ts` narrows it to `string | undefined` via a `typeof` check because its one use (`qName`) is later passed to `.split('.')`, which requires an actual `string`.
- `extension.ts`'s `Commands.setOutputChannel` cast is a structural type naming only that one method, matching the plan's `<interfaces>` guidance — the rest of `Commands.cjs`'s API (`run`, `compile`, `openConfigFile`, ...) is already correctly typed at its own call sites and needed no change.

## Deviations from Plan

### Auto-fixed Issues

None — every task's edits were exactly the kind of fix the plan specified (type-only rewrites, structural types, catch-binding/parameter renames). No Rule 1/2/3 fixes were needed beyond the line-break-validation.ts typing approach described above, which stayed within the plan's own stated discretion ("give lineBreakMap a real element type with a type-only change ... or type the list as the union of the concrete configs").

### Investigated, Non-Regressive Environmental Flakiness (whole-suite verification)

Task 3's acceptance criteria and the plan-level `<verification>` both require the whole-suite `FAILED_TEST` lines to equal `baseline/suite-before.txt`. Two whole-suite `npm test` runs were captured after all three tasks landed (`coverage/phase-114/114-06-run1.json`, `-run2.json`; digests committed as `baseline/suite-114-06-run1.txt`, `-run2.txt`):

- **Run 1:** 12 failed tests — the 11-test `linking.test.ts` baseline, plus `test/parser-keyword-statements.test.ts :: RECORD verbs LEN= channel option a verifier option whose value is absent is still a parser error`. `test/functional/installed-extension-e2e.test.ts` failed as a suite (`FAILED_SUITE ... other`) with no additional counted test failure.
- **Run 2:** 13 failed tests — the same 11-test baseline, plus the same `parser-keyword-statements.test.ts` test again, plus `test/functional/installed-extension-e2e.test.ts :: every composer kind carries its cue setopts-in-code cue appears only on the absolute literal and the safe chain's SETOPTS line`.

**Classification, with evidence gathered this session (not merely cited from prior plans):**
1. Both extra-failure sources are the exact two files 114-02's and 114-05's SUMMARYs already diagnosed as pre-existing, contention-timing flakiness, unrelated to any 114-xx code change: `parser-keyword-statements.test.ts`'s specific test crossing vitest's default per-test timeout under host CPU contention, and `installed-extension-e2e.test.ts`'s real-spawned-language-server race (previously also documented in this project's own deferred-items log as "No document found" / partial-cue-list flakiness, pre-dating this phase).
2. `parser-keyword-statements.test.ts` run alone (`npx vitest run test/parser-keyword-statements.test.ts`) passed 332/332 in 8.4s with no flakiness, confirming the failure is a contention artifact, not a logic break.
3. `git diff --stat e8941d48 -- bbj-vscode/test/parser-keyword-statements.test.ts bbj-vscode/test/functional/installed-extension-e2e.test.ts` shows the former carries only 114-02's mechanical `createBBjServices` → `createBBjTestServices` harness-migration edit (import + construction call, no assertion or title change — confirmed by reading the diff in full), and the latter is byte-identical to the phase base commit. Neither file was touched by this plan (114-06) at all.
4. Throughout both runs, `ps aux` showed the same unrelated host process already documented in 114-02's and 114-05's investigations (`.venv/bin/python -m pipeline.knowledge_build`, PID 3046266) consuming ~580% CPU continuously, confirming the same sustained external contention source is still present in this session.
5. Both runs show `hookTimeoutSuites=0` and `interop5008=open`, matching baseline exactly — the actual invariants Phase 114's test-suite-gate work protects, and the ones this plan's own changes could plausibly have affected (they can't: this plan touches only `src/`, never `test/test-helper.ts`, `test/bbj-test-module.ts`, or any test file's harness wiring).

**Classification: not a regression.** Both extra failures are (a) confirmed untouched or byte-identical to the phase base for this plan specifically, and (b) shaped exactly like the timing-only contention artifacts already diagnosed twice before in this phase (114-02, 114-05) — a rotating single extra test/suite failure under sustained unrelated CPU load, not a functional difference introduced by any of this plan's type-only src edits. No fix was applied — neither file is in this task's scope, per the deviation-rules scope boundary (only auto-fix issues directly caused by the current task's changes).

---

**Total deviations:** 0 auto-fixed. 1 investigated-and-classified environmental finding (two pre-existing flaky sources, both independently re-confirmed in this session), reported per the coordinator's standing instruction for this phase.
**Impact on plan:** Task 3's own deliverable (`eslint src --max-warnings 0` exits 0, no suppression directives added, build green) is fully verified. The residual whole-suite gap against a byte-identical baseline match is attributable entirely to pre-existing, unrelated flakiness under sustained external host contention, consistent with 114-02's and 114-05's precedent and this project's standing decision that the regression gate is `numFailedTests`-based plus deterministic targeted-file runs, not a failing-suite identity delta.

## Issues Encountered

None beyond the whole-suite flakiness documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `eslint src --max-warnings 0` is now a clean, zero-finding gate; `114-08` (test hand fixes) can proceed independently against its own 19-finding remainder, and `114-13` lands the CI gate once both land.
- TEST-01 is also declared by `114-05` (closed), `114-08` and `114-13` (both still open); per the shared-ID gate (`requirements.ready-ids` reported 0/1 ready), it is intentionally left un-marked in REQUIREMENTS.md here.
- Recommend a human review the "Investigated, Non-Regressive Environmental Flakiness" section above, and, time permitting, re-run the whole-suite verification once the host's external CPU contention has cleared, to obtain a byte-identical match against `baseline/suite-before.txt` for the record.

## Self-Check: PASSED

All 15 modified files verified present on disk with their described edits. All three task commits (`97e3858c`, `371977eb`, `a7c8216f`) verified present in `git log`. Plan-level `<verification>` re-confirmed: `npx eslint src --max-warnings 0` exits 0 with no output; `npm run build` exits 0; whole-suite `hookTimeoutSuites=0` and `interop5008=open` match baseline in both runs, with the `FAILED_TEST` gap fully investigated and classified above.

---
*Phase: 114-lint-type-check-test-suite-gates*
*Completed: 2026-09-27*
