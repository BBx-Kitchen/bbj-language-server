import { LangiumDocument } from 'langium';
import { Diagnostic, DiagnosticSeverity, LSPErrorCodes, Range } from 'vscode-languageserver';
import { getMaxErrors } from './bbj-document-validator.js';
import { JavaInteropService, METHOD_NOT_FOUND, ParseError, ParseProgramParams } from './java-interop.js';
import { END_OF_LINE_CHARACTER } from './lsp-position.js';
import { logger } from './logger.js';

/**
 * Diagnostic `source` for every live parser diagnostic published by {@link BBjParserService}.
 * Deliberately distinct from the save-time compiler path's own diagnostic source: the diagnostic
 * hierarchy's Rule 0 (the save-time compiler's errors suppress Langium parse errors) keys on that
 * exact string, and a live parser diagnostic must stay outside it — reconciling the two sources is
 * a later phase's job, not this one's.
 */
export const BBJ_PARSER_SOURCE = 'BBj Parser';

/**
 * The fallback cap used when a value pushed through {@link getMaxErrors} is not a positive
 * finite number — a malformed configuration-change payload must not silently blank every live
 * diagnostic. Mirrors the diagnostics setting's own module default.
 */
const DEFAULT_MAX_ERRORS = 20;

/**
 * Converts one `ParseError`'s one-based BBj editor coordinates into a zero-based LSP `Range`,
 * clamped to the document's actual line count. The end character is always
 * {@link END_OF_LINE_CHARACTER} rather than a translation of `error.endCharacter`: BBj's own
 * end-of-range arithmetic routinely reports a value past the line's true length (confirmed by a
 * live probe against the deployed endpoint — see 102-RESEARCH.md), and an over-range `Position`
 * makes a JVM language client's deserializer reject the entire publish-diagnostics message,
 * hiding every diagnostic for the document. The sentinel is the idiom this codebase already uses
 * for exactly this (see `extractCyclicReferenceRelatedInfo` in `bbj-document-validator.ts`).
 * A collapsed or inverted character range — an end character at or before the start character,
 * or a start character of zero — spans the whole clamped line (starting at character 0) rather
 * than producing a zero-width marker.
 * @param error the parser's own error DTO, one-based lines and characters
 * @param lineCount the document's current line count, used to clamp an out-of-range line
 */
export function parseErrorToRange(error: ParseError, lineCount: number): Range {
    const clampLine = (oneBasedLine: number) =>
        Math.min(Math.max(oneBasedLine - 1, 0), Math.max(lineCount - 1, 0));
    const startLine = clampLine(error.editorStartLine);
    const endLine = clampLine(error.editorEndLine);
    const isCollapsedOrInverted = error.startCharacter <= 0 || error.endCharacter <= error.startCharacter;
    const startCharacter = isCollapsedOrInverted ? 0 : error.startCharacter - 1;
    return {
        start: { line: startLine, character: startCharacter },
        end: { line: endLine, character: END_OF_LINE_CHARACTER }
    };
}

/**
 * Maps the parser's own errors, in the parser's own order, into `Diagnostic[]`, capped at
 * `maxErrors`. Every diagnostic carries {@link BBJ_PARSER_SOURCE}, Error severity, BBj's message
 * text verbatim (never re-worded or used as a format string), and a `code` built by joining
 * `categories` — omitted entirely when `categories` is absent or empty.
 * @param errors the parser's errors, in the parser's own order
 * @param lineCount the document's current line count, used by the range converter
 * @param maxErrors the cap on the number of diagnostics returned (the diagnostics setting's
 *   value); a non-positive or non-finite value falls back to {@link DEFAULT_MAX_ERRORS} rather
 *   than blanking every live diagnostic
 */
export function parseErrorsToDiagnostics(errors: ParseError[], lineCount: number, maxErrors: number): Diagnostic[] {
    const cap = Number.isFinite(maxErrors) && maxErrors > 0 ? maxErrors : DEFAULT_MAX_ERRORS;
    return errors.slice(0, cap).map(error => {
        const diagnostic: Diagnostic = {
            range: parseErrorToRange(error, lineCount),
            message: error.message,
            severity: DiagnosticSeverity.Error,
            source: BBJ_PARSER_SOURCE
        };
        if (error.categories && error.categories.length > 0) {
            diagnostic.code = error.categories.join(',');
        }
        return diagnostic;
    });
}

