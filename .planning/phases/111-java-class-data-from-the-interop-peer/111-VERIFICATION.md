---
phase: 111-java-class-data-from-the-interop-peer
verified: 2026-09-27T05:20:00Z
status: human_needed
score: 7/7 must-haves verified
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 6/6
  gaps_closed:
    - "G-111-2: the trailing BASIS `[Docs](https://documentation.basis.cloud/<path>)` link shipped in the installed javadoc was escaped into literal text alongside hostile link syntax; it now renders as a clickable 'Docs' hyperlink in hover (both the stored node.docu path and the javadoc-file fallback) and in completion, while every other link/image shape stays fully escaped"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Build both extensions (VS Code VSIX, IntelliJ plugin) from the final tree and hover a documented Java member that ends with the BASIS Docs link (e.g. `BBjGrid.isPaging`) in both editors"
    expected: "The trailing 'Docs' text at the end of the javadoc renders as a clickable hyperlink to documentation.basis.cloud in both editors; raw HTML markup and any other link/image syntax in the javadoc still show as literal text, with no remote resource loading"
    why_human: "Markdown-to-UI rendering (which text becomes a clickable hyperlink, whether raw HTML renders or stays literal) happens client-side in each IDE; not observable from server-side code or unit tests. This is the outstanding re-test of UAT test 2 after gap-closure plan 111-07; the raw-HTML part of test 2 was already confirmed OK by the user in IntelliJ, only the Docs-link fix itself remains to be re-confirmed visually"
---

# Phase 111: Java Class Data from the Interop Peer Verification Report

**Phase Goal:** Java class data supplied by the java-interop peer reaches the AST, hover, completion and quick fixes only after it is bounded, escaped and validated. Java class problems also read correctly: no spurious "has no container" log line, and an unresolved Java member stays visible with a message a BBj developer can understand.
**Verified:** 2026-09-27
**Status:** human_needed
**Re-verification:** Yes — after gap-closure plan 111-07 (commits `e850ffb0`, `61351658`), closing UAT gap G-111-2 found by human test 2 in `111-UAT.md`

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Criterion 1 (SEC-03): a peer response whose fields have the wrong type or exceed a fixed length is rejected or truncated before anything is copied into the class's documentation | ✓ VERIFIED | Unchanged since the 111-06 re-verification. `java-interop.ts:1236,1242` `method.parameters ??= [];` / `constructor.parameters ??= [];`. Not touched by 111-07 (`git diff --quiet ead3144c HEAD -- bbj-vscode/src/language/java-interop.ts` exits clean). |
| 2 | Criterion 2 (SEC-04): javadoc text containing Markdown control characters (`[`, `]`, `(`, `)`, backtick, `!`) shows literally in hover and completion; `<` is deliberately NOT escaped per the amended D-06 | ✓ VERIFIED (regression) | `escapeMarkdown`/`MARKDOWN_ESCAPE_PATTERN` in `java-peer-guard.ts` unchanged (`grep -cF 'const MARKDOWN_ESCAPE_PATTERN = /[\\\`[\]()!]/g;'` → 1; `grep -cF "text.replace(MARKDOWN_ESCAPE_PATTERN"` → 1). `javadoc-markdown-escape.test.ts`'s original 22 tests still pass unchanged inside the file's now-43-test run. |
| 2b | D-02 cross-cutting bound: hover's javadoc-file MethodDoc fallback bounds the method/parameter names it renders | ✓ VERIFIED | Unchanged since the 111-06 re-verification. `boundedJavadocName` at `bbj-hover.ts:249-251`, wired into `toMethodDocToMethodData`. Not part of 111-07's diff. |
| 2c | **New (SEC-04, UAT gap G-111-2):** exactly one trailing `[Docs](https://documentation.basis.cloud/<path>)` link — the one BASIS itself ships at the end of each documented member's installed javadoc — renders as a clickable hyperlink in hover (both the stored `node.docu` path and the javadoc-file fallback, which share one return statement) and in completion documentation. All other link/image shapes (13 spoof variants: other host, http scheme, other label, lowercase label, image syntax, host suffix, userinfo on either side of the host, embedded paren, whitespace in the URL, a link title, not-at-the-end, glued to the preceding word; plus a second link and a truncation-cut link) stay fully escaped, identical to `escapeMarkdown`'s own output | ✓ VERIFIED | `escapeJavadocMarkdown(text)` added to `java-peer-guard.ts` (`grep -c "export function escapeJavadocMarkdown"` → 1), built on the anchored, unflagged, ASCII-only-path pattern `TRAILING_BASIS_DOCS_LINK_PATTERN` (`grep -cF 'documentation\.basis\.cloud\/[A-Za-z0-9._/-]+\)\s*$/'` → 1 — confirms no widened allowlist). Wired at hover's single render-boundary return (`bbj-hover.ts:149` `escapeJavadocMarkdown(javaDoc?.javadoc ?? '')`; `escapeMarkdown(javaDoc?.javadoc` count is 0, `escapeMarkdown(javaDoc.signature)` count is 1 — signature escaping unchanged) and at completion's javadoc-body push (`bbj-completion-provider.ts:827` `escapeJavadocMarkdown(node.docu.javadoc)`; `escapeMarkdown(node.docu.javadoc)` count is 0; `escapeMarkdown(content)` (header fallback) count is 1; `toFenceSafeLine(node.docu.signature)` count is 1 — both unchanged). 21 new tests in `javadoc-markdown-escape.test.ts` (real `BBjGrid.isPaging` tail, all 13 spoof rows, two links, no link, trailing whitespace, truncation, plus hover-stored/hover-fallback/completion end-to-end cases) independently run and pass: `43 passed (43)`. `hover.test.ts` + `completion-test.test.ts` re-run together: `61 passed (61)`. `tsc -p tsconfig.json` exits 0. No new Critical/Warning findings in `111-REVIEW.md`'s third pass over the 111-07 diff. |
| 3 | Criterion 3 (SEC-05): the missing-USE quick fix and auto-import completion insert nothing for a class name that doesn't match the Java qualified-identifier pattern; valid names still get their `use` line | ✓ VERIFIED (regression) | Unchanged. `isJavaQualifiedName` untouched by 111-07 — not in its `files_modified`. |
| 4 | Criterion 4 (FIX-02): resolving code that uses `java.io`/`java.net` classes no longer logs "has no container" | ✓ VERIFIED (regression) | Unchanged. `bbj-scope-local.ts` untouched by 111-07. |
| 5 | Criterion 5 (FIX-03): in a file with an unrelated Error, the Warning for an unresolved Java member on an uncertain receiver is still shown, names the member without "NamedElement" | ✓ VERIFIED (regression) | Unchanged. `bbj-document-validator.ts` untouched by 111-07. |

