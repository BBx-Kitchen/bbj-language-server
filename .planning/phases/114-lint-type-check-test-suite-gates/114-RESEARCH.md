# Phase 114: Lint, Type-Check & Test-Suite Gates - Research

**Researched:** 2026-09-27
**Domain:** ESLint/typescript-eslint configuration, TypeScript project config, vitest test discovery and hook-timeout diagnosis, GitHub Actions CI, IntelliJ (JetBrains Platform) progress reporting and JUnit source guards
**Confidence:** HIGH (every count and root cause below was reproduced live against the current tree on 2026-09-27, after Phases 110-113 landed)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Lint rules and fixes (TEST-01)**
- D-01: `no-explicit-any`: fix in `src/` with real types or `unknown` plus narrowing. Turn the rule off for `test/**` through a config override (mocks/fakes legitimately use `any` there).
- D-02: Other rules get fixes plus targeted config: remove unused vars (accept `_`-prefixed names via `argsIgnorePattern`/`varsIgnorePattern`/`caughtErrorsIgnorePattern: '^_'`); turn `no-unused-expressions` off for `test/**` (chai-style property assertions are real assertions, not rewritten); turn `no-require-imports` off for `**/*.cjs` (the 2 test hits are fixed or covered the same way); apply the `prefer-const` autofix; fix `no-non-null-asserted-optional-chain` by hand in src without changing behaviour.
- D-03: Inline disables allowed only with a reason (`// eslint-disable-next-line <rule> -- <why>`); file-wide `eslint-disable` is not allowed. Enforced by config if a small plugin rule exists (e.g. `@eslint-community/eslint-comments` `require-description`), otherwise a test/source-guard. The one existing disable is brought into line.
- D-04: `npm run lint` becomes `eslint src test --max-warnings 0`. `vscode:prepublish` inherits it.

**Test-tree type check (TEST-02)**
- D-05: All existing test type errors fixed with real fixes: narrowing with `isXxx()` guards, `.js` import suffixes, typed fakes, correct default-import forms. `tsconfig.test.json` may relax only options that don't hide real bugs (e.g. `noImplicitAny: false` for `test/`), each relaxation commented. No `@ts-nocheck`, no blanket `@ts-expect-error` baseline.
- D-06: `tsconfig.test.json` repaired: drop the broken project reference, include `test/**` (and the src it imports through normal resolution), set `noEmit`. Runs from a new `typecheck:test` script. The src build keeps `tsc -b tsconfig.json`.
- D-07: Proof of behaviour-neutrality: whole-suite `numFailedTests` and the set of failing test names identical before/after, compared against the phase base commit. Assertions change only in type-only ways.

**Test discovery and hook timeouts (TEST-03, TEST-07)**
- D-08: Measure first, then remove the cost. Research profiles one `initializeWorkspace()` under whole-suite load (51 test files call the helper) and removes the real hot spot. Candidates: the five bundled `.bbl` documents parsed/built per file, and Java interop `loadClasspath`/`loadImplicitImports` attempts in the test services. No `hookTimeout` bump, no worker cap (criterion 3 requires the default worker count).
- D-09: Fix in the test harness first (`test/test-helper.ts`, `test/bbj-test-module.ts`). A `src/` change (e.g. `bbj-ws-manager.ts`) is allowed only if behaviour-neutral for the real language server.
- D-10: Proof: three consecutive whole-suite `npm test` runs at default worker count with no hook timeout and `numFailedTests` unchanged, timings recorded before/after.
- D-11: Explicit vitest `include`/`exclude` patterns are the planner's choice. Proof: `vitest list --filesOnly` (or equivalent) file set identical before/after.

**CI gate (TEST-01, TEST-02)**
- D-12: Lint and the test type check run as steps in `.github/workflows/build.yml`, after Build. Runs on every PR to main, no path filter, already does `npm ci`. `pr-validation.yml` and publish workflows untouched.
- D-13: The Test step keeps `if: success() || failure()`, so a lint/type failure doesn't hide test results. The job still fails overall.

**Plan ordering**
- D-14: Lint work in three plans: (A) eslint config, overrides, autofixable rules; (B) src hand fixes; (C) test hand fixes. Each ends with lint on its tree plus the whole suite. CI gate lands last, once the tree is zero-lint/zero-type-error. This phase runs after 110-113.

**IntelliJ phase 97 follow-ups (FIX-04, folded todo)**
- D-15: `BbjNodeDownloader` calls `indicator.setIndeterminate(false)` inside the progress lambda before each `setFraction`, so a response with no Content-Length logs no `IllegalStateException`. Replace the substring-counting `BbjNodeDownloaderSourceGuardTest` with a behavioural recording-fake indicator sequence test. Replace the `bbjcplAvailability` text guard with a reflective check (`getMethod("bbjcplAvailability", Object.class)` + `ServiceEndpoints.getSupportedMethods`). `test/functional/issue447-real-interop.test.ts` asserts a definitive outcome plus a forced-fallback case, instead of the invariant that holds by construction. Each guard must fail when the behaviour breaks.

**bbx language configuration (TEST-11)**
- D-16: `bbx-language-configuration.json` gets the same checks as the bbj file in `test/language-configuration.test.ts` (strict JSON validity plus editor-behaviour entries) — a straight mirror of the existing bbj describe block.

### Claude's Discretion
- The exact vitest include/exclude patterns (D-11).
- The exact test-only compiler relaxations (D-05).
- How the disable-reason rule is enforced (D-03).

