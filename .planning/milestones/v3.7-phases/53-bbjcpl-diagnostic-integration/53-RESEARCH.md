# Phase 53: BBjCPL Diagnostic Integration - Research

**Researched:** 2026-02-20
**Domain:** Langium document lifecycle integration, LSP diagnostic merging, VS Code settings wiring, status bar API
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Diagnostic hierarchy rules:**
- BBjCPL and Langium diagnostics are **merged**, not replaced — errors on the same line combine into a single diagnostic entry
- When both sources report an error on the same line, **prefer the Langium message** (usually more detailed) but keep "BBjCPL" as the source label since the compiler confirmed the error
- BBjCPL-only errors (lines where Langium has no matching error) **always appear** with source "BBjCPL" — they catch things Langium misses like linking and classpath issues
- When BBjCPL reports clean (no errors), **Langium errors still show** — the compiler being happy doesn't suppress Langium-detected issues

**Trigger & configuration:**
- Three trigger modes: `"on-save"`, `"debounced"`, and `"off"` via `bbj.compiler.trigger` setting
- **Default: `"debounced"`** — errors appear as you type after a 2-second pause, similar to TypeScript
- When switching trigger mode at runtime (e.g., debounced to off), **existing BBjCPL diagnostics stay visible until the next file event** — they're not cleared immediately

**Degradation & edge cases:**
- When BBj is not installed: **status bar indicator** shows "BBjCPL: unavailable" (no popup notification)
- BBjCPL availability is **detected lazily on first trigger** — not checked at startup. Status bar reflects availability after first compile attempt
- If trigger setting is "on-save" or "debounced" but BBjCPL isn't available: **leave the setting as-is**. Status bar shows unavailable. If BBj is installed later, it starts working without reconfiguration
- Runtime failures (classpath error, corrupt installation): Claude's discretion on surfacing

**Rapid-save debouncing:**
- Rapid saves use **trailing edge debounce** — wait for a 500ms quiet period after the last save, then compile
- **Clear-then-show** diagnostic updates — old BBjCPL diagnostics are cleared when compile starts, new ones appear when done (brief empty period is acceptable)
- In-flight compile cancellation strategy: Claude's discretion based on Phase 52 process lifecycle

### Claude's Discretion

- Runtime failure surfacing approach (output channel vs status bar warning)
- In-flight compile cancellation strategy (abort vs let-finish-discard)
- Exact status bar text and icon states
- Debounced mode typing-pause detection implementation

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CPL-05 | BBjCPL diagnostics labeled with source "BBjCPL" — distinct from Langium "bbj" source for user clarity | The current parser uses source `'BBj Compiler'` — must be changed to `'BBjCPL'`. Langium's `getSource()` returns `this.metadata.languageId` which is `'bbj'`. The two sources are already distinct after this rename. |
| CPL-06 | Diagnostic hierarchy — BBjCPL errors shown first; Langium parser errors only when BBjCPL reports clean; warnings/hints only when no hard errors | Hierarchy is implemented via `applyDiagnosticHierarchy()` in `bbj-document-validator.ts`. Phase 53 extends it: add `BBjCPL = 3` to `DiagnosticTier`, one new branch to `getDiagnosticTier()`, and merge logic in `BBjDocumentBuilder.buildDocuments()`. |
| CPL-07 | Configurable trigger setting — on-save (default) or debounced invocation, controlled via bbj.compiler.trigger setting | New `bbj.compiler.trigger` setting in `package.json` with enum `["debounced", "on-save", "off"]`. Server-side trigger mode variable read on `onDidChangeConfiguration`. Debounce implemented with `setTimeout`/`clearTimeout` per-file map in `BBjDocumentBuilder`. |
| CPL-08 | BBjCPL integration degrades gracefully when BBj not installed — no errors, no UI noise, Langium diagnostics work as before | `BBjCPLService.compile()` already returns `[]` on ENOENT. Phase 53 adds: status bar shows "BBjCPL: unavailable" on first ENOENT, tracked via a module-level `bbjcplAvailable` flag. Status bar updated when availability changes. |
</phase_requirements>

## Summary

Phase 53 wires the fully-built `BBjCPLService` (Phase 52) into the document lifecycle so compiler errors appear in the Problems panel. The integration happens in three places: (1) `BBjDocumentBuilder.buildDocuments()` calls `BBjCPLService.compile()` for each validated `.bbj` document and merges the results into `document.diagnostics`, (2) `main.ts` reads `bbj.compiler.trigger` from settings and applies debounce/on-save/off logic, and (3) `extension.ts` adds a BBjCPL status bar item showing availability.

The diagnostic merging strategy is merge-not-replace: Langium and BBjCPL diagnostics coexist, with same-line conflicts preferring Langium's message but keeping "BBjCPL" as the source. The existing `applyDiagnosticHierarchy()` function in `bbj-document-validator.ts` is extended with a new `BBjCPL = 3` tier that sits above `Parse = 2`. When BBjCPL reports errors, Langium parsing errors for the same file are suppressed; when BBjCPL reports clean, Langium diagnostics survive untouched.

