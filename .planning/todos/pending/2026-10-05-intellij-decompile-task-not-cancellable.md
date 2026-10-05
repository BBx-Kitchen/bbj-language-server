---
created: 2026-10-05
title: IntelliJ - decompile progress task cannot be cancelled
area: intellij
source: phase 130.1 security audit (T-130.1-18 rationale)
files: bbj-intellij/src/main/java/com/basis/bbj/intellij/tokenized/BbjTokenizedDecompiler.java
---

## Problem

T-130.1-18 (a FIFO swapped in between the regular-file check and the open) was accepted partly
because the work runs "with a cancellable progress", but `BbjTokenizedDecompiler.java:62,73`
create the tasks with `canBeCancelled = false`. A blocked open would leave the "Decompiling…" task
hanging until the IDE restarts.

## What to do

Make both tasks cancellable and honour the indicator around the blocking steps (the probe open and
the bbjlst wait), then restore the original T-130.1-18 wording in `130.1-SECURITY.md`.
