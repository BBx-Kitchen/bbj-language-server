package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.SetoptsBit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsByteGroup;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsPreview;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsPreviewParams;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsSelection;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsSelectionBit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsUnknownBits;
import com.basis.bbj.intellij.concurrency.AlarmScheduler;
import com.basis.bbj.intellij.concurrency.PreviewDebouncer;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.DialogWrapper;
import com.intellij.ui.components.JBCheckBox;
import com.intellij.ui.components.JBLabel;
import com.intellij.ui.components.JBScrollPane;
import com.intellij.ui.components.JBTextField;
import com.intellij.util.ui.JBUI;
import com.intellij.util.ui.UIUtil;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JComponent;
import javax.swing.JPanel;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import java.awt.Color;
import java.awt.GridLayout;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

/**
 * Swing composer for a config.bbx {@code SETOPTS <hex>} line (#633): one scrollable panel of
 * catalog checkboxes grouped by option byte, the two mask-replacement character fields, the raw-hex
 * tail field, and a live debounced preview of the resulting hex string and summary (D-07/D-08/D-09).
 * The dialog owns no SETOPTS arithmetic itself — every value it shows comes from
 * {@code bbj/composer/setopts/preview}. Edit-in-place and compose-new both flow through this same
 * constructor; the caller (plan 03's launcher) decides which line, if any, was decoded.
 */
public final class SetoptsComposerDialog extends DialogWrapper {

    private static final long PREVIEW_DEBOUNCE_MS = 300L;

    private final Project project;
    private final BbjComposerServer server;
    private final SetoptsCatalogs catalogs;
    @Nullable
    private final String originalHex;
    private final boolean editMode;
    private final AtomicInteger seq = new AtomicInteger();
    private final ComposerFlow flow;
    private final Consumer<ComposerNotices.Notice> balloonOnce;
    private final PreviewDebouncer previewDebouncer;

    private final List<CheckboxRow> checkboxRows = new ArrayList<>();

    private final JBTextField resultingLine = new JBTextField();
    private final JBLabel summary = new JBLabel();
    private final JBLabel preservedLabel = new JBLabel();

    private final JBTextField maskCommaField = new JBTextField();
    private final JBTextField maskDotField = new JBTextField();
    private final JBTextField rawTailField = new JBTextField();
    private final JBLabel rawTailError = ComposerSwingHelpers.errorLabel();
    private Color summaryDefaultForeground;

    private volatile String hexDigits = "";
    private volatile String line = "";

    public SetoptsComposerDialog(@NotNull Project project, @NotNull BbjComposerServer server,
            @NotNull SetoptsCatalogs catalogs, @Nullable SetoptsSelection initial,
            @Nullable String originalHex, boolean editMode) {
        super(project);
        this.project = project;
        this.server = server;
        this.catalogs = catalogs;
        this.originalHex = originalHex;
        this.editMode = editMode;
        this.balloonOnce = ComposerFlow.once(notice -> ComposerNoticeRenderer.render(project, notice, null));
        this.flow = new ComposerFlow(
                runnable -> ApplicationManager.getApplication().invokeLater(runnable, ModalityState.any()),
                balloonOnce,
                ComposerFlow.REFRESH_TIMEOUT_MILLIS);
        this.previewDebouncer = new PreviewDebouncer(
                new AlarmScheduler(getDisposable()),
                PREVIEW_DEBOUNCE_MS,
                runnable -> ApplicationManager.getApplication().invokeLater(runnable, ModalityState.any()),
                this::refresh);
        setTitle(editMode ? "Configure SETOPTS" : "Compose SETOPTS");
        setOKButtonText(editMode ? "Apply" : "Insert");
        init();
        // Disable OK until the first preview round-trip resolves (#538): otherwise a fast/keyboard
        // accept landing before any preview arrives would keep OK enabled while apply() has never
        // run. Re-enabled by apply() on a successful preview.
        setOKActionEnabled(false);
        if (initial != null) {
            prefill(initial);
        }
        refresh();
    }