The debounced trigger (2-second idle after last save/change) mimics TypeScript's behavior in VS Code. The on-save trigger hooks into `buildDocuments()` naturally since Langium calls it after save. The "off" mode simply skips the `BBjCPLService.compile()` call. BBjCPL unavailability is detected lazily on first compile attempt (ENOENT) and surfaced as a status bar indicator — no popup, no log noise.

**Primary recommendation:** Extend `BBjDocumentBuilder.buildDocuments()` to call `BBjCPLService.compile()` after Langium validation, then merge diagnostics. Keep trigger mode and debounce logic as a thin module-level state in `main.ts` (not a new class). Add one new status bar item in `extension.ts` for BBjCPL availability.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Langium `DefaultDocumentBuilder` | Already in project (4.x) | `buildDocuments()` override point for BBjCPL integration | Already subclassed as `BBjDocumentBuilder`; `buildDocuments()` is called after save and rebuild |
| `vscode-languageserver` | ^9.0.1 (already in project) | `Diagnostic`, `connection.sendDiagnostics()` | Already in use; diagnostics published via `onDocumentPhase(Validated)` hook in Langium |
| `vscode` extension API | Already in project | `createStatusBarItem`, `onDidChangeConfiguration`, `onDidSaveTextDocument`, `onDidChangeTextDocument` | All used in existing `extension.ts` |
| Node.js `setTimeout`/`clearTimeout` | Built-in | Per-file debounce timer | Already used in `BBjCPLService` for timeout; same pattern for debounce |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `BBjCPLService.compile(filePath)` | Phase 52 (project) | Returns `Promise<Diagnostic[]>` from bbjcpl | Called from `buildDocuments()` for each `.bbj` document |
| `BBjCPLService.isCompiling(filePath)` | Phase 52 (project) | Check in-flight state | Useful for debounce guard — skip if already running |
| `setSuppressCascading` / `setMaxErrors` | Phase 50 (project) | Module-level state setters | Pattern to follow for `setCompilerTrigger()` setter |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Extending `BBjDocumentBuilder.buildDocuments()` | Registering `onDocumentPhase(Validated)` listener in `main.ts` | `onDocumentPhase` fires outside `buildDocuments()`; it is safe but the CONTEXT.md/STATE.md note "must be called from inside `buildDocuments()`" — verified: `onBuildPhase` listeners can cause CPU rebuild loops if they trigger `update()`; `buildDocuments()` override is the safe, established pattern |
| Module-level trigger state in `main.ts` | New `BBjTriggerService` class | For a simple tri-state flag and one debounce timer map, a class adds complexity without benefit; the Phase 50 precedent (`setSuppressCascading`, `setMaxErrors`) uses module-level setters cleanly |
| Status bar in `extension.ts` | Custom LSP notification to client | Custom LSP notification requires protocol extension on both client and server; STATE.md notes "Phase 53 can refine with a custom LSP notification if needed" — status bar heuristic is sufficient for this phase |

**Installation:** No new packages needed. All required APIs are already in the project.

## Architecture Patterns

### Recommended Project Structure

```
bbj-vscode/src/language/
├── bbj-document-builder.ts   MODIFY: call BBjCPLService.compile() after validate phase, merge diagnostics
├── bbj-document-validator.ts MODIFY: add BBjCPL = 3 to DiagnosticTier, update getDiagnosticTier()
├── bbj-cpl-parser.ts         MODIFY: change source from 'BBj Compiler' to 'BBjCPL' (CPL-05)
└── main.ts                   MODIFY: read bbj.compiler.trigger, apply trigger mode to builder

bbj-vscode/
└── package.json              MODIFY: add bbj.compiler.trigger setting

bbj-vscode/src/
└── extension.ts              MODIFY: add BBjCPL status bar item (availability indicator)

bbj-vscode/test/
└── cpl-integration.test.ts   NEW: merge logic unit tests (no subprocess)
```

### Pattern 1: BBjCPL Integration in buildDocuments()

The override in `BBjDocumentBuilder` already calls `super.buildDocuments()` first. Phase 53 adds BBjCPL compilation **after** the super call, for each validated document.

