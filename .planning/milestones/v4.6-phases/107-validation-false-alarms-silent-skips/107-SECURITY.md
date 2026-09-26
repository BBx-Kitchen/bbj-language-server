---
phase: "107"
slug: "validation-false-alarms-silent-skips"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-25"
---

# Phase 107 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| editor text → validators | line-break walkers, use-before-assignment check and the new unknown-member check run over user source text | source text (local, user-owned) |
| language server → java-interop (localhost:5008) | class descriptions read to decide whether a member exists | class/member names (local) |
| private corpus → public repository | measurements on proprietary code recorded in planning files; tests and fixtures must stay synthetic | counts and own-words shapes only |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-107-01 | Tampering (diagnostic integrity) | `elseStatementLineBreaks` | medium | mitigate | Still-flagged cases kept and extended (`line-break-single-line-if.test.ts:125` "an extra ELSE after a complete nested IF/ELSE/FI group is still flagged"); suite green at HEAD | closed |
| T-107-02 | Information disclosure | fixtures, tests, SUMMARY | high | mitigate | Synthetic fixtures; leak guard over all 31 phase-changed tracked files — only hits are punctuation-only lines (see audit note) | closed |
| T-107-03 | Denial of service | backward walk | low | accept | `line-break-walk-termination.test.ts` 28/28 green | closed |
| T-107-04 | Denial of service (of diagnostics) | `checkUseBeforeAssignment`, `processNode` | medium | mitigate | 8 `symbol?.` reads in `check-variable-scoping.ts`; `isSymbolRef(node) && node.symbol` at `bbj-scope-local.ts:293`; `variable-scoping.test.ts` 49/49 | closed |
| T-107-05 | Repudiation (silent failure) | error handling | low | mitigate | No try/catch added to the scoping check or scope computation (phase diff grep) | closed |
| T-107-06 | Tampering (developer trust) | `checkUnknownJavaMember` | medium | mitigate | Resolved-class + certain-receiver + case-insensitive-absent guards; `unknown-java-member.test.ts` 29/29, live 5/5; corpus review in 107-05 | closed |
| T-107-07 | Denial of service (of diagnostics) | the new check | low | mitigate | try/catch around `.ref` at `check-unknown-java-member.ts:61,185`; `s!.` no-crash test | closed |
| T-107-08 | Spoofing (stale interop data) | class descriptions | low | accept | bbjcpl on save stays authoritative | closed |
| T-107-09 | Information disclosure | CONFORMANCE, SUMMARY, fixtures, tests | high | mitigate | Probes/snapshots kept in the corpus repo's untracked snapshots folder; leak guard (see audit note) | closed |
| T-107-10 | Tampering (measurement integrity) | harness runs | medium | mitigate | details.json snapshotted per run; base measured on the phase base (107-CONFORMANCE.md §1, §4) | closed |
| T-107-11 | Tampering (diagnostic integrity) | line-break walkers | medium | mitigate | RETURN-skip fix driven by failing test `01572e48` → `a5f7c297`; newly entered B files reported per file (107-CONFORMANCE.md) | closed |
| T-107-12 | Information disclosure | SUMMARY, tests, commits | high | mitigate | Live probe outside the repo; synthetic tests; leak guard | closed |
| T-107-13 | Tampering (developer trust) | `checkUnknownJavaMember` | medium | mitigate | Five non-genuine shapes guarded, each pinned by a failing-first test (107-05 commits) | closed |
| T-107-14 | Denial of service | BBjServices on :5008 | low | accept | One probe process at a time | closed |
| T-107-15 | Information disclosure | CONFORMANCE, todos, SUMMARY | high | mitigate | Counts and own-words shapes only; leak guard | closed |
| T-107-16 | Repudiation (gate evidence) | A2/B verdicts | medium | mitigate | File-set diffs against the phase base; rule-based artifact exclusion reported beside raw counts; user accepted the file-set reading (107-UAT.md) | closed |
| T-107-17 | Tampering (planning identifiers in public code) | phase diff | medium | mitigate | Register grep over `git diff 77c967ce..HEAD -- bbj-vscode` added lines: no hits | closed |
| T-107-SC | Tampering | package installs | low | accept | No package installed (`package.json` unchanged) | closed |

*Status: open · closed · open — below {block_on} threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-107-01 | T-107-03 | Walk termination unchanged; covered by the termination suite | plan-time register | 2026-09-24 |
| AR-107-02 | T-107-08 | Interop data drift surfaces as a Warning-level mismatch at worst; compiler is authoritative | plan-time register | 2026-09-24 |
| AR-107-03 | T-107-14 | Local backend only, single probe process | plan-time register | 2026-09-24 |
| AR-107-04 | T-107-SC | No dependency changes | plan-time register | 2026-09-24 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-25 | 18 | 18 | 0 | orchestrator (L1 grep-depth, register authored at plan time) |

Leak-guard note (2026-09-25): `leak-guard.mjs` over the 31 tracked files changed since `9fdbdd46` reported 13 "corpus source line" hits. Every hit is a punctuation-only line — 10 `// ====…` comment dividers in `variable-scoping.test.ts` (present at the phase base) and 3 Markdown table separator rows in REQUIREMENTS/ROADMAP/STATE. None carries corpus content; classified as coincidental matches.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-25
