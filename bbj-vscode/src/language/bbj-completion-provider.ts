import { AstNodeDescription, CompletionAcceptor, CompletionContext, CompletionValueItem, DefaultCompletionProvider, LangiumServices, MaybePromise, NextFeature, Reference, ReferenceInfo, getContainerOfType } from "langium";
import { BBjNodeKindProvider } from "./bbj-document-symbol";

import { CrossReference, Keyword, isAssignment } from "langium/lib/grammar/generated/ast";
import { CompletionItemKind, MarkupContent } from "vscode-languageserver";
import { documentationContent, methodSignature } from "./bbj-hover";
import { isFunctionNodeDescription, type FunctionNodeDescription } from "./bbj-nodedescription-provider";
import { LibSymbolicLabelDecl } from "./generated/ast";

export class BBjCompletionProvider extends DefaultCompletionProvider {

    constructor(services: LangiumServices) {
        super(services);
    }
    override  createReferenceCompletionItem(nodeDescription: AstNodeDescription | FunctionNodeDescription): CompletionValueItem {
        const superImpl = super.createReferenceCompletionItem(nodeDescription)
        superImpl.kind = BBjNodeKindProvider.getCompletionItemKind(nodeDescription)
        superImpl.sortText = undefined
        if (isFunctionNodeDescription(nodeDescription)) {

            const label = (paramAdjust: ((param: string, index: number) => string) = (p, i) => p) =>
                `${nodeDescription.name}(${nodeDescription.parameters.filter(p => !p.optional).map((p, idx) => paramAdjust(p.name, idx)).join(', ')})`

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
                // TODO Add docu to description?
                const content = documentationContent(nodeDescription.node)?.contents as MarkupContent
                if (content) {
                    superImpl.documentation = { kind: content.kind, value: content.value }
                }
            }
        } else if(nodeDescription.type === LibSymbolicLabelDecl ) {
            superImpl.label = nodeDescription.name
            superImpl.sortText = superImpl.label.slice(1) // remove * so that symbolic labels appear in the alphabetical order
        }
        return superImpl;
    }

    /**
     * Need to override to control deduplicate filtering
     */
    protected override completionForCrossReference(context: CompletionContext, crossRef: NextFeature<CrossReference>, acceptor: CompletionAcceptor): MaybePromise<void> {
        const assignment = getContainerOfType(crossRef.feature, isAssignment);
        let node = context.node;
        if (assignment && node) {
            if (crossRef.type && (crossRef.new || node.$type !== crossRef.type)) {
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
                const scope = this.scopeProvider.getScope(refInfo);
                scope.getAllElements().forEach(e => {
                    if (this.filterCrossReference(e)) {
                        acceptor(this.createReferenceCompletionItem(e));
                    }
                });
            } catch (err) {
                console.error(err);
            }
        }
    }
    protected override completionForKeyword(context: CompletionContext, keyword: Keyword, acceptor: CompletionAcceptor): MaybePromise<void> {
        // Filter out keywords that do not contain any word character
        if (!keyword.value.match(/[\w]/)) {
            return;
        }
        acceptor({
            label: keyword.value,
            kind: CompletionItemKind.Keyword,
            detail: 'Keyword',
            sortText: undefined
        });
    }
}


function toSimpleName(type: string): string {
    return type.split('.').pop() || type
}
