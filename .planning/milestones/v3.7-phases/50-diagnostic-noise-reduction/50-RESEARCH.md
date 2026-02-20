# Phase 50: Diagnostic Noise Reduction - Research

**Researched:** 2026-02-19
**Domain:** Langium diagnostic pipeline — `DefaultDocumentValidator`, `LangiumDocument`, LSP `publishDiagnostics`
**Confidence:** HIGH — all findings verified against actual Langium source in node_modules and the live codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- When parse errors exist, suppress ALL linking errors — no partial/heuristic filtering
- Semantic errors at Error severity survive alongside parse errors — only linking errors are suppressed
- All warnings and hints from any source are suppressed when any Error-severity diagnostic exists
- Cross-file suppression scope: Claude's discretion based on how Langium cross-file validation works
- Suppression is configurable via a setting (e.g., `bbj.diagnostics.suppressCascading`) — default ON
- Any diagnostic at Error severity (parse OR semantic) triggers warning/hint suppression — not just parse errors
- All warnings and hints from ALL sources (parser, validation, lint) are hidden when errors exist
- Parse errors should appear first/prioritized in the Problems panel, then semantic errors
- Design the hierarchy to be extensible — Phase 53 will add BBjCPL as a higher-priority error source (BBjCPL > parse > semantic > warnings)
- Any single parse error triggers full linking suppression — no threshold
- Cap displayed parse errors at a configurable maximum — default 20
- Add a configurable setting for the error cap (e.g., `bbj.diagnostics.maxErrors`)
- Suppressed diagnostics reappear immediately on keystroke when parse becomes clean — debounced to avoid high CPU
- Incremental reappearance is fine — diagnostics appear as each validation phase completes
- Show a status bar hint when diagnostics are being suppressed — exact format at Claude's discretion

### Claude's Discretion

- Cross-file suppression behavior (whether importing a broken file suppresses linking in the importer)
- Status bar hint format (count-based vs simple label)
- Debounce timing for recovery re-scan
- Exact setting names and defaults

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DIAG-01 | Suppress cascading linking/validation errors when parser errors exist — only show the actual syntax errors, not downstream noise | `BBjDocumentValidator.validateDocument()` is the correct override point; `document.parseResult.parserErrors.length` detects parse errors; `DocumentValidator.LinkingError` code identifies linking errors |
| DIAG-02 | Show warnings/hints only when no hard errors present from any source — clean diagnostic hierarchy across all error levels | `DiagnosticSeverity.Error` (value `1`) identifies hard errors; post-process the full diagnostic list before returning from `validateDocument()` to filter warnings (severity 2) and hints (severity 4) |
</phase_requirements>

---

## Summary

The diagnostic pipeline in this codebase runs entirely through `BBjDocumentValidator`, which already extends Langium's `DefaultDocumentValidator`. The `validateDocument()` method builds a flat `Diagnostic[]` array by calling `processParsingErrors`, `processLinkingErrors`, and `validateAst` in sequence, then returns it. Langium's `DefaultDocumentBuilder.validate()` stores the returned array in `document.diagnostics`, which is immediately sent to the VS Code client via `connection.sendDiagnostics()` in the `addDiagnosticsHandler` LSP hook. This means **all suppression must happen inside `validateDocument()` before returning**, and the shape of the existing `BBjDocumentValidator` override makes this straightforward.

The suppression logic reduces to two independent post-processing passes applied to the collected `Diagnostic[]` before the method returns: (1) if parse errors exist, remove all diagnostics whose `data.code === DocumentValidator.LinkingError`; (2) if any `DiagnosticSeverity.Error` (value `1`) diagnostic remains, remove all diagnostics with severity `> 1` (warning=2, info=3, hint=4). Parse errors are identified reliably via `document.parseResult.parserErrors.length` or by `data.code === DocumentValidator.ParsingError`. The existing `BBjDocumentValidator` already has precedent for this kind of post-processing (it filters `revalidateUseFilePathDiagnostics` in the builder and downgrades linking errors to warnings in `toDiagnostic()`).

