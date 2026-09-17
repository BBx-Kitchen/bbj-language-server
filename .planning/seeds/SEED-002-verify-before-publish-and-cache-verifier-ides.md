---
id: SEED-002
status: implemented
planted: 2026-09-16
agreed: 2026-09-16
implemented: 2026-09-17
implemented_by: quick task 260917-9ei (commit fa2c80bf)
planted_during: v4.3 (complete) / quick task 260916-9jy
trigger_when: next time the release or preview workflows are touched, or right after the 0.16.0 release
scope: small
---

# SEED-002: Publish nothing before everything is verified, and cache the plugin-verifier IDEs

Two CI follow-ups deliberately split out of quick task `260916-9jy`, which folded in only the
immediate mitigation (running `verifyPlugin` in PR validation and in the preview build).

## Why This Matters

### Part A — verification must precede publication (the higher-value half)

Both publishing workflows publish *before* the IntelliJ verification has run, so a late IntelliJ
failure leaves a half-released version. This is exactly what happened to v0.15.0 on 2026-09-16
(run 35064112482):

- `manual-release.yml` — the `build-vscode` job publishes to the VS Code Marketplace and pushes
  the release commit **and the tag** (lines 69-90), and only then does `build-intellij` run and
  fail. Result: VS Code Marketplace had 0.15.0, `origin/main` carried `Release version 0.15.0`,
  tag `v0.15.0` existed, the IntelliJ plugin was never published, and no GitHub Release was
  created. Recovery required abandoning the version entirely and releasing 0.16.0, because the
  workflow's own version validation rejects a non-greater version and the tag already existed.
- `preview.yml` — same shape: `publish-preview` publishes the VS Code pre-release and pushes the
  version bump, then `build-intellij` runs.

Adding `verifyPlugin` to preview (done in `260916-9jy`) narrows the window but does **not** fix
this: the VS Code side is still published first, so a preview verifier failure still leaves the
two artefacts out of step.

**The rule to implement:** verify everything, then publish anything. One verification job
(IntelliJ: build + test + `verifyPlugin`; VS Code: build + test) that both publish jobs declare in
`needs:`, with no publish, tag, or push happening before it is green.

### Part B — cache the plugin-verifier IDEs

> **Correction (2026-09-17, established by measurement during `260917-9ei`).** The premise below is
> wrong, and the numbers in it should not be reused. `Total amount of plugins and dependencies
> downloaded: 210.18 MB` is printed by the Plugin Verifier and counts its own **plugin and
> dependency** downloads, which land in `~/.pluginVerifier/loaded-plugins` (measured: 211 MB). It is
> not the IDEs. The IDEs are resolved by **Gradle** into `~/.gradle/caches` and measure **4.9 GB
> compressed** (841 MB – 1.21 GB per tarball) and **2.6 – 3.4 GB extracted each, ~14.6 GB total**,
> against a **10 GB per-repository** GitHub Actions cache limit.
>
> Part B was therefore re-scoped and the re-scope was ratified by the user before implementation:
> the verifier's plugin/dependency downloads **are** cached in all three `verifyPlugin` jobs; the IDE
> distributions are deliberately **not** cached, because the tarballs alone would consume half the
> repository's cache budget and evict everything else. `intellijPlatformIdesCacheEnabled=true` would
> relocate the *extracted* ~14.6 GB and is strictly worse. The measurements are recorded in a comment
> above each cache step so the rejected idea is not retried. Caching the IDEs, if ever wanted, needs a
> different mechanism (a larger or self-hosted runner cache), not an `actions/cache` step.
>
> Consequence worth knowing: since the ~3 minutes was most likely dominated by the IDE fetch, the
> implemented cache recovers a smaller slice of that time than this section originally assumed.

`verifyPlugin` downloads the IDEs named by `pluginVerification { ides { recommended() } }`
(`bbj-intellij/build.gradle.kts:86`). In run 35064112482 that was **210.18 MB across four IDEs**
(IC-242.26775.15, IC-243.28141.41, IC-251.29188.72, IC-252.28539.97) and about 3 minutes of a
5m23s job.

