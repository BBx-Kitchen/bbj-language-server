TITLE: Formatting edits whose newText contains `\r\n` are dropped silently ("Wrong line separators" AssertionError in AsyncDocumentFormattingService), root cause for #381

> Draft for the user to file or not (phase 129, finding C6b of `129-EVALUATION.md`, a blocker in the recommendation and
> a known issue by the user's verdict). #381 is open and describes the same
> mechanism, so this may fit better as a comment on #381 than as a new issue. Nothing below is proprietary: the repro
> uses a synthetic three-line document, the log excerpt is IntelliJ platform frames only.

When a language server answers `textDocument/formatting` with a `TextEdit` whose `newText` uses `\r\n` line breaks,
LSP4IJ passes the text on unconverted, and the IntelliJ document rejects it. The user sees nothing happen: no change,
no balloon. idea.log gets one SEVERE assertion from the platform.

**Versions:** LSP4IJ 0.21.0 (the code below is unchanged on `main` as of e88c1f59, 2026-09-20). Measured on IntelliJ
IDEA 2024.2 (IC-242.20224.300, Linux, JBR 21.0.3). Not tried on IntelliJ IDEA 2026.2.2 (IU-262.10315.125, Windows);
there, a server answering with `\n` formats CRLF files fine. Seen while developing the
[BBj language support plugin](https://github.com/BBx-Kitchen/bbj-language-server).

**Minimal repro (any language server):**

1. Open a file with three lines `a`, `b`, `c` (LF or CRLF on disk; the IntelliJ document holds `\n` either way).
2. Have the server answer `textDocument/formatting` with an edit whose `newText` carries `\r\n`, for example:
   ```json
   [{"range":{"start":{"line":0,"character":0},"end":{"line":2,"character":1}},"newText":"a\r\n  b\r\nc"}]
   ```
   (This exact payload was not sent; our measurement used our own server, whose answer had the same shape: a
   whole-document edit with `\r\n` breaks, see the excerpt below.)
3. Code, Reformat Code.

**Expected:** the edit is applied, with its line separators converted to the document's `\n` (the document's separator
on disk stays what it was), or at least an `LSP formatting error` notification.

**Actual:** the document is not changed, no notification is shown, and idea.log has:

```
SEVERE - #c.i.f.s.AsyncDocumentFormattingService - Wrong line separators: '\r\nREM /** ...' at offset 0
java.lang.AssertionError: Wrong line separators: '\r\nREM /** ...' at offset 0
	at com.intellij.openapi.util.text.StringUtil.assertValidSeparators(StringUtil.java:2552)
	at com.intellij.openapi.editor.impl.DocumentImpl.assertValidSeparators(DocumentImpl.java:716)
	at com.intellij.openapi.editor.impl.DocumentImpl.replaceString(DocumentImpl.java:607)
	at com.intellij.openapi.editor.impl.DocumentImpl.lambda$setText$3(DocumentImpl.java:1086)
	at com.intellij.openapi.editor.impl.DocumentImpl.setText(DocumentImpl.java:1088)
	at com.intellij.formatting.service.AsyncDocumentFormattingService$FormattingRequestImpl.updateDocument(AsyncDocumentFormattingService.java:310)
	at com.intellij.formatting.service.AsyncDocumentFormattingService$FormattingRequestImpl.lambda$runTask$0(AsyncDocumentFormattingService.java:285)
	at com.intellij.openapi.application.WriteAction.lambda$run$1(WriteAction.java:85)
	...
	at com.intellij.openapi.application.impl.FlushQueue.doRun(FlushQueue.java:78)
```

The server's answer on the wire (start of `newText` only):

```
{"jsonrpc":"2.0","id":"18","result":[{"range":{"start":{"line":0,"character":0},"end":{"line":63,"character":0}},"newText":"\r\nREM /** Some Javadoc */\r\nCLASS PUBLIC someClass\r\n\r\n  FIELD PUBLIC BBjString someInstanceString$\r\n…
```

**Where it happens (0.21.0):** `LSPFormattingSupport` builds the formatted text with
`applyEdits(editor.getDocument(), edits)` and hands it to `formattingRequest.onTextReady(formatted)` (lines 73-74).
`LSPIJUtils.applyEdits` (from line 1388) concatenates the document text and each `textEdit.getNewText()` as they are.
The platform later writes the text with `DocumentImpl.setText` in a write action on the EDT, which asserts `\n`-only
separators. Because that happens after `onTextReady` has returned (and an `AssertionError` is not an `Exception`
anyway), the `catch (Exception e)` around it never runs and the `LSP formatting error` notification is not shown.

**Possible fix:** convert the separators of each `newText` in `applyEdits`
(`StringUtil.convertLineSeparators(textEdit.getNewText())`), since an IntelliJ `Document` always holds `\n`; or convert the
joined text in `LSPFormattingSupport` before `onTextReady`. The same conversion would also cover range formatting, which
goes through the same support class.

**Related:** #381 (CRLF documents cannot be formatted; its trace shows a `newText` with `\r\n`, same mechanism).
