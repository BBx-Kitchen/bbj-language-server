package com.basis.bbj.intellij;

import com.basis.bbj.intellij.concurrency.AlarmScheduler;
import com.basis.bbj.intellij.concurrency.KeystrokeDebouncer;
import com.basis.bbj.intellij.concurrency.Scheduler;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.fileChooser.FileChooserDescriptor;
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
import java.util.ArrayList;
import java.util.List;

/**
 * Swing UI panel for the BBj settings page.
 * Contains three sections: BBj Environment, Node.js Runtime, and Classpath.
 * <p>
 * Every keystroke in the BBj home / Node.js path fields only schedules a debounced background
 * lookup (D-12) — the fields' {@code DocumentAdapter}s and {@code ComponentValidator}s perform no
 * filesystem or subprocess work of their own; that work lives entirely in
 * {@link BbjSettingsLookups}, called only from {@link #nodeDebouncer}/{@link #homeDebouncer}.
 */
public class BbjSettingsComponent {

    private static final long DEBOUNCE_MS = 300L;

    private final JPanel mainPanel;
    private final TextFieldWithBrowseButton bbjHomeField;
    private final TextFieldWithBrowseButton compilerOutputDirectoryField;
    private final TextFieldWithBrowseButton nodeJsField;
    private final JBLabel nodeVersionLabel;
    private final ComboBox<String> classpathCombo;
    private final ComboBox<String> logLevelCombo;
    private final JBTextField javaInteropHostField;
    private final JTextField javaInteropPortField;
    private final JBTextField configPathField;
    private final JBTextField emUrlField;
    private final JCheckBox autoSaveCheckbox;

    private final Scheduler lookupScheduler;
    private final KeystrokeDebouncer<BbjSettingsLookups.NodeLookup> nodeDebouncer;
    private final KeystrokeDebouncer<BbjSettingsLookups.HomeLookup> homeDebouncer;

    private volatile BbjSettingsLookups.NodeLookup lastNodeLookup;
    private volatile BbjSettingsLookups.HomeLookup lastHomeLookup;
    private String pendingClasspathSelection = "";
    private boolean classpathLookupPending;

