# Phase 87: Shared SETOPTS Composer Layer & IntelliJ Dialog - Pattern Map

**Mapped:** 2026-09-07
**Files analyzed:** 12 (new + modified)
**Analogs found:** 12 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/src/language/composer-commands.ts` (MODIFIED — add `setopts` handlers) | route/service (LSP request handler map) | request-response | itself (existing `msgbox`/`addwindow`/`addchildwindow` handlers in same file) | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java` (MODIFIED — add `setoptsPreview`/`setoptsDecodeCall` `@JsonRequest` methods) | service (dynamic-proxy client interface) | request-response | itself (existing `msgboxDecodeCall`/`msgboxPreview` methods) | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` (MODIFIED — add SETOPTS DTOs) | model (DTO) | request-response | itself (existing `MsgboxDecodeResult`/`AddWindowDecodeResult`/`MsgboxEdit` DTOs) | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` (MODIFIED — add `Kind.SETOPTS` case) | service (orchestration/launch chain) | event-driven | itself (existing `MSGBOX`/`ADD_WINDOW`/`ADD_CHILD_WINDOW` switch cases) | exact |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java` (NEW) | component (Swing `DialogWrapper`) | request-response | `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java` | exact (role+flow match, just larger scrollable form) |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsAction.java` (NEW) | controller (Editor Popup `AnAction`) | event-driven | `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeMsgboxAction.java` | role-match (gating differs: config-file scope vs. editor-present) |
| `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java` (MODIFIED — add `sameSetopts`) | utility (pure comparator) | transform | itself (existing `sameMsgbox`/`sameAddWindow`) | exact |
| `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java` (MODIFIED — extend `DECLARED_REQUESTS`) | test | request-response | itself | exact |
| `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java` (MODIFIED — add SETOPTS section) | test | request-response | itself (existing `MsgboxDecodeResult`/`AddWindowDecodeResult` boundary-test blocks) | exact |
| `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java` (MODIFIED — extend `FakeComposerServer`) | test | event-driven | itself | exact |
| `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/DecodeEqualityTest.java` (MODIFIED — add SETOPTS case) | test | transform | itself | exact |
| `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsActionSourceGuardTest.java` (NEW) | test (source guard) | request-response | `bbj-intellij/src/test/java/com/basis/bbj/intellij/actions/BbjRefreshJavaClassesActionSourceGuardTest.java` (referenced by RESEARCH.md; not directly re-read this session — trust research's verified citation) | role-match |

## Pattern Assignments

### `bbj-vscode/src/language/composer-commands.ts` (route/service, request-response)

**Analog:** itself — extend the existing `composerHandlers` map (msgbox/addwindow/addchildwindow sections already present).

**Imports pattern** (lines 14-34):
```typescript
import type { Connection } from 'vscode-languageserver';
import {
    BUTTON_SETS, ICONS, DEFAULT_BUTTONS, FLAGS,
    encode, decode, describe as describeMsgbox, composeStatement, stateFromSelection, flagsFromState,
    validateStringField, findMsgboxCallAt, parseMsgboxCallOnLine, msgboxPreview,
    splitButtonsAndTrailing,
    type ComposeInput, type MsgboxPreviewInput,
} from '../msgbox-composer.js';
// ... same shape for addwindow-composer.js, addchildwindow-composer.js
```
Follow this exactly for the new SETOPTS import block:
```typescript
import {
    SETOPTS_BITS, BYTE_GROUPS,
    parseVector, encodeVector, parseSetOptsLine, composeSetOptsLine, setoptsPreview, describeVector,
    type SetOptsSelection, type SetOptsVector,
} from '../setopts-catalog.js';
```

**Aggregate catalog pattern** (lines 51-57):
```typescript
export const composerHandlers = {
    'bbj/composer/catalogs': () => ({
        msgbox: { buttonSets: BUTTON_SETS, icons: ICONS, defaultButtons: DEFAULT_BUTTONS, flags: FLAGS },
        addwindow: { flags: WINDOW_FLAGS, eventBits: EVENT_MASK_BITS },
        addchildwindow: { flags: CHILD_WINDOW_FLAGS, eventBits: CHILD_EVENT_MASK_BITS },
        // ADD: setopts: { bits: SETOPTS_BITS, byteGroups: BYTE_GROUPS },
    }),
```

**Thin pass-through / decodeCall pattern** (lines 82-104, msgbox `decodeCall` — the direct template for SETOPTS `decodeCall`, note SETOPTS needs no `character`/caret param per D-03/Pattern 3 in RESEARCH.md):
```typescript
'bbj/composer/msgbox/decodeCall': (p: LineQuery) => {
    const info = p.character === undefined ? parseMsgboxCallOnLine(p.line) : findMsgboxCallAt(p.line, p.character);
    const hasExpr = !!info && info.exprRange !== undefined && info.exprValue !== undefined;
    const canAddOptions = !!info && info.optionInsertOffset !== undefined;
    if (!info || (!hasExpr && !canAddOptions)) {
        return { found: false };
    }
    // ... build { found: true, edit: {...}, initial: {...} }
```
SETOPTS equivalent (line-only, per RESEARCH.md Pattern 1):
```typescript
'bbj/composer/setopts/decodeCall': (p: { line: string }) => {
    const info = parseSetOptsLine(p.line);
    return info ? { found: true, ...info } : { found: false };
},
'bbj/composer/setopts/preview': (p: { original?: string; selection: SetOptsSelection }) =>
    setoptsPreview(p.original ? parseVector(p.original) : undefined, p.selection),
```

**Registration pattern** (lines 204-208, unchanged — no new wiring needed):
```typescript
export function registerComposerRequests(connection: Pick<Connection, 'onRequest'>): void {
    for (const [method, handler] of Object.entries(composerHandlers)) {
        connection.onRequest(method, handler as (params: unknown) => unknown);
    }
}
```

**No error handling / no validation in this file** — every handler is a pure pass-through; malformed input simply returns `{ found: false }` or lets the pure domain function throw (there is no try/catch anywhere in this file — do not add one for SETOPTS either, to stay consistent).

---

### `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java` (service, request-response)

**Analog:** itself — existing `@JsonRequest` methods for msgbox/addWindow (verified by RESEARCH.md: `BbjComposerServer.java:30-88`).

**Pattern:** each existing composer request is one `@JsonRequest("bbj/composer/<kind>/<verb>")` method returning a `CompletableFuture<DtoType>`. Add:
```java
@JsonRequest("bbj/composer/setopts/preview")
CompletableFuture<SetoptsPreview> setoptsPreview(SetoptsPreviewParams params);

@JsonRequest("bbj/composer/setopts/decodeCall")
CompletableFuture<SetoptsDecodeResult> setoptsDecodeCall(SetoptsDecodeCallParams params);
```
**Critical cross-file obligation (Pitfall 4 in RESEARCH.md):** adding a method here is a three-file change — also update `ComposerRequestContractTest.DECLARED_REQUESTS` (literal string set) and `ComposerFlowTest.FakeComposerServer` (must `@Override` both new methods or the test file fails to *compile*, not just fails an assertion).

---

### `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` (model/DTO, request-response)

**Analog:** itself — existing `MsgboxDecodeResult`, `AddWindowDecodeResult`, `MsgboxEdit` DTO records.

**DTO field-type rule (Pitfall 3, RESEARCH.md):** represent the SETOPTS vector as a hex `String` end-to-end (mirrors `setopts-catalog.ts`'s own `hexDigits: string`), not as a numeric bitmask — this sidesteps the `int` vs `long` 32-bit-sign-bit overflow risk that `AddWindowEdit`'s flag fields had to solve with `long`. Offsets (`hexRange`, `insertOffset`) stay plain `int` — they are small bounded string positions, not LSP `Position.character` values, so no `END_OF_LINE_CHARACTER` sentinel is needed.

New DTOs needed: `SetoptsBit`, `SetoptsCatalogs` (`bits: List<SetoptsBit>`, `byteGroups: List<...>`), `SetoptsPreviewParams`/`SetoptsPreviewInput` (mirrors `SetOptsSelection`: `bits`, `maskComma: String`, `maskDot: String`, `rawTail: String`), `SetoptsPreview` (mirrors `SetOptsPreview`: `hexDigits: String`, `line: String`, `summary: String`, `maskInputsEnabled: boolean`, `unknownByBytes: List<...>`), `SetoptsDecodeResult` (`found: boolean`, `edit: SetoptsEdit`), `SetoptsEdit` (`hexRange: int[]`, `insertOffset: Integer`, `hexDigits: String`).

---

### `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` (service, event-driven)

**Analog:** itself — existing `switch (kind)` cases for `MSGBOX`/`ADD_WINDOW`/`ADD_CHILD_WINDOW` (verified `ComposerLauncher.java:74-84`).

**Core launch-chain pattern:**
```java
switch (kind) {
    case MSGBOX -> flow.launch(labelOf(kind), serverFuture,
            (server, catalogs) -> server.msgboxDecodeCall(new DecodeCallParams(lineText, col)),
            (server, catalogs, decoded) -> openMsgbox(project, editor, server, catalogs.msgbox, decoded, line, col));
    // ADD:
    // case SETOPTS -> flow.launch(labelOf(kind), serverFuture,
    //         (server, catalogs) -> server.setoptsDecodeCall(new SetoptsDecodeCallParams(lineText)),
    //         (server, catalogs, decoded) -> openSetopts(project, editor, server, catalogs.setopts, decoded, line));
}
```
Note SETOPTS `decodeCall` takes only `lineText` — no caret column (D-03, line-scoped trigger).

**Edit-in-place vs. compose-new (StaleEditGuard, `ComposerLauncher.java:113-127,259-268`):**
```java
if (edit) {
    MsgboxEdit ed = decoded.edit;
    StaleEditGuard guard = new StaleEditGuard(documentViewOf(editor),
            body -> WriteCommandAction.runWriteCommandAction(project, "Configure MSGBOX", null, body),
            ComposerLauncher::onEdt,
            notice -> ComposerNoticeRenderer.render(project, notice, () -> launch(project, editor, Kind.MSGBOX)),
            StaleEditGuard.REDECODE_TIMEOUT_MILLIS);
    guard.applyIfUnchanged(labelOf(Kind.MSGBOX), line, col, decoded,
            (currentLineText, currentCol) -> server.msgboxDecodeCall(new DecodeCallParams(currentLineText, currentCol)),
            DecodeEquality::sameMsgbox,
            () -> { /* replace the call span */ });
} else {
    insertAtCaret(project, editor, text, "Compose MSGBOX");
}
```
For SETOPTS: `reDecode` ignores/drops the column param (`parseSetOptsLine(line)` takes only a line string); needs a new `DecodeEquality.sameSetopts` comparator (structural equality on `hexRange`/`insertOffset`/`hexDigits`).

---

### `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/SetoptsComposerDialog.java` (NEW component)

**Analog:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java`

**Pattern:** Swing `DialogWrapper` subclass; single `JBScrollPane` (D-07, no tabs) containing one section per `BYTE_GROUPS` entry in catalog order; checkbox rows per `SetoptsBit` — bits annotated `bbj: 'ignored'`/`'bbj-specific'` render with a greyed-out label and the `bbjDetail`/`detail` text as a tooltip (D-08); a preview area (hex + `describeVector` summary text) recomputed via `setoptsPreview` on a debounce (D-09).

**Validation-gates-OK pattern** (`MsgboxComposerDialog.java:255`, per RESEARCH.md Security Domain table):
```java
setOKActionEnabled(p.valid);
```
Apply the same gate for an invalid raw-hex-tail (regex `/^[0-9A-Fa-f]*$/`) — reuse `MsgboxComposerDialog`'s `errorLabel()` convention (small red `JBLabel`) for inline error feedback per RESEARCH.md Open Question 2's recommendation.

**Debounce pattern:** use the existing `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/KeystrokeDebouncer.java` seam (Pitfall 12 in RESEARCH.md — never a bespoke `Alarm`/`Timer`).

---

### `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeSetoptsAction.java` (NEW controller)

**Analog:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeMsgboxAction.java` (full text read this session, 39 lines)

**Full analog for structural cloning:**
```java
package com.basis.bbj.intellij.actions;

import com.basis.bbj.intellij.composer.ComposerLauncher;
import com.intellij.openapi.actionSystem.ActionUpdateThread;
import com.intellij.openapi.actionSystem.AnAction;
import com.intellij.openapi.actionSystem.AnActionEvent;
import com.intellij.openapi.actionSystem.CommonDataKeys;
import com.intellij.openapi.editor.Editor;
import com.intellij.openapi.project.Project;
import org.jetbrains.annotations.NotNull;

public final class BbjComposeMsgboxAction extends AnAction {

    @Override
    public void actionPerformed(@NotNull AnActionEvent e) {
        Project project = e.getProject();
        Editor editor = e.getData(CommonDataKeys.EDITOR);
        if (project == null || editor == null) {
            return;
        }
        ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.MSGBOX);
    }

    @Override
    public void update(@NotNull AnActionEvent e) {
        e.getPresentation().setEnabledAndVisible(e.getProject() != null && e.getData(CommonDataKeys.EDITOR) != null);
    }

    @Override
    public @NotNull ActionUpdateThread getActionUpdateThread() {
        return ActionUpdateThread.BGT;
    }
}
```

**Key divergence for SETOPTS (D-01/D-02):** the `update()` gate is NOT "editor present" — it must be config-file-scoped and PSI-free (no lightbulb/IntentionAction). Replace the availability check with:
```java
@Override
public void update(@NotNull AnActionEvent e) {
    Project project = e.getProject();
    Editor editor = e.getData(CommonDataKeys.EDITOR);
    VirtualFile file = editor != null ? FileDocumentManager.getInstance().getFile(editor.getDocument()) : null;
    boolean visible = project != null && editor != null
            && BbjConfigPathService.getInstance(project).isConfigFile(file);
    e.getPresentation().setEnabledAndVisible(visible);
}
```
This is the exact predicate RESEARCH.md verifies at `BbjConfigPathService.java:120-136`:
```java
public boolean isConfigFile(@Nullable VirtualFile file) {
    if (file == null) {
        return false;
    }
    return isConfigFileName(activeConfigPath(), file.getPath(), file.getName());
}
```
Per D-02, the action must be *absent*, not merely disabled, outside config files — `setEnabledAndVisible(false)` (already the pattern both analogs use) satisfies this since the Editor Popup Menu hides invisible actions.

**`actionPerformed` divergence (D-06, Pitfall 5 — resolved Option B, caret-line-scoped):** capture the current line's raw text at the caret (not a file-wide scan for the first SETOPTS line) and pass it to `ComposerLauncher.launch(project, editor, ComposerLauncher.Kind.SETOPTS)`, which internally calls `setoptsDecodeCall` on just that line.

---

### `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/DecodeEquality.java` (utility, transform)

**Analog:** itself — existing `sameMsgbox`/`sameAddWindow` comparators (referenced structurally in RESEARCH.md's Pattern 4, `ComposerLauncher.java:250`). Add `sameSetopts(SetoptsDecodeResult a, SetoptsDecodeResult b)` doing structural equality on `hexRange`/`insertOffset`/`hexDigits` — used by `StaleEditGuard.applyIfUnchanged` as the re-decode-matches-original check.

---

### Test files (`ComposerRequestContractTest.java`, `ComposerModelsJsonBoundaryTest.java`, `ComposerFlowTest.java`, `DecodeEqualityTest.java`, new `BbjComposeSetoptsActionSourceGuardTest.java`)

**Analog:** themselves (extend existing suites) / `BbjRefreshJavaClassesActionSourceGuardTest.java` for the new source-guard file.

**Contract test pattern** (`ComposerRequestContractTest.java:42-53,100-108`, per RESEARCH.md): a hardcoded `DECLARED_REQUESTS` literal `Set.of(...)` is asserted against a reflective scan of `BbjComposerServer`'s `@JsonRequest` annotations AND against quoted-literal occurrence in the language-server TS sources — add the two new SETOPTS method names to both checks.

**JSON boundary test pattern** (`ComposerModelsJsonBoundaryTest.java:35-46,217-267`): parse a realistic envelope through LSP4IJ's real `MessageJsonHandler`, plus one negative control (oversized-int rejection) and one positive "every parsed range fits a Java int" documentation test — add a SETOPTS section following the same five-test shape used for `MsgboxDecodeResult`/`AddWindowDecodeResult`.

**FakeComposerServer compile-gate:** `ComposerFlowTest.java`'s private `FakeComposerServer implements BbjComposerServer` must add `@Override` stubs for the two new interface methods or the whole test file fails to *compile*.

## Shared Patterns

### `bbj/composer/*` LSP namespace + thin pass-through
**Source:** `bbj-vscode/src/language/composer-commands.ts` (whole file)
**Apply to:** the new `setopts` handler additions in the same file — no new file, per Pitfall 4's requirement that request-name literals live where `ComposerRequestContractTest` already scans.

### ComposerFlow / StaleEditGuard / ComposerNotices / ComposerLauncher (reused as-is)
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java`, `StaleEditGuard.java`, `ComposerNotices.java`, `ComposerLauncher.java`
**Apply to:** `SetoptsComposerDialog`'s launch/apply path — reuse the exact same seams (one `.handle()` terminal → exactly one reason-keyed balloon; `StaleEditGuard.applyIfUnchanged` for edit mode; guard-free `insertAtCaret` for compose-new).

### Config-file scoping predicate
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigPathService.java:120-136`
**Apply to:** `BbjComposeSetoptsAction.update()` — the D-02 gate, already built, null-safe, non-blocking.

### DTO field-type discipline (hex-as-String, `long` for any raw bitmask)
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` (existing `AddWindowEdit`/`MsgboxEdit` field conventions), cross-checked against `ComposerModelsJsonBoundaryTest.java`
**Apply to:** every new SETOPTS DTO — prefer `String hexDigits` over any numeric vector representation.

### Debounced UI-to-server round trip
**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/KeystrokeDebouncer.java`
**Apply to:** `SetoptsComposerDialog`'s live preview (D-09) — never a bespoke `Alarm`/`Timer` (Pitfall 12).

## No Analog Found

None — every file in this phase's scope has a direct or role-match analog already in the codebase (this phase is explicitly "no new domain logic," per RESEARCH.md's own framing).

## Metadata

**Analog search scope:** `bbj-vscode/src/language/`, `bbj-vscode/src/setopts-catalog.ts`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/{composer,actions,config,concurrency}/`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/{composer,actions}/`
**Files scanned:** 13 (all confirmed git-tracked via `git ls-files`)
**Pattern extraction date:** 2026-09-07
