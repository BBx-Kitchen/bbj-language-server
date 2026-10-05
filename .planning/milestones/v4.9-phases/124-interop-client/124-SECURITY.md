---
phase: "124"
slug: "interop-client"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-05"
---

# Phase 124 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| bbj-ls peer (127.0.0.1:5008) -> error classifier | JSON-RPC error objects (`code`, `message`, `data`) from a local peer process, untrusted for shape and size | peer error codes, messages, -33007/-33008 `data` |
| bbj-ls peer -> program guard | format/DENUM result objects; shape, size and coordinates untrusted | formatted text, edits, diagnostics, version echo |
| guard -> editor (Phases 125/126) | only a validated, freshly built typed result may cross | typed `ProgramOutcome` |
| language server -> bbj-ls (third TCP connection) | format/DENUM requests carry the user's live document text to a local peer | user source code (sensitive) |
| program lane -> shared connection / breaker / parse lane | must stay isolated so format/DENUM traffic cannot degrade class lookups or live diagnostics | lane state, generation numbers |
| caller (Phases 125/126) -> program lane | the caller's CancellationToken crosses into the lane | cancellation signal |
| classifier / lane -> language-server log | failure kinds and sanitised peer messages become log lines | kinds, fixed tokens, sanitised peer text |
| test process -> loopback peer / live BBjServices | real JSON-RPC over a local socket, test-only, synthetic program text | synthetic BBj statements |
| hermetic test double -> later-phase suites | scripted outcomes stand in for the peer | scripted outcomes |
| repository -> public | test source and planning records are public | test fixtures |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-124-01 | Tampering | `classifyInteropError` -33007/-33008 `data` | medium | mitigate | fields read and type-checked individually (`java-interop-errors.ts:120,140,164`); `__proto__` test `java-interop-errors.test.ts:168` | closed |
| T-124-02 | Denial of service | -33007 `data` size | medium | mitigate | `MAX_INVALID_SETTINGS_PROBLEMS` = 64 (`java-interop-errors.ts:52,112`), strings truncated to `MAX_PEER_ERROR_LENGTH` | closed |
| T-124-03 | Information disclosure | `FailureLogCadence` / parser-service log lines | medium | mitigate | `FailureLogCadence` (`java-interop-errors.ts:190`) takes caller-built lines; parser service logs kind + message only (`bbj-parser-service.ts:248`) | closed |
| T-124-04 | Repudiation | live-parse log tokens | low | mitigate | `LIVE_PARSE_LOGGED_KINDS` collapses new kinds to `transport` (`bbj-parser-service.ts:109,248`) | closed |
| T-124-05 | Spoofing | non-numeric `code` forging a kind | low | mitigate | `typeof rawCode === 'number'` (`java-interop-errors.ts:164`); string-code tests `java-interop-errors.test.ts:72,83` | closed |
| T-124-06 | Denial of service | returned `text` / `newText` size | medium | mitigate | `allowedProgramTextLength` with `text-too-large` / `new-text-too-large` refusals (`java-program-guard.ts:57,213,300`) | closed |
| T-124-07 | Denial of service | diagnostics flood | medium | mitigate | `MAX_PROGRAM_DIAGNOSTICS` = 500, `MAX_ORIGINAL_LINE_NUMBER_LENGTH` = 32 (`java-program-guard.ts:35,41,155`) | closed |
| T-124-08 | Tampering | range edit outside the sent document | high | mitigate | positions checked against `programLineLengths(request.text)`, overlap check, edit-count refusal (`java-program-guard.ts:113,260,292`) | closed |
| T-124-09 | Tampering | stale or cross-wired answer | high | mitigate | strict `raw.version !== requestVersion` -> `version-mismatch` before other checks (`java-program-guard.ts:185`) | closed |
| T-124-10 | Spoofing | control/bidi/line-separator characters | medium | mitigate | `sanitizePeerText` strips C0/C1, U+007F, bidi controls, maps line breaks (`java-program-guard.ts:66-72`) | closed |
| T-124-11 | Tampering | prototype pollution / extra keys | medium | mitigate | fresh object literals; `__proto__` test `java-program-guard.test.ts:514` | closed |
| T-124-12 | Information disclosure | refusal reasons echoing peer text | low | mitigate | every guard `reason` is a fixed string literal (17 tokens in `java-program-guard.ts`); lane forwards `validated.reason` only (`java-interop-program-lane.ts:134`) | closed |
| T-124-13 | Denial of service | breaker coupling from format traffic | high | mitigate | lane imports only types, jsonrpc, errors and guard (`java-interop-program-lane.ts:16-21`); wired via `createSocket` callback (`java-interop.ts:70`); `getRawClass` still-works tests `java-interop-program-lane.test.ts:40,157` | closed |
| T-124-14 | Denial of service | reconnect storm against :5008 | medium | mitigate | `PROGRAM_LANE_REOPEN_COOLDOWN_MS` = 5 s (`java-interop-program-lane.ts:29,474`) | closed |
| T-124-15 | Tampering | live-parse verdicts cleared by lane loss | medium | mitigate | lane-local `laneEpoch` (`java-interop-program-lane.ts:174,409,458,472`) | closed |
| T-124-16 | Spoofing | peer error strings reaching callers or logs | medium | mitigate | `sanitizePeerText(…, MAX_PEER_ERROR_LENGTH)` on every outcome string (`java-interop-program-lane.ts:99,100,120`) | closed |
| T-124-17 | Information disclosure | document text in lane log lines | medium | mitigate | secret-marker test `java-interop-program-lane.test.ts:232` | closed |
| T-124-18 | Tampering | application error rethrown and miscounted as outage | medium | mitigate | `programOutcomeForError` converts every rejection (`java-interop-program-lane.ts:79`) | closed |
| T-124-19 | Elevation of privilege | lane connecting to an unexpected host | low | accept | see AR-124-01 | closed |
| T-124-20 | Denial of service | hung peer wedging callers | high | mitigate | `PROGRAM_REQUEST_TIMEOUT_MS` = 15 s backstop (`java-interop-program-lane.ts:37,200`) | closed |
| T-124-21 | Denial of service | abandoned requests poisoning the next | medium | mitigate | linked source always cancelled (`java-interop-program-lane.ts:312,317`); real `$/cancelRequest` wire test `java-interop-program-wire.test.ts:250` | closed |
| T-124-22 | Denial of service | -32601 for one method disabling the other | high | mitigate | per-method `latches` map keyed on `currentKey()` (`java-interop-program-lane.ts:179,374-388`); method-not-found tests `java-interop-program-lane.test.ts:415-449` | closed |
| T-124-23 | Denial of service | error burst opening the breaker | high | mitigate | burst test `java-interop-program-lane.test.ts:587` | closed |
| T-124-24 | Information disclosure | document text in failure log lines | medium | mitigate | `spyOnLogger` covers warn/info/debug/error (`java-interop-program-lane.test.ts:388-396`); marker test asserts no line contains it (`:682`) | closed |
| T-124-25 | Tampering | stale -32601 latching the new lane | low | mitigate | latch written only for the still-current key (`java-interop-program-lane.ts:387-388`); stale-connection test `java-interop-program-lane.test.ts:507` | closed |
| T-124-26 | Denial of service | unhandled rejection crashing the server | medium | mitigate | no-op `.catch` on open and wire promises (`java-interop-program-lane.ts:276,322`) | closed |
| T-124-27 | Tampering | test double drifting from the contract | medium | mitigate | scripted answers through the real validators; malformed-script tests `java-interop-program-test-double.test.ts:138-159` | closed |
| T-124-28 | Information disclosure | hermetic suites reaching live :5008 | medium | mitigate | `createSocket` and `connect` overridden to reject (`bbj-test-module.ts:264-270`); zero-call spy test `java-interop-program-test-double.test.ts:180-198` | closed |
| T-124-29 | Denial of service | wire suite hanging on a silent handler | low | mitigate | `vi.useFakeTimers` drives the 15 s backstop (`java-interop-program-wire.test.ts:234,259-272`) | closed |
| T-124-30 | Elevation of privilege | loopback peer bound beyond loopback | low | accept | see AR-124-02 | closed |
| T-124-31 | Information disclosure | proprietary BBj source in the public repo | medium | mitigate | synthetic statements only (`functional/program-live.test.ts:30,41-50`) | closed |
| T-124-32 | Denial of service | CI red without BBj | medium | mitigate | `shouldRunBBjTests()` gate + probe-first `ctx.skip()` (`functional/program-live.test.ts:171,176`) | closed |
| T-124-33 | Elevation of privilege | live test reaching a non-loopback host | low | accept | see AR-124-03 | closed |
| T-124-34 | Denial of service | wedged peer hanging the live run | low | mitigate | client 15 s backstop; `RAW_GUARD_MS` = 15000 (`functional/program-live.test.ts:39`) | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

Paths are relative to `bbj-vscode/src/language/` (source) and `bbj-vscode/test/` (tests).

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-124-01 | T-124-19 | The program lane reuses the owning service's `createSocket` (`java-interop.ts:70`), which reads the host and port already validated by `validateInteropConfig`. The lane adds no new host input. | plan 124-03 (plan-time disposition) | 2026-10-05 |
| AR-124-02 | T-124-30 | `startLoopbackPeer` binds `127.0.0.1` on port 0 only (`loopback-jsonrpc-peer.ts:116`). It is test-only and unchanged by this phase. | plan 124-05 (plan-time disposition) | 2026-10-05 |
| AR-124-03 | T-124-33 | The live test fixes its host to `127.0.0.1` and its port to 5008 (`functional/program-live.test.ts:33-34`). It is test-only and gated by `shouldRunBBjTests()`. | plan 124-06 (plan-time disposition) | 2026-10-05 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-05 | 34 | 34 | 0 | orchestrator (L1 grep evidence, ASVS 1, plan-time register) |

SUMMARY threat flags: none across plans 124-01 to 124-06.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-05
