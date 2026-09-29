# Phase 115: Honest Interop Test Harness - Context

**Gathered:** 2026-09-28
**Status:** Ready for planning

<domain>
## Phase Boundary

The Java interop test harness (`bbj-vscode/tools/interop-test-harness/run-tests.ts`, 1,058 lines)
reports what really happened. Each case's status comes from its assertions, the pass/fail gate
checks exactly the declared critical fields, and the HTML report colours JSON correctly. The
harness runs from a pinned `tsx` devDependency, and it is type-checked, linted and tested in CI
without a live :5008.

Requirements: HARN-01..06, DEP-03. Closes #514, #575, #596, #599, #601, #635, #520.
Out of scope: the separate `bbj-ls` Java backend, the language server's own interop client
(`java-interop.ts`, Phase 116/121), and the two `.mjs` checkers under `tools/`.

</domain>

<decisions>
## Implementation Decisions

### Case outcomes (HARN-01)
- **D-01:** No case contains a literal-`true` assertion and no case hard-codes `status: 'pass'`.
  Cases 9 (primitive `int`), 13 (`java.util`) and 14 (`com.basis.startup.type`) keep their
  documented "either A or B" outcomes, each written as **one real disjunction assertion that can
  fail**. Example: `error field present OR name === 'int'`. Another: `Array.isArray(result)`,
  with contents checked when the array is non-empty. This works against both bbj-ls and the old
  java-interop.
- **D-02:** Case 10 (`com.nonexistent.Fake`) passes **only if the peer signals an error**: an
  `error` field in the response or a rejected RPC. A class object without an error fails,
  because the LS relies on that signal to flag unresolved classes.
- **D-03:** Case 17 (`loadClasspath` with a nonexistent `file:` jar) passes if the peer returns a
  boolean **or rejects cleanly with a JSON-RPC `ResponseError`**. The status comes from an
  assertion. A timeout or dropped connection is not a pass.
- **D-04:** Keep the three statuses. `error` means the request produced no response (it rejected
  or timed out). `fail` means a response arrived but an assertion or field check failed. The
  shared scaffold owns this derivation. Case 17's accepted rejection is the one explicit opt-in
  exception, and it goes through the scaffold, not a hand-built result.

### Gate and critical fields (HARN-04, HARN-05)
- **D-05:** One exported `CRITICAL_FIELDS` constant holds **all 8** fields the report declares
  today: `isStatic`, `isDeprecated`, `constructors`, `name`, `returnType`, `type`, `parameters`,
  `packageName`. The gate and the report both read it. Matching uses the field check's **final
  path segment (exact)**, not `String.includes()`. Today `includes('type')` also matches
  `returnType`, and `includes('name')` matches `packageName`.
- **D-06:** A critical field passes the gate only if it is **present and the right type**
  (`present && typeMatch`).
- **D-07:** Exit codes: **1 if any case is `fail` or `error`** (or a critical field check fails),
  2 for a connection failure or fatal error, and 0 otherwise. Console, report and exit code then
  agree. Today an `error` case leaves the exit code at 0.
- **D-08:** The header comment names `CRITICAL_FIELDS` and lists the fields. It also documents
  every accepted flag, including `--timeout` and its default. **No source-text guard test** for
  the comment (the same stance Phase 114 took against text guards).

### Scaffold and report (HARN-03, HARN-06)
- **D-09:** Generalise `runGetClassInfo` over the request type, so all 17 cases (including
  12-17, which duplicate it today) go through one request scaffold. That scaffold does the
  timing, the try/catch, the status derivation and the result shape. Per the roadmap, this is
  the first step, because the duplicated scaffold is how #514 happened.
