import { describe, expect, test } from 'vitest';
import {
    COMPILER_OPTIONS as VSCODE_COMPILER_OPTIONS,
    validateOptions,
    buildCompileOptions,
} from '../src/Commands/CompilerOptions.js';
import {
    COMPILER_OPTIONS as SERVER_COMPILER_OPTIONS,
    validateOptionsFrom,
    buildCompileOptionsFrom,
} from '../src/language/compiler-options.js';
import type { WorkspaceConfiguration } from 'vscode';

/**
 * Proof that both entry points read one table (#571): the VS Code adapter
 * (`src/Commands/CompilerOptions.ts`) and the language-server module
 * (`src/language/compiler-options.ts`) it delegates to are not two copies of the same
 * data — they are the same array, and the two config-driven code paths (a
 * `vscode.WorkspaceConfiguration` and a plain `CompilerConfigReader`) produce identical
 * results for the same settings.
 */

/** Mirrors the `createMockConfig` helper in `test/compiler-options.test.ts`. */
function createMockConfig(settings: Record<string, unknown>): WorkspaceConfiguration {
    return {
        get: <T>(key: string): T | undefined => settings[key] as T | undefined,
        has: (key: string): boolean => key in settings,
        inspect: () => undefined,
        update: async () => { /* no-op */ }
    } as WorkspaceConfiguration;
}

describe('CompilerOptions - single shared table', () => {

    test('theVsCodeEntryPointAndTheServerEntryPointReadTheSameTable', () => {
        expect(VSCODE_COMPILER_OPTIONS).toBe(SERVER_COMPILER_OPTIONS);
    });

    test('bothEntryPointsProduceIdenticalArgumentsForTheSameSettings', () => {
        const settings: Record<string, unknown> = {
            'compiler.typeChecking.enabled': true,
            'compiler.typeChecking.warnings': true,
            'compiler.lineNumbering.startLine': 100,
            'compiler.content.protect': true,
            'compiler.content.protectPassword': 'secret123',
        };
        const config = createMockConfig(settings);
        const read = (key: string) => settings[key];

        expect(buildCompileOptions(config)).toEqual(buildCompileOptionsFrom(read));
    });

    test('bothEntryPointsAgreeOnAConflictingConfiguration', () => {
        const settings: Record<string, unknown> = {
            'compiler.output.extension': '.bbj',
            'compiler.output.keepExtension': true,
        };
        const config = createMockConfig(settings);
        const read = (key: string) => settings[key];

        const viaVscode = validateOptions(config);
        const viaServer = validateOptionsFrom(read);

        expect(viaVscode.isValid).toBe(viaServer.isValid);
        expect(viaVscode.errors).toEqual(viaServer.errors);
    });

});
