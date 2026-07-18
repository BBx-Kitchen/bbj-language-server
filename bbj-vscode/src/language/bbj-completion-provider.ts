import { AstNodeDescription, AstUtils, GrammarAST, MaybePromise, ReferenceInfo, UriUtils } from "langium";
import type { FileSystemProvider, LangiumDocument, LangiumDocumentFactory } from "langium";
import { CompletionAcceptor, CompletionContext, CompletionValueItem, DefaultCompletionProvider, NextFeature } from "langium/lsp";
import { CancellationToken, CompletionItem, CompletionItemKind, CompletionItemTag, CompletionList, CompletionParams, TextEdit } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { documentationHeader, methodSignature } from "./bbj-hover.js";
import { isFunctionNodeDescription, type FunctionNodeDescription, getClass } from "./bbj-nodedescription-provider.js";
import { BbjClass, ConstructorCall, FieldDecl, isBbjClass, isBBjTypeRef, isConstructorCall, isDocumented, isFieldDecl, isJavaClass, isJavaField, isJavaMethod, isJavaTypeRef, isMethodDecl, isSimpleTypeRef, LibEventType, LibSymbolicLabelDecl, MethodDecl } from "./generated/ast.js";
import { findLeafNodeAtOffset } from "./bbj-validator.js";
import { BBjServices } from "./bbj-module.js";
import { JavaInteropService } from "./java-interop.js";
import { BBjWorkspaceManager } from "./bbj-ws-manager.js";
import { useInsertPosition } from "./bbj-use-insert.js";


export class BBjCompletionProvider extends DefaultCompletionProvider {

    /** Minimum typed prefix before offering (potentially many) auto-import class suggestions. */
    protected static readonly AUTO_IMPORT_MIN_PREFIX = 2;

    override readonly completionOptions = {
        triggerCharacters: ['#', '(', '.']
    };

    /**
     * Set while serving a '.' auto-trigger. In that mode we only want the receiver's members,
     * not the keywords / lexical symbols the parser also predicts because the MemberCall `member`
     * reference is grammatically optional (see getCompletion).
     */
    protected dotTriggerActive = false;

    protected readonly documentFactory: LangiumDocumentFactory;
    protected readonly javaInterop: JavaInteropService;
    protected readonly fileSystemProvider: FileSystemProvider;
    protected readonly wsManager: BBjWorkspaceManager;

    constructor(services: BBjServices) {
        super(services);
        this.documentFactory = services.shared.workspace.LangiumDocumentFactory;
        this.javaInterop = services.java.JavaInteropService;
        this.fileSystemProvider = services.shared.workspace.FileSystemProvider;
        this.wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
    }

    protected override async completionForCrossReference(context: CompletionContext, next: NextFeature<GrammarAST.CrossReference>, acceptor: CompletionAcceptor): Promise<void> {
        // Record the simple names the default (in-scope) completion already offers, so an
        // auto-import suggestion is not duplicated for a class that is already imported.
        const offered = new Set<string>();
        const recording: CompletionAcceptor = (ctx, item) => { if (item.label) { offered.add(item.label); } acceptor(ctx, item); };
        await super.completionForCrossReference(context, next, recording);

        if (!this.dotTriggerActive && this.isClassCrossReference(next.feature) && this.isTypeReferencePosition(context)) {
            await this.completeAutoImportClasses(context, offered, acceptor);
        }
    }

    /** True if the cross-reference being completed targets a `Class` (BBj or Java type reference). */
    protected isClassCrossReference(feature: GrammarAST.AbstractElement): boolean {
        if (!GrammarAST.isCrossReference(feature)) {
            return false;
        }
        return (feature.type.ref?.name ?? feature.type.$refText) === 'Class';
    }

