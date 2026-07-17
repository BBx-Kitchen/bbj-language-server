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

    private volatile String statement = "";

    public AddWindowComposerDialog(@Nullable Project project, @NotNull BbjComposerServer server, @NotNull AddWindowCatalogs catalogs) {
        super(project);
        this.server = server;
        this.catalogs = catalogs;
        setTitle("Compose addWindow");
        setOKButtonText("Insert");
        init();
        // Default to the BASIS doc example: Resizable + Close box + Keyboard navigation.
        preselect(0x00000001L, 0x00000002L, 0x00010000L);
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

        // Statement fields (create flow).
        JPanel geo = new JPanel(new GridLayout(0, 4, JBUI.scale(6), JBUI.scale(4)));
        geo.setBorder(BorderFactory.createTitledBorder("Statement"));
        geo.add(labeled("Assign to", receiver));
        geo.add(labeled("SysGui expr", sysgui));
        geo.add(labeled("Title expr", title));
        geo.add(labeled("x", x));
        geo.add(labeled("y", y));
        geo.add(labeled("width", width));
        geo.add(labeled("height", height));
        root.add(geo);

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
        statementField.setText(p.statement);
        flagsSummary.setText("flags = " + p.flagsHex + "   ·   " + p.flagsSummary);
        eventSummary.setText("event_mask = " + (p.eventHex == null ? "(unset)" : p.eventHex) + "   ·   " + p.eventSummary);
        schematic.setRender(p.render);
    }

    private static JPanel labeled(String label, JComponent field) {
        JPanel panel = new JPanel(new BorderLayout(0, JBUI.scale(2)));
        panel.add(new JBLabel(label), BorderLayout.NORTH);
        panel.add(field, BorderLayout.CENTER);
        return panel;
    }

    /** The composed statement to insert; valid after the dialog is accepted. */
    public @NotNull String getStatement() {
        return statement;
    }

    /** Small DocumentListener that runs one callback on any change. */
    private record SimpleDocumentListener(Runnable onChange) implements DocumentListener {
        @Override public void insertUpdate(DocumentEvent e) { onChange.run(); }
        @Override public void removeUpdate(DocumentEvent e) { onChange.run(); }
        @Override public void changedUpdate(DocumentEvent e) { onChange.run(); }
    }
}
