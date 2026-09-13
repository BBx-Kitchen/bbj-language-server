# Phase 89: CVS() Composer, MSGBOX Expressions & Composer Discoverability - Pattern Map

**Mapped:** 2026-09-12
**Files analyzed:** 14
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/cvs-composer.ts` (new) | service/utility (domain module: catalog + encode/decode + call-parsing) | transform | `bbj-vscode/src/addwindow-composer.ts` | exact |
| `bbj-vscode/src/cvs-composer-ui.ts` (new) | controller (VS Code command + CodeActionProvider) | request-response | `bbj-vscode/src/addwindow-composer-ui.ts` | exact |
| `bbj-vscode/src/cvs-composer-webview.ts` (new) | component (webview panel) | event-driven | `bbj-vscode/src/addwindow-composer-webview.ts` | exact |
| `bbj-vscode/src/composer-codelens.ts` (new, or extend `composer-commands.ts`) | provider (Langium `CodeLensProvider` DI service) | request-response | `bbj-vscode/src/setopts-composer-ui.ts` (`SetOptsCodeLensProvider`, the client-side lens being retired) + `bbj-vscode/src/language/bbj-module.ts` (DI registration shape) | role-match (client CodeLens logic moves server-side; DI registration is exact) |
| `bbj-vscode/src/msgbox-composer.ts` (modified — add constant-sum reverse decode) | service/utility | transform | itself (extend existing `BUTTON_SETS`/`ICONS`/`DEFAULT_BUTTONS`/`FLAGS` reverse-lookup, same file) | exact |
| `bbj-vscode/src/language/composer-commands.ts` (modified — new `bbj/composer/cvs/*` entries) | route/controller (LSP `onRequest` dispatch table) | request-response | itself (existing `bbj/composer/setopts/*` entries, lines ~76-256) | exact |
| `bbj-vscode/src/language/bbj-module.ts` (modified — `lsp.CodeLensProvider` registration) | config/provider (DI wiring) | request-response | itself (existing `lsp: {...}` block, lines 98-106) | exact |
| `bbj-vscode/src/language/lib/functions.ts` (modified — CVS signature gains `chars`) | config (built-in function catalog) | CRUD (static data) | itself (existing `CVS(...)` line 192) | exact |
| `bbj-vscode/src/language/lib/functions.bbl` (modified — mirrored sync) | config (hand-synced mirror) | CRUD (static data) | itself (existing `CVS(...)` line 191) | exact |
| `bbj-intellij/.../composer/CvsComposerDialog.java` (new) | component (Swing dialog) | event-driven | `bbj-intellij/.../composer/MsgboxComposerDialog.java` | role-match (flat layout per D-11, closer structurally to addWindow's flat-bitmask shape than SETOPTS's byte-grouped `JBScrollPane`) |
| `bbj-intellij/.../composer/ConfigureCvsIntention.java` (new) | controller (IntelliJ intention/lightbulb) | request-response | `bbj-intellij/.../composer/ConfigureMsgboxIntention.java` | exact |
| `bbj-intellij/.../composer/ComposerModels.java` (modified — add `Cvs*` DTOs) | model | request-response | itself (existing `Setopts*`/`Msgbox*` DTO shapes) | exact |
| `bbj-intellij/.../composer/BbjComposerServer.java` (modified — add `cvs*()` `@JsonRequest` methods) | service (LSP client-side proxy interface) | request-response | itself (existing `setopts*`/`msgbox*` method pairs) | exact |
| `bbj-intellij/.../lsp/BbjLanguageServerFactory.java` (modified — add `.setCodeLensFeature(...)`) | provider (LSP4IJ client-features registration) | request-response | itself (existing `.setDocumentLinkFeature(...)`/`.setCompletionFeature(...)` fluent chain) | exact |

## Pattern Assignments

### `bbj-vscode/src/cvs-composer.ts` (service, transform)

**Analog:** `bbj-vscode/src/addwindow-composer.ts` (whole file, 406 lines) — chosen over `setopts-catalog.ts` per D-11 (CVS is a flat additive bitmask like addWindow's flags, not byte-grouped like SETOPTS).

**Catalog item shape** (lines 19-26):
```typescript
export interface FlagItem {
    value: number;
    label: string;
    group: string;
    detail?: string;
}
export const WINDOW_FLAGS: FlagItem[] = [
    { value: 0x00040000, label: 'Border', group: 'Frame' },
    // ...
];
```
For `CVS_BITS`, prefer `setopts-catalog.ts`'s richer per-bit annotation shape (`since?`, `bbj?: 'ignored' | 'bbj-specific'`) referenced directly in CONTEXT.md D-12/RESEARCH.md Code Examples — merge the two: `addwindow-composer.ts`'s flat-list-of-bits structure + `setopts-catalog.ts`'s `since`/`bbj` fields:
```typescript
// Source: bbj-vscode/src/setopts-catalog.ts:19-32 (read this session)
export interface SetOptsBit {
    byte: number;
    mask: number;
    label: string;
    detail?: string;
    bbj?: 'ignored' | 'bbj-specific';
    bbjDetail?: string;
    since?: string;
}
```

**Bit encode/decode helpers** (lines 100-133, copy near-verbatim, drop hex-specific parts):
```typescript
export function encodeBits(values: number[]): number {
    return values.reduce((acc, v) => (acc | v) >>> 0, 0);
}
export function bitsSet(mask: number, catalog: FlagItem[]): number[] {
    return catalog.filter(f => (mask & f.value) !== 0).map(f => f.value);
}
export function describeMask(mask: number, catalog: FlagItem[]): string {
    const labels = catalog.filter(f => (mask & f.value) !== 0).map(f => f.label);
    return labels.length ? labels.join(' · ') : '(none)';
}
```
CVS's mask is a plain decimal literal-sum (not `$HEX$`), so `formatHex`/`parseHexLiteral` are NOT copied — instead reuse the "constant-sum of integer literals" parser pattern described in Pattern 3 below (D-14 is literals-only, no named-constant reverse lookup exists for CVS).

**Call-parsing / scanArgs infrastructure** (lines 288-405, copy verbatim — this is the exact shared machinery for locating call args, handling nested parens/quoted strings, and computing insert offsets):
```typescript
const HEX_LITERAL = /^\$[0-9A-Fa-f]*\$$/;  // NOT needed for CVS; mask arg is decimal/expr, not hex

export function scanArgs(line: string, open: number): { argRanges: Array<[number, number]>; callEnd: number } {
    // handles nested parens + "" string escapes so commas inside args don't split arguments — copy verbatim
}
export function trimmedRange(line: string, a: number, b: number): [number, number] { /* copy verbatim */ }
```
`findAddWindowCalls`/`findAddWindowCallAt` (lines 380-405) are the direct template for `findCvsCalls`/`findCvsCallAt` — same regex-scan-then-scanArgs shape, swap `addwindow\s*\(` for `cvs\s*\(`.

**D-14 constant-sum-of-literals recognition (edit-in-place):** no existing CVS analog; nearest precedent is the *decimal* literal-sum matcher already used for MSGBOX (`bbj-vscode/src/msgbox-composer.ts:507-514`, `exprValue` field) — a regex over `+`-joined decimal integers, summing recognized tokens, falling back to "not editable" on the first unrecognized token (matches D-14's exact scoping: literals-only, no named constants for CVS since no such catalog exists).

**Preview entry-point pattern** (lines 249-272, `addwindowPreview`) — the single computed-preview-payload function every UI (webview + dialog) calls; `cvsPreview(input: CvsPreviewInput): CvsPreview` should follow this exact shape (one function, no logic duplicated per client).

---

### `bbj-vscode/src/cvs-composer-ui.ts` (controller, request-response)

**Analog:** `bbj-vscode/src/addwindow-composer-ui.ts` (whole file, 68 lines).

**Registration + CodeActionProvider pattern** (lines 16-62, copy structure, rename `addWindow`→`cvs`, `flags`→`mask`):
```typescript
export function registerAddWindowComposer(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('bbj.composeAddWindow', (arg?: AddWindowPanelArg) => openAddWindowComposerPanel(context, arg)),
        vscode.languages.registerCodeActionsProvider(
            { language: 'bbj' },
            new AddWindowCodeActionProvider(),
            { providedCodeActionKinds: [vscode.CodeActionKind.RefactorRewrite] },
        ),
    );
}
class AddWindowCodeActionProvider implements vscode.CodeActionProvider {
    provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection): vscode.CodeAction[] {
        const info = findAddWindowCallAt(document.lineAt(range.start.line).text, range.start.character);
        if (!info) return [];
        // build arg from info, return one RefactorRewrite CodeAction
    }
}
```
Per D-03, this lightbulb/CodeAction stays exactly as this pattern (unchanged for CVS) — it is not retired; only the SETOPTS-specific client-side CodeLens is retired (D-01).

---

### `bbj-vscode/src/composer-codelens.ts` (new shared server-side aggregator) (provider, request-response)

**Analog A — the client-side lens being retired (source of applicability-detection reuse):** `bbj-vscode/src/setopts-composer-ui.ts:94-108`:
```typescript
class SetOptsCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const lenses: vscode.CodeLens[] = [];
        for (let line = 0; line < document.lineCount; line++) {
            const info = parseSetOptsLine(document.lineAt(line).text);
            if (!info) continue;
            const title = `$(settings-gear) ${lineLabel(info)}`;
            lenses.push(new vscode.CodeLens(
                new vscode.Range(line, 0, line, document.lineAt(line).text.length),
                { command: 'bbj.composeConfigSetopts', title, arguments: [argForLine(document, line, info)] },
            ));
        }
        return lenses;
    }
}
```
D-01 says this exact `parseSetOptsLine`-per-line loop is what the new server-side handler's SETOPTS detector reuses — same per-line scan shape, just hosted inside a Langium `CodeLensProvider` instead of a `vscode.languages.registerCodeLensProvider`, and generalized to loop over all five composers' `*parseLine`/`*decodeCall` functions per line (Pitfall 2: iterate raw text lines, no AST walk).

**Analog B — DI registration point:** `bbj-vscode/src/language/bbj-module.ts:98-106`:
```typescript
lsp: {
    ...
    DefinitionProvider: (services) => new BBjDefinitionProvider(services),
    HoverProvider: (services) => new BBjHoverProvider(services),
    SignatureHelp: () => new BBjSignatureHelpProvider(),
    InlayHintProvider: (services) => new BBjInlayHintProvider(services),
    CodeActionProvider: (services) => new BBjCodeActionProvider(services),
    // NEW: CodeLensProvider: (services) => new BBjComposerCodeLensProvider(services),
},
```
Langium's own interface (no project code, informational):
```typescript
// bbj-vscode/node_modules/langium/lib/lsp/code-lens-provider.d.ts:10-11
export interface CodeLensProvider {
    provideCodeLens(document: LangiumDocument, params: CodeLensParams, cancelToken?: CancellationToken): MaybePromise<CodeLens[] | undefined>;
}
```

**Analog C — the imports each detector comes from:** `bbj-vscode/src/language/composer-commands.ts` already imports every composer's parse function (msgbox, addwindow, addchildwindow, setopts) into one module — the new aggregator should import from the same modules (`parseMsgboxCallOnLine`, `parseAddWindowCallOnLine`, the SETOPTS `parseSetOptsLine`, and the new `findCvsCallOnLine`) rather than re-implementing detection.

---

### `bbj-vscode/src/msgbox-composer.ts` (modified — DISC-02 constant-sum reverse decode)

**Analog:** itself — extend the existing forward catalogs (lines 21-52) with a reverse map.
```typescript
// Source: bbj-vscode/src/msgbox-composer.ts:21-52 (read this session)
export const BUTTON_SETS: CatalogItem[] = [
    { value: 0, label: 'OK', constant: 'MSGBOX_BUTTONS_OK' },
    { value: 1, label: 'OK, Cancel', constant: 'MSGBOX_BUTTONS_OK_CANCEL' },
    // ...
];
export const ICONS: CatalogItem[] = [ /* value, label, constant triples */ ];
export const DEFAULT_BUTTONS: CatalogItem[] = [ /* ... */ ];
export const FLAGS: CatalogItem[] = [ /* ... */ ];
```
Existing forward lookup helpers used elsewhere in the same file (`labelOf`, `constOf`, lines 120-177) are the direct template for building `Map<string /* 'BBjMsgBox.X' */, number>` once from all four arrays — new work is `name → value`, a pure string split-on-`+`/sum/lookup, no interop call (RESEARCH.md Pattern 3).

**Existing literal-sum decode precedent to generalize** (lines 507-514, `exprValue`):
```typescript
// existing bare-integer-literal matcher this DISC-02 work generalizes to constant-sum recognition
info.exprValue = parseInt(numMatch[2], 10);
```

**"Not editable" banner-text single-source-of-truth pattern (template for D-08's compose-and-replace banner):**
```typescript
// Source: bbj-vscode/src/language/setopts-in-code-request.ts:146-151 (read this session)
export type SetOptsNotEditableReason = 'shared-line';
export const NOT_EDITABLE_REASON_TEXT: Record<SetOptsNotEditableReason, string> = {
    'shared-line': "one of this chain's statements shares its physical line with other code, "
        // ...
};
```
Follow this `Record<Reason, string>` shape for the new "could not decode expression" reason text (D-08).

---

### `bbj-vscode/src/language/composer-commands.ts` (modified — new `bbj/composer/cvs/*` entries)

**Analog:** itself, lines 76-256 (existing SETOPTS handler entries).
```typescript
// Source: bbj-vscode/src/language/composer-commands.ts:76-256 (read this session)
export const composerHandlers = {
    'bbj/composer/catalogs': () => ({ /* ... */ }),
    'bbj/composer/setopts/decodeCall': (p: { line: string }) => { /* ... */ },
    'bbj/composer/setopts/preview': (p: { original?: string; selection: SetOptsSelection }) =>
        setoptsPreview(p.original ? parseVector(p.original) : undefined, p.selection),
} as const;

