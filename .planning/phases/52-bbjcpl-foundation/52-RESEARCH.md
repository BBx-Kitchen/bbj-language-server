# Phase 52: BBjCPL Foundation - Research

**Researched:** 2026-02-20
**Domain:** Node.js child_process subprocess management, LSP diagnostic production, test fixture design
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Compiler invocation:**
- `bbjcpl` binary lives at `{bbj.home}/bin/bbjcpl` — derive path from existing `bbj.home` setting, no new path setting needed
- Invocation: `bbjcpl -N <file>` — the `-N` flag runs syntax check only (no output file)
- `bbjcpl` always exits 0 — errors reported on stderr, empty stderr = valid
- Reference implementation exists at `/Users/beff/_workspace/bbj-ai-strategy/rag-ingestion/src/bbj_rag/compiler.py` (Python async subprocess pattern)

**Output format:**
- Error format: `<filepath>: error at line <legacy_line> (<physical_line>):\n            <source_line>`
- The parenthesized number `(N)` is the **physical line number** — use this for LSP line mapping
- The first number (e.g., 350) is a legacy BASIC line number — ignore it
- Multiple errors per file are reported in one pass
- bbjcpl can produce cascading errors — Phase 53's diagnostic hierarchy handles this
- stdout vs stderr distinction needs empirical verification — capture both during research

