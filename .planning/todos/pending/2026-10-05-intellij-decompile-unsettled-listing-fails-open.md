---
created: 2026-10-05
title: IntelliJ - decompile accepts a listing that never settled in size
area: intellij
source: phase 130.1 security audit (T-130.1-20, accepted)
files: bbj-intellij/src/main/java/com/basis/bbj/intellij/tokenized/BbjLstCommand.java, bbj-intellij/src/test/java/com/basis/bbj/intellij/tokenized/BbjLstCommandTest.java
---

## Problem

`BbjLstCommand.waitForListing` (`BbjLstCommand.java:206-253`) returns when the listing's size is
unchanged OR when `SETTLE_LIMIT_MILLIS` (20 s) has passed. On the timeout path it returns without
a stable size, and `judgeListing` then accepts any non-empty listing without the tokenized magic.
If bbjlst returned before its output was flushed, Decompile & Replace could atomically install a
truncated program over the original. VS Code fails closed on the same path ("did not finish
writing", `bbj-vscode/src/decompile-io.ts:158-159`). No test covers it.

## What to do

Throw a `DecompileException` with the same text as VS Code when the limit passes without two equal
sizes, and add a JUnit test with a listing that keeps growing (injectable clock or a short limit).
Then close T-130.1-20 in `130.1-SECURITY.md`.
