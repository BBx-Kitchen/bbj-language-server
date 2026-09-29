---
phase: 117-dependency-hygiene-dependabot-coverage
fixed_at: 2026-09-28T19:02:13Z
review_path: .planning/phases/117-dependency-hygiene-dependabot-coverage/117-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 117: Code Review Fix Report

**Fixed at:** 2026-09-28T19:02:13Z
**Source review:** `.planning/phases/117-dependency-hygiene-dependabot-coverage/117-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (WR-01, WR-02, IN-01, IN-02 — full scope, `fix_scope: all`)
- Fixed: 4
- Skipped: 0

## Fixed Issues

### WR-01: New port-parsing/validation logic has no automated test coverage

**Files modified:** `java-interop/src/test/java/bbj/interop/SocketServiceAppTest.java` (new file)
**Commit:** `27a8a4c7`
**Applied fix:** Added a JUnit 5 test class covering `SocketServiceApp.parsePort`'s boundaries:
no-args default, lowest/highest valid ports, zero, negative, above-range, non-numeric, and
too-many-arguments. `parsePort` was already package-private/static in the source — no visibility
change needed. The Gradle test dependency (`junit-jupiter:5.9.1`) and `useJUnitPlatform()` wiring
already existed in `java-interop/build.gradle` from an earlier commit in this same phase; only the
test source set itself was missing.

### WR-02: `java-interop/build.gradle` still has no Dependabot ecosystem entry

**Files modified:** `.github/dependabot.yml`
**Commit:** `49fd2b1d`
**Applied fix:** Added a fourth Gradle `updates:` entry for `directory: "/java-interop"` (weekly
interval), mirroring the existing `bbj-intellij` entry, with a one-line comment explaining why
(java-interop pins Guava and lsp4j versions that need the same drift check).

### IN-01: README's "Checking for advisories" section bakes in unverifiable, dated query results

**Files modified:** `bbj-vscode/tools/formatter/lib/README.md`
**Commit:** `f01c6bc8`
**Applied fix:** Reworded the "Last checked 2026-09-28: ... returned no advisories" claim so it
reads as a point-in-time snapshot rather than a standing guarantee, and added an explicit
instruction to re-run the scanner/API query before relying on the advisory status again, since
nothing in the repository re-checks or re-dates it automatically. Did not invent or commit a new
evidence file (`lib/osv-check.json`) — softening the prose was the fix applied, per the finding's
first stated option only when verifiable evidence isn't available to commit.

### IN-02: Third-party advisory reference is unnamed and unlinked

**Files modified:** `bbj-vscode/tools/formatter/lib/README.md`
**Commit:** `ff96a31b`
**Applied fix:** Verified the advisory against Snyk's public vulnerability database (fetched
`https://security.snyk.io/package/maven/com.beust%3Ajcommander` and
`https://security.snyk.io/vuln/SNYK-JAVA-COMBEUST-174815` directly) before naming anything, per
the "never fabricate an identifier" instruction. Confirmed: **SNYK-JAVA-COMBEUST-174815**,
"Unsafe Dependency Resolution," affected range `[0,1.75)` — matching the README's existing
"before 1.75" description exactly. Named and linked the advisory in the README so the dismissal
is now independently checkable.

## Verification

- **WR-01:** Ran `./gradlew build` for `java-interop/` (the checked-in `gradlew` had no
  `gradle-wrapper.jar`/`gradle-wrapper.properties` committed — a pre-existing condition unrelated
  to this fix — so the build was run via a cached local Gradle 8.14.5 distribution instead).
  `BUILD SUCCESSFUL`; the JUnit XML report
  (`java-interop/build/test-results/test/TEST-bbj.interop.SocketServiceAppTest.xml`) confirms all
  8 new tests ran and passed (`tests="8" skipped="0" failures="0" errors="0"`).
- **IN-01 / IN-02:** Ran `npx vitest run test/formatter-pins-drift.test.ts` from `bbj-vscode/`
  after each edit — 8/8 tests passed both times, confirming the README's single SHA-256 occurrence
  and purl-inclusion invariants (enforced by that suite) still hold after the reword.
- **WR-02:** No YAML linter was available in this environment (neither `js-yaml` nor `PyYAML` was
  installed); verified via Tier 1 (re-read) only — the new entry's structure and indentation
  exactly mirror the existing, already-valid `bbj-intellij` entry immediately above it.
- **Where gates ran:** All verification (the Gradle build and both vitest runs) ran inside the
  isolated git worktree created for this fix session
  (`.claude/worktrees/rf-117-<pid>-<epoch>/`), not the main checkout. `bbj-vscode`'s and the
  repo-root's `node_modules` were temporarily symlinked (plain POSIX symlinks, not junctions) from
  the main checkout into the worktree to make `npx vitest` runnable, then `unlink`ed immediately
  after each run — no `node_modules` content was copied, deleted, or otherwise mutated. These
  numbers are reproducible from the worktree branch's commits (`27a8a4c7` for the Gradle build,
  `f01c6bc8`/`ff96a31b` for the vitest runs) but the worktree itself was torn down after this
  report was written, so re-running `npx vitest run test/formatter-pins-drift.test.ts` or
  `./gradlew build` from the main checkout (once these commits are fast-forwarded in) is the way
  to reproduce them going forward.

## Skipped Issues

None — all four in-scope findings were fixed.

---

_Fixed: 2026-09-28T19:02:13Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