export function registerComposerRequests(connection: Pick<Connection, 'onRequest'>): void {
    for (const [method, handler] of Object.entries(composerHandlers)) {
        connection.onRequest(method, handler as (params: unknown) => unknown);
    }
}
```
Per RESEARCH.md's Open Question 1 recommendation, follow SETOPTS's leaner two-request shape: `bbj/composer/cvs/decodeCall` + `bbj/composer/cvs/preview` — add only new entries to `composerHandlers`; `registerComposerRequests`'s loop needs no change.

---

### `bbj-vscode/src/language/lib/functions.ts` + `functions.bbl` (modified — CVS `chars` arity fix)

**Analog:** itself, exact current text (verified identical in both files):
```typescript
// functions.ts:192 and functions.bbl:191 (identical)
CVS(str:string, conversion_flags:int, ERR?!:lineref): string
```
Change to add `chars?:string` as a third optional positional parameter in BOTH files (memorized project convention: hand-synced mirror, no generator — edit both, same session). This is Pitfall 1, a hard prerequisite before the CVS composer emits any `chars` argument.

**Arity-check consumer to verify against** (`bbj-vscode/src/language/validations/check-function-calls.ts:23,51-53,65-68`):
```typescript
const VARIADIC = new Set(['MAX', 'MIN', 'ERR']);
const positionalParams = fn.parameters.filter(p => !p.refByName);
const requiredCount = positionalParams.filter(p => !p.optional).length;
const maxCount = positionalParams.length;
// ...
} else if (!VARIADIC.has(fn.name.toUpperCase()) && positionalArgs.length > maxCount) {
    accept('warning', `Function '${fn.name}()' accepts at most ${maxCount} argument${maxCount === 1 ? '' : 's'}, but received ${positionalArgs.length}.`, { node: call });
}
```

---

### `bbj-intellij/.../composer/CvsComposerDialog.java` (component, event-driven)

**Analog:** `bbj-intellij/.../composer/MsgboxComposerDialog.java` for overall `ComposerFlow`/`StaleEditGuard`/`PreviewDebouncer` wiring; layout itself should be flat (D-11), closer to a simple checkbox list than SETOPTS's byte-grouped `JBScrollPane` skeleton. (File not re-read in full this session — MsgboxComposerDialog.java confirmed tracked; reuse its `ComposerFlow.launch`/`.observe` plumbing per RESEARCH.md's "Don't Hand-Roll" table, and its constructor/apply-button/live-preview wiring shape as the structural template.)

**Chars field grey-out convention (D-12), same bbj-annotated de-emphasis Phase 87 established for SETOPTS** — follow whatever grey-out-with-tooltip widget pattern `SetoptsComposerDialog.java` uses for `bbj: 'ignored'/'bbj-specific'` bits (not re-read this session; same file family, apply identically to the single shared `chars` text field when none of bits 1/2/16/32/128 are checked).

---

### `bbj-intellij/.../composer/ConfigureCvsIntention.java` (controller, request-response)

**Analog:** `bbj-intellij/.../composer/ConfigureMsgboxIntention.java` (whole file, copy near-verbatim, rename).
```java
// Source: bbj-intellij/.../composer/ConfigureMsgboxIntention.java (read this session, whole file)
public final class ConfigureMsgboxIntention implements IntentionAction {
    @Override
    public @NotNull String getText() { return "Configure MSGBOX options…"; }
    @Override
    public @NotNull String getFamilyName() { return "BBj visual composer"; }
    @Override
    public boolean isAvailable(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) {
        return editor != null && ComposerLauncher.isCaretOnCall(editor, "msgbox");
    }
    @Override
    public void invoke(@NotNull Project project, @Nullable Editor editor, @Nullable PsiFile file) {
        if (editor != null) ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.MSGBOX);
    }
    @Override
    public boolean startInWriteAction() { return false; } // opens a modal dialog, applies its own write command
    @Override
    public @NotNull IntentionPreviewInfo generatePreview(...) {
        return new IntentionPreviewInfo.Html("<p>Opens the BBj visual composer ...</p>");
    }
}
```
For `ConfigureCvsIntention`: swap `"msgbox"` → `"cvs"` in `isCaretOnCall`, add a `ComposerLauncher.Kind.CVS` enum entry, swap label text to "Configure CVS() options…" (D-04's naming convention).

---

### `bbj-intellij/.../composer/ComposerModels.java` (model, request-response)

**Analog:** itself — existing `Setopts*`/`Msgbox*` DTO shapes (not fully re-read this session; add `CvsDecodeCallParams`/`CvsDecodeResult`/`CvsPreviewParams`/`CvsPreview` following the same field-naming and Gson-serializable POJO convention already used for the SETOPTS/MSGBOX pairs). Must be covered by `ComposerModelsJsonBoundaryTest.java` per Pitfall 3 — extend that test's existing generalized harness, do not add a narrow parallel test.

---

### `bbj-intellij/.../composer/BbjComposerServer.java` (service, request-response)

**Analog:** itself, lines 38/102-109 (existing SETOPTS method pair) — same single-interface pattern (RESEARCH.md: "the one interface, never a new one").
```java
// Source: bbj-intellij/.../composer/BbjComposerServer.java:38, 102-109 (read this session)
public interface BbjComposerServer extends LanguageServer {
    @JsonRequest("bbj/composer/setopts/decodeCall")
    CompletableFuture<SetoptsDecodeResult> setoptsDecodeCall(SetoptsDecodeCallParams params);

