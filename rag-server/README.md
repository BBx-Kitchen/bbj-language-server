# BBj RAG Server

## 🌐 Overview

The BBj RAG (Retrieval-Augmented Generation) Server provides a centralized API for searching BBj code examples and documentation. It uses vector embeddings to find semantically similar code snippets and documentation, improving code suggestions in the BBj VS Code extension.

## 🎯 Features

- **Semantic Search**: Find relevant code examples using natural language queries
- **Vector Embeddings**: Powered by Ollama's embedding models for accurate similarity matching
- **API Key Authentication**: Secure access control for your organization
- **Rate Limiting**: Built-in protection against abuse
- **SQLite Database**: Lightweight, file-based storage for easy deployment
- **Admin API**: Endpoints for importing code and managing content

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Ollama with embedding model (e.g., `nomic-embed-text`) - **Required for search functionality**
- TypeScript

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd bbj-language-server/rag-server

# Install dependencies
npm install

# Build TypeScript code
npm run build

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize the database
npm run init-db

# Note: The database will be created at ./data/rag.db
# You can change this location by editing DB_PATH in .env

# Create your first API key
npm run cli api-key create "Admin" -- --permissions admin

# Start the server
npm start
```

### Configure Ollama

The server requires Ollama for generating embeddings:

```bash
# Install Ollama (if not already installed)
# macOS: brew install ollama
# Linux: curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service (runs on http://127.0.0.1:11434)
ollama serve

# In another terminal, pull the embedding model
ollama pull nomic-embed-text

# Verify Ollama is running
curl http://127.0.0.1:11434/api/tags
```

**Important**: Without Ollama running, the search functionality will not work, but the server will still start and accept API requests.

## 📋 Configuration

### Environment Variables

Create a `.env` file in the server directory:

```env
# Server Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Database
DB_PATH=./data/rag.db

# Ollama Configuration  
OLLAMA_URL=http://localhost:11434
EMBEDDING_MODEL=nomic-embed-text

# Security
ALLOWED_ORIGINS=http://localhost:*,https://*.company.com

# Logging
LOG_LEVEL=info
LOG_DIR=./logs

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
SEARCH_RATE_LIMIT_WINDOW=1
SEARCH_RATE_LIMIT_MAX_REQUESTS=30
```

## 🔐 Authentication

The server uses API key authentication. Keys must be created directly in the database or through the admin API.

### Creating API Keys

#### Option 1: Using the CLI (Recommended)

```bash
# First, build the project
npm run build

# Create an API key
npm run cli api-key create "Development Team" -- --permissions read write

# List all API keys
npm run cli api-key list

# Revoke an API key
npm run cli api-key revoke <key-id>
```

#### Option 2: Using the Admin API

```bash
curl -X POST http://localhost:3000/admin/api-keys \
  -H "Authorization: Bearer <admin-api-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Development Team",
    "permissions": ["read"]
  }'
```

### Using API Keys

Include the API key in your requests:

```bash
# In Authorization header (recommended)
Authorization: Bearer your-api-key-here

# In request body
{
  "apiKey": "your-api-key-here",
  "query": "MSGBOX"
}

# In query parameters
GET /api/stats?apiKey=your-api-key-here
```

## 🔧 API Documentation

### Public Endpoints

#### Health Check

```http
GET /health

Response:
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-20T10:30:00Z"
}
```

### Authenticated Endpoints

All endpoints below require API key authentication.

#### Search for Code Examples

```http
POST /api/search
Content-Type: application/json

{
  "query": "MSGBOX",
  "context": "user dialog handling",
  "maxExamples": 5,
  "maxDocs": 3
}

Response:
{
  "examples": [
    {
      "id": "example-123",
      "content": "A = MSGBOX(\"Hello World\")",
      "description": "Display a simple message",
      "category": "ui",
      "similarity": 0.89
    }
  ],
  "documentation": [
    {
      "id": "doc-456", 
      "title": "MSGBOX Function",
      "content": "Displays a message dialog box...",
      "category": "reference",
      "similarity": 0.92
    }
  ]
}
```

#### Batch Search

Search for multiple queries in a single request:

```http
POST /api/search/batch
Content-Type: application/json

{
  "queries": [
    { "query": "FOR loop", "context": "iteration" },
    { "query": "SQL SELECT", "context": "database" }
  ],
  "maxExamples": 2,
  "maxDocs": 1
}

Response:
{
  "results": [
    {
      "query": "FOR loop",
      "examples": [...],
      "documentation": [...]
    },
    {
      "query": "SQL SELECT", 
      "examples": [...],
      "documentation": [...]
    }
  ]
}
```

#### Get Categories

List all available categories:

```http
GET /api/categories

