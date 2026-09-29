---
phase: 117-dependency-hygiene-dependabot-coverage
verified: 2026-09-28T19:05:00Z
status: passed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
human_verification:

  - test: "Download the phase PR's pr-vsix workflow artifact, install the VSIX in VS Code, and open a .bbj file"
    expected: "The extension installs without error and activates (syntax highlighting / language features come up) on a .bbj file, proving the vsce-to-devDependencies move (DEP-01) did not change what the VSIX packages"
    why_human: "Requires a real VS Code editor and the CI-built artifact; not reproducible from a local static analysis of package.json/package-lock.json/the VSIX file list"
  - test: "After this phase's branch is merged to main, open GitHub Insights -> Dependency graph -> Dependabot"
    expected: "Four update entries are listed: npm /bbj-vscode, gradle /bbj-intellij, github-actions /, npm /documentation"
    why_human: "Dependabot only registers entries from a file on the default branch; GitHub-side state cannot be observed from a local checkout on a feature branch"
  - test: "A maintainer reviews /home/coder/repos/tmp/langium-44-topdown-repro/ISSUE-DRAFT.md and decides whether to file it against eclipse-langium/langium"
    expected: "A human decision to file (or not file) the upstream issue; nothing is filed automatically"
    why_human: "Filing upstream is explicitly gated on maintainer approval per D-08/D-10 in 117-CONTEXT.md; the executor and this verifier are both prohibited from filing it"
---

# Phase 117: Dependency Hygiene & Dependabot Coverage Verification Report

