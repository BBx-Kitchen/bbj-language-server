/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { LangiumDocument, LangiumDocuments, linkContentToContainer, Mutable } from 'langium';
import { Socket } from 'net';
import {
    CancellationToken, createMessageConnection, MessageConnection, RequestType, SocketMessageReader, SocketMessageWriter
} from 'vscode-jsonrpc/node';
import { URI } from 'vscode-uri';
import { BBjServices } from './bbj-module';
import { Classpath, JavaClass, JavaField, JavaMethod, JavaMethodParameter } from './generated/ast';

const DEFAULT_PORT = 5008;

export class JavaInteropService {

    private connection?: MessageConnection;
    
    private readonly langiumDocuments: LangiumDocuments;
    private readonly resolvedClasses: Map<string, JavaClass> = new Map();
    private readonly classpathDocument: LangiumDocument<Classpath>;

    constructor(services: BBjServices) {
        this.langiumDocuments = services.shared.workspace.LangiumDocuments;
        this.classpathDocument = services.shared.workspace.LangiumDocumentFactory.fromModel(<Classpath>{
            $type: Classpath,
            classes: []
        }, URI.parse('classpath:/bbj.class'));
    }

    protected async connect(): Promise<MessageConnection> {
        if (this.connection) {
            return this.connection;
        }
        const socket = await this.createSocket();
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
        return this.resolvedClasses.get(className);
    }

    protected async getRawClass(className: string, token?: CancellationToken): Promise<JavaClass> {
        const connection = await this.connect();
        return connection.sendRequest(getClassInfoRequest, { className }, token);
    }

    async resolveClass(className: string, token?: CancellationToken): Promise<JavaClass> {
        if (this.resolvedClasses.has(className)) {
            return this.resolvedClasses.get(className)!;
        }
    
        const classpath = this.classpath;
        let javaClass: Mutable<JavaClass>;
        javaClass = await this.getRawClass(className, token);
        this.resolvedClasses.set(className, javaClass);

        for (const field of javaClass.fields) {
            (field as Mutable<JavaField>).$type = JavaField;
            field.resolvedType = {
                ref: await this.resolveClass(field.type, token),
                $refText: field.type
            };
        }
        for (const method of javaClass.methods) {
            (method as Mutable<JavaMethod>).$type = JavaMethod;
            method.resolvedReturnType = {
                ref: await this.resolveClass(method.returnType, token),
                $refText: method.returnType
            };
            for (const parameter of method.parameters) {
                (parameter as Mutable<JavaMethodParameter>).$type = JavaMethodParameter;
                parameter.resolvedType = {
                    ref: await this.resolveClass(parameter.type, token),
                    $refText: parameter.type
                };
            }
            linkContentToContainer(method);
        }
        linkContentToContainer(javaClass);

        javaClass.$type = JavaClass;
        javaClass.$container = classpath;
        javaClass.$containerProperty = 'classes';
        javaClass.$containerIndex = classpath.classes.length;
        classpath.classes.push(javaClass);

        if (!this.langiumDocuments.hasDocument(this.classpathDocument.uri)) {
            this.langiumDocuments.addDocument(this.classpathDocument);
        }
        return javaClass;
    }

}

const getClassInfoRequest = new RequestType<ClassInfoParams, JavaClass, null>('getClassInfo');

interface ClassInfoParams {
    className: string
}