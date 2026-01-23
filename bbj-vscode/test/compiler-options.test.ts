
import { describe, expect, test } from 'vitest';
import {
    buildCompileOptions,
    validateOptions,
    COMPILER_OPTIONS,
    getOptionsGrouped,
    OPTION_GROUP_ORDER
} from '../src/Commands/CompilerOptions.js';
import type { WorkspaceConfiguration } from 'vscode';

/**
 * Creates a mock WorkspaceConfiguration for testing
 * @param settings Object with configuration keys and values
 * @returns Mock WorkspaceConfiguration
 */
function createMockConfig(settings: Record<string, unknown>): WorkspaceConfiguration {
    return {
        get: <T>(key: string): T | undefined => {
            return settings[key] as T | undefined;
        },
        has: (key: string): boolean => {
            return key in settings;
        },
        inspect: () => undefined,
        update: async () => { /* no-op */ }
    } as WorkspaceConfiguration;
}

describe('CompilerOptions - buildCompileOptions', () => {

    test('returns empty array when no options configured', () => {
        const config = createMockConfig({});
        const result = buildCompileOptions(config);
        expect(result).toEqual([]);
    });

    test('correctly builds -t flag for type checking', () => {
        const config = createMockConfig({
            'compiler.typeChecking.enabled': true
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-t');
    });

    test('correctly builds -W flag for warnings', () => {
        const config = createMockConfig({
            'compiler.typeChecking.enabled': true,
            'compiler.typeChecking.warnings': true
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-t');
        expect(result).toContain('-W');
    });

    test('correctly builds parameterized option -c<value>', () => {
        const config = createMockConfig({
            'compiler.typeChecking.enabled': true,
            'compiler.typeChecking.configFile': '/path/to/config.bbx'
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-t');
        expect(result).toContain('-c/path/to/config.bbx');
    });

    test('correctly builds parameterized option -P<value>', () => {
        const config = createMockConfig({
            'compiler.typeChecking.enabled': true,
            'compiler.typeChecking.prefixDirectories': '/custom/prefix/'
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-t');
        expect(result).toContain('-P/custom/prefix/');
    });

    test('correctly builds -CP<classpath> option', () => {
        const config = createMockConfig({
            'compiler.typeChecking.classpath': '/path/to/lib.jar:/another.jar'
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-CP/path/to/lib.jar:/another.jar');
    });

    test('correctly builds -n flag for renumbering', () => {
        const config = createMockConfig({
            'compiler.lineNumbering.renumber': true
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-n');
    });

    test('correctly builds -s<number> for starting line number', () => {
        const config = createMockConfig({
            'compiler.lineNumbering.startLine': 100
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-s100');
    });

    test('correctly builds -i<interval> for line interval', () => {
        const config = createMockConfig({
            'compiler.lineNumbering.interval': 20
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-i20');
    });

    test('correctly builds --renum flag', () => {
        const config = createMockConfig({
            'compiler.lineNumbering.processRenum': true
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('--renum');
    });

    test('correctly builds -D flag for removing line numbers', () => {
        const config = createMockConfig({
            'compiler.lineNumbering.removeLineNumbers': true
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-D');
    });

    test('correctly builds -d<directory> for output directory', () => {
        const config = createMockConfig({
            'compiler.output.directory': '/output/dir'
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-d/output/dir');
    });

    test('correctly builds -x<extension> for output extension', () => {
        const config = createMockConfig({
            'compiler.output.extension': '.bbj'
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-x.bbj');
    });

    test('correctly builds -X flag for keeping extension', () => {
        const config = createMockConfig({
            'compiler.output.keepExtension': true
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-X');
    });

    test('correctly builds -F flag for force overwrite', () => {
        const config = createMockConfig({
            'compiler.output.forceOverwrite': true
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-F');
    });

    test('correctly builds -N flag for validate only', () => {
        const config = createMockConfig({
            'compiler.output.validateOnly': true
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-N');
    });

    test('correctly builds -r flag for removing REM statements', () => {
        const config = createMockConfig({
            'compiler.content.removeRem': true
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-r');
    });

    test('correctly builds -p flag for protection (no password)', () => {
        const config = createMockConfig({
            'compiler.content.protect': true
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-p');
    });

    test('correctly builds -p<password> for protection with password', () => {
        const config = createMockConfig({
            'compiler.content.protect': false,
            'compiler.content.protectPassword': 'secret123'
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-psecret123');
        expect(result).not.toContain('-p');
    });

    test('password takes precedence over boolean protect', () => {
        const config = createMockConfig({
            'compiler.content.protect': true,
            'compiler.content.protectPassword': 'mypassword'
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-pmypassword');
        // Should not contain bare -p when password is set
        expect(result.filter(o => o === '-p')).toHaveLength(0);
    });

    test('correctly builds -R flag for recursive compilation', () => {
        const config = createMockConfig({
            'compiler.input.recursive': true
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-R');
    });

    test('correctly builds -@<filelist> for file list', () => {
        const config = createMockConfig({
            'compiler.input.fileList': '/path/to/files.txt'
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-@/path/to/files.txt');
    });

    test('correctly builds -e<errorlog> for error log', () => {
        const config = createMockConfig({
            'compiler.diagnostics.errorLog': '/path/to/errors.log'
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-e/path/to/errors.log');
    });

    test('correctly builds --verbose flag', () => {
        const config = createMockConfig({
            'compiler.diagnostics.verbose': true
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('--verbose');
    });

    test('handles multiple options together', () => {
        const config = createMockConfig({
            'compiler.typeChecking.enabled': true,
            'compiler.typeChecking.warnings': true,
            'compiler.lineNumbering.renumber': true,
            'compiler.output.validateOnly': true,
            'compiler.diagnostics.verbose': true
        });
        const result = buildCompileOptions(config);
        expect(result).toContain('-t');
        expect(result).toContain('-W');
        expect(result).toContain('-n');
        expect(result).toContain('-N');
        expect(result).toContain('--verbose');
        expect(result.length).toBe(5);
    });

    test('ignores null/undefined values for parameterized options', () => {
        const config = createMockConfig({
            'compiler.typeChecking.configFile': null,
            'compiler.output.directory': undefined,
            'compiler.lineNumbering.startLine': null
        });
        const result = buildCompileOptions(config);
        expect(result).toEqual([]);
    });

    test('ignores empty string values for parameterized options', () => {
        const config = createMockConfig({
            'compiler.typeChecking.configFile': '',
            'compiler.output.directory': ''
        });
        const result = buildCompileOptions(config);
        expect(result).toEqual([]);
    });

    test('ignores false values for boolean options', () => {
        const config = createMockConfig({
            'compiler.typeChecking.enabled': false,
            'compiler.lineNumbering.renumber': false,
            'compiler.diagnostics.verbose': false
        });
        const result = buildCompileOptions(config);
        expect(result).toEqual([]);
    });

});

describe('CompilerOptions - validateOptions', () => {

    test('returns valid result when no options configured', () => {
        const config = createMockConfig({});
        const result = validateOptions(config);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
    });

    test('detects -c and -P mutual exclusivity conflict', () => {
        const config = createMockConfig({
            'compiler.typeChecking.enabled': true,
            'compiler.typeChecking.configFile': '/path/to/config.bbx',
            'compiler.typeChecking.prefixDirectories': '/custom/prefix/'
        });
        const result = validateOptions(config);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.includes('-c') && e.includes('-P'))).toBe(true);
    });

    test('detects -x and -X mutual exclusivity conflict', () => {
        const config = createMockConfig({
            'compiler.output.extension': '.bbj',
            'compiler.output.keepExtension': true
        });
        const result = validateOptions(config);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.includes('-x') && e.includes('-X'))).toBe(true);
    });

    test('warns when -W used without -t', () => {
        const config = createMockConfig({
            'compiler.typeChecking.warnings': true
        });
        const result = validateOptions(config);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('-W') && w.includes('Enable Type Checking'))).toBe(true);
        // This is a warning, not an error
        expect(result.isValid).toBe(true);
    });

    test('warns when -c used without -t', () => {
        const config = createMockConfig({
            'compiler.typeChecking.configFile': '/path/to/config.bbx'
        });
        const result = validateOptions(config);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('-c') && w.includes('Enable Type Checking'))).toBe(true);
    });

    test('warns when -P used without -t', () => {
        const config = createMockConfig({
            'compiler.typeChecking.prefixDirectories': '/custom/prefix/'
        });
        const result = validateOptions(config);
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings.some(w => w.includes('-P') && w.includes('Enable Type Checking'))).toBe(true);
    });

    test('no warnings when -W used with -t', () => {
        const config = createMockConfig({
            'compiler.typeChecking.enabled': true,
            'compiler.typeChecking.warnings': true
        });
        const result = validateOptions(config);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
    });

    test('no warnings when -c used with -t', () => {
        const config = createMockConfig({
            'compiler.typeChecking.enabled': true,
            'compiler.typeChecking.configFile': '/path/to/config.bbx'
        });
        const result = validateOptions(config);
        expect(result.isValid).toBe(true);
        expect(result.warnings).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
    });

    test('no conflict when only -c is set (not -P)', () => {
        const config = createMockConfig({
            'compiler.typeChecking.enabled': true,
            'compiler.typeChecking.configFile': '/path/to/config.bbx',
            'compiler.typeChecking.prefixDirectories': null
        });
        const result = validateOptions(config);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('no conflict when only -x is set (not -X)', () => {
        const config = createMockConfig({
            'compiler.output.extension': '.bbj',
            'compiler.output.keepExtension': false
        });
        const result = validateOptions(config);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    test('multiple errors can be detected simultaneously', () => {
        const config = createMockConfig({
            'compiler.typeChecking.enabled': true,
            'compiler.typeChecking.configFile': '/path/to/config.bbx',
            'compiler.typeChecking.prefixDirectories': '/custom/prefix/',
            'compiler.output.extension': '.bbj',
            'compiler.output.keepExtension': true
        });
        const result = validateOptions(config);
        expect(result.isValid).toBe(false);
        // Should have errors for both conflicts
        expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    test('handles combination of errors and warnings', () => {
        const config = createMockConfig({
            // This creates a conflict
            'compiler.output.extension': '.bbj',
            'compiler.output.keepExtension': true,
            // This creates a warning (dependency not satisfied)
            'compiler.typeChecking.warnings': true
        });
        const result = validateOptions(config);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.warnings.length).toBeGreaterThan(0);
    });

});

describe('CompilerOptions - COMPILER_OPTIONS constant', () => {

    test('contains all 22 compiler options', () => {
        // 22 options as defined in the module (including both protect boolean and password)
        expect(COMPILER_OPTIONS.length).toBe(22);
    });

    test('all options have required properties', () => {
        for (const option of COMPILER_OPTIONS) {
            expect(option.flag).toBeDefined();
            expect(option.configKey).toBeDefined();
            expect(option.label).toBeDefined();
            expect(option.description).toBeDefined();
            expect(option.group).toBeDefined();
            expect(option.type).toBeDefined();
            expect(typeof option.hasParameter).toBe('boolean');
        }
    });

    test('all option groups are valid', () => {
        const validGroups = [
            'Type Checking',
            'Line Numbering',
            'Output Control',
            'Content Modification',
            'Input Handling',
            'Diagnostics'
        ];
        for (const option of COMPILER_OPTIONS) {
            expect(validGroups).toContain(option.group);
        }
    });

    test('all option types are valid', () => {
        const validTypes = ['boolean', 'string', 'number'];
        for (const option of COMPILER_OPTIONS) {
            expect(validTypes).toContain(option.type);
        }
    });

});

describe('CompilerOptions - getOptionsGrouped', () => {

    test('groups options correctly by group name', () => {
        const groups = getOptionsGrouped();
        expect(groups.size).toBe(6);
        expect(groups.has('Type Checking')).toBe(true);
        expect(groups.has('Line Numbering')).toBe(true);
        expect(groups.has('Output Control')).toBe(true);
        expect(groups.has('Content Modification')).toBe(true);
        expect(groups.has('Input Handling')).toBe(true);
        expect(groups.has('Diagnostics')).toBe(true);
    });

    test('Type Checking group has correct options', () => {
        const groups = getOptionsGrouped();
        const typeChecking = groups.get('Type Checking')!;
        expect(typeChecking.length).toBe(5); // -t, -W, -c, -P, -CP
        expect(typeChecking.map(o => o.flag)).toContain('-t');
        expect(typeChecking.map(o => o.flag)).toContain('-W');
        expect(typeChecking.map(o => o.flag)).toContain('-c');
        expect(typeChecking.map(o => o.flag)).toContain('-P');
        expect(typeChecking.map(o => o.flag)).toContain('-CP');
    });

    test('Line Numbering group has correct options', () => {
        const groups = getOptionsGrouped();
        const lineNumbering = groups.get('Line Numbering')!;
        expect(lineNumbering.length).toBe(5); // -n, -s, -i, --renum, -D
    });

    test('Output Control group has correct options', () => {
        const groups = getOptionsGrouped();
        const outputControl = groups.get('Output Control')!;
        expect(outputControl.length).toBe(5); // -d, -x, -X, -F, -N
    });

    test('Content Modification group has correct options', () => {
        const groups = getOptionsGrouped();
        const contentMod = groups.get('Content Modification')!;
        expect(contentMod.length).toBe(3); // -r, -p (boolean), -p (password)
    });

    test('Input Handling group has correct options', () => {
        const groups = getOptionsGrouped();
        const inputHandling = groups.get('Input Handling')!;
        expect(inputHandling.length).toBe(2); // -R, -@
    });

    test('Diagnostics group has correct options', () => {
        const groups = getOptionsGrouped();
        const diagnostics = groups.get('Diagnostics')!;
        expect(diagnostics.length).toBe(2); // -e, --verbose
    });

});

describe('CompilerOptions - OPTION_GROUP_ORDER', () => {

    test('contains all 6 groups in correct order', () => {
        expect(OPTION_GROUP_ORDER).toEqual([
            'Type Checking',
            'Line Numbering',
            'Output Control',
            'Content Modification',
            'Input Handling',
            'Diagnostics'
        ]);
    });

    test('matches all groups from getOptionsGrouped', () => {
        const groups = getOptionsGrouped();
        for (const groupName of OPTION_GROUP_ORDER) {
            expect(groups.has(groupName)).toBe(true);
        }
        expect(OPTION_GROUP_ORDER.length).toBe(groups.size);
    });

});
