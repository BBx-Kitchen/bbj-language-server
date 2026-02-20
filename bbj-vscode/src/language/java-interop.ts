/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstUtils, isJSDoc, LangiumDocument, LangiumDocuments, Mutable, parseJSDoc } from 'langium';
import { Socket } from 'net';
import {
    CancellationToken, createMessageConnection, MessageConnection, RequestType, SocketMessageReader, SocketMessageWriter
} from 'vscode-jsonrpc/node.js';
import { URI } from 'vscode-uri';
import { BBjServices } from './bbj-module.js';
import { notifyJavaConnectionError } from './bbj-notifications.js';
import { Classpath, DocumentationInfo, JavaClass, JavaField, JavaMethod, JavaMethodParameter, JavaPackage } from './generated/ast.js';
import { isClassDoc, JavadocProvider } from './java-javadoc.js';
import { logger } from './logger.js';
import { assertType } from './utils.js';

const implicitJavaImports = ['java.lang', 'com.basis.startup.type', 'com.basis.bbj.proxies', 'com.basis.bbj.proxies.sysgui', 'com.basis.bbj.proxies.event', 'com.basis.startup.type.sysgui', 'com.basis.bbj.proxies.servlet']

export const JavaSyntheticDocUri = 'classpath:/bbj.bbl'

/**
 * Manages Java interop operations including class resolution, classpath loading,
 * and communication with the Java backend service.
 */
export class JavaInteropService {

    private connection?: MessageConnection;
    private readonly _resolvedClasses: Map<string, JavaClass> = new Map();
    private readonly childrenOfByName = new Map<JavaClass | JavaPackage | Classpath, Map<string, JavaClass | JavaPackage>>();
    /** Queue-based async mutex: each entry is a resolve function that grants the lock to the next waiter. */
    private lockQueue: Array<() => void> = [];
    private lockHeld = false;
    /** Tracks the current lock owner to allow re-entrant acquisition during recursive resolveClass calls. */
    private currentLockToken: object | null = null;
    /** In-flight resolution promises keyed by class name, preventing duplicate concurrent resolution of the same class. */
    private readonly _pendingResolutions: Map<string, Promise<JavaClass>> = new Map();
    /** Maximum recursion depth for Java class resolution to prevent runaway resolution chains. */
    private static readonly MAX_RESOLUTION_DEPTH = 20;
    /** Maximum time (ms) allowed for a single resolveClassByName call chain before aborting. */
    private static readonly RESOLUTION_TIMEOUT_MS = 30_000;
    private interopHost: string = '127.0.0.1';
    private interopPort: number = 5008;

    protected readonly langiumDocuments: LangiumDocuments;
    protected readonly classpathDocument: LangiumDocument<Classpath>;
    protected javadocProvider = JavadocProvider.getInstance();

    /**
     * @param services BBj language services providing access to documents and workspace
     */
    constructor(services: BBjServices) {
        this.langiumDocuments = services.shared.workspace.LangiumDocuments;
        this.classpathDocument = services.shared.workspace.LangiumDocumentFactory.fromModel(<Classpath>{
            $container: undefined!,
            $type: Classpath.$type,
            packages: [],
            classes: []
        }, URI.parse(JavaSyntheticDocUri));
    }

    private get resolvedClasses(): Map<string, JavaClass> {
        return this._resolvedClasses;
    }

    /**
     * Establishes connection to the Java backend service
     */
    protected async connect(): Promise<MessageConnection> {
        if (this.connection) {
            return this.connection;
        }
        let socket: Socket;
        try {
            socket = await this.createSocket();
        } catch (e) {
            const detail = e instanceof Error ? e.message : String(e);
            notifyJavaConnectionError(detail);
            console.error('Failed to connect to the Java service.', e);
            return Promise.reject(e);
        }
        const connection = createMessageConnection(new SocketMessageReader(socket), new SocketMessageWriter(socket));
        connection.listen();
        this.connection = connection;
        return connection;
    }

