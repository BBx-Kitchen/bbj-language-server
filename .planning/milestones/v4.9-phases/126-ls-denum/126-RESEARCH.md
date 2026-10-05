# Phase 126: LS DENUM - Research

**Researched:** 2026-10-02
**Domain:** Langium language server custom request (`bbj/denum`), server-driven `workspace/applyEdit`, `window/showMessageRequest` offer, host-neutral diagnostics notification, VS Code output-channel rendering
**Confidence:** HIGH (all load-bearing claims were read in this session from source, node_modules, the LSP4IJ jar bytecode, or measured against the live :5008 peer; the few exceptions are tagged `[ASSUMED]` and collected in the Assumptions Log)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Carried forward (not re-asked)**
- Phase 124 D-01..D-17 stand: dedicated program lane, typed `ProgramOutcome`s, per-method availability latch (`denumProgram` has its own; `-32601` → unavailable once per connection), 25 s client deadline for DENUM with cancel-always, validated `-33008` `data: {line}`.
- Phase 125 D-01..D-07 stand for the **formatting** path: toast-first-then-log, dedup re-arm by kind (DENUM-needed re-arms per document + version), not-connected never raises a formatting popup, fire-and-forget `showMessageRequest` with a host-neutral notification on click (`bbj/openFormatterSettings` precedent), "Go to Line" for mixed numbering.
- Research: `bbj/denum` follows `compile-command.ts` (`createDenumHandler(deps)` / `registerDenumRequest`, plain-JSON DTOs, a closed `reason` vocabulary) and is registered in `main.ts` next to `registerCompileRequest`. DENUM runs on the live buffer text, never writes the file, and leaves the buffer dirty. Tokenized input is recognised by the `<<bbj>>` prefix (`TOKENIZED_PROGRAM_PREFIX` in `bbj-format-service.ts`); bbj-ls answers it with `-33001`. `ProgramDiagnostic.line` is 1-based in the **denumbered** text, `0` = no location.

**Diagnostics list (DEN-04)**
- **D-01:** The list travels as a **host-neutral server notification** (e.g. `bbj/denumDiagnostics`) carrying, per entry: line, original line number, severity, message, plus the document URI. One source for both the offer path and `bbj/denum`. VS Code renders it in this phase; IntelliJ renders it in Phase 128. The planner must confirm LSP4IJ tolerates the unhandled notification quietly until then (same check as 125 D-05). Reversibility: costly (method name and payload become a contract the IntelliJ plugin (128) consumes).
- **D-02:** VS Code writes the list into the **existing 'BBj' log output channel** (`extension.ts`, `createOutputChannel('BBj', { log: true })`), with a header per run naming the file. No new channel. "Show" reveals that channel.
- **D-03:** The count notification with **[Show]** appears **only when diagnostics > 0**, as one message combined with the success confirmation (for example "Denumbered. 2 errors, 1 warning." [Show]). A clean DENUM shows only the short confirmation.
- **D-04:** The list is written **on success only**. Failures carry no diagnostics (bbj-ls error answers have none); the failure message is the whole story.

**Format offer (FMT-06, FMT-07)**
- **D-05:** Format Document on a numbered file (`-33006`): the formatting response returns `[]` immediately, and the server fires one deduplicated `showMessageRequest` offering **[Denumber]** and **[Denumber and Format]**. This replaces the 125 D-08 interim message.
- **D-06:** Format Selection on a numbered file: a message explains that selection formatting needs a file without line numbers and offers **[Denumber]** only ("Denumber and Format" is whole-document).
- **D-07:** **A late click acts on the current buffer.** The click means "denumber this file now": read the text and version at click time, run DENUM, and apply with a versioned edit. If the buffer changes during the DENUM call, drop the result and warn. Never apply a result to a different version.
- **D-08:** Format-on-save gets **the same deduplicated offer**. The server cannot tell a save from Format Document (125 D-01); dedup per document + version (125 D-02) shows it once per edit, not once per save.
- **D-09:** "Denumber and Format" is **one `formatProgram` call with `allowDenum: true`** (whole document) applied as **one undoable edit**. A `denumbered: true` result's diagnostics go through D-01..D-04 exactly like a plain DENUM. Format-specific failures (invalid settings, too large, …) reuse 125's messages; DENUM-specific ones use D-11.

**Outcome presentation (DEN-03)**
- **D-10:** **The server presents every DENUM outcome on both paths**: the offer click and a direct `bbj/denum` request (the 127 VS Code command, the 128 IntelliJ action). The result still carries `status`/`reason`/edit/diagnostics for the caller, but clients word nothing. 127 and 128 shrink to "send the request". Reversibility: costly.
- **D-11:** Exactly one outcome message per run:
  - unnumbered file → "nothing to do" (Information);
  - success → short confirmation (Information), or combined with counts + [Show] (D-03);
  - tokenized input → points to Decompile (Warning);
  - protected program → says the program is protected (Warning);
  - mixed numbering → names the line, with [Go to Line] as in 125 D-06 (Warning);
  - too large, timeout, DENUM failed / unavailable (Warning);
  - `-32601` → "Denumbering requires BBj 26.03 or later. The connected BBjServices does not provide it." (Warning), adapted from 125 D-11;
  - interop not connected → "BBjServices is not reachable" (Warning). Unlike 125 D-04 this is shown, because the user explicitly asked. It does not re-trigger the breaker popup.
- **D-12:** DENUM outcome messages are **never deduplicated**: a DENUM run is an explicit user action and always gets its answer. Dedup applies only to the automatic offer coming from formatting (D-05, D-08).
- **D-13:** Severity: **Information for success / nothing to do, Warning for every failure.** Success whose diagnostics include errors is Warning with [Show].

**Edit application (DEN-01)**
- **D-14:** **The server applies the edit on both paths** via `workspace/applyEdit` with a versioned text-document identifier: one undo step, buffer left dirty. `bbj/denum`'s result also returns the edit plus status for information, which satisfies DEN-01's "returns the denumbered text as one edit". LSP4IJ 0.21.0 implements `applyEdit`. Reversibility: costly.
- **D-15:** Edit shape: a **minimal line diff** via `wholeDocumentChangeAsRange` (as formatting uses), one `TextEdit`, end clamped to the real last line. No edit when `denumbered: false`.

### Claude's Discretion
- Exact message wording other than D-11's fixed texts (short, plain, each naming what to do), and what "points to Decompile" names in VS Code vs IntelliJ while staying host-neutral.
- Notification method names and payload field names. Whether [Show] is a second notification (`bbj/showDenumDiagnostics`) or the client reveals on receipt of a flag.
- `bbj/denum` param/result field names and the closed `reason` vocabulary (research §5 is a starting point). `canonicalName` choice for DENUM (research suggests `null`).
- Where the DENUM orchestration lives (a `denumDocument()` core in `BBjFormatService` or a sibling service) so both the offer and the request call the same code.
- Concurrency of two overlapping DENUM runs on one document (for example offer click + command).

### Deferred Ideas (OUT OF SCOPE)
- DEN-07 (future): merge DENUM diagnostics into the Problems view.
- Roadmap note for 127/128: with D-10 and D-14, the VS Code command and the IntelliJ action only send `bbj/denum`; 128's "presenter" reduces to rendering the D-01 list.
- Reviewed todos (not folded): the six keyword-only matches the user declined in Phase 125 (IntelliJ interop initOptions key mismatch, peer-name escaping, Windows Node download progress, vscode-jsonrpc 9, lsp4j 1.0, vitest 5). None concerns DENUM.
- Not in this phase: re-pointing VS Code's `bbj.denumber` command at `bbj/denum`, the open-file prompt, deleting the bbjlst denumber path (127); the IntelliJ action, banner and diagnostics rendering (128).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEN-01 | `bbj/denum` returns the denumbered text as one edit for the open document, plus DENUM's diagnostics | `denum-command.ts` shape (Pattern 1), `BBjDenumService.denumDocument` core (Pattern 2), versioned `applyEdit` (Pattern 3), live peer behaviour (Live Probe), `minimalLineEdit` |
| DEN-03 | Unnumbered = "nothing to do"; success = short confirmation; failures use typed messages | Outcome-to-message table (Outcome Mapping), per-outcome peer evidence, no dedup |
| DEN-04 | DENUM diagnostics in an output list with a counts notification and "Show" | Two host-neutral notifications (Pattern 4), VS Code handler (Pattern 5), `ProgramDiagnostic` mapping |
| FMT-06 | Formatting a numbered file never DENUMs automatically; one deduplicated offer ("Denumber" / "Denumber and Format") or selection explanation | Exact `denum-needed` seam in `bbj-format-service.ts` (Pattern 6), existing ledger dedup, multi-action prompt helper |
| FMT-07 | "Denumber and Format" is one undoable step (`allowDenum`) | `formatProgram` with `allowDenum: true`, 25 s deadline already wired, one `minimalLineEdit` edit, live evidence |
</phase_requirements>

