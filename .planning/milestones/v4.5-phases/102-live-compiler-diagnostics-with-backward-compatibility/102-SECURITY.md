---
phase: "102"
slug: "live-compiler-diagnostics-with-backward-compatibility"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-22"
---

# Phase 102 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| open editor buffer → localhost JSON-RPC socket | Unsaved document text leaves the LS process for BBjServices on 127.0.0.1:5008 over the existing Java-interop connection; no new port or listener | user source text (same-user, loopback only) |
| workspace-derived paths → the service | `canonicalName`, resolved PREFIX list and workspace roots sent as request fields; the service may open those paths | local file paths |
| service response → published LSP diagnostics | `message`, `categories` and four integer coordinates computed outside the process become `Diagnostic` objects in both IDEs | untrusted-shape integers and strings |
| service response / transport errors → server log | Failure classification and mode decision produce log lines readable via the output channel or `idea.log` | error kind and message, never document text |
| diagnostics setting → live path | A runtime-pushed number caps how many live parser errors are shown | integer config value |
| test fixtures / docs → public repository | Gated test text and six documentation pages are published | invented BBj snippets, behaviour descriptions |
| local jar load directory | Every jar in `/opt/bbx/.lib/bbjls/` is loaded into BBjServices | executable jars (dev environment) |
| branch → public repository | Source, tests, docs and commit bodies become public at merge | repository content, commit messages |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-102-01 | Tampering / DoS | `parseErrorToRange` (`bbj-parser-service.ts:42`) | high | mitigate | Lines clamped to `[0, lineCount-1]`, end line ≥ start line, start character floored at 0 (collapsed/inverted → 0), end character always `END_OF_LINE_CHARACTER` = `LSP_MAX_UINTEGER` (`lsp-position.ts:13,21`). Upper bound of start character is implied by the server DTO's Java `int` fields (`bbj-ls ParseError.java:22,26`), so `startCharacter-1 ≤ 2^31-2`. Pinned by `test/parser-coordinate-converter.test.ts:101-240` (zero/negative lines, extreme values, inverted range, uinteger-bound assertions) | closed |
| T-102-02 | DoS | live call in `debouncedCompile` timer callback | medium | mitigate | `requestLiveParse` wraps the RPC in try/catch and classifies a code-less error as transport (`bbj-parser-service.ts:223-245`); the call site sits inside the timer callback's existing try/catch (`bbj-document-builder.ts:281`, catch logs and continues) | closed |
| T-102-03 | Information Disclosure | mode and failure log lines | medium | mitigate | Only four log calls in the service (`bbj-parser-service.ts:257,260,270,280`); failure line is `request failed (<kind>): <message>`, mode lines are fixed strings; `params.text` is never interpolated | closed |
| T-102-04 | Elevation of Privilege | `canonicalName`, `prefixes`, `workspaceRoots` sent to service | low | accept | See AR-01 | closed |
| T-102-05 | Spoofing / Repudiation | unauthenticated localhost interop socket | low | accept | See AR-02 | closed |
| T-102-06 | DoS | per-document live diagnostic list | low | mitigate | `errors.slice(0, cap)` before conversion (`bbj-parser-service.ts:68`) | closed |
| T-102-07 | Tampering | cap value pushed via configuration handler | low | mitigate | Non-finite or non-positive cap falls back to `DEFAULT_MAX_ERRORS` (`bbj-parser-service.ts:67`); `setMaxErrors(0)` case in `test/bbj-parser-service.test.ts:648` | closed |
| T-102-08 | Information Disclosure | `test/functional/parse-program-live.test.ts` fixtures and six doc pages | medium | mitigate | Fixtures are invented minimal snippets (e.g. `'rem comment line 1\nprint "a",\n:"b\nrem line 4\n'`); docs describe behaviour only | closed |
| T-102-09 | Tampering | published version claim | low | mitigate | Literal `26.03` present in all six pages changed on the branch (`documentation/docs/{vscode,intellij}/{index,getting-started,features}.md`) | closed |
| T-102-10 | DoS | shared BBjServices on 127.0.0.1:5008 | low | accept | See AR-03 | closed |
| T-102-11 | Information Disclosure | branch diff to public repo | high | mitigate | Re-checked 2026-09-22: no PSRV-/D-/T-/CR-/WR-/IN- or plan identifiers in added non-`.planning` lines of `git diff $(merge-base HEAD origin/main) HEAD` | closed |
| T-102-12 | Tampering | `/opt/bbx/.lib/bbjls/` during jar swap | medium | mitigate | Both backups (`bbj-ls.jar.26.02` 23389 B, `bbj-ls.jar.endpoint` 36620 B) live in `/opt/bbx/.lib/bbjls-backup/`, outside the load dir; load dir re-checked 2026-09-22: exactly two files, `bbj-ls.jar` at 36620 B (102-04-SUMMARY) | closed |
| T-102-13 | Repudiation | commit bodies at squash-merge | medium | mitigate | Re-checked 2026-09-22: no `close[sd]/fix(e[sd])/resolve[sd] #N` in `git log --format=%B merge-base..HEAD` | closed |
| T-102-14 | Tampering | UAT evidence | medium | mitigate | Mode-line evidence quoted from a real log with timestamp (`2026-09-22 19:11:29.120 [info] Live compiler diagnostics: off (endpoint not available)`, 102-04-SUMMARY:79,202-204); runbook quotes shipped strings verbatim | closed |
| T-102-SC | Tampering | npm/pip/cargo installs | low | accept | See AR-04 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-102-04 | Paths come from the open document and workspace manager; the LS already reads those files directly, and the service runs as the same user on the same machine. No new privilege boundary, so no path sanitisation added | plan-time threat model (102-01-PLAN) | 2026-09-22 |
| AR-02 | T-102-05 | The unauthenticated loopback socket predates this phase and already exposes the whole BBj classpath; no listener, port or credential handling added | plan-time threat model (102-01-PLAN) | 2026-09-22 |
| AR-03 | T-102-10 | Gated test sends five small requests per run and is skipped by default; shared dev resource, no rate limiting needed | plan-time threat model (102-03-PLAN) | 2026-09-22 |
| AR-04 | T-102-SC | No package-manager install in this phase; `vscode-jsonrpc`, `vscode-languageserver`, `vscode-languageserver-protocol` already declared and imported | plan-time threat model (102-01..04-PLAN) | 2026-09-22 |

*Accepted risks do not resurface in future audit runs.*

---

## Observations (non-blocking)

- `requestLiveParse` builds its request params (`resolvePrefixes()`, `resolveWorkspaceRoots()`) before its `try`, so the plan's "whole body is guarded" is not literally true. A throw there is still caught by the caller's timer try/catch (T-102-02 holds). But the caller would skip that cycle's re-publish, including the BBjCPL diagnostics already merged. Robustness note only, not a security gap.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-22 | 15 | 15 | 0 | /gsd-secure-phase (orchestrator, ASVS L1 grep-depth; auditor skipped per short-circuit rule) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-22
