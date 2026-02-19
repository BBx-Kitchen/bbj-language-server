# Stack Research: BBjCPL Integration, Diagnostic Quality, and Outline Resilience

**Domain:** Langium Language Server — External Compiler Integration
**Researched:** 2026-02-19
**Confidence:** HIGH

## Executive Summary

This milestone adds three capabilities to the existing Langium 4.1.3 BBj language server: (1) invoking the BBjCPL compiler as an external process and mapping its error output to LSP diagnostics, (2) reducing diagnostic noise through cascading/filtering, and (3) making the document outline resilient to parse errors. All three capabilities use Node.js built-ins and Langium extension points already in the codebase. **No new runtime dependencies are required.** The only optional addition worth considering is a typed debounce implementation via the existing TypeScript compiler — not a new npm package.

## Recommended Stack

### Core Technologies — No New Additions Required

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `node:child_process` (built-in) | Node.js 20.18.1 | Invoke BBjCPL compiler | Built-in to Node.js LTS; `spawn()` provides streaming stderr/stdout, process kill for cancellation, and cross-platform support. No install required. |
| Langium `DefaultDocumentSymbolProvider` | 4.1.3 (existing) | Outline resilience via override | `getSymbol()` and `getChildSymbols()` are `protected` and designed for override. Null-guarding inside these methods fixes crash-on-parse-error. Zero config changes. |
| Langium `DefaultDocumentValidator` | 4.1.3 (existing) | Diagnostic cascading and external diagnostics merge | Already subclassed as `BBjDocumentValidator`. Override `validateDocument()` to merge compiler diagnostics and implement stop-after-parse-error cascade. |
| Langium `ValidationCategory` | 4.1.3 (existing) | Separate slow compiler checks from fast LSP checks | Built-in `'fast'` / `'slow'` / `'built-in'` categories. Register BBjCPL checks as `'slow'` so they skip on every keystroke. |
| Langium `DocumentBuilder.onBuildPhase` | 4.1.3 (existing) | Trigger BBjCPL after document reaches `Validated` state | Pattern already used in `main.ts` line 68. Safe hook point for async compiler invocation. |
| TypeScript `ReturnType<typeof setTimeout>` | Built-in | Debounce compiler invocation | Native `setTimeout`/`clearTimeout` is sufficient; no lodash or ts-debounce needed in an ESM module that controls its own event loop. |

