package com.basis.bbj.intellij.composer;

import com.intellij.ui.components.JBLabel;
import com.intellij.ui.components.JBTextArea;
import com.intellij.util.ui.JBUI;
import com.intellij.util.ui.NamedColorUtil;
import com.intellij.util.ui.UIUtil;

import javax.swing.JComponent;
import javax.swing.JPanel;
import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Component;
import java.awt.FontMetrics;
import java.awt.Graphics2D;

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

    /**
     * Clips {@code s} to fit within {@code maxWidth} pixels under {@code g}'s current font,
     * appending an ellipsis when truncated. Caches {@link Graphics2D#getFontMetrics()} into a
     * local variable and reuses it across the width comparisons -- a deliberate pick between two
     * behaviourally equivalent copies the three schematic panels carried (one cached the accessor,
     * two called it fresh on every reference); the cached form avoids a repeated accessor call
     * inside a per-glyph loop (#619).
     */
    static String clip(Graphics2D g, String s, int maxWidth) {
        FontMetrics fm = g.getFontMetrics();
        if (fm.stringWidth(s) <= maxWidth) {
            return s;
        }
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            if (fm.stringWidth(sb.toString() + s.charAt(i) + "…") > maxWidth) {
                break;
            }
            sb.append(s.charAt(i));
        }
        return sb + "…";
    }

    private static String previewUnavailableText(String reason) {
        return "Preview unavailable — " + reason;
    }

    /**
     * Labels a stalled preview in the composer's error colour instead of default gray (#619,
     * closes 82-UI-REVIEW priority fix #1), so a dialog that cannot preview is visibly distinct
     * from one that can. Never touches OK's enabled state -- the caller's own wrapper keeps that
     * gating decision visible per dialog.
     */
    static void previewUnavailable(JBLabel target, String reason) {
        target.setText(previewUnavailableText(reason));
        target.setForeground(errorForeground());
    }

    /** Like {@link #previewUnavailable(JBLabel, String)}, for the one dialog whose target is a text area. */
    static void previewUnavailable(JBTextArea target, String reason) {
        target.setText(previewUnavailableText(reason));
        target.setForeground(errorForeground());
    }
}
