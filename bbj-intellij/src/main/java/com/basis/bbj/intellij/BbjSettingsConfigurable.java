package com.basis.bbj.intellij;

import com.basis.bbj.intellij.ui.BbjServerService;
import com.intellij.openapi.Disposable;
import com.intellij.openapi.options.Configurable;
import com.intellij.openapi.project.ProjectManager;
import com.intellij.openapi.util.Disposer;
import com.intellij.ui.EditorNotifications;
import org.jetbrains.annotations.Nls;
import org.jetbrains.annotations.Nullable;

import javax.swing.*;
import java.util.Objects;

/**
 * Settings controller connecting the {@link BbjSettingsComponent} UI to the
 * {@link BbjSettings} persistent state. Registered as an applicationConfigurable
 * under Languages & Frameworks > BBj.
 */
public final class BbjSettingsConfigurable implements Configurable, Disposable {

    private BbjSettingsComponent myComponent;

    @Nls(capitalization = Nls.Capitalization.Title)
    @Override
    public String getDisplayName() {
        return "BBj";
    }

    @Override
    public JComponent getPreferredFocusedComponent() {
        return myComponent != null ? myComponent.getPreferredFocusedComponent() : null;
    }

    @Nullable
    @Override
    public JComponent createComponent() {
        myComponent = new BbjSettingsComponent(this);
        // Don't call reset() here — the platform calls it immediately after createComponent()
        return myComponent.getPanel();
    }

    @Override
    public boolean isModified() {
        if (myComponent == null) {
            return false;
        }
        BbjSettings.State state = BbjSettings.getInstance().getState();
        return !Objects.equals(myComponent.getBbjHomePath(), state.bbjHomePath)
            || !Objects.equals(myComponent.getNodeJsPath(), state.nodeJsPath)
            || !Objects.equals(myComponent.getClasspathEntry(), state.classpathEntry)
            || !Objects.equals(myComponent.getLogLevel(), state.logLevel)
            || !Objects.equals(myComponent.getJavaInteropHost(), state.javaInteropHost)
            || state.javaInteropPort != myComponent.getJavaInteropPort()
            || !Objects.equals(myComponent.getConfigPath(), state.configPath)
            || !Objects.equals(myComponent.getEmUrl(), state.emUrl)
            || state.autoSaveBeforeRun != myComponent.isAutoSaveBeforeRun();
    }

    @Override
    public void apply() {
        if (myComponent == null) {
            return;
        }
        BbjSettings.State state = BbjSettings.getInstance().getState();
        state.bbjHomePath = myComponent.getBbjHomePath();
        state.nodeJsPath = myComponent.getNodeJsPath();
        state.classpathEntry = myComponent.getClasspathEntry();
        state.logLevel = myComponent.getLogLevel();
        state.javaInteropHost = myComponent.getJavaInteropHost();
        state.javaInteropPort = myComponent.getJavaInteropPort();
        state.configPath = myComponent.getConfigPath();
        state.emUrl = myComponent.getEmUrl();
        state.autoSaveBeforeRun = myComponent.isAutoSaveBeforeRun();

        // Refresh editor notifications so banners update immediately
        for (var project : ProjectManager.getInstance().getOpenProjects()) {
            EditorNotifications.getInstance(project).updateAllNotifications();
        }

        // Trigger debounced language server restart
        for (var project : ProjectManager.getInstance().getOpenProjects()) {
            BbjServerService.getInstance(project).scheduleRestart();
        }
    }

    @Override
    public void reset() {
        if (myComponent == null) {
            return;
        }
        BbjSettings.State state = BbjSettings.getInstance().getState();

        // Load persisted values, falling back to auto-detection for empty fields
        String bbjHome = state.bbjHomePath;
        if (bbjHome.isEmpty()) {
            String detected = BbjHomeDetector.detectBbjHome();
            if (detected != null) {
                bbjHome = detected;
            }
        }
        myComponent.setBbjHomePath(bbjHome);

        String nodeJs = state.nodeJsPath;
        if (nodeJs.isEmpty()) {
            String detected = BbjNodeDetector.detectNodePath();
            if (detected != null) {
                nodeJs = detected;
            }
        }
        myComponent.setNodeJsPath(nodeJs);

        myComponent.setClasspathEntry(state.classpathEntry);

        // Set log level, defaulting to "Info" if empty
        String logLevel = state.logLevel;
        if (logLevel == null || logLevel.isEmpty()) {
            logLevel = "Info";
        }
        myComponent.setLogLevel(logLevel);

        // Load java-interop host
        String javaInteropHost = state.javaInteropHost;
        if (javaInteropHost == null || javaInteropHost.isEmpty()) {
            javaInteropHost = "localhost";
        }
        myComponent.setJavaInteropHost(javaInteropHost);

        // Load java-interop port with auto-detection
        int javaInteropPort = state.javaInteropPort;
        if (javaInteropPort == 5008) {
            // Default value -- try auto-detection from BBjServices config
            // Reuse bbjHome from earlier (already includes auto-detection)
            if (!bbjHome.isEmpty()) {
                int detected = BbjSettings.detectJavaInteropPort(bbjHome);
                if (detected != 5008) {
                    javaInteropPort = detected;
                }
            }
        }
        myComponent.setJavaInteropPort(javaInteropPort);

        // Load config.bbx path
        myComponent.setConfigPath(state.configPath != null ? state.configPath : "");

        // Load EM URL and auto-save setting
        myComponent.setEmUrl(state.emUrl != null ? state.emUrl : "");
        myComponent.setAutoSaveBeforeRun(state.autoSaveBeforeRun);
    }

    @Override
    public void disposeUIResources() {
        myComponent = null;
        Disposer.dispose(this);
    }

    @Override
    public void dispose() {
        // ComponentValidators are cleaned up via the Disposable chain
    }
}