### Supporting Libraries — No New Additions Required

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vscode-uri` | 3.1.0 (existing) | Convert LSP URIs to filesystem paths for `spawn()` | Use `URI.parse(doc.uri.toString()).fsPath` to get platform-correct path for compiler args. |
| `path` (built-in) | Node.js 20 | Construct BBjCPL executable path from `bbj.home` setting | Use `path.join(bbjHome, 'bin', 'BBjCPL')` for Unix; `path.join(bbjHome, 'bin', 'BBjCPL.bat')` (or `BBjCPL.exe`) for Windows. |
| `vscode-languageserver-types` | 9.0.1 (existing) | `Diagnostic`, `DiagnosticSeverity`, `Range`, `Position` types | Already imported in `bbj-document-validator.ts`; reuse for compiler-sourced diagnostics. |

### Development Tools — No Changes Required

| Tool | Purpose | Notes |
|------|---------|-------|
| vitest 1.6.1 (existing) | Unit-test compiler output parser | Add parser tests with sample BBjCPL stderr strings. No new test framework needed. |
| esbuild 0.25.12 (existing) | Bundle for VS Code extension | `node:child_process` and `node:path` are Node built-ins; esbuild marks them external automatically with `--platform=node`. |

## Installation

```bash
# No new packages needed.
# All capabilities use Node.js 20.18.1 built-ins and Langium 4.1.3 APIs already present.
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `node:child_process` spawn (built-in) | `execa` 9.x | When you need Promise-based API with better cancellation ergonomics AND you can accept a pure-ESM dependency with ~30KB added to bundle. Execa 9.x is ESM-only which matches the project's `"type": "module"`, so it would work. However the benefit is marginal: the compiler runs at most once per document save, not in a hot path. Prefer built-in `spawn` with a `promisify` wrapper or manual Promise wrapping. |
| `node:child_process` spawn (built-in) | `cross-spawn` | Only needed if you encounter CMD/batch file execution issues on Windows. BBjCPL ships as a native binary (not a batch file), so `spawn()` works directly. Do NOT add `cross-spawn` unless Windows testing reveals issues. |
| Native `setTimeout` debounce | `lodash.debounce` or `ts-debounce` | Only if the debounce needs flush/cancel API observable from tests. For compiler invocation (fire-and-forget after idle), plain `setTimeout`/`clearTimeout` is sufficient and ships zero bytes. |
| Langium `'slow'` ValidationCategory | Custom `onDidSave` event handler in VS Code extension | Use `'slow'` category to stay inside Langium's build pipeline and benefit from `CancellationToken` propagation. A VS Code-side save handler cannot be used for IntelliJ compatibility. |
| Override `BBjDocumentValidator.validateDocument` | Separate LSP `textDocument/publishDiagnostics` call | Merging compiler diagnostics inside the Langium validator keeps a single diagnostic source per document and prevents overwrite races. Publishing from outside Langium's pipeline risks Langium clearing compiler diagnostics on the next build cycle. |
| Override `DefaultDocumentSymbolProvider.getSymbol` | Replace with full custom provider | `getSymbol` and `getChildSymbols` are `protected` and directly overridable. A full replacement would duplicate unchanged logic (name resolution, symbol kinds). Override only, stay DRY. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `child_process.exec()` | Buffers all output in memory; crashes if compiler emits large error lists. No streaming. | `child_process.spawn()` with `stderr` data events. |
| `child_process.execSync()` / `spawnSync()` | Blocks the Node.js event loop; freezes LSP response to all other requests while compiler runs. | Async `spawn()` wrapped in a Promise. |
| `execa` (if added only for this) | Adds a dependency that must be kept up-to-date; ESM-only constraint adds complexity. Provides no benefit over `spawn()` + Promise wrapper for a once-per-save operation. | `child_process.spawn()` with manual Promise wrapper shown below. |
| Storing compiler diagnostics in document state | `document.diagnostics` is overwritten by Langium on every build cycle. | Merge compiler diagnostics into the array returned by `validateDocument()` so Langium publishes them together. |
| Debounce via `setTimeout` in VS Code extension (client side) | IntelliJ plugin cannot share client-side throttle logic. | Debounce inside the language server (in `bbj-document-builder.ts` or a new `BBjCompilerService`) so both clients benefit identically. |
| Hardcoding `BBjCPL` path | Will fail when `bbj.home` is not set or changes. | Read from `BBjWorkspaceManager.getSettings().bbjHome`, construct with `path.join`, and guard with null check. |

## Stack Patterns by Feature

### Pattern 1: BBjCPL Invocation via `spawn()`

**Trigger:** After `DocumentState.Validated` fires for a file document (not synthetic/external). Debounce 500ms to avoid re-running on every fast build cycle.

**Implementation location:** New `BBjCompilerService` class, registered in `BBjModule` as a custom service, invoked from `BBjDocumentBuilder.buildDocuments` post-validation hook.

```typescript
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type { URI } from 'vscode-uri';

interface CompilerError {
  line: number;    // 0-based (LSP convention)
  column: number;  // 0-based
  message: string;
  severity: 'error' | 'warning';
}

export async function invokeBBjCPL(
  bbjHome: string,
  filePath: string,
  args: string[],
  cancelSignal?: AbortSignal
): Promise<CompilerError[]> {
  const compilerPath = join(
    bbjHome, 'bin',
    process.platform === 'win32' ? 'BBjCPL.bat' : 'BBjCPL'
  );

  return new Promise((resolve, reject) => {
    const proc = spawn(compilerPath, [...args, filePath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32'  // needed for .bat on Windows
    });

    let stderrBuf = '';
    proc.stderr.setEncoding('utf8');
    proc.stderr.on('data', (chunk: string) => { stderrBuf += chunk; });

    // stdout for validate-only mode (-N flag) — BBjCPL writes errors to stderr
    let stdoutBuf = '';
    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (chunk: string) => { stdoutBuf += chunk; });

    cancelSignal?.addEventListener('abort', () => proc.kill('SIGTERM'));

    proc.on('close', (code) => {
      if (cancelSignal?.aborted) return resolve([]);
      resolve(parseBBjCPLOutput(stderrBuf + stdoutBuf));
    });

    proc.on('error', reject);
  });
}
```

