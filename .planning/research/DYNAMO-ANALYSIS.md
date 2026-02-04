# Feature Gap Analysis: BBj Language Server vs Dynamo Tools

**Analyzed:** 2026-02-04
**Dynamo Tools Version:** 0.7.3
**BBj Language Server Version:** 0.7.1 (VS Code), latest (IntelliJ)

## Executive Summary

Dynamo Tools is a VS Code extension focused on **code completion from external metadata** (Company Libraries). It has **no language server** — all completions are regex-based and context-specific, driven by JSON metadata files that describe classes, methods, called programs, and data dictionary structures.

BBj Language Server is a **full Langium-based language server** providing parsing, semantic analysis, diagnostics, code completion, go-to-definition, hover, signature help, and Java interop — all derived from analyzing the actual source code.

**Key insight:** These extensions are fundamentally complementary, not competitive. They solve different problems:
- **BBj LS:** Understanding the code you're writing (syntax, semantics, navigation, Java classes)
- **Dynamo Tools:** Knowing about external metadata (called programs, data dictionaries, Company Libraries)

## Feature Comparison

### Language Server Capabilities

| Feature | BBj LS | Dynamo Tools | Notes |
|---------|--------|--------------|-------|
| Full grammar parsing | ✓ | ✗ | BBj LS parses entire AST via Langium |
| Syntax error diagnostics | ✓ | ✗ | Real-time error detection |
| Semantic validation | ✓ | ✗ | Type checking, undefined references |
| Go-to-definition | ✓ | ✗ | Navigate to variable/function definitions |
| Find references | ✓ | ✗ | Find all usages of a symbol |
| Document outline / Structure | ✓ | ✗ | Classes, methods, labels in tree view |
| Signature help | ✓ | ✗ | Parameter hints while typing |
| Rename refactoring | ✓ | ✗ | Rename symbols across scope |
| Document formatting | ✓ | ✗ | Auto-format BBj code |
| Hover information | ✓ | Partial | BBj LS: all symbols. DT: only from Company Library |

### Code Completion

