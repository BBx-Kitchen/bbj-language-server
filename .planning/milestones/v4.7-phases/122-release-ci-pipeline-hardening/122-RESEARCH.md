# Phase 122: Release & CI Pipeline Hardening - Research

**Researched:** 2026-09-29
**Domain:** GitHub Actions CI/CD hardening (permissions, SHA-pinning, caching, composite actions), npm packaging (esbuild, vsce), Dependabot configuration
**Confidence:** HIGH for everything read directly from the repo or resolved via the GitHub API; MEDIUM for JetBrains/Dependabot behavior confirmed only via secondary sources; explicitly flagged where evidence was absent.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**PR gate shape (CI-02, #549)**
- **D-01:** Merge `pr-vsix.yml` into `build.yml` and delete `pr-vsix.yml`. `build.yml` stays
  unconditional on every PR to `main` (no `paths:` filter). It is the one PR gate: install, build,
  lint, `typecheck:test`, test, VSIX package, artifact upload and the sticky PR comment. The PR
  gets one install and one test run, not two.
- **D-02:** The VSIX package and sticky comment run on every PR, docs-only included. There is no
  changed-files condition. Carry over pr-vsix's details: artifact named `vsix-pr<N>` with a
  `<name>-<version>-pr<N>-<sha>.vsix` file, 14-day retention, `if-no-files-found: error`, the
  `<!-- pr-vsix -->` marker comment update, the gate that skips fork PRs for the comment step, and
  checkout of the PR head SHA. The planner decides whether the lint/typecheck/test steps keep
  today's `build.yml` "run even if the previous check failed" conditions.
- **D-03:** `pr-validation.yml` stays a separate workflow with its path filter. It only receives
  the shared preamble, caching, pins, permissions and a concurrency group. Folding the IntelliJ
  verify into `build.yml` was considered and rejected.
- **D-04:** Concurrency is per PR with `cancel-in-progress: true` for `build.yml` (group keyed on
  the PR number, as `pr-vsix.yml` does today) and for `pr-validation.yml`. `preview.yml` keeps its
  `publish-preview` group with `cancel-in-progress: false`, and `deploy-docs.yml` keeps its `pages`
  group.
- **D-05:** `main` has no branch protection or rulesets (checked 2026-09-29: the API returns
  "Branch not protected"), so renaming or deleting workflows breaks no required status check.
  Success criterion 3 ("every PR still passes a build-and-test gate") is met by `build.yml`'s
  unconditional trigger.

**Action pins & majors (CI-03, #550)**
- **D-06:** Pin every `uses:` reference, in the workflows and in the new composite action, to the
  commit SHA of the latest release within the major in use today (`actions/checkout@v4` is pinned
  to the v4.x.y SHA, `github-script@v7` to the v7.x.y SHA, and so on), with a `# vX.Y.Z` comment.
  Resolve annotated tags to the commit SHA, not the tag-object SHA. No major upgrades in this
  phase.
- **D-07:** Major-version bumps arrive later through the existing grouped weekly Dependabot
  `github-actions` PR and get a normal review. Do not add an `ignore` rule for majors.
- **D-08:** Add a permanent check for success criterion 1 to `workflow-hygiene.yml`: a
  zero-dependency `.mjs` checker in `bbj-vscode/tools/` with a vitest test, following the pattern of
  `check-workflow-secrets.mjs` and `check-gradle-wrapper.mjs`. It fails when a `uses:` reference
  (workflows and `.github/actions/**`) is not a 40-hex SHA with a version comment, or when a
  workflow lacks a `permissions:` block. Local `./` action references are exempt from pinning.

**Gradle caching (CI-05, #518)**
- **D-09:** Use `gradle/actions/setup-gradle`, not setup-java's `cache: gradle`, in every job that
  runs Gradle. Keep the IntelliJ IDE distributions out of the cache: the existing workflow comments
  measure them at ~4.9 GB compressed and ~14.6 GB extracted, against a 10 GB per-repository limit.
  The researcher confirms the exact exclude paths for IntelliJ Platform Gradle Plugin 2.x. Keep the
  default cache write policy (only `main` writes, PRs read). Keep the existing
  `~/.pluginVerifier` `actions/cache` step and its comment.
- **D-10:** The `verify` jobs in `preview.yml` and `manual-release.yml`, and the PR workflows, use
  npm and Gradle caching. The jobs that hold marketplace tokens (`publish-vscode`,
  `publish-intellij` in both release workflows) do not restore any cache, so cache contents cannot
  reach a credential-bearing job. They install cold. They only need vsce or Gradle, because the
  VSIX and `main.cjs` arrive as artifacts.
- **D-11:** npm caching goes through the shared preamble (`cache: npm` with a per-caller
  `cache-dependency-path`: `bbj-vscode/package-lock.json`, or `documentation/package-lock.json` for
  `deploy-docs.yml`). A second run with an unchanged lockfile shows a cache hit (success criterion
  2).

**Packaging & prepare (CI-07, CI-08, CI-09, #515, #598, #600)**
- **D-12:** `prepare` becomes `langium generate` only. `src/language/generated/` is gitignored, so
  a fresh `npm ci`/`npm install` still needs it for tsc and IDE type-checking. Every CI job already
  runs `npm run build` explicitly, so each job now runs the build once.
- **D-13:** `vscode:prepublish` copies `LICENSE` and runs `node ./esbuild.mjs --minify`, building
  only the shipped `out/extension.cjs` and `out/language/main.cjs`. No `tsc`, no lint, no
  `esbuild-base`. Delete the `esbuild-base`, `esbuild`, `esbuild-watch` and `test-compile`
  scripts. The packaged VSIX must not contain `out/main.js`. Watch for stale maps: CI runs
  `npm run build` (sourcemaps on) before `vsce package`, so `out/*.cjs.map` from that build can
  survive the minified rebuild and ship. `.vscodeignore` does not exclude `*.map` today. Make sure
  the VSIX carries no stale maps (exclude them or clean them before bundling).
- **D-14:** Lint moves out of prepublish. `preview.yml`'s and `manual-release.yml`'s `verify` jobs
  gain explicit `npm run lint` and `npm run typecheck:test` steps, the same gates as the PR build.
- **D-15:** Minified bundles set esbuild `keepNames: true`, so function and class names survive in
  user-reported stack traces. No sourcemap ships (current `sourcemap: !minify` stays). This matters
  for IntelliJ too: the `main.cjs` uploaded for the plugin is taken after `vsce package`, so it is
  the minified bundle.
- **D-16:** Remove every `onCommand:` entry from `activationEvents` and keep only
  `onLanguage:bbj` and `onLanguage:bbx-config`. With `engines.vscode ^1.101`, VS Code generates
  command activation from `contributes.commands`. Update the two tests that assert `onCommand:`
  entries (`test/cvs-composer-ui.test.ts:582`, `test/setopts-in-code-ui.test.ts:593`) to assert
  the command is contributed in `contributes.commands` and not listed in `activationEvents`.
- **D-17:** Remove the `textMate` block from `langium-config.json`. The generated
  `syntaxes/gen-bbj.tmLanguage.json` is gitignored and unreferenced; the shipped grammar is the
  hand-maintained `syntaxes/bbj.tmLanguage.json`. Then remove the matching `.gitignore` line.
- **D-18:** In `preview.yml` and `manual-release.yml`, the version bump sits between `npm ci` and
  the explicit build/package. Narrowing `prepare` must keep the post-bump version in the VSIX
  manifest (success criterion 4). The packaged VSIX installs, activates and carries the bumped
  version.

**Permissions & shared preamble (Claude-proposed, user did not contest)**
- **D-19:** Every workflow declares a top-level `permissions: contents: read`. Only jobs that need
  more escalate at job level: `preview.yml` `bump-version` (`contents: write`, it pushes),
  `manual-release.yml` `tag-release` and `create-release` (`contents: write`), `build.yml`'s PR job
  (`pull-requests: write` for the sticky comment), and `deploy-docs.yml` keeps `pages: write` and
  `id-token: write`. Under-scoping `contents: write` in the release workflows would fail silently
  on their next run, so check each push/tag/release step against its job's scope.
- **D-20:** The shared preamble is a composite action under `.github/actions/` (not a reusable
  workflow). A local composite action can only be used after checkout, so `actions/checkout`
  stays an inline first step in each job. The composite covers Node setup (Node 22, one place) with
  npm caching and, optionally, `npm ci`, via inputs for the working directory, the lockfile path,
  whether to install, and whether to cache (D-10). `workflow-hygiene.yml` (install-free) and
  `deploy-docs.yml` use it too, so every workflow uses the shared form.
- **D-21:** `gradle/actions/wrapper-validation` stays an inline step in each Gradle-invoking job,
  because `check-gradle-wrapper.mjs` checks that it appears in the job before the first Gradle
  invocation. Its regexes already accept `@<sha>` pins. Whether `setup-gradle` sits inline or in a
  second composite action is the planner's call, as long as that checker stays green.
- **D-22:** Extend `.github/dependabot.yml`'s `github-actions` entry to also cover the composite
  action directory (for example `directories: ["/", "/.github/actions/*"]`, confirmed by the
  researcher). Otherwise the pins inside the composite go stale. This is a small follow-on edit to
  the Phase 117 CI-04 entry.

### Claude's Discretion
- The composite action's name, input names and defaults.
- Whether the token-holding publish jobs run `npm ci --ignore-scripts` (they only need vsce).
- The exact layout of the new hygiene checker and its test, following the existing two checkers.
- Step naming and indentation normalisation across workflows (the six drift axes in #573 converge
  to one value each).
- Plan split and ordering (packaging/package.json, workflows + composite, hygiene checker).

### Deferred Ideas (OUT OF SCOPE)
- Upgrading actions to current majors (checkout v5, setup-node v5/v6, artifact v5+, github-script
  v8): left to the grouped Dependabot PR after this phase (D-06, D-07).
- Folding the IntelliJ PR verification into `build.yml` to avoid its second vscode build:
  considered, rejected for now (D-03).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CI-01 | Every workflow declares a least-privilege `permissions:` block (#547) | Per-job permission map below (verified by reading all 7 workflows); D-19 job list confirmed against actual push/tag/publish steps |
| CI-02 | `build.yml` no longer duplicates the PR build/test, has a concurrency group (#549) | `build.yml` + `pr-vsix.yml` full text below; merge plan and drift points identified |
| CI-03 | Every `uses:` reference pinned to a commit SHA with version comment (#550) | Full action-pin table with GitHub-API-resolved commit SHAs for all 11 distinct actions + the 2 gradle/actions sub-actions |
| CI-05 | Every workflow installing npm/Gradle deps uses caching (#518) | `gradle/actions/setup-gradle` input reference (fetched from source), IPGP 2.x cache-path evidence, npm caching pattern already proven in `deploy-docs.yml` |
| CI-06 | Checkout/Node-setup preamble defined once, every workflow uses it (#573) | Composite-action mechanics (shell requirement, `inputs.*` in `if:`, nested `setup-node` caching), current duplication inventory |
| CI-07 | `vscode:prepublish` builds only shipped bundles, minified; dead `esbuild-base` gone (#515) | `esbuild.mjs`, `.vscodeignore`, `package.json` read directly; stale-sourcemap mechanism traced end to end |
| CI-08 | `prepare` no longer duplicates the generate/type-check/bundle pipeline CI runs (#598) | `preview.yml`/`manual-release.yml` step order confirms version-bump timing is unaffected by narrowing `prepare` |
| CI-09 | Unreachable scripts, unused TextMate directive, contradictory `activationEvents` removed (#600) | Full repo grep for `esbuild-base`, `out/main.js`, `gen-bbj.tmLanguage`, `onCommand:`; found a **third** test file beyond CONTEXT's list that also needs updating |
</phase_requirements>

## Summary

This phase touches configuration, not application logic: 7 GitHub Actions workflow files, one new
composite action, `bbj-vscode/package.json`'s scripts/activationEvents/engines, `esbuild.mjs`,
`langium-config.json`, `.vscodeignore`, and `.gitignore`. Every fact needed to plan it precisely
was obtainable by (a) reading the actual workflow/package files in this repo, and (b) resolving
each GitHub Action's current-major latest release to a commit SHA through the GitHub API — no
speculative research was needed for the SHA-pinning requirement (CI-03), which is normally the
hardest part of this kind of phase to get exactly right.

Three points surfaced during research that are **not** already covered by CONTEXT.md and change
what the planner needs to do:

1. **A third test file references `onCommand:`** beyond the two CONTEXT.md names:
   `bbj-vscode/test/functional/installed-extension-e2e.test.ts:266-269` asserts
   `activationEvents` contains `onCommand:bbj.composeSetoptsInCode`. D-16's rewrite (assert the
   command is contributed, not that it's in `activationEvents`) must apply to this file too.
2. **Neither existing hygiene checker recurses into subdirectories.** `check-workflow-secrets.mjs`'s
   `expandTargets` and `check-gradle-wrapper.mjs`'s `expandWorkflowFiles` both do a flat
   `readdirSync` filtered to `*.yml`/`*.yaml` in the given directory — they do not walk into
   subdirectories. Pointing either checker at `.github/actions` (the parent) would find nothing;
   they must be pointed at `.github/actions/<name>` (the action's own directory, which directly
   contains `action.yml`).
3. **Dependabot's `directories` glob behavior for the `github-actions` ecosystem is not
   authoritatively documented** for the composite-action case CONTEXT.md's D-22 example assumes.
   Reading `dependabot-core`'s actual file-fetcher source (below) shows the exact, deterministic
   mechanism: a **non-root** `directory` entry for this ecosystem lists that literal directory
   (non-recursively) for any `*.yml`/`*.yaml` file — which means an explicit, literal
   `/.github/actions/<name>` entry is guaranteed to work, while the glob form
   (`/.github/actions/*`) is only supported at the config-parsing layer for expanding into
   concrete directories and was not confirmed against this specific ecosystem in any source
   consulted. **Recommendation: use a literal second `directory` entry, not a glob** — there is
   only one composite action in this phase, so the glob buys nothing and adds unverified risk.

**Primary recommendation:** Build the pin table below directly into the workflows (all commit SHAs
were resolved and verified against the GitHub API this session — treat them as ready to paste, not
as a starting point for further research). Build the composite action so that only `actions/checkout`
and, where applicable, `gradle/actions/wrapper-validation` stay inline before it, exactly as D-20/D-21
require. Fix `.vscodeignore` to exclude `**/*.map` as the single, order-independent fix for the
stale-sourcemap problem in D-13.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Least-privilege token scoping | CI / Workflow orchestration | — | `permissions:` is a GitHub Actions job/workflow-level control; no application code involved |
| SHA-pinning of third-party actions | CI / Workflow orchestration | Dependabot (drift prevention) | Supply-chain control at the `uses:` reference level; Dependabot is the update mechanism, not the enforcement mechanism |
| Dependency caching (npm, Gradle) | CI / Build tooling | — | Cache configuration lives entirely in `setup-gradle`/composite-action inputs; no source change |
| Shared setup preamble | CI / Build tooling (composite action) | — | A composite action is itself a small piece of "infrastructure code" versioned like the workflows it serves |
| VSIX packaging (minify, dead-script removal) | Build tooling (esbuild, vsce) | VS Code extension manifest (`package.json`) | esbuild produces the bundle; `package.json` scripts and `.vscodeignore` decide what ships |
| `activationEvents` / manifest hygiene | VS Code extension manifest | Extension host (implicit activation, VS Code ≥1.74) | The manifest is data the extension host reads; no runtime code changes |
| Release/publish gating | CI / Workflow orchestration | Marketplace credentials (secrets) | Publish jobs are a privileged tier of the CI pipeline; caching and permissions must not let a lower-privilege job's inputs reach them |

## Standard Stack

### Core
| Tool | Version (pin target) | Purpose | Why Standard |
|------|---------|---------|--------------|
| `actions/checkout` | v4.4.0 → `11d5960a326750d5838078e36cf38b85af677262` | Repo checkout | Already in use; latest v4.x release |
| `actions/setup-node` | v4.4.0 → `49933ea5288caeca8642d1e84afbd3f7d6820020` | Node 22 toolchain + npm cache | Already in use; latest v4.x release |
| `actions/setup-java` | v4.9.1 → `cf277c60eb25467037889841efdb72551f06f6c3` | Temurin JDK 17 for Gradle jobs | Already in use; latest v4.x release |
| `actions/cache` | v4.3.0 → `0057852bfaa89a56745cba8c7296529d2fc39830` | Plugin Verifier download cache (`~/.pluginVerifier`) | Already in use; latest v4.x release |
| `actions/upload-artifact` | v4.6.2 → `ea165f8d65b6e75b540449e92b4886f43607fa02` | VSIX / language-server / plugin zip artifacts | Already in use; latest v4.x release |
| `actions/download-artifact` | v4.3.0 → `d3f86a106a0bac45b974a628896c90dbdf5c8093` | Cross-job artifact handoff | Already in use; latest v4.x release |
| `actions/github-script` | v7.1.0 → `f28e40c7f34bde8b3046d885e986cb6290c5673b` | Sticky PR comment (moves from `pr-vsix.yml` into `build.yml`) | Already in use; latest v7.x release |
| `actions/configure-pages` | v4.0.0 → `1f0c5cde4bc74cd7e1254d0cb4de8d49e9068c7d` | GitHub Pages setup for docs | Already in use; only v4.x release |
| `actions/upload-pages-artifact` | v3.0.1 → `56afc609e74202658d3ffba0e8f6dda462b719fa` | Docs build artifact for Pages | Already in use; latest v3.x release |
| `actions/deploy-pages` | v4.0.5 → `d6db90164ac5ed86f2b6aed7e0febac5b3c0c03e` | Docs deployment | Already in use; latest v4.x release |
| `gradle/actions/wrapper-validation` | v6.4.0 → `3f5f9adaf7d9fecd50b5935e54106014257a94e6` | Gradle wrapper checksum validation | Already in use; latest v6.x release |
| `gradle/actions/setup-gradle` | v6.4.0 → `3f5f9adaf7d9fecd50b5935e54106014257a94e6` (same commit — monorepo, same tag) | **New**: Gradle caching for D-09 | Same major already adopted for wrapper-validation; official Gradle-maintained caching action |

All 12 pins above were resolved with `gh api repos/<owner>/<repo>/releases` to find the latest tag
within the major already in use, then `gh api repos/<owner>/<repo>/git/ref/tags/<tag>` to get the
tag object, then (for the one annotated tag, `gradle/actions`) `gh api repos/<owner>/<repo>/git/tags/<sha>`
to dereference to the commit. Every resulting commit SHA was independently re-verified with
`gh api repos/<owner>/<repo>/commits/<sha>` returning the same SHA (i.e. the commit exists and the
SHA is not a dangling/blob SHA). **[VERIFIED: GitHub API, this session, 2026-09-29]** — these are
ready to paste, but re-run the resolution if planning is delayed by more than a few days, since
patch releases land weekly for several of these actions.

Two of the resolved tags are **lightweight** tags pointing directly at a commit (all of `actions/*`);
one (`gradle/actions@v6.4.0`) is an **annotated** tag, so its `git/ref/tags` call returned a tag
object SHA (`b9bee63ef481cc545e4517ec730544a4d8b1dfa0`) that had to be dereferenced one more level via
`git/tags/<sha>` to reach the actual commit (`3f5f9adaf7d9fecd50b5935e54106014257a94e6`). D-06
explicitly warns about this distinction — it is real and was hit in this repo's own action set.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `gradle/actions/setup-gradle` | `actions/setup-java`'s `cache: gradle` input | D-09 already rejects this: setup-java's cache has no fine-grained exclude mechanism for IntelliJ Platform IDE distributions, which would blow the 10 GB per-repo cache limit |
| Literal `directory` entries per composite action (Dependabot) | `directories: ["/", "/.github/actions/*"]` glob | The glob's exact expansion behavior for the `github-actions` ecosystem was not confirmed in any source consulted (official docs, changelog, or `dependabot-core` issues); the literal form is proven correct by reading the file-fetcher source itself (see Open Question 3 discussion below) |
| Composite action | Reusable workflow (`workflow_call`) | D-20 already decided: composite action, because a reusable workflow cannot easily inject caching/checkout steps into the *calling* job's own step sequence the way this preamble needs (checkout must stay the calling job's own first step) |

**Installation:** No new npm/pip/cargo packages are introduced by this phase — see Package
Legitimacy Audit below.

## Package Legitimacy Audit

This phase introduces **no new npm, pip, or cargo dependencies**. It only:
- removes npm scripts (no package removal — `esbuild`, `shx`, `tsc` etc. all stay as devDependencies
  and remain in use elsewhere),
- adds a new GitHub Actions reference (`gradle/actions/setup-gradle`), which is not an npm/pip/cargo
  package and is not subject to the `package-legitimacy check` seam (that seam targets language
  package registries, not GitHub's Marketplace/Actions namespace). Its legitimacy is instead
  established by SHA-pinning to a specific, API-verified commit from the same `gradle/actions`
  monorepo/organization that already publishes `wrapper-validation`, which this repo has used
  since at least Phase 117 with no incident.

| Package | Registry | Verdict | Disposition |
|---------|----------|---------|-------------|
| — | — | N/A — no new npm/pip/cargo packages | No audit needed |

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```
Pull Request opened/updated
        │
        ├──► build.yml (unconditional, no paths filter)
        │      preamble(checkout, setup-node+npm cache, npm ci)
        │        → build → lint → typecheck:test → test
        │        → vsce package → upload vsix-pr<N> artifact
        │        → sticky PR comment (skip on fork PRs)
        │      [concurrency: pr-<N>, cancel-in-progress]
        │
        ├──► pr-validation.yml (path-filtered: language/, tools/, syntaxes/, bbj-intellij/)
        │      preamble(checkout, setup-node+npm cache, npm ci) → build
        │        → upload language-server artifact
        │      ──► validate-intellij job
        │            download language-server artifact
        │            setup-java → wrapper-validation → setup-gradle (cached)
        │            → gradlew buildPlugin → gradlew verifyPlugin
        │      [concurrency: pr-<N>, cancel-in-progress]
        │
        └──► workflow-hygiene.yml (install-free)
               check-workflow-secrets.mjs (workflows + .github/actions/<name>)
               check-gradle-wrapper.mjs (workflows only — no composite Gradle calls)
               check-action-pins-and-permissions.mjs  ← NEW (D-08)

Push to main
        │
        ├──► preview.yml [concurrency: publish-preview, no cancel]
        │      verify job: preamble(cache write, since default branch) → npm ci
        │        → bump patch version → build → test → lint → typecheck:test
        │        → vsce package --pre-release → upload vscode-extension + language-server
        │        → setup-java/wrapper-validation/setup-gradle(cached) → gradlew buildPlugin/verifyPlugin
        │        → upload bbj-intellij zip
        │      bump-version job (needs verify) — contents:write — commits + pushes bump
        │      publish-vscode job (needs verify, bump-version) — install cold, no cache
        │        → download vscode-extension → vsce publish (VSCE_PAT)
        │      publish-intellij job (needs verify, bump-version) — install cold, no cache
        │        → download language-server → wrapper-validation → gradlew publishPlugin (JETBRAINS token)
        │
        └──► deploy-docs.yml (path-filtered: documentation/**) [concurrency: pages, no cancel]
               preamble(checkout, setup-node+npm cache) → npm ci → npm run build
               → configure-pages → upload-pages-artifact → deploy-pages (pages:write, id-token:write)

workflow_dispatch (manual)
        └──► manual-release.yml
               verify job: preamble → npm ci → validate/set version → build → test
                 → lint/typecheck:test (NEW, D-14) → vsce package → upload artifacts
                 → setup-java/wrapper-validation/setup-gradle(cached) → gradlew buildPlugin/verifyPlugin
               publish-vscode / publish-intellij (needs verify) — install cold, no cache
               tag-release (needs both publishes) — contents:write — commit, tag, push
               create-release (needs tag-release) — contents:write — gh release create
```

A reader can trace: PR → one gate (`build.yml`) plus one conditional gate
(`pr-validation.yml`) → merge to `main` → `preview.yml`'s `verify` (unprivileged, cached) →
`bump-version` (privileged, no cache needed) → two parallel cold, uncached, credential-bearing
publish jobs. The privilege boundary (D-10/D-19) is the point after which no job restores a cache
or shares a token with an earlier, lower-trust job.

### Recommended Project Structure
```
.github/
├── workflows/
│   ├── build.yml              # merged: build + pr-vsix (D-01, D-02)
│   ├── pr-validation.yml      # unchanged trigger, gets preamble + pins + perms
│   ├── preview.yml            # gets preamble, lint/typecheck, setup-gradle
│   ├── manual-release.yml     # gets preamble, lint/typecheck, setup-gradle
│   ├── deploy-docs.yml        # gets preamble (npm-cache pattern already correct here)
│   └── workflow-hygiene.yml   # gets preamble (install-free path) + third checker's job
├── actions/
│   └── <preamble-name>/       # e.g. "setup-bbj-node" (Claude's discretion on the name)
│       └── action.yml         # composite: checkout stays OUTSIDE this action (D-20)
└── dependabot.yml             # github-actions entry gets a literal second `directory`
```

### Pattern 1: Composite action as the shared preamble
**What:** A `.github/actions/<name>/action.yml` composite action wrapping `actions/setup-node`
(with `cache: npm`, `cache-dependency-path` passed through as an input) and, via an input flag,
`npm ci`.
**When to use:** Every workflow that needs Node — `actions/checkout` itself stays as the calling
job's own first step (a composite action cannot check out the repo *before* it runs, since the
action's own files must already be on disk to execute).
**Constraints confirmed this session:**
- `shell:` is **required** on every `run:` step inside a composite action if that step uses `run:`
  — there is no default shell the way there is for a normal workflow job step.
  **[CITED: GitHub Actions metadata syntax reference, "runs.steps[*].shell" — "Required if `run` is set"]**
- Steps can be conditioned on the action's own inputs: `if: inputs.install == 'true'` is valid and
  documented (GitHub Actions added conditional composite-action steps in November 2021).
  **[CITED: github.blog/changelog/2021-11-09-github-actions-conditional-execution-of-steps-in-actions]**
- Nesting `actions/setup-node` (or any `uses:` action) inside a composite action step works
  normally — the nested action's own inputs (`cache`, `cache-dependency-path`) are simply forwarded
  from the composite's own inputs (`with: cache-dependency-path: ${{ inputs.cache-dependency-path }}`).
  This is standard, uncontroversial composite-action composition. **[ASSUMED — extremely common
  pattern, not separately doc-confirmed this session, but zero conflicting evidence found]**

**Example (illustrative skeleton, not copied from any fetched source — verify exact syntax against
the metadata reference before landing):**
```yaml
# .github/actions/<name>/action.yml
name: 'Setup Node (BBj)'
description: 'Checkout must happen before this action runs.'
inputs:
  working-directory:
    required: false
    default: 'bbj-vscode'
  cache-dependency-path:
    required: false
    default: 'bbj-vscode/package-lock.json'
  install:
    required: false
    default: 'true'
runs:
  using: 'composite'
  steps:
    - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4.4.0
      with:
        node-version: 22
        cache: npm
        cache-dependency-path: ${{ inputs.cache-dependency-path }}
    - if: inputs.install == 'true'
      shell: bash
      working-directory: ${{ inputs.working-directory }}
      run: npm ci
```

### Pattern 2: Gradle caching via `setup-gradle` with cache excludes
**What:** `gradle/actions/setup-gradle` replaces the bare `actions/setup-java` + manual Gradle
invocation, adding `gradle-home-cache-excludes` for the IntelliJ Platform IDE distributions.
**Confirmed inputs (fetched directly from `setup-gradle/action.yml` at the pinned tag, this session):**
- `gradle-home-cache-includes` (default: `caches` and `notifications`, i.e. paths relative to
  Gradle User Home `~/.gradle`)
- `gradle-home-cache-excludes` (no default — a newline-separated list of paths within Gradle User
  Home to exclude)
- `cache-read-only` (default: `${{ github.event.repository != null && github.ref_name !=
  github.event.repository.default_branch }}` — **this already implements D-09's "only `main`
  writes, PRs read" requirement with zero configuration**; do not override it)
- `cache-disabled` (default `false`) — the mechanism to use in the credential-bearing
  `publish-intellij` job per D-10, since that job still runs `gradlew publishPlugin` (a real Gradle
  invocation) and needs no cache read *or* write
- `validate-wrappers` (default `true`) — `setup-gradle` **does** perform its own wrapper validation
  automatically. This does not satisfy `check-gradle-wrapper.mjs`, whose `WRAPPER_VALIDATION_USES`
  regex only recognizes an explicit `uses: gradle/actions/wrapper-validation` line — so the
  standalone step must stay, exactly as D-21 already decided. The checker's `GRADLE_INVOCATION`
  regex treats a `uses: gradle/actions/setup-gradle` line itself as the "Gradle invocation" point
  (via its `GRADLE_SETUP_USES` pattern), so **the wrapper-validation step must appear before the
  `setup-gradle` step in the job**, not merely before the first `./gradlew` call.
  **[VERIFIED: gradle/actions/setup-gradle/action.yml @ 3f5f9adaf7d9fecd50b5935e54106014257a94e6,
  fetched via `gh api repos/gradle/actions/contents/setup-gradle/action.yml?ref=v6.4.0`]**

**IntelliJ Platform Gradle Plugin (IPGP) 2.x cache paths (what to exclude):**
- Downloaded IDE distribution archives land in Gradle's normal module cache under
  `caches/modules-2/files-2.1/com.jetbrains.intellij.idea/...` (and sibling groups for other IDE
  flavours, e.g. `com.jetbrains.intellij.pycharm`, if ever referenced by `recommended()`).
  **[CITED: web search summary of JetBrains Platform SDK docs + `com.jetbrains.intellij.idea`/`ideaIU`
  coordinate structure]**
- The *unpacked* IDE distribution used for compiling/verifying against lands under
  `caches/transforms-<N>/<hash>/transformed/idea<Edition>-<version>/`, where `<N>` is a
  Gradle-version-dependent transforms-cache generation number (observed as `transforms-3` in a
  2024.1 example). Because `<N>` varies by Gradle version, exclude the whole family with a glob,
  not a fixed number. **[CITED: JetBrains/intellij-platform-gradle-plugin issue #1601, which shows
  the literal paths `~/.gradle/caches/transforms-3/<hash>/transformed/ideaIU-2024.1` for six
  redundant copies totaling ~3.3 GB each]**
- Recommended `gradle-home-cache-excludes` value (two lines, relative to Gradle User Home):
  ```
  caches/modules-2/files-2.1/com.jetbrains.intellij.*
  caches/transforms-*
  ```
  **This glob syntax itself (whether `setup-gradle` treats these as prefix matches, globs, or
  requires a trailing `/**`) is not spelled out in the action's own input description** — the
  description only says "Paths within Gradle User Home to exclude from cache." Treat this as
  something to confirm empirically from the actual cache-size line in the job summary after the
  first PR run under the new composite/setup-gradle step (this is a natural, low-cost place to
  fold in a verification step per the Validation Architecture below), not as a hard blocker to
  planning.
- No project-local directory needs excluding: `setup-gradle` only caches paths within Gradle User
  Home; a directory like `.intellijPlatform/` (referenced only as a skip-name inside this repo's
  own `check-gradle-wrapper.mjs` `SKIP_DIR_NAMES` set, confirmed by reading that file this session)
  would live in the project working directory, not `~/.gradle`, and so is never a `setup-gradle`
  cache candidate regardless.

### Pattern 3: Least-privilege permissions already partially modeled in this repo
**What:** `deploy-docs.yml` (lines 12-15) and `manual-release.yml`'s `create-release` job (lines
247-248) already declare explicit `permissions:` blocks — these are the two existing in-repo
examples to copy the *shape* from, not just the CONTEXT.md prose.
```yaml
# deploy-docs.yml:12-15 (workflow-level; different jobs need different scopes so this
# pattern only works because deploy-docs.yml's build job doesn't need pages:write)
permissions:
  contents: read
  pages: write
  id-token: write
```
```yaml
# manual-release.yml:246-248 (job-level escalation, the create-release job specifically)
permissions:
  contents: write
```
**Gap found by reading every job:** `manual-release.yml`'s `tag-release` job (needs 209-243) pushes
a commit, a tag, and two `git push` invocations, but has **no** `permissions:` block today — it
currently runs on whatever the org/repo default grants. This is exactly the D-19 gap to close:
`tag-release` needs an explicit `permissions: contents: write` block added (it doesn't have one to
adjust — it must be created new). `create-release` already has the right block; leave it.

### Anti-Patterns to Avoid
- **Trusting `directories` globs for Dependabot's `github-actions` ecosystem without verification:**
  see Open Questions below — use a literal directory path for the one composite action this phase
  adds.
- **Assuming `setup-gradle`'s automatic wrapper validation (`validate-wrappers: true`) satisfies
  `check-gradle-wrapper.mjs`:** it does not — the checker's regex is a literal `uses:` string match
  on `gradle/actions/wrapper-validation`.
- **Reordering `.vscodeignore` fixes behind a "clean `out/` before minified rebuild" step:** works,
  but is order-dependent and easy to regress if a future contributor reorders CI steps. The
  `.vscodeignore` fix (`**/*.map`) is declarative and survives any step reordering — prefer it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|--------------|-----|
| GitHub Action version freshness after SHA-pinning | A custom script that periodically re-resolves tags to SHAs | Dependabot's `github-actions` ecosystem (already present from Phase 117, extended in this phase for the composite action per D-22) | Dependabot already understands SHA-pinned `uses:` references and opens PRs that update both the SHA and the version comment together |
| Gradle wrapper checksum verification | A bespoke checksum script | `gradle/actions/wrapper-validation` (already adopted) | Official, Gradle-maintained, and already integrated with this repo's own `check-gradle-wrapper.mjs` regex expectations |
| YAML-aware workflow linting for pins/permissions (D-08) | A full YAML parser + AST-based scanner | The existing line-based, zero-dependency scanning convention (`collectRunBodies`, `attributeJobs` in the two existing checkers) | This is a deliberate, established project convention (D-08 explicitly says "follow the pattern"); introducing a YAML parser dependency here would be inconsistent with the sibling checkers and add a devDependency for no measurable benefit — the existing regex-based approach already handles block scalars, `- run:` vs `run:`, and job attribution correctly |
| Cache-exclude path guessing for IntelliJ IDE downloads | Hand-measuring cache sizes from scratch | The pre-existing workflow comments already carry a measured baseline (~4.9 GB compressed / ~14.6 GB extracted) that D-09 explicitly says to preserve | Re-measuring from zero would be redundant; the comment is a controlled, dated benchmark worth keeping verbatim in the new setup-gradle step |

**Key insight:** every "don't hand-roll" opportunity in this phase is about *not deviating* from
patterns this repository has already adopted (Dependabot, the official Gradle actions, the
project's own zero-dependency hygiene-checker convention) — there is no greenfield library choice
to make.

## Common Pitfalls

### Pitfall 1: Annotated vs. lightweight tag SHA confusion (D-06's own warning, reproduced here)
**What goes wrong:** `gh api repos/<owner>/<repo>/git/ref/tags/<tag>` returns an `object.sha` that,
for an **annotated** tag, is the tag object's own SHA — not the commit SHA. Pinning `uses:` to that
SHA silently breaks (GitHub Actions will reject or mis-resolve a tag-object SHA as a ref).
**Why it happens:** Most `actions/*` releases use lightweight tags (object type `commit`), so this
only bites on annotated-tag publishers.
**How to avoid:** Check `object.type` in the ref response; if it's `"tag"`, make one more call to
`git/tags/<sha>` to read `.object.sha`, which is the actual commit. This repo's own action set hit
this exactly once, for `gradle/actions@v6.4.0` (confirmed this session).
**Warning signs:** A SHA that "looks right" but the workflow fails at parse time with an
unresolvable ref, or `gh api repos/<owner>/<repo>/commits/<sha>` returning a 404/different SHA than
requested.

### Pitfall 2: Flat (non-recursive) hygiene-checker directory scanning
**What goes wrong:** Pointing `check-workflow-secrets.mjs` or a new checker at `.github/actions`
(the parent directory) silently scans zero files, because `expandTargets`/`expandWorkflowFiles` do
a single-level `readdirSync` filtered by file extension — they do not recurse into
`.github/actions/<name>/`.
**Why it happens:** Both existing checkers were written when the only target was a flat
`.github/workflows/` directory of files; nobody has yet pointed them at a directory of
subdirectories.
**How to avoid:** Invoke the checker with the action's own directory as an explicit target (or its
exact file path), e.g. `node check-workflow-secrets.mjs .github/workflows .github/actions/<name>`.
**Warning signs:** `workflow-hygiene.yml`'s secret-hygiene job reports `0 findings` even after an
intentionally-planted `${{ secrets.X }}` is added to the composite action's `run:` body — a
false-negative that is easy to miss because the job still exits 0 (success).

### Pitfall 3: Stale `.cjs.map` files surviving into the VSIX
**What goes wrong:** CI runs `npm run build` (non-minified, `sourcemap: !minify` = true) before
`vsce package` triggers `vscode:prepublish`'s minified rebuild (no sourcemap). esbuild's `outdir`
write only overwrites `out/extension.cjs`/`out/language/main.cjs` — it does not delete
`out/extension.cjs.map`/`out/language/main.cjs.map` left by the earlier non-minified build.
`.vscodeignore` (read this session) has no `*.map` exclusion, so `vsce package` would include these
now-orphaned, mismatched sourcemaps in the shipped VSIX.
**Why it happens:** Two separate `esbuild.mjs` invocations in the same job, one with sourcemaps and
one without, writing to the same `outdir` without a clean step in between.
**How to avoid:** Add `**/*.map` to `.vscodeignore` — this is order-independent and survives any
future reordering of the build/package steps (see Anti-Patterns above).
**Warning signs:** `unzip -l *.vsix | grep '\.map'` after packaging returns any hits.

### Pitfall 4: Missing wrapper-validation-before-setup-gradle ordering
**What goes wrong:** If `gradle/actions/setup-gradle` is placed before the existing
`gradle/actions/wrapper-validation` inline step in a job, `check-gradle-wrapper.mjs` reports a
finding ("wrapper-validation step ... after its first Gradle invocation") and CI fails.
**Why it happens:** The checker treats `uses: gradle/actions/setup-gradle` itself, not just
`./gradlew` calls, as the "first Gradle invocation" (confirmed by reading `GRADLE_SETUP_USES` in
the checker source).
**How to avoid:** Keep `wrapper-validation` as the first Gradle-related step in every job, before
`setup-gradle`.
**Warning signs:** `workflow-hygiene.yml`'s `wrapper-hygiene` job fails on a PR that reorders these
two steps.

### Pitfall 5: A missed third `onCommand:` test file
**What goes wrong:** Removing all `onCommand:` entries (D-16) without updating
`test/functional/installed-extension-e2e.test.ts:266-269` leaves a third failing assertion beyond
the two CONTEXT.md names.
**Why it happens:** This test lives under `test/functional/`, a directory CONTEXT.md's canonical
file list did not enumerate; a repo-wide grep (done this session) is the only way to find it
reliably.
**How to avoid:** Grep the whole tree for `onCommand:` before considering D-16 complete, not just
the two named files.
**Warning signs:** `npm run test` (or the `installed-extension-e2e` suite specifically) fails after
the `activationEvents` edit.

## Code Examples

### Existing hygiene-checker CLI/test contract to follow for the new D-08 checker
```typescript
// Source: bbj-vscode/test/workflow-secret-hygiene.test.ts (read in full this session)
// Pattern: execFileSync spawns the checker as a subprocess, asserts exit code + stdout shape.
function runChecker(args: string[]): { status: number; stdout: string } {
    try {
        const stdout = execFileSync('node', [CHECKER_PATH, ...args], { encoding: 'utf8' });
        return { status: 0, stdout };
    } catch (err) {
        const spawnError = err as { status: number | null; stdout?: string };
        return { status: spawnError.status ?? -1, stdout: spawnError.stdout ?? '' };
    }
}
// Exit codes observed across both existing checkers: 0 = clean, 1 = findings, 2 = refused
// (empty/unattributable scan — "never silently report success on nothing scanned").
```

### `expandTargets`'s actual (non-recursive) directory-scanning behavior
```javascript
// Source: bbj-vscode/tools/check-workflow-secrets.mjs (read in full this session)
function expandTargets(targets) {
  const files = [];
  for (const target of targets) {
    const stat = fs.statSync(target);
    if (stat.isDirectory()) {
      const entries = fs
        .readdirSync(target)                                   // NOT recursive
        .filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml'))
        .sort();
      for (const entry of entries) {
        files.push(path.join(target, entry));
      }
    } else {
      files.push(target);
    }
  }
  return files;
}
```

### `check-gradle-wrapper.mjs`'s Gradle-invocation and wrapper-validation regexes
```javascript
// Source: bbj-vscode/tools/check-gradle-wrapper.mjs (read in full this session)
const GRADLE_INVOCATION = /(^|[\s"'/])gradlew(\.bat)?(\s|$)|(^|[\s"'])gradle(\s+\S)/;
const GRADLE_SETUP_USES = /^\s*(-\s+)?uses:\s*(gradle\/actions\/setup-gradle|gradle\/gradle-build-action)(@|\s|$)/;
const WRAPPER_VALIDATION_USES = /^\s*(-\s+)?uses:\s*gradle\/actions\/wrapper-validation(@|\s|$)/;
// A job's "first invocation line" is whichever of a `run:` gradlew call or a
// `uses: gradle/actions/setup-gradle` line comes first — so setup-gradle counts as an
// invocation for ordering purposes (Pitfall 4 above).
```

### Dependabot `github-actions` file-fetcher's actual directory semantics
```ruby
# Source: dependabot/dependabot-core, github_actions/lib/dependabot/github_actions/file_fetcher.rb
# (fetched via `gh api repos/dependabot/dependabot-core/contents/...` this session)
def workflow_files
  if directory == "/"
    # root: scans root action.yml/action.yaml PLUS .github/workflows/*.yml
    workflows_dir = WORKFLOW_DIRECTORY   # ".github/workflows"
  else
    # non-root: scans the CONFIGURED DIRECTORY ITSELF (non-recursively) for *.yml/*.yaml
    workflows_dir = "."
  end
  @workflow_files += repo_contents(dir: workflows_dir, raise_errors: false)
    .select { |f| f.type == "file" && f.name.match?(MANIFEST_FILE_PATTERN) }  # /\.ya?ml$/
    .map { |f| fetch_file_from_host("#{workflows_dir}/#{f.name}") }
end
```
This is the authoritative mechanism behind Open Question 3 (dependabot.yml): a **literal** second
`directory` entry pointing at the composite action's own folder (e.g. `/.github/actions/<name>`)
is guaranteed, by this source code, to pick up that folder's `action.yml`. This was read directly
from the dependabot-core repository this session, not inferred from documentation or blog posts.

### `gradle/actions/setup-gradle`'s relevant cache inputs (verbatim from `action.yml`)
```yaml
# Source: gradle/actions repo, setup-gradle/action.yml @ v6.4.0 (fetched via gh api this session)
gradle-home-cache-includes:
  description: Paths within Gradle User Home to cache.
  default: |
      caches
      notifications
gradle-home-cache-excludes:
  description: Paths within Gradle User Home to exclude from cache.
  # no default — supply the IPGP 2.x excludes here
cache-read-only:
  default: ${{ github.event.repository != null && github.ref_name != github.event.repository.default_branch }}
cache-disabled:
  description: When 'true', all caching is disabled. No entries will be written to or read from the cache.
  default: false
validate-wrappers:
  description: |
    When 'true' (the default) the action will automatically validate all wrapper jars found in the repository.
  default: true
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Explicit `onCommand:` activation events matching every contributed command | VS Code auto-generates `onCommand`/`onView`/etc. activation events from `contributes.*` | VS Code 1.74 (November 2022) | This repo's `engines.vscode: ^1.101.0` is far past 1.74, so D-16's removal is safe; VS Code's own editor already surfaces a redundancy warning for the entries being removed. **[CITED: code.visualstudio.com/updates/v1_74; microsoft/vscode-vsce#808]** |
| `esbuild-base` producing an unreferenced `out/main.js` | `esbuild.mjs`'s dual-entry-point build (`src/extension.ts` + `src/language/main.ts`) producing exactly `out/extension.cjs` + `out/language/main.cjs` | Already the case for the non-minified `build` script; `vscode:prepublish` is the one place still stuck on the old script (#515) | Fixing `vscode:prepublish` to call `node ./esbuild.mjs --minify` closes the last gap |
| Per-workflow ad hoc caching (only `deploy-docs.yml` had it) | `cache: npm` + `cache-dependency-path` via the shared composite action everywhere; `gradle/actions/setup-gradle` for Gradle | This phase | Consistent cache behavior, one place to change |
| Multi-directory Dependabot config without wildcard support | `directories` (plural) supports globbing/wildcards | GitHub Actions changelog, 2024-06-25 | Available, but its exact behavior for the `github-actions` ecosystem's composite-action case is not documented — prefer the literal, source-verified form for the one action this phase adds |

**Deprecated/outdated:**
- `esbuild-base`/`esbuild`/`esbuild-watch`/`test-compile` npm scripts: dead since `esbuild.mjs` and
  `tsc -b` took over the real build path; being deleted this phase (CI-07/CI-09).
- `langium-config.json`'s `textMate.out` directive: generates a gitignored, unreferenced file on
  every install; being removed this phase (CI-09).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Nested `actions/setup-node` inside a composite action forwards `cache`/`cache-dependency-path` inputs normally, with no special-casing needed for the composite context | Architecture Patterns, Pattern 1 | Low — this is an extremely common, widely-used pattern; if it somehow misbehaves, the failure mode is a cache miss (correctness-preserving, just slower), not a broken build |
| A2 | `gradle-home-cache-excludes` accepts glob-style patterns like `caches/modules-2/files-2.1/com.jetbrains.intellij.*` and `caches/transforms-*` (the action's own input description does not specify exact matching syntax) | Architecture Patterns, Pattern 2 | Medium — if the exclude patterns don't match, the cache stays oversized (repeats the exact problem D-09 exists to fix) but does not break functionality; verify via the job summary's reported cache size after the first real run |
| A3 | A literal Dependabot `directory: "/.github/actions/<name>"` entry (not a glob) is sufficient and correctly scoped for the one composite action this phase adds | Summary, Code Examples | Low — confirmed by reading dependabot-core's own file-fetcher source this session; the only residual risk is a dependabot-core version skew between what was read and what GitHub actually runs, which is unlikely to change this specific, stable code path |
| A4 | `esbuild`'s `keepNames: true` produces no measurable performance/size regression relevant to a VS Code extension bundle of this size | Standard Stack / State of the Art | Low — `keepNames` adds a small `__name()` wrapper call per named function/class; for a bundle in the hundreds-of-KB range (622 KB mentioned in issue #515) this is noise, and D-15 already accepts the tradeoff deliberately |

## Open Questions

1. **Exact glob syntax accepted by `gradle-home-cache-excludes`**
   - What we know: The input exists and is a newline-separated list of "paths within Gradle User
     Home to exclude from cache" (from the action's own metadata).
   - What's unclear: Whether it supports `*`/`**` glob wildcards, plain path prefixes, or exact
     paths only — the action's own description does not say.
   - Recommendation: Ship the two-line exclude list from Pattern 2 above as a best-effort first
     pass, and add a verification step (see Validation Architecture) that inspects the reported
     cache size in the first real PR run under `pr-validation.yml`. If the cache is still
     multi-gigabyte, the glob syntax likely needs adjusting to exact subpaths instead.

2. **Whether Dependabot's `directories` glob (plural key) works for the `github-actions`
   ecosystem's composite-action case**
   - What we know: `directories` (plural) supports wildcard/glob patterns in general (official
     docs, confirmed). The underlying file-fetcher, for any **non-root, literal** directory,
     scans that exact directory (non-recursively) for `*.yml`/`*.yaml` files including
     `action.yml` — this part is source-confirmed.
   - What's unclear: Whether the glob-expansion layer (which runs before the file-fetcher and
     turns `/.github/actions/*` into a list of concrete directories) is exercised identically for
     the `github-actions` ecosystem as for, say, `npm`'s `directories` config — no official
     example or changelog entry demonstrates this specific combination.
   - Recommendation: Since this phase adds exactly one composite action, use a literal second
     `directory` entry instead of a glob (`directories: ["/", "/.github/actions/<name>"]` with a
     literal, non-wildcard second element). This sidesteps the unconfirmed glob-expansion question
     entirely while still satisfying D-22's intent (composite-action pins stay tracked by
     Dependabot).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `gh` CLI (authenticated) | Resolving action SHAs during planning/execution, verifying issues | ✓ | 2.99.0, logged in as StephanWald | — |
| Node.js | Local packaging dry-run (`npm ci && npm run build && npx vsce package`) | Not probed this session (out of scope — the phase forbids running the test suite / modifying source; a packaging dry-run belongs to plan execution, not research) | — | Standing project convention: Node 22 (langium 4.3 toolchain requirement, confirmed via multiple workflow comments and `package.json`'s `engines.node: ">=22"`) |
| GitHub Actions runners (`ubuntu-latest`) | All 7 workflows | ✓ (implicit — already in use) | — | — |

No missing dependencies block this phase; everything needed (gh CLI, GitHub API access, the
existing hygiene-checker Node scripts) is already present and working in this environment.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.10 (`bbj-vscode/vitest.config.ts`, `include: ['test/**/*.test.ts']`) |
| Config file | `bbj-vscode/vitest.config.ts` (read this session — no changes needed for this phase) |
| Quick run command | `cd bbj-vscode && npx vitest run test/workflow-secret-hygiene.test.ts test/gradle-wrapper-hygiene.test.ts <new-D08-test>.test.ts` |
| Full suite command | `cd bbj-vscode && npm run test` (per project CLAUDE.md/memory: vitest needs cwd = `bbj-vscode`) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CI-01 | Every workflow has a least-privilege `permissions:` block | unit (new checker) | `node bbj-vscode/tools/check-action-pins-and-permissions.mjs` (name is Claude's discretion) | ❌ Wave 0 (D-08) |
| CI-03 | Every `uses:` reference is a 40-hex SHA with a `# vX.Y.Z` comment | unit (new checker, same run as CI-01) | same command as above | ❌ Wave 0 (D-08) |
| CI-02 | `build.yml` has a concurrency group and every PR passes at least one build-and-test gate | static + PR run | The PR that lands this phase IS the test: `build.yml` must go green on it | ✅ (workflow itself is the test) |
| CI-05 | A rerun with an unchanged lockfile shows a cache hit | manual/PR-run inspection | Check the `setup-node`/`setup-gradle` step logs on the second run of the same PR (push an empty commit) for "Cache restored" / cache-hit lines | ✅ (no new test file — log inspection) |
| CI-06 | Every workflow uses the shared composite action | static | `grep -L "uses: \./\.github/actions/" .github/workflows/*.yml` returns nothing except any deliberately-exempted workflow | ✅ (grep, not a test file) |
| CI-07 | Packaged VSIX contains no `out/main.js`, contains minified `out/extension.cjs`/`out/language/main.cjs` with `keepNames` names intact | manual packaging dry-run | `npm ci && npm run build && npx vsce package --no-dependencies` in a scratch worktree (Node 22), then `unzip -l *.vsix | grep -E 'main\.js|\.map'` (expect no hits) and `unzip -p *.vsix extension/out/extension.cjs \| grep -o '__name('` (expect hits, confirming `keepNames` survived minification) | ❌ Wave 0 — no existing automated check; this is inherently a packaging-artifact inspection, matches CONTEXT's own "Specific Ideas" packaging dry-run |
| CI-08 | Neither `npm ci` alone nor any CI workflow runs the generate/typecheck/bundle pipeline twice | manual timing check | Compare `npm ci` wall-clock time before/after the `prepare` narrowing (no dedicated automated test — this is a duplication-of-work check, not a correctness check) | N/A — timing observation, not a pass/fail test |
| CI-09 | Dead scripts, `textMate` directive, contradictory `activationEvents` entries removed; `npm run build`/`npm run langium:generate`/whole suite still pass | existing suite + 3 rewritten tests | `npx vitest run test/cvs-composer-ui.test.ts test/setopts-in-code-ui.test.ts test/functional/installed-extension-e2e.test.ts` | ✅ (3 files exist; all 3 need edits, not just the 2 CONTEXT.md names — see Pitfall 5) |

### Sampling Rate
- **Per task commit:** run the specific hygiene-checker test file(s) touched, plus the 3
  `onCommand:`-touching test files if `package.json`'s `activationEvents` changed.
- **Per wave merge:** `cd bbj-vscode && npm run test` (full suite; per standing project decision,
  the gate is project-wide `numFailedTests: 0`).
- **Phase gate:** Full suite green, plus the packaging dry-run (CI-07 row above), plus the
  standing UAT practice of building both distributables (VSIX + IntelliJ plugin zip) from the
  final tree, before `/gsd-verify-work`. Because this phase cannot exercise `preview.yml` or
  `manual-release.yml` from the branch without actually publishing to both marketplaces, the true
  test of those two workflows is the first real run after merge (SEED-002) — plan an explicit
  watch step for that, not just a static/dry-run check.

### Wave 0 Gaps
- [ ] `bbj-vscode/tools/check-action-pins-and-permissions.mjs` — new D-08 checker (name at
      planner's discretion)
- [ ] `bbj-vscode/test/action-pin-permissions-hygiene.test.ts` (or similar name) — its vitest test,
      following the `execFileSync` CLI-contract pattern shown in Code Examples above
- [ ] `.github/actions/<name>/action.yml` — the composite action itself (D-20)
- [ ] Update (not just the 2 named) — `test/cvs-composer-ui.test.ts:582`,
      `test/setopts-in-code-ui.test.ts:593`, **and**
      `test/functional/installed-extension-e2e.test.ts:266-269` (found this session, absent from
      CONTEXT.md's canonical file list)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | No auth flow touched |
| V3 Session Management | No | N/A |
| V4 Access Control | Yes | GitHub Actions `permissions:` blocks (least-privilege `GITHUB_TOKEN` scoping) — this phase's entire CI-01 requirement is an access-control hardening measure |
| V5 Input Validation | Marginal | The version-bump `jq`/regex logic in `preview.yml`/`manual-release.yml` is unchanged by this phase |
| V6 Cryptography | No | N/A — SHA-pinning is supply-chain integrity, not cryptographic key management, though it relies on git's SHA-1 commit-addressing as an integrity mechanism |
| V10 (Malicious Code) supply-chain equivalent | Yes | SHA-pinning every `uses:` reference (CI-03) is exactly a supply-chain integrity control against a re-tagged/compromised Action |

### Known Threat Patterns for GitHub Actions CI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Mutable tag re-tagged to malicious code, executed in a credential-bearing job | Tampering / Elevation of Privilege | SHA-pinning every `uses:` reference (this phase's CI-03); Dependabot for controlled, reviewable updates |
| Overly broad default `GITHUB_TOKEN` scope reaching a privileged job | Elevation of Privilege | Explicit least-privilege `permissions:` blocks, escalated only at the job level that needs it (CI-01, D-19) |
| Cache poisoning: a lower-trust job's cache entry read by a higher-trust (credential-bearing) job | Tampering | D-10: publish jobs install cold, no cache restore, so a poisoned cache entry from an earlier job in the same workflow run cannot reach the credential-bearing step |
| Fork-PR-triggered workflow run with a forced read-only token attempting a privileged action (e.g., posting a PR comment) | Spoofing / Elevation of Privilege | Already handled in the current `pr-vsix.yml` (carried into `build.yml` per D-02): the comment step is gated on `github.event.pull_request.head.repo.full_name == github.repository` |

## Sources

### Primary (HIGH confidence — verified via tool this session)
- GitHub API (`gh api repos/<owner>/<repo>/releases`, `.../git/ref/tags/<tag>`, `.../git/tags/<sha>`,
  `.../commits/<sha>`) — all 11 distinct action SHAs plus the `gradle/actions` monorepo SHA, cross-
  verified against the commits endpoint
- `gh api repos/gradle/actions/contents/setup-gradle/action.yml?ref=v6.4.0` — full `setup-gradle`
  input reference, read directly from the pinned commit's source
- `gh api repos/dependabot/dependabot-core/contents/github_actions/lib/dependabot/github_actions/file_fetcher.rb`
  and `constants.rb` — authoritative Dependabot directory-scanning mechanics
- Direct `Read` of all 7 workflow files, `bbj-vscode/package.json`, `bbj-vscode/esbuild.mjs`,
  `bbj-vscode/langium-config.json`, `bbj-vscode/.vscodeignore`, `bbj-vscode/.gitignore`,
  `bbj-vscode/tools/check-workflow-secrets.mjs`, `bbj-vscode/tools/check-gradle-wrapper.mjs`,
  `bbj-vscode/test/workflow-secret-hygiene.test.ts`, `bbj-vscode/vitest.config.ts`
- `gh issue view` on #547, #549, #550, #518, #573, #515, #598, #600 (BBx-Kitchen/bbj-language-server)
- Repo-wide `grep` for `esbuild-base`, `test-compile`, `out/main.js`, `gen-bbj.tmLanguage`,
  `onCommand:` — surfaced the third `onCommand:`-referencing test file

### Secondary (MEDIUM confidence — official docs / changelog, not independently tool-verified)
- docs.github.com: `dependabot-options-reference` (`directories` glob support), `metadata-syntax`
  (composite action `shell:` requirement), `activation-events.md` (implicit activation since 1.74)
- github.blog/changelog: 2021-11-09 (conditional composite-action steps), 2024-06-25 (multi-
  directory Dependabot glob support), 2024-04-29 (multi-directory beta)
- microsoft/vscode-vsce#808 (vsce implicit-activation-events handling)
- JetBrains/intellij-platform-gradle-plugin#1601 (literal `transforms-3` cache paths and sizes)

### Tertiary (LOW confidence — WebSearch summaries only, flagged inline where used)
- General web-search summaries about IPGP 2.x cache locations and Dependabot composite-action
  coverage from third-party repo issues (MAHDTech/agent-skills#195, countrymanprime/narration-
  utils#233) — used only as corroborating signal, not as the basis for any recommendation in this
  document; the actual recommendation (Open Question 2 in this doc) rests on the dependabot-core
  source read directly, not on these summaries

## Metadata

**Confidence breakdown:**
- Action SHA pins (CI-03): HIGH — resolved and cross-verified via the GitHub API this session
- Permissions map (CI-01): HIGH — derived from reading every job in every workflow file directly
- `build.yml`/`pr-vsix.yml` merge (CI-02): HIGH — both full files read; merge is mechanical
- Gradle cache excludes (CI-05): MEDIUM — exclude *targets* are well-evidenced; exact glob
  *syntax* accepted by the input is unconfirmed (Open Question 1)
- Composite action mechanics (CI-06): HIGH for `shell:`/`if: inputs.*` (doc-cited); MEDIUM/ASSUMED
  for nested-action cache pass-through (extremely common pattern, not separately doc-verified)
- Packaging/prepare fixes (CI-07, CI-08): HIGH — traced end to end by reading `esbuild.mjs`,
  `package.json`, `.vscodeignore`, and both `preview.yml`/`manual-release.yml` step orders directly
- Dead-config removal (CI-09): HIGH — full repo grep performed, found one additional file beyond
  CONTEXT.md's list
- Dependabot composite-action coverage (D-22): MEDIUM — literal-directory mechanism is source-
  verified HIGH; the glob alternative CONTEXT.md's example used is explicitly flagged unconfirmed

**Research date:** 2026-09-29
**Valid until:** ~7 days for the action-SHA pin table (several of these actions ship patch releases
weekly — re-resolve if planning/execution slips past a few days); ~30 days for everything else
(package.json/workflow structure, Dependabot mechanics, esbuild semantics)
