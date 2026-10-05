---
phase: 125-ls-formatting
verified: 2026-10-02T06:20:00Z
status: passed
score: 5/5 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "VS Code, built VSIX from the final tree, live BBj 26.03: open a .bbj file and run Format Document With..."
    expected: "Exactly one BBj formatter is listed (the language-server one); no 'BBj' jar provider alongside it"
    why_human: "Registration of the language client's provider from the server capability happens in the VS Code host; unit tests prove only that activate() registers no client-side provider and that the server advertises the capability"
  - test: "VS Code: Format Document on an unformatted file, then again; Format Selection on a partial statement; format-on-save with cursor, folds and undo history in place"
    expected: "First run changes only differing lines; second run leaves the buffer unmodified (no dirty marker); selection is snapped to whole logical statements; cursor, folding and undo survive; save is never held up"
    why_human: "Cursor/folding/undo survival and VS Code's own save-participant timeout are host behavior; the unit tests prove minimal line edits, stale-version drop and cancellation, not the editor result"
  - test: "VS Code: set bbj.formatter.indentWidth to an invalid value, format; click Open Settings; trigger a mixed-numbered file and click Go to Line; format a .bbx config document"
    expected: "One warning naming bbj.formatter.indentWidth, Open Settings opens the Settings UI filtered to bbj.formatter; mixed-numbering warning names the line and jumps to it; the config document is untouched"
    why_human: "Message presentation and the jump are VS Code UI behavior"
  - test: "VS Code against an interop peer without formatProgram (BBj older than 26.03, or the in-repo java-interop/ mirror)"
    expected: "'requires BBj 26.03 or later' appears once per connection, differs from the not-connected wording, and a save is not blocked"
    why_human: "Needs a pre-26.03 peer in a running IDE; the dedup and wording are unit-tested against a scripted peer"
  - test: "IntelliJ, built plugin zip from the final tree: Reformat Code and Actions on Save on a .bbj file"
    expected: "Nothing is sent and nothing changes; no LSP formatting offered. Per the roadmap, evidence from a real idea.log, not a derived trace"
    why_human: "The switch is proven by Java unit and reflective fence tests plus a decompile by the reviewer; LSP4IJ runtime gating in a live IDE is the roadmap-mandated hand check"
---

# Phase 125: LS Formatting Verification Report

**Phase Goal:** A BBj developer in VS Code formats a whole file or a selection, on demand or on save, with bbj-ls's formatter served by the shared language server. Every failure produces one clear message and leaves the buffer untouched. In the same change VS Code is left with exactly one BBj formatter, and IntelliJ does not offer formatting until the evaluation verdict.
**Verified:** 2026-10-02
**Status:** human_needed
**Re-verification:** No, initial verification

