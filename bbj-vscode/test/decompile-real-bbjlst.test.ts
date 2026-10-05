/******************************************************************************
 * Copyright 2026 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Drives the real Commands.cjs decompile commands against the real `bbjlst` and `bbjcpl` of a
 * local BBj install, so the output naming rules the fakes in commands-cjs-execution.test.ts
 * model are checked against the actual tool. Skipped when no BBj install is present.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runProcess } from '../src/Commands/process-runner.js';
import type { Argv } from '../src/Commands/process-args.js';
import { fakeProcessRunner, fakeVscode, loadCommands, resetCommandsHarness, setFakeSettings } from './commands-cjs-harness.js';

const BBJ_HOME = '/opt/bbx';
const BBJLST = `${BBJ_HOME}/bin/bbjlst`;
const BBJCPL = `${BBJ_HOME}/bin/bbjcpl`;
const hasBBj = fs.existsSync(BBJLST) && fs.existsSync(BBJCPL) && process.platform !== 'win32';

const PROGRAM_SOURCE = [
    'REM decompile smoke test',
    'GOSUB showit',
    'END',
    'showit:',
    'PRINT "Hello Decompiled World"',
    'RETURN',
    '',
].join('\n');

const TOKENIZED_MAGIC = '<<bbj>>';
const PER_TEST_TIMEOUT_MS = 60_000;

describe.skipIf(!hasBBj)('Decompile against the real bbjlst', () => {
    let fixtureDir: string;
    let tokenized: Buffer;
    let workDir: string;
    let scratchTmp: string;
    let savedTmpdir: string | undefined;

    beforeAll(() => {
        fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bbj-real-bbjlst-fixture-'));
        const sourceDir = path.join(fixtureDir, 'src');
        const tokenizedDir = path.join(fixtureDir, 'tok');
        fs.mkdirSync(sourceDir);
        fs.mkdirSync(tokenizedDir);
        const source = path.join(sourceDir, 'prog.bbj');
        fs.writeFileSync(source, PROGRAM_SOURCE);
        execFileSync(BBJCPL, [`-d${tokenizedDir}`, source]);
        tokenized = fs.readFileSync(path.join(tokenizedDir, 'prog.bbj'));
        expect(tokenized.subarray(0, TOKENIZED_MAGIC.length).toString('latin1')).toBe(TOKENIZED_MAGIC);
    }, PER_TEST_TIMEOUT_MS);

    afterAll(() => {
        fs.rmSync(fixtureDir, { recursive: true, force: true });
    });

    beforeEach(() => {
        resetCommandsHarness();
        setFakeSettings({
            bbj: { home: BBJ_HOME, classpath: '' },
            'bbj.web': { apps: {}, AutoSaveUponRun: false },
        });
        fakeProcessRunner.runProcess.mockImplementation((argv: Argv, options) => runProcess(argv, options));
        workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bbj-real-bbjlst-work-'));
        // Private directories are created under os.tmpdir(); a per-test TMPDIR makes
        // "no directory left behind" provable without racing other test files.
        scratchTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bbj-real-bbjlst-tmp-'));
        savedTmpdir = process.env.TMPDIR;
        process.env.TMPDIR = scratchTmp;
    });

    afterEach(() => {
        if (savedTmpdir === undefined) {
            delete process.env.TMPDIR;
        } else {
            process.env.TMPDIR = savedTmpdir;
        }
        fs.rmSync(workDir, { recursive: true, force: true });
        fs.rmSync(scratchTmp, { recursive: true, force: true });
    });

    function leftoverPrivateDirs(): string[] {
        return fs.readdirSync(scratchTmp).filter((name) => name.startsWith('bbj-decompiled-'));
    }

    async function decompileReplace(target: string): Promise<void> {
        const { Commands } = loadCommands();
        Commands.decompileReplace({ fsPath: target });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;
    }

    function expectDecompiledSource(file: string): void {
        const head = fs.readFileSync(file).subarray(0, TOKENIZED_MAGIC.length).toString('latin1');
        expect(head).not.toBe(TOKENIZED_MAGIC);
        expect(fs.readFileSync(file, 'utf-8').toLowerCase()).toContain('print "hello decompiled world"');
    }

    test.each([
        ['a.pub', 'a.pub'],
        ['an extensionless name', 'a'],
        ['a.lst', 'a.lst'],
    ])('Decompile & Replace rewrites %s in place as source', async (_label, fileName) => {
        const target = path.join(workDir, fileName);
        fs.writeFileSync(target, tokenized);
        const folderBefore = fs.readdirSync(workDir).sort();

        await decompileReplace(target);

        expect(fakeVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expectDecompiledSource(target);
        expect(fs.readdirSync(workDir).sort()).toEqual(folderBefore);
        expect(leftoverPrivateDirs()).toEqual([]);
    }, PER_TEST_TIMEOUT_MS);

    test('Decompile & Replace of a.bbj never overwrites a sibling file named like the extensionless base', async () => {
        const target = path.join(workDir, 'a.bbj');
        const sibling = path.join(workDir, 'a');
        const siblingContent = 'marker: this plain-text file must survive\n';
        fs.writeFileSync(target, tokenized);
        fs.writeFileSync(sibling, siblingContent);
        const folderBefore = fs.readdirSync(workDir).sort();

        await decompileReplace(target);

        expect(fakeVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expectDecompiledSource(target);
        expect(fs.readFileSync(sibling, 'utf-8')).toBe(siblingContent);
        expect(fs.readdirSync(workDir).sort()).toEqual(folderBefore);
        expect(leftoverPrivateDirs()).toEqual([]);
    }, PER_TEST_TIMEOUT_MS);

    test('Decompile (Read-only) opens a read-only source copy and leaves the tokenized original alone', async () => {
        const { Commands } = loadCommands();
        const target = path.join(workDir, 'a.bbj');
        fs.writeFileSync(target, tokenized);

        Commands.decompileReadonly({ fsPath: target });
        await fakeVscode.window.withProgress.mock.results.at(-1)?.value;

        expect(fakeVscode.window.showErrorMessage).not.toHaveBeenCalled();
        expect(fs.readFileSync(target).equals(tokenized)).toBe(true);
        expect(fs.readdirSync(workDir)).toEqual(['a.bbj']);
        const [uri] = fakeVscode.workspace.openTextDocument.mock.calls.at(-1) ?? [];
        const openedPath = (uri as { fsPath?: string } | undefined)?.fsPath ?? '';
        expect(path.basename(path.dirname(openedPath))).toMatch(/^bbj-decompiled-/);
        expect(path.dirname(path.dirname(openedPath))).toBe(scratchTmp);
        expect(path.basename(openedPath)).toBe('a.bbj');
        expectDecompiledSource(openedPath);
        expect(fakeVscode.commands.executeCommand).toHaveBeenCalledWith(
            'workbench.action.files.setActiveEditorReadonlyInSession'
        );
    }, PER_TEST_TIMEOUT_MS);
});
