/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
    LangiumServices, Module, PartialLangiumServices
} from 'langium';
import { BBjValidator } from './bbj-validator';
import { JavaInteropService } from './java-interop';
import { BbjNameProvider, BbjScopeComputation, BbjScopeProvider } from './bbj-scope';
import { BBjHoverProvider } from './bbj-hover';
import { BBjValueConverter } from './bbj-value-converter';
import { BbjLinker } from './bbj-linker';
import { BBjTokenBuilder } from './bbj-token-builder';
import { BBjDocumentSymbolProvider } from './bbj-document-symbol';
import { BBjDocumentValidator } from './bbj-document-validator';
import { BBjCompletionProvider } from './bbj-completion-provider';
import { BbjLexer } from './bbj-lexer';

/**
 * Declaration of custom services - add your own service classes here.
 */
export type BBjAddedServices = {
    validation: {
        BBjValidator: BBjValidator
    },
    java: {
        JavaInteropService: JavaInteropService
    }
}

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type BBjServices = LangiumServices & BBjAddedServices

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const BBjModule: Module<BBjServices, PartialLangiumServices & BBjAddedServices> = {
    references: {
        ScopeComputation: (services) => new BbjScopeComputation(services),
        ScopeProvider: (services) => new BbjScopeProvider(services),
        NameProvider: () => new BbjNameProvider(),
        Linker: (services) => new BbjLinker(services)
    },
    validation: {
        BBjValidator: (services) => new BBjValidator(services),
        DocumentValidator: (services) => new BBjDocumentValidator(services)
    },
    java: {
        JavaInteropService: (services) => new JavaInteropService(services)
    },
    lsp: {
        HoverProvider: (services) => new BBjHoverProvider(services),
        DocumentSymbolProvider: (services) => new BBjDocumentSymbolProvider(services),
        CompletionProvider: (services) => new BBjCompletionProvider(services)
    },
    parser: {
        ValueConverter: () => new BBjValueConverter(),
        TokenBuilder: () => new BBjTokenBuilder(),
        Lexer: services => new BbjLexer(services)
    }
};
