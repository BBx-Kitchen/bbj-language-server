# Phase 67: Apply Easy Fixes - Pattern Map

**Mapped:** 2026-08-19
**Files analyzed:** 73 distinct target files/paths (77 finding rows, 2 merged, 2 excluded per D-03)
**Analogs found:** all — every target is an edit to an *existing* file, so the "analog" for the
edit itself is the file's own surrounding code; the analogs below cover the **test harness** and
**commit-pair** patterns the plans must reuse.

This phase does not create new source files. Every row in `67-APPLY-SET.md` is a targeted edit to
a named `file:line` range in a file that already exists. Consequently the pattern-mapping job here
is different from a greenfield phase: instead of "which file should this resemble," it is "what
existing conventions (imports, error handling, comment style, test harness) must the edit match,
and which existing test file is the closest home for its regression test."

## File Classification

Grouped by the "files carrying multiple fixes" serialization groups named in CONTEXT.md's
Claude's Discretion section, plus the single-fix files by tree.

### `bbj-vscode/src/language/` (Phase 61 findings — role: language-server service internals)

| File | Role | Data Flow | Fix IDs | Regression test required? |
|---|---|---|---|---|
| `java-interop.ts` | service (Java RPC client) | event-driven / request-response | P61-D2-001, D2-002, D2-003, D2-004, D3-001, D4-003, D8-001 (7 fixes) | D2/D3 → yes (4); D4/D8 → no (3) |
| `bbj-type-inferer.ts` | service (type inference) | transform | P61-D2-011 + P66-D2-001 (merged, D-04), P61-D5-009 | yes (both; D5-009 adds the missing test itself) |
| `bbj-ws-manager.ts` | service (workspace lifecycle) | event-driven | P61-D2-015, D2-016, D8-006 | D2 → yes (2); D8 → no |
| `bbj-document-builder.ts` | service (Langium document build hook) | event-driven | P61-D2-017, D3-005, D5-016 | D2/D3 → yes (2); D5 → test-is-the-fix (1) |
| `bbj-document-symbol-provider.ts` | provider (LSP outline) | request-response | P61-D2-014, D4-010 | D2 → yes; D4 → no |
| `bbj-token-builder.ts` | service (lexer token post-processing) | transform | P61-D2-008, D4-005 | D2 → yes; D4 → no |
| `bbj-completion-provider.ts` | provider (LSP completion) | request-response | P61-D2-013, D3-004 | both yes |
| `bbj-value-converter.ts` | service (Langium value conversion) | transform | P61-D2-005 | yes |
| `bbj-lexer.ts` | service (custom lexer) | transform | P61-D2-006 | yes |
| `bbj-cpl-parser.ts` | service (BBjCPL output parser) | transform | P61-D2-009 | yes |
| `validations/check-variable-scoping.ts` | validation | transform | P61-D2-010 | yes |
| `bbj-validator.ts` | validation (registry) | request-response | P61-D4-006 | no |
| `validations/line-break-validation.ts` | validation | transform | P61-D5-006 | test-is-the-fix |
| `bbj-cpl-service.ts` | service (BBjCPL integration) | event-driven | P61-D8-004 | no |
| `bbj-linker.ts` | service (cross-file reference linking) | request-response | P61-D4-008 | no |
| `assertions.ts` | utility | transform | P61-D4-009 | no |
| `bbj-overload-selector.ts` | service | transform | P61-D5-007 | test-is-the-fix |
| `bbj-scope.ts` | service (scope provider) | request-response | P61-D5-008 | test-is-the-fix |
| `bbj-signature-help-provider.ts` | provider (LSP signature help) | request-response | P61-D5-011 | test-is-the-fix |
| `bbj-hover.ts` | provider (LSP hover) | request-response | P61-D5-012 | test-is-the-fix |
| `main.ts` | entry point / bootstrap | event-driven | P61-D4-012 | no |
| `bbj-notifications.ts` | utility (client notifications) | event-driven | P61-D5-015 | test-is-the-fix |
| `lib/events.ts` | data (builtin library metadata) | CRUD (static data) | P61-D2-019 | yes |
| `bbj.langium` | grammar (comment only, D8) | n/a | P61-D8-002 | no — **generated code is off-limits; confirm this is a comment, not a rule** |

### `bbj-vscode/test/` (regression tests, Phase 61)

