---
phase: 111-java-class-data-from-the-interop-peer
verified: 2026-09-26T19:40:00Z
status: human_needed
score: 6/6 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 4/6
  gaps_closed:
    - "A peer response whose fields have the wrong type or exceed a fixed length is rejected or truncated before anything is copied into the class's documentation (SEC-03 / D-03) — the absent-`parameters`-key crash (CR-02)"
    - "Java class data reaching hover is bounded on every path, including the javadoc-file MethodDoc fallback (D-02) — the unbounded method/parameter name render (CR-01)"
  gaps_remaining: []
  regressions: []
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
**Status:** human_needed
**Re-verification:** Yes — after gap-closure plan 111-06 (commits `d1ef6a27`, `2c0c169f`, `593d5970`)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Criterion 1 (SEC-03): a peer response whose fields have the wrong type or exceed a fixed length is rejected or truncated before anything is copied into the class's documentation | ✓ VERIFIED | `java-interop.ts:1236` `method.parameters ??= [];` and `:1242` `constructor.parameters ??= [];` in `resolveClass` Phase 1, immediately preceding Phase 2's `.entries()`/`for...of` use of `parameters`. Confirmed by reading current source at HEAD `98aac7b1`. Two new end-to-end tests in `test/java-interop-peer-guard.test.ts` ("a method or constructor entry with no parameters key still resolves fully") exercise a method and a constructor with an absent `parameters` key through the real `resolveClassByName()`/`resolveClass()` pipeline; both pass (`30 passed (30)`, run independently, `--maxWorkers=1`). The previously-swallowed `TypeError` no longer occurs (tests assert `errorSpy` receives no `TypeError`). |
| 2 | Criterion 2 (SEC-04): javadoc text containing Markdown control characters (`[`, `]`, `(`, `)`, backtick, `!`) shows literally in hover and completion; `<` is deliberately NOT escaped per the amended D-06 | ✓ VERIFIED (regression) | Unchanged since initial verification. `escapeMarkdown`/`toFenceSafeLine` in `java-peer-guard.ts` (file untouched by 111-06 — `git diff --quiet 25ea70bd -- java-peer-guard.ts` exits 0). `test/javadoc-markdown-escape.test.ts` now runs 22 tests (was 20), all pass independently. |
| 2b | D-02 cross-cutting bound: hover's javadoc-file MethodDoc fallback path bounds the method/parameter names it renders, not just the javadoc body text | ✓ VERIFIED | `bbj-hover.ts:249-251` defines `boundedJavadocName(value, fallback)`: truncates a string at `MAX_JAVA_IDENTIFIER_LENGTH` via `truncateText`, else returns `fallback` (the node's own already-bounded name). `toMethodDocToMethodData` (lines 253-262) routes both `methodDoc.name` and every `params[i].name` through it. Two new tests in `javadoc-markdown-escape.test.ts` ("the javadoc-file method fallback bounds an oversized method name and parameter name in the hover signature", "a javadoc-file method entry whose names are not strings falls back to the method's own name...") exercise the previously-uncovered `isMethodDoc` branch with a 5,000-character name and a non-string name; both pass. `grep -cF "name: methodDoc.name"` on `bbj-hover.ts` returns 0 — the old unbounded copy is gone. The render-boundary `escapeMarkdown(javaDoc.signature)` call is unchanged and still runs exactly once (confirmed by reading lines 145-148). |
| 3 | Criterion 3 (SEC-05): the missing-USE quick fix and auto-import completion insert nothing for a class name that doesn't match the Java qualified-identifier pattern; valid names still get their `use` line | ✓ VERIFIED (regression) | Unchanged since initial verification. `isJavaQualifiedName` in `java-peer-guard.ts`, wired into `bbj-code-action-provider.ts`/`bbj-completion-provider.ts`. `test/java-qualified-name.test.ts` + `test/code-action.test.ts` re-run together with the other untouched suites: pass. |
| 4 | Criterion 4 (FIX-02): resolving code that uses `java.io`/`java.net` classes no longer logs "has no container"; the caller passing a bare package name is fixed and pinned by a test | ✓ VERIFIED (regression) | Unchanged since initial verification. `isKnownJavaPackage` guards `tryResolveJavaReference` in `bbj-scope-local.ts` (file untouched by 111-06). `test/java-package-name-collision.test.ts` re-run: passes. |
| 5 | Criterion 5 (FIX-03): in a file with an unrelated Error, the Warning for an unresolved Java member on an uncertain receiver is still shown, names the member without "NamedElement", and Rule 1 is unchanged | ✓ VERIFIED (regression) | Unchanged since initial verification. `isJavaMemberLinkingWarning`/`javaMemberLinkingMessage` wired into `applyDiagnosticHierarchy` Rule 2 and `processLinkingErrors` (file untouched by 111-06). `test/unknown-java-member.test.ts` + `test/bbj-document-validator.test.ts` re-run together: pass. |

