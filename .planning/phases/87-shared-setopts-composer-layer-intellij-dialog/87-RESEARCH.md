# Phase 87: Shared SETOPTS Composer Layer & IntelliJ Dialog - Research

**Researched:** 2026-09-07
**Domain:** LSP custom-request command layer (TypeScript) + IntelliJ Swing dialog (Java/LSP4IJ)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**IntelliJ launch trigger (no PSI parser for config.bbx)**
- **D-01:** The composer opens via a PSI-free Editor context-menu action, not an IntentionAction/lightbulb. `BbxConfigLanguage`/`BbjConfigFileType` (Phase 84 Plan 05) has no parser and is unmapped to the server, so the action's `update()`/availability check scans the current line's raw text the same way VS Code's `parseSetOptsLine` does — no PSI structure to match against. — **Reversibility:** reversible — an intention or additional trigger can be layered on later without changing the underlying dialog/request flow.
- **D-02:** The action is scoped to `config.bbx`/`config.min` files only (mirrors VS Code's `BBX_CONFIG` language filter in `setopts-composer-ui.ts`) — absent entirely in `.bbj` files and everywhere else, not merely disabled.
- **D-03:** Within a config file, the action is available on every line (not just lines that already carry `SETOPTS`): if the current line parses as an existing `SETOPTS <hex>` line, the action edits it; otherwise it composes a new line at the cursor. This mirrors VS Code's `argForActiveEditor` fallback (prefer an existing line in the file, else compose-new) — see D-06/D-07 for exactly which line VS Code prefers vs. what IntelliJ's per-line trigger implies.
- **D-04:** No keyboard shortcut bound in this phase — context-menu entry only, consistent with the MSGBOX/addWindow/addChildWindow baseline (their default keybindings, if any, came later).

**Compose-new vs edit-existing scope**
- **D-05:** Both modes ship in this phase — editing an existing `SETOPTS` line and composing a brand-new one when none exists — matching VS Code parity and the roadmap's own success criterion 1 wording ("previews, composes, and applies edits").
- **D-06:** One single context-menu action handles both modes (not two separate actions): on a recognized `SETOPTS` line it opens in edit mode for that line; anywhere else in a config file it opens in compose-new mode targeting the cursor position. Planner note: VS Code's `argForActiveEditor` actually prefers the file's *first* existing `SETOPTS` line over the line under the cursor (a config.bbx is evaluated once — a second line would silently override, not add) and only falls back to compose-new-at-cursor when the file has no `SETOPTS` line at all. Confirm with the researcher whether IntelliJ's per-line action should mirror that same "first existing line wins, else compose-new" rule for consistency, or intentionally diverge to "the line under the caret, else compose-new" since the trigger itself is now line-scoped rather than file/command-scoped — this was not settled explicitly and is close enough to Claude's Discretion, but flagging the VS Code precedent so planning doesn't diverge by accident.

**Dialog layout for the option catalog**
- **D-07:** Single scrollable panel (`JBScrollPane`), not tabs. Section headers per byte-group in catalog order (`BYTE_GROUPS` from `setopts-catalog.ts`: "Errors, console & listing", "Printing & numeric behavior", "Program loading & file locking", "File access & number formatting", "Large files, licensing & GUI", "Compatibility", "Input & parsing restrictions") — matches the existing MSGBOX/addWindow dialog shape (`MsgboxComposerDialog.java`, `AddWindowComposerDialog.java`), just longer. — **Reversibility:** reversible — a later redesign to tabs would touch only the dialog's layout code, not the request/DTO surface.
- **D-08:** Catalog bits annotated `bbj: 'ignored'` or `'bbj-specific'` in `SETOPTS_BITS` are visually de-emphasized: the checkbox label is greyed out and the bit's `bbjDetail` (or `detail`) note renders as a tooltip. This follows the catalog module's own stated intent ("the `bbj` annotates the delta... so the UI can de-emphasize no-ops") even though VS Code's current webview has no reference implementation of this to copy — IntelliJ is the first UI to actually do it.
- **D-09:** Live preview, debounced. As checkboxes/fields change, a preview area recomputes via the existing `setoptsPreview` function (through the new `bbj/composer/setopts/preview` request) and shows the resulting hex string plus the human-readable summary (`describeVector`) — matching VS Code's WYSIWYG feel and success criterion 1. The debounce goes through the same `Scheduler`/`Alarm` seam already used by other IntelliJ composer dialogs (DISC-10's per-settle-point round-trip goal, even though DISC-10 itself is scoped to Phase 90) rather than firing a server round trip per keystroke/click.

