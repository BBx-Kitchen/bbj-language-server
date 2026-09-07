# Phase 88: SETOPTS-in-Code Hovers & Tri-State Composer - Pattern Map

**Mapped:** 2026-09-07
**Files analyzed:** 12 (new + modified)
**Analogs found:** 11 / 12 (1 has no analog — a genuinely new pure module)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/language/setopts-code-scanner.ts` (new) | utility (AST data-flow scanner) | transform | `bbj-vscode/src/language/validations/check-variable-scoping.ts` (`walkStatements`/`getStatements`) | role-match (closest existing sibling-statement walker; no exact analog for backward chain-walk) |
| `bbj-vscode/src/language/validations/check-function-calls.ts` (modify: export `resolveLibFunction`) | utility | transform | itself (existing private helper) | exact |
| `bbj-vscode/src/setopts-catalog.ts` (extend: `describeIorAndMask`, `singleBitIorMask`, `singleBitAndMask`) | utility (pure domain engine) | transform | itself (existing `describeVector`/`parseVector`/`encodeVector`) | exact |
| `bbj-vscode/src/language/bbj-hover.ts` (extend: SETOPTS branch in `getAstNodeHoverContent`) | provider (LSP hover) | request-response | itself (existing Java/BBj-class-member branches) | exact |
| `bbj-vscode/src/language/composer-commands.ts` (extend: `bbj/composer/setopts/decodeInCode`, `.../composeTriState`) | route/controller (JSON-RPC handler registry) | request-response | itself (existing `bbj/composer/setopts/decodeCall`/`preview` handlers) | exact |
| `bbj-vscode/test/setopts-code-scanner.test.ts` (new) | test | transform | `bbj-vscode/test/hover.test.ts` (parseHelper pattern) + `check-variable-scoping` tests | role-match |
| `bbj-vscode/test/hover.test.ts` (extend) | test | request-response | itself | exact |
| `bbj-intellij/.../composer/ConfigureSetoptsInCodeIntention.java` (new) | controller (IntentionAction trigger) | event-driven | `bbj-intellij/.../composer/ConfigureMsgboxIntention.java` | exact |
| `bbj-intellij/.../composer/ComposerLauncher.java` (modify: new `Kind` value + launch branch) | service (dialog orchestration) | request-response | itself (existing `Kind.SETOPTS` / `openSetopts` branch) | exact |
| `bbj-intellij/.../composer/SetoptsTriStateComposerDialog.java` (new, or mode flag on `SetoptsComposerDialog.java`) | component (Swing dialog) | request-response | `bbj-intellij/.../composer/SetoptsComposerDialog.java` | exact |
| `bbj-intellij/.../composer/BbjComposerServer.java` (modify: add `setoptsDecodeInCode`/`setoptsComposeTriState` JSON-RPC methods) | service (LSP4IJ client interface) | request-response | itself (existing `setoptsDecodeCall`/`setoptsPreview` methods) | exact |
| `bbj-intellij/src/test/.../composer/ComposerRequestContractTest.java`, `ComposerModelsJsonBoundaryTest.java` (extend) | test | request-response | itself | exact |

## Pattern Assignments

### `bbj-vscode/src/language/setopts-code-scanner.ts` (new utility, transform)

**Analog:** `bbj-vscode/src/language/validations/check-variable-scoping.ts` (`walkStatements`/`getStatements`, lines 44-55, 348-357) — no exact analog exists for a *backward*, chain-stopping walk; this is the phase's core new-logic deliverable. Compose from these verified primitives rather than inventing new AST-guard idioms.

**Sibling-statement walk pattern to mirror** (`check-variable-scoping.ts:44-55,348-357`):
```typescript
function walkStatements(statements: ReadonlyArray<AstNode>, callback: (stmt: AstNode) => void): void {
    for (const statement of statements) {
        callback(statement);
        if (isCompoundStatement(statement)) {
            walkStatements(statement.statements, callback);
        }
    }
}