**Score:** 6/6 truths verified (0 present-but-behavior-unverified)

### Gap Closure Verification (this re-verification's focus)

| Gap (prior finding) | Fix commit | Source evidence | Test evidence | Status |
|---|---|---|---|---|
| CR-02 / SEC-03: absent `parameters` key crashes Phase 2, silently swallowed | `d1ef6a27` | `java-interop.ts:1236,1242` — `method.parameters ??= [];` / `constructor.parameters ??= [];` added as the last statement of each Phase 1 member loop, before Phase 2 registration | 2 new tests in `java-interop-peer-guard.test.ts` through the real `resolveClass()` pipeline; `30 passed (30)` independently run | ✓ CLOSED |
| CR-01 / D-02: hover's javadoc-file MethodDoc fallback renders unbounded method/parameter names | `2c0c169f` | `bbj-hover.ts:249-251,258-259` — `boundedJavadocName` helper wired into `toMethodDocToMethodData` for both the method name and every parameter name | 2 new tests in `javadoc-markdown-escape.test.ts`; `22 passed (22)` independently run | ✓ CLOSED |

### Regression Check (previously-verified truths 2, 3, 4, 5)

| File (untouched by 111-06) | Confirmed unchanged | Test result |
|---|---|---|
| `java-peer-guard.ts` | `git diff --quiet 25ea70bd -- bbj-vscode/src/language/java-peer-guard.ts` exits 0 | n/a |
| `bbj-completion-provider.ts` | Not in 111-06's `files_modified` | included in `code-action.test.ts` run: pass |
| `bbj-code-action-provider.ts` | Not in 111-06's `files_modified` | `code-action.test.ts`: pass |
| `bbj-document-validator.ts` | Not in 111-06's `files_modified` | `bbj-document-validator.test.ts`: pass |
| `bbj-scope-local.ts` | Not in 111-06's `files_modified` | `java-package-name-collision.test.ts`: pass |

