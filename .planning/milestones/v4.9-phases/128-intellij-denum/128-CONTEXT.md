# Phase 128: IntelliJ DENUM - Context

**Gathered:** 2026-10-03
**Status:** Ready for planning

<domain>
## Phase Boundary

An IntelliJ user can denumber a line-numbered BBj program through the shared language server's
`bbj/denum` request, from a "Denumber BBj Program" action (Tools menu and editor context menu) or
from a banner on the file. IntelliJ also renders the DENUM diagnostics list the server pushes.
Requirements IJF-05, IJF-06. Changes `bbj-intellij/` only; independent of the formatting verdict
(Phase 129). No language-server changes.

</domain>

<decisions>
## Implementation Decisions

### Carried forward (not re-asked)
- Phase 126 D-10/D-14: **the server presents every DENUM outcome** (nothing to do, success,
  tokenized, protected, mixed numbering, too large, timeout, unavailable, not connected) via
  `window/showMessage[Request]`, and **applies the edit itself** via `workspace/applyEdit` (one undo
  step, buffer left dirty). LSP4IJ renders both natively. The IntelliJ action only sends
  `bbj/denum` with the document URI and words nothing about outcomes.
- Phase 126 D-01 / 126-07: DENUM diagnostics arrive as `bbj/denumDiagnostics` (`{uri, diagnostics:
  [{line, originalLineNumber, severity, message}]}`) and the reveal request as
  `bbj/showDenumDiagnostics` (payload ignored). Contract: no payload field ever becomes a command,
  link or path; the uri only selects an open document.
- Phase 127 D-02: after DENUM the file is left dirty, never saved automatically.
- Phase 127 D-06: line-numbered detection is a client-side regex; a mismatch is harmless because
  `bbj/denum` answers with its own message.
- Phase 125 IJF-01: IntelliJ formatting stays switched off, so the format-path "Denumber" offer
  (126 D-05..D-09) does not appear in IntelliJ in this phase.

### Banner (IJF-06)
- **D-01:** The line-numbered-file banner offers **[Denumber] only**: no Dismiss, no "Don't show
  again", no read-only option, and no new setting. It stays until the buffer is no longer
  line-numbered.
- **D-02:** Detection is a **Java port of `isLineNumberedSource`** (`bbj-vscode/src/line-numbering.ts`):
  the same rule (first 20 non-blank lines, every one `^\s*\d+[ \t]+\S`, at least 3), run on the
  document text. A Java unit test pins it to the cases in `bbj-vscode/test/line-numbering.test.ts`.
  No server round trip.
- **D-03:** The banner is evaluated **on open and after each document change**
  (`EditorNotifications.updateNotifications` on a document change for BBj files, debounced as the
  planner sees fit). The banner disappears once the DENUM edit lands, and comes back if the user
  undoes it.
- **D-04:** **No special cases**: the banner is built on `BbjNotificationProviderBase` (its
  BBj-program-file-type guard already excludes `config.bbx` and non-program types). Read-only
  buffers and tokenized programs are not filtered; the server's messages cover them.
- Clicking [Denumber] runs the same path as the action (sends `bbj/denum` for that file).

### Diagnostics display (DEN-04 in IntelliJ)
- **D-05:** `bbj/denumDiagnostics` is written **to the BBj console only**: one block per run (a
  header naming the file, then one line per entry with line, original line number, severity and
  message) into the existing "BBj Language Server" tool-window console via
  `BbjServerService.logToConsole`, with ERROR entries in `ERROR_OUTPUT`. No editor highlights, no
  markup model.
- **D-06:** `bbj/showDenumDiagnostics` **activates the "BBj Language Server" tool window** (scrolled to
  the latest block). The payload is ignored.
- **D-07:** Console entries are **plain text, with no go-to-line hyperlinks**, keeping the 126 notification
  contract ("no payload field ever becomes a link") unchanged.
- Both notifications get `@JsonNotification` handlers on `BbjLanguageClient`, so LSP4IJ no longer
  sees them as unhandled.

### Action (IJF-05)
- **D-08:** "Denumber BBj Program" appears **only in the Tools menu and the editor context menu**
  (no Project View entry, so no open-then-wait logic).
- **D-09:** **No default keyboard shortcut.**
- **D-10:** Placement **next to Compile**: editor popup after `bbj.compile`, Tools menu after
  "Compile BBj File".
- **D-11:** The action is **enabled only when the active editor holds a BBj program file whose text
  looks line-numbered** (the D-02 check). Unnumbered files show the action greyed out, so the
  server's "nothing to do" message is reachable only through a race. The update should run off the
  EDT (`ActionUpdateThread.BGT`); the check reads at most 20 non-blank lines.
