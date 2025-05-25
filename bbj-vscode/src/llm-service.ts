import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';

export class LLMService {
    private serverProcess?: ChildProcess;
    protected serverUrl: string;
    protected outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        const config = vscode.workspace.getConfiguration('bbj.ai');
        this.serverUrl = config.get<string>('serverUrl', 'http://localhost:8080');
        
        // Check if we need to start a local server
        const modelPath = config.get<string>('modelPath', '');
        if (modelPath && this.serverUrl.includes('localhost')) {
            this.log(`Starting local LLM server with model: ${modelPath}`);
            this.startLocalServer(modelPath);
        }
    }

    protected log(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`[${timestamp}] ${message}`);
    }

    private async startLocalServer(modelPath: string): Promise<void> {
        // Assuming llama.cpp server is available in PATH
        // You can adjust this to point to a specific location
        try {
            this.serverProcess = spawn('llama-server', [
                '--model', modelPath,
                '--port', '8080',
                '--ctx-size', '2048',
                '--n-gpu-layers', '35', // Adjust based on GPU availability
                '--threads', '8',
                '--alias', 'bbj-codellama'
            ]);

            this.serverProcess.stdout?.on('data', (data) => {
                this.log(`LLM Server: ${data}`);
            });

            this.serverProcess.stderr?.on('data', (data) => {
                this.log(`LLM Server Error: ${data}`);
            });

            this.serverProcess.on('error', (error) => {
                this.log(`Failed to start LLM server: ${error}`);
                vscode.window.showErrorMessage(
                    'Failed to start local LLM server. Please check model path and llama-server availability.'
                );
            });

            // Give server time to start
            await new Promise(resolve => setTimeout(resolve, 3000));
            this.log('LLM server started successfully');
        } catch (error) {
            this.log(`Error starting LLM server: ${error}`);
        }
    }

    async getCompletion(prompt: string, token: vscode.CancellationToken): Promise<string | null> {
        const config = vscode.workspace.getConfiguration('bbj.ai');
        const maxTokens = config.get<number>('maxTokens', 150);
        const temperature = config.get<number>('temperature', 0.2);

        this.log(`Requesting completion with maxTokens: ${maxTokens}, temperature: ${temperature}`);
        
        try {
            const controller = new AbortController();
            
            // Handle cancellation
            token.onCancellationRequested(() => {
                controller.abort();
            });

            const response = await fetch(`${this.serverUrl}/completion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    n_predict: maxTokens,
                    temperature: temperature,
                    stop: ['\n\n', 'REM', 'rem'],
                    stream: false
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.log(`HTTP error! status: ${response.status}, message: ${errorText}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json() as { content?: string };
            const cleanedCompletion = this.cleanCompletion(data.content || '');
            this.log(`Received raw completion: ${data.content}`);
            this.log(`Cleaned completion: ${cleanedCompletion}`);
            return cleanedCompletion;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                this.log('Request cancelled by user');
                return null; // Cancelled
            }
            this.log(`LLM completion error: ${error}`);
            return null;
        }
    }

    protected cleanCompletion(completion: string): string {
        // Remove any markdown code blocks if present
        completion = completion.replace(/```[a-zA-Z]*\n?/g, '');
        
        // Remove leading newlines/whitespace
        completion = completion.trimStart();
        
        // Remove trailing explanation text (often starts with newline and comment)
        const lines = completion.split('\n');
        const codeLines: string[] = [];
        
        for (const line of lines) {
            const trimmedLine = line.trim().toLowerCase();
            
            // Stop if we hit explanation text
            if (trimmedLine.startsWith('this') || 
                trimmedLine.startsWith('here') ||
                trimmedLine.startsWith('the above') ||
                trimmedLine.startsWith('the code') ||
                trimmedLine.includes('provided is') ||
                trimmedLine.includes('you are trying') ||
                trimmedLine.includes('i can') ||
                trimmedLine.includes('however')) {
                break;
            }
            
            // Skip lines that look like explanations
            if (trimmedLine.length > 50 && !trimmedLine.includes('=') && !trimmedLine.includes('(')) {
                continue;
            }
            
            codeLines.push(line);
        }
        
        const result = codeLines.join('\n').trimEnd();
        
        // If the result doesn't look like code, return empty
        if (result.length > 100 && !result.includes('(') && !result.includes('=') && !result.includes(';')) {
            return '';
        }
        
        return result;
    }

    dispose() {
        if (this.serverProcess) {
            this.log('Shutting down local LLM server...');
            this.serverProcess.kill();
            this.serverProcess = undefined;
            this.log('LLM server shut down');
        }
    }
}

// Alternative implementation using Ollama (if you prefer)
export class OllamaLLMService extends LLMService {
    constructor(outputChannel: vscode.OutputChannel) {
        super(outputChannel);
        this.serverUrl = 'http://localhost:11434';
        this.log(`Initialized Ollama service at ${this.serverUrl}`);
    }

    override async getCompletion(prompt: string, token: vscode.CancellationToken): Promise<string | null> {
        const config = vscode.workspace.getConfiguration('bbj.ai');
        const maxTokens = config.get<number>('maxTokens', 150);
        const temperature = config.get<number>('temperature', 0.2);
        const model = config.get<string>('ollamaModel', 'codellama:34b');

        // Log the full request details
        const requestBody = {
            model: model,
            prompt: prompt,
            stream: false,
            options: {
                num_predict: maxTokens,
                temperature: temperature,
                stop: ['\n\n', 'REM', 'rem']
            }
        };

        this.log('=== Ollama Request ===');
        this.log(`URL: ${this.serverUrl}/api/generate`);
        this.log(`Model: ${model}`);
        this.log(`Prompt length: ${prompt.length} chars`);
        this.log(`Prompt: ${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}`);
        this.log(`Request body: ${JSON.stringify(requestBody, null, 2)}`);
        
        try {
            const controller = new AbortController();
            
            token.onCancellationRequested(() => {
                this.log('Cancellation requested, aborting...');
                controller.abort();
            });

            const startTime = Date.now();
            const response = await fetch(`${this.serverUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            const requestTime = Date.now() - startTime;
            this.log(`Response received in ${requestTime}ms`);
            this.log(`Response status: ${response.status} ${response.statusText}`);
            
            // Log headers in a compatible way
            const headers: Record<string, string> = {};
            response.headers.forEach((value, key) => {
                headers[key] = value;
            });
            this.log(`Response headers: ${JSON.stringify(headers)}`);

            if (!response.ok) {
                const errorText = await response.text();
                this.log(`Error response body: ${errorText}`);
                throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
            }

            const responseText = await response.text();
            this.log(`Raw response text: ${responseText}`);

            // Parse JSON manually to handle edge cases
            let data: { response?: string };
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                this.log(`JSON parse error: ${parseError}`);
                this.log(`Failed to parse: ${responseText}`);
                return null;
            }

            this.log(`Parsed response object: ${JSON.stringify(data)}`);
            
            if (!data.response) {
                this.log('WARNING: No response field in data object');
                this.log(`Available fields: ${Object.keys(data).join(', ')}`);
            }

            const rawCompletion = data.response || '';
            const cleanedCompletion = this.cleanCompletion(rawCompletion);
            
            this.log(`=== Ollama Response ===`);
            this.log(`Raw completion (${rawCompletion.length} chars): ${rawCompletion}`);
            this.log(`Cleaned completion (${cleanedCompletion.length} chars): ${cleanedCompletion}`);
            
            return cleanedCompletion.length > 0 ? cleanedCompletion : null;
        } catch (error: any) {
            if (error.name === 'AbortError') {
                this.log('Request cancelled by user');
                return null;
            }
            this.log(`=== Ollama Error ===`);
            this.log(`Error type: ${error.name}`);
            this.log(`Error message: ${error.message}`);
            this.log(`Error stack: ${error.stack}`);
            
            // Check if Ollama is running
            if (error.message.includes('ECONNREFUSED')) {
                this.log('Connection refused - Ollama may not be running');
                vscode.window.showErrorMessage(
                    'Ollama is not running. Please start Ollama with: ollama serve'
                );
            }
            
            return null;
        }
    }
}