**Score:** 7/7 truths verified (0 present-but-behavior-unverified)

### Gap Closure Verification (this re-verification's focus: UAT gap G-111-2, closed by plan 111-07)

| Gap (UAT finding) | Fix commits | Source evidence | Test evidence | Status |
|---|---|---|---|---|
| G-111-2: the vendor-shipped trailing `[Docs](https://documentation.basis.cloud/…)` link in installed javadoc was escaped into literal text by the blanket `escapeMarkdown`, alongside genuinely hostile link syntax | `e850ffb0` (hover), `61351658` (completion) | `java-peer-guard.ts`: `TRAILING_BASIS_DOCS_LINK_PATTERN` (anchored, unflagged, ASCII path charset `[A-Za-z0-9._/-]+`, lookbehind for start-of-text/whitespace, `\s*$` trailing anchor) and `escapeJavadocMarkdown(text)` (escapes everything before a matched link, re-appends the link verbatim; falls through to `escapeMarkdown` unchanged on no match). Wired at hover's one render-boundary return (covers both the stored `node.docu` path and the javadoc-file fallback) and at completion's javadoc-body push. Signature/header/fence treatment (`escapeMarkdown(javaDoc.signature)`, `escapeMarkdown(content)`, `toFenceSafeLine(node.docu.signature)`) confirmed unchanged by grep count. | 21 new tests in `javadoc-markdown-escape.test.ts` covering the real `BBjGrid.isPaging` tail, 13 spoof shapes, two links (only the trailing one stays a link), no link, trailing whitespace, and a truncation-cut link, plus hover-stored, hover-fallback and completion end-to-end cases; `43 passed (43)` run independently by this verifier. `hover.test.ts test/completion-test.test.ts` together: `61 passed (61)`. `tsc -p tsconfig.json`: exit 0. No planning identifiers in the source/test diff since `ead3144c` (grep returns no matches). `java-interop.ts`, `bbj-intellij`, `java-interop/` confirmed unchanged since `ead3144c`. | ✓ CLOSED |

