/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
    DeepPartial, DefaultSharedModuleContext,
    LangiumParser,
    LangiumServices, LangiumSharedServices, Module, PartialLangiumServices,
    createDefaultModule, createDefaultSharedModule,
    inject,
    prepareLangiumParser
} from 'langium';
import { BBjCompletionProvider } from './bbj-completion-provider';
import { BBjDocumentBuilder } from './bbj-document-builder';
import { BBjDocumentValidator } from './bbj-document-validator';
import { BBjHoverProvider } from './bbj-hover';
import { BBjIndexManager } from './bbj-index-manager';
import { BbjLexer } from './bbj-lexer';
import { BbjLinker } from './bbj-linker';
import { BBjNodeKindProvider } from './bbj-node-kind';
import { BBjAstNodeDescriptionProvider } from './bbj-nodedescription-provider';
import { BbjNameProvider, BbjScopeComputation, BbjScopeProvider } from './bbj-scope';
import { BBjTokenBuilder } from './bbj-token-builder';
import { BBjValidator, registerValidationChecks } from './bbj-validator';
import { BBjValueConverter } from './bbj-value-converter';
import { BBjWorkspaceManager } from './bbj-ws-manager';
import { BBjGeneratedModule, BBjGeneratedSharedModule } from './generated/module';
import { JavaInteropService } from './java-interop';


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
        CompletionProvider: (services) => new BBjCompletionProvider(services)
    },
    parser: {
        LangiumParser: (services) => createBBjParser(services),
        ValueConverter: () => new BBjValueConverter(),
        TokenBuilder: () => new BBjTokenBuilder(),
        Lexer: services => new BbjLexer(services)
    },
    workspace: {
        AstNodeDescriptionProvider: (services) => new BBjAstNodeDescriptionProvider(services)
    }
};

let ambiguitiesReported = false;

function createBBjParser(services: LangiumServices): LangiumParser {
    const parser = prepareLangiumParser(services);
    // Customize ambiguity logging
    const lookaheadStrategy = (parser as any).wrapper.lookaheadStrategy
    if (lookaheadStrategy) {
        lookaheadStrategy.logging = (message: string) => {
            if (!ambiguitiesReported) {
                ambiguitiesReported = true;
                console.debug('Parser: Ambiguous Alternatives Detected. Enable ambiguity logging to see details.');
            }
        }
    }
    parser.finalize();
    return parser;
}

export const BBjSharedModule: Module<LangiumSharedServices, DeepPartial<LangiumSharedServices>> = {
    lsp: {
        NodeKindProvider: () => new BBjNodeKindProvider()
    },
    workspace: {
        DocumentBuilder: (services: LangiumSharedServices) => new BBjDocumentBuilder(services),
        WorkspaceManager: (services: LangiumSharedServices) => new BBjWorkspaceManager(services),
        IndexManager: (services: LangiumSharedServices) => new BBjIndexManager(services)
    },
}

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging two modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
 *
 * Then inject the language-specific services by merging three modules:
 *  - Langium default language-specific services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * @param context Optional module context with the LSP connection
 * @returns An object wrapping the shared services and the language-specific services
 */
export function createBBjServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices,
    BBj: BBjServices
} {
    const shared = inject(
        createDefaultSharedModule(context),
        BBjGeneratedSharedModule,
        BBjSharedModule
    );
    const BBj = inject(
        createDefaultModule({ shared }),
        BBjGeneratedModule,
        BBjModule
    );
    shared.ServiceRegistry.register(BBj);
    registerValidationChecks(BBj);
    return { shared, BBj };
}


