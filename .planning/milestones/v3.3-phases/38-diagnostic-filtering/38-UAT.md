---
status: complete
phase: 38-diagnostic-filtering
source: 38-01-SUMMARY.md
started: 2026-02-08T12:00:00Z
updated: 2026-02-08T12:05:00Z
---

## Current Test

[testing complete]

## Tests

### 1. bbjlib:/ synthetic files produce no diagnostics
expected: Open a BBj file that references built-in functions/variables. The Problems panel should NOT show any parse errors from synthetic files like functions.bbl, variables.bbl, labels.bbl, events.bbl, or bbj-api.bbl. Only errors from your actual source files should appear.
result: pass

### 2. Javadoc errors not spammed individually
expected: If javadoc sources are configured but some paths are invalid, you should NOT see individual error messages for each failed path. If at least one javadoc source loads successfully, no warning should appear at all.
result: pass

### 3. Javadoc total failure shows single summary warning
expected: If ALL configured javadoc sources fail to load (e.g., all paths are invalid), you should see a single summary warning message — not one error per failed path.
result: pass

### 4. Quiet startup with debug off
expected: Start the language server with debug disabled (default). Startup output should be minimal — only essential summary lines like BBj home path and loaded class count. No verbose per-file or per-class output.
result: pass

## Summary

total: 4
passed: 4
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