    public BbjSettingsComponent(@NotNull Disposable parentDisposable) {
        lookupScheduler = new AlarmScheduler(parentDisposable);

        // --- BBj Home field ---
        bbjHomeField = new TextFieldWithBrowseButton();
        var bbjFolderDescriptor = FileChooserDescriptorFactory.createSingleFolderDescriptor()
                .withTitle("Select BBj Home Directory")
                .withDescription("Choose the root directory of your BBj installation");
        bbjHomeField.addBrowseFolderListener(new TextBrowseFolderListener(bbjFolderDescriptor, null));

        new ComponentValidator(parentDisposable)
            .withValidator(() -> {
                String path = bbjHomeField.getText().trim();
                BbjSettingsLookups.HomeLookup lookup = lastHomeLookup;
                if (path.isEmpty() || lookup == null || !lookup.path().equals(path)) {
                    return null;
                }
                if (!lookup.valid()) {
                    return new ValidationInfo(
                        "BBj.properties not found in " + path + "/cfg/",
                        bbjHomeField
                    );
                }
                return null;
            })
            .installOn(bbjHomeField.getTextField());

        // --- Compile output directory field (#571) ---
        // A plain string field: no listener, no debounced lookup, no validator. Path validation
        // is deliberately left to bbjcpl's own failure surfaced through the language server
        //; this component performs no filesystem work on it.
        compilerOutputDirectoryField = new TextFieldWithBrowseButton();
        var compilerOutputFolderDescriptor = FileChooserDescriptorFactory.createSingleFolderDescriptor()
                .withTitle("Select Compile Output Directory")
                .withDescription("Choose the directory bbjcpl writes tokenized output to");
        compilerOutputDirectoryField.addBrowseFolderListener(
                new TextBrowseFolderListener(compilerOutputFolderDescriptor, null));
        ((JBTextField) compilerOutputDirectoryField.getTextField()).getEmptyText()
                .setText("Required for \"Compile BBj File\" to run");

        // --- Node.js field ---
        nodeJsField = new TextFieldWithBrowseButton();
        var nodeFileDescriptor = new FileChooserDescriptor(true, false, false, false, false, false)
                .withTitle("Select Node.js Executable")
                .withDescription("Choose the Node.js binary");
        nodeJsField.addBrowseFolderListener(new TextBrowseFolderListener(nodeFileDescriptor, null));

        nodeVersionLabel = new JBLabel(" ");

        new ComponentValidator(parentDisposable)
            .withValidator(() -> {
                String path = nodeJsField.getText().trim();
                BbjSettingsLookups.NodeLookup lookup = lastNodeLookup;
                if (path.isEmpty() || lookup == null || !lookup.path().equals(path)) {
                    return null;
                }
                if (!lookup.exists()) {
                    return new ValidationInfo("File not found: " + path, nodeJsField);
                }
                if (!lookup.meetsMinimum()) {
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

        // --- Debounced background lookups (D-12) ---
        nodeDebouncer = new KeystrokeDebouncer<>(
            lookupScheduler,
            () -> ApplicationManager.getApplication().isDispatchThread(),
            DEBOUNCE_MS,
            () -> nodeJsField.getText().trim(),
            ApplicationManager.getApplication()::invokeLater,
            BbjSettingsLookups::lookupNode,
            this::applyNodeLookup
        );
        homeDebouncer = new KeystrokeDebouncer<>(
            lookupScheduler,
            () -> ApplicationManager.getApplication().isDispatchThread(),
            DEBOUNCE_MS,
            () -> bbjHomeField.getText().trim(),
            ApplicationManager.getApplication()::invokeLater,
            BbjSettingsLookups::lookupHome,
            this::applyHomeLookup
        );

        // --- Wire document listeners: schedule only, no filesystem/subprocess work here ---
        bbjHomeField.getTextField().getDocument().addDocumentListener(new DocumentAdapter() {
            @Override
            protected void textChanged(@NotNull DocumentEvent e) {
                classpathLookupPending = true;
                classpathCombo.setEnabled(false);
                classpathCombo.setModel(new CollectionComboBoxModel<>(
                    List.of("(set BBj home first)")
                ));
                homeDebouncer.onTextChanged(bbjHomeField.getText().trim());
                ComponentValidator.getInstance(bbjHomeField.getTextField())
                    .ifPresent(ComponentValidator::revalidate);
            }
        });

        nodeJsField.getTextField().getDocument().addDocumentListener(new DocumentAdapter() {
            @Override
            protected void textChanged(@NotNull DocumentEvent e) {
                String path = nodeJsField.getText().trim();
                nodeVersionLabel.setText(path.isEmpty() ? " " : "Checking Node.js version…");
                nodeDebouncer.onTextChanged(path);
                ComponentValidator.getInstance(nodeJsField.getTextField())
                    .ifPresent(ComponentValidator::revalidate);
            }
        });

        // --- Build form layout ---
        mainPanel = FormBuilder.createFormBuilder()
            .addComponent(new TitledSeparator("BBj Environment"))
            .addLabeledComponent(new JBLabel("BBj home:"), bbjHomeField, 1, false)
            .addLabeledComponent(new JBLabel("config.bbx Path:"), configPathField, 1, false)

            .addComponent(new TitledSeparator("BBj Compiler"))
            .addLabeledComponent(new JBLabel("Compile output directory:"), compilerOutputDirectoryField, 1, false)

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
     * Applies a background classpath-dropdown lookup result (replaces the former
     * synchronous {@code updateClasspathDropdown}). Called only via {@link #homeDebouncer}'s
     * {@code UiThread} hook, after the staleness check already passed.
     */
    private void applyHomeLookup(BbjSettingsLookups.HomeLookup lookup) {
        lastHomeLookup = lookup;
        classpathLookupPending = false;
        if (!lookup.valid()) {
            classpathCombo.setEnabled(false);
            classpathCombo.setModel(new CollectionComboBoxModel<>(
                List.of("(set BBj home first)")
            ));
        } else {
            List<String> items = new ArrayList<>();
            items.add(""); // empty default/no-selection option
            items.addAll(lookup.entries());
            classpathCombo.setEnabled(true);
            classpathCombo.setModel(new CollectionComboBoxModel<>(items));
            classpathCombo.setSelectedItem(pendingClasspathSelection);
        }
        ComponentValidator.getInstance(bbjHomeField.getTextField())
            .ifPresent(ComponentValidator::revalidate);
    }

    /**
     * Applies a background Node-version lookup result (replaces the former
     * synchronous {@code updateNodeVersionLabel}). Called only via {@link #nodeDebouncer}'s
     * {@code UiThread} hook, after the staleness check already passed.
     */
    private void applyNodeLookup(BbjSettingsLookups.NodeLookup lookup) {
        lastNodeLookup = lookup;
        if (!lookup.exists()) {
            nodeVersionLabel.setText(" ");
        } else if (lookup.version() == null) {
            nodeVersionLabel.setText("Could not detect Node.js version");
        } else if (!lookup.meetsMinimum()) {
            nodeVersionLabel.setText("Version too old (minimum: 18), detected: " + lookup.version());
        } else {
            nodeVersionLabel.setText("Detected: " + lookup.version());
        }
        ComponentValidator.getInstance(nodeJsField.getTextField())
            .ifPresent(ComponentValidator::revalidate);
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
        if (classpathLookupPending) {
            return pendingClasspathSelection;
        }
        Object selected = classpathCombo.getSelectedItem();
        if (selected == null || "(set BBj home first)".equals(selected)) {
            return "";
        }
        return selected.toString();
    }

    /**
     * Synchronously runs the BBj-home lookup and applies its result if one is still pending,
     * so a caller reading {@link #getClasspathEntry()} right afterward sees a classpath value
     * derived from the live home-field text rather than whatever was pending before the last
     * keystroke's debounce window elapses. Intended to be called from the Configurable's
     * {@code apply()}, immediately before it reads {@link #getClasspathEntry()}, so that
     * pressing Apply/OK within the debounce window after typing a new BBj home path does not
     * persist a classpath entry left over from the previous home path.
     */
    void flushPendingHomeLookup() {
        if (!classpathLookupPending) {
            return;
        }
        applyHomeLookup(BbjSettingsLookups.lookupHome(bbjHomeField.getText().trim()));
    }

    public void setClasspathEntry(@NotNull String entry) {
        pendingClasspathSelection = entry;
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

    public @NotNull String getCompilerOutputDirectory() {
        return compilerOutputDirectoryField.getText().trim();
    }

    public void setCompilerOutputDirectory(@NotNull String path) {
        compilerOutputDirectoryField.setText(path);
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
