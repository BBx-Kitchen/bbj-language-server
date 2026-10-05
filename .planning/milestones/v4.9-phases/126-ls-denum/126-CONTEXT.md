# Phase 126: LS DENUM - Context

**Gathered:** 2026-10-02
**Status:** Ready for planning

<domain>
## Phase Boundary

The shared language server denumbers a BBj program for both IDEs. It serves a host-neutral
`bbj/denum` request (`denum-command.ts`, shaped like `compile-command.ts`) and replaces Phase 125's
interim "Run Denumber BBj Program first" warning with a server-driven offer: "Denumber" / "Denumber
and Format" for Format Document, and an explanation plus "Denumber" for Format Selection. Every DENUM
run ends in one typed outcome message. DENUM's diagnostics reach an output list, and when there are
any, a notification shows their counts with a "Show" action.

Requirements: DEN-01, DEN-03, DEN-04, FMT-06, FMT-07. Not in this phase: re-pointing VS Code's
`bbj.denumber` command at `bbj/denum`, the open-file prompt, and deleting the bbjlst denumber path
(127, DEN-02/05/06); the IntelliJ action, banner and diagnostics rendering (128); merging DENUM
diagnostics into the Problems view (DEN-07, future).

</domain>

<decisions>
## Implementation Decisions

### Carried forward (not re-asked)
- Phase 124 D-01..D-17 stand: dedicated program lane, typed `ProgramOutcome`s, per-method
  availability latch (`denumProgram` has its own; `-32601` → unavailable once per connection),
  client deadlines with cancel-always (15 s for `denumProgram`, 25 s for `formatProgram` with
  `allowDenum` — research correction, `java-interop-connection.ts:487`), validated `-33008` `data: {line}`.
- Phase 125 D-01..D-07 stand for the **formatting** path: toast-first-then-log, dedup re-arm by kind
  (DENUM-needed re-arms per document + version), not-connected never raises a formatting popup,
  fire-and-forget `showMessageRequest` with a host-neutral notification on click
  (`bbj/openFormatterSettings` precedent), "Go to Line" for mixed numbering.
- Research: `bbj/denum` follows `compile-command.ts` (`createDenumHandler(deps)` /
  `registerDenumRequest`, plain-JSON DTOs, a closed `reason` vocabulary) and is registered in
  `main.ts` next to `registerCompileRequest`. DENUM runs on the live buffer text, never writes the
  file, and leaves the buffer dirty. Tokenized input is recognised by the `<<bbj>>` prefix
  (`TOKENIZED_PROGRAM_PREFIX` in `bbj-format-service.ts`); bbj-ls answers it with `-33001`.
  `ProgramDiagnostic.line` is 1-based in the **denumbered** text, `0` = no location.

### Diagnostics list (DEN-04)
- **D-01:** The list travels as a **host-neutral server notification** (e.g. `bbj/denumDiagnostics`)
  carrying, per entry: line, original line number, severity, message, plus the document URI. One
  source for both the offer path and `bbj/denum`. VS Code renders it in this phase; IntelliJ renders
  it in Phase 128. The planner must confirm LSP4IJ tolerates the unhandled notification quietly
  until then (same check as 125 D-05). — **Reversibility:** costly — the method name and payload
  become a contract the IntelliJ plugin (128) consumes.
- **D-02:** VS Code writes the list into the **existing 'BBj' log output channel**
  (`extension.ts`, `createOutputChannel('BBj', { log: true })`), with a header per run naming the
  file. No new channel. "Show" reveals that channel.
- **D-03:** The count notification with **[Show]** appears **only when diagnostics > 0**, as one
  message combined with the success confirmation (for example "Denumbered. 2 errors, 1 warning."
  [Show]). A clean DENUM shows only the short confirmation.
- **D-04:** The list is written **on success only**. Failures carry no diagnostics (bbj-ls error
  answers have none); the failure message is the whole story.

### Format offer (FMT-06, FMT-07)
- **D-05:** Format Document on a numbered file (`-33006`): the formatting response returns `[]`
  immediately, and the server fires one deduplicated `showMessageRequest` offering **[Denumber]**
  and **[Denumber and Format]**. This replaces the 125 D-08 interim message.
