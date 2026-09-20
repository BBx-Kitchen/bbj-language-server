# Release 0.16.0 — Evidence Record

Run dispatched by the maintainer (`StephanWald`) from the Actions UI, `workflow_dispatch`, not by
Claude. This record is built entirely from `gh run view`/`gh release view`/`git`/`gh api` read-back
and independently recomputed hashes — not from a summary claim.

## 1. Run identity

| Field | Value |
|---|---|
| Run ID | `35524399880` |
| URL | https://github.com/BBx-Kitchen/bbj-language-server/actions/runs/35524399880 |
| Event | `workflow_dispatch` |
| Actor / triggering_actor | `StephanWald` |
| Head branch | `main` |
| Head SHA | `5f03a0a85253f682045c0c8519a35992a77ace48` |
| Created | `2026-09-20T16:59:01Z` |
| Completed (last job) | `2026-09-20T17:09:28Z` |
| Overall conclusion | `success` |

`Validate version input` step (job `verify`) printed:
```
Target version: 0.16.0
Current version in package.json: 0.15.5
✅ Version 0.16.0 is valid and greater than 0.15.5
```
The dispatched version is exactly `0.16.0`, matching D-11's requirement.

## 2. Job graph — read back, not assumed

Source: `gh run view 35524399880 --json jobs`.

| Job | Conclusion | Started (UTC) | Completed (UTC) | Duration |
|---|---|---|---|---|
| `verify` | success | 2026-09-20T16:59:05Z | 2026-09-20T17:06:32Z | 7m27s |
| `publish-intellij` | success | 2026-09-20T17:06:34Z | 2026-09-20T17:09:06Z | 2m32s |
| `publish-vscode` | success | 2026-09-20T17:06:34Z | 2026-09-20T17:06:58Z | 24s |
| `tag-release` | success | 2026-09-20T17:09:08Z | 2026-09-20T17:09:15Z | 7s |
| `create-release` | success | 2026-09-20T17:09:17Z | 2026-09-20T17:09:27Z | 10s |

`verify` completed at `17:06:32Z`; both `publish-vscode` and `publish-intellij` started at
`17:06:34Z` — after `verify` finished, confirming the single-verification-gate criterion from the
run's own timestamps, not an assumption from the workflow's `needs:` graph alone. `tag-release`
started at `17:09:08Z`, after both publish jobs completed (`17:06:58Z` and `17:09:06Z`).
`create-release` started at `17:09:17Z`, after `tag-release` completed at `17:09:15Z`. Every gate
in `manual-release.yml`'s `needs:` chain held in the observed timing, not merely on paper.

All five jobs green. No job was red; the reconciliation runbook was not opened.

## 3. Released commit and tag

```
git -C /home/coder/repos/bbj-language-server fetch origin --tags
git -C /home/coder/repos/bbj-language-server rev-parse v0.16.0^{commit}
git -C /home/coder/repos/bbj-language-server ls-remote --tags origin v0.16.0
```

