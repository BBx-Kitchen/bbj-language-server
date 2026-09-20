# Release 0.16.0 — Precondition Report

Written before the maintainer dispatches Manual Release from the Actions UI (D-11). Every line
below is a command run just now, with its literal observed output — not a claim carried over from
an earlier plan.

1. **Landing PR merged.**

   Command:
   ```
   gh pr view --repo BBx-Kitchen/bbj-language-server 679 --json number,state,mergedAt,mergeCommit
   ```
   Observed:
   ```json
   {"mergeCommit":{"oid":"7ab6b81042841efbade0610890e7e22495b0e205"},"mergedAt":"2026-09-20T16:15:13Z","number":679,"state":"MERGED"}
   ```
   PR #679 is `state: MERGED`, `mergedAt: 2026-09-20T16:15:13Z`, squash merge commit
   `7ab6b81042841efbade0610890e7e22495b0e205`. **PASS.**

2. **Preview run green.**

   Command:
   ```
   gh run view 35522129619 --repo BBx-Kitchen/bbj-language-server --json conclusion,headSha,jobs
   ```
   Observed: `"conclusion":"success"`, `"headSha":"7ab6b81042841efbade0610890e7e22495b0e205"`, and
   all four jobs (`verify`, `bump-version`, `publish-intellij`, `publish-vscode`) report
   `"conclusion":"success"`. The head SHA equals item 1's merge commit exactly. **PASS.**

3. **Maintainer hand check passed.**

   Verbatim replies recorded in `97-PREVIEW-GATE.md` (2026-09-20, two messages):
   > approved vscode

   > approved intellij

   Both replies were given against the resume-signal's three checks (server starts, a
   deliberately bad line produces a diagnostic, completion returns BBj keywords), with no failure
   description for either IDE. **PASS.**

4. **`origin/main` HEAD is the expected SHA.**

   Commands:
   ```
   git -C /home/coder/repos/bbj-language-server fetch origin
   git -C /home/coder/repos/bbj-language-server rev-parse origin/main
   ```
   Observed: `5f03a0a85253f682045c0c8519a35992a77ace48`.

   This is **not** the raw merge commit (`7ab6b810…`) — it is one commit ahead of it. That extra
   commit is the Preview run's own `bump-version` job ("Bump preview version"), which is expected
   and documented in `97-PREVIEW-GATE.md` ("New `origin/main` HEAD"): every preview run lands a
   patch-bump commit ahead of the publish jobs. It is also the exact SHA the maintainer hand-check
   in item 3 was performed against ("`origin/main` HEAD at time of approval" in
   `97-PREVIEW-GATE.md`). Nothing has landed on `origin/main` since that hand check — in
   particular, the unrelated external PR #675 flagged as a risk in `97-PREVIEW-GATE.md`'s "Note
   for Next" has **not** merged; `origin/main` is unchanged at `5f03a0a8…`. **PASS.**

5. **The version validator will pass.**

   Command:
   ```
   git -C /home/coder/repos/bbj-language-server show origin/main:bbj-vscode/package.json | grep -m1 '"version"'
   ```
   Observed:
   ```
     "version": "0.15.5",
   ```
   `manual-release.yml`'s validator has two rules (`.github/workflows/manual-release.yml:41-64`):
   the input must match `^[0-9]+\.[0-9]+\.[0]+$` (x.y.0 shape) and must be `semver … -r ">$CURRENT"`
   strictly greater than the current `package.json` value. `0.16.0` matches the `x.y.0` shape, and
   `0.15.5` is strictly less than `0.16.0`, so `semver "0.16.0" -r ">0.15.5"` will pass. **PASS.**

6. **No `v0.16.0` tag or release exists.**

   Commands:
   ```
   git -C /home/coder/repos/bbj-language-server ls-remote --tags origin v0.16.0
   gh release view v0.16.0 --repo BBx-Kitchen/bbj-language-server
   ```
   Observed: `ls-remote` printed **no output** (exit 0, no matching ref). `gh release view`
   printed `release not found` and exited non-zero. Neither a `v0.16.0` tag nor a `v0.16.0`
   GitHub Release exists on the remote. **PASS.**

7. **The runbook is written.**

   `.planning/phases/97-release-0-16-0-milestone-close/97-RECONCILIATION-RUNBOOK.md` exists and
   covers, with exact commands, all five labelled recovery paths keyed to which job went red:

   - **Path A** — `verify` failed: nothing is public; fix on a branch + PR, then re-dispatch
     `0.16.0` unchanged.
   - **Path B** — VS Code published, JetBrains failed: publish the exact downloaded
     `intellij-plugin` zip via the JetBrains direct-upload endpoint (or the Marketplace web UI as
     fallback), never a Gradle re-run (which would rebuild, not republish, the verified bytes).
   - **Path C** — JetBrains published, VS Code failed: publish the exact downloaded `.vsix` via
     `vsce publish --packagePath`.
   - **Path D** — both published, tagging failed: bump `package.json`, commit, tag `v0.16.0`, and
     push, by hand, reproducing `tag-release`'s steps.
   - **Path E** — tag exists, `create-release` failed: create the GitHub Release by hand from the
     downloaded `vscode-extension` and `intellij-plugin` artifacts, with the same install-block
     notes copied verbatim.

   The runbook opens with the retention-days: 1 constraint (download all three artifacts via
   `gh run download <run-id>` before diagnosing anything) and closes with the standing rules: never
   bump the version to paper over a half-release, no autonomous retries, and a sha256 recorded for
   every artifact before and after it moves. **PASS.**

## All seven preconditions hold — go for dispatch

Every item above is PASS. Nothing in this report should be presented as a partial go — it is a
full go, on the exact tree the maintainer already hand-checked.

## Dispatch instructions for the maintainer

1. Go to the repository's **Actions** tab.
2. Select the **Manual Release** workflow.
3. Click **Run workflow**.
4. Branch: `main`.
5. Version input: exactly `0.16.0`.
6. Click **Run workflow** to start it.

**Reminder:** if anything after `verify` goes red, `97-RECONCILIATION-RUNBOOK.md` governs — nothing
is retried automatically, and the version is never bumped to paper over a half-release.