**Output discovery:**
- Create synthetic .bbj files with deliberate errors for test fixtures (don't rely on existing test files)
- Capture real bbjcpl stderr output against these files and commit as test fixtures
- Investigate whether bbjcpl produces warnings in addition to errors (unknown — discover empirically)

**Process lifecycle:**
- Trigger: on file save (not on every keystroke)
- Timeout: configurable via VS Code setting, default TBD (needs to be generous — large files can take 15-30+ seconds)
- Concurrency: one bbjcpl process per file, no global limit
- Abort policy: let current compilation finish; if a new save comes in, abort the in-flight process and start fresh. Don't aggressively abort on keystrokes
- Kill process on timeout, continue without hanging the language server

**Error mapping:**
- All bbjcpl errors map to LSP Error severity (no Warning distinction)
- Diagnostic source label: `"BBj Compiler"`
- Error range: highlight entire line (start of line to end of line) since bbjcpl doesn't report columns
- Parse the physical line number from parentheses in the error format

**Claude's Discretion:**
- Whether to compile saved file on disk vs write buffer to temp file
- Exact default timeout value
- stdout capture strategy
- Temp file cleanup approach if using temp files

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CPL-01 | Discover BBjCPL error output format via test fixtures — run compiler against known-bad files, capture actual stderr format, create test data | Synthetic fixture files with deliberate BBj syntax errors; fixture format documented below; real bbjcpl run required during plan execution |
| CPL-02 | Invoke BBjCPL using bbj.home path with -N flag (check-only mode) — cross-platform process spawning with proper path handling | Node.js `child_process.spawn()` with AbortController; path derivation from `BBjWorkspaceManager.getBBjDir()`; platform binary suffix pattern already used in extension.ts |
| CPL-03 | Parse BBjCPL stderr into LSP diagnostics with accurate line numbers — error output parser validated against real compiler output | Regex `/:\ error at line \d+ \((\d+)\):/` to extract physical line; LSP `Diagnostic` construction with `DiagnosticSeverity.Error` and source `"BBj Compiler"` |
| CPL-04 | Safe process management — abort on re-edit, no orphaned processes, configurable timeout, AbortController lifecycle | `AbortController`/`AbortSignal` passed to `spawn()`; per-file `Map<string, AbortController>` for in-flight tracking; `process.kill()` on timeout with `process.wait()` drain |
</phase_requirements>

## Summary

Phase 52 builds a standalone `BBjCPLService` that (1) invokes the `bbjcpl -N <file>` syntax-check binary, (2) parses its stderr output into LSP `Diagnostic` objects, and (3) manages process lifecycle with abort-on-resave and configurable timeout. The service is completely self-contained — wiring into the document build lifecycle is Phase 53.

The core technical domain is Node.js `child_process.spawn()` with `AbortController` signal integration, which is idiomatic in Node 22 (the runtime used here). The Python reference implementation at `bbj-ai-strategy/rag-ingestion/src/bbj_rag/compiler.py` provides a verified pattern: write to temp file, spawn with `-N`, capture stderr, kill on timeout, clean up temp file in `finally`. The TypeScript translation is straightforward.

The parser is a single-pass regex that extracts physical line numbers from the parenthesized component of each error line. Line numbers from bbjcpl are 1-based; LSP ranges are 0-based — an off-by-one must be applied. The entire line is highlighted (character 0 to `Number.MAX_SAFE_INTEGER`) since bbjcpl does not report column numbers. BBj.home path derivation reuses the existing `BBjWorkspaceManager.getBBjDir()` method rather than introducing any new settings.

**Primary recommendation:** Create `bbj-vscode/src/language/bbj-cpl-service.ts` as a standalone, injected service class. Keep it infrastructure-only — no Langium integration, no document events. Tests use vitest with fixture `.txt` files containing real captured stderr; the parser is tested entirely against those fixtures without spawning any process.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `child_process` (Node.js built-in) | Node 22 | Process spawning and management | Built-in, no dependency; `spawn()` is the correct API for streaming output |
| `vscode-languageserver` | ^9.0.1 (already in project) | `Diagnostic`, `DiagnosticSeverity`, `Range` types | Already project dependency; required for LSP output |
| `vitest` | ^1.6.1 (already in project) | Unit testing parser and lifecycle logic | Already project test runner |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `path` (Node built-in) | Node 22 | Cross-platform binary path construction | Used to join `{bbjHome}/bin/bbjcpl` on all platforms |
| `os` (Node built-in) | Node 22 | `os.tmpdir()` for temp file location | Needed if choosing temp-file approach for disk-vs-buffer decision |
| `fs` (Node built-in) | Node 22 | Temp file write/cleanup | Needed only if temp-file approach chosen |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `child_process.spawn()` | `child_process.exec()` | `exec()` buffers all output in memory (risk on large files); `spawn()` is streaming and supports AbortSignal natively in Node 22 |
| `AbortController` + `spawn` signal option | Manual `process.kill()` timer | AbortController is the idiomatic Node 22 pattern; integrates cleanly with timeout via `setTimeout`; chosen approach |
| Temp file for stdin | Compile file on disk | Disk file already exists on save; simpler to use file path directly; temp file adds complexity and race conditions if file was just saved |

**Installation:** No new packages needed. All required APIs are already in Node.js built-ins or existing project dependencies.

## Architecture Patterns

### Recommended Project Structure

```
bbj-vscode/src/language/
├── bbj-cpl-service.ts        # NEW: BBjCPLService class (Phase 52)
├── bbj-module.ts             # MODIFY: register BBjCPLService as injected service
└── ...

bbj-vscode/test/
├── cpl-service.test.ts       # NEW: parser + lifecycle tests
└── test-data/
    └── cpl-fixtures/         # NEW: real bbjcpl stderr output captured as .txt files
        ├── single-error.txt
        ├── multiple-errors.txt
        └── no-errors.txt     # empty file = clean compilation
```

### Pattern 1: Subprocess Spawn with AbortController

The established pattern (verified from Python reference and Node.js docs):

```typescript
// Source: Node.js child_process docs, Python reference at bbj-ai-strategy/rag-ingestion/src/bbj_rag/compiler.py
import { spawn } from 'child_process';
import * as path from 'path';

// Per-file in-flight tracking
const inFlight = new Map<string, AbortController>();

async function runBbjcpl(filePath: string, bbjHome: string, timeoutMs: number): Promise<string> {
    const fileKey = filePath;

    // Abort any existing in-flight compilation for this file
    const existing = inFlight.get(fileKey);
    if (existing) {
        existing.abort();
    }

    const controller = new AbortController();
    inFlight.set(fileKey, controller);

    const bbjcplBin = path.join(bbjHome, 'bin', 'bbjcpl');
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return new Promise<string>((resolve, reject) => {
        let stderr = '';
        let stdout = '';

        const proc = spawn(bbjcplBin, ['-N', filePath], {
            signal: controller.signal,
        });

        proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf-8'); });
        proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString('utf-8'); });

        proc.on('close', (_code) => {
            clearTimeout(timeoutId);
            inFlight.delete(fileKey);
            resolve(stderr); // bbjcpl always exits 0; errors on stderr
        });

        proc.on('error', (err: NodeJS.ErrnoException) => {
            clearTimeout(timeoutId);
            inFlight.delete(fileKey);
            if (err.name === 'AbortError' || controller.signal.aborted) {
                resolve(''); // Aborted — not an error condition
            } else if (err.code === 'ENOENT') {
                resolve(''); // bbjcpl not installed — degrade gracefully
            } else {
                reject(err);
            }
        });
    });
}
```

### Pattern 2: stderr Parser

The format is deterministic. Each error occupies two lines:
- Line 1: `<filepath>: error at line <legacy_num> (<physical_num>):`
- Line 2: indented source content (ignored for diagnostic, but useful for multi-error deduplication)

```typescript
// Source: CONTEXT.md error format specification + real sample from context
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';

// Matches: "/path/to/file.bbj: error at line 340 (34):"
const ERROR_LINE_RE = /^.+:\s+error at line \d+ \((\d+)\):/;

export function parseBbjcplOutput(stderr: string, fileUri: string): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const lines = stderr.split('\n');

    for (const line of lines) {
        const match = ERROR_LINE_RE.exec(line);
        if (!match) continue;

        // bbjcpl reports 1-based physical lines; LSP ranges are 0-based
        const physicalLine = parseInt(match[1], 10) - 1;

        const range: Range = {
            start: { line: physicalLine, character: 0 },
            end:   { line: physicalLine, character: Number.MAX_SAFE_INTEGER },
        };

        diagnostics.push({
            range,
            severity: DiagnosticSeverity.Error,
            source: 'BBj Compiler',
            message: `Syntax error at line ${physicalLine + 1}`,
        });
    }

    return diagnostics;
}
```

### Pattern 3: Service Registration in bbj-module.ts

Following the existing pattern (BBjValidator, BBjDocumentValidator, JavaInteropService):

```typescript
// In bbj-module.ts — following existing BBjAddedServices pattern
export type BBjAddedServices = {
    validation: { BBjValidator: BBjValidator },
    java: { JavaInteropService: JavaInteropService },
    types: { Inferer: TypeInferer },
    compiler: { BBjCPLService: BBjCPLService },   // NEW in Phase 52
}

// In BBjModule:
compiler: {
    BBjCPLService: (services) => new BBjCPLService(services),
}
```

Phase 53 will call `services.compiler.BBjCPLService.compile(filePath)` from `buildDocuments()`.

### Pattern 4: Test Fixture Design

Tests fall into two categories:

**Category A: Parser-only tests (no process spawn)**
These test `parseBbjcplOutput()` in isolation using string literals or committed fixture files. This is the primary unit test surface.

```typescript
// cpl-service.test.ts
import { describe, test, expect } from 'vitest';
import { parseBbjcplOutput } from '../src/language/bbj-cpl-service.js';
import { DiagnosticSeverity } from 'vscode-languageserver';

describe('BBjCPL output parser', () => {
    test('parses single error', () => {
        const stderr = `/path/file.bbj: error at line 340 (34):\n       method public void broken())`;
        const diags = parseBbjcplOutput(stderr, 'file:///path/file.bbj');
        expect(diags).toHaveLength(1);
        expect(diags[0].severity).toBe(DiagnosticSeverity.Error);
        expect(diags[0].range.start.line).toBe(33); // 34 - 1 = 33 (0-based)
        expect(diags[0].source).toBe('BBj Compiler');
    });

    test('parses multiple errors', () => { /* ... */ });
    test('returns empty array for empty stderr', () => { /* ... */ });
    test('ignores stdout / non-error lines', () => { /* ... */ });
});
```