```typescript
// In bbj-document-builder.ts
// services.compiler.BBjCPLService is accessed via constructor parameter
// The service needs to be plumbed from BBjServices into BBjDocumentBuilder

protected override async buildDocuments(
    documents: LangiumDocument<AstNode>[],
    options: BuildOptions,
    cancelToken: CancellationToken
): Promise<void> {
    await super.buildDocuments(documents, options, cancelToken);

    // After Langium validation, run BBjCPL if trigger allows
    if (getCompilerTrigger() === 'off') return;

    for (const document of documents) {
        if (!this.shouldCompileWithBbjcpl(document)) continue;

        const filePath = document.uri.fsPath;

        // Clear existing BBjCPL diagnostics (clear-then-show pattern)
        document.diagnostics = (document.diagnostics ?? []).filter(
            d => d.source !== 'BBjCPL'
        );

        // Compile and merge
        const cplDiags = await this.bbjcplService.compile(filePath);
        if (cplDiags.length > 0) {
            document.diagnostics = mergeDiagnostics(
                document.diagnostics ?? [],
                cplDiags
            );
            // Notify client of updated diagnostics
            await this.notifyDocumentPhase(document, DocumentState.Validated, cancelToken);
        }
    }

    await this.addImportedBBjDocuments(documents, options, cancelToken);
    await this.revalidateUseFilePathDiagnostics(documents, cancelToken);
}
```

**Key concern:** `addImportedBBjDocuments` and `revalidateUseFilePathDiagnostics` already run in the existing override. The BBjCPL section must be placed **between** `super.buildDocuments()` and the import resolution calls, OR after all of them. Since BBjCPL compiles the saved file (not imported ones), placement after `super.buildDocuments()` but before import resolution is fine — BBjCPL only cares about the file being saved, not its transitive imports.

### Pattern 2: Diagnostic Merge Logic

The merge is a pure function — easy to unit test:

```typescript
// Source: 53-CONTEXT.md merge rules
function mergeDiagnostics(langiumDiags: Diagnostic[], cplDiags: Diagnostic[]): Diagnostic[] {
    const result: Diagnostic[] = [...langiumDiags];

    for (const cplDiag of cplDiags) {
        const cplLine = cplDiag.range.start.line;

        // Find a Langium diagnostic on the same line
        const matchingLangium = langiumDiags.find(
            d => d.range.start.line === cplLine
        );

        if (matchingLangium) {
            // Same line: prefer Langium message, keep BBjCPL source
            // Langium diagnostic already in result — just mark it as BBjCPL-confirmed
            // by changing its source. Message stays as Langium's.
            const idx = result.indexOf(matchingLangium);
            if (idx >= 0) {
                result[idx] = { ...matchingLangium, source: 'BBjCPL' };
            }
        } else {
            // BBjCPL-only error: always add with BBjCPL source
            result.push(cplDiag); // cplDiag.source is already 'BBjCPL'
        }
    }

    return result;
}
```

### Pattern 3: DiagnosticTier Extension

The existing `DiagnosticTier` enum in `bbj-document-validator.ts` has placeholder comments for Phase 53:

```typescript
// Current (Phase 50):
const enum DiagnosticTier {
    Warning  = 0,
    Semantic = 1,
    Parse    = 2,
    // BBjCPL = 3,  // Phase 53: compiler errors — suppress everything below
}

// Phase 53 adds:
const enum DiagnosticTier {
    Warning  = 0,
    Semantic = 1,
    Parse    = 2,
    BBjCPL   = 3,   // compiler errors — suppress Langium parse errors when present
}

// And in getDiagnosticTier():
function getDiagnosticTier(d: Diagnostic): DiagnosticTier {
    if (d.source === 'BBjCPL') return DiagnosticTier.BBjCPL;     // NEW
    if (d.data?.code === DocumentValidator.ParsingError) return DiagnosticTier.Parse;
    if (d.severity === DiagnosticSeverity.Error) return DiagnosticTier.Semantic;
    return DiagnosticTier.Warning;
}
```

The `applyDiagnosticHierarchy()` logic then needs one new rule: if `hasBbjcplErrors`, suppress Langium parse errors (but NOT Langium semantic/linking errors — those survive alongside BBjCPL errors per CONTEXT.md: "When BBjCPL reports clean, Langium errors still show").

