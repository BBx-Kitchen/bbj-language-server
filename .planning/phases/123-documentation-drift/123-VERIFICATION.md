---
phase: 123-documentation-drift
verified: 2026-09-30T15:45:00Z
status: passed
score: 18/18 requirements verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 17/18
  gaps_closed:
    - "VSC-04: \"the complete example is accurate\" — the Complete Settings Example block in documentation/docs/vscode/configuration.md previously showed bbj.formatter.indentWidth: 4 and bbj.formatter.keywordsToUppercase: true, contradicting bbj-vscode/package.json's actual defaults (2, false) and the per-setting Default: lines in the same document. Commit c46a5d9f changed both values to match package.json (2, false), and also corrected a third, previously-unflagged mismatch on bbj.web.AutoSaveUponRun (was true in the example, package.json default is false; now false)."
  gaps_remaining: []
  regressions: []
---

# Phase 123: Documentation Drift Verification Report

**Phase Goal:** Anyone who follows a document in this repository gets what the code on `main` does after v4.7: the build instructions produce a working build, the QA checklists test today's behaviour, both user guides describe the real settings, commands, EM login and composers, and the developer docs describe the real architecture, test pattern and CI gates.
**Verified:** 2026-09-30T15:45:00Z
**Status:** passed
**Re-verification:** Yes — after gap closure (previous verification 2026-09-30T15:20:00Z found 1 gap: VSC-04)

## Re-Verification Summary

The previous verification pass (`status: gaps_found`, 17/18) found one genuine gap: VSC-04's
explicit "the complete example is accurate" clause was violated by two stale values in
`documentation/docs/vscode/configuration.md`'s "Complete Settings Example" JSON block
(`bbj.formatter.indentWidth: 4`, `bbj.formatter.keywordsToUppercase: true`), which contradicted
both the per-setting `Default:` lines a few dozen lines above in the same file and
`bbj-vscode/package.json`'s actual shipped defaults (`2`, `false`).

Commit `c46a5d9f` ("docs(vscode): complete settings example uses the shipped defaults") changed
three key-value pairs in that block:

```diff
-  "bbj.web.AutoSaveUponRun": true,
+  "bbj.web.AutoSaveUponRun": false,
...
-  "bbj.formatter.indentWidth": 4,
+  "bbj.formatter.indentWidth": 2,
...
-  "bbj.formatter.keywordsToUppercase": true,
+  "bbj.formatter.keywordsToUppercase": false,
```

The `bbj.web.AutoSaveUponRun` correction was not called out by the original gap or WR-01, but is
a genuine additional fix in the same direction (package.json's default is `false`; the example
previously showed `true`) — no regression, a strict improvement.

**Verification of the fix:** Every key/value pair in the Complete Settings Example block was
programmatically compared, in both directions, against `bbj-vscode/package.json`'s
`contributes.configuration.properties` defaults:

