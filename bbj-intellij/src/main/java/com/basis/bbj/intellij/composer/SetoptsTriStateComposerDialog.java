package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.SetoptsBit;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsByteGroup;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsComposeTriStateParams;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsComposeTriStateResult;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsTriStateEntry;
import com.basis.bbj.intellij.composer.ComposerModels.SetoptsTriStateSelection;
import com.basis.bbj.intellij.concurrency.AlarmScheduler;
import com.basis.bbj.intellij.concurrency.PreviewDebouncer;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.DialogWrapper;
import com.intellij.ui.components.JBLabel;
import com.intellij.ui.components.JBRadioButton;
import com.intellij.ui.components.JBScrollPane;
import com.intellij.ui.components.JBTextArea;
import com.intellij.util.ui.JBUI;
import com.intellij.util.ui.UIUtil;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.ButtonGroup;
import javax.swing.JComponent;
import javax.swing.JPanel;
import java.awt.Color;
import java.awt.FlowLayout;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

/**
 * Swing composer for a BBj-code tri-state SETOPTS Set/Clear/Leave block (#475, DISC-06): reuses
 * {@link SetoptsComposerDialog}'s byte-grouped catalog layout, debounce and OK-gating rules
 * (D-06), but swaps each option's checkbox for a three-state Set/Clear/Leave radio row and swaps
 * the mask-character/raw-tail form region for a read-only generated-block preview -- a
 * read-modify-write block has no absolute data bytes to edit. The dialog owns no SETOPTS
 * arithmetic itself -- every value it shows comes from {@code bbj/composer/setopts/composeTriState}.
 * The caller (plan 05's launcher) decides whether this is an edit-in-place session on an existing
 * safe chain or a compose-new (blank) session.
 */
public final class SetoptsTriStateComposerDialog extends DialogWrapper {

    private static final long PREVIEW_DEBOUNCE_MS = 300L;

    private final Project project;
    private final BbjComposerServer server;
    private final SetoptsCatalogs catalogs;
    @Nullable
    private final String variable;
    private final String indent;
    private final String scope;
    private final AtomicInteger seq = new AtomicInteger();
    private final ComposerFlow flow;
    private final Consumer<ComposerNotices.Notice> balloonOnce;
    private final PreviewDebouncer previewDebouncer;

    private final List<TriStateRow> rows = new ArrayList<>();

    private final JBTextArea blockPreview = new JBTextArea();
    private final JBLabel preservedLabel = new JBLabel(
            "Options left Leave, and any bit outside this catalog, are left untouched by the generated lines.");
    private Color blockPreviewDefaultForeground;

    private volatile String blockText = "";
    private volatile List<SetoptsTriStateEntry> selection = List.of();

