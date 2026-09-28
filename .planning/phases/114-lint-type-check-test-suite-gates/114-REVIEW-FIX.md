---
phase: 114-lint-type-check-test-suite-gates
fixed_at: 2026-09-28T05:40:00Z
review_path: .planning/phases/114-lint-type-check-test-suite-gates/114-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 114: Code Review Fix Report

**Fixed at:** 2026-09-28T05:40:00Z
**Source review:** .planning/phases/114-lint-type-check-test-suite-gates/114-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (WR-01, WR-02, IN-01 — `fix_scope: all`)
- Fixed: 2 (WR-01 code change, IN-01 code change)
- Verified / no code change needed: 1 (WR-02)
- Skipped: 0

## Fixed Issues

### WR-01: Dead if/else in the formatter's child-process error handler survives the type-safety pass

**Files modified:** `bbj-vscode/src/document-formatter.ts`
**Commit:** `9907bb96`
**Applied fix:** The `p.on('error', ...)` handler in `runFormatter` had two identical branches
(`return reject(err)` in both the `ENOENT` and else case), so a missing `java` executable
surfaced as a bare `Error` with no actionable message. Replaced with the suggested fix,
matching the sibling `catch`/`resolveFormatterJava` blocks a few lines above that build a
`FormatterArtifactError` (a plain `class FormatterArtifactError extends Error {}`, so any
single-string message works with its inherited constructor): an `ENOENT` spawn error now
rejects with `new FormatterArtifactError(\`Formatter java executable not found: ${errno.message}\`)`;
every other spawn error still rejects with the raw `err` unchanged.

**Verification:**
- Tier 1: re-read the modified block (`bbj-vscode/src/document-formatter.ts:173-179`) — fix
  text present, surrounding code (the `close`/`stdin.end` handlers below) untouched.
- Tier 2: `npx tsc --noEmit -p tsconfig.json` — 0 errors (full project, not just this file).
  `npx eslint src/document-formatter.ts` — clean. `npx vitest run test/document-formatter.test.ts`
  — 20/20 passed, including the existing `P62-D2-010` (non-ENOENT) and `P62-D5-006`
  (`rejects with the underlying error when java is not found (ENOENT)`) regression tests; both
  already asserted only `rejects.toBeTruthy()`, so no test edit was required — the new
  `FormatterArtifactError` instance still satisfies that assertion and is now a more specific,
  actionable rejection value than before.