**Important clarification from CONTEXT.md:** BBjCPL suppresses Langium **parser** errors only when BBjCPL reports errors — it does NOT suppress Langium semantic errors. The hierarchy is:
- BBjCPL errors present: suppress Langium parse errors (they're redundant), keep Langium semantic errors
- BBjCPL clean: all Langium diagnostics survive unchanged
- Existing Rule 2 (any error → suppress warnings) applies independently

```typescript
// In applyDiagnosticHierarchy():
const hasBbjcplErrors = diagnostics.some(
    d => getDiagnosticTier(d) === DiagnosticTier.BBjCPL
);

// Rule 0 (new): BBjCPL errors present → suppress Langium parse errors (they're redundant)
if (hasBbjcplErrors) {
    result = result.filter(
        d => getDiagnosticTier(d) !== DiagnosticTier.Parse
    );
}
```

### Pattern 4: Trigger Mode Setting

New `bbj.compiler.trigger` setting in `package.json`:

```json
"bbj.compiler.trigger": {
    "type": "string",
    "enum": ["debounced", "on-save", "off"],
    "default": "debounced",
    "description": "Controls when the BBjCPL compiler is invoked. 'debounced' runs after 2 seconds of idle typing, 'on-save' runs on file save only, 'off' disables BBjCPL invocation."
}
```

In `main.ts`, read alongside other settings in `onDidChangeConfiguration`:

```typescript
// Module-level state (same pattern as setSuppressCascading)
let compilerTrigger: 'debounced' | 'on-save' | 'off' = 'debounced';

export function getCompilerTrigger() { return compilerTrigger; }
export function setCompilerTrigger(trigger: 'debounced' | 'on-save' | 'off') {
    compilerTrigger = trigger;
}

// In onDidChangeConfiguration:
if (config.compiler?.trigger !== undefined) {
    setCompilerTrigger(config.compiler.trigger);
}
```

Also add to `initializationOptions` in `extension.ts`:
```typescript
compilerTrigger: vscode.workspace.getConfiguration("bbj").get("compiler.trigger", "debounced"),
```

And read it in `BBjWorkspaceManager.onInitialize()` like `suppressCascading`.

### Pattern 5: Debounce Implementation

The debounced trigger fires 2 seconds after the **last** change (trailing edge). This happens in `BBjDocumentBuilder` — it needs access to the trigger mode and a per-file debounce timer:

```typescript
// In BBjDocumentBuilder — module-level debounce map (per-file)
// Or as a class field:
private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

private scheduleDebounced(filePath: string, compile: () => Promise<void>): void {
    const existing = this.debounceTimers.get(filePath);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
        this.debounceTimers.delete(filePath);
        compile();
    }, 2000); // 2-second debounce

    this.debounceTimers.set(filePath, timer);
}
```

**Alternative:** For on-save mode, compilation runs synchronously inside `buildDocuments()`. For debounced, the timer fires outside `buildDocuments()` and calls `BBjCPLService.compile()` directly, then updates `document.diagnostics` and re-notifies. Both approaches work; the synchronous in-`buildDocuments()` approach is simpler and stays within the established "call from buildDocuments" pattern.

**Simpler alternative (recommended):** Since `buildDocuments()` is already called on every save, the distinction between "on-save" and "debounced" can be handled by:
- `on-save`: run BBjCPL synchronously inside `buildDocuments()` (already triggered by save)
- `debounced`: schedule a delayed compile for 2 seconds, skip if `buildDocuments()` is being called more rapidly than 2 seconds apart — use `Date.now()` comparison with a per-file last-compile timestamp
- `off`: skip entirely

### Pattern 6: Status Bar Item for BBjCPL Availability

Following the existing `suppressionStatusBar` pattern in `extension.ts`:

```typescript
// In activate():
const bbjcplStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left, 99  // slightly lower priority than suppression bar
);
context.subscriptions.push(bbjcplStatusBar);

// Updated when diagnostics change — check if BBjCPL is working or unavailable
// The server communicates availability via a custom LSP notification
// OR via the absence/presence of 'BBjCPL' source diagnostics + a status flag
```

**Availability tracking:** The cleanest approach for this phase is a custom LSP notification from server to client when BBjCPL availability changes. The server knows availability after the first compile attempt (ENOENT = unavailable, success = available).

```typescript
// Server (main.ts) — sends notification when availability changes
let bbjcplAvailableState: boolean | undefined = undefined;

export function setBbjcplAvailable(available: boolean): void {
    if (bbjcplAvailableState !== available) {
        bbjcplAvailableState = available;
        connection.sendNotification('bbj/bbjcplAvailability', { available });
    }
}

// Client (extension.ts) — listens for notification
client.onNotification('bbj/bbjcplAvailability', ({ available }: { available: boolean }) => {
    if (available) {
        bbjcplStatusBar.hide(); // Available and working — no need to show
    } else {
        bbjcplStatusBar.text = '$(warning) BBjCPL: unavailable';
        bbjcplStatusBar.tooltip = 'BBjCPL compiler not found. Check bbj.home setting.';
        bbjcplStatusBar.show();
    }
});
```

**Alternative (simpler):** Use a module-level flag in `bbj-document-builder.ts` with a setter. The `BBjDocumentBuilder` calls the setter after each compile attempt, `main.ts` subscribes via a callback. This avoids the custom notification protocol and keeps all logic server-side. Status bar in `extension.ts` then polls via `getDiagnostics()` heuristic. Given that STATE.md says "Phase 53 can refine with a custom LSP notification if needed" and the user asked for a status bar indicator, the custom notification approach is cleaner. Recommend custom notification as it's already noted in STATE.md.

### Pattern 7: Rapid-Save Debounce (CPL-05 success criterion #5)

Ten rapid saves must not cause CPU spike or diagnostic flicker. The `BBjCPLService` already cancels in-flight processes on second `compile()` call. The additional concern is not spamming `buildDocuments()` → `compile()` ten times in succession.

The 500ms trailing-edge debounce for saves (per CONTEXT.md: "wait for a 500ms quiet period after the last save, then compile") means: when `buildDocuments()` is called for a file, instead of immediately calling `BBjCPLService.compile()`, schedule it 500ms out. If `buildDocuments()` is called again within 500ms (another save), cancel the pending schedule and reset the timer.

**Note:** The 500ms is the save debounce. The 2-second debounce is for keystroke-based triggers in debounced mode. These are two separate concerns. For "on-save" mode: 500ms trailing debounce on saves. For "debounced" mode: 2-second trailing debounce on document changes.

### Anti-Patterns to Avoid

- **Calling BBjCPL from `onBuildPhase` callback:** STATE.md explicitly warns this causes CPU rebuild loops. The `onBuildPhase(Validated)` listener is used only for `workspaceInitialized` tracking, not for triggering compilations. BBjCPL must be called from **inside** `buildDocuments()`.
- **Replacing Langium diagnostics:** CONTEXT.md specifies merge, not replace. Never `document.diagnostics = cplDiags` — always merge.
- **Clearing all diagnostics before compile:** The `clear-then-show` pattern should only clear **BBjCPL** diagnostics (`source === 'BBjCPL'`), not Langium diagnostics.
- **Calling `notifyDocumentPhase` from `buildDocuments()`:** `notifyDocumentPhase` is `protected` on `DefaultDocumentBuilder`. The existing `revalidateUseFilePathDiagnostics` already calls it — follow that pattern exactly. Don't call `connection.sendDiagnostics()` directly from the builder; use `notifyDocumentPhase`.
- **Checking BBjCPL availability at startup:** Per CONTEXT.md, lazy detection only. Do not probe bbjcpl on extension activation.
- **Applying debounce to the on-save trigger:** The on-save trigger runs naturally when `buildDocuments()` is called after save. The 500ms debounce is only for preventing CPU spike on rapid saves — apply it to the BBjCPL compile call inside `buildDocuments()`, not to Langium's own build.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Diagnostic source distinction | Custom type system / wrapper | `d.source === 'BBjCPL'` string check | Already the pattern used by `getDiagnosticTier()`; source string is the reliable discriminant |
| Debounce utility | npm debounce package | `setTimeout`/`clearTimeout` with a `Map<string, ReturnType<typeof setTimeout>>` | Project already uses this pattern in `BBjCPLService`; no new dependency needed |
| Process abort on rapid save | New abort mechanism | Existing `BBjCPLService.compile()` already cancels in-flight on second call | Phase 52 solved this; Phase 53 just calls `compile()` |
| LSP notification | Custom WebSocket / polling | `connection.sendNotification()` + `client.onNotification()` | Built into `vscode-languageserver-protocol`; same mechanism as `bbj/refreshJavaClasses` pattern in `main.ts` |
| Diagnostic merge | ORM/diff library | Simple `Array.find()` by line number | The merge is 10 lines of pure function; no library adds value |

**Key insight:** This phase is integration, not infrastructure. The hard parts (subprocess management, diagnostic parsing) are done. The work is wiring them together with the right ordering and state management.

## Common Pitfalls

### Pitfall 1: CPU Rebuild Loop from onBuildPhase

**What goes wrong:** Registering `shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, ...)` and calling `BBjCPLService.compile()` from that callback, then updating `document.diagnostics` and calling `notifyDocumentPhase()` — which re-triggers the build loop.
**Why it happens:** `onBuildPhase` callbacks that modify document state re-enter the build queue.
**How to avoid:** BBjCPL call must live inside `BBjDocumentBuilder.buildDocuments()` override, called via `super.buildDocuments()` completing first. Already documented in STATE.md.
**Warning signs:** CPU at 100%, continuous rebuild cycling without user input.

### Pitfall 2: Wrong Source Label (CPL-05 Not Met)

**What goes wrong:** The current `bbj-cpl-parser.ts` uses `source: 'BBj Compiler'`. CPL-05 requires `source: 'BBjCPL'`. If not changed, Problems panel shows wrong label and `getDiagnosticTier()` won't recognize BBjCPL diagnostics.
**Why it happens:** Phase 52 used a placeholder source name; Phase 53 is supposed to set the correct one.
**How to avoid:** Change `source: 'BBj Compiler'` to `source: 'BBjCPL'` in `bbj-cpl-parser.ts`. Update tests in `cpl-parser.test.ts` that assert `source === 'BBj Compiler'`.
**Warning signs:** Test failures on source assertion; `getDiagnosticTier()` returns `Semantic` instead of `BBjCPL` for compiler diagnostics.

### Pitfall 3: BBjDocumentBuilder Cannot Access BBjCPLService

**What goes wrong:** `BBjDocumentBuilder` is a **shared** service (in `BBjSharedModule`), but `BBjCPLService` is a **language** service (in `BBjModule`). The shared services don't have direct access to language services via constructor injection.
**Why it happens:** Langium's DI architecture separates shared services (workspace-wide, single instance) from language services (per-language). `BBjDocumentBuilder` is constructed with `LangiumSharedCoreServices`, which doesn't include `BBjServices`.
**How to avoid:** Two options:
  1. **Lazy resolution:** Resolve `BBjCPLService` lazily via `services.ServiceRegistry.getServices(doc.uri).compiler.BBjCPLService` inside `buildDocuments()`. `BBjDocumentBuilder` already uses `this.serviceRegistry` for the validator. This is the cleanest approach.
  2. **Constructor injection via wrapper:** Accept a callback or reference in `BBjDocumentBuilder`'s constructor. Messier.

The recommended approach is (1) — identical to how `DefaultDocumentBuilder.validate()` resolves the validator:
```typescript
// From DefaultDocumentBuilder.validate():
const validator = this.serviceRegistry.getServices(document.uri).validation.DocumentValidator;
// Phase 53 follows same pattern:
const cplService = (this.serviceRegistry.getServices(document.uri) as BBjServices).compiler.BBjCPLService;
```
**Warning signs:** TypeScript compile error trying to access `BBjCPLService` from constructor-injected services.

### Pitfall 4: notifyDocumentPhase Sends Partial Diagnostics

**What goes wrong:** Calling `notifyDocumentPhase(document, DocumentState.Validated, cancelToken)` after appending BBjCPL diagnostics sends the full `document.diagnostics` array including BBjCPL entries — correct. BUT if called before the Langium validation has pushed all its diagnostics to `document.diagnostics`, the notification is premature.
**Why it happens:** `super.buildDocuments()` calls `notifyDocumentPhase` as each document reaches `Validated` state. The Phase 53 code runs AFTER `super.buildDocuments()` completes — so Langium diagnostics are already in `document.diagnostics`. Calling `notifyDocumentPhase` again after BBjCPL merge sends an update with the full merged set.
**How to avoid:** Only call `notifyDocumentPhase` after BBjCPL compilation completes and diagnostics are merged. Do not call it before `BBjCPLService.compile()` resolves.
**Warning signs:** Problems panel flickers — shows Langium-only briefly, then BBjCPL-merged version.

### Pitfall 5: Debounce Timer Leak on Extension Deactivation

**What goes wrong:** `setTimeout` timers registered in `BBjDocumentBuilder` are not cleared when the language server shuts down, potentially causing errors after disposal.
**Why it happens:** Node.js process exits cleanly on SIGTERM, so pending timers are usually killed. But during tests or hot-reloads, leaked timers can cause unexpected callbacks.
**How to avoid:** Store the debounce timer map on the class. The language server process lifecycle handles cleanup. For tests, use `vi.useFakeTimers()` to control timer execution.
**Warning signs:** Test timeouts, or callbacks firing after test teardown.

### Pitfall 6: Source Label Mismatch Breaks Diagnostic Hierarchy

**What goes wrong:** `getDiagnosticTier()` checks `d.source === 'BBjCPL'`. If the source label is `'BBj Compiler'` (current), the new `BBjCPL = 3` tier is never assigned, so BBjCPL diagnostics are classified as `Semantic = 1` and don't suppress Langium parse errors.
**Why it happens:** Source label and tier detection must be changed atomically.
**How to avoid:** Change source label and `getDiagnosticTier()` in the same plan. Update tests for both.
**Warning signs:** Parser errors not suppressed when BBjCPL errors present; BBjCPL diagnostics not appearing in Problems panel labeled "BBjCPL".

### Pitfall 7: Initializaton Options Missing compilerTrigger

**What goes wrong:** `bbj.compiler.trigger` is read from `onDidChangeConfiguration` but not from `initializationOptions`. On first startup, the trigger mode is the default (`'debounced'`) regardless of the user's saved setting.
**Why it happens:** The pattern for all settings (e.g., `suppressCascading`, `maxErrors`) is to pass them in `initializationOptions` from `extension.ts` AND handle them in `onDidChangeConfiguration`.
**How to avoid:** Add `compilerTrigger` to `initializationOptions` in `extension.ts` and read it in `BBjWorkspaceManager.onInitialize()` via `setCompilerTrigger()`.

## Code Examples

Verified patterns from official sources:

### ServiceRegistry Access Pattern (from DefaultDocumentBuilder)

```typescript
// Source: langium/src/workspace/document-builder.ts (validate method, line 627)
// This is how language services are accessed from shared services
const validator = this.serviceRegistry.getServices(document.uri).validation.DocumentValidator;

// Phase 53 equivalent:
const cplService = (this.serviceRegistry.getServices(document.uri) as BBjServices).compiler.BBjCPLService;
const cplDiags = await cplService.compile(document.uri.fsPath);
```

### Langium Diagnostic Publishing (how sendDiagnostics is triggered)

```typescript
// Source: langium/src/lsp/language-server.ts (addDiagnosticsHandler, line 379)
// Langium publishes diagnostics via onDocumentPhase(Validated):
documentBuilder.onDocumentPhase(DocumentState.Validated, async (document) => {
    if (document.diagnostics) {
        connection.sendDiagnostics({
            uri: document.uri.toString(),
            diagnostics: document.diagnostics
        });
    }
});
// Therefore: updating document.diagnostics and calling notifyDocumentPhase(Validated)
// causes Langium to re-send the updated diagnostics to the client automatically.
```

### notifyDocumentPhase Usage (from existing revalidateUseFilePathDiagnostics)

```typescript
// Source: bbj-vscode/src/language/bbj-document-builder.ts (line 244)
// Existing pattern for pushing updated diagnostics after post-build modification:
if (document.diagnostics.length !== originalLength) {
    await this.notifyDocumentPhase(document, DocumentState.Validated, cancelToken);
}

// Phase 53 equivalent (after BBjCPL merge):
const lengthBefore = document.diagnostics?.length ?? 0;
const cplDiags = await cplService.compile(document.uri.fsPath);
if (cplDiags.length > 0) {
    document.diagnostics = mergeDiagnostics(document.diagnostics ?? [], cplDiags);
    await this.notifyDocumentPhase(document, DocumentState.Validated, cancelToken);
}
```

### Custom LSP Notification (existing pattern)

```typescript
// Source: bbj-vscode/src/language/main.ts (line 22) — server side
connection.onRequest('bbj/refreshJavaClasses', async () => { ... });

// For notifications (fire-and-forget, no response needed):
// Server → Client:
connection.sendNotification('bbj/bbjcplAvailability', { available: false });

// Client (extension.ts):
client.onNotification('bbj/bbjcplAvailability', (params: { available: boolean }) => {
    // Update status bar
});
```

### Status Bar Item Pattern (from existing suppressionStatusBar)

```typescript
// Source: bbj-vscode/src/extension.ts (lines 645-669)
const bbjcplStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left, 99
);
bbjcplStatusBar.text = '$(warning) BBjCPL: unavailable';
bbjcplStatusBar.tooltip = 'BBjCPL compiler not found. Is BBj installed at bbj.home?';
context.subscriptions.push(bbjcplStatusBar);

// Show/hide on notification:
client.onNotification('bbj/bbjcplAvailability', ({ available }: { available: boolean }) => {
    if (available) {
        bbjcplStatusBar.hide();
    } else {
        bbjcplStatusBar.show();
    }
});
```

### Trailing-Edge Debounce (per-file, 500ms for saves)

```typescript
// Pattern: per-file debounce timer in BBjDocumentBuilder
private readonly saveDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
private readonly SAVE_DEBOUNCE_MS = 500;

private debouncedCompile(document: LangiumDocument, cancelToken: CancellationToken): void {
    const key = document.uri.fsPath;
    const existing = this.saveDebounceTimers.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
        this.saveDebounceTimers.delete(key);
        const cplService = (this.serviceRegistry.getServices(document.uri) as BBjServices).compiler.BBjCPLService;
        const cplDiags = await cplService.compile(key);
        if (cplDiags.length > 0) {
            document.diagnostics = mergeDiagnostics(document.diagnostics ?? [], cplDiags);
            // Note: cancelToken may be stale here — use CancellationToken.None for post-debounce
            await this.notifyDocumentPhase(document, DocumentState.Validated, CancellationToken.None);
        }
    }, this.SAVE_DEBOUNCE_MS);

    this.saveDebounceTimers.set(key, timer);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| External compiler as separate process | Compiler output merged into LSP diagnostics | Language server era | Unified Problems panel; no separate error window |
| Synchronous compiler invocation | Async + debounce (TypeScript model) | VS Code TypeScript LS circa 2016 | Non-blocking; UX feels responsive |
| Replace diagnostics on recompile | Merge diagnostics from multiple sources | Current practice | Multiple sources (Langium + BBjCPL) coexist in Problems panel |

**Deprecated/outdated:**
- Calling `onBuildPhase` for compiler integration: Documented as CPU rebuild loop risk in STATE.md. `buildDocuments()` override is the correct pattern.

## Open Questions

1. **CancellationToken for post-debounce compile**
   - What we know: `buildDocuments()` receives a `cancelToken`. After 500ms, the token may be stale (cancelled).
   - What's unclear: Is `CancellationToken.None` safe to use for the deferred BBjCPL compile?
   - Recommendation: Use `CancellationToken.None` for the deferred compile. The compilation is a background operation; cancellation of the original build doesn't mean the file stopped existing. BBjCPLService handles its own timeout internally.

2. **Should BBjCPL run for files not in the workspace (prefix/external files)?**
   - What we know: `BBjDocumentBuilder.shouldValidate()` returns `false` for external documents. The BBjCPL compile should follow the same filter.
   - Recommendation: Only compile files where `shouldValidate()` returns `true` — skip external/prefix files. Add `shouldCompileWithBbjcpl(document)` helper that checks `shouldValidate()` and `document.uri.fsPath` (must be a real path, not `bbjlib:///`).

3. **What happens to stale BBjCPL diagnostics when trigger mode switches to "off"?**
   - What we know: CONTEXT.md: "existing BBjCPL diagnostics stay visible until the next file event — they're not cleared immediately"
   - What's unclear: On the next save (with mode = "off"), `buildDocuments()` skips BBjCPL. The prior BBjCPL diagnostics remain in `document.diagnostics`. Should they be cleared on the next build?
   - Recommendation: On each `buildDocuments()` call when trigger is "off", clear BBjCPL diagnostics from `document.diagnostics` — this is the "next file event" that clears them. Simple, consistent behavior.

4. **Debounced mode: trigger on every `buildDocuments()` or only on explicit saves?**
   - What we know: `buildDocuments()` is called both on user save and on Langium's internal rebuilds (e.g., after imports are resolved via `addImportedBBjDocuments`). Running BBjCPL on every internal rebuild would be excessive.
   - Recommendation: Check `document.state` before compile — only run BBjCPL for documents that were in `Changed` state at the start of the build (i.e., the file was actually edited/saved). This can be tracked with a set of "changed URIs" passed to `buildDocuments()`. Alternative: use a flag set in the `onUpdate` listener that fires before builds.

## Sources

### Primary (HIGH confidence)

- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-cpl-service.ts` — Phase 52 BBjCPLService; confirmed API: `compile(filePath)`, `setTimeout(ms)`, `isCompiling(filePath)`, `cancel flag + proc.kill()` lifecycle
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-cpl-parser.ts` — current source label is `'BBj Compiler'` (must change to `'BBjCPL'` for CPL-05)
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-document-validator.ts` — `DiagnosticTier` enum with Phase 53 placeholders; `applyDiagnosticHierarchy()`; `getDiagnosticTier()` with Phase 53 comment
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-document-builder.ts` — existing `buildDocuments()` override with `super.buildDocuments()` + `addImportedBBjDocuments` + `revalidateUseFilePathDiagnostics`; `notifyDocumentPhase()` usage confirmed
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/node_modules/langium/src/workspace/document-builder.ts` — `DefaultDocumentBuilder.buildDocuments()`, `validate()` using `serviceRegistry.getServices()`, `notifyDocumentPhase()` internals; `addDiagnosticsHandler()` in `language-server.ts` confirms diagnostics are sent via `onDocumentPhase(Validated)` listener
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/node_modules/langium/src/lsp/language-server.ts` — `addDiagnosticsHandler()` confirms `document.diagnostics` is what gets sent to client
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/main.ts` — `onDidChangeConfiguration` pattern; `setSuppressCascading`/`setMaxErrors` module-level setter pattern; `connection.onRequest` custom request pattern
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/extension.ts` — existing `suppressionStatusBar` pattern; `initializationOptions` pattern; status bar show/hide with `onDidChangeDiagnostics`
- `/Users/beff/_workspace/bbj-language-server/.planning/STATE.md` — "CPU rebuild loop pitfall: BBjCPL must be invoked inside `buildDocuments()`, never from an `onBuildPhase` callback"; "BBjCPLService API for Phase 53" section
- `/Users/beff/_workspace/bbj-language-server/.planning/phases/53-bbjcpl-diagnostic-integration/53-CONTEXT.md` — all user decisions (locked)
- `/Users/beff/_workspace/bbj-language-server/.planning/REQUIREMENTS.md` — CPL-05 through CPL-08 definitions

### Secondary (MEDIUM confidence)

- `/Users/beff/_workspace/bbj-language-server/.planning/phases/52-bbjcpl-foundation/52-VERIFICATION.md` — confirmed source label is `'BBj Compiler'` in current tests; all Phase 52 requirements satisfied; service API confirmed
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-ws-manager.ts` — `onInitialize()` reading `initializationOptions` pattern for `suppressCascading`, `maxErrors`
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/package.json` — current settings list; confirms `bbj.compiler.trigger` does not yet exist; `bbj.diagnostics.suppressCascading` as model for new setting

### Tertiary (LOW confidence)

- Debounce timer behavior during cancelToken lifecycle: Not verified against Langium internals. Recommendation (use `CancellationToken.None` for post-debounce) is based on reasoning, not code inspection.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs confirmed by reading actual source files
- Architecture (buildDocuments override, serviceRegistry access): HIGH — confirmed patterns from existing code and Langium source
- Diagnostic merge logic: HIGH — pure function, logic derivable from CONTEXT.md rules
- Trigger mode / debounce: HIGH — pattern exists in BBjCPLService itself
- Status bar / LSP notification: HIGH — existing patterns in extension.ts and main.ts
- Pitfalls: HIGH — derived from code inspection and STATE.md documented warnings

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (project-internal implementation; Langium API stable within this version)