Response:
{
  "categories": [
    { "name": "ui", "count": 45 },
    { "name": "database", "count": 23 },
    { "name": "file-io", "count": 67 }
  ]
}
```

#### Get Statistics

```http
GET /api/stats

Response:
{
  "database": {
    "totalExamples": 523,
    "totalDocumentation": 89,
    "totalCategories": 12
  },
  "server": {
    "uptime": 432000,
    "version": "1.0.0"
  }
}
```

### Admin Endpoints

Admin endpoints require authentication and appropriate permissions.

#### Create API Key

```http
POST /admin/api-keys
Content-Type: application/json

{
  "name": "New API Key",
  "permissions": ["read", "write"]
}

Response:
{
  "id": "key-789",
  "key": "bbj_a1b2c3d4e5f6...",
  "name": "New API Key",
  "created": "2024-01-20T10:30:00Z"
}
```

#### Import Code Examples

```http
POST /admin/import
Content-Type: application/json

{
  "type": "directory",
  "path": "/path/to/examples",
  "category": "examples",
  "recursive": true
}

Response:
{
  "imported": 45,
  "skipped": 3,
  "errors": []
}
```

#### Usage Statistics

```http
GET /admin/stats/usage?period=7d

Response:
{
  "period": "7d",
  "totalRequests": 1523,
  "uniqueUsers": 45,
  "topQueries": [
    { "query": "MSGBOX", "count": 89 },
    { "query": "FOR loop", "count": 67 }
  ],
  "requestsByEndpoint": {
    "/api/search": 1234,
    "/api/search/batch": 289
  }
}
```

## 🛠️ CLI Tool

The RAG server includes a command-line interface for management tasks:

### API Key Management

```bash
# Create a new API key
npm run cli api-key create "Team Name" -- --permissions read write

# List all API keys
npm run cli api-key list

# Revoke an API key
npm run cli api-key revoke <key-id>
```

### Content Import

```bash
# Import BBj files from a directory (with embedding generation)
npm run cli import directory /path/to/bbj/examples -- --category official --recursive

# Import without embeddings (faster, but no semantic search)
npm run cli import directory /path/to/examples -- --category examples --no-embeddings

# Force import even if Ollama is not available
npm run cli import directory /path/to/examples -- --category examples --force
```

### Database Management

```bash
# Show database statistics
npm run cli db stats

# Optimize database (VACUUM)
npm run cli db vacuum

# Clear old usage statistics (default: 90 days)
npm run cli db clear-usage -- --days 30

# Generate embeddings for existing data (if imported without embeddings)
npm run cli db reindex-embeddings
```

### Usage Analytics

```bash
# Show top search queries
npm run cli usage top-queries -- --limit 20
```

### Ollama Management

```bash
# Check if Ollama is running and embedding model is available
npm run cli ollama check
```

### Getting Help

```bash
# Show all available commands
npm run cli -- --help

# Show help for a specific command
npm run cli api-key -- --help
npm run cli import -- --help
```

## 📚 Loading Content: Step-by-Step Guide

### Understanding How RAG Search Works

The RAG server uses **vector embeddings** to enable semantic search. Here's what this means:

1. **Traditional search**: Looks for exact text matches (e.g., searching "MSGBOX" only finds files containing "MSGBOX")
2. **Semantic search**: Understands meaning and context (e.g., searching "show dialog" finds MSGBOX examples even without those exact words)

**Important**: For semantic search to work, each code example must be converted into a numerical representation (embedding) using Ollama. Without embeddings, search will return no results!

### Step-by-Step Import Process

#### Step 1: Ensure Prerequisites

```bash
# 1. Verify Ollama is running
curl http://127.0.0.1:11434/api/tags

# 2. Verify embedding model is installed
ollama list | grep nomic-embed-text

# If not installed:
ollama pull nomic-embed-text
```

#### Step 2: Prepare Your Code

Organize your BBj code files in directories by category:

```
your-code/
├── examples/          # General examples
│   ├── ui/           # UI-related code
│   ├── database/     # Database operations
│   └── utilities/    # Utility functions
├── production/       # Production code
└── legacy/          # Legacy code samples
```

#### Step 3: Import Your Code

```bash
# Import a single category
npm run cli import directory /path/to/your-code/examples/ui -- --category ui-examples

# Import recursively (includes all subdirectories)
npm run cli import directory /path/to/your-code/examples -- --category examples --recursive

# Import production code
npm run cli import directory /path/to/your-code/production -- --category production --recursive
```

#### Step 4: Verify Import Success

```bash
# Check import statistics
npm run cli db stats

# List all categories
curl http://localhost:3000/api/categories \
  -H "Authorization: Bearer YOUR_API_KEY"

