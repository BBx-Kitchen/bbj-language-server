# Phase 125: LS Formatting - Context

**Gathered:** 2026-10-01
**Status:** Ready for planning

<domain>
## Phase Boundary

A BBj developer in VS Code formats a whole file or a selection, on demand or on save, with bbj-ls's
`formatProgram` served by the shared language server (`lsp.Formatter` plus a bounded formatting
handler registered after `startLanguageServer`). Every failure produces one clear message and leaves
the buffer untouched. In the same change VS Code's client-side jar provider registration is removed
(exactly one BBj formatter), only the 15 known keys reach bbj-ls, and IntelliJ gets a single switch
that keeps LSP formatting off until the Phase 129 verdict.

Requirements: FMT-01..05, FMT-08..12, SET-02, CUT-01, IJF-01. Not in this phase: the DENUM offer and
`bbj/denum` (126), declaring the remaining keys in `package.json` / removing `javaPath` / deleting
`document-formatter.ts` and the jar (127), IntelliJ formatting itself (129).

</domain>

<decisions>
## Implementation Decisions

### Carried forward (not re-asked)
- Phase 124 D-01..D-17 stand: dedicated program lane, typed `ProgramOutcome`s, per-method
  availability latches (`-32601` → unavailable, once per connection), client deadlines 15 s / 25 s
  with cancel-always, validated `data` payloads for `-33007` (`problems[{setting,message}]`) and
  `-33008` (`line`), contract-exact response shape + echoed-version check.
- Hard cut-over, no jar fallback. `indentWidth` defaults to 2. Formatting never DENUMs
  (`allowDenum` is not sent from the format path in this phase).
- Research (`.planning/research/ARCHITECTURE.md` §1, §3, §4, §7): implement `Formatter` directly
  (not `AbstractFormatter`); bounded handler reads `TextDocuments` and never awaits
  `WorkspaceManager.ready`; whole-document `text` is turned into a minimal line edit (`[]` when
  equal, end clamped to the real last line); a version change during the await returns `[]`;
  `-32800`/caller cancellation returns `[]` silently; LSP `FormattingOptions` are ignored.

### Message channel & noise
- **D-01:** Failure kinds (timeout, too large, protected program, engine failure, service
  unavailable, invalid settings, mixed numbering, DENUM-needed, requires-26.03) show a
  `window/showMessage`-style **toast the first time, then log only** (output channel), the
  `BBjParserService` warn-then-debug cadence. The server cannot tell Format Document from
  format-on-save (same LSP request), so quietness comes from dedup, not from the trigger.
- **D-02:** **Dedup re-arms by kind:**
  - content-bound kinds — too large, protected program, mixed numbering, DENUM-needed — re-arm per
    **document + version** (an edit re-arms; saving an unchanged file never repeats);
  - invalid settings re-arms per **settings revision** (a settings change re-arms);
  - environment kinds — timeout, engine failure, service unavailable, requires-26.03 — re-arm per
    **connection generation**.
- **D-03:** Severity is **Warning for every kind** (nothing broke; the buffer is untouched).
- **D-04:** Interop simply not connected (transport error, breaker open, `ConnectionError`) gets
  **no popup from formatting**, only a log line; the breaker already raised its one "not reachable"
  message. This keeps it distinct from "requires BBj 26.03" (FMT-11).

### Actionable messages
- **D-05:** Invalid settings (`-33007`): the server sends one `window/showMessageRequest` naming
  every bad key as `bbj.formatter.<key>` (with bbj-ls's per-key message) and an **"Open Settings"**
  action. On click the server sends a **host-neutral notification** (e.g.
  `bbj/openFormatterSettings`, payload carrying the keys); the VS Code client handles it by opening
  the Settings UI **filtered to `bbj.formatter`**. IntelliJ does not handle it in this phase
  (formatting is off there until 129) — the planner must confirm LSP4IJ tolerates an unhandled
  server notification without noise.
- **D-06:** Mixed numbering (`-33008`): Warning "mixed line numbering at line N" with a **"Go to
  Line"** button → `window/showDocument` with the selection on that (1-based → 0-based) line. No
  automatic jump, no diagnostic.
- **D-07:** Prompts are **fire-and-forget**: the formatting response returns `[]` immediately and
  never waits for a click. A late click on a since-edited document still opens/jumps harmlessly.

### Interim gaps until Phases 126/127 (previews publish on every push)
- **D-08:** DENUM-needed (`-33006`) in this phase: buffer untouched, Warning
  "This file has line numbers. Run **Denumber BBj Program** first, then format." (the existing
  `bbj.denumber` command, Alt+N, still works until 127). Dedup per document (D-02). Phase 126
  replaces this with the "Denumber" / "Denumber and Format" offer.
- **D-09:** The LS normalizer **maps the old `splitSingleLineIF` key to `splitSingleLineIf` now**,
  so preview users who set it see no change. Phase 127 adds the new `package.json` key with the old
  one as a deprecated alias.
- **D-10:** All 15 keys always reach bbj-ls with explicit values: bbj-ls defaults from the bbj-ls
  formatter README settings table, except `indentWidth` = 2. If the user already set any of the 15
  keys under `bbj.formatter.*` (declared in `package.json` or not), that value is forwarded.
  Never sent: `javaPath`, nulls, unknown keys. bbj-ls validates values (`-33007` → D-05).
- **D-11:** Older-BBj wording (Warning, once per connection):
  "BBj formatting requires BBj 26.03 or later. The connected BBjServices does not provide it."
  Must stay distinct from any not-connected text.

### Range & on-save scope
- **D-12:** Format Selection **accepts bbj-ls's snapped edit as returned**, even when it extends
  past the selection (whole logical statements); Phase 124 already validates it overlaps the
  request. No clipping.
- **D-13:** Cold start vs VS Code's ~750 ms format-on-save budget: **measure first, then decide.**
  Research/live check measures first-format latency (lane open + probe + format). If it misses the
  budget, open/warm the program lane when the first BBj document opens; otherwise stay lazy. Record
  the numbers and the choice in the phase.
- **D-14:** A format-on-save that VS Code abandons (cancellation) is **silent**; debug log only.
  The next save formats normally.
- **D-15:** `editor.formatOnSaveMode: modifications` range requests are **treated as normal range
  formats** — no special case.

### Claude's Discretion
- Module split and names within the roadmap's file list (`bbj-format-service.ts`,
  `bbj-formatter.ts`, `bbj-formatting-handler.ts`, `bbj-format-settings.ts`), the notification
  method name, and where the dedup state lives.
