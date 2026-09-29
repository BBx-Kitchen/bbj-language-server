# Audit Verification — Bucket C: Test Coverage & Interop Test Harness

Milestone v4.7 "Audit Hygiene Burn-down". Verified against current tree (branch
`gsd/v4.7-audit-hygiene-burndown`, identical in source to `origin/main`) on 2026-09-26.

## 1. Summary Table

| Issue | Title (short) | Verdict | Evidence | Remaining work | Size |
|---|---|---|---|---|---|
| #514 | Interop harness hardcodes `status: 'pass'` for cases 14 & 17 | STILL-OPEN | `bbj-vscode/tools/interop-test-harness/run-tests.ts:510,579,584` | Compute `failed` from `assertions.some(a => !a.passed)` like `:446,480,535,557` | S |
| #516 | `tsconfig.test.json`'s project reference cannot compile | STILL-OPEN | `bbj-vscode/tsconfig.test.json:7-9` (`references` to non-composite `tsconfig.json`) | Delete `references` block; add a `typecheck` script | S |
| #519 | `vitest.config.ts` declares no include/exclude | STILL-OPEN | `bbj-vscode/vitest.config.ts:4-29` (only `coverage`, no `test.include`/`exclude`) | Add explicit `include: ['test/**/*.test.ts']` + `exclude` | S |
| #528 | 3 `parser.test.ts` validation assertions stay disabled (P61-D5-003) | STILL-OPEN, DUPLICATE-OF #555 | `bbj-vscode/test/parser.test.ts:530-533,811-815,860-864` | Preload `String`/`BBjAPI` methods/`byte`/array types as synthetic classes, or explicitly document as blocked | M |
| #555 | Same 3 disabled assertions (P66-D5-001) | STILL-OPEN, DUPLICATE-OF #528 | Same 3 line ranges, byte-identical comments | Same as #528 — file/track as one issue | M |
| #559 | 11 interop-dependent `linking.test.ts` tests fail deterministically | STILL-OPEN, OVERLAPS pending todo `2026-09-20-linking-interop-failures-survive-class-warmup.md` | `bbj-vscode/test/linking.test.ts:295-447`; `bbj-vscode/test/bbj-test-module.ts:61-190` | Root cause differs from the issue's own diagnosis — see §2; preload missing fake classes OR wire a genuinely live-backed instance and rename the describe block | L |
| #560 | `JavaInteropTestService` never exercises real `java-interop.ts` connection/timeout/lock code | STILL-OPEN | `bbj-vscode/test/bbj-test-module.ts:160-175` (`connect`, `loadClasspath`, `loadImplicitImports`, `resolveClassByName` all overridden, never call base) | Build a controllable fake socket peer as new test infra | L |
| #562 | `initializeWorkspace()` sequential I/O can exceed vitest's 10s hook timeout | STILL-OPEN | `bbj-vscode/src/language/bbj-ws-manager.ts:136-227` (no `Promise.all`, no `hookTimeout` override) | Parallelize independent steps or raise `hookTimeout` | M |
| #563 | `main.ts`'s LSP handler logic has zero *execution* test coverage | STILL-OPEN (mitigated by structural/regex tests) | `bbj-vscode/src/language/main.ts:41-50,193-281` (handlers still inline); `test/config-path-resolution.test.ts`, `test/config-hot-reload-wiring.test.ts`, `test/setopts-in-code-request.test.ts` read `main.ts` as text, never execute it | Extract handler bodies into named exported functions taking `{shared, BBj, connection}`; unit-test against a synthetic fixture | L |
| #565 | `extension.ts`/`Commands.cjs` carry zero test coverage | PARTLY-FIXED | `test/extension-activation.test.ts` (imports `extension.ts`, mocks `vscode`, covers activation/command-registration/`client.start()` rejection — #531/#62-D2-004); `test/command-argv-injection.test.ts` tests only the extracted `process-args.ts` helpers; `Commands.cjs` itself still has 0 execution coverage (only source-text scans in `no-shell-command-construction.test.ts`) | Add `Commands.cjs`-execution coverage (CJS/vscode-mock loader problem still unsolved) | M |
| #574 | ESLint registers `@typescript-eslint` but enables 0 rules | STILL-OPEN | `bbj-vscode/eslint.config.js:16` (`rules: {}`, no `extends`) | Spread `...tseslint.configs.recommended`; fix ~214 newly-surfaced violations (measured, see §3) before merging | L |
| #575 | Interop harness type-checked/linted/tested by nothing, but is a CI trigger | STILL-OPEN | `bbj-vscode/tools/interop-test-harness/run-tests.ts` outside `tsconfig.json`/`tsconfig.test.json` includes and `eslint src test` scope; `tsx` undeclared in `package.json`; `.github/workflows/pr-validation.yml:11` still lists `bbj-vscode/tools/**` as a trigger path | Bring under `tsc`/`eslint` scope, declare `tsx`, add a run script | M |
| #596 | Interop harness JSON highlighter never matches escaped quotes | STILL-OPEN | `run-tests.ts:706-708` (`escapeHtml` before `syntaxHighlightJson`); regexes at `:602,605` require literal `"` | Highlight before escaping, or match `&quot;` | S |
| #599 | `criticalFields` (8 fields) defined but never read; gate hardcodes 3 fields | STILL-OPEN | `run-tests.ts:659` (unused array) vs `:1045` (hardcoded `['isStatic','isDeprecated','constructors']`) | Delete `:659` or derive `:1045`'s list from it | S |
| #601 | Header comment overstates gate coverage, omits `--timeout` flag | STILL-OPEN | `run-tests.ts:6` (claim) vs `:1045` (3-field gate); `:9-13` (options list) vs `:35` (`--timeout` accepted) | Correct `:6`; add `--timeout` to `:9-13` | S |
| #627 | 4 composer webview generator files have zero test coverage | FIXED | `test/webview-panel-lifecycle.test.ts:211-280` (dynamically discovers all `createWebviewPanel(` modules, executes `open*Panel` incl. `getHtml()`, asserts dispose/subscription lifecycle); `test/msgbox-composer-ui.test.ts`, `test/window-composer-validation-ui.test.ts`, `test/setopts-in-code-ui.test.ts` cover message→`WorkspaceEdit` paths for msgbox/addwindow/addchildwindow/setopts webviews | None blocking; CSP/nonce content itself is exercised but not asserted for specific security properties (nonce uniqueness, CSP directive strings) | — |
| #628 | 4 composer `*-ui.ts` command/CodeAction/CodeLens wiring files untested | PARTLY-FIXED | `test/msgbox-composer-ui.test.ts` fully covers `msgbox-composer-ui.ts` (real `registerMsgboxComposer` calls, CodeAction provider, commands); `addwindow-composer-ui.ts`, `addchildwindow-composer-ui.ts`, `setopts-composer-ui.ts` are still only ever `vi.mock`'d (never actually invoked) in `extension-activation.test.ts` and others | Add `*-composer-ui.test.ts` for the remaining 3 files (msgbox's is the template) | M |
| #629 | Neither language-configuration.json file's JSON validity/behavior is tested | PARTLY-FIXED | `test/language-configuration.test.ts:17-32` tests `bbj-language-configuration.json` strict-JSON validity + entry counts; no test anywhere references `bbx-language-configuration.json` | Add the same JSON-validity test for `bbx-language-configuration.json`; behavioral half (bracket/onEnter) still explicitly out of scope per the issue's own acceptance criteria | S |
| #635 | 2 functions hold 2/3 of harness lines; cases 12-17 duplicate the shared scaffold | STILL-OPEN | `run-tests.ts:256-592` (`defineTests`, 337 lines) + `:651-979` (`generateReport`, 329 lines); cases 12-17 (`:422-590`) still inline-reimplement what `runGetClassInfo` (`:154-193`) already generalizes for cases 1-11 | Generalize `runGetClassInfo` over request type; split the 219-line HTML/CSS template out of `generateReport` | M |
| todo `2026-09-20-linking-interop-failures-survive-class-warmup.md` | Root-cause investigation for the #559 failures | STILL-OPEN, SUPERSEDES #559's diagnosis | `.planning/todos/pending/2026-09-20-linking-interop-failures-survive-class-warmup.md` | See §2 — carry this file's root cause into whichever issue is kept | L |

