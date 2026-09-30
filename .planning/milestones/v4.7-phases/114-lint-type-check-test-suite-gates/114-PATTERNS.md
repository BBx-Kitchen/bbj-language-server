# Phase 114: Lint, Type-Check & Test-Suite Gates - Pattern Map

**Mapped:** 2026-09-27
**Files analyzed:** 12 (config/CI edits + representative members of the 21-file migration set + 15-file import-fix set + FIX-04 set)
**Analogs found:** 11 / 12 (config edits have no "analog" — they are edited in place; classified as config, not given an external analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `bbj-vscode/eslint.config.js` | config | transform (static analysis) | itself (in-place edit) | n/a — no analog needed, self-contained flat config |
| `bbj-vscode/tsconfig.test.json` | config | transform (static analysis) | `bbj-vscode/tsconfig.json` | exact (extends it) |
| `bbj-vscode/vitest.config.ts` | config | test-discovery | itself (in-place edit) | n/a |
| `bbj-vscode/package.json` (scripts) | config | request-response (CLI) | itself (`lint`/`test` scripts already present) | n/a |
| `.github/workflows/build.yml` | config (CI) | event-driven (PR trigger) | itself — insert steps in the existing job | exact (same file, same step shape) |
| `test/language-configuration.test.ts` (new bbx describe block) | test | file-I/O + transform | same file's existing bbj `describe` block (lines 17-32) | exact |
| `test/hover.test.ts`, `test/classes.test.ts`, `test/variable-scoping.test.ts`, + 18 more (21-file migration set) | test | request-response (LSP-ish parse+validate) | `test/linking.test.ts` | exact (same role, same data flow, already uses the target pattern) |
| `test/commands-cjs-harness.ts` (`CommandsModule` interface) | test / typed-fake | CRUD-ish (method dispatch) | itself — extend the existing `[key: string]: unknown` interface in place | n/a (in-place typing, no better external analog) |
| 15 files needing `import * as fs/path/os` | test | transform | `src/decompile-io.ts`, `src/Commands/process-args.ts`, `src/formatter-java-resolver.ts` | exact (identical Node-builtin import convention, just in `src/` not `test/`) |
| `bbj-intellij/.../BbjNodeDownloader.java` (D-15 fix) | service (background task) | event-driven (progress callback) | itself — one-line move of `setIndeterminate(false)` into the repeatedly-invoked lambda | n/a (surgical fix, not a copy-from-elsewhere pattern) |
| `bbj-intellij/.../BbjNodeDownloaderSourceGuardTest.java` (rewrite to behavioural) | test | event-driven (fake sequence) | `bbj-intellij/.../concurrency/KeystrokeDebouncerTest.java` (behavioural, fake-driven) — role-match for "drive a callback sequence with a recording fake, assert call order/count", not text-scanning | role-match, strong |
| `bbj-intellij/.../Lsp4ijOverrideSiteSourceGuardTest.java` (`bbjcplAvailability` method only, reflective rewrite) | test | reflection-based assertion | same file's own `theBbjcplAvailabilityHandlerIsDeclaredAndDoesNothingWithItsPayload` test (lines ~138-149) — rewrite in place, other methods in the file stay textual | exact (in-place, only this one method changes shape) |
| `test/functional/issue447-real-interop.test.ts` (forced-fallback case) | test | request-response (real backend) | same file's existing `shouldRunBBjTests()`-gated describe block | exact |

## Pattern Assignments

### `test/*.test.ts` — 21-file migration to `createBBjTestServices` (TEST-07, D-09)

**Analog:** `bbj-vscode/test/linking.test.ts`

**Imports pattern** (lines 1-9, already-correct target shape):
```typescript
import { DocumentValidator, EmptyFileSystem, LangiumDocument } from 'langium';
import { parseHelper } from 'langium/test';
import { beforeAll, describe, expect, test } from 'vitest';
import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver';
import { createBBjTestServices } from './bbj-test-module.js';
import { Model } from '../src/language/generated/ast.js';
import { initializeWorkspace } from './test-helper.js';
import { shouldRunBBjTests } from './test-helper.js';
```

**Core pattern** (line 11 + beforeAll around line 18):
```typescript
const services = createBBjTestServices(EmptyFileSystem);
// ...
beforeAll(async () => {
    await initializeWorkspace(services.shared);
});
```

**Before shape in the 21 un-gated files** (source: `bbj-vscode/test/hover.test.ts` lines 1-7, 48, 170, 269):
```typescript
import { EmptyFileSystem, LangiumDocument } from 'langium';
import { createBBjServices } from '../src/language/bbj-module.js';
// ...
const services = createBBjServices(EmptyFileSystem);   // <- swap this call only
```

**Migration instruction:** swap the import from `../src/language/bbj-module.js`'s
`createBBjServices` to `./bbj-test-module.js`'s `createBBjTestServices` (or `../bbj-test-module.js`
for files under `test/functional/`), and swap the call site — both return the identical
`{ shared, BBj }` shape (verified in RESEARCH.md Pattern 1), so nothing else in the file changes.
Do NOT apply this to files that gate on `shouldRunBBjTests()` for real-interop assertions
(`examples-compile.test.ts`, `setopts-in-code-request.test.ts`, `setopts-code-scanner.test.ts`,
`test/functional/issue447-real-interop.test.ts` — see its own pattern below) — check each file's own
assertions before swapping, per RESEARCH.md's "Caution" note.

