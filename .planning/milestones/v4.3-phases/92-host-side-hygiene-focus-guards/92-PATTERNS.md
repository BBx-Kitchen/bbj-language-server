# Phase 92: Host-Side Hygiene & Focus Guards - Pattern Map

**Mapped:** 2026-09-13
**Files analyzed:** 11 (5 modified existing, 4 new modules, plus corresponding test files)
**Analogs found:** 11 / 11

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|--------------------|------|-----------|-----------------|---------------|
| `bbj-vscode/src/decompile-io.ts` (add `deleteLeftoverLst` helper, drop mtime clause) | utility (file-I/O) | file-I/O | itself, `waitForDecompileOutput` (same file) | exact — extend in place |
| `bbj-vscode/src/Commands/Commands.cjs` (`decompileInPlace`, `resolveTargetFileName`, `run`/`runWeb`/`compile`/`decompile`) | controller (command dispatch) | request-response | itself — `resolveTargetFileName` (lines 150-156) is the pattern D-05 extends | exact — extend in place |
| `bbj-vscode/src/Commands/target-resolution.ts` (NEW) | utility (pure decision module) | transform | `bbj-vscode/src/Commands/process-args.ts` (pure, `vscode`-free builder module) | exact — same "no vscode import, unit-testable" convention |
| `bbj-vscode/src/document-formatter.ts` (`inFlightFormats` → content-keyed) | service | request-response / event-driven | itself — `inFlightFormats` map + `clearInFlight` guard (lines 17, 57-67) | exact — extend in place |
| `bbj-vscode/src/extension.ts` (`activate()` — push every bare register/onNotification) | provider (DI wiring / lifecycle) | event-driven | itself — the file's own existing `context.subscriptions.push(...)` calls (e.g. lines 866, 881, 915, 918, 929, 988, 991, 1032) | exact — mechanical extension of existing pattern in same file |
| `bbj-vscode/test/decompile-io.test.ts` (rework `P62-D2-011`) | test | file-I/O | itself | exact |
| `bbj-vscode/test/target-resolution.test.ts` (NEW) | test | transform | `bbj-vscode/test/process-args.test.ts` if present, else vitest style of `document-formatter.test.ts` | role-match |
| `bbj-vscode/test/no-shell-command-construction.test.ts` (extend with new source-guard assertions) | test (source-scan) | transform | itself | exact |
| `bbj-vscode/test/document-formatter.test.ts` (extend `P62-D3-001`) | test | request-response | itself | exact |
| `bbj-vscode/test/extension-activation.test.ts` (extend `vi.mock('vscode')`, add D-10 test) | test | event-driven | itself | exact |
| `bbj-intellij/.../ui/BbjStatusBarWidget.java` (D-11/D-12) | component (status bar widget) | event-driven | `BbjJavaInteropStatusBarWidget.java` (sibling widget, same shape) | exact — the two widgets are near-duplicates |
| `bbj-intellij/.../ui/BbjJavaInteropStatusBarWidget.java` (D-11/D-12) | component (status bar widget) | event-driven | `BbjStatusBarWidget.java` | exact |
| `bbj-intellij/.../ui/BbjFileVisibility.java` (NEW, shared predicate) | utility (pure static helper) | transform | `bbj-intellij/.../config/BbjConfigPathService.java` (`isConfigFileName`/`isDefaultConfigFilename` static package-private helpers) | exact — same static-helper-plus-thin-wrapper idiom |
| `bbj-intellij/src/test/.../ui/BbjFileVisibilityTest.java` (NEW) | test | transform | plain-JUnit tests over `BbjConfigPathService`'s static methods (no live `Application`) | role-match |
| `bbj-intellij/src/test/.../ui/BbjStatusBarWidgetSourceGuardTest.java` (NEW) | test (source-scan) | transform | `BbjConfigFileTypeOverriderSourceGuardTest.java` | exact — identical text-scan idiom |

## Pattern Assignments

### `bbj-vscode/src/decompile-io.ts` (utility, file-I/O) — D-01/D-02/D-03

**Analog:** itself (`waitForDecompileOutput`, `bbj-vscode/src/decompile-io.ts:74-96`)

**Imports pattern** (lines 1-11):
```typescript
import * as fs from 'fs';
import { TOKENIZED_BBJ_MAGIC } from './tokenized-bbj.js';
```
No `vscode` import — this file is already `vscode`-free and directly unit-tested. Keep the new
`deleteLeftoverLst` helper here for the same reason.

