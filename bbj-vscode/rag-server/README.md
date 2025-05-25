# BBj Centralized RAG Server

## 🌐 Overview

The BBj Centralized RAG Server provides a company-wide repository of BBj code examples, documentation, and best practices that can be accessed by all developers using the BBj VS Code extension. This eliminates the need for each developer to maintain their own copy of BBj documentation and allows for consistent, up-to-date code suggestions across your organization.

## 🎯 Benefits

- **Centralized Knowledge Base**: Single source of truth for BBj documentation and examples
- **Consistent Suggestions**: All developers get the same high-quality code completions
- **Easy Updates**: Update documentation once, benefit everywhere
- **Resource Efficiency**: No need to index documentation on each developer's machine
- **Access Control**: API key-based authentication for secure access
- **Usage Analytics**: Track how your team uses code suggestions

## 🚀 Quick Start

### 1. Deploy the Server

#### Option A: Docker Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/bbj-rag-server.git
cd bbj-rag-server

# Build the Docker image
docker build -t bbj-rag-server .

# Run the server
docker run -d \
  --name bbj-rag \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e OLLAMA_URL=http://ollama-server:11434 \
  bbj-rag-server
```

#### Option B: Manual Deployment

```bash
# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run the server
npm start
```

### 2. Configure Ollama for Embeddings

The RAG server requires an embedding service. We recommend Ollama:

```bash
# On the server hosting Ollama
ollama pull nomic-embed-text

# Ensure Ollama is accessible from the RAG server
ollama serve --host 0.0.0.0
```

### 3. Generate API Keys

```bash
# Access the admin CLI
node dist/cli.js create-api-key "Development Team" --permissions read

# Output:
# API Key created successfully!
# Name: Development Team
# Key: bbj_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0
# Save this key securely - it cannot be retrieved later!
```

### 4. Load Initial Documentation

```bash
# Load BBj documentation
node dist/cli.js import-docs /path/to/bbj/docs --category "official"

# Load company examples
node dist/cli.js import-examples /path/to/examples --category "company"

# Load from Git repository
node dist/cli.js import-git https://github.com/BBj/examples.git
```

## 📋 Server Configuration

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
JWT_SECRET=your-secret-key-here
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

### Nginx Configuration (for Production)

```nginx
server {
    listen 443 ssl http2;
    server_name rag.company.com;

    ssl_certificate /etc/ssl/certs/company.crt;
    ssl_certificate_key /etc/ssl/private/company.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
}
```

## 🔧 API Documentation

### Authentication

All API requests require an API key in the Authorization header:

```
Authorization: Bearer bbj_your-api-key-here
```

### Endpoints

#### Search for Code Examples and Documentation

```http
POST /api/search
Content-Type: application/json

{
  "query": "MSGBOX",
  "context": "user dialog handling",
  "maxExamples": 3,
  "maxDocs": 2
}
```

Response:
```json
{
  "examples": [
    {
      "id": "example-1",
      "content": "A = MSGBOX(\"Hello World\")",
      "context": "Display a simple message",
      "keywords": ["MSGBOX", "dialog"],
      "similarity": 0.89
    }
  ],
  "documentation": [
    {
      "title": "MSGBOX Function",
      "content": "Displays a message dialog box...",
      "similarity": 0.92
    }
  ],
  "metadata": {
    "query": "MSGBOX",
    "responseTime": 45,
    "totalResults": 5
  }
}
```

#### Batch Search

```http
POST /api/search/batch
Content-Type: application/json

{
  "queries": [
    { "query": "FOR loop", "context": "iteration" },
    { "query": "SQL SELECT", "context": "database" }
  ],
  "maxExamples": 2
}
```

#### Get Statistics

```http
GET /api/stats

Response:
{
  "totalExamples": 1523,
  "totalCategories": 12,
  "totalSources": 5,
  "categories": ["official", "company", "community"],
  "sources": ["bbj-docs", "examples", "stackoverflow"]
}
```

## 📚 Loading Documentation

### Import BBj Documentation

The server can import various documentation formats:

```bash
# Import markdown files
node dist/cli.js import-docs ./docs --format markdown --category official

# Import JavaDoc
node dist/cli.js import-javadoc ./javadoc --category api

