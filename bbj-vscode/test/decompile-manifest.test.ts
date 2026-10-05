import { describe, expect, test } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { resolveDecompileTarget } from '../src/Commands/target-resolution.js';

/**
 * A tokenized (binary) program never becomes a text document, so no `onLanguage` event fires for
 * it. These tests pin the manifest entries that still get the user to the decompile commands.
 */
const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf-8'));
const explorerEntries: Array<{ when?: string; command: string; group?: string }> = manifest.contributes.menus['explorer/context'];

describe('activation for a binary BBj program', () => {
    test('activates once startup has finished, so the open-tab listener is always registered', () => {
        expect(manifest.activationEvents).toContain('onStartupFinished');
    });

    test('keeps the language activation events', () => {
        expect(manifest.activationEvents).toContain('onLanguage:bbj');
        expect(manifest.activationEvents).toContain('onLanguage:bbx-config');
    });
});

describe('Explorer entries for the decompile commands', () => {
    for (const command of ['bbj.decompile', 'bbj.decompileReadonly']) {
        test(`${command} is declared as a command and has exactly one Explorer entry`, () => {
            expect(manifest.contributes.commands.some((c: { command: string }) => c.command === command)).toBe(true);
            const entries = explorerEntries.filter(item => item.command === command);
            expect(entries).toHaveLength(1);
            expect(entries[0].group).toMatch(/^BBj@\d+$/);
        });

        test(`${command} is offered for files only, on the file scheme`, () => {
            const when = explorerEntries.find(item => item.command === command)?.when ?? '';
            expect(when).toContain('!explorerResourceIsFolder');
            expect(when).toContain('resourceScheme == file');
        });

        test(`${command} is offered for .bbj, .pub, .src and extensionless names`, () => {
            const when = explorerEntries.find(item => item.command === command)?.when ?? '';
            expect(when).toContain('resourceLangId == bbj');
            expect(when).toContain('resourceExtname == .pub');
            expect(when).toContain('resourceExtname == .src');
            expect(when).toMatch(/resourceFilename =~ \/\^\[\^\.\]\+\$\//);
        });
    }

    test('the two decompile entries use different groups', () => {
        const groups = ['bbj.decompile', 'bbj.decompileReadonly']
            .map(command => explorerEntries.find(item => item.command === command)?.group);
        expect(new Set(groups).size).toBe(2);
    });

    test('the extensionless pattern matches a bare name and rejects a dotted name and a dotfile', () => {
        const when = explorerEntries.find(item => item.command === 'bbj.decompile')?.when ?? '';
        const source = /resourceFilename =~ \/(.+)\/\)$/.exec(when)?.[1];
        expect(source).toBeDefined();
        const bare = new RegExp(source!);
        expect(bare.test('tok3')).toBe(true);
        expect(bare.test('tok.bbj')).toBe(false);
        expect(bare.test('.env')).toBe(false);
    });
});

describe('decompile target for an Explorer invocation', () => {
    test('uses the file path of the Explorer resource', () => {
        expect(resolveDecompileTarget('/work/tok3', undefined)).toBe('/work/tok3');
    });

    test('falls back to the active BBj editor when there is no argument', () => {
        expect(resolveDecompileTarget(undefined, { languageId: 'bbj', fileName: '/work/a.bbj' })).toBe('/work/a.bbj');
    });

    test('has no target without an argument and without an active BBj editor', () => {
        expect(resolveDecompileTarget(undefined, undefined)).toBeUndefined();
        expect(resolveDecompileTarget(undefined, { languageId: 'plaintext', fileName: '/work/a.txt' })).toBeUndefined();
    });
});
