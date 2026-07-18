import { AstUtils, DocumentValidator } from 'langium';
import type { LangiumDocument } from 'langium';
import { CodeActionProvider } from 'langium/lsp';
import { CodeAction, CodeActionKind, CodeActionParams, Command, Diagnostic, Position, TextEdit } from 'vscode-languageserver';
import { BBjServices } from './bbj-module.js';
import { JavaInteropService } from './java-interop.js';
import { isBBjTypeRef, isJavaTypeRef, isSimpleTypeRef, isUse } from './generated/ast.js';
import { findLeafNodeAtOffset } from './bbj-validator.js';

/**
 * Offers "Add 'use <fqn>'" quick-fixes for an unresolved Java class reference (issue #447),
 * mirroring the auto-import assist that Java IDEs provide.
 *
 * The candidate lookup is served entirely from the language server's own Java class index
 * (see {@link JavaInteropService.findClassCandidatesBySimpleName}) — no new BBj-side interop
 * capability is required, so this works against the already-shipped interop service.
 */
export class BBjCodeActionProvider implements CodeActionProvider {

    protected readonly javaInterop: JavaInteropService;

    constructor(services: BBjServices) {
        this.javaInterop = services.java.JavaInteropService;
    }

    async getCodeActions(document: LangiumDocument, params: CodeActionParams): Promise<Array<Command | CodeAction> | undefined> {
        const linkingDiagnostics = params.context.diagnostics.filter(isLinkingDiagnostic);
        if (linkingDiagnostics.length === 0) {
            return undefined;
        }

        const actions: CodeAction[] = [];
        for (const diagnostic of linkingDiagnostics) {
            const simpleName = this.unresolvedClassName(document, diagnostic);
            if (!simpleName) {
                continue;
            }
            // Resolve candidate FQNs (index + a targeted probe of common packages so classes
            // such as HashMap, which are not implicit imports, are still suggestable).
            const candidates = rankCandidates(await this.javaInterop.resolveClassCandidatesBySimpleName(simpleName));
            candidates.forEach((fqn, index) => {
                actions.push(this.createUseAction(document, diagnostic, fqn, index === 0 && candidates.length === 1));
            });
        }
        return actions.length > 0 ? actions : undefined;
    }

    /**
     * Returns the simple class name of an unresolved class reference the diagnostic points at,
     * or undefined if the diagnostic is not on a (simple, unqualified) class reference.
     */
    protected unresolvedClassName(document: LangiumDocument, diagnostic: Diagnostic): string | undefined {
        const rootCst = document.parseResult.value.$cstNode;
        if (!rootCst) {
            return undefined;
        }
        const offset = document.textDocument.offsetAt(diagnostic.range.start);
        const node = findLeafNodeAtOffset(rootCst, offset)?.astNode;
        if (!node) {
            return undefined;
        }
        // Only class-type references can be fixed with a `use` statement.
        const isClassRef = (n = node) => isBBjTypeRef(n) || isSimpleTypeRef(n) || isJavaTypeRef(n);
        if (!isClassRef() && !(node.$container && isClassRef(node.$container))) {
            return undefined;
        }
        const text = document.textDocument.getText(diagnostic.range).trim();
        // Already-qualified references (java.util.HashMap) or empty ranges are not candidates.
        if (!text || text.includes('.')) {
            return undefined;
        }
        return text;
    }

    protected createUseAction(document: LangiumDocument, diagnostic: Diagnostic, fqn: string, preferred: boolean): CodeAction {
        const edit = TextEdit.insert(this.useInsertPosition(document), `use ${fqn}\n`);
        return {
            title: `Add 'use ${fqn}'`,
            kind: CodeActionKind.QuickFix,
            diagnostics: [diagnostic],
            isPreferred: preferred,
            edit: {
                changes: {
                    [document.textDocument.uri]: [edit]
                }
            }
        };
    }

    /** Insert new `use` statements right after the last existing one, or at the top of the file. */
    protected useInsertPosition(document: LangiumDocument): Position {
        let line = 0;
        for (const use of AstUtils.streamAllContents(document.parseResult.value)) {
            if (isUse(use) && use.$cstNode) {
                line = Math.max(line, use.$cstNode.range.end.line + 1);
            }
        }
        return Position.create(line, 0);
    }
}

function isLinkingDiagnostic(diagnostic: Diagnostic): boolean {
    const data = diagnostic.data as { code?: string } | undefined;
    return data?.code === DocumentValidator.LinkingError;
}

/** Rank standard-library and BASIS packages ahead of the rest, then alphabetically. */
function rankCandidates(fqns: string[]): string[] {
    const rank = (fqn: string) =>
        fqn.startsWith('java.') ? 0
            : fqn.startsWith('javax.') ? 1
                : fqn.startsWith('com.basis.') ? 2
                    : 3;
    return [...fqns].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}