## 2. Per-Issue Detail

**#514 — hardcoded `status: 'pass'`.** Claim: test cases 14 and 17 return a literal `'pass'`
instead of computing it from assertions. Current state: unchanged — `:510` (`status: 'pass'`),
`:579` (`status: 'pass'`) and `:584` (`status: 'pass', // Graceful error is a pass`) still bypass
the `assertions.some(a => !a.passed)` computation that cases 12/13/15/16 use. Testable fix: change
all three returns to compute `failed = assertions.some(a => !a.passed)` and return
`status: failed ? 'fail' : 'pass'`.

**#516 — invalid `tsconfig.test.json` project reference.** Claim: `references: [{path:
"tsconfig.json"}]` requires `tsconfig.json` to be `composite`/emitting, which it is not. Current
state: unchanged; `tsconfig.json` still has `noEmit: true` and no `composite`. Testable fix:
remove the `references` block from `tsconfig.test.json` and add an `npm run typecheck` script
running `tsc -p tsconfig.test.json --noEmit`, asserted to exit 0.

**#519 — `vitest.config.ts` has no `include`/`exclude`.** Claim: test discovery boundary is
undefined in the repo, resting on vitest's own defaults. Current state: unchanged; the `test`
block still only configures `coverage`. Testable fix: add `include: ['test/**/*.test.ts']` and
`exclude: ['out/**', 'node_modules/**']`; assert `npx vitest list --filesOnly` resolves the same
file set before/after.

**#528 / #555 — 3 disabled `parser.test.ts` assertions.** Both issues describe the identical
gap byte-for-byte (same 3 line numbers, same comment text). Current state: unchanged — the
substring-parse (`:530-533`), `BBjAPI()` method-chain (`:811-815`), and `String[]/byte[]`
field (`:860-864`) assertions are still commented out with the same "cannot be resolved in
EmptyFileSystem" rationale. Testable fix: either preload `java.lang.String` with a `charAt`-style
method set plus a minimal `BBjNamespace`/`BBjSemaphore` stub and `byte`/array primitive types into
`JavaInteropTestService`'s constructor (mirroring `createHashMapClass`), or explicitly convert the
3 commented lines into `test.skip(..., 'blocked: needs classpath')` calls so the gap is visible in
`npm test`'s own output instead of a silent comment.

**#559 — 11 interop-dependent `linking.test.ts` tests.** Claim (issue's own diagnosis): a bare
listener on `:5008` with no loaded classpath is insufficient; a real classpath-loaded peer is
needed. Current state: unchanged — the `describe.runIf(isInteropRunning)("Interop related
tests", ...)` block (`linking.test.ts:295-447`) is intact, still gated only on
`shouldRunBBjTests()`. **Important divergence:** the pending todo's investigation (dated
2026-09-20, closer to the ground truth) refutes the issue's own root-cause theory — it shows the
describe block never talks to whatever is on `:5008` at all, because `services` comes from
`createBBjTestServices(EmptyFileSystem)`, whose injected `JavaInteropTestService` hard-rejects
`connect()` unconditionally. So even a fully classpath-loaded real peer on `:5008` would not fix
these 11 tests — the fixture itself needs the missing classes (`java.util.Date`, `List`,
`LinkedList`, `Map`+`Map.Entry`, `java.sql.Date`, `java.lang.Boolean`) preloaded, or the block
needs rewiring to a genuinely live-backed services instance (as `issue447-real-interop.test.ts`
already does with `NodeFileSystem`). Testable fix: adopt the todo's fix, not the issue's — either
preload the 7 missing classes into `JavaInteropTestService`'s constructor, or convert this
`describe` to use a live-backed services instance and rename it away from the misleading
"Interop related tests" if it stays hermetic.

