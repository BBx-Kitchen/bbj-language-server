---
phase: 125-ls-formatting
fixed_at: 2026-10-02T08:30:00Z
review_path: /home/coder/repos/bbj-language-server/.planning/phases/125-ls-formatting/125-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 6
skipped: 2
status: partial
---

# Phase 125: Code Review Fix Report

**Fixed at:** 2026-10-02T08:30:00Z
**Source review:** /home/coder/repos/bbj-language-server/.planning/phases/125-ls-formatting/125-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (WR-01..03, IN-01..05)
- Fixed: 6 (WR-02, IN-01, IN-03, IN-05 fully; WR-03 and IN-04 in part, see their entries)
- Skipped: 2 (WR-01, IN-02)

**Verification:** the worktree created for the edits had no `node_modules`, so every gate ran in
the main checkout after the worktree branch was fast-forwarded into
`gsd/v4.9-bbj-ls-denum-format` (the worktree and temp branch are removed). Results: 13 format
related vitest suites (239 tests) pass, plus `activation-command-coverage` and
`no-shell-command-construction`; `npm run typecheck:test` and `npm run lint` are clean. The
IntelliJ change is Javadoc only; Gradle was not run.

## Fixed Issues

### WR-02: Unexpected formatter exceptions are swallowed with no log above debug

**Files modified:** `bbj-vscode/src/language/bbj-format-service.ts`, `bbj-vscode/src/language/bbj-formatting-handler.ts`, `bbj-vscode/test/bbj-format-service.test.ts`
**Commit:** 15b2a1bb (fix), e343337a (test)
**Applied fix:** The service catch now goes through the notice ledger (`unexpected-error`, warn on the
first occurrence per connection, debug afterwards, no user message). The handler's outer catch logs the
error name at debug. A new test makes `formatProgram` reject and asserts no edit and exactly one warn.

### WR-03: Content-dependent engine failures and repeat timeouts are shown once per connection, then silent (partly applied)

**Files modified:** `bbj-vscode/src/language/bbj-format-service.ts`, `bbj-vscode/test/bbj-format-notices.test.ts`
**Commit:** 7bbf950b
**Applied fix:** `malformed-result` now has its own notice key, so it no longer shares
`engine-failed|<generation>` with a format failure. The `report` Javadoc now says engine failures and
timeouts are deliberately once per connection. A new test pins that the two are separate notices.
**Not applied:** scoping `format-failed` and `parser-exception` per document, and the timeout wording.
The notice tests explicitly pin "an engine failure and a timeout show once per connection however many
documents hit it", so this is a recorded design decision, not a defect to flip in a review fix.

### IN-01: The IntelliJ switch Javadoc claims on-type formatting is covered

**Files modified:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java`
**Commit:** 8d16de7c
**Applied fix:** Reworded the Javadoc: the switch covers Reformat Code, Actions on Save and the
client-side typed-character triggers; server-driven on-type formatting is not gated because the server
does not advertise it. The optional canary entry was not added. Javadoc only, no Gradle run.

### IN-03: The old client-side formatter and `javaPath` setting are dead but still documented

**Files modified:** `bbj-vscode/package.json`, `documentation/docs/vscode/configuration.md`, `documentation/docs/vscode/commands.md`
**Commit:** 41b0b50b
**Applied fix:** The `bbj.formatter.javaPath` description and both doc passages now say the setting is
deprecated and has no effect, and that formatting runs through the language server and BBjServices
(BBj 26.03 or later). The setting stays declared (type, default and scope unchanged, which the manifest
test pins) until its scheduled removal.

### IN-04: `FORMATTER_KEY_PREFIX` is used above its declaration (partly applied)

**Files modified:** `bbj-vscode/src/language/bbj-format-service.ts`
**Commit:** 52a1be18
**Applied fix:** Moved the constant above its first use, with a one-line doc comment.
**Not applied:** making `BBjFormatter` delegate to the handler's `formatOpenDocument`. The two read the
document from different stores (a Langium document versus the open-document store), so merging them is
a refactor, not a minimal fix.

### IN-05: Initialization options, now carrying formatter values, are logged at debug

**Files modified:** `bbj-vscode/src/language/bbj-ws-manager.ts`
**Commit:** 4ddf1f31
**Applied fix:** The debug line now replaces the `formatter` value with `[omitted]` before
serializing, so the local `javaPath` and the other formatter values never reach the log.

## Skipped Issues

### WR-01: Legacy `splitSingleLineIF` fallback cannot work once the new key has a declared default

**File:** `bbj-vscode/src/language/bbj-format-settings.ts:120-124` (fed by `bbj-vscode/src/extension.ts:768`)
**Reason:** Latent, not a defect today: `splitSingleLineIf` is not declared in `package.json`, so the
merged object never carries it. A real fix has to rebuild the formatter payload from `inspect()` values
in three trust-gated handoffs (initialization options, push, pull middleware), and a normalizer-only
workaround would contradict the pinned rule that the new key wins over the legacy one. This belongs with
the settings phase that declares the new key and decides its default; that phase should add the
merged-object test the review describes.
**Original issue:** `normalizeFormatterSettings` maps the legacy key only when the new key is absent,
but VS Code hands over the object merged with declared defaults.

### IN-02: Open Settings lands on a view that can show only 4 of the 15 keys

**File:** `bbj-vscode/src/extension.ts:610-617`, `bbj-vscode/package.json:410-440`
**Reason:** Known gap the roadmap defers to the settings phase, which declares all 15 keys. Switching
the button to `settings.json` in the meantime would be throwaway work. Needs the settings phase to land
before release.
**Original issue:** The invalid-settings warning opens the Settings UI filtered to `bbj.formatter`, but
most of the enum keys the peer is likely to reject are not declared and so are not shown.

---

_Fixed: 2026-10-02T08:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