**Category B: Lifecycle tests (abort and timeout)**
These test process lifecycle behavior without needing a real bbjcpl binary, by using mock subprocess patterns or by testing the `inFlight` map state.

**Fixture files (committed to repo):**
Captured by running `bbjcpl -N <test-file.bbj>` during plan execution. Committed to `bbj-vscode/test/test-data/cpl-fixtures/`. This satisfies CPL-01.

### Anti-Patterns to Avoid

- **Running bbjcpl from `onBuildPhase` callback:** Documented in STATE.md — this causes CPU rebuild loops. Phase 52 does NOT wire into any document lifecycle; that is Phase 53's job.
- **Global process limit:** Per-file concurrency only. A global semaphore would serialize compilation unnecessarily.
- **Using `child_process.exec()`:** Buffers all output in memory. On very large files with many errors, this could OOM. Use `spawn()` instead.
- **Not draining the process after abort:** After `controller.abort()`, the old process gets SIGTERM. The `close` event still fires; the `inFlight` map must be cleaned up in the event handler, not assumed to be cleared by the abort alone.
- **Synchronous temp file cleanup:** If using a temp file, wrap cleanup in `finally` to ensure deletion even on error paths.
- **Hard-coding platform binary extension:** Windows uses `bbjcpl.exe`. The existing pattern in `extension.ts` (line 400) uses `bbj${process.platform === 'win32' ? '.exe' : ''}` — apply the same to bbjcpl.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Process timeout | Custom SIGKILL timer with manual cleanup | `AbortController` + `setTimeout(() => controller.abort(), ms)` | AbortController integrates directly with spawn's signal option; handles cleanup atomically |
| Binary not found | Custom error code inspection | Check `err.code === 'ENOENT'` in the `error` event handler | Node.js uses ENOENT for missing executables; no custom detection needed |
| Line number conversion | Custom format parser | Simple regex + `parseInt() - 1` | The format is documented and stable; no parsing library needed |

