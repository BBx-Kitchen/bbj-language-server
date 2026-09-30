---
created: 2026-09-29
title: Upgrade vitest and @vitest/coverage-v8 to 5 together
area: dependencies
source: Dependabot PR #710 (closed with "ignore this major version", 2026-09-29)
trigger: when the grouped vitest 5 update arrives, or the next test-infrastructure phase
files:

  - bbj-vscode/package.json
  - bbj-vscode/vitest.config.ts

audit_acknowledged:
  milestone: v4.8
  at: 2026-09-30
---

## Problem

@vitest/coverage-v8 5.0.2 has an exact peer on vitest 5.0.2, so bumping it alone breaks npm ci.
Dependabot now groups `vitest` and `@vitest/*`, but the major was ignored for coverage-v8.

## What to do

Upgrade both to 5 in one change. Check the vitest 5 migration notes (reporters, config keys,
pool options), run the whole suite with `--maxWorkers=2`, and compare the failing-test set with
the base. Lift the coverage-v8 ignore with `@dependabot unignore @vitest/coverage-v8`.
