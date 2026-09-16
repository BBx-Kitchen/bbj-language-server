---
id: SEED-002
status: dormant
planted: 2026-09-16
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

Deliberately not filed as a GitHub issue, consistent with the decision on [[SEED-001]]: internal
detail, tracked here.
