package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.CvsBit;
import com.basis.bbj.intellij.composer.ComposerModels.CvsCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.CvsInitial;
import com.basis.bbj.intellij.composer.ComposerModels.CvsPreview;
import com.basis.bbj.intellij.composer.ComposerModels.CvsPreviewInput;
import com.basis.bbj.intellij.composer.ComposerModels.CvsPreviewParams;
import com.basis.bbj.intellij.concurrency.AlarmScheduler;
import com.basis.bbj.intellij.concurrency.PreviewDebouncer;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.DialogWrapper;
import com.intellij.ui.components.JBCheckBox;
import com.intellij.ui.components.JBLabel;
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
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

/**
 * Swing composer for {@code CVS(...)} (#649): a flat, titled list of the eight documented
 * operation checkboxes (applied in ascending order, no byte-group headers, no scroll pane), the
 * source string expression, an optional replacement-characters field, and a live debounced
 * preview of the resulting mask and composed statement. The dialog owns no CVS() arithmetic itself
 * -- every value it shows comes from {@code bbj/composer/cvs/preview}. This one constructor serves
 * all three {@link CvsComposeMode} outcomes the caller ({@link ComposerLauncher}) can reach: a
 * blank compose-new dialog, an edit-in-place dialog on an existing literal-sum call, or a
 * complete-the-call dialog on a call the user is still typing.
 */
public final class CvsComposerDialog extends DialogWrapper {

    private static final long PREVIEW_DEBOUNCE_MS = 300L;

    private final Project project;
    private final BbjComposerServer server;
    private final CvsCatalogs catalogs;
    private final boolean editMode;
    private final boolean completing;
    @Nullable
    private final List<String> trailingArgs;
    private final AtomicInteger seq = new AtomicInteger();
    private final ComposerFlow flow;
    private final Consumer<ComposerNotices.Notice> balloonOnce;
    private final PreviewDebouncer previewDebouncer;

    private final List<CheckboxRow> checkboxRows = new ArrayList<>();

    private final JBTextField expressionField = new JBTextField();
    private final JBLabel strError = errorLabel();
    private JPanel assignToRow;
    private final JBTextField assignTo = new JBTextField();
    private final JBLabel charsFieldLabel = new JBLabel("Replacement characters");
    private final JBTextField charsField = new JBTextField();
    private final JBLabel charsError = errorLabel();
    private final JBTextField statementField = new JBTextField();
    private final JBLabel summary = new JBLabel();

    private Color charsFieldDefaultForeground;
    private Color charsLabelDefaultForeground;

    private volatile String statement = "";

    public CvsComposerDialog(@NotNull Project project, @NotNull BbjComposerServer server,
            @NotNull CvsCatalogs catalogs, @Nullable CvsInitial initial, @NotNull CvsComposeMode mode,
            @Nullable List<String> trailingArgs) {
        super(project);
        if (mode == CvsComposeMode.NOT_EDITABLE) {
            throw new IllegalArgumentException("CvsComposerDialog must never open for NOT_EDITABLE");
        }
        this.project = project;
        this.server = server;
        this.catalogs = catalogs;
        this.editMode = mode == CvsComposeMode.EDIT_IN_PLACE;
        this.completing = mode == CvsComposeMode.COMPLETE_CALL;
        this.trailingArgs = trailingArgs;
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
        setTitle(editMode ? "Configure CVS()" : completing ? "Complete CVS() call" : "Compose CVS()");
        setOKButtonText(editMode || completing ? "Apply" : "Insert");
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

        statementField.setEditable(false);
        root.add(labeled("Generated statement", statementField));
        summary.setComponentStyle(UIUtil.ComponentStyle.SMALL);
        root.add(summary);
        root.add(Box.createVerticalStrut(JBUI.scale(8)));

        expressionField.setEditable(!editMode);
        root.add(labeled(editMode ? "String expression (kept verbatim)" : "String expression", expressionField));
        root.add(strError);

        assignToRow = labeled("Assign result to (optional)", assignTo);
        // In both replace modes (edit-in-place and completing an unfinished call) any assignment
        // sits outside the replaced call span, so the row is visible only when composing new.
        assignToRow.setVisible(!editMode && !completing);
        root.add(assignToRow);

        // ONE flat, titled checkbox list -- no byte-group headers, no scroll pane.
        JPanel opsPanel = new JPanel();
        opsPanel.setLayout(new BoxLayout(opsPanel, BoxLayout.Y_AXIS));
        opsPanel.setBorder(BorderFactory.createTitledBorder("Operations (applied in ascending order)"));
        for (CvsBit bit : catalogs.bits) {
            JBCheckBox cb = new JBCheckBox(bit.label + " (" + bit.value + ")");
            if (bit.detail != null) {
                cb.setToolTipText(bit.detail);
            }
            cb.addActionListener(e -> scheduleRefresh());
            checkboxRows.add(new CheckboxRow(bit, cb));
            opsPanel.add(cb);
        }
        root.add(opsPanel);

        JPanel charsPanel = new JPanel(new BorderLayout(0, JBUI.scale(2)));
        charsPanel.add(charsFieldLabel, BorderLayout.NORTH);
        charsPanel.add(charsField, BorderLayout.CENTER);
        // The catalog tooltip is set once and never cleared -- it must survive disablement.
        charsField.setToolTipText(catalogs.charsTooltip);
        root.add(charsPanel);
        root.add(charsError);

        charsFieldDefaultForeground = charsField.getForeground();
        charsLabelDefaultForeground = charsFieldLabel.getForeground();

        expressionField.getDocument().addDocumentListener(new SimpleDocumentListener(this::scheduleRefresh));
        assignTo.getDocument().addDocumentListener(new SimpleDocumentListener(this::scheduleRefresh));
        charsField.getDocument().addDocumentListener(new SimpleDocumentListener(this::scheduleRefresh));

        return root;
    }

