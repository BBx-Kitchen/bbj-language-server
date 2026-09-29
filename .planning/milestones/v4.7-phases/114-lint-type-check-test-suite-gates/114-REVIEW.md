---
phase: 114-lint-type-check-test-suite-gates
reviewed: 2026-09-27T21:46:08Z
depth: standard
files_reviewed: 115
files_reviewed_list:
  - .github/workflows/build.yml
  - bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/BbjNodeDownloaderProgressTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/BbjNodeDownloaderSourceGuardTest.java
  - bbj-intellij/src/test/java/com/basis/bbj/intellij/lsp/Lsp4ijOverrideSiteSourceGuardTest.java
  - bbj-vscode/eslint.config.js
  - bbj-vscode/package.json
  - bbj-vscode/src/document-formatter.ts
  - bbj-vscode/src/extension.ts
  - bbj-vscode/src/language/bbj-comment-provider.ts
  - bbj-vscode/src/language/bbj-completion-provider.ts
  - bbj-vscode/src/language/bbj-definition-provider.ts
  - bbj-vscode/src/language/bbj-document-builder.ts
  - bbj-vscode/src/language/bbj-document-symbol-provider.ts
  - bbj-vscode/src/language/bbj-hover.ts
  - bbj-vscode/src/language/bbj-linker.ts
  - bbj-vscode/src/language/bbj-module.ts
  - bbj-vscode/src/language/bbj-scope.ts
  - bbj-vscode/src/language/bbj-ws-manager.ts
  - bbj-vscode/src/language/java-interop.ts
  - bbj-vscode/src/language/java-javadoc.ts
  - bbj-vscode/src/language/utils.ts
  - bbj-vscode/src/language/validations/line-break-validation.ts
  - bbj-vscode/test/addchildwindow-composer-ui.test.ts
  - bbj-vscode/test/addchildwindow-composer.test.ts
  - bbj-vscode/test/addwindow-composer-ui.test.ts
  - bbj-vscode/test/addwindow-composer.test.ts
  - bbj-vscode/test/bbj-cpl-fallback-dedup.test.ts
  - bbj-vscode/test/bbj-document-validator.test.ts
  - bbj-vscode/test/bbj-parser-service.test.ts
  - bbj-vscode/test/bbj-test-module.ts
  - bbj-vscode/test/builtin-functions-library.test.ts
  - bbj-vscode/test/builtin-library-members.test.ts
  - bbj-vscode/test/class-validations-issues.test.ts
  - bbj-vscode/test/classes.test.ts
  - bbj-vscode/test/code-action.test.ts
  - bbj-vscode/test/commands-cjs-execution.test.ts
  - bbj-vscode/test/commands-cjs-harness.ts
  - bbj-vscode/test/compile-request.test.ts
  - bbj-vscode/test/completion-test.test.ts
  - bbj-vscode/test/composer-call-scanner.test.ts
  - bbj-vscode/test/composer-codelens-handler.test.ts
  - bbj-vscode/test/composer-codelens.test.ts
  - bbj-vscode/test/composer-commands.test.ts
  - bbj-vscode/test/composer-cue-single-source.test.ts
  - bbj-vscode/test/config-hot-reload-wiring.test.ts
  - bbj-vscode/test/config-path-resolution.test.ts
  - bbj-vscode/test/config-reload-host.test.ts
  - bbj-vscode/test/conformance-regressions.test.ts
  - bbj-vscode/test/cpl-service.test.ts
  - bbj-vscode/test/declare-in-class.test.ts
  - bbj-vscode/test/document-builder-rebuild-guard.test.ts
  - bbj-vscode/test/em-properties-reader-guard.test.ts
  - bbj-vscode/test/eslint-disable-directives.test.ts
  - bbj-vscode/test/example-files.test.ts
  - bbj-vscode/test/examples-compile.test.ts
  - bbj-vscode/test/extension-activation.test.ts
  - bbj-vscode/test/extension-config-trust.test.ts
  - bbj-vscode/test/extensionless-use-target.test.ts
  - bbj-vscode/test/fake-text-document-connection.ts
  - bbj-vscode/test/file-path-completion.test.ts
  - bbj-vscode/test/formatter-pins-drift.test.ts
  - bbj-vscode/test/formatter-verifier-tamper.test.ts
  - bbj-vscode/test/functional/chevrotain-tokens.test.ts
  - bbj-vscode/test/functional/installed-extension-e2e.test.ts
  - bbj-vscode/test/functional/issue447-real-interop.test.ts
  - bbj-vscode/test/functional/lsp-features.test.ts
  - bbj-vscode/test/functional/unknown-java-member-real-interop.test.ts
  - bbj-vscode/test/gradle-wrapper-hygiene.test.ts
  - bbj-vscode/test/hover.test.ts
  - bbj-vscode/test/imports.test.ts
  - bbj-vscode/test/inheritance-cycle-validation.test.ts
  - bbj-vscode/test/java-interop-peer-guard.test.ts
  - bbj-vscode/test/java-package-name-collision.test.ts
  - bbj-vscode/test/java-qualified-name.test.ts
  - bbj-vscode/test/javadoc.test.ts
  - bbj-vscode/test/language-configuration.test.ts
  - bbj-vscode/test/lazy-prefix-loading.test.ts
  - bbj-vscode/test/line-break-single-line-if.test.ts
  - bbj-vscode/test/line-break-validation.test.ts
  - bbj-vscode/test/line-break-walk-termination.test.ts
  - bbj-vscode/test/linking.test.ts
  - bbj-vscode/test/live-parse-interleaving.test.ts
  - bbj-vscode/test/live-parse-scheduling.test.ts
  - bbj-vscode/test/logger.test.ts
  - bbj-vscode/test/lsp-protocol-single-copy.test.ts
  - bbj-vscode/test/method-body-scope.test.ts
  - bbj-vscode/test/method-return-java-type.test.ts
  - bbj-vscode/test/msgbox-composer.test.ts
  - bbj-vscode/test/on-save-kept-errors.test.ts
  - bbj-vscode/test/on-save-trigger.test.ts
  - bbj-vscode/test/overload-return-type.test.ts
  - bbj-vscode/test/overload-selector.test.ts
  - bbj-vscode/test/parser-ambiguity-logging.test.ts
  - bbj-vscode/test/parser-keyword-statements.test.ts
  - bbj-vscode/test/parser.test.ts
  - bbj-vscode/test/process-runner.test.ts
  - bbj-vscode/test/run-call-file-resolution.test.ts
  - bbj-vscode/test/run-call-navigation.test.ts
  - bbj-vscode/test/scope-cost-regression.test.ts
  - bbj-vscode/test/setopts-catalog.test.ts
  - bbj-vscode/test/setopts-code-scanner.test.ts
  - bbj-vscode/test/setopts-in-code-request.test.ts
  - bbj-vscode/test/unknown-java-member.test.ts
  - bbj-vscode/test/unresolvable-type.test.ts
  - bbj-vscode/test/use-path-containment.test.ts
  - bbj-vscode/test/use-project-root.test.ts
  - bbj-vscode/test/utils.test.ts
  - bbj-vscode/test/validation-function-calls.test.ts
  - bbj-vscode/test/validation.test.ts
  - bbj-vscode/test/variable-scoping.test.ts
  - bbj-vscode/test/webview-panel-lifecycle.test.ts
  - bbj-vscode/test/workflow-secret-hygiene.test.ts
  - bbj-vscode/tsconfig.test.json
  - bbj-vscode/vitest.config.ts
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 114: Code Review Report

