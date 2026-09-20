# Preview Gate — Dress Rehearsal for Release 0.16.0

Per D-06, the Preview workflow run triggered by the landing merge is a dress rehearsal of the
release gate: it runs the same `verify` job (build, test, package VS Code; build + `verifyPlugin`
IntelliJ) and uses both marketplace publish tokens, on the exact commit that just landed on `main`.
A green run here, plus the maintainer's hand check in both IDEs (Task 3), is the precondition for
dispatching Manual Release `0.16.0` — no calendar soak period.

## Run identity

- **Workflow:** `Publish Preview Extension` (`.github/workflows/preview.yml`)
- **Run ID:** `35522129619`
- **Run URL:** https://github.com/BBx-Kitchen/bbj-language-server/actions/runs/35522129619
- **Trigger event:** `push` (the squash-merge push to `main`)
- **Display title:** "Release 0.16.0: v4.4 IntelliJ Focus (milestone #7) (#679)"
- **Head SHA:** `7ab6b81042841efbade0610890e7e22495b0e205` — equal to PR #679's squash-merge commit,
  recorded as `origin/main`'s new HEAD in `97-LANDING-PR.md`.
- **Overall conclusion:** `success`
- **Started:** 2026-09-20T16:15:15Z
- **Completed:** 2026-09-20T16:24:57Z
- **Total duration:** ~9 min 42 s

## Per-job results

| Job | Conclusion | Started | Completed | Duration |
|---|---|---|---|---|
| `verify` | `success` | 2026-09-20T16:15:18Z | 2026-09-20T16:22:01Z | ~6 min 43 s |
| `bump-version` | `success` | 2026-09-20T16:22:03Z | 2026-09-20T16:22:11Z | ~8 s |
| `publish-vscode` | `success` | 2026-09-20T16:22:13Z | 2026-09-20T16:22:43Z | ~30 s |
| `publish-intellij` | `success` | 2026-09-20T16:22:13Z | 2026-09-20T16:24:56Z | ~2 min 43 s |

All four jobs report `conclusion: success`. Notable steps within `verify`, all `success`:
`Build`, `Test`, `Package preview extension`, `Build IntelliJ plugin`, `Verify plugin
compatibility` — the same verification work the release gate's `verify` job performs.

## Preview version published

**`0.15.5`** — read directly from the `verify` job's `Bump patch version` step log (not guessed):

```
verify  Bump patch version  Bumping version to 0.15.5
```

