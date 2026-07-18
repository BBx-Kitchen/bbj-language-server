package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.WindowRender;
import com.intellij.ui.JBColor;
import com.intellij.util.ui.JBUI;

import javax.swing.JPanel;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;

/**
 * Custom-painted schematic preview of the window a flag mask produces — the IntelliJ counterpart of
 * the VS Code webview's HTML mock. Driven entirely by a {@link WindowRender} descriptor computed by
 * the language server (#433), so no flag logic lives here.
 */
public final class WindowSchematicPanel extends JPanel {
    private WindowRender render;

    public WindowSchematicPanel() {
        setPreferredSize(new Dimension(JBUI.scale(300), JBUI.scale(200)));
        setOpaque(false);
    }

    public void setRender(WindowRender render) {
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

        int pad = JBUI.scale(14);
        int x = pad, y = pad;
        int w = getWidth() - 2 * pad;
        int h = getHeight() - 2 * pad;

        Color frame = JBColor.namedColor("Component.borderColor", JBColor.GRAY);
        Color titleBg = JBColor.namedColor("TitlePane.background", new JBColor(new Color(0xE3E3E3), new Color(0x3C3F41)));
        Color bodyBg = JBColor.namedColor("EditorPane.background", JBColor.background());
        Color fg = JBColor.foreground();

        float alpha = render.invisible ? 0.30f : render.disabled ? 0.5f : 1.0f;
        g.setComposite(java.awt.AlphaComposite.getInstance(java.awt.AlphaComposite.SRC_OVER, alpha));

        // Body
        g.setColor(bodyBg);
        g.fillRoundRect(x, y, w, h, JBUI.scale(8), JBUI.scale(8));

        // Frame (thicker with the Border flag; dashed when invisible)
        g.setStroke(new java.awt.BasicStroke(render.border ? JBUI.scale(3) : JBUI.scale(1),
                java.awt.BasicStroke.CAP_BUTT, java.awt.BasicStroke.JOIN_MITER, 10f,
                render.invisible ? new float[]{JBUI.scale(4), JBUI.scale(4)} : null, 0f));
        g.setColor(frame);
        g.drawRoundRect(x, y, w, h, JBUI.scale(8), JBUI.scale(8));
        g.setStroke(new java.awt.BasicStroke(JBUI.scale(1)));

        int contentTop = y;
        int titleH = JBUI.scale(22);
        if (render.titleBar) {
            g.setColor(titleBg);
            g.fillRoundRect(x + 1, y + 1, w - 2, titleH, JBUI.scale(8), JBUI.scale(8));
            g.fillRect(x + 1, y + titleH - JBUI.scale(6), w - 2, JBUI.scale(6)); // square off the bottom
            g.setColor(fg);
            String title = render.title == null || render.title.isEmpty() ? "(no title)" : render.title;
            g.drawString(clip(g, title, w - JBUI.scale(70)), x + JBUI.scale(8), y + JBUI.scale(15));

            // Title-bar buttons, right-aligned: [– □] then [×]
            int bx = x + w - JBUI.scale(18);
            if (render.closeBox) { g.drawString("×", bx, y + JBUI.scale(15)); bx -= JBUI.scale(16); }
            if (render.minMax) { g.drawString("□", bx, y + JBUI.scale(15)); bx -= JBUI.scale(14);
                                 g.drawString("–", bx, y + JBUI.scale(15)); }
            contentTop = y + titleH;
        }

        if (render.menuBar) {
            int menuH = JBUI.scale(16);
            g.setColor(fg);
            g.drawLine(x + 1, contentTop + menuH, x + w - 1, contentTop + menuH);
            g.drawString("File   Edit   Help", x + JBUI.scale(8), contentTop + JBUI.scale(12));
            contentTop += menuH;
        }

        int bodyBottom = y + h;
        if (render.vScroll) {
            int sw = JBUI.scale(10);
            g.setColor(frame);
            g.fillRect(x + w - sw - 1, contentTop + 1, sw, bodyBottom - contentTop - 2);
        }
        if (render.hScroll) {
            int sh = JBUI.scale(10);
            g.setColor(frame);
            g.fillRect(x + 1, bodyBottom - sh - 1, w - 2, sh);
        }

        if (render.minimized || render.maximized) {
            g.setColor(fg);
            String state = render.minimized ? "(minimized)" : "(maximized)";
            int sw = g.getFontMetrics().stringWidth(state);
            g.drawString(state, x + (w - sw) / 2, contentTop + (bodyBottom - contentTop) / 2);
        }

        if (render.resizable) {
            g.setColor(fg);
            g.drawString("◢", x + w - JBUI.scale(14), y + h - JBUI.scale(4));
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
