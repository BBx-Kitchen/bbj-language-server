/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstNode, AstUtils, CompositeCstNode, CstNode, DiagnosticInfo, LeafCstNode, Properties, Reference, RootCstNode, ValidationAcceptor, ValidationChecks, isCompositeCstNode, isLeafCstNode } from 'langium';
import { dirname, isAbsolute, relative } from 'path';
import type { BBjServices } from './bbj-module.js';
import { TypeInferer } from './bbj-type-inferer.js';
import { BBjAstType, Class, CommentStatement, DefFunction, EraseStatement, FieldDecl, InitFileStatement, JavaField, JavaMethod, KeyedFileStatement, MemberCall, MethodDecl, OpenStatement, Option, Use, isBBjClassMember, isBbjClass, isClass, isKeywordStatement, isLabelDecl, isOption } from './generated/ast.js';
import { JavaInteropService } from './java-interop.js';
import { registerClassChecks } from './validations/check-classes.js';
import { checkLineBreaks, getPreviousNode } from './validations/line-break-validation.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: BBjServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.BBjValidator;
    const checks: ValidationChecks<BBjAstType> = {
        AstNode: checkLineBreaks,
        Use: validator.checkUsedClassExists,
        OpenStatement: validator.checkOpenStatementOptions,
        InitFileStatement: validator.checkInitFileStatementOptions,
        EraseStatement: validator.checkEraseStatementOptions,
        KeyedFileStatement: validator.checkKeyedFileStatement,
        DefFunction: validator.checkReturnValueInDef,
        CommentStatement: validator.checkCommentNewLines,
        MethodDecl: validator.checkIfMethodIsChildOfInterface,
        MemberCall: validator.checkMemberCallUsingAccessLevels,
    };
    registry.register(checks, validator);
    registerClassChecks(registry);
}


/**
 * Implementation of custom validations.
 */
export class BBjValidator {
    protected readonly javaInterop: JavaInteropService;

    protected readonly typeInferer: TypeInferer;

    constructor(services: BBjServices) {
        this.javaInterop = services.java.JavaInteropService;
        this.typeInferer = services.types.Inferer;
    }

    checkMemberCallUsingAccessLevels(memberCall: MemberCall, accept: ValidationAcceptor): void {
        const type = memberCall.member.$nodeDescription?.type ?? memberCall.member.ref?.$type;
        if (!type || ![JavaField, JavaMethod, MethodDecl, FieldDecl].includes(type)) {
            return;
        }
        const classOfDeclaration = memberCall.member.ref?.$container;
        const classOfUsage = AstUtils.getContainerOfType(memberCall, isClass);
        if (!classOfDeclaration) {
            return;
        }
        const expectedAccessLevels = ["PUBLIC"];
        if (classOfUsage) {
            if (classOfUsage === classOfDeclaration) {
                expectedAccessLevels.push("PRIVATE", "PROTECTED");
            } else {
                const remainingClasses = [classOfUsage];
                while (remainingClasses.length > 0) {
                    const c = remainingClasses.pop();
                    if (c === classOfDeclaration) {
                        expectedAccessLevels.push("PROTECTED");
                        break;
                    }
                    if (isBbjClass(c)) {
                        remainingClasses.push(...c.extends.map(x => x.ref).filter(x => x !== undefined).map(x => x as Class))
                    }
                }
            }
        }
        const member = memberCall.member.ref;
        if (member && isBBjClassMember(member)) {
            const actualAccessLevel = (member.visibility ?? "PUBLIC").toUpperCase();
            if (!expectedAccessLevels.includes(actualAccessLevel)) {
                accept('error', `The member '${member.name}' from the type '${classOfDeclaration.name}' is not visible`, {
                    node: memberCall,
                    property: 'member'
                });
            }
        }
    }

    public checkClassReference<N extends AstNode>(accept: ValidationAcceptor, ref: Reference<Class> | undefined, info: DiagnosticInfo<N>): void {
        if (!ref) {
            return;
        }
        const uriOfUsage = AstUtils.getDocument(ref.$refNode!.root.astNode).uri.fsPath;
        if (!ref.ref) {
            return;
        }
        const klass = ref.ref;
        if (isBbjClass(klass) && klass.visibility) {
            const typeName = klass.interface ? 'interface' : 'class';
            const uriOfDeclaration = AstUtils.getDocument(ref.ref).uri.fsPath;
            switch (klass.visibility.toUpperCase()) {
                case "PUBLIC":
                    //everything is allowed
                    return;
                case "PROTECTED":
                    const dirOfDeclaration = dirname(uriOfDeclaration);
                    const dirOfUsage = dirname(uriOfUsage);
                    if (!this.isSubFolderOf(dirOfUsage, dirOfDeclaration)) {
                        accept("error", `Protected ${typeName} '${klass.name}' can be only referenced within the same directory!`, info);
                    }
                    break;
                case "PRIVATE":
                    if (uriOfUsage !== uriOfDeclaration) {
                        accept("error", `Private ${typeName} '${klass.name}' can be only referenced within the same file!`, info);
                    }
                    break;
            }
        }
    }