function getStatements(node: Program | MethodDecl): ReadonlyArray<AstNode> {
    if (isProgram(node)) {
        return node.statements;
    }
    if (isMethodDecl(node)) {
        return node.body;
    }
    return [];
}
```
The new scanner needs a **backward-from-target-index** variant: extend `getStatements` to also cover `DefFunction.body`, and instead of an unconditional forward walk, iterate backward from the anchor statement's index, stopping at the first `IfStatement`/`ElseStatement`/`IfEndStatement`/`WhileStatement`/`WhileEndStatement`/`ForStatement`/labeled-statement/`GotoStatement`, and treating any `CompoundStatement` sibling as transparent (flatten its `.statements` into the same position), matching `bbj-scope-local.ts:347-354`'s existing "CompoundStatement is transparent to its parent for scoping" rule.

**Variable-name comparison convention** (`check-variable-scoping.ts:61-66`, `getSymbolRefName`):
```typescript
// existing convention: case-insensitive comparison via expr.symbol.$refText?.toLowerCase()
```
BBj is case-insensitive; every variable-name comparison in the new scanner must lowercase via `$refText`, not resolved `.ref` identity (mirrors this exact helper).

**Comma-chained assignment handling** (`check-variable-scoping.ts:115-123`):
```typescript
for (const assignment of stmt.assignments) {
    // iterate ALL assignments on a LetStatement line, not just assignments[0] —
    // `A$=OPTS, B$=1` puts the tracked variable at any index
}
```

**LibFunction call-site resolution** (export target, `check-function-calls.ts:112-124`):
```typescript
/** Resolve a call expression to the builtin {@link LibFunction} it invokes, if any. */
function resolveLibFunction(call: MethodCall): LibFunction | undefined {
    if (!isSymbolRef(call.method)) {
        return undefined;
    }
    let target: AstNode | undefined;
    try {
        target = call.method.symbol.ref;
    } catch {
        return undefined; // cyclic / unresolved reference
    }
    return isLibFunction(target) ? target : undefined;
}
```
Add `export` to this function in `check-function-calls.ts` and import it from the new scanner — do NOT duplicate it (see "New Pitfall: resolveLibFunction is private" below).

**AST shapes to guard on** (all `[VERIFIED]` in RESEARCH.md "Grammar & AST Shape"):
- Shape (a) absolute literal: `isSetOptsStatement(node) && isStringLiteral(node.opts)` (or any expression `parseVector` can round-trip)
- Shape (b) chain: `isSetOptsStatement(node) && isSymbolRef(node.opts)` → run the backward walk
- Shape (c) single IOR/AND call: `isMethodCall(node) && resolveLibFunction(node)?.name.toUpperCase() in {'IOR','AND'}`

**Chain-origin/link tests inside the backward walk:**
- Origin found: assignment `.value` is `SymbolRef` resolving to the `LibVariable` named `OPTS` → chain safe, stop.
- Valid link: assignment `.value` is `MethodCall` resolving via `resolveLibFunction` to `IOR`/`AND` AND its own `args[0]` is a `SymbolRef` to the *same* variable → record, continue backward.
- Anything else touching the tracked variable (literal, alias, unrelated function, IOR/AND on a different var) → chain unsafe, stop.
- Statement not touching the tracked variable → skip, continue backward.
- Hits a branch/loop/goto marker, or exhausts `siblings` with no origin → chain unsafe, stop.

**Error handling / safe-failure discipline:** never partial-parse. Reuse `parseVector`'s existing contract — "return undefined on anything it can't round-trip" (`setopts-catalog.ts:134-142`, doc comment at `setopts-catalog.ts:258-260`: *"Lines with trailing junk or a malformed token return undefined — the composer must not touch what it cannot round-trip."*) Any ambiguity must fail toward `unsafe`/hover-only, never toward a false "safe."

---

### `bbj-vscode/src/setopts-catalog.ts` (extend — pure domain engine, transform)

**Analog:** itself — `describeVector` (lines 224-239), `parseVector`/`encodeVector`, `SETOPTS_BITS` (58-116), `emptyVector`/`growTo`/`setBit` (154-176,145-147), `MAX_BYTES` (line 52).

**New query helper** (mirrors `describeVector`'s filter-map shape, inverted for AND):
```typescript
export function describeIorAndMask(byteNo: number, mask: number, kind: 'set' | 'clear'): string[] {
    return SETOPTS_BITS
        .filter(b => b.byte === byteNo)
        .filter(b => kind === 'set' ? (mask & b.mask) !== 0 : (mask & b.mask) === 0)
        .map(b => b.label);
}
```
DISC-05's exact framing must survive verbatim: AND masks are described as the options they *clear* (bit absent from mask = cleared), never printed as a raw bitmask.

**New mask-generation helpers** (compose-new codegen, D-05), built from existing primitives only:
```typescript
export function singleBitIorMask(byte: number, mask: number): string {
    const v = emptyVector();
    growTo(v, MAX_BYTES);       // all-zero, IOR with 0 leaves other bits untouched
    setBit(v, byte, mask, true);
    return encodeVector(v);
}
export function singleBitAndMask(byte: number, mask: number): string {
    const v: SetOptsVector = { bytes: new Array(MAX_BYTES).fill(0xff), digitCount: MAX_BYTES * 2 };
    setBit(v, byte, mask, false); // AND with 0xff leaves other bits untouched, clears only this one
    return encodeVector(v);
}
```
Flagged open question (Assumption A2 in RESEARCH.md): 16-byte padding is a design default, not verified against BASIS docs — confirm during planning/UAT, but the round-trip discipline (always build from an explicit all-zero or all-`0xff` base vector, never a short/partial vector) is load-bearing regardless of final byte-width and must be preserved by whatever the planner locks in.

---

### `bbj-vscode/src/language/bbj-hover.ts` (extend — provider, request-response)

**Analog:** itself — existing `getHoverContent`/`getAstNodeHoverContent` structure (lines 29-53, 55-108).

**Extension point (exact hook)**:
```typescript
override async getHoverContent(document: LangiumDocument, params: HoverParams): Promise<Hover | undefined> {
    const rootNode = document.parseResult?.value?.$cstNode;
    if (!rootNode) { return undefined; }
    const offset = document.textDocument.offsetAt(params.position);
    const cstNode = findLeafNodeAtOffset(rootNode, offset);
    if (cstNode && cstNode.offset + cstNode.length > offset) {
        this.referenceCstNode = cstNode;
        try {
            return await super.getHoverContent(document, params);
        } catch (e) {
            logger.warn(`Hover failed at offset ${offset}: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
            return undefined;
        } finally {
            this.referenceCstNode = undefined;
        }
    }
    return undefined;
}
```
Add the new SETOPTS branch at the **top** of `getAstNodeHoverContent`, before the existing `isBbjClass(node) || isBBjClassMember(node)` check (bbj-hover.ts:75), guarded by `isSetOptsStatement(node) || (isMethodCall(node) && resolveLibFunction(node)?.name.toUpperCase() in {'IOR','AND'})`, returning its own markdown early. No ordering conflict — none of the existing branches can ever match these node types.

**Performance discipline (D-07):** `textDocument/hover` is already a discrete, client-throttled request — do not add a `DocumentBuilder`/document-change listener or any per-keystroke recomputation for hover. The backward walk is bounded by the enclosing statement list's size, not file size. This satisfies Pitfall 11/Success-Criterion-4 by construction; do not preemptively build a caching layer (that belongs to Phase 89's discoverability cue).

**Test pattern to extend** (`bbj-vscode/test/hover.test.ts:1-58`) — use `parseHelper`, never `DocumentBuilder.build()` (documented project gotcha — build triggers CPL/interop `:5008`, flaky on CI):
```typescript
import { parseHelper } from 'langium/test';
const services = createBBjServices(EmptyFileSystem);
const parse = parseHelper<Model>(services.BBj);
// positionOf(document, snippet) locates a hover target by source-text search
```

---

### `bbj-vscode/src/language/composer-commands.ts` (extend — route/controller, request-response)

**Analog:** itself — existing SETOPTS handlers (lines 231-256) and `registerComposerRequests` (259-263).

**Existing handler shape to match:**
```typescript
'bbj/composer/setopts/decodeCall': (p: { line: string }) => {
    const info = parseSetOptsLine(p.line);
    if (!info) { return { found: false }; }
    return {
        found: true,
        edit: { hexRange: info.hexRange, insertOffset: info.insertOffset, hexDigits: info.hexDigits },
        initial: setoptsInitialSelection(info.vector),
    };
},
'bbj/composer/setopts/preview': (p: { original?: string; selection: SetOptsSelection }) =>
    setoptsPreview(p.original ? parseVector(p.original) : undefined, p.selection),
```

**Registration loop (unchanged):**
```typescript
export function registerComposerRequests(connection: Pick<Connection, 'onRequest'>): void {
    for (const [method, handler] of Object.entries(composerHandlers)) {
        connection.onRequest(method, handler as (params: unknown) => unknown);
    }
}
```
New keys (`'bbj/composer/setopts/decodeInCode'`, `'bbj/composer/setopts/composeTriState'` — Claude's Discretion naming, following the `decodeCall`/`preview` convention) are added to `composerHandlers` — no change to `registerComposerRequests` itself.

**Critical shape difference (flagged, not a drop-in reuse):** every existing `bbj/composer/*/decodeCall` handler takes a single-line `{ line: string }` (`LineQuery`, `composer-commands.ts:42-43`). The new in-code decode needs document-wide, multi-statement context. Do not reuse `LineQuery` — use a `{ uri: string; line: number; character: number }`-shaped params type resolved server-side against the already-open `LangiumDocument`, matching how `getHoverContent(document, params)` itself receives context.

---

### `bbj-intellij/.../composer/ConfigureSetoptsInCodeIntention.java` (new — controller, event-driven)

**Analog:** `bbj-intellij/.../composer/ConfigureMsgboxIntention.java` (full file, lines 16-52) — direct template per D-03.

```java
public final class ConfigureMsgboxIntention implements IntentionAction {
    @Override
    public boolean isAvailable(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) {
        return editor != null && ComposerLauncher.isCaretOnCall(editor, "msgbox");
    }
    @Override
    public void invoke(...) { ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.MSGBOX); }
    @Override
    public boolean startInWriteAction() { return false; } // opens a modal dialog, then applies its own write command
    @Override
    public @NotNull IntentionPreviewInfo generatePreview(...) {
        return new IntentionPreviewInfo.Html("...");
    }
}
```
`isAvailable()` uses the same cheap line-text substring heuristic style as `ComposerLauncher.isCaretOnCall` (`ComposerLauncher.java:49-61`, `text.indexOf(keyword) >= 0`) — for SETOPTS-in-code, gate on "line contains `SETOPTS` or `IOR(`/`AND(` case-insensitively, at or before the caret." The *authoritative* safe/unsafe decision is entirely server-side via `decodeInCode`'s `found`/hover-only response — matches every other composer's split between cheap client gate and authoritative server decode.

---

### `bbj-intellij/.../composer/ComposerLauncher.java` (modify — service, request-response)

**Analog:** itself — existing `Kind` enum (line 40) and `openSetopts` switch arm (lines 88-90, 273-324).

```java
public enum Kind { MSGBOX, ADDWINDOW, ADDCHILDWINDOW, SETOPTS }
```
Add a distinct `SETOPTS_IN_CODE` (or similarly named) enum value rather than overloading `SETOPTS` with a mode flag — RESEARCH.md's Open Question 3 recommends this because the two flows have different DTOs (`SetoptsDecodeCallParams` single-line string vs. new URI+position shape) and different dialogs (2-state vs. 3-state); conflating under one `Kind` would require branching the switch doesn't currently need anywhere else. Reuse `StaleEditGuard`/`DecodeEquality.sameSetopts` for the edit-in-place guard path exactly as `openSetopts` does today (D-04's two safe shapes only).

---

### `bbj-intellij/.../composer/SetoptsTriStateComposerDialog.java` (new, or mode flag) (component, request-response)

**Analog:** `bbj-intellij/.../composer/SetoptsComposerDialog.java` (byte-grouped layout, lines 129-152) plus `PreviewDebouncer.java` (lines 44-53, full file) for D-06's live preview.

```java
for (SetoptsByteGroup group : catalogs.byteGroups) {
    JPanel groupPanel = new JPanel();
    groupPanel.setLayout(new BoxLayout(groupPanel, BoxLayout.Y_AXIS));
    groupPanel.setBorder(BorderFactory.createTitledBorder(group.label));
    for (SetoptsBit bit : catalogs.bits) {
        if (bit.byteNo != group.byteNo) continue;
        JBCheckBox cb = new JBCheckBox(bit.label);
        // ... bbj-annotation greying + tooltip (D-08) ...
        cb.addActionListener(e -> scheduleRefresh());
        checkboxRows.add(new CheckboxRow(bit, cb));
        groupPanel.add(cb);
    }
    form.add(groupPanel);
}
```
Reuse the `catalogs.byteGroups`/`catalogs.bits` iteration verbatim; only the per-row widget changes from `JBCheckBox` (2-state) to a 3-state control (Set/Clear/Leave) — a custom `ButtonGroup`-backed 3-radio-button row or a `JComboBox<TriState>` per row (Swing has no built-in tri-state checkbox — confirm no `com.intellij.ui.components` alternative exists during planning, per Assumption A4).

**Debounce (reuse as-is, no new Alarm/Timer):**
```java
public void trigger() {
    Runnable previous = pending;
    if (previous != null) { scheduler.cancel(previous); }
    Runnable task = () -> uiThread.run(action);
    pending = task;
    scheduler.schedule(task, delayMs);
}
```
`PREVIEW_DEBOUNCE_MS = 300L` (`SetoptsComposerDialog.java:51,93-97`).

---

### `bbj-intellij/.../composer/BbjComposerServer.java` (modify — service, request-response)

**Analog:** itself — existing SETOPTS JSON-RPC methods (lines 98-105).

```java
@JsonRequest("bbj/composer/setopts/decodeCall")
CompletableFuture<SetoptsDecodeResult> setoptsDecodeCall(SetoptsDecodeCallParams params);

@JsonRequest("bbj/composer/setopts/preview")
CompletableFuture<SetoptsPreview> setoptsPreview(SetoptsPreviewParams params);
```
Add new methods (e.g. `setoptsDecodeInCode`, `setoptsComposeTriState`) to this **same** single interface — confirmed established pattern (`getServerInterface()` returns exactly one class).

---

### Test files

**`bbj-vscode/test/setopts-code-scanner.test.ts` (new)** — analog: `bbj-vscode/test/hover.test.ts`'s `parseHelper`/`positionOf` pattern combined with `check-variable-scoping.ts`'s existing test-case style for branch/loop/alias negative cases. Must cover: all three DISC-05 hover shapes, safe-vs-unsafe chain boundaries (branch, loop, alias, unrelated intervening line, comma-chained assignment per the "New Pitfall" below), and a synthetic-large-file timing test proving the walk is bounded by chain length not file size (mirrors #505's convention).

**`bbj-vscode/test/hover.test.ts` (extend)** — same `parseHelper` pattern, never `DocumentBuilder.build()`.

**`bbj-intellij/src/test/.../composer/ComposerRequestContractTest.java`, `ComposerModelsJsonBoundaryTest.java` (extend)** — Pitfall 13's established pattern: every new composer DTO crossing the LSP4IJ boundary joins `ComposerModelsJsonBoundaryTest`'s generalized harness with in-range numeric sentinels; every new request name is asserted against language-server source by `ComposerRequestContractTest`.

## Shared Patterns

### Case-insensitive variable/name comparison
**Source:** `bbj-vscode/src/language/validations/check-variable-scoping.ts:61-66` (`getSymbolRefName`, `expr.symbol.$refText?.toLowerCase()`); also `bbj-vscode/src/language/bbj-scope.ts:376,399,409,414` (`caseInsensitive: true` scope construction).
**Apply to:** `setopts-code-scanner.ts`'s every variable-name and function-name (`IOR`/`AND`) comparison — BBj is case-insensitive throughout.

### LibFunction call-site resolution
**Source:** `bbj-vscode/src/language/validations/check-function-calls.ts:112-124` (`resolveLibFunction`, export it).
**Apply to:** `setopts-code-scanner.ts` (shape-c detection and chain-link `IOR`/`AND` resolution) and `bbj-hover.ts` (hover-branch guard) — both must import the same exported function, never duplicate it.

### "Never touch what you can't round-trip" — fail toward unsafe/hover-only
**Source:** `bbj-vscode/src/setopts-catalog.ts:134-142,258-260` (`parseVector`'s undefined-on-unparseable contract, doc comment).
**Apply to:** `setopts-code-scanner.ts`'s chain-walk (any ambiguity → unsafe) and the new `singleBitIorMask`/`singleBitAndMask` generators (always build from an explicit full-width base vector, never partial).

### Composer request registration (single source of truth)
**Source:** `bbj-vscode/src/language/composer-commands.ts:259-263` (`registerComposerRequests`).
**Apply to:** New `bbj/composer/setopts/decodeInCode`/`composeTriState` handlers — add as new `composerHandlers` keys, no change to the registration loop.

### IntelliJ composer trigger / dialog / debounce / stale-edit-guard seams (reuse as-is)
**Source:** `ConfigureMsgboxIntention.java`, `ComposerLauncher.java`, `SetoptsComposerDialog.java`, `PreviewDebouncer.java`, `StaleEditGuard.java`, `DecodeEquality.java`.
**Apply to:** All new IntelliJ files this phase adds — every *mechanism* (trigger shape, debounce, stale-edit protection, dialog layout/catalog iteration) already exists and should be reused, not reinvented; only the new tri-state widget and the new document-context DTOs are genuinely new.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `bbj-vscode/src/language/setopts-code-scanner.ts` (backward chain-walk algorithm itself) | utility | transform | No existing module performs a *backward*, branch-stopping, chain-terminating statement walk. Closest precedent (`check-variable-scoping.ts`) walks *forward*, whole-scope, and is branch-blind — useful as a structural template (see Pattern Assignments above) but not a drop-in analog for the algorithm's core logic. Planner should follow RESEARCH.md's "Traceability Algorithm" section directly. |

## Metadata

**Analog search scope:** `bbj-vscode/src/language/` (hover, composer-commands, validations, generated AST, lib/*.bbl), `bbj-vscode/src/setopts-catalog.ts`, `bbj-vscode/test/`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/`, `examples/issue208-and-is-also-a-function.bbj`, plus Phase 87 SUMMARY.md files.
**Files scanned:** 12 target files against ~11 analog candidates (all confirmed git-tracked via `git ls-files`).
**Pattern extraction date:** 2026-09-07
**Note:** All code excerpts in this file are drawn from 88-RESEARCH.md, which recorded them as `[VERIFIED: <path>:<lines>]` from direct reads this session; line numbers should be treated as accurate as of the research date and re-checked if Phase 87 code has since been refactored.
