import { DefaultLexer, LexerResult } from "langium";

export class BbjLexer extends DefaultLexer {

    override tokenize(text: string): LexerResult {
        text = this.prepareLineSplitter(text);
        return super.tokenize(text);
    }

    protected prepareLineSplitter(text: string): string {
        const windowsEol = text.includes('\r\n');
        // Split into (line, delimiter) pairs so each line's own original EOL can be re-emitted
        // below instead of a single globally-detected one — using one global EOL for every line
        // corrupts every downstream token offset on mixed CRLF/LF input (P61-D2-006).
        const parts = text.split(/(\r\n|\r|\n)/);
        const lines: string[] = [];
        const delimiters: string[] = [];
        for (let i = 0; i < parts.length; i += 2) {
            lines.push(parts[i]);
            if (i + 1 < parts.length) {
                delimiters.push(parts[i + 1]);
            }
        }
        for (let i = 0; i < lines.length - 1; i++) {
            const start = i + 1;
            let lineIndex = start;
            let nextLine = lines[lineIndex];
            let end = 0;
            while (nextLine && nextLine.charAt(0) === ':') {
                end = lineIndex;
                nextLine = lines[++lineIndex];
            }
            if (end > 0) {
                let line = lines[i];
                const lineAmount = end - start + 1;
                const replaceLines = new Array<string>(lineAmount).fill('');
                const splitLines = lines.splice(start, lineAmount, ...replaceLines).map(e => e.substring(1));
                const padding = ' '.repeat(splitLines.length);
                line = [line, ...splitLines, padding].join('');
                lines[i] = line;
                i = end;
            }
        }
        // The last element has no captured delimiter (it's either the true final line with no
        // trailing terminator, or the empty tail after a genuine trailing terminator); fall back
        // to the single detected EOL there, matching this function's prior behavior exactly.
        const eol = windowsEol ? '\r\n' : '\n';
        return lines.map((line, i) => line + (delimiters[i] ?? eol)).join('');
    }

}
