# QA Testing Guide

## Overview

This directory contains human QA testing procedures for the BBj Language Server. These checklists ensure repeatable verification of all language server features before releases.

**Purpose:**
- Provide structured test procedures for human testers
- Document pass/fail results with evidence
- Establish clear release gate criteria
- Support both VS Code and IntelliJ IDEA clients

## When to Test

### Smoke Test
**When:**
- Before every release candidate
- After significant changes to core functionality
- After dependency upgrades

**Checklist:** [SMOKE-TEST-CHECKLIST.md](./SMOKE-TEST-CHECKLIST.md)

**Time:** 5-10 minutes

### Full Test
**When:**
- Before each production release
- After any smoke test failure
- Before milestone completion

**Checklist:** [FULL-TEST-CHECKLIST.md](./FULL-TEST-CHECKLIST.md)

**Time:** 30-45 minutes

### Ad-hoc Testing
**When:**
- Investigating specific reported bugs
- Verifying fixes for regressions
- Testing experimental features

**Approach:** Use relevant sections from full checklist

## How to Document Test Runs

1. **Copy the checklist template** to `QA/test-runs/` directory
   ```bash
   cp QA/FULL-TEST-CHECKLIST.md QA/test-runs/YYYY-MM-DD-full-test.md
   # or
   cp QA/SMOKE-TEST-CHECKLIST.md QA/test-runs/YYYY-MM-DD-smoke-test.md
   ```

2. **Execute tests** and mark each item with PASS or FAIL
   - Replace `[ ]` with `[x]` for PASS
   - Replace `[ ]` with `[FAIL]` for failures

3. **Rename with result suffix**
   ```bash
   # If all tests passed:
   mv YYYY-MM-DD-full-test.md YYYY-MM-DD-full-test-PASS.md

   # If any test failed:
   mv YYYY-MM-DD-full-test.md YYYY-MM-DD-full-test-FAIL.md
   ```

4. **Fill in footer fields**
   - Test run result: PASS or FAIL
   - Date: Date of test execution
   - Tester: Your name

**Example:**
```
QA/test-runs/2026-02-04-full-test-PASS.md
QA/test-runs/2026-02-04-smoke-test-FAIL.md
```

## Failure Evidence Requirements

When tests fail, documentation must include evidence for debugging and issue tracking.

### Required for All Failures

1. **Screenshot or log excerpt** showing the failure
2. **Failure details** in test run file

### Evidence Documentation Format

Append an "Evidence" section to the test run file:

```markdown
## Evidence

### Test: [Test Name]
**Date:** YYYY-MM-DD
**Tester:** [Your Name]
**Failure:** [Brief description of what went wrong]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Screenshot:**
See GitHub issue #[issue-number]

**Environment:**
- OS: [macOS 14.2.1 / Windows 11 / Ubuntu 22.04]
- IDE: [VS Code 1.85.0 / IntelliJ IDEA 2024.1]
- Extension Version: [version from package.json]
```

### Evidence Storage

- **Screenshots:** Upload to GitHub issue, reference issue number in test run
- **Log excerpts:** Paste directly in Evidence section
- **Large logs:** Attach to GitHub issue, reference in test run

### Passes Do Not Require Evidence

Passing tests do not need screenshots or logs. The marked checklist is sufficient.

## Release Gate Criteria

### PASS Criteria
**All items** in FULL-TEST-CHECKLIST.md show PASS (or `[x]` marked)

**Action:** Proceed with release

### BLOCK Criteria
**Any item** in FULL-TEST-CHECKLIST.md shows FAIL (or `[FAIL]` marked)

**Action:**
1. Document failure with evidence (see above)
2. Create GitHub issue for failure
3. DO NOT RELEASE until issue resolved
4. Retest after fix

### No Exceptions Policy
There are no acceptable failures. All tests must pass before release.

If a test is flaky or no longer relevant:
- Fix the flaky test, or
- Remove the test from the checklist (via pull request)

**Do not skip or ignore failures.**

## Maintaining Checklists

These checklists are living documents that evolve with the product.

### Adding Tests
When new features are added:
1. Add corresponding test items to FULL-TEST-CHECKLIST.md
2. Add critical path items to SMOKE-TEST-CHECKLIST.md if appropriate
3. Submit changes via pull request

### Removing Tests
When features are deprecated or tests become obsolete:
1. Remove test items from checklists
2. Document reason in pull request description
3. Submit changes via pull request

### Modifying Tests
When test procedures change:
1. Update test steps or expected results
2. Document reason in pull request description
3. Submit changes via pull request

### Review Process
- Checklist changes should be reviewed by someone familiar with the feature
- Changes should be tested before merging
- Keep checklists synchronized (if removing from full test, remove from smoke test)
