---
created: 2026-09-24
title: Exempt unresolved Java member linking warnings from hierarchy Rule 2, and reword the "NamedElement" linking message
area: validation
severity: minor
files:

  - bbj-vscode/src/language/bbj-document-validator.ts (applyDiagnosticHierarchy Rule 2)
  - bbj-vscode/src/language/bbj-linker.ts (member linking diagnostic wording)

audit_acknowledged:
  milestone: v4.6
  at: 2026-09-26
---

## Problem

Phase 107 (VAL-03) added a dedicated Error for a method or field call that does not exist on a
fully resolved Java class, but only when the check's own conservative guards are all satisfied. On
an uncertain receiver, today's Langium linking Warning ("Could not resolve reference to
NamedElement named '...'") still fires instead, and `applyDiagnosticHierarchy`'s Rule 2 still hides
that Warning whenever the same file has any other Error-severity diagnostic -- so an unresolved
Java member on an uncertain receiver can still disappear from view in a file that has an unrelated
error elsewhere, exactly like the case VAL-03 fixed for a *certain* receiver.

Separately, the linking Warning's own wording says "NamedElement" -- an internal Langium type name,
not readable to a BBj developer.

## Deferred from

Phase 107 discussion (`.planning/phases/107-validation-false-alarms-silent-skips/107-CONTEXT.md`,
Deferred Ideas) and the original folded todo's own "Optional extras" section
(`.planning/todos/completed/2026-09-24-flag-unknown-method-on-java-object-as-error.md`). VAL-03's
main check (D-10) was built; both extras were explicitly left unbuilt.

## Options

- Exempt an unresolved Java member linking warning from hierarchy Rule 2 specifically, so it
  survives when some other Error exists in the same file, while Rule 1's parse-error behavior stays
  as it is today.
- Reword the member linking message so it names the member and its expected owner instead of
  Langium's internal "NamedElement" type name.

## Not scheduled

A setting to downgrade the VAL-03 Error itself to a Warning (D-11) stays unbuilt -- the check's
guards are the only mitigation for a false positive today. Revisit only if false positives are
reported after this phase ships.