**Core pattern to add (D-01/D-03)** — mirror the existing exported-function style, and compute the
delete target with the *exact same expression* `waitForDecompileOutput` uses internally for `lstPath`
(line 76: `const lstPath = inputPath + '.lst';`) — never `Commands.cjs`'s separately-computed
`resolvedLstFileName`:
```typescript
export async function deleteLeftoverLst(inputPath: string): Promise<void> {
    const lstPath = inputPath + '.lst'; // same computation waitForDecompileOutput uses internally
    try {
        await fs.promises.unlink(lstPath);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return; // normal case, proceed
        throw err; // fail closed — decompileInPlace must not run bbjlst after this throws
    }
}
```

**Mtime clause to remove (D-02)** — current code at lines 82-88:
```typescript
if (lstStat) {
    if (lstStat.size === lastLstSize && lstStat.mtimeMs >= callStartMs) {   // <-- drop "&& lstStat.mtimeMs >= callStartMs"
        return { sourcePath: lstPath, inPlace: false };
    }
    lastLstSize = lstStat.size;
}
```
`SizeAndMtime.mtimeMs` (lines 30-33) becomes unused once this clause is removed — either drop the
field or leave it as a documented no-op capture; both satisfy D-02 ("no slack constant introduced").

**Error handling pattern:** the file returns `undefined` from `statSizeAndMtime` on any stat failure
(lines 35-42) rather than throwing — keep that "swallow ENOENT, only surface real errors" shape for
the new delete helper too (already shown above).

---

### `bbj-vscode/src/Commands/Commands.cjs` (controller, request-response) — D-01 wiring, D-05/D-06/D-07 wiring

**Analog:** itself — `resolveTargetFileName` (lines 150-156) is the exact pattern D-05 generalizes;
`decompileInPlace` (lines 170-221) is where D-01's delete call is inserted.

**Current target-resolution pattern to extend (D-05)** (lines 150-156):
```javascript
const resolveTargetFileName = (params) => {
  if (params && params.fsPath) {
    return params.fsPath;
  }
  const active = vscode.window.activeTextEditor;
  return active ? active.document.fileName : undefined;
};
```
Note `decompile` (lines 158-164) and other commands each independently inline the same
`active ? active.document.fileName : params.fsPath` order but check the *editor* first, not the
*argument* first — this is exactly the inconsistency D-05 fixes by routing every command through one
shared resolver (in the new `target-resolution.ts`), argument-first.

**Delete-before-decompile insertion point (D-01/D-03)** — inside the `withProgress` callback, right
before `execWithProgress(argv)` (lines 193-198):
```javascript
vscode.window.withProgress({ ... }, async () => {
    try {
      const wasTokenized = await isTokenizedFile(resolvedFileName);
      await execWithProgress(argv);                 // <-- deleteLeftoverLst(resolvedFileName) goes immediately before this call
      const { inPlace } = await waitForDecompileOutput(resolvedFileName, { canRewriteInPlace: wasTokenized });
      ...
    } catch (err) {
      const errorMsg = `Failed to decompile "${fileName}": ${err.message || err}${err.stderr ? '\n\nDetails:\n' + err.stderr : ''}`;
      vscode.window.showErrorMessage(errorMsg);
    }
});
```
The existing `catch` block's `errorMsg` shape (line 217) is exactly the message D-03 reuses verbatim
for an undeletable leftover `.lst` — no new error-formatting code needed, just let the delete's throw
propagate into this same `catch`.

**Error handling pattern:** every command-level failure in this file funnels into
`vscode.window.showErrorMessage(errorMsg)` inside a `try/catch` — D-07's new "no active BBj file"
warning should use the sibling `vscode.window.showWarningMessage(...)` (not `showErrorMessage`), fired
before entering the `try` block (since it is not a failure of the operation, but a precondition).

---

### `bbj-vscode/src/Commands/target-resolution.ts` (NEW utility, transform) — D-05/D-06/D-07

**Analog:** `bbj-vscode/src/Commands/process-args.ts` (lines 1-41) — the established "pure builder,
zero `vscode` import" convention in this exact directory.

**Module-header pattern to copy** (`process-args.ts:31-41`):
```typescript
/**
 * ...
 * No `vscode` import here, intentionally: every builder takes plain primitives, so
 * this module is unit-testable with zero mocks.
 */

export interface Argv {
    file: string;
    args: string[];
    env?: Record<string, string>;
}
```
Mirror this shape for `target-resolution.ts`: export a pure function taking a plain
`{ argFsPath: string | undefined, activeEditor: { fileName: string; languageId: string } | undefined }`
(or equivalent primitives) and returning either a resolved file name or a sentinel meaning "show the
warning" — no `vscode.window.activeTextEditor` access inside the pure function itself; `Commands.cjs`
reads that live value and passes it in as a plain object.

