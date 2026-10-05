import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, test, vi } from 'vitest';
import {
    createSingleFlightRunner,
    migrateSplitSingleLineIf,
    type SettingInspection,
    type SettingsMigrationDeps,
} from '../src/settings-migration.js';

const OLD_KEY = 'splitSingleLineIF';
const NEW_KEY = 'splitSingleLineIf';
const USER = 'user-target';
const WORKSPACE = 'workspace-target';

type Scope = 'global' | 'workspace';
type Table = Record<string, { globalValue?: unknown; workspaceValue?: unknown }>;

/** A fake configuration: `inspect` reads a per-scope table, `update` records the call and,
 *  unless told otherwise, applies it to the table the way the editor would. */
class FakeConfiguration {
    readonly updates: Array<[string, unknown, string]> = [];
    readonly lines: string[] = [];
    inspectThrows = false;
    inspectReturnsUndefined = false;
    workspaceTrusted = true;
    rejectWhen: (key: string, value: unknown, target: string) => Error | undefined = () => undefined;

    constructor(private readonly table: Table) { }

    deps(): SettingsMigrationDeps<string> {
        return {
            inspect: (key: string): SettingInspection | undefined => {
                if (this.inspectThrows) {
                    throw new Error('configuration unavailable');
                }
                return this.inspectReturnsUndefined ? undefined : { ...(this.table[key] ?? {}) };
            },
            update: async (key: string, value: unknown, target: string): Promise<void> => {
                this.updates.push([key, value, target]);
                const failure = this.rejectWhen(key, value, target);
                if (failure) {
                    throw failure;
                }
                const scope: Scope = target === USER ? 'global' : 'workspace';
                const entry = (this.table[key] ??= {});
                if (scope === 'global') {
                    entry.globalValue = value;
                } else {
                    entry.workspaceValue = value;
                }
            },
            userTarget: USER,
            workspaceTarget: WORKSPACE,
            workspaceTrusted: this.workspaceTrusted,
            log: (line: string) => { this.lines.push(line); },
        };
    }

    run(): Promise<void> {
        return migrateSplitSingleLineIf(this.deps());
    }
}

