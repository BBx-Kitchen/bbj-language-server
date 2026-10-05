---
phase: 129-intellij-verdict
plan: 05
subsystem: intellij-formatting-evaluation
status: complete
tags: [intellij, lsp4ij, formatting, verdict, evaluation]
requires:
  - phase: 129-04
    provides: "Linux cases C1-C7, code-verified V1-V6, the returned Windows run"
provides:
  - "129-VERDICT.md: verdict supported, decided by the user (override of the recommendation disabled), eol_character known-issue, eol_note text"
  - "129-EVALUATION.md: W1-W4 and E1-E5, Known issues, Blockers (none after the decision), Recommendation, Decision"
  - "129-LSP4IJ-ISSUE-crlf-newtext.md: upstream draft for the CRLF newText rejection (lsp4ij #381)"
affects: [129-06, 129-07, 129-08, 129-09]
tech-stack:
  added: []
  patterns: ["verdict read by later guards with sed -n 's/^verdict: //p'"]
key-files:
  created:
    - .planning/phases/129-intellij-verdict/129-VERDICT.md
    - .planning/phases/129-intellij-verdict/129-LSP4IJ-ISSUE-crlf-newtext.md
  modified:
    - .planning/phases/129-intellij-verdict/129-EVALUATION.md
decisions:
  - "IntelliJ LSP formatting verdict is supported (the user's answer, overriding the recommendation disabled)"
  - "eolCharacter CRLF is a known issue, not a blocker: the Line ending control stays and the Formatter note says plainly that CRLF stops formatting entirely in IntelliJ (LSP4IJ, lsp4ij #381)"
metrics:
  duration: "about 13 min of executor time across both executors (plus the user's checkpoint)"
  completed: 2026-10-04
actuals:
  tokens: 9800
  tasks: 3
  commits: 2
---

# Phase 129 Plan 05: IntelliJ Formatting Verdict Summary

The user decided "supported" with eolCharacter CRLF a known issue, overriding Claude's "disabled" recommendation (which
rested on C6b alone); the verdict, the Formatter-note text and the one LSP4IJ issue draft are recorded in
`129-VERDICT.md`.

## What was done

- **Task 1** (commit ee16ab3e, earlier executor): Windows rows W1-W4 and extra steps E1-E5 from the returned, redacted
  idea.log and LSP trace; every row classed once against D-04; Known issues, Blockers (C6b, caused by LSP4IJ) and a
  Recommendation (disabled, by rule 3, turning on sub-question (a)); the upstream draft `129-LSP4IJ-ISSUE-crlf-newtext.md`.
- **Task 2** (decision checkpoint, gate blocking-human): answered by the user, verbatim "supported + known-issue". No
  option was chosen by Claude or auto-mode.
- **Task 3** (commit f9a40f84): `129-VERDICT.md` written from that answer only: `verdict: supported`,
  `decided_by: user`, `decided_at: 2026-10-04`, `recommended: disabled`, `override: true`, `eol_character: known-issue`,
  `actions_on_save_request: observed`, `blockers: []`, four known issues, the draft, both IDE builds, and `eol_note`.
  `129-EVALUATION.md`: C6b's class is now `known issue` (the row says the recommendation classed it a blocker), C6b is
  listed under Known issues with "moved by the user's decision", the Blockers section says none remain and keeps C6b's
  measured facts, the Recommendation keeps Claude's original recommendation and gains a Decision section.

## For the later plans

- 129-06 and 129-07 run (`verdict: supported`); 129-08 (disabled outcome) does not apply. No range-only constant: the
  verdict is not `supported-no-range`.
- 129-07 appends `eol_note` from `129-VERDICT.md` word for word to the Formatter section note. The user asked that it
  say plainly that CRLF stops formatting entirely in IntelliJ (the IDE refuses the edit; LSP4IJ, same as lsp4ij #381),
  not "may not take effect". Text: "In IntelliJ, Line ending CRLF stops formatting entirely: the IDE refuses the
  formatter's edit and the file stays unchanged, without a message (an LSP4IJ limitation, lsp4ij issue #381); LF does
  not change a file's line endings either, so leave it at KEEP." 129-07's must-have still says "may not take effect";
  the verdict's text supersedes that wording.
- The W4 usability finding (users look for format on save on the BBj page) is input for the Formatter note or the
  IntelliJ guide.
- The upstream draft is for the user to file or not (perhaps as a comment on lsp4ij #381).

## Deviations from Plan

None in the plan's tasks. One small addition in Task 3: the issue draft's internal header now calls C6b "a blocker in
the recommendation and a known issue by the user's verdict", so the phase directory is consistent; the upstream text is
unchanged. The `eol_note:` frontmatter key is an addition to the fixed VERDICT format (the guards read only `verdict:`
and `eol_character:`, both unchanged in shape).

## Verification

- Task 3 automated check: one valid `verdict:` line, `decided_by: user`, `eol_character`, `recommended`, `decided_at`
  all valid; `sed -n 's/^verdict: //p'` prints `supported`; the frontmatter parses as YAML (js-yaml).
- Task 1 checks re-run after the edits: sections present, every C/V/W row class is one of the four values.
- Privacy check: no document in the phase directory carries the Windows user name or a `C:\Users\<name>` path.
- `git log -1 --name-only` for f9a40f84 lists only files in `.planning/phases/129-intellij-verdict/`.

## Self-Check: PASSED

- FOUND: .planning/phases/129-intellij-verdict/129-VERDICT.md
- FOUND: .planning/phases/129-intellij-verdict/129-EVALUATION.md
- FOUND: .planning/phases/129-intellij-verdict/129-LSP4IJ-ISSUE-crlf-newtext.md
- FOUND: ee16ab3e, f9a40f84
