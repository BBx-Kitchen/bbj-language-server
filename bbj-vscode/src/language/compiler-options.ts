/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Vscode-free bbjcpl compiler-option table plus reader-driven builders/validators (#571).
 *
 * This module is the single source of truth for bbjcpl's `bbj.compiler.*` options.
 * It is imported directly by the language server's `bbj/compile` request handler
 * (`compile-command.ts`) and, via a thin `vscode`-typed adapter
 * (`src/Commands/CompilerOptions.ts`), by VS Code's `bbj.compile` command — so the
 * option table exists exactly once in the repository (D-02).
 *
 * No `vscode` import of any kind: every function here takes a plain
 * {@link CompilerConfigReader} instead of a `vscode.WorkspaceConfiguration`, so this
 * module is unit-testable with zero mocks and importable from the language-server
 * bundle, which has no `vscode` dependency.
 */

/**
 * Groups of compiler options for organization in UI
 */
export type CompilerOptionGroup =
    | 'Type Checking'
    | 'Line Numbering'
    | 'Output Control'
    | 'Content Modification'
    | 'Diagnostics';

/**
 * Type of compiler option value
 */
export type CompilerOptionType = 'boolean' | 'string' | 'number';

/**
 * Definition of a single compiler option
 */
export interface CompilerOption {
    /** The CLI flag (e.g., '-t', '-W', '-c') */
    flag: string;
    /** The configuration key under bbj.compiler (e.g., 'typeChecking.enabled') */
    configKey: string;
    /** Human-readable label for the option */
    label: string;
    /** Description of what the option does */
    description: string;
    /** The option group for UI organization */
    group: CompilerOptionGroup;
    /** The type of value this option accepts */
    type: CompilerOptionType;
    /** Default value */
    defaultValue: boolean | string | number | null;
    /** Whether the option takes a parameter (e.g., -c<value>) */
    hasParameter: boolean;
    /** Options that this option depends on (must be enabled) */
    dependsOn?: string[];
    /** Options that conflict with this option (cannot both be enabled) */
    conflictsWith?: string[];
}

/**
 * Result of option validation
 */
export interface ValidationResult {
    /** Whether the options are valid */
    isValid: boolean;
    /** Error messages (for blocking issues) */
    errors: string[];
    /** Warning messages (for non-blocking issues) */
    warnings: string[];
}

/**
 * A reader over the effective `bbj.compiler.*` configuration. Called with the same
 * full key (`compiler.<configKey>`) the original `vscode.WorkspaceConfiguration`-based
 * code passed to `config.get`, so behaviour is identical by construction.
 */
export type CompilerConfigReader = (fullKey: string) => unknown;

/**
 * All BBjCPL compiler options with their configurations
 */
export const COMPILER_OPTIONS: CompilerOption[] = [
    // Type Checking group
    {
        flag: '-t',
        configKey: 'typeChecking.enabled',
        label: 'Enable Type Checking',
        description: 'Enable static type checking',
        group: 'Type Checking',
        type: 'boolean',
        defaultValue: false,
        hasParameter: false
    },
    {
        flag: '-W',
        configKey: 'typeChecking.warnings',
        label: 'Enable Warnings',
        description: 'Enable warnings about undeclared code',
        group: 'Type Checking',
        type: 'boolean',
        defaultValue: false,
        hasParameter: false,
        dependsOn: ['typeChecking.enabled']
    },
    {
        flag: '-c',
        configKey: 'typeChecking.configFile',
        label: 'Config File',
        description: 'Configuration file for type checker to resolve USE statements',
        group: 'Type Checking',
        type: 'string',
        defaultValue: null,
        hasParameter: true,
        dependsOn: ['typeChecking.enabled'],
        conflictsWith: ['typeChecking.prefixDirectories']
    },
    {
        flag: '-P',
        configKey: 'typeChecking.prefixDirectories',
        label: 'Prefix Directories',
        description: 'Prefix directories for custom object resolution',
        group: 'Type Checking',
        type: 'string',
        defaultValue: null,
        hasParameter: true,
        dependsOn: ['typeChecking.enabled'],
        conflictsWith: ['typeChecking.configFile']
    },
    {
        flag: '-CP',
        configKey: 'typeChecking.classpath',
        label: 'Type Checking Classpath',
        description: 'Session-Specific Classpath for type-checking Java class references',
        group: 'Type Checking',
        type: 'string',
        defaultValue: null,
        hasParameter: true
    },

    // Line Numbering group
    {
        flag: '-n',
        configKey: 'lineNumbering.renumber',
        label: 'Renumber Program',
        description: 'Renumber the generated program',
        group: 'Line Numbering',
        type: 'boolean',
        defaultValue: false,
        hasParameter: false
    },
    {
        flag: '-s',
        configKey: 'lineNumbering.startLine',
        label: 'Starting Line Number',
        description: 'Starting line number for programs without line numbers',
        group: 'Line Numbering',
        type: 'number',
        defaultValue: null,
        hasParameter: true
    },
    {
        flag: '-i',
        configKey: 'lineNumbering.interval',
        label: 'Line Number Interval',
        description: 'Line number increment for programs without line numbers',
        group: 'Line Numbering',
        type: 'number',
        defaultValue: null,
        hasParameter: true
    },
    {
        flag: '--renum',
        configKey: 'lineNumbering.processRenum',
        label: 'Process Renum Commands',
        description: 'Process renumbering commands in REM statements',
        group: 'Line Numbering',
        type: 'boolean',
        defaultValue: false,
        hasParameter: false
    },
    {
        flag: '-D',
        configKey: 'lineNumbering.removeLineNumbers',
        label: 'Remove Line Numbers',
        description: 'Remove line numbers, inserting labels where needed',
        group: 'Line Numbering',
        type: 'boolean',
        defaultValue: false,
        hasParameter: false
    },

    // Output Control group
    {
        flag: '-d',
        configKey: 'output.directory',
        label: 'Output Directory',
        description: 'Output directory for compiled files',
        group: 'Output Control',
        type: 'string',
        defaultValue: null,
        hasParameter: true
    },
    {
        flag: '-x',
        configKey: 'output.extension',
        label: 'Output Extension',
        description: 'Append extension to output filenames',
        group: 'Output Control',
        type: 'string',
        defaultValue: null,
        hasParameter: true,
        conflictsWith: ['output.keepExtension']
    },
    {
        flag: '-X',
        configKey: 'output.keepExtension',
        label: 'Keep Extension',
        description: 'Keep the extension of input files',
        group: 'Output Control',
        type: 'boolean',
        defaultValue: false,
        hasParameter: false,
        conflictsWith: ['output.extension']
    },
    {
        flag: '-F',
        configKey: 'output.forceOverwrite',
        label: 'Force Overwrite',
        description: 'Force overwriting of input files if output would conflict',
        group: 'Output Control',
        type: 'boolean',
        defaultValue: false,
        hasParameter: false
    },
    {
        flag: '-N',
        configKey: 'output.validateOnly',
        label: 'Validate Only',
        description: 'Validate only, do not write output files',
        group: 'Output Control',
        type: 'boolean',
        defaultValue: false,
        hasParameter: false
    },

    // Content Modification group
    {
        flag: '-r',
        configKey: 'content.removeRem',
        label: 'Remove REM Statements',
        description: 'Remove all REM statements',
        group: 'Content Modification',
        type: 'boolean',
        defaultValue: false,
        hasParameter: false
    },
    {
        flag: '-p',
        configKey: 'content.protect',
        label: 'Generate Protected Program',
        description: 'Generate protected program',
        group: 'Content Modification',
        type: 'boolean',
        defaultValue: false,
        hasParameter: false
    },
    {
        flag: '-p',
        configKey: 'content.protectPassword',
        label: 'Protection Password',
        description: 'Password for protected program. Empty = unclearable password.',
        group: 'Content Modification',
        type: 'string',
        defaultValue: null,
        hasParameter: true
    },

    // Diagnostics group
    {
        flag: '-e',
        configKey: 'diagnostics.errorLog',
        label: 'Error Log File',
        description: 'File to write error output',
        group: 'Diagnostics',
        type: 'string',
        defaultValue: null,
        hasParameter: true
    },
    {
        flag: '--verbose',
        configKey: 'diagnostics.verbose',
        label: 'Verbose Output',
        description: 'Print debugging information',
        group: 'Diagnostics',
        type: 'boolean',
        defaultValue: false,
        hasParameter: false
    }
];

/**
 * Get the full configuration key for a compiler option
 * @param configKey The option's configKey (e.g., 'typeChecking.enabled')
 * @returns The full configuration key (e.g., 'compiler.typeChecking.enabled')
 */
function getFullConfigKey(configKey: string): string {
    return `compiler.${configKey}`;
}

/**
 * Get the value of a compiler option from configuration
 * @param read The compiler-config reader
 * @param option The compiler option to get the value for
 * @returns The configured value or the default value
 */
function getOptionValue(read: CompilerConfigReader, option: CompilerOption): boolean | string | number | null {
    const fullKey = getFullConfigKey(option.configKey);
    const value = read(fullKey);
    if (value === undefined) {
        return option.defaultValue;
    }
    return value as boolean | string | number | null;
}

/**
 * Check if an option is enabled based on configuration
 * @param read The compiler-config reader
 * @param configKey The option's configKey
 * @returns True if the option is enabled
 */
function isOptionEnabled(read: CompilerConfigReader, configKey: string): boolean {
    const option = COMPILER_OPTIONS.find(o => o.configKey === configKey);
    if (!option) {
        return false;
    }
    const value = getOptionValue(read, option);
    if (option.type === 'boolean') {
        return value === true;
    }
    // For string/number options, enabled means has a non-null value
    return value !== null && value !== undefined && value !== '';
}

/**
 * Mutual exclusivity rules:
 * - configFile (-c) and prefixDirectories (-P) cannot both be specified
 * - extension (-x) and keepExtension (-X) cannot both be specified
 *
 * Dependency rules:
 * - warnings (-W) requires typeChecking (-t) to be enabled
 * - configFile (-c) requires typeChecking (-t) to be enabled
 * - prefixDirectories (-P) requires typeChecking (-t) to be enabled
 */

/**
 * Check if a dependency requirement is satisfied
 * @param read The compiler-config reader
 * @param option The option that has dependencies
 * @param dependency The configKey of the required dependency
 * @returns Object with satisfied status and the dependency option details
 */
function checkDependency(
    read: CompilerConfigReader,
    option: CompilerOption,
    dependency: string
): { satisfied: boolean; depOption: CompilerOption | undefined } {
    const depOption = COMPILER_OPTIONS.find(o => o.configKey === dependency);
    const satisfied = isOptionEnabled(read, dependency);
    return { satisfied, depOption };
}

/**
 * Check if a mutual exclusivity rule is violated
 * @param read The compiler-config reader
 * @param option The option to check
 * @param conflict The configKey of the conflicting option
 * @returns Object with conflict status and the conflicting option details
 */
function checkMutualExclusivity(
    read: CompilerConfigReader,
    option: CompilerOption,
    conflict: string
): { hasConflict: boolean; conflictOption: CompilerOption | undefined } {
    const conflictOption = COMPILER_OPTIONS.find(o => o.configKey === conflict);
    const hasConflict = isOptionEnabled(read, conflict);
    return { hasConflict, conflictOption };
}

/**
 * Validate compiler options configuration for conflicts and dependencies
 *
 * This function checks:
 * 1. Dependency rules - certain options require other options to be enabled
 *    (e.g., -W requires -t to be enabled)
 * 2. Mutual exclusivity rules - certain options cannot be used together
 *    (e.g., -c and -P cannot both be specified)
 *
 * @param read The compiler-config reader
 * @returns Validation result with errors and warnings
 */
export function validateOptionsFrom(read: CompilerConfigReader): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    for (const option of COMPILER_OPTIONS) {
        const optionEnabled = isOptionEnabled(read, option.configKey);

        if (!optionEnabled) {
            continue;
        }

        // Check dependency rules
        // Options may require other options to be enabled to function correctly
        if (option.dependsOn && option.dependsOn.length > 0) {
            for (const dependency of option.dependsOn) {
                const { satisfied, depOption } = checkDependency(read, option, dependency);
                if (!satisfied) {
                    const depLabel = depOption?.label || dependency;
                    result.warnings.push(
                        `"${option.label}" (${option.flag}) requires "${depLabel}" to be enabled`
                    );
                }
            }
        }

        // Check mutual exclusivity rules (conflicts)
        // Certain options cannot be used together
        if (option.conflictsWith && option.conflictsWith.length > 0) {
            for (const conflict of option.conflictsWith) {
                const { hasConflict, conflictOption } = checkMutualExclusivity(read, option, conflict);
                if (hasConflict) {
                    const conflictLabel = conflictOption?.label || conflict;
                    // Only add the error once (avoid duplicates for both sides of the conflict)
                    const errorMsg = `"${option.label}" (${option.flag}) cannot be used with "${conflictLabel}" (${conflictOption?.flag || conflict})`;
                    if (!result.errors.some(e => e.includes(option.flag) && e.includes(conflictOption?.flag || conflict))) {
                        result.errors.push(errorMsg);
                        result.isValid = false;
                    }
                }
            }
        }
    }

    return result;
}