| File | Role | Fix IDs |
|---|---|---|
| `test/example-files.test.ts` | test (harness driver) | P61-D5-004 |
| `test/cpl-service.test.ts` | test | P61-D5-005 |
| `test/builtin-functions-library.test.ts` | test | P61-D5-017, D8-007 |

### `bbj-vscode/src/` and config (Phase 62 findings — extension host, TextMate, formatter)

| File | Role | Data Flow | Fix IDs |
|---|---|---|---|
| `src/extension.ts` | controller (VS Code extension activation) | event-driven | P62-D2-004 |
| `bbj-language-configuration.json` | config | n/a | P62-D2-006 |
| `syntaxes/bbj.tmLanguage.json` | config (TextMate grammar, shared by both IDEs) | n/a | P62-D2-007, D2-008, D2-009 (3) |
| `package.json` | config | n/a | P62-D7-002 |
| `test/textmate-highlighting.test.ts` | test | P62-D5-004 |
| `CLAUDE.md` | docs | n/a | P62-D8-001 (+ P61-D8-003, D8-005 — 3 total) |
| `src/document-formatter.ts` | service (formatter) | transform | P62-D2-010, D3-001, D5-006, D8-002 (3 code + 1 test-is-fix) |
| `src/decompile-io.ts` | service (decompiler I/O) | file-I/O | P62-D2-011, D4-005 |
| `src/tokenized-bbj.ts` | utility | transform | P62-D4-005 (paired edit, same commit as decompile-io.ts) |

### `bbj-intellij/` (Phase 63 findings — Kotlin/Java, D-14 review-only verification)

| File | Role | Fix IDs |
|---|---|---|
| `BbjNodeDownloader.java` | service (download manager) | P63-D4-001, D8-001 |
| `actions/BbjCompileAction.java` | controller (IDE action) | P63-D8-002 |
| `actions/BbjEMTokenStore.java` | service (token storage) | P63-D8-003 |
| `composer/ComposerModels.java` | model | P63-D8-005 (D7-004 **deferred**, D-15) |
| `ui/BbjServerLogToolWindowFactory.java` | component (tool window) | P63-D8-006 |
| `ui/BbjServerService.java` | service | P63-D8-007 |
| `BbjIcons.java` | config/constants | P63-D4-014 |
| `BbjColorSettingsPage.java` | config (IDE settings page) | P63-D8-008 |

### Build, CI, dependencies (Phase 64 findings)

| File | Role | Fix IDs |
|---|---|---|
| `.github/workflows/pr-validation.yml` | config (CI) | P64-D2-004 |
| `.github/workflows/build.yml` | config (CI) | P64-D6-004, D4-004 (2, same `on:` block, D-06) |
| `bbj-vscode/package-lock.json` | config (lockfile) | P64-D6-009, D6-013 |
| `bbj-vscode/vitest.config.ts` | config (test runner) | P64-D8-005 |
| `.planning/reviews/INVENTORY.md` | **excluded** | P64-D8-003, D8-004 — INVENTORY immutable (Phase 60 D-09); do not edit |

## Pattern Assignments

### Shared Pattern A — Vitest + Langium validation test (for D2/D3 regression tests in `src/language/`)

**Source:** `bbj-vscode/test/validation.test.ts:1-23`
**Apply to:** any D2/D3 fix whose surface is validation, type inference, or a service reachable
through a parsed `Program`/`Model` without Java interop (e.g. `bbj-lexer.ts`, `bbj-value-converter.ts`,
`check-variable-scoping.ts`, `line-break-validation.ts`, `bbj-token-builder.ts`).

```typescript
import { AstNode, AstUtils, EmptyFileSystem, LangiumDocument } from 'langium';
import { beforeAll, describe, expect, test } from 'vitest';

import { expectError, expectNoIssues, validationHelper } from 'langium/test';
import { createBBjServices } from '../src/language/bbj-module.js';
import { Program, /* isXxx guards as needed */ } from '../src/language/generated/ast.js';
import { findByIndex, findFirst, initializeWorkspace } from './test-helper.js';

describe('BBj validation', async () => {
    const services = createBBjServices(EmptyFileSystem);
    let validate: ReturnType<typeof validationHelper<Program>>;

    beforeAll(async () => {
        await initializeWorkspace(services.shared);
        validate = validationHelper<Program>(services.BBj);
    });

    test('<finding-id> — <one-line description of the bug>', async () => {
        const validationResult = await validate(`<minimal BBj repro>`);
        expectNoIssues(validationResult, { /* ... */ });
        // or expectError(validationResult, 'message', { node, property })
    });
});
```

