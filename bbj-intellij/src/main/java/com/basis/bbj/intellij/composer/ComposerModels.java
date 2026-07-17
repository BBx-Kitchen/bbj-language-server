package com.basis.bbj.intellij.composer;

import java.util.List;

/**
 * Gson-serializable data objects mirroring the language server's {@code bbj/composer/*} request
 * params and results (see {@code bbj-vscode/src/language/composer-commands.ts}). The BBj-side
 * TypeScript is the single source of truth for the flag/hex arithmetic (#433); these classes only
 * carry the JSON across LSP4IJ. Field names must match the JSON keys exactly.
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
}
