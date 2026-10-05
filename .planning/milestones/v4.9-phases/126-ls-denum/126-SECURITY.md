---
phase: "126"
slug: "ls-denum"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-03"
---

# Phase 126 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| IDE client -> language server | `bbj/denum` params; Format Document, Format Selection and format-on-save requests; late offer clicks | a client-supplied uri, format ranges |
| language server -> bbj-ls (loopback :5008) | the open buffer's text goes out for DENUM, or for formatProgram with the denumber permission | user source text |
| bbj-ls answers -> user-visible text | error data and diagnostics from the peer become messages, the 'BBj' channel block and Problems entries | peer-written text, line numbers |
| language server -> IDE client | server-initiated `workspace/applyEdit`, `bbj/denumDiagnostics`, `bbj/showDenumDiagnostics`, Go to Line `window/showDocument` | a versioned edit of the user's buffer, a uri plus entries |
| Problems view entry -> editor navigation | clicking an entry moves the cursor in the document it is keyed by | a range |
| server -> IntelliJ (LSP4IJ) | a future server-initiated edit there is applied without a version check | none in this phase |

---

## Threat Register

Plans 126-05 and 126-06 both numbered their threats from T-126-21; those IDs are qualified with the plan (`/05`, `/06`).

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-126-01 | Tampering | `BBjDenumService.run` applying to a newer buffer | high | mitigate | live version re-checked before applying (`bbj-denum-service.ts:326`), versioned edit through the messenger, `not-applied` Warning on refusal | closed |
| T-126-02 | Elevation of privilege | `createDenumHandler` reading a client uri from disk or sending a non-BBj document | high | mitigate | open-document lookup with `languageId` allow-list (`bbj-denum-service.ts:297`); no `fs` import in `denum-command.ts` or `bbj-denum-service.ts` | closed |
| T-126-03 | Information disclosure | document text in logs or toasts | medium | mitigate | fixed message constants; secret-marker tests in `bbj-denum-outcomes.test.ts` | closed |
| T-126-04 | Denial of service | overlapping or spammed runs | medium | mitigate | per-uri `running` set answering `DENUM_IN_PROGRESS_MESSAGE` (`bbj-denum-service.ts:233,309`); interop lane deadlines | closed |
| T-126-05 | Denial of service | a thrown error becoming a JSON-RPC failure | low | mitigate | catch-alls in `denum-command.ts:134,140` and `bbj-denum-service.ts:267`; fire-and-forget runs `.catch` | closed |
| T-126-06 | Tampering | tokenized program text sent to bbj-ls | medium | mitigate | `TOKENIZED_PROGRAM_PREFIX` check (`bbj-denum-service.ts:305`) before the in-flight guard and before any call | closed |
| T-126-07 | Elevation of privilege | list and reveal handlers turning a payload into a command or an open | medium | mitigate | the reveal handler runs one fixed command (`workbench.actions.view.problems`, `extension.ts:722`); hostile-payload tests | closed |
| T-126-08 | Spoofing | CR/LF or control text faking extra output lines | medium | mitigate | control characters plus U+2028/U+2029 flattened to spaces (`denum-diagnostics-output.ts:172`) | closed |
| T-126-09 | Denial of service | a huge list flooding the channel | low | mitigate | interop guard keeps 500 bounded entries; one append per entry | closed |
| T-126-10 | Denial of service | malformed payload throwing in the extension host | low | mitigate | field-validating formatter that never throws; null/number/string/wrong-type tests | closed |
| T-126-11 | Tampering | Go to Line steered to another file or an out-of-range line | high | mitigate | uri captured from the open document; line clamped at click time (`presentMixedNumbering`, `bbj-denum-service.ts:515`) | closed |
| T-126-12 | Spoofing | peer text in toasts | medium | mitigate | fixed texts plus integer counts and line; secret-marker test | closed |
| T-126-13 | Information disclosure | document or peer text in logs | medium | mitigate | reason, kind and numeric code only; secret-marker sweep over logger levels | closed |
| T-126-14 | Information disclosure | bbj-ls diagnostic messages in the list | low | accept | see Accepted Risks AR-126-01 | closed |
| T-126-15 | Repudiation | a run ending silently | low | mitigate | one presenter per exit path; outcome-table test | closed |
| T-126-16 | Tampering | format-on-save denumbering without consent | high | mitigate | `allowDenum` appears 0 times in `bbj-format-service.ts`; tests assert no `denumProgram` from the format path | closed |
| T-126-17 | Tampering | a late click applying to a different version | high | mitigate | click-time text and version, re-check before apply, versioned edit; late-click and close-before-click tests | closed |
| T-126-18 | Denial of service | a save held open by the offer | high | mitigate | offer is fire-and-forget (`void showFormatterWarningWithAction`, `bbj-format-service.ts:110`); never-settling prompt test | closed |
| T-126-19 | Denial of service | an offer toast on every save | medium | mitigate | superseded by plan 126-06: the offer now shows on every request by user decision (see T-126-21/06); the ledger still bounds the other notices | closed |
| T-126-20 | Spoofing | document or peer text in the offer | low | mitigate | fixed texts; secret-marker test in `bbj-denum-offer.test.ts` | closed |
| T-126-21/05 | Tampering | LSP4IJ applying a DENUM edit to a newer buffer | medium | accept | see AR-126-02 | closed |
| T-126-22/05 | Denial of service | a wedged live peer holding a DENUM run | low | accept | see AR-126-03 | closed |
| T-126-23/05 | Repudiation | planning identifiers in shipped source | low | mitigate | register check over the phase's added lines in `bbj-vscode/src` and `bbj-vscode/test`: 0 hits (2026-10-03) | closed |
| T-126-21/06 | Denial of service | an offer toast on every format-on-save of a numbered file | low | accept | see AR-126-04 | closed |
| T-126-22/06 | Tampering | formatting denumbering without consent now that every request offers | high | mitigate | `allowDenum` count 0 in the format service; `expectNoDenumberingYet` after every format in the tests | closed |
| T-126-23/06 | Denial of service | the notice ledger flooded by offers | low | mitigate | the offer never enters the ledger; `FORMAT_NOTICE_LEDGER_LIMIT + 1` offers test (`bbj-denum-offer.test.ts:537`) | closed |
| T-126-24 | Information disclosure | buffer text in the per-request debug log | low | mitigate | kind and code only; secret-marker test green | closed |
| T-126-25 | Tampering | a payload uri steering Problems or a click to an unopened file | high | mitigate | string comparison against open `bbj` documents only (`extension.ts:667-668`); collection keyed by the matched document's own uri; not-open, other-language, `command:` and numeric uri tests | closed |
| T-126-26 | Spoofing | payload text becoming a link or command in Problems | medium | mitigate | entries carry range, message, severity and source only (own-keys test); control characters flattened; fixed reveal command | closed |
| T-126-27 | Tampering | stale entries on changed lines | medium | mitigate | change and close clear entries (`extension.ts:732,737` -> `clearProblems`); residual race accepted as AR-126-05 | closed |
| T-126-28 | Denial of service | an oversized entry list | low | mitigate | client cap `MAX_DENUM_PROBLEMS = 500` (`denum-diagnostics-output.ts:17,97`) on top of the server guard; 501-entry test | closed |
| T-126-29 | Repudiation | the record lost once an edit clears Problems | low | accept | see AR-126-06 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-126-01 | T-126-14 | The list describes the user's own open file and goes only to the IDE that asked for the run; messages are control-stripped and bounded by the interop guard | plan 126-03 threat model | 2026-10-02 |
| AR-126-02 | T-126-21/05 | IntelliJ cannot start a DENUM run in this phase; the server re-checks the version just before sending; the IntelliJ DENUM work must keep the request off the UI thread | plan 126-05 threat model | 2026-10-02 |
| AR-126-03 | T-126-22/05 | Bounded by the 15 s (DENUM) and 25 s (Denumber and Format) deadlines with cancel-always; the in-flight guard answers repeats at once | plan 126-05 threat model | 2026-10-02 |
| AR-126-04 | T-126-21/06 | User decision (G-126-1): no robust save signal exists; VS Code replaces a showing identical notification so offers never stack; auto-saves never format; the format response never waits | user, via plan 126-06 | 2026-10-03 |
| AR-126-05 | T-126-27 (residual) | A keystroke between the applied edit and the list arriving on the same JSON-RPC stream could place entries on just-changed text; tiny window, the next edit clears them | plan 126-07 threat model | 2026-10-03 |
| AR-126-06 | T-126-29 | The 'BBj' output channel keeps the full block as a log copy | plan 126-07 threat model | 2026-10-03 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-03 | 32 | 32 | 0 | secure-phase orchestrator, L1 grep-depth (auditor skipped: register authored at plan time, ASVS 1, no open threats) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-03
