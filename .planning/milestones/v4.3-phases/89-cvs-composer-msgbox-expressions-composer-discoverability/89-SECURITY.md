---
phase: "89"
slug: "cvs-composer-msgbox-expressions-composer-discoverability"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-12"
---

# Phase 89 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| automated evidence → human UAT | Perceptual and rendering claims need human confirmation |
| built artifacts → human tester's IDEs | Stale or incomplete distributables would make the go/no-go meaningless |
| built AST → cue eligibility | The SETOPTS and CVS editable verdicts decide where cues appear |
| composer Apply → document | A compose-and-replace write overwrites the options expression |
| cue action → `ComposerLauncher` | A new entry point into write-capable composer flows, with an explicit position |
| cue click → composer panel → document | A second entry point into existing write-capable composer flows |
| cue click → composer panel or in-code command | Existing write-capable flows reached from a new entry point |
| cue click → config SETOPTS dialog | The existing guarded config composer is reached from a cue |
| cue command argument → VS Code `openComposerAt` | A uri/line/character pair arrives through a command invocation |
| decode result → stale-edit guard | Equality decides whether a write may proceed |
| decode result → webview | The original expression text is rendered inside a webview |
| dialog form → language server preview | Keystroke-driven preview requests |
| dialog OK → document write | Guarded replace or caret insert |
| document text → options recognizer | Arbitrary user-written expression text is classified |
| document update stream → Langium build | Non-BBj documents must not enter the parse/link/validate pipeline |
| existing document text → edit-in-place verdict | Arbitrary mask expressions are classified |
| extension host → document | A composed call is inserted or replaces an existing span |
| human decision → later plans | A recorded choice gates whether config files reach the server |
| IntelliJ intention search → `isAvailable` | Runs inside IntelliJ's single modal, EDT-blocking intention computation |
| IntelliJ LSP4IJ → language server | Config documents now cross under `bbx-config` |
| intention/action → `ComposerLauncher` | New doors into the write-capable CVS composer flow |
| language server JSON → lsp4j Gson → Java DTOs | Runtime deserialization of new result shapes |
| LSP4IJ command execution → plugin action | A server-supplied command id and JSON argument select and parameterize an action |
| LSP client → `textDocument/codeLens` handler | A client may wait on the reply; the document state may be unsettled |
| other LSP requests on config documents | Requests on a document Langium does not know |
| plugin → LSP4IJ vendor API | New coupling to `LSPCommandAction`, `LSPCommand`, `CommandExecutor` |
| server-provided banner/original text → Swing labels | Server strings rendered in the UI |
| source tree → installed artifacts | Evidence must come from what users install |
| user text fields → composed CVS() call | Free-text string and chars expressions end up in the document |
| VS Code client → language server | Config file text now crosses into the server process |
| webview → extension host | Form values arrive as untrusted `postMessage` payloads |

---

## Threat Register

Register authored at plan time (13/13 PLAN files carry a `<threat_model>`); verified at ASVS L1 grep depth against the implementation, the executed tests (Wave 7 gate: vitest 1704 tests with only the 12 known local-drift failures; Gradle 795 tests, 0 failures) and the recorded human decisions in 89-06-SUMMARY.md.