    @Override
    protected @Nullable JComponent createCenterPanel() {
        JPanel root = new JPanel();
        root.setLayout(new BoxLayout(root, BoxLayout.Y_AXIS));

        // Preview region — outside the scroll pane so it is always visible (D-07).
        resultingLine.setEditable(false);
        root.add(ComposerSwingHelpers.labeled("Resulting line", resultingLine));
        summary.setComponentStyle(UIUtil.ComponentStyle.SMALL);
        summaryDefaultForeground = summary.getForeground();
        root.add(summary);
        preservedLabel.setComponentStyle(UIUtil.ComponentStyle.SMALL);
        root.add(preservedLabel);
        root.add(Box.createVerticalStrut(JBUI.scale(8)));

        // Form region — one scrollable panel, no tabs (D-07).
        JPanel form = new JPanel();
        form.setLayout(new BoxLayout(form, BoxLayout.Y_AXIS));

        for (SetoptsByteGroup group : catalogs.byteGroups) {
            JPanel groupPanel = new JPanel();
            groupPanel.setLayout(new BoxLayout(groupPanel, BoxLayout.Y_AXIS));
            groupPanel.setBorder(BorderFactory.createTitledBorder(group.label));
            for (SetoptsBit bit : catalogs.bits) {
                if (bit.byteNo != group.byteNo) {
                    continue;
                }
                JBCheckBox cb = new JBCheckBox(bit.label);
                if (bit.bbj != null) {
                    // De-emphasize PRO/5-only or BBj-specific no-op bits (D-08).
                    cb.setForeground(UIUtil.getInactiveTextColor());
                    cb.setToolTipText(bit.bbjDetail != null ? bit.bbjDetail
                            : bit.detail != null ? bit.detail
                            : "This option is " + bit.bbj + " in BBj.");
                } else if (bit.detail != null) {
                    cb.setToolTipText(bit.detail);
                }
                cb.addActionListener(e -> scheduleRefresh());
                checkboxRows.add(new CheckboxRow(bit, cb));
                groupPanel.add(cb);
            }
            form.add(groupPanel);
        }

        JPanel maskPanel = new JPanel(new GridLayout(0, 2, JBUI.scale(6), JBUI.scale(4)));
        maskPanel.setBorder(BorderFactory.createTitledBorder("Mask replacement characters (bytes 5-6)"));
        maskPanel.add(ComposerSwingHelpers.labeled("\",\" becomes", maskCommaField));
        maskPanel.add(ComposerSwingHelpers.labeled("\".\" becomes", maskDotField));
        form.add(maskPanel);

        JPanel rawTailPanel = new JPanel();
        rawTailPanel.setLayout(new BoxLayout(rawTailPanel, BoxLayout.Y_AXIS));
        rawTailPanel.setBorder(BorderFactory.createTitledBorder("Reserved / application bytes 10-16"));
        rawTailPanel.add(ComposerSwingHelpers.labeled("Raw hex", rawTailField));
        rawTailPanel.add(rawTailError);
        form.add(rawTailPanel);

        maskCommaField.getDocument().addDocumentListener(new SimpleDocumentListener(this::scheduleRefresh));
        maskDotField.getDocument().addDocumentListener(new SimpleDocumentListener(this::scheduleRefresh));
        rawTailField.getDocument().addDocumentListener(new SimpleDocumentListener(this::scheduleRefresh));

        JBScrollPane scroll = new JBScrollPane(form);
        scroll.setBorder(null);
        root.add(scroll);

        return root;
    }

    /** Select each checkbox whose byte/mask appears in {@code in.bits}; set the mask/raw-tail fields. */
    private void prefill(SetoptsSelection in) {
        for (CheckboxRow row : checkboxRows) {
            boolean checked = in.bits != null && in.bits.stream()
                    .anyMatch(b -> b.byteNo == row.bit().byteNo && b.mask == row.bit().mask);
            row.checkBox().setSelected(checked);
        }
        maskCommaField.setText(in.maskComma == null ? "" : in.maskComma);
        maskDotField.setText(in.maskDot == null ? "" : in.maskDot);
        rawTailField.setText(in.rawTail == null ? "" : in.rawTail);
    }

    /**
     * Every checkbox/field listener calls this instead of {@link #previewDebouncer} directly
     * (CR-01): it disables OK/Apply synchronously, the instant a new preview is scheduled, so the
     * button can never be clicked while {@link #hexDigits}/{@link #line} still reflect a
     * now-superseded selection during {@link #previewDebouncer}'s fixed 300ms trailing-edge delay.
     * Re-enabled by {@link #apply(SetoptsPreview)} once the debounced {@link #refresh()} resolves
     * (or left disabled by {@link #previewUnavailable(String)} if it fails).
     */
    private void scheduleRefresh() {
        setOKActionEnabled(false);
        seq.incrementAndGet(); // invalidate any response already in flight before this keystroke
        previewDebouncer.trigger();
    }

