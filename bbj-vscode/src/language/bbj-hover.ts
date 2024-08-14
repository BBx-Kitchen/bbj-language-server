import { AstNode, MultilineCommentHoverProvider } from "langium";
import { Hover } from "vscode-languageclient";
import { MethodData, toMethodData } from "./bbj-nodedescription-provider";
import { ClassMember, JavaMethod, isBBjClassMember, isBbjClass, isClass, isDocumented, isFieldDecl, isJavaClass, isJavaField, isJavaMethod, isLibMember, isMethodDecl, isNamedElement } from "./generated/ast";
import { JavadocProvider, MethodDoc, isMethodDoc } from "./java-javadoc";

export class BBjHoverProvider extends MultilineCommentHoverProvider {

    protected javadocProvider = JavadocProvider.getInstance();

    protected override async getAstNodeHoverContent(node: AstNode): Promise<Hover | undefined> {
        const header = documentationHeader(node)
        if (isBbjClass(node) || isBBjClassMember(node)) {
            const superDocu = super.getAstNodeHoverContent(node);
            if (superDocu) {
                return superDocu;
            }
        } else if (isDocumented(node) && isNamedElement(node)) {
            let javaDoc: { signature?: string, javadoc: string } | undefined = node.docu
            if (!javaDoc && this.javadocProvider.isInitialized()) {
                const documentation = await this.javadocProvider.getDocumentation(node);
                if (isMethodDoc(documentation)) {
                    const javaMethodNode = node as JavaMethod
                    const signature = `${javaTypeAdjust(javaMethodNode.returnType)} ${ownerClass(javaMethodNode)}${methodSignature(toMethodDocToMethodData(documentation, javaMethodNode), javaTypeAdjust)}`
                    javaDoc = {
                        signature: signature,
                        javadoc: documentation.docu ?? ''
                    }
                } else {
                    javaDoc = {
                        signature: documentationHeader(node),
                        javadoc: documentation?.docu ?? ''
                    }
                }
            }
            return this.createMarkdownHover(javaDoc?.signature, javaDoc?.javadoc);
        }
        return header ? this.createMarkdownHover(header) : undefined;
    }

    protected createMarkdownHover(header: string | undefined, content: string | undefined = ''): Hover {
        const headerText = header ? `__${header}__\n\n` : ''
        return {
            contents: {
                kind: 'markdown',
                value: `${headerText}${content}`
            }
        };
    }
}

export function documentationHeader(node: AstNode): string | undefined {
    // Lib
    if (isLibMember(node) && node.docu && node.docu.length > 5) {
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
        return `${node.returnType?.$refText && javaTypeAdjust(node.returnType.$refText)} ${ownerClass(node)}${methodSignature(toMethodData(node))}`;
    }
    if (isFieldDecl(node)) {
        return `${javaTypeAdjust(node.type?.ref?.name ?? 'Object')} ${(node as any)['simpleName'] ? (node as any)['simpleName'] : node.name}`;
    }
    if (isClass(node)) {
        return `class ${(node as any)['simpleName'] ? (node as any)['simpleName'] : node.name}`;
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
    return `${nodeDescription.name}(${nodeDescription.parameters.map(p => `${typeAdjust(p.type)} ${p.name}${p.optional ? '?' : ''}`).join(', ')})`
}

function toMethodDocToMethodData(methodDoc: MethodDoc, node: JavaMethod): MethodData {
    const javaParams = node.parameters
    return {
        name: methodDoc.name,
        parameters: methodDoc.params.map((p, idx) => ({ name: p.name, type: javaParams[idx]?.type ?? 'Object', optional: false })),
        returnType: node.returnType
    }
}
