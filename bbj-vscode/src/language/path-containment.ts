/******************************************************************************
 * Copyright 2023 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * The single containment decision for a configured PREFIX root (issues #526, #579): does a
 * candidate path lie inside a root, on path-segment boundaries, rather than a raw string
 * prefix? There is no second hand-rolled `startsWith` containment check anywhere else in the
 * repository — every PREFIX membership decision goes through this module.
 *
 * The check is lexical on the resolved path: symlinks are never followed. A prefix root that is
 * the empty string resolves against the current working directory exactly like a bare
 * `path.resolve('')` would; a caller that must treat an empty/unset PREFIX entry as "no root"
 * has to skip it before calling this module, the same way existing PREFIX consumers already
 * skip empty entries.
 *
 * Kept free of Langium and editor imports (plain Node `path` only), like
 * `config-path-resolver.ts`.
 */
import * as path from 'path';

function flavorFor(platform: NodeJS.Platform): typeof path {
    return platform === 'win32' ? path.win32 : path.posix;
}

/**
 * Does `candidate` lie inside `root`, on path-segment boundaries?
 *
 * Both paths are resolved with the platform's own `resolve` (Windows semantics for
 * `platform === 'win32'`, POSIX semantics otherwise), and compared case-insensitively only on
 * Windows — not on darwin, unlike `config-path-resolver.ts`'s `samePath`. Containment is
 * decided from `path.relative(root, candidate)`: the candidate is inside the root when that
 * relative path is empty, is not absolute, is not exactly `'..'`, and does not start with
 * `'..'` followed by the platform's separator.
 */
export function isPathInside(root: string, candidate: string, platform: NodeJS.Platform = process.platform): boolean {
    const flavor = flavorFor(platform);
    let resolvedRoot = flavor.resolve(root);
    let resolvedCandidate = flavor.resolve(candidate);
    if (platform === 'win32') {
        resolvedRoot = resolvedRoot.toLowerCase();
        resolvedCandidate = resolvedCandidate.toLowerCase();
    }
    const relative = flavor.relative(resolvedRoot, resolvedCandidate);
    if (relative === '') {
        return true;
    }
    if (flavor.isAbsolute(relative)) {
        return false;
    }
    if (relative === '..' || relative.startsWith(`..${flavor.sep}`)) {
        return false;
    }
    return true;
}

/**
 * Resolve `usePath` against each root in `prefixes`, in order, keeping only the resolved
 * candidates that lie inside the prefix root they were resolved against. An absolute `usePath`
 * therefore survives only under a prefix root that already contains it — there is no separate
 * "absolute path" carve-out.
 */
export function containedPrefixCandidates(prefixes: readonly string[], usePath: string, platform: NodeJS.Platform = process.platform): string[] {
    const flavor = flavorFor(platform);
    const candidates: string[] = [];
    for (const prefix of prefixes) {
        const candidate = flavor.resolve(prefix, usePath);
        if (isPathInside(prefix, candidate, platform)) {
            candidates.push(candidate);
        }
    }
    return candidates;
}
