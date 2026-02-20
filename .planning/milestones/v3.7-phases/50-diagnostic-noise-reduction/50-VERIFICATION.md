---
phase: 50-diagnostic-noise-reduction
verified: 2026-02-19T13:10:00Z
status: human_needed
score: 2/3 success criteria verified (third requires runtime observation)
re_verification: false
human_verification:
  - test: "Edit a BBj file to introduce one syntax error, observe Problems panel"
    expected: "Only the parse error appears (1-3 diagnostics). No downstream linking errors flood the panel."
    why_human: "Requires a running VS Code instance with the extension loaded; cannot verify filtered LSP output programmatically."
  - test: "With a syntax error present, fix it (edit the file — no save/reload)"
    expected: "Warnings and hints reappear in the Problems panel without requiring a file save or manual reload."
    why_human: "Depends on Langium's incremental re-validation trigger on text change; cannot observe live LSP event loop from the CLI."
---

# Phase 50: Diagnostic Noise Reduction Verification Report

**Phase Goal:** Users see only meaningful errors — a single syntax error produces 1-3 diagnostics instead of 40+ cascading linking noise
**Verified:** 2026-02-19T13:10:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Success Criteria (from ROADMAP.md)

The roadmap defines three observable truths that must hold for the phase goal to be achieved.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A file with a single syntax error shows only that syntax error and no downstream linking or validation errors in the Problems panel | ? NEEDS HUMAN | `applyDiagnosticHierarchy` Rule 1 filters all `DocumentValidator.LinkingError` diagnostics when `hasParseErrors` is true. Code logic is correct; runtime behavior requires VS Code observation. |
| 2 | Warnings and hints are absent from the Problems panel when any hard error (parse or semantic) is present in the file | ? NEEDS HUMAN | Rule 2 filters all non-Error-severity diagnostics when `hasAnyError` is true. Code logic is correct; runtime behavior requires VS Code observation. |
| 3 | When the syntax error is fixed, warnings and hints reappear without requiring a file save or reload | ? NEEDS HUMAN | Depends on Langium's incremental re-validation triggering `validateDocument()` on text change. The hook is in place but the live event loop cannot be verified from CLI. |

**Score:** 0/3 automated (all require runtime). All automated sub-checks PASS — human confirmation is the only remaining gate.

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `bbj-vscode/src/language/bbj-document-validator.ts` | `validateDocument()` override, `applyDiagnosticHierarchy()`, `DiagnosticTier` enum, `setSuppressCascading()`, `setMaxErrors()` | Yes | Yes (209 lines, full implementation) | Yes (called via override, imported by ws-manager and main) | VERIFIED |

### Plan 02 Artifacts

| Artifact | Provides | Exists | Substantive | Wired | Status |
|----------|----------|--------|-------------|-------|--------|
| `bbj-vscode/package.json` | `bbj.diagnostics.suppressCascading` and `bbj.diagnostics.maxErrors` in `contributes.configuration` | Yes | Yes (both settings at lines 470-482) | Yes (read in extension.ts initializationOptions) | VERIFIED |
| `bbj-vscode/src/extension.ts` | `initializationOptions` entries + `suppressionStatusBar` status bar item | Yes | Yes (suppressCascading+maxErrors in initOptions lines 725-726; status bar lines 644-677) | Yes (passed to language server, event listeners registered) | VERIFIED |
| `bbj-vscode/src/language/bbj-ws-manager.ts` | Reads suppression settings from `initializationOptions` on server start | Yes | Yes (lines 70-85, full conditional block with logging) | Yes (imports `setSuppressCascading`, `setMaxErrors` from bbj-document-validator.js; calls both) | VERIFIED |
| `bbj-vscode/src/language/main.ts` | Applies suppression settings on `onDidChangeConfiguration` | Yes | Yes (lines 99-105, before startup gate) | Yes (imports from bbj-document-validator.js; calls `setSuppressCascading` and `setMaxErrors`) | VERIFIED |

---

## Key Link Verification

### Plan 01 Key Links

| From | To | Via | Pattern Found | Status |
|------|----|-----|---------------|--------|
| `BBjDocumentValidator.validateDocument()` | `super.validateDocument()` | `await super.validateDocument(...)` then filters result | Line 111: `const diagnostics = await super.validateDocument(document, options, cancelToken);` | WIRED |
| `applyDiagnosticHierarchy()` | `DiagnosticTier` enum | `getDiagnosticTier()` classifies each diagnostic | Lines 71, 95, 97: `getDiagnosticTier(d) === DiagnosticTier.Parse` | WIRED |

### Plan 02 Key Links

| From | To | Via | Pattern Found | Status |
|------|----|-----|---------------|--------|
| `extension.ts` | `bbj-ws-manager.ts` | `initializationOptions.suppressCascading` from `getConfiguration` | Line 725-726: `suppressCascading: vscode.workspace.getConfiguration("bbj").get("diagnostics.suppressCascading", true)` | WIRED |
| `bbj-ws-manager.ts` | `bbj-document-validator.ts` | `setSuppressCascading()` and `setMaxErrors()` calls | Line 22 (import), lines 72-84 (calls) | WIRED |
| `main.ts` | `bbj-document-validator.ts` | `setSuppressCascading()` and `setMaxErrors()` on config change | Line 14 (import), lines 101-104 (calls) | WIRED |

---

## Requirements Coverage

