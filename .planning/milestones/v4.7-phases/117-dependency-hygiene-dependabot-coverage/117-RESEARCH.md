# Phase 117: Dependency Hygiene & Dependabot Coverage - Research

**Researched:** 2026-09-28
**Domain:** npm/Gradle dependency hygiene, SBOM/advisory provenance, Dependabot configuration, Langium regression reproduction
**Confidence:** HIGH

## Summary

This phase has five independent, narrow work streams (DEP-01, DEP-02, DEP-04, DEP-05, CI-04), each
already tightly scoped by CONTEXT.md's locked decisions. Research confirms every load-bearing
factual claim in CONTEXT.md against the actual repository state and external advisory databases:
the jcommander SHA-256 matches exactly, both target CVEs are confirmed absent at Guava 33.7.1-jre
(and confirmed present at the current 31.1-jre), the BBjCFCli.jar manifest really does reference
`lib/jcommander-1.71.jar`, and the closed Dependabot PRs #682/#684 contain the maintainer's own
first-hand regression report with concrete repro inputs.

The single most important finding for the planner: **DEP-02's "add a vitest guard" (D-03) is
already partially done.** `bbj-vscode/src/formatter-verifier.ts` (added in Phase 110 for SEC-09,
commits `0c1946d1`/`e5462437`) already pins all three formatter JARs — including
`lib/jcommander-1.71.jar` at exactly the SHA-256 CONTEXT.md records — with two existing test files
(`formatter-pins-drift.test.ts`, `formatter-verifier-tamper.test.ts`) that already fail on drift or
tampering. The phase does NOT need a new hash-comparison mechanism from scratch; it needs a new
CycloneDX SBOM (`bom.json`) + `README.md` whose recorded values are cross-checked against the
existing `FORMATTER_ARTIFACT_PINS['lib/jcommander-1.71.jar']` entry so the two provenance records
cannot drift apart silently.

The second most important finding: **`SocketServiceApp.java` hard-codes port 5008** (`new
InetSocketAddress("localhost", 5008)`, no CLI arg, no env var, no system property). D-06 requires
starting java-interop on a free port for the live Guava smoke test, but the phase's declared code
scope is `java-interop/build.gradle` only — not `SocketServiceApp.java`. The planner must decide
whether adding a port argument to `SocketServiceApp.java` is in scope as an incidental change, or
whether the smoke test instead temporarily edits the hard-coded port for a manual local run (not
committed) as a scoped verification action outside the plan's task diff. See Pitfall 1.

**Primary recommendation:** Treat the five work streams as five separate, low-coupling plans/waves
(vsce move, jcommander SBOM, Guava bump, dependabot.yml, langium repro) — they touch disjoint files
and only the dependabot.yml langium-ignore entry (CI-04/DEP-05) has a soft ordering dependency on
knowing the repro exists. Do the langium repro last since it's the most open-ended (external,
standalone project) and its ISSUE-DRAFT.md content is unaffected by the other four streams.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| vsce dependency classification | Build/Packaging (npm) | — | `@vscode/vsce` is a CLI packaging tool invoked by `npx` in CI/local scripts, never imported by runtime `src/` or `esbuild.mjs` code |
| Formatter JAR provenance record | Build/Packaging (SBOM) | — | Static metadata artifact consumed by an external advisory scanner (osv-scanner), not runtime code |
| SHA-256 drift guard | Test/CI (vitest) | — | Already implemented in `src/formatter-verifier.ts`; extending it is a test-tier change |
| Guava version bump | API/Backend (java-interop) | Build/Packaging (Gradle) | `InteropService.java` is the sole Guava consumer; the version pin lives in `build.gradle` |
| Dependabot ecosystem coverage | CI/CD config | — | `.github/dependabot.yml` is a GitHub platform config file, not application code |
| Langium 4.4 regression repro | External/standalone project | — | Explicitly required to live outside this repository (D-08); no tier in this codebase owns it |

## User Constraints

<user_constraints>
### Locked Decisions