**Reviewed:** 2026-09-27T21:46:08Z
**Depth:** standard
**Files Reviewed:** 115
**Status:** issues_found

## Summary

This phase adds Lint and Type-check gates to CI (`build.yml`, `package.json`, `eslint.config.js`,
`tsconfig.test.json`, `vitest.config.ts`) and burns down the resulting lint/type errors across 21
production TS files, one IntelliJ Java file, and ~90 test files.

All 21 non-test production TypeScript files were diffed against `e8941d48` line-by-line. Every
change in those files is a mechanical, behavior-preserving type-safety improvement: `any`/`as any`
casts replaced with structural types or `unknown`-narrowing helper functions, `let`→`const` where
never reassigned, unused parameters prefixed with `_`, and one dead-catch-binding removal
(`catch (error)` → `catch`) repeated across several files. I traced each of these through their
call sites and found no behavioral change. One pre-existing quality defect was found in
`document-formatter.ts` that survived the type-narrowing pass unfixed (WR-01 below).

The `BbjNodeDownloader.java` change is a genuine (non-lint) behavior fix — re-asserting
`setIndeterminate(false)` on every progress step instead of only once before `pipeline.install(...)`
— and is now covered by a new, well-constructed behavioral unit test
(`BbjNodeDownloaderProgressTest.java`) using a hand-rolled JDK-proxy fake `ProgressIndicator`; the
corresponding structural guard test that only checked source text was correctly retired in favor of
the new behavioral coverage.

Across the ~90 test files, the dominant mechanical change is `d.message` → `Diagnostic.getMessageString(d)`
(required because `Diagnostic.message` can be `string | MarkupContent`); I confirmed
`getMessageString` returns the plain string unchanged for the string case, so no assertion was
weakened. I grepped the full test diff for skip/only markers, added `eslint-disable` comments, and
assertion-count changes; none were found. One systematic, non-mechanical change was found that goes
beyond the stated lint/type-fix scope — WR-02 below — and is worth a second look even though it
appears intentional and is well-commented in place. No planning IDs (`D-xx`, `CR-xx`, `WR-xx`,
`T-114-xx`, `TEST-xx`, `FIX-xx`, `11x-xx`) were found in any added line across the reviewed files.

