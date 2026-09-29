---
phase: 111-java-class-data-from-the-interop-peer
reviewed: 2026-09-27T05:15:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - bbj-vscode/src/language/bbj-code-action-provider.ts
  - bbj-vscode/src/language/bbj-completion-provider.ts
  - bbj-vscode/src/language/bbj-document-validator.ts
  - bbj-vscode/src/language/bbj-hover.ts
  - bbj-vscode/src/language/bbj-scope-local.ts
  - bbj-vscode/src/language/java-interop.ts
  - bbj-vscode/src/language/java-peer-guard.ts
  - bbj-vscode/test/code-action.test.ts
  - bbj-vscode/test/java-interop-peer-guard.test.ts
  - bbj-vscode/test/java-package-name-collision.test.ts
  - bbj-vscode/test/java-qualified-name.test.ts
  - bbj-vscode/test/javadoc-markdown-escape.test.ts
  - bbj-vscode/test/unknown-java-member.test.ts
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 111: Code Review Report

**Reviewed:** 2026-09-27
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

This report now covers three passes over the same 13-file phase scope. The first standard pass
(2026-09-26 initial) found two Critical and two Warning issues in the original phase 01-05 work.
The second pass (2026-09-26 re-review, `d1ef6a27`/`2c0c169f`) confirmed both Criticals fixed and
one Warning resolved as a side effect, leaving one Warning open. This third pass reviews gap-closure
plan 111-07 (`git diff 001377ab..HEAD`), which adds `escapeJavadocMarkdown()` — a narrow exemption
that lets exactly one trailing `[Docs](https://documentation.basis.cloud/<path>)` link render as a
clickable hyperlink in Java hover and completion documentation, while every other Markdown
link/image shape (including a second such link, a truncated one, or a lookalike host/label/scheme)
stays fully escaped.

