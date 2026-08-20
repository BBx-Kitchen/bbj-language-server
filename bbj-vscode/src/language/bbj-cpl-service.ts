import { spawn } from 'child_process';
import { resolveBbjBinary } from '../bbj-home-layout.js';
import { Diagnostic } from 'vscode-languageserver';
import { parseBbjcplOutput } from './bbj-cpl-parser.js';
import { notifyBbjcplAvailability } from './bbj-notifications.js';
import { BBjWorkspaceManager } from './bbj-ws-manager.js';
import { logger } from './logger.js';

/**
 * Minimal context interface to avoid circular dependency with bbj-module.ts.
 *
 * BBjCPLService only needs access to the WorkspaceManager (shared service)
 * to call getBBjDir(). Using a structural interface rather than importing
 * BBjServices directly avoids the circular import chain:
 *   bbj-module -> bbj-cpl-service -> bbj-module
 */
interface BBjCPLServiceContext {
    shared: {
        workspace: {
            WorkspaceManager: unknown;
        };
    };
}

/**
 * Handle for a single in-flight bbjcpl compilation.
 *
 * Exposes a safe cancel() method that only kills the underlying process
 * if it actually started (has a valid PID). This prevents sending kill
 * signals to undefined/invalid PIDs when the spawn itself failed with ENOENT.
 */
interface CompileHandle {
    /** Cancel this compilation. Safe to call even if the process never started. */
    cancel(): void;
}

/**
 * Spawns the bbjcpl binary to compile BBj source files and produce
 * LSP Diagnostic objects from the compiler's stderr output.
 *
 * Key design decisions:
 * - Uses spawn() (not exec()) for streaming stdout/stderr
 * - Abort-on-resave: second compile() call for the same file cancels the first
 * - Race-safe inFlight map: handlers check identity before cleanup
 * - Timeout via a timer that kills the process directly (not AbortController)
 * - ENOENT graceful degradation: returns [] if bbjcpl not installed
 * - Never rejects: all errors logged and resolved with []
 *
 * Wired into buildDocuments() (bbj-document-builder.ts's debounced BBjCPL compile step) via:
 *   services.compiler.BBjCPLService.compile(filePath)
 */
export class BBjCPLService {

    /** Tracks in-flight compilations keyed by absolute file path. */
    private readonly inFlight: Map<string, CompileHandle> = new Map();

    /** Timeout in ms before killing bbjcpl. Configurable via setTimeout(). */
    private timeoutMs: number = 30_000;

    /** Reference to the workspace manager for getBBjDir() calls. */
    private readonly wsManager: BBjWorkspaceManager;

    /** The last bbjHome value already warned about, so a rejection logs once per distinct value. */
    private lastRejectedBbjHome: string | undefined = undefined;

    /**
     * @param services Minimal context providing access to the shared WorkspaceManager.
     */
    constructor(services: BBjCPLServiceContext) {
        this.wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
    }

