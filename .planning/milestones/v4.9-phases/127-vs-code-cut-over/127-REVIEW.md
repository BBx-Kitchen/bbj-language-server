---
phase: 127-vs-code-cut-over
reviewed: 2026-10-03T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - bbj-vscode/README.md
  - bbj-vscode/package.json
  - bbj-vscode/src/Commands/Commands.cjs
  - bbj-vscode/src/Commands/process-args.ts
  - bbj-vscode/src/decompile-io.ts
  - bbj-vscode/src/denumber-command.ts
  - bbj-vscode/src/extension.ts
  - bbj-vscode/src/open-file-prompts.ts
  - bbj-vscode/src/settings-migration.ts
  - bbj-vscode/test/activation-command-coverage.test.ts
  - bbj-vscode/test/activation-prompts-and-status-bars.test.ts
  - bbj-vscode/test/command-argv-injection.test.ts
  - bbj-vscode/test/commands-cjs-execution.test.ts
  - bbj-vscode/test/commands-cjs-harness.ts
  - bbj-vscode/test/config-file-association.test.ts
  - bbj-vscode/test/config-reload-host.test.ts
  - bbj-vscode/test/decompile-io.test.ts
  - bbj-vscode/test/denumber-command.test.ts
  - bbj-vscode/test/em-auth-error-paths.test.ts
  - bbj-vscode/test/em-login-username.test.ts
  - bbj-vscode/test/em-token-expiry-wiring.test.ts
  - bbj-vscode/test/extension-activation.test.ts
  - bbj-vscode/test/extension-config-trust.test.ts
  - bbj-vscode/test/formatter-removal.test.ts
  - bbj-vscode/test/formatter-settings-schema.test.ts
  - bbj-vscode/test/no-shell-command-construction.test.ts
  - bbj-vscode/test/settings-migration-activation.test.ts
  - bbj-vscode/test/settings-migration.test.ts
  - bbj-vscode/test/stale-output-channel-repro.test.ts
  - bbj-vscode/test/target-resolution.test.ts
findings:
  critical: 0
  warning: 4
  info: 4
  total: 8
status: issues_found
---

# Phase 127: Code Review Report

**Reviewed:** 2026-10-03
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Reviewed the phase 127 diff (`f00d30be^..HEAD`) for the VS Code cut-over: the new `denumber-command.ts`
(`bbj/denum` client), `settings-migration.ts`, the typed formatter settings in `package.json`, the
plain-text decompile refusal in `Commands.cjs`, and the supporting tests. No security vulnerability or
data-loss defect was introduced. The argv construction stays shell-free, the new modules have no `vscode`
import, the migration never rejects, and no planning IDs leaked into source or test comments.

The defects are behavioural. The new tokenized-file guard in the decompile commands disagrees with the
open prompt that offers those commands, and it makes the not-yet-fixed in-place decompile defect
(backlog 999.1) harder to diagnose. Denumber of a binary file now fails with a raw VS Code error. The
legacy-spelling fallback is unreachable from VS Code by construction.

## Warnings

### WR-01: Decompile guard refuses symlinked tokenized files that the open prompt still offers (makes 999.1 worse)

**File:** `bbj-vscode/src/Commands/Commands.cjs:222-226` and `:456-459`; `bbj-vscode/src/open-file-prompts.ts:24,57-58`
**Issue:** Phase 127 added an `isTokenizedFile()` guard in front of `decompileInPlace` and
`decompileReadonly`. `isTokenizedFile` (decompile-io.ts:26-53) deliberately returns `false` for a symlink
(`lstat` + `O_NOFOLLOW`) and for any I/O error (blanket `catch { return false; }`). The open prompt detects
tokenized content with `readLeadingBytes`, which uses `fs.promises.open(fsPath, 'r')`. That follows
symlinks and succeeds. So for a tokenized program reached through a symlink, the prompt says "is a
tokenized (binary) BBj program. Decompile it...", the user clicks, and the command answers
"is not a tokenized BBj program, so there is nothing to decompile." Both decompile commands used to work
on such a file, because `isTokenizedFile` was only used for the in-place detection hint. This is a
regression introduced by the phase.

The same refusal fires on a transient `EACCES`, `EBUSY` or read race, and it hides the real cause. A real
tokenized file therefore gets a false "not tokenized" message. That also muddies the 999.1 failure, where
the user reports the binary is not upgraded in place: a refusal of a genuinely tokenized file now looks like
a wrong-file-type problem.

**Fix:** Use one detection rule for the prompt and the guard, and do not turn I/O errors into "not tokenized".
For example, give `decompile-io.ts` a variant that resolves symlinks with `realpath` and rethrows
non-ENOENT errors:
```js
const wasTokenized = await isTokenizedFile(await fs.promises.realpath(resolvedFileName));
```
or have the prompt skip offering the action when `isTokenizedFile(uri.fsPath)` is false, so the two always
agree. Tell the user when the refusal is for a symlink or an unreadable file instead of reporting
"not a tokenized BBj program".

### WR-02: Denumber on a tokenized (binary) program now fails with a raw VS Code error

