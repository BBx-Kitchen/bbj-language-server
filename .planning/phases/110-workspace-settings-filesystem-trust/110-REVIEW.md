---
phase: 110-workspace-settings-filesystem-trust
reviewed: 2026-09-26T00:00:00Z
depth: standard
files_reviewed: 29
files_reviewed_list:
  - bbj-vscode/package.json
  - bbj-vscode/src/config-path-cache.ts
  - bbj-vscode/src/config-path-trust.ts
  - bbj-vscode/src/decompile-io.ts
  - bbj-vscode/src/document-formatter.ts
  - bbj-vscode/src/extension.ts
  - bbj-vscode/src/formatter-java-resolver.ts
  - bbj-vscode/src/language/bbj-document-builder.ts
  - bbj-vscode/src/language/bbj-scope.ts
  - bbj-vscode/src/language/bbj-validator.ts
  - bbj-vscode/src/language/bbj-ws-manager.ts
  - bbj-vscode/src/language/config-path-resolver.ts
  - bbj-vscode/src/language/interop-config.ts
  - bbj-vscode/src/language/java-interop.ts
  - bbj-vscode/src/language/main.ts
  - bbj-vscode/src/language/path-containment.ts
  - bbj-vscode/test/config-file-association.test.ts
  - bbj-vscode/test/config-reload-host.test.ts
  - bbj-vscode/test/decompile-io.test.ts
  - bbj-vscode/test/document-formatter.test.ts
  - bbj-vscode/test/extension-activation.test.ts
  - bbj-vscode/test/extension-config-trust.test.ts
  - bbj-vscode/test/formatter-java-resolver.test.ts
  - bbj-vscode/test/interop-config.test.ts
  - bbj-vscode/test/no-shell-command-construction.test.ts
  - bbj-vscode/test/path-containment.test.ts
  - bbj-vscode/test/stale-output-channel-repro.test.ts
  - bbj-vscode/test/use-path-containment.test.ts
  - documentation/docs/vscode/configuration.md
findings:
  critical: 1
  warning: 1
  info: 1
  total: 3
status: issues_found
---

# Phase 110: Code Review Report

**Reviewed:** 2026-09-26
**Depth:** standard
**Files Reviewed:** 29
**Status:** issues_found

## Summary

Reviewed the diff since `c591cfe8` for the interop host/port validator, the Workspace-Trust
gate on `bbj.configPath`, the new `path-containment.ts` PREFIX-escape guard and its three
call sites (`bbj-document-builder.ts`, `bbj-scope.ts`, `bbj-validator.ts`), the segment-based
`isExternalDocument` fix, the decompile non-regular-file probes, and the formatter Java-binary
resolver. Most of this phase is careful, well-tested hardening — `isPathInside`,
`validateInteropConfig`, `resolveFormatterJava`, and the config-path-trust middleware all have
thorough unit coverage that actually exercises the edge cases their doc comments claim to
handle (Windows case-folding, drive letters, `..` escapes, FIFOs, TOCTOU, PATHEXT, etc.).

