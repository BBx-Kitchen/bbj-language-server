import { AstNode, AstUtils, LangiumDocument } from 'langium';
import { DefaultDocumentSymbolProvider, LangiumServices } from 'langium/lsp';
import { DocumentSymbol, DocumentSymbolParams } from 'vscode-languageserver';
import { JavaSyntheticDocUri } from './java-interop.js';

const LARGE_FILE_THRESHOLD = 200_000; // ~10,000 lines at 20 chars/line

/**
 * Error-safe document symbol provider for BBj.
 *
 * Extends Langium's DefaultDocumentSymbolProvider with:
 * - Per-node try/catch so a single broken AST node cannot blank the entire outline
 * - '(parse error)' fallback label for nodes whose name property is empty or missing at runtime
 * - Deep-walk fallback using AstUtils.streamAllContents to recover symbols after error points
 *   that the shallow streamContents walk may miss
 * - Guard for synthetic/library documents (JavaSyntheticDocUri, bbjlib:// scheme) that
 *   delegates immediately to the parent implementation
 */
export class BBjDocumentSymbolProvider extends DefaultDocumentSymbolProvider {

    constructor(services: LangiumServices) {
        super(services);
    }

    override getSymbols(document: LangiumDocument, params: DocumentSymbolParams): DocumentSymbol[] {
        // Guard: synthetic/library documents don't need error-recovery; delegate to the base
        // implementation which may itself return a Promise — but synthetic documents never do
        // in practice. We cast the result to DocumentSymbol[] because synthetic documents
        // always return synchronously (confirmed: no async code in DefaultDocumentSymbolProvider).
        if (
            document.uri.toString() === JavaSyntheticDocUri ||
            document.uri.scheme === 'bbjlib'
        ) {
            try {
                return super.getSymbols(document, params) as DocumentSymbol[];
            } catch {
                return [];
            }
        }

        try {
            const rootNode = document.parseResult.value;
            const symbols = this.getSymbol(document, rootNode);

            // Deep-walk fallback: when there are parse errors and the file isn't huge,
            // scan the full AST to recover any symbols that streamContents missed because
            // their parent container node was broken.
            const hasParseErrors =
                (document.parseResult.parserErrors?.length ?? 0) > 0 ||
                (document.parseResult.lexerErrors?.length ?? 0) > 0;

            if (hasParseErrors && document.textDocument.getText().length < LARGE_FILE_THRESHOLD) {
                this.applyDeepWalkFallback(document, rootNode, symbols);
            }

            return symbols;
        } catch {
            // If traversal fails entirely, return empty — never throw to client
            return [];
        }
    }

    override getSymbol(document: LangiumDocument, astNode: AstNode): DocumentSymbol[] {
        try {
            const nameNode = this.nameProvider.getNameNode(astNode);

            if (nameNode && astNode.$cstNode) {
                // Happy path: both the name CST node and the containing CST node exist
                const computedName = this.nameProvider.getName(astNode);
                const displayName = (computedName && computedName.trim()) ? computedName : '(parse error)';
                return [this.createSymbol(document, astNode, astNode.$cstNode, nameNode, displayName)];
            }

            // Error-recovery path: name property exists on AST but nameProvider couldn't find its CST node
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const name = (astNode as any).name;
            if (typeof name === 'string' && name.trim() && astNode.$cstNode) {
                // Use the node's own CST node as both range and selectionRange
                return [this.createSymbol(document, astNode, astNode.$cstNode, astNode.$cstNode, name.trim())];
            }

            // Broken-name path: CST exists but no usable name — emit a '(parse error)' symbol
            // so the node and its children remain visible in the outline
            if (astNode.$cstNode && !nameNode) {
                // Only emit a fallback symbol if this node type would normally produce a named symbol
                // (i.e. getChildSymbols alone won't represent it). We check whether the node has a
                // 'name' property key at all (grammar declares it), even if value is missing.
                const hasNameProperty = 'name' in astNode;
                if (hasNameProperty) {
                    const children = this.getChildSymbols(document, astNode);
                    const symbol: DocumentSymbol = {
                        kind: this.nodeKindProvider.getSymbolKind(astNode),
                        name: '(parse error)',
                        range: astNode.$cstNode.range,
                        selectionRange: astNode.$cstNode.range,
                        children: children ?? undefined
                    };
                    return [symbol];
                }
            }

            // No $cstNode at all, or unnamed container node — recurse into children
            return this.getChildSymbols(document, astNode) ?? [];
        } catch {
            // Per-node guard: skip this node, don't propagate the error
            return [];
        }
    }

    override getChildSymbols(document: LangiumDocument, astNode: AstNode): DocumentSymbol[] | undefined {
        const children: DocumentSymbol[] = [];
        try {
            for (const child of AstUtils.streamContents(astNode)) {
                try {
                    const result = this.getSymbol(document, child);
                    children.push(...result);
                } catch {
                    // Skip individual broken children — continue with the rest
                }
            }
        } catch {
            // streamContents threw (shouldn't happen but guard anyway)
        }
        return children.length > 0 ? children : undefined;
    }

    /**
     * Deep-walk fallback: find named nodes that streamContents missed because their parent
     * container was broken. Adds them as flat top-level entries in the symbol list.
     *
     * Only called at the root level when parse errors are present and the file is under
     * the large-file threshold, so performance impact on valid files is zero.
     */
    private applyDeepWalkFallback(
        document: LangiumDocument,
        rootNode: AstNode,
        existingSymbols: DocumentSymbol[]
    ): void {
        try {
            // Build a set of encoded positions already represented in the existing symbols
            const coveredPositions = new Set<number>();
            this.collectPositions(existingSymbols, coveredPositions);

            // Walk the entire AST and collect named nodes not yet covered
            for (const node of AstUtils.streamAllContents(rootNode)) {
                try {
                    if (!node.$cstNode) continue;

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const name = (node as any).name;
                    const hasName = (typeof name === 'string' && name.trim()) ||
                                    !!this.nameProvider.getNameNode(node);
                    if (!hasName) continue;

                    const pos = node.$cstNode.range.start.line * 100_000 + node.$cstNode.range.start.character;
                    if (coveredPositions.has(pos)) continue;

                    // This named node is missing from the outline — add it as a flat entry
                    const recovered = this.getSymbol(document, node);
                    if (recovered.length > 0) {
                        existingSymbols.push(...recovered);
                        coveredPositions.add(pos);
                    }
                } catch {
                    // skip individual node in fallback walk
                }
            }
        } catch {
            // deep walk fallback failure is non-fatal
        }
    }

    private collectPositions(symbols: DocumentSymbol[], positions: Set<number>): void {
        for (const sym of symbols) {
            // Encode start position as a single number to avoid collisions
            const key = sym.range.start.line * 100_000 + sym.range.start.character;
            positions.add(key);
            if (sym.children) {
                this.collectPositions(sym.children, positions);
            }
        }
    }
}
