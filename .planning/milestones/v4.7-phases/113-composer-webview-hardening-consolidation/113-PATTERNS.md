# Phase 113: Composer Webview Hardening & Consolidation - Pattern Map

**Mapped:** 2026-09-27
**Files analyzed:** 15 (new/moved modules + modified handlers + new tests)
**Analogs found:** 15 / 15

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|----------------|
| `bbj-vscode/src/webview-message-guard.ts` (NEW, D-04) | utility (guard primitives) | transform/validation | `bbj-vscode/src/language/java-peer-guard.ts` | exact — hand-rolled untrusted-boundary guard style |
| `bbj-vscode/src/webview-csp.ts` (NEW, D-10/REF-07) | utility | transform | `bbj-vscode/src/webview-nonce.ts` | exact — same one-function shared-module shape |
| `bbj-vscode/src/composer-call-scanner.ts` (NEW, D-10/REF-08) | utility | transform | `bbj-vscode/src/addwindow-composer.ts` (`scanArgs`/`trimmedRange`, already exported/shared) | exact — literal extraction of existing exported functions |
| addWindow/addChildWindow shared UI helper module (NEW, D-10, name is planner's choice) | utility | transform | `bbj-vscode/src/language/composer-commands.ts` (`titleArg`) + `bbj-vscode/src/addchildwindow-composer-ui.ts` (`addChildWindowPanelArgAt`) | role-match — parameterize existing near-duplicates |
| `bbj-vscode/src/msgbox-composer-webview.ts` (MODIFIED — add shape guard) | controller (webview message handler) | request-response / event-driven | itself (pre-image); also `addwindow-composer-webview.ts` for the identical `switch` shape | exact |
| `bbj-vscode/src/addwindow-composer-webview.ts` (MODIFIED) | controller | request-response | `msgbox-composer-webview.ts` | exact |
| `bbj-vscode/src/addchildwindow-composer-webview.ts` (MODIFIED) | controller | request-response | `msgbox-composer-webview.ts` | exact |
| `bbj-vscode/src/cvs-composer-webview.ts` (MODIFIED) | controller | request-response | `msgbox-composer-webview.ts` | exact |
| `bbj-vscode/src/setopts-composer-webview.ts` (MODIFIED) | controller | request-response | `msgbox-composer-webview.ts` (structure), but note the missing `if (!r.valid) break` on `apply` — do NOT copy that gap in as a "fix"; only add the shape guard (Pitfall 2) | role-match, one documented divergence |
| `bbj-vscode/src/setopts-tristate-webview.ts` (MODIFIED) | controller | event-driven / async LSP round-trip | `setopts-composer-webview.ts`, but `compose()` calls `sender(...)` (an LSP request) instead of a local `build()` — guard must gate `sender` too (Pitfall 3) | role-match, one documented divergence |
| `bbj-vscode/src/msgbox-composer.ts` (MODIFIED — assignTo validator, scanArgs removed) | service (pure domain logic) | transform | itself; `validateStringField`/`validateBbjExpression` are the shape to extend | exact |
| `bbj-vscode/src/cvs-composer.ts` (MODIFIED — assignTo validator call in `cvsPreview`) | service | transform | `bbj-vscode/src/msgbox-composer.ts` (`msgboxPreview`, `validateStringField`) | exact |
| `bbj-vscode/src/language/composer-commands.ts` → `bbj-vscode/src/composer-commands.ts` (MOVED, D-13) | service (LSP request handlers, thin pass-through) | request-response | itself (no logic change, only path + import updates) | exact |
| `bbj-vscode/test/addwindow-composer-ui.test.ts` (NEW, TEST-10) | test | event-driven (command/CodeAction routing) | `bbj-vscode/test/setopts-in-code-ui.test.ts` (`registerSetOptsInCodeComposer / command routing` block) | exact |
| `bbj-vscode/test/addchildwindow-composer-ui.test.ts` (NEW, TEST-10) | test | event-driven | `bbj-vscode/test/setopts-in-code-ui.test.ts` | exact |
| `bbj-vscode/test/setopts-composer-ui.test.ts` (NEW, TEST-10) | test | event-driven | `bbj-vscode/test/setopts-in-code-ui.test.ts` | exact |
| `bbj-vscode/test/webview-message-guard.test.ts` (NEW) | test | transform | `bbj-vscode/test/msgbox-composer.test.ts` (plain-function unit style) | role-match |
| malformed-message assertions (six webviews) | test | event-driven | `bbj-vscode/test/webview-panel-lifecycle.test.ts` (`discoverPanelModules()`) | exact — recommended reuse vehicle |
| `bbj-intellij/.../ComposerModels.java` (MODIFIED — `assignToError`) | model (DTO) | request-response (JSON-RPC) | itself; `ComposerModelsJsonBoundaryTest.java`'s existing envelope-pinning tests | exact |
| `bbj-intellij/.../MsgboxComposerDialog.java`, `CvsComposerDialog.java` (MODIFIED) | component (Swing dialog) | request-response | themselves (existing field-error rendering for message/title) | exact |

## Pattern Assignments

### `bbj-vscode/src/webview-message-guard.ts` (utility, new)

**Analog:** `bbj-vscode/src/language/java-peer-guard.ts`

**Header/style pattern** (lines 8-26 of java-peer-guard.ts — copy the doc-comment convention: state the trust boundary, state what the module owns, state it is dependency-free):
```typescript
/**
 * The single owner of the bounds applied to <untrusted input> that arrives from <the boundary>
 * (issue #NNN). ... copies a <peer>-supplied ... onto ... unchecked; this module holds every
 * ... guard function that keeps a wrongly typed field from ever reaching <the sink>.
 * Kept free of <heavy deps> so it is unit-testable with plain values and shared by every caller.
 */
```

**Primitive guard pattern** (lines 59-82):
```typescript
/** A plain object, as opposed to `null`, an array, or a primitive. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Whether `name` is usable as ...: a non-empty string of at most {@link MAX_...} characters. */
export function isUsableJavaClassName(name: unknown): name is string {
    return typeof name === 'string' && name.length > 0 && name.length <= MAX_JAVA_IDENTIFIER_LENGTH;
}
```
Use this exact shape for `isString`, `isFiniteInt` (`typeof v === 'number' && Number.isInteger(v)`), `isBoolean`, `isStringArray`/`isIntArray` (`Array.isArray(v) && v.every(isString|isFiniteInt)`), and `isPlainObject` (reuse verbatim — it is a one-line pure function duplicated safely). Each per-composer `isXxxMessage()` guard (D-04) composes these the same way `sanitizeMemberArray`/`sanitizeParameters` compose `isPlainObject`/`isUsableJavaClassName` (lines 138-198 of the analog).

**No-op-on-failure pattern to copy for D-02 (drop silently):** the analog's `sanitize*` functions return early/skip an invalid entry rather than throwing or logging (see `sanitizeMemberArray`, lines 165-198) — mirror this for `isXxxMessage`: return `false`, caller does `if (!isXxxMessage(msg)) return;` with no toast/log (D-02).

---

### `bbj-vscode/src/webview-csp.ts` (utility, new)

**Analog:** `bbj-vscode/src/webview-nonce.ts` (style) + the byte-identical CSP block duplicated six times

**Module style to copy** (webview-nonce.ts, full file):
```typescript
/**
 * Shared CSP nonce generator for every composer webview panel. ...
 */
import { randomBytes } from 'crypto';

export function getNonce(): string {
    return randomBytes(16).toString('base64');
}
```

**Body to extract verbatim** (identical in all six webviews, e.g. `msgbox-composer-webview.ts:182-187`):
```typescript
const nonce = getNonce();
const csp = [
    `default-src 'none'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
].join('; ');
```
New module should export a single function, e.g. `buildComposerCsp(webview: vscode.Webview): { nonce: string; csp: string }`, called identically from all six `getHtml(webview)` functions. Type-only `vscode` import (`import type * as vscode from 'vscode'`) per the `webview-panel-lifecycle.ts` convention below, so the new module stays unit-testable without a real webview.

---

### `bbj-vscode/src/composer-call-scanner.ts` (utility, new)

**Analog:** `bbj-vscode/src/addwindow-composer.ts` lines 388-416 (already-exported, already-shared `scanArgs`/`trimmedRange`)

```typescript
// Source: bbj-vscode/src/addwindow-composer.ts:388-416
export function scanArgs(line: string, open: number): { argRanges: Array<[number, number]>; callEnd: number } {
    // ... existing implementation, move verbatim into the new module
}
export function trimmedRange(line: string, a: number, b: number): [number, number] {
    // ... existing implementation, move verbatim
}
```
Already imported by `cvs-composer.ts:22` (`import { scanArgs, trimmedRange } from './addwindow-composer.js';`) and by `addchildwindow-composer.ts`. After the move, update these two import sites (and any others) to `from './composer-call-scanner.js'`, and delete `msgbox-composer.ts`'s private copy (lines 537-577) in favor of importing from the new module (D-11).

**Call-locator generalization — respect the boundary-regex divergence (Pitfall 1):**
```typescript
// Source: bbj-vscode/src/cvs-composer.ts:144 — CVS's stricter negative-lookbehind boundary
const CVS_CALL_BOUNDARY_SOURCE = String.raw`(?<![A-Za-z0-9_.])cvs\s*\(`;
```
vs. msgbox/addWindow/addChildWindow's plain `/keyword\s*\(/gi`. The generic locator (D-11) must take the boundary-regex source as a parameter per composer — never interpolate the keyword into one shared plain template — so CVS keeps excluding `obj.cvs(`/`xcvs(` while the other three keep their current (looser) matching. Existing exported wrapper names (`findMsgboxCalls`, `findAddWindowCallAt`, `findCvsCalls`, etc.) become one-line wrappers around the shared locator, per D-11 — callers/test assertions unchanged.

---

### `bbj-vscode/src/msgbox-composer-webview.ts`, `addwindow-composer-webview.ts`, `addchildwindow-composer-webview.ts`, `cvs-composer-webview.ts` (SEC-10 shape guard)

**Analog:** each other — the four files share one handler shape exactly.

**Imports pattern** (msgbox-composer-webview.ts:23-24):
```typescript
import { getNonce } from './webview-nonce.js';
import { registerPanelMessageHandler } from './webview-panel-lifecycle.js';
```
Add: `import { isMsgboxMessage } from './webview-message-guard.js';` (per-composer named guard).

**Handler + guard insertion point** (msgbox-composer-webview.ts:134-176):
```typescript
registerPanelMessageHandler(panel, async (msg: { type: string; payload?: Selection }) => {
    switch (msg.type) {
        case 'ready':
            panel.webview.postMessage({ type: 'init', /* ... */ });
            break;
        case 'change':
            if (msg.payload) {
                panel.webview.postMessage({ type: 'preview', ...build(msg.payload) });
            }
            break;
        case 'insert': {
            if (!msg.payload) break;
            const r = build(msg.payload);
            if (!r.valid) break; // guard; the webview also disables the button
            const edit = new vscode.WorkspaceEdit();
            // ... target vs insertUri/insertPosition branches ...
            await vscode.workspace.applyEdit(edit);
            panel.dispose();
            break;
        }
        case 'cancel':
            panel.dispose();
            break;
    }
});
```
D-04's "applied in each handler" option (lower-risk, per Pitfall 4 — avoid wrapping `handler` in `registerPanelMessageHandler` since `webview-panel-lifecycle.test.ts:129-131` asserts `onDidReceiveMessage` was called with the exact `handler` reference):
```typescript
registerPanelMessageHandler(panel, async (msg: { type: string; payload?: Selection }) => {
    if (!isMsgboxMessage(msg)) return; // D-02: dropped silently, no toast/log
    switch (msg.type) { /* unchanged body */ }
});
```

**Error handling pattern:** none needed beyond the guard — D-02 is explicit that a wrong-shaped message gets no toast, no log, matching the existing `if (!r.valid) break` silent-drop precedent at line 152.

---

### `bbj-vscode/src/setopts-composer-webview.ts` (SEC-10 shape guard only — Pitfall 2)

**Analog:** the four webviews above, plus its own pre-image.

```typescript
// Source: bbj-vscode/src/setopts-composer-webview.ts:91-131 (excerpt)
registerPanelMessageHandler(panel, async (msg: { type: string; payload?: PanelSelection }) => {
    switch (msg.type) {
        case 'ready': /* ... */ break;
        case 'change':
            if (msg.payload) panel.webview.postMessage({ type: 'preview', ...build(msg.payload) });
            break;
        case 'apply': {
            if (!msg.payload) break;
            const r = build(msg.payload);
            const edit = new vscode.WorkspaceEdit();
            // NOTE: no `if (!r.valid) break;` here — pre-existing gap, OUT OF SCOPE (Pitfall 2)
            // ... write branches ...
            await applyIfUnchanged(guard, () => vscode.workspace.applyEdit(edit));
            panel.dispose();
            break;
        }
        case 'cancel': panel.dispose(); break;
    }
});
```
Add only `if (!isSetOptsMessage(msg)) return;` at the top. Do not add the missing `if (!r.valid) break;` — that is a separate, undecided value-guard gap (Open Question 1); a diff that touches the `apply` case body beyond the one guard line is a scope violation.

---

### `bbj-vscode/src/setopts-tristate-webview.ts` (SEC-10 shape guard — Pitfall 3)

**Analog:** `setopts-composer-webview.ts`, with the key divergence that `compose()` is an async LSP round-trip, not a local `build()`.

```typescript
// Source: bbj-vscode/src/setopts-tristate-webview.ts:105-109
const compose = async (sel: PanelTriStateSelection): Promise<SetOptsComposeTriStateResult> => {
    const entries: SetOptsTriStateEntry[] = sel.entries.map(e => ({ byte: e.byte, mask: e.mask, state: e.state }));
    const params: SetOptsComposeTriStateParams = { selection: { entries }, variable, indent, scope };
    return await sender(SETOPTS_COMPOSE_TRISTATE_METHOD, params) as SetOptsComposeTriStateResult;
};
```
Guard must run **before** `compose()`/`sender(...)` is invoked — i.e. at the very top of the `registerPanelMessageHandler` callback, exactly as in the other five webviews — so a malformed shape never reaches the LS request. Test this panel's guard by asserting the `sender` mock was never called (per `test/setopts-in-code-ui.test.ts`'s existing `sender` mock pattern, ~line 252), not by asserting no `WorkspaceEdit` occurred (Pitfall 3).

---

### `bbj-vscode/src/msgbox-composer.ts` / `bbj-vscode/src/cvs-composer.ts` (SEC-11 assignTo validator)

**Analog:** `validateStringField` / `validateBbjExpression` in `msgbox-composer.ts` (lines 197-217, 311-327) — the exact validation shape (presence, structural, then domain-specific) to extend for `assignTo`.

**Structural validator pattern** (lines 197-217):
```typescript
export function validateBbjExpression(text: string, opts: { required?: boolean } = {}): { ok: boolean; message?: string } {
    const t = text.trim();
    if (t === '') {
        return opts.required ? { ok: false, message: 'Required' } : { ok: true };
    }
    // ... balanced-quote/paren scan ...
    return { ok: true };
}
```

**Field-validator composition pattern** (lines 311-327):
```typescript
export function validateStringField(text: string, opts: { required?: boolean } = {}): { ok: boolean; message?: string } {
    const t = text.trim();
    if (t === '') {
        return opts.required ? { ok: false, message: 'Required' } : { ok: true };
    }
    const structural = validateBbjExpression(t);
    if (!structural.ok) return structural;
    if (!resolvesToString(t)) {
        const isIdentifier = /^[A-Za-z_][A-Za-z0-9_]*$/.test(t);
        const suffixHint = isIdentifier ? `, or a string variable (${t}$ / ${t}!)` : '';
        return { ok: false, message: `Not a string — quote it as ${quoteAsStringLiteral(t)}${suffixHint}` };
    }
    return { ok: true };
}
```
Model `validateAssignTo(text, { resultType: 'number' | 'string', required, editMode })` on this same three-layer shape (required → structural via `validateBbjExpression` for a `[...]` subscript's contents per D-06 → sigil/identifier check), reusing the identifier regex `^[A-Za-z_][A-Za-z0-9_]*$` as the base-name check and rejecting quotes/`=`/`;`/`:`/operators the way `validateBbjExpression` already flags unbalanced quotes/parens.

**Consumption/wiring pattern** (`msgboxPreview`, lines 392-410):
```typescript
export function msgboxPreview(input: MsgboxPreviewInput): MsgboxPreview {
    const msgV = validateStringField(input.message, { required: true });
    const titleV = validateStringField(input.title, { required: false });
    // ... assignTo validator call + assignToError field belongs here, parallel to msgV/titleV ...
    const statement = composeStatement({
        // ...
        assignTo: input.editMode ? undefined : (input.assignTo || undefined),
    });
    return { /* ... include assignToError, valid: msgV.ok && titleV.ok && customOk && assignToV.ok ... */ };
}
```
Apply the identical pattern inside `cvsPreview` in `cvs-composer.ts`, parameterizing the shared validator by result type (D-06).

---

### `bbj-vscode/src/language/composer-commands.ts` → `bbj-vscode/src/composer-commands.ts` (REF-03 move)

**Analog:** itself — a pure relocation, zero logic change.

**Three call sites to update together** (from RESEARCH.md's verified inventory):
```typescript
// 1. bbj-vscode/src/language/main.ts:17
import { registerComposerRequests } from './composer-commands.js';
// becomes:
import { registerComposerRequests } from '../composer-commands.js';

// 2. bbj-vscode/test/composer-commands.test.ts:2
import { composerHandlers, registerComposerRequests } from '../src/language/composer-commands';
// becomes:
import { composerHandlers, registerComposerRequests } from '../src/composer-commands';

// 3. bbj-vscode/test/setopts-in-code-request.test.ts:512-514 — NOT an import, a hard-coded path read:
fs.readFileSync(path.join(__dirname, '..', 'src', 'language', 'composer-commands.ts'), 'utf-8')
// becomes:
fs.readFileSync(path.join(__dirname, '..', 'src', 'composer-commands.ts'), 'utf-8')
```

---

### `bbj-vscode/test/addwindow-composer-ui.test.ts`, `addchildwindow-composer-ui.test.ts`, `setopts-composer-ui.test.ts` (TEST-10, new files)

**Analog:** `bbj-vscode/test/setopts-in-code-ui.test.ts`'s `describe('registerSetOptsInCodeComposer / command routing (Task 2)', ...)` block (around line 314).

**Mocked-vscode harness pattern** (`msgbox-composer-ui.test.ts:15-50`, same harness style):
```typescript
const {
    registerCommandMock, registerCodeActionsProviderMock, createWebviewPanelMock,
    showInformationMessageMock, showWarningMessageMock, applyEditMock,
    FakeCodeAction, FakePosition, FakeRange, FakeWorkspaceEdit,
} = vi.hoisted(() => {
    class FakeWorkspaceEdit { insert = vi.fn(); replace = vi.fn(); }
    return {
        registerCommandMock: vi.fn(),
        registerCodeActionsProviderMock: vi.fn(),
        createWebviewPanelMock: vi.fn(),
        applyEditMock: vi.fn().mockResolvedValue(true),
        // ...
    };
});
```

**Command-routing test pattern** (`setopts-in-code-ui.test.ts:305-334`):
```typescript
describe('registerSetOptsInCodeComposer / command routing (Task 2)', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    function getRegisteredCommandHandler(): (arg?: unknown) => Promise<void> {
        const call = registerCommandMock.mock.calls.find((c: unknown[]) => c[0] === 'bbj.composeSetoptsInCode');
        if (!call) throw new Error('bbj.composeSetoptsInCode was not registered');
        return call[1] as (arg?: unknown) => Promise<void>;
    }

    test('registers exactly one command and one Code Action provider scoped to the bbj language, no CodeLens', () => {
        const sender: SetOptsInCodeRequestSender = vi.fn();
        registerSetOptsInCodeComposer(fakeContext, sender);
        expect(registerCommandMock).toHaveBeenCalledWith('bbj.composeSetoptsInCode', expect.any(Function));
        expect(registerCodeActionsProviderMock).toHaveBeenCalledTimes(1);
        const [languageArg] = registerCodeActionsProviderMock.mock.calls[0];
        expect(languageArg).toEqual({ language: 'bbj' });
    });
    // ... pull the command callback / CodeActionProvider off the mock .calls and invoke directly,
    // asserting on the resulting panel/edit — never assert only "registerCommand was called".
});
```
Apply this exact shape to `registerAddWindowComposer`, `registerAddChildWindowComposer`, `registerSetOptsComposer` — call the real (unmocked) `register...` function, pull the registered command/CodeActionProvider callback off `registerCommandMock.mock.calls` / `registerCodeActionsProviderMock.mock.calls`, and invoke it directly.

---

### Malformed-message shape-guard tests (all six webviews)

**Analog:** `bbj-vscode/test/webview-panel-lifecycle.test.ts`'s `discoverPanelModules()` (lines 208-213) and its `describe('every webview panel module releases its message handler with its panel (#530)', ...)` block (lines 214+).

```typescript
// Source: bbj-vscode/test/webview-panel-lifecycle.test.ts:208-213
const CREATE_WEBVIEW_PANEL_CALL = /\bcreateWebviewPanel\s*\(/;

function discoverPanelModules(): string[] {
    return collectTsFiles(SRC_DIR).filter((filePath) => CREATE_WEBVIEW_PANEL_CALL.test(readStripped(filePath)));
}

describe('every webview panel module releases its message handler with its panel (#530)', () => {
    const panelModules = discoverPanelModules();
    test('discovers at least six panel modules from the source tree, not a hard-coded list', () => {
        expect(panelModules.length).toBeGreaterThanOrEqual(6);
    });
    test.each(relPathsAndFiles)( /* ... */ );
});
```
Reuse this discovery to drive a new sibling `describe` (or extend this file): for each discovered panel module, open it with a fake panel, capture the message handler passed to `onDidReceiveMessage`, post one malformed message (`{ type: 'insert', payload: { flags: 'nope' } }` or `{ type: 'not-a-real-type' }`), and assert the write-path mock was never called — `applyEditMock` for msgbox/addwindow/addchildwindow/cvs/setopts, the `sender` mock for the tristate panel (Pitfall 3).

---

### `bbj-intellij/.../ComposerModelsJsonBoundaryTest.java` (D-09, `assignToError` pin)

**Analog:** its own existing envelope-pinning test.

```java
// Source: bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java:124-142
@Test
void aMsgboxPreviewResponseParsesThroughTheLsp4jGson() {
    String envelope = """
        {"jsonrpc":"2.0","id":"1","result":{
          "expr":513,"statement":"MSGBOX(\\"Hello\\",513,\\"Title\\")",
          "summary":"OK button, question icon","messageError":null,"titleError":null,"customError":null,
          "valid":true,
          "render":{"title":"Title","message":"Hello","icon":32,"buttons":["OK"],"defaultIndex":0}
        }}""";
    MsgboxPreview result = parse("bbj/composer/msgbox/preview", MsgboxPreview.class, envelope, MsgboxPreviewParams.class);
    assertEquals(513, result.expr);
}
```
Add `"assignToError":null` to the passing envelope and a second test with `"assignToError":"..."` set, asserting deserialization for both `MsgboxPreview` and `CvsPreview`.

## Shared Patterns

### Untrusted-boundary hand-rolled guard style
**Source:** `bbj-vscode/src/language/java-peer-guard.ts` (lines 1-82)
**Apply to:** `webview-message-guard.ts` and every `isXxxMessage()` guard in the six `*-composer-webview.ts` files.
Small, dependency-free, exported type-predicate functions (`function isX(v: unknown): v is T`); failure means "drop/skip," never throw or log (D-02).

### Type-only `vscode` import for testability
**Source:** `bbj-vscode/src/webview-panel-lifecycle.ts` (lines 1-9)
```typescript
import type * as vscode from 'vscode';
```
**Apply to:** `webview-csp.ts`, `webview-message-guard.ts`, and the shared window-composer UI module — every new D-10 module must stay unit-testable with a plain object fake panel, matching this house style.

### `registerPanelMessageHandler` exact-identity constraint
**Source:** `bbj-vscode/test/webview-panel-lifecycle.test.ts:129-131`
```typescript
expect(panel.webview.onDidReceiveMessage).toHaveBeenCalledTimes(1);
expect(panel.webview.onDidReceiveMessage).toHaveBeenCalledWith(handler);
```
**Apply to:** all six webview handlers — if the guard is wired as an optional `registerPanelMessageHandler` argument (D-04's other option) rather than inline in each handler, the function must only wrap `handler` when a guard is actually passed, or this existing test breaks.

### CSP array (byte-identical today, one helper after REF-07)
**Source:** e.g. `bbj-vscode/src/msgbox-composer-webview.ts:182-187`
```typescript
const csp = [
    `default-src 'none'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `script-src 'nonce-${nonce}'`,
].join('; ');
```
**Apply to:** all six webviews' `getHtml(webview)` functions.

### Silent-drop-on-invalid precedent (D-02)
**Source:** `bbj-vscode/src/msgbox-composer-webview.ts:152` — `if (!r.valid) break; // guard; the webview also disables the button`
**Apply to:** the new shape guard's failure path — no toast, no log, matching this existing value-guard's behavior.

## No Analog Found

None — every file in scope has at least a role-match analog already read this session (RESEARCH.md's own "every file in scope was read this session" claim holds; the two documented divergences (setopts's missing value guard, tristate's async `compose`) are pitfalls to respect, not analog gaps).

## Metadata

**Analog search scope:** `bbj-vscode/src/*.ts`, `bbj-vscode/src/language/*.ts`, `bbj-vscode/test/*.ts`, `bbj-intellij/src/{main,test}/java/com/basis/bbj/intellij/composer/**`
**Files scanned:** 15 source files + 4 test files read this session (all cited above with line numbers)
**Pattern extraction date:** 2026-09-27
