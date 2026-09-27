---
phase: "111"
slug: "java-class-data-from-the-interop-peer"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: true) (#2117)
status: validated
nyquist_compliant: false
wave_0_complete: true
created: "2026-09-26"
---

# Phase 111 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (4.1.x, per `bbj-vscode/package.json`) |
| **Config file** | `bbj-vscode/vitest.config.ts` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/<file>.test.ts` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run --maxWorkers=2` |
| **Estimated runtime** | ~15 seconds quick, ~300 seconds full |

---

## Sampling Rate

- **After every task commit:** Run the quick command on the task's test file(s)
- **After every plan wave:** Run the full suite command (judge on `numFailedTests`, not "failed suites")
- **Before `/gsd-verify-work`:** Full suite must be green (`numFailedTests: 0`, minus the known local interop-env drift in linking/issue447)
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 111-01 T1-T3, 111-06 T1 | 111-01, 111-06 | 1, 1 | SEC-03 | T-111-01..04, T-111-24 | Oversized / wrongly typed peer DTO bounded or dropped before storage in `resolveClass()`; absent `parameters` defaulted | unit | `npx vitest run test/java-interop-peer-guard.test.ts` | ✅ | ✅ green (30/30) |
| 111-03 T1-T3, 111-06 T2, 111-07 T1-T2 | 111-03, 111-06, 111-07 | 1, 1, 1 | SEC-04 | T-111-10..13, T-111-25..29 | Javadoc Markdown control characters show literally in hover and completion; only the trailing BASIS Docs link stays clickable | unit | `npx vitest run test/javadoc-markdown-escape.test.ts` | ✅ | ✅ green (43/43) |
| 111-05 T1-T2 | 111-05 | 1 | SEC-05 | T-111-20..22 | Invalid fqn produces no `use` edit; valid fqn still does | unit | `npx vitest run test/java-qualified-name.test.ts test/code-action.test.ts` | ✅ | ✅ green (31/31, 10/10) |
| 111-04 T1-T2 | 111-04 | 1 | FIX-02 | T-111-16..18 | N/A | integration | `npx vitest run test/java-package-name-collision.test.ts` | ✅ | ✅ green (7/7) |
| 111-02 T1-T2 | 111-02 | 1 | FIX-03 | T-111-07..08 | N/A | unit | `npx vitest run test/unknown-java-member.test.ts` | ✅ | ✅ green (47/47) |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] New SEC-03 test built on `CountingJavaInteropService` (reaches the real `resolveClass()`; `JavaInteropTestService` does not)
- [x] New escape-helper test plus hover/completion assertions
- [x] New `isJavaQualifiedName` predicate test
- [x] New FIX-02 reproduction (`use java.io` / `use java.net`) with a `console.error` spy

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hover over a Java method with javadoc still reads well in VS Code and IntelliJ | SEC-04 | Rendering is done by the IDE | Build both extensions, hover `java.util.HashMap.put`, and check the text is readable with no stray link or image — passed in UAT 2026-09-27 |
| Trailing Docs link clickable, raw HTML literal in IntelliJ/LSP4IJ | SEC-04 | Client renderer behaviour | Hover `BBjGrid.isPaging` in both IDEs — passed in UAT 2026-09-27 (111-UAT.md tests 2-3) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-09-27

---

## Validation Audit 2026-09-27

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All five requirements map to existing test files; the six files ran 168/168 green (`--maxWorkers=2`). No auditor spawn was needed.