---

### `test/language-configuration.test.ts` — new bbx `describe` block (TEST-11, D-16)

**Analog:** the same file's own bbj `describe` block, lines 1-32 (already read in full above).

**Exact structure to mirror** (adjust the JSON path, and the expected entry counts per RESEARCH.md's
bbx probe: comments=1, brackets=4, autoClosingPairs=6, surroundingPairs=6, no `onEnterRules`):
```typescript
describe('bbx-language-configuration.json (TEST-11)', () => {
    test('parses as strict JSON', () => {
        const raw = readFileSync('bbx-language-configuration.json', 'utf8');
        expect(() => JSON.parse(raw)).not.toThrow();
    });

    test('every collection keeps its entry count', () => {
        const raw = readFileSync('bbx-language-configuration.json', 'utf8');
        const config = JSON.parse(raw);
        expect(Object.keys(config.comments)).toHaveLength(1);
        expect(config.brackets).toHaveLength(4);
        expect(config.autoClosingPairs).toHaveLength(6);
        expect(config.surroundingPairs).toHaveLength(6);
        expect(config.onEnterRules).toBeUndefined(); // bbx has none, unlike bbj
    });
});
```
Add this as a second top-level `describe` in the same file, right after the existing bbj block (no
new file — the whole point of D-16 is "same file, same shape").

---

### 15 test files — `import * as fs/path/os` for Node builtins (TEST-02, Pattern 4)

**Analogs (src convention, `esModuleInterop: false`):**
- `bbj-vscode/src/decompile-io.ts:7` — `import * as fs from 'fs';`
- `bbj-vscode/src/Commands/process-args.ts:35` — `import * as fs from 'fs';`
- `bbj-vscode/src/formatter-java-resolver.ts:9-10`:
```typescript
import * as fs from 'fs';
import * as path from 'path';
```

**Fix instruction:** in each of the 15 files RESEARCH.md names (`builtin-library-members.test.ts`,
`compile-request.test.ts`, `config-path-resolution.test.ts`, `conformance-regressions.test.ts`,
`cpl-service.test.ts`, `example-files.test.ts`, `examples-compile.test.ts`,
`formatter-pins-drift.test.ts`, `formatter-verifier-tamper.test.ts`, `gradle-wrapper-hygiene.test.ts`,
`javadoc.test.ts`, `lsp-protocol-single-copy.test.ts`, `process-runner.test.ts`, `utils.test.ts`,
`workflow-secret-hygiene.test.ts`), replace `import fs from 'fs'` / `import path from 'path'` /
`import os from 'os'` with the `import * as x from '...'` namespace form above. No other code in
these files changes; the namespace import is call-compatible with the default-style usage already
in each file (`fs.readFileSync(...)`, etc.).

---

