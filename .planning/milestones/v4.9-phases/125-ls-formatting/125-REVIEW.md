---
phase: 125-ls-formatting
reviewed: 2026-10-02T06:15:00Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjLspFormattingSwitchTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijCouplingCanaryTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijImportAllowlistTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java
  - bbj-vscode/src/extension.ts
  - bbj-vscode/src/language/bbj-format-edit.ts
  - bbj-vscode/src/language/bbj-format-service.ts
  - bbj-vscode/src/language/bbj-format-settings.ts
  - bbj-vscode/src/language/bbj-formatter.ts
  - bbj-vscode/src/language/bbj-formatting-handler.ts
  - bbj-vscode/src/language/bbj-module.ts
  - bbj-vscode/src/language/bbj-notifications.ts
  - bbj-vscode/src/language/bbj-ws-manager.ts
  - bbj-vscode/src/language/configuration-change-handler.ts
  - bbj-vscode/src/language/format-settings-notification.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/test/activation-command-coverage.test.ts
  - bbj-vscode/test/bbj-format-edit.test.ts
  - bbj-vscode/test/bbj-format-notices.test.ts
  - bbj-vscode/test/bbj-format-service.test.ts
  - bbj-vscode/test/bbj-format-settings-intake.test.ts
  - bbj-vscode/test/bbj-format-settings.test.ts
  - bbj-vscode/test/bbj-formatter-capability.test.ts
  - bbj-vscode/test/bbj-formatter.test.ts
  - bbj-vscode/test/bbj-formatting-handler.test.ts
  - bbj-vscode/test/bbj-test-module.ts
  - bbj-vscode/test/configuration-change-handler.test.ts
  - bbj-vscode/test/document-builder.test.ts
  - bbj-vscode/test/extension-activation.test.ts
  - bbj-vscode/test/extension-config-trust.test.ts
  - bbj-vscode/test/functional/program-live.test.ts
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
status: issues_found
---

# Phase 125: Code Review Report

**Reviewed:** 2026-10-02T06:15:00Z
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Summary

Reviewed the language-server formatting path end to end (client settings, intake, handler, service,
edit minimizer, notices, IntelliJ switch) against the diff from `d50456b4^`. The 13 new/changed
vitest suites for this path pass locally (217 tests). The edit minimizer, the staleness check, the
peer-data guards (reached through `java-interop-errors.ts` and `java-program-guard.ts`), and the
IntelliJ switch hold up. For the switch I decompiled LSP4IJ 0.21.0 and confirmed that the formatting
support and the client-side on-type handler both gate on `isEnabled`, `isSupported` and
`isRangeFormattingSupported`, so overriding those four methods does cover Reformat Code, Actions on
Save and the typed-character triggers.

No blockers. The three warnings are a latent defect in the legacy-key mapping, formatter failures
that leave no trace above debug level, and a notice scoping that silences content-dependent engine
failures for the rest of a connection.

No planning identifiers appear in the added source or test lines.

## Warnings

### WR-01: Legacy `splitSingleLineIF` fallback cannot work once the new key has a declared default

**File:** `bbj-vscode/src/language/bbj-format-settings.ts:120-124` (fed by `bbj-vscode/src/extension.ts:768`)
**Issue:** `normalizeFormatterSettings` maps the legacy `splitSingleLineIF` onto `splitSingleLineIf`
only when `ownValue(source, 'splitSingleLineIf') === undefined`. The client hands over
`getConfiguration("bbj").get("formatter")`, which VS Code returns merged with every declared default.
Today `splitSingleLineIf` is not declared in `package.json`, so the key is absent and the fallback
works. As soon as the new key is declared with `default: false` (the settings work in
the roadmap does exactly that), the merged object always contains `splitSingleLineIf: false`. The
legacy `true` a user set is then silently ignored, which breaks the stated guarantee that a user who
set `splitSingleLineIF` keeps that behaviour. The unit tests pass raw objects, so they can't catch it.
`usesLegacySplitKey` has the same blind spot, so the Open Settings message would also name the wrong
key.
**Fix:** Decide presence from what the user set, not from the merged object. In the client, build the
`formatter` payload from `inspect()` (user, workspace and folder values only, no `defaultValue`), or
send `splitSingleLineIF` and `splitSingleLineIf` as their own `inspect()`-derived values. Add a test
that feeds a merged object (`{ splitSingleLineIF: true, splitSingleLineIf: false }`) in the same shape
VS Code produces and asserts which one wins. If the new key stays declared without a default, add a
test pinning that.

### WR-02: Unexpected formatter exceptions are swallowed with no log above debug (handler: no log at all)

**File:** `bbj-vscode/src/language/bbj-format-service.ts:212-215`, `bbj-vscode/src/language/bbj-formatting-handler.ts:60-62`
**Issue:** Every defect inside `format()` (a bad uri, a bug in `minimalLineEdit`, a throwing
`paramsFor`) becomes `[]` with only `logger.debug(...)`. `formatOpenDocument` then has a second
`catch { return []; }` that records nothing. To the user "Format Document" simply does nothing, and
the log shows nothing unless `bbj.debug` is on. The handler catch also hides the case where
`deps.format` itself rejects. Every other failure kind in this service logs at warn on first
occurrence; the unexpected one is the only kind with no signal.
**Fix:** Route the service catch through the same first-occurrence ledger at warn level, for example
`this.notice('unexpected-error', generation, \`Format notice: unexpected-error (${name})\`)`, with no
user message. In the handler, log the error name at debug at the very least, so the two catch layers
are not both silent:
```ts
} catch (error) {
    logger.debug(`Format request failed in the handler (${error instanceof Error ? error.name : 'unknown'})`);
    return [];
}
```