    /**
     * True only where inserting a class name makes sense as a *type*: a declared/cast/extends type
     * reference node, or a constructor class right after `new`. A bare class name is also grammatically
     * a valid expression, so without this guard auto-import would fire in argument/assignment
     * positions (e.g. `new TreeMap(Tree|)`) and nest a class where a value is expected.
     */
    protected isTypeReferencePosition(context: CompletionContext): boolean {
        const node = context.node;
        if (node && (isSimpleTypeRef(node) || isBBjTypeRef(node) || isJavaTypeRef(node))) {
            return true;
        }
        // A not-yet-completed `new X` does not parse as a ConstructorCall, so detect it from the
        // preceding `new` keyword (BBj is case-insensitive).
        const textBefore = context.textDocument.getText().substring(0, context.tokenOffset);
        return /\bnew\s+$/i.test(textBefore);
    }

    /**
     * Offers Java classes whose simple name matches the typed prefix but which are not yet
     * imported, inserting the class name and the corresponding `use` statement in one step
     * (issue #447). Coverage depends on the class index (complete when the augmented bbj-ls is
     * present, otherwise classes already resolved this session).
     */
    protected async completeAutoImportClasses(context: CompletionContext, alreadyOffered: Set<string>, acceptor: CompletionAcceptor): Promise<void> {
        const prefix = context.textDocument.getText().substring(context.tokenOffset, context.offset);
        if (prefix.length < BBjCompletionProvider.AUTO_IMPORT_MIN_PREFIX) {
            return;
        }
        const fqns = await this.javaInterop.findClassCandidatesByPrefix(prefix);
        if (fqns.length === 0) {
            return;
        }
        const insertPosition = useInsertPosition(context.document);
        for (const fqn of fqns) {
            const simple = fqn.substring(fqn.lastIndexOf('.') + 1);
            if (alreadyOffered.has(simple)) {
                continue; // already reachable in scope — no `use` needed
            }
            alreadyOffered.add(simple);
            acceptor(context, {
                label: simple,
                kind: CompletionItemKind.Class,
                detail: `Auto-import ${fqn}`,
                labelDetails: { description: fqn },
                sortText: `zzzz${simple}`, // rank below in-scope suggestions
                additionalTextEdits: [TextEdit.insert(insertPosition, `use ${fqn}\n`)],
                documentation: { kind: 'markdown', value: `Adds \`use ${fqn}\`` }
            });
        }
    }

    protected override completionFor(context: CompletionContext, next: NextFeature, acceptor: CompletionAcceptor): MaybePromise<void> {
        if (this.dotTriggerActive && !this.isMemberReference(next.feature)) {
            // Suppress everything except the `member` cross-reference of a MemberCall.
            return;
        }
        return super.completionFor(context, next, acceptor);
    }

    /** True if `feature` is the cross-reference of the `member=[...]` assignment in the MemberCall rule. */
    protected isMemberReference(feature: GrammarAST.AbstractElement): boolean {
        if (!GrammarAST.isCrossReference(feature)) {
            return false;
        }
        const assignment = GrammarAST.isAssignment(feature.$container) ? feature.$container : undefined;
        return assignment?.feature === 'member';
    }

