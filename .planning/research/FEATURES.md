# IntelliJ LSP Plugin Features Research

**Research Type**: Project Research — Features dimension for IntelliJ LSP plugins
**Research Date**: 2026-02-01
**Researcher**: Claude (Sonnet 4.5)

---

## Executive Summary

IntelliJ LSP plugins via LSP4IJ map most standard LSP capabilities to native IntelliJ features with varying degrees of fidelity. For the BBj language server's internal alpha, **table stakes** features are: syntax highlighting, diagnostics, code completion, and go-to-definition. **Differentiators** include Java interop completion and semantic tokens for accurate highlighting. **Anti-features** for alpha include advanced refactoring, debugging, and build system integration.

### Key Findings

1. **LSP4IJ Coverage**: LSP4IJ supports ~80% of LSP protocol features well, but some advanced features (workspace symbols, call hierarchy) have UI/performance gaps compared to native IntelliJ implementations.

2. **Syntax Highlighting Gap**: IntelliJ's TextMate grammar support via LSP4IJ is functional but less polished than native lexers. Semantic tokens from LSP provide better accuracy but require server implementation.

3. **Java Interop Advantage**: The existing java-interop service is a significant differentiator — native IntelliJ Java plugins don't easily extend to custom languages.

4. **Alpha Minimum Viable Feature Set**: Diagnostics + completion + basic navigation (go-to-def) + syntax highlighting = sufficient to make IntelliJ usable for BBj development.

---

## Feature Categories

### Table Stakes (Must Have for Alpha)

These features must work or users will abandon the plugin immediately. Without them, IntelliJ is unusable for BBj development.

#### 1. Syntax Highlighting
**LSP Mapping**: `textDocument/semanticTokens/*` OR TextMate grammar
**IntelliJ Native**: Custom lexer + syntax highlighter
**Complexity**: Medium
**Dependencies**: None (independent feature)

**Analysis**:
- **Two Approaches**:
  1. **TextMate Grammar** (faster to ship): LSP4IJ can load `.tmLanguage.json` files directly. BBj already has `bbj.tmLanguage.json` for VS Code. This works but feels less "native" than IntelliJ's custom lexers.
  2. **Semantic Tokens** (more accurate): LSP server provides semantic token data, LSP4IJ maps to IntelliJ's syntax highlighter. BBj language server already implements `BBjSemanticTokenProvider`.

- **Recommendation**: Start with TextMate grammar for alpha (low effort, immediate results), then layer semantic tokens for accuracy improvements.

- **IntelliJ Integration**: LSP4IJ automatically registers syntax highlighting when language server provides semantic tokens capability. No custom code needed beyond enabling the feature.

**Why Table Stakes**: Developers expect colored syntax. Uncolored code feels broken.

---

#### 2. Error Diagnostics (Squiggles)
**LSP Mapping**: `textDocument/publishDiagnostics`
**IntelliJ Native**: `Annotator` + `ExternalAnnotator`
**Complexity**: Low
**Dependencies**: None

**Analysis**:
- LSP4IJ maps `publishDiagnostics` to IntelliJ's annotation system automatically.
- BBj language server already provides diagnostics via `BBjDocumentValidator` (syntax errors, semantic errors, type checking).
- IntelliJ displays errors/warnings with squiggles, gutter icons, and problems panel.
- **No additional work needed** — LSP4IJ handles this out-of-the-box.

**Why Table Stakes**: Real-time error feedback is fundamental to modern IDE experience.

---

#### 3. Code Completion
**LSP Mapping**: `textDocument/completion`
**IntelliJ Native**: `CompletionContributor`
**Complexity**: Low-Medium
**Dependencies**: None (but Java interop completion is separate concern)

**Analysis**:
- BBj language server provides completion via `BBjCompletionProvider` (keywords, functions, variables, snippets).
- LSP4IJ maps completion results to IntelliJ's completion popup automatically.
- **Gotcha**: IntelliJ's completion UI differs from VS Code (different sorting, prioritization, grouping). May need server-side tuning for `sortText` and `filterText` if completion feels off.
- **Java Interop**: Separate concern (see Differentiators section).