### WR-03: Content-dependent engine failures and repeat timeouts are shown once per connection, then silent

**File:** `bbj-vscode/src/language/bbj-format-service.ts:281-284, 351-354`
**Issue:** `format-failed`, `parser-exception`, `malformed-result` and `timeout` go through
`environmentNotice`, scoped to the connection generation. `format-failed` and `parser-exception` are
caused by the content of one file (the formatter engine choking on a particular program), yet after
the first file triggers the notice, every later file that fails the same way, and every later timeout,
gets no message for the rest of the session. A user pressing Format Document sees nothing happen and
only a debug log line. `malformed-result` and `format-failed` also share the key `engine-failed|<gen>`,
so one suppresses the other even though they have different causes. This contradicts the stated rule
in the `report` Javadoc that a message about one document's content is scoped to that document.
**Fix:** Scope `format-failed` and `parser-exception` with `documentScope` (use `contentNotice`) and
give `malformed-result` its own kind so it does not share a key. Keep `timeout` per connection if the
once-per-connection behaviour is intended, but then say so in the message ("further timeouts are
logged only"), or scope it per document and version as well.

## Info

### IN-01: The IntelliJ switch Javadoc claims on-type formatting is covered; the server-side feature is not gated

**File:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/lsp/BbjLanguageServerFactory.java:28-34`
**Issue:** The decompiled LSP4IJ has a separate `LSPOnTypeFormattingFeature` (server-driven
`textDocument/onTypeFormatting`) that this factory does not override. The client-side on-type triggers
are covered by the four overrides, but server-side on-type formatting is safe only because
`BBjFormatter.formatOnTypeOptions` returns `undefined` (so the server does not advertise it). Neither
the coupling canary nor the source guard pins that dependency.
**Fix:** Reword the Javadoc to say server-side on-type formatting is never offered because the server
does not advertise it. Optionally add an `LSPOnTypeFormattingFeature` canary entry next to the
formatting ones.

### IN-02: Open Settings lands on a view that can show only 4 of the 15 keys

**File:** `bbj-vscode/src/extension.ts:610-617`, `bbj-vscode/package.json:410-440`
**Issue:** The invalid-settings warning offers Open Settings, which opens the Settings UI filtered to
`bbj.formatter`. Only `indentWidth`, `removeLineContinuation`, `keywordsToUppercase`,
`splitSingleLineIF` and `javaPath` are declared. The enum-valued keys the peer is most likely to reject
(`ifClosingKeyword`, `operatorSpacing`, `eolCharacter`, and others) are not shown by the Settings UI
at all, so the user can't fix them from the view the button opens. The roadmap defers declaring all 15
to the settings phase, so this is a known gap, not an oversight.
**Fix:** Make sure the settings phase lands before this is released, or open `settings.json` instead
until it does.

### IN-03: The old client-side formatter and `javaPath` setting are dead but still shipped and documented

**File:** `bbj-vscode/src/document-formatter.ts`, `bbj-vscode/src/formatter-verifier.ts`, `bbj-vscode/src/formatter-java-resolver.ts`, `bbj-vscode/package.json:434-440`, `documentation/docs/vscode/configuration.md:320-381`
**Issue:** `extension.ts` no longer imports `document-formatter.ts`, so these modules, the
`BBjCFCli.jar` tooling and the `bbj.formatter.javaPath` setting are now unreachable. The setting's
description still promises "formatting is cancelled with an error" for an invalid path, which no
longer happens, and the user guide still documents it. The roadmap schedules removal (SET-04, CUT-02),
so this is an interim state.
**Fix:** Keep this phase's branch from releasing before those removals land, or mark `javaPath`
deprecated and no-op in its description in the meantime.

### IN-04: `FORMATTER_KEY_PREFIX` is used above its declaration; the formatting duplication is easy to drift

**File:** `bbj-vscode/src/language/bbj-format-service.ts:74, 89`; `bbj-vscode/src/language/bbj-formatter.ts:39-51` vs `bbj-vscode/src/language/bbj-formatting-handler.ts:42-63`
**Issue:** `invalidSettingsMessage` references `FORMATTER_KEY_PREFIX`, a `const` declared 15 lines
later. It works because the function is only called after module evaluation, but it reads as a
temporal-dead-zone trap. Separately, `BBjFormatter.formatOpenText` and `formatOpenDocument` each
implement the language gate and build the `BBjFormatRequest`, with different document sources (a
Langium document's `textDocument` versus the open-document store). That is two places to keep in sync.
**Fix:** Move the constant above its first use. Have `BBjFormatter` delegate to the handler's
`formatOpenDocument` (or a shared helper) so the gate and request construction live in one place.

### IN-05: Initialization options, now carrying formatter values, are logged at debug

**File:** `bbj-vscode/src/language/bbj-ws-manager.ts:64`
**Issue:** The pre-existing `logger.debug(() => \`Initialization options received: ${JSON.stringify(params.initializationOptions)}\`)`
now includes the whole `formatter` object, including the local `javaPath` that the format service
deliberately drops. `setSettings` states "Only the revision is logged, never the values", but this
line logs them. Debug-only, so low risk.
**Fix:** Redact the `formatter` key in this log line, or log only the keys.

---

_Reviewed: 2026-10-02T06:15:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
