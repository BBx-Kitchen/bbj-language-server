# BBj AI-Powered Code Completions

## 🚀 Complete Guide to Intelligent BBj Development

This comprehensive guide explains how to set up and use AI-powered code completions for BBj, including advanced features like **Retrieval-Augmented Generation (RAG)** that learns from your existing codebase to provide context-aware suggestions.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Setup Options](#setup-options)
5. [RAG (Retrieval-Augmented Generation)](#advanced-feature-rag-retrieval-augmented-generation)
6. [Configuration Settings](#configuration-settings)
7. [Usage](#usage)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Topics](#advanced-topics)
10. [Contributing](#contributing)

## Overview

### What You Get

The BBj VS Code extension provides **intelligent inline completions** that understand BBj syntax, patterns, and your coding style. Think of it as having an expert BBj developer pair-programming with you, offering suggestions as you type.

**Key Features:**
- 🤖 **AI-Powered Completions**: Uses fine-tuned CodeLlama models specifically trained for BBj
- 🧠 **Context-Aware**: Analyzes your code context to provide relevant suggestions
- 🔍 **RAG Integration**: Learns from your existing codebase and documentation
- 🏠 **Privacy-First**: Everything runs locally - no code leaves your machine
- ⚡ **Real-Time**: Suggestions appear as you type (configurable timing)
- 🎯 **BBj-Specific**: Understands BBj syntax, conventions, and best practices

### How It Works

1. **You type** BBj code in any `.bbj` file
2. **The system analyzes** your current context (surrounding code, patterns)
3. **RAG retrieves** relevant examples from your codebase (if enabled)
4. **The AI generates** contextually appropriate suggestions
5. **Ghost text appears** showing the suggestion
6. **You accept** (Tab) or **reject** (Escape) the suggestion

### Completion Types

- **Line Completion**: Complete partial statements (`A=MSGBOX` → `("Hello World")`)
- **Block Completion**: Generate entire code blocks (loops, conditionals)
- **Pattern Recognition**: Suggest code based on similar patterns in your codebase
- **Documentation-Aware**: Include information from your project's documentation

## Prerequisites

### System Requirements

- **Operating System**: macOS, Linux, or Windows with WSL2
- **Memory**: Minimum 8GB RAM (16GB+ recommended for larger models)
- **Storage**: 2-10GB free space (depending on model size)
- **GPU** (Optional): NVIDIA GPU with CUDA support for faster inference

### Required Components

1. **BBj Language Server Extension**: This VS Code extension (already installed if you're reading this)

2. **CodeLlama Model**: A fine-tuned model in GGUF format
   - **Model Size Options**:
     - 7B parameters: ~4GB, good for basic completions
     - 13B parameters: ~7GB, better quality suggestions
     - 34B parameters: ~20GB, highest quality (requires powerful hardware)
   - **Fine-tuning**: Ideally trained on BBj code for best results

3. **LLM Server** (choose one):
   - **[Ollama](https://ollama.ai/)** ⭐ **Recommended** - Easiest setup, automatic model management
   - **[llama.cpp](https://github.com/ggerganov/llama.cpp)** - Maximum control, best performance
   - **OpenAI-compatible API server** - For custom setups

4. **Embedding Model** (for RAG features):
   - **nomic-embed-text** ⭐ **Recommended** - Works well with Ollama
   - **all-MiniLM-L6-v2** - Lightweight alternative
   - **text-embedding-ada-002** - If using OpenAI-compatible servers

## Quick Start

### 🎯 Get Up and Running in 5 Minutes

**Step 1: Install Ollama** (easiest option)
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows (use WSL2)
curl -fsSL https://ollama.ai/install.sh | sh
```

**Step 2: Get Your Models**
```bash
# Get a BBj-compatible model (adjust model name as needed)
ollama pull codellama:7b

# Get the embedding model for RAG
ollama pull nomic-embed-text
```

**Step 3: Enable AI Features**
1. Open VS Code Settings (Cmd/Ctrl + ,)
2. Search for "bbj.ai"
3. ✅ Enable `BBj AI: Enabled`
4. ✅ Enable `BBj AI: RAG Enabled` (optional but recommended)
5. Set `BBj AI: Ollama Model` to your model name (e.g., `codellama:7b`)

**Step 4: Start Coding!**
1. Open any `.bbj` file
2. Start typing BBj code
3. Wait a moment after typing
4. See AI suggestions appear as ghost text
5. Press **Tab** to accept, **Escape** to dismiss

### 📁 Documentation Structure for RAG

For the best RAG experience, organize your project documentation in these standard locations:

```
your-project/
├── docs/                    # Main documentation directory
│   ├── api/                 # API documentation
│   ├── guides/              # User guides and tutorials
│   ├── examples/            # Code examples
│   └── reference/           # Technical reference
├── documentation/           # Alternative docs location
├── help/                    # Help files
├── README.md               # Main project documentation
├── READMORE.md             # Extended documentation
├── API.md                  # API reference
├── USAGE.md                # Usage instructions
├── GUIDE.md                # User guide
└── examples/               # Code examples directory
    ├── basic/              # Basic BBj examples
    ├── advanced/           # Advanced patterns
    └── integrations/       # Integration examples
```

**RAG automatically indexes:**
- ✅ All `.bbj` and `.bbl` files in your workspace
- ✅ Documentation files (`.md`, `.txt`, `.rst`, `.adoc`)
- ✅ Code examples in documentation
- ✅ Comments and docstrings in your code
- ✅ README files and project documentation

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

## Advanced Feature: RAG (Retrieval-Augmented Generation)

### 🧠 What is RAG?

**RAG (Retrieval-Augmented Generation)** is a cutting-edge AI technique that dramatically improves code completion quality by combining your existing codebase knowledge with AI generation. Instead of relying solely on the AI's training data, RAG searches through your project's code and documentation to find relevant examples, then uses these examples to generate more accurate, contextually appropriate suggestions.

**Think of RAG as giving the AI access to your entire project's knowledge base.**

### 🎯 Why Use RAG?

| Without RAG | With RAG |
|-------------|----------|
| Generic suggestions based on training data | Project-specific suggestions based on your code |
| May not match your coding style | Learns and matches your patterns |
| Limited to common BBj patterns | Understands your domain-specific logic |
| No awareness of your project structure | Aware of your classes, methods, and conventions |

### 🚀 Advanced RAG Setup

#### Method 1: Ollama Setup (Recommended)

1. **Install and Configure Ollama**:
   ```bash
   # Install Ollama
   brew install ollama  # macOS
   # OR
   curl -fsSL https://ollama.ai/install.sh | sh  # Linux/WSL
   
   # Start Ollama service
   ollama serve &
   
   # Pull the embedding model
   ollama pull nomic-embed-text
   
   # Verify embedding model works
   ollama list | grep nomic-embed-text
   ```

2. **Test Embedding Service**:
   ```bash
   curl -X POST http://localhost:11434/api/embeddings \
     -H "Content-Type: application/json" \
     -d '{
       "model": "nomic-embed-text",
       "prompt": "BBj MSGBOX example"
     }' | jq '.embedding | length'
   # Should return a number (384 for nomic-embed-text)
   ```

#### Method 2: Custom Embedding Server

If you prefer a different embedding service:

```bash
# Example with sentence-transformers
pip install sentence-transformers flask

# Create embedding_server.py
cat > embedding_server.py << 'EOF'
from flask import Flask, request, jsonify
from sentence_transformers import SentenceTransformer

app = Flask(__name__)
model = SentenceTransformer('all-MiniLM-L6-v2')

@app.route('/api/embeddings', methods=['POST'])
def get_embedding():
    data = request.json
    text = data.get('prompt', '')
    embedding = model.encode(text).tolist()
    return jsonify({'embedding': embedding})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=11435)
EOF

# Run the server
python embedding_server.py
```

### 🔧 RAG Configuration in VS Code

1. **Open VS Code Settings** (Cmd/Ctrl + ,)
2. **Search for "bbj.ai"**
3. **Configure these settings**:

   ```json
   {
     "bbj.ai.enabled": true,
     "bbj.ai.ragEnabled": true,
     "bbj.ai.embeddingUrl": "http://localhost:11434/api/embeddings",
     "bbj.ai.embeddingModel": "nomic-embed-text",
     "bbj.ai.serverUrl": "http://localhost:11434",
     "bbj.ai.ollamaModel": "codellama:7b"
   }
   ```

### 🗂️ How RAG Indexes Your Project

RAG automatically scans and indexes multiple content types:

#### Code Files
- **`.bbj` files**: All BBj source code
- **`.bbl` files**: BBj library files
- **Function definitions**: `DEF`, `FNEND` blocks
- **Class definitions**: `CLASS`, `CLASSEND` blocks
- **Code patterns**: Loops, conditionals, callbacks

#### Documentation Sources
```
Project Structure for Optimal RAG:
├── 📁 docs/
│   ├── 📁 api/              # API documentation
│   ├── 📁 examples/         # Code examples
│   ├── 📁 guides/           # How-to guides
│   └── 📁 reference/        # Technical reference
├── 📁 documentation/        # Legacy docs location
├── 📁 help/                 # Help files
├── 📁 examples/             # Standalone examples
├── 📄 README.md             # Project overview
├── 📄 READMORE.md           # Extended docs
├── 📄 API.md                # API reference
├── 📄 USAGE.md              # Usage instructions
├── 📄 GUIDE.md              # User guide
├── 📄 REFERENCE.md          # Technical reference
└── 📄 CHANGELOG.md          # Version history
```

#### Content Extraction
- **Markdown sections**: Headers, code blocks, explanations
- **Code examples**: Fenced code blocks in documentation
- **Comments**: REM statements and inline documentation
- **Patterns**: Common BBj idioms and best practices

### 🔍 How RAG Retrieval Works

#### 1. Query Analysis
When you type code, RAG analyzes:
- **Current line content**: What you're typing
- **Surrounding context**: Previous 30 lines of code
- **File patterns**: Overall structure and imports
- **Keywords**: BBj-specific terms and identifiers

#### 2. Semantic Search
```
Your input: "A=MSGBOX"
         ↓
    Embedding Generation
         ↓
   Vector Similarity Search
         ↓
    Top 3 Most Similar Examples:
    1. msgbox_example.bbj (similarity: 0.89)
    2. user_dialog.bbj (similarity: 0.76)
    3. README.md - Dialog Section (similarity: 0.71)
```

#### 3. Context Enhancement
RAG enhances the AI prompt with:
- **Relevant code examples** from your project
- **Documentation snippets** explaining the feature
- **Similar patterns** used elsewhere in your codebase
- **Best practices** from your documentation

#### 4. Intelligent Generation
The AI receives a enhanced prompt like:
```
You are a BBj completion assistant.

RELEVANT EXAMPLES from user's project:
// From msgbox_example.bbj
A = MSGBOX("User confirmation required")
B = MSGBOX("Error: " + ERR_MSG$, "Error Dialog")

DOCUMENTATION:
MSGBOX(message$) - Displays a message dialog box
Returns: Integer value indicating user response

CURRENT CONTEXT:
[previous code lines...]

USER IS TYPING: A=MSGBOX
COMPLETE ONLY: 
```

### 📊 RAG Performance Monitoring

#### Enable Verbose Logging
Add to VS Code settings:
```json
{
  "bbj.ai.debugMode": true  // If available in future versions
}
```

#### Monitor RAG Activity
Check the Output panel (View → Output → BBj) for:

```
[10:30:15] RAG: Initializing RAG service...
[10:30:16] RAG: Indexing workspace files...
[10:30:18] RAG: Indexed 127 examples from 23 files
[10:30:19] RAG: Indexing documentation...
[10:30:20] RAG: Indexed 45 documentation sections
[10:30:20] RAG: RAG service initialized with 172 total examples

[10:32:45] RAG: Query for "MSGBOX" 
[10:32:45] RAG: Retrieved 3 examples, 2 docs (0.023s)
[10:32:45] RAG: Top match: msgbox_examples.bbj (similarity: 0.89)
```

#### Performance Metrics
- **Indexing time**: Usually 1-10 seconds depending on project size
- **Retrieval time**: Typically 10-50ms per query
- **Cache efficiency**: Embeddings are cached for faster subsequent queries

### 🛠️ Advanced RAG Customization

#### Customize Indexed Locations
Create a `.ragconfig.json` in your project root:
```json
{
  "includePaths": [
    "src/**/*.bbj",
    "lib/**/*.bbl", 
    "docs/**/*.md",
    "examples/**/*",
    "custom-docs/**/*.txt"
  ],
  "excludePaths": [
    "node_modules/**",
    "build/**",
    "temp/**"
  ],
  "maxFileSize": "1MB",
  "maxExamples": 1000
}
```

#### Document Your Code for Better RAG
```bbj
REM This function handles user authentication
REM @param username$ - The user's login name
REM @param password$ - The user's password
REM @returns success - 1 if successful, 0 if failed
REM @example AUTH_USER("john", "secret123")
DEF AUTH_USER(username$, password$)
    REM Implementation here
FNEND
```

### 🚨 RAG Troubleshooting

#### Common Issues and Solutions

**1. "RAG not indexing files"**
```bash
# Check file permissions
ls -la docs/
# Should show readable files

# Check VS Code Output panel
# Look for: "RAG: Indexed X examples from Y files"
```

**2. "Embedding service not responding"**
```bash
# Test Ollama
ollama list
ollama show nomic-embed-text

# Test connection
curl -v http://localhost:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "nomic-embed-text", "prompt": "test"}'
```

**3. "Poor retrieval quality"**
- ✅ Add more diverse examples to your codebase
- ✅ Include comments and documentation
- ✅ Use descriptive variable names
- ✅ Organize code into logical modules

**4. "RAG retrieval too slow"**
```json
// Reduce retrieval scope in settings
{
  "bbj.ai.ragMaxExamples": 2,        // Reduce from default 3
  "bbj.ai.ragEnabled": false         // Temporarily disable for comparison
}
```

#### Diagnostic Commands

```bash
# Check Ollama models
ollama list

# Test embedding generation
curl -X POST http://localhost:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "nomic-embed-text", "prompt": "BBj FOR loop example"}' \
  | jq '.embedding | length'

# Monitor Ollama logs
ollama logs

# Check VS Code extension logs
# View → Output → Select "BBj" from dropdown
```

### 🎯 RAG Best Practices

#### 📝 Documentation Best Practices
1. **Use clear section headers** in markdown files
2. **Include code examples** in documentation
3. **Add comments** to complex BBj code
4. **Organize examples** by topic or complexity
5. **Keep documentation up-to-date** with code changes

#### 🏗️ Project Structure Best Practices
```
optimal-bbj-project/
├── 📁 src/                 # Main source code
│   ├── 📁 modules/         # Organized by feature
│   ├── 📁 classes/         # Class definitions
│   └── 📁 utils/           # Utility functions
├── 📁 docs/               # Comprehensive documentation
│   ├── 📄 getting-started.md
│   ├── 📄 api-reference.md
│   └── 📁 examples/       # Working code examples
├── 📁 examples/           # Standalone examples
│   ├── 📁 basic/          # Simple examples
│   ├── 📁 advanced/       # Complex patterns
│   └── 📁 integrations/   # Third-party integrations
└── 📄 README.md          # Project overview with examples
```

#### 💡 Code Style for Better RAG
```bbj
REM ============================================================================
REM File: customer_manager.bbj
REM Purpose: Handles customer data operations and validation
REM Author: Your Name
REM Created: 2024-01-15
REM ============================================================================

REM Load customer data from database
REM This function demonstrates proper error handling and data validation
DEF LOAD_CUSTOMER(customer_id$)
    REM Validate input parameters
    IF LEN(customer_id$) = 0 THEN
        MSGBOX("Error: Customer ID cannot be empty")
        RETURN 0
    FI
    
    REM Database operations here...
    REM Return customer object or 0 for failure
FNEND
```

## 🌐 Centralized RAG Server (Enterprise Feature)

### Overview

For organizations that want to share BBj knowledge across teams, we offer a **Centralized RAG Server** that provides:

- **Company-wide knowledge base** of BBj code and documentation
- **Consistent code suggestions** for all developers
- **Central management** of documentation and examples
- **Access control** with API keys
- **Usage analytics** to understand how your team codes

### Quick Setup for Clients

To use a centralized RAG server instead of local indexing:

1. **Get your API key** from your administrator
2. **Configure VS Code**:
   ```json
   {
     "bbj.ai.useRemoteRag": true,
     "bbj.ai.remoteRagUrl": "https://rag.yourcompany.com",
     "bbj.ai.remoteRagApiKey": "bbj_your-api-key-here"
   }
   ```
3. **That's it!** The extension will now use the centralized knowledge base

### Benefits Over Local RAG

| Feature | Local RAG | Centralized RAG |
|---------|-----------|-----------------|
| **Setup Time** | Index on each machine | Instant access |
| **Documentation** | Must be in each project | Centrally managed |
| **Updates** | Manual per developer | Automatic for all |
| **Resources** | Uses local CPU/memory | Server handles load |
| **Consistency** | Varies by project | Same for everyone |

### Setting Up a RAG Server

For administrators who want to deploy a centralized RAG server:

1. **Deploy the Server**:
   ```bash
   # Using Docker (recommended)
   docker run -d \
     --name bbj-rag \
     -p 3000:3000 \
     -v /data/rag:/app/data \
     bbj/rag-server:latest
   ```

2. **Load Documentation**:
   ```bash
   # Import BBj official docs
   docker exec bbj-rag import-docs /docs/bbj --category official
   
   # Import company examples
   docker exec bbj-rag import-examples /company/examples --category internal
   ```

3. **Create API Keys**:
   ```bash
   docker exec bbj-rag create-api-key "Development Team" --permissions read
   ```

4. **Configure Ollama** for embeddings on the server

For detailed server setup instructions, see the [rag-server/README.md](rag-server/README.md).

### Security Considerations

- **HTTPS Required**: Always use HTTPS in production
- **API Key Security**: Store keys in environment variables, not in code
- **Network Access**: Restrict server access to company networks
- **Audit Logs**: Monitor usage through server analytics

### Hybrid Approach

You can use both local and centralized RAG:

```json
{
  "bbj.ai.ragEnabled": true,           // Enable RAG
  "bbj.ai.useRemoteRag": true,         // Use remote for BBj docs
  "bbj.ai.remoteRagUrl": "https://rag.company.com",
  "bbj.ai.remoteRagApiKey": "${env:BBJ_RAG_KEY}",
  // Local RAG still indexes your project files
}
```

This gives you the best of both worlds:
- **Official BBj documentation** from the central server
- **Project-specific code** from local indexing

## Configuration Settings

| Setting | Description | Default |
|---------|-------------|---------|
| `bbj.ai.enabled` | Enable/disable AI completions | `false` |
| `bbj.ai.modelPath` | Path to GGUF model (for auto-start) | `""` |
| `bbj.ai.serverUrl` | LLM server URL | `http://localhost:11434` |
| `bbj.ai.maxTokens` | Maximum tokens to generate | `150` |
| `bbj.ai.temperature` | Generation temperature (0-1) | `0.2` |
| `bbj.ai.debounceDelay` | Delay before triggering (ms) | `150` |
| `bbj.ai.pauseBeforeRequest` | Wait time after typing stops (ms) | `500` |
| `bbj.ai.ollamaModel` | Ollama model name (when using Ollama) | `codellama:code` |
| `bbj.ai.ragEnabled` | Enable RAG for context-aware completions | `false` |
| `bbj.ai.embeddingUrl` | Embedding service URL | `http://localhost:11434/api/embeddings` |
| `bbj.ai.embeddingModel` | Embedding model for RAG | `nomic-embed-text` |
| `bbj.ai.useRemoteRag` | Use centralized RAG server | `false` |
| `bbj.ai.remoteRagUrl` | Centralized RAG server URL | `""` |
| `bbj.ai.remoteRagApiKey` | API key for centralized RAG | `""` |

## Usage

1. **Start typing** BBj code in any `.bbj` file
2. **Wait briefly** after typing (configurable delay)
3. **Ghost text** will appear with the AI suggestion
4. **Accept** with Tab or **reject** with Escape

### RAG vs Standard Completions

| Feature | Standard | With RAG |
|---------|----------|----------|
| **Context** | Previous 30 lines | Previous 30 lines + relevant examples |
| **Accuracy** | Good for common patterns | Excellent for project-specific code |
| **Consistency** | Based on training data | Matches your coding style |
| **Setup** | Minimal | Requires embedding model |
| **Performance** | Faster | Slightly slower (retrieval overhead) |

### Tips for Best Results

**General Tips:**
- The AI uses the previous 30 lines of code as context
- More specific variable names and comments improve suggestions
- Lower temperature (0.1-0.3) gives more predictable completions
- Higher temperature (0.5-0.8) gives more creative suggestions

**RAG-Specific Tips:**
- Include diverse BBj examples in your workspace for better indexing
- Use descriptive comments - they help with retrieval matching
- Organize similar code patterns together for better context
- The system learns from your entire workspace, so keep good examples

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

### Centralized RAG Troubleshooting

#### Connection Issues

**"Failed to connect to RAG server"**
```bash
# 1. Check if you can reach the server
curl -I https://rag.company.com/health

# 2. Verify API key is correct
echo $BBJ_RAG_API_KEY

# 3. Test with full authentication
curl -H "Authorization: Bearer $BBJ_RAG_API_KEY" \
     https://rag.company.com/api/stats

# 4. Check VS Code settings
code --list-extensions | grep bbj
```

**"Invalid API key"**
- Ensure the key starts with `bbj_`
- Check for extra spaces or quotes
- Verify the key hasn't been revoked
- Contact your administrator for a new key

#### Performance Issues with Remote RAG

**"Slow completions with remote RAG"**
1. **Check network latency**:
   ```bash
   ping rag.company.com
   traceroute rag.company.com
   ```

2. **Enable local caching** in settings:
   ```json
   {
     "bbj.ai.cacheRemoteResults": true,
     "bbj.ai.cacheTimeout": 3600
   }
   ```

3. **Use hybrid mode** for better performance:
   ```json
   {
     "bbj.ai.ragEnabled": true,
     "bbj.ai.useRemoteRag": true,
     "bbj.ai.hybridMode": true  // Uses local for project files
   }
   ```

#### Server-Side Issues

**For Administrators:**

**"High memory usage on RAG server"**
```bash
# Check memory usage
docker stats bbj-rag-server

# Optimize embeddings cache
docker exec bbj-rag-server node dist/cli.js optimize-cache

# Reduce index size
docker exec bbj-rag-server node dist/cli.js prune-old-entries --days 90
```

**"Slow search performance"**
```sql
-- Analyze query performance
EXPLAIN QUERY PLAN 
SELECT * FROM code_examples 
WHERE embedding IS NOT NULL;

-- Vacuum database
VACUUM ANALYZE;

-- Rebuild indexes
REINDEX;
```

## Privacy & Security

- All processing happens locally on your machine
- No code is sent to external services
- The model runs entirely offline
- Server binds to localhost only by default

## Advanced Topics

### 🏢 Enterprise Deployment: Centralized RAG Server

#### Complete Setup Guide

**1. Server Infrastructure Requirements**

```yaml
# Minimum Requirements
CPU: 4 cores
RAM: 8GB (16GB recommended)
Storage: 50GB SSD
Network: 1Gbps connection

# For Large Teams (100+ developers)
CPU: 8+ cores
RAM: 32GB
Storage: 500GB SSD (NVMe preferred)
Network: 10Gbps connection
```

**2. Production Deployment with Docker Compose**

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  rag-server:
    build: ./rag-server
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DB_PATH=/data/rag.db
      - OLLAMA_URL=http://ollama:11434
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - rag-data:/data
      - rag-logs:/app/logs
    depends_on:
      - ollama
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-models:/root/.ollama
    environment:
      - OLLAMA_HOST=0.0.0.0
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - rag-server
    restart: unless-stopped

volumes:
  rag-data:
  rag-logs:
  ollama-models:
```

**3. Initial Data Loading Script**

Create `scripts/initial-load.sh`:
```bash
#!/bin/bash
# Initial documentation loading script

RAG_CONTAINER="bbj-rag-server"
DOCS_BASE="/opt/bbj-docs"

echo "🔄 Loading BBj official documentation..."
docker exec $RAG_CONTAINER node dist/cli.js import-docs \
  $DOCS_BASE/official \
  --category "official" \
  --recursive

echo "📚 Loading company code standards..."
docker exec $RAG_CONTAINER node dist/cli.js import-docs \
  $DOCS_BASE/standards \
  --category "standards"

echo "💡 Loading code examples..."
docker exec $RAG_CONTAINER node dist/cli.js import-examples \
  $DOCS_BASE/examples \
  --category "examples" \
  --language "bbj"

echo "📖 Loading API documentation..."
docker exec $RAG_CONTAINER node dist/cli.js import-javadoc \
  $DOCS_BASE/javadoc \
  --category "api"

echo "✅ Initial load complete!"
```

**4. Monitoring and Maintenance**

Set up monitoring with Prometheus and Grafana:

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'rag-server'
    static_configs:
      - targets: ['rag-server:3000']
    metrics_path: '/metrics'
```

**5. Backup Strategy**

Automated daily backups:
```bash
#!/bin/bash
# backup-rag.sh
BACKUP_DIR="/backups/rag"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
docker exec bbj-rag-server sqlite3 /data/rag.db ".backup /data/backup_$DATE.db"

# Compress and move
docker cp bbj-rag-server:/data/backup_$DATE.db $BACKUP_DIR/
gzip $BACKUP_DIR/backup_$DATE.db

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.gz" -mtime +30 -delete
```

#### Team Onboarding Process

**1. Create Team Configuration**

`.vscode/settings.json` (commit to repo):
```json
{
  "bbj.ai.enabled": true,
  "bbj.ai.ragEnabled": true,
  "bbj.ai.useRemoteRag": true,
  "bbj.ai.remoteRagUrl": "https://rag.company.com",
  // API key from environment variable
  "bbj.ai.remoteRagApiKey": "${env:BBJ_RAG_API_KEY}"
}
```

**2. Developer Setup Script**

`setup-ai-completions.sh`:
```bash
#!/bin/bash
echo "🤖 BBj AI Completion Setup"
echo "========================="

# Check if API key is set
if [ -z "$BBJ_RAG_API_KEY" ]; then
  echo "❌ Error: BBJ_RAG_API_KEY environment variable not set"
  echo "📧 Contact your administrator for an API key"
  exit 1
fi

# Test connection
echo "🔍 Testing RAG server connection..."
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer $BBJ_RAG_API_KEY" \
  https://rag.company.com/api/stats)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Successfully connected to RAG server!"
  echo "📊 Server statistics:"
  echo "$RESPONSE" | head -n-1 | jq '.'
else
  echo "❌ Failed to connect. HTTP status: $HTTP_CODE"
  exit 1
fi

echo ""
echo "🎉 Setup complete! You can now use AI completions in VS Code."
```

**3. Usage Analytics Dashboard**

Create a web dashboard to show:
- Most searched patterns
- Popular code examples
- Usage by team/developer
- Response time metrics
- Error rates

### Custom Prompt Templates

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

### Performance Tuning

#### RAG Server Optimization

**1. Database Indexing**
```sql
-- Add indexes for better performance
CREATE INDEX idx_embeddings_similarity ON code_examples(embedding);
CREATE INDEX idx_search_queries ON usage_stats(created_at, endpoint);
```

**2. Caching Strategy**
```javascript
// Redis caching for embeddings
const redis = require('redis');
const client = redis.createClient();

async function getCachedEmbedding(text) {
  const cached = await client.get(`embed:${text}`);
  if (cached) return JSON.parse(cached);
  
  const embedding = await generateEmbedding(text);
  await client.setex(`embed:${text}`, 3600, JSON.stringify(embedding));
  return embedding;
}
```

**3. Load Balancing**
```nginx
upstream rag_servers {
    least_conn;
    server rag1.internal:3000 weight=5;
    server rag2.internal:3000 weight=5;
    server rag3.internal:3000 weight=1 backup;
}
```

## Contributing

To improve the AI completions:

1. Collect examples of good BBj code patterns
2. Fine-tune the model with more BBj-specific data
3. Share feedback on completion quality
4. Submit PRs to enhance the completion logic

## Known Limitations

**Standard Completions:**
- Limited to single-line or small multi-line snippets
- Context limited to current file's previous lines
- No project-wide code awareness

**RAG Completions:**
- Slightly slower due to retrieval overhead
- Embedding quality depends on workspace code diversity
- Requires additional setup (embedding model)

**General:**
- Real-time type information from the language server isn't used (yet)
- No semantic understanding beyond training data and indexed examples

## Future Enhancements

**Planned RAG Improvements:**
- Integration with BBj documentation and JavaDoc
- Support for external code repositories as knowledge sources
- Semantic code understanding beyond text matching
- Dynamic re-indexing as code changes

**General Improvements:**
- Integration with language server for type-aware completions
- Custom completion triggers and templates
- Completion explanations and rationale
- Support for completion of entire methods/classes
- Multi-modal completions (code + comments + documentation)