# Reconciliation Runbook — Manual Release (`manual-release.yml`)

**Purpose.** `manual-release.yml`'s `publish-vscode` and `publish-intellij` jobs run in **parallel**
(D-09 — this is deliberate, not changed by this runbook). If one marketplace publish succeeds while
the other fails, `tag-release` never runs (it `needs: [verify, publish-vscode, publish-intellij]`),
and the release is stuck half-shipped: one marketplace has the new version, the other doesn't, and
there is no tag and no GitHub Release. This document is the by-hand recovery for every way that run
can end up half-done. It assumes you are looking at a red run in the Actions UI right now.

**Ground rules for every path below**, read once before you use any of them:

- **Never bump the version to paper over a half-release.** The half-released state is reconciled
  from the failed run's own artifacts, never replaced by dispatching a new, higher version to hide
  it.
- **No step here is retried autonomously.** Every command below is a human running it by hand, once,
  deliberately. If a step in this runbook itself fails, stop and get another human's eyes on it —
  do not loop.
- **Tokens are read from the environment and appear last on the command line, never inlined and
  never written to a file.** This matches the convention already pinned by
  `bbj-vscode/test/workflow-secret-hygiene.test.ts` for the workflow files themselves.
- **Record a sha256 for every artifact you touch.** Immediately after downloading each artifact
  (step 0 below), compute and write down its sha256. Immediately before you upload/publish a
  downloaded file by hand, recompute its sha256 and confirm it still matches what you recorded —
  this is the check against an accidental rebuild silently replacing the file you meant to publish.

---

## 0. Read this first — the artifacts are gone in 24 hours

The `verify` job uploads three artifacts — `language-server`, `vscode-extension`,
`intellij-plugin` — each with `retention-days: 1`
(`[VERIFIED: .github/workflows/manual-release.yml:86-147]`). **On any publish failure, before
diagnosing anything else, download all three from the failed run:**

```bash
RUN_ID=<the failed run's id, from the Actions UI or `gh run list`>

gh run download "$RUN_ID" -n language-server -D ./reconcile
gh run download "$RUN_ID" -n vscode-extension -D ./reconcile
gh run download "$RUN_ID" -n intellij-plugin -D ./reconcile

sha256sum ./reconcile/*/* 2>/dev/null || sha256sum ./reconcile/*
# Write these hashes down. They are what every later verification step compares against.
```

After 24 hours these bytes are gone. Past that window, "reconciling" the release means building
fresh artifacts and dispatching a new version through the normal workflow — there is no way to
publish the exact bytes `verify` already checked, because they no longer exist anywhere.

---

## 1. Where did it fail? — decision table

| Red job | What that means | Go to |
|---|---|---|
| `verify` | Nothing is public. No tag, no release, no marketplace upload happened. | **Path A** |
| `publish-vscode` (with `publish-intellij` green) | JetBrains has the new version; VS Code Marketplace does not. | **Path C** |
| `publish-intellij` (with `publish-vscode` green) | VS Code Marketplace has the new version; JetBrains does not. | **Path B** |
| `tag-release` (both publishes green) | Both marketplaces have the new version, but there is no `vX.Y.Z` tag and no version-bump commit on `main`. | **Path D** |
| `create-release` (tag-release green) | The tag and version-bump commit exist on `main`, but there is no GitHub Release. | **Path E** |

If both `publish-vscode` and `publish-intellij` are red, do Path B and Path C's marketplace-publish
steps in either order, then continue to Path D.

---

## Path A — `verify` failed

Nothing is public: no marketplace upload, no tag, no commit, no release. This is the cheapest
failure to recover from.

1. Read the failing step's log (`gh run view <run-id> --log-failed`) and fix the underlying problem
   on a branch, exactly like any other bug fix (a PR, review, merge to `main`).
2. Once the fix is on `main`, **re-dispatch the same version, `0.16.0`, unchanged.** No version
   bump is needed or wanted — `verify`'s own version validator only rejects a version that is not
   strictly greater than `package.json`'s *current* value, and nothing bumped that value on this
   failed run (the `Set package.json version` step's edit never got committed — `verify` doesn't
   push).
3. Watch the new run the same way as any dispatch (`gh run watch <new-run-id> --exit-status`).

No artifact download is needed for this path — there is nothing yet to rescue.

---

## Path B — VS Code published, JetBrains failed

**This is the fully worked path — read it end to end before touching the other three.**

