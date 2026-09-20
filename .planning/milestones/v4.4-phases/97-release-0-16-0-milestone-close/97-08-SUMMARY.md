---
phase: 97-release-0-16-0-milestone-close
plan: 08
subsystem: release-engineering
tags: [release, ci, manual-release-workflow, jetbrains-marketplace, vscode-marketplace]
requirements: [REL-01]
status: complete
dependency-graph:
  requires: ["97-07 (green Preview dress-rehearsal, both IDEs approved)"]
  provides: ["v0.16.0 published to both marketplaces, tagged, released"]
  affects: ["97-09/97-10 (release notes, smoke verification against the release's own zip)"]
tech-stack:
  added: []
  patterns: ["read-back evidence over summary claims; independent sha256 recomputation on downloaded assets"]
key-files:
  created:
    - .planning/phases/97-release-0-16-0-milestone-close/97-RELEASE-PRECONDITIONS.md
    - .planning/phases/97-release-0-16-0-milestone-close/97-RELEASE-EVIDENCE.md
  modified: []
decisions:
  - "Release 0.16.0 dispatched by the maintainer (StephanWald) from the Actions UI at 2026-09-20T16:59:01Z, run 35524399880, workflow_dispatch, on origin/main HEAD 5f03a0a8 — the hand-checked tree from 97-07. Claude dispatched nothing; all seven preconditions in 97-RELEASE-PRECONDITIONS.md were PASS and independently re-verified against the same SHA the run used."
  - "All five manual-release.yml jobs (verify, publish-vscode, publish-intellij, tag-release, create-release) completed success. verify finished at 17:06:32Z; both publish jobs started at 17:06:34Z (after verify), confirming the single-verification-gate criterion from the run's own timestamps, not the needs: graph alone. Reconciliation runbook was not opened."
  - "Released commit 6101a6b6bdaf8b93d6de32b7f8d2fbd92d0ce464 (tag v0.16.0, parent 5f03a0a8), assets bbj-lang-0.16.0.vsix (sha256 0fa7ce1f…, 2,631,401 bytes) and bbj-intellij-0.16.0.zip (sha256 ce2561aa…, 1,159,957 bytes), both independently downloaded and rehashed, matching GitHub's reported digests exactly."
  - "Both Release assets are byte-identical to the run's own verify-job artifacts (vscode-extension, intellij-plugin) — create-release downloads rather than rebuilds. publish-intellij's actual JetBrains upload is a separate Gradle rebuild (RESEARCH Pitfall 4) whose bytes were never independently confirmed identical to the Release zip — recorded as a known limitation, not resolved."
  - "VS Code Marketplace query API (vsce show) still listed 0.15.5 as newest a few minutes after publish; the publish-vscode job's own log line ('Published basis-intl.bbj-lang v0.16.0.') is the authoritative fact recorded, not the lagging query API — matches the job's own printed caveat about propagation delay."
  - "JetBrains publish recorded as 'upload accepted' per D-14 on the green publish-intellij job (BUILD SUCCESSFUL, :publishPlugin executed) — review queue not waited on."
  - "Milestone #7 confirmed at 19 open / 2 closed per D-23, unchanged by this plan."
  - "REL-01 deliberately NOT marked complete — release notes, smoke verification, and closing remain out of scope for this plan."
metrics:
  duration: "~15min (Task 3 continuation only; Task 1 and Task 2 completed in prior sessions)"
  completed: 2026-09-20
actuals:
  tokens: 9000
  tasks: 1
  commits: 1
---

# Phase 97 Plan 08: Watch and Record Release 0.16.0 Summary

Watched the maintainer-dispatched Manual Release run to completion and recorded every release
identity fact (run, job graph timing, tag, commit, both asset hashes, marketplace state) purely
from read-back evidence — no dispatch, retry, or write action performed by Claude.

## What Happened