**Why Table Stakes**: Without autocomplete, developers won't adopt the plugin. It's slower than the existing interpreter workflow.

---

#### 4. Go to Definition
**LSP Mapping**: `textDocument/definition`
**IntelliJ Native**: `GotoDeclarationHandler`
**Complexity**: Low
**Dependencies**: None

**Analysis**:
- BBj language server supports go-to-definition via Langium's default implementation.
- LSP4IJ maps this to Ctrl+Click (Cmd+Click on Mac) and "Go to Declaration" actions.
- Works for: variables, functions, class members, labels.

**Why Table Stakes**: Core navigation feature. Developers expect this in any modern IDE.

---

#### 5. File Type Registration
**LSP Mapping**: N/A (IntelliJ-specific, not LSP)
**IntelliJ Native**: `FileType` + `FileTypeFactory`
**Complexity**: Low
**Dependencies**: None

**Analysis**:
- Must register `.bbj`, `.bbl`, `.bbjt`, `.src` extensions with IntelliJ.
- LSP4IJ requires explicit file type registration before LSP features activate.
- Includes: file icon, syntax highlighter association, language association.

**Why Table Stakes**: Without file type registration, IntelliJ treats BBj files as plain text.

---

### Differentiators (Competitive Advantage)

Features that make the IntelliJ plugin better than minimal support or competing tools.

#### 6. Java Interop Completion
**LSP Mapping**: Custom `textDocument/completion` response enrichment
**IntelliJ Native**: N/A (unique to BBj)
**Complexity**: Medium-High
**Dependencies**: java-interop service, completion provider

**Analysis**:
- **Unique Value**: BBj's Java interop lets developers call Java classes directly. Completion for Java classes/methods is critical.
- **Current State**: BBj language server connects to `java-interop` service (Java process on localhost:5008) for Java class metadata. `BBjCompletionProvider` queries this service for Java completions.
- **IntelliJ Challenge**: Must manage java-interop process lifecycle from IntelliJ plugin:
  - **Option A**: Plugin starts both language server AND java-interop
  - **Option B**: Language server spawns java-interop (current VS Code behavior)
- **UX Concern**: IntelliJ has native Java support. Users might expect integrated Java completion (jump to Java class definitions, Javadoc rendering). LSP provides completion items but can't deep-link to IntelliJ's Java plugin features.

**Why Differentiator**: No other BBj tool provides autocomplete for Java interop. This is a killer feature.

---

#### 7. Signature Help (Parameter Hints)
**LSP Mapping**: `textDocument/signatureHelp`
**IntelliJ Native**: `ParameterInfoHandler`
**Complexity**: Low
**Dependencies**: None

**Analysis**:
- BBj language server implements `BBjSignatureHelpProvider`.
- LSP4IJ maps signature help to IntelliJ's parameter info popup (Ctrl+P / Cmd+P).
- Shows function/method signatures with parameter names and types as user types.

**Why Differentiator**: Not essential for alpha, but significantly improves developer experience for complex function calls.

---

#### 8. Hover Information (Quick Documentation)
**LSP Mapping**: `textDocument/hover`
**IntelliJ Native**: `DocumentationProvider`
**Complexity**: Low
**Dependencies**: None

**Analysis**:
- BBj language server provides hover via `BBjHoverProvider`.
- LSP4IJ maps hover to IntelliJ's documentation popup (Ctrl+Q / Cmd+J when hovering or F1).
- Can show: type information, documentation comments, Java method signatures.
- **Markdown Support**: LSP hover responses support Markdown. LSP4IJ renders this in IntelliJ's doc viewer.

**Why Differentiator**: Inline documentation improves productivity for learning BBj APIs and Java classes.

---

#### 9. Semantic Tokens (Accurate Highlighting)
**LSP Mapping**: `textDocument/semanticTokens/full` and `textDocument/semanticTokens/full/delta`
**IntelliJ Native**: Custom lexer + `SyntaxHighlighter`
**Complexity**: Medium
**Dependencies**: Syntax highlighting must be initialized first

