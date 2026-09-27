# Phase 114: Lint, Type-Check & Test-Suite Gates - Context

**Gathered:** 2026-09-27
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase turns lint (`typescript-eslint` recommended, non-type-checked), a type check of the
`test/` tree and explicit vitest test discovery into gates that PR CI enforces. The whole suite
runs at the default worker count with no `initializeWorkspace()` hook timeout.
`bbx-language-configuration.json` gets the same tests as the bbj file. The phase 97 IntelliJ
follow-ups close (FIX-04).

Lint and type fixes must not change behaviour. The type-checked ESLint preset is out of scope.

Measured on 2026-09-27, before Phases 110-113 land, so recount at plan time:
- **Lint (recommended preset):** 221 errors, 54 in src and 167 in test.
  - `no-explicit-any` 112 (src 20 / test 92)
  - `no-unused-vars` 64 (13 / 51)
  - `no-unused-expressions` 18 (all test, chai-style `expect(x).true` / `.empty`)
  - `no-require-imports` 13 (11 in `src/Commands/Commands.cjs`, 2 in test)
  - `prefer-const` 12
  - `no-non-null-asserted-optional-chain` 2 (src)
- **Test-tree type check:** `tsconfig.test.json` cannot run at all (TS6306/TS6310: the
  referenced `tsconfig.json` is not `composite` and disables emit). A working config reports
  386 errors. Largest files: `test/bbj-test-module.ts` 46, `classes.test.ts` 41,
  `variable-scoping.test.ts` 27. Largest codes: TS2339 89, TS2345 78, TS7006 43, TS2835 34,
  TS2322 34, TS2739 26, TS1192+TS1259 33.

</domain>

<decisions>
## Implementation Decisions

### Lint rules and fixes (TEST-01)
- **D-01:** `no-explicit-any`: **fix in `src/`** with real types or `unknown` plus narrowing.
  **Turn the rule off for `test/**`** through a config override, because `any` in fakes and mocks
  is normal there.
- **D-02:** Other rules get **fixes plus targeted config**:
  - Remove unused variables. `no-unused-vars` is configured to accept a `_` prefix
    (`argsIgnorePattern`/`varsIgnorePattern`/`caughtErrorsIgnorePattern: '^_'`) for
    intentionally unused names.
  - Turn `no-unused-expressions` off for `test/**`, since the chai-style property assertions are
    real assertions and are not rewritten.
  - Turn `no-require-imports` off for `**/*.cjs`. The 2 test hits are fixed or covered the same way.
  - Apply the `prefer-const` autofix.
  - Fix `no-non-null-asserted-optional-chain` by hand in src, without changing behaviour.
- **D-03:** Inline disables are allowed **only with a reason**, in the form
  `// eslint-disable-next-line <rule> -- <why>`. File-wide `eslint-disable` is not allowed. The
  reason requirement is enforced by config if a small plugin rule exists for it (for example
  `@eslint-community/eslint-comments` `require-description`); otherwise a test or source-guard
  enforces it. The one existing disable is brought into line.
- **D-04:** `npm run lint` becomes `eslint src test --max-warnings 0`. `vscode:prepublish`
  inherits it, so packaging is gated too.

### Test-tree type check (TEST-02)
- **D-05:** **All** existing test type errors are fixed with real fixes: narrowing with
  `isXxx()` guards, `.js` import suffixes, typed fakes and correct default-import forms.
  `tsconfig.test.json` may relax **only** options that don't hide real bugs (for example
  `noImplicitAny: false` for `test/`). Each relaxation carries a comment explaining it. No
  `@ts-nocheck`, and no blanket `@ts-expect-error` baseline.
- **D-06:** `tsconfig.test.json` is repaired: drop the broken project reference, include
  `test/**` (and the src it imports through normal resolution), and set `noEmit`. It runs from a
  new `typecheck:test` script. The src build keeps `tsc -b tsconfig.json`.
- **D-07:** Proof that the fixes are behaviour-neutral: the whole-suite `numFailedTests` and the
  set of failing test names are **identical before and after**, compared against the phase base
  commit. Assertions change only in type-only ways.

### Test discovery and hook timeouts (TEST-03, TEST-07)
- **D-08:** **Measure first, then remove the cost.** Research profiles one
  `initializeWorkspace()` under whole-suite load (51 test files call the helper) and removes the
  real hot spot. Candidates to verify: the five bundled `.bbl` documents parsed and built per
  file, and Java interop `loadClasspath`/`loadImplicitImports` attempts in the test services.
  **No `hookTimeout` bump and no worker cap**, because criterion 3 says the default worker count.
- **D-09:** Fix it in the **test harness first** (`test/test-helper.ts`, `test/bbj-test-module.ts`).
  A `src/` change (for example `bbj-ws-manager.ts`) is allowed only if it is behaviour-neutral for
  the real language server, such as a cache that also helps the extension.
- **D-10:** Proof: **three consecutive whole-suite `npm test` runs** at the default worker count
  with no hook timeout and `numFailedTests` unchanged, with timings recorded before and after.
- **D-11:** The explicit vitest `include`/`exclude` patterns are the planner's choice. Proof is a
  `vitest list --filesOnly` (or equivalent) file set that is **identical** before and after.

### CI gate (TEST-01, TEST-02)
- **D-12:** Lint and the test type check run as **steps in `.github/workflows/build.yml`**, after
  Build. That workflow runs on every PR to main with no path filter and already does `npm ci`.
  `pr-validation.yml` and all publish workflows are not touched.