**Key insight:** The complexity in this phase is process lifecycle correctness (abort races, cleanup on timeout), not parsing. The parser is trivial; the lifecycle management requires careful event ordering.

## Common Pitfalls

### Pitfall 1: Off-by-One Line Numbers
**What goes wrong:** bbjcpl reports 1-based physical line numbers. LSP `Range.start.line` is 0-based. Forgetting to subtract 1 shifts all diagnostics down by one line.
**Why it happens:** Format documentation says "(34)" for line 34; developers read this as the LSP line and use 34 directly.
**How to avoid:** Always apply `parseInt(match[1], 10) - 1` before constructing the LSP Range.
**Warning signs:** Diagnostics appearing one line below the actual error.

### Pitfall 2: Abort Race — Old Process Fires `close` After New Process Starts
**What goes wrong:** On rapid saves, the old process gets aborted, but its `close` event fires after the new process has already started and written to the inFlight map. The old `close` handler deletes the wrong entry.
**Why it happens:** `inFlight.delete(fileKey)` in the close handler removes whatever is currently in the map.
**How to avoid:** Capture the controller reference at process start; only clean up if `inFlight.get(fileKey) === thisController` before deleting.

```typescript
const controller = new AbortController();
inFlight.set(fileKey, controller);
// ... later in close handler:
proc.on('close', () => {
    if (inFlight.get(fileKey) === controller) {
        inFlight.delete(fileKey);
    }
    resolve(stderr);
});
```

### Pitfall 3: stderr Buffering — Incomplete Lines
**What goes wrong:** Node.js `data` events on `proc.stderr` may fire mid-line if the OS pipe buffer splits the output. Accumulating chunks into a string and calling `.split('\n')` at the end avoids this.
**Why it happens:** Developers call `parseBbjcplOutput(chunk)` inside the `data` event handler instead of accumulating.
**How to avoid:** Accumulate stderr string fully in `close` event; parse only when `close` fires.

### Pitfall 4: bbjcpl Not Installed — ENOENT vs. Timeout
**What goes wrong:** If bbjcpl is not installed, `spawn()` fires `error` with `code === 'ENOENT'` immediately. If timeout is set to 30 seconds and ENOENT is not detected, the Promise hangs for 30 seconds before timing out.
**Why it happens:** The AbortController timeout fires SIGTERM to a process that doesn't exist, producing a second error.
**How to avoid:** Check `err.code === 'ENOENT'` in the `error` handler first; resolve with `''` immediately (treat as "no errors" = degrade gracefully). Clear the timeout in the error handler as well.

