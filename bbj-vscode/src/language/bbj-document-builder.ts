import { AstNode, BuildOptions, DefaultDocumentBuilder, LangiumDocument } from "langium";


export class BBjDocumentBuilder extends DefaultDocumentBuilder {
    protected override shouldValidate(_document: LangiumDocument<AstNode>, options: BuildOptions): boolean {
        return super.shouldValidate(_document, options) && isWorkspaceDocument(_document);
    }
}

function isWorkspaceDocument(_document: LangiumDocument<AstNode>): boolean {
    return !_document.uri.path.includes('/Users/dhuebner/BBJ');
}
