---
phase: "103"
slug: "one-set-of-errors-diagnostic-reconciliation"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-23"
---

# Phase 103 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| live-parse result → reconciliation | BBj's ranges and messages from BBjServices on 127.0.0.1:5008 decide which Langium diagnostics are hidden or downgraded | server-computed ranges and message strings |
| live-parse outcome → published diagnostics | Whether the endpoint answered, failed, was superseded or is missing decides whether Langium's errors stay errors | outcome kind |
| interop connection lifecycle → verdict state | A reconnect or class-cache clear means the server behind the socket may have changed | connection generation |
| verdict state → per-keystroke validation | A decision about older text colours newer text via the carry-over | message + flagged-line text (process memory only) |
| editor lifecycle → verdict state | Opening and closing documents in either IDE | document URIs |
| private corpus → public repository | Only aggregate numbers may cross | aggregates, own-words shape descriptions |
| local jar load directory | Every jar in `/opt/bbx/.lib/bbjls/` is loaded into BBjServices | executable jars (dev environment) |
| branch → public repository / PR #691 | Source, tests, planning files and commit bodies become public | repository content, commit messages |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-103-01 | Tampering | `reconcileWithVerdict` deciding from server ranges | low | accept | See AR-01 | closed |
| T-103-02 | Tampering | `requestLiveParse()` outcome classification | medium | mitigate | Discriminated `LiveParseOutcome` (`bbj-parser-service.ts:95`); only `kind === 'verdict'` with an unchanged text version reaches reconciliation (`bbj-document-builder.ts:327`) | closed |
| T-103-03 | DoS | reconciliation cost per debounce cycle | low | mitigate | BBj's list capped by `parseErrorsToDiagnostics(errors, lineCount, maxErrors)` (`bbj-parser-service.ts:67`); carry-over is one keyed lookup per complaint (`bbj-diagnostic-reconciliation.ts:162`) | closed |
| T-103-04 | Information Disclosure | verdict state and remembered Langium list | low | mitigate | `bbj-diagnostic-reconciliation.ts` contains zero `logger`/`console` calls; state lives in process memory only | closed |
| T-103-05 | Tampering | stale or cancelled answer applied to newer text | medium | mitigate | Verdict applied only when `document.textDocument.version === versionBeforeRequest` (`bbj-document-builder.ts:327`); cancelled is a no-op branch (`:351`); pinned by "a cancelled answer after an accepted verdict" test (`test/bbj-parser-service.test.ts:666`) | closed |
| T-103-06 | Tampering | failure leaving previous downgrades in place | medium | mitigate | Non-verdict paths call `forgetVerdict` (`bbj-document-builder.ts:256,362`) before the save-time compile; per-failure-kind "falls back to the save-time compile with Langium errors restored" tests (`test/bbj-parser-service.test.ts:538-660`) | closed |
| T-103-07 | DoS | verdict states outliving the endpoint | low | mitigate | `clearAllVerdictStates()` on MethodNotFound / generation change / trigger off (`bbj-document-builder.ts:192,366`) | closed |
| T-103-08 | Tampering | older-server path | medium | mitigate | Exact-equality test "an older server gets exactly the 0.16.x diagnostics" (`test/bbj-parser-service.test.ts:351`); UAT Hand Check B passed against the pre-endpoint jar in both IDEs | closed |
| T-103-09 | Tampering | carry-over matching | medium | mitigate | Key is exact message + exact flagged-line text, `syntaxComplaintKey` (`bbj-diagnostic-reconciliation.ts:56-58`); edited-line and unseen-complaint tests in `test/bbj-document-validator.test.ts` | closed |
| T-103-10 | Information Disclosure / DoS | verdict state for closed documents | low | mitigate | `TextDocuments.onDidClose(... clearVerdictState(...))` (`bbj-document-validator.ts:223`) | closed |
| T-103-11 | Tampering | line-break messages | low | mitigate | Only `data: { code: LINE_BREAK_DIAGNOSTIC_CODE }` added (`validations/line-break-validation.ts:74`); line-break suites green 2026-09-23 | closed |
| T-103-12 | Information Disclosure | `103-CONFORMANCE.md`, fixtures, SUMMARY | high | mitigate | Re-checked 2026-09-23: corpus-path / corpus-id grep over `103-CONFORMANCE.md` returns 0 matches; live-test fixtures are invented | closed |
| T-103-13 | Tampering | the measurement record | medium | mitigate | `phase-103-before-details.json` snapshot present in the corpus repo's snapshots dir (115027 B) | closed |
| T-103-14 | DoS | local endpoint under sequential corpus requests | low | accept | See AR-02 | closed |
| T-103-15 | Information Disclosure | pushed diff and PR text | high | mitigate | Re-checked 2026-09-23: 0 register identifiers in added `bbj-vscode/src`/`test` lines since the phase-102 branch; PR #691 body has 0 planning identifiers or closing keywords | closed |
| T-103-16 | Tampering | `/opt/bbx/.lib/bbjls/` during the swap | medium | mitigate | Both backups (`bbj-ls.jar.pre-endpoint` 23369 B, `bbj-ls.jar.phase-103-endpoint` 40889 B) live in `/opt/bbx/.lib/bbjls-backup/`; load dir checked after swap and after restore: two files, restored jar `cmp`-identical to the endpoint backup (UAT 2026-09-23) | closed |
| T-103-17 | Repudiation | commit bodies at squash-merge | medium | mitigate | Re-checked 2026-09-23: 0 `closes/fixes/resolves #` in `git log --format=%B` since the phase-102 branch | closed |
| T-103-18 | Tampering | hand-check evidence | medium | mitigate | Runbook strings (`Live compiler diagnostics: on`, `… off (endpoint not available)`, `bbjcpl stdout: `, `BBj Parser`) checked against shipped code (`bbj-parser-service.ts:16,299,309`, `bbj-cpl-service.ts:198,298`); both hand checks passed by the tester in both IDEs | closed |
| T-103-19 | Tampering | PR #691 head branch | medium | mitigate | PR OPEN, not merged; remote phase-102 and phase-103 refs both at `c37c595a` (fast-forward, per 103-05-SUMMARY) | closed |
| T-103-SC | Tampering | npm/pip/cargo installs | low | accept | See AR-03 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-103-01 | A wide BBj range hides Langium syntax complaints inside it, but BBj's own Error stays on that span so the document is still marked; ranges are clamped by `parseErrorToRange`; the endpoint is the same-user localhost service chosen as syntax authority | plan-time threat model (103-01-PLAN) | 2026-09-23 |
| AR-02 | T-103-14 | One-off sequential local measurement run; the endpoint enforces its own size cap and timeout | plan-time threat model (103-04-PLAN) | 2026-09-23 |
| AR-03 | T-103-SC | No package installed in this phase; builds use the locked dependencies, the harness reuses its existing `tsx` | plan-time threat model (103-01..05-PLAN) | 2026-09-23 |

*Accepted risks do not resurface in future audit runs.*

---

## Observations (non-blocking)

- The hand-check runbook's `sudo /opt/bbx/bin/stopbbjservices` does not work on the 2026-09-23 BBj install: `StopServer` prompts for host, port and admin login on the console and aborts without a TTY. During UAT, BBjServices (runs as `coder`) was stopped with SIGTERM and restarted as `coder`. The mitigation of T-103-16 (backups outside the load dir, file count and size checked) held.
- Local HEAD is ahead of the pushed phase-103 ref by the code-review fixes and the verification docs; T-103-15/T-103-17 were re-checked on the local tree, so they cover those commits before the next push.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-23 | 20 | 20 | 0 | /gsd-secure-phase (L1 grep-depth, short-circuit: plan-time register, ASVS 1) |