As of `260916-9jy` that cost is now paid on **every** `bbj-intellij/**` PR and **every** push to
main, not just on releases. Caching the verifier's IDE directory across runs recovers most of it.

Explicitly rejected alternative: giving each workflow a smaller IDE set or a softer
`failureLevel`. Divergent gates between PR, preview and release are the precise divergence class
that caused this incident — one gate, same settings everywhere, made cheap by caching.

## When to Surface

**Trigger:** next time the release or preview workflows are touched, or right after the 0.16.0
release lands.

Part A is worth doing before the *next* multi-artifact release, since it is the only change that
actually prevents another half-released version.

## Scope Estimate

**Small** — both parts are workflow-file changes, no product code. Part A is a job-graph
restructure in two files; Part B is a cache step in three.

## Breadcrumbs

- `.github/workflows/manual-release.yml:69-90` — publishes + tags in job 1, before `build-intellij`
- `.github/workflows/manual-release.yml:134-144` — the verify-then-publish steps that come too late
- `.github/workflows/preview.yml` — `publish-preview` publishes and pushes before `build-intellij`
- `.github/workflows/pr-validation.yml` — gained `verifyPlugin` in `260916-9jy`
- `bbj-intellij/build.gradle.kts:86` — `pluginVerification { ides { recommended() } }`, the IDE set being downloaded
- Failed run: 35064112482 (2026-09-16) — the incident these two items come from
- [[SEED-001]] — the internal-API fix for the same incident, implemented in quick task `260916-9jy`

## Notes

**Agreed 2026-09-16.** Both parts are approved in principle and are to be scheduled as their own
task — they were deliberately kept out of quick task `260916-9jy`, which folded in only the
immediate mitigation (`verifyPlugin` in PR validation and preview).

The version asymmetry left behind by the failed v0.15.0 release is explicitly **not** a concern to
chase: the IntelliJ plugin simply picks up whatever version ships next, and no attempt should be
made to reconcile 0.15.0 across the two marketplaces. Part A's value is preventing *future*
half-published releases, not repairing that one.

Deliberately not filed as a GitHub issue, consistent with the decision on [[SEED-001]]: internal
detail, tracked here.

## Outcome — closed 2026-09-17

Both parts implemented by quick task `260917-9ei` (commit `fa2c80bf`); see
`.planning/quick/260917-9ei-verify-before-publish-in-the-release-and/`.

- **Part A — done as specified.** `manual-release.yml` is now `verify` → `publish-vscode` ∥
  `publish-intellij` → `tag-release` → `create-release`; `preview.yml` is now `verify` →
  `bump-version` → both publishes, plus a workflow-level `concurrency` group. One verification job
  (VS Code build + test + package; IntelliJ build + test + `verifyPlugin`) gates every publish, tag
  and push in both files, directly or transitively. Tagging and the GitHub release moved to the end,
  so a failed run leaves no tag and the same version can be re-dispatched — the specific thing that
  made v0.15.0 unrecoverable.
- **Part B — implemented as re-scoped**, per the correction above.
- The IDE set and `failureLevel` in `bbj-intellij/build.gradle.kts` were left untouched (the file is
  byte-identical), honouring this seed's one-gate-everywhere rule.

Verified statically, which is the ceiling here — publishing workflows cannot be exercised locally.
Both workflow hygiene checkers report 0 findings, `workflow-secret-hygiene.test.ts` and
`gradle-wrapper-hygiene.test.ts` pass (24 tests), and a job-graph check confirmed every publishing
job transitively needs the single verification job and that neither `verify` job publishes. **The
first real Manual Release is the true test.** One residual, accepted: the two publish jobs run in
parallel, so one marketplace succeeding while the other fails still needs manual reconciliation —
smaller than the previous failure mode, not zero.
