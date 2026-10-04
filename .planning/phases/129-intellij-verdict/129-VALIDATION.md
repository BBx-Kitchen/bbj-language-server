---
phase: "129"
slug: "intellij-verdict"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-04"
---

# Phase 129 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | JUnit Jupiter (IntelliJ plugin, `junit-bom:6.1.3`); vitest 4.1.10 only if a `bbj-vscode/` file changes (none planned) |
| **Config file** | `bbj-intellij/build.gradle.kts` (`useJUnitPlatform()`) |
| **Quick run command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew test --offline --console=plain --tests '*FormatterInitOptions*' --tests '*InteropInitOptions*' --tests '*Lsp4ijOverrideSiteSourceGuardTest' --tests '*BbjLspFormattingSwitchTest'` |
| **Full suite command** | `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew cleanTest test --offline --console=plain` (baseline 1263 tests, 0 failures) |
| **Estimated runtime** | quick ~10 s; full ~2-4 min |

---

## Sampling Rate

- **After every task commit:** Run the quick run command
- **After every plan wave:** Run the full suite command
- **Before `/gsd-verify-work`:** Full suite must be green; both distributables rebuilt from the final tree
- **Max feedback latency:** 240 seconds

---

## Per-Task Verification Map

| Req | Behavior | Test Type | Automated Command | File Exists | Status |
|-----|----------|-----------|-------------------|-------------|--------|
| IJF-02 | Evaluation record has a row per hands-on case with log/trace excerpt, or a code-verified label naming a test | document check | `grep` per case id in `129-EVALUATION.md` | ❌ W0 | ⬜ pending |
| IJF-02 | Zip under test carries the fresh server | build check | `unzip -p …/bbj-intellij/build/distributions/*.zip bbj-intellij/lib/language-server/main.cjs \| cmp - …/bbj-vscode/out/language/main.cjs` | ✅ | ⬜ pending |
| IJF-03 | Switch constant(s) match the verdict; gate wraps the checks | source guard + unit | `Lsp4ijOverrideSiteSourceGuardTest`, `BbjLspFormattingSwitchTest`, grep vs `129-VERDICT.md` in plan verify | ✅ / ❌ W0 | ⬜ pending |
| IJF-03 | Vendor surface unchanged | unit | `Lsp4ijCouplingCanaryTest`, `Lsp4ijImportAllowlistTest` | ✅ | ⬜ pending |
| IJF-04 | 15 keys/defaults/bounds/enums agree with TS whitelist and package.json | contract (text) | `FormatterInitOptionsContractTest` | ❌ W0 | ⬜ pending |
| IJF-04 | Normalization fallbacks; all 15 keys explicit; no IntelliJ import in seam | unit + guard | `FormatterInitOptionsTest` | ❌ W0 | ⬜ pending |
| IJF-04 | Factory attaches `formatter` once before `setInitializationOptions` | source guard | `FormatterInitOptionsSourceGuardTest` / guard extension | ❌ W0 | ⬜ pending |
| IJF-04 (supported) | isModified/apply/reset cover all 15; stored before restart | source guard | `BbjSettingsFormatterSourceGuardTest` | ❌ W0 | ⬜ pending |
| IJF-04 (supported) | `bbj/openFormatterSettings` registered; payload never read | unit + contract | `BbjLanguageClientOpenFormatterSettingsTest` | ❌ W0 | ⬜ pending |
| Folded todo | `interopHost`/`interopPort` written by IntelliJ, read by server | contract (text) | `InteropInitOptionsContractTest` | ❌ W0 | ⬜ pending |
| All | No regression | full suite | full suite command | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `FormatterInitOptionsTest.java`, `FormatterInitOptionsContractTest.java`, `InteropInitOptionsContractTest.java`, source-guard extensions
- [ ] Driver spike result recorded (script / Robot / user per row)
- [ ] Evaluation corpus under `/home/coder/tinybbj` and a seed `BbjSettings.xml` recipe
- [ ] Supported-only: `BbjSettingsFormatterSourceGuardTest`, `BbjLanguageClientOpenFormatterSettingsTest`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Reformat Code / selection / Actions on Save / numbered-file message / settings / CRLF / edit application in a running IDE | IJF-02 | Runtime behaviour of LSP4IJ in a live IDE against BBjServices | Evaluation plan: runIde sandbox (Xvfb + driver) with LSP trace on; rows cite idea.log + LSP console trace |
| Windows subset (CRLF, Reformat Code, selection, Actions on Save) | IJF-02 | Needs the user's Windows IntelliJ | User runs the checklist with the same zip, returns idea.log + trace |
| Verdict | IJF-03 | User decision | checkpoint:decision, recorded in `129-VERDICT.md` |
| Settings page round trip (supported only) | IJF-04 | UI + server restart | Change a setting, Apply, reformat, observe changed output |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 240s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