/**
 * Build the array of command-line arguments from compiler configuration
 * @param read The compiler-config reader
 * @returns Array of command-line argument strings
 */
export function buildCompileOptionsFrom(read: CompilerConfigReader): string[] {
    const options: string[] = [];

    // Special handling for -p (protect) options
    // If protectPassword is set, use it; otherwise use protect boolean
    const protectPassword = read(getFullConfigKey('content.protectPassword')) as string | null | undefined;
    const protect = read(getFullConfigKey('content.protect')) as boolean | undefined;

    for (const option of COMPILER_OPTIONS) {
        // Skip the protectPassword entry - we handle it with protect
        if (option.configKey === 'content.protectPassword') {
            continue;
        }

        // Special handling for protect option
        if (option.configKey === 'content.protect') {
            if (protectPassword !== null && protectPassword !== undefined && protectPassword !== '') {
                // Use password version: -p<password>
                options.push(`-p${protectPassword}`);
            } else if (protect === true) {
                // Use boolean version: -p (unclearable password)
                options.push('-p');
            }
            continue;
        }

        const value = getOptionValue(read, option);

        if (option.type === 'boolean') {
            if (value === true) {
                options.push(option.flag);
            }
        } else if (option.type === 'string' || option.type === 'number') {
            if (value !== null && value !== undefined && value !== '') {
                // Parameterized options: flag directly followed by value (no space)
                options.push(`${option.flag}${value}`);
            }
        }
    }

    return options;
}

