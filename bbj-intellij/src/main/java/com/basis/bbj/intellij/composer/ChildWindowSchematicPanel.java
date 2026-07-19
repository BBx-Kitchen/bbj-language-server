package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.ChildWindowRender;
import com.intellij.ui.JBColor;
import com.intellij.util.ui.JBUI;

import javax.swing.JPanel;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;

/**
 * Custom-painted schematic preview of a child window inside its parent frame — the IntelliJ
 * counterpart of the VS Code webview's HTML mock for addChildWindow (#473). Driven entirely by a
 * {@link ChildWindowRender} descriptor computed by the language server, so no flag logic lives here.
 */
public final class ChildWindowSchematicPanel extends JPanel {
    private ChildWindowRender render;

    public ChildWindowSchematicPanel() {
        setPreferredSize(new Dimension(JBUI.scale(320), JBUI.scale(200)));
        setOpaque(false);
    }

    public void setRender(ChildWindowRender render) {
        this.render = render;
        repaint();
    }

    @Override
    protected void paintComponent(Graphics g0) {
        super.paintComponent(g0);
        if (render == null) {
            return;
        }
        Graphics2D g = (Graphics2D) g0.create();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        int pad = JBUI.scale(10);
        int x = pad, y = pad;
        int w = getWidth() - 2 * pad;
        int h = getHeight() - 2 * pad;

        Color frame = JBColor.namedColor("Component.borderColor", JBColor.GRAY);
        Color titleBg = JBColor.namedColor("TitlePane.background", new JBColor(new Color(0xE3E3E3), new Color(0x3C3F41)));
        Color bodyBg = JBColor.namedColor("EditorPane.background", JBColor.background());
        Color fg = JBColor.foreground();

        // Parent window: plain frame + title strip, always drawn at full opacity.
        int titleH = JBUI.scale(18);
        g.setColor(bodyBg);
        g.fillRoundRect(x, y, w, h, JBUI.scale(8), JBUI.scale(8));
        g.setColor(titleBg);
        g.fillRoundRect(x + 1, y + 1, w - 2, titleH, JBUI.scale(8), JBUI.scale(8));
        g.fillRect(x + 1, y + titleH - JBUI.scale(6), w - 2, JBUI.scale(6));
        g.setColor(fg);
        g.drawString("Parent window", x + JBUI.scale(8), y + JBUI.scale(13));
        g.setColor(frame);
        g.drawRoundRect(x, y, w, h, JBUI.scale(8), JBUI.scale(8));

        // Child window placement: docked = full width at the top of the parent body.
        int bodyTop = y + titleH;
        int inset = JBUI.scale(14);
        int cx, cy, cw, ch;
        if (render.docked) {
            cx = x + 1;
            cy = bodyTop + 1;
            cw = w - 2;
            ch = JBUI.scale(46);
        } else {
            cx = x + inset;
            cy = bodyTop + inset;
            cw = (int) (w * 0.62);
            ch = h - titleH - 2 * inset;
        }

        float alpha = render.invisible ? 0.30f : render.disabled ? 0.5f : 1.0f;
        g.setComposite(java.awt.AlphaComposite.getInstance(java.awt.AlphaComposite.SRC_OVER, alpha));

        int arc = render.fieldset ? JBUI.scale(6) : 0;
        g.setColor(bodyBg);
        g.fillRoundRect(cx, cy, cw, ch, arc, arc);

        // Recessed / raised edges: dark and light edge lines on opposite sides.
        Color dark = frame.darker();
        Color light = JBColor.namedColor("Component.focusColor", frame.brighter());
        if (render.recessed) {
            g.setColor(dark);
            g.drawLine(cx, cy, cx + cw, cy);
            g.drawLine(cx, cy, cx, cy + ch);
            g.setColor(light);
            g.drawLine(cx, cy + ch, cx + cw, cy + ch);
            g.drawLine(cx + cw, cy, cx + cw, cy + ch);
        } else if (render.raised) {
            g.setColor(light);
            g.drawLine(cx, cy, cx + cw, cy);
            g.drawLine(cx, cy, cx, cy + ch);
            g.setColor(dark);
            g.drawLine(cx, cy + ch, cx + cw, cy + ch);
            g.drawLine(cx + cw, cy, cx + cw, cy + ch);
        }

        // Border: dashed when invisible, hidden when Borderless (fieldset keeps its outline).
        if (!render.borderless || render.fieldset) {
            g.setStroke(new java.awt.BasicStroke(JBUI.scale(1),
                    java.awt.BasicStroke.CAP_BUTT, java.awt.BasicStroke.JOIN_MITER, 10f,
                    render.invisible ? new float[]{JBUI.scale(4), JBUI.scale(4)} : null, 0f));
            g.setColor(frame);
            g.drawRoundRect(cx, cy, cw, ch, arc, arc);
            g.setStroke(new java.awt.BasicStroke(JBUI.scale(1)));
        }

        if (render.fieldset) {
            // Groupbox-style legend: the title on the top border.
            String legend = render.title == null || render.title.isEmpty() ? "(no title)" : render.title;
            legend = clip(g, legend, cw - JBUI.scale(24));
            int tw = g.getFontMetrics().stringWidth(legend);
            int tx = cx + JBUI.scale(10);
            g.setColor(bodyBg);
            g.fillRect(tx - JBUI.scale(3), cy - JBUI.scale(6), tw + JBUI.scale(6), JBUI.scale(12));
            g.setColor(fg);
            g.drawString(legend, tx, cy + JBUI.scale(4));
        } else {
            g.setColor(fg);
            String label = "(child window)";
            int lw = g.getFontMetrics().stringWidth(label);
            g.drawString(label, cx + (cw - lw) / 2, cy + ch / 2);
        }

        if (render.vScroll) {
            int sw = JBUI.scale(8);
            g.setColor(frame);
            g.fillRect(cx + cw - sw - 1, cy + 1, sw, ch - 2);
        }
        if (render.hScroll) {
            int sh = JBUI.scale(8);
            g.setColor(frame);
            g.fillRect(cx + 1, cy + ch - sh - 1, cw - 2, sh);
        }
        g.dispose();
    }

    private static String clip(Graphics2D g, String s, int maxWidth) {
        if (g.getFontMetrics().stringWidth(s) <= maxWidth) {
            return s;
        }
        String ell = "…";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            if (g.getFontMetrics().stringWidth(sb.toString() + s.charAt(i) + ell) > maxWidth) {
                break;
            }
            sb.append(s.charAt(i));
        }
        return sb + ell;
    }
}