- 21 non-`bbj.compiler.*` settings are expected (20 non-compiler settings plus `bbj.compiler.trigger`,
  which the docs and the phase's own scoping notes treat as documented outside the "Configure
  Compile Options" exclusion). The example block contains exactly 21 keys — no key missing, no
  extra key.
- Every key with a real `default` in package.json now has that exact default value in the example
  (verified with a JSON-level `JSON.stringify` equality check — zero mismatches).
- The three keys with no `default` in package.json (`bbj.home`, `bbj.em.url`, `bbj.configPath`)
  carry placeholder/representative values (`"/opt/bbj"`, `"http://localhost:8888"`, `null`), which
  is legitimate — there is no "shipped default" for these to match, and `bbj.configPath: null`
  (unset) is itself a sensible representative value.

This closes the gap: the Complete Settings Example is now accurate against `package.json` with no
unexplained deviation.

**Scope check:** `git diff --name-only 8b53253d` (repo root) shows only
`documentation/docs/vscode/configuration.md` was touched for the actual fix, plus `.planning/`
bookkeeping files (`STATE.md`, `REQUIREMENTS.md`, `ROADMAP.md`, the phase's own `-REVIEW.md` and
`-VERIFICATION.md`) and the phase's `-PLAN.md`/`-SUMMARY.md` files — no file outside the
phase's already-established scope changed. The fix commit `c46a5d9f` itself touches only
`documentation/docs/vscode/configuration.md` (3 insertions, 3 deletions). No new debt markers
(`TBD`/`FIXME`/`XXX`/`TODO`/`HACK`) and no planning identifiers (plan numbers, `D-xx`, `CR-xx`,
`WR-xx`, phase numbers) were introduced by the fix commit.

**Regression spot-check (17 previously-passed items):** Re-checked a representative sample by
re-running the original grep/diff evidence commands — all still hold:

- `.vscode/launch.json`'s `preLaunchTask` still reads `"build bbj-vscode"`, matching
  `.vscode/tasks.json`'s task label.
- `QA/FULL-TEST-CHECKLIST.md` and `QA/SMOKE-TEST-CHECKLIST.md` still contain no
  `bbj.em.(host|port|username|password)` string.
- `documentation/docs/vscode/index.md` and `getting-started.md` still state "1.101.0 or higher".
- The interop invalid-value warning text in `configuration.md` still matches the literal template
  in `bbj-vscode/src/language/interop-config.ts:130`.
- `documentation/docs/vscode/commands.md`'s decompile command titles still match
  `bbj-vscode/package.json` exactly.
- `documentation/docs/intellij/configuration.md` still has `## BBj Compiler` >
  `### Compile output directory` > `### Compiler check` in order.
- Both `documentation/docs/vscode/composers.md` and `documentation/docs/intellij/composers.md`
  still exist.
- No new debt markers found in any of the 19 previously-reviewed changed files.

No regressions found.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Run Extension / Gitpod / README build steps produce a working `bbj-vscode/out/extension.cjs` (BUILD-01/02/03) | ✓ VERIFIED | Unchanged since prior pass; re-confirmed `.vscode/tasks.json`/`launch.json` wiring |
| 2 | documentation/README.md describes real npm docs workflow and deploy-docs.yml deployment (BUILD-03) | ✓ VERIFIED | Unchanged since prior pass |
| 3 | QA checklists test only `bbj.em.url` + login prompt for EM, no EM host/port/username/password setting named (QA-01) | ✓ VERIFIED | Re-ran grep, no matches |
| 4 | QA full checklist has one row per v4.7 behaviour listed in QA-02 | ✓ VERIFIED | Unchanged since prior pass |
| 5 | Run steps in both checklists name real menus (QA-03) | ✓ VERIFIED | Unchanged since prior pass |
| 6 | VS Code guide states 1.101.0 as minimum version everywhere named (VSC-01) | ✓ VERIFIED | Re-ran grep, both files confirmed |
| 7 | configuration.md documents `bbj.configPath` value rules and Workspace Trust behaviour, no longer claims workspace always overrides user settings (VSC-02) | ✓ VERIFIED | Unchanged since prior pass |
| 8 | configuration.md documents invalid interop host/port fallback and warning format (VSC-03) | ✓ VERIFIED | Re-confirmed literal text match against `interop-config.ts:130` |
| 9 | Every package.json setting except bbj.compiler.* has its own section, and the complete example is accurate (VSC-04) | ✓ VERIFIED | Fix commit `c46a5d9f` corrected `bbj.formatter.indentWidth` (4→2), `bbj.formatter.keywordsToUppercase` (true→false), and `bbj.web.AutoSaveUponRun` (true→false). Programmatic two-way diff of the 21-key example block against `bbj-vscode/package.json` defaults: zero mismatches, zero missing/extra keys. The 3 keys with no package.json default (`bbj.home`, `bbj.em.url`, `bbj.configPath`) carry legitimate placeholder/representative values |
| 10 | EM login text matches code (remembered username, auto re-prompt, invalid tokens rejected) (VSC-05) | ✓ VERIFIED | Unchanged since prior pass |
| 11 | commands.md uses real Command Palette titles, lists both decompile commands (VSC-06) | ✓ VERIFIED | Re-ran grep, exact match confirmed |
| 12 | IntelliJ guide documents automatic EM login on BUI/DWC runs with remembered username (IJ-01) | ✓ VERIFIED | Unchanged since prior pass |
| 13 | IntelliJ configuration.md has "BBj Compiler" section (Compile output directory, Compiler check) and Host fallback (IJ-02) | ✓ VERIFIED | Re-ran grep, heading order confirmed |
| 14 | Both guides have a Composers page listing every composer command/action and explaining assign-to validation (COMP-01) | ✓ VERIFIED | Both files re-confirmed present |
| 15 | CLAUDE.md architecture matches code: eight further LSP providers, validation modules, java-interop split, JavadocProvider via DI (DEV-01) | ✓ VERIFIED | Unchanged since prior pass |
| 16 | CLAUDE.md testing pattern shows `createBBjTestServices(EmptyFileSystem)` as default; command list includes typecheck:test and CI gate description (DEV-02) | ✓ VERIFIED | Unchanged since prior pass |
| 17 | browser-editor.md names java-interop-connection.ts for socket transport (DEV-03) | ✓ VERIFIED | Unchanged since prior pass |
| 18 | No debt markers, no out-of-scope changes, no leaked planning identifiers in changed docs | ✓ VERIFIED | Re-ran debt-marker grep over all 19 previously-reviewed files plus the fix commit's diff — clean. `git diff --name-only 8b53253d` shows no file outside the phase's established scope |

**Score:** 18/18 must-haves verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `documentation/docs/vscode/configuration.md` | settings reference matching package.json, incl. accurate complete example | ✓ VERIFIED | All settings documented; Complete Settings Example now matches package.json defaults exactly (3 values corrected by `c46a5d9f`) |
| All other artifacts from the initial pass | — | ✓ VERIFIED (unchanged) | Not re-derived in full; spot-checked in Regression Summary above |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `documentation/docs/vscode/configuration.md` Complete Settings Example | `bbj-vscode/package.json` contributes.configuration.properties | key-by-key default equality | ✓ WIRED | Two-way diff: 21/21 keys present, 0 value mismatches (excluding 3 no-default placeholder keys) |
| All other key links from the initial pass | — | ✓ WIRED (unchanged) | Spot-checked above |

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|------------|--------|----------|
| BUILD-01 | 123-01 | ✓ SATISFIED | Unchanged |
| BUILD-02 | 123-01 | ✓ SATISFIED | Unchanged |
| BUILD-03 | 123-01 | ✓ SATISFIED | Unchanged |
| QA-01 | 123-02 | ✓ SATISFIED | Re-confirmed |
| QA-02 | 123-02 | ✓ SATISFIED | Unchanged |
| QA-03 | 123-02 | ✓ SATISFIED | Unchanged |
| VSC-01 | 123-03 | ✓ SATISFIED | Re-confirmed |
| VSC-02 | 123-03 | ✓ SATISFIED | Unchanged |
| VSC-03 | 123-03 | ✓ SATISFIED | Re-confirmed |
| VSC-04 | 123-03 | ✓ SATISFIED | Gap closed by `c46a5d9f`; two-way key/value diff against package.json is clean |
| VSC-05 | 123-03 | ✓ SATISFIED | Unchanged |
| VSC-06 | 123-03 | ✓ SATISFIED | Re-confirmed |
| IJ-01 | 123-04 | ✓ SATISFIED | Unchanged |
| IJ-02 | 123-04 | ✓ SATISFIED | Re-confirmed |
| COMP-01 | 123-06/07 | ✓ SATISFIED | Re-confirmed |
| DEV-01 | 123-05 | ✓ SATISFIED | Unchanged |
| DEV-02 | 123-05 | ✓ SATISFIED | Unchanged |
| DEV-03 | 123-05 | ✓ SATISFIED | Unchanged |

All 18 requirement IDs in REQUIREMENTS.md's Phase 123 traceability table are satisfied. No orphaned requirements.

### Anti-Patterns Found

None. The fix commit (`c46a5d9f`) is a pure 3-line value substitution with no new debt markers,
placeholders, or planning identifiers. Re-scan of all 19 previously-reviewed changed files found
nothing new.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Complete Settings Example matches package.json defaults, both directions | Node script: parse example JSON block + `package.json` properties, diff keys and values | 21/21 keys present, 0 missing/extra, 0 value mismatches (3 legitimate no-default placeholders) | ✓ PASS |
| Interop invalid-value warning text matches source | grep `interop-config.ts:130` vs configuration.md | Exact match | ✓ PASS |
| Decompile command titles match package.json | grep both files | Exact match | ✓ PASS |
| `.vscode/launch.json` preLaunchTask wiring | grep both files | `"build bbj-vscode"` matches | ✓ PASS |
| Scope of fix commit | `git show c46a5d9f --stat` | 1 file, 3+/3- | ✓ PASS |

Step 7c (Probe Execution): SKIPPED — no `scripts/*/tests/probe-*.sh` files or PLAN/SUMMARY references to probes found in this phase; documentation phase with no such tooling.

### Human Verification Required

None. All must-haves are mechanically verifiable (text/grep/JSON-diff-checkable against source) and were resolved by inspection above.

### Gaps Summary

None remaining. The single gap from the initial verification pass (VSC-04's "accurate complete
example" clause) is closed: `documentation/docs/vscode/configuration.md`'s Complete Settings
Example now matches `bbj-vscode/package.json`'s shipped defaults exactly, verified with a
programmatic two-way key/value diff. No regressions were introduced, and the fix stayed within
the phase's established file scope with no new debt markers or leaked planning identifiers.

---

_Verified: 2026-09-30T15:45:00Z_
_Verifier: Claude (gsd-verifier)_