/**
 * Get all compiler options grouped by their group
 * @returns Map of group name to array of options in that group
 */
export function getOptionsGrouped(): Map<CompilerOptionGroup, CompilerOption[]> {
    const groups = new Map<CompilerOptionGroup, CompilerOption[]>();

    for (const option of COMPILER_OPTIONS) {
        const group = groups.get(option.group) || [];
        group.push(option);
        groups.set(option.group, group);
    }

    return groups;
}

/**
 * Get the order of option groups for UI display
 */
export const OPTION_GROUP_ORDER: CompilerOptionGroup[] = [
    'Type Checking',
    'Line Numbering',
    'Output Control',
    'Content Modification',
    'Diagnostics'
];

/**
 * Build a {@link CompilerConfigReader} over the plain object the language server holds
 * as its effective `bbj.compiler.*` configuration (`BBjWorkspaceManager.getCompilerConfig()`
 * — the object nested one level under `bbj.compiler`, e.g. `{ output: { directory: '/tmp' } }`).
 *
 * Every full key passed in here (by {@link validateOptionsFrom} / {@link buildCompileOptionsFrom})
 * is of the shape `compiler.<configKey>`; this reader strips the leading `compiler.` and walks
 * the remaining dot-separated segments through `compilerConfig`, returning `undefined` for a
 * missing segment or when a non-object is encountered partway through the walk.
 */