| Feature | BBj LS | Dynamo Tools | Notes |
|---------|--------|--------------|-------|
| BBj keywords | ✓ | ✗ | All BBj keywords |
| Local variables | ✓ | ✗ | Variables in current scope |
| Labels (numeric/symbolic) | ✓ | ✓ | Both support; DT has more symbolic labels |
| Functions/methods in file | ✓ | ✗ | Methods defined in current file |
| Global fields (#name) | ✗ | ✓ | **GAP** - DT analyzes class fields for `#` trigger |
| Java class names | ✓ | ✗ | Via java-interop service |
| Java method completion | ✓ | ✗ | Object!.method() on declared types |
| Static method completion | Partial | ✓ | **GAP** - DT: ClassName.method() from library |
| Instance method completion | Partial | ✓ | **GAP** - DT: object!.method() from library |
| Constructor completion | Partial | ✓ | **GAP** - DT: `new ClassName()` from library |
| Called programs (CALL) | ✗ | ✓ | **GAP** - DT: call " triggers program list |
| Called program arguments | ✗ | ✓ | **GAP** - DT: argument signatures |
| Data Dictionary fields | ✗ | ✓ | **GAP** - DDNAME. triggers field list |
| BBjTemplatedString getters/setters | ✗ | ✓ | **GAP** - ddname!. triggers getter/setter list |
| Chained method resolution | Partial | ✓ | **GAP** - DT: BBjAPI().openSysGui().method() |

### Commands & Actions

| Feature | BBj LS | Dynamo Tools | Notes |
|---------|--------|--------------|-------|
| Run as GUI | ✓ | ✗ | |
| Run as BUI | ✓ | ✗ | |
| Run as DWC | ✓ | ✗ | |
| Compile | ✓ | ✗ | |
| Decompile | ✓ | ✗ | |
| Denumber | ✓ | ✗ | |
| Open config.bbx | ✓ | ✗ | |
| Open BBj.properties | ✓ | ✗ | |
| Open Enterprise Manager | ✓ | ✗ | |
| Reopen as BBj | ✗ | ✓ | **GAP** - Force file to BBj language mode |
| Company Library management | ✗ | ✓ | **GAP** - Webview UI for metadata management |
| Open test cases | ✗ | ✓ | Sample program bundled with extension |

### Configuration

| Feature | BBj LS | Dynamo Tools | Notes |
|---------|--------|--------------|-------|
| BBj home path | ✓ | ✗ | |
| Classpath configuration | ✓ | ✗ | |
| EM credentials | ✓ | ✗ | |
| Formatter options | ✓ | ✗ | Indent, keywords, line continuation |
| Compiler options | ✓ | ✗ | Extensive type checking, output options |
| Company Libraries | ✗ | ✓ | **GAP** - Downloadable metadata packs |

### File Support

| Feature | BBj LS | Dynamo Tools | Notes |
|---------|--------|--------------|-------|
| .bbj files | ✓ | ✓ | |
| .bbl files | ✓ | ✗ | Library files |
| .bbjt files | ✓ | ✗ | Template files |
| .src files | ✓ | ✗ | Source files |
| BBx config files | ✓ | ✗ | |
| Auto-detect legacy files | ✗ | ✓ | **GAP** - Files without extension |

### Documentation Integration

| Feature | BBj LS | Dynamo Tools | Notes |
|---------|--------|--------------|-------|
| Inline docs (Javadoc) | ✓ | ✗ | For Java classes |
| External doc links | ✗ | ✓ | **GAP** - Links to online documentation |
| Deprecated method warnings | ✗ | ✓ | **GAP** - Visual indicator in completions |

## Identified Gaps (Prioritized by User Impact)

### HIGH IMPACT (Daily productivity)

1. **Called Program Completion** (DT: `call "` trigger)
   - **What:** Typing `call ` shows list of known called programs with argument signatures
   - **User value:** Developers frequently call external programs; avoiding typos and wrong arguments is critical
   - **Implementation:** Would require maintaining a registry of called programs (could integrate with DATA dictionary or file scanning)

2. **Data Dictionary Field Completion** (DT: `DDNAME.` trigger)
   - **What:** Typing a data dictionary name followed by `.` shows fields from that structure
   - **User value:** Data structures are central to BBj development; quick field access saves significant time
   - **Implementation:** Would require integrating with Dynamo Tools Data Dictionary export or similar metadata source

3. **Global Field Completion** (DT: `#` trigger)
   - **What:** Inside a class, typing `#` shows all class fields and methods
   - **User value:** Quick access to class members without scrolling
   - **Implementation:** Already have class AST; need to trigger completion on `#` and filter to current class scope

4. **BBjTemplatedString Getter/Setter Completion** (DT: `ddname!.` trigger)
   - **What:** For templated string objects, show getFieldAsString/setFieldValue with correct field names
   - **User value:** Templated strings are BBj-specific; this is domain expertise
   - **Implementation:** Requires Data Dictionary integration (same as #2)

### MEDIUM IMPACT (Enhanced workflow)

5. **Chained Method Return Type Resolution** (DT: `BBjAPI().openSysGui().addButton()`)
   - **What:** Track return types through method chains to provide accurate completions
   - **User value:** BBj API chains are common; better completions reduce API lookup
   - **Current state:** BBj LS has Java interop but may not chain well
   - **Implementation:** Enhance type inference in linker/completion to track method return types

6. **Static Method Completion from Library** (DT: `ClassName.` trigger for static methods)
   - **What:** Typing a class name + `.` shows static methods from that class
   - **User value:** Static utility methods are common in BBj
   - **Current state:** BBj LS has partial support via java-interop
   - **Implementation:** Verify/enhance java-interop static method indexing

7. **Constructor Completion** (DT: `new ` trigger)
   - **What:** Typing `new ` shows available constructors with parameter signatures
   - **User value:** Helps discover available classes and correct constructor parameters
   - **Current state:** BBj LS has some support
   - **Implementation:** Verify completeness; may need better filtering by expected type

8. **External Documentation Links** (DT: hover shows doc URL)
   - **What:** Hover on class/method shows link to online documentation
   - **User value:** Quick access to detailed docs without leaving IDE
   - **Implementation:** Would require maintaining URL mapping for BBj API classes

### LOW IMPACT (Nice to have)

9. **Reopen as BBj Command**
   - **What:** Force a file to be treated as BBj regardless of extension
   - **User value:** Useful for legacy files without extensions
   - **Implementation:** Simple VS Code command; already have language registration

10. **Company Library Concept**
    - **What:** Downloadable metadata packs (BBj, Dynamo Tools, custom)
    - **User value:** Pluggable metadata for different projects/products
    - **Implementation:** Would be a significant architectural addition; may not be necessary if integrating with java-interop or Data Dictionary directly

11. **Deprecated Method Visual Indicator**
    - **What:** Strike-through or tag on deprecated methods in completion list
    - **User value:** Helps developers avoid deprecated APIs
    - **Implementation:** Completion provider already has kind/detail; add deprecation info

12. **Auto-detect Legacy Files**
    - **What:** Files without extension auto-detected as BBj based on first line content
    - **User value:** Convenience for legacy codebases
    - **Implementation:** Add activation event for plaintext + first-line regex matching

## Implementation Notes

### For Called Program Completion (#1)

Two approaches:

**A. Static registry (simpler):**
```json
// .vscode/bbj-called-programs.json
{
  "programs": [
    {"name": "CDS069", "args": ["Y$", "Y1"], "doc": "Date handling"},
    {"name": "CDS037", "args": ["RET$"], "doc": "Return value"}
  ]
}
```

**B. Data Dictionary integration (comprehensive):**
- Connect to Dynamo Tools Data Dictionary export
- Parse `cp` (called programs) array from Company Library JSON format
- Would enable full compatibility with Dynamo Tools metadata

### For Data Dictionary Integration (#2, #4)

Dynamo Tools uses a specific JSON format for Company Libraries:
```json
{
  "cc": "BB",
  "desc": "BBj Language Library",
  "version": 7,
  "classes": [...],
  "dd": [
    {"ddname": "CM01", "field": ["CUST$:C(6):Customer ID", "NAME$:C(30):Name"]}
  ],
  "cp": [...]
}
```

Options:
1. **Import Dynamo Tools format:** Read their JSON files directly
2. **Native Data Dictionary integration:** Connect to BBj Data Dictionary directly
3. **File-based inference:** Analyze template string definitions in source files

### For Global Field Completion (#3)

Existing BBj LS has class parsing. Need to:
1. Add `#` as completion trigger character
2. In completion provider, detect `#` context
3. Find enclosing class in AST
4. Return class fields and methods with `#` prefix removed from insertText

## Recommendation

**Phase 1 (Quick wins):**
- Global field completion (#3) — Uses existing AST
- Deprecated method indicator (#11) — UI enhancement
- Reopen as BBj command (#9) — Simple command

**Phase 2 (Data integration):**
- Consider integrating with Dynamo Tools Company Library format
- This would unlock: Called programs, Data Dictionary, BBjTemplatedString completions
- Alternative: Build native Data Dictionary reader

**Phase 3 (Enhanced type inference):**
- Chained method resolution (#5)
- Constructor completion improvements (#7)

## Sources

- [Dynamo Tools VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=excellware.dynamo-tools)
- [Dynamo Tools Documentation](https://docs.excellware.com/docs/tools/tools.htm)
- VSIX analysis: package.json, extension.js (2339 lines), language-configuration.json
- BBj Language Server source: bbj-vscode/package.json, bbj-completion-provider.ts

---
*Analysis completed: 2026-02-04*