# Test search
curl -X POST http://localhost:3000/api/search \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "your search term", "maxExamples": 5}'
```

### What You Might Have Missed: The Embedding Process

When you import code, two things happen:

1. **Code is stored** in the database with metadata (category, source file, keywords)
2. **Embeddings are generated** for each code snippet using Ollama

**If Ollama is not running during import**:
- Code will be stored but without embeddings
- Search will return empty results
- You'll need to re-import with Ollama running

### Supported File Types

The import process supports these BBj file extensions:

- `.bbj` - Standard BBj program files
- `.bbl` - BBj library files  
- `.bbjs` - BBj source files
- `.bbx` - BBj tokenized program files

### Categories: Organizing Your Code

Categories help organize and filter search results. Best practices:

```bash
# Use descriptive category names
npm run cli import directory /path/to/code -- --category "ui-components"
npm run cli import directory /path/to/code -- --category "database-utilities"
npm run cli import directory /path/to/code -- --category "business-logic"

# Categories can be hierarchical in meaning
npm run cli import directory /path/to/code -- --category "examples-ui"
npm run cli import directory /path/to/code -- --category "examples-database"

# Filter search by category
curl -X POST http://localhost:3000/api/search \
  -d '{"query": "button click", "category": "ui-components"}'
```

### Import Options Explained

| Option | Description | Example | Default |
|--------|-------------|---------|---------|
| `--category` | Label for organizing code | `--category production` | `general` |
| `--recursive` | Include subdirectories | `--recursive` | `false` |
| `--no-embeddings` | Skip embedding generation | `--no-embeddings` | embeddings enabled |
| `--force` | Skip Ollama availability checks | `--force` | checks enabled |

### Import Workflow

The CLI import process now includes intelligent Ollama detection:

1. **Pre-flight Check**: Automatically detects if Ollama is running
2. **Model Verification**: Checks if the required embedding model is available
3. **User Prompt**: Offers options if Ollama is not available:
   - Start Ollama and retry
   - Import without embeddings
   - Cancel import
4. **Smart Import**: Proceeds with or without embeddings based on availability
5. **Future Fix**: Use `reindex-embeddings` command to add embeddings later

### Troubleshooting Import Issues

**Problem: "Import successful but search returns no results"**

1. Check if embeddings were generated during import:
   ```bash
   # Check how many examples have embeddings
   sqlite3 data/rag.db "SELECT COUNT(*) FROM code_examples WHERE embedding IS NOT NULL AND LENGTH(embedding) > 2;"
   ```

2. If no embeddings exist, check Ollama availability:
   ```bash
   # Use the built-in check command
   npm run cli ollama check
   ```

3. Generate embeddings for existing data:
   ```bash
   # Ensure Ollama is running first
   ollama serve  # In one terminal
   npm run cli db reindex-embeddings  # In another terminal
   ```

4. For future imports, ensure Ollama is running or use --no-embeddings flag:
   ```bash
   # Import with embeddings (requires Ollama)
   npm run cli import directory /path/to/code -- --category test --recursive
   
   # Import without embeddings (fast but no search)
   npm run cli import directory /path/to/code -- --category test --no-embeddings
   ```

**Problem: "Import is very slow"**

- Embedding generation takes time (typically 0.1-0.5 seconds per code snippet)
- For large codebases, import in smaller batches by category
- Monitor progress in server logs

### Advanced: How Code is Extracted

The importer intelligently extracts code examples by looking for:

- Function definitions (`DEF`, `FNEND`)
- Class definitions (`CLASS`, `CLASSEND`)
- Control structures (`FOR`, `WHILE`, `IF`)
- BBj-specific commands (`MSGBOX`, `PRINT`, `SQL`)

Each extracted snippet includes surrounding context and is stored with relevant keywords for enhanced searchability.

## 🖥️ Client Configuration

### VS Code Settings

Configure VS Code to use the RAG server:

```json
{
  "bbj.ai.enabled": true,
  "bbj.ai.ragEnabled": true,
  "bbj.ai.useRemoteRag": true,
  "bbj.ai.remoteRagUrl": "http://localhost:3000",
  "bbj.ai.remoteRagApiKey": "your-api-key-here"
}
```

### Environment Variable Configuration

For team settings, use environment variables:

```json
{
  "bbj.ai.useRemoteRag": true,
  "bbj.ai.remoteRagUrl": "${env:BBJ_RAG_URL}",
  "bbj.ai.remoteRagApiKey": "${env:BBJ_RAG_API_KEY}"
}
```

## 🚨 Troubleshooting

### Common Issues

**"Connection refused" error**
- Verify the server is running: `ps aux | grep node`
- Check the port is not in use: `lsof -i :3000`
- Review server logs: `tail -f ./logs/combined.log`

**"Invalid API key" error**
- Verify the API key exists in the database
- Check the key is being sent correctly in requests
- Ensure the key has the required permissions

**"No results found" for queries**
- Check if content has been imported: `GET /api/stats`
- Verify Ollama is running: `curl http://127.0.0.1:11434/api/tags`
- Check embeddings are being generated during import

