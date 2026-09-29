# Phase 118: Small Dedup & Drift Guards - Context

**Gathered:** 2026-09-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Small duplicated helpers and catalog shapes exist once, and the two hand-synced copies — the four `.bbl` catalog files and the `package.json` `bbj.compiler.*` contributions — fail a test as soon as they drift from their source. Requirements REF-01, REF-04, REF-05, REF-06; closes #580, #583, #603, #606.

Pure refactor plus two new drift tests. "Unchanged behaviour" means the existing suites pass without assertion changes (v4.7 standing rule), compared against the phase base when in doubt. Runs under Phase 114's lint (`--max-warnings 0`) and `typecheck:test` gates.

</domain>

<decisions>
## Implementation Decisions

### `.bbl` catalog mirrors (REF-05, #603)
- **D-01:** Keep the four physical `.bbl` files (`events`, `functions`, `labels`, `variables` under `bbj-vscode/src/language/lib/`) as hand-synced mirrors. No build-time generator, no deletion. A new vitest drift test compares each `.bbl` with its `.ts` export and fails on any mismatch; its failure message names the file to fix.
- **D-02:** Repair today's drift with `.ts` as the source of truth, everywhere: rewrite each `.bbl` from its `.ts` template body. The runtime builds `bbjlib:///*.bbl` from the `.ts` constants (`bbj-ws-manager.ts:250-253`, `lib/fs-provider.ts`), so no runtime catalog content changes. This drops `events.bbl`'s stale duplicate `ON_MOUSE_ENTER`/`ON_MOUSE_EXIT` entries (v4.0 `7371c264` merged them in `events.ts`) and takes `functions.ts`'s widened CVS signature (89-03), which resolves #603's CVS synopsis disagreement. Nothing flows from `.bbl` back into `.ts`.
- **D-03:** The comparison is exact: the `.bbl` file content must equal the exported runtime constant byte for byte, after CRLF normalisation (the constant is already unescaped, so `` \` `` needs no special handling when comparing the imported value). No whitespace tolerance.

### Catalog wrapper shape (REF-04, #583)
- **D-04:** All four catalog `.ts` files use one shape: the opening backtick is directly followed by `library` on the same line (`` export const builtinX = `library ``), and the closing backtick sits on its own line followed by `;`. No `.trimLeft()`/`.trimStart()` anywhere. This removes the dead trim call from `functions.ts` and `labels.ts`, the extra leading blank lines in all four, and `variables.ts`'s ASI-reliant ending. The template body then equals the `.bbl` exactly, so the drift test (D-03) needs no special-casing. The `bbjlib:///` documents lose their leading blank lines; whitespace is hidden, so they parse identically. The existing catalog suites (`builtin-functions-library.test.ts`, `builtin-library-members.test.ts`, `example-files.test.ts` etc.) must pass unchanged.

### Compiler-option drift test (REF-06, #606)
- **D-05:** The test compares, for every `COMPILER_OPTIONS` entry in `src/language/compiler-options.ts`: that `bbj.compiler.<configKey>` exists in `package.json`, and that its `default` and `type` match. A `package.json` type of `["string","null"]` counts as `string` (today `content.protectPassword` and `diagnostics.errorLog`, both default `null` on both sides). It also checks the reverse direction: every `bbj.compiler.*` property in `package.json` has a table entry. So an addition, removal or default change on either side fails the test. Measured today: 20/20 keys match, 0 default diffs, 0 type diffs, so the test passes with no data edits.
- **D-06:** Descriptions and labels are NOT compared. 19 of 20 differ on purpose: the Settings-UI text in `package.json` carries the flag, e.g. `(-t)`, plus caveats, and the QuickPick text in the table is short. Leave both texts as they are.
- **D-07:** `bbj.compiler.trigger` (compile-on-save setting, not a bbjcpl flag) is handled by a named allow-list in the test with a one-line reason. Any other `bbj.compiler.*` key without a table entry fails. Do not scope the test by key prefix/group.
- **D-08:** The test is the sync mechanism and closes #606. No generator for the `package.json` block; `package.json` stays static and hand-edited. The closing note on #606 explains that choice. This departs from #606's literal "no longer maintain independent copies" wording, and the user accepted that.

