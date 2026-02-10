# Quick Task 8: Fix Documentation Links

**One-liner:** Corrected JetBrains Marketplace URL and BBj Documentation URL across all docs files

## Changes

### JetBrains Marketplace URL (3 occurrences fixed)
- **Old:** `https://plugins.jetbrains.com/plugin/com.basis.bbj`
- **New:** `https://plugins.jetbrains.com/plugin/30033-bbj-language-support`
- Fixed in: `docusaurus.config.ts` (navbar + footer), `index.tsx` (homepage button)

### BBj Documentation URL (3 occurrences fixed)
- **Old:** `https://documentation.basis.cloud/BASISHelp/WebHelp/bbjoverview/bbjoverview.htm`
- **New:** `https://documentation.basis.cloud/BASISHelp/WebHelp/index.htm`
- Fixed in: `docusaurus.config.ts` (footer), `docs/vscode/index.md`, `docs/intellij/index.md`

## Files Modified
- `documentation/docusaurus.config.ts`
- `documentation/src/pages/index.tsx`
- `documentation/docs/intellij/index.md`
- `documentation/docs/vscode/index.md`

## Commit
- c8b4b91: fix(docs): correct JetBrains Marketplace and BBj Documentation URLs
