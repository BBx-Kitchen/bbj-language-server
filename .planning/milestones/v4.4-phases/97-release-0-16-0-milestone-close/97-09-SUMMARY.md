---
phase: 97-release-0-16-0-milestone-close
plan: 09
subsystem: release-engineering
tags: [release, github-release, release-notes, v4.4]
requirements: [REL-01]
status: complete
dependency-graph:
  requires: ["97-08 (release 0.16.0 published, evidence recorded)"]
  provides: ["v0.16.0's GitHub Release body is a plain-language curated summary, maintainer-approved and applied, with GitHub's own contributor-credit block kept alongside it"]
  affects: ["97-10 (smoke checklist reads the released body)", "97-11 (closing comments cite the same shipped-vs-requirement-text framing recorded here for #589)"]
tech-stack:
  added: []
  patterns: ["capture-before-edit: the live release body is saved verbatim before any `gh release edit`, so an edit can always be diffed against or reverted to its pre-edit state"]
key-files:
  created: []
  modified:
    - .planning/phases/97-release-0-16-0-milestone-close/97-RELEASE-NOTES.md
decisions:
  - "Maintainer approved the curated draft verbatim at the Task 2 blocking-human checkpoint (2026-09-20, \"Approve + keep auto block (Recommended)\"), with one deviation from the plan's literal Task 3 instruction: GitHub's auto-generated block (`## What's Changed`, `## New Contributors`, `Full Changelog`) is kept rather than replaced, so @Tiancheng-Xu's and @StephanWald's PR credit stays visible. Reason given and accepted: contributor credit."
  - "Applied body order: curated summary -> existing auto-generated block (verbatim) -> `## Installation` block (verbatim, trailing `---` rule dropped since it no longer terminates the document)."
  - "The draft's hard-wrapped lines were unwrapped to one line per paragraph/bullet before applying, since GitHub renders a bare newline inside a release body as a visible line break; wording is unchanged from the approved draft."
  - "Task 3 (`gh release edit`) was executed by the orchestrator after the maintainer's approval, not by an executor task inside this plan; this continuation performed only read-only re-verification and documentation of that already-applied edit."
  - "REL-01 deliberately NOT marked complete — smoke verification (97-10) and issue closing (97-11) remain open."
  - "Drafter's finding carried forward to 97-11: REQUIREMENTS.md's EM-02 text asks the EM login action to gate on \"project and server-readiness state\", but the shipped `BbjEMLoginAction.update()` gates on project presence only (`ActionUpdateThread.BGT`), pinned by `EmLoginEnablementSourceGuardTest` and recorded as a Phase 94 decision in STATE.md. The release notes describe the shipped code, not EM-02's literal wording; plan 97-11's #589 closing comment must say the same."
metrics:
  duration: "~20min (continuation only; Task 1 draft and Task 2 approval, and the orchestrator's Task 3 edit, completed in a prior session)"
  completed: 2026-09-20
actuals:
  tokens: 2400
  tasks: 1
  commits: 2
---

# Phase 97 Plan 09: Curated v0.16.0 Release Notes Summary

The v0.16.0 GitHub Release now reads as plain-language release notes for a BBj developer — nine
user-visible fixes, one line on ten internal consolidations, the Color Scheme page removal, the
Node.js diagnosis/fallback change, and two folded-todo improvements — sitting alongside (not
replacing) GitHub's own auto-generated commit list and contributor credit, per the maintainer's
approval.

## What Happened

This continuation resumed after Task 1 (draft, commit `4bc726df`) and Task 2 (the maintainer's
blocking-human approval) had completed in a prior session, and after the orchestrator itself had
already run Task 3's `gh release edit` following that approval. This continuation's job was
documentation only: re-verify the applied state read-only, record what was applied and why it
deviates from the plan's literal wording, write this summary, and update STATE/ROADMAP without
marking REL-01 complete.

**Read-only re-verification performed:**

- `gh release view v0.16.0 --repo BBx-Kitchen/bbj-language-server --json body,tagName,assets,isDraft,isPrerelease`
  — no write command run.
- The live body was byte-compared (`cmp`) against the applied-text scratch file the orchestrator
  used: **byte-identical**, 4,628 bytes each.
- `## Installation` appears exactly once in the live body; its VS Code / IntelliJ IDEA paragraphs
  match the workflow's originally-captured install block byte-for-byte (only the original's
  trailing `---` divider is absent, which is intended — it no longer terminates the document).
- Grepped the live body for closing keywords (`close(s)`/`fix(es)`/`resolve(s)` + `#NNN`) — none
  found.
- Grepped the live body for planning identifiers (`D-NN`, `C-NN`, `CR-NN`,
  `COMP-`/`PLAT-`/`EM-`/`IOP-`/`REL-` + digits, `9[3-7]-NN` plan tokens) — none found.
