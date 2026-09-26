---
phase: "110"
slug: "workspace-settings-filesystem-trust"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-26"
---

# Phase 110 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.10 |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run <file>` |
| **Full suite command** | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode test` |
| **Estimated runtime** | ~5-20 seconds per targeted file; full suite several minutes |

Never pass `--reporter=basic`. Never call `DocumentBuilder.build` in a new test (it reaches :5008).

---

## Sampling Rate

- **After every task commit:** Run the targeted file(s) for that task
- **After every plan wave:** Run the full suite; judge on `numFailedTests: 0` (standing whole-suite gate); use `--maxWorkers=2` if `initializeWorkspace` hook timeouts appear
- **Before `/gsd-verify-work`:** Full suite must be green by that standard
- **Max feedback latency:** 60 seconds per targeted run

---

## Per-Task Verification Map

Filled by the planner/executor with real task ids. Requirement → test mapping (from RESEARCH.md):

| Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|-----------------|-----------|-------------------|-------------|--------|
| SEC-01 / REF-02 | Invalid host/port → per-field default + warning; both entry paths via one validator | unit | `npx vitest run test/interop-config.test.ts` | ❌ W0 | ⬜ pending |
| SEC-01 / REF-02 | `setConnectionConfig` validates itself | unit | `npx vitest run test/java-interop-service.test.ts` | ✅ extend | ⬜ pending |
| SEC-02 | Untrusted → workspace `configPath` ignored in initializationOptions AND the settings push; re-push on trust grant | unit (stubbed vscode) | `npx vitest run test/extension-config-trust.test.ts` | ❌ W0 | ⬜ pending |
| SEC-06 | No `readFile` outside PREFIX roots (`..`, absolute) in document builder; scope prefix candidates filtered | unit | `npx vitest run test/use-path-containment.test.ts test/classes.test.ts` | ❌ W0 / ✅ extend | ⬜ pending |
| SEC-07 | `/libs/foo2/` not inside `/libs/foo`; isPathInside helper | unit | `npx vitest run test/path-containment.test.ts` | ❌ W0 | ⬜ pending |
| SEC-08 | `statSize`/`isTokenizedFile` reject symlink, dir, FIFO | unit | `npx vitest run test/decompile-io.test.ts` | ✅ extend | ⬜ pending |
| SEC-09 | javaPath invalid → error, no spawn; valid → exact path; empty → PATH walk + check | unit | `npx vitest run test/formatter-java-resolver.test.ts test/document-formatter.test.ts` | ❌ W0 / ✅ extend | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `bbj-vscode/test/interop-config.test.ts` — SEC-01/REF-02
- [ ] `bbj-vscode/test/path-containment.test.ts` (+ direct `isExternalDocument` cases) — SEC-07
- [ ] `bbj-vscode/test/use-path-containment.test.ts` — SEC-06 spy-FileSystemProvider test
- [ ] `bbj-vscode/test/formatter-java-resolver.test.ts` — SEC-09
- [ ] `bbj-vscode/test/extension-config-trust.test.ts` — SEC-02 (vi.mock('vscode') pattern from document-formatter.test.ts)

Test files may be created within the implementing task (test-first) rather than a separate wave.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Formatter error message on invalid `bbj.formatter.javaPath` in a real VS Code | SEC-09 | UI surface | Set a bogus path in user settings, run Format Document on a .bbj file, confirm error names the path and no format happens |
| Trust grant re-push in a real VS Code | SEC-02 | Extension does not activate in Restricted Mode today (RESEARCH D-08) — only reachable via stubbed tests | Covered by unit tests; UAT optional |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
