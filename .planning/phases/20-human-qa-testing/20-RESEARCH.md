# Phase 20: Human QA Testing - Research

**Researched:** 2026-02-04
**Domain:** Manual QA testing documentation, test checklists, and release gate procedures
**Confidence:** HIGH

## Summary

Phase 20 focuses on creating human-readable QA testing documentation and recurring test checklists for the BBj Language Server. This is a documentation-only phase that produces test procedures for manual verification of both VS Code and IntelliJ IDE integrations, covering all 9 verified LSP features plus Run BBj commands and Enterprise Manager integration.

Research identifies three primary domains: (1) QA test checklist design best practices including format, structure, and maintainability, (2) pass/fail criteria documentation including when to require evidence and how to handle discrepancies, and (3) smoke test design for quick sanity checking versus comprehensive full test runs.

The CONTEXT.md specifies key constraints: Markdown table format with Feature | Steps | Expected | Pass/Fail columns, separate sections for VS Code and IntelliJ, inline code examples within checklists, and a new QA/ directory at project root. The user requires both a comprehensive checklist and a shorter 5-10 item smoke test for quick verification.

**Primary recommendation:** Create two test checklists in Markdown format: (1) FULL-TEST-CHECKLIST.md with comprehensive coverage of all 9 LSP features, Run BBj commands, and EM integration, organized by IDE with clear pass/fail criteria and inline test snippets, and (2) SMOKE-TEST-CHECKLIST.md with 5-10 critical tests for rapid release verification. Include a TESTING-GUIDE.md that explains when to use each checklist, how to document failures, and release gate criteria.

## Standard Stack

This phase produces documentation only - no libraries or tools are required.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Markdown | (standard) | Checklist format | Universal, version-controllable, readable in GitHub/IDEs, supports tables and code blocks |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| N/A | N/A | No supporting tools needed | Documentation-only phase |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Markdown tables | Excel/Google Sheets | User decided on Markdown for version control and simplicity; spreadsheets offer better tracking UX but lose git diff/review benefits |
| Static checklist copies | Interactive checkbox forms | Interactive forms would require tooling; user chose dated copies of static checklists for simplicity and audit trail |

**Installation:**
```bash
# No installation required - documentation only
```

## Architecture Patterns

### Recommended QA Directory Structure
```
QA/
├── TESTING-GUIDE.md           # Overview: when to test, how to document failures
├── FULL-TEST-CHECKLIST.md     # Comprehensive checklist (all features)
├── SMOKE-TEST-CHECKLIST.md    # Quick sanity test (5-10 items)
└── test-runs/                 # Dated test execution copies
    ├── 2026-02-04-full-test-PASS.md
    └── 2026-02-04-smoke-test-PASS.md
```

### Pattern 1: Feature Test Documentation
**What:** Each test documents a single LSP feature or IDE command with executable steps and specific expected results
**When to use:** Every entry in the test checklists
**Example:**
```markdown
| Feature | Steps | Expected | Pass/Fail |
|---------|-------|----------|-----------|
| Code Completion - BBj Keywords | 1. Open a .bbj file<br>2. Type `PR` and trigger completion (Ctrl+Space) | Completion menu appears with `PRINT` as top suggestion | [ ] |
```

### Pattern 2: Inline Test Snippets
**What:** Include minimal BBj code examples directly in the Steps or Expected column for copy/paste testing
**When to use:** When the test requires specific code patterns (diagnostics, Java interop, semantic highlighting)
**Example:**
```markdown
| Feature | Steps | Expected | Pass/Fail |
|---------|-------|----------|-----------|
| Diagnostics - Syntax Error | 1. Create new .bbj file<br>2. Paste: `REM test`<br>`MODE "INVALID"`<br>3. Save file | Red squiggle under `"INVALID"` with error message about MODE value | [ ] |
```

### Pattern 3: Smoke Test Selection Criteria
**What:** Smoke test includes highest-risk, highest-value features that represent critical paths
**When to use:** Designing the 5-10 item smoke test checklist
**Selection criteria:**
- Include at least one test per major feature category (LSP features, Run commands, EM integration)
- Prioritize features that have broken in past releases
- Favor tests that exercise multiple components (e.g., Java completion tests LSP + Java interop)
- Keep total execution time under 10 minutes

