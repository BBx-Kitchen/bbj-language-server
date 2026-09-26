# Phase 109: Completion & Java Class Resolution - Pattern Map

**Mapped:** 2026-09-25
**Files analyzed:** 8 (5 modified source files, 3 modified/extended test files; no new files — all fixes land in existing files per RESEARCH.md)
**Analogs found:** 8 / 8 (every "analog" here is the file's own existing sibling branch/pattern already in the same file — this is a bugfix phase, not new-file creation, so the pattern to copy is the existing correct branch one function away)

## File Classification

| Modified File | Role | Data Flow | Closest Analog (same file, sibling pattern) | Match Quality |
|----------------|------|-----------|-----------------------------------------------|---------------|
| `bbj-vscode/src/language/bbj-scope.ts` (COMP-01) | scope-provider (request-response) | request-response | Own `isSymbolRef(receiver)` branch, same file lines 198-233 | exact (extend existing branch pattern) |
| `bbj-vscode/src/language/bbj-type-inferer.ts` (COMP-02) | service / type-inference (transform) | transform | Own `isMemberCall` branch reading `member.resolvedReturnType`, lines ~55-89 | exact (reuse resolution idiom, feed re-selected node) |
| `bbj-vscode/src/language/bbj-overload-selector.ts` (COMP-02) | utility (transform) | transform | Own `findBestOverload`/`siblingOverloads`, lines 22-115 | exact (new sibling export, same module) |
| `bbj-vscode/src/language/bbj-inlay-hint-provider.ts` (COMP-02, read-only reuse) | provider (request-response) | request-response | `argumentType()`, lines 104-117 | exact (source of helper to move/duplicate) |
| `bbj-vscode/src/language/bbj-completion-provider.ts` (COMP-03, only if gap found) | provider (request-response) | request-response | `DefaultCompletionProvider` extension already in this file | exact (extend existing class) |
| `bbj-vscode/src/language/java-interop.ts` (JINT-01/02) | service (event-driven / request-response) | request-response | Own `resolveClassByName`/`resolveClass`/`getRawClass`/`createStubClass`, lines 894-1144 | exact (guard inserted at existing choke point) |
| `bbj-vscode/test/bbj-test-module.ts` (test double) | test / provider (request-response) | request-response | `JavaInteropTestService`, lines 172-175 (override pattern) and constructor init lines 65-68 | role-match (new subclass needed, not this override) |
| `bbj-vscode/test/completion-test.test.ts` / `bbj-vscode/test/method-return-java-type.test.ts` | test | request-response | Existing tests in same files (e.g. `:186-213` skipped test, `:230-242` ad-hoc JavaMethod push) | exact |

## Pattern Assignments

### `bbj-vscode/src/language/bbj-scope.ts` (COMP-01: scope-provider, request-response)

**Analog:** same file, existing `isClassRef` detection block, `bbj-scope.ts:198-233` [VERIFIED against RESEARCH.md this session]

**Current (buggy) pattern — imports/context already in file, no new imports needed** (`isSymbolRef`, `isJavaClass` already imported and used at this site):
```typescript
let isClassRef = false;
if (isSymbolRef(receiver)) {
    try {
        const ref = receiver.symbol.ref;
        isClassRef = isJavaClass(ref);
    } catch {
        // cyclic reference, ignore
    }
}
if (isJavaClass(receiverType)) {
    ...
    if (isClassRef) {
        // Class reference access — static members only.
        const staticMethods = receiverType.methods.filter(m => m.isStatic);
        ...
```

**Pattern to copy — add sibling branch, same try/catch idiom, same `isJavaClass` predicate:**
```typescript
let isClassRef = false;
if (isSymbolRef(receiver)) {
    try {
        isClassRef = isJavaClass(receiver.symbol.ref);
    } catch { /* cyclic reference, ignore */ }
} else if (isMemberCall(receiver) && receiver.member) {
    try {
        isClassRef = isJavaClass(receiver.member.ref);
    } catch { /* cyclic reference, ignore */ }
}
```
`isMemberCall` needs to be added to this file's existing import block from `./generated/ast.js` (sibling guard functions `isSymbolRef`/`isJavaClass` are already imported there — follow that same import line).

**Signal-reuse pattern** (mirrors `bbj-type-inferer.ts:87-89`, do not invent a new heuristic):
```typescript
// bbj-vscode/src/language/bbj-type-inferer.ts:87-89
} else if (isJavaPackage(member) || isClass(member)) {
    return member;
}
```
Use the narrower `isJavaClass` (not `isClass`) to match the existing `SymbolRef` branch's own scoping — `isBbjClass` class-reference access is a separate branch a few lines below (`bbj-scope.ts:234-244`) and is out of COMP-01's scope.

**Existing passing test to use as the assertion-style analog:** `'static field (event constant) is offered on a Java class reference - issue #440'`, `bbj-vscode/test/completion-test.test.ts:533-552`.

---

### `bbj-vscode/src/language/bbj-overload-selector.ts` + `bbj-vscode/src/language/bbj-type-inferer.ts` (COMP-02: service/transform)

**Analog:** own `findBestOverload`/`siblingOverloads`, `bbj-overload-selector.ts:22-115`; own `isMethodCall`/`isMemberCall` branches, `bbj-type-inferer.ts:55-108` [VERIFIED this session]

**Core pattern to copy — the existing lossy conversion this fix must NOT reuse as-is:**
```typescript
// bbj-vscode/src/language/bbj-nodedescription-provider.ts:35-41
export function toMethodData(methDecl: MethodDecl): MethodData {
    return {
        name: methDecl.name,
        parameters: methDecl.params.map(p => { return { name: p.name, type: getFQNFullname(p.type) } }),
        returnType: getFQNFullname(methDecl.returnType)
    }
}
```

**New export pattern to add alongside `findBestOverload`, same module, same scoring reuse:**
```typescript
// bbj-vscode/src/language/bbj-overload-selector.ts — new export
export interface OverloadCandidate { node: AstNode; data: MethodData }

function siblingOverloadCandidates(node: AstNode): OverloadCandidate[] { ... }

export function selectOverloadNode(
    resolved: AstNode | undefined, linkedNode: AstNode, linkedData: MethodData, argTypes: ArgumentType[]
): { node: AstNode; tied: boolean } | undefined { ... }
```

**Existing return-type resolution idiom to reuse per-kind** (`bbj-type-inferer.ts` current `isMemberCall` branch, do not write a second resolver):
```typescript
// existing per-kind resolution already in bbj-type-inferer.ts, applied to linker's first match today —
// apply the SAME two branches to the re-selected `winner` node instead:
isJavaMethod(winner) ? winner.resolvedReturnType?.ref ?? this.javaInterop.getResolvedClass(winner.returnType)
  : isMethodDecl(winner) ? getClass(winner.returnType) : undefined
```

**Helper to move/duplicate (avoid provider→inferer→provider import cycle — see pitfall):**
```typescript
// bbj-vscode/src/language/bbj-inlay-hint-provider.ts:104-117
// argumentType() — depends on this.inferer (TypeInferer); move the pure
// literal/prefix-expression logic into bbj-overload-selector.ts as
// (expr: Expression, inferer: TypeInferer) => ArgumentType, imported by both
// the type inferer and the inlay-hint provider from the selector module.
```

**Tie rule (D-06) — apply only in the type inferer, not in `findBestOverload` itself:** when the top-scored candidates are tied and their resolved return types differ, the call's inferred type is `undefined`; if they share a return type, use it. `findBestOverload`'s own tie rule (first-linked wins) is unchanged for the inlay-hint provider.

**Test-double gap to fill** (`bbj-vscode/test/bbj-test-module.ts:213-355`, the fake `SysGui` overloads all share one return type): add a differing-return-type overload pair, following the ad-hoc-push style already used at:
```typescript
// bbj-vscode/test/method-return-java-type.test.ts:186-196, 230-242
// pushes an ad-hoc JavaMethod directly onto getResolvedClass('java.lang.String')!.methods
```

---

### `bbj-vscode/src/language/bbj-completion-provider.ts` / `bbj-vscode/src/language/bbj.langium` (COMP-03: provider, request-response)

**Analog:** the file's own existing `DefaultCompletionProvider` extension (already the pattern for all completion logic in this codebase) — RESEARCH.md's D-03 matrix (run against the current, unmodified tree) found every tested position already produces non-zero, control-matching completions, including the exact skipped-test scenario. **No analog gap was found this session; the expected plan shape is "measure, then un-skip," not a new completion-provider branch.**

**Test to un-skip verbatim (no code change expected):** `bbj-vscode/test/completion-test.test.ts:186` (the `_f$`/`_t$` DEF FN test, `test.skip` → `test`).

**Fixture pitfall pattern to copy into any new D-03 matrix fixture** (from RESEARCH.md Pitfall 2 — every fixture needs a trailing statement after the `<|>` marker in both the in-method and control variant, or the position falsely reads as broken):
```
x! = 1
PRINT <|>
y! = 2
```
not
```
PRINT <|>
```

If D-03's *formal* re-run does find a real gap (contrary to this session's informal probe), the fallback shape is scoped by D-01 to either a `bbj-completion-provider.ts` method override or a contained `bbj.langium` grammar change — no Langium fork/patch. A grammar change must be validated per D-04 against the private corpus harness (see Phase 107's procedure, already used in this repo), snapshotting `details.json` before each run and comparing file sets, not totals.

---

### `bbj-vscode/src/language/java-interop.ts` (JINT-01/02: service, request-response)

**Analog:** own `resolveClassByName`/`resolveClass`/`getRawClass`/`createStubClass`, `java-interop.ts:894-1144, 465-476` [VERIFIED this session]

**Single choke-point pattern to guard (copy this insertion point, not a new parallel guard):**
```typescript
// bbj-vscode/src/language/java-interop.ts
async resolveClassByName(className: string, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
    className = normalizeJavaClassName(className);        // JINT-02: $ -> . once, before any cache read
    if (isPrimitiveVoidOrArray(className)) {               // JINT-01: never reaches getRawClass
        return this.resolveClass(buildLocalStub(className), token, _depth); // reuses the real pipeline
    }
    if (this.resolvedClasses.has(className)) { ... }        // existing fast path, now keyed consistently
    ...
}
```

**Normalizer pattern (pure helper, same module):**
```typescript
function normalizeJavaClassName(name: string): string {
    return name.includes('$') ? name.replace(/\$/g, '.') : name;
}
```
Apply at the top of BOTH `resolveClassByName` (string entry) and `resolveClass` (node entry, on `javaClass.name`, before `const className = javaClass.name` is read for caching) — `resolveClass` is independently reachable from `loadClasspath()`'s bulk-load loop (`java-interop.ts:666`), bypassing `resolveClassByName`.

**Do NOT reuse this stub shape** (`createStubClass`, wrong error semantics for D-07):
```typescript
// createStubClass sets error: 'Resolution failed or depth limit exceeded' — NOT what
// today's real primitive/void/array round trip produces (error: undefined). Reuse
// resolveClass()'s own Phase 1 pipeline instead, feeding it a locally-built raw object.
```

**Primitive/array detection constants to add** (8 primitives + void, array via suffix):
```typescript
const JAVA_PRIMITIVES = ['boolean', 'byte', 'char', 'double', 'float', 'int', 'long', 'short', 'void'];
// array detection: className.endsWith('[]')  — do not unwrap to component type (D-07)
```

**Test-double pattern (new, narrower double — do not reuse `JavaInteropTestService` for these tests):**
```typescript
// bbj-vscode/test/bbj-test-module.ts:172-175 is the WRONG analog for JINT-01/02 tests —
// it overrides resolveClassByName itself, bypassing the code under test. New double, same
// file or a sibling test-module file, extends JavaInteropService (not JavaInteropTestService)
// and overrides only the protected getRawClass, as a counting spy:
class CountingJavaInteropTestService extends JavaInteropService {
    public rawClassCalls: string[] = [];
    protected override async getRawClass(className: string, _token?: CancellationToken): Promise<JavaClass> {
        this.rawClassCalls.push(className);
        return { $type: JavaClass.$type, name: className, packageName: '', fields: [], methods: [], classes: [], constructors: [] } as unknown as JavaClass;
    }
}
```
Its constructor must call `JavadocProvider.getInstance().initialize([], services.shared.workspace.FileSystemProvider)`, following `JavaInteropTestService`'s own constructor pattern at `bbj-vscode/test/bbj-test-module.ts:65-68`, to avoid a stray console error.

---

## Shared Patterns

### AST type guards
**Source:** used throughout `bbj-scope.ts`, `bbj-type-inferer.ts` (project convention, `CLAUDE.md`)
**Apply to:** every branch touched in COMP-01/COMP-02
```typescript
// Use isXxx() guard functions from generated/ast.ts, never string $type literals.
isJavaClass(ref) / isMemberCall(receiver) / isMethodDecl(winner) / isJavaMethod(winner)
```

### Case-insensitive BBj comparisons
**Source:** `bbj-overload-selector.ts`, `StreamScopeWithPredicate` (existing `.toLowerCase()` comparisons)
**Apply to:** any new name comparison in COMP-01/02/JINT-01/02 — BBj is case-insensitive project-wide; the JINT-02 `$`→`.` normalization itself is not case-sensitive but must not introduce a case-sensitive comparison elsewhere.

### Cyclic-reference guard idiom
**Source:** `bbj-scope.ts:198-206` (existing `try { ... } catch { /* cyclic reference, ignore */ }`)
**Apply to:** the new `MemberCall` branch in COMP-01 (already shown above) — reuse the exact same empty-catch comment style.

### Test parsing rule
**Source:** project-wide (`CLAUDE.md`, RESEARCH.md carried constraints)
**Apply to:** every new/modified test file in this phase
```typescript
import { EmptyFileSystem } from 'langium';
import { parseHelper } from 'langium/test';
// never DocumentBuilder.build — reaches CPL/interop on :5008
// Java-dependent tests: createBBjTestServices() from test/bbj-test-module.ts,
// EXCEPT JINT-01/02 tests, which need the new CountingJavaInteropTestService double above.
```

## No Analog Found

None — every file in scope is an existing, tracked file with an existing sibling pattern in the same module to extend (bugfix phase, no new files). Files with candidate gaps but no committed shape yet (COMP-03's provider/grammar fallback, if the formal D-03 re-run disagrees with this session's finding) are covered by the D-01-scoped fallback described above rather than a separate analog file, since no such fallback exists anywhere else in the codebase to copy from.

## Metadata

**Analog search scope:** `bbj-vscode/src/language/` (bbj-scope.ts, bbj-type-inferer.ts, bbj-overload-selector.ts, bbj-inlay-hint-provider.ts, bbj-completion-provider.ts, bbj-nodedescription-provider.ts, java-interop.ts), `bbj-vscode/test/` (bbj-test-module.ts, completion-test.test.ts, method-return-java-type.test.ts) — all confirmed git-tracked via `git ls-files`.
**Files scanned:** 10 (all already read and cited with line numbers in 109-RESEARCH.md this session; no additional Read calls were needed since RESEARCH.md's code citations are exact excerpts of the analogs).
**Pattern extraction date:** 2026-09-25
**Source of excerpts:** All code excerpts above are drawn verbatim from `.planning/phases/109-completion-java-class-resolution/109-RESEARCH.md`'s `[VERIFIED: read this session]`-tagged citations, which were read directly from the tracked source files listed above.