| Threat ID | Plan | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|------|----------|-----------|----------|-------------|------------|--------|
| T-89-01 | 89-01 | Denial of Service | `textDocument/codeLens` held open on an unsettled build | high | mitigate | Task 2 bounds the wait with `COMPOSER_CODE_LENS_BUDGET_MS`, gates at `DocumentState.Parsed`, and answers `null` on every failure path | closed |
| T-89-02 | 89-01 | Denial of Service | cue computation re-parsing or re-building per keystroke | medium | mitigate | The provider reads only `textDocument` text and the existing CST; Task 2's structural test pins zero parser/update/build calls across repeated requests | closed |
| T-89-03 | 89-01 | Tampering | a cue clicked after the document changed edits the wrong text | high | mitigate | `openComposerAt` re-decodes the call from the current line at click time, shows `LENS_TARGET_GONE_TEXT` when absent, and never opens compose-new or edits from a cue | closed |
| T-89-04 | 89-01 | Elevation of Privilege | a command argument uri causing an arbitrary document load | medium | mitigate | The dispatcher resolves the uri only against already-open `vscode.workspace.textDocuments`; the server handler uses `LangiumDocuments.getDocument` (in-memory), never `getOrCreateDocument` | closed |
| T-89-05 | 89-02 | Tampering | compose-and-replace silently discarding hand-written options logic | high | mitigate | `decodeMsgboxCall` returns `replace.originalOptions` plus `MSGBOX_REPLACE_BANNER_TEXT`; the panel shows both before Apply; message, title and trailing args are preserved verbatim | closed |
| T-89-06 | 89-02 | Spoofing | expression text injected as markup in the webview | medium | mitigate | The banner and original expression are set only through `textContent`, under the panel's existing nonce CSP; a test pins the `textContent` assignment | closed |
| T-89-07 | 89-02 | Tampering | a best-guess evaluation pre-filling wrong options | medium | mitigate | `parseMsgboxOptionsSum` accepts only digits and catalogued `BBjMsgBox` constants joined by `+`; every other shape is undecodable, pinned by negative test cases | closed |
| T-89-08 | 89-03 | Tampering | malformed string/chars text written verbatim into the document | medium | mitigate | `cvsPreview` validates the string and chars expressions with `validateStringField` and returns `valid`; every UI must gate insert/apply on it (plans 89-05, 89-08) | closed |
| T-89-09 | 89-03 | Tampering | a non-literal or undocumented mask pre-filled and rewritten, losing user logic or bits | medium | mitigate | `decodeCvsCall` marks such calls `editable: false` with a named reason; only integer-literal sums within 1..128 are editable; pinned by tests | closed |
| T-89-10 | 89-03 | Denial of Service | composed chars argument tripping a spurious arity warning on every composed line | low | mitigate | Both lib signature files are widened in the same task, with a validation test over composer output | closed |
| T-89-11 | 89-04 | Denial of Service | cue work running on LSP4IJ's background command thread, touching the editor and modal dialogs | high | mitigate | `getCommandPerformedThread()` returns `ActionUpdateThread.EDT`, pinned by the source guard | closed |
| T-89-12 | 89-04 | Tampering | a stale cue editing a line whose call changed | high | mitigate | `launchAt(..., fromCue=true)` bounds-checks the line, renders `staleDocument` on a not-found decode and never enters compose-new; edit paths keep `StaleEditGuard` | closed |
| T-89-13 | 89-04 | Spoofing | an unexpected cue kind opening the wrong composer | medium | mitigate | `ComposerLensKinds.launcherKindOf` maps exactly five strings; anything else renders a notice, pinned by a table test | closed |
| T-89-14 | 89-04 | Tampering | runtime LSP4IJ API skew breaking the action | medium | mitigate | Allowlist plus reflective canaries against the pinned 0.21.0 jar; the command argument is parsed through lsp4j Gson in a boundary test | closed |
| T-89-15 | 89-05 | Tampering | an invalid preview written into the document | medium | mitigate | The extension recomputes `cvsPreview` on `insert` and refuses when `!valid`; the webview button is also disabled | closed |
| T-89-16 | 89-05 | Tampering | an edit applied after the call text changed | medium | mitigate | `cvsCallStillMatches` compares the current span text to the captured `callText` immediately before the `WorkspaceEdit`; mismatch writes nothing | closed |
| T-89-17 | 89-05 | Spoofing | document-derived text injected as markup in the webview | medium | mitigate | Nonce CSP as in the existing panels; every user-derived value is assigned via `textContent`, pinned by a source assertion | closed |
| T-89-18 | 89-06 | Repudiation | a go/no-go claimed against a stale build | high | mitigate | Task 1 rebuilds and reinstalls, records the extension version and `installedTimestamp` and the `main.cjs` timestamp, and asserts the installed bundle over LSP before the checkpoint | closed |
| T-89-19 | 89-06 | Tampering | auto-mode silently reversing a pinned prior-phase invariant | high | mitigate | Task 3 is `gate="blocking-human"` and is never auto-selected; plans 89-11 and 89-12 carry a precondition on the recorded `Config routing decision: route` line | closed |
| T-89-20 | 89-06 | Repudiation | Code Vision assumed to work because the API is documented | medium | mitigate | Task 2 is `gate="blocking-human"` against a real IntelliJ build in the `sinceBuild` range, and records the build number; plan 89-12 checks the recorded GO line | closed |
| T-89-21 | 89-07 | Denial of Service | a new DTO failing at the lsp4j boundary and crashing the composer dialog | medium | mitigate | Every new DTO and optional-field omission is parsed through `MessageJsonHandler` in `ComposerModelsJsonBoundaryTest`; numeric fields stay within int range | closed |
| T-89-22 | 89-07 | Tampering | a stale-edit re-check ignoring a changed expression or mask | high | mitigate | `sameMsgbox` compares `replace`; `sameCvs` compares every decode field, order-sensitive, null-safe; pinned per field in `DecodeEqualityTest` | closed |
| T-89-23 | 89-07 | Tampering | request names drifting between TS and Java | medium | mitigate | `ComposerRequestContractTest` pins both new names as quoted literals, with a reflective derivation | closed |
| T-89-24 | 89-08 | Tampering | a CVS edit applied after the call changed | high | mitigate | `StaleEditGuard.applyIfUnchanged` with a re-issued `cvsDecodeCall` and `DecodeEquality::sameCvs`; the apply-guard source guard pins it | closed |
| T-89-25 | 89-08 | Tampering | an invalid or unavailable preview accepted with OK | medium | mitigate | OK is disabled before the first preview, in `scheduleRefresh`, and on unavailable previews; enabled only on `p.valid`; pinned by the refresh guard | closed |
| T-89-26 | 89-08 | Denial of Service | per-keystroke preview round trips from the new dialog | low | mitigate | `PreviewDebouncer` over `AlarmScheduler` (300 ms), with sequence-checked `ComposerFlow.observe`; the refresh guard lists the CVS dialog as debounced | closed |
| T-89-27 | 89-08 | Tampering | compose-and-replace hiding the discarded expression | high | mitigate | The MSGBOX dialog renders the server banner and the read-only original expression when `replace` is present; pinned by `ComposerReplaceBannerSourceGuardTest` | closed |
| T-89-28 | 89-09 | Tampering | a cue offered on a shape its composer would mis-edit | medium | mitigate | CVS and SETOPTS cues require the composer's own editable verdict; MSGBOX expression calls open compose-and-replace with the original visible | closed |
| T-89-29 | 89-09 | Denial of Service | per-request AST work growing with the document | medium | mitigate | decodeInCode runs only at SETOPTS keyword offsets and reads the existing AST; the structural test over a mixed 5000-line document pins zero parse/update/build calls | closed |
| T-89-30 | 89-09 | Tampering | a stale cue editing changed text | high | mitigate | Every dispatch branch re-decodes the current line at click time and shows `LENS_TARGET_GONE_TEXT` when absent; no branch edits | closed |
| T-89-31 | 89-10 | Denial of Service | a slow `isAvailable` freezing the intention dialog | medium | mitigate | `isAvailable` uses only the synchronous caret-line heuristic `isCaretOnCall`, with no LSP call; the context-menu action provides a second door that bypasses intention search entirely | closed |
| T-89-32 | 89-10 | Denial of Service | a missing description resource throwing on every lightbulb preview (the G-82-6 class) | medium | mitigate | Resources ship with the intention and `IntentionDescriptionResourcesTest` derives its subjects from plugin.xml; `generatePreview` returns HTML | closed |
| T-89-33 | 89-10 | Tampering | a non-literal CVS mask rewritten from the lightbulb | medium | mitigate | The launcher opens a dialog only on the server's `editable: true` and renders the reason otherwise; the action contains no Java-side parsing, pinned by its source guard | closed |
| T-89-34 | 89-11 | Denial of Service | a config document entering the build, throwing at parse time and stalling other documents' builds | high | mitigate | `BBjDocumentBuilder.update` drops `bbx-config` and service-less uris before the base update; builder tests pin the filter and the no-call early return | closed |
| T-89-35 | 89-11 | Denial of Service | other requests on a config document hanging the client | medium | mitigate | Langium's `awaitDocumentState` rejects immediately with ServerCancelled for an unknown document; the bounded codeAction handler returns null; plan 89-13's installed-bundle e2e test proves a hover settles within budget | closed |
| T-89-36 | 89-11 | Information Disclosure | config file contents sent to the language server process | low | accept | A local child process of the same user already reads this file from disk for PREFIX resolution; nothing leaves the machine | closed |
| T-89-37 | 89-11 | Tampering | duplicate SETOPTS cues on one line leading to the wrong composer | low | mitigate | The client-side provider is removed in the same task that widens the selector; `composer-cue-single-source.test.ts` pins a single cue source | closed |
| T-89-38 | 89-12 | Tampering | a config file mapped as BBj source, gaining BBj diagnostics and edits | high | mitigate | The mapping uses `languageId="bbx-config"`; the refined registration test forbids any config→`bbj` pairing; the server filter (plan 89-11) never builds `bbx-config` documents | closed |
| T-89-39 | 89-12 | Denial of Service | LSP4IJ features on config files waiting on the server | medium | mitigate | Unknown-document requests reject immediately server-side, codeAction is bounded, and the precondition requires the recorded Code Vision GO; plan 89-13's human check watches the Language Servers console for errors on a config file | closed |
| T-89-40 | 89-12 | Repudiation | shipping the config mapping on a NO-GO or non-route decision | medium | mitigate | Task 2's precondition checks both recorded lines verbatim and halts otherwise | closed |
| T-89-41 | 89-13 | Repudiation | phase closed on source-tree tests while the shipped bundle lacks a change | high | mitigate | Task 1 rebuilds and reinstalls, records the artifact identities and asserts cues, config text-only behaviour and decode payloads over IPC against the installed bundle | closed |
| T-89-42 | 89-13 | Denial of Service | a config document hanging requests in the shipped server | medium | mitigate | The e2e hover on a `bbx-config` document must settle within 6000 ms | closed |
| T-89-43 | 89-13 | Repudiation | no-typing-lag claimed from a structural test alone | medium | mitigate | A backstop truth plus a human check on a large file in both IDEs | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on (high) count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**Evidence notes for threats whose mitigation is not a code symbol:**
- T-89-18, T-89-41 — installed-bundle e2e suite (`bbj-vscode/test/functional/installed-extension-e2e.test.ts`) resolves the loaded extension via `extensions.json`, never a glob; rebuild/reinstall recorded in 89-06-SUMMARY.md and 89-13-SUMMARY.md (IntelliJ zip `main.cjs` sha256-identical to the VS Code server bundle).
- T-89-19, T-89-20, T-89-40 — 89-06 Tasks 2/3 are `gate="blocking-human"`; human answers recorded verbatim (`Code Vision spike: GO (IU-262.10315.125)`, `Config routing decision: route`); plugin `sinceBuild = "242"`; 89-11/89-12 executors re-checked the preconditions before acting.
- T-89-24 — `StaleEditGuard.applyIfUnchanged` (StaleEditGuard.java:76) wired through `ComposerLauncher`; apply-guard source guard green.
- T-89-35, T-89-39 — unknown-document requests reject server-side; bounded codeAction handler; config-aware hover override (`bbj-hover-handler.ts`, added in 89-13) with an installed-bundle test that a hover on a config document settles within budget.
- T-89-43 — mitigation is a backstop truth plus a human large-file typing check, recorded under Manual-Only in 89-VALIDATION.md for end-of-phase UAT.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-89-01 | T-89-36 | Config file text reaches the language server, a local child process of the same user that already reads the file from disk for PREFIX resolution; nothing leaves the machine. Severity low. | Plan-time threat model (89-11); confirmed by the human `route` decision in 89-06 | 2026-09-12 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-12 | 43 | 43 | 0 | gsd-secure-phase orchestrator (ASVS L1 short-circuit: register authored at plan time, 0 open at/above high) |

## Security Audit 2026-09-12
| Metric | Count |
|--------|-------|
| Threats found | 43 (14 high, 25 medium, 4 low) |
| Closed | 43 (42 mitigated, 1 accepted) |
| Open | 0 |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-12