describe('migrateSplitSingleLineIf', () => {
    test('moves a user scope value to the new spelling, then removes the old one', async () => {
        const config = new FakeConfiguration({ [OLD_KEY]: { globalValue: true } });
        await config.run();
        expect(config.updates).toEqual([
            [NEW_KEY, true, USER],
            [OLD_KEY, undefined, USER],
        ]);
        expect(config.lines).toEqual([
            'Moved bbj.formatter.splitSingleLineIF to bbj.formatter.splitSingleLineIf in the user settings.',
        ]);
    });

    test('moves a trusted workspace scope value, keeping false as false', async () => {
        const config = new FakeConfiguration({ [OLD_KEY]: { workspaceValue: false } });
        await config.run();
        expect(config.updates).toEqual([
            [NEW_KEY, false, WORKSPACE],
            [OLD_KEY, undefined, WORKSPACE],
        ]);
        expect(config.lines).toEqual([
            'Moved bbj.formatter.splitSingleLineIF to bbj.formatter.splitSingleLineIf in the workspace settings.',
        ]);
    });

    test('migrates both scopes with their own value, user first, with one combined line', async () => {
        const config = new FakeConfiguration({ [OLD_KEY]: { globalValue: true, workspaceValue: false } });
        await config.run();
        expect(config.updates).toEqual([
            [NEW_KEY, true, USER],
            [OLD_KEY, undefined, USER],
            [NEW_KEY, false, WORKSPACE],
            [OLD_KEY, undefined, WORKSPACE],
        ]);
        expect(config.lines).toEqual([
            'Moved bbj.formatter.splitSingleLineIF to bbj.formatter.splitSingleLineIf in the user and workspace settings.',
        ]);
    });

    test('leaves a scope untouched and logs nothing when both spellings are set to different values', async () => {
        const config = new FakeConfiguration({
            [OLD_KEY]: { globalValue: true },
            [NEW_KEY]: { globalValue: false },
        });
        await config.run();
        expect(config.updates).toEqual([]);
        expect(config.lines).toEqual([]);
    });

    test('removes only the old key when both spellings hold the same value in the user scope', async () => {
        const config = new FakeConfiguration({
            [OLD_KEY]: { globalValue: true },
            [NEW_KEY]: { globalValue: true },
        });
        await config.run();
        expect(config.updates).toEqual([[OLD_KEY, undefined, USER]]);
        expect(config.lines).toEqual([
            'Removed bbj.formatter.splitSingleLineIF from the user settings; bbj.formatter.splitSingleLineIf already holds the same value.',
        ]);
    });

    test('cleans both scopes holding equal pairs and logs one combined line', async () => {
        const config = new FakeConfiguration({
            [OLD_KEY]: { globalValue: true, workspaceValue: false },
            [NEW_KEY]: { globalValue: true, workspaceValue: false },
        });
        await config.run();
        expect(config.updates).toEqual([
            [OLD_KEY, undefined, USER],
            [OLD_KEY, undefined, WORKSPACE],
        ]);
        expect(config.lines).toEqual([
            'Removed bbj.formatter.splitSingleLineIF from the user and workspace settings; bbj.formatter.splitSingleLineIf already holds the same value.',
        ]);
    });

    test('leaves an untrusted workspace holding an equal pair alone', async () => {
        const config = new FakeConfiguration({
            [OLD_KEY]: { globalValue: true, workspaceValue: true },
            [NEW_KEY]: { globalValue: true, workspaceValue: true },
        });
        config.workspaceTrusted = false;
        await config.run();
        expect(config.updates).toEqual([[OLD_KEY, undefined, USER]]);
        expect(config.lines).toEqual([
            'Removed bbj.formatter.splitSingleLineIF from the user settings; bbj.formatter.splitSingleLineIf already holds the same value.',
        ]);
    });

    test('reports a move and a clean-up separately when one scope is moved and the other cleaned', async () => {
        const config = new FakeConfiguration({
            [OLD_KEY]: { globalValue: true, workspaceValue: false },
            [NEW_KEY]: { workspaceValue: false },
        });
        await config.run();
        expect(config.updates).toEqual([
            [NEW_KEY, true, USER],
            [OLD_KEY, undefined, USER],
            [OLD_KEY, undefined, WORKSPACE],
        ]);
        expect(config.lines).toEqual([
            'Moved bbj.formatter.splitSingleLineIF to bbj.formatter.splitSingleLineIf in the user settings.',
            'Removed bbj.formatter.splitSingleLineIF from the workspace settings; bbj.formatter.splitSingleLineIf already holds the same value.',
        ]);
    });

    test('logs one failure line and resolves when removing the old key of an equal pair fails', async () => {
        const config = new FakeConfiguration({
            [OLD_KEY]: { globalValue: true },
            [NEW_KEY]: { globalValue: true },
        });
        config.rejectWhen = () => new Error('write refused');
        await expect(config.run()).resolves.toBeUndefined();
        expect(config.updates).toEqual([[OLD_KEY, undefined, USER]]);
        expect(config.lines).toEqual([
            'Could not remove bbj.formatter.splitSingleLineIF in the user settings: write refused',
        ]);
    });

    test('treats the scopes independently when only one has both spellings', async () => {
        const config = new FakeConfiguration({
            [OLD_KEY]: { globalValue: true, workspaceValue: true },
            [NEW_KEY]: { globalValue: false },
        });
        await config.run();
        expect(config.updates).toEqual([
            [NEW_KEY, true, WORKSPACE],
            [OLD_KEY, undefined, WORKSPACE],
        ]);
        expect(config.lines).toEqual([
            'Moved bbj.formatter.splitSingleLineIF to bbj.formatter.splitSingleLineIf in the workspace settings.',
        ]);
    });

    test.each([
        ['unset', undefined],
        ['null', null],
        ['the string true', 'true'],
        ['the number 1', 1],
        ['an object', { value: true }],
    ])('leaves an old value that is %s untouched', async (_label, value) => {
        const config = new FakeConfiguration({ [OLD_KEY]: { globalValue: value, workspaceValue: value } });
        await config.run();
        expect(config.updates).toEqual([]);
        expect(config.lines).toEqual([]);
    });

    test('resolves without an update or a line when reading the configuration throws', async () => {
        const config = new FakeConfiguration({ [OLD_KEY]: { globalValue: true } });
        config.inspectThrows = true;
        await expect(config.run()).resolves.toBeUndefined();
        expect(config.updates).toEqual([]);
        expect(config.lines).toEqual([]);
    });

    test('resolves without an update or a line when the configuration answers undefined', async () => {
        const config = new FakeConfiguration({ [OLD_KEY]: { globalValue: true } });
        config.inspectReturnsUndefined = true;
        await expect(config.run()).resolves.toBeUndefined();
        expect(config.updates).toEqual([]);
        expect(config.lines).toEqual([]);
    });

    test('does not remove the old key when writing the new one fails, and still migrates the other scope', async () => {
        const config = new FakeConfiguration({ [OLD_KEY]: { globalValue: true, workspaceValue: false } });
        config.rejectWhen = (key, _value, target) =>
            key === NEW_KEY && target === USER ? new Error('settings file is dirty') : undefined;
        await expect(config.run()).resolves.toBeUndefined();
        expect(config.updates).toEqual([
            [NEW_KEY, true, USER],
            [NEW_KEY, false, WORKSPACE],
            [OLD_KEY, undefined, WORKSPACE],
        ]);
        expect(config.lines).toHaveLength(2);
        expect(config.lines[0].startsWith(
            'Could not finish moving bbj.formatter.splitSingleLineIF to bbj.formatter.splitSingleLineIf in the user settings'
        )).toBe(true);
        expect(config.lines[0]).toContain('settings file is dirty');
        expect(config.lines[1]).toBe(
            'Moved bbj.formatter.splitSingleLineIF to bbj.formatter.splitSingleLineIf in the workspace settings.'
        );
    });

    test('logs one failure line when the removal of the old key fails', async () => {
        const config = new FakeConfiguration({ [OLD_KEY]: { globalValue: true } });
        config.rejectWhen = (key) => key === OLD_KEY ? new Error('write refused') : undefined;
        await expect(config.run()).resolves.toBeUndefined();
        expect(config.updates).toEqual([
            [NEW_KEY, true, USER],
            [OLD_KEY, undefined, USER],
        ]);
        expect(config.lines).toHaveLength(1);
        expect(config.lines[0].startsWith('Could not finish moving')).toBe(true);
        expect(config.lines[0]).toContain('in the user settings');
        expect(config.lines[0]).toContain('write refused');
    });

    test('keeps a failure reason on one line', async () => {
        const config = new FakeConfiguration({ [OLD_KEY]: { globalValue: true } });
        config.rejectWhen = () => new Error('first\nsecond\r\nthird');
        await config.run();
        expect(config.lines).toHaveLength(1);
        expect(config.lines[0]).not.toMatch(/[\r\n]/);
        expect(config.lines[0]).toContain('first second third');
    });

    test('names a rejection that is not an Error', async () => {
        const config = new FakeConfiguration({ [OLD_KEY]: { globalValue: true } });
        config.deps = () => ({
            inspect: (key: string) => (key === OLD_KEY ? { globalValue: true } : {}),
            update: () => Promise.reject('plain text reason'),
            userTarget: USER,
            workspaceTarget: WORKSPACE,
            workspaceTrusted: true,
            log: (line: string) => { config.lines.push(line); },
        });
        await expect(config.run()).resolves.toBeUndefined();
        expect(config.lines).toHaveLength(1);
        expect(config.lines[0]).toContain('plain text reason');
    });

    test('leaves the workspace scope alone when the workspace is not trusted, and still migrates the user scope', async () => {
        const config = new FakeConfiguration({ [OLD_KEY]: { globalValue: true, workspaceValue: true } });
        config.workspaceTrusted = false;
        await config.run();
        expect(config.updates).toEqual([
            [NEW_KEY, true, USER],
            [OLD_KEY, undefined, USER],
        ]);
        expect(config.lines).toEqual([
            'Moved bbj.formatter.splitSingleLineIF to bbj.formatter.splitSingleLineIf in the user settings.',
        ]);
    });

    test('changes nothing on a second run against a configuration that applied the first run', async () => {
        const config = new FakeConfiguration({ [OLD_KEY]: { globalValue: true, workspaceValue: false } });
        await config.run();
        config.updates.length = 0;
        config.lines.length = 0;
        await config.run();
        expect(config.updates).toEqual([]);
        expect(config.lines).toEqual([]);
    });

    test('never names a migrated value in a log line', async () => {
        const moved = new FakeConfiguration({ [OLD_KEY]: { globalValue: true, workspaceValue: false } });
        await moved.run();
        const failed = new FakeConfiguration({ [OLD_KEY]: { globalValue: true, workspaceValue: false } });
        failed.rejectWhen = () => new Error('write refused');
        await failed.run();
        for (const line of [...moved.lines, ...failed.lines]) {
            expect(line).not.toMatch(/\b(true|false)\b/);
        }
    });

    test('resolves even when the log callback throws', async () => {
        const config = new FakeConfiguration({ [OLD_KEY]: { globalValue: true } });
        const deps = config.deps();
        deps.log = () => { throw new Error('log failed'); };
        await expect(migrateSplitSingleLineIf(deps)).resolves.toBeUndefined();
        expect(config.updates).toHaveLength(2);
    });
});