### `tsconfig.test.json` — repaired project config (TEST-02, D-06)

**Analog:** `bbj-vscode/tsconfig.json` (the config being extended).

**Target shape** (verified in RESEARCH.md to run and produce a stable 453-error count):
```jsonc
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": true,
    "rootDir": "."
  },
  "include": ["test/**/*.ts", "src/**/*.ts"],
  "exclude": ["out", "node_modules", "test/.tmp"]
}
```
Keep `extends: "./tsconfig.json"` — dropping it undercounts errors by 12 because it stops inheriting
`noUnusedLocals: true`.

---

### `vitest.config.ts` — explicit discovery boundary (TEST-03, D-11)

**Analog:** itself — this is an additive edit to the existing `defineConfig({...})` call, not a
copy from another file.

**Target shape** (verified byte-identical to the current 159-file default-discovered set):
```typescript
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['out/**', 'node_modules/**'],
    coverage: { /* unchanged */ }
  },
})
```

---

### `.github/workflows/build.yml` — Lint + Typecheck steps (TEST-01, TEST-02, D-12/D-13)

**Analog:** the same file's existing `Build` and `Test` steps (read in full above, lines 20-31).

**Existing step shape to copy:**
```yaml
    - name: Build
      shell: bash
      run: |
        cd bbj-vscode
        npm ci
        npm run build
    - name: Test
      if: success() || failure()
      shell: bash
      run: |
        cd bbj-vscode
        npm run test
```

**New steps to insert between Build and Test** (same `cd bbj-vscode` + `shell: bash` shape;
`npm ci` is not repeated since Build already ran it in the same job):
```yaml
    - name: Lint
      shell: bash
      run: |
        cd bbj-vscode
        npm run lint
    - name: Typecheck Test Tree
      shell: bash
      run: |
        cd bbj-vscode
        npm run typecheck:test
```
Per D-13, only the `Test` step keeps `if: success() || failure()` — Lint and Typecheck run normally
(they gate the job by failing it, but don't need to run after an earlier failure).

---

### `bbj-intellij` FIX-04: `BbjNodeDownloader.java` (D-15)

**Current bug location** (verified this session, `BbjNodeDownloader.java` lines 92-114):
```java
new Task.Backgroundable(project, "Downloading Node.js " + NodeInstallPipeline.NODE_VERSION + "...", true) {
    @Override
    public void run(@NotNull ProgressIndicator indicator) {
        try {
            NodeInstallPipeline pipeline = productionPipeline();
            // The indicator must leave indeterminate mode before a fraction is meaningful --
            // the platform logs an exception when a fraction is reported while it is still
            // indeterminate.
            indicator.setIndeterminate(false);              // <- called ONCE, outside the lambda
            pipeline.install(
                    (text, fraction) -> {
                        indicator.setText(text);
                        indicator.setFraction(fraction);      // <- lambda invoked repeatedly
                    },
                    indicator::checkCanceled);
```
**Fix:** move `indicator.setIndeterminate(false);` inside the `(text, fraction) -> {...}` lambda,
before `setText`/`setFraction`, so it re-asserts determinate mode on every progress callback (not
just once before the first one) — matches D-15's recipe exactly.

---

### `BbjNodeDownloaderSourceGuardTest.java` — behavioural rewrite (D-15)

**Analog:** `bbj-intellij/src/test/java/com/basis/bbj/intellij/concurrency/KeystrokeDebouncerTest.java`
— a behavioural test driven by a fake collaborator instead of source-text scanning.

**Pattern to copy** (source: `KeystrokeDebouncerTest.java` lines 1-19, 34-55):
```java
/**
 * Behavioural coverage for {@link KeystrokeDebouncer}, driven entirely by {@link ManualScheduler}
 * (never a real timer or a sleep, D-02) and a fixed {@link ThreadProbe}.
 */
class KeystrokeDebouncerTest {
    // ... constants for fixed fakes ...

    @Test
    void threeRapidKeystrokesProduceZeroLookupsUntilTheSchedulerFiresThenExactlyOneWithTheLastText() {
        ManualScheduler scheduler = new ManualScheduler();
        List<String> lookedUp = new ArrayList<>();
        // ... construct the unit under test with the fake injected ...
        debouncer.onTextChanged("a");
        // ... assert on recorded calls, not on source text ...
    }
}
```
**Applied to the downloader test:** replace the whole-file `readGuardedSource()` +
`countOccurrences`/`bodyOf` substring-scanning helpers (current file, lines 1-45) with a hand-rolled
fake `ProgressIndicator` (or a minimal recording stub implementing only
`setIndeterminate`/`setFraction`/`setText`) that records call order into a `List<String>`, invoke
`NodeInstallPipeline`'s install callback 2+ times through the fake (mirroring `pipeline.install(...)`'s
`(text, fraction) -> {...}` shape from `BbjNodeDownloader.java` above), and assert
`setIndeterminate(false)` is recorded before **every** `setFraction` call, not just the first — the
exact behavioural property `KeystrokeDebouncerTest`'s "assert on recorded call sequence" pattern
generalizes to. `NodeInstallPipelineTest.java` (same package) is the existing analog for driving
`NodeInstallPipeline.install(...)` directly with fixture archives, if the new test needs to exercise
the real pipeline rather than a bare fake indicator.

