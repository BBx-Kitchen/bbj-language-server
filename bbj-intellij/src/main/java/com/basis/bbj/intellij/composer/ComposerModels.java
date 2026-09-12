package com.basis.bbj.intellij.composer;

import com.google.gson.annotations.SerializedName;

import java.util.List;

/**
 * Gson-serializable data objects carrying the language server's {@code bbj/composer/*} request
 * params and results relevant to the IntelliJ dialogs (see
 * {@code bbj-vscode/src/language/composer-commands.ts}). The BBj-side TypeScript is the single
 * source of truth for the flag/hex arithmetic (#433); these classes only carry the JSON across
 * LSP4IJ. Field names must match the JSON keys exactly.
 *
 * Note: two TypeScript-side optional fields are intentionally not mirrored here —
 * {@code MsgboxPreview.exprText} and msgbox {@code CatalogItem.constant} — since neither is
 * currently consumed by either IDE's UI; Gson silently drops them on deserialization.
 *
 * Note: flag/event-mask bit values can set the 32-bit sign bit ({@code $80000000$} = 2147483648),
 * which overflows a Java {@code int}, so every raw bit value is a {@code long}.
 */
public final class ComposerModels {
    private ComposerModels() {}

    /** One selectable option: a bit/number value, a label, and (addWindow only) a UI group. */
    public static final class CatalogItem {
        public long value;
        public String label;
        public String group;
        public String detail;
    }

    public static final class MsgboxCatalogs {
        public List<CatalogItem> buttonSets;
        public List<CatalogItem> icons;
        public List<CatalogItem> defaultButtons;
        public List<CatalogItem> flags;
    }

    public static final class AddWindowCatalogs {
        public List<CatalogItem> flags;
        public List<CatalogItem> eventBits;
    }

    /** Result of {@code bbj/composer/catalogs}. */
    public static final class ComposerCatalogs {
        public MsgboxCatalogs msgbox;
        public AddWindowCatalogs addwindow;
        /** Child-window flag catalog (#473) — same {flags, eventBits} shape as addwindow. */
        public AddWindowCatalogs addchildwindow;
        /** SETOPTS byte/bit catalog (#633). */
        public SetoptsCatalogs setopts;
    }

    // ---- MSGBOX ----------------------------------------------------------------------------------

    public static final class MsgboxPreviewInput {
        public String message = "";
        public String title = "";
        public String assignTo;
        public int buttonSet;
        public int icon;
        public int defaultButton;
        public List<Long> flags;
        public List<String> customButtons;
        public List<String> trailingArgs;
        public Boolean editMode;
        public Boolean useConstants;
    }

    /** Param wrapper: the handler expects {@code { "input": ... }}. */
    public static final class MsgboxPreviewParams {
        public MsgboxPreviewInput input;
        public MsgboxPreviewParams(MsgboxPreviewInput input) { this.input = input; }
    }

    public static final class MsgboxRender {
        public String title;
        public String message;
        public int icon;
        public List<String> buttons;
        public int defaultIndex;
    }

    public static final class MsgboxPreview {
        public int expr;
        public String statement;
        public String summary;
        public String messageError;
        public String titleError;
        public String customError;
        public boolean valid;
        public MsgboxRender render;
    }

    // ---- addWindow -------------------------------------------------------------------------------

    public static final class AddWindowPreviewInput {
        public List<Long> flags;
        public boolean eventMaskEnabled;
        public List<Long> eventMask;
        public String receiver;
        public String sysgui = "sysgui!";
        public String x = "10";
        public String y = "10";
        public String width = "400";
        public String height = "300";
        public String title = "\"Window\"";
        public Boolean editMode;
        public Long preservedFlagBits;
        public Long preservedEventBits;
    }

    public static final class AddWindowPreviewParams {
        public AddWindowPreviewInput input;
        public AddWindowPreviewParams(AddWindowPreviewInput input) { this.input = input; }
    }

    public static final class WindowRender {
        public boolean titleBar;
        public boolean closeBox;
        public boolean minMax;
        public boolean menuBar;
        public boolean hScroll;
        public boolean vScroll;
        public boolean border;
        public boolean resizable;
        public boolean disabled;
        public boolean invisible;
        public boolean minimized;
        public boolean maximized;
        public List<String> badges;
        public String title;
    }

