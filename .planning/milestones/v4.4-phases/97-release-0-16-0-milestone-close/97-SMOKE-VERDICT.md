# v0.16.0 Smoke Verdict

## Verdict sentence

Release `v0.16.0` is recorded as **PASS** on the maintainer's reply `"pass"` (2026-09-20), tied to
artifact `bbj-lang-0.16.0.vsix` sha256 `0fa7ce1fc56097f97a2e963f77fda24353512304afa9ddefa1c23603230c2dc8`
(2,631,401 bytes, installed from the VS Code Marketplace, which listed 0.16.0), and
`bbj-intellij-0.16.0.zip` sha256 `ce2561aaae4fbe3ca05c1f7631a3c44c234bfa54d129882838ebfbe40f33629a`
(1,159,957 bytes, installed from the GitHub Release asset per D-14), both built from workflow run
`35524399880` on source commit `6101a6b6bdaf8b93d6de32b7f8d2fbd92d0ce464` (tag `v0.16.0`).

## Per-row result table

Source: `QA/test-runs/2026-09-20-smoke-test-PASS.md`.

**Basis for the marks:** the maintainer's reply was the single word `"pass"` — an overall verdict,
not individually confirmed per-row marks. All ten rows are recorded `[x]` on the basis of that
overall reply, and the record says so explicitly.

| # | Feature | Result |
|---|---------|--------|
| 1 | Extension Loads (VS Code) | [x] |
| 2 | Syntax Highlighting | [x] |
| 3 | Code Completion (BBj) | [x] |
| 4 | Code Completion (Java) | [x] |
| 5 | Diagnostics | [x] |
| 6 | IntelliJ Basic | [x] |
| 7 | Run Program (VS Code) | [x] |
| 8 | Run Program (IntelliJ) | [x] |
| 9 | Language Server Exits (#232) | [x] |
| 10 | No Runaway CPU (#232) | [x] |

**Test Run Result block:** PASS.

**Test Information (source-labeled, per the maintainer's reply):**
- Date: 2026-09-20
- Tester: StephanWald (the maintainer; GitHub handle — not independently stated as a display name)
- OS: macOS (not independently stated in this reply; evidenced by the maintainer's Round 1 UAT log
  paths recorded elsewhere in this phase, `/Users/…/Library/Logs/JetBrains/IntelliJIdea2026.2/`, per
  `97-UAT-ARTIFACTS.md`)
- VS Code Version: not stated
- IntelliJ Version: IntelliJ IDEA 2026.2 (same source as OS, above)
- Extension Version: 0.16.0

**Additional 0.16.0-specific glance checks** (no BBj page under Color Scheme; no
`bbjcplAvailability` WARN): not reported on by the maintainer — recorded as **not reported**, not
as passed or failed.

## Recorded criterion override (roadmap success criterion 3)

The roadmap's third success criterion states that the published artifacts install from *their
marketplaces*. This run meets that criterion **as written for the VS Code side** — the `.vsix` was
installed from the VS Code Marketplace, which listed 0.16.0. For the **JetBrains side**, the
criterion is met **via the recorded override** decided in D-14: a green `publish-intellij` job
counts as live, so the IntelliJ side was installed from `bbj-intellij-0.16.0.zip` attached to the
v0.16.0 GitHub Release (the same bytes `publish-intellij` uploaded) rather than from the JetBrains
Marketplace, whose review queue was not waited on. **This phase's verification must not report
criterion 3 as met verbatim — it is met as written for VS Code and met via the recorded override for
JetBrains.**

## Classification and consequence (D-17)

The maintainer's reply was an overall `"pass"` with no per-row failures and no findings. D-17 makes
the maintainer the classifier of any smoke *finding*; since no finding was reported, there is
nothing to classify. Recorded as: **no findings — classification not applicable.**

Consequence: 0.16.0 stands as shippable. No GitHub issue was opened as a result of this smoke run.
Milestone #7 is unchanged by this plan — read back at 19 open / 2 closed
(`gh api repos/BBx-Kitchen/bbj-language-server/milestones/7`), matching the D-23 expectation. The
closing pass (19 issues to comment-and-close, 2 to comment only, then milestone #7 close) is plan
97-11, not this plan.

## What was deliberately not done

No download-and-compare of the Marketplace VSIX was performed. The job graph (`verify` gate before
either publish job, both publish jobs downloading from `verify`'s own artifacts, `create-release`
downloading the same artifacts rather than rebuilding) plus the independently recomputed asset
hashes recorded in `97-RELEASE-EVIDENCE.md` §§ 4-6 are the artifact-identity argument; this smoke
verdict is tied to those same recorded hashes rather than re-deriving them.
