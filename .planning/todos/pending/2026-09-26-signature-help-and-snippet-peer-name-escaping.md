---
created: 2026-09-26
title: Peer-supplied Java names can break out of the signature-help code fence and inject completion snippet variables
area: security
source: Phase 111 planning (111-03-PLAN.md threat model, transferred threat)
files:

  - bbj-vscode/src/language/bbj-signature-help-provider.ts (~l.110-115, Java signature inside a code fence)
  - bbj-vscode/src/language/bbj-completion-provider.ts (createReferenceCompletionItem snippet insertText `${N:name}`)

audit_acknowledged:
  milestone: v4.7
  at: 2026-09-29
---

## Problem

Phase 111 escapes Java documentation from the java-interop peer only in hover and in completion
documentation, which is the scope of its locked decision D-07. Two neighbouring outputs still take
peer-supplied names verbatim:

- Signature help puts peer method/parameter names inside a fenced code block. A name containing a
  backtick run or a line break can close the fence.
- Completion builds snippet placeholders `${1:paramName}` from parameter names. A peer-supplied
  name such as `${CLIPBOARD}` or containing `}`/`$` is interpreted as snippet syntax, so accepting
  the completion can insert clipboard contents or other variable text into the file.

Phase 111's SEC-03 guard bounds the length and type of these strings but does not constrain their
characters.

## Options

- Reuse the Phase 111 helper module: apply its fence-safe line helper in signature help, and add a
  snippet-escape (`\\`, `$`, `}`) for placeholder text, or reject parameter names that are not Java
  identifiers.
