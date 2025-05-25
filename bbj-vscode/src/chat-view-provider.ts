import * as vscode from 'vscode';
import { LLMService } from './llm-service.js';
import { RAGService } from './rag-service.js';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'bbj.chatView';

    private _view?: vscode.WebviewView;
    private _panel?: vscode.WebviewPanel;
    private _messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly llmService: LLMService,
        private readonly ragService: RAGService,
        private readonly outputChannel: vscode.OutputChannel
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'sendMessage':
                    await this._handleUserMessage(data.message);
                    break;
                case 'clear':
                    this._messages = [];
                    this._updateWebview();
                    break;
                case 'insertCode':
                    await this._insertCodeInEditor(data.code);
                    break;
                case 'copyCode':
                    await vscode.env.clipboard.writeText(data.code);
                    vscode.window.showInformationMessage('Code copied to clipboard');
                    break;
            }
        });
    }

    public resolveWebviewPanel(panel: vscode.WebviewPanel) {
        this._panel = panel;
        this._view = undefined;

        panel.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        panel.webview.html = this._getHtmlForWebview(panel.webview);

        // Handle messages from the webview
        panel.webview.onDidReceiveMessage(async data => {
            switch (data.type) {
                case 'sendMessage':
                    await this._handleUserMessage(data.message);
                    break;
                case 'clear':
                    this._messages = [];
                    this._updateWebview();
                    break;
                case 'insertCode':
                    await this._insertCodeInEditor(data.code);
                    break;
                case 'copyCode':
                    await vscode.env.clipboard.writeText(data.code);
                    vscode.window.showInformationMessage('Code copied to clipboard');
                    break;
            }
        });

        // Handle panel disposal
        panel.onDidDispose(() => {
            this._panel = undefined;
        });
    }

    private async _handleUserMessage(message: string) {
        // Add user message
        this._messages.push({ role: 'user', content: message });
        this._updateWebview();

        // Show typing indicator
        const webview = this._view?.webview || this._panel?.webview;
        webview?.postMessage({ type: 'showTyping' });

        try {
            // Get context
            const context = await this._getContext();
            
            // Get relevant examples from RAG
            const ragResults = await this.ragService.retrieveRelevantContext(
                message,
                context.currentFileContent || '',
                5
            );

            // Build prompt
            const prompt = this._buildChatPrompt(message, context, ragResults);
            
            // Get response from LLM (don't clean the response for chat)
            const cancellationTokenSource = new vscode.CancellationTokenSource();
            const response = await this.llmService.getCompletion(prompt, cancellationTokenSource.token, false);
            cancellationTokenSource.dispose();
            
            // Add assistant response
            if (response) {
                this._messages.push({ role: 'assistant', content: response });
            }
            
        } catch (error) {
            this.outputChannel.appendLine(`Chat error: ${error}`);
            this._messages.push({ 
                role: 'assistant', 
                content: `Sorry, I encountered an error: ${error}` 
            });
        }

        // Hide typing indicator and update
        const webview2 = this._view?.webview || this._panel?.webview;
        webview2?.postMessage({ type: 'hideTyping' });
        this._updateWebview();
    }

    private async _getContext(): Promise<{
        currentFileName?: string;
        currentFileContent?: string;
        projectName?: string;
        selection?: string;
    }> {
        const editor = vscode.window.activeTextEditor;
        const context: any = {};

        if (editor) {
            context.currentFileName = editor.document.fileName;
            context.currentFileContent = editor.document.getText();
            
            if (!editor.selection.isEmpty) {
                context.selection = editor.document.getText(editor.selection);
            }
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (workspaceFolder) {
            context.projectName = workspaceFolder.name;
        }

        return context;
    }

    private _buildChatPrompt(
        userMessage: string, 
        context: any,
        ragResults: any
    ): string {
        let prompt = `You are an expert BBj programming assistant integrated into VS Code. You help developers write, debug, and understand BBj code.

RESPONSE GUIDELINES:
1. Provide clear, helpful explanations with your code
2. Use markdown formatting:
   - Code blocks with \`\`\`bbj
   - Bold for **important terms**
   - Lists for step-by-step instructions
3. When writing code:
   - Include helpful comments
   - Show complete, runnable examples when possible
   - Explain what each part does if it's complex
4. Be conversational but concise
5. If you're unsure, say so and provide the best guidance you can

BBj SPECIFIC KNOWLEDGE:
- BBj is a Business BASIC dialect
- Uses ! for object references (e.g., window!, button!)
- Common GUI methods: addWindow(), addButton(), setCallback()
- Event handling: ON_BUTTON_PUSH, ON_CLOSE, etc.
- process_events for event loop
- MSGBOX for message dialogs

`;

        // Add context
        if (context.currentFileName) {
            prompt += `\nCONTEXT:\nCurrent file: ${context.currentFileName}`;
        }
        
        if (context.selection) {
            prompt += `\n\nUser has selected this code:\n\`\`\`bbj\n${context.selection}\n\`\`\``;
        } else if (context.currentFileContent) {
            // Include file content if it's small or if the user is asking about the current file
            const mentionsFile = userMessage.toLowerCase().includes('file') || 
                               userMessage.toLowerCase().includes('code') ||
                               userMessage.toLowerCase().includes('this') ||
                               userMessage.toLowerCase().includes('current');
            
            if (context.currentFileContent.length < 500 || mentionsFile) {
                const content = context.currentFileContent.length > 2000 
                    ? context.currentFileContent.substring(0, 2000) + '\n... (truncated)'
                    : context.currentFileContent;
                prompt += `\n\nCurrent file content:\n\`\`\`bbj\n${content}\n\`\`\``;
            }
        }

        // Add RAG examples
        if (ragResults.examples.length > 0) {
            prompt += `\n\nRelevant BBj examples:\n`;
            ragResults.examples.forEach((ex: any, i: number) => {
                prompt += `\nExample ${i + 1}:\n\`\`\`bbj\n${ex.content}\n\`\`\`\n`;
            });
        }

        // Add conversation history (keep last 4 exchanges for context)
        if (this._messages.length > 0) {
            prompt += `\n\nPrevious conversation:\n`;
            const recentMessages = this._messages.slice(-8); // Last 4 exchanges
            recentMessages.forEach(msg => {
                if (msg.role === 'user') {
                    prompt += `\nUser: ${msg.content}`;
                } else {
                    // Truncate long assistant responses in history
                    const content = msg.content.length > 500 
                        ? msg.content.substring(0, 500) + '...' 
                        : msg.content;
                    prompt += `\nAssistant: ${content}`;
                }
            });
        }

        prompt += `\n\nCurrent question:\nUser: ${userMessage}\n\nAssistant: `;

        return prompt;
    }

    private async _insertCodeInEditor(code: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor to insert code');
            return;
        }

        await editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, code);
        });
    }

    private _updateWebview() {
        const webview = this._view?.webview || this._panel?.webview;
        if (webview) {
            webview.postMessage({ 
                type: 'updateMessages', 
                messages: this._messages 
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BBj Chat</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        #chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }

        .message {
            margin-bottom: 15px;
            padding: 8px 12px;
            border-radius: 6px;
        }

        .user-message {
            background-color: var(--vscode-input-background);
            margin-left: 20%;
        }

        .assistant-message {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            margin-right: 20%;
        }

        .message-label {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 0.9em;
            opacity: 0.7;
        }

        pre {
            background-color: var(--vscode-textBlockQuote-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 8px;
            overflow-x: auto;
            position: relative;
        }

        code {
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
        }

        .code-actions {
            position: absolute;
            top: 4px;
            right: 4px;
            display: flex;
            gap: 4px;
        }

        .code-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 2px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 11px;
        }

        .code-button:hover {
            background: var(--vscode-button-hoverBackground);
        }

        #input-container {
            padding: 10px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        #button-container {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }

        #user-input {
            width: 100%;
            box-sizing: border-box;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
            padding: 8px 10px;
            font-family: inherit;
            font-size: inherit;
            resize: none;
            min-height: 50px;
            max-height: 150px;
        }

        #user-input:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
        }

        .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            white-space: nowrap;
        }

        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .button-primary {
            background-color: var(--vscode-button-background);
            font-weight: 500;
        }
        
        .button-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .button-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .typing-indicator {
            display: none;
            padding: 8px 12px;
            margin-right: 20%;
        }

        .typing-indicator.show {
            display: block;
        }

        .dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: var(--vscode-foreground);
            opacity: 0.4;
            animation: typing 1.4s infinite;
            margin-right: 4px;
        }

        .dot:nth-child(2) {
            animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes typing {
            0%, 60%, 100% {
                opacity: 0.4;
                transform: translateY(0);
            }
            30% {
                opacity: 1;
                transform: translateY(-10px);
            }
        }
    </style>
</head>
<body>
    <div id="chat-container"></div>
    <div class="typing-indicator" id="typing-indicator">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
    </div>
    <div id="input-container">
        <textarea id="user-input" placeholder="Ask about BBj code or your current file..." rows="1"></textarea>
        <div id="button-container">
            <button class="button button-secondary" onclick="clearChat()">Clear</button>
            <button class="button button-primary" onclick="sendMessage()">Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chat-container');
        const userInput = document.getElementById('user-input');
        const typingIndicator = document.getElementById('typing-indicator');
        
        // Store for code blocks
        const codeStorage = {};

        // Auto-resize textarea
        userInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });

        // Send on Enter (but not Shift+Enter)
        userInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        function sendMessage() {
            const message = userInput.value.trim();
            if (!message) return;

            vscode.postMessage({
                type: 'sendMessage',
                message: message
            });

            userInput.value = '';
            userInput.style.height = 'auto';
        }

        function clearChat() {
            vscode.postMessage({ type: 'clear' });
        }

        function insertCode(codeId) {
            const code = codeStorage[codeId];
            if (code) {
                vscode.postMessage({
                    type: 'insertCode',
                    code: code
                });
            }
        }

        function copyCode(codeId) {
            const code = codeStorage[codeId];
            if (code) {
                vscode.postMessage({
                    type: 'copyCode',
                    code: code
                });
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function renderMessage(message) {
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + (message.role === 'user' ? 'user-message' : 'assistant-message');
            
            const label = document.createElement('div');
            label.className = 'message-label';
            label.textContent = message.role === 'user' ? 'You' : 'BBj Assistant';
            messageDiv.appendChild(label);

            const contentDiv = document.createElement('div');
            
            // Parse the content for markdown
            let html = message.content;
            
            // Process code blocks first
            const codeBlocks = [];
            const codeBlockRegex = /\`\`\`(?:bbj|BBj)?\\n([\\s\\S]*?)\`\`\`/g;
            html = html.replace(codeBlockRegex, function(match, code) {
                const id = 'code-' + Date.now() + '-' + codeBlocks.length;
                codeStorage[id] = code.trim();
                codeBlocks.push({ id, code: code.trim() });
                return '[[CODE_BLOCK_' + id + ']]';
            });
            
            // Escape HTML
            html = escapeHtml(html);
            
            // Process inline code
            html = html.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
            
            // Process bold
            html = html.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
            
            // Process italic
            html = html.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
            
            // Process line breaks
            html = html.replace(/\\n/g, '<br>');
            
            // Replace code block placeholders
            codeBlocks.forEach(({ id, code }) => {
                const escapedCode = escapeHtml(code);
                const codeHtml = '<pre><div class="code-actions">' +
                    '<button class="code-button" onclick="insertCode(\\'' + id + '\\')">Insert</button>' +
                    '<button class="code-button" onclick="copyCode(\\'' + id + '\\')">Copy</button>' +
                    '</div><code>' + escapedCode + '</code></pre>';
                html = html.replace('[[CODE_BLOCK_' + id + ']]', codeHtml);
            });
            
            contentDiv.innerHTML = html;
            messageDiv.appendChild(contentDiv);

            return messageDiv;
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'updateMessages':
                    chatContainer.innerHTML = '';
                    message.messages.forEach(msg => {
                        chatContainer.appendChild(renderMessage(msg));
                    });
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    break;
                case 'showTyping':
                    typingIndicator.classList.add('show');
                    chatContainer.scrollTop = chatContainer.scrollHeight;
                    break;
                case 'hideTyping':
                    typingIndicator.classList.remove('show');
                    break;
            }
        });

        // Focus input on load
        userInput.focus();
    </script>
</body>
</html>`;
    }
}