    override async getCompletion(document: LangiumDocument, params: CompletionParams, cancelToken?: CancellationToken): Promise<CompletionList | undefined> {
        if (params.context?.triggerCharacter === '#') {
            return this.getFieldCompletion(document, params);
        }
        if (params.context?.triggerCharacter === '(') {
            // '(' auto-trigger: return constructor items or an empty list — NEVER fall through
            // to the slow default provider, which would produce irrelevant keyword suggestions.
            return this.getConstructorCompletion(document, params) ?? { items: [], isIncomplete: false };
        }
        if (params.context?.triggerCharacter === '.') {
            // '.' is the member-access operator (MemberCall). The grammar makes the member
            // reference optional so a not-yet-typed member (`receiver.`) doesn't abort the
            // enclosing class/method rule — otherwise error recovery strips the class from the
            // AST and the receiver (a field, `this!`/`super!`, ...) can no longer be resolved.
            // The trade-off is that the parser now also predicts a *following statement* at this
            // position, so the default provider would offer keywords and every lexically visible
            // symbol. While the dot trigger is active we restrict completion to the MemberCall
            // `member` reference (see completionFor), so only the receiver's members are offered.
            this.dotTriggerActive = true;
            try {
                return await super.getCompletion(document, params, cancelToken);
            } finally {
                this.dotTriggerActive = false;
            }
        }
        // Non-trigger completion (Ctrl+Space). `:` is not a trigger character, so inside the
        // `::...::` file-path segment of a `use`/`declare` only a plain Ctrl+Space reaches here.
        // Offer reachable `.bbj` files / subdirectories there — the grammar treats the path as a
        // single opaque terminal, so the default completion engine has nothing to offer.
        const filePathCompletion = await this.getFilePathCompletion(document, params);
        if (filePathCompletion) {
            return filePathCompletion;
        }
        // Non-trigger completion (Ctrl+Space) — try constructor first, then fall through to default
        const constructorCompletion = this.getConstructorCompletion(document, params);
        if (constructorCompletion) {
            return constructorCompletion;
        }
        const completion = await super.getCompletion(document, params, cancelToken);
        return completion ? this.dedupeAutoImportItems(completion) : completion;
    }

    /**
     * Drops auto-import suggestions that duplicate a class already offered in scope (which needs no
     * `use`), or that another grammar feature already produced. Cross-reference completion runs
     * per grammar feature, so this cross-feature pass is where such duplicates are removed.
     */
    protected dedupeAutoImportItems(list: CompletionList): CompletionList {
        const isAutoImport = (item: CompletionItem) => item.detail?.startsWith('Auto-import ') ?? false;
        const inScopeLabels = new Set(list.items.filter(item => !isAutoImport(item)).map(item => item.label));
        const seenAutoImport = new Set<string>();
        list.items = list.items.filter(item => {
            if (!isAutoImport(item)) {
                return true;
            }
            if (inScopeLabels.has(item.label) || seenAutoImport.has(item.label)) {
                return false;
            }
            seenAutoImport.add(item.label);
            return true;
        });
        return list;
    }

    /**
     * File-path completion inside the `::...::` segment of a `use`/`declare` statement, and inside
     * the file-name string literal of a `RUN`/`CALL` statement (issue #456). Returns subdirectory
     * (drill-down) and `.bbj` file items reachable from the current file's directory, the workspace
     * folder(s) and every configured PREFIX path; returns undefined when the cursor is not in such a
     * path position (so completion falls through to the default provider — e.g. class completion
     * after the closing `::`).
     *
     * Fail-safe: any file-system/resolution error yields an empty list rather than a thrown
     * exception, so a broken prefix never breaks completion.
     */
    protected async getFilePathCompletion(document: LangiumDocument, params: CompletionParams): Promise<CompletionList | undefined> {
        const text = document.textDocument.getText();
        const cursorOffset = document.textDocument.offsetAt(params.position);
        const lineStartOffset = document.textDocument.offsetAt({ line: params.position.line, character: 0 });
        let lineEndOffset = text.indexOf('\n', cursorOffset);
        if (lineEndOffset === -1) {
            lineEndOffset = text.length;
        }
        const lineText = text.substring(lineStartOffset, lineEndOffset);
        const pathContext = parseFilePathCompletionContext(lineText, params.position.character)
            ?? parseRunCallFilePathContext(lineText, params.position.character);
        if (!pathContext) {
            return undefined;
        }

        // Range covering only the leaf prefix already typed, so accepting an item replaces just
        // that prefix (not the whole path) regardless of how the client tokenises `/` and `.`.
        const prefixStart = document.textDocument.positionAt(cursorOffset - pathContext.prefix.length);
        const replaceRange = { start: prefixStart, end: params.position };

        const items = await this.collectFilePathItems(document.uri, pathContext, replaceRange);
        return { items, isIncomplete: false };
    }