### Pitfall 5: Windows Binary Path
**What goes wrong:** On Windows, the binary is `bbjcpl.exe` but the code constructs `bbjcpl` without the extension. `spawn()` fires ENOENT on Windows.
**Why it happens:** macOS/Linux don't need the extension; Windows does.
**How to avoid:** Use `process.platform === 'win32' ? 'bbjcpl.exe' : 'bbjcpl'`. See the existing pattern in `extension.ts` line 400.

### Pitfall 6: Fixture Files Not Capturing Both stdout and stderr
**What goes wrong:** Documentation says errors go to stderr, but empirical verification is required. If any errors appear on stdout, the parser misses them.
**Why it happens:** bbjcpl docs/context says stderr, but real behavior needs confirmation.
**How to avoid:** During CPL-01 fixture capture, capture both streams and commit both. If stdout has content, investigate. The Python reference (compiler.py) only reads stderr — but this was not verified against real bbjcpl output in that codebase either.

## Code Examples

Verified patterns from official sources:

### Node.js spawn with AbortController (Node 22)

```typescript
// Source: Node.js v22 child_process docs — AbortSignal support confirmed in Node 15+
import { spawn } from 'child_process';

const controller = new AbortController();
const { signal } = controller;

const proc = spawn('bbjcpl', ['-N', filePath], { signal });

proc.on('error', (err: NodeJS.ErrnoException) => {
    if (err.name === 'AbortError') {
        // Process was aborted — this is expected, not an error
    }
});

// Later: abort
controller.abort(); // sends SIGTERM to process
```

### LSP Diagnostic construction (vscode-languageserver ^9.0.1)

```typescript
// Source: vscode-languageserver package already in bbj-vscode/package.json
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';

const range: Range = {
    start: { line: physicalLine - 1, character: 0 },
    end:   { line: physicalLine - 1, character: Number.MAX_SAFE_INTEGER },
};

const diag: Diagnostic = {
    range,
    severity: DiagnosticSeverity.Error,
    source: 'BBj Compiler',
    message: `Syntax error at line ${physicalLine}`,
};
```

### bbj.home path derivation (from BBjWorkspaceManager)

```typescript
// Source: bbj-vscode/src/language/bbj-ws-manager.ts — existing public method
// BBjWorkspaceManager.getBBjDir() returns the configured bbjdir string
const bbjHome = wsManager.getBBjDir(); // e.g., "/Users/beff/bbj"
const bbjcplBin = path.join(bbjHome, 'bin', process.platform === 'win32' ? 'bbjcpl.exe' : 'bbjcpl');
```

### Vitest test structure (matching project conventions)

