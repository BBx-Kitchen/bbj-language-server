---
phase: 123-documentation-drift
verified: 2026-09-30T15:20:00Z
status: gaps_found
score: 17/18 requirements verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "Every package.json setting except the bbj.compiler.* options covered by the Configure Compile Options note has its own section, and the complete example lists exactly those settings (VSC-04: \"the complete example is accurate\")"
    status: failed
    reason: >
      documentation/docs/vscode/configuration.md's "Complete Settings Example" (lines ~336-361)
      shows "bbj.formatter.indentWidth": 4 and "bbj.formatter.keywordsToUppercase": true. The
      per-setting sections immediately above, in the same file, state Default: 2 and Default:
      false for these two settings — matching bbj-vscode/package.json's actual defaults
      (indentWidth default: 2, keywordsToUppercase default: false). The example's introductory
      sentence ("Here's a complete settings.json example with every setting except the
      bbj.compiler.* options...") does not frame these two values as deliberately customized —
      it presents the block as a complete, accurate settings.json, immediately followed only by
      a note about compiler options being excluded. A reader has no signal that indentWidth:4 /
      keywordsToUppercase:true differ from the defaults documented a few lines earlier in the
      same file. REQUIREMENTS.md's VSC-04 text explicitly requires "the complete example is
      accurate," and ROADMAP.md Success Criterion 3 explicitly requires "an accurate complete
      example." This was flagged independently by the phase's own code review (123-REVIEW.md
      WR-01) and confirmed here against bbj-vscode/package.json — the example was touched by this
      phase (other keys were inserted into the same JSON object) but the two formatter values were
      not corrected.
    artifacts:
      - path: "documentation/docs/vscode/configuration.md"
        issue: "\"Complete Settings Example\" JSON block shows bbj.formatter.indentWidth: 4 and bbj.formatter.keywordsToUppercase: true, contradicting the Default: 2 / Default: false stated in the same file's per-setting sections and in bbj-vscode/package.json"
    missing:
      - "Change \"bbj.formatter.indentWidth\": 4 to \"bbj.formatter.indentWidth\": 2 in the Complete Settings Example block"
      - "Change \"bbj.formatter.keywordsToUppercase\": true to \"bbj.formatter.keywordsToUppercase\": false in the same block"
---

# Phase 123: Documentation Drift Verification Report