### Shared `getFunctionReference` (REF-01, #580)
- **D-09:** One exported free function `getFunctionReference(callNode: MethodCall): Reference<NamedElement> | undefined` in `bbj-vscode/src/language/utils.ts`, next to `readSimpleName`. Both `bbj-signature-help-provider.ts:60` and `bbj-inlay-hint-provider.ts:93` call it directly. Both protected methods are deleted: nothing overrides them in src or test. The roadmap's example home, `bbj-nodedescription-provider.ts`, is not used because it is a Langium service class. The signature-help and inlay-hint suites pass unchanged.

### Claude's Discretion
- Drift test file names and placement under `bbj-vscode/test/`, e.g. one file per guard. The tests import the exported constants and `COMPILER_OPTIONS` and read `package.json` / `.bbl` via paths relative to the test file, following the existing pattern (vitest cwd is `bbj-vscode`).
- Whether the `.bbl` test is table-driven over the four pairs (likely).
- Exact import additions in `utils.ts` (`MethodCall`, `NamedElement`, `isSymbolRef`, `isMemberCall`, `Reference`) and plan split/ordering. The four items are independent, but D-04 must land before or with the D-01 test so the `.bbl` rewrite and the shape change agree.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope
- `.planning/ROADMAP.md` § Phase 118 — goal, code list, four success criteria
- `.planning/REQUIREMENTS.md` — REF-01, REF-04, REF-05, REF-06
- GitHub issues #580, #583, #603, #606 (`gh issue view N`) — the original findings; #603/#606 acceptance criteria are satisfied per D-01/D-08 (test-based, not generate/delete)

### Code
- `bbj-vscode/src/language/bbj-signature-help-provider.ts`, `bbj-vscode/src/language/bbj-inlay-hint-provider.ts` — the two identical `getFunctionReference` copies
- `bbj-vscode/src/language/utils.ts` — target home (D-09)
- `bbj-vscode/src/language/lib/{events,functions,labels,variables}.ts` + `.bbl` — catalog pairs
- `bbj-vscode/src/language/bbj-ws-manager.ts:250-253`, `bbj-vscode/src/language/lib/fs-provider.ts` — the only runtime consumers (read the `.ts` constants, never the `.bbl` files)
- `bbj-vscode/src/language/compiler-options.ts` — `COMPILER_OPTIONS` single source (fields: flag, configKey, label, description, group, type, defaultValue, hasParameter)
- `bbj-vscode/package.json` `contributes.configuration` `bbj.compiler.*` — 21 properties (20 + `trigger`)
- `bbj-vscode/test/builtin-functions-library.test.ts`, `bbj-vscode/test/builtin-library-members.test.ts`, `bbj-vscode/test/compiler-options.test.ts` — existing suites that must pass unchanged

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `utils.ts` already hosts small shared AST helpers (`readSimpleName`, deduped the same way in Phase 114).
- `COMPILER_OPTIONS` is importable without `vscode` (explicitly vscode-free module), so the drift test needs no mocks.

### Established Patterns
- Project memory: `.bbl` files are hand-synced mirrors with no generator; edits go to both. This phase keeps that rule and adds the guard.
- Guard tests in this repo read repo files directly (e.g. the language-configuration and TextMate suites); they need vitest cwd = `bbj-vscode`.
- No plan/decision IDs (D-xx, REF-xx) in source or test comments; issue numbers are fine.

### Integration Points
- Catalog shape change alters the `bbjlib:///` document text (leading blank lines removed). Any test that asserts line/offset positions inside bbjlib documents would notice; the whole suite must match the phase base.

</code_context>

<specifics>
## Specific Ideas

- Current drift, measured 2026-09-28. `labels` and `variables` differ from their `.ts` bodies only in whitespace. `events` and `functions` differ in content: events has the duplicate MOUSE entries; functions has about 260 diff lines, CVS among them.
- The drift-test failure message should say which `.bbl` to rewrite from which `.ts` export.

</specifics>

<deferred>
## Deferred Ideas

### Reviewed Todos (not folded)
- `2026-09-26-signature-help-and-snippet-peer-name-escaping` — peer-supplied Java names breaking out of the signature-help code fence. A security/behaviour fix, not a dedup; out of scope for this refactor phase.
- `2026-09-26-intellij-interop-initoptions-key-mismatch` — IntelliJ initOptions key names. Unrelated to this phase; matched on keywords only.
- `2026-09-27-windows-intellij-node-download-progress-check` — Windows UAT re-check from Phase 114. Unrelated; matched on keywords only.

</deferred>

---

*Phase: 118-small-dedup-drift-guards*
*Context gathered: 2026-09-28*
