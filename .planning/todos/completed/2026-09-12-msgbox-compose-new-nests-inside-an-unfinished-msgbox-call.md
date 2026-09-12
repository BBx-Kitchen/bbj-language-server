---
created: 2026-09-12T14:48:05.000Z
title: MSGBOX compose-new nests a second call inside an unfinished MSGBOX( call
area: composer
severity: minor
files:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/composer/ComposerLauncher.java
  - bbj-vscode/src/msgbox-composer.ts
  - bbj-vscode/src/msgbox-composer-ui.ts
  - bbj-vscode/src/msgbox-composer-webview.ts
---

## Problem

`x = MSGBOX(` and `x = MSGBOX()` decode as `found: false`, so both IDEs take the
compose-new path and insert a whole composed statement at the caret inside the
unfinished call (IntelliJ: `openMsgbox` → `insertAtCaret`).

A dialog does open, so no error is shown, but the result nests one call inside
the other.

This was found while diagnosing Phase 89 UAT gap G-89-3, whose CVS() counterpart
was fixed by giving the unfinished call a composable decode outcome and a
guarded replace of its span.

## What's needed

An unfinished-call decode outcome for MSGBOX and a guarded replace of the
partial call span, designed together with MSGBOX's own `replace` payload,
`sameMsgbox` and banner semantics rather than copied from CVS.

It belongs with Phase 90 (Composer Robustness), next to its success criterion
on re-resolving the MSGBOX target before an edit.

Deliberately not fixed in Phase 89.

## Resolution

Fixed in Phase 90:
- An unfinished MSGBOX call now decodes as a composable `incomplete` outcome
  instead of `found: false`.
- Every VS Code and IntelliJ entry point completes it in place through a
  guarded replace (plans 90-01 and 90-07), so the call is filled in rather than
  nested inside.
- QA rows VS Code 22 and IntelliJ 28 cover it going forward.
