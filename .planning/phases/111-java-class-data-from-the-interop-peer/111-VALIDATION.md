---
phase: "111"
slug: "java-class-data-from-the-interop-peer"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
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
| TBD by planner | — | — | SEC-03 | T-111 | Oversized / wrongly typed peer DTO bounded or dropped before storage in `resolveClass()` | unit | `npx vitest run test/java-interop-peer-guard.test.ts` | ❌ W0 | ⬜ pending |
| TBD by planner | — | — | SEC-04 | T-111 | Javadoc Markdown control characters show literally in hover and completion | unit | `npx vitest run test/javadoc-markdown-escape.test.ts` | ❌ W0 | ⬜ pending |
| TBD by planner | — | — | SEC-05 | T-111 | Invalid fqn produces no `use` edit; valid fqn still does | unit | `npx vitest run test/java-qualified-name.test.ts test/code-action.test.ts` | partial | ⬜ pending |
| TBD by planner | — | — | FIX-02 | — | N/A | integration | `npx vitest run test/java-package-name-collision.test.ts` | ❌ W0 | ⬜ pending |
| TBD by planner | — | — | FIX-03 | — | N/A | unit | `npx vitest run test/unknown-java-member.test.ts test/diagnostic-hierarchy.test.ts` | partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] New SEC-03 test built on `CountingJavaInteropService` (reaches the real `resolveClass()`; `JavaInteropTestService` does not)
- [ ] New escape-helper test plus hover/completion assertions
- [ ] New `isJavaQualifiedName` predicate test
- [ ] New FIX-02 reproduction (`use java.io` / `use java.net`) with a `console.error` spy

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hover over a Java method with javadoc still reads well in VS Code and IntelliJ | SEC-04 | Rendering is done by the IDE | Build both extensions, hover `java.util.HashMap.put`, and check the text is readable with no stray link or image |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