All code-level truths hold against the actual tree. The status is `human_needed` rather than `passed` because the roadmap requires a hand check in a running IDE for any phase that changes what a user sees, and the plan-06 summary itself lists those checks as still open (coverage item D6, `human_judgment: true`).

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Format Document returns bbj-ls output; Format Selection snaps to whole statements; both are minimal line edits; already-formatted file leaves buffer unmodified | VERIFIED (editor-side effects to human) | `bbj-format-service.ts` `editsFor` calls `minimalLineEdit` (whole) / `rangeFormatEdits` (range), which returns `[]` when old text equals new text and otherwise trims common line prefix/suffix (`bbj-format-edit.ts`). Range request carries `range` and `canonicalName` with `#range:` suffix; snapping is bbj-ls's, and its edit is accepted at its own range. Tests: `bbj-format-service.test.ts` (already-formatted gives no edit, trimmed range edit, edit wider than selection accepted). Live `program-live.test.ts` 10/10: format returns an edit, formatting the result again returns none. |
| 2 | Format-on-save never waits for workspace load; `-32800` returns silently; stale-version edit never applied | VERIFIED | `main.ts:133` registers `registerBoundedFormattingHandler` after `startLanguageServer(shared)` (order pinned by `bbj-formatter-capability.test.ts`). The handler resolves from `TextDocuments` only. Test `bbj-formatting-handler.test.ts` "a format resolves while the workspace is still loading and no document wait is started". `format()` re-reads `request.current()` after the await and drops the answer if the version changed or the document closed; cancelled and superseded outcomes return `[]` at debug level only. Tests for stale, closed, cancelled, superseded and caller-cancelled-with-ok-answer all present and passing. |
| 3 | Invalid settings, mixed numbering, timeout, too large, protected, engine failure and service unavailable each give one deduplicated message and leave the buffer untouched; invalid-settings names each bad key and offers to open settings; mixed numbering names the line and jumps to it | VERIFIED (see WR-03) | `report()`/`reportFailure()` in `bbj-format-service.ts` map every kind to one Warning through the `notice()` ledger (first occurrence shows and logs warn, repeats log debug). `reportInvalidSettings` lists `bbj.formatter.<key>` per problem and sends keys on Open Settings; `reportMixedNumbering` offers Go to Line (clamped, in the request's own document). Every non-ok path returns `[]`. Handler `registerFormatterSettingsLink` in `extension.ts:610` opens `workbench.action.openSettings` with the fixed `bbj.formatter` query and ignores the payload. 49 notice tests pass. Dedup scope for engine failure and timeout is per connection, which is locked decision D-02 in `125-CONTEXT.md`. |
| 4 | Pre-26.03: "requires BBj 26.03 or later" once per connection, differently worded from "interop not connected", save never blocked; config (`.bbx`) and non-BBj documents never sent | VERIFIED | `unavailable`/`method-not-found` goes to `environmentNotice('requires-bbj-26-03', generation, ...)`; other unavailable reasons and transport failures only log at debug. Tests: reconnect re-arms, message differs from not-connected text. Handler gate `document.languageId !== BBjLanguageMetaData.languageId` (`'bbj'`); the config language id is `bbx-config` so it is excluded; test "a config document and a plain text document give no edit and are never sent to the formatter". Messages are fire-and-forget; test "a prompt that never settles leaves the response immediate". |
| 5 | VS Code lists exactly one BBj formatter; only the 15 keys reach bbj-ls with explicit values and indentWidth 2 default; IntelliJ offers no LSP formatting, one switch | VERIFIED (listing and IntelliJ runtime to human) | `git show 18cea80c` removes `registerDocumentFormatter` and the `DocumentFormatter` import from `extension.ts`; no `registerDocumentFormattingEditProvider` remains in `src/`. `lsp.Formatter: BBjFormatter` makes the server advertise document and range formatting and not on-type (capability test). `normalizeFormatterSettings` emits exactly the 15 keys in fixed order, defaults `indentWidth: 2`, drops `javaPath`, nulls and unknown keys. Intake through `initializationOptions.formatter` (`bbj-ws-manager.ts:136`) and `didChangeConfiguration` (`configuration-change-handler.ts:117`, ahead of the initialized gate); the client synchronizes the whole `bbj` section. IntelliJ: `BbjLanguageServerFactory` declares `LSP_FORMATTING_ENABLED = false` once and gates all four `LSPFormattingFeature` methods on it; IntelliJ sends no formatter init options so the server uses defaults. `./gradlew test --tests '*BbjLspFormattingSwitchTest*' --tests '*Lsp4ij*'` BUILD SUCCESSFUL on the final tree. |

**Score:** 5/5 truths verified (0 present-but-behavior-unverified; five hand-check items remain, see frontmatter)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/bbj-format-settings.ts` | 15-key normalizer and holder | VERIFIED | Substantive, used by the service and tests; legacy key mapped |
| `bbj-vscode/src/language/bbj-format-edit.ts` | Minimal line edits | VERIFIED | Substantive; used by the service |
| `bbj-vscode/src/language/bbj-format-service.ts` | Service with outcomes, dedup, stale guard | VERIFIED | Wired through `bbj-module.ts:107` (`compiler.BBjFormatService`) |
| `bbj-vscode/src/language/bbj-formatting-handler.ts` | Bounded handlers | VERIFIED | Registered in `main.ts:133` |
| `bbj-vscode/src/language/bbj-formatter.ts` | `lsp.Formatter` slot | VERIFIED | Registered `bbj-module.ts:122` |
| `bbj-vscode/src/language/format-settings-notification.ts` | Open-settings method and query | VERIFIED | Used by service and `extension.ts:34` |
| `bbj-intellij/.../BbjLanguageServerFactory.java` | One switch, four overrides | VERIFIED | Constant false |
| IntelliJ fence tests | Pin the switch | VERIFIED | Run, BUILD SUCCESSFUL |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `main.ts` | bounded handler | `registerBoundedFormattingHandler(connection, shared, BBj)` after `startLanguageServer` | WIRED |
| handler | `BBjFormatService.format` | `bbj.compiler.BBjFormatService.format` | WIRED |
| service | bbj-ls | `javaInterop.formatProgram(params, token)` (phase 124 client) | WIRED |
| client `bbj` section | `setSettings` | `didChangeConfiguration` and `initializationOptions.formatter` | WIRED |
| service | client UI | `notifyOpenFormatterSettings`, `showFormatterDocument` and warning senders in `bbj-notifications.ts` | WIRED |
| `bbj/openFormatterSettings` | Settings UI | `registerFormatterSettingsLink` (`extension.ts:493`, `:610`) | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| `BBjFormatService.format` | edit text | live `formatProgram` answer on :5008 | Yes (live test: edit, then none on re-format) | FLOWING |
| settings payload | 15 keys | VS Code `bbj.formatter` through normalizer | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase vitest suites (12 files) | `cd bbj-vscode && npx vitest run <the 12 format/settings/activation suites>` | 12 files, 210 tests passed | PASS |
| Live formatter through the production service | `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts` | 10/10 passed | PASS |
| IntelliJ switch and LSP4IJ fence | `cd bbj-intellij && ./gradlew test --offline --tests '*BbjLspFormattingSwitchTest*' --tests '*Lsp4ij*'` | BUILD SUCCESSFUL | PASS |

The whole-suite figures in the plan-06 summary (4083 passed, 0 failed tests) were not re-run; per the standing whole-suite decision the targeted runs above stand in.

### Probe Execution

Step 7c: SKIPPED (no probe scripts declared by the plans).

### Requirements Coverage

All 13 IDs appear in plan frontmatter and in REQUIREMENTS.md; none is orphaned.

| Requirement | Source plans | Status | Evidence |
|-------------|--------------|--------|----------|
| FMT-01 | 03, 06 | SATISFIED | Whole-document path, advertised capability, live test |
| FMT-02 | 03, 06 | SATISFIED | Range path, `#range:` canonicalName, bbj-ls snapping accepted |
| FMT-03 | 03, 06 | SATISFIED | Bounded handler after start, silent cancel, stale drop |
| FMT-04 | 01, 03, 06 | SATISFIED | Equal text gives `[]`; live re-format gives no edit |
| FMT-05 | 01, 03, 06 | SATISFIED | Minimal line edits; version re-check after await |
| FMT-08 | 04 | SATISFIED | Named-key message plus Open Settings |
| FMT-09 | 04 | SATISFIED | Line named, Go to Line, clamped |
| FMT-10 | 04 | SATISFIED | Per-kind warnings, ledger dedup (scopes per D-02) |
| FMT-11 | 04 | SATISFIED | Once per connection generation, distinct wording |
| FMT-12 | 03 | SATISFIED | Positive allow-list on `languageId === 'bbj'` |
| SET-02 | 01, 03, 05, 06 | SATISFIED | 15 keys, explicit values, indentWidth 2, javaPath dropped |
| CUT-01 | 06 | SATISFIED | Client provider removed in the same commit as the capability |
| IJF-01 | 02 | SATISFIED | One false constant gating four overrides |

Bookkeeping: REQUIREMENTS.md still shows FMT-01..05, FMT-12, SET-02, CUT-01 and IJF-01 as unchecked/Pending (FMT-08..11 are ticked). The plan-06 executor was barred from editing it, so the orchestrator should tick these when closing the phase. Not a code gap.

### Anti-Patterns Found

None in the added source. No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK` and no planning identifiers in the added `src` lines of `bbj-vscode/src` and `bbj-intellij/src` (diffed from `774941fc`). `document-formatter.ts`, `formatter-verifier.ts` and `formatter-java-resolver.ts` remain in the tree but are unimported; their deletion is scheduled (Phase 127, CUT-02/SET-04), so they do not violate CUT-01.

### Code Review Warnings (125-REVIEW.md) vs the success criteria

None of the three warnings defeats a success criterion. They are recorded as non-blocking.

- **WR-01 (legacy `splitSingleLineIF` fallback):** latent. Today `splitSingleLineIf` is not declared in `package.json`, so the client's merged object lacks it and the legacy key (declared, default false) is read correctly. It breaks only once Phase 127 declares the new key with a default. Must be fixed or tested in Phase 127 (build the payload from `inspect()`).
- **WR-02 (unexpected exceptions swallowed at debug):** the unexpected-exception path is not one of the failure kinds SC3 lists, and the buffer stays untouched. Observability gap only.
- **WR-03 (engine failure and timeout shown once per connection):** matches locked decision D-02. It is a UX trade-off, not a missed criterion. Worth reopening D-02 before release, since a second file that fails the same way is silent.

### Human Verification Required

See the frontmatter list (five items). Build both the VSIX and the IntelliJ plugin zip from the final tree after the code-review fixes first (standing UAT rule), then run against a live BBj 26.03 BBjServices. IntelliJ evidence must come from a real `idea.log`.

Additional info-level notes for that hand check:

- The client `documentSelector` also lists the `bbx-config` language, so VS Code may list the BBj formatter for a `.bbx` config file. The server returns no edits for it, so nothing is sent to bbj-ls or changed.
- Open Settings opens a view that declares only 4 of the 15 keys (IN-02); the rest arrive with Phase 127.
- `eolCharacter` LF/CRLF is not idempotent against an editor using the other line ending (carried forward by plan 06).

### Gaps Summary

No gaps. The server formatter, bounded handler, settings normalizer and intake, per-kind notices, provider removal and IntelliJ switch all exist, are wired, and pass targeted and live checks. The remaining work is the mandated in-IDE hand check.

---

_Verified: 2026-10-02_
_Verifier: Claude (gsd-verifier)_
