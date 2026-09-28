import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, test } from 'vitest';
import { COMPILER_OPTIONS } from '../src/language/compiler-options.js';

/**
 * package.json's `contributes.configuration` block is what VS Code's Settings UI (and
 * raw settings.json) offers for every `bbj.compiler.*` setting. COMPILER_OPTIONS drives
 * the compile QuickPick and the bbjcpl arguments the language server actually builds.
 * Both are hand-maintained files, so nothing stops them from drifting apart — an option
 * added, removed or re-defaulted on one side without the other (#606).
 *
 * This test keeps the two in sync: every COMPILER_OPTIONS entry has a matching
 * bbj.compiler.<configKey> setting in package.json with the same type and default.
 * Labels and descriptions are deliberately NOT compared: the Settings-UI text names the
 * bbjcpl flag and its caveats, while the QuickPick text in the table stays short, and
 * that difference is intended, not drift.
 */

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
    contributes: { configuration: unknown };
};

function collectSettingProperties(configuration: unknown): Record<string, { type: unknown; default: unknown }> {
    const sections = Array.isArray(configuration) ? configuration : [configuration];
    const properties: Record<string, { type: unknown; default: unknown }> = {};
    for (const section of sections) {
        const sectionProperties = (section as { properties?: Record<string, { type: unknown; default: unknown }> }).properties;
        if (sectionProperties) {
            Object.assign(properties, sectionProperties);
        }
    }
    return properties;
}

const settingProperties = collectSettingProperties(packageJson.contributes.configuration);
const COMPILER_SETTING_KEYS = Object.keys(settingProperties).filter(key => key.startsWith('bbj.compiler.'));

function settingType(type: unknown): string {
    if (typeof type === 'string') {
        return type;
    }
    if (Array.isArray(type)) {
        const nonNull = type.filter(entry => entry !== 'null');
        if (nonNull.length === 1) {
            return String(nonNull[0]);
        }
    }
    return JSON.stringify(type);
}

describe('bbj.compiler.* settings in package.json match COMPILER_OPTIONS', () => {

    test('both sides are non-empty', () => {
        expect(COMPILER_OPTIONS.length).toBeGreaterThan(0);
        expect(COMPILER_SETTING_KEYS.length).toBeGreaterThan(0);
    });

    test.each(COMPILER_OPTIONS)('$configKey: package.json has the same setting, type and default', (option) => {
        const key = `bbj.compiler.${option.configKey}`;
        const setting = settingProperties[key];
        expect(setting, `${key} is in COMPILER_OPTIONS (compiler-options.ts) but missing from package.json`).toBeDefined();
        expect(settingType(setting.type), `${key}: type in package.json differs from compiler-options.ts`).toBe(option.type);
        expect(setting.default, `${key}: default in package.json differs from compiler-options.ts`).toStrictEqual(option.defaultValue);
    });

});