- Grepped the live body for crash-detection / auto-restart / status-transition-log mentions
  (D-22's exclusion) — none found.
- `tagName: v0.16.0`, `isDraft: false`, `isPrerelease: false`.
- Both release assets match `97-RELEASE-EVIDENCE.md` and the plan 08 record exactly: two assets,
  `bbj-intellij-0.16.0.zip` (sha256 `ce2561aaae4fbe3ca05c1f7631a3c44c234bfa54d129882838ebfbe40f33629a`)
  and `bbj-lang-0.16.0.vsix` (sha256 `0fa7ce1fc56097f97a2e963f77fda24353512304afa9ddefa1c23603230c2dc8`)
  — no addition, removal, or hash drift from the pre-edit state.

**Documentation written:** `97-RELEASE-NOTES.md` gained an "As applied (2026-09-20)" section
recording the deviation (auto block kept), the exact text supplied to `--notes-file`, the
read-back verification results above, and the EM-02/#589 drafter's finding for plan 97-11 to
reuse.

## Deviations from Plan

### 1. Maintainer-directed: auto-generated block kept, not replaced

- **Found during:** Task 2's blocking-human checkpoint.
- **What the plan said:** Task 3's action text called for the approved text to become the release
  body outright — no mention of preserving the workflow's auto-generated commit list.
- **What the maintainer chose:** "Approve + keep auto block (Recommended)" — the curated summary
  is approved verbatim, but GitHub's own `## What's Changed` / `## New Contributors` /
  `Full Changelog` block is kept, placed between the curated summary and the Installation block,
  so nothing already public (in particular @Tiancheng-Xu's first-contribution credit) is removed.
- **Applied by:** the orchestrator, per the maintainer's explicit approval, before this
  continuation was spawned.
- **Verified:** read-back above confirms the auto block, curated summary, and Installation block
  are all present in the live body in that order, with no planning identifier, closing keyword, or
  crash/auto-restart mention anywhere in it.

### 2. Line unwrapping (cosmetic, non-substantive)

- **Found during:** applying the approved draft.
- **Issue:** the draft in `97-RELEASE-NOTES.md` hard-wraps paragraph and bullet text across
  multiple source lines for readability in this file; GitHub renders a bare single newline inside
  a release body as a visible line break, which would have fragmented paragraphs and bullets on
  the live page.
- **Fix:** each paragraph/bullet was unwrapped to a single line before being written to the
  `--notes-file` scratch file. Wording is unchanged from the approved draft.

### 3. Task 3 executed by the orchestrator, not an executor task

- **Found during:** hand-off into this continuation.
- **What happened:** after the maintainer's Task 2 approval, the orchestrator itself ran the
  single `gh release edit` command (rather than spawning a fresh executor to run Task 3), per the
  plan's own instruction to apply exactly the approved text via a notes file. This continuation's
  job was to re-verify that already-applied state read-only and document it — no further `gh`
  write command was run here.

---

**Total deviations:** 3 (1 maintainer-directed scope narrowing, 1 cosmetic formatting fix, 1
process note on which agent ran the write command). No auto-fix under Rules 1-4 was needed — this
plan is documentation and a single approved edit, not code.
**Impact on plan:** None of the plan's `must_haves` or `prohibitions` were violated: the install
block survived verbatim, no planning identifier or crash/auto-restart claim reached the public
body, and nothing was applied before the maintainer's explicit approval. The auto-block deviation
is a strict addition (more content kept, none of the curated content changed or removed), not a
scope reduction.

## Issues Encountered

None.

## Known Stubs

None.

## Threat Flags

None — this plan only edits the release body's wording; no new network endpoint, auth path, or
schema surface was introduced. The threat register's T-97-29/30/31 mitigations (planning-identifier
grep, asset/install-block read-back, recorded verbatim approval before any edit) were all exercised
and held, per the read-only re-verification above.

## Self-Check: PASSED

- `.planning/phases/97-release-0-16-0-milestone-close/97-RELEASE-NOTES.md` contains the "As
  applied (2026-09-20)" section — FOUND (added in this continuation).
- Commit `26af40cc` (release-notes update) exists in `git log --oneline` — FOUND.
- `gh release view v0.16.0 --json body` returns a body byte-identical to the text recorded under
  "As applied" — FOUND (cmp exit 0).
- `gh release view v0.16.0 --json assets` still lists exactly the two assets recorded in
  `97-RELEASE-EVIDENCE.md`, unchanged hashes — FOUND.

## Next Phase Readiness

97-10 (pre-filled smoke checklist against the released artifacts) and 97-11 (21 closing comments,
issue closure, milestone close) remain open — REL-01 is not yet complete. 97-11's #589 closing
comment must reuse this plan's EM-02-vs-shipped-behavior framing recorded above, not restate EM-02's
literal requirement text.
