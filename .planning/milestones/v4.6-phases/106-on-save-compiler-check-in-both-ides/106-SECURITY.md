---
phase: "106"
slug: "on-save-compiler-check-in-both-ides"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-24"
---

# Phase 106 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| LSP client → language server | `didSave`/`didOpen`/`didChange` notifications (local stdio/IPC) start compiler checks; content changes feed the per-document change log | document uri, edit ranges and text (local, user-owned) |
| language server → bbjcpl / interop socket | live parse on a dedicated connection (localhost:5008 by default) or a bbjcpl spawn | source text, diagnostics (local) |
| IntelliJ persisted settings → plugin → language server | `BbjSettings.State.compilerTrigger` becomes an initializationOptions value | enum-like string (untrusted if hand-edited) |
| file system → language server | on-disk text of an open document read to decide whether bbjcpl checked the editor text | source text (local, never logged) |
| private large workspace → planning record | measurements on proprietary code written to `106-MEASUREMENT.md` | timings only |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-106-01 | Denial of service | save listener, `bbj-document-builder.ts` | low | mitigate | single per-document `cplDebounceTimers` entry (`bbj-document-builder.ts:163`); superseded parse answered `RequestCancelled` (`bbj-parser-service.ts:264`) | closed |
| T-106-02 | Information disclosure | log lines in `armLiveParseFromEvent`/`armWhenWorkspaceReady` | low | mitigate | logger calls carry uri + error message only; no `getText()` in a logger call in these methods | closed |
| T-106-03 | Tampering | `textDocumentSync.save` capability | low | accept | see AR-106-01 | closed |
| T-106-04 | Denial of service | `parseProgram` → `openParseLane` | low | mitigate | `parseLaneRetiredGeneration` (`java-interop.ts:211,510,534`); pinned in `test/java-interop-parse-lane.test.ts` | closed |
| T-106-05 | Information disclosure | dedicated-connection fallback warn line | low | mitigate | XYZZY456 marker test in `test/java-interop-parse-lane.test.ts` | closed |
| T-106-06 | Spoofing | dedicated connection endpoint | low | accept | see AR-106-02 | closed |
| T-106-07 | Tampering | `compilerTrigger` from hand-edited settings | low | mitigate | `CompilerInitOptions.normalizeTrigger` (`CompilerInitOptions.java:79`) used at every read site; pinned by `CompilerInitOptionsTest.java`; server-side allow-list in `bbj-ws-manager.ts` | closed |
| T-106-08 | Repudiation | settings Apply without restart | low | accept | see AR-106-03 | closed |
| T-106-09 | Tampering (integrity of shown errors) | `debouncedCompile` fallback branch | medium | mitigate | dedup gated on `checkedTextIsOnDisk` (`bbj-document-builder.ts:639`) + per-line text identity | closed |
| T-106-10 | Information disclosure | on-disk read in `checkedTextIsOnDisk` | low | accept | see AR-106-04 | closed |
| T-106-11 | Denial of service | extra file read per fallback cycle | low | accept | see AR-106-05 | closed |
| T-106-12 | Tampering (integrity of shown errors) | `composeWithKeptCheck` placement | medium | mitigate | placement only through a complete recorded change chain, else dropped (`bbj-kept-check.ts:397`) | closed |
| T-106-13 | Denial of service | change log, `bbj-kept-check.ts` | low | mitigate | `MAX_RECORDED_CHANGE_BATCHES = 2000` cap (`bbj-kept-check.ts:191,208`); cleared on close (`bbj-document-validator.ts:266`) and on trigger off (`bbj-document-builder.ts:426-427`) | closed |
| T-106-14 | Denial of service | malformed content-change ranges | low | mitigate | recorder bookkeeping in try/catch, clears that uri's log on error (`bbj-kept-check.ts:293-299`) | closed |
| T-106-15 | Tampering (integrity of shown errors) | on-save keep-moved-on-result branch | medium | mitigate | same text-document object + `checkSequence` supersession guard (`bbj-document-builder.ts:176,719-720`) | closed |
| T-106-16 | Tampering (integrity of shown errors) | kept bbjcpl fallback | medium | mitigate | `seen` empty unless `checkedTextIsOnDisk` proves the checked text was compiled | closed |
| T-106-17 | Denial of service | superseded checks | low | accept | see AR-106-06 | closed |
| T-106-18 | Information disclosure | `106-MEASUREMENT.md`, SUMMARY, commits | medium | mitigate | 0 `.bbj` file names in `106-MEASUREMENT.md`; numbers and environment notes only | closed |
| T-106-19 | Repudiation | UAT evidence | low | mitigate | runtime claims sourced from LSP trace / `idea.log` (`106-MEASUREMENT.md:89,116`) | closed |
| T-106-SC | Tampering | package installs (all 7 plans) | low | accept | see AR-106-07 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-106-01 | T-106-03 | Advertising `save` only makes clients send a notification the server could already receive; nothing beyond the (normalized) uri is trusted from it. | plan-time threat model | 2026-09-24 |
| AR-106-02 | T-106-06 | Dedicated lane uses the same configured `interopHost`/`interopPort` and socket factory; no new endpoint or credential. | plan-time threat model | 2026-09-24 |
| AR-106-03 | T-106-08 | Apply already schedules the debounced restart for every setting; the new field rides the same path. | plan-time threat model | 2026-09-24 |
| AR-106-04 | T-106-10 | Reads only the uri of an open document via the existing file-system provider; compared in memory, never logged. | plan-time threat model | 2026-09-24 |
| AR-106-05 | T-106-11 | At most one read per fallback cycle, only when bbjcpl reported something and the saved version did not match. | plan-time threat model | 2026-09-24 |
| AR-106-06 | T-106-17 | A superseded cycle does no further work after its request returns; at most one cycle per save. | plan-time threat model | 2026-09-24 |
| AR-106-07 | T-106-SC | No npm, Gradle or pip install in any plan; builds use existing lockfiles. | plan-time threat model | 2026-09-24 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-24 | 20 | 20 | 0 | /gsd-secure-phase (L1 grep-depth, auditor skipped per short-circuit: register authored at plan time, ASVS 1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-24
