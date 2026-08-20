# Public `.planning/` disclosure audit — 2026-08-20

Scope: all 498 tracked files under `.planning/`, scanned with per-advisory signature terms for
the eight unpublished draft advisories in the v4.1 milestone.

## Result

**Four of the eight advisories were already documented in public planning artifacts — most of
them since February 2026, six months before the advisories were drafted.** The embargo
mechanisms added on 2026-08-20 (private forks, the pre-push hook) protect against *new*
disclosure; they do not retroactively cover this.

| Advisory | Verdict | Evidence |
|----------|---------|----------|
| `89r9` | **Disclosed** since 2026-02-17 | A quick-task plan showed the publishing token passed as a `-P` Gradle property on the command line — the mechanism the advisory describes. |
| `33x9`, `xxp5` | **Disclosed** since 2026-02-20 | Phase-31 plan/summary/verification recorded credential and token positional arguments read from `ARGV`, and confirmed the wiring end to end. |
| `c4hw` | **Disclosed** since 2026-02-03 | The v1.0 integration check documented the runtime-resolution chain including its final bare fallback, and the behaviour when earlier steps fail. |
| `9gv3` | Partially implied | The same integration check documented a download-and-cache path with no verification step recorded anywhere in an otherwise exhaustive audit. |
| `5f22` | Low | Feature-level data flow (a configurable home path feeding the compiler invocation) is documented, but not the absence of validation. The setting is public in `package.json` regardless. |
| `5vrp` | Was disclosed 2026-08-20 (mine) | A research file named the file and the checksum property to add, which states the property is absent. Untracked same day. |
| `9gv3` | Was disclosed 2026-08-20 (mine) | Same research file, for archive verification. Untracked same day. |
| `h43f` | Clean | No hits. |

## Action taken

Untracked from public `main` (kept on disk; already present in every private fork, since those
forks were created from this repository and carry its history):

- `.planning/milestones/v1.0-INTEGRATION-CHECK.md`
- `.planning/milestones/v3.1-phases/31-extension-settings-file-types/31-03-PLAN.md`
- `.planning/milestones/v3.1-phases/31-extension-settings-file-types/31-03-SUMMARY.md`
- `.planning/milestones/v3.1-phases/31-extension-settings-file-types/31-VERIFICATION.md`
- `.planning/quick/14-fix-manual-release-workflow-pass-version/14-PLAN.md`
- `.planning/quick/9-automate-jetbrains-marketplace-publishin/9-SUMMARY.md`
- `.planning/quick/260820-hxg-fix-ghsa-p5f3-9456-9pcx-replace-unescape/260820-hxg-PLAN.md`
- `.planning/research/SUPPLY-CHAIN.md`, `.planning/research/SECRETS-AND-EXEC.md`

All are listed in `.git/info/exclude` so they cannot be re-staged by accident.

## What untracking does and does not achieve

It removes them from the current tree, so a casual browser of the repository does not find
them. **It does not remove them from history.** Anything committed before today has been
publicly clonable for up to six months and may be present in forks, clones, caches and search
indexes outside this project's control.

## Consequence for the v4.1 milestone

The premise that these eight surfaces are undisclosed does not hold for `89r9`, `33x9`, `xxp5`
and `c4hw`. That does not change what the fixes must do, but it does change the risk calculus
for **sequencing**: for those four, embargo is no longer buying much, so fix-and-publish speed
matters more than secrecy. The four genuinely-undisclosed ones (`5f22`, `5vrp`, `9gv3`, `h43f`)
still benefit from the private-fork flow.

Worth deciding explicitly rather than assuming the embargo is uniformly effective.

## Method note

The first two passes of this audit missed real disclosures because they grepped for the
advisories' own wording rather than for the underlying concept. Both misses were of the same
kind: content that never uses the advisory's vocabulary but states the mechanism plainly
(`ARGV(2)`, a `-P` token property, a documented fallback chain). Structure and specificity leak
regardless of tone or framing.