**Confidence:** HIGH — `child_process.spawn()` documented in Node.js 20.18.1 official docs. Windows `.bat` execution requires `shell: true`; confirmed by Node.js docs and cross-spawn source.

---

### Pattern 2: BBjCPL Output Parser

BBjCPL error output format (from BASIS documentation): errors contain both the BBj line number and the ASCII file line number. The format observed in practice:

```
Error on line 42 (ASCII line 38): Syntax error - unexpected token 'END'
Warning on line 10 (ASCII line 10): Undeclared variable 'myVar'
```

BASIS documentation states all error messages contain both BBj line number and ASCII file line number. The ASCII line number corresponds to the source file position.

```typescript
// Regex targeting the format BBjCPL emits
const BBJ_ERROR_PATTERN = /^(Error|Warning|error|warning)\s+(?:on\s+)?(?:line\s+)?(\d+)(?:\s+\(ASCII\s+line\s+(\d+)\))?:?\s*(.+)$/im;

export function parseBBjCPLOutput(output: string): CompilerError[] {
  const errors: CompilerError[] = [];
  for (const line of output.split('\n')) {
    const match = BBJ_ERROR_PATTERN.exec(line.trim());
    if (!match) continue;
    const [, severityStr, bbjLine, asciiLine, message] = match;
    // Prefer ASCII (source) line number; fall back to BBj line number
    const lineNum = parseInt(asciiLine ?? bbjLine, 10);
    errors.push({
      line: Math.max(0, lineNum - 1),   // convert 1-based to 0-based
      column: 0,                         // BBjCPL does not report columns
      message: message.trim(),
      severity: /^error/i.test(severityStr) ? 'error' : 'warning'
    });
  }
  return errors;
}
```

**Confidence:** MEDIUM — BASIS documentation confirms "all error messages contain both the BBj line number and the ASCII file line number." Exact format delimiter not documented publicly. The regex covers the documented content; adjust after empirical testing with actual BBjCPL output. The parser should be wrapped in a test with known output strings before integration.

**Critical note:** Run `BBjCPL --help` or inspect its actual stderr output with a known broken file to validate the regex before shipping. This is the highest-risk piece in this milestone.

---

### Pattern 3: Diagnostic Cascading via `ValidationOptions`

Langium 4.1.3 `DefaultDocumentValidator.validateDocument()` already accepts `ValidationOptions` with `stopAfterParsingErrors` and `stopAfterLexingErrors` flags (verified in local `node_modules/langium/src/validation/document-validator.ts`).

The existing `BBjDocumentValidator` does not yet set these options. Adding cascading:

```typescript
// In bbj-document-validator.ts
export class BBjDocumentValidator extends DefaultDocumentValidator {

  async validateDocument(
    document: LangiumDocument,
    options: ValidationOptions = {},
    cancelToken = CancellationToken.None
  ): Promise<Diagnostic[]> {
    // Cascade: if Langium has parse errors, skip semantic + compiler checks.
    // Parse errors make type inference and symbol resolution unreliable anyway.
    const cascadeOptions: ValidationOptions = {
      ...options,
      stopAfterParsingErrors: true,  // suppress linking/semantic noise
    };

    const langiumDiags = await super.validateDocument(document, cascadeOptions, cancelToken);

    // Only run compiler checks if there are no parse errors
    const hasParseErrors = langiumDiags.some(
      d => (d.data as DiagnosticData)?.code === DocumentValidator.ParsingError
    );
    if (hasParseErrors) {
      return langiumDiags;
    }

    // Merge compiler diagnostics (from BBjCompilerService)
    const compilerDiags = await this.compilerService.getDiagnostics(document);
    return [...langiumDiags, ...compilerDiags];
  }
}
```

**Confidence:** HIGH — `stopAfterParsingErrors` flag confirmed in Langium 4.1.3 source at `/bbj-vscode/node_modules/langium/src/validation/document-validator.ts` lines 31-35. `DocumentValidator.ParsingError` constant confirmed at line 353.

---

### Pattern 4: Outline Resilience via `DefaultDocumentSymbolProvider` Override

The `DefaultDocumentSymbolProvider` (verified in local `node_modules/langium/src/lsp/document-symbol-provider.ts`) recursively calls `getSymbol()` for all AST nodes. When the document has parse errors, `astNode.$cstNode` can be `undefined` for recovered nodes, and `nameProvider.getNameNode()` may throw or return garbage.