- `BbjComposerServer` declares `@JsonRequest("bbj/denum")` with DTOs that mirror
  `bbj-vscode/src/language/denum-command.ts` (`DenumResult`: status, reason, message, edit), and
  `ComposerRequestContractTest` lists `bbj/denum`; `bbj-intellij ./gradlew test` passes.

### Claude's Discretion
- Banner text and `EditorNotificationPanel.Status` (Info vs Warning).
- Console block layout and header wording (short, plain; mirror VS Code's
  `formatDenumDiagnosticsBlock` shape where sensible).
- How the action/banner obtain the LSP4IJ server and URI (follow `BbjCompileAction`'s pattern),
  and where the shared "send bbj/denum for this file" helper lives.
- Change-listener mechanism and debounce for D-03.
- Whether the client logs the returned `DenumResult` (status/reason) to the console at debug level.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Server contract (implemented in Phase 126; not changed here)
- `bbj-vscode/src/language/denum-command.ts` — `bbj/denum` params/result, `DENUM_FAILURE_REASONS`
- `bbj-vscode/src/language/denum-notifications.ts` — `bbj/denumDiagnostics` / `bbj/showDenumDiagnostics` payloads and the "no link/command" rule
- `bbj-vscode/src/line-numbering.ts` + `bbj-vscode/test/line-numbering.test.ts` — the detection rule to port (D-02)
- `bbj-vscode/src/denum-diagnostics-output.ts` — VS Code's block format for the list (reference for D-05)
- `bbj-vscode/src/extension.ts` §`registerDenumDiagnosticsOutput` — VS Code's handling of both notifications

### Milestone planning
- `.planning/ROADMAP.md` — Phase 128 details, "Where each phase works" (128 file list), Verification paragraph
- `.planning/REQUIREMENTS.md` — IJF-05, IJF-06
- `.planning/phases/126-ls-denum/126-CONTEXT.md` — D-01..D-15 (server presents outcomes, applies the edit)
- `.planning/phases/126-ls-denum/126-VERIFICATION.md` — what `bbj/denum` actually delivers
- `.planning/phases/127-vs-code-cut-over/127-CONTEXT.md` — D-02, D-06 (left dirty, client regex)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bbj-intellij/.../composer/BbjComposerServer.java`: the single server interface; every custom request goes here (`bbj/compile` precedent).
- `bbj-intellij/.../BbjNotificationProviderBase.java`: shared banner base (file-type guard, `newPanel`); four existing providers registered in `plugin.xml`.
- `bbj-intellij/.../lsp/BbjLanguageClient.java`: `@JsonNotification` handlers (`bbj/configReloadRequired` logs to console; `bbj/bbjcplAvailability` is a silent no-op).
- `bbj-intellij/.../ui/BbjServerService.java`: `logToConsole(message, ConsoleViewContentType)` and the "BBj Language Server" tool window activation.
- `bbj-intellij/.../actions/BbjCompileAction.java`: pattern for an editor action that sends a `bbj/*` request through LSP4IJ.
- `bbj-intellij/.../ui/BbjFileVisibility.java`: "is this a BBj program file" guard.

### Established Patterns
- Source-guard tests (`*SourceGuardTest.java`) pin structural rules; `ComposerRequestContractTest` reads the TS request paths and runs only under `bbj-intellij ./gradlew test` (vitest gates miss it).
- `plugin.xml` action registration with `add-to-group` `relative-to-action`.

### Integration Points
- `plugin.xml`: new action (Tools + EditorPopupMenu after `bbj.compile`) and a new `editorNotificationProvider`.
- `BbjLanguageClient`: two new notification handlers.
- `BbjComposerServer`: `bbj/denum` request + DTOs.

</code_context>

<specifics>
## Specific Ideas

- Standing UAT rules: build the language server and the IntelliJ plugin zip first, and again from
  the final tree after code-review fixes; hand-check in a running IntelliJ against a live BBj 26.03
  BBjServices. Check the action (enabled/greyed), the banner (appears, goes after Denumber,
  returns on undo, absent on unnumbered files), one undo step, the server's outcome messages, the
  console block, and [Show].
- Runtime sequences used as evidence come from a real `idea.log`, not a hand-derived trace.

</specifics>

<deferred>
## Deferred Ideas

- Editor highlights for DENUM diagnostics in IntelliJ (parity with VS Code's Problems placement): not chosen; console only.
- Project View entry with open-then-denumber: not chosen.

### Reviewed Todos (not folded)
- IntelliJ sends javaInteropHost/javaInteropPort but the LS reads interopHost/interopPort — unrelated to DENUM; kept lean.
- Re-check the IntelliJ Node.js download progress bar on Windows — manual test, unrelated.
- Peer-name escaping in signature help/snippets, vitest 5, vscode-jsonrpc 9, lsp4j 1.0 — keyword matches only.

</deferred>

---

*Phase: 128-intellij-denum*
*Context gathered: 2026-10-03*