### Deferred Ideas (OUT OF SCOPE)
- The type-checked ESLint preset (`recommendedTypeChecked`) — out of scope per the roadmap; a candidate future phase.
- Reviewed-but-not-folded todos: IntelliJ `javaInteropHost/Port` vs server's `interopHost/Port` key mismatch (unscheduled); linking.test.ts interop failures surviving class warm-up (Phase 116, TEST-05); peer-supplied Java names breaking signature-help fence/snippet variables (unscheduled).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | ESLint enables `typescript-eslint` recommended rules, all violations fixed, CI fails on lint errors (#574) | Recount below: 52 hand-fixable errors remain after overrides + autofix (33 src / 19 test), per-file/per-rule list given; `test/.tmp/**` ignore gap found; `eslint-community` plugin checked (SUS verdict, not recommended — use a source-guard test instead) |
| TEST-02 | `test/` tree type-checked by a working tsconfig project run in CI (#516) | Working `tsconfig.test.json` shape verified (drop `references`, keep `extends`, `noEmit`, explicit `test/**/*.ts` include, exclude `test/.tmp`); 453 real errors reproduced, per-file/per-code breakdown, and 3 concrete high-leverage fixes identified (CommandsModule typing, `Diagnostic.getMessageString`, `import * as` for Node builtins) |
| TEST-03 | `vitest.config.ts` declares explicit include/exclude (#519) | `include: ['test/**/*.test.ts']`, `exclude: ['out/**', 'node_modules/**']` verified byte-identical to the current 159-file default-discovered set via `vitest list --filesOnly` |
| TEST-07 | `initializeWorkspace()` no longer exceeds the vitest hook timeout under whole-suite load (#562) | Root cause isolated and measured: real `JavaInteropService` socket round trips inside `initializeWorkspace()`, hit by 21 ungated test files using `createBBjServices` instead of `createBBjTestServices`; single-file cost 7.3–7.5s live vs 264ms with the test double (28x); two live whole-suite runs reproduce the exact "different suite fails each run" symptom from issue #562 |
| TEST-11 | `bbx-language-configuration.json` covered for JSON validity and editor behaviour, like bbj (#629) | bbx file already parses as strict JSON; exact entry counts captured (comments=1, brackets=4, autoClosingPairs=6, surroundingPairs=6, no `onEnterRules`) for the mirrored describe block |
| FIX-04 | IntelliJ Node.js download shows progress without `IllegalStateException`; three weak phase-97 guards assert real behaviour (#565 todo) | `BbjNodeDownloader.java`, both source-guard tests and the todo read in full; exact bug line found (line 101, `setIndeterminate(false)` outside the repeatedly-invoked lambda); `ServiceEndpoints.getSupportedMethods` API confirmed on the classpath; issue447's tautological assertion identified with its exact code path |
</phase_requirements>

## Summary

All five recount/diagnosis questions this phase depends on were answered by direct, reproducible
measurement against the current tree (commit `0b4ffdd4`, after Phases 110-113), not by re-reading
the 2026-09-27 CONTEXT numbers, which predate 110-113 and are measurably stale.

**Lint (TEST-01):** with `tseslint.configs.recommended` plus the exact D-01/D-02 overrides applied
in a scratch config, `eslint src test` reports **74 errors** before autofix, **61** once
`test/.tmp/**` (an untracked, gitignored, 861 KB generated fixture file matched by the bare
`src test` glob) is added to `ignores`, and **52** after a `--fix` pass settles (two `prefer-const`
hits are not auto-fixable: `let` declared without an initializer, assigned later). All 52 are listed
per-file below. No new lint-comment plugin is needed for D-03: the codebase has exactly one existing
`eslint-disable` today, and it lives in the generated, already-ignored `ast.ts` — so D-03's
enforcement mechanism can be a small source-guard test instead of a new dependency (the one
candidate npm package, `@eslint-community/eslint-plugin-eslint-comments`, comes back `SUS` from the
legitimacy gate on a "too-new" publish-date heuristic despite 2.87M weekly downloads — a likely
false positive, but there's no need to accept even that residual risk for one disable comment).

**Type-check (TEST-02):** a working `tsconfig.test.json` (drop the invalid `references` block, keep
`extends: "./tsconfig.json"`, add `noEmit`, `include: ["test/**/*.ts"]`, `exclude` naming
`test/.tmp`) reports **453 errors** — not CONTEXT's 386 (that count predates Phases 110-113, and used
a config that didn't inherit `tsconfig.json`'s `noUnusedLocals: true`, undercounting by 12). Three
findings materially change how the planner should size Plan C: (1) `test/commands-cjs-execution.test.ts`
is now the single largest file (53 errors, all from one `unknown`-typed `CommandsModule` interface —
fixable by typing 5-6 methods once); (2) 33 `TS1192`/`TS1259` errors across 15 files are the exact
same mechanical pattern (`import fs from 'fs'` needs `import * as fs from 'fs'`, matching src's own
convention); (3) roughly 150+ of the remaining errors trace to one root cause: `Diagnostic.message`
is `string | MarkupContent` since LSP 3.18, and test files read it as a bare string — the official,
already-available fix is `Diagnostic.getMessageString(d)` from `vscode-languageserver-types`
(verified to compile against the installed types). 12 of the 453 errors (`TS6133`/`TS6196`, unused
declarations) are literally the same variables the lint pass's `no-unused-vars` fixes will delete —
sequence or coordinate Plan C with Plans A-C's lint fixes to avoid double work.

**Hook timeouts (TEST-07):** root-caused and measured, not guessed. `initializeWorkspace()` with the
production DI wiring (`createBBjServices`) takes **7.3-7.5 seconds** per call in this environment
(where a real `bbj-ls`/BBjServices is listening on :5008) versus **264 ms** with the test double
(`createBBjTestServices`) — a 28x difference entirely attributable to
`javaInterop.loadClasspath()`/`loadImplicitImports()`'s real socket round trips, ruling out the
`.bbl` bundled-library-parsing candidate. 21 of the 51 `initializeWorkspace()`-calling test files use
`createBBjServices` (real interop) with no `shouldRunBBjTests()` gate, unlike `linking.test.ts` and 3
gated files that correctly use the test double. Two live whole-suite runs reproduce the documented
symptom exactly: `numFailedTests` stable at 11 both times (the known `linking.test.ts` baseline), but
the set of suites reported "failed" (11-12 suites, all `failedTests=0`, a mix of passed+skipped
assertions) **differs between the two runs** — the same run-to-run variance issue #562 describes. The
harness-level, behaviour-neutral fix per D-09: migrate the 21 ungated files from
`createBBjServices(EmptyFileSystem)` to `createBBjTestServices(EmptyFileSystem)` (already the
correct pattern in `linking.test.ts`; identical return shape, one-line change per file).

**Vitest discovery (TEST-03):** `npx vitest list --filesOnly` resolves exactly 159 files today, all
matching `test/**/*.test.ts`; the exact globs from issue #519
(`include: ['test/**/*.test.ts']`, `exclude: ['out/**', 'node_modules/**']`) were verified to
produce a byte-identical list.

**bbx config (TEST-11):** `bbx-language-configuration.json` already parses as strict JSON (unlike
the historical bbj trailing-comma bug); its structural shape differs from bbj's (no `onEnterRules`,
an extra `<`/`>` bracket pair, `#` line comment instead of `REM`) — exact entry counts below.

**FIX-04:** all four files read in full. The download-progress bug is precisely located: line 101 of
`BbjNodeDownloader.java` calls `indicator.setIndeterminate(false)` once, *outside* the
`(text, fraction) -> {...}` lambda that `NodeInstallPipeline.install()` invokes repeatedly — so if
`HttpRequests`' internal `saveToFile` resets the indicator to indeterminate between chunks (a
response with no `Content-Length`), every subsequent `setFraction` in the lambda throws. The existing
`BbjNodeDownloaderSourceGuardTest` guard is purely textual (count + position in the flattened method
body) and would not detect this even after a naive fix, because moving the call inside the lambda
still yields "1 occurrence, in the right order" at the source-text level — a genuinely behavioural
test needs a fake `ProgressIndicator` invoked 2+ times. `ServiceEndpoints.getSupportedMethods(Class)`
(from `org.eclipse.lsp4j.jsonrpc.services`, already on the effective classpath via the bundled
`lsp4ij` plugin dependency) is confirmed to exist and return `Map<String, JsonRpcMethod>`, giving a
concrete, reflection-based replacement for the comment-blind `bbjcplAvailability` string guard.
issue447's `hasCompleteClassIndex() === ensureCompleteClassIndex()` assertion is tautological by
construction (`ensureCompleteClassIndex()`'s success branch calls `buildCompleteClassIndex()`, which
sets the very field `hasCompleteClassIndex()` reads) — a forced-fallback case needs to exercise the
`METHOD_NOT_FOUND` branch, and no existing seam does this against the real backend (see Open
Questions).

**Primary recommendation:** treat the D-08 hot-spot fix (migrate 21 files to `createBBjTestServices`)
as the single highest-leverage task in this phase — it is a mechanical, low-risk, behaviour-neutral
change that removes ~150s of aggregate real-network latency from the suite and is very likely the
actual TEST-07 fix, not a parallelization or `Promise.all` rewrite of `bbj-ws-manager.ts` (issue
#562's own "reduce the work" option, but at a different layer than D-09 asks for).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Lint rule enforcement | Build tooling (ESLint, local + CI) | — | Static analysis over the TS source tree; no runtime tier |
| Test-tree type-checking | Build tooling (`tsc --noEmit`, local + CI) | — | Compile-time-only check, parallel to `tsc -b` for `src/` |
| Test discovery boundary | Test runner config (vitest) | — | Declarative glob, no code executes it |
| `initializeWorkspace()` hook cost | Test harness (`test/test-helper.ts`, `test/bbj-test-module.ts`) | Language server (`bbj-ws-manager.ts`, only if behaviour-neutral) | D-09 locks the harness as primary; a `src/` change is a fallback only |
| CI gate wiring | CI/CD (`.github/workflows/build.yml`) | — | Orchestrates the above as `if: success() || failure()` steps |
| IntelliJ Node.js download progress | IntelliJ plugin (JetBrains Platform `ProgressIndicator`) | — | Progress reporting is a Task.Backgroundable concern, not LSP |
| IntelliJ `bbjcplAvailability`/`ServiceEndpoints` guard | IntelliJ plugin (LSP4J reflection over `BbjLanguageClient`) | — | Verifies wire-protocol registration, not business logic |
| issue447 class-index invariant | Language server (`java-interop.ts`, real backend) | Test (`test/functional/issue447-real-interop.test.ts`) | The invariant under test lives in `JavaInteropService`; the fix is in the test's assertions, not the service |

## Standard Stack

No new runtime dependency is required. `typescript-eslint` (`^8.69.0`), `eslint` (`^10.11.0`) and
`typescript` (`^5.8.3`) are already devDependencies and already provide everything D-01/D-02/D-05/D-06
need (`tseslint.configs.recommended`, `tseslint.config()`, `tsc --noEmit`).

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| typescript-eslint | ^8.69.0 (installed; `npm view` not needed — already resolved in `package-lock.json` and functioning in this session) | Provides `tseslint.configs.recommended` and the flat-config builder | Already the project's chosen ESLint/TS integration; CONTEXT and issue #574 both name it directly |
| typescript | ^5.8.3 (installed) | `tsc --noEmit` for the new `typecheck:test` script | Same compiler already used for `npm run build`'s `tsc -b tsconfig.json` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| vscode-languageserver-types (transitive, resolves via `vscode-languageserver`) | 3.18.0 (per `package-lock.json`) | `Diagnostic.getMessageString(d)` | Any test file currently doing `.message.includes(...)` or passing `d.message` where a `string` is expected |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| A source-guard test enforcing "disable needs a reason" (D-03) | `@eslint-community/eslint-plugin-eslint-comments`'s `require-description` rule | The plugin exists (v4.8.1, 2.87M weekly downloads, real GitHub repo) but the legitimacy gate flags it `SUS` on a "too-new" publish-date signal; for exactly one disable comment in the whole tree, a same-pattern source-guard test (as already used extensively in `bbj-intellij`) avoids taking on a new dependency and its audit risk for zero functional gain |
| Migrating the 21 hot-spot files to `createBBjTestServices` (D-09, harness-first) | Parallelizing `bbj-ws-manager.ts`'s `initializeWorkspace()` I/O with `Promise.all` (issue #562's other named option) | The `Promise.all` route is a `src/` behaviour change that only reduces, not eliminates, the ~7s-per-file real-network cost, and does nothing about the 21 files that don't need real interop at all; D-09 explicitly asks for harness-first, and the measured 28x speedup from the test double makes it the clearly higher-leverage fix |

**Installation:** none — no `npm install` needed for this phase's Standard Stack.

**Version verification:** `typescript-eslint`, `typescript`, `eslint`, and `vscode-languageserver-types`
are all already resolved in this environment (`node_modules` present, versions read directly from
`package.json`/`package-lock.json`, not from training-data recollection).

## Package Legitimacy Audit

One candidate package was evaluated for D-03 and is **not recommended for adoption** in this phase.

| Package | Registry | Age (per legitimacy check) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@eslint-community/eslint-plugin-eslint-comments` | npm | latest version published 2026-09-12 (flagged "too-new" by the seam's heuristic; the project itself is long-established) | 2,873,788/week | `github.com/eslint-community/eslint-plugin-eslint-comments` | SUS (`too-new`) | **Not adopted** — use a source-guard test instead (see Architecture Patterns); no install needed, so the SUS flag carries no residual risk |

**Packages removed due to `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** `@eslint-community/eslint-plugin-eslint-comments` — flagged, not installed, no checkpoint needed since it is not used.

`[ASSUMED]` note: `@eslint-community/eslint-plugin-eslint-comments`'s package name and existence were
first surfaced from CONTEXT's own text (the CONTEXT document itself, not training-data recall), then
confirmed live via `npm view` (`4.8.1`) and the legitimacy-check seam this session — tag its
provenance as `[VERIFIED: npm registry via gsd-tools package-legitimacy check, run this session]`
for the SUS verdict itself; the package is not being recommended, so no further action is required.

## Architecture Patterns

### System Architecture Diagram

```
PR opened/updated
        |
        v
.github/workflows/build.yml (unfiltered, every PR to main)
        |
        v
  [Build] npm ci && npm run build  (tsc -b tsconfig.json + esbuild, src/ only)
        |
        v
  [Lint]      eslint src test --max-warnings 0        <- NEW STEP (after Build, before/alongside Test)
        |
        v
  [Typecheck] tsc -p tsconfig.test.json --noEmit       <- NEW STEP (typecheck:test script)
        |
        v
  [Test]  if: success() || failure()                   <- UNCHANGED gate semantics (D-13)
        |      npm run test  (vitest run, explicit include/exclude, D-11)
        |          |
        |          v
        |    beforeAll -> initializeWorkspace(shared)
        |          |
        |          +--> [51 files] test/test-helper.ts's initializeWorkspace()
        |                    |
        |                    v
        |              wsManager.initializeWorkspace() (bbj-ws-manager.ts)
        |                    |
        |                    +--> loadAdditionalDocuments(): 5 bundled .bbl docs (~264ms total, NOT the bottleneck)
        |                    |
        |                    +--> javaInterop.loadClasspath() / loadImplicitImports()
        |                              |
        |                    [21 UNGATED files: createBBjServices -> REAL JavaInteropService]
        |                              |         -> real socket connect to :5008 (~7.3s per file when reachable)
        |                              |         -> THIS is the TEST-07 hot spot
        |                              |
        |                    [30 files: createBBjTestServices -> JavaInteropTestService]
        |                              -> loadClasspath()/loadImplicitImports() resolve false, instantly
        |                              -> ~264ms total, correct pattern (D-09 target)
        |
        v
  [Bundle Extension] npx vsce package  (vscode:prepublish already runs npm run lint per D-04)
        |
        v
  [Upload Artifacts]
```

### Recommended Project Structure

No new files/folders are needed; only edits to existing config and test files:
```
bbj-vscode/
├── eslint.config.js         # add tseslint.configs.recommended + D-01/D-02 overrides + test/.tmp ignore
├── tsconfig.test.json       # drop references, add noEmit + explicit include/exclude
├── vitest.config.ts         # add explicit test.include/test.exclude (D-11)
├── package.json             # add "typecheck:test" script, update "lint" (D-04)
├── test/test-helper.ts      # possible small harness change (D-09)
├── test/bbj-test-module.ts  # target for the 21-file migration pattern (createBBjTestServices)
└── test/language-configuration.test.ts  # add mirrored bbx describe block (D-16)

.github/workflows/build.yml  # add Lint + Typecheck steps after Build (D-12/D-13)

bbj-intellij/src/main/java/.../BbjNodeDownloader.java                        # D-15 fix
bbj-intellij/src/test/java/.../BbjNodeDownloaderSourceGuardTest.java         # D-15 rewrite
bbj-intellij/src/test/java/.../Lsp4ijOverrideSiteSourceGuardTest.java        # D-15 rewrite (one test method)
bbj-vscode/test/functional/issue447-real-interop.test.ts                    # D-15 rewrite
```

### Pattern 1: Test-double migration for the interop hot spot (D-09)
**What:** Replace `createBBjServices(EmptyFileSystem)` with `createBBjTestServices(EmptyFileSystem)`
in the 21 files below. Both functions return the identical `{ shared: LangiumSharedServices, BBj:
BBjServices }` shape (verified: `test/bbj-test-module.ts:12-14` vs. `src/language/bbj-module.ts`'s
`createBBjServices`), so this is a mechanical import + call-site swap with no other code change.
**When to use:** Any test file that calls `initializeWorkspace()` (directly or via `test/test-helper.ts`)
but does not itself assert anything about real Java-interop connectivity, real classpath resolution,
or real backend capability negotiation.
**Verified affected files (21, currently un-gated and using the real service):**
```
test/composer-codelens-handler.test.ts   test/builtin-library-members.test.ts
test/hover.test.ts                       test/declare-in-class.test.ts
test/builtin-functions-library.test.ts   test/parser-keyword-statements.test.ts
test/validation-function-calls.test.ts   test/bbj-document-validator.test.ts
test/composer-codelens.test.ts           test/class-validations-issues.test.ts
test/classes.test.ts                     test/conformance-regressions.test.ts
test/document-builder-rebuild-guard.test.ts   test/line-break-validation.test.ts
test/overload-selector.test.ts           test/line-break-single-line-if.test.ts
test/run-call-navigation.test.ts         test/run-call-file-resolution.test.ts
test/use-path-containment.test.ts        test/use-project-root.test.ts
test/parser.test.ts                      test/variable-scoping.test.ts
```
(4 further files already correctly gate on `shouldRunBBjTests()` before touching real interop:
`examples-compile.test.ts`, `setopts-in-code-request.test.ts`, `setopts-code-scanner.test.ts`,
`variable-scoping.test.ts` is gated for SOME of its describes but still appears above because it also
has un-gated `initializeWorkspace()` usage — verify per-describe-block before migrating.)
**Example (source: `test/linking.test.ts:11`, the already-correct pattern in this codebase):**
```typescript
// Before (real interop, 7+s per file when :5008 is reachable, ECONNREFUSED-fast otherwise):
const services = createBBjServices(EmptyFileSystem);

// After (test double, ~264ms, matches linking.test.ts's existing pattern):
const services = createBBjTestServices(EmptyFileSystem);
```
**Caution:** a handful of these files may deliberately want the real `JavaInteropService`'s specific
methods/types (e.g. to exercise a code path only the real class implements) even though they don't
need network connectivity — check each file's actual assertions, not just its `initializeWorkspace()`
call, before migrating. `hover.test.ts`, `classes.test.ts`, `variable-scoping.test.ts` are the three
largest measured time sinks after `examples-compile.test.ts` and are the highest-value targets.

### Pattern 2: `Diagnostic.getMessageString()` for the `string | MarkupContent` cascade (TEST-02)
**What:** LSP 3.18 changed `Diagnostic.message`'s type to `string | MarkupContent`
(source: `node_modules/vscode-languageserver-types/lib/esm/main.d.ts:543`). Test files across ~25
files read `.message` as a bare string (`.includes(...)`, passed to a `string`-typed parameter),
producing `TS2339`/`TS2345`. The official static helper already ships in the same package.
**Verified to compile** against this project's installed types (probe run this session, exit clean):
```typescript
// Source: node_modules/vscode-languageserver-types/lib/esm/main.d.ts:588-592
import { Diagnostic } from "vscode-languageserver"; // already imported this way elsewhere in the tree
const messageText = Diagnostic.getMessageString(diagnostic); // always a string
```
**Where to apply:** every `.message` read flagged by the `MarkupContent`-related `TS2339`/`TS2345`
errors below — `classes.test.ts` (38), `variable-scoping.test.ts` (26), `unknown-java-member.test.ts`
(12), `validation.test.ts` (9), and ~20 more files with 1-4 hits each.

### Pattern 3: Typed `CommandsModule`/`ConfigPathCacheModule` interfaces (TEST-02)
**What:** `test/commands-cjs-harness.ts:129-137` deliberately types the dynamically-`require()`d
`Commands.cjs` module as `{ setOutputChannel: ...; [key: string]: unknown }` — every other property
(`run`, `runBUI`, `compile`, etc.) is `unknown`, so calling `Commands.run(...)` in
`test/commands-cjs-execution.test.ts` (53 of the 453 total errors, all `TS18046`) fails to type-check
even though it's fine at runtime.
**Fix (a real typed-fakes fix per D-05, not a relaxation):** add explicit function-signature members
to `CommandsModule` for the ~11 command names the tests actually call (`openConfigFile`,
`openPropertiesFile`, `openEnterpriseManager`, `run`, `runBUI`, `runDWC`, `compile`, `denumber`,
`decompileReplace`, `decompileReadonly`) and a `setResolvedConfigPath` signature on
`ConfigPathCacheModule`, keeping the `[key: string]: unknown` index signature as a fallback for
anything not yet named. One interface edit removes the single largest error concentration in the
whole test tree.

### Pattern 4: `import * as x from 'node-builtin'` for Node core modules (TEST-02)
**What:** `tsconfig.json` sets `esModuleInterop: false`; `src/` consistently uses
`import * as fs from 'fs'` (verified: `src/decompile-io.ts:7`, `src/Commands/process-args.ts:35`,
`src/formatter-java-resolver.ts:9`), but 15 test files use `import fs from 'fs'` /
`import path from 'path'` / `import os from 'os'` default-import syntax, producing `TS1192`/`TS1259`
(33 errors total). Converting to the namespace form matches the existing src convention exactly — no
compiler-option relaxation needed and no risk of hiding a real default-export bug.
**Affected files (15):** `builtin-library-members.test.ts`, `compile-request.test.ts`,
`config-path-resolution.test.ts`, `conformance-regressions.test.ts`, `cpl-service.test.ts`,
`example-files.test.ts`, `examples-compile.test.ts`, `formatter-pins-drift.test.ts`,
`formatter-verifier-tamper.test.ts`, `gradle-wrapper-hygiene.test.ts`, `javadoc.test.ts`,
`lsp-protocol-single-copy.test.ts`, `process-runner.test.ts`, `utils.test.ts`,
`workflow-secret-hygiene.test.ts`.

### Pattern 5: Reflective `ServiceEndpoints` guard for `bbjcplAvailability` (FIX-04/D-15)
**What:** `Lsp4ijOverrideSiteSourceGuardTest.theBbjcplAvailabilityHandlerIsDeclaredAndDoesNothingWithItsPayload`
(lines 138-149) currently does a whole-file substring count for
`@JsonNotification("bbj/bbjcplAvailability")` (comment-blind — a commented-out annotation still
"passes") and a brace-scan for an empty method body (doesn't pin the `Object` parameter type).
**Verified replacement API** (`javap` run this session against the resolved 0.20.1 jsonrpc jar):
```java
// org.eclipse.lsp4j.jsonrpc.services.ServiceEndpoints
public static Map<String, JsonRpcMethod> getSupportedMethods(Class<?> type);
```
```java
// Reflective check (no source-text scanning):
Method m = BbjLanguageClient.class.getMethod("bbjcplAvailability", Object.class); // pins the param type
JsonNotification ann = m.getAnnotation(JsonNotification.class);
assertEquals("bbj/bbjcplAvailability", ann.value());
Map<String, JsonRpcMethod> supported = ServiceEndpoints.getSupportedMethods(BbjLanguageClient.class);
assertTrue(supported.containsKey("bbj/bbjcplAvailability")); // exactly what LSP4IJ itself checks
```
`[VERIFIED: bbj-vscode-adjacent /home/coder/.m2/repository/org/eclipse/lsp4j/org.eclipse.lsp4j.jsonrpc/0.20.1/org.eclipse.lsp4j.jsonrpc-0.20.1.jar, javap output this session]`
for the API shape; `[ASSUMED]` that this exact jar version is on `bbj-intellij`'s Gradle *test*
classpath (it arrives transitively through the `lsp4ij` plugin dependency declared in
`build.gradle.kts:34`, which the existing `Lsp4ijOverrideSiteSourceGuardTest` already successfully
imports `com.redhat.devtools.lsp4ij.ServerStatus` from — the same transitive-classpath mechanism —
but I did not run `./gradlew compileTestJava` in this session to confirm `ServiceEndpoints`
specifically resolves; the planner should have the executor do a quick compile check before treating
this pattern as settled).

### Anti-Patterns to Avoid
- **Raising `hookTimeout` or capping workers to fix TEST-07:** explicitly forbidden by D-08/D-10
  (criterion 3 requires the default worker count) and would mask the real cost instead of removing
  it — issue #562 names this as one of two options and CONTEXT has already chosen the other.
- **Fixing the `no-unused-vars`/`TS6133` overlap twice:** 12 of the 453 type errors are the exact
  same dead declarations the lint pass's `no-unused-vars` fixes will delete (see Common Pitfalls) —
  don't independently invent two different resolutions for `test/bbj-cpl-fallback-dedup.test.ts:160`,
  `test/bbj-test-module.ts:1`, `test/javadoc.test.ts:4`, `test/lazy-prefix-loading.test.ts:1`,
  `test/linking.test.ts:9`, `test/live-parse-interleaving.test.ts:2`,
  `test/on-save-kept-errors.test.ts:738`, `test/setopts-catalog.test.ts:8`, `test/utils.test.ts:11`,
  `test/validation.test.ts:12` (3 names on one line).
- **Blanket `esModuleInterop: true` for `test/`:** would silently fix the 33 `TS1192`/`TS1259`
  errors but changes what "the default export of a CJS module" means throughout the test tree and
  could mask a real default-vs-namespace-export mismatch elsewhere; the 15-file `import * as`
  mechanical fix (Pattern 4) achieves the same result without the relaxation, matching D-05's "only
  relaxations that don't hide real bugs" rule.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Extracting a diagnostic's message as a plain string | A custom `typeof d.message === 'string' ? d.message : d.message.value` helper repeated per call site | `Diagnostic.getMessageString(d)` from `vscode-languageserver-types` (already a transitive dependency) | Official, already-shipped, handles the `MarkupContent` case correctly per the LSP 3.18 spec; verified to compile in this session |
| Detecting whether a JSON-RPC method is "supported" by a client class | Regex/substring scanning of the client source for `@JsonNotification(...)` | `ServiceEndpoints.getSupportedMethods(Class<?>)` from lsp4j.jsonrpc | This is literally the mechanism LSP4IJ itself uses at runtime to decide whether a notification is handled — testing against it is testing the real contract, not a proxy for it |
| A disable-comment-reason enforcement mechanism | A hand-rolled ESLint plugin/rule | A source-guard test (regex over `eslint.config.js`-adjacent source files, same pattern already used in `bbj-intellij`'s `*SourceGuardTest.java` files) OR the existing `@eslint-community` plugin if the team accepts its `SUS` legitimacy flag | Given exactly one disable comment exists today, a new dependency (even a legitimate one) is disproportionate; the project already has an established, working source-guard idiom to reuse |

**Key insight:** Every "don't hand-roll" item above already has an in-repo or in-dependency answer —
this phase's job is almost entirely *wiring existing, already-installed capability* (a compiler flag,
an official LSP helper, a reflection API, a test-double swap) rather than writing new logic.

## Common Pitfalls

### Pitfall 1: Linting or type-checking `test/.tmp/`
**What goes wrong:** `test/.tmp/line-break-walk-child.mjs` is an 861 KB, untracked, gitignored file
(`.gitignore:5` → `/test/.tmp/`) generated at test-run time by the line-break-walk child-process
test. `eslint src test` picks it up (flat-config `ignores` doesn't consult `.gitignore`), producing
13 spurious findings at line numbers in the tens of thousands.
**Why it happens:** ESLint 9+ flat config no longer honours `.gitignore` implicitly.
**How to avoid:** add `'test/.tmp/**'` to `eslint.config.js`'s `ignores` array (alongside the existing
`out/**` and `src/language/generated/**`). This does not affect vitest test *discovery* (the file is
`.mjs`, not `*.test.ts`, so it was never picked up by vitest's default include pattern anyway) — this
is purely a lint-glob gap.
**Warning signs:** `npm run lint` reporting errors in a path under `test/.tmp/` at line numbers with
5+ digits.

### Pitfall 2: `prefer-const` violations that autofix silently skips
**What goes wrong:** two of the current 11 `prefer-const` hits (`src/extension.ts:1061` `client`,
`src/language/bbj-ws-manager.ts:334` `props`) are `let` declared *without* an initializer and
assigned on a later, separate statement. ESLint's `prefer-const` fixer does not rewrite this shape
(it only rewrites `let x = 1;` where declaration and assignment are the same statement).
**Why it happens:** `extension.ts`'s case is a genuine forward-reference (a closure captures `client`
before it's assigned, by design, per the comment at `extension.ts:1058-1060`) — converting requires
reordering, not just s/let/const/. `bbj-ws-manager.ts`'s case (`let props: KeyValuePairObject; props
= getProperties(input);`) has no such constraint and can likely be merged into one `const` statement.
**How to avoid:** after running `eslint --fix`, re-run lint and hand-fix the 2 remaining
`prefer-const` violations individually — don't assume the autofix step alone satisfies D-02.
**Warning signs:** `eslint --fix` exits non-zero after fixing, with `prefer-const` still present.

### Pitfall 3: The lint pass and the type-check pass share ~12 identical dead-code fixes
**What goes wrong:** planning Plans A-C (lint) and the type-check work as fully independent efforts
risks fixing the same 12 unused-declaration sites twice, or in two different ways that then conflict.
**Why it happens:** ESLint's `@typescript-eslint/no-unused-vars` and TypeScript's own
`noUnusedLocals`/`noUnusedParameters` (inherited by `tsconfig.test.json` via `extends:
"./tsconfig.json"`) both flag the same dead declarations; TypeScript's error codes are `TS6133`
("declared but its value is never read") and `TS6196` ("declared but never used").
**How to avoid:** treat the exact-name list in the Anti-Patterns section above as a single fix list,
applied once, whichever plan touches it first.

### Pitfall 4: Assuming :5008 is unreachable in every environment
**What goes wrong:** the 21 ungated files' cost profile is environment-dependent. In this dev
container, a real `bbj-ls`/BBjServices answers on :5008 in ~8ms and the interop round trip
genuinely takes 7+ real seconds. In GitHub Actions CI (no such service), the same code path instead
pays a fast `ECONNREFUSED` (or, in a network-restricted sandbox, could pay the full 10s
`createSocket()` timeout in `java-interop.ts:517-520`). Either way the fix (migrate to the test
double) is correct, but a plan that only reproduces/verifies the timing locally may see a different
absolute number in CI.
**Why it happens:** `BBjWorkspaceManager.initializeWorkspace()` calls `loadClasspath`/
`loadImplicitImports()` unconditionally, regardless of which `JavaInteropService` implementation is
injected — it has no awareness of whether it's running under test at all.
**How to avoid:** verify the fix by an absolute reduction in wall time for the 21 named files (or a
proxy: `initializeWorkspace()` completing without leaving an open `Socket` handle — see the
diagnostic script pattern below), not by a specific millisecond target tied to this container.
**Warning signs:** a CI run's whole-suite duration much lower than local (masking the same
architectural problem, just paying a cheaper per-file penalty).

## Code Examples

### Diagnosing a lingering open socket after `initializeWorkspace()` (used to confirm the D-08 root cause)
```typescript
// Source: verified this session via a scratch script, not shipped code — useful if the fix needs
// re-verification later.
console.log('active handles:', (process as any)._getActiveHandles().map((h: any) => h.constructor.name));
// -> ['Socket']  after createBBjServices(EmptyFileSystem) + initializeWorkspace(), confirming a
//    real, unclosed connection to :5008 outlives the call.
```

### `tsconfig.test.json`, repaired shape (verified to run and produce a stable error count)
```jsonc
// Source: this session's scratch config, run against the live tree (453 errors, stable across 2 runs)
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "rootDir": "."
  },
  "include": [
    "test/**/*.ts",
    "src/**/*.ts"
  ],
  "exclude": [
    "out",
    "node_modules",
    "test/.tmp"
  ]
}
```
Note: `extends: "./tsconfig.json"` (kept, per D-06) inherits `noUnusedLocals: true`, which is why
this config's real count (453) is 12 higher than a standalone config without `extends` (441) — the
`extends`-based shape is the correct one to plan against.

### `vitest.config.ts`, explicit discovery boundary (verified byte-identical file set)
```typescript
// Source: this session's scratch config; npx vitest list --filesOnly diff'd clean against the
// current 159-file default-discovered set.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['out/**', 'node_modules/**'],
    coverage: { /* unchanged */ }
  },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `Diagnostic.message: string` | `Diagnostic.message: string | MarkupContent` | LSP 3.18 (vscode-languageserver-types 3.18.0, already installed) | Any code reading `.message` as a bare string needs `Diagnostic.getMessageString()` or a type guard; this project's test tree predates the type change catching up with it |
| `eslint.config.js` with `rules: {}` | `tseslint.configs.recommended` spread into the config | Never actually enabled in this repo (issue #574, filed against the current state) | The lint step has existed as CI/local scaffolding with zero enforcement since it was introduced |

**Deprecated/outdated:** none specific to this phase's stack — `typescript-eslint` 8.x and vitest 4.x
are both current major versions already in use.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `ServiceEndpoints` (from `org.eclipse.lsp4j.jsonrpc.services`, resolved via the `lsp4ij` plugin's transitive Gradle dependency) resolves on `bbj-intellij`'s **test** compile classpath, not just this machine's Maven cache | Architecture Pattern 5 | If it doesn't resolve, the reflective guard needs an explicit `testImplementation` dependency added to `build.gradle.kts`, or a different (still reflection-based, e.g. hand-walking `@JsonNotification` annotations via `java.lang.reflect`) mechanism — a small, low-risk fallback exists either way |
| A2 | The 21 named test files can all be migrated to `createBBjTestServices` with zero behaviour change to their own assertions | Architecture Pattern 1 | A file might rely on a real-service-only method/type not present on `JavaInteropTestService`; the fix is per-file verification (run that file's tests before/after the swap), not a blanket sed |
| A3 | `@eslint-community/eslint-plugin-eslint-comments`'s `SUS` verdict is a false positive driven by a "latest version publish date" heuristic rather than genuine risk | Package Legitimacy Audit | Immaterial to the plan either way, since the recommendation is to not adopt the package regardless |

## Open Questions

1. **How to construct issue447's "forced-fallback case" against a real backend (D-15/WR-04)**
   - What we know: `ensureCompleteClassIndex()`'s only fallback trigger is a JSON-RPC error with
     `code === METHOD_NOT_FOUND` (`java-interop.ts:876-879`), which latches `completeIndexResolved =
     true` with `completeClassIndex` left `null`. `resolveClassCandidatesBySimpleName()` then takes
     the `findClassCandidatesBySimpleName` + `autoImportCandidatePackages` probe branch
     (`java-interop.ts:932-939`). `completeClassIndex`/`completeIndexResolved` are `private`;
     `clearCompleteClassIndex()` is `protected` but only resets to the *unresolved* state, not the
     *resolved-with-no-index* (fallback) state.
   - What's unclear: there is no existing seam to force the fallback branch against the **real**
     backend from a test (the real backend in this environment does support `getAllClassNames`, so
     the success branch is what actually runs live). Forcing the fallback needs either (a) a small
     new test-only method on `JavaInteropService` (mirroring `clearCompleteClassIndex()`'s existing
     protected-accessor pattern) that sets the METHOD_NOT_FOUND-latched state directly, or (b) a test
     subclass overriding `connect()`/wrapping the connection to reject only the `getAllClassNames`
     request with a `METHOD_NOT_FOUND`-coded error while passing everything else through to the real
     socket.
   - Recommendation: option (a) is smaller and matches the existing `protected` seam style already
     used for `clearCompleteClassIndex()`; the planner should size it as a small, explicit task
     rather than leave it to be improvised mid-execution, since it is a `src/` change (`java-interop.ts`)
     made solely to support a test, which needs an explicit behaviour-neutrality argument (it only
     adds a method, doesn't change existing runtime behavior).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| BBjServices / bbj-ls on `localhost:5008` | Real-interop code path inside `initializeWorkspace()` (the TEST-07 hot spot) | ✓ in this dev container (connects in ~8ms) | unknown exact `bbj-ls` build | In GitHub Actions CI this is **not** running — the same code path instead pays a fast `ECONNREFUSED` per attempt; the D-09 fix removes dependence on this either way |
| `@vscode/vsce` | `npx vsce package` in `build.yml`'s existing "Bundle Extension" step (unchanged by this phase) | ✓ (devDependency) | ^4.0.0 | — |
| Node.js 22 | CI (`actions/setup-node@v4`, `node-version: 22`); this session ran under Node 24.20.0 locally | ✓ both | 22 (CI) / 24.20.0 (local) | Per project memory, Node 24 breaks `langium generate` — not invoked by this phase's work, so no impact here |
| `tsx` (used only for this session's ad-hoc profiling scripts) | Not a phase dependency — used solely to produce the timing evidence in this document | ✓ (via `npx`) | 4.23.15 | N/A — not part of the shipped fix |

**Missing dependencies with no fallback:** none.

**Missing dependencies with fallback:** BBjServices/`:5008` reachability (see above; the phase's own
fix removes the dependency rather than working around its absence).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.10 |
| Config file | `bbj-vscode/vitest.config.ts` (gains explicit `include`/`exclude` this phase) |
| Quick run command | `cd bbj-vscode && npx vitest run <file>` |
| Full suite command | `cd bbj-vscode && npm run test` (i.e. `vitest run`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | `npm run lint` exits 0 with the recommended preset active | lint gate | `cd bbj-vscode && npm run lint` | ✅ (script exists, behaviour changes) |
| TEST-02 | `test/` type-checks cleanly | typecheck gate | `cd bbj-vscode && npm run typecheck:test` | ❌ Wave 0 — new script |
| TEST-03 | vitest discovers the same 159 files via explicit globs | discovery check | `cd bbj-vscode && npx vitest list --filesOnly` (diff against a pre-change snapshot) | ✅ (command exists; snapshot must be captured before the config change) |
| TEST-07 | Whole suite runs at default workers with no hook timeout, `numFailedTests` unchanged | regression + timing | `cd bbj-vscode && npx vitest run --reporter=json --outputFile=<path>` ×3 consecutive, compare `numFailedTests` and grep for `"Hook timed out"` | ✅ (command exists; this session's 2 baseline runs are in the scratch evidence, not committed) |
| TEST-11 | `bbx-language-configuration.json` mirror describe block passes | unit | `cd bbj-vscode && npx vitest run test/language-configuration.test.ts` | ❌ Wave 0 — new describe block in an existing file |
| FIX-04 | Download-progress guard fails when behaviour breaks; `bbjcplAvailability` guard is reflective; issue447 asserts a definitive outcome + forced fallback | JUnit 5 (IntelliJ) + vitest (issue447) | `cd bbj-intellij && ./gradlew test --tests "*BbjNodeDownloaderSourceGuardTest*" --tests "*Lsp4ijOverrideSiteSourceGuardTest*"`; `cd bbj-vscode && RUN_BBJ_TESTS=1 npx vitest run test/functional/issue447-real-interop.test.ts` | ❌ Wave 0 — both guard tests need behavioural rewrites; issue447 needs its new fallback case |

### Sampling Rate
- **Per task commit:** the quick run command scoped to the file(s) touched.
- **Per wave merge:** the full suite command (`npm run test`), plus `npm run lint` and
  `npm run typecheck:test` once those scripts exist.
- **Phase gate:** three consecutive full-suite runs (D-10) with `numFailedTests` unchanged from the
  phase base commit and no `"Hook timed out"` string in any run's output, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `package.json` — add `typecheck:test` script (`tsc -p tsconfig.test.json --noEmit`)
- [ ] `tsconfig.test.json` — repair per the verified shape above
- [ ] `vitest.config.ts` — add explicit `include`/`exclude`
- [ ] `eslint.config.js` — add `tseslint.configs.recommended`, the D-01/D-02 overrides, and the
      `test/.tmp/**` ignore entry
- [ ] `test/language-configuration.test.ts` — new bbx-mirroring describe block
- [ ] A pre-change snapshot of `npx vitest list --filesOnly` and of `npm run test --reporter=json`'s
      `numFailedTests`/failing test names, captured **before** any other phase edit lands, to serve
      as the D-07/D-10/D-11 "before" baseline (the numbers in this document — 159 files, 11 failed
      tests, `linking.test.ts` as the sole source — are that baseline, but the planner should have
      the executor re-capture it fresh at Wave 0 in case anything drifts between now and execution)

## Security Domain

`security_enforcement` is not set in `.planning/config.json` (defaults to enabled), but this phase's
surface is build tooling, test infrastructure, and CI wiring — it introduces no new user input,
network endpoint, or stored data. FIX-04 touches a download path, which is the one item with a
pre-existing, out-of-scope security control worth naming.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | No auth surface touched |
| V3 Session Management | no | No session surface touched |
| V4 Access Control | no | No access-control surface touched |
| V5 Input Validation | no (existing control, not modified) | `NodeInstallPipeline`'s already-pinned digest verification (`NodeArchiveVerifier.PINNED_DIGESTS`, `productionPipeline()` at `BbjNodeDownloader.java:141`) already validates the downloaded Node.js archive; this phase touches only the progress-reporting lambda around it, not the download/verification path itself |
| V6 Cryptography | no | Unaffected — digest pinning is out of this phase's scope (it was hardened in an earlier phase per `NodeArchiveVerifier.PINNED_DIGESTS`) |

### Known Threat Patterns for this stack
None newly introduced. A CI workflow change (adding two steps to `build.yml`) does not add secrets,
permissions, or external network calls beyond what `npm ci`/`npm run build` already perform in that
job.

## Sources

### Primary (HIGH confidence — reproduced live this session)
- `bbj-vscode/eslint.config.js`, `bbj-vscode/tsconfig.json`, `bbj-vscode/tsconfig.test.json`,
  `bbj-vscode/vitest.config.ts`, `bbj-vscode/package.json`, `.github/workflows/build.yml`,
  `.github/workflows/pr-validation.yml` — read in full this session.
- Scratch `eslint.config.js` (with `tseslint.configs.recommended` + D-01/D-02 overrides) run via
  `npx eslint -c ... src test -f json` against the live tree, twice (before/after `--fix`), producing
  the 74/61/52 counts above.
- Scratch `tsconfig.test.json` (two variants: standalone and `extends`-based) run via `npx tsc -p ...
  --noEmit`, producing the 441/453 counts and the per-file/per-code breakdown.
- `npx vitest list --filesOnly` (default config and two scratch configs) — 159-file set confirmed
  identical across all three.
- Two full `npx vitest run --reporter=json --outputFile=...` runs against the live tree (JSON parsed
  programmatically), producing the `numFailedTests`/failed-suite/timing evidence for TEST-07.
- A scratch `tsx` script instantiating `createBBjServices(EmptyFileSystem)` and
  `createBBjTestServices(EmptyFileSystem)`, timing `initializeWorkspace()` for each (7,292-7,512ms
  vs. 264ms) and inspecting `process._getActiveHandles()` to confirm a lingering open `Socket`.
- `bbj-vscode/src/language/bbj-ws-manager.ts`, `bbj-vscode/src/language/java-interop.ts`,
  `bbj-vscode/test/test-helper.ts`, `bbj-vscode/test/bbj-test-module.ts`,
  `bbj-vscode/test/commands-cjs-harness.ts` — read in full or in relevant part this session.
- `bbj-vscode/bbj-language-configuration.json`, `bbj-vscode/bbx-language-configuration.json`,
  `bbj-vscode/test/language-configuration.test.ts` — read in full; bbx entry counts computed via a
  `node -e` JSON.parse probe this session.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java`,
  `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java`,
  `bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java`,
  `.planning/todos/pending/2026-09-20-phase-97-code-review-follow-ups.md` — read in full this
  session.
- `node_modules/vscode-languageserver-types/lib/esm/main.d.ts` (lines 540-592) — read this session;
  `Diagnostic.getMessageString` compiled successfully against it in a scratch probe.
- `javap -public` output against
  `/home/coder/.m2/repository/org/eclipse/lsp4j/org.eclipse.lsp4j.jsonrpc/0.20.1/org.eclipse.lsp4j.jsonrpc-0.20.1.jar`
  — confirms `ServiceEndpoints.getSupportedMethods(Class<?>): Map<String, JsonRpcMethod>`.
- `gsd_run query package-legitimacy check --ecosystem npm @eslint-community/eslint-plugin-eslint-comments`
  — SUS verdict this session.

### Secondary (MEDIUM confidence)
- GitHub issues #574, #516, #519, #562, #629 (`gh issue view`, this session) — each cross-checked
  against the live tree's current state rather than taken at face value (e.g. #574's audit-time
  "two stray eslint-disable" evidence no longer matches the current tree; #629's own status comment
  confirms the bbj-side JSON-validity test already exists).
- `bbj-intellij/build.gradle.kts:34` (`plugin("com.redhat.devtools.lsp4ij:0.21.0")`) — read this
  session; establishes that `ServiceEndpoints` arrives transitively, but the exact test-classpath
  resolution was not independently gradle-compiled (see Assumption A1).

### Tertiary (LOW confidence)
- None — every claim above with a numeric count or root-cause attribution was reproduced this
  session; the two items not independently verified are explicitly logged in the Assumptions table.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependency; all versions read directly from `package.json`/lockfile.
- Architecture (hot-spot diagnosis): HIGH — root cause isolated by a controlled A/B measurement
  (real service vs. test double), not inference from reading code alone.
- Lint/type-check counts: HIGH — reproduced live against the current tree, superseding CONTEXT's
  2026-09-27 (pre-110-113) numbers.
- FIX-04 Java-side fixes: MEDIUM-HIGH — the bug location and the `ServiceEndpoints` API are verified;
  the exact `bbj-intellij` test-classpath resolution (Assumption A1) and the issue447 forced-fallback
  seam design (Open Question 1) are the two items needing a quick confirm during planning/execution.

**Research date:** 2026-09-27
**Valid until:** counts and line numbers are tied to commit `0b4ffdd4`; re-verify if Phase 115+ lands
first (unlikely per ROADMAP.md ordering) or if this phase's own execution spans more than ~7 days.
