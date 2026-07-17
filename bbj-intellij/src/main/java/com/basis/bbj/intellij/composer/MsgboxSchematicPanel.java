package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.MsgboxRender;
import com.intellij.ui.JBColor;
import com.intellij.util.ui.JBUI;

import javax.swing.JPanel;
import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Dimension;
import java.awt.FontMetrics;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.util.ArrayList;
import java.util.List;

/**
 * Custom-painted schematic of the MSGBOX dialog a selection produces — the IntelliJ counterpart of
 * the VS Code webview's HTML mock. Driven by the {@link MsgboxRender} descriptor computed by the
 * language server (#426/#433): title bar, icon, message, and the button row with the default button
 * highlighted. No MSGBOX logic lives here.
 */
public final class MsgboxSchematicPanel extends JPanel {
    private MsgboxRender render;

    public MsgboxSchematicPanel() {
        setPreferredSize(new Dimension(JBUI.scale(320), JBUI.scale(150)));
        setOpaque(false);
    }

    public void setRender(MsgboxRender render) {
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
        int x = pad, y = pad, w = getWidth() - 2 * pad, h = getHeight() - 2 * pad;
        int arc = JBUI.scale(8);

        Color frame = JBColor.namedColor("Component.borderColor", JBColor.GRAY);
        Color titleBg = JBColor.namedColor("TitlePane.background", new JBColor(new Color(0xE3E3E3), new Color(0x3C3F41)));
        Color bodyBg = JBColor.namedColor("EditorPane.background", JBColor.background());
        Color fg = JBColor.foreground();

        g.setColor(bodyBg);
        g.fillRoundRect(x, y, w, h, arc, arc);
        g.setColor(frame);
        g.drawRoundRect(x, y, w, h, arc, arc);

        // Title bar
        int titleH = JBUI.scale(22);
        g.setColor(titleBg);
        g.fillRoundRect(x + 1, y + 1, w - 2, titleH, arc, arc);
        g.fillRect(x + 1, y + titleH - JBUI.scale(6), w - 2, JBUI.scale(6));
        g.setColor(fg);
        String title = render.title == null || render.title.isEmpty() ? "(no title)" : render.title;
        g.drawString(clip(g, title, w - JBUI.scale(20)), x + JBUI.scale(8), y + JBUI.scale(15));

        // Body: icon + message
        int bodyTop = y + titleH + JBUI.scale(10);
        int textLeft = x + JBUI.scale(12);
        if (render.icon != 0) {
            drawIcon(g, render.icon, x + JBUI.scale(12), bodyTop, JBUI.scale(24));
            textLeft = x + JBUI.scale(44);
        }
        g.setColor(fg);
        int buttonsTop = y + h - JBUI.scale(36);
        String message = render.message == null ? "" : render.message;
        int textRight = x + w - JBUI.scale(12);
        int ty = bodyTop + JBUI.scale(12);
        for (String lineText : wrap(g.getFontMetrics(), message, textRight - textLeft)) {
            if (ty > buttonsTop - JBUI.scale(2)) {
                break;
            }
            g.drawString(lineText, textLeft, ty);
            ty += g.getFontMetrics().getHeight();
        }

        // Button row (right-aligned), default button highlighted
        drawButtons(g, x, w, buttonsTop, frame, fg);
        g.dispose();
    }

    private void drawButtons(Graphics2D g, int x, int w, int top, Color frame, Color fg) {
        List<String> buttons = render.buttons == null ? List.of() : render.buttons;
        if (buttons.isEmpty()) {
            return;
        }
        FontMetrics fm = g.getFontMetrics();
        int gap = JBUI.scale(6), padX = JBUI.scale(10), bh = JBUI.scale(22), arc = JBUI.scale(4);
        int[] widths = new int[buttons.size()];
        int total = 0;
        for (int i = 0; i < buttons.size(); i++) {
            widths[i] = Math.max(JBUI.scale(48), fm.stringWidth(buttons.get(i)) + 2 * padX);
            total += widths[i] + (i > 0 ? gap : 0);
        }
        Color accent = JBColor.namedColor("Button.default.startBackground", new JBColor(new Color(0x3574F0), new Color(0x3574F0)));
        int bx = x + w - JBUI.scale(12) - total;
        for (int i = 0; i < buttons.size(); i++) {
            boolean isDefault = i == render.defaultIndex;
            g.setColor(isDefault ? accent : frame);
            if (isDefault) {
                g.fillRoundRect(bx, top, widths[i], bh, arc, arc);
            } else {
                g.drawRoundRect(bx, top, widths[i], bh, arc, arc);
            }
            g.setColor(isDefault ? JBColor.namedColor("Button.default.foreground", Color.WHITE) : fg);
            int tw = fm.stringWidth(buttons.get(i));
            g.drawString(clip(g, buttons.get(i), widths[i] - JBUI.scale(6)),
                    bx + (widths[i] - Math.min(tw, widths[i] - JBUI.scale(6))) / 2, top + JBUI.scale(15));
            bx += widths[i] + gap;
        }
    }

    /** Draw the MSGBOX icon (16 Stop / 32 Question / 48 Exclamation / 64 Information) as a glyph. */
    private void drawIcon(Graphics2D g, int icon, int x, int y, int size) {
        Color color;
        String glyph;
        switch (icon) {
            case 16 -> { color = new JBColor(new Color(0xD64541), new Color(0xD64541)); glyph = "✕"; } // Stop
            case 32 -> { color = new JBColor(new Color(0x3574F0), new Color(0x3574F0)); glyph = "?"; }       // Question
            case 48 -> { color = new JBColor(new Color(0xE0A030), new Color(0xE0A030)); glyph = "!"; }       // Exclamation
            case 64 -> { color = new JBColor(new Color(0x3574F0), new Color(0x3574F0)); glyph = "i"; }       // Information
            default -> { return; }
        }
        g.setColor(color);
        g.fillOval(x, y, size, size);
        g.setColor(Color.WHITE);
        g.setStroke(new BasicStroke(JBUI.scale(1)));
        FontMetrics fm = g.getFontMetrics();
        int gw = fm.stringWidth(glyph);
        g.drawString(glyph, x + (size - gw) / 2, y + size - JBUI.scale(6));
    }

    private static List<String> wrap(FontMetrics fm, String text, int maxWidth) {
        List<String> lines = new ArrayList<>();
        if (text.isEmpty()) {
            return lines;
        }
        StringBuilder line = new StringBuilder();
        for (String word : text.split(" ")) {
            String candidate = line.isEmpty() ? word : line + " " + word;
            if (fm.stringWidth(candidate) > maxWidth && !line.isEmpty()) {
                lines.add(line.toString());
                line = new StringBuilder(word);
            } else {
                line = new StringBuilder(candidate);
            }
        }
        if (!line.isEmpty()) {
            lines.add(line.toString());
        }
        return lines;
    }

    private static String clip(Graphics2D g, String s, int maxWidth) {
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
}
