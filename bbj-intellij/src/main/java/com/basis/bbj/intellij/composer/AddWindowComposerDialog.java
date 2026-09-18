package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.AddWindowCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowPreview;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowPreviewInput;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowPreviewParams;
import com.intellij.openapi.project.Project;
import com.intellij.ui.components.JBLabel;
import com.intellij.ui.components.JBScrollPane;
import com.intellij.ui.components.JBTextField;
import com.intellij.util.ui.JBUI;

import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JComponent;
import javax.swing.JPanel;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridLayout;

/**
 * Swing composer for {@code BBjSysGui::addWindow} flags + event_mask (#430/#433). Renders grouped
 * flag checkboxes and an opt-in event-mask section; the language server computes the hex, the
 * statement, and the schematic ({@code bbj/composer/addwindow/preview}) so no flag logic lives here.
 * Create flow only for now — inserts a fresh {@code addWindow(...)} statement. Every input routes
 * through the inherited {@code scheduleRefresh()} over the shared {@code PreviewDebouncer} seam
 * ({@link AddWindowFamilyComposerDialogBase}, #630), so a burst of typing sends one preview request
 * per settle point instead of one per keystroke (#611).
 */
public final class AddWindowComposerDialog extends AddWindowFamilyComposerDialogBase {

    private final JBTextField receiver = new JBTextField("window!");
    private final JBTextField sysgui = new JBTextField("sysgui!");
    private final JBTextField title = new JBTextField("\"Window\"");
    private final JBTextField x = new JBTextField("10");
    private final JBTextField y = new JBTextField("10");
    private final JBTextField width = new JBTextField("400");
    private final JBTextField height = new JBTextField("300");

    private final WindowSchematicPanel schematic = new WindowSchematicPanel();
    private final JBLabel receiverError = ComposerSwingHelpers.errorLabel();
    private final JBLabel sysguiError = ComposerSwingHelpers.errorLabel();
    private final JBLabel titleError = ComposerSwingHelpers.errorLabel();
    private final JBLabel xError = ComposerSwingHelpers.errorLabel();
    private final JBLabel yError = ComposerSwingHelpers.errorLabel();
    private final JBLabel widthError = ComposerSwingHelpers.errorLabel();
    private final JBLabel heightError = ComposerSwingHelpers.errorLabel();
    private Color flagsSummaryDefaultForeground;

    /** Create flow. */
    public AddWindowComposerDialog(@NotNull Project project, @NotNull BbjComposerServer server, @NotNull AddWindowCatalogs catalogs) {
        this(project, server, catalogs, null, false, 0L, 0L);
    }

    /** Full constructor; pass a non-null {@code initial} for edit-in-place. */
    public AddWindowComposerDialog(@NotNull Project project, @NotNull BbjComposerServer server, @NotNull AddWindowCatalogs catalogs,
                                   @Nullable ComposerModels.AddWindowInitial initial, boolean editMode,
                                   long preservedFlagBits, long preservedEventBits) {
        super(project, server, catalogs, initial, editMode, preservedFlagBits, preservedEventBits);
        setTitle(editMode ? "Configure window flags" : "Compose addWindow");
        setOKButtonText(editMode ? "Apply" : "Insert");
        init();
        // Disable OK until the first preview round-trip resolves (#538): otherwise a fast/keyboard
        // accept landing before any preview arrives would write the field defaults (empty flagsHex,
        // null eventHex) into the document. Re-enabled by apply() on a successful preview.
        setOKActionEnabled(false);
        if (initial != null) {
            prefill(initial);
            if (initial.title != null) {
                title.setText(initial.title); // kept for the preview even though the geometry panel is hidden
            }
        } else {
            // Create: default to the BASIS doc example (Resizable + Close box + Keyboard navigation).
            preselect(0x00000001L, 0x00000002L, 0x00010000L);
        }
        refresh();
    }

