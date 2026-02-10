package com.basis.bbj.intellij;

import com.intellij.openapi.Disposable;
import com.intellij.openapi.fileChooser.FileChooserDescriptorFactory;
import com.intellij.openapi.ui.ComboBox;
import com.intellij.openapi.ui.ComponentValidator;
import com.intellij.openapi.ui.TextBrowseFolderListener;
import com.intellij.openapi.ui.TextFieldWithBrowseButton;
import com.intellij.openapi.ui.ValidationInfo;
import com.intellij.ui.CollectionComboBoxModel;
import com.intellij.ui.DocumentAdapter;
import com.intellij.ui.TitledSeparator;
import com.intellij.ui.components.JBLabel;
import com.intellij.ui.components.JBTextField;
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
    private final JBTextField javaInteropHostField;
    private final JTextField javaInteropPortField;
    private final JBTextField configPathField;
    private final JBTextField emUrlField;
    private final JCheckBox autoSaveCheckbox;

    public BbjSettingsComponent(@NotNull Disposable parentDisposable) {
        // --- BBj Home field ---
        bbjHomeField = new TextFieldWithBrowseButton();
        var bbjFolderDescriptor = FileChooserDescriptorFactory.createSingleFolderDescriptor()
                .withTitle("Select BBj Home Directory")
                .withDescription("Choose the root directory of your BBj installation");
        bbjHomeField.addBrowseFolderListener(new TextBrowseFolderListener(bbjFolderDescriptor, null));

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
        var nodeFileDescriptor = FileChooserDescriptorFactory.createSingleFileDescriptor()
                .withTitle("Select Node.js Executable")
                .withDescription("Choose the Node.js binary");
        nodeJsField.addBrowseFolderListener(new TextBrowseFolderListener(nodeFileDescriptor, null));

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

        // --- Config Path field ---
        configPathField = new JBTextField();
        configPathField.getEmptyText().setText("{BBj Home}/cfg/config.bbx (default)");

        // --- Java Interop Host field ---
        javaInteropHostField = new JBTextField();
        javaInteropHostField.setText("localhost");

        // --- Java Interop Port field ---
        javaInteropPortField = new JBTextField();
        javaInteropPortField.setText("5008");

        new ComponentValidator(parentDisposable)
            .withValidator(() -> {
                String text = javaInteropPortField.getText().trim();
                if (text.isEmpty()) {
                    return null; // Empty is valid, will use default 5008
                }
                try {
                    int port = Integer.parseInt(text);
                    if (port < 1 || port > 65535) {
                        return new ValidationInfo("Port must be between 1 and 65535", javaInteropPortField);
                    }
                } catch (NumberFormatException e) {
                    return new ValidationInfo("Port must be a valid number", javaInteropPortField);
                }
                return null;
            })
            .installOn(javaInteropPortField);

        // --- EM URL field ---
        emUrlField = new JBTextField();
        emUrlField.getEmptyText().setText("http://localhost:8888");

        // --- Run Commands settings ---
        autoSaveCheckbox = new JCheckBox("Auto-save before run");
        autoSaveCheckbox.setSelected(true);

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
            .addLabeledComponent(new JBLabel("config.bbx Path:"), configPathField, 1, false)

            .addComponent(new TitledSeparator("Node.js Runtime"))
            .addLabeledComponent(new JBLabel("Node.js path:"), nodeJsField, 1, false)
            .addComponent(nodeVersionLabel)

            .addComponent(new TitledSeparator("Classpath"))
            .addLabeledComponent(new JBLabel("Classpath entry:"), classpathCombo, 1, false)

            .addComponent(new TitledSeparator("Language Server"))
            .addLabeledComponent(new JBLabel("Log level:"), logLevelCombo, 1, false)

            .addComponent(new TitledSeparator("Java Interop"))
            .addLabeledComponent(new JBLabel("Host:"), javaInteropHostField, 1, false)
            .addLabeledComponent(new JBLabel("Port:"), javaInteropPortField, 1, false)

            .addComponent(new TitledSeparator("Enterprise Manager"))
            .addLabeledComponent(new JBLabel("EM URL:"), emUrlField, 1, false)

            .addComponent(new TitledSeparator("Run Commands"))
            .addComponent(autoSaveCheckbox)

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

    public @NotNull String getJavaInteropHost() {
        return javaInteropHostField.getText().trim();
    }

    public void setJavaInteropHost(@NotNull String host) {
        javaInteropHostField.setText(host);
    }

    public int getJavaInteropPort() {
        String text = javaInteropPortField.getText().trim();
        if (text.isEmpty()) {
            return 5008; // Default when empty
        }
        try {
            return Integer.parseInt(text);
        } catch (NumberFormatException e) {
            return 5008; // Default when invalid
        }
    }

    public void setJavaInteropPort(int port) {
        javaInteropPortField.setText(String.valueOf(port));
    }

    public @NotNull String getConfigPath() {
        return configPathField.getText().trim();
    }

    public void setConfigPath(@NotNull String path) {
        configPathField.setText(path);
    }

    public @NotNull String getEmUrl() {
        return emUrlField.getText().trim();
    }

    public void setEmUrl(@NotNull String url) {
        emUrlField.setText(url);
    }

    public boolean isAutoSaveBeforeRun() {
        return autoSaveCheckbox.isSelected();
    }

    public void setAutoSaveBeforeRun(boolean autoSave) {
        autoSaveCheckbox.setSelected(autoSave);
    }
}
