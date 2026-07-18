/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstNode, AstUtils, CompositeCstNode, CstNode, DiagnosticInfo, FileSystemProvider, IndexManager, LangiumDocuments, LeafCstNode, Properties, Reference, RootCstNode, URI, UriUtils, ValidationAcceptor, ValidationChecks, isCompositeCstNode, isLeafCstNode } from 'langium';
import { basename, dirname, isAbsolute, normalize, relative, resolve } from 'path';
import type { BBjServices } from './bbj-module.js';
import { TypeInferer } from './bbj-type-inferer.js';
import { BBjAstType, BbjClass, BeginStatement, CallStatement, CastExpression, Class, CommentStatement, DefFunction, EraseStatement, FieldDecl, InitFileStatement, JavaField, JavaMethod, KeyedFileStatement, LabelDecl, MemberCall, MethodDecl, OpenStatement, Option, RunStatement, SwitchCase, SymbolicLabelRef, Use, VariableDecl, isArrayElement, isBBjClassMember, isBBjTypeRef, isBbjClass, isClass, isCompoundStatement, isKeywordStatement, isLabelDecl, isOption, isSimpleTypeRef, isStringLiteral, isSwitchStatement, isSymbolRef } from './generated/ast.js';
import { JavaInteropService } from './java-interop.js';
import { BBjPathPattern } from './bbj-scope.js';
import { BBjWorkspaceManager } from './bbj-ws-manager.js';
import { registerClassChecks } from './validations/check-classes.js';
import { registerVariableScopingChecks } from './validations/check-variable-scoping.js';
import { registerFunctionCallChecks } from './validations/check-function-calls.js';
import { checkLineBreaks, getPreviousNode } from './validations/line-break-validation.js';
import { NegativeLabelIdList } from './constants.js';
import { getClass, getFQNFullname } from './bbj-nodedescription-provider.js';

// Configuration for type resolution warnings
let typeResolutionWarningsEnabled = true;

export function setTypeResolutionWarnings(enabled: boolean): void {
    typeResolutionWarningsEnabled = enabled;
}

/** Prefix of the diagnostic message emitted for unresolvable USE file paths. Used by document builder to identify and reconcile these diagnostics after PREFIX docs are loaded. */
export const USE_FILE_NOT_RESOLVED_PREFIX = "File '";

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: BBjServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.BBjValidator;
    const checks: ValidationChecks<BBjAstType> = {
        AstNode: checkLineBreaks,
        LabelDecl: validator.checkLabelDecl,
        Use: validator.checkUsedClassExists,
        RunStatement: validator.checkRunCallFileResolves,
        CallStatement: validator.checkRunCallFileResolves,
        OpenStatement: validator.checkOpenStatementOptions,
        InitFileStatement: validator.checkInitFileStatementOptions,
        EraseStatement: validator.checkEraseStatementOptions,
        KeyedFileStatement: validator.checkKeyedFileStatement,
        DefFunction: validator.checkReturnValueInDef,
        CommentStatement: validator.checkCommentNewLines,
        MemberCall: validator.checkMemberCallUsingAccessLevels,
        CastExpression: validator.checkCastExpressionTypeResolvable,
        SymbolicLabelRef: validator.checkSymbolicLabelRef,

        BeginStatement: validator.checkExceptClause,
        VariableDecl: validator.checkDeclareNotInClassBody,
        SwitchCase: validator.checkSwitchCaseInSwitch,
    };
    registry.register(checks, validator);
    registerClassChecks(registry);
    registerVariableScopingChecks(registry);
    registerFunctionCallChecks(registry);
}


/**
 * Implementation of custom validations.
 */
export class BBjValidator {
    protected readonly javaInterop: JavaInteropService;
    protected readonly indexManager: IndexManager;
    protected readonly langiumDocuments: LangiumDocuments;
    protected readonly workspaceManager: BBjWorkspaceManager;
    protected readonly fileSystemProvider: FileSystemProvider;
    protected readonly typeInferer: TypeInferer;
    checkExceptClause(node: BeginStatement, accept: ValidationAcceptor): void {
        const wrongs = node.except.filter(e => !(isSymbolRef(e) || (isArrayElement(e) && e.all)))
        for (const except of wrongs) {
            accept("error", `'${except.$cstNode?.text}' must be symbol reference or array access with ALL`, {
                node: except
            });
        }
    }