**#560 — `JavaInteropTestService` never exercises real connection/timeout/lock code.** Claim:
`connect()`, `loadClasspath()`, `loadImplicitImports()`, `resolveClassByName()` are all overridden
to reject/no-op/stub, so none of `java-interop.ts`'s real socket/timeout/lock-serialization code
is reachable from any currently-passing test. Current state: unchanged, confirmed at
`bbj-test-module.ts:160-175` — the double's own header comment now explicitly documents *why*
(avoiding a nondeterministic `EnvironmentTeardownError` from late console logs during teardown),
so this is a deliberate, documented hermetic design, not an oversight — but the coverage gap the
issue names is still real. Testable fix: build a controllable fake TCP/JSON-RPC peer (a scriptable
`net.Server` double) and add a new suite that exercises `java-interop.ts`'s connection lifecycle,
timeout, and lock-serialization against it directly, without going through
`JavaInteropTestService`.

**#562 — `initializeWorkspace()` sequential I/O.** Claim: independent `await`s are not
parallelized and no `hookTimeout` accommodates the worst case. Current state: unchanged;
`bbj-ws-manager.ts:136-227` still awaits directory read → per-folder `project.properties` reads
(sequential `for` loop) → javadoc init → `loadClasspath` → `loadImplicitImports`, and
`vitest.config.ts` sets no `hookTimeout`. Testable fix: wrap the classpath/implicit-import loads
and the independent javadoc-folder init in `Promise.all` where no data dependency exists, or set
an explicit `hookTimeout` in `vitest.config.ts` for this `beforeAll`.