- **D-06:** Format Selection on a numbered file: a message explains that selection formatting needs
  a file without line numbers and offers **[Denumber]** only ("Denumber and Format" is
  whole-document).
- **D-07:** **A late click acts on the current buffer.** The click means "denumber this file now":
  read the text and version at click time, run DENUM, and apply with a versioned edit. If the buffer
  changes during the DENUM call, drop the result and warn. Never apply a result to a different
  version.
- **D-08:** Format-on-save gets **the same deduplicated offer**. The server cannot tell a save from
  Format Document (125 D-01); dedup per document + version (125 D-02) shows it once per edit, not
  once per save.
- **D-09:** "Denumber and Format" is **one `formatProgram` call with `allowDenum: true`**
  (whole document) applied as **one undoable edit**. A `denumbered: true` result's diagnostics go
  through D-01..D-04 exactly like a plain DENUM. Format-specific failures (invalid settings, too
  large, …) reuse 125's messages; DENUM-specific ones use D-11.

### Outcome presentation (DEN-03)
- **D-10:** **The server presents every DENUM outcome on both paths**: the offer click and a direct
  `bbj/denum` request (the 127 VS Code command, the 128 IntelliJ action). The result still carries
  `status`/`reason`/edit/diagnostics for the caller, but clients word nothing. 127 and 128 shrink to
  "send the request". — **Reversibility:** costly — moving wording to the clients later means
  presenters in both IDEs.
- **D-11:** Exactly one outcome message per run:
  - unnumbered file → "nothing to do" (Information);
  - success → short confirmation (Information), or combined with counts + [Show] (D-03);
  - tokenized input → points to Decompile (Warning);
  - protected program → says the program is protected (Warning);
  - mixed numbering → names the line, with [Go to Line] as in 125 D-06 (Warning);
  - too large, timeout, DENUM failed / unavailable (Warning);
  - `-32601` → "Denumbering requires BBj 26.03 or later. The connected BBjServices does not
    provide it." (Warning), adapted from 125 D-11;
  - interop not connected → "BBjServices is not reachable" (Warning). Unlike 125 D-04 this is
    shown, because the user explicitly asked. It does not re-trigger the breaker popup.
- **D-12:** DENUM outcome messages are **never deduplicated**: a DENUM run is an explicit user
  action and always gets its answer. Dedup applies only to the automatic offer coming from
  formatting (D-05, D-08).
- **D-13:** Severity: **Information for success / nothing to do, Warning for every failure.**
  Success whose diagnostics include errors is Warning with [Show].

### Edit application (DEN-01)
- **D-14:** **The server applies the edit on both paths** via `workspace/applyEdit` with a
  versioned text-document identifier: one undo step, buffer left dirty. `bbj/denum`'s result also
  returns the edit plus status for information, which satisfies DEN-01's "returns the denumbered
  text as one edit". LSP4IJ 0.21.0 implements `applyEdit`. — **Reversibility:** costly — 127/128
  are built on "server applies".
- **D-15:** Edit shape: a **minimal line diff** via `minimalLineEdit` (`bbj-format-edit.ts`, as formatting
  uses; research correction — `wholeDocumentChangeAsRange` is the kept-check helper), one `TextEdit`, end clamped to the real last line. No edit when `denumbered: false`.

### Claude's Discretion
- Exact message wording other than D-11's fixed texts (short, plain, each naming what to do), and
  what "points to Decompile" names in VS Code vs IntelliJ while staying host-neutral.
- Notification method names and payload field names. Whether [Show] is a second notification
  (`bbj/showDenumDiagnostics`) or the client reveals on receipt of a flag.
- `bbj/denum` param/result field names and the closed `reason` vocabulary (research §5 is a
  starting point). `canonicalName` choice for DENUM (research suggests `null`).
- Where the DENUM orchestration lives (a `denumDocument()` core in `BBjFormatService` or a sibling
  service) so both the offer and the request call the same code.
- Concurrency of two overlapping DENUM runs on one document (for example offer click + command).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Wire contract (bbj-ls, not changed in this milestone)
- `/home/coder/repos/bbj-ls/README.md` — "JSON-RPC methods": `denumProgram` and `formatProgram` (`allowDenum`), `ProgramDiagnostic`, error codes -33001..-33009, line conventions

