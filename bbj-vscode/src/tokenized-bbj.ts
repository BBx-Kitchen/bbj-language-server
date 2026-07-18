/******************************************************************************
 * Copyright 2024 TypeFox GmbH
 * This program and the accompanying materials are made available under the
 * terms of the MIT License, which is available in the project root.
 ******************************************************************************/

/**
 * Magic bytes at the start of a tokenized (compiled/binary) BBj program: the
 * ASCII string `<<bbj>>`. Verified against real tokenized programs, e.g.:
 *
 *     $ hexdump _util | head -1
 *     0000000 3c3c 6262 3e6a 843e 0000 ...   (little-endian words)
 *
 * Unswapping the words gives the byte stream `3c 3c 62 62 6a 3e 3e 84 ...`,
 * i.e. `<<bbj>>` followed by a format/version marker byte.
 */
export const TOKENIZED_BBJ_MAGIC = Uint8Array.from([0x3c, 0x3c, 0x62, 0x62, 0x6a, 0x3e, 0x3e]); // "<<bbj>>"

/** Number of leading bytes needed to decide whether a file is tokenized. */
export const TOKENIZED_BBJ_MAGIC_LENGTH = TOKENIZED_BBJ_MAGIC.length;

/**
 * Returns true if the given leading bytes begin with the tokenized-BBj magic.
 * Tokenized programs are binary and cannot be edited as text; callers use this
 * to offer decompilation instead.
 *
 * @param bytes the first bytes of a file (at least {@link TOKENIZED_BBJ_MAGIC_LENGTH})
 */
export function isTokenizedBBjHeader(bytes: Uint8Array): boolean {
    if (bytes.length < TOKENIZED_BBJ_MAGIC.length) {
        return false;
    }
    for (let i = 0; i < TOKENIZED_BBJ_MAGIC.length; i++) {
        if (bytes[i] !== TOKENIZED_BBJ_MAGIC[i]) {
            return false;
        }
    }
    return true;
}
