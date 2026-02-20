import { AstNodeDescription, AstUtils, GrammarAST, MaybePromise, ReferenceInfo } from "langium";
import type { LangiumDocument } from "langium";
import { CompletionAcceptor, CompletionContext, CompletionValueItem, DefaultCompletionProvider, LangiumServices } from "langium/lsp";
import { CancellationToken, CompletionItem, CompletionItemKind, CompletionList, CompletionParams } from "vscode-languageserver";
import { documentationHeader, methodSignature } from "./bbj-hover.js";
import { isFunctionNodeDescription, type FunctionNodeDescription, getClass } from "./bbj-nodedescription-provider.js";
import { BbjClass, FieldDecl, isBbjClass, isDocumented, isFieldDecl, isMethodDecl, LibEventType, LibSymbolicLabelDecl } from "./generated/ast.js";
import { findLeafNodeAtOffset } from "./bbj-validator.js";


export class BBjCompletionProvider extends DefaultCompletionProvider {

    override readonly completionOptions = {
        triggerCharacters: ['#']
    };

    constructor(services: LangiumServices) {
        super(services);
    }

    override async getCompletion(document: LangiumDocument, params: CompletionParams, cancelToken?: CancellationToken): Promise<CompletionList | undefined> {
        if (params.context?.triggerCharacter === '#') {
            return this.getFieldCompletion(document, params);
        }
        return super.getCompletion(document, params, cancelToken);
    }

    protected async getFieldCompletion(document: LangiumDocument, params: CompletionParams): Promise<CompletionList> {
        // Get cursor position (the # has already been typed)
        const offset = document.textDocument.offsetAt(params.position);
        const rootNode = document.parseResult.value;

        // Find the leaf node at the # character position (cursor is after #, so offset - 1)
        if (!rootNode.$cstNode) {
            return { items: [], isIncomplete: false };
        }
        const leafNode = findLeafNodeAtOffset(rootNode.$cstNode, offset - 1);

        if (!leafNode) {
            return { items: [], isIncomplete: false };
        }

        // Check if cursor is inside a class method body
        const method = AstUtils.getContainerOfType(leafNode.astNode, isMethodDecl);
        const klass = AstUtils.getContainerOfType(leafNode.astNode, isBbjClass);

        if (!method || !klass) {
            // Not inside a class method — don't provide field completion
            return { items: [], isIncomplete: false };
        }

        // Collect fields from the class and its inheritance hierarchy
        const fields = this.collectFields(klass);

        // Convert to completion items
        const items: CompletionItem[] = fields.map(field => {
            const fieldClass = getClass(field.type);
            const fieldType = fieldClass?.name ?? 'Object';
            return {
                label: field.name,
                kind: CompletionItemKind.Variable,
                detail: `${fieldType} field`,
                insertText: field.name,  // Insert field name without #
                sortText: field.name
            };
        });

        return { items, isIncomplete: false };
    }

    protected collectFields(klass: BbjClass): FieldDecl[] {
        const fields: FieldDecl[] = [];
        const visited = new Set<BbjClass>();
        const maxDepth = 20;

        // Add fields from current class (all visibilities)
        fields.push(...klass.members.filter(isFieldDecl));

        // Add inherited fields (protected and public only)
        this.collectInheritedFields(klass, fields, visited, 0, maxDepth);

        return fields;
    }

    protected collectInheritedFields(
        klass: BbjClass,
        fields: FieldDecl[],
        visited: Set<BbjClass>,
        depth: number,
        maxDepth: number
    ): void {
        // Cycle protection
        if (visited.has(klass) || depth >= maxDepth) {
            return;
        }
        visited.add(klass);

        // Walk superclass chain
        for (const extendsQualifiedClass of klass.extends) {
            const superClass = getClass(extendsQualifiedClass);

            // Skip unresolved superclass references or non-BBj classes
            if (!superClass || !isBbjClass(superClass)) {
                continue;
            }

            // Collect inherited fields (protected and public only, not private)
            const inheritedFields = superClass.members
                .filter(isFieldDecl)
                .filter(f => {
                    const visibility = f.visibility?.toUpperCase() ?? 'PUBLIC';
                    return visibility === 'PUBLIC' || visibility === 'PROTECTED';
                });

            fields.push(...inheritedFields);

            // Recursively get superclass hierarchy
            this.collectInheritedFields(superClass, fields, visited, depth + 1, maxDepth);
        }
    }

    override createReferenceCompletionItem(nodeDescription: AstNodeDescription | FunctionNodeDescription, _refInfo: ReferenceInfo, _context: CompletionContext): CompletionValueItem {
        const superImpl = super.createReferenceCompletionItem(nodeDescription, _refInfo, _context)
        superImpl.kind = this.nodeKindProvider.getCompletionItemKind(nodeDescription)
        superImpl.sortText = undefined
        if (isFunctionNodeDescription(nodeDescription)) {

            const label = (paramAdjust: ((param: string, index: number) => string) = (p, i) => p) =>
                `${nodeDescription.name}(${nodeDescription.parameters.filter(p => !p.optional).map((p, idx) => paramAdjust(p.realName ?? p.name, idx)).join(', ')})`

            const retType = ': ' + toSimpleName(nodeDescription.returnType)
            const signature = methodSignature(nodeDescription, type => toSimpleName(type))

            superImpl.label = label()
            superImpl.labelDetails = {
                detail: retType,
                description: signature
            }
            superImpl.insertTextFormat = 2 // activate snippet syntax
            superImpl.insertText = label((p, i) => "${" + (i + 1) + ":" + p + "}")  // snippet syntax: ${1:foo} ${2:bar}
            superImpl.detail = signature
            if (nodeDescription.node) {
                // Build documentation from node's pre-populated docu field (set by java-interop.ts
                // during class resolution from Javadoc) or fall back to the signature header.
                const node = nodeDescription.node;
                if (isDocumented(node) && node.docu) {
                    const parts: string[] = [];
                    if (node.docu.signature) {
                        parts.push(`\`\`\`java\n${node.docu.signature}\n\`\`\``);
                    }
                    if (node.docu.javadoc) {
                        parts.push(node.docu.javadoc);
                    }
                    if (parts.length > 0) {
                        superImpl.documentation = { kind: 'markdown', value: parts.join('\n\n') };
                    }
                }
                if (!superImpl.documentation) {
                    const content = documentationHeader(node);
                    if (content) {
                        superImpl.documentation = { kind: 'markdown', value: content };
                    }
                }
            }
        } else if (nodeDescription.type === LibSymbolicLabelDecl.$type) {
            superImpl.label = nodeDescription.name
            superImpl.sortText = superImpl.label.slice(1) // remove * so that symbolic labels appear in the alphabetical order
        } else if (nodeDescription.type === LibEventType.$type && 'docu' in nodeDescription && typeof nodeDescription.docu === "string") {
            superImpl.detail = nodeDescription.docu;
        }
        return superImpl;
    }

    protected override completionForKeyword(context: CompletionContext, keyword: GrammarAST.Keyword, acceptor: CompletionAcceptor): MaybePromise<void> {
        // Filter out keywords that do not contain any word character
        if (!keyword.value.match(/[\w]/)) {
            return;
        }
        acceptor(context, {
            label: keyword.value?.toLowerCase(),
            kind: CompletionItemKind.Keyword,
            detail: 'Keyword',
            sortText: undefined
        });
    }
}


function toSimpleName(type: string): string {
    return type.split('.').pop() || type
}