### Milestone planning
- `.planning/ROADMAP.md` — Phase 126 details, "Where each phase works", "Grouping" (why FMT-06/07 and DEN-03/04 land here), research flag 126
- `.planning/REQUIREMENTS.md` — DEN-01, DEN-03, DEN-04, FMT-06, FMT-07 (DEN-07 is future)
- `.planning/research/ARCHITECTURE.md` — §5 (`bbj/denum` request shape, invocation), §6 (mapping DENUM diagnostics), §7 (edit shape / stale rules)
- `.planning/research/PITFALLS.md` — Pitfall 11 (dirty buffer, undo, legacy semantics), positions/line-0 pitfall (~line 150-170), Pitfall 9 (lane/worker coupling), Pitfall 10 (`-32601` / 26.03 wording)
- `.planning/research/SUMMARY.md` — milestone research summary
- `.planning/phases/124-interop-client/124-CONTEXT.md` — D-01..D-17
- `.planning/phases/125-ls-formatting/125-CONTEXT.md` — D-01..D-15 (formatting messages, dedup, notifications)
- `.planning/phases/125-ls-formatting/125-VERIFICATION.md` — what the formatter actually delivers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `JavaInteropService.denumProgram(params, token)` / `formatProgram` (`bbj-vscode/src/language/java-interop.ts`) → typed `ProgramOutcome`; types in `java-interop-program-types.ts`, guard in `java-program-guard.ts`.
- `bbj-format-service.ts` — outcome classification, dedup state, `FORMAT_DENUM_NEEDED_MESSAGE` (to be replaced by the offer), `TOKENIZED_PROGRAM_PREFIX`.
- `bbj-format-edit.ts` / `wholeDocumentChangeAsRange` — minimal line edit.
- `bbj-notifications.ts`, `format-settings-notification.ts` — connection-free notification senders (125's open-settings precedent).
- `compile-command.ts` — verbatim shape for `denum-command.ts`.
- `JavaInteropTestService` (`bbj-vscode/test/bbj-test-module.ts`) scripts `denumProgram` answers hermetically; live checks in `test/functional/program-live.test.ts` behind `RUN_BBJ_TESTS`.

### Established Patterns
- Custom requests registered in `main.ts` (`registerCompileRequest`); bounded formatting handler after `startLanguageServer`.
- Client notification handlers in `extension.ts` (the 125 open-settings handler) — the D-01 list handler goes beside it.

### Integration Points
- `bbj-vscode/src/language/main.ts` — `registerDenumRequest`.
- `bbj-vscode/src/extension.ts` — handle the diagnostics notification into the 'BBj' channel, reveal on [Show]. The `bbj.denumber` re-point is Phase 127.
- `bbj-intellij/.../ComposerRequestContractTest` — reads TS handler paths; adding `bbj/denum` here may need the contract test updated with 128, so run `bbj-intellij ./gradlew test` to confirm nothing breaks now.

</code_context>

<specifics>
## Specific Ideas

- The existing VS Code command is titled "Denumber BBj Program"; the offer buttons are "Denumber" and "Denumber and Format".
- Until 127 the VS Code `bbj.denumber` command still runs the bbjlst path; in this phase `bbj/denum` is reachable through the format offer (and tests).
- UAT: hand check in VS Code against a live BBj 26.03 BBjServices from a built VSIX (numbered, mixed, unnumbered, tokenized, protected files; dirty buffer; undo); build the IntelliJ zip too and confirm the unhandled notification is quiet.

</specifics>

<deferred>
## Deferred Ideas

- DEN-07 (future): merge DENUM diagnostics into the Problems view.
- Roadmap note for 127/128: with D-10 and D-14, the VS Code command and the IntelliJ action only send `bbj/denum`; 128's "presenter" reduces to rendering the D-01 list.

### Reviewed Todos (not folded)
The same six keyword-only matches the user declined in Phase 125 (IntelliJ interop initOptions key mismatch, peer-name escaping, Windows Node download progress, vscode-jsonrpc 9, lsp4j 1.0, vitest 5). None concerns DENUM.

</deferred>

---

*Phase: 126-ls-denum*
*Context gathered: 2026-10-02*
