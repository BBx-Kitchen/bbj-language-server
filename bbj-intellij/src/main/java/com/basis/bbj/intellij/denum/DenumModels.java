package com.basis.bbj.intellij.denum;

import com.google.gson.JsonElement;

import java.util.List;

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

    /**
     * Payload of the {@code bbj/denumDiagnostics} notification. {@code
     * bbj-vscode/src/language/denum-notifications.ts} is the single source of truth; field names
     * here must match its JSON keys exactly. The payload crosses a process boundary, so a reader
     * must treat every member, including the list and its entries, as possibly absent.
     */
    public static final class DenumDiagnosticsParams {
        public String uri;
        public List<DenumDiagnostic> diagnostics;
    }

    /**
     * One diagnostic of a {@link DenumDiagnosticsParams} list. {@code line} is boxed and 64-bit:
     * a missing value stays distinguishable from {@code 0} (which means "no location"), and no
     * number a JavaScript peer can send is out of range, so one odd entry never rejects the whole
     * notification.
     */
    public static final class DenumDiagnostic {
        public Long line;
        public String originalLineNumber;
        public String severity;
        public String message;
    }
}