Ran independently (`--maxWorkers=2`): `test/java-qualified-name.test.ts test/code-action.test.ts test/java-package-name-collision.test.ts test/unknown-java-member.test.ts test/bbj-document-validator.test.ts` → `106 passed (106)`. No regressions.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/java-peer-guard.ts` | Shared plain module: bounds, escape, qualified-name check | ✓ VERIFIED | Unchanged since initial verification; confirmed untouched by 111-06 |
| `bbj-vscode/src/language/java-interop.ts` | Guarded `resolveClass()`/`loadImplicitImports()`, package-collision handling, `parameters` defaulting | ✓ VERIFIED | `method.parameters ??= []` / `constructor.parameters ??= []` now present in Phase 1 (gap 1 closed) |
| `bbj-vscode/src/language/bbj-hover.ts` | Escaped + bounded Java hover content on every path | ✓ VERIFIED | `boundedJavadocName` now bounds the MethodDoc fallback's names (gap 2 closed) |
| `bbj-vscode/src/language/bbj-completion-provider.ts` | Escaped Java completion documentation, fence-safe signature | ✓ VERIFIED | Unchanged; tests pass |
| `bbj-vscode/src/language/bbj-code-action-provider.ts` | `isJavaQualifiedName` gates `createUseAction` | ✓ VERIFIED | Unchanged; tests pass |
| `bbj-vscode/src/language/bbj-document-validator.ts` | `javaMemberAccess` flag, Rule 2 exemption, reworded message | ✓ VERIFIED | Unchanged; tests pass |
| `bbj-vscode/src/language/bbj-scope-local.ts` | Package-name pre-flight check | ✓ VERIFIED | Unchanged; tests pass |
| `bbj-vscode/test/java-interop-peer-guard.test.ts` | SEC-03 regression suite, now covering the absent-`parameters` case | ✓ VERIFIED | 30 tests (was 28), all pass |
| `bbj-vscode/test/javadoc-markdown-escape.test.ts` | SEC-04 regression suite, now covering the `isMethodDoc` fallback branch | ✓ VERIFIED | 22 tests (was 20), all pass |
| `bbj-vscode/test/java-qualified-name.test.ts`, `test/code-action.test.ts` | SEC-05 regression suite | ✓ VERIFIED | Unchanged; pass |
| `bbj-vscode/test/java-package-name-collision.test.ts` | FIX-02 regression suite | ✓ VERIFIED | Unchanged; pass |
| `bbj-vscode/test/unknown-java-member.test.ts` | FIX-03 regression suite | ✓ VERIFIED | Unchanged; pass |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `JavaInteropService.resolveClass` entry | `isUsableJavaClassName` | class-name check before `canonicalJavaClassName` | ✓ WIRED | Confirmed in source, unchanged |
| `JavaInteropService.resolveClass` (before `storeJavaClass`) | `sanitizeJavaClassDto` | in-place DTO sanitation | ✓ WIRED | Confirmed in source, unchanged |
| `resolveClass` Phase 1 member loops | Phase 2 `method.parameters.entries()` / `for...of constructor.parameters` | `method.parameters ??= []` / `constructor.parameters ??= []` before `resolvedClasses` registration | ✓ WIRED | New in 111-06; confirmed at `java-interop.ts:1236,1242`, precedes registration at line 1249 |
| `BBjHoverProvider.getAstNodeHoverContent` (Java branch) | `escapeMarkdown` | escaped return | ✓ WIRED | Confirmed; now covers both the fallback's text and its names (gap 2 closed) |
| `bbj-hover.ts toMethodDocToMethodData` | `truncateText` via `boundedJavadocName` | bounded method/parameter name | ✓ WIRED | New in 111-06; confirmed at `bbj-hover.ts:249-251,258-259` |
| `BBjCompletionProvider.createReferenceCompletionItem` | `toFenceSafeLine`/`escapeMarkdown` | fenced signature / javadoc part | ✓ WIRED | Confirmed, unchanged |
| `bbj-scope-local.ts tryResolveJavaReference` | `isKnownJavaPackage` | early package check, all 4 callers funnel through | ✓ WIRED | Confirmed, unchanged |
| `applyDiagnosticHierarchy` Rule 2 | `isJavaMemberLinkingWarning` | second exemption beside `isDowngradedSyntaxWarning` | ✓ WIRED | Confirmed, unchanged |
| `bbj-code-action-provider.ts`/`bbj-completion-provider.ts` | `isJavaQualifiedName` | insert-boundary gate before `use` edit | ✓ WIRED | Confirmed, unchanged |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| A method/constructor entry with no `parameters` key resolves fully (no swallowed TypeError) | `npx vitest run test/java-interop-peer-guard.test.ts --maxWorkers=1` | `30 passed (30)` | ✓ PASS — gap 1 closed |
| Oversized/non-string javadoc-file method/parameter names are bounded on hover's fallback | `npx vitest run test/javadoc-markdown-escape.test.ts --maxWorkers=1` | `22 passed (22)` | ✓ PASS — gap 2 closed |
| `hover.test.ts` unaffected | `npx vitest run test/hover.test.ts --maxWorkers=1` | `17 passed (17)` | ✓ PASS |
| SEC-05/FIX-02/FIX-03 regression suites unaffected | `npx vitest run test/java-qualified-name.test.ts test/code-action.test.ts test/java-package-name-collision.test.ts test/unknown-java-member.test.ts test/bbj-document-validator.test.ts --maxWorkers=2` | `106 passed (106)` | ✓ PASS |
| TypeScript compiles clean | `npx tsc -p tsconfig.json` | exit 0, no output | ✓ PASS |
| Combined 111-06 + hover.test.ts + surrounding suites (contention check) | `npx vitest run test/java-interop-peer-guard.test.ts test/javadoc-markdown-escape.test.ts test/hover.test.ts test/java-interop-nested-class-names.test.ts test/java-interop-service.test.ts test/inlay-hints-javadoc.test.ts --maxWorkers=2` | 1 "Failed Suite" (`hover.test.ts` `beforeAll` "Hook timed out in 10000ms", 0 failed tests, 103 passed + 3 skipped) — re-run of `hover.test.ts` alone (`--maxWorkers=1`) passed 17/17, confirming worker contention, not a regression, per the plan's own documented pattern | ✓ PASS (contention, not failure) |

### Whole-Suite Regression Check

Per orchestrator-supplied evidence (not re-run in full here, per the "run the full suite at most once" constraint): whole suite at HEAD `593d5970` (`--maxWorkers=2`) = 3084 tests, 11 failed, all `test/linking.test.ts > Interop related tests` — identical in name and count to the documented pre-phase baseline (local BBjServices-on-`:5008` environment drift, not a regression). This verifier independently confirmed all six phase-111-affected targeted test files plus the four adjacent 111-06 read-list files pass (`java-interop-peer-guard.test.ts` 30/30, `javadoc-markdown-escape.test.ts` 22/22, `hover.test.ts` 17/17 isolated, `java-qualified-name.test.ts`/`code-action.test.ts`/`java-package-name-collision.test.ts`/`unknown-java-member.test.ts`/`bbj-document-validator.test.ts` 106/106), and `tsc -p tsconfig.json` exits 0.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| SEC-03 | 111-01-PLAN.md, closed by 111-06-PLAN.md | java-interop peer response fields checked for type/length before copy into AST documentation (#523) | ✓ SATISFIED | Bounding is correct for every field kind including the previously-crashing absent-`parameters` case; pinned by 2 new end-to-end tests |
| SEC-04 | 111-03-PLAN.md, D-02 bound closed by 111-06-PLAN.md | Hover/completion escape Markdown control characters in peer javadoc (#524) | ✓ SATISFIED | Escaping correct and tested; the co-located D-02 bound on the MethodDoc fallback names is now also closed and tested |
| SEC-05 | 111-05-PLAN.md | Missing-USE quick fix and auto-import completion insert only Java-qualified names (#525) | ✓ SATISFIED | `isJavaQualifiedName` wired at both call sites, tested; regression confirmed |
| FIX-02 | 111-04-PLAN.md | "has no container" log line gone; bare-package caller fixed (#676) | ✓ SATISFIED | `isKnownJavaPackage` guard confirmed, tested; regression confirmed |
| FIX-03 | 111-02-PLAN.md | Unresolved Java member Warning survives an unrelated Error; message reworded (todo 2026-09-24) | ✓ SATISFIED | `isJavaMemberLinkingWarning`/`javaMemberLinkingMessage` confirmed, tested; regression confirmed |

No orphaned requirements: all 5 requirement IDs declared in `111-CONTEXT.md` (SEC-03, SEC-04, SEC-05, FIX-02, FIX-03) are each claimed by exactly one plan's frontmatter `requirements:` field (SEC-03/SEC-04 additionally claimed by the gap-closure plan `111-06-PLAN.md`), matching `.planning/REQUIREMENTS.md`'s Phase 111 mapping.

Note: `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` still show SEC-03/SEC-04/SEC-05/FIX-02/FIX-03 as `[ ]`/"Gaps Found" as of this verification (111-06's own plan deliberately left them unflipped, instructing the phase verifier to do so). This verification finds all 5 requirements now satisfied; those checkmarks should be updated as part of phase closeout, not by this report.

### Anti-Patterns Found

No debt markers (`TBD`/`FIXME`/`XXX`), warning markers (`TODO`/`HACK`/`PLACEHOLDER`), or stub patterns found in `java-interop.ts` or `bbj-hover.ts` (the two files 111-06 modified) or in the two modified test files. No planning identifiers (`D-NN`, `SEC-/FIX- ids`, `111-0N` plan numbers, `CR-/WR-/IN-NN`, `T-111-NN`) appear in the source/test diff between `25ea70bd` and `HEAD` (`git diff 25ea70bd HEAD -- bbj-vscode/src bbj-vscode/test | grep '^\+' | grep -E '...'` returns no matches).

One code-review **Warning** remains open, carried forward unchanged from the initial verification and confirmed still accurate by `111-REVIEW.md`'s re-review (`status: issues_found`, `warning: 1`):
- **WR-01** (no bound on member/parameter array *counts*, only string lengths): explicitly assessed and accepted by this phase's own threat model in both `111-01-PLAN.md` (`T-111-05`) and `111-06-PLAN.md` (same `T-111-05`, re-affirmed "Unchanged from the SEC-03 plan: the JSON-RPC answer is fully in memory before any guard runs, so a count cap would not reduce peak memory."). This is a documented, deliberate scope decision, not an unaddressed gap or must-have failure.

WR-02 (no dedicated `constructors`-array regression test) from the initial verification's review is now resolved as a side effect of 111-06's constructor test case (confirmed in `111-REVIEW.md`'s "Status of Prior Findings" section).

### Human Verification Required

These two items are unchanged from the initial verification — they concern client-side Markdown/HTML rendering, which is orthogonal to both gaps this re-verification closes, and remain open:

1. **Hover rendering in real IDEs**
   **Test:** Build both extensions (VS Code VSIX, IntelliJ plugin), hover `java.util.HashMap.put` and a BBjAPI method with javadoc in both editors.
   **Expected:** Text reads naturally, no stray clickable link or embedded remote image renders.
   **Why human:** Markdown-to-UI rendering happens client-side in each IDE; not observable from server code or unit tests.

2. **IntelliJ raw-HTML javadoc tag behavior**
   **Test:** In IntelliJ/LSP4IJ, hover a Java element whose javadoc contains a raw HTML tag (e.g. `<img src=…>`).
   **Expected:** No remote resource loads. If LSP4IJ renders raw HTML unlike VS Code (which strips it), the amended D-06 decision (leaving `<` unescaped) should be revisited per `111-CONTEXT.md`'s own note.
   **Why human:** `111-CONTEXT.md` and `111-03-SUMMARY.md` explicitly flag this as unverified (Assumption A3), deferred to UAT.

### Gaps Summary

Both prior BLOCKER-level gaps are closed:

1. **CR-02 (SEC-03/D-03) — CLOSED.** `method.parameters ??= []` and `constructor.parameters ??= []`, added in `resolveClass` Phase 1 (`java-interop.ts:1236,1242`, commit `d1ef6a27`), stop the Phase 2 `TypeError` on an absent `parameters` key. Two new end-to-end tests through the real `resolveClass()` pipeline confirm the class resolves fully and no `TypeError` reaches `console.error`.
2. **CR-01 (SEC-03 D-02, delivered by the SEC-04 plan) — CLOSED.** `boundedJavadocName` (`bbj-hover.ts:249-251`, commit `2c0c169f`) truncates the method name and every parameter name hover's javadoc-file `MethodDoc` fallback renders, falling back to the node's own already-bounded name for a non-string value. Two new tests confirm both the truncation and the non-string fallback.

No new gaps were introduced by the gap-closure plan: `java-peer-guard.ts`, `bbj-completion-provider.ts`, `bbj-code-action-provider.ts`, `bbj-document-validator.ts`, and `bbj-scope-local.ts` are all confirmed untouched, and their regression suites pass unchanged. The only open item is WR-01, which remains a documented, accepted scope decision (not a must-have), and the two human-verification items, which are unrelated to the gaps closed and were already flagged prior to this re-verification.

Overall status is `human_needed` rather than `passed` solely because of the two carried-forward, IDE-rendering-only human verification items — both automated and code-review evidence confirm the phase goal, including both previously-failing criteria, is now achieved.

---

_Verified: 2026-09-26_
_Verifier: Claude (gsd-verifier)_
