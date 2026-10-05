/**
 * The formatter settings bbj-ls accepts, their client-side defaults, and the normalizer that turns
 * whatever the client sends under `bbj.formatter` into exactly those keys.
 *
 * Only the 15 known keys ever leave this module. Each carries an explicit string, number or boolean
 * value (never `null`), so bbj-ls never has to guess a default and a stray key such as the local
 * Java path never reaches it.
 */

import type { FormatSettingValue } from './java-interop-program-types.js';

export type FormatterSettingKey =
    | 'indentWidth'
    | 'indentCharacter'
    | 'keywordsToUppercase'
    | 'removeLineContinuation'
    | 'splitSingleLineIf'
    | 'splitInlineComments'
    | 'splitInlineLabelComment'
    | 'collapseMultiLine'
    | 'eolCharacter'
    | 'ifClosingKeyword'
    | 'ifKeywordCase'
    | 'parameterLayout'
    | 'operatorSpacing'
    | 'indentLabelBlocks'
    | 'blankLineAfterReturn';

/** The 15 setting names, in the fixed order every normalized object uses. */
export const FORMATTER_SETTING_KEYS: readonly FormatterSettingKey[] = Object.freeze([
    'indentWidth',
    'indentCharacter',
    'keywordsToUppercase',
    'removeLineContinuation',
    'splitSingleLineIf',
    'splitInlineComments',
    'splitInlineLabelComment',
    'collapseMultiLine',
    'eolCharacter',
    'ifClosingKeyword',
    'ifKeywordCase',
    'parameterLayout',
    'operatorSpacing',
    'indentLabelBlocks',
    'blankLineAfterReturn'
] as FormatterSettingKey[]);

/**
 * The value used for a setting the user did not set. These are the bbj-ls defaults, except
 * `indentWidth`, which is 2 here (bbj-ls itself defaults to 4).
 */
export const FORMATTER_DEFAULTS: Readonly<Record<FormatterSettingKey, FormatSettingValue>> = Object.freeze({
    indentWidth: 2,
    indentCharacter: 'SPACE',
    keywordsToUppercase: false,
    removeLineContinuation: false,
    splitSingleLineIf: false,
    splitInlineComments: false,
    splitInlineLabelComment: false,
    collapseMultiLine: false,
    eolCharacter: 'KEEP',
    ifClosingKeyword: 'KEEP',
    ifKeywordCase: 'KEEP',
    parameterLayout: 'KEEP_INITIAL_LAYOUT',
    operatorSpacing: 'KEEP',
    indentLabelBlocks: false,
    blankLineAfterReturn: false
});

/** The older spelling of `splitSingleLineIf`, still declared by the extension's configuration. */
export const LEGACY_SPLIT_SINGLE_LINE_IF_KEY = 'splitSingleLineIF';

const SPLIT_SINGLE_LINE_IF_KEY: FormatterSettingKey = 'splitSingleLineIf';

function ownValue(source: Record<string, unknown>, key: string): unknown {
    return Object.prototype.hasOwnProperty.call(source, key) ? source[key] : undefined;
}

function asSource(raw: unknown): Record<string, unknown> {
    return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
        ? raw as Record<string, unknown>
        : {};
}

/** True when `splitSingleLineIf` takes its value from the legacy spelling. */
function usesLegacySplitKey(source: Record<string, unknown>): boolean {
    if (ownValue(source, SPLIT_SINGLE_LINE_IF_KEY) !== undefined) {
        return false;
    }
    const legacy = ownValue(source, LEGACY_SPLIT_SINGLE_LINE_IF_KEY);
    return legacy !== undefined && legacy !== null;
}

/** Text for a value that is not a string, finite number or boolean, so bbj-ls rejects it by name. */
function asText(value: unknown): string {
    try {
        const json = JSON.stringify(value);
        if (typeof json === 'string') {
            return json;
        }
    } catch {
        // fall through to String()
    }
    return String(value);
}

/**
 * Turns the raw `bbj.formatter` value into exactly the 15 known keys, in a fixed order.
 *
 * - An absent, `null`, array or primitive input yields the defaults.
 * - A key that is unset or `null` keeps its default; a value is never sent as `null`.
 * - The legacy `splitSingleLineIF` fills `splitSingleLineIf` only when the new key is absent.
 * - A string, boolean or finite number is copied as is; anything else is forwarded as its JSON
 *   text so bbj-ls reports the key instead of the client silently using a default.
 * - Every other key, `javaPath` included, is dropped.
 */
export function normalizeFormatterSettings(raw: unknown): Record<FormatterSettingKey, FormatSettingValue> {
    const source = asSource(raw);
    const out = {} as Record<FormatterSettingKey, FormatSettingValue>;
    for (const key of FORMATTER_SETTING_KEYS) {
        let value = ownValue(source, key);
        if (value === undefined && key === SPLIT_SINGLE_LINE_IF_KEY) {
            value = ownValue(source, LEGACY_SPLIT_SINGLE_LINE_IF_KEY);
        }
        if (value === undefined || value === null) {
            out[key] = FORMATTER_DEFAULTS[key];
        } else if (typeof value === 'string' || typeof value === 'boolean'
            || (typeof value === 'number' && Number.isFinite(value))) {
            out[key] = value;
        } else {
            out[key] = asText(value);
        }
    }
    return out;
}

/**
 * Holds the current normalized settings. The revision moves only when the normalized settings
 * really change, so a consumer can tell a settings change from a repeated identical push.
 */
export class FormatterSettingsHolder {
    private current: Record<FormatterSettingKey, FormatSettingValue> = normalizeFormatterSettings(undefined);
    private serialized = JSON.stringify(this.current);
    private _revision = 0;
    private legacySplitKey = false;

    /** Applies new raw settings; returns true when the normalized settings changed. */
    set(raw: unknown): boolean {
        const source = asSource(raw);
        const next = normalizeFormatterSettings(source);
        const nextSerialized = JSON.stringify(next);
        this.legacySplitKey = usesLegacySplitKey(source);
        if (nextSerialized === this.serialized) {
            return false;
        }
        this.current = next;
        this.serialized = nextSerialized;
        this._revision++;
        return true;
    }

    /** A fresh copy of the current settings. */
    snapshot(): Record<string, FormatSettingValue> {
        return { ...this.current };
    }

    /** 0 at the start, plus one for every real change. */
    get revision(): number {
        return this._revision;
    }

    /** The key name the user actually set for `setting`. */
    userKeyFor(setting: string): string {
        return setting === SPLIT_SINGLE_LINE_IF_KEY && this.legacySplitKey
            ? LEGACY_SPLIT_SINGLE_LINE_IF_KEY
            : setting;
    }
}
