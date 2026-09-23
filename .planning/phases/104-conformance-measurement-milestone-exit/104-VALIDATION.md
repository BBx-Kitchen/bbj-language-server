---
phase: "104"
slug: "conformance-measurement-milestone-exit"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-23"
---

# Phase 104 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 (`bbj-vscode`), JUnit 5 via Gradle (`bbj-intellij`); private `bbj-corpus` conformance harness (manual, never CI) |
| **Config file** | `bbj-vscode/vitest.config.ts` (existing) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/example-files.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` (interop up) and the interop-unreachable run; `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --rerun-tasks` |
| **Estimated runtime** | ~300 seconds (vitest), Gradle a few minutes; corpus endpoint run: long, timed by the Plan 1 sample |

---

## Sampling Rate

- **After every task commit:** Run the targeted test file (or the harness `--limit` sample for corpus-side tasks)
- **After every plan wave:** Run the full `bbj-vscode` suite (both interop modes)
- **Before `/gsd-verify-work`:** Full suite must be green (no new failures against the origin/main base, compared by test name)
- **Max feedback latency:** 300 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 104-01-01 | 01 | 1 | CONF-02 | T-104-04, T-104-05 | a run that measures nothing aborts (sanity check); 98-103 results committed by exact path | integration (private harness, tracer) | `node …/bbj-corpus/conformance/run.mjs --ls … --endpoint 127.0.0.1:5008 --limit 20 --shards 2` + summary check (calls > 0, 0 failures) | ✅ | ⬜ pending |
| 104-01-02 | 01 | 1 | CONF-02 | T-104-01, T-104-02 | leak guard flags a real corpus id and passes a clean file; flag-off output unchanged | integration (private harness) | flag-off `--limit 150` before/after diff; endpoint summary key check; leak-guard self-test | ✅ | ⬜ pending |
| 104-01-03 | 01 | 1 | CONF-02 | T-104-03 | baseline read from a pristine detached worktree, build-info asserted | integration (private harness, full run) | full endpoint run on `--data` baseline: 11,898/1,210, 0 failures, 0 crashes, B ≤ 60; probe deleted; README grep | ✅ | ⬜ pending |
| 104-02-01 | 02 | 2 | CONF-02 | T-104-06 | no corpus content or planning id in the test-data README or the todo | docs + targeted vitest (tracer) | leak guard (both data roots); identifier/number greps; `RUN_BBJ_TESTS=0 npx vitest run test/conformance-regressions.test.ts test/example-files.test.ts test/examples-compile.test.ts` | ✅ | ⬜ pending |
| 104-02-02 | 02 | 2 | CONF-03 | T-104-07, T-104-08 | failures judged by name against origin/main, not relabelled | whole-suite | `npx vitest run --maxWorkers=2 --reporter=json` (interop up and `RUN_BBJ_TESTS=0`) + origin/main name comparison | ✅ | ⬜ pending |
| 104-02-03 | 02 | 2 | CONF-03 | — | N/A | build + JUnit | `npm run build`; `./gradlew test --rerun-tasks`; `./gradlew buildPlugin` + `cmp` of main.cjs; `vsce package --no-dependencies` | ✅ | ⬜ pending |
| 104-03-01 | 03 | 3 | CONF-03 | T-104-11, T-104-12 | gate rejects a wrong corpus, a failed call, a crash or a non-final tree | integration (private harness, tracer) | closing runs (endpoint off, endpoint on) + `summary.json` gate check; raw-set equality; `git diff --quiet <measured> HEAD -- bbj-vscode bbj-intellij` | ✅ | ⬜ pending |
| 104-03-02 | 03 | 3 | CONF-03 | T-104-09 | no corpus ids/paths/source text in 104-CONFORMANCE.md or PROJECT.md | docs | leak guard (both data roots); exit-gate line equals the gate summary; required headings | ✅ | ⬜ pending |
| 104-03-03 | 03 | 3 | CONF-02, CONF-03 | T-104-09, T-104-10, T-104-13, T-104-14 | exact-path corpus commit; fast-forward push only; PR body free of identifiers and closing keywords | git + GitHub | `merge-base --is-ancestor` on the PR head; `gh pr view 691` state/head/title; body grep; corpus commit path list | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Corpus conformance run with endpoint active | CONF-02, CONF-03 | Corpus is private (internal + third-party code) and must never enter CI | Run `conformance/run.mjs --ls <repo> --endpoint 127.0.0.1:5008` locally against BBjServices 26.03+; read summary.json gate fields |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
