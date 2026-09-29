---
created: 2026-09-27
title: Re-check the IntelliJ Node.js download progress bar on Windows
area: testing
source: Phase 114 final checkpoint (user request, 2026-09-27)
trigger: opportunistic, the next time a Windows machine is in use for testing anyway; not a release blocker
files:

  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java

audit_acknowledged:
  milestone: v4.7
  at: 2026-09-29
---

## Problem

Phase 114 changed the plugin's Node.js download so it re-asserts determinate progress before
every progress update. The in-IDE check passed on Linux only. Windows downloads a different
Node.js archive (zip, not tar), so the progress path has not been seen there.

## What to do

Next time Windows is used for testing anyway: install the current plugin zip, delete the
plugin's cached Node.js download, open a `.bbj` file and accept the download offer. Confirm
the progress bar moves and completes, and that `idea.log` shows no new `IllegalStateException`
from the download.
