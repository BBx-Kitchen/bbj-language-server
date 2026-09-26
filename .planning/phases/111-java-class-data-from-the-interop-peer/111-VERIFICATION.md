---
phase: 111-java-class-data-from-the-interop-peer
verified: 2026-09-26T18:30:00Z
status: gaps_found
score: 4/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
gaps:
  - truth: "A peer response whose fields have the wrong type or exceed a fixed length is rejected or truncated before anything is copied into the class's documentation (ROADMAP Success Criterion 1 / SEC-03 / D-03)"
    status: failed
    reason: >
      A method or constructor entry whose `parameters` key is entirely absent (not present-but-wrong-type,
      simply missing from the DTO) is kept by `sanitizeMemberArray`/`sanitizeParameters` (their documented
      contract deliberately leaves an absent value untouched for a caller's own `??= []` default), but no
      caller ever adds that default for `method.parameters`/`constructor.parameters` (unlike
      `javaClass.fields`/`methods`/`constructors`/`classes`, which do get `??= []` in `resolveClass`).
      Reproduced live: `method.parameters.entries()` (java-interop.ts:1272) throws
      `TypeError: Cannot read properties of undefined (reading 'entries')`. The throw is swallowed by the
      single `catch (e) { console.error(e) }` wrapping the whole Phase 2 block, so the class "resolves"
      but every method/constructor after the offending entry in iteration order never gets
      `resolvedReturnType`, `docu`, or linked parameters — silent partial resolution, not the
      "rejected or truncated" outcome D-03 requires. This is exactly code-review finding CR-02
      (111-REVIEW.md), confirmed still present at HEAD via a live repro (see verification evidence below).
    artifacts:
      - path: "bbj-vscode/src/language/java-interop.ts"
        issue: "No `method.parameters ??= []` / `constructor.parameters ??= []` default anywhere before the Phase 2 loops at lines 1272 and 1320 that call `.entries()`/`for...of` on `parameters`"
      - path: "bbj-vscode/src/language/java-peer-guard.ts"
        issue: "`sanitizeParameters` (lines 137-153) intentionally leaves an absent `parameters` untouched, per its own doc comment, relying on a caller-side default that does not exist"
    missing:
      - "Add `method.parameters ??= []` and `constructor.parameters ??= []` in `resolveClass()` Phase 1, mirroring the existing `javaClass.fields ??= []` / `javaClass.methods ??= []` pattern, OR make `sanitizeParameters` itself always leave `owner.parameters` as `[]` when absent"
      - "A regression test feeding a method/constructor entry with no `parameters` key at all through the real `resolveClass()` pipeline (`CountingJavaInteropService`), asserting the class resolves fully (no swallowed exception, later methods still get `resolvedReturnType`/`docu`)"
  - truth: "Java class data reaching hover is bounded on every path, including the javadoc-file MethodDoc fallback, per D-02 ('the javadoc that javadocProvider.getDocumentation() returns is bounded ... where hover reads it on its fallback path')"
    status: failed
    reason: >
      `bbj-hover.ts`'s `toMethodDocToMethodData` (lines 243-252) copies `methodDoc.name` and each
      `methodDoc.params[i].name` straight from the parsed javadoc-file JSON with no length check, then
      `methodSignature` embeds them directly into the returned hover string. Only the javadoc *body*
      text is bounded (`truncateText(..., MAX_JAVADOC_LENGTH)` at line 124-125); the method/parameter
      *names* used to build the bold signature header are not bounded anywhere — `bbj-hover.ts` never
      imports `MAX_JAVA_IDENTIFIER_LENGTH`. Markdown escaping (SEC-04, D-06/D-07) is correctly applied at
      the return boundary and verified working (`escapeMarkdown` tests pass, `<` deliberately unescaped
      per the amended D-06), but that is orthogonal to length bounding — a malformed or pathological
      javadoc-file entry (an on-disk `.json` javadoc file, not a live peer response) can still produce an
      arbitrarily large hover string via this one branch. This is code-review finding CR-01
      (111-REVIEW.md), confirmed still present at HEAD by reading the current source; no test exercises
      the `isMethodDoc` branch of this fallback (`javadoc-markdown-escape.test.ts` only exercises the
      `ClassDoc`-shaped fallback).
    artifacts:
      - path: "bbj-vscode/src/language/bbj-hover.ts"
        issue: "`toMethodDocToMethodData` (lines 243-252) does not bound `methodDoc.name` or `params[i].name` with `truncateText(..., MAX_JAVA_IDENTIFIER_LENGTH)`"
    missing:
      - "Bound `methodDoc.name` and each `params[i].name` in `toMethodDocToMethodData` (or immediately before it is called) with `truncateText(name, MAX_JAVA_IDENTIFIER_LENGTH)`, importing `MAX_JAVA_IDENTIFIER_LENGTH`/`truncateText` from `java-peer-guard.js`"
      - "A test exercising the `isMethodDoc` branch of hover's javadoc-file fallback with an oversized method/parameter name"
human_verification:
  - test: "Hover a Java method with javadoc in both VS Code and IntelliJ; confirm the rendered text is readable with no stray link or image"
    expected: "No clickable link or embedded image renders from javadoc Markdown control characters; text reads naturally"
    why_human: "Markdown rendering is done by each IDE's own client; cannot be observed from server-side code or tests"
  - test: "In IntelliJ/LSP4IJ, hover a Java class/method whose javadoc contains a raw HTML tag (for example an `<img>` tag), and check whether the tag renders as HTML or literal text, and whether any remote resource loads"
    expected: "No remote image loads. If LSP4IJ renders raw HTML (unlike VS Code, which strips it when `supportHtml` is off), the amended D-06 decision (not escaping `<`) may need revisiting per the 111-CONTEXT.md note"
    why_human: "IntelliJ/LSP4IJ's raw-HTML rendering behavior is explicitly flagged as unverified in 111-CONTEXT.md and 111-03-SUMMARY.md (Assumption A3), deferred to UAT by design"
---

# Phase 111: Java Class Data from the Interop Peer Verification Report

**Phase Goal:** Java class data supplied by the java-interop peer reaches the AST, hover, completion and quick fixes only after it is bounded, escaped and validated. Java class problems also read correctly: no spurious "has no container" log line, and an unresolved Java member stays visible with a message a BBj developer can understand.
**Verified:** 2026-09-26
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Criterion 1 (SEC-03): a peer response whose fields have the wrong type or exceed a fixed length is rejected or truncated before anything is copied into the class's documentation | ✗ FAILED | Live repro: a method/constructor entry with an absent `parameters` key crashes Phase 2 (`TypeError` on `undefined.entries()`), silently swallowed, leaving later methods unresolved. Matches 111-REVIEW.md CR-02, still present at HEAD. |
| 2 | Criterion 2 (SEC-04): javadoc text containing Markdown control characters (`[`, `]`, `(`, `)`, backtick, `!`) shows literally in hover and completion; `<` is deliberately NOT escaped per the amended D-06 | ✓ VERIFIED | `escapeMarkdown`/`toFenceSafeLine` in `java-peer-guard.ts` confirmed by code read; `test/javadoc-markdown-escape.test.ts` (20 tests) passes; the escape pattern `/[\\`[\]()!]/g` correctly omits `<`. |
| 2b | D-02 cross-cutting bound: hover's javadoc-file MethodDoc fallback path bounds the method/parameter names it renders, not just the javadoc body text | ✗ FAILED | `toMethodDocToMethodData` in `bbj-hover.ts` (lines 243-252) copies `methodDoc.name`/`params[i].name` unbounded. Matches 111-REVIEW.md CR-01, still present at HEAD; confirmed by reading current source (no `MAX_JAVA_IDENTIFIER_LENGTH` import in `bbj-hover.ts`). |
| 3 | Criterion 3 (SEC-05): the missing-USE quick fix and auto-import completion insert nothing for a class name that doesn't match the Java qualified-identifier pattern; valid names still get their `use` line | ✓ VERIFIED | `isJavaQualifiedName` in `java-peer-guard.ts`, wired into `bbj-code-action-provider.ts` and `bbj-completion-provider.ts`. `test/java-qualified-name.test.ts` + `test/code-action.test.ts` (41 tests) pass. |
| 4 | Criterion 4 (FIX-02): resolving code that uses `java.io`/`java.net` classes no longer logs "has no container"; the caller passing a bare package name is fixed and pinned by a test | ✓ VERIFIED | `isKnownJavaPackage` guards `tryResolveJavaReference` in `bbj-scope-local.ts`; `console.error` line count unchanged (still the genuine backstop). `test/java-package-name-collision.test.ts` (7 tests) pass. |
| 5 | Criterion 5 (FIX-03): in a file with an unrelated Error, the Warning for an unresolved Java member on an uncertain receiver is still shown, names the member without "NamedElement", and Rule 1 is unchanged | ✓ VERIFIED | `isJavaMemberLinkingWarning`/`javaMemberLinkingMessage` wired into `applyDiagnosticHierarchy` Rule 2 and `processLinkingErrors`. `test/unknown-java-member.test.ts` + `test/bbj-document-validator.test.ts` (58 tests) pass. |

**Score:** 4/6 truths verified (0 present-but-behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/java-peer-guard.ts` | Shared plain module: bounds, escape, qualified-name check | ✓ VERIFIED | Present, zero imports (`grep -c "^import"` = 0), all constants/functions present and wired |
| `bbj-vscode/src/language/java-interop.ts` | Guarded `resolveClass()`/`loadImplicitImports()`, package-collision handling | ⚠️ PARTIAL | Guard present and wired for most fields; `parameters` defaulting missing (gap 1 above) |
| `bbj-vscode/src/language/bbj-hover.ts` | Escaped + bounded Java hover content on every path | ⚠️ PARTIAL | Escaping present and correct; bounding incomplete on the MethodDoc fallback path (gap 2 above) |
| `bbj-vscode/src/language/bbj-completion-provider.ts` | Escaped Java completion documentation, fence-safe signature | ✓ VERIFIED | `toFenceSafeLine`/`escapeMarkdown` wired; tests pass |
| `bbj-vscode/src/language/bbj-code-action-provider.ts` | `isJavaQualifiedName` gates `createUseAction` | ✓ VERIFIED | Wired; tests pass |
| `bbj-vscode/src/language/bbj-document-validator.ts` | `javaMemberAccess` flag, Rule 2 exemption, reworded message | ✓ VERIFIED | Wired; tests pass |
| `bbj-vscode/src/language/bbj-scope-local.ts` | Package-name pre-flight check | ✓ VERIFIED | `isKnownJavaPackage` call confirmed at line 387 |
| `bbj-vscode/test/java-interop-peer-guard.test.ts` | SEC-03 regression suite | ✓ VERIFIED | Exists, passes, but does not cover the absent-`parameters` case (gap 1) |
| `bbj-vscode/test/javadoc-markdown-escape.test.ts` | SEC-04 regression suite | ✓ VERIFIED | Exists, passes, but does not cover the `isMethodDoc` fallback branch (gap 2) |
| `bbj-vscode/test/java-qualified-name.test.ts`, `test/code-action.test.ts` | SEC-05 regression suite | ✓ VERIFIED | Exist, pass |
| `bbj-vscode/test/java-package-name-collision.test.ts` | FIX-02 regression suite | ✓ VERIFIED | Exists, passes |
| `bbj-vscode/test/unknown-java-member.test.ts` | FIX-03 regression suite | ✓ VERIFIED | Exists, passes |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `JavaInteropService.resolveClass` entry | `isUsableJavaClassName` | class-name check before `canonicalJavaClassName` | ✓ WIRED | Confirmed in source |
| `JavaInteropService.resolveClass` (before `storeJavaClass`) | `sanitizeJavaClassDto` | in-place DTO sanitation | ✓ WIRED | Confirmed in source, called once |
| `BBjHoverProvider.getAstNodeHoverContent` (Java branch) | `escapeMarkdown` | escaped return | ✓ WIRED | Confirmed; covers stored `docu` and the fallback's *text*, not the fallback's *names* (gap 2) |
| `BBjCompletionProvider.createReferenceCompletionItem` | `toFenceSafeLine`/`escapeMarkdown` | fenced signature / javadoc part | ✓ WIRED | Confirmed |
| `bbj-scope-local.ts tryResolveJavaReference` | `isKnownJavaPackage` | early package check, all 4 callers funnel through | ✓ WIRED | Confirmed |
| `applyDiagnosticHierarchy` Rule 2 | `isJavaMemberLinkingWarning` | second exemption beside `isDowngradedSyntaxWarning` | ✓ WIRED | Confirmed |
| `bbj-code-action-provider.ts`/`bbj-completion-provider.ts` | `isJavaQualifiedName` | insert-boundary gate before `use` edit | ✓ WIRED | Confirmed |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| A method/constructor entry with no `parameters` key does not crash Phase 2 resolution | Scratch reproduction test via `CountingJavaInteropService.resolveRaw`, `--disable-console-intercept` | `TypeError: Cannot read properties of undefined (reading 'entries')` thrown and swallowed by `console.error`; a later method (`afterward`) never got `resolvedReturnType` populated | ✗ FAIL — confirms gap 1 (CR-02) |
| SEC-03 targeted suite | `npx vitest run test/java-interop-peer-guard.test.ts --maxWorkers=2` | 1 file, tests pass | ✓ PASS (does not cover the crashing case) |
| SEC-04 targeted suite | `npx vitest run test/javadoc-markdown-escape.test.ts --maxWorkers=2` | 20 tests pass | ✓ PASS (does not cover the `isMethodDoc` fallback bounding gap) |
| SEC-05 targeted suite | `npx vitest run test/java-qualified-name.test.ts test/code-action.test.ts --maxWorkers=2` | 41 tests pass | ✓ PASS |
| FIX-02 targeted suite | `npx vitest run test/java-package-name-collision.test.ts --maxWorkers=2` | 7 tests pass | ✓ PASS |
| FIX-03 targeted suite | `npx vitest run test/unknown-java-member.test.ts test/bbj-document-validator.test.ts --maxWorkers=2` | 58 tests pass | ✓ PASS |
| All phase-111 targeted suites together | `npx vitest run test/java-interop-peer-guard.test.ts test/unknown-java-member.test.ts test/javadoc-markdown-escape.test.ts test/java-package-name-collision.test.ts test/java-qualified-name.test.ts test/code-action.test.ts --maxWorkers=2` | 143 tests pass | ✓ PASS |

