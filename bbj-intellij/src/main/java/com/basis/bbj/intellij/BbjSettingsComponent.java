package com.basis.bbj.intellij;

import com.intellij.openapi.Disposable;
import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory;
import com.intellij.openapi.ui.ComboBox;
import com.intellij.openapi.ui.ComponentValidator;
import com.intellij.openapi.ui.TextFieldWithBrowseButton;
import com.intellij.openapi.ui.ValidationInfo;
import com.intellij.ui.CollectionComboBoxModel;
import com.intellij.ui.DocumentAdapter;
import com.intellij.ui.TitledSeparator;
import com.intellij.ui.components.JBLabel;
import com.intellij.util.ui.FormBuilder;
import org.jetbrains.annotations.NotNull;

import javax.swing.*;
import javax.swing.event.DocumentEvent;
import java.io.File;
import java.util.ArrayList;
import java.util.List;

/**
 * Swing UI panel for the BBj settings page.
 * Contains three sections: BBj Environment, Node.js Runtime, and Classpath.
 */
public class BbjSettingsComponent {

    private final JPanel mainPanel;
    private final TextFieldWithBrowseButton bbjHomeField;
    private final TextFieldWithBrowseButton nodeJsField;
    private final JBLabel nodeVersionLabel;
    private final ComboBox<String> classpathCombo;
    private final ComboBox<String> logLevelCombo;

    public BbjSettingsComponent(@NotNull Disposable parentDisposable) {
        // --- BBj Home field ---
        bbjHomeField = new TextFieldWithBrowseButton();
        bbjHomeField.addBrowseFolderListener(
            "Select BBj Home Directory",
            "Choose the root directory of your BBj installation",
            null,
            FileChooserDescriptorFactory.createSingleFolderDescriptor()
        );

        new ComponentValidator(parentDisposable)
            .withValidator(() -> {
                String path = bbjHomeField.getText().trim();
                if (path.isEmpty()) {
                    return null;
                }
                if (!BbjHomeDetector.isValidBbjHome(path)) {
                    return new ValidationInfo(
                        "BBj.properties not found in " + path + "/cfg/",
                        bbjHomeField
                    );
                }
                return null;
            })
            .installOn(bbjHomeField.getTextField());

        // --- Node.js field ---
        nodeJsField = new TextFieldWithBrowseButton();
        nodeJsField.addBrowseFolderListener(
            "Select Node.js Executable",
            "Choose the Node.js binary",
            null,
            FileChooserDescriptorFactory.createSingleLocalFileDescriptor()
        );

        nodeVersionLabel = new JBLabel(" ");

        new ComponentValidator(parentDisposable)
            .withValidator(() -> {
                String path = nodeJsField.getText().trim();
                if (path.isEmpty()) {
                    return null;
                }
                File file = new File(path);
                if (!file.exists()) {
                    return new ValidationInfo("File not found: " + path, nodeJsField);
                }
                String version = BbjNodeDetector.getNodeVersion(path);
                if (version == null || !BbjNodeDetector.meetsMinimumVersion(version)) {
                    return new ValidationInfo(
                        "Node.js version 18 or higher is required",
                        nodeJsField
                    );
                }
                return null;
            })
            .installOn(nodeJsField.getTextField());

        // --- Classpath dropdown ---
        classpathCombo = new ComboBox<>(new CollectionComboBoxModel<>(
            List.of("(set BBj home first)")
        ));
        classpathCombo.setEnabled(false);

        // --- Log level dropdown ---
        logLevelCombo = new ComboBox<>(new CollectionComboBoxModel<>(
            List.of("Error", "Warn", "Info", "Debug")
        ));
        logLevelCombo.setSelectedItem("Info");

        // --- Wire document listeners ---
        bbjHomeField.getTextField().getDocument().addDocumentListener(new DocumentAdapter() {
            @Override
            protected void textChanged(@NotNull DocumentEvent e) {
                ComponentValidator.getInstance(bbjHomeField.getTextField())
                    .ifPresent(ComponentValidator::revalidate);
                updateClasspathDropdown(bbjHomeField.getText().trim());
            }
        });

        nodeJsField.getTextField().getDocument().addDocumentListener(new DocumentAdapter() {
            @Override
            protected void textChanged(@NotNull DocumentEvent e) {
                ComponentValidator.getInstance(nodeJsField.getTextField())
                    .ifPresent(ComponentValidator::revalidate);
                updateNodeVersionLabel(nodeJsField.getText().trim());
            }
        });

        // --- Build form layout ---
        mainPanel = FormBuilder.createFormBuilder()
            .addComponent(new TitledSeparator("BBj Environment"))
            .addLabeledComponent(new JBLabel("BBj home:"), bbjHomeField, 1, false)

            .addComponent(new TitledSeparator("Node.js Runtime"))
            .addLabeledComponent(new JBLabel("Node.js path:"), nodeJsField, 1, false)
            .addComponent(nodeVersionLabel)

            .addComponent(new TitledSeparator("Classpath"))
            .addLabeledComponent(new JBLabel("Classpath entry:"), classpathCombo, 1, false)

            .addComponent(new TitledSeparator("Language Server"))
            .addLabeledComponent(new JBLabel("Log level:"), logLevelCombo, 1, false)

            .addComponentFillVertically(new JPanel(), 0)
            .getPanel();
    }