## Summary

Phase 124 and 125 already deliver everything below the presentation layer. `JavaInteropService.denumProgram` and `formatProgram` return typed `ProgramOutcome`s over a dedicated lane that never touches the circuit breaker; the validated `DenumProgramResult` already carries sanitized, bounded diagnostics (at most 500, control characters stripped). The only 125 code the offer replaces is a single `case 'denum-needed'` in `BBjFormatService.reportFailure`. No change to any `java-interop*` or `java-program-guard.ts` file is needed. The work is: one new request module (`denum-command.ts`), one new orchestration service (`BBjDenumService`, registered under `compiler`), a small set of new connection-free senders in `bbj-notifications.ts`, two new host-neutral notification contracts, one VS Code handler plus a pure output formatter, and test updates.

Live evidence from :5008 (this session) settles the wire behaviour. `denumProgram` on a numbered program returns `denumbered: true` with labels (`0010 print 1` becomes `L10: print 1`); unnumbered or empty text returns `denumbered: false` and unchanged text; mixed numbering answers `-33008` with `data: {"line": n}`; a tokenized program answers `-33001` ("DENUM failed: input is a tokenized BBj program, not source text"), and `formatProgram` on tokenized input answers `-33009`, so the client must recognise tokenized input by the `<<bbj>>` prefix and never by error code. A DENUM syntax problem is reported as a successful answer with `diagnostics: [{line: 1, originalLineNumber: "0010", severity: "ERROR", message: "syntax error"}]`. Overlapping requests with the same `canonicalName` are superseded (`-32800`), but an absent `canonicalName` never is, so DENUM must omit `canonicalName`.

The two edit hosts differ in a way that shapes the stale-edit design. VS Code's language client rejects a `workspace/applyEdit` whose versioned identifier does not match its open document and answers `{ applied: false }`. LSP4IJ 0.21.0 never reads the version at all: `LSPIJUtils.applyWorkspaceEdit` uses only the document URI and the edits, runs inside `WriteCommandAction.runWriteCommandAction` (one undo step) and `LanguageClientImpl.applyEdit` always answers `applied: true`. So the server's own version re-check immediately before `applyEdit` is the only stale guard on IntelliJ, and on VS Code the `applied: false` answer is a second guard that must be turned into the "file changed" warning.

**Primary recommendation:** Add `BBjDenumService` (sibling of `BBjFormatService`, own file, own messenger interface so `FormatMessenger` and its test stubs stay untouched) with one `run()` core that both the offer click and `bbj/denum` call; replace the `denum-needed` notice with a call into it from the existing dedup ledger; apply the edit via `connection.workspace.applyEdit` with an `OptionalVersionedTextDocumentIdentifier`; send two notifications (`bbj/denumDiagnostics` with the list, `bbj/showDenumDiagnostics` on Show); omit `canonicalName`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Decide numbered/unnumbered/mixed/tokenized | bbj-ls (Java peer) | Language server (prefix pre-check for tokenized only) | Peer owns `LineNumbering`; the client heuristic and the server's disagree on mixed files (Pitfall 12), so the server never pre-classifies numbering |
| DENUM execution | bbj-ls `denumProgram` / `formatProgram(allowDenum)` | — | Wire contract, BBj 26.03+ only |
| Orchestration (capture version, call, stale check, apply, message) | Language server (`BBjDenumService`) | — | One implementation for both IDEs; clients word nothing |
| Edit application | IDE (via server-initiated `workspace/applyEdit`) | Language server (stale guard) | One undo step and dirty buffer are editor behaviours; the server sends the request |
| Outcome wording / severity | Language server | — | Locked: clients present nothing |
| Offer prompt (Denumber / Denumber and Format) | Language server (`window/showMessageRequest`) | IDE renders the toast | Same mechanism as 125 invalid-settings prompt |
| Diagnostics list rendering | VS Code client (output channel) now, IntelliJ client in 128 | Language server (payload) | Host-neutral notification; each host owns its list UI |
| Reveal list on Show | VS Code client (`outputChannel.show`) | Language server (sends `bbj/showDenumDiagnostics`) | The server cannot show an output channel |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vscode-languageserver | 10.0.1 [VERIFIED: bbj-vscode/node_modules/vscode-languageserver/package.json] | `connection.workspace.applyEdit`, `window.showInformationMessage/showWarningMessage` with actions, `sendNotification`, `onRequest` | Already the server transport; `applyEdit(paramOrEdit: ApplyWorkspaceEditParams \| WorkspaceEdit): Promise<ApplyWorkspaceEditResponse>` is at `lib/common/server.d.ts:283` |
| vscode-languageclient | 10.1.2 [VERIFIED: bbj-vscode/node_modules/vscode-languageclient/package.json] | VS Code side: `client.onNotification`, validates the versioned edit | Already used for the 125 settings link |
| langium | 4.3.1 [VERIFIED: bbj-vscode/node_modules/langium/package.json] | `TextDocuments` open-document store, DI for the new service | Existing |
| vitest | ^4.1.10 [VERIFIED: bbj-vscode/package.json `"vitest": "^4.1.10"`] | Tests | Existing |

### Supporting
No new runtime dependency. `minimalLineEdit` (`bbj-format-edit.ts`), `FormatterSettingsHolder`/`settingsSnapshot()`, `invalidSettingsMessage`, `mixedNumberingMessage`, `GO_TO_LINE_ACTION`, `OPEN_SETTINGS_ACTION` and the FORMAT_* message constants are reused in-repo.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `bbj/denum` custom request | `workspace/executeCommand` | Rejected in milestone research (ARCHITECTURE §5): zero use in repo, adds a capability and command registry, id collision with `bbj.denumber`, LSP4IJ has no menu entry for arbitrary commands. Locked by CONTEXT. |
| Sibling `BBjDenumService` | `denumDocument()` method inside `BBjFormatService` | Format service is already ~400 lines with private ledger and `FormatMessenger`. Growing `FormatMessenger` breaks the stubs in `bbj-format-notices.test.ts` (`satisfies FormatMessenger`) and `program-live.test.ts` (`recordingMessenger`). A sibling keeps those untouched. |
| Two notifications (list, then reveal) | One notification with a `reveal` flag | A single flag cannot express "write now, reveal only if the user clicks Show later". Two small methods are cheaper than server-side state. |

**Installation:** none. **Version verification:** versions above read from installed `package.json` files this session. **Package legitimacy:** no external package is added in this phase.

## Package Legitimacy Audit

No external packages are installed or recommended by this phase. The seam `package-legitimacy check` was therefore not invoked.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| (none) | — | — | — | — | — | — |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Format Document / format-on-save / Format Selection            bbj/denum {uri}   (127 command, 128 action)
        |  textDocument/formatting | rangeFormatting                    |
        v                                                                v
bbj-formatting-handler.ts (open buffer only, languageId 'bbj')   denum-command.ts  createDenumHandler(deps)
        v                                                                |  TextDocuments lookup + language gate
