---
phase: "117"
slug: "dependency-hygiene-dependabot-coverage"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-09-28"
---

# Phase 117 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest ^4.1.10 (bbj-vscode); JUnit 5 via Gradle (java-interop) |
| **Config file** | `bbj-vscode/vitest.config.ts`; `java-interop/build.gradle` |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/formatter-pins-drift.test.ts test/formatter-verifier-tamper.test.ts` |
| **Full suite command** | `npm --prefix /home/coder/repos/bbj-language-server/bbj-vscode test` and `cd /home/coder/repos/bbj-language-server/java-interop && ./gradlew build` |
| **Estimated runtime** | ~5 s quick; ~180 s full vitest; ~60 s Gradle |

---

## Sampling Rate

- **After every task commit:** Run the quick command (formatter/SBOM tasks) or `./gradlew build` (Guava/port tasks)
- **After every plan wave:** Run the full suite commands
- **Before `/gsd-verify-work`:** Full suite must be green (judge vitest on numFailedTests; known local interop-backend drift in linking/issue447 is env noise)
- **Max feedback latency:** 180 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 117-01 | 01 | 1 | DEP-01 | — | vsce absent from production tree | smoke | `npm --prefix …/bbj-vscode ls --omit=dev @vscode/vsce` (expect empty) | ✅ | ⬜ pending |
| 117-03 | 03 | 1 | DEP-02 | T-117 tamper | SBOM hash equals pinned hash equals on-disk hash | unit | `npx vitest run test/formatter-pins-drift.test.ts` | ✅ (extend) | ⬜ pending |
| 117-04 | 04 | 1 | DEP-04 | — | Guava 33.7.1-jre builds; OSV no match | build + integration | `./gradlew build`; interop-harness against java-interop on free port | ✅ | ⬜ pending |
| 117-02 | 02 | 1 | CI-04 / DEP-05 | — | dependabot.yml parses, has 4 entries, langium 4.4.x ignored | config check | YAML parse + key assertions (node one-liner) | ❌ W0 | ⬜ pending |
| 117-05 | 05 | 1 | DEP-05 | — | repro shows both regressions 4.3 vs 4.4 | external | `npm run repro` in `/home/coder/repos/tmp/langium-44-regression-repro/` | ❌ W0 (by design) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Assertion that `bbj-vscode/tools/formatter/lib/bom.json` SHA-256 equals the `formatter-verifier.ts` pin for `lib/jcommander-1.71.jar`
- [ ] Langium repro project scaffold (outside the repo, D-08)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PR VSIX installs and activates | DEP-01 | Needs the CI artefact and an editor | Download the PR VSIX artefact, install in VS Code, open a .bbj file |
| Dependabot picks up new entries | CI-04 | GitHub-side | After merge: Insights → Dependency graph → Dependabot |
| Upstream filing | DEP-05 | Maintainer approval required | Maintainer reviews ISSUE-DRAFT.md |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 180s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