- Exact message texts other than D-08/D-11 (short, plain, each naming what to do), and how
  bbj-ls's per-key messages are joined in the invalid-settings message.
- The form of the IntelliJ single switch in `BbjLanguageServerFactory.createClientFeatures()`
  (IJF-01) and how the LSP4IJ fence tests pin it.
- How FMT-12 excludes config `.bbx` and non-BBj documents (language id / URI checks in the
  handler), and moving `wholeDocumentChangeAsRange` to a neutral module if reused.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Wire contract (bbj-ls, not changed in this milestone)
- `/home/coder/repos/bbj-ls/README.md` — "JSON-RPC methods": `formatProgram` params/result, error codes
- `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md` — "Settings reference" (15 keys, defaults, value rules, error message forms)

### Milestone planning
- `.planning/ROADMAP.md` — Phase 125 details, "Where each phase works", "Grouping" (why CUT-01/IJF-01/SET-02 land here)
- `.planning/REQUIREMENTS.md` — FMT-01..05, FMT-08..12, SET-02, CUT-01, IJF-01
- `.planning/research/ARCHITECTURE.md` — §1 DI slot + bounded handler, §3 error table, §4 settings transport, §7 edit shape / stale rules, Data Flow
- `.planning/research/PITFALLS.md` — Pitfalls 1-8, 10, 13, 16, 19, 22, 24, 27, 29
- `.planning/research/SUMMARY.md` — milestone research summary
- `.planning/phases/124-interop-client/124-CONTEXT.md` — D-01..D-17 (lane, outcomes, latches, deadlines, validation)
- `.planning/phases/124-interop-client/124-VERIFICATION.md` — what the interop client actually delivers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `JavaInteropService.formatProgram(params, token)` (`bbj-vscode/src/language/java-interop.ts`) → `ProgramOutcome<FormatProgramResult>`; types in `java-interop-program-types.ts`, guard in `java-program-guard.ts`, lane in `java-interop-program-lane.ts`, classifier in `java-interop-errors.ts`.
- `wholeDocumentChangeAsRange` in `bbj-vscode/src/language/bbj-kept-check.ts` — minimal line edit from old/new text.
- `bbj-notifications.ts` — connection-free notification module (must not import `main.ts`); natural home for the open-settings notification sender.
- `JavaInteropTestService` (`bbj-vscode/test/bbj-test-module.ts`) scripts `formatProgram` outcomes hermetically; live checks go through `test/functional/program-live.test.ts` behind `RUN_BBJ_TESTS`.

### Established Patterns
- Bounded handlers registered after `startLanguageServer(shared)` in `main.ts`: `registerBoundedCodeActionHandler`, `registerComposerCodeLensHandler`, `registerConfigAwareHoverHandler` — the formatting handler follows this.
- `BBjParserService` latch + warn-once-then-debug cadence keyed on connection generation.
- Settings: VS Code `initializationOptions` list in `extension.ts` + `didChangeConfiguration` via `configuration-change-handler.ts`; read at init in `bbj-ws-manager.ts`.

### Integration Points
- `bbj-vscode/src/language/bbj-module.ts` (`lsp.Formatter` slot → advertises both formatting capabilities).
- `bbj-vscode/src/extension.ts` — `registerDocumentFormatter(context)` (~line 493/605) is removed in this change (CUT-01); `document-formatter.ts` file itself is deleted in 127. Client also gains the open-settings notification handler.
- `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java` — `createClientFeatures()` formatting switch (IJF-01); LSP4IJ fence tests change with it; run `bbj-intellij ./gradlew test`.

</code_context>

<specifics>
## Specific Ideas

- The existing VS Code command is titled "Denumber BBj Program" (`bbj.denumber`, Alt+N) — use that name in the D-08 message.
- UAT: hand check in VS Code against a live BBj 26.03 BBjServices, from a built VSIX (and the IntelliJ zip to confirm no formatting is offered); build both again from the final tree after code-review fixes.

</specifics>

<deferred>
## Deferred Ideas

- Phase 130 user guide could mention that `formatOnSaveMode: modifications` formats snapped statements (D-15) — documentation only, if useful.

### Reviewed Todos (not folded)
Six todos matched on keywords only; none concerns formatting, and the user kept the phase lean:
- IntelliJ `javaInteropHost/Port` vs `interopHost/Port` initOptions mismatch — separate IntelliJ fix.
- Signature-help / snippet peer-name escaping — security hardening, separate.
- Windows IntelliJ Node download progress re-check — testing, separate.
- lsp4j.jsonrpc 1.0, vitest 5, vscode-jsonrpc 9 upgrades — dependency work, separate.

</deferred>

---

*Phase: 125-ls-formatting*
*Context gathered: 2026-10-01*
