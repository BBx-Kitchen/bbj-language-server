---
phase: 88-setopts-in-code-hovers-tri-state-composer
reviewed: 2026-09-08T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - bbj-vscode/test/functional/installed-extension-e2e.test.ts
  - examples/issue475-setopts-in-code.bbj
  - bbj-vscode/package.json
  - QA/FULL-TEST-CHECKLIST.md
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 88: Code Review Report (gap-closure round, plans 88-08/88-09)

**Reviewed:** 2026-09-08T00:00:00Z
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

This narrower gap-closure round adds a new end-to-end test (`installed-extension-e2e.test.ts`)
that spawns the actually-installed VS Code extension bundle as a real `--node-ipc` LSP process,
a new fixture (`examples/issue475-setopts-in-code.bbj`), a one-line `vscode:prepublish` fix in
`bbj-vscode/package.json` (adds `npm run build` before the existing `esbuild-base --minify` step
to eliminate the stale-bundle root cause of G-88-1/G-88-2), and a new standing "rebuild before any
QA row" instruction in `QA/FULL-TEST-CHECKLIST.md`.

Cross-checked the e2e test's imports against `setopts-in-code-request.ts` (method names, param/
result shapes) and the e2e test's hover-text assertions against `setopts-code-scanner.ts`'s
`UNSAFE_REASON_TEXT` and markdown-builder literals — no mismatches found; the wording the test
expects is exactly the wording the server produces. The e2e test's control flow (skip conditions,
process cleanup, warm-up polling) is sound and race-free.

Two issues worth fixing: the fixture's Group 3 (the one scenario specifically designed to prove
the byte-range-unsafe verdict survives across separate physical lines, as opposed to Group 1's
single semicolon-joined line) is never actually exercised by any assertion in the new e2e suite,
so its stated purpose is unverified by this file; and the `vscode:prepublish` fix's own remaining
`esbuild-base -- --minify` step builds and minifies an entry point (`src/extension.ts` alone, to
`out/main.js`) that is neither the file `"main"` points at (`out/extension.cjs`) nor the language
server bundle (`out/language/main.cjs`) the new e2e test spawns — so the packaged extension still
ships unminified, and the VSIX carries a spare, unused `out/main.js`.

## Warnings

### WR-01: Group 3's cross-line byte-range-unsafe reproduction is never hovered or decoded by the new e2e test

**File:** `examples/issue475-setopts-in-code.bbj:8-12`
**Issue:** Group 3's own comment states its purpose: "reported reproduction #475b: a byte-range
AND reassignment across separate LET statements. Same unsafe byte-range reason as group 1, over
separate physical lines. Proves the editable decode path still works end-to-end." But
`bbj-vscode/test/functional/installed-extension-e2e.test.ts` never queries Group 3's own closing
`SETOPTS A$` line (line 12) via either `textDocument/hover` or `SETOPTS_DECODE_IN_CODE_METHOD`.
The only assertion that touches Group 3 at all is test `c` ("AND mask-call hover names the options
it CLEARS"), which hovers the `AND(...)` call on line 11 in isolation — it never hovers or decodes
the terminal `SETOPTS A$` statement that closes the chain, so the specific claim this group exists
to prove (byte-range-unsafe detection holding across separate physical lines, not just within one
semicolon-joined line as in Group 1's test `d`) is asserted nowhere in this file. Contrast with
Group 1, whose combined line is covered by both hover test `b`/`d` and decodeInCode tests
(lines 290-301), and Group 4, covered by hover test `e` and three decodeInCode/composeTriState
tests. (Underlying scanner behavior for this exact multi-line indexed-target pattern does appear
to be unit-tested elsewhere in `test/setopts-code-scanner.test.ts`, so this is a completeness gap
in the new e2e/fixture pairing specifically, not evidence the feature itself is broken.)
**Fix:**
```ts
test('f. SETOPTS A$ closing the multi-LET byte-range reproduction names the unsafe byte-range reason', async () => {
    const pos = findPosition(fixtureText, 'SETOPTS A$', 'A$');
    const value = await hoverMarkdown(pos);
    expect(value, `expected a hover result, got: ${JSON.stringify(value)}`).toBeDefined();
    expect(value).toContain('cannot be determined statically');
    expect(value).toContain('byte range');

    const decode = await connection.sendRequest(SETOPTS_DECODE_IN_CODE_METHOD, {
        uri: fixtureUri, line: pos.line, character: pos.character,
    } satisfies SetOptsInCodeDecodeParams) as SetOptsInCodeDecodeResult;
    expect(decode.found).toBe(true);
    expect(decode.editable).toBe(false);
    expect(decode.reason).toContain('byte range');
});
```
Note `findPosition`'s `l.trim() === exactLine` match needs `'SETOPTS A$'` to be unique to line 12
after trimming — it is, since Group 1's `SETOPTS A$` is joined on a semicolon line whose trimmed
text differs.

### WR-02: `vscode:prepublish`'s `esbuild-base -- --minify` step does not minify what actually ships

**File:** `bbj-vscode/package.json:666,673`
**Issue:** The commit's stated fix — running `npm run build` before packaging — correctly
resolves the staleness bug (`tsc -b` + `node ./esbuild.mjs`, which builds both
`out/extension.cjs` and `out/language/main.cjs`, the two artifacts this phase's own e2e test
spawns/reads). But the pre-existing `esbuild-base` script it still runs afterward
(`"esbuild-base": "esbuild ./src/extension.ts --bundle --outfile=out/main.js --external:vscode
--format=cjs --platform=node"`) bundles only `src/extension.ts` to `out/main.js` — a path nothing
else in the extension references (`"main": "./out/extension.cjs"`, and the language server is
loaded from `out/language/main.cjs` per `resolveInstall()` in the new e2e test). `--minify` is
appended only to this dead second build; the real `out/extension.cjs`/`out/language/main.cjs`
produced by `npm run build` are never minified, and `.vscodeignore` doesn't exclude `out/main.js`,
so the VSIX also carries this unused file. This is pre-existing (unchanged by this diff — verified
via `git show` that only `npm run build &&` was inserted), but it sits directly on the line this
gap-closure round touched and its packaging-correctness claim ("no longer ship a stale
out/extension.cjs / out/language/main.cjs") doesn't extend to the minification the script name and
`--minify` flag advertise.
**Fix:** Either drop the dead `esbuild-base -- --minify` invocation entirely, or repoint it (and
rename it) to the real entry points/outdir so it actually minifies what ships:
```json
"vscode:prepublish": "shx cp ../LICENSE ./LICENSE  && npm run build -- --minify && npm run lint",
```
with `build`'s underlying `esbuild.mjs` invocation accepting a `--minify` passthrough (it already
supports a `minify` flag internally), and remove the now-redundant `esbuild-base`/`esbuild`/
`esbuild-watch` scripts and the stray `out/main.js` output they produce.

## Info

### IN-01: `installed-extension-e2e.test.ts` duplicates the `#475` GitHub-issue token liberally in prose comments

**File:** `bbj-vscode/test/functional/installed-extension-e2e.test.ts:15,239,347`
**Issue:** Purely a note for the register-check-source-diff-before-push habit already in project
memory: `#475` appears in three separate comment blocks in this file (plus the fixture's own
header and the QA checklist row). This is expected/desired here (it's the issue this whole gap-
closure round targets, and referencing it is exactly what the earlier-established convention
asks for), not a defect — flagging only so it isn't mistaken for an accidental leftover marker
during the pre-push scan.
**Fix:** None needed; no action required.

---

_Reviewed: 2026-09-08T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
