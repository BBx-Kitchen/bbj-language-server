package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.CatalogItem;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxPreview;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxPreviewInput;
import com.basis.bbj.intellij.composer.ComposerModels.MsgboxPreviewParams;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.ComboBox;
import com.intellij.openapi.ui.DialogWrapper;
import com.intellij.ui.SimpleListCellRenderer;
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
import java.awt.FlowLayout;
import java.awt.GridLayout;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Swing composer for {@code MSGBOX()} (#426/#433): pick icon / button set / default button / flags
 * and message/title, and the language server encodes the numeric {@code expr}, composes the
 * statement, and validates the string fields ({@code bbj/composer/msgbox/preview}). Create flow —
 * inserts a fresh {@code MSGBOX(...)} statement.
 */
public final class MsgboxComposerDialog extends DialogWrapper {
    private static final int CUSTOM_BUTTON_SET = 7;

    private final BbjComposerServer server;
    private final MsgboxCatalogs catalogs;
    private final boolean editMode;
    private final ComposerModels.MsgboxPreviewInput initial;
    private final List<String> trailingArgs;
    private final AtomicInteger seq = new AtomicInteger();
    private JPanel assignToRow;

    private final JBTextField message = new JBTextField("\"Message\"");
    private final JBTextField titleField = new JBTextField();
    private final JBTextField assignTo = new JBTextField("ret!");
    private final ComboBox<CatalogItem> icon = new ComboBox<>();
    private final ComboBox<CatalogItem> buttonSet = new ComboBox<>();
    private final ComboBox<CatalogItem> defaultButton = new ComboBox<>();
    private final Map<Long, JBCheckBox> flagChecks = new LinkedHashMap<>();
    private final JBTextField[] customButtons = { new JBTextField(), new JBTextField(), new JBTextField() };
    private JPanel customPanel;

    private final MsgboxSchematicPanel schematic = new MsgboxSchematicPanel();
    private final JBTextField statementField = new JBTextField();
    private final JBLabel summary = new JBLabel();
    private final JBLabel messageError = errorLabel();
    private final JBLabel titleError = errorLabel();
    private final JBLabel customError = errorLabel();

    private volatile String statement = "";

    public MsgboxComposerDialog(@Nullable Project project, @NotNull BbjComposerServer server, @NotNull MsgboxCatalogs catalogs,
                               @Nullable ComposerModels.MsgboxPreviewInput initial, boolean editMode, @Nullable List<String> trailingArgs) {
        super(project);
        this.server = server;
        this.catalogs = catalogs;
        this.initial = initial;
        this.editMode = editMode;
        this.trailingArgs = trailingArgs;
        setTitle(editMode ? "Configure MSGBOX" : "Compose MSGBOX");
        setOKButtonText(editMode ? "Apply" : "Insert");
        init();
        if (initial != null) {
            prefill(initial);
        }
        refresh();
    }

    @Override
    protected @Nullable JComponent createCenterPanel() {
        JPanel root = new JPanel();
        root.setLayout(new BoxLayout(root, BoxLayout.Y_AXIS));

        JPanel preview = new JPanel(new FlowLayout(FlowLayout.CENTER));
        preview.add(schematic);
        root.add(preview);

        statementField.setEditable(false);
        root.add(labeled("Generated statement", statementField));
        summary.setComponentStyle(UIUtil.ComponentStyle.SMALL);
        root.add(summary);
        root.add(Box.createVerticalStrut(JBUI.scale(8)));

        root.add(labeled("Message expression", message));
        root.add(messageError);
        root.add(labeled("Title expression (optional)", titleField));
        root.add(titleError);
        assignToRow = labeled("Assign result to (optional)", assignTo);
        assignToRow.setVisible(!editMode); // in edit mode the assignment lives outside the replaced call span
        root.add(assignToRow);

        fillCombo(icon, catalogs.icons);
        fillCombo(buttonSet, catalogs.buttonSets);
        fillCombo(defaultButton, catalogs.defaultButtons);
        JPanel combos = new JPanel(new GridLayout(0, 3, JBUI.scale(6), JBUI.scale(4)));
        combos.add(labeled("Icon", icon));
        combos.add(labeled("Buttons", buttonSet));
        combos.add(labeled("Default button", defaultButton));
        root.add(combos);

        // Custom button labels — only meaningful for the "Custom" button set.
        customPanel = new JPanel();
        customPanel.setLayout(new BoxLayout(customPanel, BoxLayout.Y_AXIS));
        customPanel.setBorder(BorderFactory.createTitledBorder("Custom button labels"));
        for (JBTextField cb : customButtons) {
            customPanel.add(cb);
            cb.getDocument().addDocumentListener(new SimpleDocumentListener(this::refresh));
        }
        customPanel.add(customError);
        root.add(customPanel);

        JPanel flags = new JPanel();
        flags.setLayout(new BoxLayout(flags, BoxLayout.Y_AXIS));
        flags.setBorder(BorderFactory.createTitledBorder("Extra options"));
        for (CatalogItem it : catalogs.flags) {
            JBCheckBox cb = new JBCheckBox(it.label);
            cb.addActionListener(e -> refresh());
            flagChecks.put(it.value, cb);
            flags.add(cb);
        }
        root.add(flags);

        buttonSet.addActionListener(e -> { updateCustomVisibility(); refresh(); });
        icon.addActionListener(e -> refresh());
        defaultButton.addActionListener(e -> refresh());
        message.getDocument().addDocumentListener(new SimpleDocumentListener(this::refresh));
        titleField.getDocument().addDocumentListener(new SimpleDocumentListener(this::refresh));
        assignTo.getDocument().addDocumentListener(new SimpleDocumentListener(this::refresh));
        updateCustomVisibility();
        return root;
    }

    private void updateCustomVisibility() {
        customPanel.setVisible(value(buttonSet) == CUSTOM_BUTTON_SET);
    }

    /** Prefill the controls from a decoded call (edit-in-place). */
    private void prefill(ComposerModels.MsgboxPreviewInput in) {
        message.setText(in.message == null ? "" : in.message);
        titleField.setText(in.title == null ? "" : in.title);
        selectByValue(icon, in.icon);
        selectByValue(buttonSet, in.buttonSet);
        selectByValue(defaultButton, in.defaultButton);
        List<Long> flags = in.flags == null ? List.of() : in.flags;
        for (Map.Entry<Long, JBCheckBox> e : flagChecks.entrySet()) {
            e.getValue().setSelected(flags.contains(e.getKey()));
        }
        List<String> custom = in.customButtons == null ? List.of() : in.customButtons;
        for (int i = 0; i < customButtons.length; i++) {
            customButtons[i].setText(i < custom.size() ? custom.get(i) : "");
        }
        updateCustomVisibility();
    }

    private static void selectByValue(ComboBox<CatalogItem> combo, long value) {
        for (int i = 0; i < combo.getItemCount(); i++) {
            if (combo.getItemAt(i).value == value) {
                combo.setSelectedIndex(i);
                return;
            }
        }
    }

    private void refresh() {
        MsgboxPreviewInput input = new MsgboxPreviewInput();
        input.message = message.getText();
        input.title = titleField.getText();
        input.assignTo = assignTo.getText();
        input.buttonSet = value(buttonSet);
        input.icon = value(icon);
        input.defaultButton = value(defaultButton);
        input.flags = selectedFlags();
        List<String> custom = new ArrayList<>();
        for (JBTextField cb : customButtons) {
            custom.add(cb.getText());
        }
        input.customButtons = custom;
        input.editMode = editMode;
        input.trailingArgs = trailingArgs;

        int mySeq = seq.incrementAndGet();
        server.msgboxPreview(new MsgboxPreviewParams(input)).thenAccept(preview ->
                ApplicationManager.getApplication().invokeLater(() -> {
                    if (mySeq == seq.get() && preview != null) {
                        apply(preview);
                    }
                }, ModalityState.any()));
    }

    private void apply(MsgboxPreview p) {
        statement = p.statement;
        statementField.setText(p.statement);
        summary.setText("expr = " + p.expr + "   ·   " + p.summary);
        messageError.setText(p.messageError == null ? " " : p.messageError);
        titleError.setText(p.titleError == null ? " " : p.titleError);
        customError.setText(p.customError == null ? " " : p.customError);
        schematic.setRender(p.render);
        setOKActionEnabled(p.valid);
    }

    private List<Long> selectedFlags() {
        List<Long> out = new ArrayList<>();
        for (Map.Entry<Long, JBCheckBox> e : flagChecks.entrySet()) {
            if (e.getValue().isSelected()) {
                out.add(e.getKey());
            }
        }
        return out;
    }

    private static int value(ComboBox<CatalogItem> combo) {
        CatalogItem item = (CatalogItem) combo.getSelectedItem();
        return item == null ? 0 : (int) item.value;
    }

    private static void fillCombo(ComboBox<CatalogItem> combo, List<CatalogItem> items) {
        for (CatalogItem it : items) {
            combo.addItem(it);
        }
        combo.setRenderer(SimpleListCellRenderer.create("", it -> it.label + "  (" + it.value + ")"));
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

    public @NotNull String getStatement() {
        return statement;
    }

    private record SimpleDocumentListener(Runnable onChange) implements DocumentListener {
        @Override public void insertUpdate(DocumentEvent e) { onChange.run(); }
        @Override public void removeUpdate(DocumentEvent e) { onChange.run(); }
        @Override public void changedUpdate(DocumentEvent e) { onChange.run(); }
    }
}