BBjFormatService.format -> formatProgram(allowDenum absent)              |
        |  outcome failed/denum-needed (-33006)                          |
        v                                                                |
  ledger notice 'denum-needed' | doc@version  (shown once)               |
        |  show(): BBjDenumService.offer(request)                        |
        v  returns [] to the format caller immediately                   |
  window/showMessageRequest  [Denumber] [Denumber and Format]            |
        |  (fire and forget; click may come much later)                  |
        +--------------------- click --------------------+               |
                                                         v               v
                            BBjDenumService.run({ current, mode: 'denum' | 'denum-and-format' }, token)
                              1 live = current(); capture version + text primitives
                              2 text starts with '<<bbj>>' -> tokenized message, stop
                              3 in-flight guard per uri
                              4 javaInterop.denumProgram({text, version})            (15 s, lane)
                                 or formatProgram({text, version, settings, allowDenum:true}) (25 s, lane)
                              5 token cancelled -> silent
                              6 current().version !== captured -> stale warning, stop
                              7 ok + denumbered:false -> "nothing to do" (Information)
                              8 ok + denumbered:true -> minimalLineEdit -> workspace/applyEdit (versioned)
                                   applied:false / rejected -> "file changed / not applied" warning
                              9 applied -> bbj/denumDiagnostics (only if diagnostics > 0)
                                           + ONE message: confirmation [+ counts + Show]
                                 Show click -> bbj/showDenumDiagnostics
                              failures -> ONE Warning from the outcome table (never deduplicated)
                                    |
                                    v
                      DenumResult {status, reason?, message?, line?, version?, edits?, diagnostics?, applied?}
VS Code extension.ts: onNotification('bbj/denumDiagnostics') -> 'BBj' channel (appendLine block)
                      onNotification('bbj/showDenumDiagnostics') -> outputChannel.show(true)
