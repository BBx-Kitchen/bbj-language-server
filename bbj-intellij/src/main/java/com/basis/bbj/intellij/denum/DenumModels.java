package com.basis.bbj.intellij.denum;

import com.google.gson.JsonElement;

/**
 * Gson-serializable data objects carrying the language server's {@code bbj/denum} request params
 * and result. {@code bbj-vscode/src/language/denum-command.ts} is the single source of truth for
 * both shapes; field names here must match its JSON keys exactly.
 *
 * <p>The language server applies the edit itself and shows every outcome, so a client reads none
 * of the result; the members below exist so the answer parses, not so it can be worded.
 */
public final class DenumModels {

    private DenumModels() {}

    /** Params for {@code bbj/denum}: the open document to denumber, identified by URI. */
    public static final class DenumParams {
        public String uri;

        public DenumParams(String uri) {
            this.uri = uri;
        }
    }

    /**
     * Result of a {@code bbj/denum} request. {@code line}, {@code version} and {@code diagnostics}
     * are deliberately not modelled: Gson ignores unknown members.
     */
    public static final class DenumResult {
        public String status;
        public String reason;
        public String message;

        /**
         * The edit the server already applied. Kept as an opaque JSON element and never read: a
         * position number beyond the Java int range must not make the whole answer unparseable.
         */
        public JsonElement edits;

        public Boolean applied;
    }
}
