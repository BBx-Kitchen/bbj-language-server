---
created: 2026-10-05
title: IntelliJ Decompile & Replace - re-check isFileModified right before replacing
area: intellij
source: phase 130.1 code review (IN-04, IntelliJ half)
files: bbj-intellij/src/main/java/com/basis/bbj/intellij/tokenized/BbjTokenizedDecompiler.java
---

## Problem

`BbjTokenizedDecompiler.replace` (`BbjTokenizedDecompiler.java:87-96`) checks
`FileDocumentManager.isFileModified(file)` once, before the decompile, which can run for up to
60 s. An edit made in the editor during that time is not seen: `replaceInPlace` overwrites the
file and the reload that follows discards the edit. (The VS Code half of this finding, the
shadowed `client` locals, was fixed with the language client start change.)

## What to do

Re-check `isFileModified` in a read action immediately before `BbjLstCommand.replaceInPlace`, and
fail with the same "has unsaved changes" message, removing the private staging directory as the
other failure paths do. A test can stub the second check through the existing seams.