**Example smoke test items:**
1. Syntax highlighting works (visual check)
2. Code completion shows BBj keywords
3. Java class completion works (HashMap test)
4. Diagnostics show errors correctly
5. Run Program command executes
6. IntelliJ basic features work

### Pattern 4: Release Gate Criteria
**What:** Clear definition of when a release is approved or blocked based on test results
**When to use:** Determining if test results permit release
**Criteria (from CONTEXT.md decisions):**
- **PASS for release:** All tests in full checklist show PASS
- **BLOCK release:** Any test shows FAIL (no exceptions)
- **Evidence requirement:** Failures require screenshots or logs; passes do not

### Pattern 5: Dated Test Run Copies
**What:** Each test execution creates a dated copy of the checklist with Pass/Fail filled in
**When to use:** Every test run (both smoke and full)
**File naming convention:**
```
QA/test-runs/YYYY-MM-DD-{smoke|full}-test-{PASS|FAIL}.md
```

**Example:**
```
QA/test-runs/2026-02-04-full-test-PASS.md
QA/test-runs/2026-02-05-smoke-test-FAIL.md  (with failure evidence appended)
```

### Anti-Patterns to Avoid
- **Vague expected results:** "Feature works" is not specific enough. Use "Completion menu shows PRINT, READ, REM" instead
- **Steps requiring product knowledge:** User specified "brief reminders assuming tester knows the product," but steps should still be executable. Avoid "test the completion" - use "Type PR and press Ctrl+Space"
- **Pass/Fail checkboxes in version control:** The template checklist should have empty Pass/Fail column `[ ]`, not pre-filled. Only dated copies in test-runs/ should have `[x]` or `[ ]` filled in
- **Testing automation features in manual checklist:** Don't include items like "verify test coverage reports" - this is for human QA of end-user IDE features only

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test case management system | Custom tracker | Dated Markdown copies in test-runs/ | User chose simple approach; avoid over-engineering with databases or tracking tools |
| Interactive checklists | Custom web app | Standard Markdown with `[ ]` checkboxes | Markdown is version-controllable, diff-able, and readable everywhere |
| Screenshot embedding | Binary images in repo | Link to external failure evidence | Large images bloat git history; reference external storage (issue attachments, etc.) |
| Test automation | Selenium/Playwright for manual QA | Keep manual testing manual | Phase 20 is for human QA documentation; test automation exists separately (Phase 19) |

**Key insight:** Manual QA documentation should be lightweight, version-controlled, and human-friendly. Avoid tooling complexity - the value is in clear procedures, not test management infrastructure.

## Common Pitfalls

### Pitfall 1: Ambiguous Expected Results
**What goes wrong:** Testers interpret "expected" differently, leading to inconsistent pass/fail decisions
**Why it happens:** Test author assumes tester knows what "correct" looks like without explicit specification
**How to avoid:** Be specific about expected results. "Completion works" → "Completion menu appears showing PRINT, READ, REM as top 3 suggestions"
**Warning signs:** Testers ask clarifying questions; different testers mark same behavior as pass/fail

### Pitfall 2: Testing Instructions That Require Deep Product Knowledge
**What goes wrong:** New testers or external QA cannot execute tests without asking questions
**Why it happens:** Test author forgets that steps must be executable by someone unfamiliar with the product
**How to avoid:** User specified "brief reminders assuming tester knows the product," but validate by asking: "Could a developer who has never used BBj execute these steps?" Include trigger keys (Ctrl+Space), file locations, specific code to type
**Warning signs:** Steps like "verify completion" without specifying how to trigger it

### Pitfall 3: Mixing Test Scope (Smoke vs Full)
**What goes wrong:** Smoke test becomes comprehensive, or full test misses critical features
**Why it happens:** No clear criteria for what belongs in each checklist
**How to avoid:** Smoke test = 5-10 critical path items, under 10 minutes. Full test = exhaustive coverage of all 9 LSP features + commands. Don't duplicate - smoke test can reference "see FULL-TEST-CHECKLIST for details"
**Warning signs:** Smoke test takes more than 15 minutes; full test missing features from FUNC-01 through FUNC-10