Both requirements declared across plans are accounted for in REQUIREMENTS.md.

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| DIAG-01 | 50-01, 50-01 SUMMARY | Suppress cascading linking/validation errors when parser errors exist | SATISFIED | `applyDiagnosticHierarchy()` Rule 1: `if (hasParseErrors) result = result.filter(d => d.data?.code !== DocumentValidator.LinkingError)`. Uses `data.code` (stable), not severity (which toDiagnostic() downgrades). |
| DIAG-02 | 50-01, 50-02 | Show warnings/hints only when no hard errors present | SATISFIED | Rule 2: `if (hasAnyError) result = result.filter(d => d.severity === DiagnosticSeverity.Error)`. Both parse and semantic errors count as "any error". |

**Orphaned requirements check:** REQUIREMENTS.md traceability table maps only DIAG-01 and DIAG-02 to Phase 50. No orphaned IDs.

---

## Must-Haves Verification (Plan Frontmatter Truths)

### Plan 01 Truths

| Truth | Status | Evidence |
|-------|--------|----------|
| A file with parse errors shows only parse errors and semantic errors — no linking errors appear | VERIFIED (code) | Rule 1 in `applyDiagnosticHierarchy()` at line 81-85. Matches `DocumentValidator.LinkingError` by `data.code`. |
| A file with any Error-severity diagnostic shows no warnings or hints | VERIFIED (code) | Rule 2 at line 87-92. Filters to `DiagnosticSeverity.Error` only. |
| Parse errors are capped at a configurable maximum (default 20) | VERIFIED | Rule 3 at lines 94-99. `maxErrorsDisplayed = 20` default; `setMaxErrors()` exported. |
| The suppression hierarchy is extensible — adding a BBjCPL tier in Phase 53 requires only adding an enum value and a classification check | VERIFIED | `DiagnosticTier` enum at lines 35-40 with commented `// BBjCPL = 3` placeholder. `getDiagnosticTier()` has Phase 53 comment at line 43. |
| When suppression is disabled via `setSuppressCascading(false)`, all diagnostics pass through unfiltered | VERIFIED | Line 68: `if (!suppressEnabled) return diagnostics;` — early return bypasses all rules. |

### Plan 02 Truths

| Truth | Status | Evidence |
|-------|--------|----------|
| `bbj.diagnostics.suppressCascading` setting exists in VS Code settings with default `true` | VERIFIED | package.json lines 470-475: type boolean, default true, scope window. |
| `bbj.diagnostics.maxErrors` setting exists in VS Code settings with default `20` | VERIFIED | package.json lines 476-482: type number, default 20, minimum 1, scope window. |
| Changing `suppressCascading` to false disables all suppression without restart | VERIFIED (code) | main.ts lines 99-102: `setSuppressCascading()` called before `!workspaceInitialized` guard, applies immediately. |
| Changing `maxErrors` to a different number caps parse errors at that number without restart | VERIFIED (code) | main.ts lines 103-105: `setMaxErrors()` called before startup gate. |
| A status bar item shows when the active document has Error-severity diagnostics | VERIFIED (code) | extension.ts lines 644-677: `suppressionStatusBar` created, shown when `hasError && suppressCascading enabled`, hidden for non-BBj files. |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `bbj-ws-manager.ts` | 15, 212 | `TODO` comments | Info | Pre-existing TODOs unrelated to this phase. No impact on phase goal. |

No blockers or phase-specific warnings found.

---

## Build and Test Verification

| Check | Result |
|-------|--------|
| `npm run build` (TypeScript compilation) | PASS — zero errors |
| `npm test` total failures | 6 (all pre-existing, unchanged from before phase) |
| New test failures introduced | 0 |
| Tests passing | 468 |

Pre-existing failures (confirmed in both SUMMARY files as pre-existing):
- `test/classes.test.ts` — 2 failures (access-level message text mismatch)
- `test/completion-test.test.ts` — 1 failure (DEF FN parameter suffix)
- `test/imports.test.ts` — 1 failure (USE unresolvable binary file)
- `test/validation.test.ts` — 2 failures (access-level call validation)

---

## Human Verification Required

### 1. Parse error suppression in Problems panel

**Test:** Open any `.bbj` file. Introduce a syntax error (e.g., delete the closing paren from a function call). Open the Problems panel.
**Expected:** Only the 1 parse error diagnostic appears. No cascade of linking errors such as "Could not resolve reference to..." for symbols that are actually defined but became unreachable due to the parse error.
**Why human:** The extension must be running in VS Code. The filtered LSP `publishDiagnostics` response cannot be observed from the CLI; requires a live editor session.

### 2. Warning/hint suppression while error present

**Test:** In the same file with the syntax error (or any file with a semantic error), check that warnings and hints (squiggly underlines of yellow/grey severity) are absent from the Problems panel.
**Expected:** Only Error-severity items are visible. The Problems panel shows no warning-level or hint-level entries.
**Why human:** Requires distinguishing diagnostic severity levels visually in a running VS Code instance.

### 3. Warnings reappear after error is fixed — without save/reload

**Test:** Starting from step 1 (file with syntax error, only parse error visible). Fix the syntax error by restoring the deleted character.
**Expected:** Within 1-2 seconds of editing (Langium's re-validation debounce), warnings and hints reappear in the Problems panel. No manual file save or command is required.
**Why human:** Depends on Langium's incremental re-validation event being triggered on text change. This exercises the live `validateDocument()` pipeline and cannot be observed via grep or build output.

---

## Gaps Summary

No automated gaps found. All artifacts exist, are substantive (non-stub), and are fully wired through the expected call chains. The build passes clean. Test failures are all pre-existing and unrelated to this phase.

The three items in human verification are confidence checks, not suspected failures — the code logic for all three behaviors is correct and in place. Human testing is required only because the behaviors depend on the VS Code runtime environment.

---

_Verified: 2026-02-19T13:10:00Z_
_Verifier: Claude (gsd-verifier)_