**"ECONNREFUSED" or "fetch failed" errors**
- Ollama is not running. Start it with: `ollama serve`
- If you see IPv6 connection errors (::1), ensure your .env file uses `OLLAMA_URL=http://127.0.0.1:11434`
- Check if Ollama is listening on the correct port: `lsof -i :11434`
- Make sure the embedding model is installed: `ollama list | grep nomic-embed-text`

### Debug Mode

Enable debug logging for more details:

```bash
# Set in .env
LOG_LEVEL=debug

# Or via environment variable
LOG_LEVEL=debug npm start
```

## 🏗️ Development

### Running in Development Mode

```bash
# Install dependencies
npm install

# Run in watch mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### Database Schema

The server uses SQLite with the following main tables:

- `code_examples`: Stores code snippets with embeddings
- `documentation`: Stores documentation entries
- `api_keys`: Authentication keys
- `api_usage`: Usage tracking

### Database Persistence and Storage

#### Default Location

By default, the SQLite database is stored at:
```
./data/rag.db
```

This path is relative to the directory where you run the server. For example:
- If you run the server from `/opt/rag-server/`, the database will be at `/opt/rag-server/data/rag.db`
- If you run the server from `/home/user/bbj-language-server/rag-server/`, the database will be at `/home/user/bbj-language-server/rag-server/data/rag.db`

#### Configuring Database Location

You can customize the database location using the `DB_PATH` environment variable:

```bash
# In .env file
DB_PATH=/var/lib/rag-server/rag.db

# Or via environment variable
DB_PATH=/data/rag.db npm start
```

**Important**: The directory must exist and be writable by the process running the server.

#### Database Files

The SQLite database consists of several files:
- `rag.db` - Main database file containing all data
- `rag.db-shm` - Shared memory file (created during write operations)
- `rag.db-wal` - Write-Ahead Log file (for transaction durability)

The `-shm` and `-wal` files are temporary and managed by SQLite automatically.

#### Backup Recommendations

To backup the database safely:

```bash
# Option 1: Using SQLite backup command (recommended)
sqlite3 ./data/rag.db ".backup /path/to/backup/rag_backup.db"

# Option 2: Using the CLI tool to export data
npm run cli db vacuum  # Optimize before backup
cp ./data/rag.db /path/to/backup/rag_backup.db

# Option 3: Automated daily backups with cron
# Add to crontab: crontab -e
0 2 * * * sqlite3 /opt/rag-server/data/rag.db ".backup /backup/rag_$(date +\%Y\%m\%d).db"
```

#### Storage Considerations

- **Size**: Database size depends on the number of code examples and embeddings
  - Each code example with embeddings: ~5-10 KB
  - 10,000 examples ≈ 50-100 MB
  - Use `npm run cli db stats` to check current size

- **Performance**: SQLite performs well up to several GB
  - For databases > 1GB, ensure sufficient disk I/O performance
  - Consider SSD storage for better performance

- **Permissions**: Ensure proper file permissions
  ```bash
  # Set appropriate permissions
  chmod 644 ./data/rag.db
  chmod 755 ./data/
  ```

#### Migration and Portability

The database is fully portable between systems:

```bash
# Move to new server
scp ./data/rag.db user@newserver:/opt/rag-server/data/

# Or use rsync for larger databases
rsync -avz ./data/rag.db user@newserver:/opt/rag-server/data/
```

### Adding New Features

1. Add new routes in `src/routes/`
2. Add business logic in `src/services/`
3. Update TypeScript types as needed
4. Add tests for new functionality
5. Update this documentation

## 🚀 Production Deployment

### Using PM2

```bash
# Install PM2
npm install -g pm2

# Start the server
pm2 start dist/server.js --name bbj-rag

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using systemd

Create `/etc/systemd/system/bbj-rag.service`:

```ini
[Unit]
Description=BBj RAG Server
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/opt/bbj-rag
ExecStart=/usr/bin/node dist/server.js
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start the service
sudo systemctl enable bbj-rag
sudo systemctl start bbj-rag
```

### Nginx Reverse Proxy

```nginx
server {
    listen 443 ssl http2;
    server_name rag.company.com;

    ssl_certificate /etc/ssl/certs/company.crt;
    ssl_certificate_key /etc/ssl/private/company.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 📝 License

[Your License Here]

## 🆘 Support

- GitHub Issues: [Create an issue](https://github.com/your-org/bbj-rag/issues)
- Documentation: This README
- VS Code Extension: See bbj-vscode documentation