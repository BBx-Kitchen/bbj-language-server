---
phase: 129-intellij-verdict
plan: 04
subsystem: intellij
tags: [intellij, lsp4ij, formatting, evaluation, actions-on-save, crlf, windows]

requires:
  - phase: 129-intellij-verdict
    provides: evaluation zip, script driver, wire capture and skeleton rows (plan 03)
provides:
  - rows C3a, C3b, C4a, C4b, C5, C6a, C6b, C6c recorded from real Linux sessions, V1-V6 code-verified
  - factory restored to HEAD, sandbox seeds removed
  - the user's Windows run returned into tmp/129-eval/windows/ (idea.log, lsp-trace.txt, notes.txt)
affects: [129-05, 129-09]

actuals:
  tokens: 14000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Actions on Save seeded through the project's workspace.xml component FormatOnSaveOptions"
    - "Formatter settings seeded through the sandbox BbjSettings.xml, one fresh IDE session per seed"

key-files:
  created:
    - .planning/phases/129-intellij-verdict/129-04-SUMMARY.md
  modified:
    - .planning/phases/129-intellij-verdict/129-EVALUATION.md
    - .planning/phases/129-intellij-verdict/129-WINDOWS-CHECKLIST.md

key-decisions:
  - "Actions on Save reaches the language server on IntelliJ 2024.2: whole file sends textDocument/formatting, changed lines sends textDocument/rangeFormatting (C3a, C3b pass)"
  - "eolCharacter CRLF is a known issue on 2024.2 (IDE rejects \\r\\n in newText with a SEVERE Wrong line separators assertion, nothing formatted, nothing damaged); KEEP and LF format a CRLF file correctly; left for the user as the eolCharacter sub-question"
  - "Windows run accepted as returned without a zip sha256 check; the evaluation build is identified indirectly by the plugin version 0.1.0 in idea.log"

requirements-completed: []

duration: 6h20min wall clock (about 30 min of execution; the rest waiting for the Windows run)
completed: 2026-10-04
status: complete
---

# Phase 129 Plan 04: Actions on Save, numbered files, settings, CRLF and the Windows run Summary