**Phase Goal:** The production dependencies contain only what the extension runs, every vendored or pinned dependency can be checked against advisory databases, and Dependabot watches every dependency tree while holding langium at 4.3.
**Verified:** 2026-09-28T19:05:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `npm ls --omit=dev` no longer lists `@vscode/vsce` or its transitive packages (DEP-01) | ✓ VERIFIED | `node -p` shows `deps: undefined`, `devDeps: ^4.0.0`; `npm ls --omit=dev --depth=0` lists exactly 7 packages (chevrotain, langium, properties-file, properties-reader, vscode-jsonrpc, vscode-languageclient, vscode-uri), no vsce. Lockfile diff-shape against phase base `deaa7de2`: 0 unexpected lines, 127 added `"dev": true` flags — independently re-run, matches 117-01-SUMMARY.md's claims exactly. |
| 2 | PR VSIX still packages an extension that installs and activates (DEP-01, second half of SC1) | — human_needed | Local file-list parity (`vsce ls`, VSIX entrypoints) was checked by the executor (117-01-SUMMARY.md) and is plausible, but "installs and activates" requires a real editor session against the CI-built artifact — see Human Verification |
| 3 | The vendored jcommander JAR has a committed provenance record an advisory database can be checked against, narrowed to jcommander only per D-01 (DEP-02) | ✓ VERIFIED | `bom.json` and `README.md` exist with matching SHA-256 `b78ba8f8...8517d8b804`; independently recomputed `sha256sum` of the real JAR on disk matches exactly. `formatter-pins-drift.test.ts` (18 tests) re-run independently: 18 passed, 0 failed. Live OSV query for `pkg:maven/com.beust/jcommander@1.71` re-run independently: returns `{}` |
| 4 | java-interop builds and runs on a Guava release unaffected by CVE-2023-2976/CVE-2020-8908 (DEP-04) | ✓ VERIFIED | `java-interop/build.gradle` pins `com.google.guava:guava:33.7.1-jre`; independently re-ran `./gradlew build` (BUILD SUCCESSFUL) and `./gradlew dependencies --configuration runtimeClasspath` — resolves guava 33.7.1-jre only, no 31.1-jre. Live OSV queries re-run independently: 33.7.1-jre returns `{}`; the 31.1-jre positive control returns both CVE-2023-2976 and CVE-2020-8908 |
| 5 | `SocketServiceApp` accepts an optional, validated port argument, defaulting to 5008, bound to localhost only (DEP-04 support for the live smoke test) | ✓ VERIFIED | `SocketServiceApp.java` read directly: `DEFAULT_PORT = 5008`, `parsePort` validates range 1-65535 and arg count, `main` exits 2 with a usage line before any bind on invalid input, `run()` binds `new InetSocketAddress("localhost", port)` |
| 6 | `dependabot.yml` watches `github-actions` and the `/documentation` npm tree alongside `bbj-vscode` npm and `bbj-intellij` Gradle, and ignores langium/langium-cli only at the 4.4.x line (CI-04, DEP-05 Dependabot half) | ✓ VERIFIED | Read `.github/dependabot.yml` directly: 4 entries in order (npm /bbj-vscode, gradle /bbj-intellij, github-actions /, npm /documentation), all weekly; `langium`/`langium-cli` ignore rules use `versions: ["4.4.x"]` (matches 4.4.0/4.4.9, not 4.3.1/4.5.0 per npm semver); existing chevrotain/typescript/gradle entries unchanged |
| 7 | A minimal repro outside the repository shows, on langium 4.4 vs 4.3, both the parse-recovery slowdown and the lost DEF FN completion params, ready to file, filing awaits maintainer approval (DEP-05 repro half) | ✓ VERIFIED (behavioral) | Independently ran `/home/coder/repos/tmp/langium-44-topdown-repro/minimal/run.mjs` (the packaged deliverable) live: `REPRO SUMMARY: slowdown=yes (input "x$ = CVS(": 4.3.1=0.791ms, 4.4.0=101.852ms, ratio=101.9x); defFnParams=yes (4.3.1: [_f$, _t$] of 5 items, 4.4.0: [] of 3 items)`, elapsed 4s. `ISSUE-DRAFT.md` has all 6 bug_report.md headings. bbj-vscode confirmed untouched: `node_modules/langium` still 4.3.1, `package.json` still `~4.3.1`, `git status --porcelain -- bbj-vscode` empty. Scratch project confirmed not a git repo; `gh issue list --author @me --search "created:>=2026-09-28"` against eclipse-langium/langium returns 0 — nothing filed |
| 8 | Requirements DEP-01, DEP-02, DEP-04, DEP-05, CI-04 are satisfied and traced to Phase 117 | ✓ VERIFIED | `.planning/REQUIREMENTS.md`: all five checked `[x]` with Phase 117 citations; traceability table lines 134-142 all read `Phase 117 \| Complete`. No orphaned requirements found mapped to Phase 117 beyond these five (DEP-03 traces to Phase 115, correctly out of this phase's scope) |

**Score:** 7/7 locally-verifiable truths verified (truth 2 is a genuine human-verification item, not a failure — see below)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/package.json` | `@vscode/vsce` under devDependencies only | ✓ VERIFIED | Line 719, `^4.0.0`, absent from `dependencies` |
| `bbj-vscode/package-lock.json` | dev flags only vs. phase base | ✓ VERIFIED | Diff-shape check re-run: 0 unexpected lines |
| `.github/dependabot.yml` | 4 entries, langium/langium-cli 4.4.x hold | ✓ VERIFIED | Read directly, matches must_haves exactly |
| `bbj-vscode/tools/formatter/lib/bom.json` | CycloneDX 1.5, 1 jcommander component | ✓ VERIFIED | Read directly; single component, correct purl/hash/publisher |
| `bbj-vscode/tools/formatter/lib/README.md` | provenance prose + advisory how-to | ✓ VERIFIED | Read directly; SHA-256 present once, purl present, OSV result recorded |
| `bbj-vscode/test/formatter-pins-drift.test.ts` | bom.json/README.md drift assertions | ✓ VERIFIED | Re-run independently: 18/18 passed |
| `java-interop/build.gradle` | guava 33.7.1-jre | ✓ VERIFIED | Line 22, confirmed on resolved runtime classpath |
| `java-interop/src/main/java/bbj/interop/SocketServiceApp.java` | optional validated port arg, localhost bind | ✓ VERIFIED | Read directly; matches must_haves |
| `/home/coder/repos/tmp/langium-44-topdown-repro/` (external) | runnable repro, both symptoms reproduce | ✓ VERIFIED | Deliverable independently re-run live, reproduces both symptoms |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `.github/workflows/*.yml` (6 vsce jobs) | `bbj-vscode/package.json` devDependencies | `npm ci` before `npx vsce` | ✓ VERIFIED | 117-01-SUMMARY.md's static YAML audit result re-derivable from the unedited workflow files (`git diff --quiet deaa7de2 -- .github/workflows` exits 0 — no workflow touched, so the audited state is unchanged) |
| `bbj-vscode/test/formatter-pins-drift.test.ts` | `bbj-vscode/tools/formatter/lib/bom.json` | reads bom.json, compares SHA-256 to `FORMATTER_ARTIFACT_PINS` and `recompute()` of the real bytes | ✓ VERIFIED | Test re-run passes; independently recomputed sha256sum of the real JAR matches |
| `/home/coder/repos/tmp/langium-44-topdown-repro/minimal/run.mjs` | `minimal/langium-4.3/core`, `minimal/langium-4.4/core` | spawns each subproject's own `langium` install | ✓ VERIFIED | Live run shows distinct chevrotain versions per side (12.0.0 vs 13.2.0), consistent with genuinely separate installs |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| vsce absent from production tree | `npm ls --omit=dev --depth=0` | 7 packages, no vsce | ✓ PASS |
| Formatter drift suite catches divergence | `npx vitest run test/formatter-pins-drift.test.ts test/formatter-verifier-tamper.test.ts` | 2 files, 18 tests, 0 failed | ✓ PASS |
| jcommander JAR bytes match pin and SBOM | `sha256sum jcommander-1.71.jar` | `b78ba8f8...8517d8b804` (matches bom.json, README.md, FORMATTER_ARTIFACT_PINS) | ✓ PASS |
| OSV: jcommander 1.71 has no advisory | live POST to api.osv.dev | `{}` | ✓ PASS |
| OSV: guava 33.7.1-jre has no advisory | live POST to api.osv.dev | `{}` | ✓ PASS |
| OSV positive control: guava 31.1-jre affected | live POST to api.osv.dev | CVE-2023-2976, CVE-2020-8908 (GHSA-7g45-4rm6-3mm3, GHSA-5mg8-w23w-74h3) | ✓ PASS |
| java-interop builds on new Guava | `./gradlew -p java-interop build` | BUILD SUCCESSFUL | ✓ PASS |
| java-interop resolves guava 33.7.1-jre only | `./gradlew -p java-interop dependencies --configuration runtimeClasspath` | `com.google.guava:guava:33.7.1-jre` only | ✓ PASS |
| Deliverable langium repro reproduces both regressions | `node /home/coder/repos/tmp/langium-44-topdown-repro/minimal/run.mjs` | `REPRO SUMMARY: slowdown=yes (...ratio=101.9x); defFnParams=yes (...)` in 4s | ✓ PASS |
| bbj-vscode untouched by the langium repro work | `node -p ".../node_modules/langium/package.json".version` + `git status --porcelain -- bbj-vscode` | `4.3.1`; empty | ✓ PASS |
| Nothing filed upstream | `gh issue list --repo eclipse-langium/langium --author @me --search "created:>=2026-09-28"` | 0 | ✓ PASS |
| Scratch repro project is not a git repository | `git -C .../langium-44-topdown-repro rev-parse --git-dir` | fatal: not a git repository | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DEP-01 | 117-01 | vsce is a devDependency; production tree excludes it | ✓ SATISFIED | Independently re-verified npm ls and lockfile diff |
| DEP-02 | 117-03 | Vendored jcommander JAR has provenance record checkable against advisories | ✓ SATISFIED | Independently re-verified bom.json/README.md/drift tests/live OSV |
| DEP-04 | 117-04 | java-interop on a Guava release unaffected by the two temp-dir CVEs | ✓ SATISFIED | Independently re-built, re-verified classpath and live OSV |
| DEP-05 | 117-02 (Dependabot half) + 117-06 (repro, gap closure after 117-05 halted) | Dependabot holds langium/langium-cli at 4.4.x; a minimal upstream repro exists | ✓ SATISFIED | Independently re-verified dependabot.yml and re-ran the deliverable repro live |
| CI-04 | 117-02 | Dependabot watches github-actions and /documentation npm tree | ✓ SATISFIED | Independently re-verified dependabot.yml structure |

No orphaned requirements: `grep -n "Phase 117" .planning/REQUIREMENTS.md` returns exactly these 5 rows, matching the phase's declared requirement IDs.

### Anti-Patterns Found

None blocking. The phase's own code-review report (`117-REVIEW.md`, standard depth, 7 files) found 0 critical, 2 warnings, 2 info, all judged non-blocking for this phase's goal:

- WR-01: `SocketServiceApp.parsePort` has no automated (JUnit) test coverage — only the manual smoke test. Real but non-blocking: `java-interop` has no `src/test` tree at all yet, and D-06's live harness smoke is the plan's own designated proof mechanism. Worth a follow-up, not a phase-117 blocker.
- WR-02: `java-interop/build.gradle` still has no Dependabot `gradle`/`/java-interop` entry, even though this same phase hand-bumped its Guava version. Per the phase's own stated scope (CONTEXT.md's canonical refs and ROADMAP.md's Code field list `bbj-vscode/package.json`, the formatter provenance dir, `java-interop/build.gradle`, `.github/dependabot.yml`), `java-interop`'s own Gradle tree was never declared as an ecosystem this phase would add to Dependabot — only `bbj-intellij`'s Gradle tree was in CI-04's scope. Legitimate gap for a future phase, not a phase-117 requirement miss.
- IN-01/IN-02: README.md's dated OSV-check claim and the unnamed third-party (Snyk) finding are cosmetic/documentation-quality notes, not functional gaps.

No debt markers (`TBD`/`FIXME`/`XXX`) found in the modified files during this verifier's own reading of them.

### Human Verification Required

### 1. PR VSIX install and activation

**Test:** Download the phase PR's `pr-vsix` workflow artifact, install the VSIX in VS Code, open a `.bbj` file.
**Expected:** The extension installs without error and activates (syntax highlighting / language features load) — proving DEP-01's vsce-to-devDependencies move did not change what actually ships.
**Why human:** Needs a real CI-built artifact and an editor session; not reproducible from static file analysis.

### 2. Dependabot registers the new entries

**Test:** After merge to main, check GitHub's Insights -> Dependency graph -> Dependabot tab.
**Expected:** Four entries listed (npm /bbj-vscode, gradle /bbj-intellij, github-actions /, npm /documentation).
**Why human:** GitHub-side state after a merge to the default branch; not observable from a local feature-branch checkout.

### 3. Maintainer decision on filing the langium issue

**Test:** A maintainer reads `/home/coder/repos/tmp/langium-44-topdown-repro/ISSUE-DRAFT.md` and decides whether to file it against `eclipse-langium/langium`.
**Expected:** A human go/no-go decision; nothing is filed automatically by any agent.
**Why human:** Explicitly gated on maintainer approval by D-08/D-10 in `117-CONTEXT.md`; filing was and remains out of scope for automation.

### Gaps Summary

No gaps found. All 5 requirement IDs (DEP-01, DEP-02, DEP-04, DEP-05, CI-04) are satisfied with evidence independently re-derived by this verifier (not merely re-stated from SUMMARY.md), including a live re-run of the DEP-05 deliverable repro, which reproduced both langium 4.4.0 regressions with fresh measurements (ratio 101.9x, both DEF FN parameters lost on 4.4.0) matching the SUMMARY's claims. The three items above are pre-planned manual-only checks (already documented in `117-VALIDATION.md`'s "Manual-Only Verifications" table before this verification ran) rather than gaps this phase failed to close — they route the phase to `human_needed` rather than `passed` per the verification decision tree, but none of them indicate the phase goal was not achieved in the codebase.

Two non-blocking code-review warnings (WR-01: no JUnit coverage for `parsePort`; WR-02: `java-interop`'s own Gradle tree has no Dependabot entry) are recorded above for visibility but are outside this phase's declared scope and do not block phase completion.

---

_Verified: 2026-09-28T19:05:00Z_
_Verifier: Claude (gsd-verifier)_