/**
 * The endpoint's own application error codes (see `101-MR-DESCRIPTION.md`), each mapped to the
 * short kind token used in {@link BBjParserService}'s failure log lines and per-kind warn/debug
 * cadence. Any JSON-RPC error whose `code` is not one of these (a rejected connect, a closed
 * connection, a breaker-open short circuit, or any other unrecognized code) classifies as
 * `'transport'` instead.
 */
const APPLICATION_ERROR_KINDS: Record<number, string> = {
    [-33001]: 'parser-exception',
    [-33002]: 'timeout',
    [-33003]: 'size-cap',
    [-33004]: 'service-unavailable',
    [-33005]: 'protected-program',
};

/** The kind token for a `malformed-result` failure — a resolved result whose `errors` is invalid. */
const MALFORMED_RESULT_KIND = 'malformed-result';
/** The kind token for any failure that is not one of the endpoint's own application error codes. */
const TRANSPORT_KIND = 'transport';

/**
 * Classifies a caught failure's JSON-RPC `code` (or its absence) into one of the short kind
 * tokens used by the failure log cadence.
 */
function classifyFailureKind(code: number | undefined): string {
    if (code !== undefined && code in APPLICATION_ERROR_KINDS) {
        return APPLICATION_ERROR_KINDS[code];
    }
    return TRANSPORT_KIND;
}

/**
 * The structural slice of `BBjWorkspaceManager` this service reads: the resolved PREFIX list and
 * the workspace folder uris, both used to build `ParseProgramParams`. Kept narrow (rather than
 * importing `BBjWorkspaceManager` directly) so a test double only needs to shape these two calls.
 */
interface BBjParserWorkspaceManager {
    getSettings?(): { prefixes: string[] } | undefined;
    getWorkspaceFolderUris?(): Array<{ fsPath: string }>;
}

/**
 * Minimal structural context {@link BBjParserService} needs from `BBjServices`/shared services.
 * Mirrors `BBjCPLServiceContext`'s reason for existing (see `bbj-cpl-service.ts`): importing the
 * full `BBjServices` type here would make `bbj-module.ts` and this file a circular import.
 */
export interface BBjParserServiceContext {
    shared: {
        workspace: {
            WorkspaceManager: unknown;
        };
    };
    java: {
        JavaInteropService: JavaInteropService;
    };
}

/** The once-per-connection probe/latch state for whether the live parser endpoint exists. */
type ParserMode = 'unknown' | 'on' | 'off';

/**
 * Owns the once-per-connection probe latch for the `parseProgram` endpoint, the mode/failure log
 * lines, and the one-based-to-zero-based coordinate conversion (via {@link parseErrorToRange} /
 * {@link parseErrorsToDiagnostics}). Registered in the `compiler` service group beside
 * `BBjCPLService`.
 *
 * The first real parse on a connection IS the probe: no capability request, no empty-text probe,
 * no BBj version string is ever read, parsed or compared. A `MethodNotFound` error latches
 * the mode `'off'` for the current connection generation; any other outcome (a result, or an
 * application error, which proves the method exists) latches `'on'`. The latch resets whenever
 * `javaInteropService.connectionGeneration` changes — a post-outage reconnect or a Java-class
 * cache clear both bump it — so the next parse re-probes.
 */
export class BBjParserService {

    private readonly javaInteropService: JavaInteropService;
    private readonly workspaceManager: BBjParserWorkspaceManager;

    /** The mode decided for {@link decidedForGeneration}, or `'unknown'` if not yet decided. */
    private mode: ParserMode = 'unknown';
    /** The connection generation {@link mode} was decided for. */
    private decidedForGeneration = -1;
    /**
     * Failure kind tokens already reported (at warn) for the current connection generation —
     * see {@link logFailure}. A later occurrence of an already-reported kind logs at debug
     * instead, until a successful parse clears this set so the next outage warns again.
     */
    private readonly reportedFailureKinds = new Set<string>();
    /** The connection generation {@link reportedFailureKinds} currently belongs to. */
    private failureKindsGeneration = -1;

    constructor(services: BBjParserServiceContext) {
        this.javaInteropService = services.java.JavaInteropService;
        this.workspaceManager = services.shared.workspace.WorkspaceManager as BBjParserWorkspaceManager;
    }