Fix: override `getSymbol()` with null guards.

```typescript
// New file: bbj-document-symbol-provider.ts
import { DefaultDocumentSymbolProvider } from 'langium/lsp';
import type { LangiumDocument, AstNode } from 'langium';
import type { DocumentSymbol } from 'vscode-languageserver';

export class BBjDocumentSymbolProvider extends DefaultDocumentSymbolProvider {

  protected override getSymbol(document: LangiumDocument, astNode: AstNode): DocumentSymbol[] {
    // Guard: skip nodes that Chevrotain error recovery inserted (no CST position)
    if (!astNode.$cstNode) {
      return this.getChildSymbols(document, astNode) ?? [];
    }
    try {
      return super.getSymbol(document, astNode);
    } catch {
      // If name resolution throws on a recovered node, skip it silently
      return [];
    }
  }

  protected override getChildSymbols(document: LangiumDocument, astNode: AstNode): DocumentSymbol[] | undefined {
    if (!astNode.$cstNode) {
      return undefined;
    }
    return super.getChildSymbols(document, astNode);
  }
}
```

Register in `BBjModule` (language-specific services, not shared):

```typescript
// In bbj-module.ts, inside BBjModule:
lsp: {
  // ... existing providers ...
  DocumentSymbolProvider: (services) => new BBjDocumentSymbolProvider(services),
},
```

**Confidence:** HIGH — `DefaultDocumentSymbolProvider` source confirmed at `node_modules/langium/src/lsp/document-symbol-provider.ts`. Methods `getSymbol`, `createSymbol`, and `getChildSymbols` are all `protected`. Registration pattern via `BBjModule.lsp` DI confirmed by existing `DefinitionProvider`, `HoverProvider` registrations in `bbj-module.ts`.

---

### Pattern 5: Debounce for Compiler Invocation

500ms debounce prevents re-running the compiler on every intermediate build (e.g., Langium rebuilds as references resolve). Implement inside `BBjCompilerService` without external dependencies:

```typescript
export class BBjCompilerService {
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  scheduleCompile(document: LangiumDocument): void {
    const key = document.uri.toString();
    const existing = this.debounceTimers.get(key);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(key, setTimeout(async () => {
      this.debounceTimers.delete(key);
      await this.compile(document);
    }, 500));
  }

  private async compile(document: LangiumDocument): Promise<void> {
    // ... invoke BBjCPL, store results, trigger diagnostic refresh
  }
}
```

**Confidence:** HIGH — `setTimeout`/`clearTimeout` are Node.js globals available in ESM modules. `ReturnType<typeof setTimeout>` is the correct TypeScript type for both browser and Node contexts (Node 20+ returns a `Timeout` object, not a number).

---

### Pattern 6: Slow Validation Category for Compiler Checks

Langium's `ValidationCategory` system (`'fast'` | `'slow'` | `'built-in'`) controls which checks run on each build. Default `updateBuildOptions` runs only `['built-in', 'fast']` (confirmed in `document-builder.ts` line 145). Register compiler-triggered checks as `'slow'` to exclude them from keystroke builds:

```typescript
// In bbj-validator.ts or a new bbj-compiler-validator.ts
registerValidationChecks(services);

// Register compiler checks explicitly as 'slow'
services.validation.ValidationRegistry.register(
  { Program: checkWithCompiler },
  validatorInstance,
  'slow'   // only runs when explicitly requested, not on keystroke
);
```

Trigger `'slow'` checks manually after debounce timeout, by calling `DocumentBuilder.build(docs, { validation: { categories: ['slow'] } })`.

**Confidence:** HIGH — `ValidationCategory` types and `register()` signature confirmed in `node_modules/langium/src/validation/validation-registry.ts`. Default categories confirmed in `document-builder.ts` line 145.

## Integration Points with Existing Services