    /**
     * Compile a BBj source file using the bbjcpl binary.
     *
     * Returns an array of LSP Diagnostic objects parsed from bbjcpl's stderr.
     * Returns [] (empty) when:
     * - BBj home is not configured (bbjcpl path unknown)
     * - bbjcpl is not installed (ENOENT)
     * - The compilation is aborted (superseded by a newer compile() call)
     * - The process times out
     * - Any other process error occurs
     *
     * @param filePath Absolute path to the .bbj file to compile.
     */
    async compile(filePath: string): Promise<Diagnostic[]> {
        const bbjcplBin = this.getBbjcplPath();
        if (!bbjcplBin) {
            // BBj home not configured — cannot locate bbjcpl
            return [];
        }

        // Abort any existing in-flight compilation for this file
        const existing = this.inFlight.get(filePath);
        if (existing) {
            existing.cancel();
        }

        // Cancellation flag: set to true when this compilation is superseded
        let cancelled = false;

        // Placeholder handle — updated once the process spawns
        const handle: CompileHandle = {
            cancel() {
                cancelled = true;
                // kill() is called on the process if it started; see below
            }
        };
        this.inFlight.set(filePath, handle);

        return new Promise<Diagnostic[]>((resolve) => {
            let stderr = '';
            let stdout = '';
            let proc: ReturnType<typeof spawn> | null = null;
            let settled = false;

            function settle(result: Diagnostic[]) {
                if (!settled) {
                    settled = true;
                    resolve(result);
                }
            }

            // Set up timeout to kill the process after timeoutMs
            const timeoutId = setTimeout(() => {
                if (proc && proc.pid !== undefined) {
                    proc.kill();
                }
                cancelled = true;
                settle([]);
            }, this.timeoutMs);

            // Override cancel to also kill the live process if it started
            handle.cancel = () => {
                cancelled = true;
                if (proc && proc.pid !== undefined) {
                    proc.kill();
                }
                clearTimeout(timeoutId);
                settle([]);
            };

            try {
                proc = spawn(bbjcplBin, ['-N', filePath]);
            } catch (spawnErr: unknown) {
                // Synchronous spawn error (rare — usually ENOENT comes as async 'error' event)
                clearTimeout(timeoutId);
                if (this.inFlight.get(filePath) === handle) {
                    this.inFlight.delete(filePath);
                }
                const err = spawnErr as NodeJS.ErrnoException;
                if (err.code === 'ENOENT') {
                    logger.info('bbjcpl not found — BBj compiler diagnostics unavailable');
                } else {
                    logger.warn(`bbjcpl spawn error: ${err.message}`);
                }
                settle([]);
                return;
            }

            proc.stderr?.on('data', (chunk: Buffer) => {
                stderr += chunk.toString();
            });

            proc.stdout?.on('data', (chunk: Buffer) => {
                stdout += chunk.toString();
            });

            proc.on('close', () => {
                clearTimeout(timeoutId);
                // Race-safe cleanup: only delete if this handle is still the active one
                if (this.inFlight.get(filePath) === handle) {
                    this.inFlight.delete(filePath);
                }
                if (cancelled) {
                    // This compilation was superseded or timed out — discard results
                    settle([]);
                    return;
                }
                if (stdout) {
                    logger.debug(() => `bbjcpl stdout: ${stdout}`);
                }
                settle(parseBbjcplOutput(stderr));
            });

            proc.on('error', (err: NodeJS.ErrnoException) => {
                clearTimeout(timeoutId);
                // Race-safe cleanup
                if (this.inFlight.get(filePath) === handle) {
                    this.inFlight.delete(filePath);
                }
                if (cancelled) {
                    // Aborted — expected when superseded by a newer compile() call or timeout
                    settle([]);
                } else if (err.code === 'ENOENT') {
                    logger.info('bbjcpl not found — BBj compiler diagnostics unavailable');
                    settle([]);
                } else {
                    logger.warn(`bbjcpl error: ${err.message}`);
                    settle([]);
                }
            });
        });
    }

    /**
     * Set the timeout in milliseconds for bbjcpl compilations.
     * Currently unused: no settings path (VS Code or IntelliJ) calls this method, so
     * {@link timeoutMs} always stays at its default. Wiring a settings path would be a
     * behaviour change, outside this comment-only correction.
     *
     * @param ms Timeout in milliseconds (e.g. 30000 for 30 seconds).
     */
    setTimeout(ms: number): void {
        this.timeoutMs = ms;
    }

    /**
     * Returns true if a compilation is currently in progress for the given file.
     * Utility for Phase 53 to check state before triggering a new compile.
     *
     * @param filePath Absolute path to the .bbj file.
     */
    isCompiling(filePath: string): boolean {
        return this.inFlight.has(filePath);
    }

    /**
     * Resolve the path to the bbjcpl binary from the BBj home directory.
     *
     * Returns undefined when BBj home is not configured (empty or undefined),
     * or when `resolveBbjBinary` rejects the configured bbjHome against the
     * expected installation layout — in which case the rejection is logged
     * once per distinct bbjHome and reported through
     * {@link notifyBbjcplAvailability}. Returns the resolved path only when
     * the layout check passes.
     */
    private getBbjcplPath(): string | undefined {
        const bbjHome = this.wsManager.getBBjDir();
        if (!bbjHome) {
            return undefined;
        }

        const resolution = resolveBbjBinary(bbjHome, 'bbjcpl');
        if (resolution.reason) {
            if (this.lastRejectedBbjHome !== bbjHome) {
                this.lastRejectedBbjHome = bbjHome;
                logger.warn(`bbjcpl unavailable for bbj.home ${JSON.stringify(bbjHome)}: ${resolution.reason}`);
                notifyBbjcplAvailability(false);
            }
            return undefined;
        }

        this.lastRejectedBbjHome = undefined;
        return resolution.path;
    }
}