    @JsonRequest("bbj/composer/setopts/preview")
    CompletableFuture<SetoptsPreview> setoptsPreview(SetoptsPreviewParams params);
}
```
Add `cvsDecodeCall`/`cvsPreview` following the identical `@JsonRequest("bbj/composer/cvs/...")` shape. Covered by `ComposerRequestContractTest.java` (extend, per Pitfall 3/Validation Architecture).

---

### `bbj-intellij/.../lsp/BbjLanguageServerFactory.java` (provider, request-response)

**Analog:** itself, lines 40-71 (existing `createClientFeatures()` fluent chain).
```java
// Source: bbj-intellij/.../lsp/BbjLanguageServerFactory.java:40-71 (read this session, whole file)
@Override
public @NotNull LSPClientFeatures createClientFeatures() {
    return new LSPClientFeatures() {
        @Override
        public void initializeParams(@NotNull InitializeParams params) {
            super.initializeParams(params);
            // ... builds JsonObject initializationOptions from BbjSettings ...
        }
    }
    .setDocumentLinkFeature(new LSPDocumentLinkFeature() {
        @Override
        public boolean isSupported(@NotNull PsiFile file) { return false; }
    })
    .setCompletionFeature(new BbjCompletionFeature());
    // NEW: .setCodeLensFeature(new LSPCodeLensFeature() { ... })
}
```
Add `.setCodeLensFeature(...)` to this same fluent chain (Pitfall 4 — this is the automatable half of the D-07 spike; must compile and register before the visible-render human-verify checkpoint).

## Shared Patterns

### Composer-family three-file shape (applies to all VS Code composer new files)
**Source:** `bbj-vscode/src/addwindow-composer.ts` / `addwindow-composer-ui.ts` / `addwindow-composer-webview.ts` trio (also mirrored by `msgbox-composer.ts`/`msgbox-composer-ui.ts`)
**Apply to:** `cvs-composer.ts` (domain logic, no `vscode` import), `cvs-composer-ui.ts` (VS Code command + CodeActionProvider), `cvs-composer-webview.ts` (webview panel) — strict separation, domain module stays framework-free and unit-testable per this project's own stated design.

### Preview single-entry-point function
**Source:** `bbj-vscode/src/addwindow-composer.ts:249-272` (`addwindowPreview`)
**Apply to:** `cvsPreview(input): CvsPreview` — the one function every UI (webview + IntelliJ dialog) calls; never duplicate mask-arithmetic/compose logic per client (RESEARCH.md's "Don't Hand-Roll" table, row 3).

### Call-location scanning (`scanArgs`/`trimmedRange`/regex-then-scan)
**Source:** `bbj-vscode/src/addwindow-composer.ts:320-405`
**Apply to:** `cvs-composer.ts`'s `findCvsCalls`/`findCvsCallAt` — copy verbatim, only the leading regex (`cvs\s*\(` vs `addwindow\s*\(`) and the mask-vs-hex literal test change.

### `bbj/composer/*` request registration
**Source:** `bbj-vscode/src/language/composer-commands.ts:76-256` (`composerHandlers` object + `registerComposerRequests`)
**Apply to:** all new `bbj/composer/cvs/*` entries — add to the object literal, no change to the registration loop.

### Langium `lsp` DI service group registration
**Source:** `bbj-vscode/src/language/bbj-module.ts:98-106`
**Apply to:** the new `CodeLensProvider` entry — same shape as `InlayHintProvider`/`CodeActionProvider`, one factory function taking `services`.

### IntelliJ intention → `ComposerLauncher.launch` handoff
**Source:** `bbj-intellij/.../composer/ConfigureMsgboxIntention.java` (whole file)
**Apply to:** `ConfigureCvsIntention.java` — identical `IntentionAction` shape, `startInWriteAction() == false`, delegates to `ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.CVS)`.

### IntelliJ single composer-server interface, single client-features fluent chain
**Source:** `bbj-intellij/.../composer/BbjComposerServer.java` (interface), `bbj-intellij/.../lsp/BbjLanguageServerFactory.java:40-71` (fluent chain)
**Apply to:** new `cvs*()` `@JsonRequest` methods join the *same* interface; new `.setCodeLensFeature(...)` joins the *same* fluent chain — never a new interface or a second registration call.

### Reason-text single-source-of-truth `Record<Reason, string>`
**Source:** `bbj-vscode/src/language/setopts-in-code-request.ts:146-151` (`NOT_EDITABLE_REASON_TEXT`)
**Apply to:** D-08's compose-and-replace banner text and D-14's CVS fallback-reason text — one exported `Record`, not string literals scattered across call sites.

### `.bbl`/`.ts` manual sync convention
**Source:** `bbj-vscode/src/language/lib/functions.ts:192` / `functions.bbl:191` (currently identical)
**Apply to:** the CVS `chars` arity fix — edit both files in the same commit; no generator keeps them in sync.

## No Analog Found

None — every file in this phase's scope has a close, git-tracked in-repo analog from the existing MSGBOX/addWindow/SETOPTS composer family. The one genuinely new mechanism (server-side `textDocument/codeLens`) has a documented Langium extension-point analog (`InlayHintProvider` registration shape) even though no prior composer used CodeLens server-side before this phase.

## Metadata

**Analog search scope:** `bbj-vscode/src/*.ts`, `bbj-vscode/src/language/*.ts`, `bbj-vscode/src/language/lib/*`, `bbj-vscode/src/language/validations/*`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/*`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/*`
**Files scanned:** 17 (all confirmed git-tracked via `git ls-files`)
**Pattern extraction date:** 2026-09-12
