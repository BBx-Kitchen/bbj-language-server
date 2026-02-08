/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import {
    DeepPartial,
    LangiumParser,
    Module,
    inject,
    prepareLangiumParser
} from 'langium';
import { LangiumSharedServices, LangiumServices, PartialLangiumServices, createDefaultSharedModule, createDefaultModule, DefaultSharedModuleContext } from 'langium/lsp';
import { BBjCommentProvider } from './bbj-comment-provider.js';
import { BBjCompletionProvider } from './bbj-completion-provider.js';
import { BBjDefinitionProvider } from './bbj-definition-provider.js';
import { BBjDocumentBuilder } from './bbj-document-builder.js';
import { BBjDocumentValidator } from './bbj-document-validator.js';
import { BBjHoverProvider } from './bbj-hover.js';
import { BBjIndexManager } from './bbj-index-manager.js';
import { BbjLexer } from './bbj-lexer.js';
import { BbjLinker } from './bbj-linker.js';
import { BBjNodeKindProvider } from './bbj-node-kind.js';
import { BBjAstNodeDescriptionProvider } from './bbj-nodedescription-provider.js';
import { BbjNameProvider, BbjScopeProvider } from './bbj-scope.js';
import { BbjScopeComputation } from './bbj-scope-local.js';
import { BBjTokenBuilder } from './bbj-token-builder.js';
import { BBjValidator, registerValidationChecks } from './bbj-validator.js';
import { BBjValueConverter } from './bbj-value-converter.js';
import { BBjWorkspaceManager } from './bbj-ws-manager.js';
import { BBjGeneratedModule, BBjGeneratedSharedModule } from './generated/module.js';
import { JavaInteropService } from './java-interop.js';
import { BBjTypeInferer, TypeInferer } from './bbj-type-inferer.js';
import { BBjSemanticTokenProvider } from './bbj-semantic-token-provider.js';
import { BBjSignatureHelpProvider } from './bbj-signature-help-provider.js';
import { logger } from './logger.js';


/**
 * Declaration of custom services - add your own service classes here.
 */
export type BBjAddedServices = {
    validation: {
        BBjValidator: BBjValidator
    },
    java: {
        JavaInteropService: JavaInteropService
    },
    types: {
        Inferer: TypeInferer
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
    types: {
        Inferer: (services) => new BBjTypeInferer(services),
    },
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
    documentation: {
        CommentProvider: () => new BBjCommentProvider()
    },
    lsp: {
        DefinitionProvider: (services) => new BBjDefinitionProvider(services),
        HoverProvider: (services) => new BBjHoverProvider(services),
        CompletionProvider: (services) => new BBjCompletionProvider(services),
        SemanticTokenProvider: (services) => new BBjSemanticTokenProvider(services),
        SignatureHelp: () => new BBjSignatureHelpProvider(),
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
            if (logger.isDebug()) {
                logger.debug(`Parser: ${message}`);
            } else if (!ambiguitiesReported) {
                ambiguitiesReported = true;
                logger.debug('Parser: Ambiguous Alternatives Detected. Enable bbj.debug to see details.');
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


