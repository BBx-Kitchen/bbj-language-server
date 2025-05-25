import * as vscode from 'vscode';
import { LLMService, OllamaLLMService } from './llm-service.js';

export class BBjInlineCompletionProvider implements vscode.InlineCompletionItemProvider {
    private llmService: LLMService;
    private outputChannel: vscode.OutputChannel;
    private lastRequestTime: number = 0;
    private minRequestInterval: number;
    private activeRequest: Promise<vscode.InlineCompletionItem[] | undefined> | null = null;
    private lastPosition: vscode.Position | null = null;
    
    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        
        // Check if we're using Ollama based on the server URL
        const config = vscode.workspace.getConfiguration('bbj.ai');
        const serverUrl = config.get<string>('serverUrl', 'http://localhost:8080');
        this.minRequestInterval = config.get<number>('debounceDelay', 300);
        
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

        // Debounce requests
        const now = Date.now();
        if (now - this.lastRequestTime < this.minRequestInterval) {
            const waitTime = this.minRequestInterval - (now - this.lastRequestTime);
            this.log(`Debouncing: waiting ${waitTime}ms before next request`);
            return undefined;
        }
        this.lastRequestTime = now;

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

        // Build context for the model
        const contextLines = this.getContextLines(document, position, 50); // 50 lines of context
        const currentLine = beforeCursor;
        
        // Create prompt
        const prompt = this.buildPrompt(contextLines, currentLine);
        this.log(`Prompt created (${prompt.length} chars)`);
        
        // Create the promise for this request
        this.activeRequest = this.doCompletion(prompt, position, token);
        
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

            // Create inline completion item
            const item = new vscode.InlineCompletionItem(
                completion,
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

    private buildPrompt(contextLines: string[], currentLine: string): string {
        const context = contextLines.join('\n');
        
        return `You are a BBj code completion assistant. Complete the following BBj code.
Only provide the code completion, no explanations.

Context:
${context}

Current line to complete:
${currentLine}

Completion:`;
    }

    dispose() {
        this.llmService.dispose();
    }
}