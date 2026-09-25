---
created: 2026-09-23
title: checkUseBeforeAssignment throws on a reference node without a symbol, silently skipping the check for that file
area: validation
resolves_phase: 107
severity: minor
files:

  - bbj-vscode/src/language/validations/check-variable-scoping.ts:62-67 (getSymbolRefName), :97-203 (checkUseBeforeAssignment)

audit_acknowledged:
  milestone: v4.5
  at: 2026-09-24
---

## Problem

`check-variable-scoping.ts`'s `getSymbolRefName` reads `expr.symbol.$refText` after `isSymbolRef(expr)`
has already narrowed `expr` to a `SymbolRef`-typed AST node. That narrowing only guarantees the
node's `$type`, not that its `symbol` cross-reference property was actually populated during
parsing — a `SymbolRef` node can exist with `symbol` itself `undefined` (not merely unresolved;
an unresolved reference still has a `symbol` object whose `.ref` is `undefined`, which is the
ordinary, already-handled case this file checks for elsewhere). When `expr.symbol` is `undefined`,
`getSymbolRefName` throws a plain `TypeError`.

`checkUseBeforeAssignment` calls `getSymbolRefName` inside its Pass 1 statement walk (assignment
left-hand sides, `FOR` loop init variables, `DREAD`/`READ`/`ENTER` targets). Since this check is
registered once per `Program`/`MethodDecl` node, the very first such node it encounters aborts the
whole check for that scope: Langium's `ValidationRegistry.handleException` catches the exception at
the top (it wraps every registered check), logs nothing user-facing, and lets the rest of validation
continue normally. The effect is silent: this specific check contributes no diagnostic at all for
that file's scope, but nothing in the harness output flags it as skipped — a use-before-assignment
hint that should have fired simply never does, and (separately) the file may still end up correctly
flagged by an unrelated diagnostic, which can make the file look "caught" for the wrong reason if
someone later tries to attribute its classification to this specific check.

## Investigation

In the Phase 104 endpoint-mode closing run's `details.json`, `checkExceptions` lists 2 entries, both
from the reject set, both carrying the identical message `An error occurred during validation:
Cannot read properties of undefined (reading '$refText')` — the same caveat 103-CONFORMANCE.md
recorded from the Phase 103 probe. Counts only; the 2 corpus files themselves are private and are
not read into this repository.

104-RESEARCH.md records 13 synthetic candidates tried during Phase 104 research (malformed `FOR`
targets, incomplete assignments, dangling brackets, keyword-shaped names, and several other
malformed-statement shapes) against `createBBjServices(EmptyFileSystem)` — none reproduced the
exception; each either parsed cleanly, produced an ordinary parser error, or produced the
already-handled "could not resolve reference" linking diagnostic.

This session's own probe (a scratch script built against `createBBjTestServices(EmptyFileSystem)`,
using the exact absolute-path import idiom `worker.mts` already uses, run and then deleted within
this session) went further: it built the 2 actual reject files from a pinned baseline checkout,
confirmed the exception and its stack trace match the description above, and walked each file's AST
for `SymbolRef` nodes whose `symbol` property is itself absent. Both files contain such a node as
the direct left-hand side of a plain assignment (`SymbolRef -> Assignment -> LetStatement -> Program`
in the AST), with the `SymbolRef`'s own `instanceAccess` flag `true` and a one-character CST node
(a lone instance-access sigil with nothing valid recognized after it as the mandatory reference
target).

Following that shape, a minimal synthetic snippet reproduced the exact same diagnostic message and
the exact same throw site. A single sigil alone in that position (`# = 1`) does **not** reproduce it
— the parser attaches that sigil to the *assignment's own* optional instance-access flag instead,
leaving the assignment's left-hand side unset entirely, which this check already guards against and
skips cleanly. **Two consecutive sigils** in that position do reproduce it: the first is consumed by
the assignment's own instance-access flag, and the second becomes the left-hand-side expression's
own instance-access flag with no reference target after it — exactly the corpus files' shape
(instance-access `true` on both the assignment and the inner reference node, one-character CST
span). The same broken shape also crashes a *different*, unrelated call site the same way
(`bbj-scope-local.ts`'s local-symbol collection, which reads the same `symbol.$refText` without a
guard) — that crash is **not** caught by Langium's validation registry, because it happens one build
phase earlier, during scope computation rather than validation. It was reproduced in the same
scratch session but is a separate call site from this todo's `files:` list and is left for the fix
author to note, not fixed or filed separately here.

## Reproduction

```bbj

## = 1

```

Confirmed (scratch session, `createBBjTestServices(EmptyFileSystem)`, string-input mode) to produce
a diagnostic whose message starts `An error occurred during validation`, with the same stack
(`getSymbolRefName` -> `checkUseBeforeAssignment` -> `ValidationRegistry.Program` ->
`ValidationRegistry.handleException`) as the 2 corpus reject files.

## Fix options for the next investigator

- Make `getSymbolRefName` defensive: `if (isSymbolRef(expr) && expr.symbol) { ... }` (or equivalent
  optional-chaining) so a `SymbolRef` node with no populated `symbol` cross-reference is treated the
  same as "nothing to record" rather than thrown. This is the minimal, narrowly-scoped fix for this
  file, but note it would NOT fix the separate `bbj-scope-local.ts` crash site found during this
  session's investigation (same missing-`symbol` shape, different unguarded read).
- Broader option: a shared helper (or a stricter `isSymbolRef`-adjacent type guard) that asserts a
  `SymbolRef`'s `symbol` cross-reference is actually present, used at every one of this file's own
  `.symbol.$refText`/`.symbol.ref` read sites (several already exist inline in Pass 2, all currently
  guarded only against `.ref` being unresolved, not against `.symbol` itself being absent) plus the
  `bbj-scope-local.ts` site noted above.
- Either fix should add a regression test built around the `## = <value>` shape (or an equivalent
  malformed-instance-access-target construct) asserting the check no longer throws and instead
  either produces no diagnostic or a well-formed one.
