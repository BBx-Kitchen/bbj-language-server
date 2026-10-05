---
phase: "127"
slug: "vs-code-cut-over"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-10-05"
---

# Phase 127 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| other extensions / keybindings -> `bbj.denumber` | any extension can run the command with an arbitrary argument | untrusted command argument |
| extension host -> language server | the Denumber request carries only a document URI string | document URI |
| packaged VSIX -> user machine | everything under `tools/` ships unless excluded | shipped files, formerly vendored jars |
| user settings.json -> extension | a leftover `bbj.formatter.javaPath` value may still be present | user setting values |
| extension host -> user and workspace settings files | the migration writes the user's and the workspace's settings | `splitSingleLineIf` boolean |
| cloned repository `.vscode/settings.json` -> extension | a workspace file may carry the old key | workspace setting values (untrusted repo) |
| extension host -> bbjlst process | a file path becomes a process argument | file path |
| bbjlst output -> file on disk | Decompile (Replace) renames bbjlst's listing over the input | user source file |
| test doubles -> production module surface | a stale mock can hide a reintroduced member | test doubles |
| repository tree / phase diff -> VSIX and public repo | what is packaged is what users install; source and tests become public | package contents, source text |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-127-01 | Tampering | `createDenumberCommand` argument | medium | mitigate | `fsPathOf` accepts only a non-empty string `fsPath` on an object (`denumber-command.ts:55-59`); number / null / non-string `fsPath` / Explorer-array tests (`denumber-command.test.ts:100-131`) | closed |
| T-127-02 | Tampering | file on disk after Denumber | medium | mitigate | no save/write path; source guard `denumber-command.test.ts:224-225` | closed |
| T-127-03 | Elevation of privilege | new module | low | mitigate | imports neither `vscode` nor `child_process` (guard `denumber-command.test.ts:220-221`); launcher-set guard `no-shell-command-construction.test.ts:98-100` | closed |
| T-127-04 | Denial of service | repeated Alt+N | low | accept | see AR-127-01 | closed |
| T-127-05 | Information disclosure | the one client error message | low | accept | see AR-127-02 | closed |
| T-127-06 | Elevation of privilege | vendored jars and the java launcher | medium | mitigate | no jar or `formatter` entry under `bbj-vscode/tools/`; child_process importers pinned to exactly two (`no-shell-command-construction.test.ts:98-100`); VSIX list check (127-06-SUMMARY) | closed |
| T-127-07 | Tampering | supply chain of the removed jars | low | mitigate | absence suite `formatter-removal.test.ts:91-112` (no `tools/formatter`, no `.jar`, no removed module names) | closed |
| T-127-08 | Tampering | leftover `bbj.formatter.javaPath` value | low | accept | see AR-127-03 | closed |
| T-127-09 | Tampering | `migrateSplitSingleLineIf` writes | medium | mitigate | same-scope `inspect`/`update` on `splitSingleLineIf` only (`settings-migration.ts:33-35,88`); per-rule tests `settings-migration.test.ts` | closed |
| T-127-10 | Tampering | workspace settings of an untrusted repository | low | mitigate | workspace scope only when `deps.workspaceTrusted` (`settings-migration.ts:106`, fed from `vscode.workspace.isTrusted` at `extension.ts:477`); untrusted test `settings-migration.test.ts:215` | closed |
| T-127-11 | Denial of service | activation | low | mitigate | migration catches every failure, `safeLog` never throws (`settings-migration.ts:69-95`); `settings-migration-activation.test.ts` | closed |
| T-127-12 | Tampering | invalid formatter values in settings.json | low | accept | see AR-127-04 | closed |
| T-127-13 | Tampering | decompile commands on a plain-text file | medium | mitigate | `isTokenizedFile` before cleanup or launch (`Commands.cjs:222-226`, `decompile-io.ts:143`); refusal tests `commands-cjs-execution.test.ts:508,528` | closed |
| T-127-14 | Elevation of privilege | `buildDecompileArgv` | medium | mitigate | argv array, file name one verbatim last element; metacharacter test `command-argv-injection.test.ts:234-238` | closed |
| T-127-15 | Tampering | symlink or FIFO at the decompile path | low | mitigate | `lstat` + `isFile()` before open, `fstat` re-check (`decompile-io.ts:26-45`) | closed |
| T-127-16 | Repudiation | Commands.cjs mocks in activation suites | low | mitigate | surface test asserts `denumber` absent (`commands-cjs-execution.test.ts:80`); `extension.ts` source guard (`denumber-command.test.ts:232`) | closed |
| T-127-17 | Tampering | VSIX contents | medium | mitigate | `unzip -l` forbidden-path and required-file check passed on the installed VSIX (127-06-SUMMARY lines 59-69, 109) | closed |
| T-127-18 | Repudiation | planning identifiers in shipped source | low | mitigate | register check over added lines in `bbj-vscode/src` and `bbj-vscode/test` printed nothing (127-06-SUMMARY line 127) | closed |
| T-127-19 | Information disclosure | live hand check | low | accept | see AR-127-05 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

Paths are relative to `bbj-vscode/src/` (source) and `bbj-vscode/test/` (tests).

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-127-01 | T-127-04 | Every Alt+N press sends one request; the server's in-flight guard answers overlaps with in-progress. There is no client queue or retry loop (back-to-back test `denumber-command.test.ts:199`). | plan 127-01 (plan-time disposition) | 2026-10-05 |
| AR-127-02 | T-127-05 | The single client error message carries only the local client library's or language server's rejection text; bbj-ls peer text never travels in a request rejection. | plan 127-01 (plan-time disposition) | 2026-10-05 |
| AR-127-03 | T-127-08 | No client code reads `bbj.formatter.javaPath` any more; the language server's normalizer drops every key outside the 15 known ones. | plan 127-02 (plan-time disposition) | 2026-10-05 |
| AR-127-04 | T-127-12 | Schema bounds and enums guide the Settings UI; the language server's normalizer and bbj-ls reject bad values by name (existing behaviour). | plan 127-03 (plan-time disposition) | 2026-10-05 |
| AR-127-05 | T-127-19 | The hand check ran against local BBjServices with scratch programs only; no credentials or proprietary source are recorded in the SUMMARY. | plan 127-06 (plan-time disposition) | 2026-10-05 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-05 | 19 | 19 | 0 | orchestrator (L1 grep evidence, ASVS 1, plan-time register) |

SUMMARY threat flags: none across plans 127-01 to 127-06 (127-05 has no Threat Flags section).

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-05
