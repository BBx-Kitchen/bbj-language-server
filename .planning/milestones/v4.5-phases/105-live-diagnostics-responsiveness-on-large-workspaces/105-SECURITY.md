---
phase: "105"
slug: "live-diagnostics-responsiveness-on-large-workspaces"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-23"
---

# Phase 105 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| IDE client → language server (text-document notifications) | Open and change notifications carry the user's unsaved text and now arm a live-parse cycle directly | unsaved document text, editor version |
| language server → IDE client (published diagnostics) | The early path publishes diagnostics for a document Langium has not validated yet | diagnostics |
| language server → local interop socket (shared and dedicated connection) | Every armed cycle may send the document's text to BBjServices; the parse now has its own second connection to the same configured host and port | document text |
| BBjServices verdict / bbjcpl output → published diagnostics | Two external opinions and Langium's own are merged by concurrent writers into what the editor shows | ranges, message strings |
| private corpus → measurement record | Only numbers and environment notes may leave the tester's workspace | timings, versions |
| branch → public repository / PR #691 | Source, tests, planning files and commit bodies become public | repository content, commit messages |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-105-01 | Tampering | live text sourcing for a never-built document | high | mitigate | Event's live `TextDocument` bound before the cycle reads it; `live-parse-scheduling.test.ts` "a change event while the workspace lock is held publishes a live parser diagnostic…" asserts edited text and version | closed |
| T-105-02 | Denial of Service | event path arming cycles per workspace file | medium | mitigate | Rebuild-path gates reused; `live-parse-scheduling.test.ts` covers trigger off, non-`file:`/PREFIX uris, bbx-config language id, one request within the debounce, ready deferral | closed |
| T-105-03 | Tampering | early publish releasing Validated waiters or doubling Langium's list | medium | mitigate | Below Validated the cycle only sends to the client; "a cycle for a document whose state is Validated writes document.diagnostics and fires the Validated phase once" plus the lock-held tracer | closed |
| T-105-04 | Information Disclosure | new log lines | low | mitigate | `bbj-document-builder.ts:335,365` and `java-interop.ts:564` log uri/key and error message only | closed |
| T-105-05 | Denial of Service | listener throwing into the shared text-document emitter | medium | mitigate | `armLiveParseFromEvent` wrapped in try/catch (`bbj-document-builder.ts:334`), ready continuation `.catch` (`:364`), `sendDiagnostics(...).catch` (`:630`) | closed |
| T-105-06 | Tampering | `reconcileEarlyVerdict` downgrading a real error | medium | mitigate | Byte-identical line match only; `bbj-diagnostic-reconciliation.test.ts` stale-list, trailing-space, precomposed/decomposed, empty and idempotency cases | closed |
| T-105-07 | Denial of Service | whole-text comparison and line lookups per composition | low | accept | See Accepted Risks Log | closed |
| T-105-08 | Denial of Service | dedicated connection retries | medium | mitigate | `java-interop-parse-lane.test.ts` counts sockets: one per generation, one for same-tick callers, none after refusal until `clearCache()`, disposed after MethodNotFound | closed |
| T-105-09 | Spoofing | host/port of the second connection | low | accept | See Accepted Risks Log | closed |
| T-105-10 | Information Disclosure | fallback log line | low | mitigate | "with the dedicated connection refused … warns once with only the refusal text" (`java-interop-parse-lane.test.ts:94`) | closed |
| T-105-11 | Tampering | stale verdict after a lost or replaced dedicated connection | medium | mitigate | Generation bump on loss; "a real BBjParserService over the fake peer: dropping the dedicated connection clears a document verdict state…" | closed |
| T-105-12 | Tampering | server-side shared AST cache on a bbj-ls build without the cache guard | medium | transfer | Transferred to the `bbj-ls` repository (fix `9987bee` must reach the 26.03 release branch); recorded in `105-MEASUREMENT.md` and in the PR #691 body's server-side note | closed |
| T-105-13 | Tampering | concurrent writers of a document's diagnostics | high | mitigate | `live-parse-interleaving.test.ts` matrix: verdict-first/Langium-first order independence, stale releases, overlapping cycles — no doubled, lost or misplaced entry | closed |
| T-105-14 | Tampering | an older writer overwriting a newer list | high | mitigate | `live-parse-interleaving.test.ts` "a save-time compile that resolves after Langium validates newer text merges onto that newer Langium list…", "Langium newer than a stale verdict…", older-cycle failure cases | closed |
| T-105-15 | Information Disclosure | verdict record held in process memory | low | accept | See Accepted Risks Log | closed |
| T-105-16 | Information Disclosure | `105-MEASUREMENT.md`, PR body, #692 comment draft | high | mitigate | MEASUREMENT.md carries only numbers, versions and build-artefact paths (no corpus file names or text); PR body has no planning identifiers | closed |
| T-105-17 | Repudiation | commit bodies at squash-merge time | medium | mitigate | `git log origin/main..HEAD --format=%B` scanned 2026-09-23: no closing keyword; PR body likewise clean | closed |
| T-105-18 | Tampering | PR #691's head branch | medium | mitigate | Fast-forward pushes only; PR still OPEN, not merged or marked ready | closed |
| T-105-19 | Tampering | measurement evidence | medium | mitigate | Timings copied from real IDE traces by the tester; human UAT passed on the final build | closed |
| T-105-SC | Tampering | npm/pip/cargo installs | low | accept | See Accepted Risks Log | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-105-01 | T-105-07 | One string comparison and two lazily indexed `TextDocument`s per composition, bounded by document size; same order of work as the parse that produced the inputs | plan 02 threat model | 2026-09-23 |
| AR-105-02 | T-105-09 | Second connection uses the same `interopHost`/`interopPort` from the same initialization options; trust boundary unchanged (loopback by default) | plan 03 threat model | 2026-09-23 |
| AR-105-03 | T-105-15 | Verdict record holds BBj diagnostics for one version per open document, in-process only, already published to the editor, cleared on close, latch-off and connection reset | plan 04 threat model | 2026-09-23 |
| AR-105-04 | T-105-SC | No package installed; builds use locked dependencies | plans 01-05 threat models | 2026-09-23 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-23 | 20 | 20 | 0 | secure-phase orchestrator (L1 short-circuit: register authored at plan time, ASVS 1) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-23
