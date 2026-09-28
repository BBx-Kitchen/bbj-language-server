# Phase 117: Dependency Hygiene & Dependabot Coverage - Context

**Gathered:** 2026-09-28
**Status:** Ready for planning

<domain>
## Phase Boundary

The production dependencies contain only what the extension runs, every vendored or pinned
dependency can be checked against advisory databases, and Dependabot watches every dependency
tree while holding langium at 4.3. Requirements: DEP-01 (#501), DEP-02 (#507), DEP-04 (#521),
DEP-05 (langium 4.4 regression from closed Dependabot PRs #682/#684), CI-04 (#551).

</domain>

<decisions>
## Implementation Decisions

### Formatter JAR provenance (DEP-02, #507)
- **D-01:** The provenance record covers **`bbj-vscode/tools/formatter/lib/jcommander-1.71.jar` only**. The two BASIS JARs (`BBjCFCli.jar`, `lib/BBjCodeFomatter.jar`) are being absorbed by bbj-ls and will be served over JSON-RPC, so they get no record here. This intentionally narrows the roadmap's success criterion 2 ("the formatter JAR"). jcommander is the only vendored JAR with a public coordinate (`com.beust:jcommander:1.71`), so it is the only one an advisory database can actually match.
- **D-02:** Format: a **CycloneDX SBOM** (`bom.json`, machine-readable, consumable by osv-scanner), plus a short human-readable **README.md** next to the JARs. Both carry library, version, vendor/publisher, SHA-256 and origin. The recorded jcommander SHA-256 is `b78ba8f80afc3defe5cbec954495d650273205b715edf4578212f78517d8b804`. Re-verify it at execution time.
- **D-03:** Add a **vitest guard** that recomputes the jcommander JAR's SHA-256 and compares it with the committed record, so a swapped or updated JAR fails the existing suite. No new workflow is added.
- **D-04:** The researcher checks jcommander 1.71 against OSV and reports what it finds. If an advisory affects it, surface that to the user; do not silently swap the JAR, because the vendored BASIS CLI's manifest `Class-Path` names `lib/jcommander-1.71.jar` explicitly.

### Guava (DEP-04, #521)
- **D-05:** Bump `java-interop/build.gradle` from `com.google.guava:guava:31.1-jre` to **`33.7.1-jre`**, the same version bbj-ls runs in production (`/home/coder/repos/bbj-ls/bbj-ls/pom.xml`). No code rewrite; the existing uses of `Stopwatch`, `Lists`, `Primitives` and `ClassPath` in `InteropService.java` stay. Confirm with an OSV query that the coordinate has no match for CVE-2023-2976 or CVE-2020-8908.
- **D-06:** Proof that it "builds and runs": `./gradlew build`, then **a live smoke test**. Start java-interop on a **free port** (not :5008, which BBjServices owns in the dev container) and complete one class lookup over the socket, for example with the existing interop harness (`npm run interop-harness -- --host … --port …`).
- **D-07:** bbj-ls already pins 33.7.1-jre, so no bbj-ls follow-up is needed.

### Langium 4.4 repro (DEP-05)
- **D-08:** The repro lives in a **standalone npm project under `/home/coder/repos/tmp/`** (e.g. `/home/coder/repos/tmp/langium-44-regression-repro/`), outside this repository and outside the langium fork. Pin langium 4.3.x and 4.4.x side by side, and commit or keep the lockfiles. Never install or run langium 4.4 inside `bbj-vscode`.
- **D-09:** Grammar strategy: **start with a toy grammar** (calls, DEF FN with parameters, line-based statements) that shows both symptoms: the parse-recovery slowdown on an unclosed call, and the lost DEF FN parameters in completion. **Fall back to a stripped BBj subset only if the toy grammar does not reproduce them.**
- **D-10:** Deliverable: a runnable `npm run repro` that prints timings and completion items for 4.3 versus 4.4, plus an `ISSUE-DRAFT.md` written up in the langium issue template. **Do not file upstream.** Filing waits for the maintainer's explicit approval.
- **D-11:** The Dependabot ignore rule blocks **only 4.4.x** of `langium` and `langium-cli` in the `/bbj-vscode` npm entry (e.g. `versions: ["4.4.x"]` or equivalent). A later 4.5 PR arrives and is judged on its own merits.

### Claude's Discretion
- The Dependabot settings for the new `github-actions` (directory `/`) and `/documentation` npm entries: schedule, grouping and PR limits. Default to `weekly`, matching the existing entries, and keep comment style consistent with the existing ignore-rule comments.
- DEP-01 mechanics: move `@vscode/vsce` from `dependencies` to `devDependencies` in `bbj-vscode/package.json` and regenerate `package-lock.json` (Node 22, see memory). All workflows already call `npx vsce` after `npm ci`, which installs devDependencies.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` §"Phase 117" — goal, success criteria, planning notes
- `.planning/REQUIREMENTS.md` — DEP-01, DEP-02, DEP-04, DEP-05, CI-04

### DEP-01 (vsce)
- `bbj-vscode/package.json` — `dependencies` currently lists `"@vscode/vsce": "^4.0.0"` (line ~707)
- `.github/workflows/pr-vsix.yml` — PR VSIX packaging (`npx vsce package --out "$OUT"`); must still produce an installable, activating extension
- `.github/workflows/build.yml`, `.github/workflows/preview.yml`, `.github/workflows/manual-release.yml` — other `npx vsce` callers

### DEP-02 (formatter provenance)
- `bbj-vscode/tools/formatter/lib/jcommander-1.71.jar` — the JAR the record covers
- `bbj-vscode/tools/formatter/BBjCFCli.jar` — its manifest `Class-Path` references `lib/jcommander-1.71.jar` (context only, not recorded)

### DEP-04 (Guava)
- `java-interop/build.gradle` — `implementation 'com.google.guava:guava:31.1-jre'`
- `java-interop/src/main/java/bbj/interop/InteropService.java` — Guava call sites
- `/home/coder/repos/bbj-ls/bbj-ls/pom.xml` — reference pin `33.7.1-jre` (sibling repo, read-only here)

### CI-04 / DEP-05 (Dependabot)
- `.github/dependabot.yml` — existing `/bbj-vscode` npm and `/bbj-intellij` gradle entries with their commented ignore rules
- `documentation/package.json` — the Docusaurus npm tree to watch

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- The interop test harness (`npm run interop-harness -- --host … --port …`, from phase 115/116) can drive the live Guava smoke test against a java-interop started on a free port.
- The existing vitest suite in `bbj-vscode/test/` is where the SHA-256 guard goes. Tests must run with cwd = `bbj-vscode` (memory: vitest-cwd-relative-fixtures).

### Established Patterns
- `dependabot.yml` ignore rules each carry an explanatory comment naming the PR or issue that motivated them (chevrotain → PR #347, typescript → PR #397). The langium rule follows suit (PRs #682/#684).
- Dependency-bump verification uses Node 22, since Node 24 breaks `langium generate` (memory: dependabot-local-verification-gotchas).

### Integration Points
- Every push to main bumps the version and publishes VS Code and JetBrains previews. The vsce move must not break `preview.yml`/`manual-release.yml` packaging.
- Phase 122 SHA-pins GitHub Actions and depends on the `github-actions` Dependabot entry from this phase.

</code_context>

<specifics>
## Specific Ideas

- Keep the phase lean: one-line Guava bump, no Guava removal, no jcommander upgrade unless OSV forces the question (D-04).
- The langium repro should be small enough for upstream maintainers to run in under a minute.

</specifics>

<deferred>
## Deferred Ideas

- Remove the vendored formatter JARs (`BBjCFCli.jar`, `BBjCodeFomatter.jar`, and then jcommander) and switch the extension to bbj-ls's JSON-RPC formatter. The work is under way on the bbj-ls side; this repo's switch-over is a future phase.

### Reviewed Todos (not folded)
- `2026-09-26-intellij-interop-initoptions-key-mismatch.md` — IntelliJ interop key mismatch; unrelated to dependency hygiene
- `2026-09-26-signature-help-and-snippet-peer-name-escaping.md` — security/escaping; unrelated
- `2026-09-27-windows-intellij-node-download-progress-check.md` — Windows manual check; unrelated

</deferred>

---

*Phase: 117-dependency-hygiene-dependabot-coverage*
*Context gathered: 2026-09-28*

## Addendum (2026-09-28, after research)

- **D-12:** `java-interop/src/main/java/bbj/interop/SocketServiceApp.java` gets an **optional port argument** (argv or a `-D` system property), defaulting to 5008, so the D-06 live smoke can run beside BBjServices. This is a deliberate, small scope extension beyond `java-interop/build.gradle`, approved by the user.