    /**
     * Sets the connection configuration for the Java interop service.
     * Call clearCache() separately to reconnect with new settings.
     * @param host hostname or IP address of the Java interop service
     * @param port port number of the Java interop service
     */
    public setConnectionConfig(host: string, port: number): void {
        this.interopHost = host || '127.0.0.1';
        this.interopPort = port || 5008;
        logger.debug(`Java interop connection config: ${this.interopHost}:${this.interopPort}`);
    }

    /**
     * Creates a socket connection to the Java service
     */
    protected createSocket(): Promise<Socket> {
        return new Promise((resolve, reject) => {
            const socket = new Socket();
            const timeout = setTimeout(() => {
                socket.destroy();
                reject(new Error('Socket connection to Java service timed out after 10s'));
            }, 10000);
            socket.on('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
            socket.on('ready', () => {
                clearTimeout(timeout);
                resolve(socket);
            });
            socket.connect(this.interopPort, this.interopHost);
        });
    }

    protected get classpath(): Classpath {
        return this.classpathDocument.parseResult.value;
    }

    /**
     * Retrieves a previously resolved Java class by its fully qualified name.
     * @param className fully qualified class name (e.g., "java.lang.String")
     * @returns the resolved JavaClass or undefined if not found
     */
    getResolvedClass(className: string): JavaClass | undefined {
        if (className === 'java.lang.Object') {
            // called very often, so cache it
            return this.javaLangObject()
        }
        return this.resolvedClasses.get(className);
    }

    private JAVA_LANG_OBJECT: JavaClass | undefined = undefined;

    private javaLangObject(): JavaClass | undefined {
        if (!this.JAVA_LANG_OBJECT) {
            this.JAVA_LANG_OBJECT = this.resolvedClasses.get('java.lang.Object');
        }
        return this.JAVA_LANG_OBJECT;
    }

    /**
     * Retrieves raw class information from the Java backend service
     * @param className fully qualified name of the class to retrieve
     * @param token cancellation token for request cancellation
     */
    protected async getRawClass(className: string, token?: CancellationToken): Promise<JavaClass> {
        const connection = await this.connect();
        return Promise.race([
            connection.sendRequest(getClassInfoRequest, { className }, token),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Java class resolution timeout for ${className}`)), 10000))
        ]);
    }

    /**
     * Loads the Java classpath from the specified entries.
     * @param classPath array of classpath entries (file paths or BBj classpath notation)
     * @param token cancellation token for request cancellation
     * @returns true if classpath was loaded successfully, false otherwise
     */
    public async loadClasspath(classPath: string[], token?: CancellationToken): Promise<boolean> {
        logger.debug(() => "Load classpath from: " + classPath.join(', '))
        try {
            const entries = classPath.filter(entry => entry.length > 0).map(entry => {
                // If entry is already wrapped in square brackets (BBj classpath notation), keep it as is
                // Otherwise, add 'file:' prefix for regular file paths
                if (entry.startsWith('[') && entry.endsWith(']')) {
                    return entry;
                }
                return 'file:' + entry;
            });
            const connection = await this.connect();
            return await connection.sendRequest(loadClasspathRequest, { classPathEntries: entries }, token);
        } catch (e) {
            console.error(e)
            return false;
        }
    }

    /**
     * Loads implicit Java imports including standard packages and BBj-specific packages.
     * @param token cancellation token for request cancellation
     * @returns true if implicit imports were loaded successfully, false otherwise
     */
    public async loadImplicitImports(token?: CancellationToken): Promise<boolean> {
        logger.debug(() => "Load package classes: " + implicitJavaImports.join(', '))
        try {
            const connection = await this.connect();
            await Promise.all(implicitJavaImports.concat('java.sql').map(async pack => {
                const classInfos = await connection.sendRequest(getClassInfosRequest, { packageName: pack }, token);
                await Promise.all(classInfos.map(async javaClass => {
                    await this.resolveClass(javaClass, token)

                    if (pack !== 'java.sql') { // Not an implicit import but sql package preload.
                        // add as implicit Java package import
                        const simpleNameCopy = { ...javaClass }
                        simpleNameCopy.name = javaClass.name.replace(pack + '.', '')
                        simpleNameCopy.$containerIndex = this.classpath.classes.length;
                        this.classpath.classes.push(simpleNameCopy);
                        this.resolvedClasses.set(simpleNameCopy.name, simpleNameCopy);
                    }
                }))
            }))
            logger.info(() => "Loaded " + this.classpath.classes.length + " classes")

            if (!this.langiumDocuments.hasDocument(this.classpathDocument.uri)) {
                this.langiumDocuments.addDocument(this.classpathDocument);
            }
            // Try to get top level packages, but handle gracefully if not supported
            try {
                const topLevelPackages = await connection.sendRequest(getTopLevelPackages, {}, token);
                for (const pack of topLevelPackages) {
                    const parts = pack.packageName.split('.');
                    let parent: Classpath | JavaPackage = this.classpath;
                    parts.forEach((part, index) => {
                        if (!this.childrenOfByName.has(parent)) {
                            this.childrenOfByName.set(parent, new Map());
                        }
                        const children = this.childrenOfByName.get(parent)!;
                        if (!children.get(part)) {
                            // Ensure parent.packages exists
                            if (!parent.packages) {
                                parent.packages = [];
                            }
                            const javaPackage: JavaPackage = {
                                $container: parent,
                                $type: JavaPackage.$type,
                                classes: [],
                                packages: [],
                                name: part,
                                $containerIndex: parent.packages.length,
                                $containerProperty: 'packages',
                            };
                            parent.packages.push(javaPackage);
                            children.set(part, javaPackage);
                        }
                        parent = children.get(part) as JavaPackage;
                    })
                }
            } catch (topLevelErr) {
                // getTopLevelPackages might not be supported by older Java interop versions
                logger.debug("getTopLevelPackages not supported, skipping top-level package initialization");
            }
            return true;
        } catch (e) {
            console.error(e)
            return false;
        }
    }

    /**
     * Resolves a Java class by its fully qualified name, fetching from the Java backend if not already cached.
     * This method acquires a lock to prevent concurrent resolution of the same class.
     * @param className fully qualified class name (e.g., "java.lang.String")
     * @param token cancellation token for request cancellation
     * @returns the resolved JavaClass with all dependencies linked
     */
    async resolveClassByName(className: string, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
        // Safeguard 2: depth limit to prevent runaway recursive resolution chains
        if (_depth > JavaInteropService.MAX_RESOLUTION_DEPTH) {
            logger.warn(`Java class resolution depth limit (${JavaInteropService.MAX_RESOLUTION_DEPTH}) exceeded for '${className}', returning partial class`);
            return this.createStubClass(className);
        }

        // Fast path: already fully resolved
        if (this.resolvedClasses.has(className)) {
            return this.resolvedClasses.get(className)!;
        }

        // Safeguard 3: deduplicate — if another caller is already resolving this class, wait for it
        const pending = this._pendingResolutions.get(className);
        if (pending) {
            return pending;
        }

        const resolutionPromise = this.doResolveClassByName(className, token, _depth);
        this._pendingResolutions.set(className, resolutionPromise);
        try {
            return await resolutionPromise;
        } finally {
            this._pendingResolutions.delete(className);
        }
    }

    private async doResolveClassByName(className: string, token: CancellationToken | undefined, depth: number): Promise<JavaClass> {
        // Safeguard 4: timeout to prevent indefinitely stuck resolution chains
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Java class resolution chain timed out after ${JavaInteropService.RESOLUTION_TIMEOUT_MS}ms for '${className}'`)), JavaInteropService.RESOLUTION_TIMEOUT_MS)
        );

