/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Loads the configured classpath and the implicitly imported Java packages into the synthetic
 * classpath document. Split out of the Java interop service (#558).
 */
import { Mutable } from 'langium';
import { CancellationToken, MessageConnection, RequestType } from 'vscode-jsonrpc/node.js';
import { Classpath, JavaClass } from './generated/ast.js';
import { isUsableJavaClassName } from './java-peer-guard.js';
import { logger } from './logger.js';

const implicitJavaImports = ['java.lang', 'com.basis.startup.type', 'com.basis.bbj.proxies', 'com.basis.bbj.proxies.sysgui', 'com.basis.bbj.proxies.event', 'com.basis.startup.type.sysgui', 'com.basis.bbj.proxies.servlet']

/**
 * Request type for loading classpath entries into the Java backend service.
 */
const loadClasspathRequest = new RequestType<ClassPathInfoParams, boolean, null>('loadClasspath');

/**
 * Request type for retrieving information about all classes in a package.
 */
const getClassInfosRequest = new RequestType<PackageInfoParams, JavaClass[], null>('getClassInfos');

/**
 * Request type for retrieving all top-level packages available in the classpath.
 */
const getTopLevelPackages = new RequestType<null, PackageInfoParams[], null>('getTopLevelPackages');

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

/** Structural dependencies {@link ClasspathLoader} needs from the front class. */
export interface ClasspathLoaderHooks {
    connect(): Promise<MessageConnection>;
    resolveClass(javaClass: Mutable<JavaClass>, token?: CancellationToken): Promise<JavaClass>;
    registerResolvedClass(name: string, javaClass: JavaClass): void;
    classpath(): Classpath;
    ensureClasspathDocument(): void;
    addTopLevelPackage(packageName: string): void;
}

/**
 * Loads the configured classpath and the implicitly imported Java packages, keeping the
 * simple-name copies `loadImplicitImports()` adds to the synthetic classpath document.
 *
 * Split out of `JavaInteropService` (#558).
 */
export class ClasspathLoader {

    constructor(private readonly hooks: ClasspathLoaderHooks) { }

    /** Simple-name copies already added by loadImplicitImports(), keyed by "package.simpleName", so re-running it adds no duplicate entry to the synthetic classpath document. */
    private readonly implicitImportCopies = new Map<string, Mutable<JavaClass>>();

    /**
     * Sends a request to the Java backend service, returning `fallback` and logging the error
     * instead of throwing if connecting or the request itself fails (P61-D4-003). Shared by
     * request paths whose error handling is exactly "connect, send, log-and-return-fallback on
     * failure" — {@link loadClasspath} today.
     * @param request the JSON-RPC request type to send
     * @param params request parameters
     * @param fallback value returned when connecting or the request fails
     * @param token cancellation token for request cancellation
     */
    private async sendRequestSafe<P, R>(request: RequestType<P, R, null>, params: P, fallback: R, token?: CancellationToken): Promise<R> {
        try {
            const connection = await this.hooks.connect();
            return await connection.sendRequest(request, params, token);
        } catch (e) {
            console.error(e)
            return fallback;
        }
    }

    /**
     * Loads the Java classpath from the specified entries.
     * @param classPath array of classpath entries (file paths or BBj classpath notation)
     * @param token cancellation token for request cancellation
     * @returns true if classpath was loaded successfully, false otherwise
     */
    public async loadClasspath(classPath: string[], token?: CancellationToken): Promise<boolean> {
        logger.debug(() => "Load classpath from: " + classPath.join(', '))
        const entries = classPath.filter(entry => entry.length > 0).map(entry => {
            // If entry is already wrapped in square brackets (BBj classpath notation), keep it as is
            // Otherwise, add 'file:' prefix for regular file paths
            if (entry.startsWith('[') && entry.endsWith(']')) {
                return entry;
            }
            return 'file:' + entry;
        });
        return this.sendRequestSafe(loadClasspathRequest, { classPathEntries: entries }, false, token);
    }

    /**
     * Loads implicit Java imports including standard packages and BBj-specific packages.
     * @param token cancellation token for request cancellation
     * @returns true if implicit imports were loaded successfully, false otherwise
     */
    public async loadImplicitImports(token?: CancellationToken): Promise<boolean> {
        logger.debug(() => "Load package classes: " + implicitJavaImports.join(', '))
        try {
            const connection = await this.hooks.connect();
            await Promise.all(implicitJavaImports.concat('java.sql').map(async pack => {
                const classInfosResponse = await connection.sendRequest(getClassInfosRequest, { packageName: pack }, token);
                // A getClassInfos answer that is not an array is treated as empty (issue #523):
                // the package simply contributes nothing this round, rather than throwing.
                const classInfos = Array.isArray(classInfosResponse) ? classInfosResponse : [];
                await Promise.all(classInfos.map(async javaClass => {
                    const rawEntry = javaClass as unknown;
                    if (typeof rawEntry !== 'object' || rawEntry === null) {
                        // Not a class-shaped entry at all: skip without ever calling resolveClass.
                        return;
                    }
                    await this.hooks.resolveClass(javaClass, token)

                    if (!isUsableJavaClassName(javaClass.name)) {
                        // resolveClass's own entry guard already logged and returned an uncached
                        // stub for this entry; no simple-name copy can be built from a name that
                        // is not usable, and no exception should escape this Promise.all.
                        return;
                    }

                    if (pack !== 'java.sql') { // Not an implicit import but sql package preload.
                        // add as implicit Java package import
                        const simpleName = javaClass.name.replace(pack + '.', '')
                        const copyKey = `${pack}.${simpleName}`;
                        const existingCopy = this.implicitImportCopies.get(copyKey);
                        if (existingCopy) {
                            // Already added by an earlier run: reuse it instead of pushing a
                            // second entry into the synthetic classpath document.
                            this.hooks.registerResolvedClass(simpleName, existingCopy);
                        } else {
                            const simpleNameCopy = { ...javaClass }
                            simpleNameCopy.name = simpleName
                            simpleNameCopy.$containerIndex = this.hooks.classpath().classes.length;
                            this.hooks.classpath().classes.push(simpleNameCopy);
                            this.hooks.registerResolvedClass(simpleNameCopy.name, simpleNameCopy);
                            this.implicitImportCopies.set(copyKey, simpleNameCopy);
                        }
                    }
                }))
            }))
            logger.info(() => "Loaded " + this.hooks.classpath().classes.length + " classes")

            this.hooks.ensureClasspathDocument();
            // Try to get top level packages, but handle gracefully if not supported
            try {
                const topLevelPackages = await connection.sendRequest(getTopLevelPackages, {}, token);
                for (const pack of topLevelPackages) {
                    this.hooks.addTopLevelPackage(pack.packageName);
                }
            } catch {
                // getTopLevelPackages might not be supported by older Java interop versions
                logger.debug("getTopLevelPackages not supported, skipping top-level package initialization");
            }
            return true;
        } catch (e) {
            console.error(e)
            return false;
        }
    }

    /** Drops the implicit-import copy bookkeeping so a later loadImplicitImports() rebuilds it from scratch. */
    public reset(): void {
        this.implicitImportCopies.clear();
    }
}