export function readerFromCompilerConfig(compilerConfig: unknown): CompilerConfigReader {
    return (fullKey: string): unknown => {
        const prefix = 'compiler.';
        if (!fullKey.startsWith(prefix)) {
            return undefined;
        }
        const remainder = fullKey.slice(prefix.length);
        const segments = remainder.split('.');
        let current: unknown = compilerConfig;
        for (const segment of segments) {
            if (current === null || typeof current !== 'object') {
                return undefined;
            }
            current = (current as Record<string, unknown>)[segment];
        }
        return current;
    };
}

/**
 * D-05's guard predicate: an explicit output location is required so a compile never
 * writes anywhere the user did not name. bbjcpl's own default (no `-d`, no `-N`) does
 * NOT overwrite the source in place — it writes a sibling file with the `.bbj`
 * extension flipped, and refuses on its own when the derived name collides with the
 * source. This rule is therefore the server's own safety policy, not a restatement of
 * bbjcpl's behaviour: `bbj/compile` always requires the caller to say, explicitly,
 * either where the compiled output should go (`compiler.output.directory`) or that
 * nothing should be written at all (`compiler.output.validateOnly`).
 *
 * @param read The compiler-config reader
 * @returns true when neither an output directory nor validate-only is configured
 */
export function lacksExplicitOutputLocation(read: CompilerConfigReader): boolean {
    const outputDirectory = read(getFullConfigKey('output.directory'));
    const hasOutputDirectory = typeof outputDirectory === 'string' && outputDirectory.length > 0;
    const validateOnly = read(getFullConfigKey('output.validateOnly')) === true;
    return !hasOutputDirectory && !validateOnly;
}