    /**
     * Enumerates the subdirectories and `.bbj` files of `pathContext.dir` under each base directory
     * (current file's dir, workspace roots, PREFIX paths), filtered by the leaf prefix. Deduplicated
     * by name across bases; never throws.
     */
    protected async collectFilePathItems(
        docUri: URI,
        pathContext: FilePathCompletionContext,
        replaceRange: { start: { line: number, character: number }, end: { line: number, character: number } }
    ): Promise<CompletionItem[]> {
        const baseDirs: URI[] = [UriUtils.dirname(docUri)];
        try {
            for (const root of this.wsManager.getWorkspaceFolderUris()) {
                baseDirs.push(root);
            }
            for (const prefix of this.wsManager.getSettings()?.prefixes ?? []) {
                if (prefix && prefix.length > 0) {
                    baseDirs.push(URI.file(prefix));
                }
            }
        } catch {
            // Settings/workspace not available — the current file's directory is still usable.
        }

        const prefixLower = pathContext.prefix.toLowerCase();
        const seen = new Set<string>();
        const items: CompletionItem[] = [];
        for (const baseDir of baseDirs) {
            let dirUri: URI;
            try {
                dirUri = pathContext.dir ? UriUtils.resolvePath(baseDir, pathContext.dir) : baseDir;
            } catch {
                continue;
            }
            let entries;
            try {
                entries = await this.fileSystemProvider.readDirectory(dirUri);
            } catch {
                // Missing/unreadable directory (e.g. an unresolved prefix) — skip this base.
                continue;
            }
            for (const entry of entries) {
                const name = UriUtils.basename(entry.uri);
                if (!name || !name.toLowerCase().startsWith(prefixLower)) {
                    continue;
                }
                if (entry.isDirectory) {
                    const key = 'dir:' + name.toLowerCase();
                    if (seen.has(key)) {
                        continue;
                    }
                    seen.add(key);
                    items.push({
                        label: name + '/',
                        kind: CompletionItemKind.Folder,
                        sortText: '0_' + name.toLowerCase(), // directories first (drill-down)
                        textEdit: TextEdit.replace(replaceRange, name + '/'),
                        // Re-open completion after the slash so the user can keep drilling down.
                        command: { title: 'Suggest', command: 'editor.action.triggerSuggest' }
                    });
                } else if (entry.isFile && name.toLowerCase().endsWith('.bbj')) {
                    const key = 'file:' + name.toLowerCase();
                    if (seen.has(key)) {
                        continue;
                    }
                    seen.add(key);
                    items.push({
                        label: name,
                        kind: CompletionItemKind.File,
                        sortText: '1_' + name.toLowerCase(),
                        textEdit: TextEdit.replace(replaceRange, name)
                    });
                }
            }
        }
        return items;
    }

