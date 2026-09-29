# Phase 115: Honest Interop Test Harness - Research

**Researched:** 2026-09-28
**Domain:** TypeScript CLI test-harness hygiene (JSON-RPC over TCP, HTML report generation, vitest/ESLint/tsc scope extension)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Case outcomes (HARN-01)**
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

**Gate and critical fields (HARN-04, HARN-05)**
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

**Scaffold and report (HARN-03, HARN-06)**
- **D-09:** Generalise `runGetClassInfo` over the request type, so all 17 cases (including
  12-17, which duplicate it today) go through one request scaffold. That scaffold does the
  timing, the try/catch, the status derivation and the result shape. Per the roadmap, this is
  the first step, because the duplicated scaffold is how #514 happened.
- **D-10:** Fix the JSON highlighter so keys and string values get `json-key`/`json-string`
  spans, including values with escaped quotes (#596).
- **D-11:** Split `defineTests` and `generateReport` into smaller functions.

**Layout and tooling (HARN-02, DEP-03)**
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

**Harness tests in CI (HARN-02)**
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

**Plan ordering**
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

### Deferred Ideas (OUT OF SCOPE)
None: the discussion stayed within phase scope.

Reviewed but not folded in: 2026-09-20-linking-interop-failures-survive-class-warmup.md (Phase
116, TEST-05); 2026-09-26-intellij-interop-initoptions-key-mismatch.md (unscheduled);
2026-09-26-signature-help-and-snippet-peer-name-escaping.md (unscheduled);
2026-09-27-windows-intellij-node-download-progress-check.md (unrelated Windows re-check).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HARN-01 | No harness test case hard-codes `status: 'pass'`; every case reports its real assertion result (#514) | Confirmed exact lines (`:510`, `:579`, `:584`) via source read; scaffold generalisation (D-09) plus per-case disjunction assertions (D-01..D-04) fix all three false "either A or B" cases and the two hard-coded passes. See Architecture Patterns → Pattern 1, Common Pitfalls → Pitfall 1. |
| HARN-02 | The interop test harness is type-checked, linted and tested in CI (#575) | `build.yml` already runs `lint`, `typecheck:test` and `test` on every PR with no path filter — no new CI step needed once `tools/interop-test-harness` joins the `lint` script (D-13) and `tsconfig.test.json`'s include (D-14), and a `test/interop-harness.test.ts` is added (D-18). See Standard Stack, Architecture Patterns → Pattern 3. |
| HARN-03 | The harness JSON highlighter handles escaped quotes, so key and string colouring works (#596) | Root cause verified at `:596-598`/`:706-708`: `escapeHtml` converts `"` → `&quot;` **before** `syntaxHighlightJson`'s quote-anchored regexes run, so they never match anything. Fix ordering or regex target (D-10). See Common Pitfalls → Pitfall 2. |
| HARN-04 | The pass/fail gate checks exactly the declared `criticalFields` list (#599) | Verified two independent field lists exist: report's display-only 8-field array (`:659`) vs. the exit gate's live-but-different 3-field `includes()` check (`:1041-1047`). Unify into one exported `CRITICAL_FIELDS` (D-05, D-06). See Architecture Patterns → Pattern 2. |
| HARN-05 | The harness header comment describes the fields the gate really checks and documents `--timeout` (#601) | Header (`:2-14`) documents 3 CLI flags; `parseArgs` (`:30-38`) accepts a 4th, `--timeout`. Rewrite header per D-08 once D-05/D-06 land, so the comment can honestly describe the merged gate. |
| HARN-06 | The six duplicated test-case scaffolds use the harness's existing helper, and the two oversized functions are split (#635) | `defineTests` (:256-592, 337 lines) and `generateReport` (:651-979, 329 lines, 219 of which is one template literal) hold 666 of 1,058 lines. Cases 12-17 re-implement `runGetClassInfo`'s scaffold inline (~180 duplicated lines). D-09/D-11/D-12 address this via module split. |
| DEP-03 | The interop test harness runs through a pinned, declared `tsx` dependency instead of an unpinned `npx tsx` install (#520) | `tsx` is presently only an *optional peer* of `vite` in `package-lock.json` (line 5622/5656) — no `node_modules/tsx` exists, confirmed by an empty grep for `"node_modules/tsx"`. Latest registry version verified via `npm view tsx version` = `4.23.15` (published 2026-09-20). Add as an exact-pinned devDependency (D-15) and switch the entry point to an npm script (D-16). |

</phase_requirements>

## Summary

The interop test harness (`bbj-vscode/tools/interop-test-harness/run-tests.ts`, 1,058 lines) is a
single self-contained TypeScript CLI script: it connects over a real TCP socket to a live
java-interop peer (`localhost:5008` by default) using `vscode-jsonrpc/node`, runs 17 hard-coded
test cases against 4 RPC methods, and writes a self-contained HTML report. It sits entirely
outside every quality gate this project runs (`tsconfig.json`, `tsconfig.test.json`,
`npm run lint`, `npm test`) despite `pr-validation.yml` treating `bbj-vscode/tools/**` as a CI
trigger — verified: no `.test.ts`/`.spec.ts` file exists under `tools/`, and `tsx` (its
documented entry point) is not declared as a project dependency at all.

Every fix in this phase is mechanical and self-contained to one file (`run-tests.ts`) plus
`package.json`/`tsconfig.test.json`/`eslint.config.js`. Nothing in `src/` changes. The work
divides cleanly into: (1) a shared request scaffold generalised to cover all 17 cases, replacing
six hand-rolled duplicates and two hard-coded `status: 'pass'` returns; (2) one canonical
`CRITICAL_FIELDS` list read by both the report and the exit-code gate, matched by exact final
path segment instead of `String.includes()`; (3) an escape-then-highlight ordering bug in the
HTML report's JSON colouriser; (4) a module split (scaffold / cases / gate / report builder /
template strings / thin CLI) so the file can be type-checked and linted like `src/`; (5) a pinned
`tsx` devDependency and an npm script replacing the `npx tsx` shebang; (6) a new in-process fake
JSON-RPC **server** (not to be confused with the existing `test/fake-interop-peer.ts`, which fakes
the language server's own *client*-side socket for a different class) that drives the harness's
real client code through all 17 cases with no live `:5008` dependency.

**Primary recommendation:** Fix the shared scaffold and case assertions first (D-09, D-01..D-04),
then the gate/highlighter/header (D-05..D-08, D-10), then split the file into library modules plus
a thin CLI (D-12), and only then turn on `npm run lint`'s and `typecheck:test`'s coverage of
`tools/interop-test-harness` (D-13/D-14) — turning the gates on before the mechanical fixes means
fixing lint/type errors twice.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| JSON-RPC request/response scaffold (timing, try/catch, status derivation) | Dev-tooling CLI (tools/) | — | Pure logic, no I/O beyond the injected `MessageConnection`; belongs in a side-effect-free library module per D-12. |
| Critical-field gate (pass/fail, exit code) | Dev-tooling CLI (tools/) | — | Consumes `TestResult[]` only; must be a pure function so unit tests (D-17) can drive it without a socket. |
| HTML report generation (template, highlighter, matrix) | Dev-tooling CLI (tools/) | — | Pure string-building from `TestResult[]`/`MatrixRow[]`; the template literal itself is data, not logic (D-12 requires it in its own type-checked module with no runtime file lookup). |
| CLI entry (`parseArgs`, socket connect, `main()`) | Dev-tooling CLI (tools/) | — | The only place allowed to touch argv, the network, `process.exit`, or the filesystem (D-12). |
| Fake JSON-RPC server for tests | Test infrastructure (test/) | — | New: a `net.createServer` + `vscode-jsonrpc` server-side connection, exercising the harness's real client code without a live peer (D-17). Distinct from `test/fake-interop-peer.ts`, which fakes `JavaInteropService`'s client socket, not a server. |
| Live java-interop peer (bbj-ls / legacy java-interop) | External service (out of scope) | — | The harness is a client of this peer; the peer's own protocol/DTO shapes are out of scope for this phase (they live in the separate `bbj-ls` repo per project convention). |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `tsx` | `4.23.15` (exact pin) `[VERIFIED: npm registry — npm view tsx version, run this session]` | Runs the TypeScript CLI harness directly (esbuild-based TS execution) without a separate compile step | Already the project's documented (but undeclared) way to run the harness; industry-standard zero-config TS runner, no alternative under discussion in CONTEXT.md |
| `vscode-jsonrpc` | `^8.2.1` (already a `bbj-vscode` dependency) `[VERIFIED: bbj-vscode/package.json:711, and installed version confirmed at node_modules/vscode-jsonrpc/package.json]` | JSON-RPC 2.0 over the raw TCP socket, both client (harness) and, newly, server (test fake) | Already used identically by production `java-interop.ts` and by `test/fake-interop-peer.ts`'s connection layer; no new dependency needed for the server side — `createMessageConnection`/`SocketMessageReader`/`SocketMessageWriter`/`onRequest` are all present in the installed 8.2.1 `node/main.d.ts` (confirmed this session) |
| `vitest` | `^4.1.10` (already installed) | Runs the new `test/interop-harness.test.ts` | Existing project-wide test runner; no new tooling |
| `typescript-eslint` / `eslint` | `^8.69.0` / `^10.11.0` (already installed) | Lints the harness under the same `src` rule set | `eslint.config.js` already applies `tseslint.configs.recommended` (including `no-explicit-any`) tree-wide except for the `test/**` override; extending the lint CLI's directory list (D-13) needs no config changes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `net` (Node builtin) | Node 22+ (project `engines.node`) | `net.createServer`/`Socket` for both the CLI's real connection and the test fake's in-process server | Already used by `run-tests.ts`'s `connect()` and by `test/fake-interop-peer.ts` |
| `node:util` `parseArgs` | Node builtin | CLI flag parsing, unchanged from today | Already in use at `run-tests.ts:19,30`; keep, just move behind the CLI entry point (D-12) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reusing `JavaClass`/`JavaMethod`/`JavaField` from `src/language/generated/ast.ts` as the harness's response DTOs | Small harness-local DTO interfaces mirroring the raw wire shape | **Rejected.** Verified (`src/language/generated/ast.ts:1330,1358,1390` vs. `src/language/java-interop.ts:1208-1241`) that the wire field is `isDeprecated` while the AST field is `deprecated` — production code explicitly remaps this on every DTO. Reusing the AST types would silently mistype the harness's own `isDeprecated` field checks. See Common Pitfalls → Pitfall 3. |
| A brand-new test-only fake-interop module reusing `test/fake-interop-peer.ts` | A new, separate in-process `net` server built for this phase | `fake-interop-peer.ts` fakes `JavaInteropService`'s **client**-side socket (it overrides `createSocket()`/`wrapSocket()` inside the language server's own service) — it never opens a real socket. The harness is itself a raw TCP client with no service class to subclass, so D-17 explicitly calls for a real (loopback) `net.createServer` the harness dials into, which is new work, not a reuse of the existing fake. |

**Installation:**
```bash
cd /home/coder/repos/bbj-language-server/bbj-vscode
npm install --save-dev --save-exact tsx@4.23.15
```

**Version verification:** Ran this session:
```
$ npm view tsx version
4.23.15
$ npm view tsx time.modified
2026-09-20T07:22:18.060Z
$ npm view tsx scripts.postinstall
(empty — no postinstall script)
```
`node_modules/tsx` does not currently exist in this checkout, and `package-lock.json` contains
`tsx` only as an *optional peer dependency* of `vite` (`"tsx": "^4.8.1"` under
`node_modules/vite`'s `peerDependencies`/`peerDependenciesMeta`, both `optional: true`) — it is
not resolved into the tree today. `[VERIFIED: bbj-vscode/package-lock.json:5622,5656]`

## Package Legitimacy Audit

| Package | Registry | Age (latest ver.) | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `tsx` | npm | latest `4.23.15` published 8 days before this research (2026-09-20) | 102,667,225/week | `github.com/privatenumber/tsx` | `[SUS]` — flagged `too-new` by the legitimacy seam (checks recency of the *latest published version*, not package age) | **Flagged — planner must add a `checkpoint:human-verify` task before `npm install`.** `npm view tsx scripts.postinstall` returned empty (no postinstall script) and the repo/download-count signals are those of an extremely well-established package (100M+ weekly downloads); the `SUS` verdict here is a false-positive artifact of the recency heuristic, not a supply-chain red flag, but per protocol it must still be gated behind human confirmation rather than silently upgraded to OK. |

**Packages removed due to `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** `tsx` — see above; gate the `npm install --save-exact tsx@4.23.15` step behind `checkpoint:human-verify`.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────────────────────┐
                    │  run-tests.ts (thin CLI — D-12)              │
                    │  parseArgs() → { host, port, timeout, ... }  │
                    └───────────────┬───────────────────────────────┘
                                    │ main()
                                    ▼
                    ┌─────────────────────────────────────────────┐
                    │  connect(host, port, timeout)                │
                    │  net.Socket → vscode-jsonrpc                 │
                    │  createMessageConnection(...)                │
                    └───────────────┬───────────────────────────────┘
                                    │ MessageConnection
                                    ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │  cases.ts — defineTests(conn): 17 case definitions                  │
   │  each case: { requestType, params, name, validate(result,           │
   │               checks, assertions) }                                 │
   └───────────────────────────┬──────────────────────────────────────────┘
                                │ for each case
                                ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │  scaffold.ts — runRequest(conn, type, params, name, validate,        │
   │                            { acceptRejection? })          (D-09)     │
   │    try:   sendRequest → validate() fills fieldChecks/assertions      │
   │           → status = fail if any check/assertion failed, else pass   │
   │    catch: if acceptRejection(err) → status decided by assertion      │
   │           else → status = 'error'  (no response at all)   (D-04)     │
   └───────────────────────────┬──────────────────────────────────────────┘
                                │ TestResult[]
                    ┌───────────┴────────────┐
                    ▼                        ▼
   ┌───────────────────────────┐  ┌───────────────────────────────────┐
   │  gate.ts (D-05,D-06,D-07)  │  │  report.ts + report-template.ts    │
   │  CRITICAL_FIELDS (8)       │  │  (D-10, D-11, D-12)                │
   │  exact-final-segment match │  │  syntaxHighlightJson (highlight    │
   │  present && typeMatch      │  │  BEFORE escape, or match &quot;)   │
   │  → exit code 0/1/2         │  │  → report.html                    │
   └───────────────────────────┘  └───────────────────────────────────┘

   Test-only path (D-17, no :5008 needed):
   ┌────────────────────────────────────────────────────────────────────┐
   │  test/interop-harness.test.ts                                       │
   │  fakeServer = net.createServer(socket => {                          │
   │    const conn = createMessageConnection(                            │
   │      new SocketMessageReader(socket), new SocketMessageWriter(socket))│
   │    conn.onRequest(getClassInfoRequest, handler); conn.listen(); })   │
   │  fakeServer.listen(0, '127.0.0.1') → harness connect()s to it        │
   └────────────────────────────────────────────────────────────────────┘
```

### Recommended Project Structure
```
bbj-vscode/tools/interop-test-harness/
├── run-tests.ts          # thin CLI: parseArgs() + main() only (D-12)
├── types.ts              # TestStatus, FieldCheck, Assertion, TestResult, MatrixRow,
│                          # and the harness-local wire DTOs (ClassInfoDto, MethodDto,
│                          # FieldDto, ParameterDto) — NOT the generated AST types (Pitfall 3)
├── scaffold.ts            # runRequest() generalised over RequestType (D-09), checkField,
│                          # assert, typeOf, countWhere, CRITICAL_FIELDS (D-05)
├── cases.ts               # defineTests(conn): all 17 cases via the shared scaffold
├── gate.ts                # pass/fail + exit-code derivation, reading CRITICAL_FIELDS (D-06,D-07)
├── report-template.ts     # exported CSS + HTML page-shell strings only, no logic (D-12)
├── report.ts              # generateReport() split into smaller functions (D-11): buildSummaryBar,
│                          # buildMatrixHtml, buildTestSections, syntaxHighlightJson (D-10),
│                          # escapeHtml, truncateJson, statusBadge
└── report.html            # generated output, already gitignored (.gitignore:22)

bbj-vscode/test/
└── interop-harness.test.ts  # D-17/D-18: in-process fake net server + pure-function unit tests
```
File names are Claude's discretion (CONTEXT.md); this layout is a concrete default satisfying
D-12's "side-effect-free library modules + thin CLI" split.

### Pattern 1: Generalised request scaffold with an opt-in rejection contract
**What:** One function, `runRequest<P, R>(conn, requestType, params, testName, validate,
options?)`, replaces `runGetClassInfo` (today: hard-coded to `getClassInfoRequest`) and the six
inline duplicates for `getClassInfos`/`getTopLevelPackages`/`loadClasspath` (cases 12-17).
**When to use:** Every one of the 17 cases, including the two that today bypass any scaffold.
**Example (based on the existing `runGetClassInfo`, `bbj-vscode/tools/interop-test-harness/run-tests.ts:154-193`):**
```typescript
// Source: derived from run-tests.ts:154-193 (existing runGetClassInfo), generalised per D-09
interface RequestOptions<R> {
    /** D-04's one opt-in exception (case 17): when true for a caught error, the case is NOT
     *  an 'error' — instead a synthetic result is handed to `validate` so an assertion can
     *  decide pass/fail from the rejection itself (e.g. "was it a clean ResponseError?"). */
    acceptRejection?: (err: unknown) => boolean;
    onRejection?: (err: unknown) => R;
}

async function runRequest<P, R>(
    conn: MessageConnection,
    requestType: RequestType<P, R, null>,
    params: P,
    testName: string,
    validate: (result: R | undefined, checks: FieldCheck[], assertions: Assertion[], rejected: boolean) => void,
    options: RequestOptions<R> = {},
): Promise<TestResult> {
    const start = performance.now();
    try {
        const result = await conn.sendRequest(requestType, params);
        const duration = performance.now() - start;
        const fieldChecks: FieldCheck[] = [];
        const assertions: Assertion[] = [];
        validate(result, fieldChecks, assertions, false);
        const failed = fieldChecks.some(c => !c.present || !c.typeMatch) || assertions.some(a => !a.passed);
        return { name: testName, method: requestType.method, status: failed ? 'fail' : 'pass',
            request: params, response: result, fieldChecks, assertions, durationMs: duration };
    } catch (err: unknown) {
        const duration = performance.now() - start;
        if (options.acceptRejection?.(err)) {
            const fieldChecks: FieldCheck[] = [];
            const assertions: Assertion[] = [];
            const synthetic = options.onRejection?.(err);
            validate(synthetic, fieldChecks, assertions, true);
            const failed = assertions.some(a => !a.passed);
            return { name: testName, method: requestType.method, status: failed ? 'fail' : 'pass',
                request: params, response: null, fieldChecks, assertions, durationMs: duration,
                errorMessage: err instanceof Error ? err.message : String(err) };
        }
        return { name: testName, method: requestType.method, status: 'error',
            request: params, response: null, fieldChecks: [], assertions: [], durationMs: duration,
            errorMessage: err instanceof Error ? err.message : String(err) };
    }
}
```
Note `D-06`'s tightened gate condition above: `!c.present || !c.typeMatch` (was
`!c.present && c.expected !== 'undefined'` in the original `runGetClassInfo` at `:168`) — the
original scaffold already under-checked type mismatches, not just the exit-gate's separate
3-field list.

### Pattern 2: Single source of truth for critical fields, matched by exact final segment
**What:** `CRITICAL_FIELDS` exported once (D-05), consumed identically by the report's matrix and
by the gate.
**When to use:** Anywhere the harness needs to know "is this an LS-critical field."
**Example:**
```typescript
// Source: derived from run-tests.ts:659 (report's dead list) and :1045 (gate's live list), unified per D-05/D-06
export const CRITICAL_FIELDS = [
    'isStatic', 'isDeprecated', 'constructors', 'name',
    'returnType', 'type', 'parameters', 'packageName',
] as const;
export type CriticalField = typeof CRITICAL_FIELDS[number];

function finalSegment(fieldPath: string): string {
    const idx = fieldPath.lastIndexOf('.');
    return idx === -1 ? fieldPath : fieldPath.slice(idx + 1);
}

function isCriticalFieldCheck(fc: FieldCheck): boolean {
    return (CRITICAL_FIELDS as readonly string[]).includes(finalSegment(fc.field));
}

// Gate (D-06): present AND right type
function criticalFieldsPass(results: TestResult[]): boolean {
    return !results.some(r =>
        r.status !== 'error' &&
        r.fieldChecks.some(fc => isCriticalFieldCheck(fc) && !(fc.present && fc.typeMatch)));
}
```
This directly fixes the bug named in #599: today's exit-gate check
(`['isStatic', 'isDeprecated', 'constructors'].some(cf => fc.field.includes(cf))`,
`run-tests.ts:1045`) also matches `returnType` (contains `type`) and `packageName` (contains
`name`) via substring, not exact-segment, matching.

### Pattern 3: Harness-local wire DTOs, not the generated Langium AST types
**What:** Define small interfaces in the harness matching the *raw peer wire shape* — do not
import `JavaClass`/`JavaMethod`/`JavaField` from `src/language/generated/ast.ts`.
**When to use:** Typing `conn.sendRequest(...)`'s generic `R` parameter and the `validate*Fields`
helpers, to satisfy D-13's `no-explicit-any`.
**Why (verified this session):**
```typescript
// src/language/generated/ast.ts:1325-1335 (JavaClass) and :1354-1361 (JavaField) — read this session
export interface JavaClass extends Class, Documented {
    ...
    deprecated: boolean;   // NOT isDeprecated
    ...
}
export interface JavaField extends Documented, NamedElement {
    ...
    deprecated: boolean;   // NOT isDeprecated
    isStatic: boolean;
    ...
}
```
```typescript
// src/language/java-interop.ts:1208-1241 — read this session
// Map Java DTO naming (isDeprecated) to Langium type naming (deprecated) for the class itself
javaClass.deprecated = (javaClass as unknown as { isDeprecated?: boolean }).isDeprecated ?? false;
...
field.deprecated = (field as unknown as { isDeprecated?: boolean }).isDeprecated ?? false;
...
method.deprecated = (method as unknown as { isDeprecated?: boolean }).isDeprecated ?? false;
...
constructor.deprecated = (constructor as unknown as { isDeprecated?: boolean }).isDeprecated ?? false;
```
Production code explicitly remaps the wire's `isDeprecated` to the AST's `deprecated` on every
DTO. The harness talks to the raw wire (it never goes through `resolveClass()`), so its field
checks are already written against `isDeprecated` (`validateClassFields`,
`validateMethodFields`, `validateFieldFields` at `run-tests.ts:195-217`, and `CRITICAL_FIELDS`
itself). Reusing the AST types for the harness's DTOs would either force an incorrect `deprecated`
field name into the harness's checks, or require an `as unknown as` cast that defeats the whole
point of D-13's typing requirement. Define local types instead:
```typescript
export interface ClassInfoDto {
    name?: string; packageName?: string; error?: string;
    fields?: FieldInfoDto[]; methods?: MethodInfoDto[]; constructors?: MethodInfoDto[];
    isDeprecated?: boolean;
}
export interface MethodInfoDto {
    name?: string; returnType?: string; parameters?: ParameterInfoDto[];
    isStatic?: boolean; isDeprecated?: boolean;
}
export interface FieldInfoDto {
    name?: string; type?: string; isStatic?: boolean; isDeprecated?: boolean;
}
export interface ParameterInfoDto { name?: string; type?: string; }
```
All fields optional, mirroring that the whole point of the harness is to check whether the peer
actually sent them.

### Pattern 4: In-process fake JSON-RPC server (new pattern, not in codebase today)
**What:** A real (loopback) `net.createServer` wrapped with `vscode-jsonrpc`'s
`createMessageConnection`/`SocketMessageReader`/`SocketMessageWriter` on the **server** side,
with `conn.onRequest(...)` stubs for the 4 methods — the harness's *real* `connect()`/`sendRequest`
client code dials into it exactly as it would dial `:5008`.
**When to use:** `test/interop-harness.test.ts` (D-17/D-18), so CI drives all 17 cases through the
real scaffold and gate with zero live-peer dependency.
**Why this is not the same as `test/fake-interop-peer.ts`:** That file (read this session,
`bbj-vscode/test/fake-interop-peer.ts:111-147`) overrides `JavaInteropService.createSocket()`/
`wrapSocket()` — it fakes the **client**-side socket construction of a different class
(`JavaInteropService`), and its `wrapSocket()` returns a hand-built object satisfying only the
`MessageConnection` methods that class happens to call (`listen`, `dispose`, `onClose`, `onError`,
`sendRequest`) — it never opens a real socket. The harness has no such service class to subclass;
it is itself the raw `net.Socket` + `vscode-jsonrpc` client. D-17 requires a genuine server:
```typescript
// New pattern — no direct precedent in this codebase; API surface confirmed installed and typed
// this session (node_modules/vscode-jsonrpc 8.2.1: lib/node/main.d.ts exports
// createMessageConnection/SocketMessageReader/SocketMessageWriter;
// lib/common/connection.d.ts:304-316 exports MessageConnection.onRequest overloads)
import { createServer, type Server } from 'node:net';
import { createMessageConnection, SocketMessageReader, SocketMessageWriter } from 'vscode-jsonrpc/node.js';

function startFakeInteropServer(handlers: {
    getClassInfo: (params: { className: string }) => unknown;
    getClassInfos: (params: { packageName: string }) => unknown;
    getTopLevelPackages: () => unknown;
    loadClasspath: (params: { classPathEntries: string[] }) => unknown | Promise<never>;
}): Promise<{ server: Server; port: number }> {
    return new Promise((resolve) => {
        const server = createServer(socket => {
            const conn = createMessageConnection(
                new SocketMessageReader(socket),
                new SocketMessageWriter(socket),
            );
            conn.onRequest(getClassInfoRequest, (p) => handlers.getClassInfo(p));
            conn.onRequest(getClassInfosRequest, (p) => handlers.getClassInfos(p));
            conn.onRequest(getTopLevelPackagesRequest, () => handlers.getTopLevelPackages());
            conn.onRequest(loadClasspathRequest, (p) => handlers.loadClasspath(p));
            conn.listen();
        });
        server.listen(0, '127.0.0.1', () => {
            const address = server.address();
            resolve({ server, port: typeof address === 'object' && address ? address.port : 0 });
        });
    });
}
```
The harness's own `connect(host, port, timeout)` (`run-tests.ts:133-150`) is reused unmodified —
the test just points it at `127.0.0.1:<ephemeral port>` instead of `5008`.

### Anti-Patterns to Avoid
- **Substring field matching (`String.includes()`):** produces false positives when one critical
  field name is a substring of another (`type` ⊂ `returnType`, `name` ⊂ `packageName`) — verified
  root cause of #599. Always match on the exact final path segment (Pattern 2).
- **Escaping before highlighting:** any HTML-escape pass that runs before a regex looking for a
  literal `"` silently defeats that regex — verified root cause of #596. Either highlight first
  (then escape only the already-wrapped text nodes) or make the highlighter's regexes match the
  escaped form (`&quot;`) — both are explicitly allowed per D-10/Claude's Discretion.
- **A source-text guard test for the header comment:** Phase 114 already established the
  project's stance against text-scanning "guard" tests (see 114-05's disable-directive guard,
  which checks *behavior* via ESLint's own linting, not string matching); D-08 explicitly forbids
  one here too.
- **Reusing the generated Langium AST types as wire DTOs:** see Pattern 3 — `deprecated` vs.
  `isDeprecated` is a real, verified naming mismatch, not a stylistic choice.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| A TCP-socket-backed fake JSON-RPC server for tests | A hand-rolled duck-typed `MessageConnection` object (as `fake-interop-peer.ts` does for a different purpose) | A real `net.createServer` + the project's already-installed `vscode-jsonrpc` server APIs (`createMessageConnection`, `SocketMessageReader`/`Writer`, `conn.onRequest`) | The harness's own client code (`connect()`, `conn.sendRequest`) is real socket + real JSON-RPC framing; a hand-rolled fake would only prove the scaffold logic works against a fake that isn't exercising the actual wire protocol the harness ships with. The real library already does exactly this on both ends and is already a project dependency. |
| Running a pinned TypeScript file without a build step | A custom `ts-node`-style loader, or transpiling `run-tests.ts` into the `esbuild.mjs` bundle pipeline | `tsx` (already the documented, if undeclared, approach) | `tsx` is the de facto standard zero-config TS runner (100M+ weekly downloads); nothing about this phase's scope calls for folding the harness into the extension's own bundle. |

**Key insight:** every "don't hand-roll" case here is really "don't hand-roll it *twice*" — the
project already has both `vscode-jsonrpc` (used identically on the client side already) and `tsx`
(used undeclared already) as the correct tools; the fixes are about making existing choices
explicit and complete, not introducing new tooling.

## Common Pitfalls

### Pitfall 1: A generalised scaffold that "fixes" the gate condition too loosely
**What goes wrong:** If the new `runRequest` keeps the *original* `runGetClassInfo`'s field-check
condition (`!c.present && c.expected !== 'undefined'`, `run-tests.ts:168`) instead of tightening
it to D-06's `present && typeMatch`, a field that's present but the wrong type (e.g., `type:
123` instead of a string) still reports `pass`.
**Why it happens:** The existing scaffold already conflates "field missing" with "field wrong
type" — copying it forward without re-deriving from D-06 silently perpetuates the gap.
**How to avoid:** Derive the scaffold's own per-case `failed` condition from the same
`present && typeMatch` rule the gate uses (Pattern 1's code sample already does this).
**Warning signs:** A case's field-check table shows a ✗ in the "Type Match" column but the case's
overall badge still shows PASS.

### Pitfall 2: Fixing the highlighter only for the common case, not escaped quotes specifically
**What goes wrong:** A fix that reorders `escapeHtml`/`syntaxHighlightJson` but doesn't handle a
string value that *itself* contains an escaped quote (e.g. `"He said \"hi\""` inside JSON) can
still under- or over-match, especially if the fix is "escape then find `&quot;`" without
accounting for the JSON string's own backslash-escaping.
**Why it happens:** `syntaxHighlightJson`'s regexes (`run-tests.ts:600-616`) already handle
JSON-level escaping correctly (`(?:\\.|[^"\\])*`) — the bug is purely about HTML-escaping order,
not about the JSON regex itself. A fix that also rewrites the JSON regex risks introducing a new,
unrelated bug.
**How to avoid:** Keep the existing `(?:\\.|[^"\\])*` JSON-string pattern; only change *when*
`escapeHtml` runs relative to `syntaxHighlightJson`, or change what literal the highlighter's
regex looks for (`"` vs `&quot;`). D-19's fixture set explicitly includes "a string value with
escaped quotes" — write that fixture as a value like `He said \"hi\"` inside a JSON string to
prove the fix handles the JSON-escape-inside-HTML-escape case, not just a bare quote.
**Warning signs:** The new unit test only exercises a plain string field, never one containing an
escaped quote.

### Pitfall 3: Reusing generated AST types for wire DTOs (see Pattern 3)
**What goes wrong:** `JavaClass`/`JavaField`/`JavaMethod`'s `deprecated` field (not
`isDeprecated`) silently type-checks against the harness's own `checkField(cls, 'isDeprecated',
...)` calls only if those calls stay untyped (`any`) — which is exactly what D-13 forbids. Typing
the response as `JavaClass` and then checking a field called `isDeprecated` on it would either
fail to type-check (correctly surfacing the mismatch) or, if cast through `any`/`unknown`, silently
compile while checking a wire field the AST type doesn't have a compile-time contract for.
**Why it happens:** `JavaClass` is the only "official" Java-class type already imported project-wide
(`test/fake-interop-peer.ts`, `test/java-interop-service.test.ts` both import it) — reaching for it
here is the obvious first instinct.
**How to avoid:** Define harness-local DTO interfaces named for the wire shape (Pattern 3);
never import from `src/language/generated/ast.ts` in the harness's typed response path.
**Warning signs:** A `tsconfig.test.json` type error citing `Property 'isDeprecated' does not
exist on type 'JavaClass'` the moment the harness's response type is changed from `any` to
`JavaClass`.

### Pitfall 4: Turning on `typecheck:test`/`lint` scope before the mechanical fixes
**What goes wrong:** Per D-21 and the roadmap planning note, enabling `tools/interop-test-harness`
in `eslint.config.js`'s scanned directories and `tsconfig.test.json`'s include *before* D-09/D-01..
D-08/D-10/D-11 land means fixing every lint/type error against the *old*, duplicated, `any`-typed
code, then re-fixing much of it again once the scaffold is generalised and the DTOs are typed.
**Why it happens:** It's tempting to "turn on the gate first so I know what's broken," mirroring
how Phase 114 approached `src`/`test` — but this phase's roadmap note is explicit that the harness
should be fixed first, gated last.
**How to avoid:** Sequence plans per D-21: scaffold → cases/gate/highlighter → module split/tests →
lint+typecheck scope, in that order.
**Warning signs:** A plan's first task edits `package.json`'s `lint` script or `tsconfig.test.json`
before any `run-tests.ts` behavioral fix has landed.

## Code Examples

### Existing scaffold to generalise (verified, read this session)
```typescript
// Source: bbj-vscode/tools/interop-test-harness/run-tests.ts:154-193 (runGetClassInfo, today)
async function runGetClassInfo(
    conn: MessageConnection,
    className: string,
    testName: string,
    validate: (result: any, checks: FieldCheck[], assertions: Assertion[]) => void,
): Promise<TestResult> {
    const request = { className };
    const start = performance.now();
    try {
        const result = await conn.sendRequest(getClassInfoRequest, request);
        const duration = performance.now() - start;
        const fieldChecks: FieldCheck[] = [];
        const assertions: Assertion[] = [];
        validate(result, fieldChecks, assertions);
        const failed = fieldChecks.some(c => !c.present && c.expected !== 'undefined')
            || assertions.some(a => !a.passed);
        return {
            name: testName, method: 'getClassInfo', status: failed ? 'fail' : 'pass',
            request, response: result, fieldChecks, assertions, durationMs: duration,
        };
    } catch (err: any) {
        return {
            name: testName, method: 'getClassInfo', status: 'error',
            request, response: null, fieldChecks: [], assertions: [],
            durationMs: performance.now() - start, errorMessage: err.message ?? String(err),
        };
    }
}
```

### Existing gate bug to fix (verified, read this session)
```typescript
// Source: bbj-vscode/tools/interop-test-harness/run-tests.ts:1041-1052 (today's exit-code gate)
const criticalFailures = results.some(r => {
    if (r.status === 'error') return false; // Connection errors don't count as field failures
    return r.fieldChecks.some(fc => {
        const isCritical = ['isStatic', 'isDeprecated', 'constructors'].some(cf => fc.field.includes(cf));
        return isCritical && !fc.present;
    }) || r.assertions.some(a => !a.passed);
});

if (failCount > 0 || criticalFailures) {
    process.exit(1);
}
```
Two bugs visible here beyond #599's field-list mismatch: (1) `r.status === 'error'` is excluded
from `criticalFailures`, but `failCount` only counts `'fail'` — so an `'error'` case (no response
at all) never triggers exit code 1 through either path, contradicting D-07's "1 if any case is
`fail` or `error`"; (2) even `fc.field.includes(cf)` for the 3 hard-coded names has the substring
bug named in #599.

### Existing hard-coded passes to remove (verified, read this session)
```typescript
// Source: bbj-vscode/tools/interop-test-harness/run-tests.ts:508-511 (case 14, end of try block)
return { name: '14. getClassInfos — com.basis.startup.type', method: 'getClassInfos', status: 'pass',
    request, response: result, fieldChecks: [], assertions, durationMs: duration };
```
```typescript
// Source: bbj-vscode/tools/interop-test-harness/run-tests.ts:576-589 (case 17, both returns)
assertions.push(assert('Handles gracefully (no crash)', true));
assertions.push(assert('Returns boolean', typeof result === 'boolean', `type=${typeOf(result)}, value=${result}`));

return { name: '17. loadClasspath — file: prefix', method: 'loadClasspath', status: 'pass',
    request, response: result, fieldChecks: [],
    ... };
} catch (err: any) {
    // An error response is also acceptable for invalid paths
    return { name: '17. loadClasspath — file: prefix', method: 'loadClasspath',
        status: 'pass', // Graceful error is a pass
        request, response: null, fieldChecks: [],
        assertions: [assert('Threw error (acceptable for invalid path)', true, err.message)],
        ... };
}
```
Every `assert(..., true)` call here is a tautology (D-01 forbids literal-`true` assertions); the
catch branch's hard-coded `status: 'pass'` is exactly D-04's forbidden shortcut — it must become
the scaffold's `acceptRejection` opt-in (Pattern 1/4), gated on the error actually being a clean
JSON-RPC `ResponseError` per D-03, not "any exception at all."

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| `npx tsx ...` (unpinned, resolves whatever is current on the public registry at run time) | Pinned `tsx` devDependency + npm script | This phase (D-15/D-16) | `npm audit`/Dependabot now cover `tsx`; every invocation uses the same version, recorded in the lockfile |
| Two independent "critical fields" lists (report's 8-field display list, gate's 3-field substring check) | One exported `CRITICAL_FIELDS` used by both | This phase (D-05) | Editing the field list actually changes enforcement, not just display |
| `escapeHtml` then `syntaxHighlightJson` (broken since the highlighter was added — no version in git history was ever checked for this) | Reordered, or highlighter matches the escaped form | This phase (D-10) | JSON keys/strings actually colour in the generated report |

**Deprecated/outdated:** none — this is a bug-fix and hygiene phase on a single existing file, not
a library upgrade.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The recommended module split's exact file names (`types.ts`, `scaffold.ts`, `cases.ts`, `gate.ts`, `report-template.ts`, `report.ts`) are a reasonable default, not verified against any existing convention for this specific directory | Recommended Project Structure | Low — CONTEXT.md explicitly leaves file naming to Claude's discretion; any equivalent split satisfies D-12 |
| A2 | Adding `tools/interop-test-harness/**/*.ts` to `tsconfig.test.json`'s `include` (rather than creating a dedicated `tsconfig.tools.json` referenced by a new script) is the simplest way to satisfy D-14's "add it to that program's include" | Architecture Patterns, Common Pitfalls → Pitfall 4 | Low — D-14 explicitly names this option and leaves stricter alternatives to discretion; either satisfies the requirement |
| A3 | The `[SUS]` verdict on `tsx` is a false positive from the legitimacy seam's "too-new latest version" heuristic rather than a real supply-chain concern | Package Legitimacy Audit | Low — the `checkpoint:human-verify` gate the protocol requires provides a human check regardless of this session's assessment |

**None of these need to block planning** — none touch a locked CONTEXT.md decision; A1 and A2 are
both explicitly within Claude's discretion per CONTEXT.md, and A3 is already handled by the
mandatory legitimacy checkpoint.

## Open Questions

1. **Should `MatrixRow` construction move behind a per-case declarative flag instead of the
   hard-coded `matrixTestIndices = [0, 1, 2, 3, 4, 5, 6, 7, 10]` array (`run-tests.ts:1008`)?**
   - What we know: CONTEXT.md flags this as "recommended... not required" (Claude's Discretion).
     It breaks silently today if cases are reordered or inserted, since the array is positional.
   - What's unclear: whether the module split (D-12) naturally produces a case-definition shape
     (e.g., `{ ...case, includeInMatrix: true }`) that makes this nearly free to do, or whether it
     adds meaningful scope.
   - Recommendation: attempt it opportunistically once cases are restructured under the new
     scaffold (Pattern 1) — if each case definition already carries a `name`/`validate` object,
     adding one boolean field costs little and removes a known footgun.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `tsx` (as a devDependency) | DEP-03, D-15/D-16 | ✗ (not installed; only an optional transitive peer of `vite`) | latest on registry: `4.23.15` `[VERIFIED: npm view, this session]` | none needed — this phase's job is to add it |
| `vscode-jsonrpc` | Pattern 4 (fake server), existing client code | ✓ | `8.2.1` (installed; `^8.2.1` declared) `[VERIFIED: node_modules/vscode-jsonrpc/package.json, this session]` | — |
| Node.js | Running `tsx`/`vitest`/`tsc` | ✓ | System default `v24.20.0`; project `engines.node` requires `>=22`; CI pins `22` in `build.yml` | Local dev environment here runs 24.20 rather than the CI-pinned 22 — pre-existing condition, unrelated to this phase's scope (no `langium generate` involved) |
| Live BBjServices (`:5008`) | D-20's before/after live-proof run only, never CI | ✓ (reachable in this environment, verified via a raw TCP probe this session) | — | Not needed for HARN-01..06/DEP-03 implementation or CI; only for the phase's manual before/after diff |

**Missing dependencies with no fallback:** none — `tsx` is the one missing dependency and this
phase's own DEP-03 requirement is to add it.

**Missing dependencies with fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest `^4.1.10` (already the project's only test framework) |
| Config file | `bbj-vscode/vitest.config.ts` (`include: ['test/**/*.test.ts']` — no change needed; the new file lands inside `test/`) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/interop-harness.test.ts` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HARN-01 | Every case's `status` derives from real assertions; no hard-coded `pass` | unit (fake server, D-17) | `npx vitest run test/interop-harness.test.ts -t "status derivation"` | ❌ Wave 0 |
| HARN-01 (D-19 fixture 1) | A non-array `getClassInfos` response makes cases 14 and 17 report `fail`, matching exit code | unit (fake server) | `npx vitest run test/interop-harness.test.ts -t "non-array getClassInfos"` | ❌ Wave 0 |
| HARN-03 | JSON highlighter colours keys/strings including escaped-quote values | unit (pure function) | `npx vitest run test/interop-harness.test.ts -t "syntaxHighlightJson"` | ❌ Wave 0 |
| HARN-04 | Gate checks exactly `CRITICAL_FIELDS`, matched by exact final segment | unit (pure function) | `npx vitest run test/interop-harness.test.ts -t "critical field gate"` | ❌ Wave 0 |
| HARN-05 | (documentation-only; D-08 explicitly forbids a source-text guard test) | manual review | — (no automated test; header comment reviewed at code review) | n/a |
| HARN-06 | All 17 cases go through the shared scaffold; no duplicated inline scaffolds remain | unit (fake server drives all 17 cases) | `npx vitest run test/interop-harness.test.ts -t "all 17 cases"` | ❌ Wave 0 |
| DEP-03 | `tsx` is a direct, pinned devDependency | manual/CI | `npm ls tsx` (exits 0, shows direct dependency, no `UNMET`/`extraneous`) | n/a |
| HARN-02 | Harness is type-checked, linted, tested in CI | integration (existing CI) | `cd bbj-vscode && npm run lint && npm run typecheck:test && npm test` | ✅ (scripts exist; scope extension is this phase's change) |

### Sampling Rate
- **Per task commit:** `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/interop-harness.test.ts`
- **Per wave merge:** `cd /home/coder/repos/bbj-language-server/bbj-vscode && npm run lint && npm run typecheck:test && npm test`
- **Phase gate:** Full suite green (`npm test`, `npm run lint`, `npm run typecheck:test` all exit 0)
  before `/gsd-verify-work`, plus D-20's live before/after diff against `:5008` (manual, not CI).

### Wave 0 Gaps
- [ ] `test/interop-harness.test.ts` — new file; covers HARN-01, HARN-03, HARN-04, HARN-06 and
  DEP-03's `npm ls tsx` check can be run as a plain shell assertion inside the same file or as a
  separate manual verification step.
- [ ] No new shared fixtures/conftest-equivalent needed — vitest has no global setup file in this
  project; the fake server (Pattern 4) is self-contained per test via `beforeEach`/`afterEach`.
- [ ] Framework install: none — `vitest` is already installed; only `tsx` needs installing (DEP-03).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | The harness is a local dev/CI tool with no authentication surface |
| V3 Session Management | no | No sessions; one-shot CLI process |
| V4 Access Control | no | No access-control surface |
| V5 Input Validation | yes (minor) | CLI args (`--host`, `--port`, `--timeout`, `--output`) come from `node:util`'s `parseArgs` already; `--output`'s path is `resolve()`d but not otherwise bounded — this is a local developer tool invoked by hand or CI against a trusted local/CI peer, so no new validation is required by this phase's scope (HARN-01..06/DEP-03 do not touch CLI arg handling except moving `parseArgs` behind the CLI entry per D-12) |
| V6 Cryptography | no | No cryptographic operations; plaintext JSON-RPC over a loopback/LAN TCP socket, unchanged by this phase |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|-----------------------|
| Unpinned `npx tsx` supply-chain exposure (DEP-03's own subject) | Tampering | Pin the exact version in `devDependencies` and the lockfile (D-15) so `npm audit`/Dependabot actually cover it — this *is* the phase's own DEP-03 fix, not a residual gap |
| HTML report rendering attacker-controlled peer data unescaped | Information Disclosure / XSS (in a locally-opened file, low severity) | `escapeHtml` already exists and must keep escaping every interpolated value (host, timestamp, class names, JSON blobs) — D-10's fix must preserve escaping, only reorder/retarget it (Common Pitfalls → Pitfall 2 already covers this: "the output stays escaped" per CONTEXT.md's own wording) |

This phase touches no production `src/` code, no user-facing surface, and no data that crosses a
trust boundary beyond "a local or CI-local java-interop peer's JSON response rendered into a
locally-opened HTML file." The two rows above are the only ones with any bearing on phase scope.

## Sources

### Primary (HIGH confidence)
- `bbj-vscode/tools/interop-test-harness/run-tests.ts` (full file, read this session) — the entire
  subject of this phase; every line-numbered claim above was read directly, not recalled.
- `bbj-vscode/src/language/java-interop.ts:1208-1241` (read this session) — verified the
  `isDeprecated` → `deprecated` remap that grounds Pattern 3/Pitfall 3.
- `bbj-vscode/src/language/generated/ast.ts:1325-1432` (read this session) — verified `JavaClass`/
  `JavaField`/`JavaMethod`/`JavaMethodParameter` field shapes.
- `bbj-vscode/test/fake-interop-peer.ts` (full file, read this session) — verified it fakes a
  different class's client socket, not a server, grounding the "Alternatives Considered" and
  Pattern 4 distinction.
- `bbj-vscode/test/java-interop-service.test.ts` (full file, read this session) — confirms the
  project's existing `FakeSocket`/mock-socket testing convention for a *different* purpose
  (client-side unit tests of `JavaInteropService`).
- `bbj-vscode/package.json`, `bbj-vscode/tsconfig.json`, `bbj-vscode/tsconfig.test.json`,
  `bbj-vscode/eslint.config.js`, `bbj-vscode/vitest.config.ts` (all read this session) — grounds
  Standard Stack and every "no config change needed" / "one line added" claim.
- `.github/workflows/build.yml`, `.github/workflows/pr-validation.yml` (read this session) —
  confirms `build.yml` already runs lint/typecheck/test on every PR with no path filter (so HARN-02
  needs no new CI step), and that `pr-validation.yml`'s `bbj-vscode/tools/**` filter is the CI
  trigger issue #575 names.
- `node_modules/vscode-jsonrpc/lib/node/main.d.ts`, `.../lib/common/connection.d.ts` (read this
  session) — confirms `createMessageConnection`/`SocketMessageReader`/`SocketMessageWriter`/
  `MessageConnection.onRequest` are present and typed in the installed `8.2.1`.
- `npm view tsx version` / `npm view tsx time.modified` / `npm view tsx scripts.postinstall` (run
  this session) — `4.23.15`, published 2026-09-20, no postinstall script.
- `gsd_run query package-legitimacy check --ecosystem npm tsx` (run this session) — `SUS`
  verdict, reason `too-new`, 102.6M weekly downloads.
- GitHub issues #514, #575, #596, #599, #601, #635, #520 (`gh issue view`, fetched this session,
  full bodies read) — Problem/Evidence/Proposed approach/Acceptance criteria for every HARN-*/
  DEP-03 requirement.

### Secondary (MEDIUM confidence)
None used beyond primary sources — this phase's entire scope is one file plus a handful of
already-installed project dependencies; no external documentation lookup was required.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every library is already installed and version-verified this session;
  only `tsx`'s exact pin is new, and its registry version/postinstall/downloads were all checked
  directly.
- Architecture: HIGH — every pattern is grounded in a line-numbered read of the actual file being
  changed, or in an installed library's own `.d.ts` (for the new fake-server pattern).
- Pitfalls: HIGH — all four pitfalls are backed by a verified root-cause read (production remap
  code, the gate's substring bug, the escape-order bug), not inference.

**Research date:** 2026-09-28
**Valid until:** 30 days (stable, single-file, no external API surface; re-verify `tsx`'s pinned
version is still current if planning is delayed past this window)
