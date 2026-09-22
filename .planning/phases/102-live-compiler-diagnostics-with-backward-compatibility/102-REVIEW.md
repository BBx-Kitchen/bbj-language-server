---
phase: 102-live-compiler-diagnostics-with-backward-compatibility
reviewed: 2026-09-22T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - bbj-vscode/src/language/bbj-document-builder.ts
  - bbj-vscode/src/language/bbj-document-validator.ts
  - bbj-vscode/src/language/bbj-module.ts
  - bbj-vscode/src/language/bbj-parser-service.ts
  - bbj-vscode/src/language/java-interop.ts
  - bbj-vscode/test/bbj-parser-service.test.ts
  - bbj-vscode/test/bbj-test-module.ts
  - bbj-vscode/test/functional/parse-program-live.test.ts
  - bbj-vscode/test/parser-coordinate-converter.test.ts
  - documentation/docs/intellij/features.md
  - documentation/docs/intellij/getting-started.md
  - documentation/docs/intellij/index.md
  - documentation/docs/vscode/features.md
  - documentation/docs/vscode/getting-started.md
  - documentation/docs/vscode/index.md
findings:
  critical: 1
  warning: 1
  info: 1
  total: 3
status: issues_found
---

# Phase 102: Code Review Report

**Reviewed:** 2026-09-22T00:00:00Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

This phase wires a new "live compiler diagnostics" path (`BBjParserService`, `JavaInteropService.parseProgram`) into the existing debounced BBjCPL compile cycle in `BBjDocumentBuilder`, plus matching documentation. The new service itself (`bbj-parser-service.ts`) is careful and well-tested: coordinate clamping, failure-kind classification, the on/off latch, and the log cadence all have direct unit coverage, and the JSON-RPC/backward-compatibility plumbing in `java-interop.ts` is sound.

The integration point in `bbj-document-builder.ts`'s `debouncedCompile()` has one real ordering bug: the phase's own research explicitly calls out (D-09) that `mergeDiagnostics()`'s same-line collapse-into-`'BBjCPL'` behavior must never apply to the new live-parser source, and the code deliberately avoids calling `mergeDiagnostics()` for the live-parser diagnostics themselves — but it clears the *old* live-parser diagnostics only *after* the BBjCPL merge step runs, so on the second and later debounce cycles `mergeDiagnostics()` can still consume a leftover live-parser diagnostic from the previous cycle. See CR-01. A secondary, unconfirmed-in-practice gap in the coordinate converter is noted as a warning.

## Critical Issues

### CR-01: Stale live-parser diagnostic silently absorbed into a mislabeled 'BBjCPL' diagnostic

**File:** `bbj-vscode/src/language/bbj-document-builder.ts:248-280`
**Issue:**
In `debouncedCompile()`'s timer callback, only `'BBjCPL'`-sourced diagnostics are cleared before the BBjCPL merge step:

```ts
document.diagnostics = (document.diagnostics ?? []).filter(d => d.source !== 'BBjCPL');
...
const cplDiags = await cplService.compile(key);
if (cplDiags.length > 0) {
    document.diagnostics = mergeDiagnostics(document.diagnostics ?? [], cplDiags);
}
// only NOW are stale BBJ_PARSER_SOURCE diagnostics cleared:
document.diagnostics = (document.diagnostics ?? []).filter(d => d.source !== BBJ_PARSER_SOURCE);
```

`mergeDiagnostics()` (`bbj-document-validator.ts:143-162`) matches a `cplDiag` against any existing diagnostic on the same line whose `source !== 'BBjCPL'` — it does not special-case `BBJ_PARSER_SOURCE`. Because the previous debounce cycle's live-parser diagnostics are still present in `document.diagnostics` at the point `mergeDiagnostics()` runs, a `cplDiag` on the same line as a leftover live-parser diagnostic from cycle N-1 matches that leftover entry instead of being appended fresh. The match branch only rewrites `source: 'BBjCPL'` on the existing object — it keeps the *old* (cycle N-1) message text and silently drops the new `cplDiag`'s message entirely. Because its `source` field has now been overwritten to `'BBjCPL'`, this stale, mislabeled diagnostic then survives the later `filter(d => d.source !== BBJ_PARSER_SOURCE)` step (its source no longer matches).

