---
phase: 64-build-ci-dependency-review
verified: 2026-08-18T15:02:09Z
status: passed
score: 4/4 must-haves verified
behavior_unverified: 0
overrides_applied: 0
warnings:
  - item: "Close-out §G states `grep -c 'pending' 64-COVERAGE.md` prints `5`; the delivered file returns `13`"
    severity: warning
    reason: "Self-referential inflation — §G's own explanatory paragraph (lines 3838-3842, 3846-3848) adds 8 further lines containing the substring. The five it enumerates (:105, :889, :922, :1753, §B's gate command at :3540) are each accurate, and all three real placeholder shapes independently count 0, so no placeholder remains. The defect is a recorded literal that does not reproduce, in a file whose D-18 discipline is 'literal output recorded'."
    fix: "Change the `5` in §G to `13`, or restate the sentence as 'the five occurrences that predate this paragraph', and re-record the literal."
  - item: "P64-D4-005 says `npm run lint` runs 'over the 120 .ts files under src/ and test/' and 'across all 120 files'"
    severity: info
    reason: "`find src test -name '*.ts'` is 120, but `eslint.config.js:5` ignores `src/language/generated/**`, so 117 files are actually linted. The finding's substance (0 rules enabled, exit 0, 2 unused-directive warnings) is exact."
  - item: "P64-D2-004 phrases the ignore rule as '`bbj-vscode/.gitignore:1` is the single line `/out/`'"
    severity: info
    reason: "The file has 4 lines; line 1 is `/out/`. The material claim (out/ ignored, `git ls-files bbj-vscode/out` = 0) is verified true. Prose ambiguity only."
---

# Phase 64: Build, CI & Dependency Review — Verification Report

**Phase Goal:** The project's build and CI surface — 6 GitHub Actions workflows, Gradle, esbuild, and the 3 BBj tool scripts — is swept across all 8 dimensions, including workflow security and both dependency trees' vulnerability posture.
**Verified:** 2026-08-18T15:02:09Z
**Status:** passed (3 warnings, 0 blockers)
**Re-verification:** No — initial verification
**Method:** Every number, gate, line citation and mechanism below was re-derived independently against the live tree, the live npm registry and Gradle's published release metadata. No SUMMARY.md or close-out claim was accepted as evidence.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | All 6 workflows (568 lines), the Gradle build, esbuild/packaging config and the 3 `tools/*.bbj` scripts have a recorded pass/fail against D1-D8 | ✓ VERIFIED | `wc -l .github/workflows/*.yml` = **568**. File gate enumerates **29**; all 29 basenames present in `64-COVERAGE.md` (re-ran the loop; zero absent). Cell counts re-derived from the file itself: pass/fail **29**, n/a **35**, total **64**, pending **0** — matching §B exactly. Shape split independently confirmed: 24 unit-row cell lines + 40 file-exception cell lines = 64. |
| 2 | Every workflow's secret handling, `GITHUB_TOKEN` scope, action pinning and untrusted-PR-input exposure is documented | ✓ VERIFIED | `### SEC-07 Workflow Security Posture` is a 6×4 grid, all 24 cells substantive. Re-derived: `grep -c 'uses:'` = **36** with the exact per-file distribution claimed (3/5/11/7/6/4); **0** SHA-pinned; `grep -n 'permissions:'` returns exactly **3** hits (`deploy-docs.yml:12`, `pr-vsix.yml:26`, `manual-release.yml:149` job-level); **10** jobs total, **7** with no declared scope; `pull_request_target` absent (exit 1). Every cited line number spot-checked against the files — all exact. |
| 3 | Every npm and Gradle dependency with a known vulnerability is enumerated and triaged fix-now / file-issue / accepted-with-reason | ✓ VERIFIED | I ran `npm audit --json` myself: **19** vulnerabilities, `{"prod":296,"dev":260,"optional":96,"total":593}`, summary `19 vulnerabilities (7 moderate, 11 high, 1 critical)` — byte-identical to the recorded run. My package list matches the table's 19 npm rows **package-for-package and severity-for-severity**. +1 Maven row (`guava:31.1-jre` at `java-interop/build.gradle:22`, verified). Triage totals `fix-now` 6 / `file-issue` 11 / `accepted-with-reason` 3 = 20 rows. Gradle coverage limitation is disclosed, and I reproduced it: `./gradlew --offline -q dependencies` → exit 1 in 874 ms, `* What went wrong: 25.0.3`. |
| 4 | Every recorded finding carries `file:line`, dimension and a verified failure scenario per the Phase 60 standard | ✓ VERIFIED | Parsed all **44** records programmatically: every one carries `unit`, `location`, `dimension`, `severity`, `evidence_tier`, `evidence`, `failure_scenario`, `classification`, `effort`, `dedup`, `disposition` (missing-field set empty). 44 unique IDs, no duplicates. 12 findings spot-checked at `file:line` granularity — **every citation exact** (see below). |

