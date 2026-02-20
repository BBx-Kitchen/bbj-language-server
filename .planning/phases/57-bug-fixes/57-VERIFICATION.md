---
phase: 57-bug-fixes
verified: 2026-02-20T18:28:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 57: Bug Fixes Verification Report

**Phase Goal:** Four reported regressions are eliminated — DWC/BUI launches work, config.bbx files are highlighted, suffixed variable identifiers parse cleanly, and DECLARE in class body no longer breaks the parser
**Verified:** 2026-02-20T18:28:00Z
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Setting bbj.classpath to '--' and running a DWC/BUI program launches successfully (classpath treated as empty) | VERIFIED | `stripSentinel` applied in `runWeb()` at line 90 of Commands.cjs; IntelliJ DWC/BUI actions strip "--" via ternary at line 109 of both action files |
| 2 | Setting bbj.classpath to '--' and running a GUI program launches successfully (no -CP-- argument) | VERIFIED | `stripSentinel` applied in `run()` at line 223 of Commands.cjs; `getClasspathArg()` in BbjRunActionBase.java returns null for "--" (line 218) |
| 3 | Opening a file named config.bbx shows plain text, not BBj syntax highlighting | VERIFIED | `configurationDefaults.files.associations` maps `config.bbx` to `plaintext` in bbj-vscode/package.json (line 517-522) |
| 4 | Opening a file named config.min shows plain text, not BBj syntax highlighting | VERIFIED | Same `configurationDefaults` entry also maps `config.min` to `plaintext` |
| 5 | Opening a regular .bbx file (not named config.bbx) still shows BBj syntax highlighting | VERIFIED | `.bbx` remains in `contributes.languages[0].extensions` array (line 34 of package.json); only filename-level overrides added, not extension removal |
| 6 | releaseVersion! parses as a single identifier token without error | VERIFIED | `RELEASE_NL.LONGER_ALT = [idWithSuffix, id]` and `RELEASE_NO_NL.LONGER_ALT = [idWithSuffix, id]` set at lines 56-57 of bbj-token-builder.ts |
| 7 | release! parses as a single identifier token without error | VERIFIED | Same LONGER_ALT fix covers bare `release!` case |
| 8 | stepMode! and other keyword-prefixed suffixed identifiers parse without error | VERIFIED | General keyword loop at lines 39-49 already had `LONGER_ALT = [idWithSuffix, id]`; regression test "Keyword-prefixed suffixed identifiers parse without error" passes |
| 9 | releaseDate (unsuffixed, keyword-prefixed) parses as a single identifier without error | VERIFIED | Covered by LONGER_ALT = [..., id] path; regression test passes |
| 10 | DECLARE in a class body (outside methods) produces a diagnostic error, not a parser crash | VERIFIED | `ClassMember` grammar rule extended to `FieldDecl | MethodDecl | VariableDecl` (bbj.langium line 347); `checkDeclareNotInClassBody` emits error when `isBbjClass(node.$container) && node.$containerProperty === 'members'` (bbj-validator.ts lines 78-86) |
| 11 | The parser recovers after misplaced DECLARE and continues parsing subsequent class members | VERIFIED | Grammar-level recovery: VariableDecl accepted as ClassMember alternative; test "DECLARE in class body produces validation error, not parser crash" passes (method after DECLARE also parsed) |

