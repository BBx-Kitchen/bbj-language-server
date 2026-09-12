/**
 * Shared composer-cue contract (#650): the single source of truth for the cue command id, the
 * kinds of composer a cue can target, the target shape a cue click carries, the plain-text cue
 * titles, the config-document language id, and the message shown when a cue's target has gone
 * stale.
 *
 * Both the language server (`language/composer-codelens.ts`) and the VS Code extension bundle
 * (`composer-lens-command.ts`) import this module directly. It has zero runtime dependencies (no
 * `vscode`, `langium` or `vscode-languageserver` imports) so importing it never pulls a runtime
 * library into either bundle.
 */

/** The VS Code / LSP4IJ command id a composer cue's `Command` invokes. */
export const COMPOSER_LENS_COMMAND = 'bbj.openComposerAt';

/** Every composer a cue can currently or eventually target. */
export type ComposerLensKind =
    | 'msgbox'
    | 'addwindow'
    | 'addchildwindow'
    | 'cvs'
    | 'setopts-in-code'
    | 'setopts-config';

/** What a cue click carries: which composer, on which document, at which position. */
export interface ComposerLensTarget {
    kind: ComposerLensKind;
    uri: string;
    line: number;
    character: number;
}

/** Plain-text cue titles — no icon syntax. */
export const COMPOSER_LENS_TITLES: Record<ComposerLensKind, string> = {
    msgbox: 'Compose MSGBOX',
    addwindow: 'Compose addWindow',
    addchildwindow: 'Compose addChildWindow',
    cvs: 'Compose CVS()',
    'setopts-in-code': 'Compose SETOPTS',
    'setopts-config': 'Compose SETOPTS',
};

/** VS Code language id assigned to a resolved BBj config document (config.bbx and friends). */
export const CONFIG_DOCUMENT_LANGUAGE_ID = 'bbx-config';

/** Shown when a cue is clicked after its target call is no longer on the line it named. */
export const LENS_TARGET_GONE_TEXT = 'This composer call is no longer on that line — the document changed.';