The extensible hierarchy required by the phase (BBjCPL > parse > semantic > warnings, Phase 53 will add BBjCPL) maps naturally to a **priority model**: each tier has a numeric priority, and only the highest-priority tier's errors are shown, with lower-priority tiers suppressed. The initial implementation only uses two tiers (parse errors and semantic errors), but the data structure should be designed to accept a third tier (BBjCPL) in Phase 53 without changing the suppression logic.

**Primary recommendation:** Implement suppression in `BBjDocumentValidator.validateDocument()` as a post-processing filter on the collected `Diagnostic[]`. Model the hierarchy as a priority enum/map for extensibility. Wire the on/off flag and maxErrors cap through the existing `onDidChangeConfiguration` + `initializationOptions` pattern already used by `bbj.typeResolution.warnings`.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `langium` | (existing in project) | `DefaultDocumentValidator`, `DocumentValidator`, `LangiumDocument`, `ParseResult` | Already in use; `BBjDocumentValidator` directly extends it |
| `vscode-languageserver` | (existing) | `Diagnostic`, `DiagnosticSeverity` | Already imported in `bbj-document-validator.ts` |
| `vscode` | (existing) | `StatusBarItem`, `StatusBarAlignment`, `workspace.getConfiguration` | Already used throughout `extension.ts` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None — no new packages needed | — | — | All required APIs already present |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Post-processing in `validateDocument()` | Override `DefaultDocumentBuilder.validate()` to strip diagnostics after storing | Validator override is cleaner — keeps suppression co-located with diagnostic creation. Builder override would add a second mutation pass on `document.diagnostics` after the fact and is harder to test |
| Module-level flag variable (current pattern for `typeResolutionWarningsEnabled`) | Service-injected config object | Module-level flag is what the codebase uses; safe for single-server-instance use. Phase 50 should follow the same pattern for consistency |

**Installation:** No new packages required.

---

## Architecture Patterns

### Recommended Project Structure

No new files are strictly required. Changes touch:

```
bbj-vscode/src/
├── language/
│   ├── bbj-document-validator.ts    # Primary: add validateDocument() override with suppression
│   ├── bbj-ws-manager.ts            # Add: read diagnostics settings from initializationOptions
│   ├── main.ts                      # Add: apply diagnostics settings on onDidChangeConfiguration
│   └── bbj-diagnostic-suppressor.ts # Optional: extract hierarchy logic if complex enough
├── extension.ts                     # Add: status bar item, pass new settings in initializationOptions
package.json                         # Add: two new settings bbj.diagnostics.suppressCascading, bbj.diagnostics.maxErrors
```

Recommendation: Keep the hierarchy logic inline in `BBjDocumentValidator` unless it exceeds ~50 lines; then extract to `bbj-diagnostic-suppressor.ts` for testability.

### Pattern 1: validateDocument() override for suppression

**What:** Override `validateDocument()` in `BBjDocumentValidator` to apply suppression rules to the collected `Diagnostic[]` before returning.

**When to use:** The validator already overrides `processLinkingErrors` and `toDiagnostic`. This is the established extension point.

**Example:**

