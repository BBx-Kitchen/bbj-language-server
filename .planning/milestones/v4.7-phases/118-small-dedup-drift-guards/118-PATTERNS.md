# Phase 118: Small Dedup & Drift Guards - Pattern Map

**Mapped:** 2026-09-28
**Files analyzed:** 9 (4 modified src, 2 modified providers, 1 utility target, 2 new test files, 1 modified test)
**Analogs found:** 9 / 9

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|-----------------|---------------|
| `bbj-vscode/src/language/utils.ts` | utility | transform (AST helper) | itself (existing `readSimpleName`) | exact — extend in place |
| `bbj-vscode/src/language/bbj-signature-help-provider.ts` | provider (LSP feature) | request-response | itself (delete method, add import) | exact |
| `bbj-vscode/src/language/bbj-inlay-hint-provider.ts` | provider (LSP feature) | request-response | itself (delete method, add import) | exact |
| `bbj-vscode/src/language/lib/events.ts` | config (catalog constant) | transform | `bbj-vscode/src/language/lib/functions.ts` (shape target) | role-match |
| `bbj-vscode/src/language/lib/functions.ts` | config (catalog constant) | transform | `bbj-vscode/src/language/lib/variables.ts` (shape target) | role-match |
| `bbj-vscode/src/language/lib/labels.ts` | config (catalog constant) | transform | `bbj-vscode/src/language/lib/variables.ts` (shape target) | role-match |
| `bbj-vscode/src/language/lib/variables.ts` | config (catalog constant) | transform | `bbj-vscode/src/language/lib/events.ts` (shape target) | role-match |
| `bbj-vscode/src/language/lib/{events,functions,labels,variables}.bbl` | data mirror (hand-synced) | file-I/O | (rewrite from own `.ts` sibling's evaluated constant) | exact |
| `bbj-vscode/test/<new>-bbl-drift.test.ts` | test | file-I/O / batch (table-driven) | `bbj-vscode/test/builtin-library-members.test.ts` (`.ts`-vs-`.bbl` equivalence block, lines ~90-127) | exact |
| `bbj-vscode/test/<new>-compiler-options-package-json-drift.test.ts` | test | file-I/O / batch | `bbj-vscode/test/compiler-options-single-table.test.ts` | role-match (adapt to two-directional package.json compare) |
| `bbj-vscode/test/builtin-library-members.test.ts` | test | file-I/O | itself (comment-only edit, lines ~100-105) | exact |

## Pattern Assignments

### `bbj-vscode/src/language/utils.ts` (utility, transform)

**Analog:** itself — existing `readSimpleName` helper, same file.

**Current full content** (`bbj-vscode/src/language/utils.ts:1-16`):
```typescript
import { AstNode } from "langium";

export function assertType<T>(_x: unknown): asserts _x is T {}

/**
 * `simpleName` is a runtime-only property set on interop-supplied DTOs (JavaClass, JavaField,
 * FieldDecl, BbjClass nodes backed by a resolved Java peer); it is absent from the generated AST
 * types. Narrowed to `string | undefined` (never a non-string truthy value in practice) so
 * callers can keep using it directly wherever a `string` is required, while preserving the
 * original falsy-on-empty-string fallback behaviour (`simpleName ? simpleName : node.name`).
 */
export function readSimpleName(node: AstNode): string | undefined {
    const raw = (node as unknown as { simpleName?: unknown }).simpleName;
    return typeof raw === 'string' ? raw : undefined;
}
```

**Pattern to follow (D-09):** Add `import { Reference } from "langium"` (or extend the existing `AstNode` import line) plus `MethodCall, NamedElement, isMemberCall, isSymbolRef` from `./generated/ast.js`, then append a new exported free function next to `readSimpleName`, copied verbatim (both current copies are byte-identical) from either provider's protected method body:

```typescript
export function getFunctionReference(callNode: MethodCall): Reference<NamedElement> | undefined {
    const method = callNode.method;
    if (isSymbolRef(method)) {
        return method.symbol;
    } else if (isMemberCall(method)) {
        return method.member;
    }
    return undefined;
}
```

---

### `bbj-vscode/src/language/bbj-signature-help-provider.ts` (provider, request-response)

**Source of the method to delete** (`bbj-vscode/src/language/bbj-signature-help-provider.ts:60-68`):
```typescript
    protected getFunctionReference(callNode: MethodCall): Reference<NamedElement> | undefined {
        const method = callNode.method;
        if (isSymbolRef(method)) {
            return method.symbol;
        } else if (isMemberCall(method)) {
            return method.member;
        }
        return undefined;
    }
```

**Call site to update** (`bbj-vscode/src/language/bbj-signature-help-provider.ts:24`):
```typescript
        const functionRef = this.getFunctionReference(callNode);
```
becomes `getFunctionReference(callNode)` (free-function call, no `this.`).

**Import block to edit** (`bbj-vscode/src/language/bbj-signature-help-provider.ts:1-6`):
```typescript
import { AstNode, MaybePromise, Reference } from "langium";
import { AbstractSignatureHelpProvider } from "langium/lsp";
import { SignatureHelp, SignatureInformation, ParameterInformation, SignatureHelpOptions, CancellationToken } from "vscode-languageserver";
import { methodSignature } from "./bbj-hover.js";
import { isFunctionNodeDescription, type FunctionNodeDescription } from "./bbj-nodedescription-provider.js";
import { isMemberCall, isMethodCall, isSymbolRef, MethodCall, NamedElement } from "./generated/ast.js";
```
`Reference` import stays (used in the deleted method's own signature only if not reused elsewhere — check other usages before dropping); add `import { getFunctionReference } from "./utils.js";`. Drop `isMemberCall`, `isSymbolRef`, `NamedElement` from the `generated/ast.js` import only if nothing else in the file uses them (verify with a grep across the file first — `MethodCall` and `isMethodCall` are still used by `findEnclosingCall`).

---

### `bbj-vscode/src/language/bbj-inlay-hint-provider.ts` (provider, request-response)

**Source of the method to delete** (`bbj-vscode/src/language/bbj-inlay-hint-provider.ts:93-101`):
```typescript
    protected getFunctionReference(callNode: MethodCall): Reference<NamedElement> | undefined {
        const method = callNode.method;
        if (isSymbolRef(method)) {
            return method.symbol;
        } else if (isMemberCall(method)) {
            return method.member;
        }
        return undefined;
    }
```

**Call site to update** (`bbj-vscode/src/language/bbj-inlay-hint-provider.ts:52`):
```typescript
        const ref = this.getFunctionReference(node);
```
becomes `getFunctionReference(node)`.

**Import block to edit** (`bbj-vscode/src/language/bbj-inlay-hint-provider.ts:1-8`): same pattern as the signature-help provider — add `import { getFunctionReference } from './utils.js';`, keep `MethodCall`/`isMethodCall`/`Expression` etc. (still used elsewhere in this file, e.g. `argumentType`), drop `isMemberCall`/`isSymbolRef`/`NamedElement`/`Reference` only if unused after the deletion (verify by grep — `Reference` is also the return type of the new import, so it becomes unused locally).

---

### Catalog `.ts` shape unification (`lib/events.ts`, `lib/functions.ts`, `lib/labels.ts`, `lib/variables.ts`) — config, transform

**Analog:** the four files are analogs of each other; none is fully correct today (three distinct shapes exist). Use this target shape uniformly (D-04):

**Current head shapes** (measured this session):
- `events.ts` head: `` `\nlibrary\n\n/@@\n... `` (leading blank line, no trim)
- `functions.ts` head: `` `\n\nlibrary\n\n/@@\n... `` (two leading blank lines, no trim on open, but `.trimLeft()` at close)
- `labels.ts`, `variables.ts`: similarly inconsistent (see tails below)

**Current tail shapes** (measured this session):
```
events.ts:    ...eventtype ON_WEB_CONNECTION\t \n \n`;
functions.ts: ...XSSORT(...): string\n\n`.trimLeft();
labels.ts:    ...label *ENDIF\n\n`.trimLeft();\n\n
variables.ts: ...var UNT: int\n\n`             <- no trailing semicolon (ASI-reliant, Pitfall 3)
```

**Target shape (D-04), apply to all four files:**
```typescript
export const builtinX = `library

/@@
...
```
(opening backtick directly followed by `library` on the same line — no leading blank line)
```
...last entry...
`;
```
(closing backtick alone on its own line, immediately followed by `;` — no `.trimLeft()`/`.trimStart()` anywhere).

**Deletions required:** `.trimLeft();` at `functions.ts` (current end, see excerpt above) and at `labels.ts` (current end, see excerpt above) — replace both with a bare `` `; ``. Add the missing trailing `;` to `variables.ts`'s closing backtick (Pitfall 3 — verify with `npx tsc -p tsconfig.json --noEmit` after, per RESEARCH.md).

---

### `lib/*.bbl` catalog mirrors — data mirror, file-I/O

**Pattern (D-02):** Do NOT hand-copy `.ts` source text. Generate each `.bbl` from the **evaluated** `.ts` constant (e.g. a throwaway Node/ts-node script that imports the constant and `fs.writeFileSync`s it to the sibling `.bbl` path), then delete the script. Hand-copying preserves literal `` \` `` (backslash-backtick) source escapes instead of the evaluated single backtick — this is Pitfall 1, the root cause of `functions.bbl`'s ~260-line drift.

**Verification command after rewrite:** the new REF-05 drift test (below) is the pass/fail gate — run it per-file during the rewrite, not just at the end.

---

### `bbj-vscode/test/<new>-bbl-drift.test.ts` (test, file-I/O / batch)

**Analog:** `bbj-vscode/test/builtin-library-members.test.ts`, the `.ts`-vs-`.bbl` equivalence block (lines ~90-127), which already establishes the `fs.readFileSync` + `path.join(__dirname, '..', 'src', 'language', 'lib', physicalFile)` idiom, but compares parsed name-sets, not byte content. The new test must be byte-exact (D-03) and needs no `langium`/`parseHelper` machinery at all.

**Imports pattern** (adapt from `builtin-library-members.test.ts:1-8`, but drop `langium`/`langium/test`/`generated/ast.js` — not needed for a string-equality test):
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, test } from 'vitest';
import { builtinEvents } from '../src/language/lib/events.js';
import { builtinFunctions } from '../src/language/lib/functions.js';
import { builtinSymbolicLabels } from '../src/language/lib/labels.js';
import { builtinVariables } from '../src/language/lib/variables.js';
```

**Core pattern** (table-driven, per CONTEXT.md's discretion note leaning `describe.each`):
```typescript
function normalize(s: string): string {
    return s.replace(/\r\n/g, '\n');
}

const pairs: Array<[string, string, string]> = [
    ['events.bbl', builtinEvents, 'events.ts (builtinEvents)'],
    ['functions.bbl', builtinFunctions, 'functions.ts (builtinFunctions)'],
    ['labels.bbl', builtinSymbolicLabels, 'labels.ts (builtinSymbolicLabels)'],
    ['variables.bbl', builtinVariables, 'variables.ts (builtinVariables)'],
];

describe.each(pairs)('%s matches its .ts source', (bblFile, constant) => {
    test('byte-exact after CRLF normalization', () => {
        const bblPath = path.join(__dirname, '..', 'src', 'language', 'lib', bblFile);
        const bblContent = fs.readFileSync(bblPath, 'utf-8');
        expect(normalize(bblContent), `${bblFile} is out of sync — rewrite it from its .ts export`)
            .toBe(normalize(constant));
    });
});
```

**Path resolution pattern to copy exactly:** `path.join(__dirname, '..', 'src', 'language', 'lib', bblFile)` — matches `builtin-library-members.test.ts`'s existing `physicalPath` construction (same directory depth: `test/` → `..` → `src/language/lib/`).

---

### `bbj-vscode/test/<new>-compiler-options-package-json-drift.test.ts` (test, file-I/O / batch)

**Analog:** `bbj-vscode/test/compiler-options-single-table.test.ts` for the "cross-entry-point equality" spirit and its `COMPILER_OPTIONS` import idiom; `bbj-vscode/test/language-configuration.test.ts` for the "read a repo JSON file directly, bare cwd-relative path" idiom (vitest cwd = `bbj-vscode`, confirmed by RESEARCH.md).

**Imports pattern** (adapt from `compiler-options-single-table.test.ts:1-11`, drop the VS Code adapter import — only the server-side table is needed):
```typescript
import * as fs from 'fs';
import { describe, expect, test } from 'vitest';
import { COMPILER_OPTIONS } from '../src/language/compiler-options.js';
```

**Core two-directional pattern:**
```typescript
// bbj.compiler.trigger is a compile-on-save UI setting, not a bbjcpl flag — not in
// COMPILER_OPTIONS by design.
const ALLOWED_UNTABLED_KEYS = new Set(['trigger']);

function normalizeType(pkgType: unknown): string {
    const types = Array.isArray(pkgType) ? pkgType : [pkgType];
    const nonNull = types.filter(t => t !== 'null');
    return String(nonNull[0]);
}

describe('bbj.compiler.* package.json contributions match COMPILER_OPTIONS', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const props = pkg.contributes.configuration.properties as Record<string, { type: unknown; default: unknown }>;

    test.each(COMPILER_OPTIONS)('$configKey exists in package.json with matching type/default', (option) => {
        const key = `bbj.compiler.${option.configKey}`;
        expect(props[key], `${key} missing from package.json`).toBeDefined();
        expect(normalizeType(props[key].type)).toBe(option.type);
        expect(props[key].default).toBe(option.defaultValue);
    });

    const tabledKeys = new Set(COMPILER_OPTIONS.map(o => `bbj.compiler.${o.configKey}`));
    const packageCompilerKeys = Object.keys(props).filter(k => k.startsWith('bbj.compiler.'));

    test.each(packageCompilerKeys)('%s has a COMPILER_OPTIONS entry or is allow-listed', (key) => {
        const suffix = key.replace('bbj.compiler.', '');
        if (ALLOWED_UNTABLED_KEYS.has(suffix)) return;
        expect(tabledKeys.has(key), `${key} has no COMPILER_OPTIONS entry (or add it to ALLOWED_UNTABLED_KEYS with a reason)`).toBe(true);
    });
});
```
Descriptions/labels are intentionally NOT compared (D-06).

---

### `bbj-vscode/test/builtin-library-members.test.ts` (test, comment-only edit)

**Analog:** itself, lines ~100-105 (the "Compares the *unique* name set, not raw declaration counts" comment block, shown in full in the read above starting `// .ts-vs-.bbl content-equivalence...`).

**Current stale text to correct:**
```typescript
    // Compares the *unique* name set, not raw declaration counts: events.bbl still carries
    // the pre-P61-D2-019 duplicate ON_MOUSE_ENTER/ON_MOUSE_EXIT entries that events.ts no
    // longer has (that fix, landed elsewhere in this phase, only touched the consumed .ts
    // file — the never-read .bbl sibling was correctly out of that fix's scope). A raw-count
    // comparison would flag that pre-existing, already-understood staleness as new drift;
    // the unique-name-set comparison still catches a genuinely added/removed/renamed entry.
```
**Fix:** once D-02 rewrites `events.bbl` from `events.ts`, the duplicate entries no longer exist in either file — reword this paragraph to state that `.bbl` and `.ts` are now kept byte-identical by the new drift test (name-set comparison here is now redundant-but-harmless, or note that the byte-exact test is the stronger guard). No plan/decision IDs (`D-xx`, `P61-...`) belong in the reworded comment per project convention — replace any existing ID mentions too.

## Shared Patterns

### `.bbl`/`package.json` repo-file read idiom
**Source:** `bbj-vscode/test/builtin-library-members.test.ts` (`path.join(__dirname, '..', ...)`) and `bbj-vscode/test/language-configuration.test.ts` (bare cwd-relative `readFileSync`)
**Apply to:** both new drift test files — vitest cwd is `bbj-vscode` (project memory + RESEARCH.md confirmed); either relative form works, pick one consistently per new file.

### No plan/decision IDs in source or test comments
**Source:** project memory (`register-check-source-diff-before-push`) and RESEARCH.md's own Anti-Patterns note
**Apply to:** all new/edited comments in this phase (drift-test failure messages, the `builtin-library-members.test.ts` reword, any `.ts` catalog comments touched incidentally). Issue numbers (`#580`, `#583`, `#603`, `#606`) are fine; `D-xx`/`REF-xx`/`P61-...` tokens are not.

### Free-function extraction shape (dedup)
**Source:** `bbj-vscode/src/language/utils.ts`'s existing `readSimpleName` (a `protected` method turned free function pattern is new to this file, but the file's existing convention — one export per small AST helper, JSDoc above each — applies).
**Apply to:** `getFunctionReference`'s new home in `utils.ts`.

## No Analog Found

None — all files in scope have a concrete same-file or same-role analog in the current tree.

## Metadata

**Analog search scope:** `bbj-vscode/src/language/`, `bbj-vscode/src/language/lib/`, `bbj-vscode/test/`
**Files scanned:** `bbj-signature-help-provider.ts`, `bbj-inlay-hint-provider.ts`, `utils.ts`, `lib/{events,functions,labels,variables}.ts` + `.bbl`, `test/builtin-library-members.test.ts`, `test/compiler-options-single-table.test.ts`, `test/language-configuration.test.ts` (referenced via RESEARCH.md, not re-read)
**Pattern extraction date:** 2026-09-28