---

### `Lsp4ijOverrideSiteSourceGuardTest.java` — reflective `bbjcplAvailability` rewrite (D-15)

**Analog:** the same file's own `theBbjcplAvailabilityHandlerIsDeclaredAndDoesNothingWithItsPayload`
test (current text-scanning version, ~lines 138-149) — only this one method's body changes; every
other method in the file (the `bodyOf`/`countOccurrences` structural-guard style) stays as-is,
since it is checking call-order/count properties that reflection cannot express as cheaply.

**Current (comment-blind) version:**
```java
@Test
void theBbjcplAvailabilityHandlerIsDeclaredAndDoesNothingWithItsPayload() {
    String text = readGuardedSource(CLIENT_SOURCE);
    assertEquals(1, countOccurrences(text, "@JsonNotification(\"bbj/bbjcplAvailability\")"), ...);
    String body = bodyOf(text, "public void bbjcplAvailability(");
    assertEquals("{}", body.replaceAll("\\s+", ""), ...);
}
```

**Replacement (verified API shape, `javap` against the resolved 0.20.1 jsonrpc jar this session):**
```java
import java.lang.reflect.Method;
import org.eclipse.lsp4j.jsonrpc.services.JsonNotification;
import org.eclipse.lsp4j.jsonrpc.services.ServiceEndpoints;
import org.eclipse.lsp4j.jsonrpc.services.JsonRpcMethod;
import java.util.Map;

@Test
void theBbjcplAvailabilityHandlerIsRegisteredAsASupportedNotification() throws NoSuchMethodException {
    Method m = BbjLanguageClient.class.getMethod("bbjcplAvailability", Object.class);
    JsonNotification ann = m.getAnnotation(JsonNotification.class);
    assertEquals("bbj/bbjcplAvailability", ann.value());

    Map<String, JsonRpcMethod> supported = ServiceEndpoints.getSupportedMethods(BbjLanguageClient.class);
    assertTrue(supported.containsKey("bbj/bbjcplAvailability"));
}
```
**Verification step before treating this as settled:** RESEARCH.md flags Assumption A1 —
`ServiceEndpoints` resolving on `bbj-intellij`'s **test** compile classpath (not just this session's
Maven cache) is unconfirmed; run `cd /home/coder/repos/bbj-language-server/bbj-intellij && ./gradlew
compileTestJava` once the import is added, before relying on this pattern.

---

### `test/functional/issue447-real-interop.test.ts` — forced-fallback case (D-15, Open Question 1)

