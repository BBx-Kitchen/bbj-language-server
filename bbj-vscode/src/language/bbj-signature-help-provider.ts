import { AstNode, MaybePromise, Reference } from "langium";
import { AbstractSignatureHelpProvider } from "langium/lsp";
import { SignatureHelp, SignatureInformation, ParameterInformation, SignatureHelpOptions, CancellationToken } from "vscode-languageserver";
import { methodSignature } from "./bbj-hover.js";
import { isFunctionNodeDescription, type FunctionNodeDescription } from "./bbj-nodedescription-provider.js";
import { isMemberCall, isMethodCall, isSymbolRef, MethodCall, NamedElement } from "./generated/ast.js";

export class BBjSignatureHelpProvider extends AbstractSignatureHelpProvider {

    override get signatureHelpOptions(): SignatureHelpOptions {
        return {
            triggerCharacters: ['(', ','],
            retriggerCharacters: [',', ')']
        };
    }

    protected override getSignatureFromElement(element: AstNode, _cancelToken: CancellationToken): MaybePromise<SignatureHelp | undefined> {
        // Find the enclosing method call
        const callNode = this.findEnclosingCall(element);
        if (!callNode) {
            return undefined;
        }

        // Get the reference to the function/method being called
        const functionRef = this.getFunctionReference(callNode);
        if (!functionRef) {
            return undefined;
        }

        // Get the node description for the function
        const functionDescription = functionRef.$nodeDescription;
        if (!functionDescription || !isFunctionNodeDescription(functionDescription)) {
            return undefined;
        }

        // Determine the active parameter based on cursor position
        const activeParameter = this.getActiveParameter(callNode, element);

        // Create signature information
        const signature = this.createSignatureInformation(functionDescription);

        return {
            signatures: [signature],
            activeSignature: 0,
            activeParameter: activeParameter
        };
    }

    protected findEnclosingCall(node: AstNode): MethodCall | undefined {
        let current: AstNode | undefined = node;
        while (current) {
            if (isMethodCall(current)) {
                return current;
            }
            current = current.$container;
        }
        return undefined;
    }

    protected getFunctionReference(callNode: MethodCall): Reference<NamedElement> | undefined {
        const method = callNode.method;
        if (isSymbolRef(method)) {
            return method.symbol;
        } else if (isMemberCall(method)) {
            return method.member;
        }
        return undefined;
    }

    protected getActiveParameter(callNode: MethodCall, cursorNode: AstNode): number {
        const args = callNode.args || [];
        if (args.length === 0) {
            return 0;
        }

        // Find which argument contains or precedes the cursor
        let paramIndex = 0;
        const cursorCst = cursorNode.$cstNode;
        if (!cursorCst) {
            return 0;
        }

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            const argCst = arg.$cstNode;
            if (!argCst) {
                continue;
            }

            if (cursorCst.offset >= argCst.offset && cursorCst.offset <= argCst.end) {
                paramIndex = i;
                break;
            } else if (cursorCst.offset > argCst.end) {
                paramIndex = i + 1;
            }
        }

        return Math.min(paramIndex, args.length - 1);
    }

    protected createSignatureInformation(functionDescription: FunctionNodeDescription): SignatureInformation {
        const signature = methodSignature(functionDescription, type => this.toSimpleName(type));
        const label = `${functionDescription.name}(${functionDescription.parameters.map(p => `${this.toSimpleName(p.type)} ${p.realName ?? p.name}${p.optional ? '?' : ''}`).join(', ')})`;

        const parameters: ParameterInformation[] = functionDescription.parameters.map(p => ({
            label: `${this.toSimpleName(p.type)} ${p.realName ?? p.name}${p.optional ? '?' : ''}`,
            documentation: undefined
        }));

        return {
            label: label,
            documentation: {
                kind: 'markdown',
                value: `\`\`\`bbj\n${signature}\n\`\`\``
            },
            parameters: parameters
        };
    }

    protected toSimpleName(type: string): string {
        return type.split('.').pop() || type;
    }
}
