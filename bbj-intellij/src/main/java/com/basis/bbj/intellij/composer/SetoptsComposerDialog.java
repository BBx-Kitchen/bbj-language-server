package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.SetoptsBit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsByteGroup;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsPreview;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsSelection;
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
import java.awt.BorderLayout;
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
    private static final int MAX_RAW_TAIL_DIGITS = 14;

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
    private final JBLabel rawTailError = errorLabel();

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
        root.add(labeled("Resulting line", resultingLine));
        summary.setComponentStyle(UIUtil.ComponentStyle.SMALL);
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
                cb.addActionListener(e -> previewDebouncer.trigger());
                checkboxRows.add(new CheckboxRow(bit, cb));
                groupPanel.add(cb);
            }
            form.add(groupPanel);
        }

        JPanel maskPanel = new JPanel(new GridLayout(0, 2, JBUI.scale(6), JBUI.scale(4)));
        maskPanel.setBorder(BorderFactory.createTitledBorder("Mask replacement characters (bytes 5-6)"));
        maskPanel.add(labeled("\",\" becomes", maskCommaField));
        maskPanel.add(labeled("\".\" becomes", maskDotField));
        form.add(maskPanel);

        JPanel rawTailPanel = new JPanel();
        rawTailPanel.setLayout(new BoxLayout(rawTailPanel, BoxLayout.Y_AXIS));
        rawTailPanel.setBorder(BorderFactory.createTitledBorder("Reserved / application bytes 10-16"));
        rawTailPanel.add(labeled("Raw hex", rawTailField));
        rawTailPanel.add(rawTailError);
        form.add(rawTailPanel);

        maskCommaField.getDocument().addDocumentListener(new SimpleDocumentListener(previewDebouncer::trigger));
        maskDotField.getDocument().addDocumentListener(new SimpleDocumentListener(previewDebouncer::trigger));
        rawTailField.getDocument().addDocumentListener(new SimpleDocumentListener(previewDebouncer::trigger));

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

    private void refresh() {
        // Completed in plan 87-02 Task 3: debounced preview round trip and the validation gate.
    }

    private void previewUnavailable(String reason) {
        // Completed in plan 87-02 Task 3.
    }

    private void apply(SetoptsPreview p) {
        // Completed in plan 87-02 Task 3.
    }

    private static JBLabel errorLabel() {
        JBLabel label = new JBLabel(" ");
        label.setComponentStyle(UIUtil.ComponentStyle.SMALL);
        label.setForeground(new Color(0xC0392B));
        return label;
    }

    private static JPanel labeled(String label, JComponent field) {
        JPanel panel = new JPanel(new BorderLayout(0, JBUI.scale(2)));
        panel.add(new JBLabel(label), BorderLayout.NORTH);
        panel.add(field, BorderLayout.CENTER);
        return panel;
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