    /** Check each catalog bit present in {@code in.bits}; set the string and chars text. */
    private void prefill(CvsInitial in) {
        for (CheckboxRow row : checkboxRows) {
            boolean checked = in.bits != null && in.bits.contains(row.bit().value);
            row.checkBox().setSelected(checked);
        }
        expressionField.setText(in.str == null ? "" : in.str);
        charsField.setText(in.chars == null ? "" : in.chars);
    }

    /**
     * Every checkbox/field listener calls this instead of {@link #previewDebouncer} directly: it
     * disables OK/Apply synchronously, the instant a new preview is scheduled, so the button can
     * never be clicked while {@link #statement} still reflects a now-superseded selection during
     * {@link #previewDebouncer}'s fixed 300ms trailing-edge delay. Re-enabled by
     * {@link #apply(CvsPreview)} once the debounced {@link #refresh()} resolves (or left disabled by
     * {@link #previewUnavailable(String)} if it fails).
     */
    private void scheduleRefresh() {
        setOKActionEnabled(false);
        previewDebouncer.trigger();
    }

    /**
     * Read the live field state and ask the language server for a fresh preview. Called by the
     * constructor directly and by {@link #previewDebouncer} afterwards; never call this method from
     * a listener body directly.
     */
    private void refresh() {
        CvsPreviewInput input = new CvsPreviewInput();
        input.str = expressionField.getText();
        List<Long> bits = new ArrayList<>();
        for (CheckboxRow row : checkboxRows) {
            if (row.checkBox().isSelected()) {
                bits.add(row.bit().value);
            }
        }
        input.bits = bits;
        input.chars = charsField.getText();
        // Assignment lives outside the replaced call span in both replace modes; only compose-new
        // reads it from the (visible) assign field.
        input.assignTo = (!editMode && !completing) ? assignTo.getText() : null;
        input.trailingArgs = trailingArgs;
        // False while completing an unfinished call, so the server validates the string as
        // required -- unlike edit-in-place, where the verbatim string is already known-good.
        input.editMode = editMode;

        int mySeq = seq.incrementAndGet();
        flow.observe(server.cvsPreview(new CvsPreviewParams(input)), ComposerFlow.REFRESH_TIMEOUT_MILLIS,
                preview -> {
                    if (mySeq == seq.get()) {
                        apply(preview);
                    }
                },
                throwable -> {
                    if (mySeq == seq.get()) {
                        previewUnavailable(ComposerNotices.shortReason(throwable));
                        balloonOnce.accept(ComposerNotices.requestFailed("CVS()", ComposerNotices.detailOf(throwable)));
                    }
                });
    }

    /**
     * A refresh request failed (or completed with no preview) while this dialog's sequence is still
     * current: label the summary stale and refuse OK so it can never be accepted (#538). Cleared the
     * next time {@link #apply(CvsPreview)} runs after a successful preview.
     */
    private void previewUnavailable(String reason) {
        summary.setText("Preview unavailable — " + reason);
        setOKActionEnabled(false);
    }

    private void apply(CvsPreview p) {
        statement = p.statement;
        statementField.setText(p.statement);
        summary.setText(p.summary);
        strError.setText(p.strError == null ? " " : p.strError);
        charsError.setText(p.charsError == null ? " " : p.charsError);
        // The chars field is disabled and drawn in the inactive text colour when the latest preview
        // reports charsEnabled: false -- it is never hidden and its tooltip is never cleared.
        charsField.setEnabled(p.charsEnabled);
        charsField.setForeground(p.charsEnabled ? charsFieldDefaultForeground : UIUtil.getInactiveTextColor());
        charsFieldLabel.setForeground(p.charsEnabled ? charsLabelDefaultForeground : UIUtil.getInactiveTextColor());
        setOKActionEnabled(p.valid);
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

    /** The composed CVS() statement (edit flow: replace the existing call span with this). */
    public @NotNull String getStatement() {
        return statement;
    }

    /** Pairs one catalog bit with its rendered checkbox, so the selection rebuilds without a map lookup. */
    private record CheckboxRow(CvsBit bit, JBCheckBox checkBox) {
    }

    /** Small DocumentListener that runs one callback on any change. */
    private record SimpleDocumentListener(Runnable onChange) implements DocumentListener {
        @Override public void insertUpdate(DocumentEvent e) { onChange.run(); }
        @Override public void removeUpdate(DocumentEvent e) { onChange.run(); }
        @Override public void changedUpdate(DocumentEvent e) { onChange.run(); }
    }
}