describe('createSingleFlightRunner', () => {
    function deferred(): { promise: Promise<void>; resolve: () => void } {
        let resolve!: () => void;
        const promise = new Promise<void>(res => { resolve = res; });
        return { promise, resolve };
    }
    const tick = () => new Promise(resolve => setTimeout(resolve, 5));

    test('starts a run immediately when idle', async () => {
        const run = vi.fn(async () => { });
        createSingleFlightRunner(run)();
        expect(run).toHaveBeenCalledTimes(1);
        await tick();
        expect(run).toHaveBeenCalledTimes(1);
    });

    test('turns calls made during a run into exactly one more run, started after the first settles', async () => {
        const gates = [deferred(), deferred(), deferred()];
        let started = 0;
        let active = 0;
        let maxActive = 0;
        const run = vi.fn(async () => {
            const gate = gates[started++];
            active++;
            maxActive = Math.max(maxActive, active);
            await gate.promise;
            active--;
        });
        const trigger = createSingleFlightRunner(run);

        trigger();
        trigger();
        trigger();
        trigger();
        await tick();
        expect(run).toHaveBeenCalledTimes(1);

        gates[0].resolve();
        await vi.waitFor(() => { expect(run).toHaveBeenCalledTimes(2); });
        gates[1].resolve();
        await tick();
        expect(run).toHaveBeenCalledTimes(2);
        expect(maxActive).toBe(1);

        trigger();
        await vi.waitFor(() => { expect(run).toHaveBeenCalledTimes(3); });
        gates[2].resolve();
    });

    test('never throws to its caller and keeps working after a run rejects or throws', async () => {
        const run = vi.fn<() => Promise<void>>()
            .mockRejectedValueOnce(new Error('first run failed'))
            .mockImplementationOnce(() => { throw new Error('second run threw'); })
            .mockResolvedValue(undefined);
        const trigger = createSingleFlightRunner(run);

        expect(() => trigger()).not.toThrow();
        await tick();
        expect(() => trigger()).not.toThrow();
        await tick();
        trigger();
        await tick();
        expect(run).toHaveBeenCalledTimes(3);
    });

    test('still runs the follow-up when the current run rejects', async () => {
        const gate = deferred();
        const run = vi.fn<() => Promise<void>>()
            .mockImplementationOnce(async () => { await gate.promise; throw new Error('run failed'); })
            .mockResolvedValue(undefined);
        const trigger = createSingleFlightRunner(run);

        trigger();
        trigger();
        gate.resolve();
        await vi.waitFor(() => { expect(run).toHaveBeenCalledTimes(2); });
    });
});

describe('settings migration module source', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'settings-migration.ts'), 'utf-8');

    test('imports neither vscode nor child_process', () => {
        expect(source).not.toMatch(/from\s+['"](vscode|child_process|node:child_process)['"]/);
    });

    test('takes the old key name from the shared constant', () => {
        expect(source).toContain('LEGACY_SPLIT_SINGLE_LINE_IF_KEY');
    });
});
