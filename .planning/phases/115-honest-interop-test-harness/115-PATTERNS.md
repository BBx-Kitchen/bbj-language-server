# Phase 115: Honest Interop Test Harness - Pattern Map

**Mapped:** 2026-09-28
**Files analyzed:** 9 (1 refactor target split into ~6, 1 new test file, 3 tooling-config edits)
**Analogs found:** 9 / 9 (all analogs are self-referential — this phase's dominant pattern is "refactor the target file using its own existing internal patterns," since the domain — a JSON-RPC CLI test harness — has no other instance in the codebase)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/tools/interop-test-harness/run-tests.ts` (thin CLI, post-split) | controller/CLI | request-response | itself, pre-split (`run-tests.ts:1-52` argv/`main()` wiring) | exact (self-refactor) |
| `bbj-vscode/tools/interop-test-harness/scaffold.ts` (new) | service | request-response | `run-tests.ts:154-193` (`runGetClassInfo`) | exact — this *is* the generalisation target |
| `bbj-vscode/tools/interop-test-harness/cases.ts` (new) | service | request-response | `run-tests.ts:256-592` (`defineTests`, 17 case bodies) | exact (extraction, not new logic) |
| `bbj-vscode/tools/interop-test-harness/gate.ts` (new) | utility | transform | `run-tests.ts:1041-1052` (exit-code gate) + `run-tests.ts:659` (report's `criticalFields` display list) | exact — unifies two existing blocks |
| `bbj-vscode/tools/interop-test-harness/report.ts` + `report-template.ts` (new) | utility | transform | `run-tests.ts:596-979` (`syntaxHighlightJson`, `escapeHtml`, `generateReport`) | exact (split, not new logic) |
| `bbj-vscode/tools/interop-test-harness/types.ts` (new) | model | transform | `run-tests.ts` inline type declarations (`FieldCheck`, `Assertion`, `TestResult`, `MatrixRow` — currently un-line-anchored, scattered near top of file) + DTO shapes implied by `validate*Fields` at `:195-222` | role-match — types extracted from inline declarations, no existing standalone `types.ts` in this dir |
| `bbj-vscode/test/interop-harness.test.ts` (new) | test | event-driven (fake JSON-RPC server) + request-response | `bbj-vscode/test/fake-interop-peer.ts` (structure/doc-comment convention) + `bbj-vscode/test/java-interop-service.test.ts` (assertion/vitest style) | role-match — no existing test fakes a JSON-RPC *server*; this is genuinely new (Pattern 4 in RESEARCH.md), but file conventions carry over |
| `bbj-vscode/package.json` (edit: `lint` script, `devDependencies.tsx`, new `interop-harness` script) | config | — | `package.json:692-694` (`lint`, `typecheck:test`, `test` scripts) | exact — mechanical string edits to existing scripts |
| `bbj-vscode/tsconfig.test.json` (edit: `include`) | config | — | itself (`tsconfig.test.json:12-14`) | exact |

## Pattern Assignments

### `bbj-vscode/tools/interop-test-harness/scaffold.ts` (service, request-response)

**Analog:** `bbj-vscode/tools/interop-test-harness/run-tests.ts:154-193` (existing `runGetClassInfo`, to be generalised — this is D-09's own subject, already fully transcribed with the required fix in RESEARCH.md's Pattern 1).

**Core pattern to copy (today, un-generalised):**
```typescript
// bbj-vscode/tools/interop-test-harness/run-tests.ts:154-193
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

**Required change (D-06/D-09):** replace the `failed` condition with `present && typeMatch`
(not `!c.present && c.expected !== 'undefined'`), generalise over `RequestType<P, R, null>`, and
add the `acceptRejection`/`onRejection` opt-in for D-04's one exception (case 17). The fully
worked target implementation is in RESEARCH.md § "Pattern 1" (`runRequest<P, R>`) — copy that
signature verbatim; it is derived line-for-line from this analog.

**Helpers to keep unchanged:** `checkField`, `assert`, `typeOf`, `countWhere` — referenced in
RESEARCH.md's Reusable Assets as already correctly implemented; only their *container* module
changes.

---

### `bbj-vscode/tools/interop-test-harness/gate.ts` (utility, transform)

**Analog A — the report's dead display list:**
```typescript
// bbj-vscode/tools/interop-test-harness/run-tests.ts:659
// (8-field array, display-only today)
```

**Analog B — the gate's live but buggy list:**
```typescript
// bbj-vscode/tools/interop-test-harness/run-tests.ts:1041-1052
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

**Bugs to fix here (verified, do not carry forward):**
1. `r.status === 'error'` cases never contribute to `failCount` either — D-07 requires exit 1 for
   `fail` OR `error`.
2. `fc.field.includes(cf)` is substring matching — `type` matches `returnType`, `name` matches
   `packageName` (#599's root cause).
3. Only 3 of the 8 declared critical fields are actually gated.

**Target implementation:** copy `CRITICAL_FIELDS`/`finalSegment`/`isCriticalFieldCheck`/
`criticalFieldsPass` verbatim from RESEARCH.md § "Pattern 2" — it is the unification of Analog A
+ Analog B with the exact-final-segment fix applied.

---

### `bbj-vscode/tools/interop-test-harness/report.ts` (utility, transform)

**Analog:** `bbj-vscode/tools/interop-test-harness/run-tests.ts:596-616` (`syntaxHighlightJson`
regexes — keep unchanged, they already correctly handle JSON-level escaping via
`(?:\\.|[^"\\])*`) and `run-tests.ts:706-708`/`:746`/`:751` (the `escapeHtml`-before-highlight
ordering bug, #596's root cause).

**What NOT to change:** the JSON-string regex pattern itself (`(?:\\.|[^"\\])*`) — RESEARCH.md's
Pitfall 2 explicitly warns against touching it; only the *order* of escape vs. highlight (or the
literal the highlighter matches, `"` vs `&quot;`) changes.

**Split target:** break `generateReport` (`:651-979`, 329 lines) into `buildSummaryBar`,
`buildMatrixHtml`, `buildTestSections`, `syntaxHighlightJson`, `escapeHtml`, `truncateJson`,
`statusBadge` — each a pure function taking `TestResult[]`/`MatrixRow[]` and returning a string
fragment, consumed by a thin `generateReport()` in the same file. CSS/HTML shell strings move to
`report-template.ts` with zero logic (D-12).

---

### `bbj-vscode/tools/interop-test-harness/cases.ts` (service, request-response)

**Analog:** `bbj-vscode/tools/interop-test-harness/run-tests.ts:256-592` (`defineTests`, all 17
case bodies — includes the two hard-coded-pass cases to fix).

**Hard-coded passes to remove (verified, copy the *problem*, not the code):**
```typescript
// run-tests.ts:508-511 — case 14
return { name: '14. getClassInfos — com.basis.startup.type', method: 'getClassInfos', status: 'pass',
    request, response: result, fieldChecks: [], assertions, durationMs: duration };
```
```typescript
// run-tests.ts:576-589 — case 17, both branches
assertions.push(assert('Handles gracefully (no crash)', true));
...
} catch (err: any) {
    return { name: '17. loadClasspath — file: prefix', method: 'loadClasspath',
        status: 'pass', // Graceful error is a pass
        ...
        assertions: [assert('Threw error (acceptable for invalid path)', true, err.message)],
        ... };
}
```
Every `assert(x, true)` here is the literal-`true` tautology D-01 forbids. Rewrite each of the
17 case bodies to call the new `runRequest` scaffold and produce one real disjunction assertion
per D-01/D-02/D-03 — RESEARCH.md's `<decisions>` section gives the exact required assertion shape
per case (9, 10, 13, 14, 17).

---

### `bbj-vscode/test/interop-harness.test.ts` (test, event-driven fake server)

**Analog for file header/doc-comment convention and "never opens a real socket to the live peer"
framing:** `bbj-vscode/test/fake-interop-peer.ts:1-17`:
```typescript
/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * ...
 ******************************************************************************/

/**
 * A scriptable fake java-interop peer sitting behind the real `connect()` path, for the
 * circuit-breaker regression tests ... Overrides only `createSocket()` and `wrapSocket()` ...
 * Never opens a real socket and never reaches port 5008.
 */
import { DeepPartial, EmptyFileSystem, inject, Module } from 'langium';
...
```
Copy the license header and the "what this fakes / what it never does" doc-comment convention.
**Do NOT copy the mechanism** — `fake-interop-peer.ts` overrides `JavaInteropService.createSocket()`/
`wrapSocket()` (a client-side duck-typed override, never opens a real socket). The harness has no
service class to subclass; it is itself a raw `net.Socket` client, so the test needs a genuine
**server** (`net.createServer` + `vscode-jsonrpc`'s server-side `createMessageConnection`). This
is new territory — RESEARCH.md § "Pattern 4" has the fully worked `startFakeInteropServer(...)`
implementation (verified against the installed `vscode-jsonrpc@8.2.1` `.d.ts` this session); copy
that verbatim as the starting point.

**Analog for vitest assertion/suite style:** `bbj-vscode/test/java-interop-service.test.ts` (full
file read in RESEARCH.md's Sources) — existing project convention for `describe`/`it` structure
and mock-socket setup/teardown (`beforeEach`/`afterEach`) to mirror for the fake server's
lifecycle.

**Test data pattern (D-19):** hand-written minimal typed fixture objects, one healthy set plus
targeted mutations (non-array `getClassInfos`, missing critical field, mistyped critical field,
no-error response for the nonexistent class, escaped-quote string). No analog exists for this
exact fixture shape in the codebase; construct directly against the new `types.ts` DTOs (Pattern
3 in RESEARCH.md — `ClassInfoDto`/`MethodInfoDto`/`FieldInfoDto`/`ParameterInfoDto`, **not**
`JavaClass`/`JavaField`/`JavaMethod` from `src/language/generated/ast.ts`, whose `deprecated`
field name mismatches the wire's `isDeprecated` — verified at
`src/language/java-interop.ts:1208-1241` and `src/language/generated/ast.ts:1325-1432`).

---

### `bbj-vscode/package.json` (config)

**Analog — existing scripts to extend, not replace:**
```json
// bbj-vscode/package.json:692-694
"lint": "eslint src test --max-warnings 0",
"typecheck:test": "tsc -p tsconfig.test.json --noEmit",
"test": "vitest run",
```

**Required edits:**
- `"lint"` becomes `"eslint src test tools/interop-test-harness --max-warnings 0"` (D-13).
- Add `"interop-harness": "tsx tools/interop-test-harness/run-tests.ts"` (D-16 — npm script,
  local `tsx`, no `npx`).
- Add `tsx` to `devDependencies` at an **exact** version, e.g. `"tsx": "4.23.15"` (D-15;
  `[SUS]`-flagged by the legitimacy seam as a false positive per RESEARCH.md — gate the
  `npm install --save-exact tsx@4.23.15` step behind `checkpoint:human-verify`).

---

### `bbj-vscode/tsconfig.test.json` (config)

**Analog — exact file to edit, current `include`:**
```json
// bbj-vscode/tsconfig.test.json:12-14
"include": [
    "test/**/*.ts"
],
```
**Required edit (D-14):** add `"tools/interop-test-harness/**/*.ts"` to the `include` array.
Per RESEARCH.md's Assumption A2, this is the simplest way to satisfy D-14 — no new
`tsconfig.tools.json` needed. The file's own header comment (`:6-9`) already documents *why*
`noImplicitAny: false` is relaxed for `test/**` only; the harness dir must NOT inherit that
relaxation loosely — D-14 requires it be no looser than the `src` rules, so prefer keeping
`noImplicitAny` effectively `true` for the harness files by typing them fully (Pattern 3's DTOs),
even though the shared `tsconfig.test.json` config technically allows implicit any.

---

## Shared Patterns

### Request/response scaffold with opt-in rejection contract (D-01..D-04, D-09)
**Source:** `bbj-vscode/tools/interop-test-harness/run-tests.ts:154-193` (existing single-purpose
`runGetClassInfo`), generalised per RESEARCH.md § "Pattern 1" (`runRequest<P, R>`).
**Apply to:** every one of the 17 case definitions in the new `cases.ts` — no case should
hand-build its own try/catch/status logic.

### Single source of truth for critical fields, exact-final-segment matching (D-05, D-06)
**Source:** unifies `run-tests.ts:659` (report's dead 8-field list) and `run-tests.ts:1041-1052`
(gate's buggy 3-field substring check) into RESEARCH.md § "Pattern 2"'s `CRITICAL_FIELDS` +
`finalSegment`/`isCriticalFieldCheck`/`criticalFieldsPass`.
**Apply to:** `gate.ts` (exit code) and `report.ts` (matrix/field-check display) — both must read
the same exported constant, never a locally re-declared list.

### Harness-local wire DTOs, never the generated AST types (Pitfall 3)
**Source:** `src/language/java-interop.ts:1208-1241` (the `isDeprecated` → `deprecated` remap
that proves reuse is unsafe) vs. `src/language/generated/ast.ts:1325-1432` (`JavaClass`/
`JavaField`/`JavaMethod` — all use `deprecated`, never `isDeprecated`).
**Apply to:** `types.ts`'s `ClassInfoDto`/`MethodInfoDto`/`FieldInfoDto`/`ParameterInfoDto` (all
fields optional, mirroring that the harness's entire purpose is checking whether the peer sent
them) and every `validate*Fields` helper moved from `run-tests.ts:195-222`.

### Module split: side-effect-free library + thin CLI (D-12)
**Source:** `run-tests.ts:1-52` for the *problem* (`parseArgs` runs at module top level; `main()`
is called unconditionally at `:1055` — both are import-time side effects that must move behind
the CLI entry before any test can `import` the library modules without connecting a socket or
parsing `process.argv`).
**Apply to:** the new `run-tests.ts` (post-split) must contain only `parseArgs()` + `main()`,
called under an `if (require.main === module)`-equivalent guard or simply left at the bottom of a
file that nothing else imports.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| Fake JSON-RPC **server** in `test/interop-harness.test.ts` (the `startFakeInteropServer` piece) | test infrastructure | event-driven | No existing test fakes the *server* side of `vscode-jsonrpc`; `test/fake-interop-peer.ts` fakes a client-side socket override on a specific service class instead. RESEARCH.md § "Pattern 4" supplies a fully worked, `.d.ts`-verified implementation to use directly — treat that as the analog in place of a codebase file. |

## Metadata

**Analog search scope:** `bbj-vscode/tools/interop-test-harness/`, `bbj-vscode/test/`,
`bbj-vscode/eslint.config.js`, `bbj-vscode/tsconfig.test.json`, `bbj-vscode/package.json`,
`bbj-vscode/src/language/java-interop.ts`, `bbj-vscode/src/language/generated/ast.ts`.
**Files scanned:** 9 (all confirmed git-tracked via `git ls-files`).
**Pattern extraction date:** 2026-09-28
**Note on analog quality:** this phase is a self-contained refactor/hygiene pass on one existing
file (`run-tests.ts`) plus its own test/tooling wiring. There is no *other* file in the codebase
performing the same job, so nearly every "analog" above is the target file's own current code —
this is expected and matches CONTEXT.md's framing ("mechanical fixes... self-contained to one
file"). The one genuinely novel piece (the fake JSON-RPC server) has no codebase analog; RESEARCH.md's
already-verified Pattern 4 implementation stands in for it.
