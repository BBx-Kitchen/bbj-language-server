---
created: 2026-09-05
title: gradle-wrapper-hygiene test fixture declares Gradle 8.13 while the committed wrapper JAR is 8.14.5
area: testing
severity: minor
files:

  - bbj-vscode/test/gradle-wrapper-hygiene.test.ts:24-30 (GOOD_PROPERTIES_LINES)
  - bbj-intellij/gradle/wrapper/gradle-wrapper.properties:4
---

## Problem

Two contract tests in `test/gradle-wrapper-hygiene.test.ts` fail deterministically:

- "a pre-fix fixture (no distributionSha256Sum, unvalidated ./gradlew) reds with two findings" — the
  checker now reports 3 findings, not 2.
- "a validation step earlier in the same job with two intervening steps still satisfies the
  requirement" — the checker exits 1 instead of 0.

Both fixtures copy the *real* wrapper JAR (`GOOD_WRAPPER_JAR_BYTES` reads
`bbj-intellij/gradle/wrapper/gradle-wrapper.jar`) but pair it with `GOOD_PROPERTIES_LINES`, which
still declares `gradle-8.13-bin.zip` and the 8.13 checksum. Phase 78 plan 78-02 (commit `f63604b`)
regenerated the wrapper to 8.14.5, so the checker's JAR fingerprint now adds an extra finding:
`committed wrapper JAR belongs to Gradle 8.14, 8.14.1, 8.14.5, not the declared 8.13`.

Surfaced by the Phase 81 wave-1 post-merge test gate on 2026-09-05; Phase 81 touched neither file.
The "real repository tree scans clean" test still passes, so the checker itself is fine.

## Fix

Update `GOOD_PROPERTIES_LINES` to declare `gradle-8.14.5-bin.zip` with the checksum from
`bbj-intellij/gradle/wrapper/gradle-wrapper.properties` (or derive both lines from the real
properties file at test time so a future wrapper bump cannot desynchronise them again).
