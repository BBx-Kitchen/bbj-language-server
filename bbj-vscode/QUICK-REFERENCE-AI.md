# 🚀 BBj AI Completions - Quick Reference

## 🎯 Quick Setup

### Local AI Only (Simplest)
```json
{
  "bbj.ai.enabled": true,
  "bbj.ai.serverUrl": "http://localhost:11434",
  "bbj.ai.ollamaModel": "codellama:7b"
}
```

### Local AI + Local RAG
```json
{
  "bbj.ai.enabled": true,
  "bbj.ai.ragEnabled": true,
  "bbj.ai.embeddingModel": "nomic-embed-text"
}
```

### Local AI + Remote RAG (Enterprise)
```json
{
  "bbj.ai.enabled": true,
  "bbj.ai.ragEnabled": true,
  "bbj.ai.useRemoteRag": true,
  "bbj.ai.remoteRagUrl": "https://rag.company.com",
  "bbj.ai.remoteRagApiKey": "${env:BBJ_RAG_API_KEY}"
}
```

## ⌨️ Keyboard Shortcuts

| Action | Key |
|--------|-----|
| Accept completion | `Tab` |
| Reject completion | `Escape` |
| Trigger manually | `Ctrl+Space` (if configured) |

## 🔧 Common Commands

### Check AI Status
```bash
# Is Ollama running?
ollama list

# Test AI completion
curl http://localhost:11434/api/generate -d '{
  "model": "codellama:7b",
  "prompt": "BBj code: A=MSGBOX"
}'

# Test RAG server (if using remote)
curl -H "Authorization: Bearer $BBJ_RAG_API_KEY" \
     https://rag.company.com/api/stats
```

### VS Code Output
1. View → Output
2. Select "BBj" from dropdown
3. Look for completion logs

## 📊 Performance Tuning

### Faster Completions
```json
{
  "bbj.ai.maxTokens": 50,           // Reduce from 150
  "bbj.ai.temperature": 0.1,        // More predictable
  "bbj.ai.pauseBeforeRequest": 300  // Faster trigger
}
```

### Better Quality
```json
{
  "bbj.ai.maxTokens": 300,          // More context
  "bbj.ai.temperature": 0.3,        // More creative
  "bbj.ai.ragEnabled": true         // Use examples
}
```

## 🚨 Quick Fixes

### "No completions appearing"
```bash
# 1. Check Ollama
ollama serve

# 2. Restart VS Code
code --disable-extensions
code  # Then re-enable BBj extension

# 3. Check settings
grep -r "bbj.ai" ~/.config/Code/User/settings.json
```

### "Wrong completions"
1. Add more context (previous lines)
2. Use descriptive variable names
3. Enable RAG for better examples
4. Lower temperature (0.1-0.2)

### "Completions too slow"
1. Reduce `maxTokens` to 50-100
2. Increase `pauseBeforeRequest` to 1000ms
3. Use smaller model (7B vs 34B)
4. Enable GPU acceleration

## 📝 BBj Patterns for Better Completions

### Good Patterns
```bbj
REM Clear function purpose
DEF CALCULATE_TAX(amount)
    REM AI will understand context
    
FOR i = 1 TO 10
    REM Loop body gets good suggestions
```

### Avoid
```bbj
DEF F1(X)  REM Unclear purpose
    REM AI can't infer intent
```

## 🔗 Resources

- Full Documentation: [README-AI-COMPLETIONS.md](README-AI-COMPLETIONS.md)
- RAG Server Setup: [rag-server/README.md](rag-server/README.md)
- Troubleshooting: [README-AI-COMPLETIONS.md#troubleshooting](README-AI-COMPLETIONS.md#troubleshooting)

## 💡 Pro Tips

1. **Use Comments**: AI reads your comments for context
2. **Consistent Style**: AI learns from your patterns
3. **RAG is Power**: Enable for 10x better suggestions
4. **Manual Trigger**: Use Tab completion when automatic is off
5. **Check Logs**: VS Code Output panel shows what's happening

---
*Last updated: 2024*