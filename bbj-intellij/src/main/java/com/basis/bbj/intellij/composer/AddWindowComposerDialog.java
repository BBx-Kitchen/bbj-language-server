package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.AddWindowCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowPreview;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowPreviewInput;
import com.basis.bbj.intellij.composer.ComposerModels.AddWindowPreviewParams;
import com.basis.bbj.intellij.composer.ComposerModels.CatalogItem;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.DialogWrapper;
import com.intellij.ui.components.JBCheckBox;
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
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicInteger;

import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;

/**
 * Swing composer for {@code BBjSysGui::addWindow} flags + event_mask (#430/#433). Renders grouped
 * flag checkboxes and an opt-in event-mask section; the language server computes the hex, the
 * statement, and the schematic ({@code bbj/composer/addwindow/preview}) so no flag logic lives here.
 * Create flow only for now — inserts a fresh {@code addWindow(...)} statement.
 */
public final class AddWindowComposerDialog extends DialogWrapper {
    private final BbjComposerServer server;
    private final AddWindowCatalogs catalogs;
    private final AtomicInteger seq = new AtomicInteger();

    private final Map<Long, JBCheckBox> flagChecks = new LinkedHashMap<>();
    private final Map<Long, JBCheckBox> eventChecks = new LinkedHashMap<>();
    private final JBCheckBox eventEnabled = new JBCheckBox("Configure event mask (default: unset)");
    private JPanel eventPanel;

    private final JBTextField receiver = new JBTextField("window!");
    private final JBTextField sysgui = new JBTextField("sysgui!");
    private final JBTextField title = new JBTextField("\"Window\"");
    private final JBTextField x = new JBTextField("10");
    private final JBTextField y = new JBTextField("10");
    private final JBTextField width = new JBTextField("400");
    private final JBTextField height = new JBTextField("300");

    private final WindowSchematicPanel schematic = new WindowSchematicPanel();
    private final JBTextField statementField = new JBTextField();
    private final JBLabel flagsSummary = new JBLabel();
    private final JBLabel eventSummary = new JBLabel();
    private JPanel geometryPanel;

    private final boolean editMode;
    private final ComposerModels.AddWindowInitial initial;
    private final long preservedFlagBits;
    private final long preservedEventBits;

    private volatile String statement = "";
    private volatile String flagsHex = "";
    private volatile String eventHex;

    /** Create flow. */
    public AddWindowComposerDialog(@Nullable Project project, @NotNull BbjComposerServer server, @NotNull AddWindowCatalogs catalogs) {
        this(project, server, catalogs, null, false, 0L, 0L);
    }

    /** Full constructor; pass a non-null {@code initial} for edit-in-place. */
    public AddWindowComposerDialog(@Nullable Project project, @NotNull BbjComposerServer server, @NotNull AddWindowCatalogs catalogs,
                                   @Nullable ComposerModels.AddWindowInitial initial, boolean editMode,
                                   long preservedFlagBits, long preservedEventBits) {
        super(project);
        this.server = server;
        this.catalogs = catalogs;
        this.initial = initial;
        this.editMode = editMode;
        this.preservedFlagBits = preservedFlagBits;
        this.preservedEventBits = preservedEventBits;
        setTitle(editMode ? "Configure window flags" : "Compose addWindow");
        setOKButtonText(editMode ? "Apply" : "Insert");
        init();
        if (initial != null) {
            prefill(initial);
        } else {
            // Create: default to the BASIS doc example (Resizable + Close box + Keyboard navigation).
            preselect(0x00000001L, 0x00000002L, 0x00010000L);
        }
        refresh();
    }

    private void preselect(long... bits) {
        for (long bit : bits) {
            JBCheckBox cb = flagChecks.get(bit);
            if (cb != null) {
                cb.setSelected(true);
            }
        }
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
        root.add(labeled("Generated statement", statementField));
        flagsSummary.setComponentStyle(com.intellij.util.ui.UIUtil.ComponentStyle.SMALL);
        eventSummary.setComponentStyle(com.intellij.util.ui.UIUtil.ComponentStyle.SMALL);
        root.add(flagsSummary);
        root.add(eventSummary);
        root.add(Box.createVerticalStrut(JBUI.scale(8)));

        // Statement fields — create flow only; in edit mode we rewrite just the hex tokens in place.
        geometryPanel = new JPanel(new GridLayout(0, 4, JBUI.scale(6), JBUI.scale(4)));
        geometryPanel.setBorder(BorderFactory.createTitledBorder("Statement"));
        geometryPanel.add(labeled("Assign to", receiver));
        geometryPanel.add(labeled("SysGui expr", sysgui));
        geometryPanel.add(labeled("Title expr", title));
        geometryPanel.add(labeled("x", x));
        geometryPanel.add(labeled("y", y));
        geometryPanel.add(labeled("width", width));
        geometryPanel.add(labeled("height", height));
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
        eventEnabled.addActionListener(e -> { updateEventEnabled(); refresh(); });
        eventSection.add(eventEnabled, BorderLayout.NORTH);
        eventPanel = new JPanel();
        eventPanel.setLayout(new BoxLayout(eventPanel, BoxLayout.Y_AXIS));
        addGroupedChecks(eventPanel, catalogs.eventBits, eventChecks);
        eventSection.add(eventPanel, BorderLayout.CENTER);
        root.add(eventSection);
        updateEventEnabled();

        // Text fields trigger a refresh as the user types.
        for (JBTextField f : new JBTextField[]{receiver, sysgui, title, x, y, width, height}) {
            f.getDocument().addDocumentListener(new SimpleDocumentListener(this::refresh));
        }

        JBScrollPane scroll = new JBScrollPane(root);
        scroll.setPreferredSize(new Dimension(JBUI.scale(560), JBUI.scale(680)));
        scroll.setBorder(null);
        return scroll;
    }

