---
created: 2026-09-06T09:00:00.000Z
title: A configured-but-unusable Node.js path suppresses the cached-download fallback
area: intellij-node-download
severity: minor
files:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/NodeAvailability.java
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjMissingNodeNotificationProvider.java
---

## Problem

`NodeAvailability.decide` pins today's editor-banner behavior exactly: when a Node.js path is
explicitly configured but turns out unusable (missing, or present but below the minimum version),
the banner is shown directly — the PATH detector and the cached-download fallback are never
consulted, even if a previously downloaded Node.js binary is sitting in the plugin's data
directory. This is not a bug introduced by this phase; it is the pipeline's existing behavior,
now proven by `NodeAvailabilityTest.aConfiguredPathWithATooOldVersionNeedsTheBannerAndNeverConsultsTheCachedDownload`.

This is a plausible mechanism for a prior UAT observation on Windows: automatic Node.js
installation appeared not to work, and the user set the Node.js path by hand instead. If a stale
or incorrect path was ever configured (even transiently, e.g. by an earlier manual attempt), this
asymmetry means the plugin would show the "Node.js required" banner and never fall back to a
Node.js it had already downloaded and cached — pointing the user toward manual configuration
instead of the working automatic path.

## What's needed

A product decision on whether the configured-path branch should also try the cached download
before giving up (i.e., treat an unusable configured path more like an absent one for the
fallback's purposes). This is a behavior change, not a test-hardening one, so it was intentionally
left out of the regression-coverage phase that discovered and pinned it.
