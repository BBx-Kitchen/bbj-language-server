---
phase: "118"
slug: "small-dedup-drift-guards"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-28"
---

# Phase 118 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 (bbj-vscode) |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <affected test files>` |
| **Full suite command** | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode test` |
| **Gate commands** | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run lint` and `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode run typecheck:test` |
| **Estimated runtime** | ~5 s quick; ~180 s full vitest |

---

## Sampling Rate

- **After every task commit:** Run the affected suites (quick command), plus `npx eslint <changed files> --max-warnings 0` and `npx tsc -p tsconfig.test.json --noEmit` from `bbj-vscode`
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite must be green (judge on numFailedTests; known local interop-backend drift in linking/issue447 is env noise — compare against the phase base when in doubt)
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 118-xx | TBD | 1 | REF-01 | — | N/A | unit/functional | `npx vitest run test/functional/lsp-features.test.ts test/inlay-hints.test.ts test/inlay-hints-javadoc.test.ts` | ✅ | ⬜ pending |
| 118-xx | TBD | 1 | REF-04 | — | N/A | unit | `npx vitest run test/builtin-functions-library.test.ts test/builtin-library-members.test.ts test/example-files.test.ts` | ✅ | ⬜ pending |
| 118-xx | TBD | 1 | REF-05 | — | N/A | unit | `npx vitest run test/<bbl-drift>.test.ts` | ❌ W0 | ⬜ pending |
| 118-xx | TBD | 1 | REF-06 | — | N/A | unit | `npx vitest run test/<compiler-options-drift>.test.ts test/compiler-options.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky* — task IDs are filled in once plans exist.

---

## Wave 0 Requirements

- [ ] New `.bbl` drift test (byte-exact `.bbl` vs exported `.ts` constant, CRLF-normalised) — REF-05
- [ ] New compiler-option drift test (`package.json` `bbj.compiler.*` vs `COMPILER_OPTIONS`, both directions, `trigger` allow-listed) — REF-06

*Both new tests must be shown to fail on an injected drift (negative probe) before being accepted as guards.*

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
