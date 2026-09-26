---
phase: 111-java-class-data-from-the-interop-peer
reviewed: 2026-09-26T19:15:00Z
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

**Reviewed:** 2026-09-26
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

This is a re-review of the same 13-file scope after two gap-closure commits (`d1ef6a27`,
`2c0c169f`, plan 111-06) landed on top of the original phase 01-05 work reviewed in the prior
`111-REVIEW.md`. Both Critical findings from that review are now fixed and independently
confirmed against the current source and a live test run (`npx vitest run` across all six
affected test files: 147/147 passing). One Warning from the prior review is fixed as a
side effect of the gap-closure work; the other remains open, unaddressed, exactly as before.
No new defects were found in this pass beyond the one carried-forward Warning.

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

Unchanged. `java-peer-guard.ts`'s `sanitizeMemberArray`/`sanitizeParameters` still iterate the
full length of `fields`/`methods`/`constructors`/`parameters` with no cardinality cap; a class
description with an extreme number of tiny-but-valid entries is still processed and stored in
full. Neither gap-closure commit touched `java-peer-guard.ts` or added any such cap. Carried
forward below as the sole open finding.

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

_Reviewed: 2026-09-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
