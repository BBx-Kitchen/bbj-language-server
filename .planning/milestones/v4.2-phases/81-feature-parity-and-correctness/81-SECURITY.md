---
phase: "81"
slug: "feature-parity-and-correctness"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-05"
register_authored_at_plan_time: true
---

# Phase 81 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time in the five PLAN.md `<threat_model>` blocks (T-81-01 … T-81-23 plus the per-plan supply-chain row T-81-SC); verified after execution by `/gsd-secure-phase 81` at ASVS L1 (grep-depth mitigation presence against the merged source on `main` at `fc4add94`, plus the green suites that run every named test: IntelliJ 312/312, the six phase-81 vitest files 76/76). No SUMMARY carried a `## Threat Flags` entry.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| LSP client → language server (`bbj/compile`) | A file URI chosen by the client process enters a custom request | file URI |
| language server → bbjcpl process | Configured `bbj.compiler.*` strings and the output directory become process arguments | option strings, path |
| workspace / IDE settings → language server | `bbj.compiler.*` values (VS Code) and the flat `compilerOutputDirectory` initialization key (IntelliJ) are user-settable | path string |
| IDE settings dialog → persisted state | A user-typed directory string is stored in `BbjSettings.xml` | path string |
| editor buffer → IntelliJ lexer | Arbitrary user-authored text, including unterminated literals and long lines, is scanned on every edit | source text |
| editor buffer → IntelliJ commenter | Arbitrary line text, including empty and very long lines, is inspected and rewritten on every toggle | source text |
| language server → IDE balloon / console | Server-supplied `message` and diagnostic text is rendered in a notification and a console line | compiler output text |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-81-01 | Tampering | argv construction in `compile-command.ts` / `compileWithOptions` | high | mitigate | `spawn(bbjcplBin, [...compilerArgs, filePath])` at `bbj-cpl-service.ts:272`; no shell string anywhere; `no-shell-command-construction.test.ts` and `command-argv-injection.test.ts` green in the 81-01-03 run | closed |
| T-81-02 | Tampering | compile output written where the user did not ask | medium | mitigate | `lacksExplicitOutputLocation` (`compiler-options.ts:570`) refuses at `compile-command.ts:105` before any spawn; `compile-request.test.ts` asserts no process starts | closed |
| T-81-03 | Spoofing | file URI in `CompileParams` | medium | mitigate | Non-`file` schemes return `reason: 'invalid-file-uri'` (`compile-command.ts:49`); only the resolved `fsPath` reaches the compiler | closed |
| T-81-04 | Denial of service | a bbjcpl process that never exits | medium | mitigate | Timer kills the process (`bbj-cpl-service.ts:142-144`) and settles with `'compile-timeout'` | closed |
| T-81-05 | Information disclosure | raw bbjcpl stderr returned in `message` | low | accept | See AR-81-01 | closed |
| T-81-06 | Repudiation | a compile that silently did nothing | medium | mitigate | Success is `stderr.trim() === ''` (`bbj-cpl-service.ts:300`), never an empty diagnostics list nor exit status; unparsed stderr is a failure carrying its text (`compile-request.test.ts`) | closed |
| T-81-07 | Denial of service | `scanString` / `scanComment` on malformed input | medium | mitigate | Single forward passes bounded by `end` (`BbjStringCommentScanner.java:36-70`), no regex, no backtracking; unterminated literal stops at the line terminator (`BbjStringCommentScannerTest` 13/13) | closed |
| T-81-08 | Tampering | bracket-token classification outside strings and comments | medium | mitigate | `BbjLexerStringCommentSourceGuardTest.bothFilesStillCarryAllSixBracketCases` pins all six bracket cases (10/10) | closed |
| T-81-09 | Denial of service | an index that walks past the buffer end | medium | mitigate | Every read guarded against `end` (`pos + 1 < end`, `start + 3 > end`); buffer-end boundary tests in `BbjStringCommentScannerTest` | closed |
| T-81-10 | Tampering | `uncomment` rewriting a line that was not commented | medium | mitigate | `uncomment` returns the line unchanged when `isCommented` is false (`RemToggleSeam.java:61`); `RemToggleSeamTest` 11/11 | closed |
| T-81-11 | Tampering | losing indentation or a second space on a toggle | medium | mitigate | Character-for-character round-trip and indentation tests in `RemToggleSeamTest` | closed |
| T-81-12 | Denial of service | an index walking past the end of a short line | medium | mitigate | Length guards at `RemToggleSeam.java:37,44,67`; bare `rem` and empty-line boundary tests | closed |
| T-81-13 | Tampering | a locale-dependent recognition result | low | mitigate | No `toLowerCase`/`toUpperCase` in `RemToggleSeam.java` (0 occurrences); `RemToggleSeamTest.recognitionIsUnaffectedByTheDefaultLocale` runs under a Turkish default locale | closed |
| T-81-14 | Tampering | the configured directory becoming more than one compiler argument | high | mitigate | `CompilerInitOptions` trims but never splits (no `split` call); `surroundingWhitespaceIsTrimmedButTheInteriorIsUntouched` pins interior spaces; server side keeps one string per argv element (T-81-01) | closed |
| T-81-15 | Tampering | tokenized output written to a directory the user did not intend | medium | accept | See AR-81-02 | closed |
| T-81-16 | Denial of service | a settings read touching the filesystem on the UI path | medium | mitigate | `CompilerInitOptions.java` has 0 `java.io.File`/`java.nio.file` references; `CompilerInitOptionsTest` asserts their absence; dialog row attaches no listener or lookup | closed |
| T-81-17 | Repudiation | a configured directory that silently never reaches the server | medium | mitigate | `options.addProperty("compilerOutputDirectory", …)` at `BbjLanguageServerFactory.java:58-60`; `CompilerOutputDirectorySourceGuardTest` pins all four wiring sites and the absence of a competing client-settings route (7/7) | closed |
| T-81-18 | Tampering | compiler invocation logic drifting onto the IntelliJ side | high | mitigate | `BbjCompileAction.java` has 0 `ProcessBuilder`/`GeneralCommandLine`; `BbjCompileActionSourceGuardTest` asserts absence of process launch, command-line construction and the compiler binary name (8/8) | closed |
| T-81-19 | Denial of service | the EDT blocking on a compile round trip | high | mitigate | `Task.Backgroundable` at `BbjCompileAction.java:75` whose `run` opens with `assertIsNonDispatchThread()` (line 78); only the document save runs on the EDT; source guard pins position and uniqueness | closed |
| T-81-20 | Denial of service | a lost response leaving a progress indicator up forever | medium | mitigate | Both waits bounded with `.get(COMPILE_TIMEOUT_SECONDS, TimeUnit.SECONDS)` (`BbjCompileAction.java:89,102`); timeout renders `requestFailed` | closed |
| T-81-21 | Information disclosure | server-supplied text rendered in a balloon | low | accept | See AR-81-03 | closed |
| T-81-22 | Repudiation | a compile that reports nothing | medium | mitigate | Every result path renders a balloon including `reason == null` (`CompileResultPresenter.java:54`), null proxy (line 116) and failed request; failures also go to the language-server console (`BbjServerService`) | closed |
| T-81-23 | Tampering | a file URI naming something outside the workspace | low | accept | See AR-81-04 | closed |
| T-81-SC | Tampering | npm/pip/cargo installs | low | accept | See AR-81-05 | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-81-01 | T-81-05 | The text is the local compiler's own message about the user's own file, already shown verbatim by VS Code's compile command today; no new data crosses a boundary it did not already cross | plan 81-01 threat model | 2026-09-05 |
| AR-81-02 | T-81-15 | The directory is a local, user-entered setting feeding a local compiler the user already runs; VS Code has carried the identical `bbj.compiler.output.directory` setting for releases. No new privilege boundary | plan 81-04 threat model | 2026-09-05 |
| AR-81-03 | T-81-21 | Same text VS Code shows in the same situation; local compiler output about the user's own file | plan 81-05 threat model | 2026-09-05 |
| AR-81-04 | T-81-23 | The URI is built by the action from the open editor's virtual file, never from user input, and the server independently refuses non-`file` schemes (T-81-03). ASVS L1 local boundary | plan 81-05 threat model | 2026-09-05 |
| AR-81-05 | T-81-SC | No package-manager install task exists in this phase; every library used is a pre-existing pinned dependency the phase does not touch (research Package Legitimacy Audit: N/A) | plans 81-01..05 threat models | 2026-09-05 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-05 | 24 | 24 | 0 | /gsd-secure-phase 81 (orchestrator, L1 grep-depth short-circuit) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-05