### Whole-Suite Regression Check

Per orchestrator-supplied evidence (not re-run in full here): whole suite at HEAD `c4b763f8` = 3080 tests, 11 failed, all in `linking.test.ts` "Interop related tests" — identical failures on the pre-phase base `f7b11fe5` (local BBjServices-on-`:5008` environment drift, not a regression). Independently confirmed: all 6 phase-111 targeted test files pass together (143/143). No regression attributable to this phase's code changes.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| SEC-03 | 111-01-PLAN.md | java-interop peer response fields checked for type/length before copy into AST documentation (#523) | ⚠️ PARTIALLY BLOCKED | Bounding is correct for nearly every field kind, but the `parameters` absent-key case crashes rather than being rejected/truncated (gap 1) |
| SEC-04 | 111-03-PLAN.md | Hover/completion escape Markdown control characters in peer javadoc (#524) | ✓ SATISFIED (escaping); ⚠️ associated bounding gap 2b (D-02) also unmet on the same code paths | `escapeMarkdown` correctly applied and tested; the co-located D-02 bound is not |
| SEC-05 | 111-05-PLAN.md | Missing-USE quick fix and auto-import completion insert only Java-qualified names (#525) | ✓ SATISFIED | `isJavaQualifiedName` wired at both call sites, tested |
| FIX-02 | 111-04-PLAN.md | "has no container" log line gone; bare-package caller fixed (#676) | ✓ SATISFIED | `isKnownJavaPackage` guard confirmed, tested |
| FIX-03 | 111-02-PLAN.md | Unresolved Java member Warning survives an unrelated Error; message reworded (todo 2026-09-24) | ✓ SATISFIED | `isJavaMemberLinkingWarning`/`javaMemberLinkingMessage` confirmed, tested |

No orphaned requirements: all 5 requirement IDs declared in `111-CONTEXT.md` (SEC-03, SEC-04, SEC-05, FIX-02, FIX-03) are each claimed by exactly one plan's frontmatter `requirements:` field, matching `.planning/REQUIREMENTS.md`'s Phase 111 mapping.

Note: `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` currently mark SEC-03/SEC-04/SEC-05/FIX-02/FIX-03 as `[x]` Complete. This verification finds SEC-03 and (the D-02 portion of) SEC-04 not fully met; those checkmarks should not be treated as authoritative until the gaps below are closed.

### Anti-Patterns Found

No debt markers (`TBD`/`FIXME`/`XXX`), warning markers (`TODO`/`HACK`/`PLACEHOLDER`), or stub patterns found in any of the 7 phase-modified source files (`java-peer-guard.ts`, `java-interop.ts`, `bbj-hover.ts`, `bbj-completion-provider.ts`, `bbj-code-action-provider.ts`, `bbj-document-validator.ts`, `bbj-scope-local.ts`). One pre-existing `TODO` in `bbj-scope-local.ts:275` dates to a 2023-10-27 commit (`8c31de564`), unrelated to this phase.

Two code-review **Warnings** (not blockers, both reviewed against 111-CONTEXT.md):
- **WR-01** (no bound on member/parameter array *counts*, only string lengths): explicitly assessed and accepted by this phase's own threat model — `111-01-PLAN.md`'s `<threat_model>` lists `T-111-05 | Denial of service | very long member or parameter arrays | low | accept | ... capping array counts here would not reduce peak memory.` This is a documented, deliberate scope decision, not an unaddressed gap.
- **WR-02** (no dedicated regression test for `constructors` array sanitization): a test-coverage gap, not a functional one — `constructors` goes through the identical `sanitizeMemberArray` code path as `methods`, which is thoroughly tested. Low risk; recorded here for visibility but not treated as a must-have failure.

### Human Verification Required

1. **Hover rendering in real IDEs**
   **Test:** Build both extensions (VS Code VSIX, IntelliJ plugin), hover `java.util.HashMap.put` and a BBjAPI method with javadoc in both editors.
   **Expected:** Text reads naturally, no stray clickable link or embedded remote image renders.
   **Why human:** Markdown-to-UI rendering happens client-side in each IDE; not observable from server code or unit tests.

2. **IntelliJ raw-HTML javadoc tag behavior**
   **Test:** In IntelliJ/LSP4IJ, hover a Java element whose javadoc contains a raw HTML tag (e.g. `<img src=…>`).
   **Expected:** No remote resource loads. If LSP4IJ renders raw HTML unlike VS Code (which strips it), the amended D-06 decision (leaving `<` unescaped) should be revisited per `111-CONTEXT.md`'s own note.
   **Why human:** `111-CONTEXT.md` and `111-03-SUMMARY.md` explicitly flag this as unverified (Assumption A3), deferred to UAT.

### Gaps Summary

Two BLOCKER-level gaps were found, both matching unresolved findings from this phase's own code review (`111-REVIEW.md`, CR-01/CR-02), confirmed still present in the current HEAD by direct code inspection and (for CR-02) a live reproduction:

1. **CR-02 (SEC-03/D-03):** A method or constructor entry from a malformed/older-classpath peer response whose `parameters` field is entirely absent crashes Phase 2 class resolution with a silently swallowed `TypeError`, leaving later methods/constructors in that class unresolved (no `resolvedReturnType`, no `docu`, no linked parameters). This is precisely the "malformed/older classpath response" scenario SEC-03 and its cited `P61-D2-003` precedent exist to prevent, and it is not a truncation/rejection outcome — it is an uncontrolled crash papered over by a catch-all `console.error`. No test in the phase's own `java-interop-peer-guard.test.ts` exercises this case.

2. **CR-01 (SEC-03 D-02, delivered by the SEC-04 plan):** Hover's javadoc-file `MethodDoc` fallback path (distinct from the live interop-peer path, and distinct from the `ClassDoc`-shaped fallback that `javadoc-markdown-escape.test.ts` does cover) renders a method's name and every parameter's name completely unbounded — only the javadoc body text is length-checked on this path. `111-CONTEXT.md`'s D-02 explicitly calls for hover's fallback path to be bounded, and the phase's own threat model (`T-111-13`) claims this DoS vector as "mitigate"d, which is not fully true for this branch.

Both gaps were code-review findings already documented in `111-REVIEW.md` (status: `issues_found`, 2 critical) before this verification; this verification independently confirms neither has been fixed in the code that reached HEAD, and that the phase's own regression suites do not cover either failing case.

No deferred items apply — neither gap is addressed by a later phase's roadmap goal or success criteria (checked against `.planning/ROADMAP.md`'s subsequent phases; Phase 114/116/121 cover unrelated FIX-04/TEST-06/`JavaInteropService`-split scope per `111-CONTEXT.md`'s own "Not in scope" list).

---

_Verified: 2026-09-26_
_Verifier: Claude (gsd-verifier)_
