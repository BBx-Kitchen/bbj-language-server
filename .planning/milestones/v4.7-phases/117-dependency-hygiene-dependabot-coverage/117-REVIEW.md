---
phase: 117-dependency-hygiene-dependabot-coverage
reviewed: 2026-09-28T18:23:32Z
depth: standard
files_reviewed: 7
files_reviewed_list:
  - .github/dependabot.yml
  - bbj-vscode/package.json
  - bbj-vscode/test/formatter-pins-drift.test.ts
  - bbj-vscode/tools/formatter/lib/README.md
  - bbj-vscode/tools/formatter/lib/bom.json
  - java-interop/build.gradle
  - java-interop/src/main/java/bbj/interop/SocketServiceApp.java
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 117: Code Review Report

**Reviewed:** 2026-09-28T18:23:32Z
**Depth:** standard
**Files Reviewed:** 7
**Status:** issues_found

## Summary

Reviewed the diff against `065c73a8` for all seven listed files: the new `langium`/`langium-cli` 4.4.x
Dependabot holds plus two new ecosystem entries (`github-actions`, `documentation` npm), the
`@vscode/vsce` move from `dependencies` to `devDependencies`, a new CycloneDX `bom.json` +
provenance `README.md` for the vendored jcommander jar with two new drift-guard tests, the Guava
31.1-jre → 33.7.1-jre bump in `java-interop/build.gradle`, and the new optional/validated port
argument in `SocketServiceApp.java`.

Spot-checks performed beyond reading: recomputed `sha256sum` of the real
`jcommander-1.71.jar` on disk and confirmed it matches both `bom.json`'s hash and the existing
`FORMATTER_ARTIFACT_PINS` entry; confirmed `documentation/package.json` and
`.github/workflows/` exist so the two new Dependabot directories are real; confirmed no workflow
runs `npm ci` with `--omit=dev`/`--production`, so moving `@vscode/vsce` to `devDependencies`
does not break `npx vsce package`/`publish` in CI; confirmed `com.google.common.{base.Stopwatch,
collect.Lists, primitives.Primitives, reflect.ClassPath}` (the only Guava call sites, in
`InteropService.java`) are all still present in Guava 33.x; traced `SocketServiceApp.parsePort`
through its boundary cases (0, negative, >65535, non-numeric, >1 arg, overflow). No blocker-level
defect was found. Two warnings and two info-level notes are below.

## Warnings

### WR-01: New port-parsing/validation logic has no automated test coverage

**File:** `java-interop/src/main/java/bbj/interop/SocketServiceApp.java:55-72`
**Issue:** `parsePort` is new, non-trivial input-validation logic (range checks, arg-count
checks, NumberFormatException translation) — exactly the kind of code most likely to regress
silently. `java-interop/` has no `src/test` directory at all, so this logic is verified only by
the one-time manual smoke test recorded in `117-04-SUMMARY.md`, not by anything that runs again
on the next change to this file or the next Guava/lsp4j bump.
**Fix:** Add a minimal JUnit test source set (`java-interop/src/test/java/...`) covering
`parsePort`'s boundaries directly (no args → 5008, `"1"`, `"65535"`, `"0"` → throws, `"65536"` →
throws, `"-1"` → throws, `"abc"` → throws, two args → throws), e.g.:
```java
@Test
void rejectsOutOfRangeAndNonNumericPorts() {
    assertThrows(IllegalArgumentException.class, () -> SocketServiceApp.parsePort(new String[]{"0"}));
    assertThrows(IllegalArgumentException.class, () -> SocketServiceApp.parsePort(new String[]{"65536"}));
    assertThrows(IllegalArgumentException.class, () -> SocketServiceApp.parsePort(new String[]{"abc"}));
    assertThrows(IllegalArgumentException.class, () -> SocketServiceApp.parsePort(new String[]{"1", "2"}));
    assertEquals(5008, SocketServiceApp.parsePort(new String[]{}));
}
```

### WR-02: `java-interop/build.gradle` still has no Dependabot ecosystem entry

**File:** `.github/dependabot.yml` (whole file); `java-interop/build.gradle:22`
**Issue:** This phase adds `gradle`/`bbj-intellij`, `github-actions`/`/`, and `npm`/`documentation`
Dependabot coverage, and separately bumps `java-interop`'s Guava by hand (a one-off, per D-05/D-06
in the phase's planning docs). But `java-interop/build.gradle` — the file this same diff just
edited — still has no corresponding `package-ecosystem: "gradle"` / `directory: "/java-interop"`
entry anywhere in `dependabot.yml`. The Guava version just fixed here (and the pinned
`org.eclipse.lsp4j` version) will drift out of date again with nothing to flag it, which is the
exact failure mode the rest of this phase exists to close for every other ecosystem in the repo.
**Fix:** Add a fourth Gradle `updates:` entry for `java-interop`, mirroring the existing
`bbj-intellij` one:
```yaml
  - package-ecosystem: "gradle"
    directory: "/java-interop"
    schedule:
      interval: "weekly"
```
If this omission is intentional (e.g. `java-interop` is being phased out in favor of the sibling
`bbj-ls` backend per team notes), consider recording that as a comment in `dependabot.yml` itself
so the gap reads as a decision rather than an oversight to the next reader.

## Info

### IN-01: README's "Checking for advisories" section bakes in unverifiable, dated query results

**File:** `bbj-vscode/tools/formatter/lib/README.md:38-42`
**Issue:** The provenance README states, as a permanent fact, that an OSV query "Last checked
2026-09-28" "returned no advisories (`{}`)" and that a positive-control query "returned
`CVE-2023-2976`," with no query transcript, log file, or link committed alongside it. A future
reader (human or scanner) has no way to independently confirm these specific claims from the repo
alone, and the "last checked" date will silently go stale the moment a new advisory is published
for `pkg:maven/com.beust/jcommander@1.71` — nothing re-runs or re-dates this check.
**Fix:** Either commit the actual query output (e.g. `lib/osv-check.json`, refreshed by the same
process that updates `bom.json`) so the claim is verifiable, or soften the prose to describe the
recommended check procedure without asserting a specific historical result/date that nothing
enforces going forward.

### IN-02: Third-party advisory reference is unnamed and unlinked

**File:** `bbj-vscode/tools/formatter/lib/README.md:44-49`
**Issue:** "a third-party vulnerability database (not OSV) lists an 'Unsafe Dependency
Resolution' advisory affecting jcommander versions before 1.75" names neither the database nor an
advisory/CVE/GHSA identifier, so a future reader can't look it up to re-evaluate the "does not
apply" judgment independently.
**Fix:** Name the source (e.g. Snyk ID, GHSA ID, or vendor advisory URL) so the dismissal is
independently checkable, e.g. `SNYK-JAVA-COMBEUST-XXXXXX (https://security.snyk.io/vuln/...)`.

---

_Reviewed: 2026-09-28T18:23:32Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