**All seven Linux cases now have real-log rows (Actions on Save whole-file and changed-lines both reach the server, numbered-file messages appear on the wire, settings reach the formatter output, CRLF keeps CRLF under KEEP and LF but CRLF is rejected by the IDE). V1-V6 are code-verified, the factory flip and sandbox seeds are gone, and the user returned the Windows logs from IntelliJ IDEA 2026.2.2 (#IU-262.10315.125) with LSP4IJ 0.21.0.**

## Accomplishments

- C3a, C3b, C4a and C4b recorded from real sessions (Task 1). Actions on Save sends a formatting request after `didSave`, and the platform's second pass gets `[]` (noted under Known issues). The numbered-file offer and the selection explanation both show up as `window/showMessageRequest` with no edit.
- C5, C6a, C6b and C6c recorded, V1-V6 filled as code-verified with their tests passing, the evaluation flip restored and both sandbox `BbjSettings.xml` files deleted (Task 2).
- Task 3 (checkpoint, user action): the user ran the Windows checklist and answered "returned". The checks below were done in this continuation.

### FormatOnSaveOptions as the IDE wrote it back (research A5)

C3a (whole file). The seeded `myAllFileTypesSelected` value is the default, so the IDE does not write it:

```
  <component name="FormatOnSaveOptions">
    <option name="myRunOnSave" value="true" />
  </component>
```

C3b (changed lines only, project under Git):

```
  <component name="FormatOnSaveOptions">
    <option name="myFormatOnlyChangedLines" value="true" />
    <option name="myRunOnSave" value="true" />
  </component>
```

## Task Commits

1. **Task 1: Actions on Save and the numbered-file messages from real sessions** - `6edac617` (docs)
2. **Task 2: settings, CRLF and the code-verified rows; tree and sandbox restored** - `91429723` (docs)
3. **Task 3: Windows run returned** - no commit of its own (the returned files are git-ignored); recorded in this SUMMARY

## Task 3: the Windows run (checks done)

- `tmp/129-eval/windows/idea.log` 2,355,504 bytes, `tmp/129-eval/windows/lsp-trace.txt` 152,098 bytes, both non-empty; `notes.txt` (2,539 bytes) holds the user's answers as written down from the chat. `ide-build.txt` was not returned.
- `git status --porcelain --ignored -- tmp/129-eval/windows` prints only `!! tmp/`: nothing is tracked or staged.
- Evaluation session in idea.log, 2026-10-04 16:37:24:
  - `IDE: IntelliJ IDEA (build #IU-262.10315.125, Wed, 2 Sep 2026 05:01:00 GMT)`. The Help | About line was not pasted, so this build line from idea.log stands in for it (IntelliJ IDEA 2026.2.2).
  - `Loaded custom plugins: BBj Language Support (0.1.0), Jakarta EE Platform (262.10315.131), LSP4IJ (0.21.0), MCP Server (262.10315.174), Node.js Remote Interpreter (262.10315.135)`
  - `BBj language server status: stopped -> starting` at 16:37:33,096, `starting -> started` at 16:37:33,683.
  - No SEVERE or ERROR line after the session start.
- Step 0 (zip sha256 with `Get-FileHash`) was **not verified by the user**. The only evidence is indirect: the loaded plugin version is 0.1.0, which is the evaluation and committed build version, while the user's usual install is 0.16.0. Both zips under `tmp/129-eval/` say 0.1.0, so this does not tell the evaluation zip (switch on) apart from the committed zip (switch off). The trace does settle it: formatting requests reach the server (`textDocument/formatting` id 73, `textDocument/rangeFormatting` id 103), and that only happens with the switch on. So the switch-on build was installed, but byte identity with sha256 `ae214de3...` is not proven. D-02 is met in substance only, and threat T-129-16 is only partly mitigated.

## What 129-05 must know for W1-W4

Sources: `tmp/129-eval/windows/notes.txt` (per-case answers) and `tmp/129-eval/windows/lsp-trace.txt` (one verbose paste, 16:37:33 to 16:43:28, **no step labels**, so steps are matched by time and file name). The trace has 234 request/response lines and contains no `Users` path. idea.log contains `C:\Users\<user>` paths (681 backslash and 7 forward-slash matches), so redact every excerpt from it and grep the committed files for the user name before committing.

| Case | Result (user) | Wire evidence in lsp-trace.txt | Notes |
|------|---------------|--------------------------------|-------|
| W1 CRLF, Reformat Code | pass | yes: `textDocument/formatting - (73)` 16:38:59 on `crlf-test.bbj`, re-indent lines 4-61, applied (didChange v6) | status bar CRLF before and after per the user; line endings on disk were not checked from a file |
| W2 Reformat Code + one Undo | pass | yes: the same request 73, then one didChange restoring the whole unindented text at 16:39:51 | ran on `crlf-test.bbj` (same text as `stripped-program.bbj`), **not on one of the user's own programs** as the row's steps ask |
| W3 Reformat selection | pass | yes: `textDocument/rangeFormatting - (103)` 16:40:28 on `stripped-program.bbj` lines 6-8, edit on lines 6-9 only, applied; undone 16:40:32 | "no balloon, all worked also for a partial format" |
| W4 Actions on Save | pass | **none**: user observation only, after the trace had been copied | UX finding: the user first looked for format-on-save on the BBj settings page; it is IntelliJ's Settings, Tools, Actions on Save, Reformat code |
| E1 balloon, Denumber | pass | **user retest only** for the balloon click. Related: a direct `bbj/denum - (24)` at 16:37:57 (a command, not through the balloon) with `workspace/applyEdit - (5)` applied, and one change at 16:38:05 restoring the numbered text in one step | |
| E2 balloon, Denumber and Format | pass | **none**: user retest after the trace, "works as expected" | |
| E3 dismiss the balloon, format again | pass | related only: `window/showMessageRequest - (6)` "Denumbered." (no actions), open 91,612 ms and answered 16:39:28; the server kept answering (`rangeFormatting` 16:40:28) | not the two-button balloon from the step |
| E4 eolCharacter CRLF on build 262 | not tested | none | optional; the C6b known issue stays measured on 2024.2 only |
| E5 Actions on Save, changed lines | not tested | none | optional; C3b covers it on 2024.2 only |

## Deviations from Plan

### Not as planned (recorded, not fixed)

**1. Windows zip hash not checked (D-02).** The checklist's Step 0 was skipped by the user. See Task 3 above for the indirect evidence. 129-05 should state this in the Windows section and the verdict should not claim byte identity.

**2. Help | About build line not pasted, `ide-build.txt` not returned.** The build comes from idea.log's `IDE:` line instead.

**3. W2 used the test file, not one of the user's own programs.** W4, E1 and E2 have no wire evidence because they were done or retested after the trace had been copied. E4 and E5 were not tested.

Tasks 1 and 2 recorded their own differences in the evaluation record (fresh file names per case, `config_runIde` sandbox paths, as in 129-03).

**Total deviations:** 3, all in the user-run part. **Impact:** W1 to W3 have wire evidence on build 262. W4, E1 and E2 rest on the user's word. The installed build is shown to be a switch-on build but is not hash-verified.

## Known Stubs

None. Rows W1 to W4 in `129-EVALUATION.md` still read `pending` / `not run` on purpose: 129-05 fills them from the files above.

## Threat Flags

None beyond the plan's register. T-129-13 holds (`git diff --numstat HEAD -- bbj-intellij bbj-vscode` is empty). T-129-14 holds (the Windows files show only as ignored and nothing from them is quoted here except the IDE, plugin and status lines, which carry no user name). T-129-15 holds (both sandbox seed files are deleted). T-129-16 is only partly mitigated (see deviation 1).

## Self-Check: PASSED

- FOUND: `tmp/129-eval/windows/idea.log` (2,355,504 bytes), `tmp/129-eval/windows/lsp-trace.txt` (152,098 bytes), `tmp/129-eval/windows/notes.txt`
- FOUND commits `6edac617`, `91429723` on `gsd/v4.9-bbj-ls-denum-format`
- `git status --porcelain --ignored -- tmp/129-eval/windows` shows `!! tmp/` only; `git diff --numstat HEAD -- bbj-intellij bbj-vscode` is empty
