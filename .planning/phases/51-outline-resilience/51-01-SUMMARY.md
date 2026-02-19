---
phase: 51-outline-resilience
plan: 01
subsystem: lsp
tags: [langium, document-symbols, error-recovery, outline, partial-ast]

# Dependency graph
requires:
  - phase: 50-diagnostic-noise-reduction
    provides: BBjDocumentValidator and module registration patterns used as reference
provides:
  - BBjDocumentSymbolProvider with per-node error recovery and (parse error) fallback
  - Deep-walk fallback for recovering symbols after syntax error points
  - Error-recovery tests confirming outline survives partial ASTs
affects: [53-bbj-cpl-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-node try/catch wrapping in LSP provider to prevent single broken node from blanking client view"
    - "Deep-walk fallback via AstUtils.streamAllContents when shallow streamContents misses nodes after error points"
    - "DefaultDocumentSymbolProvider subclassing with override for error-safe symbol extraction"
    - "Synthetic document guard pattern (JavaSyntheticDocUri + bbjlib:// scheme) for non-BBj documents"

key-files:
  created:
    - bbj-vscode/src/language/bbj-document-symbol-provider.ts
  modified:
    - bbj-vscode/src/language/bbj-module.ts
    - bbj-vscode/test/document-symbol.test.ts

key-decisions:
  - "Import DefaultDocumentSymbolProvider from langium/lsp (not langium) — it is only exported from the lsp sub-module"
  - "Use lexer-error-in-body syntax (@@@ INVALID @@@) for broken-method test rather than broken parameter list — broken param list causes parser to fail at class level entirely, producing no BbjClass node"
  - "Deep-walk fallback uses position encoding (line * 100_000 + char) rather than $cstNode.offset because DocumentSymbol.range has no direct offset field"
  - "Large file threshold set to 200,000 chars (~10,000 lines) — deep-walk skipped on files over this threshold for performance"
  - "Synthetic document guard returns super.getSymbols() cast to DocumentSymbol[] — DefaultDocumentSymbolProvider is synchronous in practice, cast is safe"

patterns-established:
  - "BBjDocumentSymbolProvider: subclass DefaultDocumentSymbolProvider, override getSymbol() with try/catch, use (parse error) fallback label for missing names"

requirements-completed: [OUTL-01, OUTL-02]

# Metrics
duration: 5min
completed: 2026-02-19
---

# Phase 51 Plan 01: Outline Resilience Summary

**BBjDocumentSymbolProvider extending DefaultDocumentSymbolProvider with per-node try/catch, (parse error) fallback, and AstUtils.streamAllContents deep-walk to keep Structure View populated during syntax errors**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-19T18:24:32Z
- **Completed:** 2026-02-19T18:29:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created `BBjDocumentSymbolProvider` with per-node try/catch preventing any broken AST node from blanking the outline
- Implemented `(parse error)` fallback label for nodes whose `name` property is empty or undefined at runtime
- Added deep-walk fallback via `AstUtils.streamAllContents` that runs only when parse errors exist and file is under 200K chars
- Registered `DocumentSymbolProvider` in `BBjModule.lsp` following established custom LSP provider pattern
- Added 4 new error-recovery tests covering: broken method body, symbols before/after error, missing class name, completely broken file

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BBjDocumentSymbolProvider with error-safe AST traversal** - `a80f916` (feat)
2. **Task 2: Add error-recovery tests for document symbols on partial ASTs** - `0df512c` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `bbj-vscode/src/language/bbj-document-symbol-provider.ts` - New error-safe DocumentSymbolProvider (created)
- `bbj-vscode/src/language/bbj-module.ts` - Added DocumentSymbolProvider registration in lsp section
- `bbj-vscode/test/document-symbol.test.ts` - Added 4 error-recovery test cases

## Decisions Made
- Imported `DefaultDocumentSymbolProvider` from `langium/lsp` (not `langium`) — it is only exported from the LSP sub-module
- Used lexer-error-in-body syntax (`@@@ INVALID @@@`) for the broken-method test rather than a broken parameter list, because `method broken(` (unterminated param list) causes the Chevrotain parser to fail at the `BbjClass` level entirely — producing no class node in the AST, making the assertion impossible
- The deep-walk fallback uses position encoding (`line * 100_000 + char`) as a proxy for offset, since `DocumentSymbol.range` does not expose a raw character offset
- Synthetic document guard casts `super.getSymbols()` result to `DocumentSymbol[]` — `DefaultDocumentSymbolProvider` is synchronous so the `MaybePromise<>` wrapper never resolves to a Promise in practice

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed import: DefaultDocumentSymbolProvider is from langium/lsp not langium**
- **Found during:** Task 1 (first build attempt)
- **Issue:** Plan specified `from 'langium'` but `DefaultDocumentSymbolProvider` is only exported from `langium/lsp`
- **Fix:** Changed import to `from 'langium/lsp'` (also moved `LangiumServices` to same import)
- **Files modified:** `bbj-vscode/src/language/bbj-document-symbol-provider.ts`
- **Verification:** TypeScript build passed cleanly
- **Committed in:** a80f916 (Task 1 commit)

**2. [Rule 1 - Bug] Fixed MaybePromise return type in synthetic document guard**
- **Found during:** Task 1 (second build attempt)
- **Issue:** `super.getSymbols()` returns `MaybePromise<DocumentSymbol[]>` but method signature requires `DocumentSymbol[]`
- **Fix:** Added `as DocumentSymbol[]` cast with explanatory comment that DefaultDocumentSymbolProvider is synchronous
- **Files modified:** `bbj-vscode/src/language/bbj-document-symbol-provider.ts`
- **Verification:** TypeScript build passed cleanly
- **Committed in:** a80f916 (Task 1 commit)

**3. [Rule 1 - Bug] Test case adjusted: broken parameter list doesn't produce a recoverable BbjClass node**
- **Found during:** Task 2 (test run)
- **Issue:** Plan's test case `method public void broken(` (unterminated param list) causes Chevrotain to fail at class level, producing 5 flat `ExpressionStatement` nodes instead of a `BbjClass` — `TestClass` never appears in AST
- **Fix:** Changed to `method public void broken()` with `@@@ INVALID BODY @@@` inside the body — this produces lexer errors but parser recovers at `METHODEND`, keeping all members
- **Files modified:** `bbj-vscode/test/document-symbol.test.ts`
- **Verification:** `npx vitest run test/document-symbol.test.ts` — 5/5 tests pass
- **Committed in:** 0df512c (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 build errors Rule 1, 1 test accuracy Rule 1)
**Impact on plan:** All auto-fixes were correctness issues. The test case adjustment was necessary because the plan's example syntax produced different parser behavior than expected — the revised syntax is more representative of actual Chevrotain error recovery.

## Issues Encountered
- Pre-existing `check-variable-scoping.ts` bug fires on stderr when parsing completely broken input (`@@@ %%% ###`). This is a pre-existing issue (noted in STATE.md: "6 pre-existing test failures") handled by `ValidationRegistry.handleException`. Our test passes regardless since we only assert on the symbol array, not validation state.

## Next Phase Readiness
- `BBjDocumentSymbolProvider` is active and registered; VS Code and IntelliJ both use the same LSP endpoint so both IDEs benefit immediately
- Phase 53 (BBjCPL Integration) can use the same pattern for potential future symbol enrichment
- No blockers

## Self-Check: PASSED

- bbj-vscode/src/language/bbj-document-symbol-provider.ts: FOUND
- bbj-vscode/src/language/bbj-module.ts: FOUND
- bbj-vscode/test/document-symbol.test.ts: FOUND
- Commit a80f916: FOUND
- Commit 0df512c: FOUND

---
*Phase: 51-outline-resilience*
*Completed: 2026-02-19*