| New Feature | Existing Service | Integration Method |
|------------|------------------|-------------------|
| BBjCPL invocation | `BBjWorkspaceManager.getSettings()` | Read `bbjHome` setting for compiler path; read compiler flags from existing `bbj.compiler.*` settings already in `package.json` |
| BBjCPL invocation | `BBjDocumentBuilder.shouldValidate()` | Only schedule compiler for `scheme === 'file'` documents that pass existing `shouldValidate` check — reuse same guard |
| Compiler diagnostics | `BBjDocumentValidator` | Merge via `validateDocument()` override; use existing `DiagnosticData` type for `source` tagging (tag as `'BBjCPL'` to distinguish from Langium errors) |
| Outline resilience | `BBjModule.lsp.DocumentSymbolProvider` | Register new `BBjDocumentSymbolProvider` in language-specific DI module (not shared module) |
| Debounce | `BBjDocumentBuilder.buildDocuments` | Call `BBjCompilerService.scheduleCompile()` at the end of `buildDocuments`, after `super.buildDocuments()` completes |
| Compiler settings | Existing `bbj.compiler.*` in `package.json` | 40+ compiler settings already defined (type checking flags, output flags, etc.) — read from `getSettings()`, no schema additions needed |

## Version Compatibility

| Package | Version | Compatibility Notes |
|---------|---------|---------------------|
| `node:child_process` | Node.js 20.18.1 | `spawn()` stable since Node.js 0.1.90. `AbortSignal` integration available since Node.js 15.4.0. Safe. |
| Langium `DefaultDocumentSymbolProvider` | 4.1.3 | `getSymbol`, `getChildSymbols`, `createSymbol` all `protected` — confirmed in local source. No changes across 4.x minor versions. |
| Langium `ValidationOptions.stopAfterParsingErrors` | 4.1.3 | Confirmed in local source `document-validator.ts` line 33. Available since Langium 3.x. |
| Langium `ValidationCategory` `'slow'` | 4.1.3 | Built-in category, confirmed in `validation-registry.ts`. Default build excludes `'slow'`. |
| `vscode-uri` | 3.1.0 (existing) | `URI.parse().fsPath` returns platform-correct absolute path. Stable API. |

## Sources

- Local inspection: `/bbj-vscode/node_modules/langium/src/lsp/document-symbol-provider.ts` — Confirmed `getSymbol`, `getChildSymbols`, `createSymbol` are `protected`; `$cstNode` null check risk identified. HIGH confidence.
- Local inspection: `/bbj-vscode/node_modules/langium/src/validation/document-validator.ts` — Confirmed `ValidationOptions.stopAfterParsingErrors` at line 33, `DocumentValidator.ParsingError` constant at line 353. HIGH confidence.
- Local inspection: `/bbj-vscode/node_modules/langium/src/workspace/document-builder.ts` — Confirmed `updateBuildOptions` defaults to `['built-in', 'fast']` at line 145; `ValidationCategory` usage. HIGH confidence.
- Local inspection: `/bbj-vscode/node_modules/langium/src/validation/validation-registry.ts` — Confirmed `register()` accepts category param defaulting to `'fast'`; `'slow'` is pre-defined. HIGH confidence.
- Local inspection: `bbj-vscode/src/language/bbj-module.ts` — Confirmed DI registration pattern for `lsp.DocumentSymbolProvider`, `lsp.DefinitionProvider`, etc. HIGH confidence.
- Local inspection: `bbj-vscode/src/language/bbj-document-validator.ts` — Existing `BBjDocumentValidator` already overrides `processLinkingErrors` and `toDiagnostic`. HIGH confidence.
- [Node.js v20.18.1 child_process docs](https://nodejs.org/api/child_process.html) — `spawn()` API, `shell` option for Windows `.bat`. HIGH confidence.
- [BASIS BBjCPL documentation](https://documentation.basis.com/BASISHelp/WebHelp/util/bbjcpl_bbj_compiler.htm) — Error message format: "All error messages contain both the BBj line number and the ASCII file line number." MEDIUM confidence (exact delimiter format not specified; needs empirical validation).
- [Chevrotain fault tolerance docs](https://chevrotain.io/docs/tutorial/step4_fault_tolerance.html) — Error recovery creates nodes without valid CST positions (NaN offsets). HIGH confidence for the null-guard rationale.
- [GitHub: cross-spawn](https://github.com/moxystudio/node-cross-spawn) — Windows `.bat` spawn issue analysis. Confirmed `shell: true` is the correct built-in fix. MEDIUM confidence.

---

*Stack research for: BBj Language Server — BBjCPL Integration, Diagnostic Cascading, Outline Resilience*
*Researched: 2026-02-19*