VS Code Marketplace already has `0.16.0`. JetBrains does not. The goal is to publish the **exact
zip `verify`'s `verifyPlugin` step already checked**, not a fresh rebuild.

### Why not just re-run the `publish-intellij` job

`publish-intellij`'s only step is:

```bash
./gradlew publishPlugin -Pversion=<VERSION> -PintellijPlatformPublishingToken="$JETBRAINS_MARKETPLACE_TOKEN"
```

(`[VERIFIED: .github/workflows/manual-release.yml:203-207]`). This job **does not download the
`intellij-plugin` artifact** — it downloads only `language-server` and rebuilds the plugin from
whatever source tree the runner checks out at that moment
(`[VERIFIED: .github/workflows/manual-release.yml:184-207]`). Re-running it publishes a **new,
freshly-built zip**, not the bytes `verifyPlugin` validated in the original run. If the tree has
moved even slightly between the original run and a re-run, the two zips are not guaranteed
byte-identical. **Do not re-run this job as the recovery step.**

### The recovery: publish the downloaded bytes directly

1. If you have not already (step 0 above), download the exact verified zip:

   ```bash
   gh run download "$RUN_ID" -n intellij-plugin -D ./reconcile
   sha256sum ./reconcile/bbj-intellij-0.16.0.zip
   # Confirm this matches the hash you recorded in step 0.
   ```

2. Publish those exact bytes to the JetBrains Marketplace via the documented direct-upload
   endpoint — this bypasses Gradle's rebuild-on-publish behavior entirely:

   ```bash
   curl -i \
     --header "Authorization: Bearer $JETBRAINS_MARKETPLACE_TOKEN" \
     -F pluginId=30033 \
     -F file=@./reconcile/bbj-intellij-0.16.0.zip \
     https://plugins.jetbrains.com/api/updates/upload
   ```

   (channel omitted = default/stable, matching `manual-release.yml`'s own channel-less
   `publish-intellij` step — `[VERIFIED: .github/workflows/manual-release.yml:203-207]`.) The
   token is the same `JETBRAINS_MARKETPLACE_TOKEN` secret used by
   `-PintellijPlatformPublishingToken` today.

   **UNVERIFIED assumption:** whether this secret is directly usable as the `Authorization: Bearer`
   value for this HTTP endpoint has not been confirmed against a live token — it is the same
   *permanent-token* type JetBrains issues for both the Gradle publishing property and the
   Marketplace's direct-upload API, but the interchangeability itself was never exercised. If this
   `curl` call fails with an auth error (401/403), do not troubleshoot the token — fall back
   immediately to the manual path below.

3. **Fallback if the direct upload fails or the token doesn't work:** upload the same zip by hand
   through the Marketplace web UI — plugin `bbj-language-support` (id 30033), at
   https://plugins.jetbrains.com/plugin/30033-bbj-language-support/versions — sign in as the
   plugin's publisher account and use its own "Upload new version" flow, selecting
   `./reconcile/bbj-intellij-0.16.0.zip`. This never requires the token at all.

4. Confirm the upload was accepted (Marketplace dashboard shows the new version, or the API
   response from step 2 is a success). Per D-14, an accepted upload is sufficient — do not wait
   for the JetBrains review queue to clear.

5. Both marketplaces now have `0.16.0`. **Continue with Path D's tag steps, then Path E's release
   step**, using the same `$RUN_ID` you downloaded artifacts from.

---

## Path C — JetBrains published, VS Code failed

JetBrains already has `0.16.0`. VS Code Marketplace does not.

1. Download the exact verified `.vsix` if you have not already:

   ```bash
   gh run download "$RUN_ID" -n vscode-extension -D ./reconcile
   sha256sum ./reconcile/*.vsix
   # Confirm this matches the hash you recorded in step 0.
   ```