```typescript
// In BBjDocumentValidator (bbj-document-validator.ts)

// Module-level flags (follow existing typeResolutionWarningsEnabled pattern)
let suppressCascadingEnabled = true;
let maxErrorsDisplayed = 20;

export function setSuppressCascading(enabled: boolean): void {
    suppressCascadingEnabled = enabled;
}
export function setMaxErrors(max: number): void {
    maxErrorsDisplayed = max;
}

export class BBjDocumentValidator extends DefaultDocumentValidator {

    override async validateDocument(
        document: LangiumDocument,
        options?: ValidationOptions,
        cancelToken?: CancellationToken
    ): Promise<Diagnostic[]> {
        const diagnostics = await super.validateDocument(document, options, cancelToken);
        return applyDiagnosticHierarchy(diagnostics, suppressCascadingEnabled, maxErrorsDisplayed);
    }

    // ... existing overrides unchanged
}

/**
 * Apply the BBj diagnostic hierarchy rules:
 *  Priority 0 (lowest shown): warnings / hints
 *  Priority 1: semantic errors
 *  Priority 2: parse errors (suppresses linking)
 *  Priority 3 (Phase 53): BBjCPL errors (suppresses everything)
 *
 * Rules:
 *  - Parse errors present → suppress ALL linking errors
 *  - Any Error-severity diagnostic present → suppress all warnings/hints
 *  - Cap total parse errors at maxErrors
 */
function applyDiagnosticHierarchy(
    diagnostics: Diagnostic[],
    suppressEnabled: boolean,
    maxErrors: number
): Diagnostic[] {
    if (!suppressEnabled) return diagnostics;

    const hasParseErrors = diagnostics.some(
        d => d.data?.code === DocumentValidator.ParsingError
    );
    const hasAnyError = diagnostics.some(
        d => d.severity === DiagnosticSeverity.Error
    );

    let result = diagnostics;

    // Rule 1: parse errors → suppress all linking errors
    if (hasParseErrors) {
        result = result.filter(
            d => d.data?.code !== DocumentValidator.LinkingError
        );
    }

    // Rule 2: any Error → suppress warnings/hints from all sources
    if (hasAnyError) {
        result = result.filter(
            d => d.severity === DiagnosticSeverity.Error
        );
    }

    // Rule 3: cap parse errors (preserve non-parse errors first, then fill up to cap)
    const parseErrors = result.filter(d => d.data?.code === DocumentValidator.ParsingError);
    const nonParseErrors = result.filter(d => d.data?.code !== DocumentValidator.ParsingError);

    if (parseErrors.length > maxErrors) {
        result = [...parseErrors.slice(0, maxErrors), ...nonParseErrors];
    }

    return result;
}
```

**Source:** Verified against `/bbj-vscode/src/language/bbj-document-validator.ts` and `/bbj-vscode/node_modules/langium/lib/validation/document-validator.js`.

### Pattern 2: Extensible Priority Model (for Phase 53 BBjCPL tier)

**What:** Design the hierarchy to accept a third tier without surgery on the suppression logic.

**When to use:** Required by user constraint — Phase 53 adds BBjCPL as `Priority 3`.

**Example:**

```typescript
// Diagnostic source tiers — extensible for Phase 53
const enum DiagnosticTier {
    Warning  = 0,   // warnings/hints — suppressed when any error present
    Semantic = 1,   // semantic/validation errors
    Parse    = 2,   // parser errors — suppress linking errors
    BBjCPL   = 3,   // Phase 53: suppress everything below this tier
}

function getDiagnosticTier(d: Diagnostic): DiagnosticTier {
    if (d.data?.code === DocumentValidator.ParsingError) return DiagnosticTier.Parse;
    if (d.severity === DiagnosticSeverity.Error) return DiagnosticTier.Semantic;
    return DiagnosticTier.Warning;
    // Phase 53 adds: if (d.source === 'bbj-cpl') return DiagnosticTier.BBjCPL;
}
```

This means Phase 53 only needs to: (a) add `BBjCPL = 3` to the enum, (b) add a `source` check in `getDiagnosticTier()`, and (c) add the BBjCPL-specific suppression rule to `applyDiagnosticHierarchy()`.

### Pattern 3: Settings wiring (follow existing typeResolutionWarnings pattern exactly)

**What:** Wire new settings from VS Code config → `initializationOptions` → `onInitialize` in `BBjWorkspaceManager` → `onDidChangeConfiguration` in `main.ts`.

**When to use:** This is the established pattern for all language-server-side settings. Do not deviate.

**Steps:**
1. Add to `package.json` `contributes.configuration`:
```json
"bbj.diagnostics.suppressCascading": {
  "type": "boolean",
  "default": true,
  "description": "Suppress linking/validation noise when parse errors exist.",
  "scope": "window"
},
"bbj.diagnostics.maxErrors": {
  "type": "number",
  "default": 20,
  "description": "Maximum number of parse errors displayed at once.",
  "scope": "window"
}
```

2. Add to `initializationOptions` in `extension.ts` (in `startLanguageClient()`):
```typescript
suppressCascading: vscode.workspace.getConfiguration("bbj").get("diagnostics.suppressCascading", true),
maxErrors: vscode.workspace.getConfiguration("bbj").get("diagnostics.maxErrors", 20),
```

3. Read in `BBjWorkspaceManager.onInitialize`:
```typescript
setSuppressCascading(params.initializationOptions.suppressCascading ?? true);
setMaxErrors(params.initializationOptions.maxErrors ?? 20);
```

