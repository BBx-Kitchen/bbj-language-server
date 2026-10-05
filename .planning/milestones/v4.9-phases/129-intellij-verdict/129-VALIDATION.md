---
phase: "129"
slug: "intellij-verdict"
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
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
| IJF-02 | Evaluation record has a row per hands-on case with log/trace excerpt, or a code-verified label naming a test | document check | `grep` per case id in `129-EVALUATION.md` | ✅ | ✅ green |
| IJF-02 | Zip under test carries the fresh server | build check | `unzip -p …/bbj-intellij/build/distributions/*.zip bbj-intellij/lib/language-server/main.cjs \| cmp - …/bbj-vscode/out/language/main.cjs` | ✅ | ✅ green |
| IJF-03 | Switch constant(s) match the verdict; gate wraps the checks | source guard + unit | `Lsp4ijOverrideSiteSourceGuardTest`, `BbjLspFormattingSwitchTest`, grep vs `129-VERDICT.md` in plan verify | ✅ | ✅ green |
| IJF-03 | Vendor surface unchanged | unit | `Lsp4ijCouplingCanaryTest`, `Lsp4ijImportAllowlistTest` | ✅ | ✅ green |
| IJF-04 | 15 keys/defaults/bounds/enums agree with TS whitelist and package.json | contract (text) | `FormatterInitOptionsContractTest` | ✅ | ✅ green |
| IJF-04 | Normalization fallbacks; all 15 keys explicit; no IntelliJ import in seam | unit + guard | `FormatterInitOptionsTest` | ✅ | ✅ green |
| IJF-04 | Factory attaches `formatter` once before `setInitializationOptions` | source guard | `FormatterInitOptionsSourceGuardTest` / guard extension | ✅ | ✅ green |
| IJF-04 (supported) | isModified/apply/reset cover all 15; stored before restart | source guard | `BbjSettingsFormatterSourceGuardTest` | ✅ | ✅ green |
| IJF-04 (supported) | `bbj/openFormatterSettings` registered; payload never read | unit + contract | `BbjLanguageClientOpenFormatterSettingsTest` | ✅ | ✅ green |
| Folded todo | `interopHost`/`interopPort` written by IntelliJ, read by server | contract (text) | `InteropInitOptionsContractTest` | ✅ | ✅ green |
| All | No regression | full suite | full suite command | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `FormatterInitOptionsTest.java`, `FormatterInitOptionsContractTest.java`, `InteropInitOptionsContractTest.java`, source-guard extensions
- [x] Driver spike result recorded (script / Robot / user per row)
- [x] Evaluation corpus under `/home/coder/tinybbj` and a seed `BbjSettings.xml` recipe
- [x] Supported-only: `BbjSettingsFormatterSourceGuardTest`, `BbjLanguageClientOpenFormatterSettingsTest`

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Reformat Code / selection / Actions on Save / numbered-file message / settings / CRLF / edit application in a running IDE | IJF-02 | Runtime behaviour of LSP4IJ in a live IDE against BBjServices | Evaluation plan: runIde sandbox (Xvfb + driver) with LSP trace on; rows cite idea.log + LSP console trace |
| Windows subset (CRLF, Reformat Code, selection, Actions on Save) | IJF-02 | Needs the user's Windows IntelliJ | User runs the checklist with the same zip, returns idea.log + trace |
| Verdict | IJF-03 | User decision | checkpoint:decision, recorded in `129-VERDICT.md` |
| Settings page round trip (supported only) | IJF-04 | UI + server restart | Change a setting, Apply, reformat, observe changed output. Passed in `129-UAT.md` tests 1-4 (2026-10-04) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 240s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-10-04

---

## Validation Audit 2026-10-04
| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All ten named test classes exist and pass in a forced run on the final tree (`./gradlew test --offline --rerun-tasks --no-build-cache`): 1306 tests, 0 failures, 0 errors. The rebuilt zip (sha256 `b962be39…`) carries a `main.cjs` byte-identical to `bbj-vscode/out/language/main.cjs`. `129-EVALUATION.md` has one row per case id (C1-C7c, W1-W4, E1-E5, V1-V6). Manual-only rows are covered by the evaluation record, `129-VERDICT.md` and `129-UAT.md`.