## Warnings

### WR-01: Dead if/else in the formatter's child-process error handler survives the type-safety pass

**File:** `bbj-vscode/src/document-formatter.ts:173-180`
**Issue:** The phase's own diff touched this exact block (replacing `(err as any).code` with a
typed `NodeJS.ErrnoException` cast), but left the surrounding logic untouched:
```ts
p.on('error', (err) => {
  const errno = err as NodeJS.ErrnoException;
  if (err && errno.code === 'ENOENT') {
    return reject(err);
  } else {
    return reject(err);
  }
});
```
Both branches are identical (`return reject(err)`), so the `ENOENT` check is dead code — it
special-cases nothing. Either the ENOENT branch was meant to produce a more specific
`FormatterArtifactError` (e.g. "java executable not found") the way the sibling `catch` block a few
lines above does, or the branching should be deleted as noise. As written it silently masks the gap:
a missing `java` executable on `PATH` surfaces as a bare `Error` with no actionable message, while
line ~161's `catch` block correctly wraps the equivalent failure from the resolution path in a
`FormatterArtifactError`.
**Fix:**
```ts
p.on('error', (err) => {
  const errno = err as NodeJS.ErrnoException;
  if (errno.code === 'ENOENT') {
    return reject(new FormatterArtifactError(`Formatter java executable not found: ${errno.message}`));
  }
  return reject(err);
});
```

### WR-02: Mass conversion of test service wiring (`createBBjServices` → `createBBjTestServices`) exceeds the stated lint/type-fix scope

**File:** e.g. `bbj-vscode/test/builtin-functions-library.test.ts:6`, `bbj-vscode/test/builtin-library-members.test.ts:7`, `bbj-vscode/test/class-validations-issues.test.ts:4`, `bbj-vscode/test/conformance-regressions.test.ts:6`, `bbj-vscode/test/hover.test.ts:5` (and others — roughly 15 files)
**Issue:** These files switched their top-level `services` from
`createBBjServices(EmptyFileSystem)` (production DI wiring, real `JavaInteropService`) to
`createBBjTestServices(EmptyFileSystem)` (the test double with `JavaInteropTestService`'s fixed
fake classpath: BBjAPI, HashMap, String, java.lang.Class). Each site carries a comment explaining
the rationale ("hermetic test-double services, no real Java-interop socket round trip"), and none of
the assertions I traced depend on Java classes outside the fake's fixed set, so I found no case
where this silently weakened an assertion. However, this is a behavior change to what is exercised
by the test suite (a different `Module`/DI graph, not just a type annotation), not a lint or
type-check fix, and it is applied broadly enough that it's worth a second reviewer's explicit
sign-off: confirm that every test moved onto the fake still gets equivalent real-service coverage
somewhere else (the `test/functional/*-real-interop.test.ts` suite, gated behind
`shouldRunBBjTests()`), and that none of the moved tests were implicitly relying on interop
resolving a real Java class not present in the fake's classpath (which would make an assertion
vacuously pass instead of testing what it claims to).
**Fix:** No code change required if the above is confirmed; otherwise, revert the swap for any file
where the fake's fixed classpath (BBjAPI/HashMap/String/java.lang.Class) doesn't actually cover
what the test claims to validate.

## Info

### IN-01: Duplicated, inconsistently-typed `readSimpleName` helper across two files

**File:** `bbj-vscode/src/language/bbj-hover.ts:196-204`, `bbj-vscode/src/language/java-javadoc.ts:13-20`
**Issue:** Both files introduce a `readSimpleName` helper to replace the same
`(node as any)['simpleName']` pattern, but with different signatures:
`bbj-hover.ts` returns `unknown` (no runtime narrowing), while `java-javadoc.ts` returns
`string | undefined` (narrows with `typeof raw === 'string'`). Both are reading the identical
runtime-only DTO property (documented as such in both files' comments, each referencing the other).
The `bbj-hover.ts` version is technically weaker: if `simpleName` were ever a non-string truthy
value, `bbj-hover.ts`'s `${simpleName ? simpleName : node.name}` would interpolate it as-is (e.g.
`[object Object]`) rather than falling back to `node.name`, while `java-javadoc.ts`'s version would
correctly fall back. This is only a latent risk given both comments assert the property is "never a
non-string truthy value in practice," but the duplication itself is a maintenance smell — a future
change to the interop DTO shape only needs to update one of the two copies to silently diverge from
the other.
**Fix:** Move a single `readSimpleName(node: AstNode): string | undefined` (the `java-javadoc.ts`
version) into a shared module (e.g. `utils.ts`) and import it from both call sites.

---

_Reviewed: 2026-09-27T21:46:08Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
