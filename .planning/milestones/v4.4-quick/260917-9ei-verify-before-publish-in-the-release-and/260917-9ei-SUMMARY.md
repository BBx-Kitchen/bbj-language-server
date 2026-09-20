---
phase: 260917-9ei-verify-before-publish-in-the-release-and
plan: 01
subsystem: ci
tags: [github-actions, release, preview, gradle, plugin-verifier]
status: complete
dependency-graph:
  requires: []
  provides:
    - "manual-release.yml five-job gate (verify -> publish-vscode/publish-intellij -> tag-release -> create-release)"
    - "preview.yml four-job gate (verify -> bump-version -> publish-vscode/publish-intellij)"
    - "actions/cache@v4 restoring ~/.pluginVerifier in all three verifyPlugin jobs"
  affects:
    - ".github/workflows/manual-release.yml"
    - ".github/workflows/preview.yml"
    - ".github/workflows/pr-validation.yml"
tech-stack:
  added: []
  patterns:
    - "single verification job gates publish/tag/push via needs: (direct or transitive)"
    - "actions/cache@v4 keyed on hashFiles(build.gradle.kts) with an OS-scoped restore-keys prefix"
key-files:
  created: []
  modified:
    - .github/workflows/manual-release.yml
    - .github/workflows/preview.yml
    - .github/workflows/pr-validation.yml
decisions:
  - "Part B caches only ~/.pluginVerifier (measured 211 MB); the multi-gigabyte IDE distributions Gradle resolves into ~/.gradle/caches are deliberately not cached, per the plan's re-scope, ratified by the user before dispatch"
  - "Tagging and the GitHub release move to the end (tag-release, create-release), after both publish jobs, so a failed publish leaves no tag and the same version can be re-dispatched"
  - "preview.yml's version-bump commit lands in its own job (bump-version) ahead of the two publishes but behind verify, plus a workflow-level concurrency group, to avoid a duplicate-version race between overlapping pushes to main"
metrics:
  duration: "~45m"
  completed: 2026-09-17
actuals:
  tokens: 46000
  tasks: 3
  commits: 1
---

# Quick Task 260917-9ei: Verify before publish in the release and preview workflows Summary

Restructured `manual-release.yml` and `preview.yml` so a single verification job (VS Code build+test+package, IntelliJ build+verifyPlugin) gates every publish, tag, and push, and added an `actions/cache@v4` step caching the Plugin Verifier's own ~211 MB of downloads in all three jobs that run `verifyPlugin` — closing the gap that let run 35064112482 publish to the VS Code Marketplace and tag `v0.15.0` before IntelliJ verification failed.

## What Was Built

**`manual-release.yml`** — five jobs: `verify` (checkout → node → validate/set version → build → test → package VS Code extension → upload → java → wrapper-validation → cache → buildPlugin → verifyPlugin → upload IntelliJ zip) with no publish/tag/push step; `publish-vscode` (`needs: verify`) downloads the verified VSIX and publishes it via `vsce publish --packagePath`; `publish-intellij` (`needs: verify`) runs `publishPlugin` unchanged in argument shape; `tag-release` (`needs: [verify, publish-vscode, publish-intellij]`) commits, tags, and pushes only after both marketplaces have published; `create-release` (`needs: [..., tag-release]`) cuts the GitHub release last.

**`preview.yml`** — four jobs plus a `concurrency: { group: publish-preview, cancel-in-progress: false }` block: `verify` computes the patch bump, builds, tests, packages (`vsce package --pre-release`), then builds/verifies/packages the IntelliJ side; `bump-version` (`needs: verify`) commits and pushes the version bump ahead of publishing but behind verification; `publish-vscode` and `publish-intellij` (`needs: [verify, bump-version]`) publish from the downloaded artifacts.

**`pr-validation.yml`** — unchanged job graph; added the same `actions/cache@v4` step to `validate-intellij` before `buildPlugin`.

**Cache step** (identical in all three files): `path: ~/.pluginVerifier`, `key: pluginverifier-${{ runner.os }}-${{ hashFiles('bbj-intellij/build.gradle.kts') }}`, `restore-keys: pluginverifier-${{ runner.os }}-`, with a comment above each occurrence recording the measurements (210.18 MB verifier downloads cached; 4.9 GB tarballs / ~14.6 GB extracted IDEs deliberately not cached against the 10 GB per-repo limit).

## Verification Evidence

**Hygiene vitest suites** (Task 3 Step 1), run from `bbj-vscode`:
```
RUN  v4.1.10 /home/coder/repos/bbj-language-server/bbj-vscode

 Test Files  2 passed (2)
      Tests  24 passed (24)
   Start at  20:56:16
   Duration  978ms
```
0 failed tests across `test/workflow-secret-hygiene.test.ts` and `test/gradle-wrapper-hygiene.test.ts`.

**Mechanical checkers**, final state:
```
$ node bbj-vscode/tools/check-workflow-secrets.mjs
Scanned 7 file(s), 38 run block(s), 0 findings.

$ node bbj-vscode/tools/check-gradle-wrapper.mjs
1 wrapper(s), 7 workflow file(s), 5 Gradle job(s), 0 findings.
```