    @Override
    protected @Nullable JComponent createCenterPanel() {
        JPanel root = new JPanel();
        root.setLayout(new BoxLayout(root, BoxLayout.Y_AXIS));

        // Live schematic preview.
        JPanel preview = new JPanel(new FlowLayout(FlowLayout.CENTER));
        preview.add(schematic);
        root.add(preview);

        statementField.setEditable(false);
        root.add(ComposerSwingHelpers.labeled("Generated statement", statementField));
        flagsSummary.setComponentStyle(com.intellij.util.ui.UIUtil.ComponentStyle.SMALL);
        eventSummary.setComponentStyle(com.intellij.util.ui.UIUtil.ComponentStyle.SMALL);
        flagsSummaryDefaultForeground = flagsSummary.getForeground();
        root.add(flagsSummary);
        root.add(eventSummary);
        root.add(Box.createVerticalStrut(JBUI.scale(8)));

        // Statement fields — create flow only; in edit mode we rewrite just the hex tokens in place.
        geometryPanel = new JPanel(new GridLayout(0, 4, JBUI.scale(6), JBUI.scale(4)));
        geometryPanel.setBorder(BorderFactory.createTitledBorder("Statement"));
        geometryPanel.add(ComposerSwingHelpers.labeledWithError("Assign to", receiver, receiverError));
        geometryPanel.add(ComposerSwingHelpers.labeledWithError("SysGui expr", sysgui, sysguiError));
        geometryPanel.add(ComposerSwingHelpers.labeledWithError("Title expr", title, titleError));
        geometryPanel.add(ComposerSwingHelpers.labeledWithError("x", x, xError));
        geometryPanel.add(ComposerSwingHelpers.labeledWithError("y", y, yError));
        geometryPanel.add(ComposerSwingHelpers.labeledWithError("width", width, widthError));
        geometryPanel.add(ComposerSwingHelpers.labeledWithError("height", height, heightError));
        geometryPanel.setVisible(!editMode);
        root.add(geometryPanel);

        // Window flags, grouped.
        JPanel flags = new JPanel();
        flags.setLayout(new BoxLayout(flags, BoxLayout.Y_AXIS));
        flags.setBorder(BorderFactory.createTitledBorder("Window flags"));
        addGroupedChecks(flags, catalogs.flags, flagChecks);
        root.add(flags);

        // Event mask, opt-in.
        JPanel eventSection = new JPanel(new BorderLayout());
        eventSection.setBorder(BorderFactory.createTitledBorder("Event mask"));
        eventEnabled.addActionListener(e -> { updateEventEnabled(); scheduleRefresh(); });
        eventSection.add(eventEnabled, BorderLayout.NORTH);
        eventPanel = new JPanel();
        eventPanel.setLayout(new BoxLayout(eventPanel, BoxLayout.Y_AXIS));
        addGroupedChecks(eventPanel, catalogs.eventBits, eventChecks);
        eventSection.add(eventPanel, BorderLayout.CENTER);
        root.add(eventSection);
        updateEventEnabled();

        // Text fields trigger a refresh as the user types.
        for (JBTextField f : new JBTextField[]{receiver, sysgui, title, x, y, width, height}) {
            f.getDocument().addDocumentListener(new SimpleDocumentListener(this::scheduleRefresh));
        }

        JBScrollPane scroll = new JBScrollPane(root);
        scroll.setPreferredSize(new Dimension(JBUI.scale(560), JBUI.scale(680)));
        scroll.setBorder(null);
        return scroll;
    }

    /** No listener calls this directly -- every listener routes through the inherited {@code scheduleRefresh()}.
     * Build the current selection, ask the LS for a preview, and update the UI on the EDT. */
    @Override
    protected void refresh() {
        AddWindowPreviewInput input = new AddWindowPreviewInput();
        input.flags = selected(flagChecks);
        input.eventMaskEnabled = eventEnabled.isSelected();
        input.eventMask = selected(eventChecks);
        input.receiver = receiver.getText();
        input.sysgui = sysgui.getText();
        input.title = title.getText();
        input.x = x.getText();
        input.y = y.getText();
        input.width = width.getText();
        input.height = height.getText();
        input.editMode = editMode;
        input.preservedFlagBits = preservedFlagBits;
        input.preservedEventBits = preservedEventBits;

        int mySeq = seq.incrementAndGet();
        flow.observe(server.addWindowPreview(new AddWindowPreviewParams(input)), ComposerFlow.REFRESH_TIMEOUT_MILLIS,
                preview -> {
                    if (mySeq == seq.get()) {
                        apply(preview);
                    }
                },
                throwable -> {
                    if (mySeq == seq.get()) {
                        previewUnavailable(ComposerNotices.shortReason(throwable));
                        balloonOnce.accept(ComposerNotices.requestFailed("addWindow", ComposerNotices.detailOf(throwable)));
                    }
                });
    }

    private void apply(AddWindowPreview p) {
        statement = p.statement;
        flagsHex = p.flagsHex;
        eventHex = p.eventHex;
        statementField.setText(p.statement);
        flagsSummary.setForeground(flagsSummaryDefaultForeground);
        flagsSummary.setText("flags = " + p.flagsHex + "   ·   " + p.flagsSummary);
        eventSummary.setText("event_mask = " + (p.eventHex == null ? "(unset)" : p.eventHex) + "   ·   " + p.eventSummary);
        schematic.setRender(p.render);
        receiverError.setText(errorText(p.receiverError));
        sysguiError.setText(errorText(p.sysguiError));
        titleError.setText(errorText(p.titleError));
        xError.setText(errorText(p.xError));
        yError.setText(errorText(p.yError));
        widthError.setText(errorText(p.widthError));
        heightError.setText(errorText(p.heightError));
        setOKActionEnabled(p.valid);
    }
}
