import * as vscode from 'vscode';
import { LLMService, OllamaLLMService } from './llm-service.js';
import { RAGService } from './rag-service.js';

export class BBjInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    private llmService: LLMService;
    private outputChannel: vscode.OutputChannel;
    private lastRequestTime: number = 0;
    private minRequestInterval: number;
    private activeRequest: Promise<vscode.InlineCompletionItem[] | undefined> | null = null;
    private lastPosition: vscode.Position | null = null;
    private pendingTimeout: NodeJS.Timeout | null = null;
    private pauseBeforeRequest: number;
    private ragService: RAGService;
    
    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        
        // Check if we're using Ollama based on the server URL
        const config = vscode.workspace.getConfiguration('bbj.ai');
        const serverUrl = config.get<string>('serverUrl', 'http://localhost:8080');
        this.minRequestInterval = config.get<number>('debounceDelay', 150);
        this.pauseBeforeRequest = config.get<number>('pauseBeforeRequest', 500); // Wait 500ms of no typing
        
        if (serverUrl.includes('11434')) {
            // Use Ollama service for port 11434
            this.llmService = new OllamaLLMService(outputChannel);
            this.log(`Using Ollama service at ${serverUrl}`);
        } else {
            // Use standard llama.cpp service
            this.llmService = new LLMService(outputChannel);
            this.log(`Using LLM service at ${serverUrl}`);
        }
        
        this.log(`Debounce delay: ${this.minRequestInterval}ms`);
        this.log(`Pause before request: ${this.pauseBeforeRequest}ms`);
        
        // Initialize RAG service
        this.ragService = new RAGService(outputChannel);
        
        // Check RAG mode
        const ragMode = config.get<string>('ragMode', 'disabled');
        if (ragMode !== 'disabled') {
            this.log(`RAG enabled in ${ragMode} mode - will retrieve relevant examples`);
            this.ragService.initialize().catch(error => {
                this.log(`RAG initialization failed: ${error}`);
            });
        } else {
            this.log('RAG disabled');
        }
    }

    private log(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    async provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | undefined> {
        
        // Get configuration
        const config = vscode.workspace.getConfiguration('bbj.ai');
        if (!config.get<boolean>('enabled', true)) {
            this.log('Completions disabled in settings');
            return undefined;
        }

        // Check if this is the same position as last request (avoid duplicate requests)
        if (this.lastPosition && 
            this.lastPosition.line === position.line && 
            this.lastPosition.character === position.character) {
            this.log('Skipping duplicate request for same position');
            return undefined;
        }
        this.lastPosition = position;
        
        // Cancel any pending timeout
        if (this.pendingTimeout) {
            clearTimeout(this.pendingTimeout);
            this.pendingTimeout = null;
            this.log('Cancelled pending completion request due to new input');
        }
        
        // For manual trigger (Tab), execute immediately
        if (context.triggerKind === vscode.InlineCompletionTriggerKind.Invoke) {
            this.log('Manual trigger detected, executing immediately');
            return this.executeCompletion(document, position, context, token);
        }
        
        // For automatic triggers, wait for a pause
        return new Promise((resolve) => {
            this.log(`Waiting ${this.pauseBeforeRequest}ms for typing pause...`);
            this.pendingTimeout = setTimeout(async () => {
                this.pendingTimeout = null;
                const result = await this.executeCompletion(document, position, context, token);
                resolve(result);
            }, this.pauseBeforeRequest);
        });
    }
    
    private async executeCompletion(
        document: vscode.TextDocument,
        position: vscode.Position,
        context: vscode.InlineCompletionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | undefined> {
        // Debounce requests - but only for rapid typing, not after pauses
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        
        // Only debounce if requests are coming in very rapidly (typing)
        if (timeSinceLastRequest < this.minRequestInterval) {
            // Check if this is just rapid typing (character changes)
            if (this.lastPosition && 
                position.line === this.lastPosition.line &&
                Math.abs(position.character - this.lastPosition.character) <= 2) {
                const waitTime = this.minRequestInterval - timeSinceLastRequest;
                this.log(`Debouncing rapid typing: waiting ${waitTime}ms`);
                return undefined;
            }
        }

        // Cancel any active request
        if (this.activeRequest) {
            this.log('Cancelling previous active request');
        }
        
        this.log(`=== New Completion Request ===`);
        this.log(`Position: line ${position.line + 1}, column ${position.character + 1}`);
        this.log(`Trigger kind: ${context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic ? 'Automatic' : 'Invoke'}`);

        // Don't provide completions in comments or strings
        const lineText = document.lineAt(position.line).text;
        const beforeCursor = lineText.substring(0, position.character);
        this.log(`Line text: "${lineText}"`);
        this.log(`Before cursor: "${beforeCursor}"`);
        
        if (this.isInCommentOrString(beforeCursor)) {
            this.log('Skipping completion: cursor is in comment or string');
            return undefined;
        }
        
        // Check for unclosed loops on empty lines
        if (beforeCursor.trim() === '') {
            const loopCompletion = this.detectUnclosedLoop(document, position);
            if (loopCompletion) {
                this.log(`Detected unclosed loop, suggesting: ${loopCompletion}`);
                const item = new vscode.InlineCompletionItem(
                    loopCompletion,
                    new vscode.Range(position, position)
                );
                return [item];
            }
        }

        // Build context for the model
        const contextBefore = this.getContextLines(document, position, 30); // 30 lines before
        const contextAfter = this.getContextAfter(document, position, 10); // 10 lines after
        const currentLine = beforeCursor;
        
        // Create prompt (now async due to RAG)
        const prompt = await this.buildPrompt(contextBefore, currentLine, contextAfter);
        this.log(`Prompt created (${prompt.length} chars)`);
        
        // Create the promise for this request
        this.lastRequestTime = Date.now(); // Update request time only when actually making a request
        this.activeRequest = this.doCompletion(prompt, document, position, token);
        
        try {
            const result = await this.activeRequest;
            this.activeRequest = null;
            return result;
        } catch (error) {
            this.log(`Completion error: ${error}`);
            this.activeRequest = null;
            return undefined;
        }
    }

    private async doCompletion(
        prompt: string,
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): Promise<vscode.InlineCompletionItem[] | undefined> {
        try {
            // Get completion from LLM
            const completion = await this.llmService.getCompletion(prompt, token);
            
            if (!completion || token.isCancellationRequested) {
                if (token.isCancellationRequested) {
                    this.log('Completion cancelled by user');
                } else {
                    this.log('No completion received from LLM (empty or null)');
                }
                return undefined;
            }

            this.log(`=== Completion Result ===`);
            this.log(`Completion text (${completion.length} chars): "${completion}"`);

            // Check if the completion starts with the current line (remove duplication)
            const currentLine = document.lineAt(position.line).text.substring(0, position.character);
            let finalCompletion = completion;
            
            if (currentLine.trim() && completion.trimStart().startsWith(currentLine.trim())) {
                // Remove the duplicated current line from the completion
                finalCompletion = completion.substring(currentLine.length);
                this.log(`Removed duplicate current line from completion`);
                this.log(`Final completion (${finalCompletion.length} chars): "${finalCompletion}"`);
            }
            
            // Check if we're inside parentheses and adjust accordingly
            finalCompletion = this.adjustForParentheses(document, position, finalCompletion);
            
            // Check if completion repeats code that already exists in the document
            finalCompletion = this.filterDuplicateCode(document, position, finalCompletion);
            
            // If the filtered completion is empty or just whitespace, return no completion
            if (!finalCompletion.trim()) {
                this.log('Filtered completion is empty, skipping');
                return undefined;
            }

            // Create inline completion item
            const item = new vscode.InlineCompletionItem(
                finalCompletion,
                new vscode.Range(position, position)
            );

            this.log('Successfully created completion item');
            return [item];
        } catch (error) {
            throw error;
        }
    }

    private isInCommentOrString(text: string): boolean {
        // Simple heuristic - check if we're in a REM comment or string
        const trimmed = text.trim();
        if (trimmed.toLowerCase().startsWith('rem ')) {
            return true;
        }
        
        // Count quotes to see if we're in a string
        const quotes = (text.match(/"/g) || []).length;
        return quotes % 2 === 1;
    }

    private getContextLines(
        document: vscode.TextDocument, 
        position: vscode.Position, 
        maxLines: number
    ): string[] {
        const startLine = Math.max(0, position.line - maxLines);
        const lines: string[] = [];
        
        for (let i = startLine; i < position.line; i++) {
            lines.push(document.lineAt(i).text);
        }
        
        return lines;
    }

    private getContextAfter(
        document: vscode.TextDocument,
        position: vscode.Position,
        maxLines: number
    ): string[] {
        const lines: string[] = [];
        const endLine = Math.min(document.lineCount - 1, position.line + maxLines);
        
        // Include rest of current line if any
        const currentLineText = document.lineAt(position.line).text;
        const afterCursor = currentLineText.substring(position.character);
        if (afterCursor.trim().length > 0) {
            lines.push(afterCursor);
        }
        
        // Add following lines
        for (let i = position.line + 1; i <= endLine; i++) {
            lines.push(document.lineAt(i).text);
        }
        
        return lines;
    }

    private getGeneralInstructions(): string {
        return `You are a BBj code completion assistant. 
        BBj is a BASIC dialect. 
        Your job is to provide ONLY code completions.
        

STRICT RULES:
1. Return ONLY valid BBj code syntax
2. NO explanations, NO descriptions, NO commentary, NO markdown
3. If unsure, provide the most common/useful completion
4. Never repeat code that's already been typed
5. Keep completions concise and relevant`;
    }

    private async buildPromptForEmptyLine(
        contextBefore: string, 
        contextAfter: string,
        ragContext?: { examples: string[], documentation: string[] }
    ): Promise<string> {
        const instructions = this.getGeneralInstructions();
        
        let prompt = `${instructions}

TASK: Suggest NEW code for an empty line. Do NOT repeat any existing code.`;

        // Add RAG context if available
        if (ragContext && ragContext.examples.length > 0) {
            prompt += `

RELEVANT EXAMPLES:
${ragContext.examples.join('\n\n')}`;
        }

        if (ragContext && ragContext.documentation.length > 0) {
            prompt += `

DOCUMENTATION:
${ragContext.documentation.join('\n')}`;
        }

        prompt += `

Previous code:
${contextBefore}

Current position: [EMPTY LINE]`;

        if (contextAfter) {
            prompt += `

Following code (already exists, do NOT suggest this):
${contextAfter}`;
        }

        prompt += `

Provide a single line of NEW BBj code that logically follows:`;
        
        return prompt;
    }

    private async buildPromptForPartialLine(
        contextBefore: string, 
        currentLine: string,
        ragContext?: { examples: string[], documentation: string[] }
    ): Promise<string> {
        const instructions = this.getGeneralInstructions();
        
        let prompt = `${instructions}

TASK: Complete the partial line of BBj code.`;

        // Add RAG context if available
        if (ragContext && ragContext.examples.length > 0) {
            prompt += `

RELEVANT EXAMPLES:
${ragContext.examples.join('\n\n')}`;
        }

        if (ragContext && ragContext.documentation.length > 0) {
            prompt += `

DOCUMENTATION:
${ragContext.documentation.join('\n')}`;
        }

        prompt += `

Examples:
- User types: A=MSGBOX → You return: ("Hello")
- User types: A=MSGBOX( → You return: "Hello")
- User types: FOR I=1 TO → You return: 10
- User types: IF X > → You return: 0 THEN
- User types: PRINT "Hello → You return: World"

IMPORTANT: If user already typed an opening parenthesis, do NOT include another one.

Previous code:
${contextBefore}

User has typed:
${currentLine}

Return ONLY the syntax needed to complete this line:`;

        return prompt;
    }

    private async buildPrompt(contextLines: string[], currentLine: string, contextAfter: string[]): Promise<string> {
        const contextBefore = contextLines.join('\n');
        const contextAfterStr = contextAfter.length > 0 ? contextAfter.join('\n') : '';
        
        const isEmptyLine = currentLine.trim().length === 0;
        
        // Get RAG context if enabled
        const config = vscode.workspace.getConfiguration('bbj.ai');
        const ragMode = config.get<string>('ragMode', 'disabled');
        
        let ragContext: { examples: string[], documentation: string[] } | undefined;
        
        if (ragMode !== 'disabled') {
            try {
                const query = isEmptyLine ? contextBefore : currentLine;
                const retrievalResult = await this.ragService.retrieveRelevantContext(
                    query,
                    contextBefore,
                    3 // max examples
                );
                
                ragContext = {
                    examples: retrievalResult.examples.map(ex => `${ex.context}\n${ex.content}`),
                    documentation: retrievalResult.documentation
                };
                
                this.log(`RAG retrieved ${ragContext.examples.length} examples, ${ragContext.documentation.length} docs`);
            } catch (error) {
                this.log(`RAG retrieval failed: ${error}`);
            }
        }
        
        if (isEmptyLine) {
            return await this.buildPromptForEmptyLine(contextBefore, contextAfterStr, ragContext);
        } else {
            return await this.buildPromptForPartialLine(contextBefore, currentLine, ragContext);
        }
    }

    private adjustForParentheses(document: vscode.TextDocument, position: vscode.Position, completion: string): string {
        // Get the current line text
        const line = document.lineAt(position.line).text;
        const beforeCursor = line.substring(0, position.character);
        const afterCursor = line.substring(position.character);
        
        // Count parentheses to check balance
        const openParensBeforeCursor = (beforeCursor.match(/\(/g) || []).length;
        const closeParensBeforeCursor = (beforeCursor.match(/\)/g) || []).length;
        const openParensAfterCursor = (afterCursor.match(/\(/g) || []).length;
        const closeParensAfterCursor = (afterCursor.match(/\)/g) || []).length;
        
        // Check if we're inside unclosed parentheses
        const unclosedParens = openParensBeforeCursor > closeParensBeforeCursor;
        const hasClosingParenAfterCursor = closeParensAfterCursor > 0;
        
        this.log(`Parentheses check - Before: (${openParensBeforeCursor} open, ${closeParensBeforeCursor} close), After: (${openParensAfterCursor} open, ${closeParensAfterCursor} close)`);
        this.log(`Unclosed parens: ${unclosedParens}, Has closing after: ${hasClosingParenAfterCursor}`);
        
        // If we have unclosed parentheses and there's already a closing paren after cursor
        if (unclosedParens && hasClosingParenAfterCursor) {
            // Check if completion ends with a closing paren
            if (completion.endsWith(')')) {
                // Remove the trailing closing paren from completion
                const adjusted = completion.substring(0, completion.length - 1);
                this.log(`Removed trailing ) due to existing closing paren: "${completion}" → "${adjusted}"`);
                return adjusted;
            }
        }
        
        // Also handle the case where completion starts with ( but we already have one
        const lastCharBeforeCursor = beforeCursor.trim().slice(-1);
        if (lastCharBeforeCursor === '(' && completion.startsWith('(')) {
            const adjusted = completion.substring(1);
            this.log(`Removed leading ( due to existing open paren: "${completion}" → "${adjusted}"`);
            return adjusted;
        }
        
        return completion;
    }
    
    private filterDuplicateCode(document: vscode.TextDocument, position: vscode.Position, completion: string): string {
        // Get all text before the current position as lines
        const textBeforePosition = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        const existingLines = textBeforePosition.split('\n').map(line => line.trim());
        
        // Split completion into lines
        const completionLines = completion.split('\n');
        const filteredLines: string[] = [];
        
        for (const line of completionLines) {
            const trimmedLine = line.trim();
            
            // Only filter out if it's a complete duplicate line (not just a variable reference)
            if (trimmedLine && existingLines.includes(trimmedLine)) {
                this.log(`Filtering out duplicate line: "${trimmedLine}"`);
                continue;
            }
            
            // Also check if we're suggesting a line that's identical to one just typed
            if (position.line > 0) {
                const previousLine = document.lineAt(position.line - 1).text.trim();
                if (trimmedLine === previousLine) {
                    this.log(`Filtering out repetition of previous line: "${trimmedLine}"`);
                    continue;
                }
            }
            
            filteredLines.push(line);
        }
        
        return filteredLines.join('\n');
    }
    
    private detectUnclosedLoop(document: vscode.TextDocument, position: vscode.Position): string | null {
        // Check for unclosed FOR loops
        const textBefore = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        const lines = textBefore.split('\n');
        
        // Count FOR and NEXT statements
        let forCount = 0;
        let nextCount = 0;
        let lastForVariable = '';
        
        for (const line of lines) {
            const trimmed = line.trim().toUpperCase();
            if (trimmed.startsWith('FOR ')) {
                forCount++;
                // Extract variable name
                const match = trimmed.match(/FOR\s+(\w+)\s*=/);
                if (match) {
                    lastForVariable = match[1];
                }
            } else if (trimmed.startsWith('NEXT')) {
                nextCount++;
            }
        }
        
        // If we have more FOR than NEXT, suggest NEXT
        if (forCount > nextCount && lastForVariable) {
            return `NEXT ${lastForVariable}`;
        }
        
        return null;
    }

    dispose() {
        if (this.pendingTimeout) {
            clearTimeout(this.pendingTimeout);
            this.pendingTimeout = null;
        }
        this.llmService.dispose();
        this.ragService.dispose();
    }
}