Observed:
- `origin/main` moved `5f03a0a8..6101a6b6` (fetch output).
- `v0.16.0` -> `6101a6b6bdaf8b93d6de32b7f8d2fbd92d0ce464` (`rev-parse` and `ls-remote` agree).
- `git log -1 v0.16.0`: `6101a6b6… Release version 0.16.0` by `GitHub Actions <actions@github.com>`
  (the `tag-release` job's bot commit, exactly as `manual-release.yml:228-242` describes).
- Parent of `v0.16.0` is `5f03a0a8… Bump preview version` — the same SHA the precondition report
  (item 4) and the maintainer's hand-check were performed against. The release commit sits directly
  on top of the hand-checked tree with no unrelated commits in between.

The released commit SHA (the version-bump commit `tag-release` pushed) is
**`6101a6b6bdaf8b93d6de32b7f8d2fbd92d0ce464`**, tagged **`v0.16.0`**.

## 4. GitHub Release

```
gh release view v0.16.0 --repo BBx-Kitchen/bbj-language-server --json tagName,name,url,assets,publishedAt,targetCommitish
```

| Field | Value |
|---|---|
| Tag | `v0.16.0` |
| Name | `v0.16.0` |
| URL | https://github.com/BBx-Kitchen/bbj-language-server/releases/tag/v0.16.0 |
| Target | `main` |
| Published at | `2026-09-20T17:09:25Z` |

Assets (from `gh release view` — GitHub's own reported digest, then independently reconfirmed by
downloading and hashing below):

| Asset | Size (bytes) | GitHub-reported sha256 |
|---|---|---|
| `bbj-intellij-0.16.0.zip` | 1,159,957 | `ce2561aaae4fbe3ca05c1f7631a3c44c234bfa54d129882838ebfbe40f33629a` |
| `bbj-lang-0.16.0.vsix` | 2,631,401 | `0fa7ce1fc56097f97a2e963f77fda24353512304afa9ddefa1c23603230c2dc8` |

## 5. Independently recomputed asset hashes (D-16)

Downloaded read-only to the session scratch dir and hashed with `sha256sum`:

```
gh release download v0.16.0 --repo BBx-Kitchen/bbj-language-server \
  -D /tmp/claude-1000/-home-coder-repos-bbj-language-server/9c818dc6-ad5d-4832-b308-6a1fc6561169/scratchpad/release-0.16.0/
sha256sum <downloaded files>
```

| File | Size (bytes) | sha256 (recomputed) | Matches GitHub digest |
|---|---|---|---|
| `bbj-intellij-0.16.0.zip` | 1,159,957 | `ce2561aaae4fbe3ca05c1f7631a3c44c234bfa54d129882838ebfbe40f33629a` | yes |
| `bbj-lang-0.16.0.vsix` | 2,631,401 | `0fa7ce1fc56097f97a2e963f77fda24353512304afa9ddefa1c23603230c2dc8` | yes |

**Verdict-with-artifact-identity sentence (97-PATTERNS.md § "96-08 UAT-record shape" shape):**
Release `v0.16.0` is recorded as published on the maintainer's own dispatch of run `35524399880`,
tied to artifact `bbj-lang-0.16.0.vsix` sha256 `0fa7ce1fc56097f97a2e963f77fda24353512304afa9ddefa1c23603230c2dc8`
(2,631,401 bytes) and `bbj-intellij-0.16.0.zip` sha256
`ce2561aaae4fbe3ca05c1f7631a3c44c234bfa54d129882838ebfbe40f33629a` (1,159,957 bytes), both built from
source commit `6101a6b6bdaf8b93d6de32b7f8d2fbd92d0ce464` (tag `v0.16.0`, parent `5f03a0a8…`, the
hand-checked tree).

## 6. Run-artifact identity cross-check

Downloaded the run's three `verify`-job artifacts (`retention-days: 1`, so captured now) to
`/tmp/claude-1000/-home-coder-repos-bbj-language-server/9c818dc6-ad5d-4832-b308-6a1fc6561169/scratchpad/release-0.16.0-run-artifacts/`
via `gh run download 35524399880 …` and hashed each:

| Run artifact | sha256 |
|---|---|
| `language-server/main.cjs` | `133bb4315d61501bafe2339d9e5bfce335d881a3723998331447acb6459445c3` |
| `vscode-extension/bbj-lang-0.16.0.vsix` | `0fa7ce1fc56097f97a2e963f77fda24353512304afa9ddefa1c23603230c2dc8` |
| `intellij-plugin/bbj-intellij-0.16.0.zip` | `ce2561aaae4fbe3ca05c1f7631a3c44c234bfa54d129882838ebfbe40f33629a` |

**The Release `.vsix` is byte-identical to the run's `vscode-extension` artifact**
(`0fa7ce1f…` = `0fa7ce1f…`) — both are the artifact `verify`'s "Package VS Code extension" step
produced; `create-release` downloads this same artifact (`manual-release.yml:253-257`) and never
rebuilds it.

**The Release `.zip` is also byte-identical to the run's `intellij-plugin` artifact**
(`ce2561aa…` = `ce2561aa…`) — `create-release` downloads the `intellij-plugin` artifact
(`manual-release.yml:259-263`), which is the one `verify`'s "Build IntelliJ plugin" /
"Verify plugin compatibility" steps produced and uploaded; it is not rebuilt for the Release.

**What this does *not* show, per RESEARCH.md Pitfall 4:** `publish-intellij` does **not** download
the `intellij-plugin` artifact — its only build step is a fresh
`./gradlew buildPlugin -Pversion=0.16.0` on whatever tree that job's own checkout produces
(`manual-release.yml:132-140` for the original build, `184-207` for `publish-intellij`'s own
rebuild). The zip bytes uploaded to the JetBrains Marketplace by `publish-intellij` were never
downloaded or hashed here (JetBrains does not expose the uploaded binary for read-back), so this
record cannot state that the Marketplace-uploaded bytes are identical to the Release `.zip` — only
that the job which produced them (`Publish to JetBrains Marketplace`) succeeded end to end
(`BUILD SUCCESSFUL in 2m 24s`, task `:publishPlugin` executed, job conclusion `success`).

## 7. Marketplace state (read-only)

**VS Code Marketplace.** The `publish-vscode` job log itself confirms the publish:
```
Publishing 'basis-intl.bbj-lang v0.16.0'...
Published basis-intl.bbj-lang v0.16.0.
```
A subsequent read via `npx --yes @vscode/vsce show basis-intl.bbj-lang --json` (run from
`bbj-vscode/`, `2026-09-20T17:1x` UTC, a few minutes after publish) still listed `0.15.5` as the
newest version in the returned version list — `0.16.0` had not yet propagated to the Marketplace's
query API at read time. The job's own "Published basis-intl.bbj-lang v0.16.0." line is authoritative
for this record; the `vsce show` lag matches the job's own printed caveat, "Extension URL (might
take a few minutes)". Re-querying later is not required for this evidence record — the workflow's
publish step succeeded and is the fact being recorded.