        // Create a lock token scoped to this top-level resolution chain.
        // Re-entrant calls from resolveClass (field/method type resolution) share the same token.
        const lockToken = depth === 0 ? {} : (this.currentLockToken ?? {});
        const release = await this.acquireLock(lockToken);
        try {
            // Double-check after acquiring lock
            if (this.resolvedClasses.has(className)) {
                return this.resolvedClasses.get(className)!;
            }
            const javaClass: Mutable<JavaClass> = await Promise.race([
                this.getRawClass(className, token),
                timeoutPromise
            ]);
            return await Promise.race([
                this.resolveClass(javaClass, token, depth),
                timeoutPromise
            ]);
        } catch (e) {
            logger.warn(`Failed to resolve Java class '${className}': ${e}`);
            return this.createStubClass(className);
        } finally {
            release();
        }
    }

    /**
     * Creates a minimal stub JavaClass for cases where resolution fails or is aborted.
     * This prevents callers from receiving undefined and allows partial results.
     */
    private createStubClass(className: string): JavaClass {
        const existing = this.resolvedClasses.get(className);
        if (existing) return existing;

        const stub: Mutable<JavaClass> = {
            $type: JavaClass.$type,
            $container: this.classpath,
            $containerProperty: 'classes',
            $containerIndex: this.classpath.classes.length,
            name: className,
            packageName: extractPackageName(className),
            fields: [],
            methods: [],
            classes: [],
            error: `Resolution failed or depth limit exceeded`,
        } as unknown as Mutable<JavaClass>;
        this.resolvedClasses.set(className, stub);
        return stub;
    }

    /**
     * Resolves and links a Java class with its dependencies including fields, methods, parameters, and documentation.
     * This method processes the raw class data, resolves type references, links Javadoc, and stores the class in the AST hierarchy.
     * @param javaClass the Java class to resolve and link
     * @param token cancellation token for request cancellation
     * @returns the resolved and linked JavaClass
     */
    protected async resolveClass(javaClass: Mutable<JavaClass>, token?: CancellationToken, _depth: number = 0): Promise<JavaClass> {
        const className = javaClass.name
        if (this.resolvedClasses.has(className)) {
            return this.resolvedClasses.get(className)!;
        }

        if (!this.langiumDocuments.hasDocument(this.classpathDocument.uri)) {
            this.langiumDocuments.addDocument(this.classpathDocument);
        }

        javaClass.$type = JavaClass.$type; // make isJavaClass work
        const packageName = extractPackageName(className);
        logger.debug(() => `Resolving class ${className}: ${javaClass.methods?.length ?? 0} methods, ${javaClass.fields?.length ?? 0} fields`);

        if (!javaClass.packageName) {
            // can happen if the class was not found by Java backend
            javaClass.packageName = packageName;
        }
        javaClass.classes ??= [];

        this.storeJavaClass(javaClass, javaClass.packageName);
        if (javaClass.$container === undefined) {
            console.error(`Java class ${className} has no container, packageName: ${javaClass.packageName}`);
            javaClass.$container = this.classpath; // fallback to classpath
        }
        this.resolvedClasses.set(className, javaClass); // add class even if it has an error

        try {
            const documentation = await this.javadocProvider.getDocumentation(javaClass);
            for (const field of javaClass.fields) {
                (field as Mutable<JavaField>).$type = JavaField.$type;
                field.resolvedType = {
                    ref: await this.resolveClassByName(field.type, token, _depth + 1),
                    $refText: field.type
                };
            }
            for (const method of javaClass.methods) {
                (method as Mutable<JavaMethod>).$type = JavaMethod.$type;
                const methodDocs = isClassDoc(documentation) ? documentation.methods.filter(
                    m => m.name == method.name
                        && m.params.length === method.parameters.length
                ) : [];
                method.resolvedReturnType = {
                    ref: await this.resolveClassByName(method.returnType, token, _depth + 1),
                    $refText: method.returnType
                };
                for (const [index, parameter] of method.parameters.entries()) {
                    (parameter as Mutable<JavaMethodParameter>).$type = JavaMethodParameter.$type;
                    parameter.resolvedType = {
                        ref: await this.resolveClassByName(parameter.type, token, _depth + 1),
                        $refText: parameter.type
                    };
                    if (methodDocs.length > 0) {
                        // TODO check types of parameters
                        parameter.realName = methodDocs[0].params[index]?.name
                    }
                }
                if (methodDocs.length > 0 && methodDocs[0].docu) {
                    const doc = methodDocs[0];
                    // Build signature: "ReturnType ClassName.methodName(Type paramName, ...)"
                    const params = method.parameters.map((p, idx) => {
                        const realName = doc.params[idx]?.name ?? p.name;
                        return `${javaTypeAdjust(p.type)} ${realName}`;
                    }).join(', ');
                    const ownerName = javaClass.name.split('.').pop() ?? javaClass.name;
                    const signature = `${javaTypeAdjust(method.returnType)} ${ownerName}.${method.name}(${params})`;
                    (method as Mutable<JavaMethod>).docu = {
                        $type: 'DocumentationInfo',
                        $container: method,
                        javadoc: tryParseJavaDoc(doc.docu!),
                        signature: signature
                    } as DocumentationInfo;
                }
                AstUtils.linkContentToContainer(method);
            }
        } catch (e) {
            // finish linking of the class even if it has an error
            console.error(e)
        }
        AstUtils.linkContentToContainer(javaClass);
        return javaClass;
    }

    /**
     * Retrieves all child packages and classes of a given package-like container.
     * @param javaPackageLike the parent container (JavaClass, JavaPackage, or undefined for classpath root)
     * @returns array of child JavaClass and JavaPackage elements
     */
    getChildrenOf(javaPackageLike?: JavaClass | JavaPackage) {
        const children = this.childrenOfByName.get(javaPackageLike ?? this.classpath);
        if (!children) {
            return [];
        }
        return [...children.values()];
    }

    /**
     * Retrieves a specific child package or class by name from a parent container.
     * @param javaPackageLike the parent container (defaults to classpath root)
     * @param childName the name of the child to retrieve
     * @returns the matching JavaClass or JavaPackage, or undefined if not found
     */
    getChildOf(javaPackageLike: JavaClass | JavaPackage | Classpath = this.classpath, childName: string): JavaClass | JavaPackage | undefined {
        return this.childrenOfByName.get(javaPackageLike)?.get(childName);
    }

    /**
     * Stores a Java class in the AST hierarchy, creating intermediate packages as needed.
     * This method builds the complete package structure and links the class to its parent container.
     * @param javaClass the Java class to store in the hierarchy
     * @param packageName the fully qualified package name (e.g., "java.lang")
     */
    storeJavaClass(javaClass: Mutable<JavaClass>, packageName: string): void {

        // Defensive check for javaClass.name
        if (!javaClass.name || typeof javaClass.name !== 'string') {
            console.error('Invalid javaClass.name:', javaClass.name);
            return;
        }
        javaClass.$type = JavaClass.$type;

        const simpleName = (packageName.length > 0) ? javaClass.name.replace(packageName + '.', '') : javaClass.name;
        if (javaClass.packageName !== packageName) {
            logger.warn(`Package name mismatch for class ${javaClass.name}: expected '${javaClass.packageName}', got '${packageName}'`);
        }

        const classpath = this.classpath;
        let parent: Classpath | JavaPackage | JavaClass = classpath;

        const parts = packageName.split('.').concat(simpleName);

        parts.forEach((part, index) => {
            if (!this.childrenOfByName.has(parent)) {
                this.childrenOfByName.set(parent, new Map());
            }
            const children = this.childrenOfByName.get(parent)!;
            if (!children.has(part)) {
                if (index === parts.length - 1) {
                    javaClass.$container = parent;
                    javaClass.$containerProperty = 'classes';
                    // Ensure parent.classes exists
                    if (!parent.classes) {
                        parent.classes = [];
                    }
                    javaClass.$containerIndex = parent.classes.length;
                    javaClass.name = part;
                    parent.classes.push(javaClass);
                    children.set(part, javaClass);
                } else {
                    assertType<JavaPackage>(parent);
                    // Ensure parent.packages exists
                    if (!parent.packages) {
                        parent.packages = [];
                    }
                    const javaPackage: JavaPackage = {
                        $container: parent,
                        $type: JavaPackage.$type,
                        classes: [],
                        packages: [],
                        name: part,
                        $containerIndex: parent.packages.length,
                        $containerProperty: 'packages',
                    };
                    parent.packages.push(javaPackage);
                    children.set(part, javaPackage);
                }
            }
            parent = children.get(part)!;
        });
    }

    /**
     * Clears all cached Java class data, disconnects the current connection,
     * and resets the classpath document. Call this before reloading classpath.
     */
    public clearCache(): void {
        // Clear resolved classes cache
        this._resolvedClasses.clear();

        // Clear in-flight resolution promises
        this._pendingResolutions.clear();

        // Clear children-of-by-name map
        this.childrenOfByName.clear();

        // Clear java.lang.Object cache
        this.JAVA_LANG_OBJECT = undefined;

        // Reset lock state
        this.lockQueue = [];
        this.lockHeld = false;
        this.currentLockToken = null;

        // Reset classpath document arrays
        this.classpath.packages = [];
        this.classpath.classes = [];

        // Disconnect existing connection so a fresh one is created
        if (this.connection) {
            this.connection.dispose();
            this.connection = undefined;
        }

        logger.info('Java interop cache cleared');
    }

    /**
     * Acquires the resolution lock. Uses a queue-based async mutex that supports
     * re-entrant acquisition: if the current async context already holds the lock
     * (tracked via lockToken), the call returns immediately without deadlocking.
     * @returns a release function that MUST be called when the critical section is done
     */
    private acquireLock(lockToken: object): Promise<() => void> {
        // Re-entrant: if this token already owns the lock, return a no-op release
        if (this.lockHeld && this.currentLockToken === lockToken) {
            return Promise.resolve(() => { /* re-entrant, no-op release */ });
        }

        if (!this.lockHeld) {
            this.lockHeld = true;
            this.currentLockToken = lockToken;
            return Promise.resolve(() => {
                this.drainLockQueue();
            });
        }

        return new Promise<() => void>((resolve) => {
            this.lockQueue.push(() => {
                this.currentLockToken = lockToken;
                resolve(() => {
                    this.drainLockQueue();
                });
            });
        });
    }

    private drainLockQueue(): void {
        if (this.lockQueue.length > 0) {
            const next = this.lockQueue.shift()!;
            next();
        } else {
            this.lockHeld = false;
            this.currentLockToken = null;
        }
    }
}