**Analog:** the same file's existing `shouldRunBBjTests()`-gated pattern (lines 7, 9, 18, 20):
```typescript
import { createBBjServices } from '../../src/language/bbj-module.js';
import { initializeWorkspace, shouldRunBBjTests } from '../test-helper.js';
// ...
const run = await shouldRunBBjTests();
// ...
const services = createBBjServices(NodeFileSystem);
```
**New case needed (per RESEARCH.md Open Question 1):** add a small test-only accessor on
`JavaInteropService` (in `src/language/java-interop.ts`) mirroring the existing `protected
clearCompleteClassIndex()` seam, that latches the METHOD_NOT_FOUND-resolved-with-no-index state
directly, then a new `test()` inside the existing gated `describe` block that calls it and asserts
`resolveClassCandidatesBySimpleName()` takes the `findClassCandidatesBySimpleName` +
`autoImportCandidatePackages` probe branch (`java-interop.ts:932-939`) instead of the success branch.
This is a `src/` change made solely to support a test — flag it explicitly as behaviour-neutral (it
only adds a method, doesn't change any existing runtime call path) in the plan/commit.

## Shared Patterns

### `createBBjTestServices` vs `createBBjServices`
**Source:** `bbj-vscode/test/bbj-test-module.ts` (return-shape) and `bbj-vscode/test/linking.test.ts`
(consuming usage)
**Apply to:** all 21 files in the TEST-07 migration set. This is the single highest-leverage,
lowest-risk pattern in the phase (RESEARCH.md's "Primary recommendation").

### Node-builtin import convention (`import * as x from '...'`)
**Source:** `src/decompile-io.ts`, `src/Commands/process-args.ts`, `src/formatter-java-resolver.ts`
**Apply to:** the 15 test files under TEST-02 Pattern 4. Purely mechanical, no logic change.

### `Diagnostic.getMessageString(d)` for `.message` reads
**Source:** `node_modules/vscode-languageserver-types/lib/esm/main.d.ts` (verified to compile against
this project's installed types)
**Apply to:** ~25 test files with `TS2339`/`TS2345` on `.message` (largest: `classes.test.ts` 38,
`variable-scoping.test.ts` 26, `unknown-java-member.test.ts` 12, `validation.test.ts` 9). No existing
in-repo analog file uses this yet — this is a new-to-the-codebase official helper, not a copy from
another test file. Import alongside the existing `import { Diagnostic } from 'vscode-languageserver'`
already present in each affected file.

### Source-guard-test idiom (for D-03's disable-reason enforcement, if a test/guard is chosen)
**Source:** any `*SourceGuardTest.java` in `bbj-intellij/src/test/java/com/basis/bbj/intellij/**`
(e.g. `BbjNotificationProviderBaseSourceGuardTest.java`, `ComposerAssignToSourceGuardTest.java`) —
the `readGuardedSource()` + `countOccurrences()`/`bodyOf()` idiom shown in full above under
`BbjNodeDownloaderSourceGuardTest.java`. If D-03's reason-enforcement is implemented as a TS-side
regex source-guard test instead (since D-03's target is `eslint.config.js`-adjacent `.ts`/`.js`
source, not Java), there's no existing TS analog for this specific idiom in `bbj-vscode/test/` —
port the Java idiom's shape (read the file, regex-match `eslint-disable(-next-line)? <rule>` and
assert it's followed by ` -- <non-empty reason>`) as a new small vitest test.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| A TS-side "disable needs a reason" source-guard test (D-03), if not Java-side | test | transform (regex over source) | No existing `bbj-vscode/test/**` file does source-text regex guarding today; nearest analog is the Java `*SourceGuardTest.java` idiom (see Shared Patterns above), which the planner should port rather than copy verbatim |
| `test/commands-cjs-harness.ts`'s expanded `CommandsModule`/`ConfigPathCacheModule` interfaces (TEST-02 Pattern 3) | test / typed-fake | CRUD-ish dispatch | This is an in-place interface extension (add ~11 named method signatures) on an existing `[key: string]: unknown` fallback type; no separate file elsewhere in the tree models a CJS-`require()`-typed fake this way to copy from |

## Metadata

**Analog search scope:** `bbj-vscode/test/**`, `bbj-vscode/src/**` (import-convention files named in
RESEARCH.md), `bbj-intellij/src/test/java/com/basis/bbj/intellij/**`, `.github/workflows/build.yml`
**Files scanned:** ~20 (targeted reads/greps per RESEARCH.md's own file list, no blind directory sweep)
**Pattern extraction date:** 2026-09-27
