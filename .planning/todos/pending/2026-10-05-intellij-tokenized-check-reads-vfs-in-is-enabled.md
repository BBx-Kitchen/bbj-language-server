---
created: 2026-10-05
title: IntelliJ - blocking virtual file system read inside LSPClientFeatures.isEnabled
area: intellij
source: phase 130.1 code review (WR-04)
files: bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java, bbj-intellij/src/main/java/com/basis/bbj/intellij/tokenized/TokenizedBbj.java
---

## Problem

`BbjLanguageServerFactory.isEnabled` (`BbjLanguageServerFactory.java:98-105`) calls
`TokenizedBbj.isTokenized(file)`. On a cache miss (first ask, or after a modification stamp
change) that opens the file through the virtual file system to read seven bytes, inside a hot
LSP4IJ path that may run on the EDT or under a read action. Which threads call `isEnabled` is
unconfirmed.

## What to do

Find out which threads call it (log `ApplicationManager.getApplication().isDispatchThread()` once).
If the EDT is among them: on a stamp change answer "enabled" and compute the verdict on a pooled
thread, which then re-triggers the connect or disconnect decision. At least guard the read with an
`isDispatchThread()` check that skips it. The verdict cache and the no-store-on-failure rule in
`TokenizedBbj.cachedHeaderVerdict` stay as they are.
