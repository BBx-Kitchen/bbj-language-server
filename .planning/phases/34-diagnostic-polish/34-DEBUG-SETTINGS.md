# VS Code Settings Capitalization Issue - Research Findings

## Issue Summary

Setting group headers in VS Code show "Bbj: Classpath" instead of "BBj: Classpath" due to how VS Code derives group labels from configuration property keys.

**Reported behavior:** Settings UI displays "Bbj: ..." for all setting groups
**Expected behavior:** Settings UI should display "BBj: ..." (uppercase)

## Root Cause Analysis

### How VS Code Derives Setting Group Headers

VS Code automatically generates setting group headers from the **property key prefix** (the first segment before the dot in setting IDs like `bbj.classpath`).

From official VS Code documentation:
> "In the settings UI, multiple fields will be used to construct a display title for each setting. **Capital letters in your key are used to indicate word breaks.**"

**Example from VS Code docs:**
- Setting ID: `css.completion.completePropertyWithSemicolon`
- Display in UI: "Completion: Complete Property With Semicolon"

**For BBj extension:**
- Property keys: `bbj.classpath`, `bbj.home`, `bbj.compiler.*`, etc.
- Current display: **"Bbj: Classpath"**, **"Bbj: Home"**, etc.
- VS Code capitalizes only the first letter of the prefix segment

### Where the Fix in 34-01 Applied

The fix in task 34-01 changed **only the description text** on line 303 of package.json:

```json
"description": "Auto Save upon run of BBj program"  // Line 303
```

This description appears in the setting's help text, NOT in the group header.

### The Real Problem

The group header ("Bbj: ...") is derived from:
1. **Property key prefix** (`bbj` from `bbj.classpath`)
2. **Auto-capitalization** (only first letter capitalized by VS Code)

The group header is **NOT derived from**:
- ❌ `configuration.title` property (line 268)
- ❌ `description` field in individual settings
- ❌ `displayName` in top-level package.json

## Current Configuration in package.json

### Top-level Fields (bbj-vscode/package.json)

```json
Line 2:  "name": "bbj-lang",
Line 5:  "displayName": " BBj Programming Language Support",
```

### Configuration Section (lines 266-505)

```json
Line 266: "configuration": {
Line 267:   "type": "object",
Line 268:   "title": "BBj configuration",
Line 269:   "properties": {
Line 270:     "bbj.home": { ... },
Line 279:     "bbj.classpath": { ... },
Line 285:     "bbj.em.url": { ... },
           // All properties use "bbj." prefix
```

**Key observation:** All property keys use lowercase `bbj.` prefix:
- `bbj.home`
- `bbj.classpath`
- `bbj.em.url`
- `bbj.web.apps`
- `bbj.formatter.*`
- `bbj.compiler.*`
- `bbj.typeResolution.*`
- `bbj.configPath`
- `bbj.interop.*`

## Is There a Solution?

### Option 1: Change Property Key Prefix (❌ Not Viable)

Could change all property keys from `bbj.*` to `BBj.*`:

**Problems:**
1. **Breaking change** - All users' existing settings would break
2. **User settings.json uses the property key** - Everyone has `"bbj.home": "..."` in their settings
3. **Migration pain** - Would require users to manually update all their configuration

**Example impact:**
```json
// Current user settings.json (would break)
{
  "bbj.home": "/opt/bbj",
  "bbj.classpath": "bbj_default"
}

// Would need to become (breaking change)
{
  "BBj.home": "/opt/bbj",
  "BBj.classpath": "bbj_default"
}
```

### Option 2: configuration.title Override (❌ Not Supported)

The `configuration.title` field (line 268) controls the **category submenu name**, not the individual setting group headers.

According to VS Code API docs:
> "If there are multiple categories of settings, the Settings editor will show a submenu in the table of contents for that extension, and the **title keys will be used for the submenu entry names**."

**Current setup:** Single configuration object = no submenu
**Effect of title field:** Only used when configuration is an **array** of categories

### Option 3: Multiple Configuration Categories (⚠️ Partial Workaround)

Could restructure configuration as an array with categories:

```json
"configuration": [
  {
    "title": "BBj General",
    "properties": {
      "bbj.home": { ... },
      "bbj.classpath": { ... }
    }
  },
  {
    "title": "BBj Compiler",
    "properties": {
      "bbj.compiler.typeChecking.enabled": { ... }
    }
  }
]
```

**Problems:**
1. Still doesn't fix "Bbj: ..." prefix in individual setting names
2. Creates new UI structure (category submenu)
3. Doesn't solve the core capitalization issue

### Known VS Code Limitations

Two relevant GitHub issues document this problem:

1. **[Issue #86000](https://github.com/microsoft/vscode/issues/86000)** - "Custom display name for proper nouns in Settings UI" (Dec 2019)
   - Problem: "IoTWorkbench" displays as "Io TWorkbench"
   - Request: Allow custom display names for configuration keys
   - **Status:** Open, no resolution

2. **[Issue #191807](https://github.com/microsoft/vscode/issues/191807)** - "Settings UI doesn't respect custom `title` for extension configuration option" (Aug 2023)
   - Problem: `title` property not respected in Settings UI
   - **Status:** Open, no resolution

**Quote from issue #86000:**
> "Capital letters are used to indicate word breaks in the Settings UI, which is not suitable for proper nouns."

## Conclusion

### What Needs to Change

To display "BBj: ..." instead of "Bbj: ...", the property key prefix would need to be `BBj.*` instead of `bbj.*`.

**However, this is not feasible because:**
1. It's a breaking change for all users
2. Property keys are part of the user-facing configuration API
3. Existing user settings.json files reference `bbj.*`
4. No migration path exists in VS Code

### What Can't Be Changed

- ❌ `configuration.title` - Only affects category submenu, not group headers
- ❌ `displayName` - Only affects extension name in marketplace/UI
- ❌ `description` - Only affects setting help text (already fixed in 34-01)
- ❌ Individual setting `title` fields - Not supported by VS Code for display override

### Current Status

**The capitalization issue cannot be fixed without:**
1. Breaking all existing user configurations, OR
2. VS Code implementing a new API for custom display names (issues #86000, #191807)

### Recommendation

**Accept this as a VS Code platform limitation.** The issue is cosmetic and does not affect functionality. The fix in 34-01 correctly updated the description text. The group header capitalization is controlled by VS Code's automatic behavior and cannot be overridden without breaking changes.

**Alternative (if must address):**
- Document this as a known limitation
- Consider upvoting/commenting on VS Code issues #86000 and #191807 to request the feature

## Sources

- [VS Code Contribution Points API](https://code.visualstudio.com/api/references/contribution-points)
- [VS Code Settings API](https://code.visualstudio.com/api/ux-guidelines/settings)
- [GitHub Issue #86000 - Custom display name for proper nouns](https://github.com/microsoft/vscode/issues/86000)
- [GitHub Issue #191807 - Settings UI doesn't respect title](https://github.com/microsoft/vscode/issues/191807)
- [VS Code Extension Samples - Configuration](https://github.com/microsoft/vscode-extension-samples/blob/main/configuration-sample/package.json)
- [Splitting Settings into Multiple Categories](https://www.eliostruyf.com/splitting-vscode-extension-settings-multiple-categories/)
