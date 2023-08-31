import { AstNodeDescription, CompletionValueItem, DefaultCompletionProvider } from "langium";
import { CompletionItem } from "vscode-languageserver";
import { TextDocument } from 'vscode-languageserver-textdocument';
import { BBjNodeKindProvider } from "./bbj-document-symbol";

import { isFunctionNodeDescription, type FunctionNodeDescription } from "./bbj-nodedescription-provider";
export class BBjCompletionProvider extends DefaultCompletionProvider {

    override  createReferenceCompletionItem(nodeDescription: AstNodeDescription | FunctionNodeDescription): CompletionValueItem {
        const superImpl = super.createReferenceCompletionItem(nodeDescription)
        superImpl.kind = BBjNodeKindProvider.getCompletionItemKind(nodeDescription)
        if (superImpl && isFunctionNodeDescription(nodeDescription)) {
            const signature = (typeAdjust: ((type: string) => string) = (t) => t) =>
                `${nodeDescription.name}(${nodeDescription.parameters.map(p => `${typeAdjust(p.type)} ${p.name}`).join(', ')})`

            const retType = ': ' + toSimpleName(nodeDescription.returnType)

            superImpl.label = `${nodeDescription.name}(${nodeDescription.parameters.map(p => p.name).join(', ')})`
            superImpl.labelDetails = {
                detail: retType,
                description: signature(type => toSimpleName(type))
            }
            superImpl.insertText = `${nodeDescription.name}()`
            superImpl.detail = signature(type => toSimpleName(type)) + retType
            superImpl.documentation = signature() + retType

        }
        return superImpl;
    }

    override fillCompletionItem(document: TextDocument, offset: number, item: CompletionValueItem): CompletionItem | undefined {
        const superImpl = super.fillCompletionItem(document, offset, item);

        return superImpl;
    }
}

function toSimpleName(type: string): string {
    return type.split('.').pop() || type
}