    /**
     * Updates the classpath dropdown based on the given BBj home path.
     * Disables the combo and shows placeholder when path is empty or invalid.
     */
    private void updateClasspathDropdown(@NotNull String bbjHomePath) {
        if (bbjHomePath.isEmpty() || !BbjHomeDetector.isValidBbjHome(bbjHomePath)) {
            classpathCombo.setEnabled(false);
            classpathCombo.setModel(new CollectionComboBoxModel<>(
                List.of("(set BBj home first)")
            ));
            return;
        }

        List<String> entries = BbjSettings.getBBjClasspathEntries(bbjHomePath);
        List<String> items = new ArrayList<>();
        items.add(""); // empty default/no-selection option
        items.addAll(entries);

        classpathCombo.setEnabled(true);
        classpathCombo.setModel(new CollectionComboBoxModel<>(items));
    }

    /**
     * Updates the Node.js version label based on the given path.
     */
    private void updateNodeVersionLabel(@NotNull String nodePath) {
        if (nodePath.isEmpty()) {
            nodeVersionLabel.setText(" ");
            return;
        }
        File file = new File(nodePath);
        if (!file.exists()) {
            nodeVersionLabel.setText(" ");
            return;
        }
        String version = BbjNodeDetector.getNodeVersion(nodePath);
        if (version == null) {
            nodeVersionLabel.setText("Could not detect Node.js version");
        } else if (!BbjNodeDetector.meetsMinimumVersion(version)) {
            nodeVersionLabel.setText("Version too old (minimum: 18), detected: " + version);
        } else {
            nodeVersionLabel.setText("Detected: " + version);
        }
    }

    public JPanel getPanel() {
        return mainPanel;
    }

    public JComponent getPreferredFocusedComponent() {
        return bbjHomeField.getTextField();
    }

    public @NotNull String getBbjHomePath() {
        return bbjHomeField.getText().trim();
    }

    public void setBbjHomePath(@NotNull String path) {
        bbjHomeField.setText(path);
    }

    public @NotNull String getNodeJsPath() {
        return nodeJsField.getText().trim();
    }

    public void setNodeJsPath(@NotNull String path) {
        nodeJsField.setText(path);
    }

    public @NotNull String getClasspathEntry() {
        Object selected = classpathCombo.getSelectedItem();
        if (selected == null || "(set BBj home first)".equals(selected)) {
            return "";
        }
        return selected.toString();
    }

    public void setClasspathEntry(@NotNull String entry) {
        classpathCombo.setSelectedItem(entry);
    }

    public @NotNull String getLogLevel() {
        Object selected = logLevelCombo.getSelectedItem();
        return selected != null ? selected.toString() : "Info";
    }

    public void setLogLevel(@NotNull String level) {
        logLevelCombo.setSelectedItem(level);
    }
}
