import { AstNodeDescription, AstNode, DefaultIndexManager, LangiumDocument, LangiumSharedCoreServices, URI, WorkspaceManager } from "langium";
import { CancellationToken } from "vscode-languageserver";
import { normalize } from "path";
import { BBjWorkspaceManager } from "./bbj-ws-manager.js";
import { JavaSyntheticDocUri } from "./java-interop.js";
import { BbjClass } from "./generated/ast.js";

/**
 * Normalized, case-insensitive path key for a document URI. Matches exactly the
 * normalization `getBBjClassesFromFile` used before this index existed, so a lookup
 * against `bbjClassesByPath` returns the same documents the old full scan would have.
 */
function pathKeyOf(uri: URI): string {
    return normalize(uri.fsPath).toLowerCase();
}

export class BBjIndexManager extends DefaultIndexManager {

    wsManager: () => WorkspaceManager;

    /**
     * Path-keyed view of every document's exported BbjClass descriptions, maintained
     * incrementally in updateContent/removeContent (D-10, #505). Keyed by the document's
     * normalized, lowercased path; each entry maps document URI string to that document's
     * BbjClass descriptions, so two documents that happen to normalize to the same path
     * (should that ever occur) are both retained.
     */
    private readonly bbjClassesByPath = new Map<string, Map<string, AstNodeDescription[]>>();
    /** Document URI string -> insertion order, mirroring `symbolIndex`'s own Map insertion order. */
    private readonly documentOrder = new Map<string, number>();
    private nextDocumentOrder = 0;

    constructor(services: LangiumSharedCoreServices) {
        super(services);
        this.wsManager = () => services.workspace.WorkspaceManager;
    }

    public override isAffected(document: LangiumDocument<AstNode>, changedUris: Set<string>): boolean {
        if(document.uri.toString() === JavaSyntheticDocUri || document.uri.scheme === 'bbjlib') {
            // only affected by ClassPath changes
            return false;
        }
        if (this.wsManager() instanceof BBjWorkspaceManager) {
            const bbjWsManager = this.wsManager() as BBjWorkspaceManager;
            const isExternal = bbjWsManager.isExternalDocument(document.uri)
            // Don't rebuild external documents if workspace documents changed
            if(![...changedUris].every(changed => bbjWsManager.isExternalDocument(URI.parse(changed))) && isExternal) {
                return false;
            }
        }
        return super.isAffected(document, changedUris);
    }

    override async updateContent(document: LangiumDocument<AstNode>, cancelToken: CancellationToken = CancellationToken.None): Promise<void> {
        await super.updateContent(document, cancelToken);
        const docUriString = document.uri.toString();
        if (!this.documentOrder.has(docUriString)) {
            this.documentOrder.set(docUriString, this.nextDocumentOrder++);
        }
        const exported = (this.symbolIndex.get(docUriString) ?? [])
            .filter(d => this.astReflection.isSubtype(d.type, BbjClass.$type));
        const pathKey = pathKeyOf(document.uri);
        if (exported.length > 0) {
            let byDocument = this.bbjClassesByPath.get(pathKey);
            if (!byDocument) {
                byDocument = new Map();
                this.bbjClassesByPath.set(pathKey, byDocument);
            }
            byDocument.set(docUriString, exported);
        } else {
            this.forgetPathEntry(pathKey, docUriString);
        }
    }

    override removeContent(uri: URI): void {
        super.removeContent(uri);
        const docUriString = uri.toString();
        this.documentOrder.delete(docUriString);
        this.forgetPathEntry(pathKeyOf(uri), docUriString);
    }

    private forgetPathEntry(pathKey: string, docUriString: string): void {
        const byDocument = this.bbjClassesByPath.get(pathKey);
        if (!byDocument) {
            return;
        }
        byDocument.delete(docUriString);
        if (byDocument.size === 0) {
            this.bbjClassesByPath.delete(pathKey);
        }
    }

    /**
     * BbjClass descriptions exported by any document matching one of `fileUris`, ordered
     * the way the full-index scan `getBBjClassesFromFile` used to produce: by document
     * insertion order into the index, not by candidate-path order. Two candidate URIs that
     * normalize to the same file contribute that file's classes once, not twice (#505).
     */
    public getBBjClassesForFiles(fileUris: URI[]): AstNodeDescription[] {
        const seenKeys = new Set<string>();
        const matchedDocuments = new Map<string, AstNodeDescription[]>();
        for (const fileUri of fileUris) {
            const key = pathKeyOf(fileUri);
            if (seenKeys.has(key)) {
                continue;
            }
            seenKeys.add(key);
            const byDocument = this.bbjClassesByPath.get(key);
            if (!byDocument) {
                continue;
            }
            for (const [docUriString, descriptions] of byDocument) {
                if (!matchedDocuments.has(docUriString)) {
                    matchedDocuments.set(docUriString, descriptions);
                }
            }
        }
        return [...matchedDocuments.entries()]
            .sort(([a], [b]) => (this.documentOrder.get(a) ?? 0) - (this.documentOrder.get(b) ?? 0))
            .flatMap(([, descriptions]) => descriptions);
    }

}