- Full-suite and lint gates: `npm run lint` (from `bbj-vscode/`) — clean, 0 warnings/errors.
  Full `npx vitest run --maxWorkers=2` — 3455 passed, 31 skipped, 11 failed (2 test files),
  identical in name and count to this repo's documented pre-existing local java-interop
  `:5008` environment drift (`test/linking.test.ts` interop-related tests and
  `test/functional/installed-extension-e2e.test.ts`'s SETOPTS-in-code #475 case) — unrelated to
  `document-formatter.ts` and not introduced by this fix.
- **Verification environment:** all commands above (`tsc`, `eslint`, `vitest`) were run inside
  an isolated review-fix worktree (`.claude/worktrees/rf-114-4008192-1790572971`), with
  `node_modules` and `src/language/generated` made available via a plain symlink into the main
  checkout (the worktree does not run `npm install` or `npm run langium:generate` on its own;
  the symlinked targets are identical to what a fresh `npm install` + `langium:generate` in the
  main checkout would produce, since neither `package.json`/`package-lock.json` nor
  `bbj.langium` changed in this fix). Both symlinks were removed before committing; the commit
  itself contains only `bbj-vscode/src/document-formatter.ts`. These numbers are reproducible
  from the main checkout (`bbj-vscode/`) after the worktree is fast-forwarded and torn down.

### IN-01: Duplicated, inconsistently-typed `readSimpleName` helper across two files

**Files modified:** `bbj-vscode/src/language/utils.ts`, `bbj-vscode/src/language/java-javadoc.ts`,
`bbj-vscode/src/language/bbj-hover.ts`
**Commit:** `63db8ea8`
**Applied fix:** `bbj-hover.ts` had its own `readSimpleName(node: AstNode): unknown` (no runtime
narrowing) while `java-javadoc.ts` had `readSimpleName(clazz: JavaClass): string | undefined`
(narrows with `typeof raw === 'string'`), both reading the same interop-only DTO property. Moved
the stronger, narrowed `string | undefined` version — generalized to take `AstNode` (the
supertype of `JavaClass`, so all four `bbj-hover.ts` call sites — `isJavaClass`, `isJavaField`,
`isFieldDecl`, `isBbjClass` — keep working unchanged) — into `bbj-vscode/src/language/utils.ts`
as an exported function, and imported it from both `java-javadoc.ts` and `bbj-hover.ts`, deleting
both local copies and their now-redundant cross-referencing comments. `utils.ts` had zero
internal imports before this change (confirmed via `grep` for its importers:
`bbj-scope.ts`, `java-interop.ts` — neither is imported by `bbj-hover.ts` or `java-javadoc.ts`),
so adding the `langium` `AstNode` import introduces no import cycle. `bbj-hover.ts`'s
`simpleName ? simpleName : node.name` fallback pattern (used at all four call sites) is
unaffected by the narrower return type: `string | undefined` still falls back to `node.name` on
`undefined` or an empty string exactly as `unknown` did.

**Verification:**
- Tier 1: re-read `bbj-vscode/src/language/utils.ts` (new exported `readSimpleName`),
  `bbj-vscode/src/language/java-javadoc.ts:1-13` (import added, local helper removed), and
  `bbj-vscode/src/language/bbj-hover.ts:1-17,196-238` (import added, local helper removed, all
  four call sites — `documentationHeader`'s `isJavaClass`/`isJavaField`/`isFieldDecl`/`isBbjClass`
  branches — unchanged) — fix text present, surrounding code intact.
- Tier 2: `npx tsc -b tsconfig.json --noEmit` (main source project) — 0 errors.
  `npm run typecheck:test` (`tsc -p tsconfig.test.json --noEmit`) — 0 errors.
  `npm run lint` (`eslint src test --max-warnings 0`) — clean.
  `npx vitest run test/hover.test.ts test/javadoc.test.ts` — 23/23 passed.
  `npx vitest run test/utils.test.ts` — 1/1 passed (the modified shared module's own test file).
- **Verification environment:** all commands above were run directly in the main checkout
  (`/home/coder/repos/bbj-language-server`, branch `gsd/v4.7-audit-hygiene-burndown`) — no
  worktree was used for this fix (per explicit instruction for this run), so these numbers are
  reproducible from the tree as committed.

## Verified — No Code Change Needed

### WR-02: Mass conversion of test service wiring (`createBBjServices` -> `createBBjTestServices`) exceeds the stated lint/type-fix scope

**Status:** no_change_needed / verified

**Method:** Diffed `bbj-vscode/test` against the base commit (`e8941d48..HEAD`) and identified
every file that swapped its top-level `services` from `createBBjServices(EmptyFileSystem)` (or
the `{ fileSystemProvider: ... }` variant) to `createBBjTestServices(...)`. This produced 28
files (a superset of the ~15 the review sampled):

`bbj-document-validator.test.ts`, `builtin-functions-library.test.ts`,
`builtin-library-members.test.ts`, `class-validations-issues.test.ts`, `classes.test.ts`,
`composer-codelens-handler.test.ts`, `composer-codelens.test.ts`,
`conformance-regressions.test.ts`, `declare-in-class.test.ts`,
`document-builder-rebuild-guard.test.ts`, `extensionless-use-target.test.ts`,
`functional/chevrotain-tokens.test.ts`, `hover.test.ts`, `lazy-prefix-loading.test.ts`,
`line-break-single-line-if.test.ts`, `line-break-validation.test.ts`,
`overload-selector.test.ts`, `parser-keyword-statements.test.ts`, `parser.test.ts`,
`run-call-file-resolution.test.ts`, `run-call-navigation.test.ts`,
`setopts-code-scanner.test.ts`, `setopts-in-code-request.test.ts`,
`use-path-containment.test.ts`, `use-project-root.test.ts`,
`validation-function-calls.test.ts`, `validation.test.ts`, `variable-scoping.test.ts`

For each file, grepped for every Java-class-shaped token referenced anywhere in the file
(`java.*` fully-qualified names, and common real-JDK identifiers such as `ArrayList`, `List<`,
`Iterator`, `Exception`, `System.`, `BigDecimal`, `LocalDate`) and cross-checked each hit against
`JavaInteropTestService`'s fixed fake classpath in `bbj-vscode/test/bbj-test-module.ts`
(`BBjAPI`, `java.util.HashMap`, `java.lang.String`, `java.lang.Class`, `com.test.SysGui`).

**Findings:**
- Every `java.*` reference across the 28 files resolves to `java.lang.String` or
  `java.util.HashMap` — both present in the fake classpath (`variable-scoping.test.ts`'s 8
  occurrences, `overload-selector.test.ts`'s `java.lang.String`).
- Two references fall outside the fake set (`java.lang.Boolean` and `java.lang.Object` in
  `parser.test.ts:108-109` and `overload-selector.test.ts:44`), but neither test asserts on
  interop-resolved type data for them: `parser.test.ts`'s "Parse Class Decl" test only calls
  `expectNoParserLexerErrors` (parser/lexer errors only — Java class resolution does not affect
  parsing); `overload-selector.test.ts`'s tie-break test explicitly documents and relies on
  `java.lang.Object` being an *unresolved* argument type ("both score identically (typeAffinity
  returns 0 for an unrecognized/undefined arg type)") — the fake's non-resolution of
  `java.lang.Object` is the scenario the test is built to exercise, not a gap it papers over.
- The `BBj*`-prefixed identifiers seen across these files (`BBjString`, `BBjNumber`,
  `BBjWindow`, `BBjVector`, `BBjArray`, `BBjButton`, `BBjStaticText`, `BBjNamespace`,
  `BBjSemaphore`, `BBjTokenBuilder`, `BBjCPL`, `BBjDocuments`, `BBjWorkspaceManager`, etc.) are
  either BBj-native built-in classes resolved from `bbj-vscode/src/language/lib/functions.bbl`
  (unrelated to `JavaInteropService`) or unrelated production service/class names picked up by
  the identifier-shaped grep — not Java-interop-resolved classes, so the swap does not affect
  them either way.
- No `use <fqn>` statement in any of the 28 files names a real Java package/class outside the
  fake's fixed set.
- Ran all 28 swapped test files together
  (`npx vitest run <28 files> --maxWorkers=2`): 1095 passed, 1 skipped, 0 failed.

**Conclusion:** confirms the review's own tentative finding — no assertion in the 28 swapped
files depends on a Java class outside `JavaInteropTestService`'s fixed fake classpath, so no
revert is warranted. No commit was made for WR-02.

---

_Fixed: 2026-09-28T05:40:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