4. Apply in `main.ts` `onDidChangeConfiguration`:
```typescript
if (config.diagnostics?.suppressCascading !== undefined) {
    setSuppressCascading(config.diagnostics.suppressCascading);
}
if (config.diagnostics?.maxErrors !== undefined) {
    setMaxErrors(config.diagnostics.maxErrors);
}
```

**Source:** Verified against `bbj-ws-manager.ts` lines 59-64, `main.ts` lines 93-95, `extension.ts` lines 686-690.

### Pattern 4: Status bar hint when suppression is active

**What:** Show a status bar item in VS Code when diagnostics are actively being suppressed.

**When to use:** Required by user decision. The status bar is managed by the extension (client side), not the language server.

**How:** The extension needs to observe document diagnostics to detect whether suppression is active. The cleanest approach is:
- Register a `vscode.languages.onDidChangeDiagnostics` listener in `extension.ts`
- Check if the active document has parse errors (meaning suppression may be active)
- Show/hide a `StatusBarItem` accordingly

```typescript
// In extension.ts activate():
const suppressionStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left, 100
);
suppressionStatusBar.text = '$(warning) Diagnostics suppressed';
suppressionStatusBar.tooltip = 'Parse errors detected — linking/validation noise hidden. Fix parse errors to see full diagnostics.';
context.subscriptions.push(suppressionStatusBar);

context.subscriptions.push(
    vscode.languages.onDidChangeDiagnostics(e => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            suppressionStatusBar.hide();
            return;
        }
        const diags = vscode.languages.getDiagnostics(editor.document.uri);
        const hasParseError = diags.some(
            d => d.source === 'bbj' && d.severity === vscode.DiagnosticSeverity.Error
                 // Parse errors from Langium come through as errors without a code or with data.code==='parsing-error'
                 // The extension can't easily distinguish parse vs semantic, so use count heuristic:
                 // if errors exist AND link errors are absent, suppression is likely active
        );
        hasParseError ? suppressionStatusBar.show() : suppressionStatusBar.hide();
    })
);
```

**Important caveat (see Open Questions):** The extension-side status bar cannot reliably distinguish "parse error causing suppression" from "semantic error without linked noise" using only the public `vscode.languages.getDiagnostics` API. Recommend using a simpler heuristic: show status bar when any Error-severity diagnostic is present in the active document. Alternatively, have the language server send a custom LSP notification when suppression is active. The custom notification approach is more accurate but more complex.

**Recommendation:** Use the simple heuristic (show when any error exists) for Phase 50. Phase 53 can refine if needed.

### Anti-Patterns to Avoid

- **Suppressing in `document.diagnostics` after the fact:** The `revalidateUseFilePathDiagnostics` method in `BBjDocumentBuilder` does this correctly (it calls `notifyDocumentPhase` to re-push), but suppression in `validateDocument()` is simpler and runs in the main validation path.
- **Using `stopAfterParsingErrors: true` in `ValidationOptions`:** Langium has a built-in `stopAfterParsingErrors` flag, but it stops ALL further validation — including semantic checks that should survive parse errors. Do not use this flag. The phase requires that semantic errors (at Error severity) still appear alongside parse errors.
- **Filtering by error message text:** Linking errors are reliably identified by `d.data?.code === DocumentValidator.LinkingError`. Don't match on message strings — they are human-readable and may change.
- **Cross-file suppression via document.references scan:** If File A has a parse error and File B imports File A, File B will naturally get linking errors because the index for File A is incomplete. These will be suppressed by the standard linking suppression rule (linking errors in File B are suppressed when File B itself has parse errors OR when the feature is applied globally). See Open Questions for cross-file scope decision.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Detecting parse errors | Custom CST traversal | `document.parseResult.parserErrors.length > 0` | Direct API access, already used in `bbj-validator.ts:263` and `bbj-scope-local.ts:67` |
| Detecting linking errors | String matching on messages | `d.data?.code === DocumentValidator.LinkingError` | Stable code, already used in `linking.test.ts:22` |
| Detecting diagnostic severity | Severity enumeration | `DiagnosticSeverity.Error` (= 1), `.Warning` (= 2), `.Hint` (= 4) | Standard LSP values, already imported in `bbj-document-validator.ts:4` |
| Settings wiring | Custom IPC channel | Follow `typeResolutionWarnings` pattern: `initializationOptions` + `onDidChangeConfiguration` | Established pattern, zero new infrastructure |