    public static final class AddWindowPreview {
        public long flags;
        public Long eventMask;
        public String flagsHex;
        public String eventHex;
        public String statement;
        public String flagsSummary;
        public String eventSummary;
        public WindowRender render;
    }

    // ---- addChildWindow (#473) -------------------------------------------------------------------

    public static final class AddChildWindowPreviewInput {
        public List<Long> flags;
        public boolean eventMaskEnabled;
        public List<Long> eventMask;
        public String receiver;
        /** The parent BBjWindow expression the method is called on. */
        public String window = "window!";
        public String id = "101";
        public String context = "sysgui!.getAvailableContext()";
        public String x = "10";
        public String y = "10";
        public String width = "200";
        public String height = "150";
        public String title = "\"Child\"";
        public Boolean editMode;
        public Long preservedFlagBits;
        public Long preservedEventBits;
    }

    public static final class AddChildWindowPreviewParams {
        public AddChildWindowPreviewInput input;
        public AddChildWindowPreviewParams(AddChildWindowPreviewInput input) { this.input = input; }
    }

    /** Schematic descriptor of a child window inside its parent frame. */
    public static final class ChildWindowRender {
        public boolean borderless;
        public boolean recessed;
        public boolean raised;
        public boolean fieldset;
        public boolean hScroll;
        public boolean vScroll;
        public boolean invisible;
        public boolean disabled;
        public boolean docked;
        public List<String> badges;
        public String title;
    }

    public static final class AddChildWindowPreview {
        public long flags;
        public Long eventMask;
        public String flagsHex;
        public String eventHex;
        public String statement;
        public String flagsSummary;
        public String eventSummary;
        public ChildWindowRender render;
    }

    /**
     * Result of {@code bbj/composer/addchildwindow/decodeCall}; the edit/initial payloads share the
     * addWindow shapes (same JSON keys), so those DTOs are reused.
     */
    public static final class AddChildWindowDecodeResult {
        public boolean found;
        public AddWindowEdit edit;
        public AddWindowInitial initial;
    }

    // ---- decodeCall (edit-in-place) --------------------------------------------------------------

    /** Params for the {@code decodeCall} requests: a source line and the caret column within it. */
    public static final class DecodeCallParams {
        public String line;
        public Integer character;
        public DecodeCallParams(String line, int character) { this.line = line; this.character = character; }
    }

    /** The MSGBOX call span (line-relative) to replace when reconfiguring in place. */
    public static final class MsgboxEdit {
        public int callStart;
        public int callEnd;
    }

    /** Result of {@code bbj/composer/msgbox/decodeCall}; {@code found=false} when none at the caret. */
    public static final class MsgboxDecodeResult {
        public boolean found;
        public MsgboxEdit edit;
        public List<String> trailingArgs;
        public MsgboxPreviewInput initial;
    }

    /** addWindow token ranges / insert offsets (line-relative) to rewrite in place. */
    public static final class AddWindowEdit {
        public int[] flagsRange;
        public Integer flagsInsertOffset;
        public int[] eventMaskRange;
        public Integer eventMaskInsertOffset;
        public long preservedFlagBits;
        public long preservedEventBits;
    }

    public static final class AddWindowInitial {
        public List<Long> flags;
        public boolean eventMaskEnabled;
        public List<Long> eventMask;
        public String title;
    }

    /** Result of {@code bbj/composer/addwindow/decodeCall}; {@code found=false} when none at the caret. */
    public static final class AddWindowDecodeResult {
        public boolean found;
        public AddWindowEdit edit;
        public AddWindowInitial initial;
    }

    // ---- SETOPTS (#633) ----------------------------------------------------------------------------

    /**
     * One documented option bit (`SETOPTS_BITS` entry). {@code byte} is a Java reserved word, so
     * {@code @SerializedName("byte")} keeps the wire key identical to the TypeScript shape.
     * {@code bbj} carries {@code "ignored"}, {@code "bbj-specific"} or null; the dialog reads it to
     * de-emphasize PRO/5-only or BBj-specific bits (D-08).
     */
    public static final class SetoptsBit {
        @SerializedName("byte") public int byteNo;
        public long mask;
        public String label;
        public String detail;
        public String bbj;
        public String bbjDetail;
        public String since;
    }