This continuation resumed after Task 1 (precondition report, commit `de340dcf`) and Task 2
(the `checkpoint:decision` blocking-human gate) had already completed — the maintainer dispatched
Manual Release `0.16.0` from the Actions UI themselves (run `35524399880`, `workflow_dispatch`,
actor `StephanWald`, `2026-09-20T16:59:01Z`, head SHA `5f03a0a8…`, the same tree the precondition
report and the maintainer's own hand-check had already confirmed).

Task 3 watched the run with `gh run watch 35524399880 --exit-status` to completion. All five jobs
in `manual-release.yml` succeeded:

| Job | Conclusion | Started | Completed |
|---|---|---|---|
| verify | success | 16:59:05Z | 17:06:32Z |
| publish-intellij | success | 17:06:34Z | 17:09:06Z |
| publish-vscode | success | 17:06:34Z | 17:06:58Z |
| tag-release | success | 17:09:08Z | 17:09:15Z |
| create-release | success | 17:09:17Z | 17:09:27Z |

The `Validate version input` step confirmed the dispatched version was exactly `0.16.0`
(`Target version: 0.16.0`, validated greater than the prior `0.15.5`). Both publish jobs started
only after `verify` completed, timestamp-confirming the single-verification-gate criterion rather
than assuming it from the workflow's `needs:` declarations.

The released commit is `6101a6b6bdaf8b93d6de32b7f8d2fbd92d0ce464` ("Release version 0.16.0" by
the GitHub Actions bot), tagged `v0.16.0`, sitting directly on top of the hand-checked
`5f03a0a8…` tree. Both GitHub Release assets were downloaded read-only to the session scratch
directory and independently hashed with `sha256sum`, confirming an exact match against GitHub's
own reported digests:

- `bbj-lang-0.16.0.vsix` — sha256 `0fa7ce1fc56097f97a2e963f77fda24353512304afa9ddefa1c23603230c2dc8`, 2,631,401 bytes
- `bbj-intellij-0.16.0.zip` — sha256 `ce2561aaae4fbe3ca05c1f7631a3c44c234bfa54d129882838ebfbe40f33629a`, 1,159,957 bytes

The run's own three `verify`-job artifacts were also downloaded (before their 24-hour retention
window closes) and cross-hashed: the Release `.vsix` and `.zip` are both byte-identical to the
run's `vscode-extension` and `intellij-plugin` artifacts respectively — `create-release` downloads
rather than rebuilds. The JetBrains-uploaded bytes, however, come from `publish-intellij`'s own
separate Gradle rebuild (it does not download the `intellij-plugin` artifact), so those bytes were
never independently confirmed identical to the Release zip — recorded explicitly as a known
limitation per the RESEARCH.md Pitfall 4 warning, not silently assumed away.

Marketplace state was recorded read-only: the VS Code Marketplace publish job's own log
(`Published basis-intl.bbj-lang v0.16.0.`) is authoritative; a `vsce show` query minutes later
still listed `0.15.5` as newest due to normal marketplace propagation lag, matching the job's own
"might take a few minutes" caveat. JetBrains is recorded as "upload accepted" per D-14
(`publishPlugin` task `BUILD SUCCESSFUL`), with the review queue deliberately not waited on.
Milestone #7 was confirmed at 19 open / 2 closed, matching D-23's expectation unchanged.

No job was red; the reconciliation runbook (`97-RECONCILIATION-RUNBOOK.md`) was not opened. No
re-run, re-dispatch, retry, tag, or release action was performed by Claude at any point.

## Deviations from Plan

None — plan executed exactly as written. Task 1 and Task 2 were already complete on entry to this
continuation (see prior commits `de340dcf` and the maintainer's own dispatch action); this
continuation executed only Task 3, exactly per the plan's action steps.

## Known Stubs

None.

## Threat Flags

None — no new security-relevant surface introduced; this plan is read-only observation and
recording of an already-gated release process.

## Self-Check: PASSED

- `97-RELEASE-EVIDENCE.md` exists at the path recorded above — FOUND.
- Commit `8c0724e3` (evidence file) exists in `git log` — FOUND.
- `gh release view v0.16.0` returns both assets with matching sha256/size to the recorded values — FOUND.
- `git ls-remote --tags origin v0.16.0` resolves to `6101a6b6bdaf8b93d6de32b7f8d2fbd92d0ce464` — FOUND.