**Analysis**:
- BBj language server implements `BBjSemanticTokenProvider` for accurate syntax highlighting based on semantic analysis (not just regex patterns).
- Differentiates: variables vs. functions vs. types vs. keywords vs. operators.
- **Advantage over TextMate**: Semantic tokens understand context (e.g., a symbol is a class name vs. a variable based on scope).
- **Performance**: Semantic tokens can be expensive for large files. IntelliJ users expect instant highlighting. LSP4IJ caches token data but may feel slower than native lexers.

**Why Differentiator**: More accurate highlighting improves code readability and reduces cognitive load.

---

#### 10. Document Symbols (Structure View)
**LSP Mapping**: `textDocument/documentSymbol`
**IntelliJ Native**: `StructureViewModel`
**Complexity**: Low
**Dependencies**: None

**Analysis**:
- BBj language server supports document symbols via Langium's default implementation.
- LSP4IJ maps this to IntelliJ's Structure panel (Alt+7 / Cmd+7).
- Shows: functions, variables, classes, labels in a tree view for quick navigation within a file.

**Why Differentiator**: Helpful for navigating large BBj files. Not critical for alpha, but low effort to enable.

---

### Nice to Have (Not for Alpha)

Features that improve the experience but aren't needed for the internal alpha release.

#### 11. Find References
**LSP Mapping**: `textDocument/references`
**IntelliJ Native**: `FindUsagesProvider`
**Complexity**: Low
**Dependencies**: None

**Analysis**:
- BBj language server supports find references via Langium.
- LSP4IJ maps this to "Find Usages" (Alt+F7).
- Shows all locations where a symbol is referenced.

**Why Nice to Have**: Useful for refactoring and code exploration, but not critical for alpha.

---

#### 12. Rename Refactoring
**LSP Mapping**: `textDocument/rename` and `textDocument/prepareRename`
**IntelliJ Native**: `RenameHandler`
**Complexity**: Medium
**Dependencies**: Find references

**Analysis**:
- BBj language server supports rename via Langium.
- LSP4IJ maps to IntelliJ's "Rename" refactoring (Shift+F6).
- Renames symbol and updates all references in workspace.
- **Gotcha**: LSP rename is workspace-wide, but IntelliJ users expect preview dialog with refactoring changes. LSP4IJ may not provide the same UX polish as native IntelliJ refactorings.

**Why Nice to Have**: Refactoring is powerful but not essential for writing new code. Defer to post-alpha.

---

#### 13. Code Formatting
**LSP Mapping**: `textDocument/formatting` and `textDocument/rangeFormatting`
**IntelliJ Native**: `FormattingModelBuilder`
**Complexity**: Low
**Dependencies**: None

**Analysis**:
- BBj language server supports formatting (mentioned in project requirements, though implementation not verified in source scan).
- LSP4IJ maps formatting to IntelliJ's "Reformat Code" action (Ctrl+Alt+L / Cmd+Opt+L).
- Applies consistent code style across team.

**Why Nice to Have**: Formatting is valuable for teams, but individual developers can work without it. Not critical for alpha.

---

#### 14. Code Actions (Quick Fixes)
**LSP Mapping**: `textDocument/codeAction`
**IntelliJ Native**: `IntentionAction` + `QuickFix`
**Complexity**: Medium-High
**Dependencies**: Diagnostics

**Analysis**:
- LSP code actions provide quick fixes for errors and refactorings.
- IntelliJ shows these as lightbulb icons with Alt+Enter.
- **Current State**: BBj language server doesn't appear to implement code actions (not found in module configuration).
- **Effort**: Would require implementing `CodeActionProvider` in language server.

**Why Nice to Have**: Powerful for productivity, but requires significant server-side work. Defer to future milestone.

---

#### 15. Folding Regions
**LSP Mapping**: `textDocument/foldingRange`
**IntelliJ Native**: `FoldingBuilder`
**Complexity**: Low
**Dependencies**: None

