package com.basis.bbj.intellij.denum;

import com.google.gson.JsonElement;
import com.google.gson.TypeAdapter;
import com.google.gson.annotations.JsonAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonToken;
import com.google.gson.stream.JsonWriter;

import java.io.IOException;
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

        /**
         * The document version the list was computed for; absent when the server could not
         * confirm it. IntelliJ only logs the list, so the value is carried for the contract and
         * not acted on. A value that is not a whole number reads as absent rather than rejecting
         * the notification.
         */
        @JsonAdapter(LenientLongAdapter.class)
        public Long version;

        public List<DenumDiagnostic> diagnostics;
    }

    /**
     * Reads a whole number, and reads anything else (a fraction, a boolean, an object, text that
     * is not a number) as {@code null}, so one odd optional member never rejects the notification
     * it travels in.
     */
    static final class LenientLongAdapter extends TypeAdapter<Long> {
        @Override
        public void write(JsonWriter out, Long value) throws IOException {
            out.value(value);
        }

        @Override
        public Long read(JsonReader in) throws IOException {
            JsonToken token = in.peek();
            if (token == JsonToken.NULL) {
                in.nextNull();
                return null;
            }
            if (token == JsonToken.NUMBER || token == JsonToken.STRING) {
                try {
                    return Long.valueOf(in.nextString().trim());
                } catch (NumberFormatException e) {
                    return null;
                }
            }
            in.skipValue();
            return null;
        }
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