**Key insight:** All the APIs needed already exist and are already imported. This phase is pure logic/orchestration, not infrastructure.

---

## Common Pitfalls

### Pitfall 1: Suppressing warnings that are not linked to parse errors

**What goes wrong:** The user decision is to suppress ALL warnings/hints when ANY Error-severity diagnostic exists (not just when parse errors exist). If you only suppress warnings when parse errors exist, you'll miss the case where a semantic Error without parse errors still produces noisy warnings from other checks.

**Why it happens:** Reading DIAG-02 too narrowly ("only suppress when parse errors present") when the actual rule is "suppress warnings when ANY error present."

**How to avoid:** Two separate suppression passes: (1) parse errors → suppress linking errors, (2) any error → suppress warnings. Apply both unconditionally in sequence.

**Warning signs:** Tests pass for parse-error case but warnings still appear when a semantic error is the only error.

### Pitfall 2: Forgetting that BBjDocumentValidator.toDiagnostic() downgrades linking errors to Warning

**What goes wrong:** After this phase, the suppression logic will filter all `DiagnosticSeverity.Warning` diagnostics when an error exists. But linking errors are already downgraded to `Warning` by the existing `toDiagnostic()` override (lines 93-97 of `bbj-document-validator.ts`). This means linking errors would be suppressed by Rule 2 (warning suppression) even without Rule 1 (linking-specific suppression).

**Why it matters:** Rule 1 (suppress linking errors when parse errors exist) is still needed as a precise, semantics-preserving rule. If you rely on Rule 2 alone to remove linking errors, then linking errors will also be suppressed when only a semantic error (not a parse error) is present — which is wrong per the user decision ("only linking errors are suppressed" when parse errors exist, not when semantic errors exist).

**How to avoid:** Keep both rules, in order. Rule 1 runs first and explicitly removes linking errors when parse errors exist. Rule 2 then suppresses remaining warnings/hints when any error remains.

**Warning signs:** In a file with only semantic errors (no parse errors), linking errors disappear — they should remain visible.

### Pitfall 3: Cross-file linking noise from imported broken files

**What goes wrong:** File A has parse errors. File B does `use ::A`. File B gets linking errors because A's symbols are not in the index. If suppression only applies to the file with parse errors, File B still shows 40+ linking errors.

**Why it happens:** The suppression logic looks at `document.parseResult.parserErrors` for the current document, not for imported documents.