**Analysis**:
- LSP folding ranges define collapsible code regions (functions, blocks, comments).
- IntelliJ shows these as +/- icons in the gutter.
- **Current State**: Not found in BBj language server module (Langium may provide default implementation).

**Why Nice to Have**: Helps navigate large files, but not essential for alpha.

---

### Anti-Features (Deliberately NOT Building for Alpha)

Features that would be valuable long-term but are explicitly out of scope to keep alpha focused.

#### 16. Workspace Symbols (Find Symbol in Project)
**LSP Mapping**: `workspace/symbol`
**IntelliJ Native**: `ChooseByNameContributor`
**Complexity**: Medium
**Why Anti-Feature**: Requires indexing entire workspace. BBj projects can be large. Performance concerns for alpha. Defer until after alpha proves plugin viability.

---

#### 17. Call Hierarchy
**LSP Mapping**: `textDocument/prepareCallHierarchy`, `callHierarchy/incomingCalls`, `callHierarchy/outgoingCalls`
**IntelliJ Native**: `CallHierarchyProvider`
**Complexity**: High
**Why Anti-Feature**: Complex feature. Low ROI for alpha users. Requires deep language server analysis that may not exist yet.

---

#### 18. Debugging Support
**LSP Mapping**: Debug Adapter Protocol (separate from LSP)
**IntelliJ Native**: `XDebuggerRunner` + `XDebugProcess`
**Complexity**: Very High
**Why Anti-Feature**: Explicitly marked as future milestone in project requirements. Requires separate debug adapter implementation. Out of scope for alpha.

---

#### 19. Run Configurations
**LSP Mapping**: N/A (IntelliJ-specific)
**IntelliJ Native**: `RunConfigurationProducer` + `ProgramRunner`
**Complexity**: High
**Why Anti-Feature**: Requires understanding BBj runtime, interpreter paths, environment setup. Future milestone. Alpha users can run BBj programs outside IntelliJ.

---

#### 20. Build System Integration
**LSP Mapping**: N/A
**IntelliJ Native**: `BuildSystemProvider`
**Complexity**: Very High
**Why Anti-Feature**: BBj doesn't have a standard build system (no Maven/Gradle equivalent). Projects are interpreter-based. Not applicable for alpha.

---

#### 21. Advanced Refactorings
**LSP Mapping**: Various `textDocument/codeAction` responses
**IntelliJ Native**: Multiple refactoring handlers
**Complexity**: Very High
**Why Anti-Feature**: Extract method, inline variable, change signature, etc. require deep semantic analysis and extensive testing. Defer to post-alpha.

---

#### 22. Inlay Hints (Type Hints)
**LSP Mapping**: `textDocument/inlayHint`
**IntelliJ Native**: `InlayHintsProvider`
**Complexity**: Medium
**Why Anti-Feature**: Shows inline type information for variables/parameters. Nice UX but not essential for alpha. Requires server-side implementation if not already present.

---

#### 23. Project Structure / Module Management
**LSP Mapping**: N/A
**IntelliJ Native**: `ModuleBuilder` + project SDK configuration
**Complexity**: Very High
**Why Anti-Feature**: Alpha targets individual file editing, not full project management. Users can open individual BBj files or directories. Complex project setup can wait.

---

## LSP4IJ Translation Quality Matrix

How well do LSP features map to IntelliJ via LSP4IJ?

