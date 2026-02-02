package com.basis.bbj.intellij;

import com.intellij.openapi.util.IconLoader;
import javax.swing.Icon;

public interface BbjIcons {
    Icon FILE = IconLoader.getIcon("/icons/bbj.svg", BbjIcons.class);
    Icon STATUS_READY = IconLoader.getIcon("/icons/bbj-status-ready.svg", BbjIcons.class);
    Icon STATUS_STARTING = IconLoader.getIcon("/icons/bbj-status-starting.svg", BbjIcons.class);
    Icon STATUS_ERROR = IconLoader.getIcon("/icons/bbj-status-error.svg", BbjIcons.class);
    Icon TOOL_WINDOW = IconLoader.getIcon("/icons/bbj-toolwindow.svg", BbjIcons.class);
    Icon INTEROP_CONNECTED = IconLoader.getIcon("/icons/bbj-interop-connected.svg", BbjIcons.class);
    Icon INTEROP_DISCONNECTED = IconLoader.getIcon("/icons/bbj-interop-disconnected.svg", BbjIcons.class);
    Icon CONFIG = IconLoader.getIcon("/icons/bbj-config.svg", BbjIcons.class);
    Icon RUN_GUI = IconLoader.getIcon("/icons/run-gui.svg", BbjIcons.class);
    Icon RUN_BUI = IconLoader.getIcon("/icons/run-bui.svg", BbjIcons.class);
    Icon RUN_DWC = IconLoader.getIcon("/icons/run-dwc.svg", BbjIcons.class);
}
