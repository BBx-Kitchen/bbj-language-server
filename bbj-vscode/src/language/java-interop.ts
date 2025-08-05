/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { AstUtils, LangiumDocument, LangiumDocuments, Mutable } from 'langium';
import { Socket } from 'net';
import {
    CancellationToken, createMessageConnection, MessageConnection, RequestType, SocketMessageReader, SocketMessageWriter
} from 'vscode-jsonrpc/node.js';
import { URI } from 'vscode-uri';
import { BBjServices } from './bbj-module.js';
import { Classpath, JavaClass, JavaField, JavaMethod, JavaMethodParameter, JavaPackage } from './generated/ast.js';
import { isClassDoc, JavadocProvider } from './java-javadoc.js';
import { assertType } from './utils.js';

const DEFAULT_PORT = 5008;

const implicitJavaImports = ['java.lang', 'com.basis.startup.type', 'com.basis.bbj.proxies', 'com.basis.bbj.proxies.sysgui', 'com.basis.bbj.proxies.event', 'com.basis.startup.type.sysgui', 'com.basis.bbj.proxies.servlet']

export const JavaSyntheticDocUri = 'classpath:/bbj.class'
export class JavaInteropService {

    private connection?: MessageConnection;
    private readonly _resolvedClasses: Map<string, JavaClass> = new Map();
    private readonly childrenOfByName = new Map<JavaClass | JavaPackage | Classpath, Map<string, JavaClass | JavaPackage>>();
    private resolvedClassesLock: Promise<void> = Promise.resolve();

    protected readonly langiumDocuments: LangiumDocuments;
    protected readonly classpathDocument: LangiumDocument<Classpath>;
    protected javadocProvider = JavadocProvider.getInstance();

    constructor(services: BBjServices) {
        this.langiumDocuments = services.shared.workspace.LangiumDocuments;
        this.classpathDocument = services.shared.workspace.LangiumDocumentFactory.fromModel(<Classpath>{
            $container: undefined!,
            $type: Classpath,
            packages: [],
            classes: []
        }, URI.parse(JavaSyntheticDocUri));
    }

    private get resolvedClasses(): Map<string, JavaClass> {
        return this._resolvedClasses;
    }

    protected async connect(): Promise<MessageConnection> {
        if (this.connection) {
            return this.connection;
        }
        let socket: Socket;
        try {
            socket = await this.createSocket();
        } catch (e) {
            // TODO send error message to the client.
            // Allow the user to retry the connection.
            console.error('Failed to connect to the Java service.', e)
            return Promise.reject(e);
        }
        const connection = createMessageConnection(new SocketMessageReader(socket), new SocketMessageWriter(socket));
        connection.listen();
        this.connection = connection;
        return connection;
    }

    protected createSocket(): Promise<Socket> {
        return new Promise((resolve, reject) => {
            const socket = new Socket();
            socket.on('error', reject);
            socket.on('ready', () => resolve(socket));
            socket.connect(DEFAULT_PORT, '127.0.0.1');
        });
    }

    protected get classpath(): Classpath {
        return this.classpathDocument.parseResult.value;
    }

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

    protected async getRawClass(className: string, token?: CancellationToken): Promise<JavaClass> {
        const connection = await this.connect();
        return connection.sendRequest(getClassInfoRequest, { className }, token);
    }

