---
phase: "130"
slug: "docs-migration"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-04"
---

# Phase 130 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| repo author text -> public docs site | Pages under documentation/docs are published to GitHub Pages on merge to main | Public prose and sample code |
| phase evidence -> repository history | 130-FORMAT-EVIDENCE.md is tracked and lands on main with the milestone | Self-written samples, tool output |
| release-notes draft -> public GitHub release body | The user pastes the draft into a public release | Public prose and snippets |
| scratch script -> live BBjServices on loopback | The evidence script called formatProgram on 127.0.0.1:5008 | Sample program text (local only) |
| repo author text -> testers' environments | Testers follow QA rows on their own machines | Test steps |
| build.gradle.kts changeNotes -> JetBrains Marketplace | Rendered as HTML on the plugin page | Public HTML |
| README.md -> GitHub repository page | Public landing page | Public prose |
| commit bodies -> GitHub issue state | A squash merge concatenates bodies | Closing keywords (none present) |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-130-01 | Information disclosure | vscode guide pages | low | mitigate | Path/host/credential grep over the 16 shipped files: no user paths or non-loopback hosts; the only password/token hits are existing EM login feature descriptions | closed |
| T-130-02 | Tampering | MDX rendering of the new page | low | mitigate | Docs build green on the final tree ("Generated static files", `onBrokenLinks: 'throw'`) | closed |
| T-130-03 | Repudiation | GitHub issue state | low | mitigate | Closing-keyword scan over shipped files and `git log a4439b4c^..HEAD` bodies: no hits | closed |
| T-130-04 | Information disclosure | 130-FORMAT-EVIDENCE.md, 130-RELEASE-NOTES.md | low | mitigate | Grep for /home, /tmp, /Users, IPs other than 127.0.0.1, secrets: no hits | closed |
| T-130-05 | Tampering | snippets pasted into the release body | low | mitigate | 7 `bbj` fences, all verbatim substrings of the evidence file (130-VERIFICATION.md node check) | closed |
| T-130-06 | Repudiation | issue #507 and lsp4ij #381 state | medium | mitigate | 130-RELEASE-NOTES.md line 31 says "tracked under #507"; no closing keywords anywhere | closed |
| T-130-07 | Tampering | work directory left in the tree | low | mitigate | `git ls-files` shows no scratch/work directory | closed |
| T-130-08 | Information disclosure | QA rows | low | mitigate | New rows use only `examples/` files and invented samples; path/host grep clean | closed |
| T-130-09 | Tampering | testers' files | low | accept | Rows that format `examples/bbj-classes.bbj` say to restore it (Undo or git), e.g. FULL rows 29-31 | closed |
| T-130-10 | Repudiation | issue state of lsp4ij #381 | low | mitigate | Cited by number only; closing-keyword scan of both checklists clean | closed |
| T-130-11 | Information disclosure | intellij guide pages | low | mitigate | Same path/host/credential grep as T-130-01: clean | closed |
| T-130-12 | Tampering | MDX rendering of new page and admonitions | low | mitigate | Docs build green; `:::info`/`:::warning` render (intellij/formatting.md lines 8, 89) | closed |
| T-130-13 | Repudiation | lsp4ij #381 state | low | mitigate | Plain reference link; no closing keyword | closed |
| T-130-14 | Tampering | changeNotes HTML | low | mitigate | changeNotes block has no script, style, img, src= or `$` | closed |
| T-130-15 | Tampering | Gradle guard tests reading build.gradle.kts | medium | mitigate | changeNotes has no LSP4IJ Maven coordinate or `tools/formatter`; Lsp4ijVersionPinTest + BbjLanguageServerBundleSourceGuardTest PASS (130-05-SUMMARY) | closed |
| T-130-16 | Repudiation | issues #507 and lsp4ij #381 | medium | mitigate | Closing-keyword scan over shipped files and every commit body since the phase base: none | closed |
| T-130-17 | Information disclosure | shipped text | low | mitigate | Planning-id grep over docs and QA files: no hits; scope is exactly 16 expected files | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-130-01 | T-130-09 | QA rows reformat a tracked sample file; the rows tell the tester to restore it with Undo or git, and the other samples are throwaway files. The impact is confined to the tester's local checkout. | plan 130-03 (plan-time disposition) | 2026-10-04 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-04 | 17 | 17 | 0 | orchestrator (L1 grep evidence, ASVS 1, plan-time register) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-04
