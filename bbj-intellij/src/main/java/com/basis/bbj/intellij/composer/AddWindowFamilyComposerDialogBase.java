package com.basis.bbj.intellij.composer;

import com.basis.bbj.intellij.composer.ComposerModels.AddWindowCatalogs;
import com.basis.bbj.intellij.composer.ComposerModels.CatalogItem;
import com.basis.bbj.intellij.concurrency.AlarmScheduler;
import com.basis.bbj.intellij.concurrency.PreviewDebouncer;
import com.intellij.openapi.application.ApplicationManager;
import com.intellij.openapi.application.ModalityState;
import com.intellij.openapi.project.Project;
import com.intellij.openapi.ui.DialogWrapper;
import com.intellij.ui.components.JBCheckBox;
import com.intellij.ui.components.JBLabel;
import com.intellij.ui.components.JBTextField;
import com.intellij.util.ui.JBUI;

import javax.swing.BorderFactory;
import javax.swing.JPanel;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.awt.GridLayout;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;

/**
 * Shared base for the addWindow-family dialogs -- {@link AddWindowComposerDialog} and
 * {@link AddChildWindowComposerDialog} (#630). The two dialogs are structurally the same dialog:
 * identical preview-seam construction, identical debounce wiring, identical sequence-counter
 * discipline, identical grouped-checkbox rendering, identical selection helpers and identical
 * getters -- all of that lives here exactly once. They differ only in their own field set, their
 * schematic panel type, their preview request/response DTOs, their {@code createCenterPanel()} and
 * their {@code apply(...)} -- those stay on the subclass. Mirrors the
 * {@link com.basis.bbj.intellij.actions.BbjRunActionBase} base + thin-subclass shape already
 * established in this codebase.
 */
public abstract class AddWindowFamilyComposerDialogBase extends DialogWrapper {
    private static final long PREVIEW_DEBOUNCE_MS = 300L;

    protected final Project project;
    protected final BbjComposerServer server;
    protected final AddWindowCatalogs catalogs;
    protected final AtomicInteger seq = new AtomicInteger();
    protected final ComposerFlow flow;
    protected final Consumer<ComposerNotices.Notice> balloonOnce;
    protected final PreviewDebouncer previewDebouncer;

    protected final Map<Long, JBCheckBox> flagChecks = new LinkedHashMap<>();
    protected final Map<Long, JBCheckBox> eventChecks = new LinkedHashMap<>();
    protected final JBCheckBox eventEnabled = new JBCheckBox("Configure event mask (default: unset)");
    protected JPanel eventPanel;

    protected final JBTextField statementField = new JBTextField();
    protected final JBLabel flagsSummary = new JBLabel();
    protected final JBLabel eventSummary = new JBLabel();
    protected JPanel geometryPanel;

    protected final boolean editMode;
    protected final ComposerModels.AddWindowInitial initial;
    protected final long preservedFlagBits;
    protected final long preservedEventBits;

    protected volatile String statement = "";
    protected volatile String flagsHex = "";
    protected volatile String eventHex;

    protected AddWindowFamilyComposerDialogBase(@NotNull Project project, @NotNull BbjComposerServer server,
            @NotNull AddWindowCatalogs catalogs, @Nullable ComposerModels.AddWindowInitial initial,
            boolean editMode, long preservedFlagBits, long preservedEventBits) {
        super(project);
        this.project = project;
        this.server = server;
        this.catalogs = catalogs;
        this.initial = initial;
        this.editMode = editMode;
        this.preservedFlagBits = preservedFlagBits;
        this.preservedEventBits = preservedEventBits;
        this.balloonOnce = ComposerFlow.once(notice -> ComposerNoticeRenderer.render(project, notice, null));
        this.flow = new ComposerFlow(
                runnable -> ApplicationManager.getApplication().invokeLater(runnable, ModalityState.any()),
                balloonOnce,
                ComposerFlow.REFRESH_TIMEOUT_MILLIS);
        this.previewDebouncer = new PreviewDebouncer(
                new AlarmScheduler(getDisposable()),
                PREVIEW_DEBOUNCE_MS,
                runnable -> ApplicationManager.getApplication().invokeLater(runnable, ModalityState.any()),
                this::refresh);
    }

    /** Sets the bits in {@code bits} that have a matching catalog checkbox; ignores unknown bits. */
    protected void preselect(long... bits) {
        for (long bit : bits) {
            JBCheckBox cb = flagChecks.get(bit);
            if (cb != null) {
                cb.setSelected(true);
            }
        }
    }

    protected void updateEventEnabled() {
        ComposerSwingHelpers.setEnabledRecursive(eventPanel, eventEnabled.isSelected());
    }

