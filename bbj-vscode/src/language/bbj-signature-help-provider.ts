import { AstNode, AstUtils, CstNode, MaybePromise, CancellationToken } from "langium";
import { AbstractSignatureHelpProvider, LangiumServices } from "langium/lsp";
import { SignatureHelp, SignatureInformation, ParameterInformation, SignatureHelpOptions } from "vscode-languageserver";
import { methodSignature } from "./bbj-hover.js";
import { isFunctionNodeDescription, type FunctionNodeDescription } from "./bbj-nodedescription-provider.js";
import { isCallExpression, isMethodCall } from "./generated/ast.js";

export class BBjSignatureHelpProvider extends AbstractSignatureHelpProvider {

    constructor(services: LangiumServices) {
        super(services);
    }

    override get signatureHelpOptions(): SignatureHelpOptions {
        return {
            triggerCharacters: ['(', ','],
            retriggerCharacters: [',', ')']
        };
    }

    protected override getSignatureFromElement(element: AstNode, cancelToken: CancellationToken): MaybePromise<SignatureHelp | undefined> {
        // Find the enclosing call expression or method call
        const callNode = this.findEnclosingCall(element);
        if (!callNode) {
            return undefined;
        }

        // Get the function being called
        const functionRef = this.getFunctionReference(callNode);
        if (!functionRef || !functionRef.$refText) {
            return undefined;
        }

        // Get the node description for the function
        const scope = this.scopeProvider.getScope({ reference: functionRef, container: callNode });
        const nodeDescriptions = scope.getAllElements();
        let functionDescription: FunctionNodeDescription | undefined;

        for (const desc of nodeDescriptions) {
            if (desc.name === functionRef.$refText && isFunctionNodeDescription(desc)) {
                functionDescription = desc;
                break;
            }
        }

        if (!functionDescription) {
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

    protected findEnclosingCall(node: AstNode): AstNode | undefined {
        let current: AstNode | undefined = node;
        while (current) {
            if (isCallExpression(current) || isMethodCall(current)) {
                return current;
            }
            current = current.$container;
        }
        return undefined;
    }

    protected getFunctionReference(callNode: AstNode): any {
        if (isCallExpression(callNode)) {
            return callNode.function;
        } else if (isMethodCall(callNode)) {
            return callNode.method;
        }
        return undefined;
    }

    protected getActiveParameter(callNode: AstNode, cursorNode: AstNode): number {
        const args = this.getArguments(callNode);
        if (!args || args.length === 0) {
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

    protected getArguments(callNode: AstNode): AstNode[] {
        if (isCallExpression(callNode)) {
            return callNode.args || [];
        } else if (isMethodCall(callNode)) {
            return callNode.args || [];
        }
        return [];
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
