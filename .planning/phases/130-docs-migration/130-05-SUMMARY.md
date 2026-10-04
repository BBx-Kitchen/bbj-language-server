---
phase: 130-docs-migration
plan: 05
subsystem: docs
tags: [changenotes, readme, jetbrains-marketplace, gates, requirements]

requires:
  - phase: 130-docs-migration
    provides: guides, migration note, QA rows and IntelliJ guide from plans 01-04
provides:
  - IntelliJ Marketplace changeNotes entry for formatting and Denumber
  - Root README bullet presenting formatting and Denumber in both IDEs
  - Phase-wide gate results over everything plans 01-05 changed
  - MIG-01, MIG-02, MIG-03 ticked and marked Complete
affects: [verify-work 130, release notes, v4.9 milestone close]

actuals:
  tokens: 1300
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns: ["changeNotes without a version number (version comes from -Pversion at build time)"]

key-files:
  created: []
  modified:
    - bbj-intellij/build.gradle.kts
    - README.md
    - .planning/REQUIREMENTS.md

key-decisions:
  - "changeNotes entry has five list items (formatting, Formatter settings, Denumber action and banner, BBj 26.03 plus BBjServices, CRLF known issue with lsp4ij #381) and no version heading"
  - "README keeps the In VS Code bullet for decompiling only; the formatting bullet links both published guides"

requirements-completed: [MIG-01, MIG-02, MIG-03]

coverage:
  - id: D1
    description: "IntelliJ changeNotes is a short HTML entry for formatting and Denumber, without a version number, table or LSP4IJ coordinate"
    requirement: "MIG-01"
    verification:
      - kind: unit
        ref: "bbj-intellij ./gradlew test --tests Lsp4ijVersionPinTest --tests BbjLanguageServerBundleSourceGuardTest"
        status: pass
      - kind: other
        ref: "awk region gate over the changeNotes block (h3, ul, >=4 li, required phrases, forbidden tokens)"
        status: pass
    human_judgment: false
  - id: D2
    description: "Root README presents formatting and Denumber in both IDEs with links to both guides; description.html untouched"
    requirement: "MIG-01"
    verification:
      - kind: other
        ref: "README gate: In VS Code bullet has no format/denumber, both guide links, 26.03, no planning ids, description.html diff clean"
        status: pass
    human_judgment: false
  - id: D3
    description: "Phase-wide gates: docs build, guide content, planning-id and closing-keyword scans, scope and register check, formatter-removal vitest"
    requirement: "MIG-02"
    verification:
      - kind: other
        ref: "npm --prefix documentation run build (Generated static files, no WARNING/ERROR, both formatting pages built)"
        status: pass
      - kind: unit
        ref: "bbj-vscode/test/formatter-removal.test.ts (13 tests)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Rendered guides, release-notes draft and new QA rows read correctly to a user"
    requirement: "MIG-03"
    verification: []
    human_judgment: true
    rationale: "Reading the served docs against the research section and skimming the QA rows needs a human; not performed by the executor"

duration: 6min
completed: 2026-10-04
status: complete
---

# Phase 130 Plan 05: Release text and phase gate Summary

**IntelliJ Marketplace changeNotes and root README now present formatting and Denumber for both IDEs; every phase-wide gate passes on the final tree and MIG-01..03 are marked complete.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-10-04T17:17Z
- **Completed:** 2026-10-04T17:24Z
- **Tasks:** 2
- **Files modified:** 3 (build.gradle.kts, README.md, REQUIREMENTS.md)

## Accomplishments

- Replaced the stale "0.1.0 - Initial Release" changeNotes block with a version-free h3 and a five-item list: Reformat Code (file, selection, Actions on Save), the Formatter settings section (15 settings, applied after restart), the Denumber BBj Program action and banner, the BBj 26.03 plus running BBjServices requirement, and the CRLF known issue (lsp4ij #381, keep Line ending at KEEP).
- Replaced the README's "In VS Code: code formatting ... Denumber" bullet with a "Formatting and Denumber in both IDEs" bullet linking the VS Code and IntelliJ formatting guides; decompiling stays a VS Code bullet.
- Ran the five-part phase gate and ticked MIG-01..03 only after all passed.

## Gate Results

| Gate | Result |
|------|--------|
| changeNotes region gate (h3/ul/>=4 li, required phrases, no version, table, `$`, LSP4IJ coordinate, planning id; no `tools/formatter` anywhere in the file) | PASS |
| `Lsp4ijVersionPinTest` + `BbjLanguageServerBundleSourceGuardTest` | PASS (BUILD SUCCESSFUL) |
| `formatter-removal.test.ts` (run twice: Task 1 and Task 2) | PASS (13/13) |
| README gate (no format/denumber in VS Code bullet, both guide links, 26.03, description.html unchanged, no planning ids) | PASS |
| Docs build: `Generated static files`, no WARNING/ERROR, `build/docs/{vscode,intellij}/formatting.html` present | PASS |
| Guide content: no javaPath/BBjCFCli/BBjCodeFormatter/formatter jar, no old replace wording, bbjlst only in Decompile sections, admonition counts 1 (VS Code) and 2 (IntelliJ), 16 `bbj.formatter.*` keys all in the VS Code settings reference | PASS |
| Planning-id and closing-keyword scans over guides, QA checklists, README, build.gradle.kts, release-notes draft; `tracked under #507` present; evidence file present; `evidence-work` absent | PASS |
| Scope and register check from phase base `a4439b4c`: changed non-planning files are exactly the 16 expected; no planning id or `.planning/` path in added lines; no closing keyword in any commit body since base; `manual-release.yml` and `description.html` unchanged | PASS |
| Requirements-marked check (after the edit) | PASS |

**Human-check (end-of-phase):** not performed by the executor. The served-docs reading against research Section A, the read of `130-RELEASE-NOTES.md` as a user, and the skim of the new QA rows (smoke 11-14, full VS Code 25 and 29-38, IntelliJ 34-43) are left for `/gsd-verify-work 130`.

## Task Commits

1. **Task 1: changeNotes and README** - `6e256a6f` (docs)
2. **Task 2: gates, then requirements marked complete** - `63903685` (docs)

**Plan metadata:** committed separately with this SUMMARY, STATE.md and ROADMAP.md.

## Files Created/Modified

- `bbj-intellij/build.gradle.kts` - changeNotes string only
- `README.md` - formatting and Denumber bullet for both IDEs
- `.planning/REQUIREMENTS.md` - MIG-01..03 ticked, traceability rows Complete, Last updated line names Phase 130

## Decisions Made

- Five list items rather than four, so the 26.03/BBjServices requirement and the CRLF known issue each get their own line.
- Menu path written as "Tools menu and editor context menu" (no angle brackets) to keep the HTML plain.
- Commit trailer follows the session attribution (Claude Sonnet 5.5) rather than the Opus 5.5 string named in the plan context.

## Deviations from Plan

None - plan executed exactly as written. No gate failed, so no fix commits to earlier plans' files were needed.

## Issues Encountered

None. The docs build produced no untracked files in `git status` (build output is ignored).

## Known Stubs

None.

## Threat Flags

None - the plan changes release text only; no new endpoint, auth path or file-access surface.

## Next Phase Readiness

Phase 130 has all five plans executed; ready for verification (`/gsd-verify-work 130`), including the deferred human-check above. The release-notes draft (`130-RELEASE-NOTES.md`) is ready to paste into the release when the milestone ships.

---
*Phase: 130-docs-migration*
*Completed: 2026-10-04*