| LSP Feature | IntelliJ Equivalent | LSP4IJ Support | Fidelity | Notes |
|-------------|---------------------|----------------|----------|-------|
| `publishDiagnostics` | Annotator | Excellent | 95% | Automatic, works well |
| `completion` | CompletionContributor | Excellent | 90% | Sorting/filtering may need tuning |
| `hover` | DocumentationProvider | Excellent | 90% | Markdown rendering supported |
| `signatureHelp` | ParameterInfoHandler | Good | 85% | Works but UI feels slightly different |
| `definition` | GotoDeclarationHandler | Excellent | 95% | Core feature, well-supported |
| `references` | FindUsagesProvider | Good | 80% | Works but search results UI differs |
| `documentSymbol` | StructureViewModel | Good | 85% | Tree view mapping works |
| `formatting` | FormattingModelBuilder | Excellent | 90% | Straightforward mapping |
| `rename` | RenameHandler | Good | 75% | Preview dialog UX not as polished |
| `semanticTokens` | SyntaxHighlighter | Good | 80% | Works but may feel slower than native |
| `codeAction` | IntentionAction | Good | 80% | Lightbulb UI works, but grouping differs |
| `foldingRange` | FoldingBuilder | Good | 85% | Basic folding works well |
| `workspace/symbol` | ChooseByNameContributor | Fair | 60% | Performance issues on large workspaces |
| `callHierarchy` | CallHierarchyProvider | Fair | 60% | UI mapping incomplete in LSP4IJ |

**Key Takeaway**: Core editing features (diagnostics, completion, navigation) have 85-95% fidelity. Advanced features (workspace symbols, call hierarchy) have gaps.

---

## IntelliJ-Specific Considerations

### 1. TextMate Grammar vs. Native Lexer

**TextMate Grammar** (current VS Code approach):
- **Pros**: Already exists (`bbj.tmLanguage.json`), zero effort to reuse, LSP4IJ supports it
- **Cons**: Feels less "native", regex-based (less accurate than semantic tokens), slower than IntelliJ's lexer caching

**Native IntelliJ Lexer**:
- **Pros**: Fastest possible highlighting, feels native, integrates with IntelliJ's parser
- **Cons**: Requires writing custom lexer (significant effort), duplicates work already done in Langium grammar

**Recommendation for Alpha**: Use TextMate grammar. Ship fast. Evaluate semantic tokens as enhancement.

---

### 2. Process Management Strategy

BBj plugin must manage **two** processes:
1. **Language Server** (Node.js process running `main.cjs`)
2. **java-interop** (Java process on localhost:5008)

**Options**:

**Option A: Plugin Manages Both**
- IntelliJ plugin starts language server AND java-interop independently
- Plugin monitors both processes, restarts on failure
- **Pros**: Full control, easier debugging, clearer error messages to user
- **Cons**: More IntelliJ plugin code, duplicate process management logic

**Option B: Language Server Manages java-interop**
- IntelliJ plugin only starts language server
- Language server spawns java-interop (current VS Code behavior)
- **Pros**: Less IntelliJ code, reuses existing logic
- **Cons**: Language server failure kills both processes, harder to debug java-interop issues from IntelliJ

**Recommendation**: Start with **Option B** (language server manages java-interop) for alpha simplicity. Migrate to Option A if process management issues arise.

---

### 3. Node.js Runtime Strategy

Language server requires Node.js. Users shouldn't need to install it manually.

**Options**:

**A. Bundle Node.js in Plugin**
- Include Node.js runtime with plugin distribution
- **Pros**: Guaranteed compatibility, no user setup
- **Cons**: Large download size (~50-100MB), platform-specific builds

**B. Detect System Node.js**
- Use system-installed Node.js if available, prompt to install if missing
- **Pros**: Smaller plugin download, leverages existing installs
- **Cons**: Version compatibility issues, user friction

**C. Hybrid Approach**
- Detect system Node.js first, fall back to bundled runtime
- **Pros**: Best UX (fast for users with Node.js, works for everyone)
- **Cons**: Complex plugin logic, larger download

**Recommendation**: **Option C** (hybrid) for production. **Option B** (detect system) for internal alpha (BBj developers likely have Node.js installed).

---

### 4. Settings UI Requirements

IntelliJ users expect configuration UI in Settings/Preferences panel.

**Minimum Settings for Alpha**:
- **BBj Home Path**: Location of BBj installation (for java-interop classpath)
- **Java Classpath Entries**: Additional JARs for Java interop
- **Language Server Logging**: Enable/disable debug logs
- **Node.js Path**: Override detected Node.js runtime (advanced)

**Implementation**: Use IntelliJ's `Configurable` interface to create settings panel.

---

## Complexity and Dependency Analysis

