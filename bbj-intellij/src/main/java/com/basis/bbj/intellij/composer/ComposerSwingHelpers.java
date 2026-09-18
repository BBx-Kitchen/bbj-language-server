package com.basis.bbj.intellij.composer;

import com.intellij.ui.components.JBLabel;
import com.intellij.util.ui.JBUI;

import javax.swing.JComponent;
import javax.swing.JPanel;
import java.awt.BorderLayout;

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
}
