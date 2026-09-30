---
created: 2026-09-29
title: Move lsp4j.jsonrpc to 1.0 in bbj-ls first, then java-interop
area: dependencies
source: Dependabot PR #711 (closed with "ignore this major version", 2026-09-29)
trigger: next bbj-ls dependency update
files:
  - java-interop/build.gradle
---

## Problem

java-interop mirrors the production backend bbj-ls, which pins lsp4j.jsonrpc 0.20.1 in its
pom.xml. java-interop builds and its 8 tests pass on 1.0.0, but the two should not drift.

## What to do

Upgrade bbj-ls first and verify it against the language server. Then bump java-interop to match,
and lift the hold with `@dependabot unignore org.eclipse.lsp4j:org.eclipse.lsp4j.jsonrpc`.