**Formatter JAR provenance (DEP-02, #507)**
- D-01: The provenance record covers `bbj-vscode/tools/formatter/lib/jcommander-1.71.jar` only. The two BASIS JARs (`BBjCFCli.jar`, `lib/BBjCodeFomatter.jar`) are being absorbed by bbj-ls and served over JSON-RPC, so they get no record here. This intentionally narrows the roadmap's success criterion 2. jcommander is the only vendored JAR with a public coordinate (`com.beust:jcommander:1.71`), so it is the only one an advisory database can actually match.
- D-02: Format: a CycloneDX SBOM (`bom.json`, machine-readable, consumable by osv-scanner), plus a short human-readable `README.md` next to the JARs. Both carry library, version, vendor/publisher, SHA-256 and origin. The recorded jcommander SHA-256 is `b78ba8f80afc3defe5cbec954495d650273205b715edf4578212f78517d8b804`. Re-verify it at execution time.
- D-03: Add a vitest guard that recomputes the jcommander JAR's SHA-256 and compares it with the committed record, so a swapped or updated JAR fails the existing suite. No new workflow is added.
- D-04: The researcher checks jcommander 1.71 against OSV and reports what it finds. If an advisory affects it, surface that to the user; do not silently swap the JAR, because the vendored BASIS CLI's manifest `Class-Path` names `lib/jcommander-1.71.jar` explicitly.

**Guava (DEP-04, #521)**
- D-05: Bump `java-interop/build.gradle` from `com.google.guava:guava:31.1-jre` to `33.7.1-jre`, the same version bbj-ls runs in production. No code rewrite; the existing uses of `Stopwatch`, `Lists`, `Primitives` and `ClassPath` in `InteropService.java` stay. Confirm with an OSV query that the coordinate has no match for CVE-2023-2976 or CVE-2020-8908.
- D-06: Proof that it "builds and runs": `./gradlew build`, then a live smoke test. Start java-interop on a free port (not :5008, which BBjServices owns in the dev container) and complete one class lookup over the socket, for example with the existing interop harness (`npm run interop-harness -- --host … --port …`).
- D-07: bbj-ls already pins 33.7.1-jre, so no bbj-ls follow-up is needed.

**Langium 4.4 repro (DEP-05)**
- D-08: The repro lives in a standalone npm project under `/home/coder/repos/tmp/` (e.g. `/home/coder/repos/tmp/langium-44-regression-repro/`), outside this repository and outside the langium fork. Pin langium 4.3.x and 4.4.x side by side, and commit or keep the lockfiles. Never install or run langium 4.4 inside `bbj-vscode`.
- D-09: Grammar strategy: start with a toy grammar (calls, DEF FN with parameters, line-based statements) that shows both symptoms: the parse-recovery slowdown on an unclosed call, and the lost DEF FN parameters in completion. Fall back to a stripped BBj subset only if the toy grammar does not reproduce them.
- D-10: Deliverable: a runnable `npm run repro` that prints timings and completion items for 4.3 versus 4.4, plus an `ISSUE-DRAFT.md` written up in the langium issue template. Do not file upstream. Filing waits for the maintainer's explicit approval.
- D-11: The Dependabot ignore rule blocks only 4.4.x of `langium` and `langium-cli` in the `/bbj-vscode` npm entry (e.g. `versions: ["4.4.x"]` or equivalent). A later 4.5 PR arrives and is judged on its own merits.

### Claude's Discretion
- The Dependabot settings for the new `github-actions` (directory `/`) and `/documentation` npm entries: schedule, grouping and PR limits. Default to `weekly`, matching the existing entries, and keep comment style consistent with the existing ignore-rule comments.
- DEP-01 mechanics: move `@vscode/vsce` from `dependencies` to `devDependencies` in `bbj-vscode/package.json` and regenerate `package-lock.json` (Node 22, see memory). All workflows already call `npx vsce` after `npm ci`, which installs devDependencies.

### Deferred Ideas (OUT OF SCOPE)
- Remove the vendored formatter JARs (`BBjCFCli.jar`, `BBjCodeFomatter.jar`, and then jcommander) and switch the extension to bbj-ls's JSON-RPC formatter. The work is under way on the bbj-ls side; this repo's switch-over is a future phase.
- Reviewed and not folded: `2026-09-26-intellij-interop-initoptions-key-mismatch.md`, `2026-09-26-signature-help-and-snippet-peer-name-escaping.md`, `2026-09-27-windows-intellij-node-download-progress-check.md` — all unrelated to dependency hygiene.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEP-01 | `@vscode/vsce` is a devDependency, so production dependency set no longer contains it or its transitive packages (#501) | Confirmed no `src/`/`esbuild.mjs` reference; all 4 workflows run bare `npm ci` (no `--omit=dev`), so `npx vsce` keeps resolving after the move. See "DEP-01: vsce move" below. |
| DEP-02 | Vendored formatter JAR carries recorded version, vendor and provenance metadata an advisory database can check (#507) | jcommander 1.71 SHA-256 verified byte-identical to CONTEXT.md's recorded value; OSV query returns no advisory for the exact coordinate/version; existing `formatter-verifier.ts` pin table and tests already cover the hash-guard half of D-03. See "DEP-02: Formatter JAR provenance" below. |
| DEP-04 | java-interop uses a Guava release unaffected by the two temp-directory advisories (#521) | OSV confirms CVE-2023-2976 and CVE-2020-8908 both fixed at `32.0.0-android`; 31.1-jre (current) is in the affected range, 33.7.1-jre (target) is not. `InteropService.java`'s four Guava call sites (`Stopwatch`, `Lists`, `Primitives`, `ClassPath`) are unaffected APIs across this range. See "DEP-04: Guava bump" below. |
| DEP-05 | Dependabot ignores langium/langium-cli 4.4.x; minimal upstream repro exists for the two regressions | PR #682/#684 comments contain the maintainer's own first-hand symptom description with concrete repro inputs (`x$ = CVS(`, `DEF fnIsText(_f$,_t$)=_f$+`) and root-cause hypothesis (CST rework #2191 / Chevrotain 13). See "DEP-05: Langium 4.4 repro" below. |
| CI-04 | Dependabot watches `github-actions` and `/documentation` npm tree (#551) | Confirmed neither entry exists in current `.github/dependabot.yml`; confirmed exact YAML shape from GitHub's own docs. See "CI-04: Dependabot config" below. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CycloneDX SBOM (`bom.json`, spec 1.5 or 1.6) | schema 1.5/1.6 | Machine-readable provenance record for jcommander JAR | Industry-standard SBOM format; natively consumable by `osv-scanner scan --sbom` without a custom parser |
| osv.dev API (`https://api.osv.dev/v1/query`) | v1 | Advisory lookup for jcommander and Guava coordinates | Free, no-auth, authoritative aggregator (GHSA + NVD + ecosystem-specific feeds); already used this session to verify both coordinates |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `osv-scanner` CLI | latest (not installed in this container — `[ASSUMED]` on exact current version; verify at execution time with `npm view` equivalent or the tool's own `--version`) | Local validation that `bom.json` parses and scans cleanly | Optional local verification step; not required to be added as a CI workflow (D-03: "No new workflow is added") |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CycloneDX `bom.json` | SPDX SBOM | CycloneDX is smaller/simpler for a single-component record and is D-02's locked choice; SPDX is heavier and typically used for whole-project SBOMs |

**Installation:** No new production dependency is installed. `osv-scanner` (if used for local validation) is a standalone Go binary, not an npm/Gradle dependency — do not add it to `package.json`.

**Version verification:**
```bash
npm view @vscode/vsce version   # confirmed: 4.0.0 (matches current pin)
npm view langium versions --json   # confirmed: latest is 4.4.0; 4.3.1 is the pinned/held version
npm view langium-cli version   # confirmed: 4.4.0 is latest
```
jcommander and Guava are Maven coordinates, not npm — verified via OSV/Maven Central directly (see below), not `npm view`.

## Package Legitimacy Audit

This phase does not install any new npm or Gradle production dependency. `@vscode/vsce` is moved
within `package.json` (dependencies → devDependencies), not newly added. `com.google.guava:guava`
is a version bump of an existing dependency, not a new package. No new CycloneDX tooling is added
to `package.json`/`build.gradle` — `bom.json` is a static data file, not a package install.

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@vscode/vsce` (existing, relocated) | npm | 8+ yrs (as `vsce`/`@vscode/vsce`) | very high (official VS Code tooling) | github.com/microsoft/vscode-vsce | OK | No change — moved section only |
| `com.google.guava:guava` (existing, version bump) | Maven Central | 15+ yrs | extremely high | github.com/google/guava | OK | Version bump only, 31.1-jre → 33.7.1-jre |

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## DEP-01: vsce move

**Current state, verified:**
- `bbj-vscode/package.json` line 707: `"@vscode/vsce": "^4.0.0"` under `dependencies` [VERIFIED: bbj-vscode/package.json:707].
- `npm ls --omit=dev` today shows `@vscode/vsce@4.0.0` as a direct production dependency alongside `chevrotain`, `langium`, `properties-file`, `properties-reader`, `vscode-jsonrpc`, `vscode-languageclient`, `vscode-uri` [VERIFIED: ran `npm ls --omit=dev` in bbj-vscode this session].
- No file under `bbj-vscode/src/` or `bbj-vscode/esbuild.mjs` references `vsce` [VERIFIED: `grep -rln "vsce" bbj-vscode/src bbj-vscode/esbuild.mjs` returned nothing this session]. `@vscode/vsce` is exclusively a CLI packaging tool invoked via `npx vsce package`/`npx vsce publish`, never imported at runtime.
- `.vscodeignore` already excludes `node_modules`, `src/`, `test/`, `tsconfig.json` from the packaged VSIX [VERIFIED: bbj-vscode/.vscodeignore]. The extension's runtime is the esbuild-bundled `out/extension.cjs`/`out/language/main.cjs` (produced by `npm run build`), not raw `node_modules` — `vsce package` does not need `@vscode/vsce` itself to be a *production* dependency, since `vsce` is not part of what gets bundled or shipped; it is only the packaging tool that reads `.vscodeignore`/`package.json` and zips the result.

**Workflow audit — every `npx vsce` caller runs bare `npm ci` first (no `--omit=dev`):**

| Workflow | `npm ci` call | `npx vsce` call(s) | Confirmed safe after move? |
|----------|---------------|---------------------|------|
| `.github/workflows/pr-vsix.yml` | `npm ci` (no flag), working-directory `bbj-vscode` | `npx vsce package --out "$OUT"` | Yes — devDependencies installed |
| `.github/workflows/build.yml` | `npm ci` inside `cd bbj-vscode` | `npx vsce package` | Yes |
| `.github/workflows/preview.yml` | `npm ci`, working-directory `bbj-vscode` (job `verify`); a second `npm ci` in `publish-vscode` job | `npx vsce package --pre-release` (verify job); `npx vsce publish --pre-release --packagePath "$VSIX" -p "$VSCE_PAT"` (publish-vscode job) | Yes — both jobs run their own `npm ci` before their `vsce` call |
| `.github/workflows/manual-release.yml` | `npm ci`, working-directory `bbj-vscode` (job `verify`); a second `npm ci` in `publish-vscode` job | `npx vsce package` (verify); `npx vsce publish --packagePath "$VSIX" -p "$VSCE_PAT"` (publish-vscode) | Yes — both jobs run their own `npm ci` |

All four workflows already carry a comment stating this explicitly: `# vsce comes from bbj-vscode devDependencies (npm ci) — npx vsce resolves the pinned version` (preview.yml, manual-release.yml) [VERIFIED: .github/workflows/preview.yml:36, .github/workflows/manual-release.yml:35] — i.e. this move was anticipated when those comments were written and no workflow file needs to change for DEP-01 itself.

**Mechanics:**
1. Edit `bbj-vscode/package.json`: remove `"@vscode/vsce": "^4.0.0"` from `dependencies`, add it to `devDependencies` (alphabetical position, matching existing style: after `@vitest/coverage-v8`, before `concurrently`... actually alphabetically `@vscode/vsce` sorts after `@vitest/coverage-v8` and before `concurrently` [ASSUMED — exact alphabetical placement is a style nicety, not load-bearing]).
2. Regenerate `package-lock.json` with `npm install` under **Node 22** (not the container's default Node 24 — team memory: "Node 24 breaks langium generate"; `npm install` itself doesn't invoke langium generate, but the project's `prepare` lifecycle script (`npm run langium:generate && npm run build`) DOES run on `npm install` unless `--ignore-scripts` is used — see Pitfall 2).
3. Verify: `npm ls --omit=dev` in `bbj-vscode` after the change should list only `chevrotain`, `langium`, `properties-file`, `properties-reader`, `vscode-jsonrpc`, `vscode-languageclient`, `vscode-uri` — no `@vscode/vsce` and no `@vscode/vsce-sign` (its transitive signing dependency, confirmed present in the current lockfile at line 2162 [VERIFIED: bbj-vscode/package-lock.json:2162, `"@vscode/vsce-sign": "^2.1.0"`]).
4. No workflow file changes needed for DEP-01 (see table above) — CI-04 (dependabot github-actions coverage) is unrelated file scope.

**Environment note — Node 22 not present in this dev container:** `node --version` reports `v24.20.0`; no `nvm`/`volta`/`fnm`/`asdf` version manager and no alternate Node install under `/opt` were found [VERIFIED: ran `node --version`, searched `/opt`, checked for version managers this session]. The lockfile regeneration step (and any `npm install`) should be run under Node 22 per team memory; if Node 22 is unavailable in the execution environment, the plan needs either (a) a step to provision it (e.g. `actions/setup-node@v4` already does this in CI, so CI-side regen is safe; local regen needs a human/environment fix), or (b) to accept the risk and regenerate under Node 24 with `--ignore-scripts` and verify the resulting lockfile's `langium`/`chevrotain` entries are unchanged by diffing before/after.

## DEP-02: Formatter JAR provenance

**jcommander 1.71 SHA-256 — re-verified this session:**
```
b78ba8f80afc3defe5cbec954495d650273205b715edf4578212f78517d8b804  bbj-vscode/tools/formatter/lib/jcommander-1.71.jar
```
[VERIFIED: ran `sha256sum bbj-vscode/tools/formatter/lib/jcommander-1.71.jar` this session] — byte-identical to CONTEXT.md's D-02 recorded value and to the existing `FORMATTER_ARTIFACT_PINS` entry in `src/formatter-verifier.ts:60` [VERIFIED: bbj-vscode/src/formatter-verifier.ts:58-63, quoted below].

**BBjCFCli.jar manifest confirms the dependency:**
```
Class-Path: lib/jcommander-1.71.jar lib/BBjCodeFomatter.jar
```
[VERIFIED: ran `unzip -p bbj-vscode/tools/formatter/BBjCFCli.jar META-INF/MANIFEST.MF` this session] — confirms CONTEXT.md D-04's claim that the vendored BASIS CLI's manifest names this JAR explicitly.

**OSV query — no advisory for the exact coordinate:**
```bash
curl -s -X POST https://api.osv.dev/v1/query -H "Content-Type: application/json" \
  -d '{"package":{"name":"com.beust:jcommander","ecosystem":"Maven"},"version":"1.71"}'
# => {}
```
[VERIFIED: ran this query this session, empty result = no matching advisory in OSV's aggregated database (GHSA + NVD + ecosystem feeds) for `com.beust:jcommander` version `1.71`].

**One tangential, non-blocking finding via WebSearch:** Snyk's own database lists
`SNYK-JAVA-COMBEUST-174815` ("Unsafe Dependency Resolution", CVSS 8.1) affecting jcommander
versions `< 1.75` — this WOULD include 1.71 by version range. However: (1) this ID is **not
present in OSV** (`curl https://api.osv.dev/v1/vulns/SNYK-JAVA-COMBEUST-174815` → `{"code":5,
"message":"Vulnerability not found"}`, verified this session), so `osv-scanner` running against
the `bom.json` will not flag it; (2) the vulnerability describes jcommander's own **build-time**
dependency resolution over plain HTTP (a MITM risk when *building jcommander from source*), not a
runtime vulnerability in the shipped JAR — it does not apply to a JAR vendored as a committed
binary that is never rebuilt from source in this repository's pipeline. `[CITED: security.snyk.io/vuln/SNYK-JAVA-COMBEUST-174815]`.
Per D-04, this should be surfaced to the user as a finding, not silently acted on — flag it in the
plan's SUMMARY/UAT notes as "found via Snyk, not present in OSV, build-time-only, assessed as
not applicable to a vendored binary" rather than omitting it.

**A WebSearch also surfaced "CVE-2026-90013"/"CVE-2026-90014" against jcommander 1.82** from a
GitHub repo literally named `dev-finos-osera-forks/patch-jcommander`, whose own linked PR is
titled *"DEV ONLY: a fourth invented CVE on jcommander 1.82"* `[CITED: github.com/dev-finos-osera-forks/backlog/pull/238]`
— these are self-declared synthetic/test CVEs from an unrelated security-tooling test fixture,
not real advisories, and they target version 1.82 (not 1.71) regardless. **Do not cite these as
real findings in the provenance record or SUMMARY.**

**Existing hash-guard infrastructure (Phase 110, commits `0c1946d1`/`e5462437`) — read this before
writing a new test:**

`bbj-vscode/src/formatter-verifier.ts` already exports `FORMATTER_ARTIFACT_PINS`, a table of three
pinned artifacts (`BBjCFCli.jar`, `lib/jcommander-1.71.jar`, `lib/BBjCodeFomatter.jar`) each with
`relativePath`, `sha256`, `sizeBytes`, `origin`, `vendoredOn`, plus `verifyFormatterArtifacts()`
which recomputes and compares via `crypto.timingSafeEqual` [VERIFIED: bbj-vscode/src/formatter-verifier.ts:43-71,
quoted in full above under "DEP-02" section context]. Two existing test files already exercise it:
- `bbj-vscode/test/formatter-pins-drift.test.ts` — recomputes SHA-256/size for every pinned artifact
  against the real on-disk bytes and fails on drift, plus asserts pin-table shape/well-formedness.
- `bbj-vscode/test/formatter-verifier-tamper.test.ts` — exercises every refusal path (missing file,
  flipped byte, zero-length file, injected-reader failure) against real vendored bytes.

**This means D-03's literal ask ("add a vitest guard that recomputes the SHA-256... so a swapped
JAR fails the existing suite") is already true today for jcommander specifically** — a tampered
`jcommander-1.71.jar` already fails `formatter-pins-drift.test.ts`. **What is net-new for this
phase is the CycloneDX `bom.json` + `README.md` (D-02), not a new hash comparison mechanism.** The
planner has two reasonable options, both compatible with D-03's letter:
1. Leave `formatter-verifier.ts` as the single source of truth for the hash; have `bom.json`'s
   `hashes[].content` value and `README.md`'s SHA-256 line reference/match it, and add ONE new
   assertion (in a new or existing test file) that `bom.json`'s recorded hash equals
   `FORMATTER_ARTIFACT_PINS.find(p => p.relativePath === 'lib/jcommander-1.71.jar').sha256`, so the
   SBOM and the runtime pin table cannot silently diverge.
2. Treat `bom.json` as the new source of truth and have the existing pin table's origin/vendoredOn
   fields point at it — a larger refactor, likely not worth it given D-01's narrowed scope (the
   pin table also legitimately covers two JARs the SBOM does not).

Option 1 is recommended: smaller diff, respects "No new workflow is added" (D-03), and produces a
genuinely new regression guard (SBOM/pin-table drift) rather than a redundant one.

**CycloneDX minimal shape** (schema 1.5, JSON):
```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.5",
  "version": 1,
  "components": [
    {
      "type": "library",
      "name": "jcommander",
      "group": "com.beust",
      "version": "1.71",
      "purl": "pkg:maven/com.beust/jcommander@1.71",
      "publisher": "Cedric Beust",
      "hashes": [
        { "alg": "SHA-256", "content": "b78ba8f80afc3defe5cbec954495d650273205b715edf4578212f78517d8b804" }
      ]
    }
  ]
}
```
`[CITED: google.github.io/osv-scanner/usage/scan-source, oneuptime.com CycloneDX/osv-scanner guides]`
— osv-scanner selects its parser by filename: recognized CycloneDX names are `bom.json`, `*.cdx.json`,
`bom.xml`, `*.cdx.xml`. `bom.json` (D-02's chosen name) is directly recognized; run
`osv-scanner scan --sbom bbj-vscode/tools/formatter/lib/bom.json` to validate locally if the CLI is
available (not currently installed in this container — verify availability before relying on it in
a plan step, or treat it as optional/manual verification since "No new workflow is added").

**Where to write the files:** `bbj-vscode/tools/formatter/lib/bom.json` and
`bbj-vscode/tools/formatter/lib/README.md`, next to `jcommander-1.71.jar`, per D-02 ("next to the
JARs").

## DEP-04: Guava bump

**OSV confirms both target CVEs, and the version boundary:**

| Query | Result |
|-------|--------|
| `com.google.guava:guava` @ `31.1-jre` (current pin) | Returns both `GHSA-5mg8-w23w-74h3` (CVE-2020-8908) and `GHSA-7g45-4rm6-3mm3` (CVE-2023-2976); both list `31.1-jre` in `affected[].versions[]` [VERIFIED: OSV query this session] |
| `com.google.guava:guava` @ `33.7.1-jre` (target pin) | `{}` — no advisories match [VERIFIED: OSV query this session] |

Both advisories' `fixed` event is `32.0.0-android` [VERIFIED: fetched GHSA-5mg8-w23w-74h3 and
GHSA-7g45-4rm6-3mm3 full records via `api.osv.dev/v1/vulns/<id>` this session]. `33.7.1-jre` is
well past this fix boundary, confirming CONTEXT.md D-05's premise directly rather than by inference.

**bbj-ls reference pin confirmed exact:**
```xml
<dependency>
  <groupId>com.google.guava</groupId>
  <artifactId>guava</artifactId>
  <version>33.7.1-jre</version>
</dependency>
```
[VERIFIED: /home/coder/repos/bbj-ls/bbj-ls/pom.xml:88-91] — matches D-05's target version exactly.

**Call-site inventory — `InteropService.java`, unaffected by the 31.1→33.7.1 jump:**
```java
import com.google.common.base.Stopwatch;
import com.google.common.collect.Lists;
import com.google.common.primitives.Primitives;
import com.google.common.reflect.ClassPath;
```
[VERIFIED: java-interop/src/main/java/bbj/interop/InteropService.java:35-38] — used as:
`Stopwatch.createStarted()` / `.elapsed(TimeUnit.MILLISECONDS)` (line 90, 145); `Lists.newArrayList(...)`
(line 189); `Primitives.allPrimitiveTypes()` (line 173); `ClassPath.from(classLoader)` /
`.getTopLevelClasses(packageName)` (lines 56, 140, 156). All four are long-stable, non-`@Beta`-removed
Guava APIs; none were deprecated or removed between 31.1 and 33.7.1 per Guava's own changelog
conventions (Guava keeps its core collection/reflection utility APIs source-stable across minor
bumps within a major series) `[ASSUMED — not independently verified against the full Guava 31→33
changelog this session; low risk given the APIs used are among Guava's oldest and most stable, but
flag for a build-verification step rather than a code-read guarantee]`. **D-05 already states "No
code rewrite" is expected** — this finding supports that expectation, with the actual build being
the authoritative check.

**JDK toolchain — available in this container:**
```
java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }
```
[VERIFIED: java-interop/build.gradle:6-10]. JDK 17 is present at `/opt/java/17` alongside 21 and 25
[VERIFIED: `ls /opt/java/` this session showed `17 21 25 default`]. Gradle's toolchain resolution
should auto-select 17 without needing network provisioning.

**Starting java-interop on a non-5008 port — SocketServiceApp.java hard-codes the port:**
```java
public void run()  {
    var address = new InetSocketAddress("localhost", 5008);
    ...
```
[VERIFIED: java-interop/src/main/java/bbj/interop/SocketServiceApp.java:31] — there is no CLI
argument, environment variable, or system property read anywhere in `java-interop/src/main/java/`
that changes the bound port [VERIFIED: `grep -rn "5008\|[Pp]ort" java-interop/src/main/java/`
this session — the only two hits are `InteropService.java`'s unrelated JSON-RPC `PackageInfoParams`
type and `SocketServiceApp.java`'s own hard-coded literal]. **See Pitfall 1 — this blocks D-06's
"start on a free port" literally as written** unless the plan either (a) adds a small,
scoped port-argument change to `SocketServiceApp.java` (outside the phase's declared "Code" file
list, which names only `java-interop/build.gradle`), or (b) performs the smoke test with a
temporary, uncommitted local edit to the hard-coded port purely for manual verification, reverting
before commit. Flag this as a planning decision point, not a silent scope expansion.

**Interop harness connection convention (reusable for the smoke test):**
```bash
cd bbj-vscode
npm run interop-harness -- --host 127.0.0.1 --port <port>
```
[VERIFIED: bbj-vscode/tools/interop-test-harness/run-tests.ts:14-27, header comment] — CLI flags
`--host` (default `127.0.0.1`), `--port` (default `5008`), `--output`, `--timeout` (default
`15000`ms, bounds only the connection attempt). The harness runs the full 17-case suite against
whatever `--port` is given; a single `getClassInfo` lookup for `java.lang.Object` is the minimal
"one class lookup" D-06 asks for, but the harness itself always runs its full suite — there is no
single-case CLI flag. For a scoped smoke test, either accept the full-suite run (still fast, all
in-process) or write a small throwaway script using `tools/interop-test-harness/scaffold.ts`'s
`connect()` function directly.

## CI-04: Dependabot config

**Current `.github/dependabot.yml` — confirmed exact content and gap:**
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/bbj-vscode"
    schedule: { interval: "weekly" }
    ignore:
      - dependency-name: "chevrotain"
      - dependency-name: "typescript"
        update-types: ["version-update:semver-major"]
  - package-ecosystem: "gradle"
    directory: "/bbj-intellij"
    schedule: { interval: "weekly" }
```
[VERIFIED: .github/dependabot.yml, full file read this session]. No `github-actions` ecosystem
entry and no `/documentation` npm entry exist today — both are genuinely new blocks, not
modifications.

**Exact syntax for the two new entries**, per GitHub's own docs `[CITED: docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file]`:
```yaml
  - package-ecosystem: "github-actions"
    directory: "/"          # required; GitHub searches .github/workflows + root action.yml
    schedule:
      interval: "weekly"
  - package-ecosystem: "npm"
    directory: "/documentation"
    schedule:
      interval: "weekly"
```

**Langium ignore rule (D-11) — blocks only 4.4.x, added to the existing `/bbj-vscode` npm entry:**
```yaml
      - dependency-name: "langium"
        versions: ["4.4.x"]
      - dependency-name: "langium-cli"
        versions: ["4.4.x"]
```
The `versions` field under `ignore` accepts "the standard pattern for the package manager"
`[CITED: docs.github.com dependabot-options-reference]` — for npm/semver this is npm's own range
syntax, and `4.4.x` is valid npm range syntax meaning "any 4.4.z", not a single exact version. This
matches D-11's intent exactly (blocks only the 4.4 line; a later 4.5.0 PR is NOT matched by this
range and will still be raised). Follow the existing file's comment convention — each ignore rule
in the current file cites the PR/issue that motivated it (`chevrotain` → PR #347, `typescript` →
PR #397); the new langium rule should cite PR #682/#684 per the existing pattern already noted in
CONTEXT.md's canonical_refs.

**No existing test or workflow validates `dependabot.yml` syntax.** `workflow-hygiene.yml`'s two
jobs (`secret-hygiene`, `wrapper-hygiene`) check for inline `${{ secrets.* }}` expressions and
Gradle wrapper checksum pinning respectively [VERIFIED: .github/workflows/workflow-hygiene.yml,
full file read this session] — neither parses or validates `dependabot.yml`. GitHub itself
validates the file's syntax server-side on push (a malformed file surfaces as a failed Dependabot
config check in the repo's Insights → Dependency graph → Dependabot tab), so no local/CI gate is
strictly required; the phase's own success criterion 4 is satisfied by the file content, not an
automated check. `[ASSUMED — GitHub's server-side validation behavior is standard product behavior,
not independently re-verified this session against this specific repo]`.

**Pitfall: `preview.yml` has no path filter.** `preview.yml` triggers on `push: branches: [main]`
with no `paths:` restriction [VERIFIED: .github/workflows/preview.yml:4-8]. A merged Dependabot PR
for the new `/documentation` npm tree (docs-only content) will still trigger a full VS Code +
IntelliJ preview publish to both marketplaces, exactly like any other push to `main`. This is a
pre-existing repo-wide behavior (STATE.md's own "every push to main bumps version and publishes
previews" constraint), not something CI-04 introduces, but CI-04 does increase how often it fires
by adding a new, previously-unwatched dependency tree. Path-filtering `preview.yml` is CI-06/
Phase 122 scope (composite checkout/setup action), not this phase's — flag as an accepted,
pre-existing tradeoff rather than something to fix here.

## DEP-05: Langium 4.4 repro

**Firsthand regression evidence from the maintainer's own closed-PR comments — the most
authoritative source available (this repo's own dependency-bump verification, not a
third-party report):**

From PR #682 (`langium` 4.3.1 → 4.4.0), comment by the repo maintainer, 2026-09-26:
> "Not adopting langium 4.4.0 for now. Verified locally on current main together with langium-cli
> 4.4.0 and chevrotain aligned to ~13.2.0 (single deduped copy, generated files unchanged, build
> green). The suite still shows two real regressions vs 4.3.1:
> - **Error-recovery performance:** parsing an unfinished call such as `x$ = CVS(`, `CVS(a$` or
>   `CVS(a$,` takes ~2.3 s per document on 4.4 vs 1–2 ms on 4.3 (and reports 2 parser errors instead
>   of 1). This is what times out `composer-codelens.test.ts`, and it would stall the editor while
>   typing.
> - **Completion:** `DEF fnIsText(_f$,_t$)=_f$+|` no longer offers the DEF FN parameters `_f$`/`_t$`
>   (`completion-test.test.ts`).
> Likely related to the CST rework (#2191) / Chevrotain 13 upgrade. Revisit with a later 4.4.x or
> together with a dedicated fix."
`[VERIFIED: gh pr view 682 --repo BBx-Kitchen/bbj-language-server --json comments, this session]`

From PR #684 (`langium-cli` 4.3.0 → 4.4.0), same maintainer, same day:
> "Not adopting langium-cli 4.4.0 on its own: it must move in lockstep with the langium runtime,
> and langium 4.4.0 (#682) is on hold due to an error-recovery performance regression and a DEF FN
> completion regression. See #682 for details."
`[VERIFIED: gh pr view 684 --repo BBx-Kitchen/bbj-language-server --json comments, this session]`

**This gives the repro project two concrete, minimal repro inputs directly, without needing to
rediscover them:**
1. **Parse-recovery slowdown:** an unclosed function-call-like construct, e.g. `x$ = CVS(`,
   `CVS(a$`, `CVS(a$,` (an identifier followed by `(`, optionally with an argument and/or trailing
   comma, never closed). Symptom: ~2.3s vs 1-2ms per document, and 2 parser errors reported
   instead of 1.
2. **Lost DEF FN completion params:** a one-line function definition with an inline expression body
   and parameters referenced in that body, e.g. `DEF fnIsText(_f$,_t$)=_f$+`, with completion
   requested at the trailing `+`. Symptom: the parameter names (`_f$`, `_t$`) stop appearing as
   completion items.

**What changed in 4.4.0, per the official changelog** (fetched via WebSearch, langium's own
CHANGELOG.md, cross-referenced against PR #682's embedded changelog excerpt):
- "Significantly reduce the memory usage of the CST and improve parsing performance" (#2191) —
  `CstNode#root` is no longer stored but derived from the container hierarchy;
  `CompositeCstNode#content` becomes a `readonly` array manipulated via `CstNodeBuilder` (a listed
  **Breaking Change**).
- "Update Chevrotain to v13" (#2196).
- "The default completion provider now supports both the `insert` and `replace` suggestion modes"
  (#2211) — plausible root cause for the DEF FN parameter-completion regression, since it touches
  completion-item generation directly.
- Support priority read requests (#2214); LSP `workspace/textDocumentContent` (#2190); lazily
  computed test-assertion error messages (#2208); streaming/JSON-deserialization fixes for
  multi-references (#2220, #2181); `MapScope` outer-scope fix (#2210); `UriTrie` URI-normalization
  customizability (#2209).
`[CITED: github.com/eclipse-langium/langium/blob/main/packages/langium/CHANGELOG.md, via PR #682's
embedded Dependabot changelog excerpt, VERIFIED: gh pr view 682 body this session]`

**Toy grammar recommendation (D-09):** A minimal Langium grammar with (a) a `Call` rule shaped like
`name=ID '(' args+=Expr (',' args+=Expr)* ')'` to reproduce the unclosed-call parse-recovery
slowdown, and (b) a `DefFn` rule shaped like `'DEF' name=ID '(' params+=ID (',' params+=ID)* ')' '='
body=Expr` with the completion provider exercising parameter-name scope lookup inside `body`, to
reproduce the lost-parameter-completion symptom. This mirrors BBj's actual `CVS(...)` call shape
and `DEF FN` shape closely enough to likely reproduce both without needing the stripped-BBj-subset
fallback (D-09's stated fallback path).

**npm aliasing vs. sibling subprojects — recommend sibling subprojects.** `langium-cli generate`
resolves its own `langium` peer dependency by the literal package name `langium` at codegen time
(it imports `langium/grammar` internally); an npm alias like `"langium43": "npm:langium@4.3.x"`
installs the 4.3.x package tree under a *different* node_modules name (`langium43`), which
`langium-cli`'s own internal `require('langium')`/`import from 'langium'` calls will NOT resolve to
— so code generation against an aliased install is unreliable without extra module-resolution
trickery (e.g. Node's `--conditions` or hand-rolled `exports` remapping). **Two sibling
subprojects** (e.g. `repro/for-4.3/` with `langium@~4.3.1` + `langium-cli@~4.3.0`, and
`repro/for-4.4/` with `langium@4.4.0` + `langium-cli@4.4.0`, each with its own `package.json`,
`package-lock.json`, and generated grammar output) avoids this entirely: each subproject's
`langium generate` runs against its own real, unaliased `langium` install. A thin top-level
`npm run repro` script (in the parent `langium-44-regression-repro/` directory, using npm
workspaces or plain `cd`+ exec) drives both subprojects, times the parse, and diffs the completion
results. `[ASSUMED — the module-resolution claim about langium-cli's internal `require`/`import`
calls is based on standard Node.js package-name resolution semantics and this session's read of
langium-cli's role, not a direct read of langium-cli's source this session; low risk, but worth a
quick confirmation at execution time by attempting the alias approach first on a throwaway grammar
and falling back to sibling subprojects if it fails, per D-09's own "try, then fall back" pattern]`.

**Environment note — Node 22 vs the container's Node 24:** Team memory states Node 24 breaks
`langium generate` for this project's own toolchain. The repro project is a fresh, standalone
project (not bbj-vscode), so this specific breakage may or may not reproduce there — but since the
repro's entire purpose is faithful reproduction of langium's real behavior, use the same Node
version the project's CI workflows pin (Node 22, per `actions/setup-node@v4` `node-version: 22` in
every workflow) for both subprojects, to avoid conflating a local Node-24 artifact with a genuine
langium 4.3-vs-4.4 difference. No Node 22 binary was found in this container this session (see
DEP-01's Environment note) — this is a repo-wide environment gap, not specific to the repro.

**Deliverable shape (D-10):** `npm run repro` (top-level) that prints, per grammar/document pair,
(1) wall-clock parse time for each langium version, (2) the reported parser-error count, and (3)
the completion-item list at the DEF FN body position — a plain console table or JSON is sufficient;
no HTML report is required (contrast with the interop test harness's HTML report — not the
pattern to follow here, this is a much smaller, throwaway tool). `ISSUE-DRAFT.md` should follow
langium's own GitHub issue template shape (title, description, reproduction steps, expected vs.
actual behavior, environment: langium version, Node version) — fetch the actual template from
`github.com/eclipse-langium/langium/tree/main/.github/ISSUE_TEMPLATE` at execution time if present,
otherwise use a plain bug-report structure.

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│ bbj-vscode/package.json     │      │ .github/dependabot.yml        │
│  dependencies (prod)        │      │  npm  /bbj-vscode  (existing) │
│  devDependencies            │◄─────┤  npm  /documentation  (NEW)   │
│  @vscode/vsce moves here    │      │  gradle /bbj-intellij(existing)│
└──────────┬───────────────────┘      │  github-actions  /  (NEW)     │
           │ npx vsce (CI only)       │  ignore: langium 4.4.x (NEW)  │
           ▼                          └──────────────────────────────┘
┌─────────────────────────────┐
│ CI workflows (npm ci; no    │
│ --omit=dev, all 4 confirmed)│
│  pr-vsix / build / preview /│
│  manual-release              │
└─────────────────────────────┘

┌──────────────────────────────────┐      ┌───────────────────────────┐
│ bbj-vscode/tools/formatter/lib/  │      │ java-interop/build.gradle │
│  jcommander-1.71.jar (existing)  │      │  guava 31.1-jre            │
│  bom.json (NEW, CycloneDX)       │─────▶│    → 33.7.1-jre (bump)     │
│  README.md (NEW)                 │  OSV │  InteropService.java       │
└──────────┬────────────────────────┘ query│  (Stopwatch/Lists/        │
           │ SHA-256 cross-check          │   Primitives/ClassPath —   │
           ▼                               │   unchanged call sites)   │
┌──────────────────────────────────┐      └──────────┬────────────────┘
│ src/formatter-verifier.ts        │                 │ smoke test
│  FORMATTER_ARTIFACT_PINS (exists)│                 ▼
│  + new bom.json-drift assertion  │      ┌───────────────────────────┐
└──────────────────────────────────┘      │ interop-test-harness      │
                                           │  --host --port <free>     │
                                           │  (SocketServiceApp port   │
                                           │   is hard-coded — gap)    │
                                           └───────────────────────────┘

┌──────────────────────────────────────────────────┐
│ /home/coder/repos/tmp/langium-44-regression-repro/│  (standalone, outside this repo)
│  for-4.3/  (langium ~4.3.1 + langium-cli ~4.3.0)  │
│  for-4.4/  (langium 4.4.0 + langium-cli 4.4.0)    │
│  npm run repro → timings + completion diff        │
│  ISSUE-DRAFT.md (not filed)                        │
└────────────────────────────────────────────────────┘
```

### Recommended Project Structure
No new top-level directories in `bbj-vscode` or `java-interop`. New files:
```
bbj-vscode/
├── tools/formatter/lib/
│   ├── bom.json          # NEW — CycloneDX SBOM for jcommander only
│   └── README.md         # NEW — human-readable provenance note
└── src/
    └── formatter-verifier.ts   # EXISTING — extend with a bom.json-drift assertion, or add a
                                  #  small sibling test asserting bom.json's hash === the pin

.github/
└── dependabot.yml        # EXTEND — add github-actions and /documentation npm entries,
                            #  add langium/langium-cli 4.4.x ignore rules

/home/coder/repos/tmp/langium-44-regression-repro/   # NEW, standalone, outside this repo
├── for-4.3/
├── for-4.4/
├── package.json           # top-level orchestrator (npm run repro)
├── ISSUE-DRAFT.md
└── README.md
```

### Pattern: Pin-table-with-provenance-fields (existing, reuse for bom.json cross-check)
**What:** A single exported constant table (`FORMATTER_ARTIFACT_PINS`) with hash + provenance
fields, verified by a pure synchronous function with an injectable `readFile` seam, tested by two
disjoint test files (drift-detection, tamper-simulation).
**When to use:** Any time a vendored binary needs a runtime or CI-time trust check.
**Example:**
```typescript
// Source: bbj-vscode/src/formatter-verifier.ts (existing, this repo)
export interface PinnedFormatterArtifact {
  relativePath: string;
  sha256: string;
  sizeBytes: number;
  origin: string;
  vendoredOn: string;
}
```

### Anti-Patterns to Avoid
- **Re-implementing the SHA-256 comparison logic for the SBOM:** `verifyFormatterArtifacts()`
  already exists and is timing-safe (`crypto.timingSafeEqual`). A new bom.json-drift test should
  assert `bom.json`'s recorded hash equals the existing pin table's value, not duplicate the
  recompute-and-compare logic against the JAR bytes a second time.
- **Adding `osv-scanner` as an npm/Gradle dependency:** it's a standalone Go binary; installing it
  via npm would be an unusual, likely-unmaintained wrapper package — run it as a manual/local
  verification step or a future CI addition, not a `package.json` dependency.
- **Committing a temporary SocketServiceApp.java port change:** if the smoke test needs a temporary
  port override for D-06, the diff must not land in the final commit unless the planner explicitly
  decides adding a port argument is in scope (see Pitfall 1).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SBOM format | A custom JSON provenance schema | CycloneDX (D-02's locked choice) | Standard, tool-consumable (osv-scanner), avoids inventing a schema nobody else can parse |
| Advisory lookup | A hand-maintained CVE list | osv.dev API | Aggregates GHSA + NVD + ecosystem feeds; free, no auth, already proven reliable this session |
| SHA-256 file verification | A new hashing utility | `src/formatter-verifier.ts`'s existing `verifyFormatterArtifacts()` pattern | Already exists, already tested, already timing-safe |

**Key insight:** This phase is almost entirely "verify and record," not "build." The two genuine
build tasks are the CycloneDX `bom.json` (a static file, not code) and the langium repro (a small
standalone toy-grammar project). Resist the urge to add new abstraction layers (a "provenance
service", a "dependency policy engine") — CONTEXT.md's decisions are already narrow and concrete.

## Common Pitfalls

### Pitfall 1: SocketServiceApp.java hard-codes port 5008 — D-06's smoke test has no built-in way to use a free port
**What goes wrong:** A plan step reading "start java-interop on a free port" and simply running
`./gradlew run` (or `java -jar ...`) will always bind `localhost:5008`, which BBjServices already
owns in this dev container — the process will fail to bind, not "start on a free port."
**Why it happens:** `SocketServiceApp.run()` hard-codes `new InetSocketAddress("localhost", 5008)`
with no CLI arg, env var, or system property read anywhere in the module.
**How to avoid:** Decide explicitly in the plan whether adding a `port` CLI argument to
`SocketServiceApp.java` is in scope (a one-line, low-risk change, but technically outside the
phase's declared "Code" file list of `java-interop/build.gradle` only) or whether the smoke test
is performed with a temporary, non-committed local edit purely for manual verification. Either way,
document the choice — do not silently expand or silently fail to satisfy D-06.
**Warning signs:** `./gradlew run` (or equivalent) throws `java.net.BindException: Address already
in use` when BBjServices is up.

### Pitfall 2: `npm install` triggers the full build pipeline via `prepare`
**What goes wrong:** Running `npm install` to regenerate `package-lock.json` for DEP-01 silently
also runs `npm run langium:generate && npm run build` (the `prepare` lifecycle script) unless
`--ignore-scripts` is passed — this is slow and, if run under Node 24, may hit the known "Node 24
breaks langium generate" issue.
**Why it happens:** `bbj-vscode/package.json`'s `"prepare": "npm run langium:generate && npm run
build"` runs automatically on every `npm install` (this is standard npm lifecycle behavior, not
specific to this repo).
**How to avoid:** For a lockfile-only regen, prefer `npm install --package-lock-only` (updates
`package-lock.json` without a full install/build) or run under Node 22 and accept the full
`prepare` run. Team precedent: Phase 115 installed `tsx` with `--save-exact --ignore-scripts`
specifically to avoid this under local Node 24 (memory: "Installed tsx with --save-exact
--ignore-scripts so bbj-vscode's own prepare script does not run under local Node 24 during the
devDependency install").
**Warning signs:** `npm install` unexpectedly takes minutes and touches `src/language/generated/`
or `out/` in `git status`.

### Pitfall 3: Treating the Snyk jcommander finding as blocking
**What goes wrong:** Concluding "jcommander 1.71 has a CVE, block the phase" from the Snyk
build-time HTTP-resolution finding, when it (a) doesn't appear in OSV at all, (b) describes
jcommander's own build process, not the vendored binary's runtime behavior, and (c) is unrelated to
any code path this repository exercises (the JAR is never rebuilt from source here).
**Why it happens:** Surface-level advisory-count aggregators (Snyk's public vuln pages included in
search results) don't distinguish "affects consumers of the published artifact" from "affects
someone building the library from source."
**How to avoid:** Report it per D-04 ("surface that to the user") without treating it as a gate —
the OSV query (the authoritative source D-04 specifies) returns no match, and the affected surface
does not apply to this repo's use of the artifact.
**Warning signs:** A plan task that reads "swap jcommander to 1.75+ due to CVE" — this contradicts
D-04's explicit instruction not to silently swap the JAR.

## Code Examples

### Verified jcommander SHA-256, re-derivable at execution time
```bash
# Source: this session's verification, matches bbj-vscode/src/formatter-verifier.ts:60
sha256sum bbj-vscode/tools/formatter/lib/jcommander-1.71.jar
# b78ba8f80afc3defe5cbec954495d650273205b715edf4578212f78517d8b804  bbj-vscode/tools/formatter/lib/jcommander-1.71.jar
```

### OSV query pattern (reusable for both DEP-02 and DEP-04 re-verification at execution time)
```bash
# Source: this session, api.osv.dev v1 query endpoint
curl -s -X POST https://api.osv.dev/v1/query -H "Content-Type: application/json" \
  -d '{"package":{"name":"<group>:<artifact>","ecosystem":"Maven"},"version":"<version>"}'
# Empty {} == no known advisory for that exact coordinate+version.
```

### Interop harness invocation against a non-default port
```bash
# Source: bbj-vscode/tools/interop-test-harness/run-tests.ts header comment, verified this session
cd bbj-vscode
npm run interop-harness -- --host 127.0.0.1 --port <free-port>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| Guava 31.1-jre (temp-dir CVEs present) | Guava 33.7.1-jre (fixed since 32.0.0-android) | This phase (D-05) | Matches bbj-ls's already-pinned version; no code changes needed per call-site inventory |
| langium 4.3.1 (held) | langium stays at 4.3.1; 4.4.0 exists upstream but regresses parse-recovery + DEF FN completion | Dependabot PRs #682/#684, closed 2026-09-26 | Dependabot must be told to stop re-proposing 4.4.x until a later 4.4.x/4.5 fixes the regressions |
| `@vscode/vsce` in production `dependencies` | Moved to `devDependencies` | This phase (D-01/#501) | Smaller `npm ls --omit=dev` surface; no functional change since vsce was never runtime-imported |

**Deprecated/outdated:** None specific to this phase — no library version in scope is deprecated;
this is a hygiene/provenance phase, not a migration.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Exact alphabetical placement of `@vscode/vsce` within `devDependencies` is a style nicety only | DEP-01 mechanics | None — cosmetic, npm doesn't require sorted order |
| A2 | Guava's core `Stopwatch`/`Lists`/`Primitives`/`ClassPath` APIs are source-stable across 31→33 without an independent full-changelog read | DEP-04 call-site inventory | Low — `./gradlew build` will fail loudly and immediately if any call site broke; not a silent-failure risk |
| A3 | `langium-cli`'s internal module resolution would not honor an npm alias, making sibling subprojects necessary rather than one aliased project | DEP-05 repro structure | Medium — if wrong, the repro could be built as one project instead of two; wastes minor setup time, not a correctness risk. Confirm quickly at execution time before committing to the two-subproject structure. |
| A4 | GitHub validates `dependabot.yml` syntax server-side with no local/CI gate needed | CI-04 | Low — worst case, a malformed file silently fails to register the new ecosystem; visible in the repo's Insights tab, not a build break |
| A5 | Node 22 unavailability in this specific research container generalizes to the actual execution environment for the plan | DEP-01, DEP-05 Environment notes | Medium — if the execution environment (e.g. CI runners, which do have Node 22 via actions/setup-node) differs from this research container, some flagged environment gaps may not apply; verify Node availability at plan-execution time rather than assuming this research session's container state |

**If this table is empty:** N/A — see above; all other claims in this research are `[VERIFIED]` or `[CITED]`.

## Open Questions

1. **Does adding a port CLI argument to `SocketServiceApp.java` count as in-scope for DEP-04's smoke test (D-06), given the phase's declared "Code" list names only `java-interop/build.gradle`?**
   - What we know: D-06 requires starting java-interop on a free port for the smoke test; the code has no way to do this today.
   - What's unclear: Whether CONTEXT.md's file-scope list was meant to be exhaustive or illustrative.
   - Recommendation: Surface this explicitly as a plan-time decision (likely a `checkpoint:human-verify` or a one-line note in the plan) rather than silently picking one path. A minimal, additive CLI-arg change (`args[0]` → port, default 5008) is low-risk and reusable for future smoke tests; a throwaway local edit is zero-diff but not repeatable/CI-friendly.

2. **Is `osv-scanner` CLI expected to be installed/run as part of this phase's verification, or is the OSV web API query (as done in this research) sufficient?**
   - What we know: D-02 says the SBOM should be "consumable by osv-scanner"; D-03 says "No new workflow is added."
   - What's unclear: Whether a plan step should install and run `osv-scanner` locally as a one-time verification (not committed to CI) versus just confirming the JSON shape is well-formed CycloneDX.
   - Recommendation: Treat `osv-scanner scan --sbom` as an optional local verification step if the binary is easy to obtain in the execution environment; the `curl`-based OSV API query already used in this research is an adequate substitute if not.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js 22 | DEP-01 lockfile regen, DEP-05 repro (matches CI's pinned version) | ✗ (only Node 24.20.0 found) | v24.20.0 present; no 22 | Use `npm install --package-lock-only` / `--ignore-scripts` under Node 24 for DEP-01 and diff carefully; for DEP-05 verify at execution time whether the actual execution environment has Node 22 (this research container may differ from the plan's execution environment) |
| Node.js (any, for `curl`/OSV queries) | DEP-02, DEP-04 OSV re-verification | ✓ | v24.20.0 | — |
| JDK 17 | DEP-04 java-interop build/run | ✓ | Temurin 17 at `/opt/java/17` (25 is default) | — |
| `osv-scanner` CLI | Optional local SBOM validation | ✗ | not found on PATH | Use the `api.osv.dev/v1/query` HTTP API directly (as this research did) |
| Gradle wrapper (`./gradlew`) | DEP-04 build/run | ✓ | `java-interop/gradlew` present | — |
| `gh` CLI | DEP-05 PR history research (already used) | ✓ | available, authenticated as repo member | — |

**Missing dependencies with no fallback:** none — every gap above has a documented fallback.

**Missing dependencies with fallback:**
- Node 22 → use `--package-lock-only`/`--ignore-scripts` with Node 24, verify diff carefully; re-check environment at execution time.
- `osv-scanner` CLI → use the OSV HTTP API directly.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework (bbj-vscode) | vitest ^4.1.10, config at `bbj-vscode/vitest.config.ts` |
| Framework (java-interop) | JUnit 5 (`junit-jupiter:5.9.1`), run via `./gradlew test` |
| Quick run command (vitest, targeted) | `cd bbj-vscode && npx vitest run test/formatter-pins-drift.test.ts test/formatter-verifier-tamper.test.ts` |
| Full suite command (vitest) | `cd bbj-vscode && npm run test` (whole-suite baseline per team memory: run with `--maxWorkers=2` if contention timeouts appear) |
| Quick run command (Gradle) | `cd java-interop && ./gradlew test` |
| Full build+run command (Gradle) | `cd java-interop && ./gradlew build` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEP-01 | `npm ls --omit=dev` no longer lists `@vscode/vsce`/transitives | smoke/manual | `cd bbj-vscode && npm ls --omit=dev` (assert output excludes vsce) | ❌ no existing automated assertion — add a smoke check or verify manually in SUMMARY |
| DEP-01 | PR VSIX workflow still packages an installable, activating extension | integration (CI) | `pr-vsix.yml` run on the PR itself | ✓ workflow exists, runs on every PR touching `bbj-vscode/**` |
| DEP-02 | jcommander JAR SHA-256 matches committed record | unit | `npx vitest run test/formatter-pins-drift.test.ts` | ✓ exists (Phase 110); extend or sibling-add an assertion for `bom.json` drift |
| DEP-02 | Tamper simulation refuses correctly | unit | `npx vitest run test/formatter-verifier-tamper.test.ts` | ✓ exists (Phase 110) |
| DEP-02 | `bom.json` is well-formed CycloneDX | manual/optional | `osv-scanner scan --sbom bbj-vscode/tools/formatter/lib/bom.json` (if CLI available) or JSON-schema-shape review | ❌ Wave 0 gap — no existing automated CycloneDX-shape check; acceptable as manual verification given "no new workflow" (D-03) |
| DEP-04 | java-interop builds cleanly at Guava 33.7.1-jre | build | `cd java-interop && ./gradlew build` | ✓ existing Gradle build, no test-file gap |
| DEP-04 | java-interop runs and answers one class lookup on Guava 33.7.1-jre | manual/integration | `npm run interop-harness -- --host 127.0.0.1 --port <port>` (bbj-vscode) against a locally-started java-interop instance | ✓ harness exists; blocked on Pitfall 1's port question |
| DEP-05 | Dependabot ignores langium/langium-cli 4.4.x | manual/config review | Read `.github/dependabot.yml` after edit; no automated syntax check exists in this repo | ❌ no test file — GitHub's own server-side validation is the only gate (see Open Question, Assumption A4) |
| DEP-05 | Repro demonstrates both regressions | manual (external project) | `npm run repro` inside `/home/coder/repos/tmp/langium-44-regression-repro/` (outside this repo, not part of this repo's CI) | ❌ Wave 0 gap by design — the repro project doesn't exist yet, D-08 |
| CI-04 | Dependabot watches `github-actions` and `/documentation` | manual/config review | Read `.github/dependabot.yml`; verify against GitHub's Insights → Dependency graph → Dependabot tab post-merge | ❌ no automated test — same as DEP-05 above |

### Sampling Rate
- **Per task commit:** targeted vitest run for any `formatter-verifier.ts`/`bom.json`-related change (`npx vitest run test/formatter-pins-drift.test.ts test/formatter-verifier-tamper.test.ts`); `./gradlew build` for the Guava bump.
- **Per wave merge:** `cd bbj-vscode && npm run test` (whole suite) plus `cd java-interop && ./gradlew build`.
- **Phase gate:** Full vitest suite green, Gradle build green, `npm ls --omit=dev` confirmed vsce-free, PR VSIX workflow green on the phase's own PR, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] A new assertion (in `formatter-pins-drift.test.ts` or a new sibling test file) that `bom.json`'s recorded SHA-256 equals `FORMATTER_ARTIFACT_PINS.find(p => p.relativePath === 'lib/jcommander-1.71.jar').sha256` — covers DEP-02's SBOM/pin-table drift.
- [ ] No test-file gap for DEP-01/DEP-04/DEP-05/CI-04 beyond what's listed above — these are config/build-level verifications, not unit-testable in the traditional sense; document manual verification steps in each plan's SUMMARY.md instead of inventing synthetic unit tests for config files.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | no | — |
| V6 Cryptography | partial | SHA-256 (via `node:crypto.createHash`/`crypto.timingSafeEqual`) already used correctly in `formatter-verifier.ts` for integrity checking (not a secrecy/confidentiality use, so timing-safety is a defense-in-depth nicety here, already present) — no new cryptography is introduced by this phase, the `bom.json`'s hash field just records the same digest already computed by the existing verifier |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|----------------------|
| Supply-chain: vendored binary silently swapped/tampered | Tampering | `formatter-verifier.ts`'s existing SHA-256 pin + timing-safe compare (already in place); this phase adds an SBOM record, not a new runtime control |
| Supply-chain: dependency with a known CVE shipped unnoticed | Tampering/Information Disclosure | OSV query at execution time before finalizing version pins (Guava, jcommander) — done this session, should be re-verified at actual execution time per D-04/D-05 |
| Overbroad production dependency surface | (n/a — hygiene, not a direct STRIDE threat) | Move packaging-only tools (`@vscode/vsce`) out of `dependencies` so `npm audit`/supply-chain tooling scoped to production doesn't need to track packaging-tool CVEs that never ship to end users |

## Sources

### Primary (HIGH confidence)
- `api.osv.dev/v1/query` and `/v1/vulns/<id>` — live queries this session for `com.beust:jcommander@1.71`, `com.google.guava:guava@31.1-jre`, `@33.7.1-jre`, `GHSA-5mg8-w23w-74h3`, `GHSA-7g45-4rm6-3mm3`, `SNYK-JAVA-COMBEUST-174815`
- This repository's own files, read directly this session: `bbj-vscode/package.json`, `bbj-vscode/package-lock.json` (grep), `bbj-vscode/.vscodeignore`, `bbj-vscode/src/formatter-verifier.ts`, `bbj-vscode/test/formatter-pins-drift.test.ts`, `bbj-vscode/test/formatter-verifier-tamper.test.ts`, `bbj-vscode/tools/interop-test-harness/run-tests.ts`, `java-interop/build.gradle`, `java-interop/src/main/java/bbj/interop/InteropService.java`, `java-interop/src/main/java/bbj/interop/SocketServiceApp.java`, `.github/dependabot.yml`, `.github/workflows/{pr-vsix,build,preview,manual-release,workflow-hygiene}.yml`, `documentation/package.json`
- `/home/coder/repos/bbj-ls/bbj-ls/pom.xml` — sibling repo, read this session for the Guava reference pin
- `gh pr view 682/684 --repo BBx-Kitchen/bbj-language-server --json comments` — this repo's own closed Dependabot PRs with the maintainer's first-hand regression report
- `sha256sum` of the actual on-disk jcommander JAR — this session
- `unzip -p BBjCFCli.jar META-INF/MANIFEST.MF` — this session

### Secondary (MEDIUM confidence)
- docs.github.com Dependabot configuration-options and dependabot-options-reference pages (fetched via WebFetch this session) — `github-actions` ecosystem syntax, `ignore.versions` wildcard semantics
- google.github.io/osv-scanner/usage/scan-source, oneuptime.com CycloneDX/osv-scanner blog posts (WebSearch) — CycloneDX filename conventions and minimal shape
- Langium's own CHANGELOG.md content, as embedded in PR #682's Dependabot-generated body (this repo's own PR, HIGH-confidence source, but the changelog summary itself is secondary to the maintainer's own firsthand regression comment)

### Tertiary (LOW confidence)
- security.snyk.io jcommander advisory page (WebSearch) — used only to explain a non-blocking tangential finding, explicitly not acted upon per D-04
- WebSearch results surfacing "CVE-2026-90013/90014" — identified as self-declared synthetic/test data from an unrelated repo, explicitly flagged as not usable

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — CycloneDX/OSV are the locked/specified tools, no alternatives evaluated needed
- Architecture: HIGH — all file paths and existing code read directly this session
- Pitfalls: HIGH — SocketServiceApp port hard-coding and the prepare-script/Node-24 issue are both directly verified against source and team memory, not inferred

**Research date:** 2026-09-28
**Valid until:** 30 days (2026-10-28) — advisory databases (OSV) can surface new CVEs at any time; re-query OSV for both jcommander 1.71 and guava 33.7.1-jre immediately before execution if this research is more than a few days old
