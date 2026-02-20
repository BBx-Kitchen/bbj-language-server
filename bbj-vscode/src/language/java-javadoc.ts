/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { EmptyFileSystemProvider, FileSystemNode, FileSystemProvider } from "langium";
import { CancellationToken } from "vscode-jsonrpc";
import { URI } from "vscode-uri";
import { Documented, JavaClass, NamedElement, isJavaClass, isJavaMember } from "./generated/ast.js";
import { logger } from "./logger.js";

/**
 * Provides Javadoc information for internal binary classes.
 */
export class JavadocProvider {

    private static _instance: JavadocProvider;

    private lazyLoad: boolean = false;
    private initialized: boolean = false;
    private packages: Map<string, PackageDoc | URI | null> = new Map();
    private loadPromises: Map<string, Promise<PackageDoc | undefined>> = new Map();
    private fsAccess: FileSystemProvider = new EmptyFileSystemProvider();


    protected constructor(lazyLoad: boolean = true) {
        this.lazyLoad = lazyLoad;
    }

    static getInstance(): JavadocProvider {
        if (!JavadocProvider._instance) {
            JavadocProvider._instance = new JavadocProvider();
        }
        return JavadocProvider._instance;
    }

    /**
     * 
     * @param roots folders that contains javadoc files
     * @param fsAccess file system access
     * @param cancelToken handles cancel requests
     */
    async initialize(roots: URI[], fsAccess: FileSystemProvider, cancelToken: CancellationToken = CancellationToken.None) {
        if (this.isInitialized()) {
            throw new Error("JavadocProvider already initialized");
        }
        this.fsAccess = fsAccess;
        const failedRoots: string[] = [];
        let successCount = 0;
        for (const root of roots.filter(uri => uri.scheme === 'file')) {
            if (cancelToken.isCancellationRequested) {
                logger.warn("Cancelation requested in JavadocProvider.");
                // Cancellation during javadoc initialization is harmless — any roots
                // already processed remain available. Skipping remaining roots is
                // acceptable since javadoc is a best-effort enhancement.
                return;
            }
            let nodes: FileSystemNode[];
            try {
                nodes = await this.fsAccess.readDirectory(root)
            } catch (e) {
                failedRoots.push(root.toString());
                logger.debug(`Failed to read javadoc directory ${root.toString()}: ${e}`);
                continue;
            }
            logger.debug(`Scanning directory for javadoc: ${root.toString()}`);

            for (const node of nodes) {
                const fileName = this.filename(node.uri)
                if (node.isFile && fileName && fileName.endsWith(".json")) {
                    logger.debug(`Found ${fileName.toString()}`)
                    const packageName = fileName.slice(0, -5); // cut .json
                    if (packageName !== undefined) {
                        this.packages.set(packageName, this.lazyLoad ? node.uri : await this.loadJavadocFile(packageName, node.uri));
                    }
                }
            }
            successCount++;
        }
        if (successCount === 0 && failedRoots.length > 0) {
            logger.warn(`Javadoc: no sources accessible (tried ${failedRoots.length} path(s)). Javadoc tooltips will be unavailable.`);
        }
        this.initialized = true;
        logger.info(`JavadocProvider initialized with ${this.packages.size} packages from ${successCount} source(s).`);
    }

    /**
     * 
     * @returns true if JavadocProvider is initialized
     */
    public isInitialized(): boolean {
        return this.initialized;
    }

    async getDocumentation(node: Documented & NamedElement): Promise<NamedDoc | undefined> {
        let clazz: JavaClass | undefined;
        if (isJavaClass(node)) {
            clazz = node;
        } else if (isJavaMember(node) && isJavaClass(node.$container)) {
            clazz = node.$container;
        }
        if (clazz) {
            const qName = clazz.name.indexOf('.') > -1 ? clazz.name : (clazz as any)['simpleName'] ? (clazz as any).simpleName : clazz.name;
            const qnParts = qName.split('.')
            const className = qnParts.pop();
            const packageDoc = await this.getPackageDoc(qnParts.join('.'));
            const classDoc = packageDoc?.classes.find(c => c.name === className);
            if (classDoc) {
                switch (node.$type) {
                    case 'JavaClass':
                        return classDoc;
                    case 'JavaField':
                        return classDoc.fields.find(c => c.name === node.name);
                    case 'JavaMethod':/* TODO check method overloading */
                        return classDoc.methods.find(c => c.name === node.name);
                    // TODO handle constructors
                }
            }
        }
        return undefined;
    }

    async getPackageDoc(packageName: string): Promise<PackageDoc | undefined> {
        if (!this.isInitialized()) {
            throw new Error("JavadocProvider not initialized. Call initialize() first.");
        }

        if (this.loadPromises.has(packageName)) {
            // Wait for the ongoing operation to complete
            return this.loadPromises.get(packageName);
        }
        const packageDoc = this.packages.get(packageName);
        if (!packageDoc) {
            return undefined;
        } else if (packageDoc instanceof URI) {
            const loadPromise = this.loadJavadocFile(packageName, packageDoc)
                .then((resolvedDoc) => {
                    this.packages.set(packageName, resolvedDoc);
                    this.loadPromises.delete(packageName);
                    return resolvedDoc === null ? undefined : resolvedDoc;
                })
                .catch((error) => {
                    this.loadPromises.delete(packageName);
                    throw error;
                });
            this.loadPromises.set(packageName, loadPromise);
            return loadPromise;
        } else {
            return packageDoc;
        }
    }

    /**
     * Load javadoc file
     * @param packageName 
     * @param packageDocURI 
     * @returns PackageDoc or null. Null if failed to load.
     */
    protected async loadJavadocFile(packageName: string, packageDocURI: URI): Promise<PackageDoc | null> {
        try {
            const doc = JSON.parse(await this.readFile(packageDocURI)) as PackageDoc;
            if (doc.name !== packageName) {
                logger.error(`Failed to load javadoc file, package name '${doc.name}' does not match file name ${packageDocURI.toString()}`);
                return null;
            }
            logger.debug(`Javadoc for package '${packageName}' loaded.`);
            return doc;
        } catch (e) {
            logger.error(`Failed to load javadoc file ${packageDocURI.toString()}: ${e}`);
        }
        return null
    }

    protected async readFile(packageDocURI: URI): Promise<string> {
        return await this.fsAccess.readFile(packageDocURI)
    }

    protected filename(uri: URI): string | undefined {
        return uri.path.split('/').pop();
    }
}

// JSON structure
export type NamedDoc = {
    name: string,
    docu?: string
}

export type PackageDoc = NamedDoc & {
    classes: ClassDoc[]
}

export type ClassDoc = NamedDoc & {
    fields: NamedDoc[],
    methods: MethodDoc[],
    constructors?: MethodDoc[]
}

export type MethodDoc = NamedDoc & {
    params: NamedDoc[]
}

export function isMethodDoc(item: NamedDoc | undefined): item is MethodDoc {
    return item !== undefined && (item as any).params !== undefined;
}


export function isClassDoc(item: NamedDoc | undefined): item is ClassDoc {
    return item !== undefined && (item as any).methods !== undefined && (item as any).fields !== undefined;
}