**Throwaway job-graph checker** (Task 3 Step 2, written to the session scratchpad, parsed with `bbj-vscode/node_modules/js-yaml`, not committed) — full output:
```
=== /home/coder/repos/bbj-language-server/.github/workflows/manual-release.yml ===
verification job: verify
  job 'verify': non-publishing, transitive needs -> []
  job 'publish-vscode': publishing, transitive needs -> [verify]
  job 'publish-intellij': publishing, transitive needs -> [verify]
  job 'tag-release': publishing, transitive needs -> [verify, publish-vscode, publish-intellij]
  job 'create-release': publishing, transitive needs -> [verify, publish-vscode, publish-intellij, tag-release]
OK: verification job 'verify' does not publish, tag or push
OK: publishing job 'publish-vscode' transitively needs 'verify'
OK: publishing job 'publish-intellij' transitively needs 'verify'
OK: publishing job 'tag-release' transitively needs 'verify'
OK: publishing job 'create-release' transitively needs 'verify'
OK: verification job 'verify' includes both npm run test and verifyPlugin

=== /home/coder/repos/bbj-language-server/.github/workflows/preview.yml ===
verification job: verify
  job 'verify': non-publishing, transitive needs -> []
  job 'bump-version': publishing, transitive needs -> [verify]
  job 'publish-vscode': publishing, transitive needs -> [verify, bump-version]
  job 'publish-intellij': publishing, transitive needs -> [verify, bump-version]
OK: verification job 'verify' does not publish, tag or push
OK: publishing job 'bump-version' transitively needs 'verify'
OK: publishing job 'publish-vscode' transitively needs 'verify'
OK: publishing job 'publish-intellij' transitively needs 'verify'
OK: verification job 'verify' includes both npm run test and verifyPlugin

ALL CHECKS PASSED
```
Exit code 0. Both files show exactly one `verifyPlugin` job, and every job classified as publishing (matching `vsce publish`, `publishPlugin`, `git push`, `git tag`, or `gh release create`) reaches `verify` through the transitive closure of `needs:`, while `verify` itself is not classified as publishing.

**publishPlugin argument shapes** (pinned by `workflow-secret-hygiene.test.ts`, also confirmed by hand):
- `manual-release.yml`: `./gradlew publishPlugin -Pversion=${{ needs.verify.outputs.version }} -PintellijPlatformPublishingToken="$JETBRAINS_MARKETPLACE_TOKEN"` — 2 arguments, token last.
- `preview.yml`: `-Pversion=${{ needs.verify.outputs.version }}`, `-PintellijChannel=preview`, `-PintellijPlatformPublishingToken="$JETBRAINS_MARKETPLACE_TOKEN"` — 3 arguments, token last.

**Planning-identifier scan**: `git diff origin/main -- .github/workflows | grep -n -E '260917|9ei-|SEED-002|\bD-[0-9]{2}\b|\bT-[0-9]'` — no matches (grep exit 1).

**`git tag`/`gh release create` occurrence count**: each appears exactly once in `manual-release.yml`, both outside the `verify` job (`tag-release` line 240, `create-release` line 270).

**`bbj-intellij/build.gradle.kts`**: `git diff origin/main -- bbj-intellij/build.gradle.kts` is empty (0 lines) — byte-identical, `ides { recommended() }` intact, no `failureLevel`, no IDE-cache property.

**Scope check**: `git status --short bbj-intellij/build.gradle.kts .github/workflows/build.yml .github/workflows/pr-vsix.yml .github/workflows/workflow-hygiene.yml` printed nothing.

**Commit**: `git show --stat HEAD` lists exactly `.github/workflows/manual-release.yml`, `.github/workflows/preview.yml`, `.github/workflows/pr-validation.yml`.

## Deviations from Plan

### Auto-fixed Issues

None — the workflow restructuring, cache placement, and commit followed the plan's Task 1–3 instructions as written; every `<done>` criterion in the plan was checked mechanically and passed on the first attempt.

### Process note (not a code deviation)

`npm --prefix bbj-vscode ci` (Task 3 Step 1's literal command) fails on this machine's Node 24 runtime during the `prepare` lifecycle hook (`langium generate` throws `TypeError: Invalid URL` inside `jsonschema`'s `$ref` resolution — a known Node-version incompatibility, not related to this change). `node_modules` and the generated Langium artifacts were already present and current from a prior install, so the two hygiene vitest suites (the actual gate this step exists to run) executed directly via `npx vitest run` and passed cleanly; a full `npm ci` was not required to satisfy the plan's verification. No workflow or source file was touched to work around this — it is a local-environment constraint (Node 22 required for `langium generate`, matching prior project memory) and does not affect the CI workflows themselves, which pin Node 22 via `actions/setup-node@v4`.

## Known Stubs

None.

## Threat Flags

None — the threat register in the plan (T-9ei-01 through T-9ei-05, T-9ei-SC) was written against exactly this restructuring and covers the new job/credential surface. No additional network endpoint, auth path, or schema change was introduced beyond what the plan's threat model anticipated.

## Self-Check: PASSED

- `.github/workflows/manual-release.yml`: FOUND
- `.github/workflows/preview.yml`: FOUND
- `.github/workflows/pr-validation.yml`: FOUND
- Commit `fa2c80bf`: FOUND in `git log --oneline --all`