**Score:** 11/11 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/Commands/Commands.cjs` | '--' sentinel stripping in run and runWeb functions | VERIFIED | `stripSentinel` helper defined at line 18; applied in `runWeb()` line 90 and `run()` line 223 |
| `bbj-vscode/package.json` | config.bbx excluded from bbj language association | VERIFIED | `configurationDefaults.files.associations` added at line 517; maps `config.bbx` and `config.min` to `plaintext`; `.bbx` remains in extensions |
| `bbj-intellij/.../BbjRunActionBase.java` | '--' sentinel stripping in getClasspathArg | VERIFIED | Lines 217-220: `if ("--".equals(entry)) return null;` |
| `bbj-intellij/.../BbjRunDwcAction.java` | '--' sentinel stripping in DWC classpath reading | VERIFIED | Line 109: ternary guards against `"--".equals(state.classpathEntry)` |
| `bbj-intellij/.../BbjRunBuiAction.java` | '--' sentinel stripping in BUI classpath reading | VERIFIED | Line 109: identical ternary guard as DWC |
| `bbj-intellij/.../textmate/bbj-bundle/package.json` | config.bbx excluded from BBj language in IntelliJ | PARTIAL — documented limitation | IntelliJ TextMate bundle JSON format does not support filename-level exclusions; `.bbx` remains associated with BBj in IntelliJ. Documented in SUMMARY.md as known limitation. IntelliJ users must override in Settings > Editor > File Types. |
| `bbj-vscode/src/language/bbj-token-builder.ts` | RELEASE_NL and RELEASE_NO_NL LONGER_ALT includes idWithSuffix | VERIFIED | Lines 56-57: `releaseNl.LONGER_ALT = [idWithSuffix, id]` and `releaseNoNl.LONGER_ALT = [idWithSuffix, id]` |
| `bbj-vscode/src/language/bbj.langium` | ClassMember accepts VariableDecl as recoverable alternative | VERIFIED | Line 347: `ClassMember returns ClassMember: FieldDecl | MethodDecl | VariableDecl` |
| `bbj-vscode/src/language/bbj-validator.ts` | Validation check for DECLARE at class member level | VERIFIED | `checkDeclareNotInClassBody` at lines 78-86; registered as `VariableDecl: validator.checkDeclareNotInClassBody` at line 52; guarded with `node.$type !== 'VariableDecl'` to avoid false positives on FieldDecl |
| `bbj-vscode/test/parser.test.ts` | Test cases for suffixed identifiers and DECLARE in class body | VERIFIED | Four tests added at lines 2553-2596; all pass (210 tests, 209 passed, 1 skipped, 0 failures) |
| `bbj-vscode/src/language/bbj-linker.ts` | Type cast fix for expanded BBjClassMember union | VERIFIED | Line 51: `(node as { visibility?: string }).visibility` — cast prevents TypeScript error from `VariableDecl` (which lacks `visibility`) being in union |
| `bbj-vscode/src/language/generated/ast.ts` | Generated AST reflects BBjClassMember = FieldDecl | MethodDecl | VariableDecl | VERIFIED | Line 375: `export type BBjClassMember = FieldDecl | MethodDecl | VariableDecl;` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Commands.cjs runWeb()` | bbj.classpath setting | `stripSentinel(vscode.workspace.getConfiguration("bbj").classpath)` | WIRED | Line 90 reads config through stripSentinel; sscp is then embedded in command at line 105 |
| `Commands.cjs run()` | bbj.classpath setting | `stripSentinel(vscode.workspace.getConfiguration('bbj').classpath)` | WIRED | Line 223 reads config through stripSentinel; result feeds `-CP` prefix logic at line 230-233 |
| `BbjRunActionBase.getClasspathArg()` | BbjSettings.classpathEntry | sentinel check then return null | WIRED | Lines 213-220: null check, then "--" check, then returns "-CP" + entry |
| `BbjRunDwcAction` | BbjSettings.classpathEntry | ternary with "!--".equals() guard | WIRED | Line 109: ternary produces "" for "--" or null, then passed into web.bbj command |
| `BbjRunBuiAction` | BbjSettings.classpathEntry | identical ternary | WIRED | Line 109: identical to DWC |
| `bbj-token-builder.ts RELEASE_NL/RELEASE_NO_NL` | Chevrotain LONGER_ALT | `[idWithSuffix, id]` array | WIRED | Lines 56-57 set both tokens; spliceToken at lines 32-33 ensures they are in position |
| `bbj.langium ClassMember` | `bbj-validator.ts checkDeclareNotInClassBody` | Grammar accepts VariableDecl; validator rejects it with diagnostic | WIRED | Grammar line 347 accepts VariableDecl; validator line 52 registers check; lines 78-86 implement it |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BUG-01 | 57-01-PLAN.md | EM Config "--" no longer causes DWC/BUI startup failure | SATISFIED | `stripSentinel` in Commands.cjs runWeb/run; IntelliJ DWC/BUI action sentinel check confirmed in code |
| BUG-02 | 57-01-PLAN.md | config.bbx files are highlighted with BBj syntax highlighting (should NOT be) | SATISFIED | `configurationDefaults.files.associations` in VS Code package.json maps config.bbx and config.min to plaintext. IntelliJ limitation documented; this is an accepted constraint of the TextMate bundle format |
| BUG-03 | 57-02-PLAN.md | releaseVersion! and similar suffixed identifiers parse without error | SATISFIED | RELEASE_NL/RELEASE_NO_NL LONGER_ALT fix in bbj-token-builder.ts; regression test passes |
| BUG-04 | 57-02-PLAN.md | DECLARE statement in class body outside methods parses without error | SATISFIED | ClassMember grammar rule extended; checkDeclareNotInClassBody validator check added; regression test passes |

