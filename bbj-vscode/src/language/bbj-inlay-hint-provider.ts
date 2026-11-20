import { AstNode, DocumentState, LangiumDocument, LangiumSharedCoreServices, OperationCancelled, delayNextTick } from 'langium';
import { AbstractInlayHintProvider, InlayHintAcceptor } from 'langium/lsp';
import { CancellationToken, InlayHint, InlayHintKind, InlayHintParams, LSPErrorCodes, ResponseError } from 'vscode-languageserver';
import type { BBjServices } from './bbj-module.js';
import { isFunctionNodeDescription } from './bbj-nodedescription-provider.js';
import { ArgumentType, argumentTypeOf, findBestOverload } from './bbj-overload-selector.js';
import type { TypeInferer } from './bbj-type-inferer.js';
import { Expression, isMethodCall, isNumberLiteral, isPrefixExpression, isStringLiteral } from './generated/ast.js';
import { getFunctionReference } from './utils.js';

export type ParameterHintMode = 'none' | 'literals' | 'all';

let parameterHintMode: ParameterHintMode = 'literals';

export function setParameterHintMode(mode: unknown): void {
    if (mode === 'none' || mode === 'literals' || mode === 'all') {
        parameterHintMode = mode;
    }
}

export function getParameterHintMode(): ParameterHintMode {
    return parameterHintMode;
}

/**
 * Names the JDK invents when a jar was compiled without -parameters (arg0, arg1, ...).
 * Showing them as hints is worse than showing nothing.
 */
const SYNTHETIC_NAME = /^(arg|param|p)\d+$/i;

/** How many times a request waits for the workspace to catch up with the client's text before it gives up. */
const MAX_FRESHNESS_ATTEMPTS = 3;

/**
 * Parameter name inlay hints at call sites (issue #108). Resolves the callee the same
 * way signature help does: through the reference's FunctionNodeDescription, which
 * normalizes BBj class methods, DEF FN functions, builtin library functions and Java
 * methods (with the Javadoc-backed realName fallback) into one parameter list.
 *
 * A didChange only queues the rebuild behind the workspace lock, so for a short while the
 * built document still carries the syntax tree of the previous text. Langium answers an inlay
 * request from that tree at once, and the client then maps the old line and column onto its
 * current text (issue #761: a hint inside a freshly typed REM line). This provider therefore
 * checks that the tree was parsed from the text the client holds, waits for the queued rebuild
 * when it was not, and fails with ContentModified, which clients ignore silently, when the
 * rebuild does not arrive within a bounded number of waits.
 */
export class BBjInlayHintProvider extends AbstractInlayHintProvider {

    protected readonly inferer: TypeInferer;
    protected readonly shared: LangiumSharedCoreServices;

    constructor(services: BBjServices) {
        super();
        this.inferer = services.types.Inferer;
        this.shared = services.shared;
    }

    override async getInlayHints(document: LangiumDocument, params: InlayHintParams, cancelToken: CancellationToken = CancellationToken.None): Promise<InlayHint[] | undefined> {
        if (this.isParseCurrent(document)) {
            return super.getInlayHints(document, params, cancelToken);
        }
        for (let attempt = 0; attempt < MAX_FRESHNESS_ATTEMPTS; attempt++) {
            await delayNextTick();
            await this.waitForQueuedWrites(cancelToken);
            // The rebuild may have replaced the document, so look it up again.
            const refreshed = this.shared.workspace.LangiumDocuments.getDocument(document.uri);
            if (refreshed && refreshed.state >= DocumentState.IndexedReferences && this.isParseCurrent(refreshed)) {
                return super.getInlayHints(refreshed, params, cancelToken);
            }
        }
        throw new ResponseError(LSPErrorCodes.ContentModified, 'The server has not yet built the text the client holds.');
    }

    /**
     * True when the syntax tree was parsed from the text the client currently holds. The
     * versions of the two text documents cannot tell: the built document keeps a reference to
     * the very instance held by the text document manager, and an edit mutates that instance
     * in place through TextDocument.update, so both always report the same version. The text
     * the tree was parsed from is the only reliable witness.
     */
    protected isParseCurrent(document: LangiumDocument): boolean {
        const live = this.shared.workspace.TextDocuments?.get(document.uri);
        if (!live) {
            return true;
        }
        const parsedText = document.parseResult.value.$cstNode?.root.fullText;
        return parsedText === undefined || parsedText === live.getText();
    }