Net effect for any persistent syntax error that both BBjCPL and the live parser flag on the same line (the common case — the same unclosed string/statement stays broken across several debounce cycles while the user keeps typing elsewhere): from the second debounce cycle onward, the diagnostic shown with `source: 'BBjCPL'` on that line carries the *previous* cycle's live-parser message text, not the current BBjCPL compiler's message, and the genuine current BBjCPL diagnostic is dropped. This is exactly the collapse-into-`'BBjCPL'` behavior D-09 (cited in the code's own comment at line 269-272 and in `102-RESEARCH.md`'s "Don't Hand-Roll" table) says must never happen to the live-parser source — it happens anyway because of this ordering, not because `mergeDiagnostics()` is called directly on live-parser diagnostics.

**Fix:** Clear both stale sources together, before the BBjCPL merge step runs, so `mergeDiagnostics()` never sees a `BBJ_PARSER_SOURCE` entry to collide with:

```ts
// Clear-then-show: remove old BBjCPL and live-parser diagnostics before compiling.
document.diagnostics = (document.diagnostics ?? []).filter(
    d => d.source !== 'BBjCPL' && d.source !== BBJ_PARSER_SOURCE
);

const cplDiags = await cplService.compile(key);
if (cplDiags.length > 0) {
    document.diagnostics = mergeDiagnostics(document.diagnostics ?? [], cplDiags);
}

// Live parser diagnostics: filter-then-concat (D-09) — nothing left to re-filter here now.
const bbjParserService = langServices.compiler.BBjParserService;
if (bbjParserService.isEnabled()) {
    const liveDiags = await bbjParserService.requestLiveParse(document);
    if (liveDiags.length > 0) {
        document.diagnostics = [...(document.diagnostics ?? []), ...liveDiags];
    }
}
```

## Warnings

### WR-01: `parseErrorToRange` does not guard against `editorEndLine` clamping below `editorStartLine`

**File:** `bbj-vscode/src/language/bbj-parser-service.ts:39-50`
**Issue:** `startLine` and `endLine` are clamped independently:

```ts
const startLine = clampLine(error.editorStartLine);
const endLine = clampLine(error.editorEndLine);
```

Every other axis of a malformed/untrustworthy `ParseError` is defensively handled (negative/huge line numbers, an untrustworthy `endCharacter`, a collapsed/inverted character range), per the function's own doc comment and the extensive test coverage in `parser-coordinate-converter.test.ts`. But if the endpoint ever reports `editorEndLine < editorStartLine` (e.g. `editorStartLine: 5, editorEndLine: 2` with a document long enough that neither clamps to the same bound), the result is an inverted `Range` (`end.line < start.line`), which the same doc comment says a JVM language client's deserializer may reject outright — hiding every diagnostic for the document, the exact failure mode this function exists to prevent for the character axis. All live-probe evidence in `102-RESEARCH.md` and all test fixtures have `editorStartLine === editorEndLine`, so this has not been observed in practice, but nothing in the wire contract (`ParseError` in `java-interop.ts`) guarantees the ordering, and no test exercises it.
**Fix:** Clamp `endLine` to be at least `startLine`, mirroring the existing defensive posture for the other fields:

```ts
const startLine = clampLine(error.editorStartLine);
const endLine = Math.max(clampLine(error.editorEndLine), startLine);
```

## Info

### IN-01: `parseProgramRequest`'s error-data generic is inconsistent with the file's other `RequestType`s

**File:** `bbj-vscode/src/language/java-interop.ts:1319`
**Issue:** Every other `RequestType` in this file uses `null` as its third (error-data) type parameter (`loadClasspathRequest`, `getClassInfoRequest`, `getClassInfosRequest`, `getTopLevelPackages`, `getAllClassNamesRequest`). The new `parseProgramRequest` uses `void` instead:
```ts
const parseProgramRequest = new RequestType<ParseProgramParams, ParseProgramResult, void>('parseProgram');
```
This has no runtime effect (the third parameter is compile-time only and unused by any caller here), but it's an unexplained deviation from the file's own established convention.
**Fix:** Use `null` for consistency with the rest of the file, unless there's a specific reason (undocumented here) to diverge for this request type.

---

_Reviewed: 2026-09-22T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
