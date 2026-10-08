/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * BBj resolves a relative program path against the working directory first and then each PREFIX
 * directory, never against the program's own directory. The run commands set the working
 * directory to the workspace folder or project root that contains the program, or to the
 * program's own directory when it lies under none. This module is the one place that builds that
 * candidate list, for USE/DECLARE `::path::` references and RUN/CALL targets (#378, #526).
 */
import { URI, UriUtils } from 'langium';
import { containedPrefixCandidates, isPathInside } from './path-containment.js';

/**
 * The working directory the run commands use for `documentUri`: the deepest workspace root that
 * contains it (matched on path segments), or the document's own directory when no root contains
 * it, when there are no roots, or when the document is not a `file:` document.
 */
export function programWorkingDirectory(documentUri: URI, workspaceRoots: readonly URI[]): URI {
    if (documentUri.scheme !== 'file') {
        return UriUtils.dirname(documentUri);
    }
    let deepest: URI | undefined;
    for (const root of workspaceRoots) {
        if (root.scheme !== 'file' || !isPathInside(root.fsPath, documentUri.fsPath)) {
            continue;
        }
        if (!deepest || root.fsPath.length > deepest.fsPath.length) {
            deepest = root;
        }
    }
    return deepest ?? UriUtils.dirname(documentUri);
}

/**
 * Candidate locations for a relative program `path` referenced from `documentUri`: the working
 * directory first, then every PREFIX directory whose resolved candidate stays inside it.
 */
export function programPathCandidates(
    path: string,
    documentUri: URI,
    workspaceRoots: readonly URI[],
    prefixes: readonly string[]
): URI[] {
    return [
        UriUtils.resolvePath(programWorkingDirectory(documentUri, workspaceRoots), path),
        ...containedPrefixCandidates(prefixes, path).map(candidate => URI.file(candidate))
    ];
}

/**
 * The directories a relative program path is resolved against, in order: the working directory,
 * then each non-blank PREFIX directory. Used where the path is still being typed (completion).
 */
export function programPathBaseDirectories(
    documentUri: URI,
    workspaceRoots: readonly URI[],
    prefixes: readonly string[]
): URI[] {
    return [
        programWorkingDirectory(documentUri, workspaceRoots),
        ...prefixes.filter(prefix => prefix.trim().length > 0).map(prefix => URI.file(prefix))
    ];
}
