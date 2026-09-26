# Phase 107: Validation False Alarms & Silent Skips - Pattern Map

**Mapped:** 2026-09-24
**Files analyzed:** 5 (2 modified validation logic files, 1 modified scope-computation file, 1 new-or-extended validator registration, 1 modified document validator)
**Analogs found:** 5 / 5 (all in-tree; VAL-03's target file already exists and contains the exact analog pattern for the new check)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `bbj-vscode/src/language/validations/line-break-validation.ts` (VAL-01, modify in place) | validator (AstNode-wide check) | transform (backward CST walk → mask decision) | itself — `ifEndStatementLineBreaks` is the analog for fixing `elseStatementLineBreaks` | exact (same file, sibling function) |
| `bbj-vscode/src/language/validations/check-variable-scoping.ts` (VAL-02, modify in place) | validator (`ValidationChecks` entry) | transform (AST walk building a symbol-usage map) | itself — `getSymbolRefName`'s own existing `?.` idiom on `.$refText` is the analog for the missing `?.` on `.symbol` | exact (same file, same idiom, one step short) |
| `bbj-vscode/src/language/bbj-scope-local.ts` (VAL-02, modify in place, line ~295) | service (scope computation, `BbjScopeComputation.processNode`) | event-driven (Langium document-build phase, not request-response) | itself — the assignment branch at lines 236-251 (`!node.instanceAccess` guard) is the analog for how this file already treats an ambiguous/absent read as "skip, don't record" | role-match (same file, different branch, same defensive idiom) |
| `bbj-vscode/src/language/bbj-validator.ts` (VAL-03, add `MemberCall`-registered check; alternatively a new `validations/check-unknown-java-member.ts`) | validator (`ValidationChecks` entry, `MemberCall`) | request-response (single-node accept/reject with `ValidationAcceptor`) | `checkMemberCallUsingAccessLevels` (same file, lines 195-273) — already a `MemberCall` check reading `typeInferer.getType(memberCall.receiver)` and calling `accept('error', …, {node, property: 'member'})` | exact (same AST key, same accept shape, same file) |
| `bbj-vscode/src/language/bbj-document-validator.ts` (VAL-03, add duplicate-linking-warning suppression) | middleware (diagnostics post-processor) | transform (filters a merged `Diagnostic[]` before/inside `applyDiagnosticHierarchy`) | `applyDiagnosticHierarchy`'s own Rule 1 (lines ~143-152, filters by `d.data?.code !== DocumentValidator.LinkingError`) | exact (same file, same filter idiom, same `Diagnostic[]` shape) |
| `bbj-vscode/test/line-break-single-line-if.test.ts` (VAL-01, extend) | test | request-response (parse-and-assert) | itself | exact |
| `bbj-vscode/test/variable-scoping.test.ts` (VAL-02, extend) | test | request-response (parse-and-assert, incl. non-throw assertion) | itself | exact |
| new/extended test file for VAL-03 (e.g. new `describe` block inside `bbj-vscode/test/bbj-validator.test.ts` if it exists, or a new `test/check-unknown-java-member.test.ts`) | test | request-response | `test/variable-scoping.test.ts` (uses both `createBBjServices` and `createBBjTestServices`) for structure; `test/bbj-test-module.ts`'s fake `java.lang.String`/`HashMap` classes for fixtures | role-match |

## Pattern Assignments

### `bbj-vscode/src/language/validations/line-break-validation.ts` (VAL-01)

**Analog:** itself — `ifEndStatementLineBreaks` (lines 215-237) is the corrected shape; `elseStatementLineBreaks` (lines 192-213) is the defect.

**Current defect** (`elseStatementLineBreaks`, lines 192-213):
```typescript
function elseStatementLineBreaks(): LineBreakConfig<ElseStatement> {
    const mask = (node: ElseStatement) => {
        const lineBreaks = { before: false, after: false, both: true };
        let openIfs = 0;
        let prev = previousStatement(node);
        while (isSingleStatement(prev) && isSameLine(prev, node)) {
            if (isIfEndStatement(prev) || isElseStatement(prev)) {
                // A prior closer or ELSE already spent one open IF; an ELSE cannot own two.
                openIfs++;
            } else if (isIfStatement(prev)) {
                if (openIfs === 0) {
                    lineBreaks.both = false;
                    break;
                }
                openIfs--;
            }
            prev = previousStatement(prev);
        }
        return lineBreaks
    }
    return [isElseStatement, mask]
}
```

**Analog to mirror** (`ifEndStatementLineBreaks`, lines 215-237, already correct — `ElseStatement` is in the decrement branch, not the increment branch):
```typescript
function ifEndStatementLineBreaks(): LineBreakConfig<IfEndStatement> {
    const mask = (node: IfEndStatement) => {
        let lineBreaks = { before: false, after: false, both: true };
        let openIfs = 0;
        let prev = previousStatement(node);
        while (isSingleStatement(prev) && isSameLine(prev, node)) {
            if (isIfEndStatement(prev)) {
                openIfs++;
            } else if (isIfStatement(prev) || isElseStatement(prev)) {
                if (openIfs === 0) {
                    lineBreaks.both = false;
                    break;
                }
                openIfs--;
            }
            prev = previousStatement(prev);
        }
        return lineBreaks
    }
    return [isIfEndStatement, mask]
}
```

**Fix (D-01):** move `isElseStatement` out of `elseStatementLineBreaks`'s increment branch and into its decrement branch, so both functions become structurally identical apart from which statement kind is self-excluded from the increment branch. Do not touch `ifEndStatementLineBreaks`. Do not introduce a shared stack-walk helper (D-01 forbids replacing both counters).

**Guard note (D-03):** `checkLineBreaks` already bails out on parser errors — `bbj-vscode/src/language/validations/line-break-validation.ts:57-61` (`if (document.parseResult.parserErrors.length > 0) { return; }`) — so the blank-message A2 residue is not a parser-recovery artifact; treat as a separate, unsolved investigation (no analog exists yet for this piece; do not force-fit the WR-A fix to it).

---

### `bbj-vscode/src/language/validations/check-variable-scoping.ts` (VAL-02)

**Analog:** itself — the file's own existing `?.` idiom on `.$refText`, one step short of also guarding `.symbol`.

**Before** (crash site, line 64, `getSymbolRefName`):
```typescript
function getSymbolRefName(expr: AstNode): string | undefined {
    if (isSymbolRef(expr)) {
        return expr.symbol.$refText?.toLowerCase();
    }
    return undefined;
}
```

**After (pattern to apply at this and 7 other enumerated sites — lines 64, 141, 147, 161, 166, 180, 185, 229):**
```typescript
function getSymbolRefName(expr: AstNode): string | undefined {
    if (isSymbolRef(expr)) {
        return expr.symbol?.$refText?.toLowerCase();
    }
    return undefined;
}
```

Apply the identical single-token `?.` insertion (`.symbol.` → `.symbol?.`) at every enumerated read: `item.symbol.$refText` (141, 161), `item.receiver.symbol.$refText` (147, 166), `variable.symbol.$refText` / `variable.receiver.symbol.$refText` (180, 185), `child.symbol.$refText` (229). No new shared type-guard helper (D-06). Per D-07, a missing `.symbol` is skipped silently — no new diagnostic emitted; the existing control flow (returning `undefined`, or the caller's existing `if (name === undefined)`-shaped early return) already provides the "nothing to record" behavior once the read itself stops throwing.

---

### `bbj-vscode/src/language/bbj-scope-local.ts` (VAL-02, second crash site)

**Analog:** itself — the assignment branch at lines 236-251, which already uses a guard condition (`isAssignment(node) && !node.instanceAccess && ...`) to skip an ambiguous shape entirely rather than reading through it.

**Crash site** (line ~293-296, `isInputVariable` branch inside `processNode`):
```typescript
if (isSymbolRef(node)) {
    const scopeHolder = node.$container.$container
    const inputName = node.symbol.$refText
    // ... uses inputName to search/register scope
}
```

**Fix pattern (D-05, D-07):** guard the read exactly like the assignment branch guards `node.instanceAccess` — skip the whole branch body silently when `.symbol` is absent, rather than adding a diagnostic:
```typescript
if (isSymbolRef(node)) {
    if (!node.symbol) {
        // Nothing to record — same silent-skip contract as check-variable-scoping.ts (D-07).
    } else {
        const scopeHolder = node.$container.$container
        const inputName = node.symbol.$refText
        // ... uses inputName to search/register scope
    }
}
```
(Or equivalently `expr.symbol?.$refText` plus an early `if (!node.symbol) return;`/`continue;` shaped to this branch's existing control flow — whichever matches the branch's own early-exit idiom most closely, per D-06's "match the file's existing idiom" rule.)

---

### `bbj-vscode/src/language/bbj-validator.ts` (VAL-03, new `MemberCall` check)

**Analog:** `checkMemberCallUsingAccessLevels` (same file, lines 195-273) — the only existing `MemberCall`-keyed check; reads `typeInferer.getType(memberCall.receiver)`, guards on `!memberCall.member`, and calls `accept('error', …, {node: memberCall, property: 'member'})`.

**Imports pattern** (lines 7-21, top of file):
```typescript
import { AstNode, AstUtils, CompositeCstNode, CstNode, FileSystemProvider, IndexManager, LangiumDocuments, LeafCstNode, Properties, URI, UriUtils, ValidationAcceptor, ValidationChecks, isCompositeCstNode, isLeafCstNode } from 'langium';
import { basename, normalize, resolve } from 'path';
import type { BBjServices } from './bbj-module.js';
import { TypeInferer } from './bbj-type-inferer.js';
import { BBjAstType, BbjClass, BeginStatement, CallStatement, CastExpression, Class, CommentStatement, DefFunction, EraseStatement, FieldDecl, InitFileStatement, JavaField, JavaMethod, KeyedFileStatement, LabelDecl, MemberCall, MethodDecl, OpenStatement, Option, RunStatement, SwitchCase, SymbolicLabelRef, Use, VariableDecl, isArrayElement, isBBjClassMember, isBBjTypeRef, isBbjClass, isClass, isCompoundStatement, isKeywordStatement, isLabelDecl, isOption, isSimpleTypeRef, isSwitchStatement, isSymbolRef } from './generated/ast.js';
import { JavaInteropService } from './java-interop.js';
```
For the new check, additionally import `isJavaClass`, `isArrayDecl`, `isTemplateStringArray`, `isMethodCall` from `./generated/ast.js` (mirroring `bbj-scope.ts` and `bbj-linker.ts`'s own imports for the same guards).

**Registration pattern** (`registerValidationChecks`, lines 48-75):
```typescript
export function registerValidationChecks(services: BBjServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.BBjValidator;
    const checks: ValidationChecks<BBjAstType> = {
        AstNode: checkLineBreaks,
        LabelDecl: validator.checkLabelDecl,
        // ...
        MemberCall: validator.checkMemberCallUsingAccessLevels,
        CastExpression: validator.checkCastExpressionTypeResolvable,
        // ...
    };
    registry.register(checks, validator);
    registerClassChecks(registry, services);
    registerVariableScopingChecks(registry);
    registerFunctionCallChecks(registry);
}
```
A second `MemberCall` check needs its own registry key merged into the same object literal — Langium's `ValidationChecks` map accepts either a single function or an array per AST type; the codebase's `registerClassChecks`/`registerVariableScopingChecks`/`registerFunctionCallChecks` calls (lines 72-74) are the existing pattern for keeping a check in a sibling `validations/*.ts` file instead: each exports a `registerXChecks(registry, services)` function called here. Either approach (inline `MemberCall` array entry, or a new `validations/check-unknown-java-member.ts` following that sibling-file pattern) is consistent with existing conventions (left to Claude's Discretion per CONTEXT.md/RESEARCH.md).

**Core check pattern** (`checkMemberCallUsingAccessLevels`, lines 195-221 excerpted for the accept/guard shape):
```typescript
checkMemberCallUsingAccessLevels(memberCall: MemberCall, accept: ValidationAcceptor): void {
    if(!memberCall.member) {
        //for broken syntax like "obj!.   "
        return;
    }
    // ... type inference via this.typeInferer.getType(memberCall.receiver) ...
    // ... guarded lookups, early returns on ambiguous/unresolved shapes ...
    accept('error', `The member '${member.name}' from the type '${classOfDeclaration.name}' (in ${sourceInfo}) is not visible`, {
        node: memberCall,
        property: 'member'
    });
}
```
The new check reuses this exact `accept('error', message, {node: memberCall, property: 'member'})` shape (same node/property pair the existing linking error targets, which is what gives `BBjDocumentValidator` a reliable matching key for suppressing the duplicate linking Warning — see below), and the same "guard early, return silently on any ambiguous case" idiom (never throw, never flag a non-fully-resolved receiver).

**Guard sources to read (not modify) for the new check's conditions:**
- `bbj-vscode/src/language/bbj-scope.ts:198-233` — the `isClassRef` / static-only filter idiom (`receiver.symbol.ref`, `isJavaClass(ref)`, `.filter(m => m.isStatic)`).
- `bbj-vscode/src/language/bbj-type-inferer.ts:61-65` — the `.class` literal exemption (`memberRefText === 'class'`).
- `bbj-vscode/src/language/bbj-linker.ts:74-83` — the template-string-array receiver skip (`isSymbolRef(receiver) && isArrayDecl(receiver.symbol.ref) && isTemplateStringArray(receiver.symbol.ref)`).
- `bbj-vscode/src/language/generated/ast.ts` (`JavaClass` interface) — the `error?: string` field is the "fully resolved" discriminator: `isJavaClass(receiverType) && !receiverType.error`.

---

### `bbj-vscode/src/language/bbj-document-validator.ts` (VAL-03, suppress duplicate linking warning)

**Analog:** `applyDiagnosticHierarchy`'s own Rule 1 (top-level function, ~lines 117-160) — an existing filter over a merged `Diagnostic[]` matching by `data.code`.

**Rule 1/Rule 2 pattern (read-only reference for the filter idiom):**
```typescript
// Rule 1: parse errors present -> suppress ALL linking errors
if (hasParseErrors) {
    result = result.filter(
        d => d.data?.code !== DocumentValidator.LinkingError
    );
}

// Rule 2: any Error-severity diagnostic -> suppress all warnings/hints, except a downgraded
// syntax warning ...
if (hasAnyError) {
    result = result.filter(
        d => d.severity === DiagnosticSeverity.Error || isDowngradedSyntaxWarning(d)
    );
}
```

**Merge point to filter at** (`BBjDocumentValidator.validateDocument`, lines 270-353): `super.validateDocument()` (line 275) returns the already-merged list — `processLinkingErrors` (line 356, pushes the linking Warning) runs before `validateAst` (runs the new VAL-03 check) inside Langium's own `DefaultDocumentValidator.validateDocument`, and both land in the same array this override receives at line 275. The new suppression step belongs here, as a filter applied to `diagnostics` (or later, on `composed`, right before the existing `applyDiagnosticHierarchy(composed, ...)` call at line 353) — match a `data.code === DocumentValidator.LinkingError` diagnostic against a VAL-03 Error diagnostic by identical `range` (both target `{node: memberCall, property: 'member'}`, so `getDiagnosticRange` computes the same range for both, giving a cheap, reliable match key with no new shared state). This mirrors Rule 1's own `.filter(d => d.data?.code !== DocumentValidator.LinkingError)` idiom, scoped by range instead of applied unconditionally.

**`processLinkingErrors` override** (lines 356-381) — read-only reference showing exactly what the duplicate Warning looks like (`data: { code: DocumentValidator.LinkingError, ... }`, `node: container`, `property: linkingError.info.property`) so the new filter's matching logic targets the right diagnostic shape.

---

## Shared Patterns

### `ValidationAcceptor` error-emission shape
**Source:** `bbj-vscode/src/language/bbj-validator.ts:267-270` (`checkMemberCallUsingAccessLevels`)
**Apply to:** VAL-03's new check
```typescript
accept('error', `${kind} '${memberName}' is not defined on ${receiverType.name}`, {
    node: memberCall,
    property: 'member'
});
```

### Silent-skip-on-ambiguous-input idiom
**Source:** `bbj-vscode/src/language/bbj-scope-local.ts:236` (`isAssignment(node) && !node.instanceAccess`) and `bbj-vscode/src/language/bbj-validator.ts:196-199` (`if(!memberCall.member) { return; }`)
**Apply to:** VAL-02's guard sites and VAL-03's early-return guards — the codebase's established contract is "skip silently, no diagnostic, no throw" for a malformed/ambiguous node, never a defensive try/catch.

### Test scaffolding: `validationHelper` + `createBBjServices`
**Source:** `bbj-vscode/test/line-break-single-line-if.test.ts:1-21`
**Apply to:** VAL-01 and VAL-02 regression tests
```typescript
import { EmptyFileSystem } from 'langium';
import { beforeAll, describe, expect, test } from 'vitest';
import { validationHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Program } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

const services = createBBjServices(EmptyFileSystem);
let validate: ReturnType<typeof validationHelper<Program>>;

beforeAll(async () => {
    await initializeWorkspace(services.shared);
    validate = validationHelper<Program>(services.BBj);
});
```
`test.each` with a `[label, source][]` array (lines 24-66) is the established pattern for a matrix of "stays clean" / "stays flagged" variants (D-02's matrix, D-12's guard-case matrix).

### Test scaffolding: `createBBjTestServices` for Java-interop-dependent cases
**Source:** `bbj-vscode/test/variable-scoping.test.ts:1-8` (imports both `createBBjServices` and `createBBjTestServices`); `bbj-vscode/test/bbj-test-module.ts` (fake `java.lang.String` with static `CASE_INSENSITIVE_ORDER` field and instance `someInstanceField`, fake `java.util.HashMap` with inherited `getClass` method)
**Apply to:** VAL-03's guard-case unit tests (D-12) — use `declare java.lang.String s!` then `s!.anyInvalidMethod()` as the "fully resolved JavaClass, unknown member" positive case (NOT bare `BBjAPI()` — see Pitfall below); `String.CASE_INSENSITIVE_ORDER` / `someInstanceField` for the static-vs-instance guard; `HashMap`'s `getClass` for the inherited-method guard; an unregistered class name for the "cold/unresolved" guard (`bbj-test-module.ts:172-189` returns a stub with `error: 'not resolved (test double)'`).

**Pitfall carried from research:** do not use `BBjAPI().anyInvalidMethod()` as the VAL-03 positive fixture in `createBBjTestServices` — `bbj-api.bbl`'s synthetic fallback registers a `LibFunction` scope entry that wins over the indexed fake `JavaClass` in the test double, so `typeInferer.getType()` returns `undefined` and the guard never fires. Use `declare java.lang.String s!` instead.

## No Analog Found

None — all five modified/new files have an exact or role-match in-tree analog. The one genuinely novel piece (VAL-01's blank-message A2 residue mechanism, D-03) has no code analog because its root cause is still unconfirmed per RESEARCH.md Pattern 2 — this is a research gap, not a missing pattern; the planner should treat it as an investigation task (read flagged files locally via the harness, instrument `checkLineBreaks` with a temporary probe), not a copy-a-pattern task.

## Metadata

**Analog search scope:** `bbj-vscode/src/language/`, `bbj-vscode/src/language/validations/`, `bbj-vscode/test/`
**Files scanned:** `line-break-validation.ts`, `check-variable-scoping.ts`, `bbj-scope-local.ts`, `bbj-validator.ts`, `bbj-document-validator.ts`, `bbj-scope.ts`, `bbj-linker.ts`, `bbj-type-inferer.ts`, `java-interop.ts`, `generated/ast.ts`, `lib/bbj-api.ts`, `test/bbj-test-module.ts`, `test/line-break-single-line-if.test.ts`, `test/variable-scoping.test.ts`, `test/line-break-walk-termination.test.ts`
**Pattern extraction date:** 2026-09-24
