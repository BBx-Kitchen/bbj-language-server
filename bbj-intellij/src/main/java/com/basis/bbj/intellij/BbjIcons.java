package com.basis.bbj.intellij;

import com.intellij.openapi.util.IconLoader;
import javax.swing.Icon;

public interface BbjIcons {
    Icon FILE = IconLoader.getIcon("/icons/bbj.svg", BbjIcons.class);
    Icon FUNCTION = IconLoader.getIcon("/icons/bbj-function.svg", BbjIcons.class);
    Icon VARIABLE = IconLoader.getIcon("/icons/bbj-variable.svg", BbjIcons.class);
    Icon KEYWORD = IconLoader.getIcon("/icons/bbj-keyword.svg", BbjIcons.class);
    Icon STATUS_READY = IconLoader.getIcon("/icons/bbj-status-ready.svg", BbjIcons.class);
    Icon STATUS_STARTING = IconLoader.getIcon("/icons/bbj-status-starting.svg", BbjIcons.class);
    Icon STATUS_ERROR = IconLoader.getIcon("/icons/bbj-status-error.svg", BbjIcons.class);
    Icon TOOL_WINDOW = IconLoader.getIcon("/icons/bbj-toolwindow.svg", BbjIcons.class);
    Icon INTEROP_CONNECTED = IconLoader.getIcon("/icons/bbj-interop-connected.svg", BbjIcons.class);
    Icon INTEROP_DISCONNECTED = IconLoader.getIcon("/icons/bbj-interop-disconnected.svg", BbjIcons.class);
}