**#563 — `main.ts` handler logic has 0 execution coverage.** Claim: `main.ts` cannot be imported
in tests because it calls `createConnection()` at module load, so its `bbj/refreshJavaClasses` and
`onDidChangeConfiguration` handlers are untested. Current state: the handlers are still defined
inline in `main.ts` (`:41-50`, `:193-281`), unchanged in shape. Since the issue was filed, three
test files (`config-path-resolution.test.ts`, `config-hot-reload-wiring.test.ts`,
`setopts-in-code-request.test.ts`) now `fs.readFileSync` `main.ts` and regex-match its source to
assert wiring exists (e.g. "notifyResolvedConfigPath called before AND after the gate") — these
are real regression guards against *removing* a call, but they never execute the handler bodies,
so a logic bug inside either handler (wrong config key, off-by-one, wrong branch) still passes
`npm test` undetected. Testable fix: extract both handler bodies into named exported functions
taking `{shared, BBj, connection}`, per the issue's own proposed approach, then unit-test them
against a synthetic fixture.

**#565 — `extension.ts`/`Commands.cjs` zero coverage.** Claim: no test imports either file; six
named regressions could ship silently. Current state: **`extension.ts` is now genuinely tested** —
`test/extension-activation.test.ts` imports `../src/extension.js` behind a full `vi.mock('vscode')`
and directly covers the unhandled `client.start()` rejection (#62-D2-004, now surfaced via
`showErrorMessage`), duplicate-activation-without-dispose throwing, and every registered command's
disposable landing in `context.subscriptions` (the leaked-disposables finding, #62-D2-003).
`test/command-argv-injection.test.ts` and `test/no-shell-command-construction.test.ts` cover the
shell-injection and argv-exposed-token findings, but only via the extracted pure modules
(`process-args.ts`) plus source-text scans — `Commands.cjs` itself is still never `require()`'d
under vitest (its own test file's header comment says so explicitly: a CJS file resolved by
Node's native loader can't see `vi.mock('vscode')`). Remaining gap is narrower than the original
issue: only `Commands.cjs`'s own exec-invoking command bodies (as opposed to the pure helpers it
calls) still have 0 execution coverage. Testable fix: as originally proposed, but scoped down —
find a loader strategy for `Commands.cjs` (e.g. a `vscode` shim registered in Node's module
resolution before `require`) or extract its remaining exec-invoking bodies into ESM-testable
functions the way `process-args.ts`/`process-runner.ts`/`target-resolution.ts` already were.