### Shared Pattern B — Vitest + Java-interop test double (for `java-interop.ts`, linking, `bbj-type-inferer.ts` D2 fixes)

**Source:** `bbj-vscode/test/linking.test.ts:1-30`, `bbj-vscode/test/bbj-test-module.ts:1-40`
**Apply to:** `java-interop.ts` (all 4 D2 fixes + D3-001), `bbj-type-inferer.ts` P61-D2-011/P66-D2-001
(the `isJavaMethod` fallback), any fix that needs a `JavaMethod`/`JavaField`/`JavaClass` fake.
This is the harness referenced in CONTEXT.md's "reproduction technique" note — `P61-D2-011`'s own
`evidence:` field already contains a throwaway-test recipe to start from instead of reinventing one.

```typescript
import { EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { createBBjTestServices } from './bbj-test-module.js';
import { Model } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';

const services = createBBjTestServices(EmptyFileSystem);
const validate = (content: string) => parseHelper<Model>(services.BBj)(content, { validation: true });

describe('<area> Tests', async () => {
    beforeAll(async () => {
        await initializeWorkspace(services.shared);
    });

    test('<finding-id> — <description>', async () => {
        const document = await validate(`<repro using the fake BBjAPI/HashMap/String classes>`);
        // assert on document.diagnostics / parseResult as in linking.test.ts's
        // expectNoErrors/findLinkingErrors helpers
    });
});
```

**Never** target the live java-interop socket peer (port 5008, unreachable per D-07) — always the
`JavaInteropTestService` fake registered in `bbj-test-module.ts`.

### Shared Pattern C — `test/test-data/*.bbj` parsing regression (for lexer/grammar-adjacent fixes)

**Source:** `bbj-vscode/test/example-files.test.ts` (auto-parses every `.bbj` file in `test/test-data/`)
**Apply to:** `P61-D5-004` directly (this file *is* the fix target), and any D2 fix in `bbj-lexer.ts`
or `bbj-token-builder.ts` where a zero-code parsing regression is sufficient: drop a `.bbj` file
into `test/test-data/` that must produce zero lexer/parser errors.

### Shared Pattern D — commit pairing (FIX-01/FIX-02, D-11/D-12/D-13)

**Source:** CONTEXT.md D-12, D-13 (`67-CONTEXT.md:207-227`)
**Apply to:** every fix in the 30-row D-11 table.

- D2/D3/D7 fixes (30 total minus the 13 D5 rows = 17 D2+D3+D7... actually per D-11 table: D2=25,
  D3=4, D7=1 all require tests, D5=13 is test-is-the-fix): commit the **failing test first**
  (`test(<FINDING-ID>): ...`), verify it is red, then commit the fix
  (`fix(<FINDING-ID>): ...`), verify it is green. Both commits carry the same finding ID(s).
- D5 rows (test coverage gaps): single commit, `test(<FINDING-ID>): ...` — no red state is
  possible per D-13, record that explicitly in the `67-APPLY-SET.md` row.
- D4/D8 rows (no behaviour change): single commit, `fix(<FINDING-ID>): ...` or `docs(<FINDING-ID>): ...`,
  no test.
- D-04 merge (`P61-D2-011` + `P66-D2-001`): one commit, subject cites both IDs, e.g.
  `fix(P61-D2-011,P66-D2-001): fall back to getResolvedClass for unresolved JavaMethod return`.

### `bbj-vscode/src/language/java-interop.ts` (service, event-driven/request-response)

