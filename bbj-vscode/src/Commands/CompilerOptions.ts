/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import * as vscode from 'vscode';

/**
 * Groups of compiler options for organization in UI
 */
export type CompilerOptionGroup =
    | 'Type Checking'
    | 'Line Numbering'
    | 'Output Control'
    | 'Content Modification'
    | 'Input Handling'
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

    // Input Handling group
    {
        flag: '-R',
        configKey: 'input.recursive',
        label: 'Recursive Compilation',
        description: 'Recursively compile all files in directory and subdirectories',
        group: 'Input Handling',
        type: 'boolean',
        defaultValue: false,
        hasParameter: false
    },
    {
        flag: '-@',
        configKey: 'input.fileList',
        label: 'File List',
        description: 'File containing list of filenames to compile',
        group: 'Input Handling',
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
 * @param config The VSCode workspace configuration for 'bbj'
 * @param option The compiler option to get the value for
 * @returns The configured value or the default value
 */
function getOptionValue(config: vscode.WorkspaceConfiguration, option: CompilerOption): boolean | string | number | null {
    const fullKey = getFullConfigKey(option.configKey);
    const value = config.get(fullKey);
    if (value === undefined) {
        return option.defaultValue;
    }
    return value as boolean | string | number | null;
}

/**
 * Check if an option is enabled based on configuration
 * @param config The VSCode workspace configuration for 'bbj'
 * @param configKey The option's configKey
 * @returns True if the option is enabled
 */
function isOptionEnabled(config: vscode.WorkspaceConfiguration, configKey: string): boolean {
    const option = COMPILER_OPTIONS.find(o => o.configKey === configKey);
    if (!option) {
        return false;
    }
    const value = getOptionValue(config, option);
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
 * @param config The VSCode workspace configuration for 'bbj'
 * @param option The option that has dependencies
 * @param dependency The configKey of the required dependency
 * @returns Object with satisfied status and the dependency option details
 */
function checkDependency(
    config: vscode.WorkspaceConfiguration,
    option: CompilerOption,
    dependency: string
): { satisfied: boolean; depOption: CompilerOption | undefined } {
    const depOption = COMPILER_OPTIONS.find(o => o.configKey === dependency);
    const satisfied = isOptionEnabled(config, dependency);
    return { satisfied, depOption };
}

/**
 * Check if a mutual exclusivity rule is violated
 * @param config The VSCode workspace configuration for 'bbj'
 * @param option The option to check
 * @param conflict The configKey of the conflicting option
 * @returns Object with conflict status and the conflicting option details
 */
function checkMutualExclusivity(
    config: vscode.WorkspaceConfiguration,
    option: CompilerOption,
    conflict: string
): { hasConflict: boolean; conflictOption: CompilerOption | undefined } {
    const conflictOption = COMPILER_OPTIONS.find(o => o.configKey === conflict);
    const hasConflict = isOptionEnabled(config, conflict);
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
 * @param config The VSCode workspace configuration for 'bbj'
 * @returns Validation result with errors and warnings
 */
export function validateOptions(config: vscode.WorkspaceConfiguration): ValidationResult {
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
    };

    for (const option of COMPILER_OPTIONS) {
        const optionEnabled = isOptionEnabled(config, option.configKey);

        if (!optionEnabled) {
            continue;
        }

        // Check dependency rules
        // Options may require other options to be enabled to function correctly
        if (option.dependsOn && option.dependsOn.length > 0) {
            for (const dependency of option.dependsOn) {
                const { satisfied, depOption } = checkDependency(config, option, dependency);
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
                const { hasConflict, conflictOption } = checkMutualExclusivity(config, option, conflict);
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
 * @param config The VSCode workspace configuration for 'bbj'
 * @returns Array of command-line argument strings
 */
export function buildCompileOptions(config: vscode.WorkspaceConfiguration): string[] {
    const options: string[] = [];

    // Special handling for -p (protect) options
    // If protectPassword is set, use it; otherwise use protect boolean
    const protectPassword = config.get<string | null>(getFullConfigKey('content.protectPassword'));
    const protect = config.get<boolean>(getFullConfigKey('content.protect'));

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

        const value = getOptionValue(config, option);

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
    'Input Handling',
    'Diagnostics'
];
