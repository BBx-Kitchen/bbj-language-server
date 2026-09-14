/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

import { CstNode, FileSystemProvider, LangiumDocuments, URI, UriUtils } from 'langium';
import { resolve } from 'path';
import type { BBjWorkspaceManager } from './bbj-ws-manager.js';
import { CallStatement, RunStatement, StringLiteral, isCallStatement, isRunStatement, isStringLiteral } from './generated/ast.js';

/**
 * Shared RUN/CALL static-target extraction and resolution. `RUN "file"` and `CALL "file"`
 * (optionally `CALL "file::label"`) take a program file name that is absolute, resolves
 * through a PREFIX, or sits relative to the current file. This module is the single place
 * that walks the candidate list — the unresolved-file warning (issue #173), hover, and
 * go-to-definition (issue #663) all call into it so the resolution rules exist once.
 */

/** A RUN/CALL statement whose `fileid` is a static string literal naming a program file. */
export interface RunCallTarget {
    statement: RunStatement | CallStatement;
    literal: StringLiteral;
    /** The program part of the literal as written, `::label` stripped and trimmed. */
    path: string;
}

/**
 * Extracts the static target from a RUN/CALL statement, or undefined when the `fileid` is
 * not a plain double-quoted string literal (a HEX_STRING, a variable, or a concatenation),
 * or when the program part is empty after stripping an optional `::label` suffix.
 */
export function getStaticRunCallTarget(statement: RunStatement | CallStatement): RunCallTarget | undefined {
    const fileid = statement.fileid;
    // Only static string literals carry a knowable path; skip variables/concatenations.
    if (!isStringLiteral(fileid)) return undefined;
    // StringLiteral.value also covers HEX_STRING (`$0A$`); those are byte sequences, not paths.
    if (!fileid.$cstNode?.text?.startsWith('"')) return undefined;

    // BBj accepts a `program::label` entry point in CALL; only the program part is a file path.
    let path = fileid.value;
    const labelIndex = path.indexOf('::');
    if (labelIndex >= 0) {
        path = path.substring(0, labelIndex);
    }
    path = path.trim();
    if (path.length === 0) return undefined;

    return { statement, literal: fileid, path };
}

/**
 * Resolves the RUN/CALL target that a CST leaf sits inside of, for hover and go-to-definition.
 * Returns undefined for a leaf that is not the `fileid` literal itself — in particular the
 * second (argument) literal of `CALL "prog.bbj", "x.bbj"` is also a direct StringLiteral child
 * of the CallStatement, so the `$containerProperty` check is required.
 */
export function findRunCallTargetAtLeaf(leaf: CstNode | undefined): RunCallTarget | undefined {
    const literal = leaf?.astNode;
    if (!isStringLiteral(literal)) return undefined;
    const container = literal.$container;
    if (!(isRunStatement(container) || isCallStatement(container))) return undefined;
    if (literal.$containerProperty !== 'fileid') return undefined;
    return getStaticRunCallTarget(container);
}

/** The services `resolveRunCallPath` and `hasRunCallProjectContext` need to probe candidates. */
export interface RunCallResolutionContext {
    langiumDocuments: LangiumDocuments;
    fileSystemProvider: FileSystemProvider;
    workspaceManager: BBjWorkspaceManager;
}

/**
 * `parseSettings` yields a single empty-string prefix when none is configured; drop those so
 * they neither gate the check nor resolve against the process working directory.
 */
function nonEmptyPrefixes(context: RunCallResolutionContext): string[] {
    return (context.workspaceManager.getSettings()?.prefixes ?? []).filter(prefix => prefix.length > 0);
}

/**
 * Without any project context there is nothing authoritative to resolve a bare filename
 * against, so callers skip rather than guess for a stand-alone file with no workspace folder
 * and no PREFIX.
 */
export function hasRunCallProjectContext(context: RunCallResolutionContext): boolean {
    return context.workspaceManager.getWorkspaceFolderUris().length > 0 || nonEmptyPrefixes(context).length > 0;
}

// One ASCII letter, a colon, then a slash or backslash: `C:/progs/x.bbj` or `C:\progs\x.bbj`.
const DRIVE_LETTER_PATH = /^[a-zA-Z]:[\\/]/;

/**
 * Resolves `path` (as written in a RUN/CALL literal) to the first candidate URI that is
 * either an already-indexed workspace document or exists on disk. Candidate order:
 * 1. relative to the directory of the current document
 * 2. relative to each workspace root
 * 3. relative to each non-empty PREFIX directory
 * An absolute Windows path (drive letter) resolves to itself instead — a POSIX absolute path
 * already resolves as itself through `UriUtils.resolvePath` in step 1, so it needs no branch.
 * This resolver never looks at type-resolution-warnings or project-context gating; that
 * decision stays with each caller (the validator gates on it, hover and go-to-definition do not).
 */
export function resolveRunCallPath(path: string, currentDocUri: URI, context: RunCallResolutionContext): URI | undefined {
    let candidateUris: URI[];
    if (DRIVE_LETTER_PATH.test(path)) {
        candidateUris = [URI.file(path.replace(/\\/g, '/'))];
    } else {
        const workspaceRoots = context.workspaceManager.getWorkspaceFolderUris();
        const prefixes = nonEmptyPrefixes(context);
        candidateUris = [
            UriUtils.resolvePath(UriUtils.dirname(currentDocUri), path)
        ]
            .concat(workspaceRoots.map(root => UriUtils.resolvePath(root, path)))
            .concat(prefixes.map(prefixPath => URI.file(resolve(prefixPath, path))));
    }

    return candidateUris.find(uri =>
        context.langiumDocuments.hasDocument(uri) || context.fileSystemProvider.existsSync(uri)
    );
}

/**
 * One backtick fence longer than the longest run of backticks inside `text`, padded with one
 * space on each side only when `text` starts or ends with a backtick. Keeps a path taken from
 * source text from escaping a markdown code span or injecting markdown/links.
 */
function codeSpan(text: string): string {
    const backtickRuns = text.match(/`+/g) ?? [];
    const longestRun = backtickRuns.reduce((max, run) => Math.max(max, run.length), 0);
    const fence = '`'.repeat(longestRun + 1);
    const pad = (text.startsWith('`') || text.endsWith('`')) ? ' ' : '';
    return `${fence}${pad}${text}${pad}${fence}`;
}

/** Hover markdown for a RUN/CALL file literal: the resolved path, or an unresolved notice. */
export function runCallHoverMarkdown(path: string, resolved: URI | undefined): string {
    if (resolved) {
        return `Program file: ${codeSpan(resolved.fsPath)}`;
    }
    return `Program file ${codeSpan(path)} could not be resolved`;
}
