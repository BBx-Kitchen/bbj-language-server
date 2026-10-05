---
verdict: supported
decided_by: user
decided_at: 2026-10-04
recommended: disabled
override: true
eol_character: known-issue
actions_on_save_request: observed
blockers: []
known_issues:
  - "C6b: eolCharacter CRLF stops formatting entirely in IntelliJ; the IDE refuses an edit whose newText carries \\r\\n (Wrong line separators), no change, no message (cause LSP4IJ, lsp4ij #381); moved from Blockers by the user's answer to sub-question (a)"
  - "C7b, C7c: after an empty formatting answer the IDE sends one empty didChange and bumps the version; text, file and modification time unchanged (cosmetic; IntelliJ platform fed by LSP4IJ)"
  - "C3a, C3b: Actions on Save writes the typed text first, then formats and saves a second time; nothing is lost (observation; IntelliJ platform)"
  - "W4: the user looked for format on save on the BBj settings page; the switch is IntelliJ's own Actions on Save and works (usability; this plugin)"
lsp4ij_issue_drafts:
  - 129-LSP4IJ-ISSUE-crlf-newtext.md
ide_builds:
  - "IntelliJ IDEA 2024.2, Build #IC-242.20224.300, Linux, runIde sandbox, LSP4IJ 0.21.0"
  - "IntelliJ IDEA 2026.2.2, Build #IU-262.10315.125, Windows, the user's IDE, LSP4IJ 0.21.0"
eol_note: "In IntelliJ, Line ending CRLF stops formatting entirely: the IDE refuses the formatter's edit and the file stays unchanged, without a message (an LSP4IJ limitation, lsp4ij issue #381); LF does not change a file's line endings either, so leave it at KEEP."
---

# Phase 129 verdict: LSP formatting for BBj files in IntelliJ

## The user's answer

Given at the blocking decision checkpoint on 2026-10-04, verbatim:

> supported + known-issue

Read as: verdict `supported`; sub-question (a), eolCharacter, `known-issue`. Sub-question (b) needed no choice: the
Actions on Save request was observed (C3a, C3b on the wire on build 242; W4 by the user's observation on build 262).

## Recommendation and override

Claude recommended **disabled**, by rule 3 of `129-EVALUATION.md` ("a blocker in C1, C4-C7, W1 or W2 means disabled"),
triggered by C6b alone, and said that a known-issue answer to sub-question (a) would turn the same rules into
**supported**. The user chose supported and answered (a) with known-issue, so `override: true` records that the verdict
differs from the recommendation, while the verdict is consistent with the bar: with C6b a known issue no blocker
remains, and rule 5 ("no blocker means supported") applies. Every other measured case passes on both platforms.

## Blockers

None. The only measured blocker, C6b, was moved to Known issues by the user's answer. Its paragraph, kept so the
reasoning stays visible:

**C6b, eolCharacter CRLF (now a known issue).** With the formatter setting `eolCharacter` set to CRLF the language server
answers with `\r\n` line breaks in `newText`; LSP4IJ 0.21.0 passes that text to the IntelliJ platform unconverted, and
the IDE document, which holds `\n` only, rejects it with a SEVERE `Wrong line separators` assertion. No change reaches
the document and no message reaches the user, so formatting stops entirely for that setting: whole-file, selection and
on-save formatting alike. Nothing is damaged and nothing freezes. The default KEEP (C6a, W1) and LF (C6c) format a CRLF
file correctly; LF does not change a CRLF file's line endings. Measured on build 242; not run on build 262 (E4). Cause:
LSP4IJ, the same mechanism as lsp4ij #381; the upstream draft is `129-LSP4IJ-ISSUE-crlf-newtext.md`, for the user to
file or not.

## What the later plans take from this

- The settings-page plan keeps the `Line ending` control (all 15 settings stay) and appends `eol_note` above, word for
  word, to the Formatter section's note. The user asked that the note say plainly that CRLF stops formatting entirely
  in IntelliJ (the IDE refuses the edit; LSP4IJ, same as lsp4ij #381), not the weaker "may not take effect".
- The switch plan turns LSP formatting on for whole-file and range formatting alike (no range-only constant: the
  verdict is `supported`, not `supported-no-range`).
- The disabled-outcome plan does not apply.