    protected async getFieldCompletion(document: LangiumDocument, params: CompletionParams): Promise<CompletionList | undefined> {
        // Get cursor position (the # has already been typed)
        const offset = document.textDocument.offsetAt(params.position);
        const rootNode = document.parseResult.value;

        // Find the leaf node at the # character position (cursor is after #, so offset - 1)
        if (!rootNode.$cstNode) {
            return undefined;
        }
        const leafNode = findLeafNodeAtOffset(rootNode.$cstNode, offset - 1);

        // Locate the enclosing class method. A dangling `#` (no field name typed yet)
        // is an unsatisfiable cross-reference: because newlines are hidden whitespace,
        // the parser scans past the line end and error recovery unwinds the enclosing
        // class/method out of the AST, so the container lookup below finds nothing.
        // In that case, recover the class/method by reparsing a copy of the document
        // with a synthetic identifier inserted after the `#` (issue #445).
        let method = leafNode ? AstUtils.getContainerOfType(leafNode.astNode, isMethodDecl) : undefined;
        let klass = leafNode ? AstUtils.getContainerOfType(leafNode.astNode, isBbjClass) : undefined;

        // Only reparse when the class may have collapsed. A clean parse means the AST is
        // trustworthy: if it says we are not in a class method (e.g. a channel `#1` at
        // program scope), we are not, and there is nothing to recover — so skip the cost.
        if ((!method || !klass) && document.parseResult.parserErrors.length > 0) {
            const recovered = this.recoverCollapsedClassMethod(document, offset);
            method = recovered.method;
            klass = recovered.klass;
        }

        if (!method || !klass) {
            // Not inside a class method — don't provide field completion
            return undefined;
        }

        // Collect fields from the class and its inheritance hierarchy
        const fields = this.collectFields(klass);

        // Convert to completion items
        const items: CompletionItem[] = fields.map(field => {
            const fieldClass = getClass(field.type);
            const fieldType = fieldClass?.name ?? 'Object';
            return {
                label: field.name,
                kind: CompletionItemKind.Variable,
                detail: `${fieldType} field`,
                insertText: field.name,  // Insert field name without #
                sortText: field.name
            };
        });

        return { items, isIncomplete: false };
    }

    /**
     * Recover the class/method enclosing a dangling `#` when error recovery has
     * collapsed them out of the AST (issue #445). A dangling `#` has no field name,
     * so the `SymbolRef.symbol` reference is unsatisfiable; because newlines are hidden
     * whitespace the parser scans past the line end and unwinds the whole class. This
     * reparses a throwaway copy of the document with a synthetic identifier inserted
     * right after the `#`, which keeps the class intact, and reads the enclosing
     * class/method back from that copy at the same offset.
     *
     * The copy is only parsed — never registered, indexed, or built — so it cannot
     * pollute the workspace and has no side effects; it is discarded when this returns.
     * The recovered class always yields the class's own fields; inherited fields resolve
     * on a best-effort basis via the global index in a running server.
     */
    protected recoverCollapsedClassMethod(document: LangiumDocument, offset: number): { method?: MethodDecl, klass?: BbjClass } {
        const text = document.textDocument.getText();
        // The cursor sits directly after the triggering `#`; bail if that is not the case.
        if (text.charAt(offset - 1) !== '#') {
            return {};
        }
        const patched = text.slice(0, offset) + FIELD_COMPLETION_PROBE_ID + text.slice(offset);
        // Keep the `.bbj` extension so the service registry resolves BBj services for the probe.
        const probeUri = document.uri.with({ path: document.uri.path + '.__field-probe__.bbj' });
        const probeRoot = this.documentFactory.fromString(patched, probeUri).parseResult.value;
        if (!probeRoot.$cstNode) {
            return {};
        }
        const probeLeaf = findLeafNodeAtOffset(probeRoot.$cstNode, offset);
        if (!probeLeaf) {
            return {};
        }
        return {
            method: AstUtils.getContainerOfType(probeLeaf.astNode, isMethodDecl),
            klass: AstUtils.getContainerOfType(probeLeaf.astNode, isBbjClass)
        };
    }

