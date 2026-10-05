import { describe, expect, test, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { closeTabsOnFiles, sameFile, type TabGroupLike, type TabGroupsLike, type TabLike } from '../src/close-file-tabs.js';

function textTab(fsPath: string, isDirty = false, scheme = 'file'): TabLike {
    return { input: { uri: { scheme, fsPath } }, isDirty };
}

/** Plain-object tab groups; a close removes the tabs it was given from their groups. */
function fakeTabGroups(groups: TabGroupLike[], removeEmptyGroups = false) {
    let current = groups.map((group) => ({ ...group, tabs: [...group.tabs] }));
    const close = vi.fn(async (tabs: readonly TabLike[], _preserveFocus?: boolean) => {
        current = current.map((group) => ({ ...group, tabs: group.tabs.filter((tab) => !tabs.includes(tab)) }));
        if (removeEmptyGroups) {
            current = current.filter((group) => group.tabs.length > 0);
        }
        return true;
    });
    const tabGroups: TabGroupsLike = {
        get all() {
            return current;
        },
        close,
    };
    return { tabGroups, close };
}

describe('closeTabsOnFiles', () => {
    test('closes the tab on the file and leaves every other tab alone', async () => {
        const target = textTab('/work/a.bbj');
        const other = textTab('/work/b.bbj');
        const { tabGroups, close } = fakeTabGroups([{ viewColumn: 1, tabs: [other, target] }]);

        await closeTabsOnFiles(tabGroups, ['/work/a.bbj']);

        expect(close).toHaveBeenCalledTimes(1);
        expect(close.mock.calls[0][0]).toEqual([target]);
    });

    test('closes a tab on the file in every group', async () => {
        const first = textTab('/work/a.bbj');
        const second = textTab('/work/a.bbj');
        const { tabGroups, close } = fakeTabGroups([
            { viewColumn: 1, tabs: [first] },
            { viewColumn: 2, tabs: [textTab('/work/b.bbj'), second] },
        ]);

        await closeTabsOnFiles(tabGroups, ['/work/a.bbj']);

        expect(close.mock.calls[0][0]).toEqual([first, second]);
    });

    test('never closes a tab with unsaved changes', async () => {
        const dirty = textTab('/work/a.bbj', true);
        const { tabGroups, close } = fakeTabGroups([{ viewColumn: 1, tabs: [dirty] }]);

        const column = await closeTabsOnFiles(tabGroups, ['/work/a.bbj']);

        expect(close).not.toHaveBeenCalled();
        expect(column).toBeUndefined();
    });

    test('closes a tab on the real path behind a symbolic link as well as the tab on the link', async () => {
        const onLink = textTab('/work/link.bbj');
        const onReal = textTab('/data/real.bbj');
        const { tabGroups, close } = fakeTabGroups([{ viewColumn: 1, tabs: [onLink, onReal, textTab('/data/else.bbj')] }]);

        await closeTabsOnFiles(tabGroups, ['/work/link.bbj', '/data/real.bbj']);

        expect(close.mock.calls[0][0]).toEqual([onLink, onReal]);
    });

    test('skips inputs that carry no file URI: diffs, other schemes and tabs without an input', async () => {
        const diff: TabLike = { input: { original: { fsPath: '/work/a.bbj' }, modified: { fsPath: '/work/a.bbj' } } };
        const remote = textTab('/work/a.bbj', false, 'untitled');
        const bare: TabLike = {};
        const { tabGroups, close } = fakeTabGroups([{ viewColumn: 1, tabs: [diff, remote, bare] }]);

        await closeTabsOnFiles(tabGroups, ['/work/a.bbj']);

        expect(close).not.toHaveBeenCalled();
    });

    test('closes nothing, and asks for no column, when no tab holds the file', async () => {
        const { tabGroups, close } = fakeTabGroups([{ viewColumn: 1, tabs: [textTab('/work/b.bbj')] }]);

        const column = await closeTabsOnFiles(tabGroups, ['/work/a.bbj', undefined]);

        expect(close).not.toHaveBeenCalled();
        expect(column).toBeUndefined();
    });

    test('returns the column of the group that held the file', async () => {
        const { tabGroups } = fakeTabGroups([
            { viewColumn: 1, tabs: [textTab('/work/b.bbj')] },
            { viewColumn: 2, tabs: [textTab('/work/a.bbj'), textTab('/work/c.bbj')] },
        ]);

        expect(await closeTabsOnFiles(tabGroups, ['/work/a.bbj'])).toBe(2);
    });

    test('returns no column when closing the tab removed its group', async () => {
        const { tabGroups } = fakeTabGroups(
            [
                { viewColumn: 1, tabs: [textTab('/work/b.bbj')] },
                { viewColumn: 2, tabs: [textTab('/work/a.bbj')] },
            ],
            true
        );

        expect(await closeTabsOnFiles(tabGroups, ['/work/a.bbj'])).toBeUndefined();
    });

    test('closes without taking focus', async () => {
        const { tabGroups, close } = fakeTabGroups([{ viewColumn: 1, tabs: [textTab('/work/a.bbj')] }]);

        await closeTabsOnFiles(tabGroups, ['/work/a.bbj']);

        expect(close.mock.calls[0][1]).toBe(true);
    });

    test('the comparison is injectable, so a case-insensitive file system can be modelled', async () => {
        const target = textTab('/Work/A.bbj');
        const { tabGroups, close } = fakeTabGroups([{ viewColumn: 1, tabs: [target] }]);

        await closeTabsOnFiles(tabGroups, ['/work/a.bbj'], async (a, b) => a.toLowerCase() === b.toLowerCase());

        expect(close.mock.calls[0][0]).toEqual([target]);
    });
});

describe('sameFile', () => {
    test('equal paths are the same file; unrelated paths are not', async () => {
        expect(await sameFile('/work/a.bbj', '/work/./a.bbj')).toBe(true);
        expect(await sameFile('/work/a.bbj', '/work/b.bbj')).toBe(false);
    });

    test('paths that differ only in letter case are the same file only when they name one file', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'close-file-tabs-test-'));
        try {
            const lower = path.join(dir, 'a.bbj');
            const upper = path.join(dir, 'A.bbj');
            fs.writeFileSync(lower, 'x');
            const caseInsensitive = fs.existsSync(upper);
            if (!caseInsensitive) {
                // A case-sensitive file system: the differently-cased name is no file at all.
                expect(await sameFile(lower, upper)).toBe(false);
                fs.writeFileSync(upper, 'y');
                // And with two real files, it is a different file.
                expect(await sameFile(lower, upper)).toBe(false);
            } else {
                expect(await sameFile(lower, upper)).toBe(true);
            }
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});
