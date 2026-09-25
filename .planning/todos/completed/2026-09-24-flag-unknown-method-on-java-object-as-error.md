---
created: 2026-09-24
title: Calling a method that does not exist on a Java object (e.g. BBjAPI().anyInvalidMethod()) is only a hideable warning
area: validation
severity: minor
files:

  - bbj-vscode/src/language/bbj-document-validator.ts (toDiagnostic downgrades linking errors to Warning; applyDiagnosticHierarchy Rules 1 and 2 suppress them)
  - bbj-vscode/src/language/bbj-scope.ts (MemberCall `member` scope for Java receivers)
  - bbj-vscode/src/language/bbj-linker.ts (MemberCall doLink template-string skip; BBjAPI synthetic fallback)
  - bbj-vscode/src/language/bbj-validator.ts (where a new MemberCall check would be registered)
---

## Problem

Reported by the user during Phase 106 UAT: `BBjAPI().anyInvalidMethod()` is not flagged at all in
the IDE.

It is in fact detected, but:

1. The member name does not resolve, so it becomes a generic linking error
   ("Could not resolve reference to NamedElement named 'anyInvalidMethod'."), which `toDiagnostic`
   downgrades to Warning like every non-cyclic linking error.
2. `applyDiagnosticHierarchy` then hides it: Rule 1 drops every linking error when the file has any
   parse error, and Rule 2 drops every warning when the file has any Error-severity diagnostic. In a
   real file with any other error the unknown method simply disappears.

As far as known, the bbjcpl on-save compile does not check Java method names either (they are
resolved at runtime), so nothing reports it.

## Evidence (probe with createBBjTestServices, 2026-09-24)

- `BBjAPI().anyInvalidMethod()`, `x! = BBjAPI().anyInvalidMethod()`, `api! = BBjAPI()` then
  `api!.anyInvalidMethod()`, and `declare java.lang.String s!` then `s!.anyInvalidMethod()` each give
  exactly one severity-2 (Warning) linking diagnostic on the member name.
- Adding a parse error elsewhere in the same snippet (`x = (1`) leaves only the parse error; the
  unknown-method warning is gone.

## Proposed approach

Main fix: a dedicated validation check on `MemberCall` that reports an **Error** such as
"Method 'anyInvalidMethod' is not defined on BBjAPI" (field wording for non-call access), only when
all of these hold (conservative, per the standing "builtin-call validation stays conservative" rule —
LSP flags only what it can be sure of):

- the receiver's inferred type is a `JavaClass` that Java interop has actually resolved (not the
  synthetic method-less `BBjAPI` fallback from `bbj-api.bbl`, not an unresolved/unknown type, not a
  BBj class, not a Java package);
- the name matches no method or field of that class including inherited ones (case-insensitive),
  honouring the static-only rule for class-reference receivers and the implicit `.class`;
- the receiver is not a template-string array field access (the linker already skips those).

Everything else keeps today's Warning. The Langium linking warning for the same reference should
be dropped when the new Error fires, so the user sees one diagnostic, not two.

Optional extras (can land alone, cheaper):

- Exempt unresolved Java member linking warnings from hierarchy Rule 2 so they survive when some
  other Error exists (Rule 1 behaviour for parse errors can stay).
- Replace the "NamedElement" wording in member linking messages with a readable one.

## Risks and acceptance

- False errors where interop describes a class incompletely (inherited/interface/default methods,
  varargs, classes loaded lazily or still cold — see the java-interop cold-resolution gotcha).
  Guard: only fire once the receiver class is fully resolved; add a setting to downgrade the new
  check to Warning.
- Acceptance: unit tests for each guard case (interop down, synthetic BBjAPI, BBj class receiver,
  static vs instance, inherited method, `.class`, template-string field, case-insensitive match);
  whole vitest suite green; a run over the conformance/real-code corpus shows no new Error-severity
  diagnostics beyond genuinely unknown members (review each new one by line shape before release).
