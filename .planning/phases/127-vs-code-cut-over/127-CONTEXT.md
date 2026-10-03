# Phase 127: VS Code Cut-Over - Context

**Gathered:** 2026-10-03
**Status:** Ready for planning

<domain>
## Phase Boundary

VS Code formats and denumbers only through the language server. This phase:
- declares all 15 formatter settings in `bbj-vscode/package.json` with a typed schema, renames
  `splitSingleLineIF` to `splitSingleLineIf` (old key deprecated, migrated) and removes
  `bbj.formatter.javaPath` (SET-01, SET-03, SET-04);
- moves the "Denumber BBj Program" command (`bbj.denumber`, same id, menus, keybinding Alt+N) and the
  numbered-file open prompt (`bbj.denumber.promptOnOpen`) onto `bbj/denum` (DEN-02, DEN-05);
- removes the bbjlst denumber path while bbjlst decompile keeps working (DEN-06);
- deletes `document-formatter.ts`, `formatter-java-resolver.ts`, `formatter-verifier.ts`,
  `tools/formatter/**` and every test, guard and packaging reference to them (CUT-02);
- proves format and DENUM end to end from the built VSIX against a live BBj 26.03 BBjServices (CUT-03).

Not in this phase: IntelliJ (128/129), user docs and QA checklists (130), any bbj-ls change.

</domain>

<decisions>
## Implementation Decisions

### Carried forward (not re-asked)
- Phase 126 D-10/D-14 stand: **the server presents every DENUM outcome and applies the edit** via
  `workspace/applyEdit` (one undo step, buffer left dirty). The VS Code command shrinks to "send
  `bbj/denum` with the document URI"; the client words nothing about outcomes. `bbj/denum` answers
  `failed` + `reason: 'not-open'` for a document the LS does not have open (closed reason vocabulary in
  `bbj-vscode/src/language/denum-command.ts`, `DENUM_FAILURE_REASONS`).
- Phase 126 D-01..D-04 / 126-07: DENUM diagnostics go to the Problems view (`bbj-denum` collection)
  with a log copy in the 'BBj' channel. Already wired in `extension.ts`; this phase reuses it unchanged.
- Phase 125 D-09/D-10: the LS normalizer (`bbj-format-settings.ts`) already maps the legacy
  `splitSingleLineIF` to `splitSingleLineIf` when the new key is absent and never forwards `javaPath`.
  It stays as a backstop.
- Hard cut-over, no jar fallback; `indentWidth` defaults to 2 (bbj-ls defaults to 4).

### Denumber command targets (DEN-02)
- **D-01:** Invoked from the **Explorer context menu on a file that is not open**, the client
  **opens it in an editor first** (`showTextDocument`), waits until the LS has the document, then
  sends `bbj/denum`. Explorer and editor invocations behave the same. The planner decides how to wait
  for the LS `didOpen` (or how to retry once on `not-open`).
- **D-02:** After a successful denumber the file is **left dirty, never saved automatically**: the
  user reviews and saves. This is a behaviour change from bbjlst (which rewrote the file on disk); it
  goes into the Phase 130 migration note.
- **D-03:** **Menus stay as they are.** `.bbx` program files are valid denumber targets: they have
  language id `bbj` (package.json maps `.bbx` to `bbj`), so they get the menus and pass the LS's `bbj`
  allow-list. `config.bbx` is the outlier — it is the BBj config file despite its extension and is
  mapped by filename to `bbx-config`, so it gets no menu and the LS refuses it. Note: the menu clause
  `resourceLangId == bbx` matches no declared language (dead clause); leaving it unchanged is fine,
  removing it is the planner's call.
- **D-04:** **Keep the client-side no-target guard** (`runTargetOrWarn` / "no active BBj file"
  wording, as Run/Compile): `bbj/denum` is never sent without a URI.