    /**
     * Read the live field state, validate it, and — only when valid — ask the language server for
     * a fresh preview. Called by the constructor directly and by {@link #previewDebouncer}
     * afterwards; never call this method from a listener body directly (D-09).
     */
    private void refresh() {
        // The raw hex tail is no longer validated here (#607): it is read and passed through
        // unconditionally, and the language server's own verdict comes back on the preview response
        // for apply(SetoptsPreview) to gate OK and render.
        String rawTail = rawTailField.getText();
        String maskComma = maskCommaField.getText();
        String maskDot = maskDotField.getText();
        if (!isValidMaskChar(maskComma) || !isValidMaskChar(maskDot)) {
            previewUnavailable("mask replacement must be one printable character");
            return;
        }

        List<SetoptsSelectionBit> bits = new ArrayList<>();
        for (CheckboxRow row : checkboxRows) {
            if (row.checkBox().isSelected()) {
                bits.add(new SetoptsSelectionBit(row.bit().byteNo, row.bit().mask));
            }
        }
        SetoptsSelection selection = new SetoptsSelection();
        selection.bits = bits;
        selection.maskComma = maskComma;
        selection.maskDot = maskDot;
        selection.rawTail = rawTail;

        // Always pass the constructor-captured original hex through — building the request without
        // it would silently drop bytes 10-16 and every unknown bit in the user's existing line.
        SetoptsPreviewParams params = new SetoptsPreviewParams(originalHex, selection);

        int mySeq = seq.incrementAndGet();
        flow.observe(server.setoptsPreview(params), ComposerFlow.REFRESH_TIMEOUT_MILLIS,
                preview -> {
                    if (mySeq == seq.get()) {
                        apply(preview);
                    }
                },
                throwable -> {
                    if (mySeq == seq.get()) {
                        previewUnavailable(ComposerNotices.shortReason(throwable));
                        balloonOnce.accept(ComposerNotices.requestFailed("SETOPTS", ComposerNotices.detailOf(throwable)));
                    }
                });
    }

    private static boolean isValidMaskChar(String text) {
        if (text.length() > 1) {
            return false;
        }
        if (text.isEmpty()) {
            return true;
        }
        char c = text.charAt(0);
        return c >= 0x20 && c <= 0x7E;
    }

    /**
     * A refresh request failed (or completed with no preview), or the form's own input is invalid,
     * while this dialog's sequence is still current: label the summary stale and refuse OK so it can
     * never be accepted (#538). Cleared the next time {@link #apply(SetoptsPreview)} runs after a
     * successful preview.
     */
    private void previewUnavailable(String reason) {
        ComposerSwingHelpers.previewUnavailable(summary, reason);
        setOKActionEnabled(false);
    }

    private void apply(SetoptsPreview p) {
        hexDigits = p.hexDigits;
        line = p.line;
        resultingLine.setText(p.line);
        summary.setForeground(summaryDefaultForeground);
        summary.setText(p.hexDigits.length() / 2 + " byte(s)  ·  " + p.summary);
        preservedLabel.setText(unknownBitsText(p.unknownByBytes));
        maskCommaField.setEnabled(p.maskInputsEnabled);
        maskDotField.setEnabled(p.maskInputsEnabled);
        // " " keeps the label's height stable when there is no message, matching the null-to-space
        // convention the other dialogs use for per-field errors (#607).
        rawTailError.setText(p.rawTailError == null ? " " : p.rawTailError);
        setOKActionEnabled(p.valid);
    }

    private static String unknownBitsText(List<SetoptsUnknownBits> unknownByBytes) {
        if (unknownByBytes == null || unknownByBytes.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder("Preserved: ");
        boolean first = true;
        for (SetoptsUnknownBits u : unknownByBytes) {
            if (!first) {
                sb.append(", ");
            }
            first = false;
            sb.append("byte ").append(u.byteNo).append(" $")
                    .append(String.format("%02X", u.mask)).append('$');
        }
        return sb.toString();
    }

    /** The composed hex digits (edit flow: replace the existing hex token with this). */
    public @NotNull String getHexDigits() {
        return hexDigits;
    }

    /** The composed full {@code SETOPTS <hex>} line (create flow: insert this). */
    public @NotNull String getLine() {
        return line;
    }

    /** Pairs one catalog bit with its rendered checkbox, so the selection rebuilds without a map lookup. */
    private record CheckboxRow(SetoptsBit bit, JBCheckBox checkBox) {
    }

    /** Small DocumentListener that runs one callback on any change. */
    private record SimpleDocumentListener(Runnable onChange) implements DocumentListener {
        @Override public void insertUpdate(DocumentEvent e) { onChange.run(); }
        @Override public void removeUpdate(DocumentEvent e) { onChange.run(); }
        @Override public void changedUpdate(DocumentEvent e) { onChange.run(); }
    }
}
