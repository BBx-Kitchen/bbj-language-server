import { LangiumDocument } from 'langium';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { getMaxErrors } from './bbj-document-validator.js';
import { clearAllVerdictStates } from './bbj-diagnostic-reconciliation.js';
import { classifyInteropError, FailureLogCadence, MALFORMED_RESULT_KIND } from './java-interop-errors.js';
import { JavaInteropService, ParseError, ParseProgramParams } from './java-interop.js';
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
 * than producing a zero-width marker. An `editorEndLine` reported before `editorStartLine` is
 * clamped up to `startLine` — mirroring the same defensive posture for the character axis —
 * so the result is never an inverted `Range`, which a JVM language client's deserializer may
 * reject outright, hiding every diagnostic for the document.
 * @param error the parser's own error DTO, one-based lines and characters
 * @param lineCount the document's current line count, used to clamp an out-of-range line
 */
export function parseErrorToRange(error: ParseError, lineCount: number): Range {
    const clampLine = (oneBasedLine: number) =>
        Math.min(Math.max(oneBasedLine - 1, 0), Math.max(lineCount - 1, 0));
    const startLine = clampLine(error.editorStartLine);
    const endLine = Math.max(clampLine(error.editorEndLine), startLine);
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
 * The four outcomes {@link BBjParserService.requestLiveParse} can classify a request into:
 * - `verdict`: BBj's parser answered for the document's current text. `diagnostics` is BBj's own
 *   opinion, converted and capped — possibly empty, which is itself a verdict (the document has no
 *   errors), not the absence of one.
 * - `failed`: the request reached the endpoint but did not produce a usable result (an application
 *   error, a transport failure, or a malformed result). No verdict for this cycle.
 * - `unavailable`: the endpoint does not exist on this connection (`MethodNotFound`). No verdict for
 *   this cycle, and the on/off latch has just flipped off.
 * - `cancelled`: the request was superseded by a newer one, the server's ordinary answer to fast
 *   typing. Not a failure and not a verdict — this cycle produced nothing to act on.
 */
export type LiveParseOutcome =
    | { kind: 'verdict'; diagnostics: Diagnostic[] }
    | { kind: 'failed' }
    | { kind: 'unavailable' }
    | { kind: 'cancelled' };

/**
 * The classified kinds that keep their own token in the live-parse failure log: the endpoint's
 * own application errors for a parse. Every other classified kind (the format and DENUM codes,
 * invalid parameters, a connection failure) logs as `transport`, so the live-parse log text is the
 * same as it was before the shared classifier existed. A cancelled request and a missing method are
 * handled before any logging.
 */
const LIVE_PARSE_LOGGED_KINDS: ReadonlySet<string> = new Set([
    'parser-exception', 'timeout', 'size-cap', 'service-unavailable', 'protected-program'
]);

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
 * the mode `'off'` for the current connection generation, and a result carrying an `errors` array
 * latches it `'on'`. Every other outcome (an application error, a transport failure, a result
 * without an `errors` array) leaves the latch as it was. The latch resets whenever
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
     * The warn-then-debug cadence of the failure log — see {@link logFailure}. A later occurrence
     * of an already-reported kind logs at debug instead, until a successful parse or a new
     * connection generation re-arms warn so the next outage warns again.
     */
    private readonly failureLogCadence = new FailureLogCadence();

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
     * Resets {@link mode} to `'unknown'` and re-arms the warn level of {@link failureLogCadence}
     * when the interop connection has moved on since either was last touched. A connection change
     * while the latch was already decided (a reconnect, or a Java-class cache clear, after `'on'`
     * or `'off'` had been latched) also clears every document's verdict state, once — the server
     * behind the socket may not be the same one those verdicts were decided against. Undecided-latch calls
     * (repeated probes before the first real parse) never repeat that clear: {@link mode} stays
     * `'unknown'` between them, so the guard below only fires on an actual decided-to-undecided
     * transition.
     */
    private resetIfGenerationChanged(): void {
        const generation = this.javaInteropService.connectionGeneration;
        if (generation !== this.decidedForGeneration) {
            if (this.mode !== 'unknown') {
                clearAllVerdictStates();
            }
            this.mode = 'unknown';
        }
        this.failureLogCadence.syncGeneration(generation);
    }

    /**
     * Sends the document's current text through `parseProgram` and classifies the outcome — see
     * {@link LiveParseOutcome}. Never throws to the caller. No failure shape (an application error,
     * a transport failure, a malformed result) ever changes the on/off latch: an endpoint that
     * answered at all still has the method. A superseded request's `RequestCancelled` answer is the
     * server's normal reply to ordinary fast typing, checked first, and produces no diagnostic
     * change and no log line at any level.
     * @param document the document to parse; its current (possibly unsaved) text is sent
     */
    public async requestLiveParse(document: LangiumDocument): Promise<LiveParseOutcome> {
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
                return { kind: 'failed' };
            }
            this.latchOn(generation);
            // A genuine successful parse re-arms the warn level for every failure kind.
            this.failureLogCadence.clear();
            const diagnostics = parseErrorsToDiagnostics(result.errors, document.textDocument.lineCount, getMaxErrors());
            return { kind: 'verdict', diagnostics };
        } catch (e) {
            const failure = classifyInteropError(e);
            if (failure.kind === 'cancelled') {
                return { kind: 'cancelled' };
            }
            if (failure.kind === 'method-not-found') {
                this.latchOff(generation);
                return { kind: 'unavailable' };
            }
            this.logFailure(LIVE_PARSE_LOGGED_KINDS.has(failure.kind) ? failure.kind : 'transport', failure.message);
            return { kind: 'failed' };
        }
    }

    /**
     * Logs one failure log line, at warn for the first occurrence of `kind` on the current
     * connection generation and at debug for every repeat, until a successful parse re-arms
     * {@link failureLogCadence}. The line carries the kind and the error's own message only —
     * never the request's document text, at any level.
     */
    private logFailure(kind: string, message: string): void {
        const line = `Live compiler diagnostics: request failed (${kind}): ${message}`;
        this.failureLogCadence.report(kind, line);
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