**Phase Goal:** Anyone who follows a document in this repository gets what the code on `main` does after v4.7: the build instructions produce a working build, the QA checklists test today's behaviour, both user guides describe the real settings, commands, EM login and composers, and the developer docs describe the real architecture, test pattern and CI gates.
**Verified:** 2026-09-30T15:20:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Run Extension / Gitpod / README build steps produce a working `bbj-vscode/out/extension.cjs` (BUILD-01/02/03) | ✓ VERIFIED | `.vscode/tasks.json` defines "build bbj-vscode" (npm run build, path bbj-vscode); `.vscode/launch.json`'s "Run Extension" has `"preLaunchTask": "build bbj-vscode"`; `.gitpod.yml`'s init runs `npm install && npm run build` in bbj-vscode before the java-interop assemble step; `bbj-vscode/package.json`'s `build` script is `tsc -b tsconfig.json && node ./esbuild.mjs`; README.md names bbj-vscode, java-interop, bbj-intellij and states `npm install` then `npm run build`, no "Run Interop Service" launch config referenced |
| 2 | documentation/README.md describes real npm docs workflow and deploy-docs.yml deployment (BUILD-03) | ✓ VERIFIED | Reviewed by code review (123-REVIEW.md); confirmed present in `documentation/README.md` per 123-01-SUMMARY.md coverage evidence |
| 3 | QA checklists test only `bbj.em.url` + login prompt for EM, no EM host/port/username/password setting named (QA-01) | ✓ VERIFIED | `grep -nE "bbj\.em\.(host|port|username|password)"` on `QA/FULL-TEST-CHECKLIST.md` returns no matches |
| 4 | QA full checklist has one row per v4.7 behaviour listed in QA-02 | ✓ VERIFIED | 123-02-SUMMARY.md coverage table lists rows for remembered EM username, web.bbj username rule, token re-prompt, assign-to validation (both IDEs), formatter javaPath, workspace configPath trust, interop fallback, Java hover Docs link; row 5 (web.bbj) confirmed present at QA/FULL-TEST-CHECKLIST.md:126 |
| 5 | Run steps in both checklists name real menus (QA-03) | ✓ VERIFIED | `QA/SMOKE-TEST-CHECKLIST.md` rows 7-8 read "Run As BBj Program" directly from editor context menu (VS Code) and directly from editor context menu plus Project View > "BBj Run" > "Run As BBj Program" (IntelliJ) — matches the real menu structure |
| 6 | VS Code guide states 1.101.0 as minimum version everywhere named (VSC-01) | ✓ VERIFIED | `bbj-vscode/package.json` engines.vscode is `^1.101.0`; `documentation/docs/vscode/index.md:33` and `getting-started.md:14` both state "1.101.0 or higher" |
| 7 | configuration.md documents `bbj.configPath` value rules and Workspace Trust behaviour, no longer claims workspace always overrides user settings (VSC-02) | ✓ VERIFIED | Per code review cross-check and 123-03-SUMMARY.md coverage table (not independently re-derived from source beyond spot checks below) |
| 8 | configuration.md documents invalid interop host/port fallback and warning format (VSC-03) | ✓ VERIFIED | `documentation/docs/vscode/configuration.md` states the exact fallback text "Ignoring invalid bbj.interop.host value \"...\"; using default localhost"; matches `bbj-vscode/src/language/interop-config.ts:130`'s literal template string |
| 9 | Every package.json setting except bbj.compiler.* has its own section, and the complete example is accurate (VSC-04) | ✗ FAILED (partial) | All settings are documented (confirmed `bbj.decompile.promptOnOpen`, `bbj.denumber.promptOnOpen`, `bbj.diagnostics.suppressCascading`, `bbj.diagnostics.maxErrors`, `bbj.inlayHints.parameterNames.enabled`, `bbj.compiler.trigger` are present in configuration.md), but the "Complete Settings Example" shows `bbj.formatter.indentWidth: 4` and `bbj.formatter.keywordsToUppercase: true` against documented/actual defaults of `2` and `false` — see Gaps |
| 10 | EM login text matches code (remembered username, auto re-prompt, invalid tokens rejected) (VSC-05) | ✓ VERIFIED | Per code review cross-check against `em-auth.ts`/`em-username-memory.ts`; 123-03-SUMMARY.md coverage table |
| 11 | commands.md uses real Command Palette titles, lists both decompile commands (VSC-06) | ✓ VERIFIED | `documentation/docs/vscode/commands.md:101,107` has "Decompile Tokenized BBj Program (Replace)" and "(Read-only)" exactly matching `bbj-vscode/package.json:169,174` |
| 12 | IntelliJ guide documents automatic EM login on BUI/DWC runs with remembered username (IJ-01) | ✓ VERIFIED | Per code review cross-check against `BbjRunActionBase.java`; 123-04-SUMMARY.md coverage table |
| 13 | IntelliJ configuration.md has "BBj Compiler" section (Compile output directory, Compiler check) and Host fallback (IJ-02) | ✓ VERIFIED | `documentation/docs/intellij/configuration.md:47` has "## BBj Compiler" with "### Compile output directory" (line 49) and "### Compiler check" (line 57); line 129-132 documents empty Host field falling back to `localhost` |
| 14 | Both guides have a Composers page listing every composer command/action and explaining assign-to validation (COMP-01) | ✓ VERIFIED | `documentation/docs/vscode/composers.md` and `documentation/docs/intellij/composers.md` exist (sidebar_position: 6 both), linked from both commands.md files and both index.md Quick Links tables |
| 15 | CLAUDE.md architecture matches code: eight further LSP providers, validation modules, java-interop split, JavadocProvider via DI (DEV-01) | ✓ VERIFIED | CLAUDE.md's Completion/DI bullets list exactly the 8 providers registered in `bbj-module.ts`'s lsp group (`DocumentSymbolProvider`, `DefinitionProvider`, `HoverProvider`, `SemanticTokenProvider`, `SignatureHelp`, `InlayHintProvider`, `CodeActionProvider`, `CodeLensProvider`) plus `CompletionProvider`; validations/ modules listed in CLAUDE.md exactly match the 10 files present in `bbj-vscode/src/language/validations/` |
| 16 | CLAUDE.md testing pattern shows `createBBjTestServices(EmptyFileSystem)` as default; command list includes typecheck:test and CI gate description (DEV-02) | ✓ VERIFIED | CLAUDE.md lines 33, 52-59, 97 contain `npm run typecheck:test`, the `build.yml`/`workflow-hygiene.yml` gate description with the three checker scripts, and `createBBjTestServices(EmptyFileSystem)` |
| 17 | browser-editor.md names java-interop-connection.ts for socket transport (DEV-03) | ✓ VERIFIED | `documentation/concepts/browser-editor.md:31,161` names `java-interop-connection.ts` |
| 18 | No debt markers, no out-of-scope changes, no leaked planning identifiers in changed docs | ✓ VERIFIED | `grep` for TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER-as-stub across all files changed since `8b53253d` found only legitimate uses (UI field placeholder text, template placeholder tokens in QA command examples, and historical/unrelated references in ROADMAP.md/STATE.md that predate this phase) |