**Recommendation (Claude's discretion):** Apply suppression per-file: each file's diagnostics are filtered based on that file's own state. File B has no parse errors, so its linking errors survive. This is correct behavior — File B's linking errors are real (they exist because A is broken), but A's parse error is the root cause. The user should fix A first. Showing B's linking errors is acceptable because they are accurate. If this proves too noisy in practice, Phase 53's BBjCPL integration will further reduce noise. Do NOT suppress cross-file diagnostics in Phase 50.

**Warning signs:** Implementing cross-file suppression by scanning all imported documents' parse errors would require indexManager lookups, adds complexity, and is out of scope per the phase boundary.

### Pitfall 4: Debounce interferes with incremental reappearance

**What goes wrong:** The user decision says "suppressed diagnostics reappear immediately on keystroke when parse becomes clean — debounced to avoid high CPU." Debounce is for the re-scan trigger, not for the reappearance itself. If you debounce the diagnostic push, diagnostics will feel laggy.

**How to avoid:** The debounce should apply to triggering a new build/validation cycle after a change, not to the diagnostic push. Langium's `DefaultDocumentBuilder` already has its own built-in incremental update mechanism. In practice, suppression reappears naturally as Langium re-runs validation when the document changes — no special debounce logic needs to be implemented in Phase 50. The built-in Langium update cycle handles this.

**Warning signs:** Adding a custom `setTimeout` inside `validateDocument()` — don't do this. The method must return promptly.

### Pitfall 5: Parse error cap incorrectly counting non-parse-error diagnostics

**What goes wrong:** The `maxErrors` cap should only limit the number of displayed parse errors, not the total number of diagnostics. After Rule 2 (warning suppression), the remaining diagnostics are only Error-severity. The cap should apply only to parse errors specifically, preserving all semantic errors.

**How to avoid:** Separate parse errors from semantic errors before applying the cap. Semantic errors are never capped.

---

## Code Examples

Verified patterns from actual codebase:

### Detecting parse errors (currently used in bbj-validator.ts and bbj-scope-local.ts)

```typescript
// Source: /bbj-vscode/src/language/bbj-validator.ts:263
// Source: /bbj-vscode/src/language/bbj-scope-local.ts:67
if (document.parseResult.parserErrors.length > 0) {
    return; // skip this check when the document has parse errors
}
```

### Detecting linking errors by code (currently used in linking.test.ts)

```typescript
// Source: /bbj-vscode/test/linking.test.ts:22
const linkingErrors = document.diagnostics?.filter(
    err => err.data?.code === DocumentValidator.LinkingError
) ?? [];
```

### Current BBjDocumentValidator.validateDocument flow (what we override)

```typescript
// Source: /bbj-vscode/node_modules/langium/lib/validation/document-validator.js:23-53
// (DefaultDocumentValidator.validateDocument — what super.validateDocument calls)
async validateDocument(document, options = {}, cancelToken = CancellationToken.None) {
    const parseResult = document.parseResult;
    const diagnostics = [];
    this.processLexingErrors(parseResult, diagnostics, options);  // adds lexing errors
    this.processParsingErrors(parseResult, diagnostics, options); // adds parse errors
    this.processLinkingErrors(document, diagnostics, options);    // BBjDocumentValidator overrides this
    diagnostics.push(...await this.validateAst(parseResult.value, options, cancelToken)); // custom validators
    return diagnostics;
}
// BBjDocumentValidator overrides processLinkingErrors and toDiagnostic.
// Phase 50 adds an override of validateDocument() itself.
```

### Current linking error downgrade in BBjDocumentValidator (important interaction)

```typescript
// Source: /bbj-vscode/src/language/bbj-document-validator.ts:90-113
protected override toDiagnostic<N extends AstNode>(severity, message, info): Diagnostic {
    if ((info.data as DiagnosticData)?.code === DocumentValidator.LinkingError) {
        // Non-cyclic linking errors are already downgraded to Warning
        diagnosticSeverity = message.includes('Cyclic reference')
            ? DiagnosticSeverity.Error
            : DiagnosticSeverity.Warning;
    }
    // ...
}
// Consequence for Phase 50: linking errors arrive as DiagnosticSeverity.Warning in the list.
// Rule 1 must match on data.code, not on severity, to specifically target linking errors.
```

### Module-level flag pattern (follow for new settings)

```typescript
// Source: /bbj-vscode/src/language/bbj-validator.ts:22-26
let typeResolutionWarningsEnabled = true;

export function setTypeResolutionWarnings(enabled: boolean): void {
    typeResolutionWarningsEnabled = enabled;
}
```

### Settings propagation pattern (for initializationOptions)

```typescript
// Source: /bbj-vscode/src/language/bbj-ws-manager.ts:59-64
const typeResWarnings = params.initializationOptions.typeResolutionWarnings;
if (typeResWarnings === false) {
    setTypeResolutionWarnings(false);
} else {
    setTypeResolutionWarnings(true);
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No suppression — all diagnostics always shown | Phase 50 implements suppression | This phase | Users see 1-3 diagnostics on parse error instead of 40+ |
| Flat list of diagnostics from `DefaultDocumentValidator` | Hierarchical priority model | This phase | Phase 53 can add BBjCPL tier with minimal surgery |
| `typeResolutionWarningsEnabled` module flag | New flags: `suppressCascadingEnabled`, `maxErrorsDisplayed` | This phase | Same pattern, more control |

**Deprecated/outdated:**
- Nothing is removed — new behavior is additive and configurable (on by default, can be disabled via `bbj.diagnostics.suppressCascading: false`)

---

## Open Questions

1. **Cross-file suppression scope (Claude's discretion)**
   - What we know: If File B imports broken File A, File B will get linking errors. Per-file suppression means File B's linking errors are not suppressed.
   - What's unclear: Whether this is acceptable UX in practice, or whether users will find it confusing that fixing A clears B's errors.
   - Recommendation: Use **per-file suppression only** (suppress each document's diagnostics based on that document's own parse state). This is simpler, correct, and consistent with how VS Code's Problems panel works. Cross-file suppression would require scanning imported documents and is more likely to have edge cases. Document the behavior for users.

2. **Status bar implementation: heuristic vs custom LSP notification**
   - What we know: `vscode.languages.getDiagnostics()` does not expose `data.code`, only severity. The extension cannot distinguish parse errors from semantic errors using public APIs.
   - What's unclear: Whether it's worth implementing a custom `bbj/diagnosticsSuppressed` LSP notification to accurately reflect server-side suppression state.
   - Recommendation: Use **heuristic for Phase 50**: show the status bar item when the active document has any Error-severity diagnostic. This is not perfectly accurate (it will show even when suppression is off) but is zero-infrastructure and Good Enough. If Phase 53 needs accurate suppression state, implement the custom notification then.

3. **Debounce timing**
   - What we know: The user wants "debounced to avoid high CPU" on recovery re-scan.
   - What's unclear: Whether any explicit debounce is needed, since Langium's `DefaultDocumentBuilder` already handles incremental builds with its own update batching.
   - Recommendation: No explicit debounce needed in Phase 50. Langium's existing incremental update mechanism handles this. The built-in behavior is: on each keystroke, Langium schedules a rebuild of the changed document. When the parse error is fixed, the next rebuild will produce clean diagnostics. This is already debounced by Langium. If users report high CPU after Phase 50 ships, profile before adding custom debounce.

---

## Sources

### Primary (HIGH confidence)

- `/bbj-vscode/node_modules/langium/lib/validation/document-validator.js` — `validateDocument()` source, `DocumentValidator` codes
- `/bbj-vscode/node_modules/langium/lib/validation/document-validator.d.ts` — `ValidationOptions`, `DefaultDocumentValidator` API surface
- `/bbj-vscode/node_modules/langium/lib/workspace/document-builder.d.ts` — `DefaultDocumentBuilder.validate()` signature and behavior
- `/bbj-vscode/node_modules/langium/lib/workspace/document-builder.js:445-455` — how `validate()` stores `document.diagnostics`
- `/bbj-vscode/node_modules/langium/lib/lsp/language-server.js:278-285` — `addDiagnosticsHandler` — how diagnostics reach the client
- `/bbj-vscode/src/language/bbj-document-validator.ts` — current `BBjDocumentValidator` with `processLinkingErrors` and `toDiagnostic` overrides
- `/bbj-vscode/src/language/bbj-validator.ts:22-26` — module-level flag pattern for settings
- `/bbj-vscode/src/language/bbj-ws-manager.ts:59-64` — `initializationOptions` settings propagation
- `/bbj-vscode/src/language/main.ts:75-147` — `onDidChangeConfiguration` pattern
- `/bbj-vscode/src/extension.ts:683-690` — `initializationOptions` construction
- `/bbj-vscode/package.json:464-490` — existing `bbj.typeResolution.warnings` and `bbj.interop.*` settings schema
- `/bbj-vscode/test/linking.test.ts:21-28` — `DocumentValidator.LinkingError` code usage in tests

### Secondary (MEDIUM confidence)

- `/bbj-vscode/src/language/validations/line-break-validation.ts:58` and `/bbj-vscode/src/language/bbj-scope-local.ts:67` — existing `parserErrors.length > 0` check patterns in the codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs verified in node_modules source and existing usage
- Architecture: HIGH — override point verified, flow traced end-to-end from `validateDocument()` → `document.diagnostics` → `sendDiagnostics()`
- Pitfalls: HIGH — derived from direct code reading of the existing linking downgrade logic and its interaction with new suppression rules
- Settings wiring: HIGH — pattern verified from existing `typeResolutionWarnings` implementation

**Research date:** 2026-02-19
**Valid until:** 2026-03-21 (stable infrastructure — Langium API won't change)