### Claude's Discretion
- Exact context-menu action label/wording, its position in the Editor Popup Menu, and the action ID/class name.
- Whether "the line under the caret" or "the file's first existing SETOPTS line" wins when both exist somewhere in the file but the caret sits elsewhere in the file (see D-06's open note) — researcher/planner may confirm against VS Code's exact fallback order rather than treat this as a fresh design choice.
- Exact request/method names under `bbj/composer/setopts/*` (e.g. `catalogs`, `preview`, `compose`, `parseLine`/`decodeCall` for edit-in-place) — follow the `bbj/composer/msgbox/*` and `bbj/composer/addwindow/*` naming convention in `composer-commands.ts` exactly.
- Dialog field widget choices for the byte 5/6 mask-replacement characters (single-char text field vs. a small combo) and the raw-hex tail field (bytes 10–16) — VS Code's webview implementation is the reference; match its behavior, not necessarily its exact widget.
- Whether "unknown bits" (`unknownByBytes` in `SetOptsPreview`) get their own visual callout or are folded into the summary text only.
- Debounce interval constant and exact wiring point (mirrors Phase 82/86 precedents already in the codebase).

### Deferred Ideas (OUT OF SCOPE)
- **A true IntentionAction/lightbulb trigger for the SETOPTS composer** — D-01 chose a PSI-free context-menu action instead; revisit if `BbxConfigLanguage` ever gains a lightweight parser/PSI for other reasons.
- **A default keyboard shortcut for the composer action** — D-04 deferred; add later without changing the action itself.
- **Composer discoverability cue (persistent clickable marker on every SETOPTS line)** — DISC-01, explicitly Phase 89; this phase's context-menu trigger is the interim entry point.
- **SETOPTS-in-code hovers and the tri-state Set/Clear/Leave composer** — DISC-05/DISC-06, Phase 88, which extends this phase's catalog and `bbj/composer/setopts/*` request shape to BBj code (`IOR`/`AND` expressions), not just `config.bbx`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISC-04 | User editing config.bbx in IntelliJ gets a visual SETOPTS composer equivalent to VS Code's existing one, served by a shared `bbj/composer/setopts/*` command layer that both IDEs use (#633) | `bbj-vscode/src/setopts-catalog.ts`'s existing zero-`vscode`-dependency domain module is the sole source of flag arithmetic/preview logic to re-expose (Standard Stack, Code Examples); `composer-commands.ts`'s `bbj/composer/*` namespace convention is the exact shape to replicate (Architecture Patterns); `ComposerFlow`/`StaleEditGuard`/`ComposerNotices`/`ComposerLauncher` on the IntelliJ side are reused as-is (Don't Hand-Roll); Pitfalls 3/13/14 (closed/must-extend) bound the implementation risk. |
</phase_requirements>

## Summary

This phase adds **zero new domain logic**. Every piece of flag/hex arithmetic, catalog data, and lossless round-trip logic the IntelliJ dialog needs already exists in `bbj-vscode/src/setopts-catalog.ts`, purpose-built with "NO `vscode` dependency" specifically so it could be reused later — this phase is that "later." The work is entirely plumbing: (1) a thin `bbj/composer/setopts/*` re-exposure of that module's pure functions added to the existing `composer-commands.ts`, following the exact pattern already used for MSGBOX/addWindow/addChildWindow (`bbj/composer/msgbox/*`, `bbj/composer/addwindow/*`); (2) a native Swing `SetoptsComposerDialog` on the IntelliJ side, built from the same `ComposerFlow`/`StaleEditGuard`/`ComposerNotices`/`ComposerLauncher` seams every other IntelliJ composer already composes through; and (3) a new Editor Popup Menu action, PSI-free (config.bbx has no parser), scoped to config files only, that either edits the line under the caret or composes a new SETOPTS line — per D-01–D-06.

The two structurally hard problems this phase would otherwise have to solve — the self-inflicted-restart-loop risk from the composer's own config.bbx write (Pitfall 3), and whether LSP4IJ can even issue a custom request without a full restart (Pitfall 14) — are **both already closed** by prior phases: Phase 85's watcher only fires a reload notification when the *consumed PREFIX content* changes, and a SETOPTS-only write never touches that content, so zero suppression code is needed; Phase 86 proved LSP4IJ's dynamic-proxy custom-request path works (`bbj/refreshJavaClasses` joined `bbj/compile`/`bbj/resolvedConfigPath` on `BbjComposerServer` with no restart). What remains open and genuinely load-bearing for this phase is Pitfall 13 (new DTOs crossing the LSP4IJ boundary must join the generalized JSON-boundary test family, with `long` not `int` for any bit value that can set the 32-bit sign bit) and a still-unresolved design question the CONTEXT.md itself flags: whether IntelliJ's per-line trigger should mirror VS Code's "first existing SETOPTS line in the file wins" rule, or diverge to "the line under the caret."

**Primary recommendation:** Add `setopts` handlers to the existing `composerHandlers` map in `composer-commands.ts` (no new file), add a `setopts` field to the existing aggregate `bbj/composer/catalogs` response (reusing the precedent already set when `addchildwindow` joined that same payload), add one `bbj/composer/setopts/preview` aggregate request and one `bbj/composer/setopts/decodeCall` request (line-only, no caret column — the trigger is already line-scoped per D-03), and build `SetoptsComposerDialog.java` + `BbjComposeSetoptsAction.java` as structural clones of `MsgboxComposerDialog.java` + `BbjComposeMsgboxAction.java`, swapping the action's `update()` gate from "editor present" to `BbjConfigPathService.getInstance().isConfigFile(virtualFile)` (already built by Phase 84, zero new code needed for that predicate).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| SETOPTS byte/bit catalog, vector parse/encode, lossless preview computation | API / Backend (language server) | — | Already lives in `setopts-catalog.ts`, a pure editor-agnostic module the server hosts; both clients must consume the *same* computation, so it cannot move to either client tier without duplicating logic (the exact anti-pattern #633 exists to prevent). |
| VS Code SETOPTS composer UI (webview, CodeLens, Code Action, command) | Frontend Server (VS Code extension host) | — | Unchanged this phase — imports `setopts-catalog.ts` directly, in-process; explicitly "zero code changes" per the phase boundary. |
| IntelliJ SETOPTS composer UI (Swing dialog, Editor Popup action) | Frontend Server (IntelliJ plugin process) | — | New this phase. Cannot reach `setopts-catalog.ts` directly (different language/runtime) — must go over LSP4IJ to the API tier. |
| `bbj/composer/setopts/*` request layer | API / Backend (language server) | — | Thin re-exposure, no new logic — the request handlers are pass-throughs to `setopts-catalog.ts`'s pure functions, exactly like `composer-commands.ts` already does for msgbox/addwindow/addchildwindow. |
| config.bbx write (apply) | Frontend Server (IntelliJ plugin — `WriteCommandAction`) / (VS Code extension — `WorkspaceEdit`) | — | Both hosts write locally to the open document via their own editor API; the LS never writes the file itself (consistent with every other composer's apply path). |
| Self-write suppression / hot-reload relevance gate | API / Backend (language server, `config-watcher.ts`) | — | Already delivered structurally by Phase 85 D-06 — a SETOPTS-only write never changes the consumed PREFIX snapshot, so the gate emits zero reload notifications with no composer-side code. |
| Stale-edit protection (re-decode-at-write-time) | Frontend Server (IntelliJ — `StaleEditGuard`) | API / Backend (re-decode round trip) | The guard is IntelliJ-only infrastructure (COMP-02) that re-asks the LS to re-decode current document state before writing; VS Code has no equivalent guard yet (out of scope here). |

## Standard Stack

### Core
No new external packages. This phase is 100% reuse of existing in-repo modules and existing dependency versions already vetted by Phases 78-86.

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|---------------|
| `setopts-catalog.ts` (existing) | n/a (in-repo) | SETOPTS byte/bit catalog, vector <-> hex <-> line conversions, lossless preview | Already the single source of truth; explicitly designed with no `vscode` dependency for exactly this reuse (module doc comment, verified by direct read `bbj-vscode/src/setopts-catalog.ts:14-16`: "This module owns the byte/bit catalog and the vector <-> hex <-> line conversions with NO `vscode` dependency, so it is unit-testable and reusable by the IntelliJ client... later.") `[VERIFIED: bbj-vscode/src/setopts-catalog.ts:14-16]` |
| `composer-commands.ts` (existing) | n/a (in-repo) | `bbj/composer/*` LSP request namespace, `registerComposerRequests` | Established, already-tested convention for exactly this shape of shared command layer (`bbj-vscode/src/language/composer-commands.ts:1-13`, doc comment states the dual-client intent explicitly). `[VERIFIED: bbj-vscode/src/language/composer-commands.ts:1-13]` |
| lsp4j / LSP4IJ (existing pin) | Gradle-pinned 0.19.0 build-time / IDE bundles up to 0.21.0 at runtime (documented skew, Pitfall 13) | Custom request transport for `BbjComposerServer` | Already proven for `bbj/compile`, `bbj/resolvedConfigPath`, `bbj/refreshJavaClasses` (Phase 81, 86). `[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java:30-88]` |
| JUnit 5 (existing) | project-pinned | IntelliJ-side plain-Java-seam tests | Established test framework for every composer class (`ComposerFlowTest`, `StaleEditGuardTest`, `ComposerModelsJsonBoundaryTest`, etc.). |
| Vitest (existing) | project-pinned | `setopts-catalog.ts` unit tests | `bbj-vscode/test/setopts-catalog.test.ts` already exists and covers the domain module — VS Code side needs zero new tests since VS Code source is unchanged. `[VERIFIED: bbj-vscode/test/setopts-catalog.test.ts (file exists)]` |

### Supporting
No supporting libraries beyond what's already declared in `bbj-vscode/package.json` and `bbj-intellij/build.gradle.kts` (Swing/IntelliJ Platform UI components: `JBScrollPane`, `JBCheckBox`, `JBTextField`, `ComboBox` — all already used by `MsgboxComposerDialog.java`/`AddWindowComposerDialog.java`).

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Thin `bbj/composer/setopts/*` re-exposure over LSP4IJ | Reimplement the flag/bit arithmetic natively in Java | Rejected by the phase boundary itself — "the new server-side layer is a thin re-exposure... for IntelliJ to reach over LSP4IJ," matching the established msgbox/addWindow precedent; a native Java reimplementation would create two sources of truth for the exact same 58-bit catalog, the defect class #433 already eliminated once. |
| Single scrollable panel (D-07) | Tabbed dialog (one tab per byte group) | Rejected by D-07 explicitly — matches the existing MsgboxComposerDialog/AddWindowComposerDialog shape (single `JBScrollPane`), reversible later without touching the request/DTO surface. |
| PSI-free Editor Popup action (D-01) | Wait for `BbxConfigLanguage` to gain a lightweight parser, then use an IntentionAction like the other three composers | Rejected for this phase (deferred idea) — no parser exists yet for config.bbx and building one is out of scope; the context-menu action pattern is proven (it's literally how the create-new half of MSGBOX/addWindow/addChildWindow already works via `BbjCompose*Action.java`). |

## Package Legitimacy Audit

No external packages are installed by this phase — every dependency (`org.eclipse.lsp4j`, IntelliJ Platform SDK, `vscode-languageserver`, Vitest, JUnit 5) is already present and pinned in the repo from prior phases. This section is not applicable; the audit protocol is skipped per its own trigger condition ("whenever this phase installs external packages").

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│ VS Code (unchanged)         │        │ IntelliJ plugin (this phase)  │
│                              │        │                                │
│ setopts-composer-ui.ts       │        │ BbjComposeSetoptsAction.java   │
│  (CodeLens / CodeAction /    │        │  Editor Popup, config-file-    │
│   command)                   │        │  scoped (D-01/D-02), per-line  │
│        │                     │        │  availability check (D-03)     │
│        ▼                     │        │        │                       │
│ setopts-composer-webview.ts  │        │        ▼                       │
│  (webview panel)             │        │ ComposerLauncher.launch(       │
│        │                     │        │   Kind.SETOPTS)                │
│        │  imports directly,  │        │        │  captures caret line/ │
│        │  in-process         │        │        │  column synchronously │
│        ▼                     │        │        ▼                       │
│ setopts-catalog.ts  ◄────────┼────────┼── ComposerFlow.launch(         │
│  (pure domain module:        │        │   serverFuture                 │
│   SETOPTS_BITS, BYTE_GROUPS, │        │   -> composerCatalogs()        │
│   parseVector/encodeVector,  │        │   -> setoptsDecodeCall)         │
│   parseSetOptsLine,          │        │        │                       │
│   setoptsPreview,            │        │        ▼                       │
│   describeVector)             │        │ SetoptsComposerDialog.java     │
│        ▲                     │        │  (Swing DialogWrapper,          │
│        │  same TS runtime,   │        │   D-07 single scroll panel,    │
│        │  no LSP hop needed  │        │   D-08 de-emphasized bits,     │
└────────┼─────────────────────┘        │   D-09 debounced preview)      │
         │                                │        │  every keystroke ->  │
         │  new: thin re-exposure         │        │  KeystrokeDebouncer- │
         │  (this phase)                  │        │  style seam ->       │
         ▼                                │        ▼                       │
┌─────────────────────────────────────────┼─ bbj/composer/setopts/preview ┤
│ Language Server (bbj-vscode/src/language/composer-commands.ts)          │
│                                                                            │
│  composerHandlers['bbj/composer/setopts/preview']                        │
│    -> setoptsPreview(original, selection)   [pure pass-through]           │
│  composerHandlers['bbj/composer/setopts/decodeCall']                     │
│    -> parseSetOptsLine(line)                [pure pass-through]           │
│  composerHandlers['bbj/composer/catalogs'].setopts                       │
│    -> { bits: SETOPTS_BITS, byteGroups: BYTE_GROUPS }                    │
└────────────────────────────────────────────────────────────────────────┘
         │  dialog OK/Apply
         ▼
┌────────────────────────────────────┐
│ StaleEditGuard.applyIfUnchanged(     │   re-decodes captured line at write
│   ...)                               │   time; writes only on match, with
│  -> WriteCommandAction (IntelliJ)    │   modification-stamp re-check as the
│  -> config.bbx text edit             │   write command's first statement
└────────────────────────────────────┘
         │
         ▼
config.bbx on disk  ──►  Phase 85 config-watcher.ts relevance gate
                          (consumed PREFIX snapshot unchanged for a
                           SETOPTS-only write ⇒ zero bbj/configReloadRequired
                           notifications ⇒ no restart, success criterion 2)
```

### Recommended Project Structure
```
bbj-vscode/src/language/
└── composer-commands.ts          # MODIFIED — add setopts handlers to composerHandlers,
                                   #   add `setopts` field to bbj/composer/catalogs response

bbj-intellij/src/main/java/com/basis/bbj/intellij/
├── composer/
│   ├── BbjComposerServer.java    # MODIFIED — add setoptsPreview/setoptsDecodeCall @JsonRequest methods
│   ├── ComposerModels.java       # MODIFIED — add SetoptsBit, SetoptsCatalogs, SetoptsPreview(Input/Params),
│   │                              #   SetoptsDecodeResult, SetoptsEdit DTOs
│   ├── ComposerLauncher.java     # MODIFIED — add Kind.SETOPTS case
│   ├── SetoptsComposerDialog.java  # NEW — clone of MsgboxComposerDialog.java's shape (D-07/D-08/D-09)
│   └── (ComposerFlow/StaleEditGuard/ComposerNotices/ComposerLauncher/
│        ComposerNoticeRenderer — reused as-is, no changes)
└── actions/
    └── BbjComposeSetoptsAction.java  # NEW — clone of BbjComposeMsgboxAction.java, config-file-scoped update()

bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/
├── ComposerRequestContractTest.java       # MODIFIED — extend DECLARED_REQUESTS set (both halves — see Pitfalls)
├── ComposerModelsJsonBoundaryTest.java    # MODIFIED — add SETOPTS DTO round-trip + oversized-int negative control
└── ComposerFlowTest.java                  # MODIFIED — FakeComposerServer must implement the two new
                                            #   interface methods or the file fails to compile

QA/FULL-TEST-CHECKLIST.md                  # MODIFIED — new IntelliJ SETOPTS row (mirrors existing row 14)
```

### Pattern 1: Thin LSP re-exposure of a pure domain module
**What:** A request handler in `composer-commands.ts` does nothing but call a pure function from the domain module and reshape its return value into the wire DTO. No new arithmetic, no new validation logic.
**When to use:** Every `bbj/composer/setopts/*` handler in this phase.
**Example:**
```typescript
// Source: bbj-vscode/src/language/composer-commands.ts:60-71 (existing msgbox pattern, verified read)
'bbj/composer/msgbox/preview': (p: { input: MsgboxPreviewInput }) => msgboxPreview(p.input),
'bbj/composer/msgbox/compose': (p: { input: ComposeInput }) => ({ statement: composeStatement(p.input) }),

// Recommended SETOPTS equivalent, following the identical shape:
'bbj/composer/setopts/preview': (p: { original?: string; selection: SetOptsSelection }) =>
    setoptsPreview(p.original ? parseVector(p.original) : undefined, p.selection),
'bbj/composer/setopts/decodeCall': (p: { line: string }) => {
    const info = parseSetOptsLine(p.line);
    return info ? { found: true, ...info } : { found: false };
},
```

### Pattern 2: Aggregate catalog fetched once per session
**What:** One `bbj/composer/catalogs` request returns every composer kind's static catalog data in a single round trip; the client caches it for the session (DISC-11, Phase 90, but the shape should not preclude that later optimization).
**When to use:** SETOPTS's `SETOPTS_BITS`/`BYTE_GROUPS` — static, never changes at runtime — belongs in this same aggregate, exactly like `addchildwindow`'s catalog joined it previously.
**Example:**
```typescript
// Source: bbj-vscode/src/language/composer-commands.ts:53-57 (existing, verified read)
'bbj/composer/catalogs': () => ({
    msgbox: { buttonSets: BUTTON_SETS, icons: ICONS, defaultButtons: DEFAULT_BUTTONS, flags: FLAGS },
    addwindow: { flags: WINDOW_FLAGS, eventBits: EVENT_MASK_BITS },
    addchildwindow: { flags: CHILD_WINDOW_FLAGS, eventBits: CHILD_EVENT_MASK_BITS },
    // ADD: setopts: { bits: SETOPTS_BITS, byteGroups: BYTE_GROUPS },
}),
```

### Pattern 3: ComposerFlow-composed launch chain, terminated by exactly one handler
**What:** `serverFuture -> composerCatalogs() -> decodeCall` composed with `thenCompose` into ONE chain with ONE `.handle()` terminal, so a `null` stage or a thrown exception at any depth reports through the injected notifier exactly once (success criterion 4's "exactly one reason-keyed balloon").
**When to use:** The SETOPTS dialog's launch path — add `Kind.SETOPTS` to `ComposerLauncher`'s existing `switch` and follow the identical `flow.launch(...)` call shape already used for MSGBOX/addWindow/addChildWindow.
**Example:**
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:74-84 (verified read)
switch (kind) {
    case MSGBOX -> flow.launch(labelOf(kind), serverFuture,
            (server, catalogs) -> server.msgboxDecodeCall(new DecodeCallParams(lineText, col)),
            (server, catalogs, decoded) -> openMsgbox(project, editor, server, catalogs.msgbox, decoded, line, col));
    // ... ADD:
    // case SETOPTS -> flow.launch(labelOf(kind), serverFuture,
    //         (server, catalogs) -> server.setoptsDecodeCall(new SetoptsDecodeCallParams(lineText)),
    //         (server, catalogs, decoded) -> openSetopts(project, editor, server, catalogs.setopts, decoded, line));
}
```
Note: unlike msgbox/addWindow/addChildWindow, the SETOPTS `decodeCall` request needs only `lineText` (no caret column) — per D-03 the trigger is already line-scoped, so there is no "find the call at the cursor within a longer line" step; the whole line either parses as a `SETOPTS <hex>` line or it doesn't (`parseSetOptsLine`'s existing signature is `(line: string)`, verified: `bbj-vscode/src/setopts-catalog.ts:260`).

### Pattern 4: StaleEditGuard for the edit-in-place apply path; unguarded insert for compose-new
**What:** Editing an existing line goes through `StaleEditGuard.applyIfUnchanged` (re-decode + modification-stamp re-check at write time); composing a new line uses the guard-free `insertAtCaret` helper, since there is no captured range to go stale.
**When to use:** SETOPTS edit mode (D-06's "on a recognized SETOPTS line") vs. compose-new mode (D-06's "anywhere else in a config file").
**Example:**
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java:113-127, 259-268 (verified read)
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
For SETOPTS, the `reDecode` BiFunction can ignore its `currentCol` parameter (or the SETOPTS-specific overload can drop the column argument entirely) since `parseSetOptsLine` takes only a line string; `DecodeEquality` needs a new `sameSetopts` comparator (structural equality on `hexRange`/`insertOffset`/`hexDigits`).

### Anti-Patterns to Avoid
- **Reimplementing SETOPTS byte/bit logic in Java:** There is exactly one source of truth (`setopts-catalog.ts`) and it must stay that way — a Java-side reimplementation (even a "temporary" one) creates the exact two-sources-of-truth defect class #433 fixed once already.
- **A bespoke per-dialog `Alarm`/`Timer` for the debounce instead of the shared `Scheduler`/`KeystrokeDebouncer` seam:** Explicitly called out as Pitfall 12 ("Ad-hoc per-dialog debounce instead of shared seam ... Never — the shared seam exists precisely for this"). `[VERIFIED: .planning/research/PITFALLS.md:225]`
- **A caret-column parameter on the SETOPTS `decodeCall` request "for consistency" with msgbox/addWindow:** The line is already fully identified by the Editor Popup action's per-line availability check (D-03) — adding an unused `character` parameter is needless surface area that the JSON-boundary test then has to cover for no behavioral reason.
- **Hand-writing the `bbj/composer/setopts/*` request-name literal only in `BbjComposerServer.java`'s `@JsonRequest` annotations, forgetting `ComposerRequestContractTest`'s separately-hardcoded `DECLARED_REQUESTS` set:** the test enforces both the reflective interface scan AND a literal expected-set match (`theDeclaredRequestNamesAreDerivedFromTheInterfaceNotHardCodedTwice`) — a request added to the interface without updating that literal set fails the test immediately, by design. `[VERIFIED: bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java:42-53,100-108]`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SETOPTS byte/bit catalog + vector arithmetic | A Java port of the 58-bit catalog and preview logic | `setopts-catalog.ts`'s existing pure functions, re-exposed over LSP | Single source of truth by design (module doc comment); a port would drift the moment the catalog is edited on only one side. |
| Composer launch chain / terminal error handling | A new async orchestration for "resolve server -> fetch catalogs -> decode" | `ComposerFlow.launch(...)` with a new `Kind.SETOPTS` case | Already handles the exact "null stage vs. thrown exception vs. timeout, exactly one balloon" requirement (success criterion 4) that a hand-rolled chain got wrong before #538 fixed it. |
| Stale-document protection on the edit-in-place apply path | A custom "did the line change" check | `StaleEditGuard.applyIfUnchanged(...)` | Already closes the async gap between re-decode completing and the write starting (modification-stamp re-check as the write command's first statement) — a hand-rolled check would very likely reopen exactly the race COMP-02 (#567) closed. |
| Debounced preview round trips | A per-dialog `javax.swing.Timer` or ad-hoc `Alarm` | The shared `Scheduler`/`KeystrokeDebouncer`-style seam already used elsewhere in the plugin | Pitfall 12's explicit "Never — the shared seam exists precisely for this." |
| Reason-keyed failure presentation (balloons) | New balloon-text logic keyed on exception message strings | `ComposerNotices`/`ComposerNoticeRenderer`, dispatched on the machine-readable `Reason` enum | Matches the project-wide convention (established by Phase 81's `CompileResultPresenter`, Phase 86's `JavaClassesRefreshPresenter`) of "never choose the message by reading a throwable's prose." |
| Config-file scoping for the new action's availability | A new predicate re-deriving "is this the active config file" | `BbjConfigPathService.getInstance().isConfigFile(virtualFile)` (Phase 84) | Already exists, already handles both the active-path match and the default-filename fallback, already null-safe and non-blocking (no filesystem probe, no LS call). `[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigPathService.java:120-136]` |

**Key insight:** This phase has essentially no new domain logic to write. Every risk is integration risk — wiring a new request family through the exact same seams six prior request families already validated. The main way to get this phase wrong is *not* reusing one of those seams (writing a parallel debounce, a parallel stale-check, a parallel balloon system) rather than getting the SETOPTS-specific logic wrong (that logic is already correct and already tested in `setopts-catalog.test.ts`).

## Common Pitfalls

### Pitfall 1: Self-inflicted restart loop from the composer's own config.bbx write — CLOSED, verify don't reopen it
**What goes wrong (historical risk, now closed):** A composer write to config.bbx could be indistinguishable from an external edit to Phase 85's watcher, triggering a restart mid-dialog-session. This is the same shape of bug as the pre-existing #232 100%-CPU rebuild loop.
**Why it's closed:** Phase 85 D-06's relevance gate (`config-watcher.ts`) only fires `bbj/configReloadRequired` when the *consumed PREFIX snapshot* (`extractConsumedConfigContent`) actually changes. A SETOPTS-only write changes bytes that are never part of that snapshot, so the gate emits zero notifications — this is proven by Phase 85's own test suite (`test/config-hot-reload.test.ts`, "a SETOPTS-only edit produces zero" notifications, D1 coverage entry). `[VERIFIED: .planning/phases/85-config-hot-reload-with-restart-coalescing/85-01-SUMMARY.md:50]`
**How to avoid regressing it:** This phase needs **zero new suppression code**. The only obligation is a regression test/QA check confirming the SETOPTS write stays SETOPTS-only (never accidentally rewrites a PREFIX line too) — the "regression pair" CONTEXT.md's `<specifics>` section calls out explicitly: a SETOPTS-only write produces zero reload notifications, a PREFIX-line write elsewhere in the same file still produces exactly one. Add an IntelliJ-side QA/FULL-TEST-CHECKLIST.md row mirroring the existing VS Code row 14 ("SETOPTS composer apply does not restart the server").
**Warning signs:** Any new code in this phase that touches `config-watcher.ts`, `notifyConfigReloadRequired`, or a "composer write in flight" flag is very likely solving an already-solved problem — treat it as a signal to re-read Phase 85's D-06 before writing it.

### Pitfall 2: LSP4IJ custom-request capability — CLOSED, apply the proven pattern directly
**What goes wrong (historical risk, now closed):** Whether LSP4IJ's client API can issue a custom request without a full server restart was an open question at milestone start (#632's own text).
**Why it's closed:** Phase 86 D-11 proved GO: `bbj/refreshJavaClasses` joined `bbj/compile` and `bbj/resolvedConfigPath` on the single `BbjComposerServer` proxy interface with no restart needed. `[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java:78-88]`
**How to avoid regressing it:** Add the two new SETOPTS `@JsonRequest` methods directly to `BbjComposerServer` — do not create a second interface or attempt a `workspace/executeCommand` fallback (that fallback path, mentioned in the original pitfall research as a hedge, is now unnecessary since the direct approach is proven).

### Pitfall 3: New composer DTOs crossing the LSP4IJ boundary silently break on lsp4j version skew (G-81-4/G-81-5 class of bug) — ACTIVE, must extend the existing harness
**What goes wrong:** A hand-written DTO serialization assumption (wrong Java type for a numeric field, an int that should be a long) tested only against the Gradle build-time lsp4j jar (0.19.0) can still break against the IDE's actual bundled runtime jar (observed at 0.21.0) — this exact class of bug shipped twice before (G-81-4: `Position.character` overflow; G-81-5: `Diagnostic.getMessage()` signature skew).
**Why it happens:** `plugin.xml`'s LSP4IJ dependency is unpinned at runtime (documented tech debt); every new request/response DTO inherits this risk fresh.
**How to avoid:**
1. Every raw bit/flag value in the new SETOPTS DTOs must be `long`, never `int` — `ComposerModels.java`'s existing convention already does this for msgbox/addWindow flag fields specifically because a bit can set the 32-bit sign bit (`$80000000$` = 2147483648, which overflows `int`). SETOPTS bytes themselves are ≤255 so this specific overflow risk is smaller, but any *aggregate* vector value (if ever represented as a single number rather than a byte array/hex string) must follow the same `long` rule. Prefer representing the vector as a hex `String` end-to-end (as `setopts-catalog.ts` already does with `hexDigits: string`), which sidesteps the whole overflow class entirely — this is the recommended approach.
2. Extend `ComposerModelsJsonBoundaryTest` with a SETOPTS section following the exact existing pattern: parse a realistic envelope through `MessageJsonHandler` (LSP4IJ's actual deserializer), plus one negative control (`anOversizedIntegerFieldIsRejectedByTheSameParser`-equivalent) and one "every parsed range fits a Java int" positive documentation test — matching the five-test shape already used for `MsgboxDecodeResult`/`AddWindowDecodeResult`. `[VERIFIED: bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java:35-46,217-267]`
3. If the SETOPTS DTOs reuse any `int[]` range fields (like `AddWindowEdit.flagsRange`), follow the same convention — line/character offsets in a config.bbx line are small and safe as `int`, unlike LSP `Position.character` which uses the `END_OF_LINE_CHARACTER` = `LSP_MAX_UINTEGER` sentinel pattern (`bbj-vscode/src/language/lsp-position.ts:21`) for a different reason (whole-line ranges with no known end column). SETOPTS offsets are always real, bounded string positions — no sentinel value is needed here. `[VERIFIED: bbj-vscode/src/language/lsp-position.ts:21]`

### Pitfall 4: `ComposerRequestContractTest`'s hardcoded `DECLARED_REQUESTS` set + `FakeComposerServer`'s interface implementation both silently gate a compile/test break
**What goes wrong:** Two separate places in the test suite must be updated in lockstep with `BbjComposerServer.java`'s new `@JsonRequest` methods, or the build breaks (by design, but easy to miss as "someone else's file"):
1. `ComposerRequestContractTest.DECLARED_REQUESTS` (a literal `Set.of(...)`) must gain the two new request-name strings, or `theDeclaredRequestNamesAreDerivedFromTheInterfaceNotHardCodedTwice` fails.
2. `ComposerFlowTest`'s private `FakeComposerServer implements BbjComposerServer` must add `@Override` implementations for the two new interface methods, or the **entire test file fails to compile** (not just fails — a compile error, since Java requires every abstract method implemented). `[VERIFIED: bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java:42-53; bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java:80-120]`
**How to avoid:** Treat "add a method to `BbjComposerServer`" as a three-file change from the start: the interface itself, `ComposerRequestContractTest.DECLARED_REQUESTS`, and `ComposerFlowTest.FakeComposerServer`. The interface's request names must also appear as a quoted string literal in `composer-commands.ts` (or wherever the TS handler is defined) for `everyDeclaredRequestNameExistsAsAQuotedLiteralInTheLanguageServerSources` to pass — this is why the recommendation is to add the handlers to the existing `composer-commands.ts` file (already one of the four files that test reads) rather than a new file.

### Pitfall 5: D-06's unresolved "which line wins" ambiguity — a genuine open design question, not yet Claude's Discretion
**What goes wrong:** VS Code's `argForActiveEditor()` prefers the *file's first existing SETOPTS line*, falling back to compose-new-at-cursor only when the file has none — because config.bbx is evaluated once by BBj, so a second SETOPTS line would silently override rather than add. IntelliJ's new trigger, per D-01–D-03, is *per-line* (right-click on a specific line in the Editor Popup Menu): if it edits "the line under the caret" whenever *any* SETOPTS line exists in the file, and the caret is not on that line, the two IDEs would disagree about which line an ambiguous "edit SETOPTS" action targets.
**Why it happens:** The trigger mechanism changed shape between the two IDEs (VS Code: file/command-scoped entry point; IntelliJ: line-scoped context-menu entry point per D-01's PSI-free constraint) — CONTEXT.md's own D-06 note flags this was "not settled explicitly."
**How to avoid:** CONTEXT.md explicitly asks the researcher/planner to confirm one of two options before planning proceeds:
   - **Option A (mirror VS Code):** the action always resolves to the file's first existing SETOPTS line regardless of which line was right-clicked, falling back to compose-new-at-the-clicked-cursor only when the file has none.
   - **Option B (diverge, caret-scoped):** the action edits *the specific line that was right-clicked* if it's a SETOPTS line, else composes new at that cursor — matching the per-line availability check's own literal meaning (D-03: "if the current line parses as an existing SETOPTS <hex> line, the action edits it").
   Recommendation for the planner: **Option B** is the more literal reading of D-01/D-03/D-06 as written ("if the current line parses... the action edits it; otherwise it composes a new line at the cursor" — "the current line," not "the file's first line") and requires no file-wide scan on every right-click (cheaper `update()` check, consistent with the PSI-free-heuristic performance concern D-01 raises). Flagging this explicitly as `[ASSUMED]` since CONTEXT.md leaves it as "close enough to Claude's Discretion" but not fully resolved — the planner should record this choice as a locked decision in the plan rather than leave it implicit.
**Phase to address:** This phase (87) — record the choice in the plan, not deferred.

## Code Examples

### Existing `setoptsPreview` — the single entry point every UI (including the new IntelliJ one) must use
```typescript
// Source: bbj-vscode/src/setopts-catalog.ts:310-335 (verified read)
export function setoptsPreview(original: SetOptsVector | undefined, sel: SetOptsSelection): SetOptsPreview {
    const v = original ? cloneVector(original) : emptyVector();
    for (const bit of SETOPTS_BITS) {
        const on = sel.bits.some(b => b.byte === bit.byte && b.mask === bit.mask);
        setBit(v, bit.byte, bit.mask, on);
    }
    const maskEnabled = maskReplacementEnabled(v);
    if (maskEnabled) {
        if (sel.maskComma !== maskChar(v, MASK_COMMA_BYTE)) setMaskChar(v, MASK_COMMA_BYTE, sel.maskComma);
        if (sel.maskDot !== maskChar(v, MASK_DOT_BYTE)) setMaskChar(v, MASK_DOT_BYTE, sel.maskDot);
    }
    if (/^[0-9A-Fa-f]*$/.test(sel.rawTail) && sel.rawTail !== rawTail(v)) {
        setRawTail(v, sel.rawTail);
    }
    return {
        hexDigits: encodeVector(v),
        line: composeSetOptsLine(v),
        summary: describeVector(v),
        maskInputsEnabled: maskEnabled,
        unknownByBytes: Object.keys(BYTE_GROUPS).map(Number)
            .map(byte => ({ byte, mask: unknownBitsInByte(v, byte) }))
            .filter(u => u.mask !== 0),
    };
}
```
The `SetOptsSelection`/`SetOptsPreview` shapes (`bbj-vscode/src/setopts-catalog.ts:285-303`) are the exact wire contract the new `bbj/composer/setopts/preview` request should carry — `bits: Array<{byte, mask}>`, `maskComma: string`, `maskDot: string`, `rawTail: string` in; `hexDigits`, `line`, `summary`, `maskInputsEnabled`, `unknownByBytes` out.

### Existing `parseSetOptsLine` — the exact function the new `decodeCall`-equivalent handler wraps
```typescript
// Source: bbj-vscode/src/setopts-catalog.ts:260-273 (verified read)
export function parseSetOptsLine(line: string): SetOptsLineInfo | undefined {
    const kw = /^\s*SETOPTS(?=\s|$)/i.exec(line);
    if (!kw) return undefined;
    const rest = line.slice(kw[0].length);
    if (/^\s*$/.test(rest)) {
        return { insertOffset: kw[0].length };
    }
    const tok = /^[ \t]+([^ \t]+)[ \t]*$/.exec(rest);
    if (!tok) return undefined;
    const start = kw[0].length + tok[0].indexOf(tok[1]);
    const vector = parseVector(tok[1]);
    if (!vector) return undefined;
    return { hexRange: [start, start + tok[1].length], hexDigits: tok[1], vector };
}
```
Returns `undefined` for a malformed line ("the composer must not touch what it cannot round-trip" — the module's own doc comment). This `undefined` case is the SETOPTS-specific "found: false" equivalent for the new IntelliJ `decodeCall` request.

### `BbjConfigPathService.isConfigFile` — the exact predicate for the new action's `update()` gate (D-02)
```java
// Source: bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigPathService.java:120-136 (verified read)
public boolean isConfigFile(@Nullable VirtualFile file) {
    if (file == null) {
        return false;
    }
    return isConfigFileName(activeConfigPath(), file.getPath(), file.getName());
}
```
The new action's `update()` should call `BbjConfigPathService.getInstance().isConfigFile(virtualFile)` — this is already built, already null-safe, and already non-blocking (no filesystem I/O, no LS round trip), exactly matching D-02's requirement that the action is "absent entirely" (not merely disabled) outside config files.

## State of the Art

No prior-art shift applies here — this phase extends an established, actively-maintained in-repo pattern (the `bbj/composer/*` namespace, six months old as of this milestone, exercised across Phases 78-86) rather than adopting anything external. There is no "old approach vs. current approach" table to fill in.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Option B ("the specific line right-clicked, not the file's first SETOPTS line") is the correct resolution of D-06's open ambiguity | Common Pitfalls, Pitfall 5 | If the planner instead needs Option A (file-first-line, matching VS Code exactly), the action's `update()`/`actionPerformed()` would need a file-wide scan rather than a single-line check — a moderate rework of the availability-check and launch-capture logic, not a rewrite of the request layer itself. Low blast radius, but should be confirmed with the user/planner before locking the plan, since CONTEXT.md itself flagged this as unresolved rather than delegating it outright. |
| A2 | The recommended request names (`bbj/composer/setopts/preview`, `bbj/composer/setopts/decodeCall`, and a `setopts` field on the existing `bbj/composer/catalogs`) are the best fit for the naming convention | Architecture Patterns, Patterns 1-2 | CONTEXT.md explicitly leaves exact request names to Claude's Discretion ("follow the... naming convention... exactly") — this is a recommendation, not a locked fact. Low risk: any name following the `bbj/composer/setopts/*` prefix and the existing casing rules (`ComposerRequestContractTest.everyRequestNameIsNamespacedAndLowerCase`) will pass the contract test. |
| A3 | No `character`/caret-column parameter is needed on the SETOPTS `decodeCall` request, unlike msgbox/addWindow/addChildWindow's `LineQuery.character` | Architecture Patterns, Pattern 3 | If Option A (A1) is chosen instead of Option B, a file-wide "find the first SETOPTS line" search happens client-side before the request, so this still holds — the request itself only ever needs one already-identified line's text. Very low risk either way. |

## Open Questions

1. **D-06's line-selection ambiguity (see Pitfall 5 / A1)**
   - What we know: VS Code prefers the file's first existing SETOPTS line; IntelliJ's new trigger is line-scoped per D-01-D-03.
   - What's unclear: whether the two IDEs should behave identically (file-first-line) or diverge (caret-line) when a file has a SETOPTS line the user did NOT right-click on.
   - Recommendation: Lock Option B (caret-line) in the plan's own decisions, since it matches D-01/D-03's literal wording and needs no file-wide scan; note the divergence from VS Code explicitly in the plan so it isn't mistaken for a bug later.

2. **Should the byte 5/6 mask-replacement fields be JBTextField (single char) or a small ComboBox, and should the raw-hex tail (bytes 10-16) be a plain hex text field with client-side validation?**
   - What we know: VS Code's webview uses plain HTML inputs for both; Claude's Discretion leaves the exact IntelliJ widget choice open.
   - What's unclear: whether IntelliJ's hex-tail field needs the same regex validation VS Code applies client-side (`/^[0-9A-Fa-f]*$/` check already present in `setoptsPreview` itself, so an invalid tail is silently ignored rather than rejected — worth deciding whether the dialog should surface an inline error like `MsgboxComposerDialog`'s `errorLabel()` pattern for consistency).
   - Recommendation: Reuse `MsgboxComposerDialog`'s `errorLabel()` convention (small red `JBLabel`) for an invalid raw-hex-tail entry, even though `setoptsPreview` itself silently ignores rather than rejects it — matches the existing in-dialog error-surfacing pattern rather than introducing silent-drop behavior with no user feedback.

## Environment Availability

Skipped — no new external tools, services, or runtimes are required beyond what Phases 78-86 already verified present and working (Node.js/npm for `bbj-vscode`, JDK 17 + Gradle wrapper 8.14.5 for `bbj-intellij`, LSP4IJ plugin dependency, java-interop socket service unaffected by this phase). This phase adds no new dependency to either `package.json` or `build.gradle.kts`.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (bbj-vscode) | Vitest (existing pin) |
| Framework (bbj-intellij) | JUnit 5 via Gradle `test` task (existing pin) |
| Config file | `bbj-vscode/vitest.config.ts` (existing); `bbj-intellij/build.gradle.kts` `test {}` block (existing) |
| Quick run command (TS) | `npx vitest run test/setopts-catalog.test.ts` (already green, no change expected) |
| Quick run command (Java) | `cd bbj-intellij && ./gradlew test --tests "com.basis.bbj.intellij.composer.*"` |
| Full suite command | `npm test` (bbj-vscode); `cd bbj-intellij && ./gradlew test` (bbj-intellij) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DISC-04 | `bbj/composer/setopts/preview` and `decodeCall` handlers exist, are pass-throughs to `setopts-catalog.ts`, and are discoverable via the aggregate catalog request | unit | `npx vitest run test/composer-commands.test.ts` | ❌ Wave 0 — no `composer-commands.test.ts` exists yet; verify whether one should be added (currently no dedicated test file for `composer-commands.ts` handlers was found) |
| DISC-04 | New SETOPTS request names appear in `ComposerRequestContractTest`'s reflective + literal sets, and as quoted literals in `composer-commands.ts` | integration | `cd bbj-intellij && ./gradlew test --tests "*.ComposerRequestContractTest"` | ✅ exists (extend `DECLARED_REQUESTS`) |
| DISC-04 (success criterion 3) | New SETOPTS DTOs round-trip through LSP4IJ's real `MessageJsonHandler`, including an oversized-int negative control | unit | `cd bbj-intellij && ./gradlew test --tests "*.ComposerModelsJsonBoundaryTest"` | ✅ exists (add SETOPTS section) |
| DISC-04 (success criterion 4) | Launch chain composes through `ComposerFlow`; a hung/failed request surfaces exactly one reason-keyed balloon | unit | `cd bbj-intellij && ./gradlew test --tests "*.ComposerFlowTest"` | ✅ exists (extend `FakeComposerServer`, add a SETOPTS launch-chain case if the test is parameterized per kind, else a new sibling test) |
| DISC-04 (success criterion 2) | Applying an edit does not trigger a reload notification | unit | `npx vitest run test/config-hot-reload.test.ts` (regression, no new assertions expected — Phase 85's existing D1 coverage already proves this structurally) | ✅ exists |
| DISC-04 (success criterion 1) | Dialog previews/composes/applies edits identically to VS Code for both edit and compose-new modes | unit | new `SetoptsComposerDialogTest`-equivalent (mirrors absence of a dedicated `MsgboxComposerDialogTest` — dialog classes in this codebase are currently covered via source-guard + the shared `ComposerFlow`/`StaleEditGuard` unit tests, not a dedicated Swing-harness test) | ❌ Wave 0 — confirm the dialog-level test strategy matches the existing precedent (no `MsgboxComposerDialogTest.java` was found; coverage comes from `ComposerFlowTest`, `StaleEditGuardTest`, `DecodeEqualityTest`, and source guards instead) |
| DISC-04 (D-01/D-02) | The new action is available only in config.bbx/config.min files, absent (not disabled) elsewhere | unit + source guard | new `BbjComposeSetoptsActionSourceGuardTest` mirroring `BbjRefreshJavaClassesActionSourceGuardTest`'s pattern | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** targeted `npx vitest run <file>` / `./gradlew test --tests "<class>"`
- **Per wave merge:** `npm test` (bbj-vscode) and `./gradlew test` (bbj-intellij)
- **Phase gate:** Full suite green on both sides before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] Confirm whether `composer-commands.ts`'s handlers need a dedicated `composer-commands.test.ts`, or whether coverage stays at the domain-module level (`setopts-catalog.test.ts` already exists and is untouched) plus the IntelliJ-side `ComposerModelsJsonBoundaryTest`/`ComposerRequestContractTest` — the existing msgbox/addwindow/addchildwindow handlers in `composer-commands.ts` do not appear to have a dedicated TS-side handler test either (only the domain modules are unit-tested), so the precedent may be "no new TS test file needed."
- [ ] `SetoptsComposerDialog`-level test coverage strategy — confirm the precedent (`ComposerFlowTest` + `StaleEditGuardTest` + `DecodeEqualityTest` + source guards, no dedicated `*ComposerDialogTest.java`) applies identically to the new dialog, or whether Phase 87 should be the first to add one.
- [ ] `DecodeEquality.sameSetopts` — new comparator needed, no existing test file section for it (`DecodeEqualityTest.java` exists and should gain a SETOPTS case).
- [ ] `BbjComposeSetoptsActionSourceGuardTest.java` — new file needed, mirroring `BbjRefreshJavaClassesActionSourceGuardTest.java`'s structural-pin pattern (verify config-file scoping, verify no restart path exists in the action).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | Not applicable — no new auth surface. |
| V3 Session Management | no | Not applicable. |
| V4 Access Control | no | Not applicable — local file edit within the user's own workspace. |
| V5 Input Validation | yes | Port the `validateStringField`/`r.valid` gate pattern already established for msgbox/addWindow (Pitfall table: "New composer write paths... reusing addWindow/addChildWindow's pre-#623 unconditional-apply pattern" is a named risk) — the raw-hex-tail field and the byte 5/6 mask-replacement character fields must be validated (or silently-ignored-with-visible-feedback, see Open Question 2) before the resulting line is written, never written verbatim from unvalidated UI input. |
| V6 Cryptography | no | Not applicable. |

### Known Threat Patterns for this phase's stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Composer write path overwrites application-reserved bytes 11-16 with data the composer doesn't model, silently losing BBj options outside the composer's byte 1-9 catalog | Tampering (self-inflicted data loss, not attacker-controlled) | Already mitigated structurally by `setoptsPreview`'s "starting from the original (not from zero)" design — unknown bits and unmodeled bytes survive untouched unless the user explicitly changes their byte (`bbj-vscode/src/setopts-catalog.ts:305-309`, verified read). The IntelliJ dialog must not introduce a path that bypasses this by, e.g., building a vector from scratch instead of always passing the `original` parameter through. `[VERIFIED: bbj-vscode/src/setopts-catalog.ts:305-309]` |
| A config file an attacker/misconfigured shared environment can write to could force repeated LS restarts (denial of service against the editing session) via a malicious SETOPTS-adjacent write | Denial of Service | Not new to this phase — mitigated by Phase 85's existing 1000ms trailing-edge debounce on the directory watcher; this phase's own writes never reach that path anyway (Pitfall 1, closed). No new mitigation needed. |
| A malformed value from a composer UI field written verbatim into the user's own document | Tampering (self-inflicted corruption) | Validate before apply, following the `r.valid`-gates-OK-button pattern already used by `MsgboxComposerDialog.apply()` (`setOKActionEnabled(p.valid)`), rather than the pre-#623 unconditional-apply pattern the milestone's own pitfalls research flags as a defect class already being fixed elsewhere this milestone (#623). `[VERIFIED: bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java:255]` |

## Sources

### Primary (HIGH confidence — direct source read this session)
- `bbj-vscode/src/setopts-catalog.ts` — full read, the domain module this phase re-exposes.
- `bbj-vscode/src/setopts-composer-ui.ts` — full read, VS Code's client-layer reference for D-03/D-06.
- `bbj-vscode/src/setopts-composer-webview.ts` — partial read (lines 1-120), webview structure reference for parity.
- `bbj-vscode/src/language/composer-commands.ts` — full read, the `bbj/composer/*` namespace convention.
- `bbj-vscode/src/language/main.ts` (grep) — `registerComposerRequests(connection)` wiring location.
- `bbj-vscode/src/language/lsp-position.ts` (grep) — `END_OF_LINE_CHARACTER` sentinel convention.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/BbjComposerServer.java` — full read.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerFlow.java` — full read.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerNotices.java` — full read.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java` — full read.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/StaleEditGuard.java` — full read.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/MsgboxComposerDialog.java` — full read, dialog template.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerModels.java` — full read, DTO shape convention.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/actions/BbjComposeMsgboxAction.java` — full read, action template.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigFileTypeOverrider.java` — full read.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/config/BbjConfigPathService.java` — full read, the D-02 scoping predicate.
- `bbj-intellij/src/main/resources/META-INF/plugin.xml` (lines 1-150) — action/extension registration conventions.
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerRequestContractTest.java` — full read, the cross-language contract-test pattern (Pitfall 4).
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerModelsJsonBoundaryTest.java` — full read, the DTO boundary-test pattern (Pitfall 3, success criterion 3).
- `bbj-intellij/src/test/java/com/basis/bbj/intellij/composer/ComposerFlowTest.java` (partial, `FakeComposerServer` section) — the interface-implementation compile-break risk (Pitfall 4).
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/concurrency/KeystrokeDebouncer.java` — full read, the debounce seam D-09 references.
- `.planning/phases/87-shared-setopts-composer-layer-intellij-dialog/87-CONTEXT.md` — full read, all locked decisions/discretion/deferred.
- `.planning/REQUIREMENTS.md` — full read.
- `.planning/STATE.md` — full read.
- `.planning/phases/85-config-hot-reload-with-restart-coalescing/85-01-SUMMARY.md` — full read.
- `.planning/phases/86-intellij-interop-settings-targeted-refresh/86-01-SUMMARY.md` — full read.
- `.planning/research/PITFALLS.md` (Pitfalls 3, 13, 14 and surrounding tables) — full read of relevant sections.
- `.planning/research/ARCHITECTURE.md` ("Config Path Data Flow" section) — partial read.
- `.planning/config.json` — full read (confirms `nyquist_validation: true`, no `security_enforcement` override).
- `QA/FULL-TEST-CHECKLIST.md` (grep for "setopts") — existing rows 10, 11, 14 confirming VS Code SETOPTS QA precedent.
- `bbj-vscode/test/setopts-catalog.test.ts` (existence confirmed via find) — VS Code domain-module test coverage already in place.

### Secondary (MEDIUM confidence)
None — every claim in this document traces to a direct file read this session; no WebSearch or Context7 lookup was needed since this phase is entirely in-repo pattern reuse with no new external technology.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, every reused module/pattern directly read this session.
- Architecture: HIGH — the target pattern (thin LSP re-exposure + ComposerFlow/StaleEditGuard/ComposerNotices composition) is already implemented three times over (msgbox, addWindow, addChildWindow) and directly read in full.
- Pitfalls: HIGH for Pitfalls 1/2 (closed, confirmed via prior-phase SUMMARY.md evidence) and Pitfall 3/4 (confirmed via direct test-file read); MEDIUM for Pitfall 5 (a genuine open design question flagged by CONTEXT.md itself, not fully resolvable by research alone — recorded as Assumption A1).

**Research date:** 2026-09-07
**Valid until:** No fixed expiry — this research is tied to the current shape of `setopts-catalog.ts` and the `bbj/composer/*` convention, which are stable, already-shipped in-repo patterns rather than external libraries subject to version drift. Re-validate only if Phase 88 (which extends this same catalog/request shape to BBj-code hovers) lands first and changes the request-naming convention.