No new Critical or Warning issues were found in 111-07. The regex is correctly anchored, the
character class is ASCII-only and excludes `)`/backslash/whitespace (ruling out embedded parens,
percent-encoding, userinfo, query/fragment, titles, and catastrophic backtracking), both javadoc
render sites (hover's single return statement covering both the stored-`docu` and javadoc-file
fallback paths, and completion's `createReferenceCompletionItem`) go through the new helper, and
neither the hover/completion signature nor the `documentationHeader()` fallback was widened. The
sole carried-forward Warning (WR-01, no cardinality bound on peer-supplied arrays) is untouched by
this plan and remains open.

## Status of Prior Findings

### CR-01 (prior): Hover's javadoc-file `MethodDoc` fallback leaves the method/parameter names completely unbounded — **RESOLVED**

Fixed by `2c0c169f`. `bbj-hover.ts` now defines `boundedJavadocName(value, fallback)`
(`bbj-vscode/src/language/bbj-hover.ts:249-251`), which truncates a string javadoc-file name at
`MAX_JAVA_IDENTIFIER_LENGTH` and falls back to the JavaMethod node's own (already-bounded) name
when the value is not a string. `toMethodDocToMethodData` (lines 253-262) now routes both
`methodDoc.name` and every `params[i].name` through it before they reach `methodSignature`. Two
new tests in `javadoc-markdown-escape.test.ts` (`'the javadoc-file method fallback bounds an
oversized method name and parameter name in the hover signature'` and `'...falls back to the
method's own name'`) exercise exactly the previously-uncovered `isMethodDoc` branch and assert
both truncation and the non-string fallback. Verified: the fix reads correctly, the fallback
value (`node.name`) is itself bounded (it was validated by `sanitizeMemberArray` when the class
was resolved), and the escaping applied afterward at the hover return statement
(`escapeMarkdown(javaDoc.signature)`) still runs exactly once, not doubled.

### CR-02 (prior): A method/constructor entry with no `parameters` field at all crashes Phase 2 resolution — **RESOLVED**

Fixed by `d1ef6a27`. `java-interop.ts`'s Phase 1 loops now default the field right after setting
`$type`/`isStatic`/`deprecated` on each entry: `method.parameters ??= []`
(`bbj-vscode/src/language/java-interop.ts:1236`) and `constructor.parameters ??= []` (line 1242),
both applied before Phase 2 iterates `method.parameters.entries()` / `constructor.parameters`.
This mirrors the existing `javaClass.classes ??= []` / `fields ??= []` / `methods ??= []`
defaulting one section up, and runs after `sanitizeParameters` (`java-peer-guard.ts`), which by
contract deliberately leaves an absent `parameters` value untouched for exactly this kind of
caller-side default. Two new end-to-end tests in `java-interop-peer-guard.test.ts` pin the fix
through the real `resolveClassByName`/`resolveClass` pipeline: a method entry with no
`parameters` key (asserting the method after it still resolves its return/parameter types, and
that no `TypeError` reaches `console.error`), and the equivalent for a constructor entry,
additionally combined with an over-long constructor name in the same array to confirm the
existing drop logic and the new defaulting compose correctly. Verified: order of operations is
correct (`sanitizeJavaClassDto` runs before the Phase 1 loops, so a present-but-invalid
`parameters` array is already normalized to `[]` before the `??=` runs as a no-op).

### WR-01 (prior): No bound on the *number* of fields/methods/constructors/parameters a class entry may carry — **STILL OPEN**

Unchanged by any of the three passes to date, including 111-07. `java-peer-guard.ts`'s
`sanitizeMemberArray`/`sanitizeParameters` still iterate the full length of
`fields`/`methods`/`constructors`/`parameters` with no cardinality cap; a class description with
an extreme number of tiny-but-valid entries is still processed and stored in full. 111-07 touched
only the escaping helpers and the two hover/completion call sites; it did not add or remove any
array-length check. Carried forward below as the sole open finding.

### WR-02 (prior): `constructors` array sanitization has no dedicated regression test — **RESOLVED**

Fixed as a side effect of `d1ef6a27`'s new `'a constructor entry with no parameters key still
resolves fully'` describe block in `java-interop-peer-guard.test.ts`. Its second test
(`'a constructor entry with no parameters key gets parameters [], the constructor after it still
resolves, and an over-long constructor entry is dropped'`) puts a genuinely malformed entry
(`OVER_LIMIT_NAME` as the constructor's `name`) into the `constructors` array alongside two valid
entries and asserts `resolved.constructors` has length 2 — i.e. the malformed constructor is
dropped by `sanitizeMemberArray` the same way an oversized method entry already was. This
satisfies the original ask (a malformed-constructor case mirroring the existing
`wideClassBody()`/`resolveClassByName` method test). Verified by re-reading the test and
confirming it runs through `sanitizeMemberArray('constructors', 'returnType', true, false, ...)`,
the identical code path methods use.

## Re-Review 2026-09-27: Gap-Closure Plan 111-07 (trailing BASIS Docs link)

**Scope of this pass:** `git -C /home/coder/repos/bbj-language-server diff 001377ab..HEAD --
bbj-vscode` — `java-peer-guard.ts` (new `escapeJavadocMarkdown` + `TRAILING_BASIS_DOCS_LINK_PATTERN`),
`bbj-hover.ts` (one call-site swap), `bbj-completion-provider.ts` (one call-site swap), and 21 new
tests in `javadoc-markdown-escape.test.ts`.

**Adversarial checks performed (all held):**

- **Host confusion:** the pattern's literal `documentation\.basis\.cloud` has both dots properly
  backslash-escaped, so no arbitrary character can substitute for `.`. The path character class
  (`[A-Za-z0-9._/-]+`) is ASCII-only and contains no `@`, `%%`, `:`, or non-ASCII code point, so a
  URL cannot smuggle userinfo, percent-encoded characters, a port, or a Unicode-confusable host
  segment. Confirmed against the test matrix's "host suffix", "userinfo after host", and "userinfo
  before host" rows, all of which stay fully escaped.
- **Lookbehind edge cases:** `(?<=^|\s)` correctly excludes image syntax (`!` immediately before
  `[` is not `\s`, confirmed by the "image" test row) and a link glued to a preceding word
  (confirmed by the "glued to the preceding word" row). JS's `\s` class additionally matches
  `U+00A0`/`U+FEFF`/`U+2028`/`U+2029`, which would let those particular whitespace-like characters
  also satisfy the lookbehind — this only widens what counts as a delimiter before an otherwise
  fully-constrained link (still fixed label/scheme/host), so it is not an exploitable widening.
- **CRLF / Unicode whitespace in the body:** verified with the real corpus data's `\r\r` separator
  and CRLF-after-link cases (existing tests); `\s*$` at the end correctly consumes a following
  `\r\n` verbatim as part of the exempted match, matching the "whitespace after the trailing Docs
  link is kept" test.
- **Multiple links:** traced the regex engine's leftmost-match-that-still-reaches-`$`-anchor
  behavior by hand for the "two Docs links" test case — a match starting at the earlier link
  cannot satisfy `\)\s*$` because non-whitespace text (the second link) follows it before the true
  end of string, so that starting position necessarily fails and the engine only succeeds at the
  trailing occurrence. Confirmed empirically via the passing test.
- **Truncation interaction:** `MAX_JAVADOC_LENGTH` truncation happens before `escapeJavadocMarkdown`
  runs (in `bbj-hover.ts`'s `truncateText(...)` call, prior to the escape at the return statement).
  A cut that lands inside the link removes the closing `)`, so the anchored pattern cannot match and
  the whole truncated text falls back to full `escapeMarkdown` — confirmed by the dedicated
  truncation test and traced by hand.
- **ReDoS:** ran the actual compiled pattern in Node against three adversarial 32KB-bounded inputs
  designed to maximize backtracking (repeated unclosed `[Docs](https://documentation.basis.cloud/`
  prefixes, a single 32KB unclosed prefix, and 700 glued repetitions) — all completed in well under
  0.11ms, consistent with the plan's own measured figures. No catastrophic-backtracking risk found;
  the path character class's exclusion of `)`, backslash, and whitespace keeps the greedy quantifier
  from re-trying many split points.
- **Render-site coverage:** grepped the full `src/language/` tree for every consumer of
  `escapeMarkdown`/`escapeJavadocMarkdown` and every read of a `.javadoc` field. Confirmed exactly
  two call sites use the new helper (`bbj-hover.ts:149`, `bbj-completion-provider.ts:827`), both are
  the javadoc-body arguments, and no other file renders `.docu.javadoc` as Markdown outside those two
  paths. The hover signature (`bbj-hover.ts:148`), the completion fenced signature
  (`toFenceSafeLine`, `bbj-completion-provider.ts:824`), and the `documentationHeader()` fallback
  (`bbj-completion-provider.ts:838`) are all unchanged and still fully escaped/fence-safe — matching
  plan 111-07's explicit prohibitions.
- **Test sanity:** read every assertion in the 21 new tests plus the two hover/completion tests
  against the actual implementation; each asserts either exact string equality against
  `escapeMarkdown(value)` (for the "stays escaped" cases) or an exact expected string containing the
  verbatim trailing link (for the "stays clickable" cases), not just a weaker substring/truthy check.
  Ran the file directly (`npx vitest run test/javadoc-markdown-escape.test.ts`): 43/43 passing. Ran
  `npx tsc -p tsconfig.json`: clean. Ran `hover.test.ts`/`completion-test.test.ts` with
  `--maxWorkers=2`: 58 passed, 3 skipped, one `beforeAll` hook-timeout suite failure with 0 failed
  tests — the known local worker-contention pattern, not a regression (matches the memorized
  baseline for this repo).

**Conclusion:** No Critical or Warning finding is introduced by 111-07. The exemption is as narrow
as the plan's prohibitions require, is exercised by tests that assert the real (not merely a
plausible) behavior, and does not touch the storage path, `java-interop.ts`, or the general
`escapeMarkdown` character set.

## Warnings

### WR-01: No bound on the *number* of fields/methods/constructors/parameters a class entry may carry

**File:** `bbj-vscode/src/language/java-peer-guard.ts:164-195` (`sanitizeMemberArray`),
`:137-153` (`sanitizeParameters`)

**Issue:** Every string-shaped field copied from the peer has a length bound
(`MAX_JAVA_IDENTIFIER_LENGTH`, `MAX_JAVADOC_LENGTH`, `MAX_PEER_ERROR_LENGTH`), but there is still
no bound on how many entries `fields`, `methods`, `constructors`, or a method's/constructor's
`parameters` may contain. `sanitizeMemberArray`/`sanitizeParameters` `.forEach` the entire array
regardless of size, so a class with, say, 500,000 tiny-but-valid field entries is still processed
and stored in full. This is a narrower version of the same "broken or hostile peer" threat model
SEC-03/issue #523 targets (an oversized response), just expressed as cardinality instead of
string length.

**Fix:** Add a fixed cap (e.g. a few thousand) on `fields.length`/`methods.length`/
`constructors.length`/`parameters.length` in `sanitizeMemberArray`/`sanitizeParameters`, dropping
(and noting) the excess the same way an individual oversized field is dropped today. If judged
out of scope, it is worth recording that decision explicitly (e.g. in `111-CONTEXT.md` or a
follow-up issue) rather than leaving it implicit and re-discovered on every review pass.

---

_Reviewed: 2026-09-27_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