**File:** `bbj-vscode/src/denumber-command.ts:77-87`; `bbj-vscode/package.json:256-260,318-322,345-349`
**Issue:** The Explorer, editor-title and editor-context Denumber menus show for every file whose language
is `bbj`, tokenized ones included. The old bbjlst path decompiled and denumbered such a file. The new
command calls `workspace.openTextDocument` on it, which rejects for binary content (VS Code's "File seems to
be binary and cannot be opened as text"). The user then sees `Denumber failed: <VS Code text>`, with no
hint to use Decompile. The phase removed the bbjlst route on purpose, but nothing replaces the guidance.

**Fix:** In the catch of `createDenumberCommand`, or before `openDocument`, detect a tokenized target and
steer to the right command, for example by adding a `isTokenized(fsPath)` dependency:
```ts
if (await deps.isTokenized(target)) {
    deps.warn(`"${basename(target)}" is a tokenized (binary) BBj program. Use "Decompile Tokenized BBj Program" first.`);
    return;
}
```

### WR-03: Legacy `splitSingleLineIF` fallback is unreachable from VS Code, and nothing re-runs the migration after activation

**File:** `bbj-vscode/src/language/bbj-format-settings.ts:86-92,121-124`; `bbj-vscode/src/extension.ts:463-482,512`; `bbj-vscode/package.json:484-490`
**Issue:** `splitSingleLineIf` now has a declared default (`false`), so VS Code's `bbj.formatter` section always
contains the key. The `value === undefined` fallback to the old spelling, and `usesLegacySplitKey` /
`userKeyFor`, can then never fire for a VS Code client. The whole compatibility story rests on the
one-time activation migration. That migration is not re-run when the old key appears later: a Settings Sync
pull from another machine, a hand edit, or a workspace `settings.json` that changes after activation. The
old value is then silently ignored (the new key's default wins) until the next window reload. A partial
failure also sticks: if the write of the new key succeeds and the removal of the old key fails, the next
activation sees the new key set, skips the scope, and never removes the old key.

**Fix:** Either re-run `migrateSplitSingleLineIf` from an `onDidChangeConfiguration` listener filtered with
`event.affectsConfiguration('bbj.formatter.splitSingleLineIF')` (it is idempotent), or document that a reload
is required. For the half-done case, in `migrateScope` also remove the old key when the new key is already
set to the same boolean value.

### WR-04: Denumber menu entries are declared for language `bbx`, which nothing in the extension uses

**File:** `bbj-vscode/package.json:257,319,346`
**Issue:** The `bbj.denumber` `when` clauses include `|| resourceLangId == bbx`. `target-resolution.ts`
documents that no language `bbx` is declared and that only the `bbj` half of the clause is live. The new
tests pin `bbx-config` as "not a target", so the `bbx` branch is dead in the menu while the command now does
a real server round trip. If a user's file association ever gives a file the language id `bbx`, the command
opens it and sends `bbj/denum` for a document the client's `documentSelector` (`bbj`, `bbx-config`) never
announced to the server. The user then gets the server's "not open" message.

**Fix:** Restrict the Denumber `when` clauses to `resourceLangId == bbj && resourceExtname != .bbjt`, or add
a language check in `createDenumberCommand` for the argument path, which currently accepts any `fsPath`
without a check.

## Info

### IN-01: `wasTokenized` is now a constant `true` after the guard

**File:** `bbj-vscode/src/Commands/Commands.cjs:222,232` and `:469,475`
**Issue:** After the early return for a non-tokenized file, `wasTokenized` is always `true` in
`decompileInPlace`. In `decompileReadonly`, `isTokenizedFile(tmpInput)` re-checks a byte-for-byte copy of
a file that just passed the same check. `canRewriteInPlace: wasTokenized` is therefore a constant, and the
second `isTokenizedFile` call is a redundant I/O round trip. `const fileName = resolvedFileName` in
`decompileInPlace` (line 203) is also a pointless alias.
**Fix:** Pass `canRewriteInPlace: true`, drop the second check, and use `resolvedFileName` directly.

### IN-02: Fail-after-guard paths leak the decompile temp directory

**File:** `bbj-vscode/src/Commands/Commands.cjs:464-487`
**Issue:** If `copyFile`, `execWithProgress` or `waitForDecompileOutput` fails after `mkdtempSync`, the
`bbj-decompiled-*` directory (holding a copy of the user's program) is never removed. This predates the phase
but sits right beside the new guard, and the refusal test has to enumerate temp dirs to prove it creates none.
**Fix:** Remove `tmpDir` in the `catch` (`fs.promises.rm(tmpDir, { recursive: true, force: true })`).

### IN-03: `indentWidth` tightened from `number` to `integer` with a 0-16 bound without a migration note

**File:** `bbj-vscode/package.json:410-418`
**Issue:** A user with an existing out-of-range or fractional `indentWidth` (for example `20` or `2.5`) now
gets a settings-editor validation squiggle. `normalizeFormatterSettings` forwards such a value unchanged
(`typeof 'number'` and finite), and bbj-ls then rejects it. The client has no clamp and no client-side
message.
**Fix:** Mention the new bound in the release notes, or clamp and round in `normalizeFormatterSettings` and log
the correction.

### IN-04: Weak source-text guards in tests

**File:** `bbj-vscode/test/decompile-io.test.ts` (added block "the bbjlst launch path never denumbers"); `bbj-vscode/test/formatter-removal.test.ts:99-108`
**Issue:** The tests assert that `Commands.cjs` and `process-args.ts` contain no match for `/denumber/i` at all.
That fails on any future legitimate comment such as "denumber" in a doc string, and says nothing about
behaviour. `formatter-removal` names removed files by substring (`tools/formatter`), which a comment
mentioning the history would also trip. The behaviour tests in `commands-cjs-execution.test.ts` already cover
the guarantee.
**Fix:** Keep the behavioural assertions and drop or narrow the free-text greps, for example to a `Commands`
member or `argv` check.

---

_Reviewed: 2026-10-03_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