    /**
     * `CASE`/`CASE DEFAULT` is only valid inside a `SWITCH`...`SWEND` block. SWITCH, CASE and
     * SWEND are modeled as flat sibling statements, so a stray CASE parses without error. Scan the
     * preceding siblings, matching each SWEND to an inner SWITCH; if an unmatched open SWITCH is
     * found, the CASE is enclosed and valid. See issue #206.
     */
    checkSwitchCaseInSwitch(node: SwitchCase, accept: ValidationAcceptor): void {
        // LabelDecl is a subtype of SwitchCase (the grammar rule starts with an optional label),
        // so this check also fires on plain labels — only real CASE nodes are relevant here.
        if (node.$type !== 'SwitchCase') return;

        // SWITCH, CASE and SWEND are flat sibling statements within a block (Program / method /
        // DEF function body). A one-line `SWITCH x; CASE 1; ... SWEND` nests them one level deep
        // inside a CompoundStatement, so resolve the enclosing block and flatten compounds to get
        // the switch markers in document order.
        let block: AstNode = node.$container;
        let blockProperty = node.$containerProperty;
        if (isCompoundStatement(block)) {
            blockProperty = block.$containerProperty;
            block = block.$container;
        }
        const statements = blockProperty ? (block as unknown as Record<string, unknown>)[blockProperty] : undefined;
        if (!Array.isArray(statements)) {
            return;
        }
        const flat: AstNode[] = [];
        for (const statement of statements) {
            if (isCompoundStatement(statement)) {
                flat.push(...statement.statements);
            } else {
                flat.push(statement);
            }
        }
        const index = flat.indexOf(node);
        if (index < 0) {
            return;
        }
        let pendingSwends = 0;
        for (let i = index - 1; i >= 0; i--) {
            const sibling = flat[i];
            if (isSwitchStatement(sibling)) {
                if (sibling.end) {
                    // A SWEND closes an inner SWITCH nested below this CASE.
                    pendingSwends++;
                } else if (pendingSwends > 0) {
                    // This SWITCH opens the inner block closed above.
                    pendingSwends--;
                } else {
                    // An unmatched open SWITCH encloses this CASE: it is valid.
                    return;
                }
            }
        }
        accept('error', `'${node.default ? 'CASE DEFAULT' : 'CASE'}' is only allowed inside a SWITCH block.`, {
            node
        });
    }

    checkDeclareNotInClassBody(node: VariableDecl, accept: ValidationAcceptor): void {
        // Only check base VariableDecl (DECLARE statements), not FieldDecl/ParameterDecl/ArrayDecl subtypes
        if (node.$type !== 'VariableDecl') return;
        if (isBbjClass(node.$container) && node.$containerProperty === 'members') {
            accept('error', 'DECLARE is not valid at class member level. Use FIELD for class-level declarations, or move DECLARE inside a method body.', {
                node
            });
        }
    }

    constructor(services: BBjServices) {
        this.javaInterop = services.java.JavaInteropService;
        this.indexManager = services.shared.workspace.IndexManager;
        this.langiumDocuments = services.shared.workspace.LangiumDocuments;
        this.workspaceManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        this.fileSystemProvider = services.shared.workspace.FileSystemProvider;
        this.typeInferer = services.types.Inferer;
    }

    checkCastExpressionTypeResolvable(castExpr: CastExpression, accept: ValidationAcceptor): void {
        if (!typeResolutionWarningsEnabled) return;

        // Array casts: just stop the false error, no type resolution
        if (castExpr.arrayDims && castExpr.arrayDims.length > 0) {
            return;
        }

        let typeResolved = false;
        if (isBBjTypeRef(castExpr.castType)) {
            typeResolved = castExpr.castType.klass.ref !== undefined;
        } else if (isSimpleTypeRef(castExpr.castType)) {
            typeResolved = isClass(castExpr.castType.simpleClass.ref);
        }
        if (!typeResolved) {
            accept('warning', 'CAST references an unresolvable type', {
                node: castExpr
            });
        }
    }