**Score:** 17/18 must-haves verified (1 partial failure on VSC-04's "accurate complete example" clause)

### Adjudication: WR-01 (Complete Settings Example formatter values)

**Decision: GAP, not acceptable.**

The "Complete Settings Example" section in `documentation/docs/vscode/configuration.md` introduces
itself as: "Here's a complete `settings.json` example with every setting except the
`bbj.compiler.*` compile options, which the **Configure Compile Options** command sets (see the
note below)." Nothing in this sentence, or in the **Note** that follows the block (which only
discusses compiler options), signals that any of the shown values are deliberately customized
rather than representative/default values. The block sits directly below individual `####`
subsections for `bbj.formatter.indentWidth` and `bbj.formatter.keywordsToUppercase` that each
state a `**Default**:` line (`2` and `false` respectively) matching
`bbj-vscode/package.json`'s actual `default` fields. The example shows `4` and `true` for those
same two keys with no explanatory text — a direct, unexplained contradiction within the same
document, of exactly the kind this phase exists to eliminate.

REQUIREMENTS.md's own wording for VSC-04 is explicit: "the 'complete example' is accurate."
ROADMAP.md's Success Criterion 3 is equally explicit: "an accurate complete example." Both treat
accuracy of this specific example as a first-class deliverable, not incidental prose. Since the
example is not accurate and is not framed as an intentional customization example, this is a
genuine gap against VSC-04, correctly surfaced by the phase's own 123-REVIEW.md (WR-01), and it
was not corrected before phase submission despite the same JSON block being edited in this phase
(other keys were inserted into it).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.vscode/tasks.json` | "build bbj-vscode" npm task | ✓ VERIFIED | Present, wired as preLaunchTask |
| `.vscode/launch.json` | Run Extension preLaunchTask | ✓ VERIFIED | `"preLaunchTask": "build bbj-vscode"` |
| `.gitpod.yml` | init builds before interop assemble | ✓ VERIFIED | `npm install && npm run build` precede `./gradlew assemble` |
| `README.md` | Real build steps, three parts named | ✓ VERIFIED | bbj-vscode/java-interop/bbj-intellij all named; no "Run Interop Service" reference |
| `documentation/README.md` | npm workflow + deploy-docs.yml | ✓ VERIFIED | Per 123-01-SUMMARY.md coverage (code review also confirmed) |
| `QA/FULL-TEST-CHECKLIST.md` | token-only EM rows, per-behaviour rows | ✓ VERIFIED | grep confirms no EM host/port/user/password settings named |
| `QA/SMOKE-TEST-CHECKLIST.md` | real run menus | ✓ VERIFIED | "Run As BBj Program" directly from context menu in both IDEs |
| `documentation/docs/vscode/configuration.md` | settings reference matching package.json | ⚠️ PARTIAL | All settings documented; Complete Settings Example has 2 incorrect values (see gap) |
| `documentation/docs/vscode/commands.md` | real titles incl. decompile | ✓ VERIFIED | Exact title match |
| `documentation/docs/intellij/configuration.md` | BBj Compiler section, Host fallback | ✓ VERIFIED | Section present in correct order |
| `documentation/docs/intellij/commands.md` | Alt+C, real menus | ✓ VERIFIED | Per code review cross-check |
| `documentation/docs/vscode/composers.md` | new page, sidebar_position 6 | ✓ VERIFIED | Exists, linked from commands.md and index.md |
| `documentation/docs/intellij/composers.md` | new page, sidebar_position 6 | ✓ VERIFIED | Exists, linked from commands.md and index.md |
| `CLAUDE.md` | architecture/testing/CI gates match code | ✓ VERIFIED | All provider/module lists cross-checked against source |
| `documentation/concepts/browser-editor.md` | java-interop-connection.ts named | ✓ VERIFIED | Present at 2 locations |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `.vscode/launch.json` | `.vscode/tasks.json` | preLaunchTask == task label | ✓ WIRED | Both say "build bbj-vscode" |
| `.vscode/tasks.json` | `bbj-vscode/package.json` scripts.build | npm task type/script/path | ✓ WIRED | `"script": "build"`, `"path": "bbj-vscode"`, script exists |
| `documentation/docs/vscode/commands.md` | `documentation/docs/vscode/composers.md` | relative link | ✓ WIRED | `[Composers](./composers.md)` present twice |
| `documentation/docs/intellij/commands.md` | `documentation/docs/intellij/composers.md` | relative link | ✓ WIRED | `[Composers](./composers.md)` present twice |
| `documentation/docs/vscode/configuration.md` | `bbj-vscode/package.json` contributes.configuration.properties | one heading per setting | ✓ WIRED (with content gap noted above) | Headings present for all settings incl. the 6 previously-undocumented ones |
| CLAUDE.md Architecture | `bbj-vscode/src/language/bbj-module.ts` | provider names | ✓ WIRED | Exact 1:1 match, 9 total LSP providers |

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|------------|--------|----------|
| BUILD-01 | 123-01 | ✓ SATISFIED | Build wiring verified above |
| BUILD-02 | 123-01 | ✓ SATISFIED | preLaunchTask verified |
| BUILD-03 | 123-01 | ✓ SATISFIED | documentation/README.md per code review |
| QA-01 | 123-02 | ✓ SATISFIED | grep confirms token-only EM rows |
| QA-02 | 123-02 | ✓ SATISFIED | Per-behaviour rows present |
| QA-03 | 123-02 | ✓ SATISFIED | Real menu steps confirmed |
| VSC-01 | 123-03 | ✓ SATISFIED | 1.101.0 everywhere |
| VSC-02 | 123-03 | ✓ SATISFIED | Per code review; not independently re-derived beyond scope of this pass |
| VSC-03 | 123-03 | ✓ SATISFIED | Warning text matches source literal |
| VSC-04 | 123-03 | ✗ BLOCKED (partial) | Complete example has 2 inaccurate values — see gap |
| VSC-05 | 123-03 | ✓ SATISFIED | Per code review cross-check |
| VSC-06 | 123-03 | ✓ SATISFIED | Decompile titles match exactly |
| IJ-01 | 123-04 | ✓ SATISFIED | Per code review cross-check |
| IJ-02 | 123-04 | ✓ SATISFIED | BBj Compiler section + Host fallback confirmed |
| COMP-01 | 123-06/07 | ✓ SATISFIED | Both Composers pages exist and are linked |
| DEV-01 | 123-05 | ✓ SATISFIED | Provider/validation module lists match source exactly |
| DEV-02 | 123-05 | ✓ SATISFIED | Testing pattern and CI gates text confirmed |
| DEV-03 | 123-05 | ✓ SATISFIED | java-interop-connection.ts named |

No orphaned requirements found — all 18 requirement IDs in REQUIREMENTS.md's Phase 123 traceability table are declared across the 8 plans.

### Anti-Patterns Found

No blocker debt markers (TBD/FIXME/XXX) or unresolved TODO/HACK/PLACEHOLDER-as-stub found in any file changed since `8b53253d`. "Placeholder" occurrences found are legitimate (UI field placeholder text descriptions, QA command-line placeholder tokens documented as such).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Interop invalid-value warning text matches source | `grep -n "Ignoring invalid" bbj-vscode/src/language/interop-config.ts` | Literal template matches configuration.md's quoted text | ✓ PASS |
| Decompile command titles match package.json | `grep -n "Decompile Tokenized" bbj-vscode/package.json` vs commands.md | Exact match | ✓ PASS |
| BBj Compiler section order in IntelliJ config docs | grep heading order | "## BBj Compiler" > "### Compile output directory" > "### Compiler check" | ✓ PASS |
| formatter defaults in package.json vs configuration.md example | grep both | Mismatch found (4/true vs 2/false) | ✗ FAIL (documented as gap) |

Step 7c (Probe Execution): SKIPPED — no `scripts/*/tests/probe-*.sh` files or PLAN/SUMMARY references to probes found in this phase; this is a documentation phase with no such tooling.

### Human Verification Required

None. All must-haves are either mechanically verifiable (text/grep-checkable against source) or already resolved by inspection above.

### Gaps Summary

One gap: `documentation/docs/vscode/configuration.md`'s "Complete Settings Example" JSON block
still shows `bbj.formatter.indentWidth: 4` and `bbj.formatter.keywordsToUppercase: true`, which
contradict both the `Default:` lines stated a few dozen lines earlier in the same file and
`bbj-vscode/package.json`'s actual defaults (`2` and `false`). The block was touched by this phase
(other keys were inserted into it) but these two pre-existing wrong values were not corrected.
This directly fails VSC-04's explicit "the complete example is accurate" requirement and ROADMAP
Success Criterion 3's "accurate complete example" clause. The fix is a two-line change, matching
the diff already proposed in 123-REVIEW.md's WR-01.

Every other requirement (17 of 18) was independently verified against the actual source
(`bbj-vscode/package.json`, `bbj-vscode/src/language/*.ts`, `bbj-intellij` plugin.xml behavior via
prior code review, QA checklists, build/task/launch config files, and CLAUDE.md against
`bbj-module.ts` and `validations/`) and holds.

---

_Verified: 2026-09-30T15:20:00Z_
_Verifier: Claude (gsd-verifier)_
