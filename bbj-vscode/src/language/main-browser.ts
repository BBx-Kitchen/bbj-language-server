/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { EmptyFileSystem, startLanguageServer } from 'langium';
import { createConnection } from 'vscode-languageserver/browser';
import { createBBjServices } from './bbj-browser-module';
import { BrowserMessageReader, BrowserMessageWriter } from 'vscode-jsonrpc/browser';

const reader = new BrowserMessageReader(self as any);
const writer = new BrowserMessageWriter(self as any);

// Create a connection to the client
const connection = createConnection(reader, writer);

// Inject the shared services and language-specific services
const { shared } = createBBjServices({ connection, ...EmptyFileSystem });

// Start the language server with the shared services
startLanguageServer(shared);