**Language-acceptance check (D-06)** — per Pitfall 2, mirror exactly the *live* half of the menus'
`when` clause (`bbj-vscode/package.json`'s run/compile/denumber entries), which is
`resourceLangId == bbj && resourceExtname != .bbjt` — do **not** also test a `bbx` language id (dead,
per Pitfall 2) and do not accept `bbx-config` documents.

---

### `bbj-vscode/src/document-formatter.ts` (service, request-response) — D-08

**Analog:** itself — the existing `inFlightFormats` map and `clearInFlight` identity guard (lines
10-17, 56-67).

**Current sharing pattern to extend** (lines 56-67):
```typescript
const documentContent = unsavedContentMap.get(document.uri.toString()) || document.getText();
const uriKey = document.uri.toString();
let formatPromise = inFlightFormats.get(uriKey);
if (!formatPromise) {
  formatPromise = this.runFormatter(args, documentContent) as Promise<string>;
  inFlightFormats.set(uriKey, formatPromise);
  const clearInFlight = () => {
    if (inFlightFormats.get(uriKey) === formatPromise) {
      inFlightFormats.delete(uriKey);
    }
  };
  formatPromise.then(clearInFlight, clearInFlight);
}
```
D-08 changes `inFlightFormats: Map<string, Promise<string>>` to store `{content, promise}` per
`uriKey`, and only reuses the entry when `entry.content === documentContent`; on a mismatch it falls
through to the same `runFormatter` call, replacing the map entry. Keep the existing `clearInFlight`
identity-guard cleanup pattern (compare stored promise, not just key presence) unchanged — it already
guards against a slow-to-settle stale promise clobbering a newer one's map cleanup.

**Comment convention to preserve:** this file explains *why* each cache/dedup exists in a block
comment directly above the data structure (lines 12-17, 19-24) — do the same for the new
content-keyed map.

---

### `bbj-vscode/src/extension.ts` `activate()` (provider/lifecycle, event-driven) — D-09/D-10

**Analog:** itself — the file's own already-correct push pattern, e.g. (lines 866, 929, 988):
```typescript
context.subscriptions.push(suppressionStatusBar);
context.subscriptions.push(bbjcplStatusBar);
context.subscriptions.push(
    /* some disposable-returning registration */
);
```
**Bare calls needing the same treatment (D-09)** — every one of these currently discards its returned
`Disposable`:
```typescript
vscode.commands.registerCommand("bbj.run", Commands.run);          // line 783
vscode.commands.registerCommand("bbj.runBUI", async (params) => {...});   // line 786
// ...and the eleven other registerCommand calls (lines 696-817)
vscode.languages.registerDocumentFormattingEditProvider(...);      // line 858
client.onNotification('bbj/bbjcplAvailability', ...);               // line 932
client.onNotification(CONFIG_RELOAD_METHOD, ...);                   // line 949
client.onNotification(RESOLVED_CONFIG_PATH_METHOD, ...);            // line 958
```
Fix shape: wrap each in `context.subscriptions.push(vscode.commands.registerCommand(...))` etc.,
exactly matching the file's own existing convention at the lines cited above — no new abstraction
needed, purely mechanical.

---

### `bbj-vscode/test/no-shell-command-construction.test.ts` (test, source-scan) — D-01/D-05/D-06/D-07 wiring proof

**Analog:** itself.

**Pattern to extend** (lines 14-37):
```typescript
const REPO_ROOT = path.resolve(__dirname, '..');
const COMMANDS_CJS = path.join(REPO_ROOT, 'src/Commands/Commands.cjs');

function stripLineComments(source: string): string { ... }
function readStripped(filePath: string): string { ... }

describe('no-shell-command-construction guard', () => {
    test('Commands.cjs contains zero shell-string process launches', () => {
        const source = readStripped(COMMANDS_CJS);
        const matches = source.match(new RegExp(SHELL_EXEC_CALL, 'g')) ?? [];
        expect(matches).toHaveLength(0);
    });
});
```
Add sibling `test(...)` blocks in this same file (per research's recommendation) asserting
`Commands.cjs`'s source text calls `deleteLeftoverLst(` and the new target-resolution helper by name
— this is the only automated proof possible since `Commands.cjs` cannot be loaded under Vitest
(Pitfall 3).

---

### `bbj-vscode/test/extension-activation.test.ts` (test, event-driven) — D-10

**Analog:** itself.

**Mock pattern to extend** (lines 18-67, `commands: { registerCommand: vi.fn(), ... }`):
```typescript
const registeredCommandIds = new Set<string>();
commands: {
    registerCommand: vi.fn((id: string, _handler: unknown) => {
        if (registeredCommandIds.has(id)) {
            throw new Error(`command '${id}' already exists`);
        }
        registeredCommandIds.add(id);
        return { dispose: () => registeredCommandIds.delete(id) };
    }),
    executeCommand: vi.fn(),
},
```
The existing `disposable()` helper (line 19, `() => ({ dispose: vi.fn() })`) is the shape every other
mocked registration already returns (e.g. `onDidChangeActiveTextEditor: vi.fn(() => disposable())`,
line 32) — the D-10 test then calls `activate(context)`, disposes every entry in
`context.subscriptions`, calls `activate(context)` again, and asserts no throw.

---

### `bbj-intellij/.../ui/BbjStatusBarWidget.java` and `BbjJavaInteropStatusBarWidget.java` (component, event-driven) — D-11/D-12

**Analog:** each is the other's near-identical sibling; use `BbjStatusBarWidget.java` as the base to
read from and apply the identical diff to `BbjJavaInteropStatusBarWidget.java`.

**Existing subscribe pattern to extend (D-11)** (lines 57-62):
```java
messageBusConnection = project.getMessageBus().connect();
messageBusConnection.subscribe(
    BbjServerService.BbjServerStatusListener.TOPIC,
    this::updateStatus
);
```
Add a second `subscribe` call on the same `messageBusConnection` for
`FileEditorManagerListener.FILE_EDITOR_MANAGER`, routing `selectionChanged` to `updateVisibility()`
directly (no `invokeLater` needed — `FileEditorManagerListener` callbacks already run on the EDT,
unlike the server-status topic which needs the existing `invokeLater` in `updateStatus`, lines 68-105).

**Hard-coded extension list to replace (D-12)** (lines 107-118):
```java
private void updateVisibility() {
    VirtualFile[] files = FileEditorManager.getInstance(project).getSelectedFiles();
    boolean hasBbjFile = false;
    for (VirtualFile file : files) {
        String ext = file.getExtension();
        if (ext != null && (ext.equals("bbj") || ext.equals("bbl") || ext.equals("bbjt") || ext.equals("src"))) {
            hasBbjFile = true;
            break;
        }
    }
    panel.setVisible(hasBbjFile);
}
```
Replace the extension check with a call to the new shared predicate, e.g.
`BbjFileVisibility.isVisibleFileTypeName(file.getFileType().getName())` — never re-derive by
extension string (Don't Hand-Roll table). `BbjJavaInteropStatusBarWidget.java` has the identical
extension list at its own lines 99-107 — same replacement.

**Disposal pattern (already correct, keep as-is):** `dispose()` at lines 166-170 already calls
`messageBusConnection.disconnect()`, which tears down *both* subscriptions on the same connection —
no new disposal code needed for D-11.

---

### `bbj-intellij/.../ui/BbjFileVisibility.java` (NEW utility, transform) — D-12

**Analog:** `bbj-intellij/.../config/BbjConfigPathService.java` — `isConfigFileName`/
`isDefaultConfigFilename` static package-private helpers (lines 131-149).

**Pattern to copy** (`BbjConfigPathService.java:131-136`):
```java
static boolean isConfigFileName(String activePath, String filePath, @Nullable String fileName) {
    if (!activePath.isEmpty() && ConfigPaths.samePath(activePath, filePath)) {
        return true;
    }
    return isDefaultConfigFilename(fileName);
}
```
Mirror this exact shape for the new class: a package-private **static** method taking a plain
`String` (the resolved `FileType`'s name, e.g. via `file.getFileType().getName()`), returning a
`boolean`, comparing against `BbjFileType.INSTANCE.getName()` as a named constant — never constructing
or importing a live `VirtualFile`/`Application` inside the predicate itself (Pitfall 5). Both widget
classes become thin one-line callers of this static method.

---

### `bbj-intellij/src/test/.../ui/BbjFileVisibilityTest.java` and `BbjStatusBarWidgetSourceGuardTest.java` (NEW tests) — D-13

**Analog:** `bbj-intellij/src/test/.../config/BbjConfigFileTypeOverriderSourceGuardTest.java` (full
file read).

**Source-guard pattern to copy** (lines 21-64):
```java
class BbjConfigFileTypeOverriderSourceGuardTest {

    private static final Path OVERRIDER_SOURCE = Paths.get(
            "src", "main", "java", "com", "basis", "bbj", "intellij", "config", "BbjConfigFileTypeOverrider.java")
            .toAbsolutePath();

    private static String readSource(Path path) { ... }   // Files.readString + fail() if missing

    private static int countOccurrences(String text, String literal) { ... }

    @Test
    void overriderReachesTheSharedPredicateExactlyOnceAndReturnsExactlyOneFileTypeConstant() {
        String text = readSource(OVERRIDER_SOURCE);
        assertEquals(1, countOccurrences(text, "isConfigFile("), "...");
        assertEquals(1, countOccurrences(text, "BbjConfigFileType.INSTANCE"), "...");
    }
}
```
For `BbjStatusBarWidgetSourceGuardTest.java`, apply the identical `readSource`/`countOccurrences`
idiom against both widget `.java` sources, asserting: (a) each calls the shared visibility predicate
exactly once and does no ad-hoc `ext.equals(...)` comparison, and (b) each subscribes
`FileEditorManagerListener.FILE_EDITOR_MANAGER` exactly once on `messageBusConnection`.

For `BbjFileVisibilityTest.java` (plain-JUnit, not source-guard): follow the plain-value-input
convention already established for `BbjConfigPathService`'s static methods — call
`BbjFileVisibility.isVisibleFileTypeName("BBj")` etc. with plain `String` arguments, asserting `true`
for the BBj file type name and `false` for the config file type name, `.bbl`'s (non-BBj) type name,
and any other non-BBj type — never constructing `BbjFileType.INSTANCE`, `VirtualFile`, or `FileType`
objects directly (Pitfall 5's explicit warning; no test in this repo does that).

---

## Shared Patterns

### "No `vscode` import, pure module" convention (VS Code side)
**Source:** `bbj-vscode/src/Commands/process-args.ts:31-41`, `bbj-vscode/src/decompile-io.ts:1-11`
**Apply to:** `target-resolution.ts` (new), the `deleteLeftoverLst` addition to `decompile-io.ts`
```typescript
// No `vscode` import here, intentionally: every builder takes plain primitives, so
// this module is unit-testable with zero mocks.
```

### "Static-helper-plus-thin-wrapper" convention (IntelliJ side)
**Source:** `bbj-intellij/.../config/BbjConfigPathService.java:131-149`
**Apply to:** `BbjFileVisibility.java` (new); both widget classes become thin callers
```java
static boolean isConfigFileName(String activePath, String filePath, @Nullable String fileName) { ... }
```

### Source-guard test idiom (both sides, for code that can't be executed under the test runner)
**Source:** `bbj-vscode/test/no-shell-command-construction.test.ts:14-37` (VS Code — CommonJS file
unloadable under Vitest); `bbj-intellij/src/test/.../config/BbjConfigFileTypeOverriderSourceGuardTest.java:21-64`
(IntelliJ — avoids constructing a live `Application`)
**Apply to:** the `Commands.cjs` wiring proof for D-01/D-05/D-06/D-07; the widget wiring proof for D-13
```typescript
function readStripped(filePath: string): string { return stripLineComments(fs.readFileSync(filePath, 'utf-8')); }
expect(matches).toHaveLength(0);
```
```java
assertEquals(1, countOccurrences(text, "isConfigFile("), "...");
```

### `context.subscriptions.push(...)` disposal convention
**Source:** `bbj-vscode/src/extension.ts:866, 881, 893, 915, 918, 929, 945, 988, 991, 1032`
**Apply to:** every currently-bare `registerCommand`/`registerDocumentFormattingEditProvider`/
`client.onNotification` call inside `activate()` (D-09)
```typescript
context.subscriptions.push(suppressionStatusBar);
```

### Fail-closed error message reuse
**Source:** `bbj-vscode/src/Commands/Commands.cjs:217, 435`
**Apply to:** D-03's undeletable-leftover-`.lst` failure path (same `catch` block, same message shape)
```javascript
const errorMsg = `Failed to decompile "${fileName}": ${err.message || err}${err.stderr ? '\n\nDetails:\n' + err.stderr : ''}`;
vscode.window.showErrorMessage(errorMsg);
```

## No Analog Found

None — every file in this phase's scope has at least one exact or role-matching analog, since all
five fixes extend files (or their near-identical siblings) that already exist and already carry the
exact pattern the fix needs to extend.

## Metadata

**Analog search scope:** `bbj-vscode/src/`, `bbj-vscode/test/`, `bbj-intellij/src/main/java/com/basis/bbj/intellij/`, `bbj-intellij/src/test/java/com/basis/bbj/intellij/`
**Files scanned:** 13 (all confirmed git-tracked via `git ls-files`)
**Pattern extraction date:** 2026-09-13