/** Extracts package name from fully qualified class name
 * @param className fully qualified class name
 * @returns package name or empty string if no package */
function extractPackageName(className: string): string {
    const lastIndexOfDot = className.lastIndexOf('.');
    if (lastIndexOfDot === -1) {
        return ''; // No package name
    }
    const match = className.match(/\.(?=[A-Z])/);
    if (match && match.index !== undefined) {
        return className.substring(0, match.index); // Extract package name
    }

    return className.substring(0, lastIndexOfDot); // Fallback to last dot
}

/**
 * Strips the java.lang. prefix from fully qualified type names for display.
 * Mirrors the same helper in bbj-hover.ts.
 */
function javaTypeAdjust(typeFqn: string): string {
    return typeFqn.replace(/^java\.lang\./, '');
}

/**
 * Attempts to parse a raw Javadoc comment string into Markdown.
 * Falls back to the raw comment if parsing fails or input is not JSDoc.
 */
function tryParseJavaDoc(comment: string): string {
    if (isJSDoc(comment)) {
        try {
            return parseJSDoc(comment).toMarkdown();
        } catch {
            // JSDoc parsing can fail on complex Java documentation
        }
    }
    return comment;
}

/**
 * Request type for loading classpath entries into the Java backend service.
 */
const loadClasspathRequest = new RequestType<ClassPathInfoParams, boolean, null>('loadClasspath');

/**
 * Request type for retrieving information about a single Java class.
 */
const getClassInfoRequest = new RequestType<ClassInfoParams, JavaClass, null>('getClassInfo');

/**
 * Request type for retrieving information about all classes in a package.
 */
const getClassInfosRequest = new RequestType<PackageInfoParams, JavaClass[], null>('getClassInfos');

/**
 * Request type for retrieving all top-level packages available in the classpath.
 */
const getTopLevelPackages = new RequestType<null, PackageInfoParams[], null>('getTopLevelPackages');

/**
 * Parameters for class information requests.
 */
interface ClassInfoParams {
    className: string
}

/**
 * Parameters for package information requests.
 */
interface PackageInfoParams {
    packageName: string
}

/**
 * Parameters for classpath loading requests.
 */
interface ClassPathInfoParams {
    classPathEntries: string[]
}