    /** One byte-group section heading, in catalog order (D-07). */
    public static final class SetoptsByteGroup {
        @SerializedName("byte") public int byteNo;
        public String label;
    }

    /** SETOPTS field of {@code bbj/composer/catalogs} — the full bit catalog plus the section headings. */
    public static final class SetoptsCatalogs {
        public List<SetoptsBit> bits;
        public List<SetoptsByteGroup> byteGroups;
    }

    /**
     * One catalog bit currently checked in the selection. {@code byte} is a Java reserved word, so
     * {@code @SerializedName("byte")} is what keeps the wire key identical to the TypeScript shape
     * ({@code bbj-vscode/src/setopts-catalog.ts}'s {@code SetOptsSelection.bits}).
     */
    public static final class SetoptsSelectionBit {
        @SerializedName("byte") public int byteNo;
        public long mask;

        public SetoptsSelectionBit() {}

        public SetoptsSelectionBit(int byteNo, long mask) {
            this.byteNo = byteNo;
            this.mask = mask;
        }
    }

    /**
     * Flat UI selection: checked catalog bits plus the data-byte fields. Reused both as the preview
     * request's {@code selection} and as the decode result's {@code initial} payload — the same JSON
     * shape on both sides, mirroring how {@link AddChildWindowDecodeResult} reuses
     * {@link AddWindowEdit}/{@link AddWindowInitial}.
     */
    public static final class SetoptsSelection {
        public List<SetoptsSelectionBit> bits;
        public String maskComma = "";
        public String maskDot = "";
        public String rawTail = "";
    }

    /**
     * The edit target for an existing SETOPTS line: the hex token range to replace, or the insert
     * offset for a bare {@code SETOPTS} keyword. Offsets stay plain {@code int} — they are bounded
     * positions inside one config.bbx line, never LSP {@code Position.character} values, so no
     * {@code END_OF_LINE_CHARACTER} sentinel applies here.
     */
    public static final class SetoptsEdit {
        public int[] hexRange;
        public Integer insertOffset;
        public String hexDigits;
    }

    /** Result of {@code bbj/composer/setopts/decodeCall}; {@code found=false} when the line cannot be round-tripped. */
    public static final class SetoptsDecodeResult {
        public boolean found;
        public SetoptsEdit edit;
        public SetoptsSelection initial;
    }

    /**
     * Params for {@code bbj/composer/setopts/decodeCall}: a single config.bbx line, no caret column
     * — the trigger is line-scoped (D-03, D-06 Option B), so a caret column would be unused surface
     * the boundary test would then have to carry for no behavioural reason.
     */
    public static final class SetoptsDecodeCallParams {
        public String line;

        public SetoptsDecodeCallParams(String line) {
            this.line = line;
        }
    }

    /** A non-catalog bit present in the vector, so the UI can flag what it preserves untouched. */
    public static final class SetoptsUnknownBits {
        @SerializedName("byte") public int byteNo;
        public long mask;
    }

    /** Result of {@code bbj/composer/setopts/preview} — the full recomputed line for one selection. */
    public static final class SetoptsPreview {
        public String hexDigits;
        public String line;
        public String summary;
        public boolean maskInputsEnabled;
        public List<SetoptsUnknownBits> unknownByBytes;
    }

    /**
     * Params for {@code bbj/composer/setopts/preview}. {@code original} is null in compose-new mode.
     * The vector crosses as a hex {@code String}, never a number, which is what keeps the whole
     * 32-bit-sign-bit overflow class (G-81-4) out of this DTO family.
     */
    public static final class SetoptsPreviewParams {
        public String original;
        public SetoptsSelection selection;

        public SetoptsPreviewParams(String original, SetoptsSelection selection) {
            this.original = original;
            this.selection = selection;
        }
    }

    // ---- SETOPTS-in-code (#475, DISC-06, plan 88-04) -----------------------------------------------

