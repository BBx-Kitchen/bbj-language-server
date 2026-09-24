package com.basis.bbj.intellij;

import com.basis.bbj.intellij.lsp.CompilerInitOptions;
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
            || InteropPortSettings.portSettingModified(state.javaInteropPortAutoDetect, state.javaInteropPort,
                myComponent.isJavaInteropPortAutoDetect(), myComponent.getJavaInteropPort())
            || !Objects.equals(myComponent.getConfigPath(), state.configPath)
            || !Objects.equals(myComponent.getCompilerOutputDirectory(), state.compilerOutputDirectory)
            || !Objects.equals(myComponent.getCompilerTrigger(), CompilerInitOptions.normalizeTrigger(state.compilerTrigger))
            || !Objects.equals(myComponent.getEmUrl(), state.emUrl)
            || state.autoSaveBeforeRun != myComponent.isAutoSaveBeforeRun();
    }

    @Override
    public void apply() {
        if (myComponent == null) {
            return;
        }
        // Flush any BBj-home lookup still pending from the debounce window, so a classpath
        // entry read right below reflects the live home-field text rather than a value left
        // over from before the last keystroke.
        myComponent.flushPendingHomeLookup();

        BbjSettings.State state = BbjSettings.getInstance().getState();
        // Captured before any assignment: portToPersist takes the currently persisted value as
        // an argument, so writing either port field first would feed it the value it is about
        // to produce.
        int storedJavaInteropPort = state.javaInteropPort;
        state.bbjHomePath = myComponent.getBbjHomePath();
        state.nodeJsPath = myComponent.getNodeJsPath();
        state.classpathEntry = myComponent.getClasspathEntry();
        state.logLevel = myComponent.getLogLevel();
        state.javaInteropHost = myComponent.getJavaInteropHost();
        state.javaInteropPort = InteropPortSettings.portToPersist(
                myComponent.isJavaInteropPortAutoDetect(), myComponent.getJavaInteropPort(), storedJavaInteropPort);
        state.javaInteropPortAutoDetect = myComponent.isJavaInteropPortAutoDetect();
        state.configPath = myComponent.getConfigPath();
        state.compilerOutputDirectory = myComponent.getCompilerOutputDirectory();
        state.compilerTrigger = myComponent.getCompilerTrigger();
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

        // Load java-interop port through the single effective-port accessor. The dialog resolves
        // detection once through the stat-keyed cache and hands the component the lookup plus a
        // precomputed auto-detect port -- the component performs no lookup of its own.
        //
        // This lookup does run on the EDT, since reset() itself is an EDT callback the platform
        // invokes when the Settings dialog opens. Deliberately left inline rather than pushed to
        // a background thread: BbjInteropPortCache.lookup() is a stat-keyed cache -- one
        // File.isFile()/lastModified()/length() stat per dialog open, with the (already cheap)
        // Properties#load skipped entirely unless that stat changed since the last lookup -- not
        // a directory scan or a network call. Moving it off-thread would mean populating this one
        // field asynchronously after the rest of the dialog is already showing, which trades a
        // sub-millisecond stat for a visible flicker and a new race between this callback and a
        // user who edits the field, or clicks Cancel, before it resolves.
        BbjInteropPortDetector.PortLookup javaInteropPortLookup =
                BbjInteropPortCache.SESSION.lookup(state.bbjHomePath);
        myComponent.setJavaInteropPortDetection(
                InteropPortSettings.effectivePort(true, state.javaInteropPort, javaInteropPortLookup),
                javaInteropPortLookup);
        myComponent.setJavaInteropPort(BbjSettings.getInstance().getEffectiveJavaInteropPort());
        myComponent.setJavaInteropPortAutoDetect(state.javaInteropPortAutoDetect);

        // Load config.bbx path
        myComponent.setConfigPath(state.configPath != null ? state.configPath : "");

        // Load compile output directory (#571)
        myComponent.setCompilerOutputDirectory(
            state.compilerOutputDirectory != null ? state.compilerOutputDirectory : "");

        // Load compiler check trigger, normalizing a hand-edited or unrecognised value to debounced
        myComponent.setCompilerTrigger(CompilerInitOptions.normalizeTrigger(state.compilerTrigger));

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