2. Publish it with the repository's pinned packaging tool, from `bbj-vscode/` so `npx` resolves the
   pinned `vsce` version from `bbj-vscode`'s own `devDependencies`, by package path — this is the
   same command `publish-vscode` runs, pointed at the downloaded file instead of a freshly-packaged
   one:

   ```bash
   npx --prefix bbj-vscode vsce publish --packagePath "$(pwd)/reconcile/<name>.vsix" -p "$VSCE_PAT"
   ```

   (`[VERIFIED: .github/workflows/manual-release.yml:171-177]`; token last on the line, matching
   the workflow's own `-p "$VSCE_PAT"` shape.) There is no rebuild risk on this side — `vsce
   publish --packagePath` uploads the exact file you point it at, it does not repackage.

3. Confirm the VS Code Marketplace shows `0.16.0`.

4. Both marketplaces now have `0.16.0`. **Continue with Path D's tag steps, then Path E's release
   step**, using the same `$RUN_ID`.

---

## Path D — both published, tagging failed

Both marketplaces have `0.16.0` (either because `tag-release` itself failed on the original run, or
because you just finished Path B/C above). There is no `v0.16.0` tag and no version-bump commit on
`main` yet. Do `tag-release`'s work by hand, against the commit the released artifacts were built
from — this reproduces `[VERIFIED: .github/workflows/manual-release.yml:228-242]` exactly:

```bash
git -C /home/coder/repos/bbj-language-server checkout main
git -C /home/coder/repos/bbj-language-server pull origin main

jq '.version = "0.16.0"' bbj-vscode/package.json > /tmp/pkg.json && \
  mv /tmp/pkg.json bbj-vscode/package.json

git -C /home/coder/repos/bbj-language-server add bbj-vscode/package.json
git -C /home/coder/repos/bbj-language-server commit -m "Release version 0.16.0"
git -C /home/coder/repos/bbj-language-server tag v0.16.0
git -C /home/coder/repos/bbj-language-server push origin main
git -C /home/coder/repos/bbj-language-server push origin v0.16.0
```

Use your own git identity for this commit (the workflow uses a bot identity —
`"GitHub Actions" <actions@github.com>` — that is not available to a human running this by hand;
using your own identity is fine, the commit content is what matters).

Then continue to **Path E**.

---

## Path E — tag exists, the GitHub Release step failed

The `v0.16.0` tag and the version-bump commit exist on `main` (either from the original run's
`tag-release` succeeding, or because you just did Path D above), but `create-release` failed or was
never reached. Create the release by hand from the downloaded `vscode-extension` and
`intellij-plugin` artifacts, with the same install-block notes `create-release` uses, copied
verbatim:

```bash
gh run download "$RUN_ID" -n vscode-extension -D ./reconcile
gh run download "$RUN_ID" -n intellij-plugin -D ./reconcile

gh release create "v0.16.0" \
  --title "v0.16.0" \
  --generate-notes \
  --notes "## Installation

### VS Code
Install from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=basis-intl.bbj-lang) or download the \`.vsix\` file below and install via **Extensions > ... > Install from VSIX...**

### IntelliJ IDEA
Install from [JetBrains Marketplace](https://plugins.jetbrains.com/plugin/30033-bbj-language-support) (may take a few days for review) or download \`bbj-intellij-0.16.0.zip\` from the Assets below and install via **Settings > Plugins > ⚙ > Install Plugin from Disk...**

---
" \
  ./reconcile/*.vsix \
  ./reconcile/*.zip
```

(`[VERIFIED: .github/workflows/manual-release.yml:265-284]`, notes text copied unchanged.)

Confirm with `gh release view v0.16.0` that both assets are attached, then compare the sha256 of
each attached asset against the hash you recorded in step 0 — this is the final proof that what got
released is exactly what `verify` checked, not a rebuild picked up along the way.

---

## Rules that apply to every path (restated)

- **Never bump the version to paper over a half-release.** `0.16.0` is reconciled to completion, not
  abandoned in favor of dispatching `0.16.1` or similar to hide a partial state.
- **Every manual recovery step above is a human checkpoint.** Claude reports what it found and what
  it is about to do, and waits for confirmation before running a step that publishes, tags, pushes,
  or creates a release — no autonomous retries, not even for a step that looks like a plainly
  transient network failure.
- **Record a sha256 for every artifact before and after it moves.** Immediately after `gh run
  download` and immediately before any publish/upload/release command, so a mismatch is caught
  before it ships, not after.

## Out of scope, deliberately

- **Serializing `publish-vscode` and `publish-intellij`** so one always finishes before the other
  starts — this was explicitly declined by the maintainer for this release (D-09); this runbook is
  the accepted alternative to that change, not a stopgap until it happens.
- **Raising `retention-days` on the `verify` job's artifacts** beyond one day, so a reconciliation
  window is longer — a workflow-file change, out of scope for this phase.
- **Reconciling the half-released 0.15.0** across the two marketplaces — per
  `.planning/seeds/SEED-002-verify-before-publish-and-cache-verifier-ides.md`, that version is
  deliberately left as-is; no attempt is made to align it retroactively.