    private isSubFolderOf(folder: string, parentFolder: string) {
        if (parentFolder === folder) {
            return true;
        }
        const relativePath = relative(parentFolder, folder);
        return relativePath && !relativePath.startsWith('..') && !isAbsolute(relativePath);
    }


    checkIfMethodIsChildOfInterface(node: MethodDecl, accept: ValidationAcceptor): void {
        const klass = AstUtils.getContainerOfType(node, isBbjClass)!;
        if (klass.interface && node.endTag) {
            accept('error', 'Methods of interfaces must not have a METHODEND keyword!', {
                node: node,
                property: 'endTag'
            });
        }
    }

    checkCommentNewLines(node: CommentStatement, accept: ValidationAcceptor): void {
        const document = AstUtils.getDocument(node);
        if (document.parseResult.parserErrors.length > 0 || isLabelDecl(getPreviousNode(node))) {
            return;
        }
        if (node.$cstNode) {
            const text = (node.$cstNode.root as RootCstNode).fullText;
            const offset = node.$cstNode.offset;
            for (let i = offset - 1; i >= 0; i--) {
                const char = text.charAt(i);
                if (char === '\n' || char === ';') {
                    return;
                } else if (char !== ' ' && char !== '\t') {
                    accept('error', "Comments need to be separated by line breaks or ';'.", {
                        node
                    });
                    return;
                }
            }
        }
    }



    checkUsedClassExists(use: Use, accept: ValidationAcceptor): void {
        const className = use.javaClassName
        if (className) {
            const resolvedClass = this.javaInterop.getResolvedClass(className);
            if (!resolvedClass) {
                accept('error', `Class ${className} is not in the class path.`, { node: use });
            } else if (resolvedClass.error) {
                accept('error', `Error when loading ${className}: ${resolvedClass.error}`, { node: use });
            }
        }
    }

    private checkOptions<T extends AstNode>(verb: string, node: T, property: Properties<T>, options: Option[], validOptionKeys: string[], accept: ValidationAcceptor) {
        const copy = [...validOptionKeys.map(o => o.toLowerCase())];
        options.forEach((option, propertyIndex) => {
            const key = option.key.toLowerCase();
            const index = copy.indexOf(key);
            if (index > -1) {
                copy.splice(index, 1);
            } else {
                accept('error', `${verb} verb can have following options: ${validOptionKeys.join(', ')}. Found: ${key}.`, { node, property, index: propertyIndex });
            }
        });
    }

    checkInitFileStatementOptions(ele: InitFileStatement, accept: ValidationAcceptor): void {
        this.checkOptions('INITFILE', ele, 'options', ele.options, ['mode', 'tim', 'err'], accept);
    }

    checkEraseStatementOptions(ele: EraseStatement, accept: ValidationAcceptor): void {
        let expression = true;
        ele.items?.forEach((item, index) => {
            if (isOption(item)) {
                expression = false;
            } else if (!expression) {
                accept('error', 'Invalid option. Expecting {,MODE=string}{,TIM=int}{,ERR=lineref}.', { node: ele, property: 'items', index });
            }
        });
        this.checkOptions('ERASE', ele, 'items', ele.items.filter(expr => isOption(expr)).map(op => op as Option), ['mode', 'tim', 'err'], accept);
    }

    checkOpenStatementOptions(ele: OpenStatement, accept: ValidationAcceptor): void {
        this.checkOptions('OPEN', ele, 'options', ele.options, ['mode', 'tim', 'isz', 'err'], accept);
    }

    checkKeyedFileStatement(ele: KeyedFileStatement, accept: ValidationAcceptor): void {
        if (ele.kind !== 'MKEYED' && ele.mode) {
            accept('error', 'MODE option only supported in MKEYED Verb.', { node: ele, property: 'mode' });
            return;
        }
    }

    checkReturnValueInDef(ele: DefFunction, accept: ValidationAcceptor): void {
        if (ele.body && ele.body.length > 0) {
            ele.body.filter(isKeywordStatement).forEach(statement => {
                if (statement.kind && statement.kind.toUpperCase() === 'RETURN') {
                    accept('error', 'RETURN statement inside a DEF function must have a return value.', { node: statement });
                }
            })
            return;
        }
    }
}

export function findLeafNodeAtOffset(node: CstNode, offset: number): LeafCstNode | undefined {
    if (isLeafCstNode(node)) {
        return node;
    } else if (isCompositeCstNode(node)) {
        const searchResult = binarySearch(node, offset);
        if (searchResult) {
            return findLeafNodeAtOffset(searchResult, offset);
        }
    }
    return undefined;
}

function binarySearch(node: CompositeCstNode, offset: number): CstNode | undefined {
    let left = 0;
    let right = node.children.length - 1;
    let closest: CstNode | undefined = undefined;

    while (left <= right) {
        const middle = Math.floor((left + right) / 2);
        const middleNode = node.children[middle];

        if (middleNode.offset === offset) {
            // Found an exact match
            return middleNode;
        }

        if (middleNode.offset < offset) {
            // Update the closest node (less than offset) and move to the right half
            closest = middleNode;
            left = middle + 1;
        } else {
            // Move to the left half
            right = middle - 1;
        }
    }


    return closest;
}


