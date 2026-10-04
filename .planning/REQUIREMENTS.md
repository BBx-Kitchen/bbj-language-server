# Requirements: BBj Language Server — v4.9 bbj-ls DENUM & Format Migration

**Defined:** 2026-10-01
**Core Value:** BBj developers get consistent, high-quality language intelligence — syntax highlighting, error diagnostics, code completion, run commands, and Java class/method completions — in both VS Code and IntelliJ through a single shared language server.

**Contract:** bbj-ls `formatProgram` / `denumProgram` JSON-RPC methods (BBj 26.03), as documented in
`/home/coder/repos/bbj-ls/README.md` ("JSON-RPC methods") and
`/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md` ("Settings reference").
Research: `.planning/research/SUMMARY.md`.

**Locked decisions (2026-10-01):** hard cut-over, no legacy fallback; formatting and DENUM live in
the language server; DENUM is invoked through a custom `bbj/denum` request (like `bbj/compile`);
IntelliJ formatter settings travel in `initializationOptions` with a server restart on change; DENUM
edits the open buffer (undoable, left unsaved); default `indentWidth` stays 2; IntelliJ formatting
stays switched off until the evaluation verdict.

## v1 Requirements

### Interop client (INT)

- [x] **INT-01**: The language server can call bbj-ls `formatProgram` (whole document and range) and `denumProgram` over the :5008 interop connection with typed request/response shapes
- [x] **INT-02**: Format and DENUM traffic never delays or resets live `parseProgram` diagnostics (routing decided and measured in the phase; a lost format/DENUM route never bumps the parse generation)
- [x] **INT-03**: Each method's availability is probed and latched per connection generation on its own (`-32601` on one method never disables another)
- [x] **INT-04**: Every bbj-ls error code (`-33001`..`-33009`, `-32602`, `-32800`) is classified into a typed outcome; none of them trips the interop circuit breaker
- [x] **INT-05**: Format/DENUM responses from the peer are validated (exactly one of `text`/`edits`, bounded sizes, sane ranges and lines) before they reach an editor

### Formatting (FMT)

- [x] **FMT-01**: User can run Format Document on a BBj file and get bbj-ls's formatted output
- [x] **FMT-02**: User can run Format Selection; the server snaps it to whole logical statements
- [x] **FMT-03**: Format-on-save works without delaying the save: no wait for the workspace to load, cancellation and supersession (`-32800`) return no edits silently
- [x] **FMT-04**: Formatting an already-formatted file returns no edits, so the buffer is not dirtied
- [x] **FMT-05**: Formatting returns minimal line-level edits (cursor, folding and undo survive) and never applies an edit computed for an older document version
- [x] **FMT-06**: Formatting a line-numbered file never DENUMs automatically; instead one deduplicated message offers "Denumber" and "Denumber and Format" (whole-document) or explains that selection formatting needs an unnumbered file (range)
- [x] **FMT-07**: "Denumber and Format" DENUMs and formats in one undoable step (`allowDenum`)
- [x] **FMT-08**: Invalid settings (`-33007`) are reported as one message naming each bad `bbj.formatter.*` key, with a way to open the settings
- [x] **FMT-09**: Mixed numbering (`-33008`) is reported with the offending line, and the user can jump to that line
- [x] **FMT-10**: Timeout, too large, protected program, engine failure and service-unavailable each produce one clear, deduplicated message and leave the buffer untouched
- [x] **FMT-11**: On BBj older than 26.03 the user sees "requires BBj 26.03 or later" once per connection, distinct from "interop not connected"; a save is never blocked
- [x] **FMT-12**: Config documents (`.bbx` config) and non-BBj documents are not sent to the formatter

### DENUM (DEN)

- [x] **DEN-01**: The language server serves a `bbj/denum` request that returns the denumbered text as one edit for the open document, plus DENUM's diagnostics
- [x] **DEN-02**: VS Code's "Denumber BBj Program" command (same id, menus and keybinding) denumbers the live buffer through `bbj/denum` as one undoable edit, including unsaved changes
- [x] **DEN-03**: Denumbering an unnumbered file says "nothing to do"; success shows a short confirmation; failures use the typed messages (tokenized input points to Decompile, protected programs say so)
- [x] **DEN-04**: DENUM diagnostics appear in an output list (line, original line number, severity, message) with a notification showing the counts and a "Show" action
- [x] **DEN-05**: The open-file prompt for numbered programs (`bbj.denumber.promptOnOpen`) offers "Denumber" via the new path and still offers read-only opening
- [x] **DEN-06**: The bbjlst denumber path is removed, while decompiling tokenized programs through bbjlst keeps working

### Settings (SET)

- [x] **SET-01**: All 15 formatter settings are available in VS Code with a typed schema (bounded integer, booleans, enums with descriptions), applied without restart
- [x] **SET-02**: Only the 15 known keys reach bbj-ls, each with an explicit value; `indentWidth` defaults to 2 in both IDEs
- [x] **SET-03**: A user who set `bbj.formatter.splitSingleLineIF` keeps that behaviour through `splitSingleLineIf` (deprecated alias for one release)
- [x] **SET-04**: `bbj.formatter.javaPath` is removed

### VS Code cut-over (CUT)