### Open-file prompt (DEN-05)
- **D-05:** The button becomes **"Denumber"** (was "Denumber & Replace"), and the prompt text drops
  the "replacing the file" promise (e.g. `"x.bbj" is a line-numbered BBj program. Denumber it for
  editing, or open it read-only?`). It runs the same path as the command (D-01/D-02). The
  `bbj.denumber.promptOnOpen` description in package.json is reworded to match (no "replacing the
  file").
- **D-06:** Detection **stays on the client regex** (`isLineNumberedSource`, `src/line-numbering.ts`):
  immediate, no round trip, works with BBjServices down. A mismatch is harmless because `bbj/denum`
  answers with its own message ("nothing to do" / mixed numbering).
- **D-07:** **"Open Read-only" is unchanged** (`workbench.action.files.setActiveEditorReadonlyInSession`).

### Decompile vs denumber (DEN-06)
- **D-08:** **Decompile keeps bbjlst's `-l`**, so Decompile (Replace) and Decompile (Read-only) still
  turn tokenized programs into unnumbered source in one step, without BBjServices or BBj 26.03.
  Removed: `Commands.denumber`, the `decompile()` helper behind it, and the plain-text branch of
  `decompileInPlace` (the `denumber: false` path and the in-place rewrite of plain-text files). The
  `denumber` option of `buildDecompileArgv` is folded away so it always emits `-l`; the `-xlst`
  flag for a `*.lst` input **stays**, because it is part of how bbjlst decompiles such input and
  dropping it would change decompile behaviour (orchestrator clarification after research, keeping
  "decompile output unchanged"). Decompile's output,
  messages and temp-dir read-only flow are unchanged.

### Settings migration (SET-01, SET-03, SET-04)
- **D-09:** **One-time client migration for `splitSingleLineIF`.** Reason: once
  `splitSingleLineIf` is declared with a default, VS Code always supplies it, so the normalizer's
  "legacy only when the new key is absent" rule would never fire. On activation, per scope
  (global / workspace / workspace-folder via `inspect()`): where the old key is set and the new key is
  not, write the value to the new key **in the same scope** and remove the old key there. One info
  line in the 'BBj' log; no popup. The old key stays declared for one release with a
  `deprecationMessage`/`markdownDeprecationMessage` pointing to `splitSingleLineIf`. — **Reversibility:**
  costly — it writes the user's settings files; a value moved cannot be "un-moved" by a later release.
- **D-10:** **`bbj.formatter.javaPath` is simply removed from the schema.** A leftover value in a
  user's settings.json is greyed out by VS Code as unknown and is already dropped by the LS (SET-02);
  nothing writes to settings for it.
- **D-11:** **Rich schema** for the 15 keys: `indentWidth` as `integer`, `minimum` 0, `maximum` 16,
  default 2; booleans with defaults from `FORMATTER_DEFAULTS`; every enum with `enum` +
  `enumDescriptions` (one short line per value); `markdownDescription` where bbj-ls has semantics
  worth stating (`ifClosingKeyword` / `ifKeywordCase` KEEP behaviour, `keywordsToUppercase` winning
  over `ifKeywordCase`); a stable `order` grouping. Texts short and paraphrased from the bbj-ls
  formatter README. Schema defaults must equal `FORMATTER_DEFAULTS` (a test should pin that). Changes
  apply to the next format without restart (already true via `configuration-change-handler.ts`;
  verify, don't rebuild).

### Claude's Discretion
- Exact prompt and description wording (short, plain), the `order` grouping, and enum description
  texts.
- Settings `scope` for the new keys (existing ones use `window`); keep consistent unless research
  finds a reason.
- How the open-then-denumber wait is implemented (D-01) and where the migration code lives
  (e.g. a small `settings-migration.ts` called from `activate()`).
- Order of the deletion sweep (CUT-02) and how CI guards that pin the jar
  (`formatter-pins-drift`, `formatter-verifier-tamper`, `no-shell-command-construction`) are removed
  or narrowed; every CI gate (build, lint, `typecheck:test`, test, VSIX package, workflow-hygiene)
  must pass after.
- The CUT-03 hand-check step list, within the standing UAT rules below.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Wire contract (bbj-ls, not changed in this milestone)
- `/home/coder/repos/bbj-ls/README.md` — "JSON-RPC methods": `denumProgram`, `formatProgram`, error codes
- `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md` — "Settings reference" (the 15 keys, types, allowed values, bbj-ls defaults; `ifClosingKeyword`/`ifKeywordCase` notes) — source for D-11's schema

### Milestone planning
- `.planning/ROADMAP.md` — Phase 127 details, "Where each phase works" (127 file list), "Grouping" (why SET-02 was in 125 and the rest of the settings here), Verification paragraph
- `.planning/REQUIREMENTS.md` — SET-01, SET-03, SET-04, DEN-02, DEN-05, DEN-06, CUT-02, CUT-03
- `.planning/research/ARCHITECTURE.md` — §5 (`bbj/denum` request, client invocation)
- `.planning/research/PITFALLS.md` — Pitfall 11 (dirty buffer, undo, legacy semantics)
- `.planning/research/SUMMARY.md` — milestone research summary
- `.planning/phases/125-ls-formatting/125-CONTEXT.md` — D-09/D-10 (settings normalizer, legacy key)
- `.planning/phases/126-ls-denum/126-CONTEXT.md` — D-01..D-15 (server presents outcomes and applies the edit)
- `.planning/phases/126-ls-denum/126-VERIFICATION.md` — what `bbj/denum` actually delivers (incl. gap closures 126-06/126-07)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `bbj-vscode/src/language/denum-command.ts` / `bbj-denum-service.ts`: `bbj/denum` request, result
  `status`/`reason`, `DENUM_FAILURE_REASONS` (incl. `not-open`). The command only has to send it.
- `bbj-vscode/src/language/bbj-format-settings.ts`: `FORMATTER_SETTING_KEYS`, `FORMATTER_DEFAULTS`,
  `LEGACY_SPLIT_SINGLE_LINE_IF_KEY` — the source of truth for schema keys and defaults.
- `bbj-vscode/src/line-numbering.ts`: `isLineNumberedSource` (prompt detection, D-06).
- `bbj-vscode/src/Commands/Commands.cjs` `runTargetOrWarn` / `toActiveEditorSnapshot`: the no-target
  guard (D-04).

### Established Patterns
- Commands registered in `extension.ts` (~line 540: `bbj.denumber` → `Commands.denumber` today);
  LS requests sent through the shared `client` (see the compile command for the request pattern).
- `open-file-prompts.ts` `maybePromptLineNumbered` currently calls
  `executeCommand('bbj.denumber', doc.uri)` — keep routing through the command so one path exists.
- Decompile: `Commands.cjs` `decompileInPlace` / `decompileReadonly`, `buildDecompileArgv`
  (`src/Commands/process-args.ts`, `-l` and `-xlst`), `decompile-io.ts`.

### Integration Points
- Deletion set (CUT-02): `src/document-formatter.ts`, `src/formatter-java-resolver.ts`,
  `src/formatter-verifier.ts`, `tools/formatter/` (`BBjCFCli.jar`, `lib/BBjCodeFomatter.jar`,
  `lib/README.md`, `lib/bom.json`), tests `document-formatter.test.ts`,
  `formatter-java-resolver.test.ts`, `formatter-pins-drift.test.ts`,
  `formatter-verifier-tamper.test.ts`, and references in `no-shell-command-construction.test.ts`.
  Planner greps again for remaining references (imports, `.vscodeignore`, docs links handled in 130).
- `package.json` `contributes.configuration` (`bbj.formatter.*`, `bbj.denumber.promptOnOpen`
  description), keybindings and the three `bbj.denumber` menu entries (unchanged).
- IntelliJ copies TextMate/language-configuration files only; package.json settings do not reach it.

</code_context>

<specifics>
## Specific Ideas

- `config.bbx` is the only `.bbx` that is not a program; every other `.bbx` is a valid denumber target (user, 2026-10-03).
- Standing UAT rules apply to CUT-03: build and install the VSIX first and again from the final tree
  after code-review fixes; live BBj 26.03 BBjServices; check Format Document, Format Selection,
  format-on-save, the numbered-file offer, Denumber (command, Explorer on an unopened file, open
  prompt) and Denumber and Format, plus Decompile still working.

</specifics>

<deferred>
## Deferred Ideas

- Migration-note entry for D-02 (Denumber no longer saves to disk) — Phase 130.

### Reviewed Todos (not folded)
- IntelliJ initOptions key mismatch, peer-name escaping in signature help, Windows IntelliJ Node
  download progress, lsp4j 1.0 in bbj-ls, vitest 5, vscode-jsonrpc 9 — matched on generic keywords
  only; none touches the VS Code cut-over.

</deferred>

---

*Phase: 127-vs-code-cut-over*
*Context gathered: 2026-10-03*