    /**
     * Params for {@code bbj/composer/setopts/decodeInCode}: a document URI plus a zero-based LSP
     * position, mirroring {@code SetOptsInCodeDecodeParams} in
     * {@code bbj-vscode/src/language/setopts-in-code-request.ts} exactly.
     */
    public static final class SetoptsInCodeDecodeParams {
        public String uri;
        public int line;
        public int character;

        public SetoptsInCodeDecodeParams() {}

        public SetoptsInCodeDecodeParams(String uri, int line, int character) {
            this.uri = uri;
            this.line = line;
            this.character = character;
        }
    }

    /** The edit target for an absolute {@code SETOPTS <literal>} statement. */
    public static final class SetoptsInCodeAbsoluteEdit {
        public int line;
        public int[] hexRange;
        public String hexDigits;
    }

    /** The edit target for a safe {@code var$=OPTS … SETOPTS var$} chain. */
    public static final class SetoptsInCodeChainEdit {
        public String variableName;
        public int startLine;
        public int endLine;
        public String indent;
    }

    /**
     * One catalog bit's Set/Clear/Leave state in the BBj-code tri-state composer (D-01). {@code byte}
     * is a Java reserved word, so the annotation below keeps the wire key identical to the
     * TypeScript shape ({@code SetOptsTriStateEntry} in {@code setopts-catalog.ts}). {@code state} is
     * kept as a plain wire string ({@code "set"}/{@code "clear"}/{@code "leave"}), never a Java enum,
     * so a value the server adds later parses rather than throws at the boundary.
     */
    public static final class SetoptsTriStateEntry {
        @SerializedName("byte") public int byteNo;
        public long mask;
        public String state;

        public SetoptsTriStateEntry() {}

        public SetoptsTriStateEntry(int byteNo, long mask, String state) {
            this.byteNo = byteNo;
            this.mask = mask;
            this.state = state;
        }
    }

    /** A full tri-state selection: one {@link SetoptsTriStateEntry} per catalog bit the client cares about. */
    public static final class SetoptsTriStateSelection {
        public List<SetoptsTriStateEntry> entries;
    }

    /** Result of {@code bbj/composer/setopts/decodeInCode}; {@code found=false} when no shape is at the caret. */
    public static final class SetoptsInCodeDecodeResult {
        public boolean found;
        public boolean editable;
        public String mode;
        public String reason;
        public String summary;
        public SetoptsInCodeAbsoluteEdit absolute;
        public SetoptsInCodeChainEdit chain;
        public SetoptsTriStateSelection initial;
    }

    /**
     * Params for {@code bbj/composer/setopts/composeTriState} — mirrors {@code composeSetOptsBlock}'s
     * own input shape exactly ({@code ComposeSetOptsBlockInput} in {@code setopts-catalog.ts}).
     */
    public static final class SetoptsComposeTriStateParams {
        public SetoptsTriStateSelection selection;
        public String variable;
        public String indent;
        public String scope;

        public SetoptsComposeTriStateParams(SetoptsTriStateSelection selection, String variable, String indent, String scope) {
            this.selection = selection;
            this.variable = variable;
            this.indent = indent;
            this.scope = scope;
        }
    }

    /** Result of {@code bbj/composer/setopts/composeTriState} — the composed block's text and lines. */
    public static final class SetoptsComposeTriStateResult {
        public String text;
        public List<String> lines;
    }

    // ---- Composer cue (#650) ------------------------------------------------------------------

    /**
     * Mirrors the command argument a composer cue's LSP {@code Command} carries
     * ({@code ComposerLensTarget} in {@code bbj-vscode/src/composer-lens-contract.ts} exactly):
     * which composer, on which document, at which position. {@code kind} is kept as a plain wire
     * string, never a Java enum, so a kind the server adds later parses rather than throws at the
     * boundary — {@link ComposerLensKinds#launcherKindOf(String)} is what decides whether this
     * plugin currently handles it.
     */
    public static final class ComposerLensTarget {
        public String kind;
        public String uri;
        public int line;
        public int character;

        public ComposerLensTarget() {}
    }
}