    protected getConstructorCompletion(document: LangiumDocument, params: CompletionParams): CompletionList | undefined {
        const offset = document.textDocument.offsetAt(params.position);
        const rootNode = document.parseResult.value;
        if (!rootNode.$cstNode) return undefined;

        const leafNode = findLeafNodeAtOffset(rootNode.$cstNode, offset);
        if (!leafNode) return undefined;

        // Walk up to find ConstructorCall
        const constructorCall = AstUtils.getContainerOfType(leafNode.astNode, isConstructorCall) as ConstructorCall | undefined;
        if (!constructorCall) return undefined;

        // Resolve the class being constructed
        const klass = getClass(constructorCall.klass);
        if (!klass) return undefined;

        const items: CompletionItem[] = [];

        if (isJavaClass(klass)) {
            const constructors = klass.constructors ?? [];
            for (const ctor of constructors) {
                const paramList = ctor.parameters.map(p => {
                    const typeName = p.type.split('.').pop() || p.type;
                    const name = p.realName ?? p.name;
                    return `${typeName} ${name}`;
                }).join(', ');
                const className = klass.name;
                items.push({
                    label: `${className}(${paramList})`,
                    kind: CompletionItemKind.Constructor,
                    detail: `new ${className}(${paramList})`,
                    // Use a textEdit (not insertText): the cursor is between the just-typed `()`, so
                    // a no-arg constructor must insert nothing. An empty insertText is falsy and the
                    // client would fall back to the label `Type()`, nesting it as `new Type(Type())`.
                    textEdit: TextEdit.insert(params.position, ctor.parameters.map((p, i) =>
                        '${' + (i + 1) + ':' + (p.realName ?? p.name) + '}'
                    ).join(', ')),
                    insertTextFormat: 2, // SnippetString
                    tags: ctor.deprecated ? [CompletionItemTag.Deprecated] : undefined,
                });
            }
        } else if (isBbjClass(klass)) {
            // BBj class constructors are MethodDecl named 'create'
            const createMethods = klass.members.filter(m =>
                isMethodDecl(m) && m.name.toLowerCase() === 'create'
            );
            for (const method of createMethods) {
                if (!isMethodDecl(method)) continue;
                const paramList = method.params.map(p => p.name).join(', ');
                items.push({
                    label: `${klass.name}(${paramList})`,
                    kind: CompletionItemKind.Constructor,
                    detail: `new ${klass.name}(${paramList})`,
                    // textEdit (not insertText) so a no-arg `create` inserts nothing rather than
                    // falling back to the label — see the Java-class branch above.
                    textEdit: TextEdit.insert(params.position, method.params.map((p, i) =>
                        '${' + (i + 1) + ':' + p.name + '}'
                    ).join(', ')),
                    insertTextFormat: 2,
                });
            }
        }

        if (items.length === 0) return undefined;
        return { items, isIncomplete: false };
    }

    protected collectFields(klass: BbjClass): FieldDecl[] {
        const fields: FieldDecl[] = [];
        const visited = new Set<BbjClass>();
        const maxDepth = 20;

        // Add fields from current class (all visibilities)
        fields.push(...klass.members.filter(isFieldDecl));

        // Add inherited fields (protected and public only)
        this.collectInheritedFields(klass, fields, visited, 0, maxDepth);

        return fields;
    }

    protected collectInheritedFields(
        klass: BbjClass,
        fields: FieldDecl[],
        visited: Set<BbjClass>,
        depth: number,
        maxDepth: number
    ): void {
        // Cycle protection
        if (visited.has(klass) || depth >= maxDepth) {
            return;
        }
        visited.add(klass);

        // Walk superclass chain
        for (const extendsQualifiedClass of klass.extends) {
            const superClass = getClass(extendsQualifiedClass);

            // Skip unresolved superclass references or non-BBj classes
            if (!superClass || !isBbjClass(superClass)) {
                continue;
            }

            // Collect inherited fields (protected and public only, not private)
            const inheritedFields = superClass.members
                .filter(isFieldDecl)
                .filter(f => {
                    const visibility = f.visibility?.toUpperCase() ?? 'PUBLIC';
                    return visibility === 'PUBLIC' || visibility === 'PROTECTED';
                });

            fields.push(...inheritedFields);

            // Recursively get superclass hierarchy
            this.collectInheritedFields(superClass, fields, visited, depth + 1, maxDepth);
        }
    }

