package com.basis.bbj.intellij;

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
        reset();

        // Auto-detect BBj home if stored value is empty
        BbjSettings.State state = BbjSettings.getInstance().getState();
        if (state.bbjHomePath.isEmpty()) {
            String detected = BbjHomeDetector.detectBbjHome();
            if (detected != null) {
                myComponent.setBbjHomePath(detected);
            }
        }

        // Auto-detect Node.js path if stored value is empty
        if (state.nodeJsPath.isEmpty()) {
            String detected = BbjNodeDetector.detectNodePath();
            if (detected != null) {
                myComponent.setNodeJsPath(detected);
            }
        }

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
            || !Objects.equals(myComponent.getClasspathEntry(), state.classpathEntry);
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

        // Refresh editor notifications so banners update immediately
        for (var project : ProjectManager.getInstance().getOpenProjects()) {
            EditorNotifications.getInstance(project).updateAllNotifications();
        }
    }

    @Override
    public void reset() {
        if (myComponent == null) {
            return;
        }
        BbjSettings.State state = BbjSettings.getInstance().getState();
        myComponent.setBbjHomePath(state.bbjHomePath);
        myComponent.setNodeJsPath(state.nodeJsPath);
        myComponent.setClasspathEntry(state.classpathEntry);
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