# Import from BBj installation
node dist/cli.js import-bbj /opt/bbj --include-examples
```

### Documentation Structure

Organize your documentation for optimal indexing:

```
documentation/
├── official/              # BBj official docs
│   ├── language/          # Language reference
│   ├── functions/         # Built-in functions
│   ├── api/               # API documentation
│   └── tutorials/         # Tutorials
├── company/               # Company-specific docs
│   ├── standards/         # Coding standards
│   ├── patterns/          # Design patterns
│   └── integrations/      # Integration guides
└── examples/              # Code examples
    ├── basic/             # Basic examples
    ├── advanced/          # Advanced patterns
    └── real-world/        # Production examples
```

### Automatic Documentation Updates

Set up a cron job to keep documentation current:

```bash
# crontab -e
0 2 * * * /opt/bbj-rag/scripts/update-docs.sh
```

`update-docs.sh`:
```bash
#!/bin/bash
cd /opt/bbj-rag

# Pull latest documentation
git -C /opt/bbj-docs pull

# Re-import documentation
node dist/cli.js import-docs /opt/bbj-docs --clear-existing

# Notify administrators
curl -X POST https://slack.webhook.url -d '{"text":"RAG documentation updated"}'
```

## 🔐 Security Best Practices

1. **Use HTTPS in Production**: Always deploy behind HTTPS
2. **Rotate API Keys**: Implement key rotation policy
3. **Monitor Usage**: Review access logs regularly
4. **Network Security**: Restrict access to trusted networks
5. **Database Backups**: Regular backups of the RAG database

### API Key Management

```bash
# List all API keys
node dist/cli.js list-api-keys

# Revoke a key
node dist/cli.js revoke-api-key <key-id>

# Export usage statistics
node dist/cli.js export-usage --start 2024-01-01 --format csv
```

## 🖥️ Client Configuration

### VS Code Settings

Configure VS Code to use the centralized RAG server:

```json
{
  "bbj.ai.enabled": true,
  "bbj.ai.ragEnabled": true,
  "bbj.ai.useRemoteRag": true,
  "bbj.ai.remoteRagUrl": "https://rag.company.com",
  "bbj.ai.remoteRagApiKey": "bbj_your-api-key-here"
}
```

### Team Configuration

Create a `.vscode/settings.json` in your project:

```json
{
  "bbj.ai.useRemoteRag": true,
  "bbj.ai.remoteRagUrl": "https://rag.company.com",
  // Don't commit the API key - use environment variable
  "bbj.ai.remoteRagApiKey": "${env:BBJ_RAG_API_KEY}"
}
```

## 📊 Monitoring and Analytics

### Health Checks

```bash
# Check server health
curl https://rag.company.com/health

# Response:
{
  "status": "healthy",
  "uptime": 432000,
  "database": "connected",
  "embedding_service": "connected",
  "total_examples": 1523
}
```

### Usage Dashboard

Access the admin dashboard at `https://rag.company.com/admin` to view:

- Search query analytics
- Popular code patterns
- API key usage
- Performance metrics

## 🚨 Troubleshooting

### Common Issues

**1. "Connection refused" error**
- Check if the server is running: `systemctl status bbj-rag`
- Verify firewall settings: `sudo ufw status`
- Check server logs: `tail -f /opt/bbj-rag/logs/combined.log`

**2. "Invalid API key" error**
- Verify the key in VS Code settings
- Check if the key is active: `node dist/cli.js check-api-key <key>`
- Ensure the key has proper permissions

**3. "No results found" for queries**
- Verify documentation is loaded: `node dist/cli.js stats`
- Check embedding service: `curl http://localhost:11434/api/tags`
- Re-index if needed: `node dist/cli.js reindex`

### Debug Mode

Enable debug logging:

```bash
# Set in .env
LOG_LEVEL=debug

# Or via environment variable
LOG_LEVEL=debug npm start
```

## 🔄 Scaling Considerations

### High Availability Setup

For production deployments with high availability:

1. **Load Balancer**: Use HAProxy or Nginx
2. **Multiple Instances**: Run 2+ server instances
3. **Shared Storage**: Use NFS or S3 for data
4. **Database Replication**: SQLite → PostgreSQL migration
5. **Caching Layer**: Add Redis for embedding cache

### Performance Optimization

```json
{
  "embedding_cache_size": 10000,
  "search_cache_ttl": 3600,
  "max_concurrent_embeddings": 10,
  "database_connection_pool": 20
}
```

## 🤝 Contributing

To add new features or improve the RAG server:

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

## 📝 License

[Your License Here]

## 🆘 Support

- Documentation: https://docs.company.com/bbj-rag
- Issues: https://github.com/company/bbj-rag/issues
- Email: bbj-support@company.com
- Slack: #bbj-development