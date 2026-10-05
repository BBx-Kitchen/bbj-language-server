---
created: 2026-10-05
title: Denumber success message can stall 5 s when the mirror text is not byte-identical
area: language-server
source: phase 130.1 code review (WR-03)
files: bbj-vscode/src/language/bbj-denum-service.ts
audit_acknowledged:
  milestone: v4.9
  at: 2026-10-05
---

## Problem

`mirrorVersionFor` (`bbj-denum-service.ts:416-466`, called at `:374-378`) waits until the server's
mirror of the document equals `outcome.result.text` exactly, or until `DENUM_VERSION_WAIT_MS`
(5 s) passes. If the editor's text is not byte-identical (EOL normalisation into a CRLF
document, for example), the wait always times out. The success message then arrives 5 s late,
the `running` claim is held for that whole time, and the problem list goes out unversioned, so no
problems are placed. This only applies when the run has diagnostics; how often it triggers in
practice is unverified.

## What to do

Compare the two texts with line endings normalised. Better: reply at once and send the versioned
list asynchronously. At the least, release the `running` claim before waiting. Reproduce first
with a CRLF document that Denumber reports problems for.