### Regression Check (previously-verified truths 1, 2, 2b, 3, 4, 5)

| File | Touched by 111-07? | Confirmed | Test result |
|---|---|---|---|
| `java-interop.ts` | No | `git diff --quiet ead3144c HEAD -- bbj-vscode/src/language/java-interop.ts` exits 0 | n/a |
| `bbj-scope-local.ts` | No | Not in 111-07's `files_modified` | n/a |
| `bbj-document-validator.ts` | No | Not in 111-07's `files_modified` | n/a |
| `bbj-code-action-provider.ts` | No | Not in 111-07's `files_modified` | n/a |
| `java-peer-guard.ts` | Yes — new function added, existing `escapeMarkdown`/`MARKDOWN_ESCAPE_PATTERN` body and doc-comment-only changes | `grep` confirms escape pattern and function body text unchanged (checks above) | `javadoc-markdown-escape.test.ts`: 43/43 |
| `bbj-hover.ts` | Yes — one call-site swap (javadoc body arg only) | Signature arg untouched (`escapeMarkdown(javaDoc.signature)` count 1) | `hover.test.ts`: 17/17 (part of the 61/61 joint run) |
| `bbj-completion-provider.ts` | Yes — one call-site swap (javadoc body arg only) | Header/fence args untouched (grep counts confirmed) | `completion-test.test.ts`: part of the 61/61 joint run |

Ran independently by this verifier (`--maxWorkers=2`): `test/javadoc-markdown-escape.test.ts` → `43 passed (43)`; `test/hover.test.ts test/completion-test.test.ts` → `61 passed (61)`. No regressions.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `bbj-vscode/src/language/java-peer-guard.ts` | Shared plain module: bounds, escape, qualified-name check, and (new) `escapeJavadocMarkdown` trailing-link exemption | ✓ VERIFIED | `escapeJavadocMarkdown` present, `TRAILING_BASIS_DOCS_LINK_PATTERN` matches only the exact allowlisted shape |
| `bbj-vscode/src/language/java-interop.ts` | Guarded `resolveClass()`, `parameters` defaulting | ✓ VERIFIED | Unchanged since 111-06; not part of 111-07 |
| `bbj-vscode/src/language/bbj-hover.ts` | Escaped + bounded Java hover content on every path, now with the trailing Docs link exempted | ✓ VERIFIED | `escapeJavadocMarkdown(javaDoc?.javadoc ?? '')` wired at the single return statement covering both hover paths |
| `bbj-vscode/src/language/bbj-completion-provider.ts` | Escaped Java completion documentation, fence-safe signature, now with the trailing Docs link exempted | ✓ VERIFIED | `escapeJavadocMarkdown(node.docu.javadoc)` wired; fence and header fallback untouched |
| `bbj-vscode/src/language/bbj-code-action-provider.ts` | `isJavaQualifiedName` gates `createUseAction` | ✓ VERIFIED | Unchanged; not part of 111-07 |
| `bbj-vscode/src/language/bbj-document-validator.ts` | `javaMemberAccess` flag, Rule 2 exemption, reworded message | ✓ VERIFIED | Unchanged; not part of 111-07 |
| `bbj-vscode/src/language/bbj-scope-local.ts` | Package-name pre-flight check | ✓ VERIFIED | Unchanged; not part of 111-07 |
| `bbj-vscode/test/javadoc-markdown-escape.test.ts` | SEC-04 regression suite, now covering the trailing-link exemption end to end | ✓ VERIFIED | 43 tests (was 22), all pass |
| `.planning/phases/.../111-CONTEXT.md` | Amendment recorded next to D-06 | ✓ VERIFIED | `2026-09-27, UAT gap G-111-2` paragraph present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `bbj-hover.ts getAstNodeHoverContent` return statement (both stored and fallback paths) | `java-peer-guard.ts escapeJavadocMarkdown` | the javadoc argument of `createMarkdownContent` | ✓ WIRED | New in 111-07; confirmed at `bbj-hover.ts:149` |
| `bbj-completion-provider.ts createReferenceCompletionItem` documentation parts | `java-peer-guard.ts escapeJavadocMarkdown` | `parts.push` of the javadoc body | ✓ WIRED | New in 111-07; confirmed at `bbj-completion-provider.ts:827` |
| `escapeJavadocMarkdown` | `escapeMarkdown` | the text before the matched link (or the whole text when nothing matches) goes through `escapeMarkdown` | ✓ WIRED | Confirmed at `java-peer-guard.ts:331,333` |
| (all key links from the initial and 111-06 re-verification) | | | ✓ WIRED | Unchanged; carried forward from the prior VERIFICATION.md, none touched by 111-07 |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| The real `BBjGrid.isPaging` tail, 13 spoof shapes, two links, no link, trailing whitespace and a truncation-cut link resolve exactly as specified through `escapeJavadocMarkdown` and its wiring into hover (both paths) and completion | `npx vitest run test/javadoc-markdown-escape.test.ts --maxWorkers=2` | `43 passed (43)` | ✓ PASS — G-111-2 closed |
| `hover.test.ts` and `completion-test.test.ts` unaffected | `npx vitest run test/hover.test.ts test/completion-test.test.ts --maxWorkers=2` | `61 passed (61)` | ✓ PASS |
| TypeScript compiles clean | `npx tsc -p tsconfig.json` | exit 0, no output | ✓ PASS |
| No planning identifiers introduced in source/test diff since `ead3144c` | `git diff ead3144c HEAD -- bbj-vscode/src bbj-vscode/test \| grep '^\+' \| grep -E '<pattern>'` | no matches | ✓ PASS |
| `java-interop.ts`/`bbj-intellij`/`java-interop/` untouched | `git diff --quiet ead3144c HEAD -- ...` | exits 0 | ✓ PASS |