- [x] **CUT-01**: VS Code has exactly one BBj formatter: the client-side jar provider is removed in the same change that enables the server formatter
- [x] **CUT-02**: `BBjCFCli.jar`/`tools/formatter`, `document-formatter.ts`, `formatter-java-resolver.ts`, `formatter-verifier.ts` and their tests, guards and packaging references are removed
- [x] **CUT-03**: Format and DENUM are verified end-to-end in VS Code against a live BBj 26.03 BBjServices from the built VSIX

### IntelliJ (IJF)

- [x] **IJF-01**: IntelliJ does not offer LSP formatting until the evaluation verdict; the on/off decision is a single switch
- [x] **IJF-02**: IntelliJ formatting is evaluated on the built plugin zip against a live BBjServices (Reformat Code, selection, Actions on Save, numbered-file message, settings, CRLF, edit application), recorded from a real `idea.log`
- [x] **IJF-03**: The user decides from the evaluation whether IntelliJ formatting is officially supported or disabled, and the switch is set accordingly
- [x] **IJF-04**: If supported: all 15 formatter settings are on the IntelliJ BBj settings page and reach the server via `initializationOptions` (restart on change)
- [x] **IJF-05**: IntelliJ has a "Denumber BBj Program" action (Tools and editor menus) backed by `bbj/denum`, applied as one undoable edit, with `ComposerRequestContractTest` updated
- [x] **IJF-06**: IntelliJ shows an editor banner on line-numbered programs offering Denumber

### Docs & migration (MIG)

- [x] **MIG-01**: Both user guides describe formatting, Format Selection, DENUM, the 15 settings, the BBj 26.03 requirement and the IntelliJ verdict
- [x] **MIG-02**: A migration note lists the output differences from the old formatter (labels, blank lines, IF closers, line endings, the fixed `--single-line-if` crash #507) and warns about the large first-format diff
- [x] **MIG-03**: The QA smoke and full checklists cover format, Format Selection, format-on-save, DENUM and the error messages in both IDEs

## v2 Requirements

Deferred. Tracked but not in this roadmap.

- **IJF-07**: Hot-apply of IntelliJ formatter settings without a server restart (e.g. `FormattingOptions` extra keys through an `LSPFormattingFeature` subclass)
- **FMT-13**: Formatting untitled / non-`file` scheme BBj documents
- **DEN-07**: DENUM diagnostics merged into the Problems view (stored-and-merged with live parse diagnostics)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Legacy fallback to `BBjCFCli.jar` / bbjlst denumber on BBj < 26.03 | User decision: hard cut-over; older BBj gets a clear message |
| Automatic DENUM on save or on format | A semantic rewrite of numbered code must be an explicit user action |
| DENUM diagnostics as editor squiggles | Live `parseProgram` diagnostics already report the same syntax errors on BBj 26.03 |
| Changes to bbj-ls itself (e.g. a distinct code for tokenized input) | bbj-ls is a separate repo; issues are drafted there, not v4.9 steps |
| Rewriting the file on disk for DENUM | User decision: DENUM edits the open buffer |
| An IntelliJ-native `FormattingModelBuilder` | Would disable LSP formatting and duplicate the engine |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| INT-01 | Phase 124 | Complete |
| INT-02 | Phase 124 | Complete |
| INT-03 | Phase 124 | Complete |
| INT-04 | Phase 124 | Complete |
| INT-05 | Phase 124 | Complete |
| FMT-01 | Phase 125 | Complete |
| FMT-02 | Phase 125 | Complete |
| FMT-03 | Phase 125 | Complete |
| FMT-04 | Phase 125 | Complete |
| FMT-05 | Phase 125 | Complete |
| FMT-06 | Phase 126 | Complete |
| FMT-07 | Phase 126 | Complete |
| FMT-08 | Phase 125 | Complete |
| FMT-09 | Phase 125 | Complete |
| FMT-10 | Phase 125 | Complete |
| FMT-11 | Phase 125 | Complete |
| FMT-12 | Phase 125 | Complete |
| DEN-01 | Phase 126 | Complete |
| DEN-02 | Phase 127 | Complete |
| DEN-03 | Phase 126 | Complete |
| DEN-04 | Phase 126 | Complete |
| DEN-05 | Phase 127 | Complete |
| DEN-06 | Phase 127 | Complete |
| SET-01 | Phase 127 | Complete |
| SET-02 | Phase 125 | Complete |
| SET-03 | Phase 127 | Complete |
| SET-04 | Phase 127 | Complete |
| CUT-01 | Phase 125 | Complete |
| CUT-02 | Phase 127 | Complete |
| CUT-03 | Phase 127 | Complete |
| IJF-01 | Phase 125 | Complete |
| IJF-02 | Phase 129 | Complete |
| IJF-03 | Phase 129 | Complete |
| IJF-04 | Phase 129 | Complete |
| IJF-05 | Phase 128 | Complete |
| IJF-06 | Phase 128 | Complete |
| MIG-01 | Phase 130 | Complete |
| MIG-02 | Phase 130 | Complete |
| MIG-03 | Phase 130 | Complete |

**Coverage:**

- v1 requirements: 39 total
- Mapped to phases: 39 (Phases 124-130)
- Unmapped: 0 ✓
- Per phase: 124: 5, 125: 13, 126: 5, 127: 8, 128: 2, 129: 3, 130: 3

---
*Requirements defined: 2026-10-01*
*Last updated: 2026-10-04 after Phase 130 (MIG-01, MIG-02, MIG-03 complete)*