```typescript
// Source: bbj-vscode/test/document-symbol.test.ts — existing test pattern
import { describe, test, expect, beforeAll } from 'vitest';
// No EmptyFileSystem or langium services needed — this is pure-function testing
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `child_process.exec()` | `child_process.spawn()` with streams | Node 10+ | spawn avoids memory buffering; supports AbortSignal natively |
| Manual `process.kill()` + `clearTimeout()` | `AbortController` signal | Node 15+ | Single abort point handles both timeout and on-demand abort |
| `promisify(exec)` | Native Promise wrapping spawn events | Ongoing | exec is not suitable for streaming; spawn + Promise is the pattern |

**Deprecated/outdated:**
- `child_process.exec()` for long-running processes: Buffers all output. Appropriate only for short commands with bounded output. For bbjcpl (which can run 15-30+ seconds on large files), `spawn()` is required.

## Open Questions

1. **Exact bbjcpl output format — stdout vs. stderr split**
   - What we know: Documentation and Python reference say errors go to stderr; the sample errors in CONTEXT.md are labeled as stderr
   - What's unclear: Whether any output (e.g., "Compilation succeeded" banner) appears on stdout
   - Recommendation: During CPL-01, capture both streams separately; compare. The Python reference only reads stderr and treats empty-stderr as success, which is the model to follow unless stdout proves otherwise.

2. **Warning output from bbjcpl**
   - What we know: CONTEXT.md says "investigate whether bbjcpl produces warnings in addition to errors (unknown — discover empirically)"
   - What's unclear: Does bbjcpl have a different format or prefix for warnings (e.g., `warning at line`)? Or are all messages errors?
   - Recommendation: Search the captured output for any non-error lines. If warnings exist, they will need a different regex branch and `DiagnosticSeverity.Warning`. For Phase 52, all parseable messages should be treated as errors unless the format distinguishes them.

3. **Default timeout value**
   - What we know: CONTEXT.md says "needs to be generous — large files can take 15-30+ seconds"
   - What's unclear: Exact default to ship. The Python reference used 10s (too low). The context suggests 30s minimum.
   - Recommendation: Default to 30 seconds. Expose as `bbj.compiler.timeout` VS Code setting (integer, seconds). 30s is generous enough for large files while preventing indefinite hangs.

4. **Saved file on disk vs. temp file**
   - What we know: CONTEXT.md marks this as Claude's discretion
   - Recommendation: Compile the saved file on disk. bbjcpl is triggered on save (the file is already flushed to disk). Temp files add complexity (write, track path, delete) without benefit. The only scenario where temp files help is if unsaved buffer content should be compiled — but the trigger is on-save, so the buffer and disk are already in sync.

5. **Whether `BBjCPLService` should be a Langium injected service or a standalone class**
   - What we know: Existing custom services (BBjValidator, JavaInteropService) are registered in BBjAddedServices and injected via BBjModule. This makes them accessible as `services.compiler.BBjCPLService`.
   - Recommendation: Register as a Langium injected service. Phase 53 needs to call it from `buildDocuments()`, which has access to `services`. Using the injection pattern avoids singletons and aligns with the project's established patterns.

## Sources

### Primary (HIGH confidence)

- `/Users/beff/_workspace/bbj-ai-strategy/rag-ingestion/src/bbj_rag/compiler.py` — Python async subprocess reference implementation; verified to use: temp file, `asyncio.create_subprocess_exec`, stderr capture, timeout with `asyncio.wait_for`, kill on timeout, `finally` cleanup
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-ws-manager.ts` — `getBBjDir()` public method available for path derivation; `bbjdir` field populated from init options
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/extension.ts` (line 400) — existing pattern `bbj${process.platform === 'win32' ? '.exe' : ''}` for platform binary suffix
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/src/language/bbj-module.ts` — BBjAddedServices type and BBjModule structure for service registration
- `/Users/beff/_workspace/bbj-language-server/bbj-vscode/package.json` — dependency versions; `vscode-languageserver` ^9.0.1, `vitest` ^1.6.1, Node 22.22.0 confirmed
- `.planning/phases/52-bbjcpl-foundation/52-CONTEXT.md` — locked decisions, error format, sample output

### Secondary (MEDIUM confidence)

- Node.js v22 child_process documentation — AbortController/AbortSignal integration with `spawn()` is confirmed in Node 15+; Node 22 is in use per `node --version`
- `.planning/STATE.md` — CPU rebuild loop pitfall: BBjCPL must be invoked inside `buildDocuments()`, never from `onBuildPhase` — this phase avoids the issue by not wiring into any lifecycle

### Tertiary (LOW confidence)

- bbjcpl warning output format: Not empirically verified; assumed to not exist or use same format. Must be verified during CPL-01 fixture capture.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already in the project; Node.js APIs confirmed available
- Architecture: HIGH — patterns derived from existing code and verified Python reference
- Parser regex: MEDIUM — format is documented and sample provided, but physical confirmation awaits CPL-01 fixture capture
- Pitfalls: HIGH — derived from Node.js process lifecycle known behaviors and existing STATE.md warnings
- Lifecycle patterns: HIGH — AbortController pattern is standard Node 22 idiom

**Research date:** 2026-02-20
**Valid until:** 2026-03-20 (stable domain — Node.js APIs do not change; bbjcpl format is proprietary and stable)