- **D-10:** Fix the JSON highlighter so keys and string values get `json-key`/`json-string`
  spans, including values with escaped quotes (#596).
- **D-11:** Split `defineTests` and `generateReport` into smaller functions.

### Layout and tooling (HARN-02, DEP-03)
- **D-12:** The harness splits into **side-effect-free library modules** (scaffold, cases, gate,
  report builder, and a `.ts` module that exports the CSS/page-template strings) plus a **thin
  `run-tests.ts` CLI** (`parseArgs` + `main()`). Importing the library must not parse argv,
  connect or exit. The template stays type-checked, with no runtime file lookup.
- **D-13:** Lint scope becomes `eslint src test tools/interop-test-harness`, and the harness is
  held to the **src rule set**. `no-explicit-any` stays on, so the peer responses get real DTO
  types, or `unknown` plus narrowing. The two `tools/*.mjs` checkers stay out of scope.
- **D-14:** The harness is type-checked as part of the `typecheck:test` program (add it to that
  program's include). Whether it gets stricter options than the test tree's
  `noImplicitAny: false` is Claude's discretion, but it must not be looser than the src rules
  D-13 sets.
- **D-15:** `tsx` goes in devDependencies at an **exact version** (no range) and is recorded in
  the lockfile. `npm ls tsx` lists it as a direct dependency.
- **D-16:** The entry point is **an npm script only**, e.g.
  `npm run interop-harness -- --host … --port …`, running the local `tsx`. No `npx` appears in the
  shebang, the usage block or any docs. Drop the shebang, or make it `#!/usr/bin/env tsx` if one
  is kept.

### Harness tests in CI (HARN-02)
- **D-17:** The tests use an **in-process fake JSON-RPC server** (a `net` server with
  vscode-jsonrpc and stubbed handlers for the four methods). It drives all 17 cases through the
  real scaffold and gate. **Pure-function unit tests** cover the highlighter, the status
  derivation and the gate as well.
- **D-18:** The tests live in `test/` (e.g. `test/interop-harness.test.ts`), so `npm test`,
  `npm run lint` and `typecheck:test` pick them up and build.yml's existing steps gate them.
  **No new CI step and no new workflow.** They must not need :5008 and must pass with
  `RUN_BBJ_TESTS` unset.
- **D-19:** The fixtures are **hand-written minimal typed objects** that mimic the peer's
  response shapes. There is one healthy set, plus targeted mutations:
  - a non-array `getClassInfos` response (#514's acceptance: cases 14 and 17 report `fail`)
  - a missing critical field
  - a mistyped critical field
  - a no-error response for the nonexistent class
  - a string value with escaped quotes (#596)

  No recorded bulk JSON, and no proprietary BBj content.
- **D-20:** Live proof: run the harness against local BBjServices :5008 **on the phase base and
  at phase end**, then diff the per-case statuses. A case may differ only where D-01..D-07
  tightened its rules, and each difference is explained in the SUMMARY/VERIFICATION.

### Plan ordering
- **D-21:** The shared scaffold comes first (D-09), then the case, gate and highlighter fixes,
  then the module split and tests. The type-check/lint scope (D-13, D-14) is turned on **last**,
  after the mechanical fixes (roadmap planning note).

### Claude's Discretion
- The exact module and file names inside `tools/interop-test-harness/`, and the npm script name.
- How the highlighter is fixed: highlight before escaping, or match `&quot;`. Either works, as
  long as D-10 holds and the output stays escaped.
- The compiler options for the harness within D-14's bounds, and how the fake server is set up
  and torn down.
- Replacing the hard-coded `matrixTestIndices = [0..7, 10]` with a per-case flag is recommended
  (it breaks silently when cases move), but it is not required.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § "Phase 115: Honest Interop Test Harness": goal, success criteria and
  the planning notes (scaffold first, HARN-02 last, CI must not need :5008)
- `.planning/REQUIREMENTS.md`: HARN-01..06, DEP-03
- GitHub issues #514, #575, #596, #599, #601, #635, #520 (`gh issue view N`). Their "Proposed
  approach" and "Acceptance criteria" sections are the acceptance baseline. #514 names the
  non-array stub test, and #635 names the before/after live run.

### Tooling setup this phase extends (from Phase 114)
- `.planning/phases/114-lint-type-check-test-suite-gates/114-CONTEXT.md`: D-01..D-04 (lint
  rules, reasoned inline disables only, `--max-warnings 0`), D-05/D-06 (`tsconfig.test.json`,
  `typecheck:test`) and D-12/D-13 (lint and type-check steps in `build.yml`)
- `bbj-vscode/eslint.config.js`, `bbj-vscode/tsconfig.test.json`, `bbj-vscode/package.json`
  (`lint`, `typecheck:test`, `test` scripts)
- `.github/workflows/build.yml` (Build → Lint → Type-check test tree → Test) and
  `.github/workflows/pr-validation.yml` (triggers on `bbj-vscode/tools/**`)

### Code under change
- `bbj-vscode/tools/interop-test-harness/run-tests.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `runGetClassInfo` (`run-tests.ts:154`) is the scaffold to generalise. `checkField`, `assert`,
  `typeOf` and `countWhere` are the helpers to keep.
- The `validate*Fields` helpers (`:195-222`) already express the field checks per DTO shape.
- vscode-jsonrpc (`createMessageConnection`, `SocketMessageReader/Writer`) is already a
  dependency, so the fake server can use the same library on the server side.

### Established Patterns / Findings from scouting
- **#596 root cause:** `escapeHtml` turns `"` into `&quot;` **before**
  `syntaxHighlightJson` runs (`:706-708`, `:746`, `:751`). The key and string regexes, which
  look for `"`, then never match, so every key and string goes uncoloured, not just the ones
  with escaped quotes.
- **Gate redundancy:** `runGetClassInfo` already fails a case on any missing field, and the
  exit gate (`:1041-1052`) re-checks with a 3-field `includes()` list and skips `error` cases.
  The report's 8-field `criticalFields` (`:659`) is display-only.
- **Hard-coded passes:** case 14 (`:510`), case 17 (`:579`, `:584`). **Tautologies:** cases 9 and
  10 (`:397-411`), 13 (`:470-474`), 14 (`:499-500`), 17 (`:576`, `:586`).
- **Import side effects:** `parseArgs` runs at module top level (`:29-44`) and `main()` is called
  at `:1055`. Both must move behind the CLI entry before a test can import the harness.
- `tsx` sits in `package-lock.json` only as a transitive/peer entry (`^4.8.1`) and is not
  declared.
- `report.html` is already gitignored (root `.gitignore:21-22`).

### Integration Points
- The new test file joins the main vitest suite. Per standing memory, run vitest with cwd
  `bbj-vscode` (`npm --prefix bbj-vscode test` or `cd bbj-vscode && npx vitest run …`).
- Whole-suite gate: project-wide `numFailedTests: 0` plus targeted runs. Until Phase 116, the
  11 known `linking.test.ts` interop failures are allowed when :5008 is up.
- Source comments and test names must not carry planning ids (D-xx, plan numbers, CR-xx). Issue
  numbers are fine.

</code_context>

<specifics>
## Specific Ideas

- #514's acceptance test: a stubbed non-array `getClassInfos` response makes cases 14 and 17
  report `fail`, matching the exit code. The fake-server suite implements exactly this.
- The console line, report badge, summary counts and exit code must tell the same story for
  every case.

</specifics>

<deferred>
## Deferred Ideas

None: the discussion stayed within phase scope.

### Reviewed Todos (not folded)
- `2026-09-20-linking-interop-failures-survive-class-warmup.md`: belongs to Phase 116 (TEST-05).
- `2026-09-26-intellij-interop-initoptions-key-mismatch.md`: IntelliJ/LS init options, not the
  harness.
- `2026-09-26-signature-help-and-snippet-peer-name-escaping.md`: LS escaping of peer names, not
  the harness.
- `2026-09-27-windows-intellij-node-download-progress-check.md`: a Windows re-check for
  IntelliJ Phase 114, unrelated.

</deferred>

---

*Phase: 115-honest-interop-test-harness*
*Context gathered: 2026-09-28*
