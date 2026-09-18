package com.basis.bbj.intellij.composer;

import com.intellij.ui.components.JBLabel;
import com.intellij.util.ui.JBUI;
import com.intellij.util.ui.NamedColorUtil;
import com.intellij.util.ui.UIUtil;

import javax.swing.JComponent;
import javax.swing.JPanel;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;

/**
 * The one home for the composer Swing rendering helpers duplicated across the six composer
 * dialogs and the three schematic panels (#619): a fix to the labeled-field layout, the
 * error-row layout, the small error label, the enable/disable cascade, the schematic-panel text
 * clip, or the stalled-preview label is written once here instead of once per call site.
 */
public final class ComposerSwingHelpers {

    private ComposerSwingHelpers() {
    }

    /** A field with its label stacked above it, {@code label} in {@link BorderLayout#NORTH}. */
    static JPanel labeled(String label, JComponent field) {
        JPanel panel = new JPanel(new BorderLayout(0, JBUI.scale(2)));
        panel.add(new JBLabel(label), BorderLayout.NORTH);
        panel.add(field, BorderLayout.CENTER);
        return panel;
    }

    /**
     * The composer's one error colour. {@link NamedColorUtil#getErrorForeground()} resolves
     * against the platform version this module compiles and runs against, so no
     * {@code JBColor.namedColor} fallback is needed. Theme-aware -- this is what makes error text
     * render correctly in both Light and Darcula, replacing every prior copy's hardcoded
     * {@code new Color(0xC0392B)} (#619).
     */
    static Color errorForeground() {
        return NamedColorUtil.getErrorForeground();
    }

    /**
     * The small error label every field-validating dialog places under a field. The initial
     * {@code " "} (not empty) keeps the label's height stable, so the form does not jump when an
     * error appears or clears.
     */
    static JBLabel errorLabel() {
        JBLabel label = new JBLabel(" ");
        label.setComponentStyle(UIUtil.ComponentStyle.SMALL);
        label.setForeground(errorForeground());
        return label;
    }

    /** Like {@link #labeled(String, JComponent)}, with a red error label under the field (#623). */
    static JPanel labeledWithError(String label, JComponent field, JBLabel error) {
        JPanel panel = new JPanel(new BorderLayout(0, JBUI.scale(2)));
        panel.add(new JBLabel(label), BorderLayout.NORTH);
        panel.add(field, BorderLayout.CENTER);
        panel.add(error, BorderLayout.SOUTH);
        return panel;
    }

    /** Recursively enables/disables {@code c} and every descendant {@link JComponent}. */
    static void setEnabledRecursive(JComponent c, boolean enabled) {
        c.setEnabled(enabled);
        for (Component child : c.getComponents()) {
            if (child instanceof JComponent) {
                setEnabledRecursive((JComponent) child, enabled);
            }
        }
    }
}
