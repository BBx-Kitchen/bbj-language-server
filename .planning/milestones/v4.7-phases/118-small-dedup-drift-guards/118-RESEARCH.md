# Phase 118: Small Dedup & Drift Guards - Research

**Researched:** 2026-09-28
**Domain:** Internal TypeScript refactor (dedup) + two new vitest drift-guard tests over hand-synced catalog/config data. No new dependencies, no runtime behaviour change.
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**`.bbl` catalog mirrors (REF-05, #603)**
- **D-01:** Keep the four physical `.bbl` files (`events`, `functions`, `labels`, `variables` under `bbj-vscode/src/language/lib/`) as hand-synced mirrors. No build-time generator, no deletion. A new vitest drift test compares each `.bbl` with its `.ts` export and fails on any mismatch; its failure message names the file to fix.
- **D-02:** Repair today's drift with `.ts` as the source of truth, everywhere: rewrite each `.bbl` from its `.ts` template body. The runtime builds `bbjlib:///*.bbl` from the `.ts` constants (`bbj-ws-manager.ts:250-253`, `lib/fs-provider.ts`), so no runtime catalog content changes. This drops `events.bbl`'s stale duplicate `ON_MOUSE_ENTER`/`ON_MOUSE_EXIT` entries (v4.0 `7371c264` merged them in `events.ts`) and takes `functions.ts`'s widened CVS signature (89-03), which resolves #603's CVS synopsis disagreement. Nothing flows from `.bbl` back into `.ts`.
- **D-03:** The comparison is exact: the `.bbl` file content must equal the exported runtime constant byte for byte, after CRLF normalisation (the constant is already unescaped, so `` \` `` needs no special handling when comparing the imported value). No whitespace tolerance.

**Catalog wrapper shape (REF-04, #583)**
- **D-04:** All four catalog `.ts` files use one shape: the opening backtick is directly followed by `library` on the same line (`` export const builtinX = `library ``), and the closing backtick sits on its own line followed by `;`. No `.trimLeft()`/`.trimStart()` anywhere. This removes the dead trim call from `functions.ts` and `labels.ts`, the extra leading blank lines in all four, and `variables.ts`'s ASI-reliant ending. The template body then equals the `.bbl` exactly, so the drift test (D-03) needs no special-casing. The `bbjlib:///` documents lose their leading blank lines; whitespace is hidden, so they parse identically. The existing catalog suites (`builtin-functions-library.test.ts`, `builtin-library-members.test.ts`, `example-files.test.ts` etc.) must pass unchanged.

**Compiler-option drift test (REF-06, #606)**
- **D-05:** The test compares, for every `COMPILER_OPTIONS` entry in `src/language/compiler-options.ts`: that `bbj.compiler.<configKey>` exists in `package.json`, and that its `default` and `type` match. A `package.json` type of `["string","null"]` counts as `string` (today `content.protectPassword` and `diagnostics.errorLog`, both default `null` on both sides). It also checks the reverse direction: every `bbj.compiler.*` property in `package.json` has a table entry. So an addition, removal or default change on either side fails the test. Measured today: 20/20 keys match, 0 default diffs, 0 type diffs, so the test passes with no data edits.
- **D-06:** Descriptions and labels are NOT compared. 19 of 20 differ on purpose: the Settings-UI text in `package.json` carries the flag, e.g. `(-t)`, plus caveats, and the QuickPick text in the table is short. Leave both texts as they are.
- **D-07:** `bbj.compiler.trigger` (compile-on-save setting, not a bbjcpl flag) is handled by a named allow-list in the test with a one-line reason. Any other `bbj.compiler.*` key without a table entry fails. Do not scope the test by key prefix/group.
- **D-08:** The test is the sync mechanism and closes #606. No generator for the `package.json` block; `package.json` stays static and hand-edited. The closing note on #606 explains that choice. This departs from #606's literal "no longer maintain independent copies" wording, and the user accepted that.

**Shared `getFunctionReference` (REF-01, #580)**
- **D-09:** One exported free function `getFunctionReference(callNode: MethodCall): Reference<NamedElement> | undefined` in `bbj-vscode/src/language/utils.ts`, next to `readSimpleName`. Both `bbj-signature-help-provider.ts:60` and `bbj-inlay-hint-provider.ts:93` call it directly. Both protected methods are deleted: nothing overrides them in src or test. The roadmap's example home, `bbj-nodedescription-provider.ts`, is not used because it is a Langium service class. The signature-help and inlay-hint suites pass unchanged.

### Claude's Discretion
- Drift test file names and placement under `bbj-vscode/test/`, e.g. one file per guard. The tests import the exported constants and `COMPILER_OPTIONS` and read `package.json` / `.bbl` via paths relative to the test file, following the existing pattern (vitest cwd is `bbj-vscode`).
- Whether the `.bbl` test is table-driven over the four pairs (likely).
- Exact import additions in `utils.ts` (`MethodCall`, `NamedElement`, `isSymbolRef`, `isMemberCall`, `Reference`) and plan split/ordering. The four items are independent, but D-04 must land before or with the D-01 test so the `.bbl` rewrite and the shape change agree.

### Deferred Ideas (OUT OF SCOPE)

**Reviewed Todos (not folded)**
- `2026-09-26-signature-help-and-snippet-peer-name-escaping` — peer-supplied Java names breaking out of the signature-help code fence. A security/behaviour fix, not a dedup; out of scope for this refactor phase.
- `2026-09-26-intellij-interop-initoptions-key-mismatch` — IntelliJ initOptions key names. Unrelated to this phase; matched on keywords only.
- `2026-09-27-windows-intellij-node-download-progress-check` — Windows UAT re-check from Phase 114. Unrelated; matched on keywords only.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REF-01 | `getFunctionReference` exists once and is shared by the signature-help and inlay-hint providers (#580) | Confirmed both copies are byte-identical (lines 60-68 and 93-101, respectively), nothing else overrides or calls them (`grep` across `src`/`test` found only the two provider definitions and their own call sites), and both consuming import lists (`Reference`, `NamedElement`, `isMemberCall`, `isSymbolRef`) are used *only* inside `getFunctionReference` in each file — see Architecture Patterns § Pattern for the dedup diagram and Code Examples for the exact import deltas needed in `utils.ts` |
| REF-04 | The four built-in-catalog `.ts` wrappers share one closing shape (#583) | Exact current head/tail byte shapes for all four files measured this session (`head`/`tail -c`/`cat -A`); confirmed three distinct shapes exist today (not one), confirmed the two `.trimLeft()` call sites (`functions.ts:1000`, `labels.ts:66`) and `variables.ts`'s ASI-reliant ending — see Common Pitfalls #2/#3 |
| REF-05 | A test fails when a `.bbl` catalog file drifts from its `.ts` source (#603) | Measured the exact current diff for all four `.bbl`/`.ts` pairs by evaluating each `.ts` template-literal constant and diffing against its `.bbl` file; `labels`/`variables` differ only in whitespace, `events` has genuine duplicate-entry drift, `functions` differs almost entirely due to a literal backslash-backtick vs single-backtick encoding artifact (see Common Pitfalls #1) — see Architecture Patterns § Pattern 1 for the test shape |
| REF-06 | A test fails when the `package.json` compiler-option contributions drift from the shared compiler-options table (#606) | Read all 20 `COMPILER_OPTIONS` table entries and all 21 `bbj.compiler.*` `package.json` properties directly; confirmed 20/20 match on `type`/`default` today (including the `["number","null"]` case, not just `["string","null"]` — see Standard Stack/Architecture Patterns § Pattern 2 note); confirmed `package.json` parses as strict JSON; confirmed `trigger` is the sole allow-listed untabled key |
</phase_requirements>

## Summary

This phase touches four independent, small pieces of the codebase, all already fully specified by `118-CONTEXT.md`'s locked decisions. Research here is almost entirely fact-verification against the current tree rather than technology selection — there is no new library or pattern to choose, only exact current-state measurements the planner needs to write correct task diffs and correct test assertions.

All four success criteria were independently re-verified against the current `main`-derived tree (2026-09-28): the two `getFunctionReference` copies are byte-identical and nothing else overrides or calls them; the four catalog `.ts` files have three distinct head/tail shapes (not one) that D-04 must unify; the `.bbl` vs `.ts` drift is exactly as CONTEXT.md's D-02/specifics describe (measured, not estimated); and all 20 non-`trigger` `bbj.compiler.*` `package.json` properties already match their `COMPILER_OPTIONS` table entries on `type`/`default` (after the declared `["T","null"]` → `T` normalization), so the new REF-06 test needs zero data edits to pass. A pre-existing `.ts`-vs-`.bbl` test already exists for three of the four catalogs (`builtin-library-members.test.ts`, "P61-D5-017") but compares only *unique declared name sets*, not byte content — its own comment explicitly documents and tolerates the pre-D-02 duplicate `ON_MOUSE_ENTER`/`ON_MOUSE_EXIT` entries in `events.bbl` that D-02 is about to remove. That comment becomes false the moment D-02 lands and must be updated as part of this phase, alongside the new byte-exact REF-05 test.

**Primary recommendation:** Do the four independent changes in the order D-04 (catalog shape) → D-02 (`.bbl` content rewrite) → D-01/D-03 (new byte-exact drift test) → D-05..D-08 (compiler-option drift test) → D-09 (`getFunctionReference` dedup), and update the stale duplicate-events comment in `builtin-library-members.test.ts` as part of the D-02/D-04 work since it documents the exact fact D-02 changes.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `getFunctionReference` (resolve a `MethodCall`'s callee reference) | API / Backend (language server) | — | Shared AST-resolution helper consumed by two LSP feature providers (signature-help, inlay-hint) inside the Langium language server process; no client/browser tier involved |
| Builtin catalog `.ts`/`.bbl` pairs (functions/events/labels/variables) | API / Backend (language server) | Database / Storage (virtual `bbjlib:///` documents) | The `.ts` constants are the only runtime source, loaded into Langium's document store (`bbj-ws-manager.ts`) and served to VS Code's read-only `bbjlib` FS provider (`fs-provider.ts`); the `.bbl` files are inert on-disk mirrors read only by tests |
| `package.json` `bbj.compiler.*` contributions | Frontend Server / Extension Host (VS Code Settings UI) | API / Backend (`compiler-options.ts` table) | `package.json`'s `contributes.configuration` is VS Code extension-host metadata (Settings UI rendering); `COMPILER_OPTIONS` is the vscode-free language-server table it must stay in sync with |
| Drift-guard tests | Test / CI tier | — | Pure vitest additions; no production runtime code path |

## Package Legitimacy Audit

Not applicable — this phase installs no new packages (`npm install`/`npm view` not invoked). All work is internal refactor plus new test files using already-installed `vitest` and Node built-ins (`fs`, `path`).

## Standard Stack

No new libraries. Existing stack only:

| Library | Version (installed) | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `vitest` | 4.1.10 (confirmed via `npx vitest run` output banner, this session) | Test runner for both new drift tests | Already the project's only test runner |
| `langium` / `langium/test` | pinned per Phase 117 (4.3.x line) | `parseHelper` used by the existing name-set equivalence test (`builtin-library-members.test.ts`); not needed for the new byte-exact test | Already in use |
| Node built-ins (`fs`, `path`) | n/a | Reading `.bbl` files and `package.json` from disk in tests | Already the pattern used by `language-configuration.test.ts` and `builtin-library-members.test.ts` |

**Installation:** none required.

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────────────────┐
                    │  bbj-vscode/src/language/    │
                    │  lib/{events,functions,      │
                    │  labels,variables}.ts        │
                    │  (exported template-literal   │
                    │   string constants — the      │
                    │   ONLY runtime source)        │
                    └───────────┬──────────────────┘
                                │ imported by
              ┌─────────────────┼──────────────────────┐
              ▼                                         ▼
  ┌───────────────────────────┐          ┌───────────────────────────┐
  │ bbj-ws-manager.ts          │          │ lib/fs-provider.ts         │
  │ loadAdditionalDocuments()  │          │ BBjLibraryFileSystemProvider│
  │ → Langium LangiumDocuments │          │ → vscode bbjlib:// FS      │
  │   (bbjlib:///*.bbl virtual │          │   (Settings/Explorer read) │
  │    documents, parsed)      │          └───────────────────────────┘
  └───────────┬────────────────┘
              │ consumed by
              ▼
  ┌───────────────────────────────────────────┐
  │ Scope/Linking (bbj-scope.ts) → completion, │
  │ hover, signature-help, inlay-hint          │
  └───────────────────────────────────────────┘

  (SEPARATE, inert — never read by the above)
  ┌───────────────────────────┐
  │ lib/{events,functions,     │◄──── read ONLY by tests (new REF-05 +
  │ labels,variables}.bbl      │      existing P61-D5-017 name-set test)
  │ (physical files on disk)   │
  └───────────────────────────┘

  ── getFunctionReference dedup (REF-01) ──

  MethodCall AST node
        │
        ▼
  ┌─────────────────────────────┐      called by      ┌──────────────────────────────┐
  │ utils.ts                     │◄─────────────────────│ bbj-signature-help-provider.ts│
  │ getFunctionReference()       │                       │ getSignatureFromElement()     │
  │ (NEW: isSymbolRef → .symbol  │                       └──────────────────────────────┘
  │  isMemberCall → .member)     │◄─────────────────────┌──────────────────────────────┐
  └─────────────────────────────┘      called by       │ bbj-inlay-hint-provider.ts    │
                                                          │ computeInlayHint()            │
                                                          └──────────────────────────────┘

  ── compiler-option drift (REF-06) ──

  src/language/compiler-options.ts            bbj-vscode/package.json
  COMPILER_OPTIONS[] (20 entries:              contributes.configuration.properties
  configKey, type, defaultValue)      ◄──test──►  "bbj.compiler.<configKey>": {type, default}
                                                   (+ "bbj.compiler.trigger", allow-listed)
```

### Recommended Project Structure

No new directories. New test files land in the existing flat `bbj-vscode/test/` root, matching every existing guard-test's location (`compiler-options.test.ts`, `builtin-library-members.test.ts`, `language-configuration.test.ts` are all flat, not nested).

```
bbj-vscode/
├── src/language/
│   ├── utils.ts                        # + getFunctionReference (D-09)
│   ├── bbj-signature-help-provider.ts  # getFunctionReference call removed, import added
│   ├── bbj-inlay-hint-provider.ts      # getFunctionReference call removed, import added
│   ├── compiler-options.ts             # unchanged (source of truth)
│   ├── lib/
│   │   ├── events.ts / events.bbl          # D-04 shape + D-02 content rewrite
│   │   ├── functions.ts / functions.bbl    # D-04 shape + D-02 content rewrite
│   │   ├── labels.ts / labels.bbl          # D-04 shape + D-02 content rewrite
│   │   └── variables.ts / variables.bbl    # D-04 shape + D-02 content rewrite
├── package.json                         # unchanged (already matches table — verified)
└── test/
    ├── builtin-library-members.test.ts # existing name-set test's stale duplicate-events
    │                                    #   comment must be corrected (D-02 fact changed)
    ├── <new>-bbl-drift.test.ts         # REF-05: byte-exact .bbl vs .ts drift guard (D-01/D-03)
    └── <new>-compiler-options-package-json-drift.test.ts  # REF-06 (D-05..D-08)
```

### Pattern 1: Byte-exact `.bbl` drift guard (REF-05, D-01/D-03)

**What:** For each of the 4 catalogs, import the `.ts`-exported constant and `fs.readFileSync` the sibling `.bbl` file, normalize both strings' CRLF to LF, and assert strict equality. No parsing, no name-set comparison — literal string equality, per D-03.

**When to use:** Exactly these 4 pairs; do not generalize to other `.bbl`/`.ts` pairs outside this phase's scope.

**Example (pattern, not literal code to copy verbatim — no plan/decision IDs in source per project convention):**
```typescript
// Source: existing repo idiom, test/builtin-library-members.test.ts (path.join(__dirname, ...))
// and test/language-configuration.test.ts (bare cwd-relative readFileSync) are both valid;
// vitest cwd = bbj-vscode (see Validation Architecture below).
import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, test } from 'vitest';
import { builtinEvents } from '../src/language/lib/events.js';
import { builtinFunctions } from '../src/language/lib/functions.js';
import { builtinSymbolicLabels } from '../src/language/lib/labels.js';
import { builtinVariables } from '../src/language/lib/variables.js';

function normalize(s: string): string {
    return s.replace(/\r\n/g, '\n');
}

const pairs: Array<[string, string, string]> = [
    ['events.bbl', builtinEvents, 'events.ts (builtinEvents)'],
    ['functions.bbl', builtinFunctions, 'functions.ts (builtinFunctions)'],
    ['labels.bbl', builtinSymbolicLabels, 'labels.ts (builtinSymbolicLabels)'],
    ['variables.bbl', builtinVariables, 'variables.ts (builtinVariables)'],
];

describe.each(pairs)('%s matches its .ts source', (bblFile, constant) => {
    test('byte-exact after CRLF normalization', () => {
        const bblPath = path.join(__dirname, '..', 'src', 'language', 'lib', bblFile);
        const bblContent = fs.readFileSync(bblPath, 'utf-8');
        expect(normalize(bblContent), `${bblFile} is out of sync — rewrite it from its .ts export`)
            .toBe(normalize(constant));
    });
});
```
Note: `describe.each`/`test.each` table-driven form matches CONTEXT.md's "Claude's Discretion" note ("whether the `.bbl` test is table-driven over the four pairs (likely)").

### Pattern 2: Two-directional compiler-option drift guard (REF-06, D-05..D-08)

**What:** Read `package.json` via `JSON.parse` (verified this session to parse as strict JSON, no JSONC quirks), walk `contributes.configuration.properties` for every `bbj.compiler.*` key, and cross-check against `COMPILER_OPTIONS` from `src/language/compiler-options.ts` in both directions.

**Example:**
```typescript
// Source: local pattern; COMPILER_OPTIONS is vscode-free (compiler-options.ts header comment)
import * as fs from 'fs';
import { describe, expect, test } from 'vitest';
import { COMPILER_OPTIONS } from '../src/language/compiler-options.js';

// bbj.compiler.trigger is a compile-on-save UI setting, not a bbjcpl flag — not in
// COMPILER_OPTIONS by design (D-07).
const ALLOWED_UNTABLED_KEYS = new Set(['trigger']);

function normalizeType(pkgType: unknown): string {
    const types = Array.isArray(pkgType) ? pkgType : [pkgType];
    const nonNull = types.filter(t => t !== 'null');
    return String(nonNull[0]);
}

describe('bbj.compiler.* package.json contributions match COMPILER_OPTIONS', () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const props = pkg.contributes.configuration.properties as Record<string, { type: unknown; default: unknown }>;

    test.each(COMPILER_OPTIONS)('$configKey exists in package.json with matching type/default', (option) => {
        const key = `bbj.compiler.${option.configKey}`;
        expect(props[key], `${key} missing from package.json`).toBeDefined();
        expect(normalizeType(props[key].type)).toBe(option.type);
        expect(props[key].default).toBe(option.defaultValue);
    });

    const tabledKeys = new Set(COMPILER_OPTIONS.map(o => `bbj.compiler.${o.configKey}`));
    const packageCompilerKeys = Object.keys(props).filter(k => k.startsWith('bbj.compiler.'));

    test.each(packageCompilerKeys)('%s has a COMPILER_OPTIONS entry or is allow-listed', (key) => {
        const suffix = key.replace('bbj.compiler.', '');
        if (ALLOWED_UNTABLED_KEYS.has(suffix)) return;
        expect(tabledKeys.has(key), `${key} has no COMPILER_OPTIONS entry (or add it to ALLOWED_UNTABLED_KEYS with a reason)`).toBe(true);
    });
});
```
`COMPILER_OPTIONS` is imported directly with **zero mocks** — confirmed vscode-free (module header comment, `src/language/compiler-options.ts:16-19`, this session).

**Measured today (2026-09-28):** 20/20 `COMPILER_OPTIONS` entries have a matching `bbj.compiler.<configKey>` in `package.json`; every `type`/`default` pair matches after the array-type normalization; `trigger` is the sole allow-listed extra key. The test passes with zero data edits on first run.

### Anti-Patterns to Avoid
- **Comparing `.bbl` catalogs by parsed name-set instead of byte content for the new REF-05 test:** the existing `builtin-library-members.test.ts` equivalence test already does the name-set comparison and deliberately tolerates content drift (documented duplicate-event comment) — the new test's whole point (D-03) is to be stricter (byte-exact), not to duplicate that weaker check.
- **Reading `.bbl`/`package.json` with a relative path assuming test-file-relative cwd:** vitest's cwd is `bbj-vscode` (project root, not `test/`), confirmed by the existing `readFileSync('bbj-language-configuration.json', ...)` bare-relative idiom in `language-configuration.test.ts`. `__dirname`-relative (`path.join(__dirname, '..', ...)`) also works and is the idiom `builtin-library-members.test.ts` already uses — either is fine, per CONTEXT.md's discretion note.
- **Special-casing backtick escapes when comparing `.bbl` content:** the `.ts` constant, once imported/evaluated, already has real single-backtick characters (`` \` `` in source becomes `` ` `` in the string value) — no unescaping logic is needed in the test; only the `.bbl` *file's* content needs the rewrite (see Common Pitfalls below).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Comparing two multi-KB strings byte-for-byte with a useful diff on failure | A custom line-by-line differ | Vitest's built-in `expect(a).toBe(b)` (or `.toEqual`) — vitest already renders a readable diff on string mismatch | Vitest's diff output is sufficient; a custom differ adds code with no test value |
| JSON schema validation for `package.json`'s `contributes.configuration` shape | A schema validator library | Plain `JSON.parse` + direct property access, exactly like the existing `compiler-options-single-table.test.ts` and `language-configuration.test.ts` patterns | The shape is small and fixed; the existing test suites in this repo never reach for a schema library for this |

**Key insight:** Every piece of this phase already has a same-shape precedent test in the repo (`compiler-options-single-table.test.ts` for "same table, two entry points"; `builtin-library-members.test.ts` for ".ts vs .bbl equivalence"; `language-configuration.test.ts` for "repo-file JSON guard"). The task is to extend these precedents, not invent new test machinery.

## Runtime State Inventory

Not applicable — Phase 118 is a source-only refactor plus new tests. No renamed identifiers, no data migration, nothing stored outside the git-tracked source tree. Skipped per template guidance (rename/refactor/migration phases only; this phase changes *content* of hand-synced files but not their *identity* — no rename involved).

## Common Pitfalls

### Pitfall 1: Copy-pasting the `.ts` source text (with its markdown-escaped backticks) into `.bbl` instead of the evaluated string
**What goes wrong:** `functions.bbl` currently contains 128 literal two-character `` \` `` sequences (backslash + backtick) where the runtime `builtinFunctions` string value has a single backtick character. This is the actual root cause of nearly all of `functions.bbl`'s drift (measured: 129 changed lines each side of a line-diff, ≈258 total — matches CONTEXT.md's "about 260 diff lines" note).
**Why it happens:** `functions.ts`'s doc-comment bodies use `` \`ASC(string{,ERR:lineref})\` `` (an escaped backtick, required because the string itself is a JS template literal) to render inline code spans in hover markdown. Someone rewriting `.bbl` by hand from the `.ts` *source text* (rather than the evaluated *string value*) preserved the backslash.
**How to avoid:** When rewriting each `.bbl` file for D-02, generate it from the **evaluated** constant (e.g. write a throwaway script that imports the constant and writes it to the `.bbl` path — do not hand-copy the `.ts` file's literal source characters). Verified this session: extracting and evaluating `functions.ts`'s template literal, then diffing against `functions.bbl`, isolates *only* this backtick-escape class of drift plus the pre-existing duplicate-free content — there is no other functional content drift in `functions.bbl` (the CVS "synopsis disagreement" from #603 is this same backtick-escape issue on the CVS doc block, not a signature difference — the `CVS(str:string, conversion_flags:int, chars?:string, ERR?!:lineref): string` signature line itself is already byte-identical in both files today).
**Warning signs:** A drift-test failure message showing a `` \` `` vs `` ` `` diff at many unrelated lines is this exact issue, not real content drift.

### Pitfall 2: The `.trimLeft()` calls are silently dead code, not a real leading-whitespace fix
**What goes wrong:** `functions.ts:1000` and `labels.ts:66` end with `` `.trimLeft();`` — but D-04's rewrite removes the leading blank line(s) directly (opening backtick immediately followed by `library` on the same line), making `.trimLeft()` a no-op that must simply be deleted, not "kept just in case."
**Why it happens:** Historical: the leading blank line(s) existed before `.trimLeft()` was added as a band-aid; `events.ts` and `variables.ts` never got the same band-aid and instead carry the leading blank line verbatim into the runtime constant (confirmed: `events.ts`/`variables.ts` currently start `` `\nlibrary\n `` with no trim call — three of the four files are *not* uniform today, contradicting an assumption that only `functions.ts`/`labels.ts` need fixing).
**How to avoid:** After D-04, none of the four files should have `.trimLeft()`/`.trimStart()` anywhere (per D-04, verified: `grep -n "trimLeft\|trimStart" src/language/lib/*.ts` today returns exactly the two lines above, nothing else).
**Warning signs:** `npm run lint` may flag an unused-looking chain if the rewrite leaves `.trimLeft()` dangling on an otherwise-changed line.

### Pitfall 3: `variables.ts`'s ASI-reliant ending is easy to break silently
**What goes wrong:** `variables.ts` currently ends with a bare closing backtick and **no trailing `;`** (verified: `tail -c 5` shows `` UNT: int\n\n` `` with no semicolon, relying on automatic semicolon insertion before EOF). If D-04's rewrite adds a semicolon (as it should, matching the other three files' `` `; `` ending) without re-running the build, a stale bundler cache could mask a syntax mistake elsewhere in the same file.
**How to avoid:** Run `npm run build` (or at minimum `npx tsc -p tsconfig.json --noEmit`) after editing `variables.ts`, not just the targeted vitest suites — ASI edge cases are a TS/parse-level concern the vitest suites alone won't catch if the rewrite is subtly wrong.
**Warning signs:** A TypeScript parse error localized to `variables.ts`'s last line, or (worse) silent misparse with no error at all if the rewrite still happens to be syntactically valid but semantically wrong.

### Pitfall 4: Forgetting the existing name-set equivalence test's stale comment
**What goes wrong:** `test/builtin-library-members.test.ts` (lines 100-105) explicitly documents and *justifies* `events.bbl` still carrying "the pre-P61-D2-019 duplicate `ON_MOUSE_ENTER`/`ON_MOUSE_EXIT` entries" as a known, tolerated, out-of-scope staleness. D-02 removes those duplicates. The test's *behavior* keeps passing either way (it compares unique name sets, which are unaffected by de-duplication), but the comment becomes a false statement about the tree the moment D-02 lands.
**Why it happens:** Two independent guard tests (the old name-set one, the new byte-exact one) target overlapping files; it's easy to add the new test and forget the old one references the exact fact being changed.
**How to avoid:** Update or remove the stale paragraph in `builtin-library-members.test.ts` (lines ~100-105) as part of the same plan/task that does D-02's `events.bbl` rewrite.
**Warning signs:** `/gsd-code-review` or a close reading would flag a comment describing behavior that no longer exists in the file it's commenting on.

## Code Examples

### Existing `.ts`-vs-`.bbl` name-set test idiom (to extend, not duplicate)
```typescript
// Source: bbj-vscode/test/builtin-library-members.test.ts:107-127 (read this session)
async function declaredNames(virtualSuffix: string, physicalFile: string, guard: (n: unknown) => boolean) {
    const virtualDoc = virtualDocument(virtualSuffix)!;
    const virtualNames = [...new Set(
        (virtualDoc.parseResult.value as any).declarations
            .filter(guard)
            .map((n: any) => n.name.toUpperCase())
    )].sort();

    const physicalPath = path.join(__dirname, '..', 'src', 'language', 'lib', physicalFile);
    const physicalText = fs.readFileSync(physicalPath, 'utf-8');
    const physicalDoc = await parse(physicalText);
    // ...
}
```

### Existing shared-table cross-entry-point test idiom (to mirror for REF-06's spirit, not reuse directly)
```typescript
// Source: bbj-vscode/test/compiler-options-single-table.test.ts:33-37 (read this session)
test('theVsCodeEntryPointAndTheServerEntryPointReadTheSameTable', () => {
    expect(VSCODE_COMPILER_OPTIONS).toBe(SERVER_COMPILER_OPTIONS);
});
```
This existing test proves `COMPILER_OPTIONS` is a single array shared by both entry points already (REF-06 is a *different* axis: table vs. `package.json`, not table vs. table).

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|---------------|--------|
| No drift guard existed between `.bbl` files and their `.ts` sources | Byte-exact drift test (this phase, REF-05) | Phase 118 | A `.bbl` edit that isn't mirrored to `.ts` (or vice versa) now fails CI instead of silently shipping stale completion/hover data |
| No drift guard existed between `package.json`'s `bbj.compiler.*` block and `COMPILER_OPTIONS` | Two-directional drift test (this phase, REF-06) | Phase 118 | An added/removed/changed-default compiler option on either side now fails CI |
| Two copies of `getFunctionReference` | One shared export in `utils.ts` | Phase 118 | Future changes to callee-reference resolution logic (e.g. supporting a new `MethodCall.method` variant) need one edit, not two kept-in-sync-by-hand edits |

**Deprecated/outdated:** The `.trimLeft()`/`.trimStart()` calls in `functions.ts`/`labels.ts` are removed as dead code once D-04's shape change makes them unnecessary.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| — | (none) | — | All claims in this research were verified this session by reading source files, running targeted vitest/eslint/tsc, or evaluating the actual template-literal constants and diffing them against the `.bbl` files — no `[ASSUMED]` claims remain. |

**This table is empty:** all claims in this research were verified or cited — no user confirmation needed beyond what CONTEXT.md's discuss-phase session already locked.

## Open Questions

None. All four success criteria's preconditions were independently re-measured this session and match CONTEXT.md's locked decisions exactly (see Summary). The one CONTEXT.md leaves to discretion — drift-test file naming/placement and table-driven-vs-repeated-`test()` shape — has no functional ambiguity; either choice satisfies the success criteria.

## Environment Availability

Skipped — this phase has no external tool/service/runtime dependency beyond the already-installed Node/npm/vitest/eslint/tsc toolchain, all confirmed present and working this session (targeted vitest run: 108/108 passed; eslint on affected files: 0 findings; `tsc -p tsconfig.test.json --noEmit`: exit 0).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10 (confirmed via `npx vitest run` banner, this session) |
| Config file | `bbj-vscode/vitest.config.ts` — `include: ['test/**/*.test.ts']`, `exclude: ['out/**', 'node_modules/**']` |
| Quick run command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run test/<file>.test.ts` |
| Full suite command | `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run` (or `npm test`) |

**Mandatory cwd rule (project memory + verified):** vitest must be invoked with cwd = `bbj-vscode`. Do not `npm --prefix bbj-vscode exec -- vitest` from the repo root (breaks relative-path fixtures per project memory). Always `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run ...`.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REF-01 | `getFunctionReference` defined once, both providers use it, both suites pass unchanged | unit/functional | `npx vitest run test/functional/lsp-features.test.ts test/inlay-hints.test.ts test/inlay-hints-javadoc.test.ts` | ✅ exists (all pass today, verified this session: 108/108 across the 7 targeted files) |
| REF-04 | Four catalog `.ts` files share one closing shape; existing catalog suites pass unchanged | unit | `npx vitest run test/builtin-functions-library.test.ts test/builtin-library-members.test.ts` | ✅ exists |
| REF-05 | `.bbl` drift from `.ts` source fails a test | unit | `npx vitest run test/<new-bbl-drift>.test.ts` | ❌ Wave 0 — new file |
| REF-06 | `package.json` compiler-option drift from `COMPILER_OPTIONS` fails a test | unit | `npx vitest run test/<new-compiler-options-drift>.test.ts` | ❌ Wave 0 — new file |
| (regression) | `example-files.test.ts` still parses every `.bbj` fixture with zero lexer/parser errors after D-04's catalog shape change | unit | `npx vitest run test/example-files.test.ts` | ✅ exists |

### Sampling Rate
- **Per task commit:** run the specific affected suite(s) from the table above (`npx vitest run <file>...`), plus `npx eslint <changed files> --max-warnings 0` and `npx tsc -p tsconfig.test.json --noEmit` (both confirmed clean baseline this session, so any new failure is attributable to the change).
- **Per wave merge:** `cd /home/coder/repos/bbj-language-server/bbj-vscode && npx vitest run` (full suite) — baseline this session: all targeted files green, no pre-existing failures in scope.
- **Phase gate:** Full suite green (`npm test`), `npm run lint` (`eslint src test tools/interop-test-harness --max-warnings 0`) clean, `npm run typecheck:test` (`tsc -p tsconfig.test.json --noEmit && tsc -p tsconfig.harness.json --noEmit`) clean — these are the Phase 114 gates this phase runs under per its `depends_on`.

### Wave 0 Gaps
- [ ] New drift-test file for REF-05 (`.bbl` byte-exact vs `.ts` source) — file naming left to planner discretion per CONTEXT.md
- [ ] New drift-test file for REF-06 (`package.json` `bbj.compiler.*` vs `COMPILER_OPTIONS`) — file naming left to planner discretion per CONTEXT.md
- [ ] Stale duplicate-events comment fix in `test/builtin-library-members.test.ts` (lines ~100-105) — not a new file, but a required edit alongside D-02

*Framework install: none — vitest is already configured and the two new test files slot into the existing flat `test/` root with no new tooling.*

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-------------------|
| V2 Authentication | No | No auth surface touched |
| V3 Session Management | No | No session surface touched |
| V4 Access Control | No | No access-control surface touched |
| V5 Input Validation | No | No new external input parsing — `.bbl`/`package.json` reads are test-only, over trusted, git-tracked, repo-local files, mirroring the existing `language-configuration.test.ts`/`builtin-library-members.test.ts` pattern |
| V6 Cryptography | No | No cryptographic code touched |

**Rationale for no applicable categories:** Phase 118 is a pure internal refactor (shared helper extraction) plus two new test-only file-comparison guards. No new code path accepts untrusted input, crosses a trust boundary, handles secrets, or changes authentication/authorization/session logic. The `.bbl`/`package.json` files read by the new tests are git-tracked source, not runtime-supplied data — the exact same trust level as the existing `language-configuration.test.ts` reads.

### Known Threat Patterns for this stack
None applicable to this phase's scope — no threat-pattern table entries (no injection surface, no deserialization of untrusted data, no new network/file I/O beyond reading trusted repo files under test).

## Sources

### Primary (HIGH confidence — read/verified this session)
- `bbj-vscode/src/language/bbj-signature-help-provider.ts` — full file read, `getFunctionReference` at lines 60-68
- `bbj-vscode/src/language/bbj-inlay-hint-provider.ts` — full file read, `getFunctionReference` at lines 93-101
- `bbj-vscode/src/language/utils.ts` — full file read, existing `readSimpleName` placement pattern
- `bbj-vscode/src/language/lib/{events,functions,labels,variables}.ts` — head/tail bytes read via `head`/`tail -c`/`cat -A`, `trimLeft`/`trimStart` occurrences grepped
- `bbj-vscode/src/language/lib/{events,functions,labels,variables}.bbl` — byte-diffed against their evaluated `.ts` constants via a Node script this session
- `bbj-vscode/src/language/bbj-ws-manager.ts:245-255` — confirms `.ts` constants are the only runtime source for `bbjlib:///` documents
- `bbj-vscode/src/language/lib/fs-provider.ts` — full file read, confirms same fact for the VS Code `bbjlib` FS provider
- `bbj-vscode/src/language/compiler-options.ts` — `COMPILER_OPTIONS` table read (lines 1-312), 20 entries confirmed
- `bbj-vscode/package.json` lines 352-621 — `contributes.configuration.properties`, 20 `bbj.compiler.*` + `trigger` confirmed, JSON.parse confirmed strict
- `bbj-vscode/test/builtin-functions-library.test.ts`, `builtin-library-members.test.ts`, `compiler-options.test.ts`, `compiler-options-single-table.test.ts`, `language-configuration.test.ts` — full/partial reads for existing guard-test idioms
- `bbj-vscode/test/functional/lsp-features.test.ts` — grepped for the functional signature-help coverage exercising `getFunctionReference` transitively
- `bbj-vscode/vitest.config.ts`, `bbj-vscode/package.json` scripts section (`lint`, `typecheck:test`, `build`, `test`) — read directly
- This-session command runs: `npx vitest run` (7 targeted files, 108/108 passed), `npx eslint` (0 findings on 8 affected files), `npx tsc -p tsconfig.test.json --noEmit` (exit 0)

### Secondary (MEDIUM confidence)
None — no web/external documentation was needed for this phase; every fact was verifiable directly against the local repository.

### Tertiary (LOW confidence)
None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies; existing vitest/eslint/tsc confirmed working against the exact files this phase touches
- Architecture: HIGH - all four sub-problems' current-state facts (file shapes, import graphs, runtime consumers) verified by direct file reads and greps this session
- Pitfalls: HIGH - each pitfall is a specific, measured fact about the current tree (backtick-escape count, ASI ending, dead trim calls, stale test comment), not a generic warning

**Research date:** 2026-09-28
**Valid until:** Until the next edit to any of the 8 files under `src/language/lib/`, `bbj-signature-help-provider.ts`, `bbj-inlay-hint-provider.ts`, `compiler-options.ts`, or `package.json`'s `bbj.compiler.*` block — this research measures exact current byte content, so re-verify the diffs (not just re-read this document) if planning is delayed past another phase touching those files.