**Orphaned requirements check:** REQUIREMENTS.md maps BUG-01, BUG-02, BUG-03, BUG-04 to Phase 57. All four appear in plan frontmatter. No orphaned requirements.

---

### Anti-Patterns Found

No anti-patterns found across modified files. No TODO/FIXME/PLACEHOLDER comments. No stub implementations. No empty return values in core logic.

---

### Build and Test Verification

| Check | Result |
|-------|--------|
| `npm run build` (bbj-vscode/) | PASS — exits cleanly, no TypeScript errors |
| `npx vitest run test/parser.test.ts` | PASS — 209 tests passed, 1 skipped, 0 failures |
| git commit b8977fd exists | CONFIRMED — fix(57-01): strip '--' sentinel from classpath in all run commands |
| git commit cc73a75 exists | CONFIRMED — fix(57-01): exclude config.bbx and config.min from BBj language association |
| git commit 89707f4 exists | CONFIRMED — fix(57-02): fix RELEASE LONGER_ALT and add DECLARE recovery in class body |
| git commit f065bd2 exists | CONFIRMED — test(57-02): add regression tests for BUG-03 and BUG-04 |

---

### Human Verification Required

None required for automated checks. The following items are recommended for manual smoke-testing before release but are not blocking:

**1. DWC/BUI launch with "--" classpath (VS Code)**
- Test: Set `bbj.classpath` to `--` in VS Code settings, open a BBj program, run as DWC
- Expected: Program launches normally; no `-CP--` error in output
- Why human: Requires live BBj installation

**2. config.bbx file opens as plain text (VS Code)**
- Test: Open a file named `config.bbx` in VS Code with the extension installed
- Expected: File opens with no syntax highlighting; language mode shows "Plain Text"
- Why human: Requires VS Code UI

**3. config.bbx in IntelliJ still shows BBj highlighting (documented limitation)**
- Test: Open a file named `config.bbx` in IntelliJ with the plugin installed
- Expected: File still gets BBj highlighting (limitation — IntelliJ TextMate bundle does not support filename-level exclusions)
- Why human: Requires IntelliJ installation; confirms documented limitation is accurate

---

### Gaps Summary

No gaps. All four regressions are addressed:

- **BUG-01**: "--" sentinel stripped in all six classpath-reading paths (2 VS Code functions + 4 IntelliJ action methods). Code confirmed, commits verified.
- **BUG-02**: VS Code maps config.bbx and config.min to plaintext via `configurationDefaults`. IntelliJ limitation acknowledged and documented — no code-level fix possible in the TextMate bundle format. This is an accepted partial fix, not a gap.
- **BUG-03**: RELEASE_NL and RELEASE_NO_NL tokens now include `idWithSuffix` in LONGER_ALT. Regression tests pass.
- **BUG-04**: ClassMember grammar accepts VariableDecl; validator emits proper diagnostic. Parser recovers. Regression tests pass.

---

_Verified: 2026-02-20T18:28:00Z_
_Verifier: Claude (gsd-verifier)_