    /**
     * Resolves once every write queued before this call has finished (reads only run when the
     * write queue is empty). The read does nothing itself, so it is purely a barrier. It takes
     * no cancellation token, so the wait is raced against the request's token; an abandoned
     * read entry resolves harmlessly later.
     */
    protected waitForQueuedWrites(cancelToken: CancellationToken): Promise<void> {
        if (cancelToken.isCancellationRequested) {
            return Promise.reject(OperationCancelled);
        }
        return new Promise<void>((resolve, reject) => {
            const listener = cancelToken.onCancellationRequested(() => {
                listener.dispose();
                reject(OperationCancelled);
            });
            this.shared.workspace.WorkspaceLock.read(() => undefined).then(
                () => {
                    listener.dispose();
                    resolve();
                },
                error => {
                    listener.dispose();
                    reject(error);
                }
            );
        });
    }

    override computeInlayHint(node: AstNode, acceptor: InlayHintAcceptor): void {
        if (parameterHintMode === 'none') {
            return;
        }
        if (!isMethodCall(node) || node.args.length === 0) {
            return;
        }
        const ref = getFunctionReference(node);
        // Access .ref so lazily linked references are resolved before reading the description
        if (!ref?.ref) {
            return;
        }
        const description = ref.$nodeDescription;
        if (!isFunctionNodeDescription(description)) {
            return;
        }
        const calleeName = description.name.toLowerCase();
        // The linker links an overloaded name to one arbitrary declaration; hint from
        // the overload that actually fits the call's argument count and types (#478).
        const argTypes = node.args.map(arg => this.argumentType(arg.expression));
        const parameters = findBestOverload(ref.ref, description, argTypes).parameters;
        // Extra arguments beyond the declared parameters (varargs, arity errors) get no hint
        const count = Math.min(node.args.length, parameters.length);
        for (let i = 0; i < count; i++) {
            const cst = node.args[i].$cstNode;
            if (!cst) {
                continue;
            }
            const parameter = parameters[i];
            const name = (parameter.realName ?? parameter.name)?.trim();
            if (!name || SYNTHETIC_NAME.test(stripTypeSuffix(name))) {
                continue;
            }
            if (parameterHintMode === 'literals' && !isLiteralArgument(node.args[i].expression)) {
                continue;
            }
            if (matchesParameterName(cst.text, name) || isSelfDescribing(calleeName, name)) {
                continue;
            }
            acceptor({
                position: cst.range.start,
                label: `${name}:`,
                kind: InlayHintKind.Parameter,
                paddingRight: true
            });
        }
    }

    /** The call-site knowledge about an argument's type, used to rank overloads. */
    protected argumentType(expression: Expression): ArgumentType {
        return argumentTypeOf(expression, this.inferer);
    }
}

/**
 * True for arguments whose value carries no name of its own: string/number literals,
 * optionally behind a numeric sign (-1, +0.5). Everything else (variables, calls,
 * arithmetic) is considered self-describing in 'literals' mode.
 */
export function isLiteralArgument(expression: Expression): boolean {
    if (isPrefixExpression(expression) && (expression.operator === '-' || expression.operator === '+')) {
        return isLiteralArgument(expression.expression);
    }
    return isNumberLiteral(expression) || isStringLiteral(expression);
}

/** BBj variable names carry type suffixes (name$, obj!, i%) that must not defeat name comparisons. */
function stripTypeSuffix(name: string): string {
    return name.replace(/[!$%]$/, '');
}

/**
 * A hint is redundant when the argument is a plain identifier already spelling the
 * parameter name: foo(count) for foo(count). Case-insensitive (BBj), ignoring type
 * suffixes and instance access: foo(#count!) matches parameter "count".
 */
export function matchesParameterName(argumentText: string, parameterName: string): boolean {
    const identifier = /^#?([a-zA-Z_][a-zA-Z0-9_]*)[!$%]?$/.exec(argumentText.trim());
    return identifier !== null
        && identifier[1].toLowerCase() === stripTypeSuffix(parameterName).toLowerCase();
}

/**
 * setName(x$) style: the callee name already contains the parameter name, so a hint
 * adds nothing. Only applied to names of 3+ characters to avoid accidental substrings.
 */
export function isSelfDescribing(calleeName: string, parameterName: string): boolean {
    const bare = stripTypeSuffix(parameterName).toLowerCase();
    return bare.length >= 3 && calleeName.includes(bare);
}
