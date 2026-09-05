/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as vscode from 'vscode';
import {
    COMPILER_OPTIONS,
    OPTION_GROUP_ORDER,
    getOptionsGrouped,
    buildCompileOptionsFrom,
    validateOptionsFrom,
    type CompilerOption,
    type CompilerOptionGroup,
    type CompilerOptionType,
    type ValidationResult,
} from '../language/compiler-options.js';

/**
 * VS Code adapter over the shared, vscode-free compiler-option table (#571): the 18-entry
 * `COMPILER_OPTIONS` table, its grouping helper and its build/validate logic now live
 * exactly once, in `../language/compiler-options.ts`, shared with the language server's
 * `bbj/compile` request handler. This file re-exports the table/types under their existing
 * names — so every importer (including `test/compiler-options.test.ts`, unedited) resolves
 * unchanged — and keeps only two thin `vscode.WorkspaceConfiguration`-typed adapters.
 *
 * Because `validateOptionsFrom`/`buildCompileOptionsFrom` are called here with a reader
 * that forwards exactly the full key (`compiler.<configKey>`) the deleted local code used
 * to pass to `config.get`, VS Code's compile behaviour is unchanged by construction.
 */

export { COMPILER_OPTIONS, OPTION_GROUP_ORDER, getOptionsGrouped };
export type { CompilerOption, CompilerOptionGroup, CompilerOptionType, ValidationResult };

/**
 * Validate compiler options configuration for conflicts and dependencies.
 * @param config The VSCode workspace configuration for 'bbj'
 * @returns Validation result with errors and warnings
 */
export function validateOptions(config: vscode.WorkspaceConfiguration): ValidationResult {
    return validateOptionsFrom(key => config.get(key));
}

/**
 * Build the array of command-line arguments from compiler configuration.
 * @param config The VSCode workspace configuration for 'bbj'
 * @returns Array of command-line argument strings
 */
export function buildCompileOptions(config: vscode.WorkspaceConfiguration): string[] {
    return buildCompileOptionsFrom(key => config.get(key));
}