**#574 — ESLint enables 0 rules.** Claim: `rules: {}` with no `extends` means `npm run lint`
never fails on any TypeScript that parses. Current state: unchanged, confirmed at
`eslint.config.js:16`. Measured cheaply (temporary scratch config spreading
`...tseslint.configs.recommended`, deleted after measurement, never committed): running that
config against `src/` + `test/` reports **214 problems (213 errors, 1 warning)**, 10 auto-fixable.
This is the *non-type-checked* `recommended` preset only (`recommended-type-checked` would very
likely surface more, and was not measured — it requires `parserOptions.project` wiring and a
materially longer run, judged not cheap enough for this pass). Testable fix: spread
`...tseslint.configs.recommended` into `eslint.config.js`, then land a follow-up pass fixing the
~214 violations before merging with a clean `npm run lint`, per the issue's own acceptance
criteria.

**#575 — interop harness untyped/unlinted/untested, but a CI trigger.** Claim: `run-tests.ts`
sits outside both tsconfig includes and outside `eslint src test`'s scope, `tsx` is used
undeclared, and `pr-validation.yml` still triggers on changes under `bbj-vscode/tools/**`.
Current state: all four facts confirmed unchanged — `tsconfig.json` includes only `src/**/*.ts`,
`tsconfig.test.json` includes only `test/**/*`, `package.json`'s `lint` script is `eslint src
test`, `tsx` is absent from both `dependencies` and `devDependencies`, and
`pr-validation.yml:11` still lists `bbj-vscode/tools/**`. Testable fix: as proposed — bring
`run-tests.ts` under `tsc`/`eslint` coverage (own tsconfig or folded into `test/`), declare `tsx`,
add a package.json script.

**#596 — JSON highlighter never matches escaped quotes.** Claim: `escapeHtml` runs before
`syntaxHighlightJson`, so the key/string regexes (which require a literal `"`) never match.
Current state: unchanged — `:706` (`escapeHtml(JSON.stringify(r.request...))`) and `:708` (same
for response) both run before `:747`/`:751`'s `syntaxHighlightJson(...)` calls; the two quote-
anchored regexes at `:602` and `:605` are unchanged. Testable fix: reorder to highlight the raw
JSON string first, then escape only the non-tag text, or change both regexes to match `&quot;`.

**#599 — dead `criticalFields` list.** Claim: the 8-field array at `:659` is defined but never
read; the actual pass/fail gate at `:1045` hardcodes a different, shorter list. Current state:
unchanged — confirmed byte-identical at both line numbers. Testable fix: delete `:659`, or have
`:1045` derive its checked-field list from it (`criticalFields.some(cf => fc.field.includes(cf))`).

**#601 — stale header comment.** Claim: `:6` overstates gate coverage; `:9-13`'s options list
omits `--timeout`. Current state: unchanged on both counts — `parseArgs` at `:30-38` still accepts
`--timeout` (default `15000`), never mentioned in the `:9-13` usage block. Testable fix: correct
`:6` to name the actual 3 gated fields (or fix #599 first and update accordingly), add `--timeout`
to the usage block.

**#627 — composer webview generator files.** See table; now FIXED via a combination of a
generically-discovering lifecycle test plus per-composer dedicated tests. Note for the auditor:
this is the strongest "actually fixed" result in this batch — worth confirming closed.

**#628 — composer `*-ui.ts` wiring files.** msgbox-composer-ui.ts fully covered
(`test/msgbox-composer-ui.test.ts`, real `registerMsgboxComposer()` calls exercising the
`MsgboxCodeActionProvider`, all three label variants, and the `bbj.composeMsgbox`/
`bbj.composeMsgboxVisual` command handlers). The other three files named in the issue —
`addwindow-composer-ui.ts`, `addchildwindow-composer-ui.ts`, `setopts-composer-ui.ts` — are
`vi.mock()`'d away everywhere they appear (in `extension-activation.test.ts` etc.) and never
actually invoked; confirmed via a repo-wide grep for `registerAddWindowComposer`/
`registerAddChildWindowComposer`/`registerSetOptsComposer` outside `vi.mock` blocks, which
returns nothing. Testable fix: 3 new `*-composer-ui.test.ts` files following
`msgbox-composer-ui.test.ts`'s pattern.

**#629 — language-configuration.json test coverage.** `test/language-configuration.test.ts` now
exists and covers exactly the JSON-validity half of the issue's own acceptance criteria for
`bbj-language-configuration.json` (strict-JSON parse + a pinned per-collection entry count, framed
explicitly as the P62-D2-006 regression guard). `bbx-language-configuration.json` has no test
anywhere (confirmed via repo-wide grep). The behavioral half (bracket matching, auto-closing,
`onEnterRules`) remains unaddressed for both files, which the issue's own acceptance criteria
already scoped out pending new integration-test infrastructure. Testable fix: add the same
2-assertion JSON-validity test for `bbx-language-configuration.json`.

**#635 — two functions hold 2/3 of the harness; duplicated scaffold.** Claim:
`defineTests`/`generateReport` are 666 of 1,058 lines; cases 12-17 duplicate `runGetClassInfo`'s
scaffold instead of reusing it (which is how #514's bug happened). Current state: unchanged —
line counts and structure confirmed identical (`defineTests` `:256-592`, `generateReport`
`:651-979`); cases 12-17 (`:422-590`) are still inline `async` closures, not delegating to
`runGetClassInfo`. Testable fix: generalize `runGetClassInfo` over the request type
(`getClassInfo`/`getClassInfos`/`getTopLevelPackages`/`loadClasspath`) so all 17 cases share one
scaffold; split the 219-line HTML/CSS template literal out of `generateReport` into its own file.

**Pending todo (`2026-09-20-linking-interop-failures-survive-class-warmup.md`).** This is the
higher-fidelity investigation superseding #559's own root-cause claim — see the #559 entry above.
It also explicitly states it did **not** touch `shouldRunBBjTests()`'s bare-TCP-connect false
positive (a separate, still-open debt item), so that remains untouched by anything in this batch.

## 3. Grouping Suggestion for Phases

**Phase A — Interop test harness hygiene (small, mechanical, all in
`run-tests.ts`).** #514, #596, #599, #601, #635, #575. All touch the same single file (plus
`tsconfig`/`eslint`/`package.json` wiring for #575); doing them together avoids re-reading the
same 1,058-line file five times, and #635's refactor (generalizing `runGetClassInfo`) is the
natural place to also fix #514's duplicated-and-wrong scaffold copies. Do #575 (bring the file
under tsc/eslint/a run script) LAST in this group so the mechanical fixes land before lint/tsc
scope is turned on and has to pass against them.

**Phase B — Build/lint configuration hygiene (independent, low-risk, config-only).** #516, #519,
#574. Each is a single config file. #574 is the only one with a non-trivial tail (the ~214
measured violations across `src`+`test` need an actual fix pass, sized L overall even though the
config edit itself is one line) — consider splitting #574 into its own phase or its own plan
within this phase so the violation-fixing doesn't block #516/#519 from shipping quickly.

**Phase C — Interop test fixture / real coverage gaps (test-infrastructure investment, higher
risk, needs a design decision first).** #559 (supersede with the pending todo's diagnosis, not the
issue's own), #560, #563. These three share a root cause shape (the `JavaInteropTestService`
double's deliberate hermeticity vs. real-code-path coverage) and a design choice each requires
before implementation: whether to extend the fake/preload classes vs. build a real fake-socket
peer vs. extract handler bodies out of `main.ts`. Recommend a short design note before planning
this phase, since #560's "controllable fake socket peer" could become the shared infrastructure
#559's live-backed alternative also wants.

**Phase D — Composer/webview coverage cleanup (small, mechanical, template exists).** #628
(the 3 remaining `*-ui.ts` files, using `msgbox-composer-ui.test.ts` as the template) and #629
(one file, ~10-line addition mirroring the existing `bbj-language-configuration.json` test).
#527 is already effectively closed — recommend confirming and closing rather than re-planning.

**Duplicates to resolve before/alongside planning (not phase work):** #528 and #555 are the same
finding; close one as a duplicate of the other before this milestone's issue count is used for
sizing. #559 and the pending todo overlap; the todo's diagnosis should be treated as authoritative
and either merged into #559 or #559 closed in favor of a fresh issue reflecting the corrected root
cause, so whoever picks up Phase C does not start from the issue's now-refuted theory.