    /**
     * Add checkboxes to {@code parent}, one titled sub-panel per catalog group (in catalog order).
     * The tooltip branch ({@code it.detail != null}) is carried unconditionally rather than behind a
     * hook: the addWindow catalog ({@code WINDOW_FLAGS}/{@code EVENT_MASK_BITS} in
     * {@code addwindow-composer.ts}) never sets {@code detail} on any item -- verified by reading the
     * catalog source, not assumed -- so the branch is dead code for {@link AddWindowComposerDialog}
     * and reproduces {@link AddChildWindowComposerDialog}'s existing per-checkbox tooltips
     * unchanged (#630).
     */
    protected void addGroupedChecks(JPanel parent, List<CatalogItem> items, Map<Long, JBCheckBox> into) {
        String currentGroup = null;
        JPanel groupPanel = null;
        for (CatalogItem it : items) {
            if (!Objects.equals(it.group, currentGroup)) {
                currentGroup = it.group;
                groupPanel = new JPanel(new GridLayout(0, 2, JBUI.scale(8), 0));
                if (currentGroup != null) {
                    groupPanel.setBorder(BorderFactory.createTitledBorder(currentGroup));
                }
                parent.add(groupPanel);
            }
            JBCheckBox cb = new JBCheckBox(it.label);
            if (it.detail != null) {
                cb.setToolTipText(it.detail);
            }
            cb.addActionListener(e -> scheduleRefresh());
            into.put(it.value, cb);
            groupPanel.add(cb);
        }
    }

    protected List<Long> selected(Map<Long, JBCheckBox> checks) {
        List<Long> out = new ArrayList<>();
        for (Map.Entry<Long, JBCheckBox> e : checks.entrySet()) {
            if (e.getValue().isSelected()) {
                out.add(e.getKey());
            }
        }
        return out;
    }

    /**
     * Every checkbox/field listener calls this instead of {@link #refresh()} directly: it disables
     * OK synchronously the instant a new preview is scheduled, and it is re-enabled only when the
     * debounced preview resolves.
     */
    protected void scheduleRefresh() {
        setOKActionEnabled(false);
        seq.incrementAndGet(); // invalidate any response already in flight before this keystroke
        previewDebouncer.trigger();
    }

    /**
     * No listener calls this directly -- every listener routes through {@link #scheduleRefresh()}.
     * Each subclass builds its own request DTO, hands it to {@link #server} and observes the
     * response through {@link #flow}, checking its sequence number on both the success and the
     * failure path before touching anything.
     */
    protected abstract void refresh();

    /**
     * A refresh request failed (or completed with no preview) while this dialog's sequence is still
     * current: label the flags summary stale and refuse OK so it can never be accepted (#538).
     * Cleared the next time the subclass's own {@code apply(...)} runs after a successful preview.
     */
    protected void previewUnavailable(String reason) {
        ComposerSwingHelpers.previewUnavailable(flagsSummary, reason);
        setOKActionEnabled(false);
    }

    /** {@code " "} keeps the error label's height stable, matching {@link MsgboxComposerDialog}. */
    protected static String errorText(String error) {
        return error == null ? " " : error;
    }

    /**
     * Prefill flag/event checkbox selections from a decoded call (edit-in-place). The title field
     * itself is not touched here -- it belongs to the subclass's own field set, so each subclass
     * prefills it from {@code in.title} right after calling this, in its own constructor.
     */
    protected void prefill(ComposerModels.AddWindowInitial in) {
        setSelected(flagChecks, in.flags);
        setSelected(eventChecks, in.eventMask);
        eventEnabled.setSelected(in.eventMaskEnabled);
        updateEventEnabled();
    }

    private static void setSelected(Map<Long, JBCheckBox> checks, List<Long> values) {
        List<Long> on = values == null ? List.of() : values;
        for (Map.Entry<Long, JBCheckBox> e : checks.entrySet()) {
            e.getValue().setSelected(on.contains(e.getKey()));
        }
    }

    /** The composed statement to insert (create flow); valid after the dialog is accepted. */
    public @NotNull String getStatement() {
        return statement;
    }

    /** The `$flags$` hex token (edit flow: replace the existing flags literal with this). */
    public @NotNull String getFlagsHex() {
        return flagsHex;
    }

    /** The `$event_mask$` hex token, or null when the event mask is unset. */
    public @Nullable String getEventHex() {
        return eventHex;
    }

    public boolean isEventEnabled() {
        return eventEnabled.isSelected();
    }

    /** Small DocumentListener that runs one callback on any change. */
    protected record SimpleDocumentListener(Runnable onChange) implements DocumentListener {
        @Override public void insertUpdate(DocumentEvent e) { onChange.run(); }
        @Override public void removeUpdate(DocumentEvent e) { onChange.run(); }
        @Override public void changedUpdate(DocumentEvent e) { onChange.run(); }
    }
}
