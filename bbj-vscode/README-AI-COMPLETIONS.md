# BBj AI-Powered Code Completions

This guide explains how to set up and use AI-powered code completions for BBj using your custom fine-tuned CodeLlama model.

## Overview

The BBj VS Code extension now supports AI-powered inline completions (similar to GitHub Copilot) using your locally-hosted CodeLlama model. The completions appear as "ghost text" that you can accept with Tab or reject with Escape.

## Prerequisites

1. Your fine-tuned CodeLlama model in GGUF format
2. One of the following LLM servers:
   - [llama.cpp](https://github.com/ggerganov/llama.cpp) with the server module
   - [Ollama](https://ollama.ai/) (easier setup)
   - Any OpenAI-compatible API server

## Setup Options

### Option 1: Using llama.cpp Server (Recommended for Maximum Control)

1. **Install llama.cpp**:
   ```bash
   git clone https://github.com/ggerganov/llama.cpp
   cd llama.cpp
   make
   ```

2. **Start the server with your model**:
   ```bash
   ./llama-server \
     --model /path/to/your/bbj-codellama.gguf \
     --port 8080 \
     --ctx-size 2048 \
     --n-gpu-layers 35
   ```

3. **Configure the extension**:
   - Open VS Code Settings (Cmd+,)
   - Search for "bbj.ai"
   - Set `bbj.ai.serverUrl` to `http://localhost:8080`
   - Ensure `bbj.ai.enabled` is checked

### Option 2: Using Ollama (Easier Setup)

1. **Install Ollama**:
   ```bash
   # macOS
   brew install ollama
   
   # Or download from https://ollama.ai
   ```

2. **Import your GGUF model**:
   ```bash
   # Create a Modelfile
   echo "FROM /path/to/your/bbj-codellama.gguf" > Modelfile
   
   # Create the model in Ollama
   ollama create bbj-codellama -f Modelfile
   ```

3. **Start Ollama** (usually starts automatically):
   ```bash
   ollama serve
   ```

4. **Configure the extension**:
   - Set `bbj.ai.serverUrl` to `http://localhost:11434`
   - Set `bbj.ai.ollamaModel` to match your model name (e.g., `bbj-codellama`)
   - The extension will automatically use Ollama's API format

### Option 3: Automatic Local Server

1. **Place llama-server in your PATH**
2. **Configure the extension**:
   - Set `bbj.ai.modelPath` to the full path of your GGUF model
   - The extension will automatically start the server when needed

## Configuration Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `bbj.ai.enabled` | Enable/disable AI completions | `true` |
| `bbj.ai.modelPath` | Path to GGUF model (for auto-start) | `""` |
| `bbj.ai.serverUrl` | LLM server URL | `http://localhost:8080` |
| `bbj.ai.maxTokens` | Maximum tokens to generate | `150` |
| `bbj.ai.temperature` | Generation temperature (0-1) | `0.2` |
| `bbj.ai.debounceDelay` | Delay before triggering (ms) | `300` |
| `bbj.ai.ollamaModel` | Ollama model name (when using Ollama) | `codellama:7b` |

## Usage

1. **Start typing** BBj code in any `.bbj` file
2. **Wait briefly** after typing (configurable delay)
3. **Ghost text** will appear with the AI suggestion
4. **Accept** with Tab or **reject** with Escape

### Tips for Best Results

- The AI uses the previous 50 lines of code as context
- More specific variable names and comments improve suggestions
- Lower temperature (0.1-0.3) gives more predictable completions
- Higher temperature (0.5-0.8) gives more creative suggestions

## Troubleshooting

### Completions not appearing

1. Check that the LLM server is running:
   ```bash
   curl http://localhost:8080/health
   ```

2. Check VS Code's Output panel (View → Output → BBj):
   - Look for error messages
   - Verify server connection

3. Ensure AI completions are enabled:
   - Check `bbj.ai.enabled` in settings
   - Try disabling and re-enabling

### Poor quality completions

1. Verify you're using the BBj-specific fine-tuned model
2. Adjust temperature:
   - Lower for more conservative completions
   - Higher for more variety
3. Increase context by ensuring relevant code is visible above

### Performance issues

1. Reduce `maxTokens` for faster responses
2. Increase `debounceDelay` to reduce frequency
3. Use GPU acceleration if available:
   ```bash
   ./llama-server --n-gpu-layers 35  # Adjust based on VRAM
   ```

## Privacy & Security

- All processing happens locally on your machine
- No code is sent to external services
- The model runs entirely offline
- Server binds to localhost only by default

## Advanced Configuration

### Custom Prompt Template

To modify the prompt template, edit `bbj-inline-completion-provider.ts`:

```typescript
private buildPrompt(contextLines: string[], currentLine: string): string {
    // Customize your prompt here
}
```

### Multiple Models

You can run multiple models on different ports for comparison:
```bash
# Terminal 1
./llama-server --model model1.gguf --port 8080

# Terminal 2
./llama-server --model model2.gguf --port 8081
```

Then switch between them by changing `bbj.ai.serverUrl`.

## Contributing

To improve the AI completions:

1. Collect examples of good BBj code patterns
2. Fine-tune the model with more BBj-specific data
3. Share feedback on completion quality
4. Submit PRs to enhance the completion logic

## Known Limitations

- Completions are limited to single-line or small multi-line snippets
- The AI doesn't have access to your full project context
- Real-time type information from the language server isn't used (yet)
- No semantic understanding of BBj-specific constructs beyond training data

## Future Enhancements

- Integration with language server for type-aware completions
- Multi-file context support
- Custom completion triggers
- Completion explanations
- Support for completion of entire methods/classes