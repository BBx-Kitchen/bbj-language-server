---
phase: "119"
slug: "grammar-declare-file-paths-shared-channel-opening"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-28"
---

# Phase 119 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/example-files.test.ts test/imports.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` |
| **Estimated runtime** | ~20 s quick, ~245 s full |

Grammar regeneration: `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx --yes node@22 node_modules/langium-cli/bin/langium.js generate` (the container's Node 24 crashes `npm run langium:generate`). `generated/` is gitignored, so checking that `ast.ts` is unchanged takes a before/after `cp` snapshot and a `diff`, not `git diff`.

---

## Sampling Rate

- **After every task commit:** Run the quick command
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** the full suite reports `numFailedTests: 0`, or only failures that also fail on the phase base commit with the same test names (compare by name against a base run, never relabel failures as noise); plus the D-09 per-file parse-diff and the conformance file-set diff
- **Max feedback latency:** 30 seconds (quick)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 119-01-T1 | 01 | 1 | FIX-01 | T-119-01, T-119-02 | the file-path token ends at the nearest `::` | unit | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/declare-file-paths.test.ts test/example-files.test.ts test/imports.test.ts test/extensionless-use-target.test.ts` (new regression file + targeted test, run once on the base first) | ❌ W0 (created in the task) | ⬜ pending |
| 119-01-T2 | 01 | 1 | FIX-01 | T-119-03 | no corpus text enters the repo | integration | tsx probe outside the repo, base vs post-#527 (`probe-diff.mjs`), parser-mode corpus base vs post-#527 (`corpus-diff.mjs`), whole suite by failing name vs base | ❌ W0 (not committed) | ⬜ pending |
| 119-02-T1 | 02 | 2 | REF-13 | T-119-04 | the refactor accepts exactly what it accepted before | integration + manual diff | `diff -q` of the post-#527 `generated/ast.ts` snapshot against the regenerated file; probe post-#527 vs head all zeros; parser suites | ❌ W0 | ⬜ pending |
| 119-02-T2 | 02 | 2 | FIX-01, REF-13 | T-119-03, T-119-05 | closing keywords only in the PR body | integration | corpus post-#527 vs head (total 0), whole suite by failing name vs base, lint, typecheck:test, build, id and commit-body scans | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/test-data/<issue527 regression>.bbj`: D-06 shapes
- [ ] targeted FIX-01 test blocks (D-07/D-08)
- [ ] throwaway base-vs-head parse probe (D-09/D-10), not committed

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Private conformance corpus shows no changed parse outcome by file set | FIX-01, REF-13 | The corpus lives outside the repo (`/home/coder/repos/bbj-corpus`) | Snapshot `details.json` to `/home/coder/repos/bbj-corpus/conformance/snapshots/` before each full run; diff the file sets between base and head |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