- **D-13:** The Test step keeps `if: success() || failure()`, so a lint or type failure doesn't
  hide the test results. The job still fails overall.

### Plan ordering
- **D-14:** The lint work comes in three plans: (A) eslint config, overrides and autofixable
  rules; (B) src hand fixes; (C) test hand fixes. Each ends with lint on its tree plus the whole
  suite. The **CI gate lands last**, once the tree is at zero lint errors and zero type errors.
  This phase runs after 110-113, so their code is covered.

### IntelliJ phase 97 follow-ups (FIX-04, folded todo)
- **D-15:** Use the todo's recipe:
  - `BbjNodeDownloader` calls `indicator.setIndeterminate(false)` inside the progress lambda
    before each `setFraction`, so a response with no Content-Length logs no
    `IllegalStateException`.
  - Replace the substring-counting `BbjNodeDownloaderSourceGuardTest` with a behavioural
    recording-fake indicator sequence test.
  - Replace the `bbjcplAvailability` text guard with a reflective check
    (`getMethod("bbjcplAvailability", Object.class)` plus `ServiceEndpoints.getSupportedMethods`).
  - `test/functional/issue447-real-interop.test.ts` asserts a definitive outcome plus a
    forced-fallback case, instead of the invariant that holds by construction.
  - Each guard must fail when the behaviour breaks.

### bbx language configuration (TEST-11)
- **D-16:** `bbx-language-configuration.json` gets the same checks as the bbj file in
  `test/language-configuration.test.ts` (strict JSON validity plus editor-behaviour entries).
  This is a straight mirror of the existing bbj describe block.

### Claude's Discretion
- The exact vitest include/exclude patterns (D-11), the exact test-only compiler relaxations
  (D-05), and how the disable-reason rule is enforced (D-03).

### Folded Todos
- `.planning/todos/pending/2026-09-20-phase-97-code-review-follow-ups.md`: this phase's FIX-04.
  Its WR-01..WR-04 findings and fix recipe are D-15. Close the todo with the phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scope and requirements
- `.planning/ROADMAP.md` §"Phase 114: Lint, Type-Check & Test-Suite Gates": goal, criteria, planning notes (prepublish lint, non-type-checked preset only, issue447 outcome + fallback)
- `.planning/REQUIREMENTS.md`: TEST-01, TEST-02, TEST-03, TEST-07, TEST-11, FIX-04
- GitHub issues #574, #516, #519, #562, #629 (read via `gh issue view`)
- `.planning/todos/pending/2026-09-20-phase-97-code-review-follow-ups.md`: FIX-04 source
- `.planning/milestones/v4.4-phases/97-*/97-REVIEW.md` (or wherever phase 97 was archived): WR-01..WR-04, IN-01..IN-03

### Config and CI
- `bbj-vscode/eslint.config.js`: currently `rules: {}` (no preset)
- `bbj-vscode/tsconfig.json`, `bbj-vscode/tsconfig.test.json`
- `bbj-vscode/vitest.config.ts`
- `bbj-vscode/package.json` scripts (`lint`, `test`, `vscode:prepublish`)
- `.github/workflows/build.yml`: target for the lint and type-check steps

### Hook timeouts
- `bbj-vscode/test/test-helper.ts` `initializeWorkspace()`
- `bbj-vscode/test/bbj-test-module.ts`: test services (interop fake)
- `bbj-vscode/src/language/bbj-ws-manager.ts` `initializeWorkspace()` / `loadAdditionalDocuments()`

### IntelliJ (FIX-04)
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java`
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java`
- `bbj-vscode/test/functional/issue447-real-interop.test.ts`

### bbx configuration
- `bbj-vscode/bbx-language-configuration.json`, `bbj-vscode/test/language-configuration.test.ts` (bbj describe block to mirror)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `test/language-configuration.test.ts` bbj block: the template for TEST-11.
- `typescript-eslint` is already a dependency. The config only needs `tseslint.configs.recommended`
  plus overrides.

### Established Patterns
- Whole-suite judgement uses `numFailedTests`, not "failed suites" (hook timeouts under
  contention show as failed suites with 0 failed tests).
- vitest runs with cwd = `bbj-vscode` (fixtures are resolved relative to it).
- Known local env drift: linking.test.ts interop and issue447 capability tests fail locally
  against the real :5008 backend. Compare against the base commit, not against zero.

### Integration Points
- `vscode:prepublish` runs `npm run lint`, so the new rules gate VSIX packaging (and the preview
  publish on push to main).
- `build.yml` is the unfiltered PR workflow.

</code_context>

<specifics>
## Specific Ideas

- Keep chai-style assertions as they are. They are valid vitest usage, and rewriting 18 of them
  would be churn.
- `Commands.cjs` stays CommonJS, so `require` is legitimate there (Phase 112 D-12 keeps it
  unchanged for testability, and Phase 120 reshapes it).

</specifics>

<deferred>
## Deferred Ideas

- The type-checked ESLint preset (`recommendedTypeChecked`) is out of scope per the roadmap. It
  could be a future phase.

### Reviewed Todos (not folded)
- IntelliJ sends javaInteropHost/javaInteropPort but the LS reads interopHost/interopPort: interop settings, keyword match only.
- linking.test.ts interop failures survive class warm-up: Phase 116 (TEST-05).
- Peer-supplied Java names break the signature-help fence / snippet variables: signature-help provider, not gates.

</deferred>

---

*Phase: 114-lint-type-check-test-suite-gates*
*Context gathered: 2026-09-27*
