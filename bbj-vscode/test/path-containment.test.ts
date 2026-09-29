import { EmptyFileSystem, URI } from 'langium';
import { describe, expect, test } from 'vitest';
import { containedPrefixCandidates, isPathInside } from '../src/language/path-containment.js';
import { createBBjTestServices } from './bbj-test-module.js';
import { BBjWorkspaceManager } from '../src/language/bbj-ws-manager.js';

/**
 * Direct unit coverage for the single PREFIX-containment predicate (issues #526, #579). See
 * `use-path-containment.test.ts` for coverage of the callers that consume it.
 */
describe('isPathInside', () => {
    test('a file directly under the root is inside it', () => {
        expect(isPathInside('/libs/foo', '/libs/foo/x.bbj')).toBe(true);
    });

    test('a path under /libs/foo2/ is not inside the prefix /libs/foo', () => {
        expect(isPathInside('/libs/foo', '/libs/foo2/x.bbj')).toBe(false);
    });

    test('the root itself is inside the root', () => {
        expect(isPathInside('/libs/foo', '/libs/foo')).toBe(true);
    });

    test('a root with a trailing separator still contains the root path', () => {
        expect(isPathInside('/libs/foo/', '/libs/foo')).toBe(true);
    });

    test('a relative .. segment that escapes the root is outside', () => {
        expect(isPathInside('/libs/foo', '/libs/foo/../bar/x.bbj')).toBe(false);
    });

    test('an unrelated absolute path is outside', () => {
        expect(isPathInside('/libs/foo', '/etc/passwd')).toBe(false);
    });

    test('a name starting with two dots is not a parent-directory step', () => {
        expect(isPathInside('/libs/foo', '/libs/foo/..x/y.bbj')).toBe(true);
    });

    test('win32: containment is case-insensitive', () => {
        expect(isPathInside('C:\\Libs\\Foo', 'c:\\libs\\foo\\x.bbj', 'win32')).toBe(true);
    });

    test('win32: a sibling directory sharing a name prefix is outside', () => {
        expect(isPathInside('C:\\libs\\foo', 'C:\\libs\\foo2\\x.bbj', 'win32')).toBe(false);
    });

    test('win32: a different drive letter is outside', () => {
        expect(isPathInside('C:\\libs', 'D:\\libs\\x.bbj', 'win32')).toBe(false);
    });
});

describe('containedPrefixCandidates', () => {
    test('a relative escape yields no candidate from any prefix', () => {
        expect(containedPrefixCandidates(['/v/lib', '/v/other'], '../secret/X.bbj')).toEqual([]);
    });

    test('an in-root relative path resolves under the single prefix', () => {
        expect(containedPrefixCandidates(['/v/lib'], 'Used.bbj')).toEqual(['/v/lib/Used.bbj']);
    });

    test('an absolute path inside the prefix survives', () => {
        expect(containedPrefixCandidates(['/v/lib'], '/v/lib/Abs.bbj')).toEqual(['/v/lib/Abs.bbj']);
    });

    test('an absolute path outside every prefix yields no candidate', () => {
        expect(containedPrefixCandidates(['/v/lib'], '/v/secret/A.bbj')).toEqual([]);
    });

    test('an empty-string prefix (the default, no-PREFIX-configured shape) yields no candidate', () => {
        expect(containedPrefixCandidates([''], 'X.bbj')).toEqual([]);
    });

    test('a whitespace-only prefix yields no candidate', () => {
        expect(containedPrefixCandidates(['   '], 'X.bbj')).toEqual([]);
    });

    test('an empty prefix alongside a real one still yields the real one\'s candidate', () => {
        expect(containedPrefixCandidates(['', '/v/lib'], 'Used.bbj')).toEqual(['/v/lib/Used.bbj']);
    });
});

describe('isExternalDocument decides PREFIX membership on path segments (issue #579)', () => {
    function wsManagerWithPrefixes(prefixes: string[]): BBjWorkspaceManager {
        const services = createBBjTestServices(EmptyFileSystem);
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        (wsManager as unknown as { settings: { prefixes: string[]; classpath: string[] } }).settings =
            { prefixes, classpath: [] };
        return wsManager;
    }

    test('a document under /libs/foo2/ is not treated as inside the prefix /libs/foo', () => {
        const wsManager = wsManagerWithPrefixes(['/libs/foo']);
        expect(wsManager.isExternalDocument(URI.file('/libs/foo2/x.bbj'))).toBe(false);
    });

    test('a document directly under the prefix is external', () => {
        const wsManager = wsManagerWithPrefixes(['/libs/foo']);
        expect(wsManager.isExternalDocument(URI.file('/libs/foo/x.bbj'))).toBe(true);
    });

    test('the prefix directory itself is external', () => {
        const wsManager = wsManagerWithPrefixes(['/libs/foo']);
        expect(wsManager.isExternalDocument(URI.file('/libs/foo'))).toBe(true);
    });

    test('a prefix with a trailing separator still marks its contents external, and a sibling is not', () => {
        const wsManager = wsManagerWithPrefixes(['/libs/foo/']);
        expect(wsManager.isExternalDocument(URI.file('/libs/foo/x.bbj'))).toBe(true);
        expect(wsManager.isExternalDocument(URI.file('/libs/foo2/x.bbj'))).toBe(false);
    });

    test('an empty prefix is skipped, not treated as a root that contains everything', () => {
        const wsManager = wsManagerWithPrefixes(['']);
        expect(wsManager.isExternalDocument(URI.file('/libs/foo/x.bbj'))).toBe(false);
    });

    test('an empty prefix alongside a real one does not prevent the real one from matching', () => {
        const wsManager = wsManagerWithPrefixes(['', '/libs/foo']);
        expect(wsManager.isExternalDocument(URI.file('/libs/foo/x.bbj'))).toBe(true);
    });

    test('nothing is external when settings were never initialized', () => {
        const services = createBBjTestServices(EmptyFileSystem);
        const wsManager = services.shared.workspace.WorkspaceManager as BBjWorkspaceManager;
        expect(wsManager.isExternalDocument(URI.file('/libs/foo/x.bbj'))).toBe(false);
    });
});
