---
created: 2026-10-04
completed: 2026-10-05
resolves_phase: 130.1
title: Skip syntax checking for line-numbered programs (at least in IntelliJ)
area: validation
source: Phase 128 UAT (2026-10-04)
files:
---

## Problem

When a line-numbered program is open, IntelliJ shows a large number of syntax errors. They are
noise: editing line-numbered code is not supported, and the only intended action is to denumber
the file (the banner and the Tools menu action from phase 128).

## What to do

When the language server detects that a document is line-numbered, it should send no parser or
validation diagnostics for it, or only one informational diagnostic that points to Denumber. This
applies at least in IntelliJ; decide whether VS Code should do the same. After denumbering, the
document should be validated normally again.