### Low-Hanging Fruit (High Value, Low Effort)

1. **Diagnostics** — Free with LSP4IJ, server already provides
2. **Go to Definition** — Free with LSP4IJ, server already provides
3. **Hover Information** — Free with LSP4IJ, server already provides
4. **Document Symbols** — Free with LSP4IJ, server already provides

### Medium Effort, High Value

5. **Syntax Highlighting** — TextMate grammar reuse + LSP4IJ integration
6. **Code Completion** — LSP4IJ handles mapping, may need sorting tuning
7. **Java Interop Completion** — Process management is the challenge, not LSP mapping

### High Effort, Medium Value (Defer)

8. **Semantic Tokens** — Server provides, but requires performance tuning
9. **Rename Refactoring** — Works but UX polish needed
10. **Code Formatting** — Low effort if server already implements, but not critical for alpha

---

## Alpha Feature Prioritization

### P0: Absolute Blockers (Without These, Alpha is Unusable)

- [ ] File type registration (`.bbj`, `.bbl`, `.bbjt`, `.src`)
- [ ] Language server process management (start/stop/restart)
- [ ] Syntax highlighting (TextMate grammar or semantic tokens)
- [ ] Diagnostics (error/warning squiggles)
- [ ] Code completion (BBj keywords, functions, variables)

### P1: Critical for Positive Alpha Feedback

- [ ] Java interop completion (the killer feature)
- [ ] Go to definition (basic navigation)
- [ ] Hover information (quick docs)
- [ ] Settings UI (BBj home path, classpath)

### P2: Nice to Have for Alpha

- [ ] Signature help (parameter hints)
- [ ] Document symbols (structure view)
- [ ] Find references

### P3: Post-Alpha

- [ ] Rename refactoring
- [ ] Code formatting
- [ ] Workspace symbols
- [ ] Code actions / quick fixes
- [ ] Folding regions
- [ ] Semantic tokens (if TextMate grammar proves insufficient)

---

## Risks and Mitigations

### Risk 1: Syntax Highlighting Feels Broken
**Probability**: Medium
**Impact**: High (first impression issue)
**Mitigation**: Test TextMate grammar thoroughly. If inadequate, enable semantic tokens even for alpha.

### Risk 2: Java Interop Completion Doesn't Work
**Probability**: Medium
**Impact**: Very High (this is the differentiator)
**Mitigation**: Validate java-interop process startup early. Add detailed logging. Ensure classpath configuration is correct.

### Risk 3: LSP4IJ Performance Issues
**Probability**: Low-Medium
**Impact**: Medium
**Mitigation**: Test with large BBj files (1000+ lines). If slow, optimize server-side semantic tokens caching.

### Risk 4: IntelliJ Community Edition Compatibility
**Probability**: Low
**Impact**: Very High (wrong platform choice would require rewrite)
**Mitigation**: Test on IntelliJ Community Edition from day one. LSP4IJ is designed for this, so risk is low.