    public SetoptsTriStateComposerDialog(@NotNull Project project, @NotNull BbjComposerServer server,
            @NotNull SetoptsCatalogs catalogs, @Nullable SetoptsTriStateSelection initial,
            @Nullable String variable, @Nullable String indent, @NotNull String scope, boolean editMode) {
        super(project);
        this.project = project;
        this.server = server;
        this.catalogs = catalogs;
        this.variable = variable;
        this.indent = indent == null ? "" : indent;
        this.scope = scope;
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
        setTitle(editMode ? "Configure SETOPTS block" : "Compose SETOPTS block");
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

        // Preview region -- outside the scroll pane so it is always visible (D-07), read-only
        // since a read-modify-write block has no absolute data bytes for the user to edit here.
        blockPreview.setEditable(false);
        blockPreview.setRows(6);
        blockPreview.setLineWrap(false);
        blockPreviewDefaultForeground = blockPreview.getForeground();
        root.add(ComposerSwingHelpers.labeled("Generated block", new JBScrollPane(blockPreview)));
        preservedLabel.setComponentStyle(UIUtil.ComponentStyle.SMALL);
        root.add(preservedLabel);
        root.add(Box.createVerticalStrut(JBUI.scale(8)));

        // Form region -- one scrollable panel, no tabs (D-07), same byte-group iteration as
        // SetoptsComposerDialog with the per-row widget swapped for a three-state radio group.
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
                JPanel rowPanel = new JPanel(new FlowLayout(FlowLayout.LEFT, JBUI.scale(6), 0));
                JBLabel label = new JBLabel(bit.label);
                JBRadioButton setButton = new JBRadioButton("Set");
                JBRadioButton clearButton = new JBRadioButton("Clear");
                JBRadioButton leaveButton = new JBRadioButton("Leave", true);
                ButtonGroup triState = new ButtonGroup();
                triState.add(setButton);
                triState.add(clearButton);
                triState.add(leaveButton);
                if (bit.bbj != null) {
                    // De-emphasize PRO/5-only or BBj-specific no-op bits (D-08).
                    label.setForeground(UIUtil.getInactiveTextColor());
                    String tooltip = bit.bbjDetail != null ? bit.bbjDetail
                            : bit.detail != null ? bit.detail
                            : "This option is " + bit.bbj + " in BBj.";
                    label.setToolTipText(tooltip);
                    setButton.setToolTipText(tooltip);
                    clearButton.setToolTipText(tooltip);
                    leaveButton.setToolTipText(tooltip);
                } else if (bit.detail != null) {
                    label.setToolTipText(bit.detail);
                    setButton.setToolTipText(bit.detail);
                    clearButton.setToolTipText(bit.detail);
                    leaveButton.setToolTipText(bit.detail);
                }
                setButton.addActionListener(e -> scheduleRefresh());
                clearButton.addActionListener(e -> scheduleRefresh());
                leaveButton.addActionListener(e -> scheduleRefresh());
                rowPanel.add(label);
                rowPanel.add(setButton);
                rowPanel.add(clearButton);
                rowPanel.add(leaveButton);
                rows.add(new TriStateRow(bit, setButton, clearButton, leaveButton));
                groupPanel.add(rowPanel);
            }
            form.add(groupPanel);
        }

        JBScrollPane scroll = new JBScrollPane(form);
        scroll.setBorder(null);
        root.add(scroll);

        return root;
    }

    /** Select each row's Set/Clear/Leave button matching {@code in.entries}; default Leave when absent. */
    private void prefill(SetoptsTriStateSelection in) {
        for (TriStateRow row : rows) {
            String state = "leave";
            if (in.entries != null) {
                for (SetoptsTriStateEntry entry : in.entries) {
                    if (entry.byteNo == row.bit().byteNo && entry.mask == row.bit().mask) {
                        state = entry.state;
                        break;
                    }
                }
            }
            switch (state) {
                case "set" -> row.setButton().setSelected(true);
                case "clear" -> row.clearButton().setSelected(true);
                default -> row.leaveButton().setSelected(true);
            }
        }
    }

    /**
     * Every radio-button listener calls this instead of {@link #previewDebouncer} directly
     * (CR-01): it disables OK/Apply synchronously, the instant a new preview is scheduled, so the
     * button can never be clicked while {@link #blockText}/{@link #selection} still reflect a
     * now-superseded selection during {@link #previewDebouncer}'s fixed 300ms trailing-edge delay.
     * Re-enabled by {@link #apply(SetoptsComposeTriStateResult, List)} once the debounced
     * {@link #refresh()} resolves (or left disabled by {@link #previewUnavailable(String)} if it
     * fails).
     */
    private void scheduleRefresh() {
        setOKActionEnabled(false);
        seq.incrementAndGet(); // invalidate any response already in flight before this keystroke
        previewDebouncer.trigger();
    }

    /**
     * Reads the live radio-button state, builds a full tri-state selection (one entry per catalog
     * bit, in catalog order) and asks the language server for a fresh composed block. Called by
     * the constructor directly and by {@link #previewDebouncer} afterwards.
     */
    private void refresh() {
        List<SetoptsTriStateEntry> entries = new ArrayList<>();
        for (TriStateRow row : rows) {
            String state = row.setButton().isSelected() ? "set"
                    : row.clearButton().isSelected() ? "clear"
                    : "leave";
            entries.add(new SetoptsTriStateEntry(row.bit().byteNo, row.bit().mask, state));
        }
        SetoptsTriStateSelection sel = new SetoptsTriStateSelection();
        sel.entries = entries;

        SetoptsComposeTriStateParams params = new SetoptsComposeTriStateParams(sel, variable, indent, scope);

        int mySeq = seq.incrementAndGet();
        flow.observe(server.setoptsComposeTriState(params), ComposerFlow.REFRESH_TIMEOUT_MILLIS,
                result -> {
                    if (mySeq == seq.get()) {
                        apply(result, entries);
                    }
                },
                throwable -> {
                    if (mySeq == seq.get()) {
                        previewUnavailable(ComposerNotices.shortReason(throwable));
                        balloonOnce.accept(ComposerNotices.requestFailed("SETOPTS", ComposerNotices.detailOf(throwable)));
                    }
                });
    }

    /**
     * A refresh request failed (or completed with no result), or this dialog's sequence is still
     * current for a request that has since been superseded: label the preview stale and refuse OK
     * so it can never be accepted (#538). Cleared the next time {@link #apply} runs after a
     * successful preview.
     */
    private void previewUnavailable(String reason) {
        ComposerSwingHelpers.previewUnavailable(blockPreview, reason);
        setOKActionEnabled(false);
    }

    private void apply(SetoptsComposeTriStateResult result, List<SetoptsTriStateEntry> entries) {
        blockText = result.text == null ? "" : result.text;
        selection = entries;
        blockPreview.setForeground(blockPreviewDefaultForeground);
        blockPreview.setText(blockText);
        setOKActionEnabled(true);
    }

    /**
     * The server-composed block text (create flow: insert this at the caret's line start; edit
     * flow: replace the reassignment region with this). Empty-safe before the first preview
     * resolves.
     */
    public @NotNull String getBlockText() {
        return blockText;
    }

    /** The current tri-state selection, one entry per catalog bit in catalog order. Empty-safe before the first preview resolves. */
    public @NotNull List<SetoptsTriStateEntry> getSelection() {
        return selection;
    }

    /** Pairs one catalog bit with its rendered Set/Clear/Leave radio row. */
    private record TriStateRow(SetoptsBit bit, JBRadioButton setButton, JBRadioButton clearButton, JBRadioButton leaveButton) {
    }
}
