import { DefaultLexer, LexerResult } from "langium";

export class BbjLexer extends DefaultLexer {

    override tokenize(text: string): LexerResult {
        text = this.prepareLineSplitter(text);
        return super.tokenize(text);
    }

    private prepareLineSplitter(text: string): string {
        const windowsEol = text.includes('\r\n');
        const lines = text.split(/\r?\n/g);
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
        return lines.join(windowsEol ? '\r\n' : '\n');
    }

}
