import { AstNode, DocumentationProvider, isJSDoc, parseJSDoc } from "langium";
import { AstNodeHoverProvider, LangiumServices } from "langium/lsp";
import { getFQNFullname, MethodData, toMethodData } from "./bbj-nodedescription-provider.js";
import { ClassMember, JavaMethod, isBBjClassMember, isBbjClass, isClass, isDocumented, isFieldDecl, isJavaClass, isJavaField, isJavaMethod, isLibEventType, isLibMember, isMethodDecl, isNamedElement } from "./generated/ast.js";
import { JavadocProvider, MethodDoc, isMethodDoc } from "./java-javadoc.js";
import { CommentProvider } from "langium";

export class BBjHoverProvider extends AstNodeHoverProvider {
    protected readonly documentationProvider: DocumentationProvider;
    protected javadocProvider = JavadocProvider.getInstance();
    protected readonly commentProvider: CommentProvider;

    constructor(services: LangiumServices) {
        super(services);
        this.documentationProvider = services.documentation.DocumentationProvider;
        this.commentProvider = services.documentation.CommentProvider;
    }

    protected override async getAstNodeHoverContent(node: AstNode): Promise<string | undefined> {
        const header = documentationHeader(node)
        if (isBbjClass(node) || isBBjClassMember(node)) {
            const comments = this.getAstNodeComments(node);
            if (comments) {
                return this.createMarkdownContent(header, comments);
            }
        } else if (isDocumented(node) && isNamedElement(node)) {
            let javaDoc: { signature?: string, javadoc: string } | undefined = node.docu
            if (!javaDoc && this.javadocProvider.isInitialized()) {
                const documentation = await this.javadocProvider.getDocumentation(node);
                const javadocContent = documentation?.docu ? this.tryParseJavaDoc(documentation.docu) : ''
                if (isMethodDoc(documentation)) {
                    const javaMethodNode = node as JavaMethod
                    const signature = `${javaTypeAdjust(javaMethodNode.returnType)} ${ownerClass(javaMethodNode)}${methodSignature(toMethodDocToMethodData(documentation, javaMethodNode), javaTypeAdjust)}`
                    javaDoc = {
                        signature: signature,
                        javadoc: javadocContent
                    }
                } else {
                    javaDoc = {
                        signature: documentationHeader(node),
                        javadoc: javadocContent
                    }
                }
            }
            return this.createMarkdownContent(javaDoc?.signature, javaDoc?.javadoc);
        }
        return header ? this.createMarkdownContent(header) : undefined;
    }

    /**
     * BBj documentation provider will collect all preceding comment statements
     * and if the first comment starts with "/**" it will return all comments content.
     * 
     * @param node  The node to get the comments for
     * @returns   The comments for the node
     */
    protected getAstNodeComments(node: AstNode) {
        try {
            return this.documentationProvider.getDocumentation(node);
        } catch (e) {
            // JSDocDocumentationProvider Fails to pars in case of syntax errors
            // Example:
            /**
            * <a href="{@docRoot}/java.base/java/util/package-summary.html#CollectionsFramework">\n
            * Java Collections Framework</a>
            */
            console.warn(e)
            return this.commentProvider.getComment(node);
        }
    }

    protected createMarkdownContent(header: string | undefined, content: string | undefined = ''): string {
        const headerText = header ? `__${header}__\n\n` : ''
        return `${headerText}${content}`;
    }

    protected tryParseJavaDoc(comment: string) {
        if (isJSDoc(comment)) {
            try {
                const doc = parseJSDoc(comment)
                return doc.toMarkdown()
            } catch (error) {
                console.warn(error)
            }
        }
        return comment;
    }
}

export function documentationHeader(node: AstNode): string | undefined {
    // Lib
    if ((isLibMember(node) || isLibEventType(node)) && node.docu && node.docu.length > 5) {
        return node.docu.substring(3, node.docu.length - 2).replaceAll('\\`', '`').trim()
    }

    // Java
    if (isJavaClass(node)) {
        return `class ${(node as any)['simpleName'] ? (node as any)['simpleName'] : node.name}`;
    }
    if (isJavaField(node)) {
        return `${javaTypeAdjust(node.type)} ${(node as any)['simpleName'] ? (node as any)['simpleName'] : node.name}`;
    }
    if (isJavaMethod(node)) {
        return `${javaTypeAdjust(node.returnType)} ${ownerClass(node)}${methodSignature(node, javaTypeAdjust)}`;
    }

    // Other (BBj)
    if (isMethodDecl(node)) {
        const owner = ownerClass(node)
        const type = (node.returnType && javaTypeAdjust(getFQNFullname(node.returnType)))
        return `${type ? type + ' ' : ''}${owner}${methodSignature(toMethodData(node))}`;
    }
    if (isFieldDecl(node)) {
        return `${javaTypeAdjust(getFQNFullname(node.type) ?? 'Object')} ${(node as any)['simpleName'] ? (node as any)['simpleName'] : node.name}`;
    }
    if (isBbjClass(node)) {
        return `${node.interface ? 'interface' : 'class'} ${(node as any)['simpleName'] ? (node as any)['simpleName'] : node.name}`;
    }
    return undefined;
}

function javaTypeAdjust(typeFqn: string): string {
    return typeFqn.replace(/^java\.lang\./, '')
}

function ownerClass(member: ClassMember): string {
    const className = isClass(member.$container) ? member.$container.name : undefined;
    return className ? `${className}.` : '';
}

export function methodSignature(nodeDescription: MethodData, typeAdjust: ((type: string) => string) = (t) => t ?? '') {
    return `${nodeDescription.name}(${nodeDescription.parameters.map(p => `${typeAdjust(p.type)} ${p.realName ?? p.name}${p.optional ? '?' : ''}`).join(', ')})`
}

function toMethodDocToMethodData(methodDoc: MethodDoc, node: JavaMethod): MethodData {
    const javaParams = node.parameters
    return {
        name: methodDoc.name,
        parameters: methodDoc.params.map((p, idx) => ({ name: p.name, type: javaParams[idx]?.type ?? 'Object', optional: false })),
        returnType: node.returnType
    }
}
