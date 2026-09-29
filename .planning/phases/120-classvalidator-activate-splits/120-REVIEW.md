---
phase: 120-classvalidator-activate-splits
reviewed: 2026-09-29T08:06:02Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - bbj-vscode/src/Commands/Commands.cjs
  - bbj-vscode/src/diagnostic-status-bars.ts
  - bbj-vscode/src/em-auth.ts
  - bbj-vscode/src/em-script-runner.ts
  - bbj-vscode/src/extension.ts
  - bbj-vscode/src/language/validations/check-class-reference.ts
  - bbj-vscode/src/language/validations/check-classes.ts
  - bbj-vscode/src/language/validations/check-constructor.ts
  - bbj-vscode/src/language/validations/check-cyclic-inheritance.ts
  - bbj-vscode/src/language/validations/check-return-types.ts
  - bbj-vscode/src/language/validations/check-variable-scoping.ts
  - bbj-vscode/src/language/validations/class-types.ts
  - bbj-vscode/src/open-file-prompts.ts
  - bbj-vscode/test/activation-command-coverage.test.ts
  - bbj-vscode/test/activation-prompts-and-status-bars.test.ts
  - bbj-vscode/test/em-auth-error-paths.test.ts
  - bbj-vscode/test/em-script-runner.test.ts
  - bbj-vscode/test/em-secret-env-channel.test.ts
  - bbj-vscode/test/no-shell-command-construction.test.ts
findings:
  critical: 0
  warning: 1
  info: 1
  total: 2
status: issues_found
---

# Phase 120: Code Review Report

**Reviewed:** 2026-09-29T08:06:02Z
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

This phase splits `ClassValidator` (a single class in `check-classes.ts`) into five focused
modules (`check-class-reference.ts`, `check-constructor.ts`, `check-cyclic-inheritance.ts`,
`check-return-types.ts`, `class-types.ts`), splits `extension.ts`'s monolithic `activate()` into
eighteen single-purpose `register*` functions, and extracts EM login/token-validation into
`em-auth.ts` on top of one shared owner-only-output runner, `em-script-runner.ts`.

I diffed every reviewed source file against `diff_base` (`a2d08e2`) rather than trusting the
"behaviour-neutral" framing, and traced every extracted function body back to its original
location line-by-line. The `ClassValidator` split is a byte-identical de-classing: every method
body, string, and conditional is unchanged; only `this.foo(...)` calls became `foo(...)` calls
with explicitly threaded parameters (`javaInterop`, `inferer`), and `registry.register(checks,
validator)` correctly drops the now-unused `thisObj` argument (none of the extracted functions
reference `this`). The `activate()` split is likewise a straight cut-and-paste into
`register*(context, deps)` functions called in the same order, confirmed by the pinned
`activation-command-coverage.test.ts` sequence assertion, which still passes. The EM
login/validation extraction preserves the exact nested try/catch/finally shape and error-message
strings from the base `extension.ts`, now routed through `em-script-runner.ts`'s
`runScriptToOwnerOnlyFile`, and `em-auth-error-paths.test.ts` (written to pin the base's behavior
before the move) still passes unmodified against the new code.

`npx tsc --noEmit`, `npx eslint` on all 19 files, and the full targeted test set (validation,
activation, EM auth/script-runner/secret-channel, no-shell-command-construction,
method-return-java-type, em-token-expiry-wiring, em-login-username) all pass clean.

One real, intentional behavior narrowing was found relative to `diff_base`: `getEMCredentials`'s
fallback to a `bbj.em.credentials` stored-JSON credential (present in the base `extension.ts`) is
gone from the new `em-auth.ts`. I traced write-sites for that key across the whole tree and found
none — nothing in this repo, at `diff_base` or otherwise, ever calls
`secrets.store('bbj.em.credentials', ...)`, so the fallback was already dead in practice. It is
also called out explicitly in `120-04-SUMMARY.md` (D-09) as a deliberate, documented removal, not
an accidental drop. Logged below as informational only, since it carries no runtime risk today.

## Warnings

### WR-01: `case "PROTECTED":` declares `const`s directly in the `switch` body, with no block scope

**File:** `bbj-vscode/src/language/validations/check-class-reference.ts:86-92`
**Issue:** `checkBBjClass`'s `switch (klass.visibility.toUpperCase())` declares `const
dirOfDeclaration` and `const dirOfUsage` directly inside the `PROTECTED` case, without wrapping
the case body in `{ }`. In a `switch`, all `case` labels share one lexical block, so these two
`const`s are actually scoped to the entire `switch`, not just the `PROTECTED` case — TDZ rules
currently make this harmless only because no other case references those names, and there's no
`default` clause. This carries over unchanged from the pre-refactor `ClassValidator` class method,
but the file is newly created by this phase, which is a natural point to fix it: a later
maintainer adding a `case` that also needs a local `const` (or hoisting one above the switch) can
silently hit a `SyntaxError: Identifier '...' has already been declared` or a subtly wrong TDZ
scope, and ESLint's `no-case-declarations` rule is not enabled in this project's config, so
nothing will catch it.
**Fix:** Wrap the `PROTECTED` case body in braces:
```ts
case "PROTECTED": {
    const dirOfDeclaration = dirname(uriOfDeclaration);
    const dirOfUsage = dirname(uriOfUsage);
    if (!isSubFolderOf(dirOfUsage, dirOfDeclaration)) {
        accept("error", `Protected ${typeName} '${klass.name}' (declared in ${sourceInfo}) is not visible from this directory.`, info);
    }
    break;
}
```

## Info

### IN-01: `getEMCredentials`'s dead `bbj.em.credentials` fallback is dropped (documented, zero runtime impact)

**File:** `bbj-vscode/src/em-auth.ts:25-40` (compare `diff_base`'s `bbj-vscode/src/extension.ts:421-430`)
**Issue:** At `diff_base`, `getEMCredentials` fell back from the `bbj.em.token` SecretStorage key
to a second key, `bbj.em.credentials` (`JSON.parse`d into `{username, password}`), when no token
was stored. The new `em-auth.ts` version returns `undefined` directly once the token branch
misses — the fallback is gone. Confirmed by grep across `src/` and `test/` that nothing, at
`diff_base` or in this phase, ever writes `bbj.em.credentials` via `secrets.store(...)`, so this
is provably dead code being removed, not a live path regressing. `120-04-SUMMARY.md` records this
as an intentional decision (D-09). No fix needed — recorded here only so the review artifact
reflects every externally-observable behavior delta from `diff_base`, per this phase's review
scope.
**Fix:** None required; no action.

---

_Reviewed: 2026-09-29T08:06:02Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
