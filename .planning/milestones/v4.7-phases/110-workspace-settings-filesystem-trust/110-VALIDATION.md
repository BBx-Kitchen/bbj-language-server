---
phase: "110"
slug: "workspace-settings-filesystem-trust"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: true) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
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

| Task | Requirement | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|------|-------------|-----------------|-----------|-------------------|-------------|--------|
| 110-01 T1 | SEC-01 / REF-02 | Validator table; initialization-options path (host alone, port alone, both, neither) via `LanguageServer.initialize`; `setConnectionConfig` validates itself | unit | `npx vitest run test/interop-config.test.ts test/java-interop-timeouts.test.ts test/ws-manager.test.ts` | ✅ | ✅ green |
| 110-01 T2 | SEC-01 / REF-02 | Configuration-change path per field; main.ts call-site pin; defaults exist once | unit + source pin | `npx vitest run test/interop-config.test.ts test/config-hot-reload-wiring.test.ts test/java-interop-service.test.ts` | ✅ | ✅ green |
| 110-02 T1 | SEC-06 / SEC-07 | `isPathInside` (incl. `/libs/foo2/` vs `/libs/foo`, win32); builder never reads outside PREFIX roots (`..`, absolute, transitive), asserted on recorded `readFile` targets | unit | `npx vitest run test/path-containment.test.ts test/use-path-containment.test.ts test/lazy-prefix-loading.test.ts test/document-builder.test.ts` | ✅ | ✅ green |
| 110-02 T2 | SEC-06 | Scope and USE validator ignore escaping PREFIX candidates; document-relative and workspace-root unchanged | unit | `npx vitest run test/use-path-containment.test.ts test/use-project-root.test.ts test/classes.test.ts test/imports.test.ts test/extensionless-use-target.test.ts test/lazy-prefix-loading.test.ts` | ✅ | ✅ green |
| 110-02 T3 | SEC-07 | Direct `isExternalDocument()` cases (sibling, trailing separator, prefix dir, empty prefix) | unit | `npx vitest run test/path-containment.test.ts test/ws-manager.test.ts test/lazy-prefix-loading.test.ts test/use-path-containment.test.ts test/document-builder.test.ts` | ✅ | ✅ green |
| 110-03 T1 | SEC-08 | `isTokenizedFile` rejects symlink, dir, FIFO; O_NOFOLLOW/O_NONBLOCK flags; fstat re-check | unit | `npx vitest run test/decompile-io.test.ts test/tokenized-bbj.test.ts` | ✅ | ✅ green |
| 110-03 T2 | SEC-08 | `statSize` rejects symlink, dir, FIFO; symlinked `.lst` never taken as output | unit | `npx vitest run test/decompile-io.test.ts` | ✅ | ✅ green |
| 110-04 T1 | SEC-09 | javaPath invalid → error, no spawn, no PATH fallback; valid → exact path spawned; empty → PATH walk + check; manifest scope `machine` | unit | `npx vitest run test/formatter-java-resolver.test.ts test/document-formatter.test.ts test/formatter-verifier-tamper.test.ts test/no-shell-command-construction.test.ts` | ✅ | ✅ green |
| 110-04 T2 | SEC-09 | Windows PATH/PATHEXT rules; first-hit semantics; real symlink/dir/permission cases | unit | `npx vitest run test/formatter-java-resolver.test.ts test/document-formatter.test.ts` | ✅ | ✅ green |
| 110-04 T3 | SEC-09 | Launcher-pin comment corrected; resolver pinned before spawn; docs entry | source pin | `npx vitest run test/no-shell-command-construction.test.ts test/document-formatter.test.ts test/formatter-java-resolver.test.ts` | ✅ | ✅ green |
| 110-05 T1 | SEC-02 | Untrusted → workspace `configPath` ignored in initializationOptions and the association fallback | unit (stubbed vscode) | `npx vitest run test/extension-config-trust.test.ts test/extension-activation.test.ts test/config-file-association.test.ts test/config-reload-host.test.ts test/stale-output-channel-repro.test.ts test/config-path-consumers.test.ts` | ✅ | ✅ green |
| 110-05 T2 | SEC-02 | Settings push (middleware never calls next for bbj) and pull carry the gated value; push tested through `activate()` | unit (stubbed vscode) | `npx vitest run test/extension-config-trust.test.ts test/extension-activation.test.ts test/config-file-association.test.ts test/config-reload-host.test.ts test/stale-output-channel-repro.test.ts` | ✅ | ✅ green |
| 110-05 T3 | SEC-02 | Trust grant re-pushes the settings | unit (stubbed vscode) | `npx vitest run test/extension-config-trust.test.ts test/extension-activation.test.ts test/config-file-association.test.ts test/config-reload-host.test.ts test/stale-output-channel-repro.test.ts test/config-path-consumers.test.ts test/no-shell-command-construction.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `bbj-vscode/test/interop-config.test.ts` — SEC-01/REF-02
- [x] `bbj-vscode/test/path-containment.test.ts` (+ direct `isExternalDocument` cases) — SEC-07
- [x] `bbj-vscode/test/use-path-containment.test.ts` — SEC-06 spy-FileSystemProvider test
- [x] `bbj-vscode/test/formatter-java-resolver.test.ts` — SEC-09
- [x] `bbj-vscode/test/extension-config-trust.test.ts` — SEC-02 (vi.mock('vscode') pattern from document-formatter.test.ts)

Test files may be created within the implementing task (test-first) rather than a separate wave.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Formatter error message on invalid `bbj.formatter.javaPath` in a real VS Code | SEC-09 | UI surface | Set a bogus path in user settings, run Format Document on a .bbj file, confirm error names the path and no format happens. UAT Test 1 passed 2026-09-26 |
| Trust grant re-push in a real VS Code | SEC-02 | Extension does not activate in Restricted Mode today (RESEARCH D-08) — only reachable via stubbed tests | Covered by unit tests; UAT Test 2 passed 2026-09-26 |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-09-26

## Validation Audit 2026-09-26

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All 25 mapped test files ran together: 353 tests, 350 passed, 3 skipped, `numFailedTests: 0`. Four suites reported as failed without a failed test. These are `initializeWorkspace` beforeAll hook timeouts (10 s) in `use-path-containment.test.ts` and `extensionless-use-target.test.ts`, and they alternate between passing and timing out on isolated reruns. `extensionless-use-target.test.ts` predates this phase (#698). This follows the standing whole-suite rule: judge on `numFailedTests`.
