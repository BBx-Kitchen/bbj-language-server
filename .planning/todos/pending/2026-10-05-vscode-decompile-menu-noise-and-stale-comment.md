---
created: 2026-10-05
title: VS Code - Decompile Explorer entries show on every .bbj and extensionless file; stale comment says they have no menu entry
area: vscode
source: phase 130.1 code review (IN-01, IN-03)
files: bbj-vscode/package.json, bbj-vscode/src/Commands/target-resolution.ts
audit_acknowledged:
  milestone: v4.9
  at: 2026-10-05
---

## Problem

Two small items about the same menu entries.

- `target-resolution.ts:20-26` still says "The two Decompile commands have no menu entry". The
  Explorer entries exist now (`package.json:352-361`), so the comment is wrong.
- Those entries (`bbj.decompile`, `bbj.decompileReadonly`) show for every plain `.bbj` file and
  for every extensionless file (`resourceFilename =~ /^[^.]+$/`). The command itself is the
  content gate (it probes for the `<<bbj>>` header), so this is menu noise, not breakage.

## What to do

Reword the comment to say the Explorer entries exist and that the command checks the file content.
Drop the extensionless branch of the `when` clause, or keep it and document the trade-off next to
the clause; extensionless tokenized files (such as `tok3` in the hand-check fixtures) are the
reason it exists, so decide with that in mind.
