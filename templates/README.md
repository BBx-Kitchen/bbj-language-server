# BBj starter programs

Curated "getting started" BBj programs shipped with both IDE plugins. See #476.

This directory is the **single source of truth**. The IDE-native forms are generated:

| Target | Generated into |
| --- | --- |
| VS Code | `bbj-vscode/src/templates/generated-templates.json` |
| IntelliJ | `bbj-intellij/src/main/resources/fileTemplates/internal/*.ft` |

```bash
node tools/gen-templates.mjs           # regenerate
node tools/gen-templates.mjs --check   # CI guard: fails if generated files are stale
node --test tools/gen-templates.test.mjs
```

Do not hand-edit the generated files.

## Adding a starter

1. Create `templates/<id>/template.json` and the body file it points at.
2. Add `<id>` to `templates/catalogue.json`.
3. Regenerate and commit the results.

## Placeholders

Bodies use a neutral `${VariableName}` syntax; every placeholder must be declared in
`template.json` (the generator fails otherwise). Undeclared `${...}` is treated as literal text.

**Do not author in Velocity or TextMate snippet syntax.** BBj string variables end in `$`
(`title$`), which Velocity reads as a `$title` reference and silently swallows — IntelliJ File
and Code Templates are Velocity-based. The generator wraps every literal run containing `$` or
`#` in a Velocity raw block (`#[[ ... ]]#`) to prevent this; `tools/gen-templates.test.mjs`
round-trips the shipped starters to prove it holds.

The VS Code side avoids the problem differently: the extension performs its own `${Var}`
substitution on the verbatim body, so no TextMate snippet parsing (and no `$1` tabstop
collision) is involved.

## Kinds

Only `"kind": "single-file"` is supported. IntelliJ File and Code Templates cannot emit multiple
files; multi-file starters need a custom action (IntelliJ) and command (VS Code) in the style of
`bbj.composeAddWindow`, and are deliberately out of scope for now.