**Current shape** (lines 85-108, illustrative of the file's async/error-handling idiom):
```typescript
protected async connect(): Promise<MessageConnection> {
    if (this.connection) {
        return this.connection;
    }
    let socket: Socket;
    try {
        socket = await this.createSocket();
    } catch (e) {
        const detail = e instanceof Error ? e.message : String(e);
        notifyJavaConnectionError(detail);
        console.error('Failed to connect to the Java service.', e);
        return Promise.reject(e);
    }
    const connection = createMessageConnection(new SocketMessageReader(socket), new SocketMessageWriter(socket));
    connection.listen();
    this.connection = connection;
    return connection;
}
```
This try/catch + `e instanceof Error ? e.message : String(e)` idiom is the file's established error
narrowing pattern — match it in any D2 fix that touches error paths (D2-001..D2-004). JSDoc block
comments (`/** ... */`) precede every method — match this for D8-001 and any new/changed method.

### `bbj-vscode/src/language/bbj-document-symbol-provider.ts` (provider, request-response)

**Current shape** (lines 75, 149 — the two `P61-D4-010` lint-warning sites; lines 155-182 — the
`P61-D2-014` sibling-node keying bug):
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const name = (astNode as any).name;
```
`P61-D4-010`'s fix is to confirm/remove the now-unnecessary `eslint-disable` comment (the guarded
`no-explicit-any` rule no longer trips) — this is the exact edit that clears both `npm run lint`
warnings per D-10, so verify with `npm run lint` after the edit, not a new suppression.

`P61-D2-014` touches `collectPositions`'s position-encoding scheme (`line * 100_000 + character`,
sibling nodes keyed by start position only) at lines 155, 173-182 — read the full
`getSymbol`/`collectPositions` pair before editing since the bug is about position collisions
across sibling nodes sharing a start offset.

### `bbj-intellij/` files (Java, D-14 review-only — no compile/test runs)

**Source:** `bbj-intellij/src/main/java/com/basis/bbj/intellij/BbjNodeDownloader.java:1-20`
```java
package com.basis.bbj.intellij;

import com.intellij.ide.util.PropertiesComponent;
import com.basis.bbj.intellij.ui.BbjServerService;
// ... IntelliJ platform imports grouped, no blank-line separation from project imports
```
All 9 applied IntelliJ fixes (8 comment/doc + 1 naming) must preserve this import grouping and
package structure. Since `./gradlew build` cannot run (no JDK 17, D-07/D-14), verification is
read-the-diff-against-the-finding only — record "no compile, no test ran" in the ledger row for
each, per D-14. `P63-D7-004` (`ComposerModels.java`) is **not applied** — deferred per D-15.

### `.github/workflows/build.yml` (CI config)

**Current shape** (lines 1-25):
```yaml
name: Build
on:
  push:
    branches:
      - typefox-dev
  pull_request:
    branches:
      - main
jobs:
  build:
    name: BBj CI
    runs-on: ubuntu-latest
    timeout-minutes: 20
```
`P64-D6-004` and `P64-D4-004` both edit this `on:` block (lines 4-6, 18-20) — per D-06, apply
`P64-D4-004` on its own since its paired finding `P64-D3-002` is major-refactor and out of scope.
Verify by YAML parse + `actionlint` if available (D-16); no CI run occurs.

## No Analog Found

None — every target file already exists and is its own primary analog for style/imports/error
handling. The "no analog" cases are instead **fixes that cannot be verified the normal way**:

| Fix(es) | Reason | Verification per D-16/D-14 |
|---|---|---|
| `bbj-intellij/` (9 files) | No JDK 17 on this machine; `./gradlew build` cannot run | Review-only, diff-against-finding |
| `bbj-vscode/package-lock.json` (2 fixes) | Lockfile has no source-level analog | `npm ci` → `npm audit` → baseline-delta suite run |
| `.github/workflows/*.yml` (3 fixes) | CI config has no local execution path | YAML parse + `actionlint` if available |
| `.planning/reviews/INVENTORY.md` (2 findings) | Excluded — INVENTORY immutable (Phase 60 D-09) | Not applied; ledger records exclusion per D-03 |
| `bbj-intellij/composer/ComposerModels.java` D7-004 | No JDK 17 → no Gradle test for the D7 regression D-11 requires | Deferred per D-15, not applied |

## Metadata

**Analog search scope:** `bbj-vscode/src/language/`, `bbj-vscode/src/`, `bbj-vscode/test/`,
`bbj-intellij/src/main/java/com/basis/bbj/intellij/`, `.github/workflows/`, repo root `CLAUDE.md`.
**Source of file list:** `.planning/reviews/{61,62,63,64,66}-COVERAGE.md`, every `disposition:
easy-fix` record's `id:`/`location:` fields (77 rows, cross-checked against CONTEXT.md's stated
counts of 44/14/10/8/0/1 by phase — matched).
**Files scanned directly:** `test/validation.test.ts`, `test/linking.test.ts`, `test/bbj-test-module.ts`,
`src/language/java-interop.ts`, `src/language/bbj-type-inferer.ts`, `src/language/bbj-document-symbol-provider.ts`,
`.github/workflows/build.yml`, `bbj-intellij/.../BbjNodeDownloader.java`, `bbj-vscode/test/` and
`bbj-vscode/src/language/` directory listings.
**Pattern extraction date:** 2026-08-19
