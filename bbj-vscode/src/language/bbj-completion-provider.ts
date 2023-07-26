import { AstNodeDescription, CompletionValueItem, DefaultCompletionProvider } from "langium";
import { CompletionItem , CompletionItemKind} from "vscode-languageserver";
import { TextDocument } from 'vscode-languageserver-textdocument';
import { BBjNodeKindProvider } from "./bbj-document-symbol";


export class BBjCompletionProvider extends DefaultCompletionProvider {

    override  createReferenceCompletionItem(nodeDescription: AstNodeDescription): CompletionValueItem {
        const superImpl = super.createReferenceCompletionItem(nodeDescription)
        superImpl.kind = BBjNodeKindProvider.getCompletionItemKind(nodeDescription)
        return superImpl;
    }
    
    override fillCompletionItem(document: TextDocument, offset: number, item: CompletionValueItem): CompletionItem | undefined {
        const superImpl = super.fillCompletionItem(document, offset, item);
        if(superImpl && item.kind === CompletionItemKind.Function) {
            // TODO better do it in createReferenceCompletionItem
            superImpl.label = superImpl.label + '()'
            superImpl.textEdit = this.buildCompletionTextEdit(document, offset, superImpl.label, superImpl.label);
        }
        return superImpl;
    }
}