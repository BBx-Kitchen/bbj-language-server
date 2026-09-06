---
created: 2026-09-06T07:58:10.000Z
title: Live Windows check for the Node.js auto-install failure
area: intellij-node-download
severity: major
files:

  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeInstallPipeline.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java

audit_acknowledged:
  milestone: v4.2
  at: 2026-09-06
---

## Problem

A prior UAT round observed that automatic Node.js installation did not work on a Windows test
machine (the user installed Node by hand and pointed the plugin at it instead); this appeared to
be a regression from earlier behavior.

The Node install pipeline now has full behavioral test coverage on both platform branches,
including the Windows branch's URL/archive-name assembly, fetch, digest verify, zip extraction
(decoy entry skipped, `node.exe` extracted), install, and cache-hit composition — all running for
real against a committed fixture on this Linux container. Every Windows-branch case passed on the
first correctly-ordered run; none reproduced the observed failure.

This means the Windows auto-install failure is **not reproducible from the pipeline's own branch
logic alone**. The remaining candidates are Windows-specific filesystem or process behavior that
no Linux-hosted test can exercise: the platform HTTP client's real network path, ACL/permission
differences on the plugin's data directory, or an environment difference on the test machine
itself (proxy, antivirus interception, `PathManager.getPluginsPath()` resolving somewhere
unwritable, etc.).

## What's needed

A live check on an actual Windows machine with no Node.js configured:

1. Open a BBj file so the language server needs Node.js.
2. Use the editor banner's "Download Node.js" action.
3. Confirm a `node.exe` appears in the plugin's `bbj-intellij-data/nodejs` directory beside a
   `.sha256` sidecar, and that the language server starts afterward.
4. If it fails, capture `idea.log` and the contents of the `bbj-intellij-data/nodejs` directory
   (even if empty/partial) for diagnosis.

This is a human-attestation item — it cannot be closed by a Linux CI run or a Linux dev
container, per this plan's own flagged assumption that CI has `ubuntu-latest` runners only.
