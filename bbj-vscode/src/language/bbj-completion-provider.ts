import { CompletionAcceptor, CompletionContext, CompletionValueItem, DefaultCompletionProvider, LangiumServices, NextFeature } from "langium/lsp";
import { AstUtils, AstNodeDescription, MaybePromise, Reference, ReferenceInfo, GrammarAST } from "langium";
import { CompletionItemKind } from "vscode-languageserver";
import { documentationHeader, methodSignature } from "./bbj-hover.js";
import { isFunctionNodeDescription, type FunctionNodeDescription } from "./bbj-nodedescription-provider.js";
import { LibEventType, LibSymbolicLabelDecl } from "./generated/ast.js";

export class BBjCompletionProvider extends DefaultCompletionProvider {

    constructor(services: LangiumServices) {
        super(services);
    }
    override  createReferenceCompletionItem(nodeDescription: AstNodeDescription | FunctionNodeDescription): CompletionValueItem {
        const superImpl = super.createReferenceCompletionItem(nodeDescription)
        superImpl.kind = this.nodeKindProvider.getCompletionItemKind(nodeDescription)
        superImpl.sortText = undefined
        if (isFunctionNodeDescription(nodeDescription)) {

            const label = (paramAdjust: ((param: string, index: number) => string) = (p, i) => p) =>
                `${nodeDescription.name}(${nodeDescription.parameters.filter(p => !p.optional).map((p, idx) => paramAdjust(p.name, idx)).join(', ')})`

            const retType = ': ' + toSimpleName(nodeDescription.returnType)
            // TODO load param names for java methods from Javadoc
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
                // TODO Add docu to description?
                const content = documentationHeader(nodeDescription.node)
                if (content) {
                    superImpl.documentation = { kind: 'markdown', value: content }
                }
            }
        } else if (nodeDescription.type === LibSymbolicLabelDecl) {
            superImpl.label = nodeDescription.name
            superImpl.sortText = superImpl.label.slice(1) // remove * so that symbolic labels appear in the alphabetical order
        } else if (nodeDescription.type === LibEventType && 'docu' in nodeDescription && typeof nodeDescription.docu === "string") {
            superImpl.detail = nodeDescription.docu;
        }
        return superImpl;
    }

    /**
     * Need to override to control deduplicate filtering
     */
    protected override completionForCrossReference(context: CompletionContext, crossRef: NextFeature<GrammarAST.CrossReference>, acceptor: CompletionAcceptor): MaybePromise<void> {
        const assignment = AstUtils.getContainerOfType(crossRef.feature, GrammarAST.isAssignment);
        let node = context.node;
        if (assignment && node) {
            if (crossRef.type) {
                node = {
                    $type: crossRef.type,
                    $container: node,
                    $containerProperty: crossRef.property
                };
            }
            if (!context) {
                return;
            }
            const refInfo: ReferenceInfo = {
                reference: {} as Reference,
                container: node,
                property: assignment.feature
            };
            try {
                this.getReferenceCandidates(refInfo, context).forEach(
                    c => acceptor(context, this.createReferenceCompletionItem(c))
                );
            } catch (err) {
                console.error(err);
            }
        }
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
