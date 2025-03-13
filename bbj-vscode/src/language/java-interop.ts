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
import { Classpath, JavaClass, JavaField, JavaMethod, JavaMethodParameter } from './generated/ast.js';
import { isClassDoc, JavadocProvider } from './java-javadoc.js';

const DEFAULT_PORT = 5008;

const implicitJavaImports = ['java.lang', 'com.basis.startup.type', 'com.basis.bbj.proxies', 'com.basis.bbj.proxies.sysgui', 'com.basis.bbj.proxies.event', 'com.basis.startup.type.sysgui', 'com.basis.bbj.proxies.servlet']

export const JavaSyntheticDocUri = 'classpath:/bbj.class'


export class JavaInteropService {

    private connection?: MessageConnection;
    private readonly resolvedClasses: Map<string, JavaClass> = new Map();

    protected readonly langiumDocuments: LangiumDocuments;
    protected readonly classpathDocument: LangiumDocument<Classpath>;
    protected javadocProvider = JavadocProvider.getInstance();

    constructor(services: BBjServices) {
        this.langiumDocuments = services.shared.workspace.LangiumDocuments;
        this.classpathDocument = services.shared.workspace.LangiumDocumentFactory.fromModel(<Classpath>{
            $type: Classpath,
            classes: []
        }, URI.parse(JavaSyntheticDocUri));
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

    get classpath(): Classpath {
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
            const entries = classPath.map(entry => 'file:' + entry);
            const connection = await this.connect();
            return await connection.sendRequest(loadClasspathRequest, { classPathEntries: entries }, token);
        } catch (e) {
            console.error(e)
            return false;
        }
    }

    public async loadImplicitImports(token?: CancellationToken): Promise<boolean> {
        console.warn("Load package classes: " + implicitJavaImports.join(', '))
        try {
            const connection = await this.connect();
            await Promise.all(implicitJavaImports.map(async pack => {
                const classInfos = await connection.sendRequest(getClassInfosRequest, { packageName: pack }, token);
                await Promise.all(classInfos.map(async javaClass => {
                    await this.resolveClass(javaClass, token)
                    // add as implicit Java package import
                    const simpleNameCopy = { ...javaClass }
                    simpleNameCopy.name = javaClass.name.replace(pack + '.', '')
                    simpleNameCopy.$containerIndex = this.classpath.classes.length;
                    this.classpath.classes.push(simpleNameCopy);
                    this.resolvedClasses.set(simpleNameCopy.name, simpleNameCopy);
                }))
            }))
            console.debug("Loaded " + this.classpath.classes.length + " classes")
            return true;
        } catch (e) {
            console.error(e)
            return false;
        }
    }

    async resolveClassByName(className: string, token?: CancellationToken): Promise<JavaClass> {
        if (this.resolvedClasses.has(className)) {
            return this.resolvedClasses.get(className)!;
        }
        const javaClass: Mutable<JavaClass> = await this.getRawClass(className, token);
        return await this.resolveClass(javaClass, token);
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

        const classpath = this.classpath;
        javaClass.$type = JavaClass;
        javaClass.$container = classpath;
        javaClass.$containerProperty = 'classes';
        javaClass.$containerIndex = classpath.classes.length;
        classpath.classes.push(javaClass);
        return javaClass;
    }

}

const loadClasspathRequest = new RequestType<ClassPathInfoParams, boolean, null>('loadClasspath');
const getClassInfoRequest = new RequestType<ClassInfoParams, JavaClass, null>('getClassInfo');
const getClassInfosRequest = new RequestType<PackageInfoParams, JavaClass[], null>('getClassInfos');

interface ClassInfoParams {
    className: string
}
interface PackageInfoParams {
    packageName: string
}

interface ClassPathInfoParams {
    classPathEntries: string[]
}