One finding rises to the level the phase itself is aimed at: `containedPrefixCandidates` (the
one shared PREFIX-containment helper this phase introduces to close issues #526/#579) is not
actually given empty-string PREFIX entries filtered out before use in three of its four call
sites, even though the module's own doc comment claims callers already do this "the same way
existing PREFIX consumers already skip empty entries." That claim is true only for
`isExternalDocument` (the one call site that predates this phase's `isPathInside` change); the
three call sites this phase newly wires through `containedPrefixCandidates`
(`bbj-document-builder.ts` twice, `bbj-scope.ts`, `bbj-validator.ts`) do not filter, and an
empty-string prefix is the default (not edge-case) shape of `settings.prefixes` for any
workspace folder that has no `PREFIX` line configured at all.

## Critical Issues

### CR-01: `containedPrefixCandidates` callers do not filter the empty-string PREFIX entry that is the default state, producing a phantom root anchored at the server's own `cwd`

**File:** `bbj-vscode/src/language/path-containment.ts:14-17, 65-75`
**Also affects:** `bbj-vscode/src/language/bbj-document-builder.ts:1078, 1121, 1188, 1231`, `bbj-vscode/src/language/bbj-scope.ts:332, 340`, `bbj-vscode/src/language/bbj-validator.ts:337, 348`

**Issue:**

`parseSettings`/`collectPrefixes` in `bbj-ws-manager.ts` (unchanged by this phase) returns
`prefixes: ['']` — an array containing exactly one empty string — for any workspace folder
whose `project.properties` has no `PREFIX` line and whose config file has none either. This is
not a rare edge case: it is the default shape of `settings.prefixes` for a BBj project that
never configures `PREFIX` at all, and it also recurs any time a `PREFIX` value has a stray
double space between quoted entries (`collectPrefixes` splits on a single space with no
empty-token filtering).

Verified directly against the shipped implementation (`path.resolve`/`path.relative` are the
only primitives involved, no framework needed):

```
$ node -e "
const path = require('path');
function isPathInside(root, candidate) {
  const r = path.resolve(root), c = path.resolve(candidate);
  const rel = path.relative(r, c);
  if (rel === '') return true;
  if (path.isAbsolute(rel)) return false;
  if (rel === '..' || rel.startsWith('..' + path.sep)) return false;
  return true;
}
function containedPrefixCandidates(prefixes, usePath) {
  return prefixes.map(p => path.resolve(p, usePath)).filter((c, i) => isPathInside(prefixes[i], c));
}
console.log(containedPrefixCandidates([''], 'Something.bbj'));
"
[ '/home/coder/repos/bbj-language-server/Something.bbj' ]
```

With `prefixes = ['']` (the default, no-`PREFIX`-configured state), `isPathInside('', candidate)`
resolves the empty root against `process.cwd()` (Node's documented behavior: zero-length path
segments are ignored by `path.resolve`), so the "root" silently becomes the language server
process's own working directory instead of "no root". `containedPrefixCandidates` then reports
this phantom candidate as *contained* (it trivially is, relative to itself), and:

- In `bbj-document-builder.ts`'s `addImportedBBjDocuments` (line ~1121-1134), this candidate is
  handed straight to `fsProvider.readFile(...)` — a live filesystem read attempt anchored at the
  server's `cwd`, for **every relative `USE` path in every parsed file**, in the common case
  where no `PREFIX` is configured. If a coincidentally-named file exists under that `cwd`, its
  content is loaded and parsed as the `USE` target instead of the diagnostic the user should see
  ("could not be resolved"), which is a correctness hazard as well as an unintended read outside
  the workspace.
- In `bbj-scope.ts` (line 340) and `bbj-validator.ts` (line 348) the same phantom URI is added to
  the candidate list passed to `langiumDocuments.hasDocument(...)`/the index; lower practical
  impact (no direct read), but the same missing filter, and the same violated invariant.

This directly undercuts the phase's own stated guarantee. The `path-containment.ts` module
comment says: *"a caller that must treat an empty/unset PREFIX entry as 'no root' has to skip it
before calling this module, the same way existing PREFIX consumers already skip empty
entries."* That statement is false for 3 of the 4 real call sites this phase touches —
`isExternalDocument` in `bbj-ws-manager.ts` is the only one that actually does
`prefix.length > 0` before calling `isPathInside`. Nothing in `bbj-document-builder.ts`,
`bbj-scope.ts`, or `bbj-validator.ts` filters `prefixes` before calling
`containedPrefixCandidates`, and `containedPrefixCandidates` itself does not filter internally
either.

This is not a brand-new regression in the strict sense — the pre-phase code
(`resolve(prefixPath, importPath)` called unconditionally for every prefix, with no containment
check at all) had the identical cwd-phantom-read behavior for an empty prefix. But this phase
specifically set out to close PREFIX-escape holes (issues #526/#579) via one shared, documented
containment primitive, and shipped a doc comment asserting this exact gap is already closed by
callers — which is untrue for the majority of the new call sites, and is untested (none of
`path-containment.test.ts` or `use-path-containment.test.ts` exercises an empty-string entry in
`prefixes`, only `isExternalDocument` gets that coverage). A reviewer relying on the module's own
documentation would reasonably believe this case is handled; it is not.

**Fix:** Filter empty entries once, centrally, so the invariant the doc comment claims is
actually true everywhere:

```typescript
// path-containment.ts
export function containedPrefixCandidates(prefixes: readonly string[], usePath: string, platform: NodeJS.Platform = process.platform): string[] {
    const flavor = flavorFor(platform);
    const candidates: string[] = [];
    for (const prefix of prefixes) {
        if (prefix.length === 0) continue; // an empty/unset PREFIX entry is never a root
        const candidate = flavor.resolve(prefix, usePath);
        if (isPathInside(prefix, candidate, platform)) {
            candidates.push(candidate);
        }
    }
    return candidates;
}
```

(Alternatively, filter `prefixes` at each of the three call sites the way `isExternalDocument`
already does — but centralizing it in the shared helper is what the module's own doc comment
already promises, and removes the need to keep three call sites in sync.) Add a test mirroring
`use-path-containment.test.ts`'s existing document-builder spy test, but with
`prefixes: ['', LIB_DIR]`, asserting no read is attempted against a `process.cwd()`-relative
path.

## Warnings

### WR-01: `toPlainJSON` copies workspace-controlled settings via bracket assignment, which is vulnerable to a `__proto__` key silently redirecting the copy's prototype

**File:** `bbj-vscode/src/config-path-trust.ts:71-83`
**Issue:**

`toPlainJSON` is the function `gatedBbjSettings` uses to make a "plain JSON copy" of the entire
`bbj` settings section — including, by design, whatever an **untrusted** workspace's
`.vscode/settings.json` declares under `bbj` (that data is deliberately allowed through; only
`configPath` itself is substituted). The recursive object branch copies with a plain bracket
assignment:

```typescript
if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
        result[key] = toPlainJSON((value as Record<string, unknown>)[key]);
    }
    return result;
}
```

`result` is a plain object literal, so `result['__proto__'] = x` does not create an own
`"__proto__"` data property — it is intercepted by `Object.prototype`'s `__proto__` accessor and
reassigns `result`'s own `[[Prototype]]` to `x` (when `x` is itself an object). If a workspace's
`bbj` settings section (or any value nested under it) ever contains a `"__proto__"` key — plainly
possible in a hand-edited `.vscode/settings.json`, which is exactly the untrusted input this
function is built to process safely — the copy this function produces silently gets a redirected
prototype rather than a literal `__proto__` property, instead of throwing or being ignored. This
does not pollute the process-wide `Object.prototype` (it only rewires the one freshly-created
`result` object), but it is the textbook shape of a prototype-pollution-adjacent bug precisely
because the input is externally/workspace-controlled and the function's whole purpose is safe
copying of that untrusted data.

**Fix:** Guard the key, or build the copy without going through a plain-object accessor path:

```typescript
if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Object.keys(value as Record<string, unknown>)) {
        if (key === '__proto__') continue;
        result[key] = toPlainJSON((value as Record<string, unknown>)[key]);
    }
    return result;
}
```

(Using `Object.create(null)` for the accumulator, not just guarding the key, is the more robust
fix — it also means a later `Object.assign`/spread of this object elsewhere can't reintroduce
the same hazard.)

## Info

### IN-01: Dead redundant branch in the spawn error handler

**File:** `bbj-vscode/src/document-formatter.ts:173-179`
**Issue:** Both branches of the `if`/`else` reject with the exact same `err`, making the `code === 'ENOENT'` check a no-op:
```typescript
p.on('error', (err) => {
  if (err && (err as any).code === 'ENOENT') {
    return reject(err);
  } else {
    return reject(err);
  }
});
```
**Fix:** Collapse to `p.on('error', (err) => reject(err));` (or drop the listener body's branching entirely and just pass `reject` directly: `p.on('error', reject);`).

---

_Reviewed: 2026-09-26_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
