---
created: 2026-09-29
title: Migrate the Java interop connection to vscode-jsonrpc 9
area: dependencies
source: Dependabot PR #712 (closed with "ignore this major version", 2026-09-29)
trigger: next dependency or interop phase
files:

  - bbj-vscode/src/language/java-interop-connection.ts
  - bbj-vscode/src/language/java-interop.ts
  - bbj-vscode/src/language/java-interop-cache.ts
  - bbj-vscode/src/language/java-interop-class-index.ts
  - bbj-vscode/src/language/java-interop-classpath.ts

audit_acknowledged:
  milestone: v4.8
  at: 2026-09-30
---

## Problem

The extension imports `vscode-jsonrpc/node.js` (8.2.1) for the socket connection to the interop
peer. vscode-jsonrpc 9 drops that import path, so #712 failed with TS2307 in five files.
vscode-languageclient 10.1.2 already brings its own nested vscode-jsonrpc 9, so the tree
currently carries both majors.

## What to do

Move the five imports to the 9.x entry points, check the socket reader/writer and message
connection APIs for changes, run the interop tests and the live harness, then remove the
"ignore this major version" hold (`@dependabot unignore vscode-jsonrpc` or a manual bump).
