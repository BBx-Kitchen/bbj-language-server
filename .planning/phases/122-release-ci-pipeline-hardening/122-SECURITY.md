---
phase: "122"
slug: "release-ci-pipeline-hardening"
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: "2026-09-29"
---

# Phase 122 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| build tree → published VSIX | Whatever vsce collects from `bbj-vscode/` ships to every Marketplace user | packaged files (source maps, dev tooling) |
| extension host → shipped bundles | VS Code and the IntelliJ plugin execute `out/extension.cjs` and `out/language/main.cjs` | minified code |
| Actions cache → Gradle and npm jobs | Restored Gradle User Home and `~/.npm` content is read or executed by the build | cached artifacts |
| third-party actions → job tokens and secrets | Every `uses` reference executes with the job's `GITHUB_TOKEN` and, in publish jobs, Marketplace tokens | tokens, secrets |
| pull request → default-branch cache / PR job token | PR runs execute PR code with the job token; PR cache entries could otherwise be read on main | PR code, cache entries |
| verify job → publish jobs | Artifacts built in verify are published by `VSCE_PAT` / `JETBRAINS_MARKETPLACE_TOKEN` jobs | VSIX, plugin zip |
| workflow token → repository | bump-version, tag-release and create-release write commits, tags and releases | `contents: write` |
| docs build → Pages deployment | The deploy job mints an OIDC token for Pages | OIDC token |
| future pull requests / Dependabot → workflow definitions | Later changes could reintroduce mutable tags or broad tokens; Dependabot keeps pins current | workflow YAML |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-122-01 | Information Disclosure | `.vscodeignore` / packaged VSIX | medium | mitigate | `**/*.map`, `out/main.js`, `coverage/**` excluded (`.vscodeignore:16,19,21`); dev/CI-only tooling excluded by the review fix | closed |
| T-122-02 | Denial of Service | minified bundles | medium | mitigate | `keepNames: true` (`esbuild.mjs:23`); minified VSIX and IntelliJ zip passed UAT tests 1 and 3 | closed |
| T-122-03 | Repudiation | stack traces from user reports | low | mitigate | `keepNames: true` keeps class names in traces | closed |
| T-122-04 | Denial of Service | `activationEvents` | low | mitigate | `onLanguage:bbj` / `onLanguage:bbx-config` present (`package.json:662-665`); commands activate implicitly (UAT test 2) | closed |
| T-122-05 | Tampering | publish-intellij (preview, manual-release) | high | mitigate | `cache-disabled: true`, no restore step in both token jobs | closed |
| T-122-06 | Tampering | setup-gradle reference | high | mitigate | Pinned to `3f5f9adaf7d9…` (v6.4.0) in all five uses; re-resolved via GitHub API with the annotated tag dereferenced: OK | closed |
| T-122-07 | Tampering | PR-written Gradle cache read on main | medium | mitigate | `cache-read-only` left at its default (writes only on the default branch); no override in any workflow | closed |
| T-122-08 | Denial of Service | 10 GB repository cache | medium | mitigate | `gradle-home-cache-excludes` drops `com.jetbrains.intellij.*` and `caches/transforms-*` in pr-validation, preview and manual-release; cache-size watch item is UAT test 5 (post-PR) | closed |
| T-122-09 | Information Disclosure | Enhanced Caching metadata (option A) | low | accept | See accepted risks log | closed |
| T-122-10 | Tampering | secrets in publish run bodies | medium | mitigate | `workflow-secret-hygiene.test.ts` passes; `check-workflow-secrets.mjs` reports 0 findings across 39 run blocks | closed |
| T-122-11 | Tampering | pin/permission checker false negative | medium | mitigate | Empty scan exits 2 (verified); composite-action descent; comment-under-`jobs:` false negative fixed with regression fixtures; checker suite passes | closed |
| T-122-12 | Elevation of Privilege | future workflow widening the top-level token | medium | mitigate | Top-level `write-all` and write scopes are findings (`check-action-pins-and-permissions.mjs:320-321`) | closed |
| T-122-13 | Denial of Service | release job under-scoped for its push | medium | mitigate | `PUSH_OR_RELEASE` rule requires effective `contents: write`; job ids and the `jobs:` key are recognised with trailing comments, and a workflow with no recognised job ids is a finding (8f794c98, regression tests) | closed |
| T-122-14 | Tampering | `uses` references in PR-side workflows and the action | high | mitigate | Every non-local reference is `@<40-hex> # vX.Y.Z`; checker reports 0 findings over 64 references | closed |
| T-122-15 | Elevation of Privilege | build.yml job token (`pull-requests: write`) while running PR code | medium | accept | See accepted risks log | closed |
| T-122-16 | Elevation of Privilege | deploy-docs build job running third-party npm packages | medium | mitigate | Top-level `contents: read`; build job `contents: read` + `pages: read`; `pages: write` / `id-token: write` only on the deploy job | closed |
| T-122-17 | Denial of Service | shared concurrency group across PR workflows | medium | mitigate | Distinct groups `build-…` and `pr-validation-…` | closed |
| T-122-18 | Tampering | npm cache restored in PR jobs | low | accept | See accepted risks log | closed |
| T-122-19 | Information Disclosure | secrets in run bodies of the new action | low | mitigate | secret-hygiene job scans `.github/actions/*` (`workflow-hygiene.yml:38`) | closed |
| T-122-20 | Tampering | npm cache reaching publish-vscode (`VSCE_PAT`) | high | mitigate | publish-vscode uses the node-setup action with `cache: 'false'` in both release workflows | closed |
| T-122-21 | Elevation of Privilege | undeclared token scope in release workflows | high | mitigate | Top-level `contents: read`; `contents: write` only on bump-version (preview), tag-release and create-release (manual-release) | closed |
| T-122-22 | Denial of Service | under-scoped push/tag/release on first real run | high | mitigate | Push-scope rule passes on the whole tree; first preview run is UAT test 6 (post-merge watch item) | closed |
| T-122-23 | Tampering | mutable action tags in token-holding jobs | high | mitigate | Whole-tree pin scan: 0 findings | closed |
| T-122-24 | Information Disclosure | Marketplace tokens in run bodies | medium | mitigate | Secret checker 0 findings; publish-argument reconstruction test passes | closed |
| T-122-25 | Tampering | workflows and composite actions after this phase | high | mitigate | `pin-hygiene` job in `workflow-hygiene.yml` plus the real-tree vitest case | closed |
| T-122-26 | Tampering | stale pins inside the composite action | medium | mitigate | Dependabot `github-actions` lists `/` and `/.github/actions/node-setup` | closed |
| T-122-27 | Spoofing | version comment not matching its SHA | medium | mitigate | All 12 distinct pins re-resolved through the GitHub API on 2026-09-29, annotated tags dereferenced: 12 OK, 0 mismatch | closed |
| T-122-28 | Information Disclosure | secrets in composite-action run bodies | low | mitigate | secret-hygiene job scans `.github/actions/*` | closed |
| T-122-29 | Repudiation | commit bodies closing issues early on squash merge | low | mitigate | No closing keywords in this phase's commit bodies; `Closes` lines only in the PR body. Other milestone phases carry `Closes #563` / `Closes #605` in commit bodies, flagged on PR #708 for the merge dialog | closed |
| T-122-SC | Tampering | `npx --yes node@22` / `npm ci` in local verification | low | accept | See accepted risks log | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-122-01 | T-122-09 | Enhanced Caching metadata: Gradle states only cache-key metadata is used; never loaded in token jobs (all token jobs run with `cache-disabled: true`) | plan 122-02 (user checkpoint) | 2026-09-29 |
| AR-122-02 | T-122-15 | build.yml keeps `pull-requests: write` for the sticky VSIX comment; same-repo PR authors already have write access, fork PRs get a read-only token and skip the comment step; `contents` stays read | plan 122-04 | 2026-09-29 |
| AR-122-03 | T-122-18 | `npm ci` verifies every tarball against lockfile integrity hashes; PR-scoped cache entries are not visible to runs on main | plan 122-04 | 2026-09-29 |
| AR-122-04 | T-122-SC | Local verification only; committed lockfile installed with integrity checks; nothing from scratch worktrees is committed | plans 122-01, 122-06 | 2026-09-29 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-09-29 | 30 | 30 | 0 | /gsd-secure-phase (orchestrator, L1: grep + checker runs + GitHub API pin re-resolution + hygiene suites 21/21) |
| 2026-09-29 | 30 | 30 | 0 | Re-check after verifier found a T-122-13 bypass (trailing comment on a job id); fixed in 8f794c98, checker suite 19/19 |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-09-29