Confirmed independently: `bump-version`'s "Commit version bump" step pushed a `Bump preview
version` commit (`5f03a0a8`) that is now `origin/main`'s HEAD, one commit ahead of the squash merge
(`7ab6b810`); `bbj-vscode/package.json` at `origin/main` reads `"version": "0.15.5"`. This bump is
expected and is separate from the 0.16.0 release version this dress rehearsal is gating.

- **VS Code:** `basis-intl.bbj-lang` `0.15.5` published to the VS Code Marketplace pre-release
  channel (`publish-vscode`'s `Publish preview to VS Code Marketplace` step, `--pre-release`).
- **IntelliJ:** `bbj-intellij-0.15.5.zip` published to the JetBrains Marketplace `preview` channel
  (`publish-intellij`'s `Publish IntelliJ preview to JetBrains Marketplace` step,
  `-PintellijChannel=preview`).

## New `origin/main` HEAD

`5f03a0a85253f682045c0c8519a35992a77ace48` ("Bump preview version") — one commit ahead of the
squash-merge commit `7ab6b81042841efbade0610890e7e22495b0e205` this run was triggered by. This is
expected: `bump-version` always lands its commit ahead of the publish jobs, on every preview run.

## Maintainer hand check

**Performed 2026-09-20. Verdict: PASSED, both IDEs.**

Install steps offered to the maintainer:

1. **VS Code:** open the Extensions view, find "BBj Language Support", use **Switch to
   Pre-Release Version** (the extension's own pre-release toggle) to pick up `0.15.5`, replacing any
   locally installed development copy.
2. **JetBrains IDE:** the `preview` channel is a custom release channel, not the default Marketplace
   listing. Per `.planning/research/INTELLIJ-VERSIONING.md` ("Update Channels" table), a
   channel-published build is fetched from `https://plugins.jetbrains.com/plugins/preview/list`
   (`https://plugins.jetbrains.com/plugins/<channel>/list`, channel = `preview`, matching this
   workflow's own `-PintellijChannel=preview`) — the maintainer adds that URL as a custom plugin
   repository in **Settings > Plugins > ⚙ > Manage Plugin Repositories...**, then finds and
   installs "BBj Language Support" from that repository, replacing any locally installed
   development copy. **Fallback:** because this is a fresh channel upload it may still sit in
   Marketplace review and not yet be fetchable from that repository URL — if so, use the
   `intellij-plugin`-named artifact instead: this run uploaded it as
   `bbj-intellij-0.15.5` (`[VERIFIED: .github/workflows/preview.yml:134-139]`, artifact name
   templated with the bumped version, `retention-days: 7`), downloadable via
   `gh run download 35522129619 -n bbj-intellij-0.15.5 -D ./preview-check` and installed via
   **Settings > Plugins > ⚙ > Install Plugin from Disk...**.
3. Open a `.bbj` file from `examples/` in each IDE.
4. Confirm in each: the language server starts (status indicator), diagnostics appear on a
   deliberately bad line, and completion returns BBj keywords.
5. Report pass or fail per IDE in one or two sentences each.

### Verbatim reply (2026-09-20, two messages)

> approved vscode

> approved intellij

The maintainer confirmed against the resume-signal's three checks (server starts, a bad line
produces a diagnostic, completion returns BBj keywords) in each IDE, per the plan's
`<how-to-verify>`. No failure description was given for either IDE.

### Per-IDE record

- **VS Code — PASSED.** Installed `0.15.5` via **Switch to Pre-Release Version** as instructed
  above. Approved as "approved vscode".
- **IntelliJ — PASSED.** Offered two routes: the JetBrains Marketplace `preview` channel (custom
  plugin repository, per the install steps above), or the run's own verified artifact
  `bbj-intellij-0.15.5.zip` (downloaded from run `35522129619` via `gh run download` by the
  orchestrator and sent to the maintainer for **Install Plugin from Disk...**). The maintainer did
  not state which route they used — recorded as **route not stated**, not assumed. Approved as
  "approved intellij".

### Artifact identities referenced at approval time

- **IntelliJ zip offered:** `bbj-intellij-0.15.5.zip` — sha256
  `65e8dcb97ade5edd5e41ce02959751787fdeaa6073d47dc31b67b7acf8257669`, 1,159,954 bytes.
- **VS Code vsix (run artifact, for reference — VS Code was installed via the Marketplace
  pre-release toggle, not this file):** `bbj-lang-0.15.5.vsix` — sha256
  `ae0371ce3c02d76fda42d45585f104e8e2a97f06a00787fe426e96dca509b90e`, 2,631,414 bytes.
- Both correspond to preview version `0.15.5` from Preview run `35522129619` (all four jobs
  `success`) on squash commit `7ab6b81042841efbade0610890e7e22495b0e205`.

### `origin/main` HEAD at time of approval

`5f03a0a85253f682045c0c8519a35992a77ace48` ("Bump preview version", `bbj-vscode/package.json`
bumped to `0.15.5`) — the tree the maintainer hand-checked, plus the version-bump commit. See
"New `origin/main` HEAD" above.

### Note for Next

An unrelated external PR #675 is open against `main`. Merging it before the release dispatch would
move `origin/main` off the tree the maintainer just hand-checked. The maintainer has been told.

### D-06 status

Both halves of D-06 are now satisfied: the Preview run triggered by the landing merge finished
green in every job (see "Per-job results" above), and the maintainer installed that preview build
in both IDEs for a sanity pass, reporting pass in both. No calendar soak period was used. This
closes the precondition for dispatching Manual Release `0.16.0` on the preview-gate side; the
release dispatch itself remains a separate, later blocking-human checkpoint (D-11) and REL-01 is
not being marked complete by this record.