    public async loadClasspath(classPath: string[], token?: CancellationToken): Promise<boolean> {
        console.warn("Load classpath from: " + classPath.join(', '))
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

    public async loadImplicitImports(token?: CancellationToken): Promise<boolean> {
        console.warn("Load package classes: ", implicitJavaImports.join(', '))
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
            console.debug("Loaded " + this.classpath.classes.length + " classes")

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
                                $type: JavaPackage,
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
                console.debug("getTopLevelPackages not supported, skipping top-level package initialization");
            }
            return true;
        } catch (e) {
            console.error(e)
            return false;
        }
    }

    async resolveClassByName(className: string, token?: CancellationToken): Promise<JavaClass> {
        await this.acquireLock();
        try {
            if (this.resolvedClasses.has(className)) {
                return this.resolvedClasses.get(className)!;
            }
            const javaClass: Mutable<JavaClass> = await this.getRawClass(className, token);
            return await this.resolveClass(javaClass, token);
        } finally {
            // unlocked
        }
    }

    protected async resolveClass(javaClass: Mutable<JavaClass>, token?: CancellationToken): Promise<JavaClass> {
        const className = javaClass.name
        if (this.resolvedClasses.has(className)) {
            return this.resolvedClasses.get(className)!;
        }

        if (!this.langiumDocuments.hasDocument(this.classpathDocument.uri)) {
            this.langiumDocuments.addDocument(this.classpathDocument);
        }

        javaClass.$type = JavaClass; // make isJavaClass work
        const packageName = extractPackageName(className);

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
                (field as Mutable<JavaField>).$type = JavaField;
                field.resolvedType = {
                    ref: await this.resolveClassByName(field.type, token),
                    $refText: field.type
                };
            }
            for (const method of javaClass.methods) {
                (method as Mutable<JavaMethod>).$type = JavaMethod;
                const methodDocs = isClassDoc(documentation) ? documentation.methods.filter(
                    m => m.name == method.name
                        && m.params.length === method.parameters.length
                ) : [];
                method.resolvedReturnType = {
                    ref: await this.resolveClassByName(method.returnType, token),
                    $refText: method.returnType
                };
                for (const [index, parameter] of method.parameters.entries()) {
                    (parameter as Mutable<JavaMethodParameter>).$type = JavaMethodParameter;
                    parameter.resolvedType = {
                        ref: await this.resolveClassByName(parameter.type, token),
                        $refText: parameter.type
                    };
                    if (methodDocs.length > 0) {
                        // TODO check types of parameters
                        parameter.realName = methodDocs[0].params[index]?.name
                    }
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

    getChildrenOf(javaPackageLike?: JavaClass | JavaPackage) {
        const children = this.childrenOfByName.get(javaPackageLike ?? this.classpath);
        if (!children) {
            return [];
        }
        return [...children.values()];
    }

    getChildOf(javaPackageLike: JavaClass | JavaPackage | Classpath = this.classpath, childName: string): JavaClass | JavaPackage | undefined {
        return this.childrenOfByName.get(javaPackageLike)?.get(childName);
    }

    storeJavaClass(javaClass: Mutable<JavaClass>, packageName: string): void {

        // Defensive check for javaClass.name
        if (!javaClass.name || typeof javaClass.name !== 'string') {
            console.error('Invalid javaClass.name:', javaClass.name);
            return;
        }
        javaClass.$type = JavaClass;

        const simpleName = (packageName.length > 0) ? javaClass.name.replace(packageName + '.', '') : javaClass.name;
        if (javaClass.packageName !== packageName) {
            console.warn(`Package name mismatch for class ${javaClass.name}: expected '${javaClass.packageName}', got '${packageName}'`);
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
                        $type: JavaPackage,
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

    private async acquireLock(): Promise<void> {
        let release: () => void;
        const lock = new Promise<void>((resolve) => (release = resolve));
        const previousLock = this.resolvedClassesLock;
        this.resolvedClassesLock = lock;
        await previousLock;
        release!();
    }
}

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

const loadClasspathRequest = new RequestType<ClassPathInfoParams, boolean, null>('loadClasspath');
const getClassInfoRequest = new RequestType<ClassInfoParams, JavaClass, null>('getClassInfo');
const getClassInfosRequest = new RequestType<PackageInfoParams, JavaClass[], null>('getClassInfos');

const getTopLevelPackages = new RequestType<null, PackageInfoParams[], null>('getTopLevelPackages');

interface ClassInfoParams {
    className: string
}
interface PackageInfoParams {
    packageName: string
}

interface ClassPathInfoParams {
    classPathEntries: string[]
}