### Whole-Suite Regression Check

Per the orchestrator-supplied and 111-07-SUMMARY-recorded evidence (not re-run in full here, per the "run the full suite at most once" constraint): whole suite after 111-07 (`--maxWorkers=2`) = 3105 tests, 11 failed, all `test/linking.test.ts > Interop related tests` — identical in name and count to the documented pre-phase baseline and to the prior (111-06) re-verification's whole-suite check (local BBjServices-on-`:5008` environment drift, not a regression). This verifier independently confirmed the targeted 111-07 test files pass: `javadoc-markdown-escape.test.ts` 43/43, `hover.test.ts`+`completion-test.test.ts` 61/61, and `tsc -p tsconfig.json` exits 0.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| SEC-03 | 111-01-PLAN.md, closed by 111-06-PLAN.md | java-interop peer response fields checked for type/length before copy into AST documentation (#523) | ✓ SATISFIED | Unchanged since 111-06 re-verification; not touched by 111-07 |
| SEC-04 | 111-03-PLAN.md, D-02 bound closed by 111-06-PLAN.md, trailing-link exemption (UAT gap G-111-2) closed by 111-07-PLAN.md | Hover/completion escape Markdown control characters in peer javadoc (#524), except one narrowly allowlisted BASIS-shipped trailing Docs link (user amendment, 2026-09-27) | ✓ SATISFIED | Escaping correct and tested at every prior scope; the G-111-2 exemption is narrowly allowlisted, tested against 13 spoof shapes plus multi-link and truncation cases, and does not widen scope beyond what the user asked for |
| SEC-05 | 111-05-PLAN.md | Missing-USE quick fix and auto-import completion insert only Java-qualified names (#525) | ✓ SATISFIED | Unchanged; not touched by 111-07 |
| FIX-02 | 111-04-PLAN.md | "has no container" log line gone; bare-package caller fixed (#676) | ✓ SATISFIED | Unchanged; not touched by 111-07 |
| FIX-03 | 111-02-PLAN.md | Unresolved Java member Warning survives an unrelated Error; message reworded (todo 2026-09-24) | ✓ SATISFIED | Unchanged; not touched by 111-07 |

No orphaned requirements: 111-07's frontmatter declares only `SEC-04` (the requirement whose UAT gap it closes), which is already mapped to Phase 111 in `.planning/REQUIREMENTS.md`.

Note: `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` still show SEC-03/SEC-04/SEC-05/FIX-02/FIX-03 as `[ ]`/"Gaps Found" as of this verification — 111-07's own plan deliberately left them unflipped, instructing the phase re-verification to decide. This verification finds all 5 requirements satisfied; those checkmarks should be updated as part of phase closeout, not by this report.

### Anti-Patterns Found

No debt markers (`TBD`/`FIXME`/`XXX`), warning markers (`TODO`/`HACK`/`PLACEHOLDER`), or stub patterns found in `java-peer-guard.ts`, `bbj-hover.ts`, `bbj-completion-provider.ts`, or `javadoc-markdown-escape.test.ts` (the files 111-07 modified). No planning identifiers (`D-NN`, `SEC-/FIX- ids`, `111-0N` plan numbers, `G-111-N` gap ids, `CR-/WR-/IN-NN`, `T-111-NN`) appear in the source/test diff between `ead3144c` and `HEAD`.

One code-review **Warning** remains open, carried forward unchanged from the prior verification and confirmed still accurate by `111-REVIEW.md`'s third pass (`status: issues_found`, `warning: 1`):
- **WR-01** (no bound on member/parameter array *counts*, only string lengths): explicitly assessed and accepted by this phase's own threat model in `111-01-PLAN.md`'s `T-111-05`, re-affirmed unchanged in `111-06-PLAN.md`. Untouched by 111-07. This is a documented, deliberate scope decision, not an unaddressed gap or must-have failure.

111-07's own threat register (`T-111-27` through `T-111-30`) is all "mitigate"/"accept" at medium-or-lower severity (spoofing via lookalike link, tampering via partial/extra links, regex denial-of-service, page-choice spoofing) — none rated high, none open as an unmitigated finding; `111-REVIEW.md`'s third pass independently confirms the mitigations (anchored pattern, ASCII-only path charset, single-match `exec` with no `g` flag, sub-millisecond timing on the full javadoc corpus and a pathological 35,750-character input at planning time).

### Human Verification Required

1. **Trailing BASIS Docs link renders as a clickable hyperlink, raw HTML and other link syntax stay literal (re-test of UAT test 2 after gap-closure plan 111-07)**
   **Test:** Build both extensions (VS Code VSIX, IntelliJ plugin) from the final tree; hover a documented Java member whose javadoc ends with the BASIS Docs link (e.g. `BBjGrid.isPaging`) in both editors.
   **Expected:** The trailing "Docs" text renders as a clickable hyperlink to documentation.basis.cloud in both editors. Raw HTML markup and any other link/image syntax elsewhere in the javadoc still render as literal text, with no remote resource loading.
   **Why human:** Markdown-to-UI rendering happens client-side in each IDE; not observable from server-side code or unit tests. The raw-HTML half of this behavior was already confirmed OK by the user in IntelliJ during UAT test 2 (`111-UAT.md`); only the Docs-link fix from 111-07 still needs a visual re-confirmation.

### Gaps Summary

The one gap this re-verification targets is closed:

1. **G-111-2 (UAT test 2 finding) — CLOSED.** `escapeJavadocMarkdown` (`java-peer-guard.ts`, commits `e850ffb0`/`61351658`) narrowly exempts exactly one trailing `[Docs](https://documentation.basis.cloud/<path>)` link — matching only the exact shape BASIS itself ships at the end of every documented member's installed javadoc — from the blanket Markdown escape, at both hover render paths and at completion. Every other link/image shape, including a second such link and one cut by truncation, stays fully escaped, pinned by 21 new tests covering the real corpus tail, 13 adversarial spoof rows, and the multi-link/truncation edge cases. No widening of the escape allowlist beyond the user's exact request; no change to `java-interop.ts`, storage, or truncation. Independent code review (`111-REVIEW.md` third pass) found no new Critical or Warning issues.

No new gaps were introduced by 111-07: `java-interop.ts`, `bbj-scope-local.ts`, `bbj-document-validator.ts`, and `bbj-code-action-provider.ts` are all confirmed untouched, and their regression suites (already re-run at the prior 111-06 re-verification and unaffected by this plan) remain valid. The only open items are WR-01 (a documented, accepted scope decision, not a must-have) and the one human-verification item above.

Overall status is `human_needed` rather than `passed` solely because of the outstanding visual re-test of the now-fixed Docs link in real VS Code and IntelliJ builds — all automated and code-review evidence, including 21 new targeted tests and a clean independent code review, confirm the phase goal (including the UAT-amended SEC-04 scope) is achieved in code.

---

_Verified: 2026-09-27_
_Verifier: Claude (gsd-verifier)_