    checkMemberCallUsingAccessLevels(memberCall: MemberCall, accept: ValidationAcceptor): void {
        if(!memberCall.member) {
            //for broken syntax like "obj!.   "
            return;
        }

        // Check if the member access is on a class with unresolvable super
        if (typeResolutionWarningsEnabled) {
            const receiverType = this.typeInferer.getType(memberCall.receiver);
            if (receiverType && isBbjClass(receiverType)) {
                if (receiverType.extends.length > 0) {
                    const superType = getClass(receiverType.extends[0]);
                    if (!superType) {
                        // Super class is unresolvable
                        accept('warning', `Cannot resolve super class for '${receiverType.name}'. Field resolution may be incomplete.`, {
                            node: memberCall
                        });
                    }
                }
            }
        }

        const type = memberCall.member.$nodeDescription?.type ?? memberCall.member.ref?.$type;
        const validTypes = [JavaField.$type, JavaMethod.$type, MethodDecl.$type, FieldDecl.$type] as const;
        if (!type || !(validTypes as readonly string[]).includes(type)) {
            return;
        }
        const classOfDeclaration = memberCall.member.ref?.$container as Class;
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
                        remainingClasses.push(...c.extends.map(x => getClass(x)).filter(x => x !== undefined).map(x => x as Class))
                    }
                }
            }
        }
        const member = memberCall.member.ref;
        if (member && isBBjClassMember(member)) {
            const actualAccessLevel = ((member as { visibility?: string }).visibility ?? "PUBLIC").toUpperCase();
            if (!expectedAccessLevels.includes(actualAccessLevel)) {
                // Get source location info for the member declaration
                const memberDoc = AstUtils.getDocument(member);
                const filename = basename(memberDoc.uri.fsPath);
                const lineNumber = member.$cstNode?.range.start.line;
                const lineInfo = lineNumber !== undefined ? `:${lineNumber + 1}` : '';
                const sourceInfo = `${filename}${lineInfo}`;

                accept('error', `The member '${member.name}' from the type '${classOfDeclaration.name}' (in ${sourceInfo}) is not visible`, {
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

            // Get source location info for the declaration
            const filename = basename(uriOfDeclaration);
            const lineNumber = klass.$cstNode?.range.start.line;
            const lineInfo = lineNumber !== undefined ? `:${lineNumber + 1}` : '';
            const sourceInfo = `${filename}${lineInfo}`;

            switch (klass.visibility.toUpperCase()) {
                case "PUBLIC":
                    //everything is allowed
                    return;
                case "PROTECTED":
                    const dirOfDeclaration = dirname(uriOfDeclaration);
                    const dirOfUsage = dirname(uriOfUsage);
                    if (!this.isSubFolderOf(dirOfUsage, dirOfDeclaration)) {
                        accept("error", `Protected ${typeName} '${klass.name}' (declared in ${sourceInfo}) can be only referenced within the same directory!`, info);
                    }
                    break;
                case "PRIVATE":
                    if (uriOfUsage !== uriOfDeclaration) {
                        accept("error", `Private ${typeName} '${klass.name}' (declared in ${sourceInfo}) can be only referenced within the same file!`, info);
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
        if (!typeResolutionWarningsEnabled) return;

        if (use.javaClass) {
            const className = getFQNFullname(use.javaClass);
            if(use.javaClass.pathParts.some(pp => pp.symbol.ref === undefined)) {
                accept('warning', `Class '${className}' could not be resolved. Check your classpath configuration.`, { node: use });
            }
            const errorPart = use.javaClass.pathParts.find(pp => pp.symbol.error !== undefined)
            if (errorPart) {
                accept('warning', `Error when loading ${className}: ${errorPart.symbol.error}`, { node: use, property: 'javaClass' });
            }
        }

        if (use.bbjFilePath) {
            const match = use.bbjFilePath.match(BBjPathPattern);
            if (match) {
                const cleanPath = match[1];
                const currentDocUri = AstUtils.getDocument(use).uri;
                const prefixes = this.workspaceManager.getSettings()?.prefixes ?? [];
                const workspaceRoots = this.workspaceManager.getWorkspaceFolderUris();
                const adjustedFileUris = [
                    UriUtils.resolvePath(UriUtils.dirname(currentDocUri), cleanPath)
                ]
                    // Also resolve relative to each workspace/project root (#378), matching
                    // the scope provider so the diagnostic agrees with actual resolution.
                    .concat(workspaceRoots.map(root => UriUtils.resolvePath(root, cleanPath)))
                    .concat(prefixes.map(prefixPath => URI.file(resolve(prefixPath, cleanPath))));
                // Check if a document exists at any candidate URI. We check document
                // existence rather than BbjClass index entries because external files
                // may have parser errors that prevent BbjClass nodes from being created,
                // but the file path itself is still valid and resolvable.
                const resolvedUri = adjustedFileUris.find(uri =>
                    this.langiumDocuments.hasDocument(uri)
                );
                if (!resolvedUri) {
                    const searchedPaths = adjustedFileUris.map(u => u.fsPath);
                    accept('error', `File '${cleanPath}' could not be resolved. Searched: ${searchedPaths.join(', ')}`, {
                        node: use,
                        property: 'bbjFilePath'
                    });
                } else {
                    // File exists — verify it actually exports BbjClass nodes.
                    // A file that parses but contains no classes (e.g. binary-like content)
                    // cannot satisfy a USE reference and should produce a warning.
                    const resolvedFsPath = normalize(resolvedUri.fsPath).toLowerCase();
                    const hasClasses = this.indexManager.allElements(BbjClass.$type).some(desc =>
                        normalize(desc.documentUri.fsPath).toLowerCase() === resolvedFsPath
                    );
                    if (!hasClasses) {
                        accept('warning', `${USE_FILE_NOT_RESOLVED_PREFIX}${cleanPath}' could not be resolved. The file exists but contains no BBj classes.`, {
                            node: use,
                            property: 'bbjFilePath'
                        });
                    }
                }
            }
        }
    }

    /**
     * Flags a `RUN` or `CALL` whose target program file cannot be resolved on disk, when that
     * target is given as a static string literal (issue #173). Resolution mirrors the USE/scope
     * resolvers: the filename is searched relative to the current file's directory, each
     * workspace/project root, and each PREFIX directory.
     *
     * Only plain string literals are checked. A dynamic target — a variable or a concatenation such
     * as `RUN "./"+A$` — has an unknown value until runtime, so it is skipped to avoid false
     * positives. The check is also skipped entirely when no project context is configured (no
     * workspace folders and no PREFIX), since a bare single file has nowhere meaningful to resolve
     * against.
     */
    checkRunCallFileResolves(node: RunStatement | CallStatement, accept: ValidationAcceptor): void {
        if (!typeResolutionWarningsEnabled) return;

        const fileid = node.fileid;
        // Only static string literals carry a knowable path; skip variables/concatenations.
        if (!isStringLiteral(fileid)) return;
        // StringLiteral.value also covers HEX_STRING (`$0A$`); those are byte sequences, not paths.
        if (!fileid.$cstNode?.text?.startsWith('"')) return;

        // BBj accepts a `program::label` entry point in CALL; only the program part is a file path.
        let cleanPath = fileid.value;
        const labelIndex = cleanPath.indexOf('::');
        if (labelIndex >= 0) {
            cleanPath = cleanPath.substring(0, labelIndex);
        }
        cleanPath = cleanPath.trim();
        if (cleanPath.length === 0) return;

        const currentDocUri = AstUtils.getDocument(node).uri;
        // parseSettings yields a single empty-string prefix when none is configured; drop those so
        // they neither gate the check nor resolve against the process working directory.
        const prefixes = (this.workspaceManager.getSettings()?.prefixes ?? []).filter(prefix => prefix.length > 0);
        const workspaceRoots = this.workspaceManager.getWorkspaceFolderUris();
        // Without any project context there is nothing authoritative to resolve against, so skip
        // rather than warn on every RUN/CALL in a stand-alone file.
        if (workspaceRoots.length === 0 && prefixes.length === 0) return;

        const candidateUris = [
            UriUtils.resolvePath(UriUtils.dirname(currentDocUri), cleanPath)
        ]
            .concat(workspaceRoots.map(root => UriUtils.resolvePath(root, cleanPath)))
            .concat(prefixes.map(prefixPath => URI.file(resolve(prefixPath, cleanPath))));

        // A target resolves if it is an already-indexed workspace document (project files loaded
        // into the workspace) or exists on disk (PREFIX programs are not eagerly loaded).
        const resolved = candidateUris.some(uri =>
            this.langiumDocuments.hasDocument(uri) || this.fileSystemProvider.existsSync(uri)
        );
        if (!resolved) {
            accept('warning', `File '${cleanPath}' could not be resolved in the project directory or any PREFIX.`, {
                node,
                property: 'fileid'
            });
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

    checkSymbolicLabelRef(ele: SymbolicLabelRef, accept: ValidationAcceptor): void {
        const nodeText = ele.$cstNode?.text;
        // currently when using ':', see #214, node text may be shifted, that why
        // we check for the first character to avoid false positives
        if (nodeText && nodeText.startsWith('*') && nodeText.search(/\s/) !== -1) {
            accept('error', 'Symbolic label reference may not contain whitespace.', { node: ele });
        }
    }

    private LabelNegativeIdList: RegExp[] = NegativeLabelIdList.map(t => new RegExp(`^${t}$`, 'i'));
    checkLabelDecl(label: LabelDecl, accept: ValidationAcceptor): void {
        if(this.LabelNegativeIdList.some(t => t.test(label.name))) {
            accept('error', `'${label.name}' is not allowed as label name.`, {
                node: label,
                property: 'name',
            });
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
    let right = node.content.length - 1;
    let closest: CstNode | undefined = undefined;

    while (left <= right) {
        const middle = Math.floor((left + right) / 2);
        const middleNode = node.content[middle];

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