    /**
     * True unless the latch for the current connection generation is `'off'`. Resets the latch to
     * `'unknown'` first when the interop service's connection generation has moved on since the
     * last decision, so a reconnect or cache clear always gets a fresh probe. An `'unknown'` latch
     * returns `true`: the first real parse IS the probe.
     */
    public isEnabled(): boolean {
        this.resetIfGenerationChanged();
        return this.mode !== 'off';
    }

    /**
     * Resets {@link mode} to `'unknown'` and {@link reportedFailureKinds} when the interop
     * connection has moved on since either was last touched.
     */
    private resetIfGenerationChanged(): void {
        const generation = this.javaInteropService.connectionGeneration;
        if (generation !== this.decidedForGeneration) {
            this.mode = 'unknown';
        }
        if (generation !== this.failureKindsGeneration) {
            this.reportedFailureKinds.clear();
            this.failureKindsGeneration = generation;
        }
    }

    /**
     * Sends the document's current text through `parseProgram` and returns the resulting
     * diagnostics. Never throws to the caller — every non-result outcome returns an empty array,
     * and no failure shape (an application error, a transport failure, a malformed result) ever
     * changes the on/off latch: an endpoint that answered at all still has the method. A
     * superseded request's `RequestCancelled` answer is the server's normal reply to ordinary
     * fast typing, checked first, and produces no diagnostic change and no log line at any level.
     * @param document the document to parse; its current (possibly unsaved) text is sent
     */
    public async requestLiveParse(document: LangiumDocument): Promise<Diagnostic[]> {
        this.resetIfGenerationChanged();
        const generation = this.javaInteropService.connectionGeneration;
        const params: ParseProgramParams = {
            text: document.textDocument.getText(),
            canonicalName: document.uri.fsPath,
            version: String(document.textDocument.version),
            prefixes: this.resolvePrefixes(),
            workspaceRoots: this.resolveWorkspaceRoots()
        };
        try {
            const result = await this.javaInteropService.parseProgram(params);
            if (!Array.isArray(result?.errors)) {
                this.logFailure(MALFORMED_RESULT_KIND, 'result.errors was missing or not an array');
                return [];
            }
            this.latchOn(generation);
            // A genuine successful parse re-arms the warn level for every failure kind.
            this.reportedFailureKinds.clear();
            return parseErrorsToDiagnostics(result.errors, document.textDocument.lineCount, getMaxErrors());
        } catch (e) {
            const code = (e as { code?: number } | undefined)?.code;
            if (code === LSPErrorCodes.RequestCancelled) {
                return [];
            }
            if (code === METHOD_NOT_FOUND) {
                this.latchOff(generation);
                return [];
            }
            const message = e instanceof Error ? e.message : String(e);
            this.logFailure(classifyFailureKind(code), message);
            return [];
        }
    }

    /**
     * Logs one failure log line, at warn for the first occurrence of `kind` on the current
     * connection generation and at debug for every repeat, until a successful parse clears
     * {@link reportedFailureKinds}. The line carries the kind and the error's own message only —
     * never the request's document text, at any level.
     */
    private logFailure(kind: string, message: string): void {
        const line = `Live compiler diagnostics: request failed (${kind}): ${message}`;
        if (this.reportedFailureKinds.has(kind)) {
            logger.debug(line);
        } else {
            this.reportedFailureKinds.add(kind);
            logger.warn(line);
        }
    }

    /** Latches the mode `'on'` for `generation`, logging the mode line once per generation. */
    private latchOn(generation: number): void {
        const firstDecision = this.mode === 'unknown' || this.decidedForGeneration !== generation;
        this.mode = 'on';
        this.decidedForGeneration = generation;
        if (firstDecision) {
            logger.info('Live compiler diagnostics: on');
        }
    }

    /** Latches the mode `'off'` for `generation`, logging the mode line once per generation. */
    private latchOff(generation: number): void {
        const firstDecision = this.mode === 'unknown' || this.decidedForGeneration !== generation;
        this.mode = 'off';
        this.decidedForGeneration = generation;
        if (firstDecision) {
            logger.info('Live compiler diagnostics: off (endpoint not available)');
        }
    }

    /** The workspace manager's resolved PREFIX list, or an empty array when unavailable. */
    private resolvePrefixes(): string[] {
        return this.workspaceManager.getSettings?.()?.prefixes ?? [];
    }

    /** The workspace folder paths, or an empty array when unavailable. */
    private resolveWorkspaceRoots(): string[] {
        return this.workspaceManager.getWorkspaceFolderUris?.().map(uri => uri.fsPath) ?? [];
    }
}
