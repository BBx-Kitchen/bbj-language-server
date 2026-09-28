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
| 119-xx | TBD | 1 | FIX-01 | — | N/A | unit | `npx vitest run test/example-files.test.ts` (new `test/test-data/` regression file) | ❌ W0 | ⬜ pending |
| 119-xx | TBD | 1 | FIX-01 | — | N/A | unit | targeted vitest: two VariableDecls with their own file-path text, zero validation errors against real lib docs | ❌ W0 | ⬜ pending |
| 119-xx | TBD | 1 | REF-13 | — | N/A | integration | throwaway per-file parse-error diff (base vs head) over `examples/**/*.bbj` + `bbj-vscode/test/test-data/*.bbj` | ❌ W0 (not committed) | ⬜ pending |
| 119-xx | TBD | 1 | REF-13 | — | N/A | manual diff | `diff` of a `generated/ast.ts` snapshot before/after regen: no interface or property change | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

The planner fills in the task IDs.

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
