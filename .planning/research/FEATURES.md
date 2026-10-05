# Feature Research

**Domain:** Language-server code formatting (document, range, on-save) and DENUM (line-number removal) for BBj, served by `bbj-ls` `formatProgram` / `denumProgram` over the existing :5008 interop connection, consumed by VS Code and IntelliJ (LSP4IJ)
**Milestone:** v4.9 bbj-ls DENUM & Format Migration
**Researched:** 2026-10-01
**Confidence:** HIGH on server contract and error semantics (read from bbj-ls README / formatter README / CHANGELOG); HIGH on existing-code dependencies (read from source); MEDIUM on VS Code host behaviour (format-on-save budget, minimal-edit handling); LOW-MEDIUM on IntelliJ/LSP4IJ format-on-save behaviour (that is exactly what the milestone's evaluation phase must establish)

Scope is only what the new features need. Existing LS features, composers, compile, decompile of tokenized programs and so on are untouched.

## Contract Facts That Shape Every Feature

These come from `/home/coder/repos/bbj-ls/README.md` ("JSON-RPC methods") and `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md`. The UX below follows from them.

- `formatProgram` whole-document returns the **full text** (`edits` absent); with `range` it returns `edits` with exactly one `TextEdit`, or an **empty list when nothing changed**. The client or LS must turn the whole-document `text` into an LSP edit, and must send `[]` when it equals the buffer.
- **Range formatting never runs DENUM**, whatever `allowDenum` says. A numbered or mixed file always gets `-33006` on a range request. DENUM rewrites the whole file or nothing.
- `allowDenum: true` (whole-document only) DENUMs first, then formats, in one request. Diagnostics come back already remapped to the formatted text's line numbers. This is the only way to get "DENUM and format" as one undo step.
- `settings` keys are exactly the 15 `FormatOptions.fromMap` keys. **An unknown key is rejected with `-33007`**, so the LS must send only the 15 known keys, never the whole `bbj.*` configuration. Values are read as literal text: `4` is accepted for `indentWidth`, `4.0` and JSON `null` are rejected. Enum values match case-insensitively.
- `-33007` carries `data: [{setting, message}]`, one per problem. The messages are already sanitised and user-readable, for example `indentWidth: must be between 0 and 16, was 99`. The `setting` is the bare key (`indentWidth`), not the UI key (`bbj.formatter.indentWidth`).
- `-33008` carries `data: {line}`, the first offending line (1-based).
- `-32800` means supersession by a newer request for the same `canonicalName`. It is not an error to show.
- Limits: `text` over 4 MiB gives `-33003`. Format and DENUM steps time out at 10 s each (`-33002`).
- Older BBj: the method does not exist, so expect JSON-RPC MethodNotFound. This is not in the documented code table, so the roadmap needs a probe (see the latch dependency below).
- The formatter changelog is explicit that the engine deliberately has **no setting to restore** the old automatic blank lines, and that `ifClosingKeyword`, `ifKeywordCase` and `eolCharacter` default to `KEEP`.

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these makes the migration feel like a regression from today's VS Code formatter and DENUM command.

| # | Feature | Why Expected | Complexity | Notes |
|---|---------|--------------|------------|-------|
| T1 | **Format Document** through LSP `textDocument/formatting`, replacing the `registerDocumentFormattingEditProvider` path | Users already have it in VS Code via the jar. Same menu, same shortcut, same output location. | MEDIUM | LS service override (Langium formatter service) calling `formatProgram` with `canonicalName` = document URI so rapid requests supersede cleanly. Remove the old `registerDocumentFormatter(context)` in `extension.ts` in the same change, or VS Code shows a "multiple formatters" conflict. |
| T2 | **Unchanged output returns an empty edit list** | Format-on-save must not dirty a buffer or create a save loop when the file is already formatted. | LOW | Compare `text` with the live buffer text before building the `TextEdit`. The server only guarantees this for range requests. |
| T3 | **Format on save** (VS Code `editor.formatOnSave`, no new setting): silent on success, silent on cancel, no modal, never blocks save | This is how most users meet the formatter. The old code already warned that it "could be aborted". | MEDIUM | VS Code cancels format-on-save after 750 ms by default (`editor.formatOnSaveTimeout`). Honour the `CancellationToken`: if cancelled or superseded (`-32800`), return no edits and show no message. In-process formatting removes the JVM spawn, which is the real speed win. Document `editor.formatOnSaveTimeout` for big files. |
| T4 | **Format Selection** through LSP `textDocument/rangeFormatting` | An LSP formatter is expected to offer it. The server already supports it. The old jar could not do it, so this is new and visible. | MEDIUM | Selection snaps to whole lines, expands to whole logical statements (`:` continuations included), and is formatted in context. Selecting mid-line formats the whole line. Document that. Also activates `editor.formatOnPaste` and `formatOnSaveMode: modifications` for free. |
| T5 | **Line-numbered file on Format: do not format, do not auto-DENUM, offer DENUM** (`-33006`) | Milestone requirement. Silent conversion of numbered code to labels is a semantic rewrite. | MEDIUM | Return no edits (not a ResponseError, to avoid the host's generic "formatting failed" toast). Raise one non-modal message from the LS via `window/showMessageRequest` ("BBj line-numbered program, DENUM it first?") with a "Denumber" action. Using the standard LSP message channel makes it work in both IDEs without host-specific code. Range requests get a variant that says "format selection needs an unnumbered file". Dedupe per document so format-on-save, format-on-paste and "format modified lines" do not spam. |
| T6 | **Invalid settings (`-33007`) shown per key**, with the UI key name and a way to the settings page | Milestone requirement. The error text is already human-readable. | LOW | Join `data[]` into one message, prefix each `setting` with `bbj.formatter.`, action "Open Settings" (query `bbj.formatter` in VS Code). Dedupe by message set. With a typed schema in `package.json` (T13) this only fires for hand-edited `settings.json` or IntelliJ XML. |
| T7 | **Mixed numbering (`-33008`) with the offending line** | Milestone requirement. The user must know where to fix it. | LOW | Message "Line N mixes numbered and unnumbered lines; fix it by hand, then DENUM". |
| T8 | **Quiet, typed handling for the remaining failures**: `-33009` engine failed, `-33002` timeout, `-33003` too large, `-33004` service/DENUM unavailable, `-33005` protected program, `-32602` | A failure must never leave the file half-changed and must say why. | LOW | Always leave the buffer untouched. Always log full detail to the LS output. User-facing text is one line per kind, deduped per (kind, document) until a later success. |
| T9 | **Older BBj / interop down: one clear message, no fallback** | User decision: hard cut-over. | MEDIUM | Reuse the probe-and-latch the live parser already uses (`BBjParserService`, once per connection generation). Older BBj: "Formatting requires BBj 26.03 or later." Interop unreachable: "BBj Java interop is not connected." Show once per connection generation, log every time. See "Behaviour when BBj is older or interop is down" below. |
| T10 | **DENUM command (`bbj.denumber`, keep id, menus and `alt+n`) backed by `denumProgram`** | It exists today in VS Code. | MEDIUM | Reads the **live editor text** and applies one whole-document `WorkspaceEdit`. See "DENUM command UX". |
| T11 | **DENUM result feedback**: `denumbered:false` is "already unnumbered, nothing to do"; success is a short confirmation; failure uses the T8 mapping | Prevents a silent no-op that looks like a bug. | LOW | `-33001` on tokenized input should point the user to the existing Decompile command. `-33005` says the program is protected. |
| T12 | **Open-file DENUM prompt rewired** (`bbj.denumber.promptOnOpen`, "Denumber" / "Open Read-only") | Existing behaviour and setting. | LOW | Detection stays client-side and BBj-free (`isLineNumberedSource` in `line-numbering.ts`). Only the action changes (calls the new command). The prompt can fire at activation before the LS client is ready, so the action must await the client. |
| T13 | **All 15 settings in VS Code with a real schema** | Milestone requirement. Typed settings prevent most `-33007`s. | LOW | `package.json`: `indentWidth` as `integer` (min 0, max 16, so no `4.0`), booleans, and enums with `enumDescriptions` for `indentCharacter`, `eolCharacter`, `ifClosingKeyword`, `ifKeywordCase`, `parameterLayout`, `operatorSpacing`. Hot-applied, no restart: read per request. Keep the existing four keys and their current defaults (see Decision Q2). |
| T14 | **Old key carry-over**: `bbj.formatter.splitSingleLineIF` is renamed `splitSingleLineIf` | A user who set the old key must not silently lose it. | LOW | Read the old key as a deprecated fallback for one release, with a `deprecationMessage` on it. Remove `bbj.formatter.javaPath` and note in the docs that it is gone. |
| T15 | **15 settings in IntelliJ** (settings page, validated, applied to the LS) | User decision: both IDEs. | MEDIUM | `BbjSettingsConfigurable` follows the existing pattern: a spinner (0-16), checkboxes, five combo boxes whose display names map to wire values (as `CompilerInitOptions` does for the compiler trigger). Settings reach the LS through flat `initializationOptions` plus a restart-on-apply. That is the existing, proven channel, so format settings changing restarts the LS like other settings do. Combo boxes plus a bounded spinner make `-33007` unreachable from the UI. |
| T16 | **IntelliJ Reformat Code (Ctrl+Alt+L), selection and Actions on Save evaluated**, with a recorded verdict | Milestone requirement: evaluate, then the user decides supported or disabled. | MEDIUM | Not a build-everything item: an evaluation matrix with outcomes. See "IntelliJ evaluation matrix". Capability gating (not advertising formatting providers if "disabled") must be a one-line switch. |
| T17 | **Removal of the old path** (`BBjCFCli.jar`, `tools/formatter`, formatter java resolver and verifier, `javaPath`, bbjlst denumber path, their tests, guards and docs) | Milestone requirement. Leaving dead code keeps a security surface alive. | MEDIUM | Wide blast radius: tests, source-guard tests, `.vscodeignore`, provenance/SBOM docs (DEP-02 / #507), docs. `bbjlst` stays for tokenized decompile only (`buildDecompileArgv`, `decompileInPlace`). |
| T18 | **User-facing migration note + guides + QA checklists** listing the output differences | Users will see their code formatted differently on first use after upgrade. | LOW | Content is in "Old versus new output" below. It is the formatter's own CHANGELOG, restated for BBj developers. |

### Differentiators (Competitive Advantage)

| # | Feature | Value Proposition | Complexity | Notes |
|---|---------|-------------------|------------|-------|
| D1 | **"Denumber and Format" in one step** (the `-33006` message's primary action) | One click instead of DENUM, then format. One undo step. Diagnostics already remapped. | MEDIUM | LS command that calls `formatProgram` with `allowDenum:true` and applies the result with `workspace/applyEdit`. The plain "Denumber" action is the T5 minimum. |
| D2 | **Minimal edits instead of one whole-document replace** | A full replace can reset cursor, folding and decorations, and clutters IDE undo. A prefix/suffix (or hunk) trim fixes most of it. | LOW-MEDIUM | VS Code post-processes provider output to minimal edits for display, but IntelliJ/LSP4IJ applies edits as given (LOW confidence on exact behaviour). Do a common prefix/suffix trim in the LS. A per-line diff is optional. |
| D3 | **Jump to the offending line for `-33008`** | Turns an error into a one-click fix. | LOW | LSP `window/showDocument` with a selection from `data.line`. Check LSP4IJ support during evaluation. |
| D4 | **DENUM summary with diagnostics detail** | DENUM's compile step can report errors. Users should learn "denumbered, but line 120 has a syntax problem". | LOW | Output-channel list (line, original line number, severity, message) plus one notification with counts and a "Show" action. `ProgramDiagnostic.line` is 0 when BBj gave none, so a list is more robust than squiggles. |
| D5 | **IntelliJ DENUM action** (Tools / editor menu entry, `workspace/executeCommand`) | IntelliJ has no DENUM today. The LS command already exists, so the plugin work is an action plus enabled-state. | MEDIUM | New action class, `plugin.xml` entry, IntelliJ JUnit coverage. Note `ComposerRequestContractTest` reads TS paths: moving or adding request handlers means running `bbj-intellij ./gradlew test`, not only vitest. |
| D6 | **IntelliJ open-file DENUM banner** (editor notification) | Parity with VS Code's open-file prompt. | LOW-MEDIUM | The plugin already has the notification-provider pattern (`BbjMissingHomeNotificationProvider` and friends). Detect numbered text locally. Defer unless D5 ships. |
| D7 | **Hot-apply of format settings in IntelliJ** (no restart) | A restart per tweak is heavy. | HIGH | The plugin documents that the generic LSP4IJ settings pull path is not wired for BBj. Possible route: LSP `FormattingOptions` extra keys or a custom notification. Investigate only if the IntelliJ verdict is "supported". LOW confidence. |
| D8 | **Idempotent, behaviour-preserving formatting as a stated guarantee** | The engine proves it (idempotence sweeps, `bbjcpl` and behaviour-equivalence tests, structural balance). | LOW | Zero code: state it in the guides. It is the main reason for users to trust format-on-save. |
| D9 | **Fix of the old jar's `--single-line-if` crash** (#507) | `splitSingleLineIf` finally works on block IFs. | LOW | Free with the migration. Mention in the migration note. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Auto-DENUM on save or on format** (an `allowDenum` setting, or a "denumber on format" toggle) | Seems convenient: "just fix my file". | A silent semantic rewrite: line numbers become labels, the diff touches every line, and it cannot be undone by deselecting. Format-on-save fires constantly and cannot tell the user. `allowDenum` is deliberately not one of the 15 settings. | Explicit action only: Denumber, or Denumber and Format (D1). |
| **Range DENUM** ("denumber selection") | Mirrors range formatting. | The server refuses: DENUM rewrites the whole file or nothing. | Range request on a numbered file returns `-33006` with the "needs whole-file DENUM" variant. |
| **Legacy fallback to `BBjCFCli.jar` / bbjlst when bbj-ls is missing or old** | Keeps formatting working offline or on BBj < 26.03. | User decision: hard cut-over. A fallback keeps the vendored 2021 jar, its java resolver, verifier, checksum toasts and the `--single-line-if` crash alive. | "Requires BBj 26.03" message (T9). |
| **Using VS Code `editor.tabSize` / `insertSpaces` or IntelliJ Code Style indent as the formatter's indent** | Feels native. | Two sources of truth, and the old formatter already ignored them. The BBj formatter settings must stay authoritative. | Document: BBj formatter settings govern BBj files. In IntelliJ, point to the BBj settings page. |
| **Re-publishing DENUM diagnostics as editor squiggles** | Looks thorough. | On BBj 26.03 the live `parseProgram` diagnostics already report the same syntax errors; a second channel duplicates and fights the diagnostic hierarchy. | Summary plus output list (D4). |
| **Modal dialogs or progress toasts on every format** | Feels responsive. | Format-on-save and format-on-paste fire constantly. | Silent success; one deduped, non-modal message on failure. |
| **A setting or mode to restore the old automatic blank lines, old label indentation or FI-rewriting** | Users will ask on day one after upgrade. | The engine intentionally removed them. Reproducing old output means a second formatter. | Migration note; `indentLabelBlocks`, `collapseMultiLine`, `blankLineAfterReturn`, `ifClosingKeyword=FI` cover most needs. |
| **Exposing server limits (timeouts, 4 MiB cap) as extension settings** | Seems helpful for big files. | They are `BBj.properties` on the server, outside this repo's control. | Document the limits and `editor.formatOnSaveTimeout`. |
| **Workspace-wide / batch format command** | "Format all my files". | The formatter deferred batch (BAT-01). Per-file requests at scale hit supersession and timeouts. Out of the milestone. | None this milestone. |
| **Forcing `editor.formatOnSave` on for BBj via `configurationDefaults`** | Promotes the formatter. | Changes user behaviour without consent and magnifies the numbered-file and old-BBj message problems. | Leave the user's own setting alone. |

## Behaviour Specification

### Line-numbered files (`-33006`) decision table

| Trigger | File state | Behaviour |
|---------|------------|-----------|
| Format Document (manual) | Unnumbered | Format; empty edit list if unchanged. |
| Format Document (manual) | Numbered / mixed | No edits. One message with **Denumber and Format** (D1; T5 minimum is **Denumber**) and **Cancel**. Mixed numbering returns `-33008` with the line instead. |
| Format Selection | Numbered / mixed | No edits. Message: "Formatting a selection needs an unnumbered file" with a **Denumber** action. Never offers range DENUM. |
| Format on save | Numbered | No edits, **save proceeds**. One deduped message per document per session. No modal. |
| Format on paste / format modified lines | Numbered | Same as above (they use range requests). The dedupe is mandatory or every paste prompts. |
| Open-file prompt | Numbered | Existing prompt fires once per document per session, so most users decide before they ever format. |

Rationale: the open-file prompt is the primary gate, the `-33006` message is the backstop, and nothing ever DENUMs without a click.

### DENUM command UX

- **Edit model:** Apply the result as one whole-document `WorkspaceEdit` on the live buffer (undoable with a single Ctrl+Z, buffer left dirty, not auto-saved). Do not rewrite the file on disk. The old bbjlst path required the on-disk file (so unsaved changes were ignored or clobbered), produced `<file>.lst`, renamed it over the original and reopened it. The buffer approach fixes dirty-buffer handling by construction: the LS sends exactly what the user sees. See Decision Q1.
- **Unnumbered:** "Already unnumbered, nothing to do". No edit.
- **Tokenized (`<<bbj>>`):** `-33001`. Message points to "Decompile Tokenized BBj Program". Decompile itself stays on bbjlst.
- **Protected:** `-33005`. **Mixed:** `-33008` with the line (T7). **Timeout / too large / unavailable:** T8.
- **Read-only editor:** the edit cannot apply. Say so rather than failing silently.
- **Result summary (D4):** "Line numbers were converted to labels." If diagnostics exist, add a count and a "Show" action to an output list.
- **Target resolution:** keep argument-first resolution (RESP-07: `target-resolution.ts`, one shared "No active BBj file" warning).

### Open-file DENUM prompt

Keep `bbj.denumber.promptOnOpen`, the once-per-document tracking and the two actions. Rename "Denumber & Replace" to **Denumber**, because the edit now lands in the buffer rather than replacing the file on disk (Decision Q1). Detection remains local and BBj-free. If the user declined once, the later `-33006` message (deduped) is the only reminder. If the action fails because BBj is old or the interop is down, show the T9 message, not a generic error.

### Settings UX (15 keys)

| Aspect | VS Code | IntelliJ |
|--------|---------|----------|
| Types | `integer` 0-16, booleans, six enums with `enumDescriptions` | Spinner, checkboxes, combo boxes (display name to wire value) |
| Validation | Schema blocks most bad values; `-33007` covers hand-edited JSON | UI cannot produce a bad value; `-33007` unreachable except hand-edited XML |
| `-33007` display | One message, "bbj.formatter.<key>: <server message>", action "Open Settings" | Same message through the LS; offending field not highlighted (D-level nicety, defer) |
| Apply | Hot, read per request | Restart-on-apply via `initializationOptions` (existing channel); hot-apply is D7 |
| Sent to server | Only the 15 known keys, as strings or integers (never `4.0`, never null) | Same |
| Migration | `splitSingleLineIF` deprecated alias (T14); `javaPath` removed | New page, nothing to migrate |

Defaults: send explicit values so the VS Code defaults in `package.json` win. Keep the four existing keys at their **current VS Code defaults** (`indentWidth` 2, others false), which differ from the engine default of 4 and from the old Eclipse plug-in's own 4. The other eleven default to engine defaults. See Decision Q2.

### Behaviour when BBj is older or interop is down

| Situation | What the user sees | Notes |
|-----------|-------------------|-------|
| BBj < 26.03 (no `formatProgram` / `denumProgram`) | "Formatting requires BBj 26.03 or later." and the same for DENUM | Detect once per connection generation by probing (latch). Never retried per save. No fallback. |
| Interop not connected / circuit breaker open | "BBj Java interop is not connected" | Distinct from "too old". Show once per generation, log always. |
| `-33004` DENUM not available on this BBj | DENUM-specific message | Server-reported. Formatting without DENUM still works. |
| Format-on-save in either state | Save proceeds, no edits, deduped message | Never block a save. |

Application errors (`-33006`..`-33009`) are not connection failures and must not trip the interop circuit breaker. A side effect to call out in the docs: formatting now **requires a running BBjServices**, where the old jar needed only a bundled jar and any Java. This is accepted by the hard cut-over, but contributors without BBj lose formatting.

### Old versus new output (what users will notice)

Source: `/home/coder/repos/bbj-ls/bbj-ls-formatter/CHANGELOG.md`. Ordered by how visible the change is on first format.

| Visibility | Change | Setting (if any) |
|------------|--------|------------------|
| High | **Labels no longer change indentation.** Code under `label:` now sits at the enclosing level. Old output drifted ever deeper on long GOTO/label chains. | `indentLabelBlocks=true` indents a subroutine body between a label and its `RETURN`. |
| High | **No automatic blank lines** around DECLARE / USE / CLASS / FIELD / labels / block IF. Any blank line is one you wrote, and every one survives. | `collapseMultiLine` collapses runs to one; `blankLineAfterReturn` adds one after a subroutine's RETURN. The old auto-insertion has no setting. |
| High | **Existing `FI`/`ENDIF` closers and `ELSE`/`FI`/`ENDIF` case are left alone** (default `KEEP`). The old plug-in rewrote every closer to `FI` and matched the IF's case. | `ifClosingKeyword`, `ifKeywordCase` |
| Medium | **Line endings kept**: a CRLF file stays CRLF (the old plug-in forced LF, and its forced-EOL option also corrupted `\n` inside strings). | `eolCharacter=LF`/`CRLF` |
| Medium | **Final newline preserved** exactly once, neither added nor doubled. | none |
| Medium | **Whitespace-only lines become empty**; no trailing whitespace. | none |
| Medium | **A bare `::path::Reference` line gets one leading blank** so BBj does not read it as a continuation. | none |
| Medium | **A misplaced automatic `FNEND ; REM ... added automatically` is gone.** | none |
| Medium | **A `;` chain after an `ERR=*NEXT` / `*SAME` target is never split.** A single-line IF is left alone when splitting would cross such a target. | none |
| Low (positive) | **Keyword upper-casing leaves comments, method, class and variable names alone.** | `keywordsToUppercase` |
| Low (positive) | **Crash fixes**: block IF without THEN, deeply nested parentheses, and the `splitSingleLineIf` crash (#507). **Block-IF detection**: IF without THEN, and `IF X<>-1` compares. | none |
| Low | **`removeWhitespace` setting removed.** It never controlled anything and never existed in this extension. | n/a |
| New | Selection formatting; new settings `operatorSpacing`, `indentLabelBlocks`, `blankLineAfterReturn`, `parameterLayout`, `collapseMultiLine`, `splitInlineComments`, `splitInlineLabelComment`, `eolCharacter`, `ifClosingKeyword`, `ifKeywordCase`; faster (no JVM spawn). | see Settings UX |

First-format diff size on a legacy file will be large. The migration note (T18) should say so up front, and recommend committing before the first format.

### IntelliJ evaluation matrix (T16)

Each row ends with pass / fail / needs-workaround, feeding the user's "officially supported or disabled" decision. Confidence on LSP4IJ behaviour is LOW-MEDIUM: LSP4IJ documents `textDocument/formatting` and `rangeFormatting` (formatting-service extension points) but its docs do not cover Reformat Code on save, and public discussion treats format-on-save as separately scoped.

| Case | What to check |
|------|---------------|
| Reformat Code, whole file (Ctrl+Alt+L) | Reaches the LS, edit applies, caret and undo behave, one undo step. |
| Reformat selection | Reaches `rangeFormatting`, snaps to statements. Does the LSP4IJ range path engage on a BBj file type that is a custom PSI language? |
| Actions on Save, "Reformat code", scope **Whole file** and **Changed lines** (the latter needs VCS and uses range formatting) | Does saving call the LS at all? Is the result applied before the write? |
| Numbered file | How does LSP4IJ surface a `window/showMessageRequest` raised during a formatting request? Is the action usable? Does a ResponseError produce anything visible? |
| Settings | Do the 15 settings reach the LS (init options plus restart)? Does the existing `BbjLanguageCodeStyleSettingsProvider` (comment at first column) interfere? IDE indent settings are not used by the BBj formatter. |
| Failure modes | Interop down, BBj old, timeout: no hang on the EDT, no repeated error balloons. |
| Switch | Disabling = not advertising the formatting capability (or an LSP4IJ client feature override); verify it is a small, testable change. |

Sequencing note: the user wants all 15 settings in IntelliJ **and** an evaluate-then-decide on formatting. If the verdict is "disabled", a 15-control settings page would be dead UI. Recommend plumbing the init options first, running the evaluation, then building the polished settings page (T15) once the verdict is in, unless the user wants the page regardless.

## Feature Dependencies

```
T1 Format Document (LS formatting provider)
    ├──requires──> LS interop lane for formatProgram (existing :5008 connection, breaker, probe/latch)
    ├──requires──> T13/T14 settings read + 15-key mapping (config-change handler)
    ├──requires──> T2 empty-edit-on-unchanged
    └──requires──> removal of old registerDocumentFormatter (else double provider)

T4 Format Selection ──requires──> T1 (same service)
T3 Format on save ──requires──> T1 + cancellation handling
T5 -33006 handling ──requires──> T10 DENUM command (action target)
T5/T6/T7/T8/T9 message dedupe ──requires──> one LS-side message helper (window/showMessageRequest)
D1 Denumber and Format ──requires──> T1 + allowDenum:true + workspace/applyEdit
D2 minimal edits ──enhances──> T1, T4, D1, T10
T10 DENUM command ──requires──> LS command + workspace/applyEdit + live buffer text
T12 open-file prompt ──requires──> T10 and LS client ready
D5/D6 IntelliJ DENUM ──requires──> T10 (LS command)
T15 IntelliJ settings ──requires──> init-options channel + restart-on-apply (existing)
T16 IntelliJ evaluation ──requires──> T1, T4, T15 plumbing
T17 removal ──requires──> T1, T10, T12 shipped (cut-over, no fallback)
T18 docs/QA ──requires──> everything else (output differences are final once settings defaults are decided)
D7 hot-apply ──conflicts──> restart-on-apply simplicity (only if IntelliJ verdict is "supported")
Auto-DENUM ──conflicts──> T5 (explicit consent)
```

### Dependency Notes

- **Probe-and-latch (`BBjParserService`)** is the template for T9. A second capability probe (or one shared probe covering `formatProgram`/`denumProgram`) avoids sending doomed requests on every save. DENUM may be unavailable on a BBj that has `formatProgram` (`-33004`), so keep the two capabilities distinct in the messages.
- **Interop connection and breaker** (`java-interop-connection.ts`): application errors `-33006`..`-33009` and `-32800` must not count as faults. Format and parse run on separate server worker threads, so a stuck parse does not delay a format, but the extension side must not serialise them behind one client lock.
- **Settings channel:** VS Code uses `workspace/didChangeConfiguration` handling in `configuration-change-handler.ts` and the trust-gated middleware in `config-path-trust.ts`. Formatter settings are not paths, so they need no trust gate, but they must pass through the same pull path rather than a new one. IntelliJ uses flat `initializationOptions` (see `CompilerInitOptions`).
- **`isLineNumberedSource` (`line-numbering.ts`)** stays in the client for the open-file prompt. The server's `LineNumbering` is authoritative for format; the two must not disagree on edge cases (blank lines, leading `:`), so reuse test fixtures from the server's rules where possible.
- **Existing decompile code** (`decompileInPlace`, `decompileReplace`, `decompileReadonly`, `buildDecompileArgv`, `waitForDecompileOutput`) stays. Removal of the denumber path (T17) must not take the tokenized decompile with it. Check the `denumber:true` option, which decompile also uses.
- **IntelliJ contract test:** `ComposerRequestContractTest` reads TS paths; run the IntelliJ Gradle tests whenever a request handler or command moves.

## MVP Definition

### Launch With (v4.9)

- [ ] T1, T2, T3, T4: format document, range, on-save through the LS (the whole point)
- [ ] T5, T6, T7, T8, T9: typed errors, deduped messages, old-BBj and interop-down messages
- [ ] T10, T11, T12: LS DENUM command (buffer edit, undoable), result feedback, open-file prompt
- [ ] T13, T14, T15: 15 settings in both IDEs, `splitSingleLineIf` alias
- [ ] T16: IntelliJ evaluation with a recorded verdict
- [ ] T17, T18: removal of the old path, migration note, guides, QA

### Add After Validation (v4.9.x)

- [ ] D1 Denumber and Format: promote to launch if the `-33006` flow feels two-click-heavy in UAT. It is the natural primary action.
- [ ] D2 minimal edits: add if UAT shows cursor or fold loss, particularly in IntelliJ.
- [ ] D3 jump to line, D4 DENUM diagnostics list: cheap, add with T7/T11 if time allows.
- [ ] D5 IntelliJ DENUM action: add if IntelliJ formatting is "supported" (users there will hit numbered files).

### Future Consideration (v5+)

- [ ] D6 IntelliJ open-file banner, D7 hot-apply of IntelliJ settings: only if there is demand and the LSP4IJ route is confirmed.
- [ ] Batch / workspace format (BAT-01): deferred by the formatter itself.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| T1 Format Document via LS | HIGH | MEDIUM | P1 |
| T2 empty edit on unchanged | HIGH | LOW | P1 |
| T3 format on save (silent, cancel-safe) | HIGH | MEDIUM | P1 |
| T4 Format Selection | MEDIUM | MEDIUM | P1 |
| T5 `-33006` message + Denumber action | HIGH | MEDIUM | P1 |
| T6 / T7 / T8 error mapping | MEDIUM | LOW | P1 |
| T9 old BBj / interop down | HIGH | MEDIUM | P1 |
| T10 / T11 DENUM command + feedback | HIGH | MEDIUM | P1 |
| T12 open-file prompt rewire | MEDIUM | LOW | P1 |
| T13 / T14 VS Code settings schema + alias | HIGH | LOW | P1 |
| T15 IntelliJ 15 settings | MEDIUM | MEDIUM | P1 (after T16 verdict, see sequencing) |
| T16 IntelliJ evaluation | HIGH | MEDIUM | P1 |
| T17 old path removal | MEDIUM | MEDIUM | P1 |
| T18 docs + QA + migration note | HIGH | LOW | P1 |
| D1 Denumber and Format | MEDIUM | MEDIUM | P2 |
| D2 minimal edits | MEDIUM | LOW-MEDIUM | P2 |
| D3 jump to offending line | LOW | LOW | P2 |
| D4 DENUM diagnostics summary | LOW | LOW | P2 |
| D5 IntelliJ DENUM action | MEDIUM | MEDIUM | P2 |
| D6 IntelliJ banner | LOW | LOW-MEDIUM | P3 |
| D7 IntelliJ hot-apply | LOW | HIGH | P3 |

**Priority key:** P1 must have for the milestone, P2 should have, P3 future.

## Decisions for the User (resolve in requirements)

| # | Decision | Recommendation |
|---|----------|----------------|
| Q1 | DENUM applies to the editor buffer (undoable, left dirty) versus rewriting the file on disk as `bbj.denumber` does today. The open-file prompt currently says "Denumber & Replace". | Buffer edit. It handles dirty buffers, is undoable, and works for unsaved files. Rename the button "Denumber". The user saves when satisfied. |
| Q2 | Defaults for the four carried-over keys: keep VS Code's current `indentWidth: 2`, or move to the engine's 4. | Keep the current VS Code defaults so that nobody's output changes for reasons other than the engine; the other eleven default to engine defaults. Mirror in IntelliJ. |
| Q3 | Offer "Denumber and Format" (allowDenum) as the primary `-33006` action, or only plain "Denumber". | Plain Denumber is the floor; add the combined action if cheap (feature D1). |
| Q4 | Should IntelliJ settings UI ship before the IntelliJ verdict? | After, or at least decoupled from the verdict, to avoid shipping dead UI. |

## Competitor / Reference Behaviour

| Behaviour | VS Code host | IntelliJ / LSP4IJ | Our approach |
|-----------|--------------|-------------------|--------------|
| Format-on-save time budget | 750 ms default, silently cancelled on overrun (`editor.formatOnSaveTimeout`) | Not documented for LSP4IJ; to be measured | In-process format, honour cancellation, document the timeout setting |
| Range formatting | `formatOnPaste`, `formatOnSaveMode: modifications` use it | "Changed lines" on-save scope would use it (needs VCS) | Implement `rangeFormatting`; dedupe `-33006` |
| Edit application | Provider output is post-processed to minimal edits | Applies edits as given (LOW confidence) | Trim to minimal edits in the LS (D2) |
| Error channel | Generic "formatting failed" toast on a ResponseError | LSP4IJ surface for errors not documented | Return no edits, use `window/showMessageRequest` from the LS |
| Server-driven prompts | Supported | `window/showMessageRequest` supported by LSP4IJ (verify action handling in evaluation) | One LS-side helper shared by both IDEs |

## Sources

- `/home/coder/repos/bbj-ls/README.md` "JSON-RPC methods", "Error codes", "DENUM (developer tool)" (HIGH)
- `/home/coder/repos/bbj-ls/bbj-ls-formatter/README.md` "Settings reference", "Output rules", "The API" (HIGH)
- `/home/coder/repos/bbj-ls/bbj-ls-formatter/CHANGELOG.md` all default-output and setting-gated changes (HIGH)
- `/home/coder/repos/bbj-language-server/.planning/PROJECT.md` v4.9 goal, target features, prior phase decisions (HIGH)
- `/home/coder/repos/bbj-language-server/bbj-vscode/src/document-formatter.ts`, `open-file-prompts.ts`, `Commands/Commands.cjs`, `package.json` (existing behaviour, HIGH)
- `/home/coder/repos/bbj-language-server/bbj-intellij/` (`CompilerInitOptions.java`, `BbjLanguageCodeStyleSettingsProvider.java`, `plugin.xml`, `build.gradle.kts` LSP4IJ 0.21.0) (HIGH)
- LSP4IJ docs: [LSPSupport.md](https://github.com/redhat-developer/lsp4ij/blob/main/docs/LSPSupport.md) (formatting service extension points; no coverage of Reformat-on-save) (MEDIUM)
- [VS Code format-on-save timeout PR #43702](https://github.com/microsoft/vscode/pull/43702) and [vscode-python #3228](https://github.com/Microsoft/vscode-python/issues/3228) (750 ms default, silent cancel) (MEDIUM)
- [JetBrains: Reformat code](https://www.jetbrains.com/help/idea/reformat-and-rearrange-code.html) and [Save and revert changes](https://www.jetbrains.com/help/idea/saving-and-reverting-changes.html) (Actions on Save "Reformat code", whole file vs changed lines) (MEDIUM)
- [JetBrains Platform: LSP API features 2026.1](https://platform.jetbrains.com/t/2026-1-new-lsp-api-features/3943) (range formatting in the native LSP API; LSP4IJ is separate) (LOW-MEDIUM)

---
*Feature research for: BBj language-server formatting and DENUM migration (v4.9)*
*Researched: 2026-10-01*