    private void updateEventEnabled() {
        setEnabledRecursive(eventPanel, eventEnabled.isSelected());
    }

    private static void setEnabledRecursive(JComponent c, boolean enabled) {
        c.setEnabled(enabled);
        for (java.awt.Component child : c.getComponents()) {
            if (child instanceof JComponent) {
                setEnabledRecursive((JComponent) child, enabled);
            }
        }
    }

    /** Add checkboxes to `parent`, one titled sub-panel per catalog group (in catalog order). */
    private void addGroupedChecks(JPanel parent, List<CatalogItem> items, Map<Long, JBCheckBox> into) {
        String currentGroup = null;
        JPanel groupPanel = null;
        for (CatalogItem it : items) {
            if (!Objects.equals(it.group, currentGroup)) {
                currentGroup = it.group;
                groupPanel = new JPanel(new GridLayout(0, 2, JBUI.scale(8), 0));
                if (currentGroup != null) {
                    groupPanel.setBorder(BorderFactory.createTitledBorder(currentGroup));
                }
                parent.add(groupPanel);
            }
            JBCheckBox cb = new JBCheckBox(it.label);
            cb.addActionListener(e -> refresh());
            into.put(it.value, cb);
            groupPanel.add(cb);
        }
    }

    private List<Long> selected(Map<Long, JBCheckBox> checks) {
        List<Long> out = new ArrayList<>();
        for (Map.Entry<Long, JBCheckBox> e : checks.entrySet()) {
            if (e.getValue().isSelected()) {
                out.add(e.getKey());
            }
        }
        return out;
    }

    /** Build the current selection, ask the LS for a preview, and update the UI on the EDT. */
    private void refresh() {
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
        server.addWindowPreview(new AddWindowPreviewParams(input)).thenAccept(preview ->
                ApplicationManager.getApplication().invokeLater(() -> {
                    if (mySeq == seq.get() && preview != null) {
                        apply(preview);
                    }
                }, ModalityState.any()));
    }

    private void apply(AddWindowPreview p) {
        statement = p.statement;
        flagsHex = p.flagsHex;
        eventHex = p.eventHex;
        statementField.setText(p.statement);
        flagsSummary.setText("flags = " + p.flagsHex + "   ·   " + p.flagsSummary);
        eventSummary.setText("event_mask = " + (p.eventHex == null ? "(unset)" : p.eventHex) + "   ·   " + p.eventSummary);
        schematic.setRender(p.render);
    }

    /** Prefill flag/event selections and title from a decoded call (edit-in-place). */
    private void prefill(ComposerModels.AddWindowInitial in) {
        setSelected(flagChecks, in.flags);
        setSelected(eventChecks, in.eventMask);
        eventEnabled.setSelected(in.eventMaskEnabled);
        updateEventEnabled();
        if (in.title != null) {
            title.setText(in.title); // kept for the preview even though the geometry panel is hidden
        }
    }

    private static void setSelected(Map<Long, JBCheckBox> checks, List<Long> values) {
        List<Long> on = values == null ? List.of() : values;
        for (Map.Entry<Long, JBCheckBox> e : checks.entrySet()) {
            e.getValue().setSelected(on.contains(e.getKey()));
        }
    }

    private static JPanel labeled(String label, JComponent field) {
        JPanel panel = new JPanel(new BorderLayout(0, JBUI.scale(2)));
        panel.add(new JBLabel(label), BorderLayout.NORTH);
        panel.add(field, BorderLayout.CENTER);
        return panel;
    }

    /** The composed statement to insert (create flow); valid after the dialog is accepted. */
    public @NotNull String getStatement() {
        return statement;
    }

    /** The `$flags$` hex token (edit flow: replace the existing flags literal with this). */
    public @NotNull String getFlagsHex() {
        return flagsHex;
    }

    /** The `$event_mask$` hex token, or null when the event mask is unset. */
    public @Nullable String getEventHex() {
        return eventHex;
    }

    public boolean isEventEnabled() {
        return eventEnabled.isSelected();
    }

    /** Small DocumentListener that runs one callback on any change. */
    private record SimpleDocumentListener(Runnable onChange) implements DocumentListener {
        @Override public void insertUpdate(DocumentEvent e) { onChange.run(); }
        @Override public void removeUpdate(DocumentEvent e) { onChange.run(); }
        @Override public void changedUpdate(DocumentEvent e) { onChange.run(); }
    }
}