**JetBrains Marketplace.** Per D-14, a green `publish-intellij` job counts as live for this phase;
the review queue is not waited on. The job's `Publish to JetBrains Marketplace` step log shows:
```
> Task :publishPlugin
BUILD SUCCESSFUL in 2m 24s
24 actionable tasks: 24 executed
```
Step conclusion: `success` (`gh api …/jobs/106115008416` step `Publish to JetBrains Marketplace`,
`started_at 17:06:39Z`, `completed_at 17:09:05Z`). Recorded as: **upload accepted** — JetBrains
Marketplace state is not independently queried further per D-14; the IntelliJ smoke in the next plan
will run against the Release's own `.zip` (identity in §5-6 above), not a Marketplace install.

## 8. Milestone #7 state (D-23)

```
gh api repos/BBx-Kitchen/bbj-language-server/milestones/7
```
Observed: `"open_issues": 19, "closed_issues": 2"` — matches the expected 19 open / 2 closed from
D-23 (the squash-merge in 97-06 auto-closed #621/#594 via commit-message closing keywords; nothing
in this plan changed milestone state further).

## 9. Reconciliation runbook

Not opened. No job was red. No autonomous retry, re-run, or re-dispatch occurred.

## 9a. Raw sha256 lines (for automated verification)

`bbj-lang-0.16.0.vsix`:
```
0fa7ce1fc56097f97a2e963f77fda24353512304afa9ddefa1c23603230c2dc8
```

`bbj-intellij-0.16.0.zip`:
```
ce2561aaae4fbe3ca05c1f7631a3c44c234bfa54d129882838ebfbe40f33629a
```

## 10. Summary verdict

Release `v0.16.0` published to both marketplaces behind the single `verify` gate, tagged and
released, with the tag, commit, and both asset hashes on record above. REL-01 is **not** marked
complete by this plan — release notes, smoke verification, and closing remain (per 97-08-PLAN.md's
scope).
