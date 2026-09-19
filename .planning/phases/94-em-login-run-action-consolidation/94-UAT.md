---
status: testing
phase: 94-em-login-run-action-consolidation
source: [94-VERIFICATION.md]
started: 2026-09-19
updated: 2026-09-19
---

## Prerequisite

Install the distributable built from the final tree:
`bbj-intellij/build/distributions/bbj-intellij-0.1.0.zip`

If any code-review fixes land after this build, rebuild before testing — a UAT pass against a
pre-fix build proves nothing about what ships.

## Current Test

number: 1
name: EM login enablement/visibility
expected: |
  Item present with a project open; absent (hidden, not greyed) with no project open — the phase's
  one intended user-visible change.
awaiting: user response

## Tests

### 1. EM login enablement/visibility
test: Install the built distributable, open the Tools menu with a project open, then with all projects closed.
expected: Item present with a project open; absent (hidden, not greyed) with no project open — the phase's one intended user-visible change.
why_human: Action-presentation rendering in a running IDE; source guards prove the code shape (setEnabledAndVisible, project-only gate) but not what the Tools menu actually renders.
result: [pending]

### 2. EM login end-to-end
test: Tools > Login to Enterprise Manager, enter credentials.
expected: Credential prompts appear, login succeeds with a success dialog, token is stored, no leftover temp file remains on disk afterward.
why_human: Live network/subprocess flow against a real BBj interpreter and EM server; no CI harness exercises this.
result: [pending]

### 3. BUI/DWC launch from all entry points
test: Run a .bbj file as BUI and as DWC via the editor context menu and via the alt-B / alt-D keyboard shortcuts.
expected: All four invocations launch the program in the browser.
why_human: Requires a running IDE, a browser, and a live BBj interpreter; not observable from source.
result: [pending]

### 4. Token lifecycle
test: Run with no stored token, with an expired token, then again within 5 minutes of a successful validation.
expected: No token -> login prompt. Expired token -> re-prompt. Second run inside 5 minutes -> trust-window hit, no em-validate-token.bbj subprocess spawned.
why_human: The trust-window arithmetic and null/expired branches are unit-tested (EmTokenValidatorTest), but the full run-time re-prompt UX and the subprocess-not-spawned observation need a live IDE + BBj interpreter.
result: [pending]

### 5. Control: run a BBj file as GUI
test: Run a BBj file as GUI.
expected: Behaves exactly as before — GUI run touches no EM code, so it is the regression control for this phase's base-class edits.
why_human: Regression control requiring a running IDE and live BBj interpreter.
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