    override createReferenceCompletionItem(nodeDescription: AstNodeDescription | FunctionNodeDescription, _refInfo: ReferenceInfo, _context: CompletionContext): CompletionValueItem {
        const superImpl = super.createReferenceCompletionItem(nodeDescription, _refInfo, _context)
        superImpl.kind = this.nodeKindProvider.getCompletionItemKind(nodeDescription)
        superImpl.sortText = undefined
        // Apply deprecated strikethrough tag based on the resolved AST node's deprecated flag
        if (nodeDescription.node) {
            const node = nodeDescription.node;
            if ((isJavaMethod(node) && node.deprecated) ||
                (isJavaField(node) && node.deprecated) ||
                (isJavaClass(node) && node.deprecated)) {
                superImpl.tags = [CompletionItemTag.Deprecated];
            }
        }
        if (isFunctionNodeDescription(nodeDescription)) {

            const label = (paramAdjust: ((param: string, index: number) => string) = (p, i) => p) =>
                `${nodeDescription.name}(${nodeDescription.parameters.filter(p => !p.optional).map((p, idx) => paramAdjust(p.realName ?? p.name, idx)).join(', ')})`

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
                // Build documentation from node's pre-populated docu field (set by java-interop.ts
                // during class resolution from Javadoc) or fall back to the signature header.
                const node = nodeDescription.node;
                if (isDocumented(node) && node.docu) {
                    const parts: string[] = [];
                    if (node.docu.signature) {
                        parts.push(`\`\`\`java\n${node.docu.signature}\n\`\`\``);
                    }
                    if (node.docu.javadoc) {
                        parts.push(node.docu.javadoc);
                    }
                    if (parts.length > 0) {
                        superImpl.documentation = { kind: 'markdown', value: parts.join('\n\n') };
                    }
                }
                if (!superImpl.documentation) {
                    const content = documentationHeader(node);
                    if (content) {
                        superImpl.documentation = { kind: 'markdown', value: content };
                    }
                }
            }
        } else if (nodeDescription.type === LibSymbolicLabelDecl.$type) {
            superImpl.label = nodeDescription.name
            superImpl.sortText = superImpl.label.slice(1) // remove * so that symbolic labels appear in the alphabetical order
        } else if (nodeDescription.type === LibEventType.$type && 'docu' in nodeDescription && typeof nodeDescription.docu === "string") {
            superImpl.detail = nodeDescription.docu;
        }
        return superImpl;
    }

    protected override completionForKeyword(context: CompletionContext, keyword: GrammarAST.Keyword, acceptor: CompletionAcceptor): MaybePromise<void> {
        // Filter out keywords that do not contain any word character
        if (!keyword.value.match(/[\w]/)) {
            return;
        }
        acceptor(context, {
            label: keyword.value?.toLowerCase(),
            kind: CompletionItemKind.Keyword,
            detail: 'Keyword',
            sortText: undefined
        });
    }
}


// Synthetic identifier inserted after a dangling `#` so the class survives reparse
// during field-completion recovery (see recoverCollapsedClassMethod). Its value is
// irrelevant — it is only used to keep the parser from unwinding the class.
const FIELD_COMPLETION_PROBE_ID = 'a';

function toSimpleName(type: string): string {
    return type.split('.').pop() || type
}

/** Result of detecting the file-path completion position inside a `::...::` segment. */
export interface FilePathCompletionContext {
    /** Full partial path typed between the opening `::` and the cursor (e.g. `util/foo`). */
    typed: string;
    /** The already-typed directory portion, with trailing slash, or '' when none (e.g. `util/`). */
    dir: string;
    /** The leaf prefix to filter directory entries by, or '' (e.g. `foo`). */
    prefix: string;
}

/**
 * Detects whether the cursor sits inside an unclosed `::...::` file-path segment of a `use` or
 * `declare` statement, and if so splits the partial path already typed into a directory portion
 * plus a leaf prefix. Returns undefined otherwise: not a use/declare line, no opening `::` before
 * the cursor, or the segment is already closed by a second `::` (the class-name portion, which the
 * scope provider completes on its own).
 *
 * Pure string logic (unit-tested directly). BBj is case-insensitive.
 *
 * @param lineText     full text of the current line
 * @param cursorColumn 0-based column of the cursor within the line
 */