### Pitfall 4: No Failure Evidence Collection Process
**What goes wrong:** Test marked as FAIL but no information about how to reproduce or diagnose
**Why it happens:** Checklist doesn't prompt for evidence; tester just marks [ ] and moves on
**How to avoid:** TESTING-GUIDE.md must specify: "On failure, append screenshot or log excerpt to dated test run file, and create GitHub issue linking to test run file"
**Warning signs:** Test run shows FAILs but no way to investigate what actually happened

### Pitfall 5: Checklist Becomes Stale
**What goes wrong:** Features are added or changed but checklists aren't updated
**Why it happens:** Checklists are written once and forgotten; no process for maintenance
**How to avoid:** User specified "improve iteratively as testers contribute" - add note to TESTING-GUIDE.md: "If you test something not in the checklist, add it. If a test is obsolete, remove it." Treat checklists as living documents
**Warning signs:** Testers manually test features not in checklist; checklist references removed features

### Pitfall 6: Release Gate Criteria Not Enforced
**What goes wrong:** Release ships with test failures because criteria weren't clear or enforced
**Why it happens:** No documented gate criteria, or criteria are vague ("mostly pass")
**How to avoid:** User specified "all tests must pass for release approval" - document this clearly in TESTING-GUIDE.md as non-negotiable release gate
**Warning signs:** Discussions about "is this failure blocking?" during release process

## Code Examples

Verified patterns from official sources and project context:

### Full Test Checklist Entry for LSP Feature
```markdown
## VS Code - LSP Features

| Feature | Steps | Expected | Pass/Fail |
|---------|-------|----------|-----------|
| **Syntax Highlighting** | 1. Open `examples/bbj-classes.bbj`<br>2. Visually inspect code coloring | Keywords (`class`, `method`, `field`) are colored distinctly from strings and comments | [ ] |
| **Diagnostics - Error Detection** | 1. Create new file `test-diag.bbj`<br>2. Type: `REM test`<br>`MODE "INVALID"`<br>3. Save | Red squiggle appears under `"INVALID"` with error message | [ ] |
| **Code Completion - BBj Keywords** | 1. Create new file<br>2. Type `PR` and press Ctrl+Space | Completion menu shows `PRINT` at or near top of list | [ ] |
| **Code Completion - Java Classes** | 1. Create new file<br>2. Type `use java.util.Hash` and press Ctrl+Space | Completion menu shows `HashMap` | [ ] |
| **Hover Information** | 1. Open file with variable declaration<br>2. Hover mouse over variable usage | Tooltip appears showing variable type/declaration info | [ ] |
| **Signature Help** | 1. Type `STR(` | Signature help popup shows function parameters | [ ] |
| **Go-to-Definition** | 1. Open file with method definition<br>2. Right-click on method call<br>3. Select "Go to Definition" | Editor navigates to method definition location | [ ] |
| **Document Symbols / Outline** | 1. Open `examples/bbj-classes.bbj`<br>2. Open Outline view (Ctrl+Shift+O) | Outline shows class, method, field hierarchy | [ ] |
| **Semantic Tokens** | 1. Open any .bbj file with variables<br>2. Check if variables have distinct coloring from keywords | Variables colored differently from keywords | [ ] |
```
Source: Project REQUIREMENTS.md FUNC-01 through FUNC-09, adapted to checklist format

### Smoke Test Checklist
```markdown
# BBj Language Server - Smoke Test Checklist

**Purpose:** Quick sanity check before release (5-10 minutes)
**When to use:** After any build, before detailed testing
**Release gate:** If ANY item fails, run full test checklist

| # | Feature | Steps | Expected | Pass/Fail |
|---|---------|-------|----------|-----------|
| 1 | Extension Loads | 1. Open VS Code<br>2. Open any .bbj file | No error notifications; file opens without crashes | [ ] |
| 2 | Syntax Highlighting | 1. Open `examples/bbj-classes.bbj` | Keywords are colored (not plain text) | [ ] |
| 3 | Code Completion | 1. Type `PR` + Ctrl+Space | Completion shows `PRINT` | [ ] |
| 4 | Java Interop | 1. Type `Hash` + Ctrl+Space | Completion shows `HashMap` | [ ] |
| 5 | Diagnostics | 1. Type `MODE "INVALID"`<br>2. Save | Red squiggle appears | [ ] |
| 6 | IntelliJ Basic Function | 1. Open IntelliJ with BBj plugin<br>2. Open .bbj file | File opens with syntax highlighting | [ ] |

**Result:** [ ] PASS (all 6 items pass) or [ ] FAIL (any item fails)

**If FAIL:** Run FULL-TEST-CHECKLIST.md and document failures
```
Source: Smoke testing best practices (BrowserStack, QASource) adapted to BBj LSP features

### Testing Guide - Failure Documentation
```markdown
# Testing Guide

## When to Test

- **Smoke Test:** After every build, before any release candidate
- **Full Test:** Before each release to production
- **Ad-hoc:** When investigating reported bugs

## How to Document Test Runs

1. Copy the appropriate checklist template:
   - For smoke test: `cp QA/SMOKE-TEST-CHECKLIST.md QA/test-runs/YYYY-MM-DD-smoke-test.md`
   - For full test: `cp QA/FULL-TEST-CHECKLIST.md QA/test-runs/YYYY-MM-DD-full-test.md`

2. Execute tests and mark Pass/Fail:
   - Replace `[ ]` with `[x]` for PASS
   - Leave `[ ]` for FAIL
   - Add failure evidence (see below)

3. Rename file with result:
   - All pass: `YYYY-MM-DD-{smoke|full}-test-PASS.md`
   - Any fail: `YYYY-MM-DD-{smoke|full}-test-FAIL.md`

## Failure Evidence Requirements

When a test **FAILS**, append evidence to the test run file:

```
### Failure Evidence

**Test:** Code Completion - Java Classes
**Date:** 2026-02-04
**Tester:** [your name]
**Failure:** Completion menu did not appear when typing "Hash"

**Steps to Reproduce:**
1. Created new file test.bbj
2. Typed "Hash"
3. Pressed Ctrl+Space
4. No completion menu appeared

**Expected:** Completion menu with HashMap
**Actual:** No response

**Screenshot:** [attach to GitHub issue #XXX]
**Logs:** [paste relevant console errors if any]
```

## Release Gate Criteria

**PASS for release:**
- All items in FULL-TEST-CHECKLIST.md show [x] PASS
- No exceptions

**BLOCK release:**
- Any item shows [ ] FAIL
- Failure must be fixed or investigated before release

**Evidence:**
- Failures require screenshots or logs
- Passes do not require evidence
```
Source: QA best practices (TestRigor, FrugalTesting) adapted to project needs

### IntelliJ Test Section Example
```markdown
## IntelliJ IDEA - LSP Features

| Feature | Steps | Expected | Pass/Fail |
|---------|-------|----------|-----------|
| **Syntax Highlighting** | 1. Open IntelliJ IDEA<br>2. Open `examples/bbj-classes.bbj` | Keywords colored distinctly | [ ] |
| **Code Completion** | 1. New file<br>2. Type `PR` + Ctrl+Space | Completion shows `PRINT` | [ ] |
| **Diagnostics** | 1. Type `MODE "INVALID"`<br>2. Save | Error highlight appears | [ ] |

## IntelliJ IDEA - Run Commands

| Feature | Steps | Expected | Pass/Fail |
|---------|-------|----------|-----------|
| **Run Program** | 1. Open .bbj file<br>2. Right-click → Run BBj → Run Program | Program executes (or shows expected runtime behavior) | [ ] |
| **Run with Debug** | 1. Open .bbj file<br>2. Right-click → Run BBj → Run with Debug | Debugger attaches (or shows expected debug behavior) | [ ] |
```
Source: IntelliJ plugin capabilities from project README

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Excel/Google Sheets for test tracking | Markdown checklists in git | 2026 industry shift | Version control, code review, simpler tooling |
| Manual test plans in separate tools | Living documentation in repo | Modern DevOps practices | Tests stay synchronized with code |
| 100% pass required for all tests | Risk-based release gates | QA maturity evolution | Focus on critical paths (user chose 100% pass gate) |
| Generic test templates | IDE-specific test procedures | Tool specialization | VS Code and IntelliJ have distinct testing needs |

**Deprecated/outdated:**
- Binary format checklists (Excel, Word): Industry moved to Markdown for version control benefits
- Test case management systems for small projects: Overhead not justified; lightweight Markdown preferred

## Open Questions

Things that couldn't be fully resolved:

1. **What specific Run BBj commands need testing?**
   - What we know: CONTEXT.md mentions "Run BBj commands (Run Program, Run with Debug, etc.)"
   - What's unclear: Complete list of commands and their expected behaviors
   - Recommendation: Start with Run Program and Run with Debug; expand as testers identify additional commands during first test run

2. **What specific EM (Enterprise Manager) integration tests are needed?**
   - What we know: CONTEXT.md lists "EM integration testing" as in scope
   - What's unclear: What EM integration features exist and how to test them
   - Recommendation: Consult with user or examine IntelliJ plugin capabilities; document tests based on actual integration points

3. **Where should failure screenshots be stored?**
   - What we know: Failures require screenshots or logs; git repos shouldn't store large binaries
   - What's unclear: External storage location (GitHub issues, separate artifact repo, cloud storage)
   - Recommendation: Reference GitHub issue attachments in failure evidence; include link in test run file rather than embedding images

4. **How often should the smoke test be run?**
   - What we know: User wants smoke test for "quick sanity testing"
   - What's unclear: Cadence - every commit? Every PR? Only pre-release?
   - Recommendation: Document in TESTING-GUIDE.md as "minimum: before every release candidate; recommended: after any significant changes"

5. **Who maintains the checklists?**
   - What we know: User specified "improve iteratively as testers contribute"
   - What's unclear: Process for proposing and approving checklist changes
   - Recommendation: Treat checklists as code - changes via pull request with review

## Sources

### Primary (HIGH confidence)
- [QA Test Checklist Best Practices 2026](https://bugherd.com/blog/website-qa-testing-complete-guide-to-quality-assurance) - BugHerd comprehensive guide
- [Software Testing QA Checklist with Example](https://www.softwaretestinghelp.com/software-testing-qa-checklists/) - Checklist structure and examples
- [Test Case Template Examples 2026](https://testgrid.io/blog/test-case-template/) - Test case format and components
- [Smoke Testing in 2026](https://blog.qasource.com/a-complete-guide-to-smoke-testing-in-software-qa) - QASource smoke test guide
- [Test Documentation Best Practices](https://testrigor.com/blog/test-documentation-best-practices-with-examples/) - testRigor documentation standards
- [VS Code Extension Testing](https://code.visualstudio.com/api/working-with-extensions/testing-extension) - Official VS Code testing docs
- [IntelliJ Plugin Testing Overview](https://plugins.jetbrains.com/docs/intellij/testing-plugins.html) - Official JetBrains testing docs
- [Markdown Extended Syntax - Tables](https://www.markdownguide.org/extended-syntax/) - Official Markdown table syntax
- Project files: .planning/REQUIREMENTS.md (FUNC-01 through FUNC-10), .planning/ROADMAP.md (Phase 20 definition), .planning/phases/20-human-qa-testing/20-CONTEXT.md (user decisions)

### Secondary (MEDIUM confidence)
- [Quality Gates in Software Development](https://www.sonarsource.com/resources/library/quality-gate/) - SonarSource quality gate definitions
- [QA Release Readiness Best Practices](https://www.frugaltesting.com/blog/best-practices-for-qa-release-readiness-a-complete-pre-launch-testing-guide) - FrugalTesting release gate patterns
- [QA Documentation Guide](https://www.shakebugs.com/blog/qa-documentation/) - Shake bug tracking integration patterns
- [How to Document Manual Testing Results](https://www.testdevlab.com/blog/effective-documentation-for-manual-testing) - TestDevLab failure documentation best practices

### Tertiary (LOW confidence)
- [Test Plan Pass/Fail Criteria](https://www.coleyconsulting.co.uk/passfail.htm) - General pass/fail criteria concepts (not IDE-specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Markdown table format is well-established standard, user decision documented
- Architecture: HIGH - Patterns derived from established QA best practices + project CONTEXT.md decisions
- Pitfalls: HIGH - Based on documented QA anti-patterns and user-specified constraints
- Code examples: HIGH - Adapted from FUNC-01 through FUNC-10 requirements and official documentation

**Research date:** 2026-02-04
**Valid until:** 2026-04-04 (60 days - QA documentation practices are stable; manual testing patterns evolve slowly)