IntelliJ: unhandled in 126 (unreachable: formatting switch is off); handlers arrive in 128
```

### Recommended Project Structure
```
bbj-vscode/src/language/
├── denum-command.ts              # NEW  bbj/denum request: method const, DTOs, createDenumHandler, registerDenumRequest
├── denum-notifications.ts        # NEW  two method constants + payload types (mirrors format-settings-notification.ts)
├── bbj-denum-service.ts          # NEW  BBjDenumService: run(), offer(), outcome mapping, messenger interface
├── bbj-notifications.ts          # EDIT add neutral senders: multi-action prompt, Information prompt, applyEdit, two notifies
├── bbj-format-service.ts         # EDIT 'denum-needed' case -> offer; drop FORMAT_DENUM_NEEDED_MESSAGE
├── bbj-module.ts                 # EDIT BBjAddedServices.compiler.BBjDenumService + module entry
└── main.ts                       # EDIT registerDenumRequest next to registerCompileRequest
bbj-vscode/src/
├── denum-diagnostics-output.ts   # NEW  pure formatter: payload -> output lines (unit-testable, no vscode import)
└── extension.ts                  # EDIT registerDenumDiagnosticsOutput beside registerFormatterSettingsLink
```

### Pattern 1: `denum-command.ts` copies `compile-command.ts`
**What:** constant method name, plain-JSON DTOs, closed `reason` union, `createXHandler(deps)` returning an async function, `registerXRequest(connection: Pick<Connection,'onRequest'>, deps)`. Source of truth quoted verbatim from `compile-command.ts`:
`export const COMPILE_REQUEST_METHOD = 'bbj/compile';` (line 35),
`export function registerCompileRequest(connection: Pick<Connection, 'onRequest'>, deps: CompileRequestDeps): void {` / `connection.onRequest(COMPILE_REQUEST_METHOD, createCompileHandler(deps));` (lines 148-149).
`main.ts` registers it as `registerCompileRequest(connection, { cplService: ..., wsManager: ... });` (lines 73-76) before `startLanguageServer(shared)` (line 101); `bbj/denum` needs `shared.workspace.TextDocuments`, which exists after `createBBjServices`, so register it at the same place.
**Skeleton** (names are recommendations; the vocabulary extends ARCHITECTURE §5):
```typescript
// Source: shape of bbj-vscode/src/language/compile-command.ts
import type { Connection, Diagnostic, TextEdit } from 'vscode-languageserver';

export const DENUM_REQUEST_METHOD = 'bbj/denum';

export interface DenumParams { uri: string }

export type DenumStatus = 'denumbered' | 'not-line-numbered' | 'failed';

/** Closed vocabulary: adding a value is safe, renaming one is not (IntelliJ matches on it in 128). */
export type DenumFailureReason =
    | 'invalid-params' | 'not-open' | 'tokenized' | 'protected-program' | 'mixed-numbering'
    | 'too-large' | 'timeout' | 'denum-failed' | 'service-unavailable' | 'requires-bbj-26-03'
    | 'not-reachable' | 'stale' | 'not-applied' | 'in-progress' | 'cancelled' | 'invalid-settings';

export interface DenumResult {
    status: DenumStatus;
    reason?: DenumFailureReason;
    message?: string;          // the sentence the server showed; informational only
    line?: number;             // mixed-numbering: 0-based, like LSP positions
    version?: number;          // document version the edit was computed against
    edits?: TextEdit[];        // exactly one whole-document replace when status === 'denumbered'
    diagnostics?: DenumDiagnosticDto[];
    applied?: boolean;         // whether the client accepted the server-initiated edit
}
```
The handler validates `params?.uri` is a string (return `reason: 'invalid-params'` rather than throwing), resolves the open `BBj` document from `TextDocuments` only (never from disk), and delegates to the service. **`bbj/denum` handlers must not throw**: a thrown error becomes a JSON-RPC failure the IDE would word itself, contradicting "the server presents every outcome".

### Pattern 2: one orchestration core, two entry points
**What:** `BBjDenumService.run(request, mode, token)`. The offer click builds `request` from the stored `BBjFormatRequest.current`; `bbj/denum` builds it from `TextDocuments`. Mirror the 125 structure: a request carrying `document` and `current()`; primitives captured before the await.
**Why a sibling service:** see Alternatives. Resolve cross-service references lazily inside methods, not constructors (the `BBjFormatter` precedent: "Resolved here, not in the constructor, so building this slot does not depend on the order in which the services are created"): `BBjDenumService` reads `services.compiler.BBjFormatService.settingsSnapshot()` at call time; `BBjFormatService` reaches `services.compiler.BBjDenumService` at offer time. The `BBjFormatServiceContext` interface there is deliberately structural; add an optional `compiler?: { BBjDenumService: ... }` slice or pass a late-bound `setDenumOffer(fn)` seam (the `setMessenger` precedent).
**Mutation hazard:** `TextDocuments` updates the document object **in place** (`vscode-languageserver-textdocument` `update(document, changes, version)` calls `document.update(changes, version)`, `lib/umd/main.js:227-229`). Never keep the `TextDocument` as a snapshot across the await. Capture `version` and `getText()` primitives first, and call `minimalLineEdit` only after confirming `current().version === captured version`.

### Pattern 3: versioned server-initiated edit
```typescript
// Source: vscode-languageserver 10.0.1 server.d.ts:283 (applyEdit signature); LSP spec TextDocumentEdit
import { OptionalVersionedTextDocumentIdentifier, TextDocumentEdit } from 'vscode-languageserver';

const edit = {
    documentChanges: [
        TextDocumentEdit.create(OptionalVersionedTextDocumentIdentifier.create(uri, version), edits)
    ]
};
const response = await connection.workspace.applyEdit({ label: 'Denumber', edit });
if (!response.applied) { /* warn: file changed, nothing was changed */ }
```
Use `documentChanges` (not `changes`): VS Code's version check only inspects `documentChanges` entries.
**Client behaviour on mismatch (verified):**
- VS Code `vscode-languageclient` 10.1.2: `doHandleApplyWorkspaceEdit` calls `validateWorkspaceEdit`, which for a `TextDocumentEdit` with non-null version `>= 0` compares against the open `textDocument.version` and `return false`; the handler then does `return Promise.resolve({ applied: false });` (`lib/common/client.js:1790-1793`, `1796-1810`). Not an error, not applied.
- LSP4IJ 0.21.0 (bytecode, `lsp4ij-0.21.0.jar`): `LanguageClientImpl.applyEdit` runs `LSPIJUtils.applyWorkspaceEdit(edit)` inside `WriteCommandAction.runWriteCommandAction(project, ...)` and then completes with `new ApplyWorkspaceEditResponse(true)` unconditionally; `LSPIJUtils.applyWorkspaceEdit` reads `TextDocumentEdit.getTextDocument().getUri()` and `getEdits()`, never `getVersion()` (no `getVersion` reference appears in the class). So on IntelliJ a version mismatch is silently applied and always answers `applied: true`. The server-side check before sending is the only guard there. LSP4IJ also advertises `setApplyEdit(TRUE)` and `WorkspaceEditCapabilities.setDocumentChanges(TRUE)` (`ClientCapabilitiesFactory`), and edits go through range markers in a single write command, so one `TextEdit` is one undo step.
**Detecting "buffer changed during the call" (D-07):** after the await, `shared.workspace.TextDocuments.get(uri)?.version !== capturedVersion` (or undefined) means drop the result and warn. This is the same shape as the 125 `format()` re-check. There is no await between that check and sending `applyEdit`, so the window left is the network round trip (VS Code closes it with `applied: false`; IntelliJ cannot).

### Pattern 4: two host-neutral notifications (D-01, D-02)
Mirror `format-settings-notification.ts` (method-name constant, plain payload type, no Langium or editor imports):
```typescript
export const DENUM_DIAGNOSTICS_METHOD = 'bbj/denumDiagnostics';
export const SHOW_DENUM_DIAGNOSTICS_METHOD = 'bbj/showDenumDiagnostics';

export interface DenumDiagnosticDto {
    line: number;               // 1-based in the denumbered text the buffer now holds; 0 = no location
    originalLineNumber: string; // as written in the original source, '' when unknown
    severity: 'ERROR' | 'WARNING' | 'INFO';
    message: string;            // already sanitized and bounded by the Phase 124 guard
}
export interface DenumDiagnosticsParams {
    uri: string;                // for the header only; hosts must not open or execute it
    diagnostics: DenumDiagnosticDto[];
}
```
Keep `severity` as the peer's own tokens (`ProgramSeverity = 'ERROR' | 'WARNING' | 'INFO'`, `java-interop-program-types.ts:35`) and `line` unchanged from `ProgramDiagnostic`: that is the existing validated shape, it is flat (Gson-friendly for 128), and no mapping can drift. Send `bbj/denumDiagnostics` only on success with `diagnostics.length > 0`, **after** the edit was applied (the lines describe the text after the edit; Pitfall 6). `bbj/showDenumDiagnostics` carries no payload (or only `uri`) and is sent when the user picks Show; hosts must ignore any payload as 125's open-settings handler does. Both senders are connection-free in `bbj-notifications.ts` (`try`/`catch`, `void Promise.resolve(pending).catch(...)`), exactly like `notifyOpenFormatterSettings` (`bbj-notifications.ts:130-137`).

### Pattern 5: VS Code client handler + pure formatter
Beside `registerFormatterSettingsLink` (`extension.ts:610-617`, called at `extension.ts:493`) add `registerDenumDiagnosticsOutput(context, { client, outputChannel })`. The channel is created at `extension.ts:477` (`outputChannel = vscode.window.createOutputChannel('BBj', { log: true });`), before `startLanguageClient`, and the module already has `appendOutputLine` (defensive `try`/`catch` write). Handler 1 renders `params` into lines with a pure function in `src/denum-diagnostics-output.ts` (header naming the file, then one line per entry: line, original line number, severity, message; `line 0` printed as "no location") and writes each via `appendOutputLine`; handler 2 calls `outputChannel.show(true)` (preserve focus). Neither handler reads anything from the payload that becomes a command, path to open, or document location. Use `appendLine` (raw, unfiltered), not `outputChannel.info/warn/error`: log-level methods add timestamps and are subject to the Output panel's level filter, so an ERROR list could be hidden.

### Pattern 6: the exact seam in the format service (FMT-06)
Today (`bbj-format-service.ts:354-356`):
```
            case 'denum-needed':
                this.contentNotice('denum-needed', documentScope, described, FORMAT_DENUM_NEEDED_MESSAGE);
                return;
```
`reportFailure(failure, code, generation, documentScope)` has no access to the request; widen it (or move the case into `report()`, which already receives `request`) so the offer gets `request.range` (selection vs document) and `request.current`. Replace the body with a `this.notice('denum-needed' or 'denum-needed-selection', documentScope, <log line>, () => denumOffer(request))`. The ledger (`notice()`, `bbj-format-service.ts:384-403`) already gives per document + version dedup, a 256-entry bound, warn-then-debug logging, and `try`/`catch` around `show`. `format()` has already returned (or is about to return) `[]`; the offer is fire-and-forget, so the formatting response never waits. Delete `FORMAT_DENUM_NEEDED_MESSAGE` (exported at `:51`, imported by `bbj-format-notices.test.ts`) and rewrite the three test references.

**Offer prompt:** `showFormatterWarningWithAction` (`bbj-notifications.ts:91-105`) accepts exactly one action title. Add a neutral multi-action helper (`connection.window.showWarningMessage(text, ...titles.map(title => ({ title })))` returning the picked title). `showWarningMessage<T extends MessageActionItem>(message: string, ...actions: T[]): Promise<T | undefined>` is declared at `server.d.ts:141`; the Information equivalent at `:151`. The default implementation must never reject (copy the `try`/`catch` in the existing helper).

### Anti-Patterns to Avoid
- **Writing the file or calling `fs.*` anywhere in the DENUM path.** Buffer-only; leave it dirty.
- **Using `wholeDocumentChangeAsRange` for the edit.** CONTEXT D-15 names it "as formatting uses", but formatting does not use it: `bbj-kept-check.ts:160` defines `wholeDocumentChangeAsRange(oldText, newText): RangedContentChange`, a change-record helper for the kept-error check, not a `TextEdit` builder. Formatting uses `minimalLineEdit(document, 0, sent.length, outcome.result.text)` (`bbj-format-service.ts:252`, defined at `bbj-format-edit.ts:46`). Use `minimalLineEdit`; it returns `[]` when texts are equal, trims common leading and trailing lines keeping terminators, and builds positions with `document.positionAt`, which clamps to the real last line.
- **Sending `canonicalName` for DENUM or for "Denumber and Format".** The same `canonicalName` supersedes the older request with `-32800` (measured below), which the lane reports as `cancelled`, and a silently cancelled explicit run breaks "every run ends in one message". Omit it.
- **Detecting tokenized input from the error code.** `-33001` also means any other DENUM failure and `-33009` any formatter failure; use the `<<bbj>>` prefix check before sending (case-sensitive, at offset 0; both measured below).
- **Throwing from the service or the `bbj/denum` handler.** Wrap the whole run: an unexpected exception must still produce one Warning (125's `format()` swallows silently, which is right for formatting and wrong here).
- **Routing explicit DENUM messages through the 125 `notice()` ledger.** It dedups; D-12 forbids that for explicit runs. Only the offer goes through the ledger.
- **Planning identifiers (`D-xx`, plan or requirement ids) in source or test comments.** Executors repeatedly did this; it is checked before push (project memory).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Whole-document replace as a TextEdit | A new diff or a single full-range edit | `minimalLineEdit` (`bbj-format-edit.ts:46`) | Keeps cursor/folding/undo granularity, `[]` on equal text, UTF-16 safe, clamped |
| Dedup of the offer | A second ledger | The `notice()` ledger in `BBjFormatService` | Already per kind + document + version, bounded, logs at warn then debug |
| Interop error classification | Parsing JSON-RPC codes again | `ProgramOutcome` from `denumProgram`/`formatProgram` | Phase 124 owns the table and latches |
| Sanitizing peer text / diagnostics | A second sanitizer | The guard already applied (`sanitizeProgramDiagnostics`: at most 500 entries, messages bounded, control characters stripped) | The validated result is already safe to show |
| Mixed-numbering and invalid-settings wording | New strings | `mixedNumberingMessage`, `GO_TO_LINE_ACTION`, `invalidSettingsMessage`, `OPEN_SETTINGS_ACTION`, existing `FORMAT_*` constants | D-09/D-11 reuse them verbatim |
| Version-stale protection | A custom version protocol | Capture `document.version`, re-read `TextDocuments`, send a versioned `TextDocumentEdit` | VS Code enforces it; the echo check is already in `validateDenumResult` |

**Key insight:** the phase adds no new capability below the presentation layer; any code that touches sockets, JSON-RPC codes or text diffing is a sign something already built is being re-built.

## Runtime State Inventory

Not a rename/refactor/migration phase. Omitted per instructions. (The only retired string is the exported constant `FORMAT_DENUM_NEEDED_MESSAGE` and its text "This file has line numbers. Run Denumber BBj Program first, then format.", referenced in `bbj-format-service.ts` and three places in `test/bbj-format-notices.test.ts`; no stored data, service config, OS state or secrets carry it. `documentation/docs` and `QA/` contained no reference when searched.)

## Live Probe: what :5008 actually answers (measured 2026-10-02, bbj-ls shipped with the dev container's BBj)

All cases sent over a raw JSON-RPC connection to 127.0.0.1:5008 from `/tmp/.../scratchpad/probe*.cjs` (throwaway scripts, not in the repo). Latency about 85 ms warm; a 9,999-line numbered program 336 ms.

| Input | Method | Answer |
|-------|--------|--------|
| `0010 print 1\n0020 goto 0010\n` | `denumProgram` | `{"text":"L10: print 1\ngoto L10\n","diagnostics":[],"denumbered":true,"version":"p1"}` |
| same, CRLF | `denumProgram` | CRLF preserved (`"L10: print 1\r\ngoto L10\r\n"`), `denumbered: true` |
| no trailing newline | `denumProgram` | no trailing newline in the answer |
| `print 1\n` | `denumProgram` | `denumbered: false`, text unchanged |
| empty text | `denumProgram` | `{"text":"","diagnostics":[],"denumbered":false}` |
| `0010 print 1\nprint 2\n` | `denumProgram` | error `-33008`, message `mixed line numbering: line 2 has no line number`, `data: {"line":2}` |
| numbered, `0010 if then ...` | `denumProgram` | success, `diagnostics: [{"line":1,"originalLineNumber":"0010","severity":"ERROR","message":"syntax error"}]`, `denumbered: true` |
| `<<bbj>>\u0001\u0002garbage` and bare `<<bbj>>` | `denumProgram` | error `-33001`, message `DENUM failed: input is a tokenized BBj program, not source text` |
| `<<BBJ>>abc`, ` <<bbj>>abc` | `denumProgram` | NOT tokenized for the peer: `denumbered: false`, text unchanged (prefix is exact, lowercase, offset 0) |
| numbered, `allowDenum: true` | `formatProgram` | `{"text":"L10:\nprint 1\ngoto L10\n","diagnostics":[],"denumbered":true,...}` (denumbered and formatted in one answer) |
| numbered with syntax error, `allowDenum: true` | `formatProgram` | success; diagnostics remapped onto the formatted text (`line:1`, `originalLineNumber:"0010"`, ERROR) |
| mixed, `allowDenum: true` | `formatProgram` | `-33008`, `data: {"line":2}` |
| unnumbered, `allowDenum: true` | `formatProgram` | `denumbered: false`, formatted text |
| tokenized, `allowDenum: true` or not | `formatProgram` | `-33009`, `input is a tokenized BBj program, not source text` |
| numbered, `allowDenum` absent | `formatProgram` | `-33006` `DENUM needed: the source is a line-numbered program (first numbered line 1); DENUM it first or set allowDenum` |
| numbered range request, `allowDenum: true` | `formatProgram` | `-33006` `a range cannot be formatted in a line-numbered program` |
| `canonicalName: null` or absent | `denumProgram` | accepted |
| two concurrent `denumProgram`, `canonicalName` absent | — | both succeed |
| two concurrent `denumProgram`, same `canonicalName` | — | older answers `-32800` `a newer request for the same document superseded this one` |
| `denumProgram` + `formatProgram(allowDenum)` same `canonicalName` | — | both succeed (separate supersession keys) |

Not measurable here: a **protected program** (`-33005`; documented in bbj-ls README for `denumProgram`) and a WARNING/INFO diagnostic (only ERROR observed; the guard accepts all three). Blank lines between numbered lines denumber without error.

## Outcome Mapping (DEN-03, D-11, D-13)

Every row ends in exactly one message and is never passed through the dedup ledger. Texts marked "fixed" are locked by CONTEXT; the others are recommendations (plain text, each naming what to do; no markdown, because LSP4IJ renders balloons as plain text per Pitfall 22).

| Situation | Detected from | `status` / `reason` | Severity | Message (fixed / recommended) |
|-----------|---------------|---------------------|----------|-------------------------------|
| Unnumbered / nothing to do | `ok` with `denumbered: false` | `not-line-numbered` | Information | "This file has no line numbers. Nothing to denumber." |
| Success, no diagnostics | `ok`, `denumbered: true`, 0 diagnostics, edit applied | `denumbered` | Information | "Denumbered." |
| Success with diagnostics | same, > 0 | `denumbered` | Information, or Warning if any entry is `ERROR` (D-13) | "Denumbered. 2 errors, 1 warning." + action [Show] (counts exclude zero kinds) |
| Tokenized | `text.startsWith('<<bbj>>')` before sending | `failed` / `tokenized` | Warning | Points to Decompile, host-neutral, e.g. "This is a tokenized BBj program, not source. Decompile it first; DENUM works on source text." (IntelliJ has no Decompile action: `grep` of `bbj-intellij/src/main` for "decompile" found nothing; VS Code titles it "Decompile Tokenized BBj Program (Replace)", `package.json`) |
| Protected | `failed/protected-program` (`-33005`) | `failed` / `protected-program` | Warning | "This BBj program is protected and cannot be denumbered." (existing `FORMAT_PROTECTED_MESSAGE` says "formatted") |
| Mixed numbering | `mixed-numbering` outcome, `line` | `failed` / `mixed-numbering`, `line` | Warning | `mixedNumberingMessage(line)` + action `GO_TO_LINE_ACTION` -> `showDocument` (clamped, 1-based to 0-based, in the request's own document) |
| Too large | `failed/size-cap` (`-33003`) | `too-large` | Warning | "This file is too large to denumber. The file was not changed." |
| Timeout | `timeout` (client 15 s for `denumProgram`, 25 s for `formatProgram` with `allowDenum`; or peer) | `timeout` | Warning | "Denumbering timed out. The file was not changed; try again." |
| DENUM failed | `failed/parser-exception` (`-33001`), `failed/format-failed` (`-33009`), `malformed-result` | `denum-failed` | Warning | Fixed text, e.g. "Denumbering failed. The file was not changed. See the BBj output for details."; log the sanitized peer message at warn (see Open Question 4 for the charset hint) |
| DENUM service unavailable | `failed/service-unavailable` (`-33004`) | `service-unavailable` | Warning | "The BBj denumbering service is not available right now. The file was not changed; try again later." |
| Older BBj | `unavailable/method-not-found` | `requires-bbj-26-03` | Warning | **Fixed:** "Denumbering requires BBj 26.03 or later. The connected BBjServices does not provide it." |
| Not connected | `unavailable/not-reachable`, `failed/transport` | `not-reachable` | Warning | "BBjServices is not reachable. The file was not changed." (shown, unlike formatting; never raises the breaker popup because the lane does not touch the breaker, `java-interop-program-lane.ts` header) |
| Invalid settings (Denumber and Format only) | `invalid-settings` | `invalid-settings` | Warning | `invalidSettingsMessage(...)` + `OPEN_SETTINGS_ACTION` -> `notifyOpenFormatterSettings({ keys })` (reuse the 125 behaviour) |
| `invalid-params` (`-32602`) | `failed/invalid-params` | `denum-failed` | Warning | Same fixed text as DENUM failed; detail to log |
| Buffer changed / closed during the run | version re-check, `applied: false` | `stale` / `not-applied` | Warning | "The file changed while denumbering. Nothing was changed; run Denumber again." |
| Document not open / not BBj (`bbj/denum` only) | `TextDocuments` + `languageId` | `not-open` | Warning | "Open the BBj file first; denumbering works on the open editor text." |
| Run already in flight for the uri | in-flight map | `in-progress` | Warning | "Denumbering is already running for this file." |
| Caller cancelled | `cancelled` outcome | `cancelled` | none (log debug) | no message: the caller asked for it (see Open Question 3) |
| Unexpected exception | `catch` | `denum-failed` | Warning | Same fixed text as DENUM failed |

Severity helper for counts: count `ERROR`, `WARNING`, `INFO` from the validated list; omit zero kinds; singular/plural ("1 error", "2 errors").

## Common Pitfalls

### Pitfall 1: IntelliJ ignores the edit version
**What goes wrong:** the planner relies on `applied: false` to catch a stale edit; LSP4IJ 0.21.0 always answers `applied: true` and never reads the version.
**How to avoid:** do the server-side re-check immediately before `applyEdit` and keep it as the primary guard; treat `applied: false` as the VS Code-side second guard.
**Warning signs:** a test that only exercises `applied: false`.

### Pitfall 2: a held `TextDocument` is not a snapshot
**What goes wrong:** `TextDocuments` mutates the same object on `didChange` (verified), so `minimalLineEdit(request.document, ...)` after the await can diff against newer text.
**How to avoid:** capture `version` and text primitives first; compute the edit only after `live.version === version`; compute the edit range from the captured text length, not `live.getText().length`.

### Pitfall 3: silent supersession of an explicit run
**What goes wrong:** passing `canonicalName` makes a second DENUM or "Denumber and Format" for the same file supersede the first; the first yields `cancelled`, so no message, violating "exactly one message per run".
**How to avoid:** omit `canonicalName` (measured: absent never supersedes) and add an in-flight guard per uri in the service (`in-progress` reason); never rely on the peer to order overlapping runs.

### Pitfall 4: the offer's ledger swallows a second explicit Format Document
**What goes wrong:** dedup is per document + version (locked by 125 D-02 and 126 D-08). If the user dismisses the offer and runs Format Document again without editing, nothing happens and nothing is shown (debug log only). That is the locked behaviour but surprising in UAT.
**How to avoid:** do not "fix" it in code (it would reopen a locked decision); log at debug, and call it out in the UAT checklist so the hand check does not report it as a bug. Use separate ledger kinds for the Format Selection explanation and the Format Document offer so one does not suppress the other at the same version (Open Question 2).

### Pitfall 5: tokenized detection by code
See Anti-Patterns. Also: the prefix check must run before the in-flight guard and before any network call so a tokenized buffer never leaves the server.

### Pitfall 6: the DENUM diagnostics describe the text after the edit
**What goes wrong:** sending `bbj/denumDiagnostics` before the edit is applied (or when the edit was refused) shows lines that match no text.
**How to avoid:** send the list only after `applied === true` and never on failure (D-04). If the user keeps typing, the list becomes stale; the header names the file and the run so a later list is distinguishable.

### Pitfall 7: growing `FormatMessenger`
**What goes wrong:** `installRecordingMessenger` uses `satisfies FormatMessenger` and `program-live.test.ts` returns `FormatMessenger` from `recordingMessenger`; a new required member fails `npm run typecheck:test` in CI.
**How to avoid:** put offer and outcome presentation behind a separate `DenumMessenger` interface owned by the new service.

### Pitfall 8: activation-sequence pins
`test/activation-command-coverage.test.ts` pins `EXPECTED_SEQUENCE` and `EXPECTED_SUBSCRIPTIONS_LENGTH = 32` (line 279; 32 at the time of reading). Two new `client.onNotification` registrations add two `notification:...` entries to the literal and move the length to 34 (each `onNotification` result is pushed into `context.subscriptions`, as `registerFormatterSettingsLink` does). The `createOutputChannel` mocks in both activation suites return `{ appendLine, dispose }` only (no `show`): the Show handler test must supply its own channel mock with `show`.

### Pitfall 9: IntelliJ EDT (for Phase 128, record now)
LSP4IJ's `applyEdit` takes the write action on the EDT. A future IntelliJ action that blocks the EDT on the `bbj/denum` future would deadlock against its own `applyEdit`. Record in the 126 summary so 128 sends the request off the EDT. `[ASSUMED]` that `runWriteCommandAction` from a non-EDT thread waits for the EDT (standard IntelliJ behaviour; not run here).

### Pitfall 10: process hygiene (project memory)
Executors put plan/D-xx ids in comments; planners write `--reporter=basic` (not in vitest 4.1.10) and HTML-escape `&&` inside `<automated>`; run vitest only from `bbj-vscode` cwd; never use `git stash`; shell commands use absolute paths and no `cd ... && grep`; whole-suite "failed suites" with `numFailedTests: 0` are `initializeWorkspace` timeouts under contention (use `--maxWorkers=2`).

## Code Examples

### The core run (sketch; values quoted from the in-repo definitions read this session)
```typescript
// Source: bbj-format-service.ts format() (version re-check), java-interop-program-types.ts DenumProgramParams
import { TextDocumentEdit, OptionalVersionedTextDocumentIdentifier } from 'vscode-languageserver';
import { minimalLineEdit } from './bbj-format-edit.js';
import { TOKENIZED_PROGRAM_PREFIX } from './bbj-format-service.js';

async run(request: DenumRequest, mode: 'denum' | 'denum-and-format', token: CancellationToken): Promise<DenumResult> {
    try {
        const doc = request.current();
        if (doc === undefined || doc.languageId !== 'bbj') { return this.fail('not-open'); }
        const version = doc.version;
        const sent = doc.getText();
        if (sent.startsWith(TOKENIZED_PROGRAM_PREFIX)) { return this.fail('tokenized'); }
        // no canonicalName: an absent name is never superseded by, and never supersedes, another run
        const outcome = mode === 'denum'
            ? await this.javaInterop.denumProgram({ text: sent, version: String(version) }, token)
            : await this.javaInterop.formatProgram({
                text: sent, version: String(version), settings: this.formatSettings(), allowDenum: true }, token);
        if (token.isCancellationRequested || outcome.kind === 'cancelled') { return this.cancelled(); }
        const live = request.current();
        if (live === undefined || live.version !== version) { return this.fail('stale'); }
        // ... outcome.kind === 'ok': result.text (DenumProgramResult) or result.scope === 'document' (DocumentFormatResult)
        const edits = minimalLineEdit(live, 0, sent.length, newText);
        const applied = await this.messenger.applyEdit(doc.uri, version, edits, label);
        // applied false -> fail('not-applied'); else diagnostics notification + ONE message
    } catch {
        return this.fail('denum-failed');
    }
}
```
`formatProgram` with `allowDenum: true` returns `scope: 'document'` for a whole-document request (no `range`), so `result.text` exists; narrow on `result.scope === 'document'` (`DocumentFormatResult`).

### Offer from the ledger
```typescript
// Source: bbj-format-service.ts notice() / contentNotice()
case 'denum-needed':
    this.notice(request.range === undefined ? 'denum-needed' : 'denum-needed-selection', documentScope,
        `Format notice: denum-needed (${described})`,
        () => this.denum.offer({ document: request.document, current: request.current, selectionOnly: request.range !== undefined }));
    return;
```
`offer()` shows the prompt (two actions for a document, one for a selection) without awaiting it and, on a pick, calls `run(...)` with `mode: 'denum'` or `'denum-and-format'`, reading `request.current()` at click time.

### VS Code handlers
```typescript
// Source: extension.ts registerFormatterSettingsLink (lines 610-617)
function registerDenumDiagnosticsOutput(context: vscode.ExtensionContext, deps: { client: LanguageClient; outputChannel: vscode.LogOutputChannel }): void {
    const { client, outputChannel } = deps;
    context.subscriptions.push(
        client.onNotification(DENUM_DIAGNOSTICS_METHOD, (params: DenumDiagnosticsParams) => {
            for (const line of formatDenumDiagnosticsBlock(params)) { appendOutputLine(line); }
        }),
        client.onNotification(SHOW_DENUM_DIAGNOSTICS_METHOD, () => { outputChannel.show(true); })
    );
}
```
`formatDenumDiagnosticsBlock` must tolerate a malformed payload (non-array `diagnostics`, missing fields) without throwing; the 500-entry cap and message bounds are already applied server-side.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `bbj.denumber` runs `bbjlst` on the file on disk, `fs.rename`s the result, reopens | `bbj/denum` on the live buffer, versioned `applyEdit`, buffer left dirty | This milestone (v4.9); VS Code command re-point in 127 | No unsaved-edit loss, undo works; until 127 the command still runs the old path |
| 125 interim "Run Denumber BBj Program first" warning | Server-driven offer | This phase | Delete the constant and rewrite its tests |
| `formatProgram` without `allowDenum` on numbered input | `-33006` triggers an offer; explicit "Denumber and Format" sends `allowDenum: true` | This phase | Formatting never denumbers on its own (format-on-save safe) |

**Deprecated/outdated:** `FORMAT_DENUM_NEEDED_MESSAGE` (after this phase).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `-33005` is what a protected program yields from `denumProgram` (README-documented, not reproducible here because no protected program text was available) | Outcome Mapping | The message would fall into "DENUM failed" instead of "protected"; the mapping from `failed/protected-program` is already tested in Phase 124, so low risk |
| A2 | VS Code's Output panel turns `path:line` text in appended lines into clickable links, so entries may be written as `<fsPath>:<line>` | Pattern 5 | Cosmetic only; plain text still works |
| A3 | LSP4IJ sends `didChange` synchronously on document edits, so the server's version check sees user typing almost immediately | Pattern 3 | If debounced, the stale window on IntelliJ is wider than a round trip |
| A4 | `WriteCommandAction.runWriteCommandAction` called from a non-EDT thread waits for the EDT (so a blocked EDT would deadlock a 128 action) | Pitfall 9 | If it does not wait, the IntelliJ concern is moot; no 126 impact |
| A5 | VS Code keeps a notification that has action buttons visible until the user dismisses it (so a late click is realistic) | Pattern 6 / D-07 | If it auto-hides, late clicks are rarer; behaviour unchanged |

All other claims are tagged `[VERIFIED: ...]` or `[CITED: ...]` inline or rest on files read this session.

## Open Questions

1. **"Denumber and Format" on a file that turned out to have no line numbers (`denumbered: false`).**
   - What we know: the call still returns a formatted `text`; D-11 says an unnumbered file means "nothing to do"; D-09 says the edit applies as one undoable step.
   - What's unclear: whether to apply the format edit and what to say.
   - Recommendation: apply the formatted edit if it differs, and show the Information "no line numbers" message (one message per run holds). Mention it in the plan so the executor does not invent a second message.

2. **Separate ledger kinds for the selection explanation and the document offer.**
   - Recommendation: two kinds (`denum-needed`, `denum-needed-selection`), same `uri@version` scope, so a Format Selection explanation does not suppress the whole-document offer at the same version. Planner's call (Claude's discretion in CONTEXT).

3. **A caller-cancelled `bbj/denum` run shows nothing.**
   - Recommendation: return `reason: 'cancelled'`, log at debug, show no message (the caller cancelled). This is the one exception to "every run ends in one message"; state it in the plan.

4. **Charset hint for `-33001` (Pitfall 23 in milestone research).**
   - What we know: `-33001` also covers text BBj's charset cannot represent; a tokenized program is handled earlier by the prefix.
   - Recommendation: fixed "Denumbering failed" text plus log of the sanitized peer message; optionally append "If the file contains unusual characters, save it in a Latin-1 range first." The peer message is already sanitized and bounded, so showing it verbatim is also safe; planner chooses.

5. **Where the Show click's reveal state lives on IntelliJ (128).** Out of scope here; record that `bbj/showDenumDiagnostics` carries no payload so 128 maps it to "activate the console".

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | vitest, build | yes | v24.20.0 [VERIFIED: `node --version`] | Node 22 only needed for `langium:generate` (no grammar change here) |
| Live interop peer on :5008 (BBjServices, bbj-ls with `denumProgram`/`formatProgram`) | `test/functional/program-live.test.ts`, UAT | yes | answered `denumProgram` and `formatProgram` this session [VERIFIED: probe] | tests skip when unreachable (gate `RUN_BBJ_TESTS`) |
| `javap` (JDK) | inspecting LSP4IJ | yes | `/opt/java/default/bin/javap` [VERIFIED] | — |
| Gradle (IntelliJ `./gradlew test`) | `ComposerRequestContractTest` + LSP4IJ fence tests | not exercised this session | — | run at the phase gate: `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` |
| code-server ext test instance (VSIX hand check) | UAT | per project memory (`bbj-ext-install`, port 13338) [CITED: memory devcontainer-bbj-setup] | — | — |

**Missing dependencies with no fallback:** none.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.1.10 [VERIFIED: bbj-vscode/package.json]; TypeScript via `tsconfig.test.json`; ESLint |
| Config file | `/home/coder/repos/bbj-language-server/bbj-vscode/vitest.config.ts` (`include: ['test/**/*.test.ts']`) |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/denum-command.test.ts test/bbj-denum-service.test.ts test/bbj-format-notices.test.ts test/bbj-format-service.test.ts test/bbj-formatting-handler.test.ts test/denum-diagnostics-output.test.ts test/extension-activation.test.ts test/activation-command-coverage.test.ts test/notifications.test.ts && npm run typecheck:test` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2 && npm run lint && npm run typecheck:test && npm run build`; live: `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts --disable-console-intercept`; IntelliJ: `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` |

Judge the whole suite on `numFailedTests` (project standing decision): "failed suites" with 0 failed tests are `initializeWorkspace` hook timeouts under contention.

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEN-01 | `bbj/denum` handler: validates params, resolves open BBj doc only, returns `status`/`edits` (one `TextEdit` via `minimalLineEdit`)/`diagnostics`/`applied`; never throws | unit (stub deps) | `npx vitest run test/denum-command.test.ts` | Wave 0 |
| DEN-01 | Service applies a versioned `TextDocumentEdit` (`label`, `documentChanges[0].textDocument.version`) via `connection.workspace.applyEdit`; no edit when `denumbered: false`; stale version (edit during the call, close during the call, `applied:false`, rejected request) never applies and warns | unit (`createBBjTestServices` + `JavaInteropTestService` + fake connection with `workspace.applyEdit`) | `npx vitest run test/bbj-denum-service.test.ts` | Wave 0 |
| DEN-01 | Live: numbered/unnumbered/mixed/tokenized text through the production service on :5008 | live (gated) | `RUN_BBJ_TESTS=1 npx vitest run test/functional/program-live.test.ts --disable-console-intercept` | extend existing |
| DEN-03 | One message per outcome row (table above), correct severity, never deduplicated (run twice, two messages), tokenized prefix never sent to the peer, `-32601` text exact, not-reachable shown, cancelled silent | unit | `npx vitest run test/bbj-denum-service.test.ts` | Wave 0 |
| DEN-04 | `bbj/denumDiagnostics` sent only after a successful apply and only when diagnostics > 0; payload fields `line`/`originalLineNumber`/`severity`/`message` + `uri`; count message with Show only when > 0; Show click sends `bbj/showDenumDiagnostics`; nothing sent on failure | unit | `npx vitest run test/bbj-denum-service.test.ts` | Wave 0 |
| DEN-04 | Pure output formatter: header names file, one line per entry, `line 0` = no location, tolerates malformed payload | unit | `npx vitest run test/denum-diagnostics-output.test.ts` | Wave 0 |
| DEN-04 | Extension registers both handlers once, disposes them with the activation, Show calls `outputChannel.show`, list handler appends and never executes a command | unit (vscode mock) | `npx vitest run test/extension-activation.test.ts test/activation-command-coverage.test.ts` | update existing (sequence + length pins) |
| FMT-06 | `-33006` on whole-document format returns `[]` immediately, fires one prompt with two actions, deduplicated per doc + version (edit re-arms), never awaits the click; selection variant has one action and the explanation; format-on-save same | unit | `npx vitest run test/bbj-format-notices.test.ts test/bbj-format-service.test.ts` | update existing (3 references to `FORMAT_DENUM_NEEDED_MESSAGE`; the "every message is a Warning and nothing else" test) |
| FMT-07 | "Denumber and Format" sends one `formatProgram` with `allowDenum: true`, normalized settings snapshot, no `canonicalName`, one `TextEdit`; diagnostics follow DEN-04; format failures reuse 125 texts; late click acts on current text and version | unit | `npx vitest run test/bbj-denum-service.test.ts` | Wave 0 |
| (gate) | IntelliJ contract/fence suites unaffected by the new TS files | gradle | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test` | existing |

### Sampling Rate
- **Per task commit:** the relevant file(s) from the quick-run list plus `npm run typecheck:test`.
- **Per wave merge:** the quick-run command plus `npm run lint`.
- **Phase gate:** full suite (judged on `numFailedTests`), `npm run build`, the live file, `bbj-intellij ./gradlew test`, and the hand check from VSIX and IntelliJ zip built from the final tree after code-review fixes.

### Wave 0 Gaps
- [ ] `test/denum-command.test.ts`, `test/bbj-denum-service.test.ts`, `test/denum-diagnostics-output.test.ts` (new).
- [ ] `JavaInteropTestService.denumProgram` (`test/bbj-test-module.ts:230`) records no calls and ignores the token (only `formatProgramCalls` exists at `:201`): add `denumProgramCalls` (a `structuredClone` per call) and accept the cancellation token, mirroring `formatProgram`.
- [ ] A fake server connection exposing `workspace.applyEdit`, `window.showInformationMessage/showWarningMessage/showDocument` and `sendNotification`. `createFakeConnection` in `bbj-format-notices.test.ts:37-47` has the window half only; extract it to a shared helper (for example `test/fake-server-connection.ts`) rather than copying.
- [ ] Scripting a success with `denumbered: true` needs the answer's `version` to equal `String(document.version)` (see `double.scriptFormatProgram({ result: {..., version: '1' } })` at `bbj-format-service.test.ts:270`); a document opened at version 1 gives `'1'`. Build a small helper for the scripted DENUM answer.
- [ ] `test/extension-activation.test.ts` and `test/activation-command-coverage.test.ts`: two new notification handlers (sequence literal, subscription length 32 to 34), and an output-channel mock with `show`.
- [ ] `test/functional/program-live.test.ts`: DENUM cases through the production service (numbered, mixed with line, tokenized prefix, diagnostics); keep it behind the existing `RUN_BBJ_TESTS` gate and probe-skip.

## Security Domain

`security_enforcement` is not set to `false` in `.planning/config.json` (the key is absent), so this section applies.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | yes (what a request may touch) | `bbj/denum` resolves the document from `TextDocuments` only and requires `languageId === 'bbj'`; never reads a client-supplied uri from disk; config (`.bbx`) and non-BBj documents are refused |
| V5 Input Validation | yes | Validate `params.uri` is a string; reject the rest with `invalid-params`; peer answers already validated by `validateDenumResult`/`validateFormatResult` (version echo, size bound, diagnostics rebuilt field by field) |
| V6 Cryptography | no | — |
| V7 Error Handling and Logging | yes | Log lines carry fixed tokens only, never document text or peer text beyond the sanitized bounded peer message at warn; every path ends in one message |
| V8 Data Protection | yes | Document text leaves the process only to the configured :5008 interop peer, as for format and parse; never to logs |
| V13 API and Web Service | yes | Closed `reason` vocabulary; plain-JSON DTOs; the host-neutral notifications carry names and text for display only |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Peer text with control or bidi characters shown in a toast or the output channel | Spoofing / Tampering | Already stripped and bounded by `sanitizePeerText` in the guard; the VS Code writer only appends strings |
| Hostile notification payload turned into a command or opened path | Elevation of privilege | Handlers ignore payload fields for anything but display; `outputChannel.show(true)` takes no payload (same rule as the 125 settings link, whose test uses a hostile payload) |
| Edit applied to a different buffer version (lost user typing) | Tampering | Server version re-check + versioned `TextDocumentEdit` + `applied:false` handling; never apply across versions |
| Request spam / overlapping runs | Denial of service | Per-uri in-flight guard; lane client deadlines (15 s / 25 s) with cancel-always already in Phase 124; bbj-ls size cap |
| Large diagnostics list flooding the channel | Denial of service | Capped at 500 entries by the guard |

## Sources

### Primary (HIGH confidence)
- In-repo source read this session: `bbj-vscode/src/language/{bbj-format-service,bbj-formatter,bbj-formatting-handler,bbj-format-edit,format-settings-notification,bbj-notifications,compile-command,main,bbj-module,java-interop-program-types,java-interop-errors,java-interop-program-lane,java-program-guard}.ts`, `java-interop.ts:236-264`, `java-interop-connection.ts:465-488`, `extension.ts:1-75,455-520,595-630`.
- Tests read: `test/{bbj-format-notices,extension-activation,activation-command-coverage,bbj-test-module,notifications}.test.ts` (and `bbj-test-module.ts`), `test/functional/program-live.test.ts:1-135`.
- `node_modules/vscode-languageclient/lib/common/client.js:1763-1810` (applyEdit handling), `node_modules/vscode-languageserver/lib/common/server.d.ts` (applyEdit, message actions), `node_modules/vscode-languageserver-textdocument/lib/umd/main.js` (in-place update).
- LSP4IJ 0.21.0 bytecode (`javap -c` on `lsp4ij-0.21.0.jar`: `LanguageClientImpl.applyEdit`, `LSPIJUtils.applyWorkspaceEdit`/`applyEdits`, `ClientCapabilitiesFactory`), lsp4j jsonrpc 1.0.0 `GenericEndpoint` (INFO/WARNING log paths for unsupported notifications), `bbj-intellij/.../BbjLanguageClient.java` comment on unsupported-notification warnings, `ComposerRequestContractTest.java`.
- Live probes against 127.0.0.1:5008 (this session).
- `/home/coder/repos/bbj-ls/README.md` "JSON-RPC methods" (denumProgram, formatProgram, error codes, types).
- `.planning/phases/{124,125,126}-*/`, `.planning/research/{ARCHITECTURE §5-7, PITFALLS 6,9,10,11,12,22,23}.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`.

### Secondary (MEDIUM confidence)
- `.planning/phases/125-ls-formatting/125-02-SUMMARY.md` (LSP4IJ tolerates an unhandled notification; this session's bytecode check confirms the INFO/WARNING `java.util.logging` paths and the existing `BbjLanguageClient` comment).

### Tertiary (LOW confidence)
- Assumptions A2-A5 above.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH, no new dependency; versions read from installed packages.
- Architecture: HIGH, seams and call sites read line by line; edit-host behaviour confirmed from client source and jar bytecode.
- Pitfalls: HIGH for 1-8 (verified), MEDIUM for 9 (assumption A4).
- Wire behaviour: HIGH for everything probed; protected-program and non-ERROR severities are documented only.

**Research date:** 2026-10-02
**Valid until:** 2026-11-01 for repo seams (the formatting service is under active change); the peer behaviour is tied to the BBj install in this container.