**Score: 4/4 truths verified (0 present, behavior-unverified)**

### The Two D-18 Gates — re-derived independently

| Gate | Command run by me | Output | Claimed | Status |
|------|-------------------|--------|---------|--------|
| Cell gate part 1 | INVENTORY pipeline verbatim from §B | `7 27 29 56` | `7 27 29 56` | ✓ |
| Adoption is real | `grep -c 'gradle-wrapper.jar' INVENTORY.md` | `0` | `0` | ✓ |
| Cell gate part 2 | Adopted row hand-added: 1 row / 2 `applies` (D1,D6) / 6 `n/a` / 8 cells — matches the grid row as written | — | `1 2 6 8` | ✓ |
| **Phase gate (sum)** | 7+1 / 27+2 / 29+6 / 56+8 | **`8 29 35 64`** | `8 29 35 64` | ✓ |
| File gate | `ls …21 globs… \| wc -l` | `29` | `29` | ✓ |
| Every basename present | loop grepping all 29 basenames | zero absent | zero absent | ✓ |
| §B part 3 (file's own content) | 4 greps | `29`, `35`, `64`, `0` | `29 35 64 0` | ✓ |

**All 8 rows present and correct:** 3 unit rows (`RU-64-01/02/03`) + 5 file-exception rows (`package-lock.json`, 3 × `tools/formatter/*.jar`, D-20's `gradle-wrapper.jar`). The leading row count printed **7**, not 3 — the D-17 under-count failure mode did not occur.

**Exclusion-reason identity check re-derived:** R-D7-CI 7 + R-D5-CI 1 + R-LOCKFILE 7 + R-JAR-BINARY 20 = **35**, matching the 35 `n/a` cells.

### The Two Scope Adoptions — legitimate, not padding

| Adoption | Exists? | In scope? | Absent from INVENTORY? | Verdict |
|---|---|---|---|---|
| `.github/dependabot.yml` (D-19) | ✓ 19 lines, 881 bytes, commit `be402d6` | ✓ Committed, functional `.github/` config; npm-only ecosystem with 2 reasoned `ignore:` entries; the milestone's only dependency-automation config, in the phase that owns SEC-08 | ✓ `grep -c 'dependabot' INVENTORY.md` = **0** | **Legitimate.** Adds a file, no cell — consistent with it inheriting `RU-64-01`'s row |
| `bbj-intellij/gradle/wrapper/gradle-wrapper.jar` (D-20) | ✓ 43,583 bytes | ✓ `gradlew:117` is literally `CLASSPATH=$APP_HOME/gradle/wrapper/gradle-wrapper.jar`; `:208-209` + `:244` exec it — verified line-for-line | ✓ `grep -c 'gradle-wrapper.jar' INVENTORY.md` = **0**, while INVENTORY does name the 7-line `.properties` beside it | **Legitimate.** Earns a file-exception row; moves both gates, exactly as documented |

Both adoptions are additionally recorded as D8 drift findings against INVENTORY (`P64-D8-002`, `P64-D8-004`), and INVENTORY itself is unmodified (`git log -1` = `1dcab8b docs(60-04)`, Phase 60; `git status --porcelain` empty). Adoption and drift are kept as separate facts, as claimed.

### Finding Spot-Checks — 12 findings across all 3 units and 7 dimensions

| Finding | Unit / Dim | What I independently verified | Status |
|---|---|---|---|
| **`P64-D2-004`** | RU-64-01 / D2 | `pr-validation.yml:10` = `'bbj-vscode/out/language/**'`. `bbj-vscode/.gitignore:1` = `/out/`; `git ls-files bbj-vscode/out` = **0**; `git ls-files bbj-vscode/src/language` = **53**. `build.yml` never touches `bbj-intellij`; `pr-vsix.yml` builds only the VS Code extension; `preview.yml`'s `build-intellij` (`needs: publish-preview`) runs after `:68`'s publish. **The path filter genuinely can never match, and the only cross-IDE gate genuinely does not run on language-server changes.** | ✓ EXACT |
| **`P64-D6-006` / `P64-D1-006`** (headline) | RU-64-02 / D6, D1 | `sha256sum` = `2db75c40782f5e8ba1fc278a5574bab070adccb2d21ca5a6e5ed840888448046`, size 43,583. I fetched `https://services.gradle.org/versions/all` myself: **521 entries**, and this hash matches **19** of them, spanning **8.10 → 8.12.1**, latest final match **8.12.1 (buildTime 20250124)**. `gradle-wrapper.properties:3` declares `gradle-8.13-bin.zip`; 8.13's published `wrapperChecksum` is `81a82aaea5abcc8ff68b3dfcb58b3c3c429378efd98e7433460610fecd7ae45f` — confirmed twice (versions/all **and** `curl -L .../gradle-8.13-wrapper.jar.sha256`). `curl -L .../gradle-8.12.1-wrapper.jar.sha256` returns the repo's hash exactly. Current release **9.7.0 (2026-08-06)** ✓. Manifest is exactly `Manifest-Version: 1.0` + `Implementation-Title: Gradle Wrapper` ✓. `git log -- bbj-intellij/gradle/wrapper/` = exactly one commit `e97c587` ✓. `grep -rn 'wrapper-validation\|gradle/actions\|setup-gradle' .github/workflows/` = empty ✓. **Every digit of the headline finding is correct.** | ✓ EXACT |
| **`P64-D6-008`** (brace-expansion) | RU-64-02 / D6 | `.vscodeignore:8` = `node_modules` ✓. `package-lock.json:7581` = `node_modules/vscode-languageclient/node_modules/brace-expansion`, `:7582` = `"version": "5.0.7"` ✓, parent `vscode-languageclient@10.1.0` at `:7557-7558` ✓, nested `minimatch@10.2.5` at `:7593` ✓. `out/extension.cjs`: brace-expansion **2**, balanced-match **2**; `out/language/main.cjs`: **0**/**0** ✓. `esbuild.mjs:17` = `external: ['vscode']` ✓. **I tested the "only one" claim against all 19 packages**: apparent hits for `tmp` and `uuid` in the bundle are substring noise (project-local `tmpFile`/`os.tmpdir`, and `vscode-languageclient/lib/common/utils/uuid.js` — `grep -c 'node_modules/uuid'` = 0). The load-bearing subtlety is right: npm's vulnerable minimatch range is `<=3.1.3 \|\| 10.0.0 - 10.2.2`, so the **shipped** `minimatch@10.2.5` is outside it while the shipped `brace-expansion@5.0.7` is inside `4.0.0 - 5.0.8`. **Claim holds exactly.** | ✓ EXACT |
| **`P64-D4-005`** (eslint) | RU-64-02 / D4 | `eslint.config.js` is 18 lines; `:16` = `rules: {}`; no `extends`, no `tseslint.configs.recommended` ✓. `npx eslint --print-config src/extension.ts` → **0 rule entries, 0 enabled** ✓. `package.json:657` = `"lint": "eslint src test"` ✓. I ran `npx eslint src test`: **exit 0**, exactly 2 warnings, both `Unused eslint-disable directive (… '@typescript-eslint/no-explicit-any')` at `bbj-document-symbol-provider.ts:75` and `:149` ✓. `package.json:654` `vscode:prepublish` ends in `npm run lint` ✓. (One nit — see warnings.) | ✓ EXACT |
| `P64-D1-004` | RU-64-01 / D1 | `preview.yml:96-102` and `manual-release.yml:135-137` interpolate `secrets.JETBRAINS_MARKETPLACE_TOKEN` directly into `run:` ✓; `preview.yml:64-65` and `manual-release.yml:86-87` use the correct `env:` pattern for `VSCE_PAT` ✓. Opens with `Disclosure-limited per D-16` ✓. | ✓ EXACT |
| `P64-D1-005` | RU-64-01 / D1 | 3 `permissions:` hits, 10 jobs, 7 undeclared ✓. `preview.yml:53-60` and `manual-release.yml:69-82` push with the checkout-persisted credential ✓. "Declaring any block resets every other scope to `none`" is GitHub's documented behaviour ✓. The inferential half is **explicitly flagged as an inference and separately written as a not-reproducible disposition** — correct discipline. | ✓ EXACT |
| `P64-D1-001` | RU-64-03 / D1 | `web.bbj:19-20` `ARGV(5,err=*next)`/`ARGV(6,err=*next)`; `:26` token branch; `:30-31` literal `"admin"`/`"admin123"`; `:32` `getBBjAdmin(username!, password!, err=login_failed)` ✓. | ✓ EXACT |
| `P64-D1-002` | RU-64-03 / D1 | `em-login.bbj:10-13` ARGV reads, `:41-43` `open(ch,mode="O_CREATE,O_TRUNC")` + `write(ch)token!`, `:46-51` failure branch, `? 'HIDE'` at `:8`; `em-validate-token.bbj:6,8-9`; `web.bbj:22` ARGV(8) ✓. | ✓ EXACT |
| `P64-D1-003` | RU-64-03 / D1 | `.vscodeignore` is 12 lines, `tools/` absent ✓. `document-formatter.ts:10` compile-time constant, `:14-15` `-jar` + path, `:59` `cp.spawn('java', formatFlags)` — no existence/hash/signature check between ✓. `Class-Path: lib/jcommander-1.71.jar lib/BBjCodeFomatter.jar` ✓. Producer search returns exactly **2** files (`src/document-formatter.ts`, `out/main.js`); no `build.xml`/`pom.xml` anywhere ✓. | ✓ EXACT |
| `P64-D2-001` | RU-64-03 / D2 | `run-tests.ts:510` hardcoded `status: 'pass'`, `:579` and `:584` the same; neighbours at `:446`, `:480`, `:535`, `:557` all compute `const failed = assertions.some(a => !a.passed)`; `:737` `${r.status !== 'pass' ? 'open' : ''}`; `:1016` icon; `:1042-1048` exit check walks assertions independently; `:1055` `main()` at module scope ✓. **Ten distinct line citations, all exact.** | ✓ EXACT |
| `P64-D6-003` | RU-64-01 / D6 | 36 `uses:`, 0 SHA-pinned, per-file distribution 3/5/4/11/6/7, **9 distinct actions, 11 distinct `action@ref` pairs**, `checkout@v4`×9, `upload-artifact@v4`×8, `setup-node@v4`×5, `download-artifact@v4`×5, `setup-java@v4`×3 — I re-counted all of it from the raw grep; every figure matches ✓. | ✓ EXACT |
| `P64-D6-012` | RU-64-02 / D6 | All three `accepted-with-reason` reachability arguments re-run mechanically: no `.css/.scss/.less` under `src`/`test`/`tools` (empty); `grep -rn 'nanoid'` (empty); `grep -rn 'concurrently\|npm run watch' .github/workflows/` (empty); `concurrently`'s only consumer is `package.json:656`'s literal-string `watch` script ✓. | ✓ EXACT |

Also verified as narrative sections: `### Vendored Binary Provenance` (three manifests read byte-for-byte — jcommander's 11 OSGi headers with `Bnd-LastModified: 1493325683414` → 2017-04-27, BBjCFCli's six lines, BBjCodeFomatter's single `Manifest-Version: 1.0`; three sha256s; 6,780 + 38,078 + 67,503 = **112,361 bytes**), and the production-closure split (`npm ls --omit=dev` confirms **16 of 19** in the prod closure, the 3 dev-only being exactly shell-quote / nanoid / postcss).

### Phase 63 Failure-Mode Hunt — plausible-but-false security mechanisms

Phase 63's escape was a security mechanism asserted rather than shown. I attacked the three Phase 64 claims most vulnerable to the same failure:

1. **"`validateDistributionUrl=true` only checks that the URL is well-formed and resolves, and pins nothing."** — **TRUE, verified against Gradle's own source.** I pulled `Download.java` and `Install.java` from `gradle/gradle@v8.13.0`: `sendHeadRequest()` issues an HTTP `HEAD` and throws unless the response code is 200. Checksum comparison lives in `verifyDownloadChecksum(...)`, gated entirely on `configuration.getDistributionSha256Sum()`; with no configured sum the happy path performs no digest comparison at all (the `.sha256` fetch at `Install.java:116-117` fires only inside a `ZipException` retry). The finding's mechanism is real, not plausible.
2. **"The secret is materialised as a process argument and into the step's script file, and log masking does not address this class."** — **TRUE.** Actions expression substitution happens before the runner writes the step script, and `-PintellijPlatformPublishingToken=<token>` genuinely lands on the Gradle process command line. This matches GitHub's own hardening guidance, and the finding's remedy (`env:` mapping) is the documented one.
3. **"Nothing pins the wrapper JAR or the distribution."** — **TRUE**, and independently corroborated: no `distributionSha256Sum` in the 7-line properties file, and no wrapper-validation action in any of the 6 workflows.

**No false mechanism found.** Two counter-signals actively support this:

- `manual-release.yml:127/133/137` is a real interpolation sink, and the file records it as a **pass-with-note** rather than inflating it into a finding, because `build-intellij` declares `needs: build-vscode` and the anchored regex at `:48` gates the upstream job. I verified the chain: `outputs.version` at `:15` is `github.event.inputs.version`, the validate step `exit 1`s on a non-match, and `needs:` is at `:108`. The restraint is correct.
- The `pr-vsix.yml:57-62` `$GITHUB_OUTPUT` injection surface I found on my own read is **already recorded** — as a not-reproducible disposition under `RU-64-01`, with the tier it failed, rather than asserted as a finding.

### Disclosure Discipline (D-16)

| Check | Result |
|---|---|
| `critical`/`high` findings inside `## RU-64-01` | **1** (`P64-D1-004`) |
| Findings opening `evidence:` with `Disclosure-limited per D-16` inside `RU-64-01` | **1** — counts equal |
| Does that record contain a trigger sequence, payload or fork-and-run procedure? | **No.** It states surface (`preview.yml:96-102`, `manual-release.yml:135-137`), problem class (expression-evaluator expansion into `run:` instead of `env:`), and impact (marketplace publish rights, unrevocable from this repo). No reproduction recipe anywhere. |
| Any other finding reading as a usable recipe? | **No.** The wrapper records describe an integrity gap whose exploitation requires write access to this repository, and say so; the dependency records cite public advisory URLs only. |

### Milestone Coverage Claim (consumed by Phase 68)

| Loop | My output | Claimed | Status |
|---|---|---|---|
| verdicts across `61/62/63/64-COVERAGE.md` | `50 35 35 29` | `50 35 35 29` | ✓ |
| `n/a` | `38 5 5 35` | `38 5 5 35` | ✓ |
| total | `88 40 40 64` | `88 40 40 64` | ✓ |
| INVENTORY §"Grid totals" | 148 `applies`, 84 `n/a`, 232 cells, 29 rows | same | ✓ |
| `RU-D8-01` row | 1 `applies` (D8) + 7 `n/a` under `R-D8-SCOPE` (`INVENTORY.md:814,866-870`) | same | ✓ |

**Denominator arithmetic is honest.** 50+35+35+**27** = **147 of 148**; 38+5+5+29 = **77 of 84**; **224 of 232**; rows 11+5+5+7+1 = **29**. The 27 is Phase 64's on-grid `applies` (29 minus D-20's 2), and the +8 beyond-grid cells are reported on their own line and never folded into the 147. Reconciliation closes at every position: 147+1=148, 77+7=84, 224+8=232. Supporting negatives re-confirmed: `grep -c 'Phase 64' 61-COVERAGE.md` = **0**; `62-COVERAGE.md`'s inheritance table names 63/65/66/67/68/69 with no Phase 64 row; INVENTORY's routing table holds 6 rows (5 → Phase 61, 1 → Phase 63), **0** → Phase 64. `RU-D8-01`'s files exist at the stated sizes: `CLAUDE.md` 96 lines, `VERBs.md` 148 lines, `documentation/` **29** files.

### Hygiene Checks

| Check | Expected | Actual | Status |
|---|---|---|---|
| Finding count | 44 | **44** (`^id:` lines; 44 unique IDs, 0 duplicates) | ✓ |
| Per unit | 12 / 13 / 19 | **12 / 13 / 19** | ✓ |
| By dimension | 6/9/3/6/2/13/0/5 | **6/9/3/6/2/13/0/5** = 44 | ✓ |
| By severity | 1/8/22/13 | **1 critical / 8 high / 22 medium / 13 low** | ✓ |
| `effort` on `{2,4,8}` | 27/8/9 | **27 / 8 / 9**, none off-scale | ✓ |
| `classification` | 8 easy / 36 major | **8 / 36** | ✓ |
| `triage:` present iff `dimension: D6` | 13 | **13 / 13, zero mismatches** (checked both directions) | ✓ |
| `triage` distribution | 3/9/1 | **fix-now 3 / file-issue 9 / accepted-with-reason 1** | ✓ |
| `disposition` | 8/34/2 | **easy-fix 8 / major-refactor 34 / wontfix 2** | ✓ |
| `dedup:` non-blank, all `none` | 44 | **44, all `none`** | ✓ |
| Zero `P64-D7-*` IDs | 0 | **0** (6 textual mentions are all assertions of absence) | ✓ |
| Every record carries all 11 template fields | 44 | **44**, missing-field set empty | ✓ |
| No finding in `CLAUDE.md` / `VERBs.md` / `documentation/` | 0 | **0** | ✓ |
| No finding in `bbj-vscode/src/` or `bbj-intellij/src/` | 0 | **0** | ✓ |
| Not-reproducible dispositions | 7 (2/3/2) | **2 + 3 + 2 = 7** | ✓ |
| Zero source files modified | clean | `git status --porcelain bbj-vscode bbj-intellij java-interop .github` → **empty** | ✓ |
| Prior coverage files & INVENTORY unedited | unchanged | last commits `1dcab8b`(60), `5e4fce7`(61), `c8603a3`(62), `f14ffb9`(63) — all predate this phase | ✓ |
| Debt markers (`TBD`/`FIXME`/`XXX`/`TODO`) in the deliverable | 0 | **0** | ✓ |
| Placeholder shapes | 0/0/0 | `— pending$` **0**, `^_\(pending` **0**, `\| pending \|` **0** | ✓ |

### The Known `pending` Item — explanation checked, literal does not reproduce

The brief flagged `grep -c 'pending' 64-COVERAGE.md` as returning 5 with an accounting in §G. Re-derived:

- **All three actual placeholder shapes count 0** — confirmed independently. ✓
- **§G's enumeration of the five is accurate** — `:105` is the write-contract paragraph describing the convention; `:889` and `:1753` are `RU-64-03`'s and `RU-64-01`'s unit closures asserting "No cell in this unit carries the `pending` placeholder"; `:922` is the substring inside "de**pending**" in `RU-64-01`'s D6 cell ("`langium@4.3.1` depending on `chevrotain`"); the fifth is §B's verbatim gate command at `:3540`. All five read exactly as described. ✓
- **But the bare count on the delivered file is `13`, not `5`.** The extra 8 lines are inside §G's own explanatory paragraph (`:3838-3842`, `:3846-3848`) — the act of writing the explanation changed the number it reports. Substantively harmless (nothing is unrecorded), but it is a stated literal that does not reproduce, in a section whose whole premise is "literal output recorded". Logged as a **WARNING** with a one-line fix.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `.planning/reviews/64-COVERAGE.md` | 3842 | Stated literal `5` for a `grep -c` that now returns `13` | ⚠️ Warning | One closing-confirmation sentence is wrong; the substance it certifies (zero placeholders) is verified true |
| `.planning/reviews/64-COVERAGE.md` | 2952, 2971 | "120 `.ts` files" where 117 are actually linted (3 generated files ignored by `eslint.config.js:5`) | ℹ️ Info | Does not affect the finding's substance (0 rules enabled) |
| `.planning/reviews/64-COVERAGE.md` | ~1097 | "`.gitignore:1` is the single line `/out/`" — file has 4 lines | ℹ️ Info | Prose ambiguity; the material claim is verified true |

No `TBD`/`FIXME`/`XXX`/`TODO`/`PLACEHOLDER` markers. No stub content. No source file touched.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| RVW-05 | 64-01, 64-02, 64-03 | Build and CI reviewed across all 8 dimensions | ✓ SATISFIED | 8 rows × 8 dims = 64 cells, 29 live verdicts, 29 files, 0 placeholders — all gates re-derived |
| SEC-07 | 64-02 | Workflows audited — secrets, token scope, unpinned actions, PR-input injection | ✓ SATISFIED | `### SEC-07 Workflow Security Posture` 6×4 grid, all 24 cells filled; 36/36 mutable-tag references enumerated; `pull_request_target` absent recorded as a positive |
| SEC-08 | 64-01, 64-03 | Dependency vulnerabilities enumerated for npm and Gradle, each triaged | ✓ SATISFIED | 20-row triage table reproduced exactly by my own `npm audit`; Gradle limitation disclosed and reproduced; vendored-binary half consolidated by reference |

No ORPHANED requirements: REQUIREMENTS.md maps exactly RVW-05, SEC-07, SEC-08 to Phase 64 and all three are claimed by plans.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Workflow line total | `wc -l .github/workflows/*.yml` | `568` | ✓ PASS |
| File gate | 21-glob `ls … \| wc -l` | `29` | ✓ PASS |
| Cell gate part 1 | INVENTORY awk pipeline | `7 27 29 56` | ✓ PASS |
| Adoption absence | `grep -c 'gradle-wrapper.jar' INVENTORY.md` | `0` | ✓ PASS |
| npm audit | `npm audit` / `npm audit --json` | `19 vulnerabilities (7 moderate, 11 high, 1 critical)`, 593 deps | ✓ PASS |
| Wrapper checksum | `sha256sum` + `curl services.gradle.org` (×3) | `2db75c40…8046` = 8.12.1; 8.13 = `81a82aae…45f` | ✓ PASS |
| ESLint effective config | `npx eslint --print-config src/extension.ts` | 0 rule entries, 0 enabled | ✓ PASS |
| ESLint run | `npx eslint src test` | exit 0, 2 warnings at the exact cited lines | ✓ PASS |
| Gradle enumeration | `./gradlew --offline -q dependencies` | exit 1, 874 ms, `* What went wrong: 25.0.3` | ✓ PASS |
| Bundle reachability | `grep -o` over `out/extension.cjs` for all 19 packages | only `brace-expansion` (2) is a genuine hit | ✓ PASS |
| Prod closure | `npm ls <pkg> --omit=dev --all` × 19 | 16 in prod, 3 dev-only | ✓ PASS |
| Working tree clean | `git status --porcelain bbj-vscode bbj-intellij java-interop .github` | empty | ✓ PASS |

### Probe Execution

No `scripts/*/tests/probe-*.sh` exist in this repository and no plan declares a probe — Phase 64 is a review-recording phase with a single Markdown deliverable. **SKIPPED (no probes declared or discoverable).** The gate commands above serve the equivalent role and were all re-run in this process.

### Human Verification Required

None. Every truth was mechanically verifiable and was mechanically verified.

### Gaps Summary

**No gaps.** All four ROADMAP success criteria are Met on independently re-derived evidence. Both D-18 gates re-derive exactly (`7 27 29 56` + `1 2 6 8` = `8 29 35 64`; 29 files, zero absent basenames). Both scope adoptions are legitimate — each file exists, each is genuinely in scope, and INVENTORY genuinely omits both. Twelve findings were spot-checked at `file:line` granularity across all three units and seven dimensions, and **every citation was exact**, including several with ten or more distinct line references in one record.

The headline `gradle-wrapper.jar` claim is correct to the digit: I fetched Gradle's published metadata myself and confirmed the repo's hash matches 19 releases spanning 8.10-8.12.1 while the properties file declares 8.13, and I confirmed 8.13's published wrapper checksum differs, via two independent endpoints.

The Phase 63 failure mode did **not** recur. The three most mechanism-dependent security claims were each traced to primary evidence — including reading Gradle 8.13's own wrapper source to confirm that `validateDistributionUrl` is an HTTP HEAD check and pins nothing. Two independent counter-signals reinforce this: a real injection sink was deliberately recorded as a pass-with-note because an upstream `needs:`-gated regex guards it, and a `$GITHUB_OUTPUT` injection surface I found independently was already logged as a not-reproducible disposition rather than asserted. D-16 disclosure discipline holds: the single `high` `RU-64-01` finding opens with the marker and contains no recipe.

Three accuracy defects were found, none blocking:

1. **WARNING** — §G states `grep -c 'pending'` prints `5`; the delivered file returns `13`, because §G's own paragraph added 8 matching lines. The five it enumerates are each accurate and all three real placeholder shapes count 0, so no work is unrecorded. Recommended fix before Phase 68 consumes the file: change `5` to `13`, or restate as "the five occurrences that predate this paragraph".
2. **INFO** — `P64-D4-005` says lint covers "120 `.ts` files"; 117 are actually linted (`eslint.config.js:5` ignores `src/language/generated/**`).
3. **INFO** — `P64-D2-004`'s phrase "`bbj-vscode/.gitignore:1` is the single line `/out/`" can misread as the file having one line; it has four.

None of the three would produce a false vulnerability report downstream in Phase 69.

---

_Verified: 2026-08-18T15:02:09Z_
_Verifier: Claude (gsd-verifier)_