export function parseFilePathCompletionContext(lineText: string, cursorColumn: number): FilePathCompletionContext | undefined {
    const beforeCursor = lineText.substring(0, cursorColumn);
    // Only inside a `use`/`declare` statement (leading whitespace allowed). BBj is case-insensitive.
    if (!/^\s*(use|declare)\b/i.test(beforeCursor)) {
        return undefined;
    }
    const openIdx = beforeCursor.indexOf('::');
    if (openIdx === -1) {
        return undefined;
    }
    const afterOpen = beforeCursor.substring(openIdx + 2);
    // A second `::` before the cursor closes the path segment — the cursor is in the class-name
    // portion (`::path::Class`), handled by the default class completion, not here.
    if (afterOpen.includes('::')) {
        return undefined;
    }
    return splitTypedPath(afterOpen);
}

/**
 * Splits a partial path into the already-typed directory portion (with trailing slash) and the leaf
 * prefix to filter directory entries by. Shared by the USE/DECLARE `::...::` and RUN/CALL `"..."`
 * detectors so both produce the same {@link FilePathCompletionContext}.
 */
function splitTypedPath(typed: string): FilePathCompletionContext {
    const slashIdx = Math.max(typed.lastIndexOf('/'), typed.lastIndexOf('\\'));
    const dir = slashIdx === -1 ? '' : typed.substring(0, slashIdx + 1);
    const prefix = slashIdx === -1 ? typed : typed.substring(slashIdx + 1);
    return { typed, dir, prefix };
}

/**
 * Detects whether the cursor sits inside the file-name string literal of a `RUN` or `CALL` statement
 * (`RUN "prog"`, `CALL "prog"`) and, if so, splits the partial path already typed into a directory
 * portion plus a leaf prefix — the same shape used for the `::...::` path of USE/DECLARE (issue #456,
 * extended per the issue comment: RUN/CALL also accept a string-literal file name).
 *
 * Returns undefined when: the line is not a RUN/CALL statement, the cursor is not inside a string
 * literal, the string is a later `CALL` argument (a comma precedes its opening quote — only the first
 * operand is the file id), or the cursor is past a `program::label` separator (only the program part
 * is a path). Pure string logic (unit-tested directly). BBj is case-insensitive.
 *
 * @param lineText     full text of the current line
 * @param cursorColumn 0-based column of the cursor within the line
 */
export function parseRunCallFilePathContext(lineText: string, cursorColumn: number): FilePathCompletionContext | undefined {
    const beforeCursor = lineText.substring(0, cursorColumn);
    // Anchor the RUN/CALL verb at statement start (leading whitespace allowed) and require a space or
    // quote after it, so an assignment to a `run$`/`call$` variable is not mistaken for the verb.
    const kwMatch = /^\s*(run|call)(?=\s|")/i.exec(beforeCursor);
    if (!kwMatch) {
        return undefined;
    }
    const afterKw = beforeCursor.substring(kwMatch.index + kwMatch[0].length);
    // Inside a string literal iff an odd number of quotes precede the cursor.
    if (((afterKw.match(/"/g) ?? []).length) % 2 === 0) {
        return undefined;
    }
    const openQuoteIdx = afterKw.lastIndexOf('"');
    // A comma before the opening quote means this string is a later CALL argument, not the file id.
    if (afterKw.substring(0, openQuoteIdx).includes(',')) {
        return undefined;
    }
    const typed = afterKw.substring(openQuoteIdx + 1);
    // `CALL "program::label"` — only the part before `::` is a file path; once the cursor is past the
    // separator it is in the label, not the file name.
    if (typed.includes('::')) {
        return undefined;
    }
    return splitTypedPath(typed);
}