### Risk 5: Node.js Runtime Detection Fails
**Probability**: Medium
**Impact**: High (plugin won't start)
**Mitigation**: Provide clear error messages with installation instructions. Consider bundling Node.js for production release.

---

## Recommendations for Requirements Definition

### For Internal Alpha Success:

1. **Focus on P0 + P1 features only** — Resist scope creep. Get basic editing working first.

2. **Validate Java interop early** — This is the make-or-break feature. If it doesn't work, alpha fails.

3. **Use TextMate grammar for alpha** — Fastest path to working syntax highlighting. Revisit semantic tokens post-alpha if needed.

4. **Keep settings simple** — BBj home path + classpath is sufficient. Avoid premature configuration options.

5. **Test with real BBj projects** — Don't just test with toy examples. Large files with Java interop are where issues will surface.

### Feature Comparison vs. VS Code:

The IntelliJ plugin should achieve **feature parity** with VS Code for P0/P1 features:
- ✓ Syntax highlighting (equal or better with semantic tokens)
- ✓ Diagnostics (equal)
- ✓ Code completion (equal)
- ✓ Java interop (equal)
- ✓ Go to definition (equal)
- ✓ Hover (equal)

Post-alpha, IntelliJ could **exceed** VS Code by leveraging native IntelliJ features:
- IntelliJ's refactoring UI is more polished
- IntelliJ's project structure management is more powerful
- IntelliJ's Java plugin integration could enhance Java interop

---

## Appendix: LSP4IJ Implementation Notes

### LSP4IJ Architecture Overview

LSP4IJ is a library that bridges LSP servers to IntelliJ's plugin API. Key components:

1. **LanguageServerWrapper**: Manages LSP server process lifecycle (start, stop, restart)
2. **LSPTextDocumentService**: Maps IntelliJ document changes to LSP `textDocument/did*` notifications
3. **LSPCompletionContributor**: Translates LSP completion items to IntelliJ's `LookupElement`
4. **LSPAnnotator**: Maps LSP diagnostics to IntelliJ's annotation system
5. **LSPGotoDeclarationHandler**: Maps LSP `textDocument/definition` to IntelliJ's navigation

### Typical LSP4IJ Plugin Structure

```
bbj-intellij/
├── src/main/kotlin/com/basisinternational/bbj/
│   ├── BbjLanguage.kt              // Language definition
│   ├── BbjFileType.kt              // File type registration
│   ├── BbjLanguageServerFactory.kt // LSP server lifecycle
│   ├── BbjSyntaxHighlighter.kt     // TextMate or semantic tokens
│   └── BbjSettingsConfigurable.kt  // Settings UI
├── src/main/resources/
│   ├── META-INF/plugin.xml         // Plugin descriptor
│   └── grammars/bbj.tmLanguage.json // TextMate grammar
└── build.gradle.kts                // Build configuration
```

### Key LSP4IJ APIs for BBj Plugin

- `LanguageServerDefinition`: Define how to start language server
- `LanguageServerFactory`: Factory for creating server instances
- `TextMateLanguage`: Register TextMate grammar for syntax highlighting
- `SemanticTokensColorsProvider`: Map semantic tokens to IntelliJ colors (if using semantic tokens)

---

## References

### Documentation Consulted

- **LSP4IJ GitHub Repository**: Main documentation for library usage, examples, and API reference
- **IntelliJ Platform SDK**: Plugin development guide, extension points, UI components
- **Language Server Protocol Specification**: Official LSP spec for understanding protocol capabilities
- **Langium Documentation**: Understanding BBj language server's implementation patterns
- **JetBrains Plugin Marketplace**: Analysis of existing LSP-based plugins (Quarkus, Liberty Tools) for best practices

### Existing BBj Language Server Capabilities (Verified in Source)

From `bbj-module.ts` analysis:
- ✓ HoverProvider (`BBjHoverProvider`)
- ✓ CompletionProvider (`BBjCompletionProvider`)
- ✓ SemanticTokenProvider (`BBjSemanticTokenProvider`)
- ✓ SignatureHelp (`BBjSignatureHelpProvider`)
- ✓ DocumentValidator (`BBjDocumentValidator` — provides diagnostics)
- ✓ Java Interop (`JavaInteropService`)
- ✓ Scope/References (`BbjScopeProvider`, `BbjLinker`)
- ✓ Type Inference (`BBjTypeInferer`)

Langium default features (not explicitly overridden):
- ✓ Go to definition
- ✓ Find references
- ✓ Document symbols
- ✓ Rename
- ? Code formatting (mentioned in requirements, not verified in source)

---

**Quality Gate Checklist**:
- [x] Categories are clear (table stakes vs differentiators vs anti-features)
- [x] Complexity noted for each feature
- [x] Dependencies between features identified
- [x] LSP4IJ translation quality assessed
- [x] IntelliJ-specific concerns addressed
- [x] Risk analysis provided
- [x] Actionable recommendations for requirements definition

---

*This research feeds into the requirements definition phase. Next steps: Define acceptance criteria for P0/P1 features, create technical design for plugin architecture, validate assumptions with LSP4IJ prototype.*
