#!/usr/bin/env node

import { Command } from 'commander';
import { DatabaseService } from './services/database';
import { AuthService } from './services/auth';
import { IndexingService } from './services/indexing';
import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const program = new Command();
const dbPath = process.env.DB_PATH || './data/rag.db';
const db = new DatabaseService(dbPath);
const auth = new AuthService(db);
const indexing = new IndexingService(db);

// Utility functions
async function checkOllamaAvailability(): Promise<{ available: boolean; url: string; error?: string; hasModel?: boolean }> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
  const embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
  
  try {
    // Check if Ollama is running
    const response = await fetch(`${ollamaUrl}/api/tags`);
    
    if (!response.ok) {
      return {
        available: false,
        url: ollamaUrl,
        error: `Ollama returned status ${response.status}: ${response.statusText}`
      };
    }
    
    const data = await response.json() as { models: Array<{ name: string }> };
    const hasEmbeddingModel = data.models.some(model => 
      model.name.includes(embeddingModel) || model.name.includes(embeddingModel.split(':')[0])
    );
    
    return {
      available: true,
      url: ollamaUrl,
      hasModel: hasEmbeddingModel
    };
  } catch (error: any) {
    let errorMessage = 'Unknown error';
    
    if (error.cause?.code === 'ECONNREFUSED') {
      errorMessage = 'Connection refused - Ollama is not running';
    } else if (error.cause?.code === 'ENOTFOUND') {
      errorMessage = 'Host not found - check Ollama URL';
    } else {
      errorMessage = error.message || error.toString();
    }
    
    return {
      available: false,
      url: ollamaUrl,
      error: errorMessage
    };
  }
}

function promptUserContinue(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(`${message} Continue anyway? (y/N): `, (answer: string) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

program
  .name('rag-cli')
  .description('CLI for BBj RAG Server management')
  .version('1.0.0');

// API Key management commands
const apiKeyCommand = program.command('api-key');

apiKeyCommand
  .command('create <name>')
  .description('Create a new API key')
  .option('-p, --permissions <permissions...>', 'Permissions for the key', ['read'])
  .action(async (name: string, options: { permissions: string[] }) => {
    try {
      await db.initialize();
      const key = await auth.createApiKey(name, options.permissions);
      
      console.log('API Key created successfully!');
      console.log('Name:', name);
      console.log('Key:', key);
      console.log('Permissions:', options.permissions.join(', '));
      console.log('\nSave this key securely - it cannot be retrieved later!');
      
      process.exit(0);
    } catch (error) {
      console.error('Error creating API key:', error);
      process.exit(1);
    }
  });

apiKeyCommand
  .command('list')
  .description('List all API keys')
  .action(async () => {
    try {
      await db.initialize();
      const keys = await db.getAllApiKeys();
      
      if (keys.length === 0) {
        console.log('No API keys found.');
      } else {
        console.log('API Keys:');
        console.log('ID\tName\t\t\tCreated\t\t\tLast Used');
        console.log('-'.repeat(80));
        
        keys.forEach(key => {
          const lastUsed = key.last_used ? new Date(key.last_used).toLocaleString() : 'Never';
          console.log(`${key.id}\t${key.name.padEnd(20)}\t${new Date(key.created_at).toLocaleString()}\t${lastUsed}`);
        });
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Error listing API keys:', error);
      process.exit(1);
    }
  });

apiKeyCommand
  .command('revoke <keyId>')
  .description('Revoke an API key')
  .action(async (keyId: string) => {
    try {
      await db.initialize();
      const result = await db.revokeApiKey(parseInt(keyId));
      
      if (result) {
        console.log(`API key ${keyId} has been revoked.`);
      } else {
        console.log(`API key ${keyId} not found.`);
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Error revoking API key:', error);
      process.exit(1);
    }
  });

// Import commands
const importCommand = program.command('import');

importCommand
  .command('directory <path>')
  .description('Import BBj files and documentation from a directory')
  .option('-c, --category <category>', 'Category for imported files', 'general')
  .option('-r, --recursive', 'Import recursively', false)
  .option('-t, --type <type>', 'File types to import: code, docs, or both', 'code')
  .option('--no-embeddings', 'Skip embedding generation (faster but no semantic search)', false)
  .option('--force', 'Skip Ollama availability checks', false)
  .action(async (dirPath: string, options: { category: string; recursive: boolean; type: string; embeddings: boolean; force: boolean }) => {
    try {
      await db.initialize();
      
      const absolutePath = path.resolve(dirPath);
      if (!fs.existsSync(absolutePath)) {
        console.error(`Directory not found: ${absolutePath}`);
        process.exit(1);
      }
      
      // Validate type option
      if (!['code', 'docs', 'both'].includes(options.type)) {
        console.error(`Invalid type '${options.type}'. Must be: code, docs, or both`);
        process.exit(1);
      }
      
      console.log(`Importing from: ${absolutePath}`);
      console.log(`Category: ${options.category}`);
      console.log(`Recursive: ${options.recursive}`);
      console.log(`Import type: ${options.type}`);
      console.log(`Generate embeddings: ${options.embeddings}`);
      
      // Check Ollama availability if embeddings are enabled
      if (options.embeddings && !options.force) {
        console.log('\nChecking Ollama availability...');
        const ollamaCheck = await checkOllamaAvailability();
        
        if (!ollamaCheck.available) {
          console.error(`\n❌ Ollama Error: ${ollamaCheck.error}`);
          console.error(`   URL: ${ollamaCheck.url}`);
          console.error(`\n⚠️  Without Ollama, embeddings cannot be generated.`);
          console.error(`   This means imported code won't be searchable via semantic search.`);
          console.error(`\nOptions:`);
          console.error(`   1. Start Ollama: ollama serve`);
          console.error(`   2. Import without embeddings: --no-embeddings`);
          console.error(`   3. Skip this check: --force`);
          
          const shouldContinue = await promptUserContinue('\n⚠️  Import without embeddings?');
          if (!shouldContinue) {
            console.log('Import cancelled.');
            process.exit(1);
          }
          
          // Disable embeddings for this import
          console.log('Proceeding without embeddings...');
          options.embeddings = false;
        } else {
          console.log(`✅ Ollama is available at ${ollamaCheck.url}`);
          
          if (!ollamaCheck.hasModel) {
            const embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
            console.warn(`\n⚠️  Warning: Embedding model '${embeddingModel}' not found.`);
            console.warn(`   Install it with: ollama pull ${embeddingModel}`);
            
            const shouldContinue = await promptUserContinue('\n⚠️  Continue without the embedding model?');
            if (!shouldContinue) {
              console.log('Import cancelled.');
              process.exit(1);
            }
          } else {
            console.log(`✅ Embedding model available`);
          }
        }
      } else if (!options.embeddings) {
        console.log('\n⚠️  Embeddings disabled - imported code will NOT be semantically searchable');
      }
      
      const result = await indexing.indexDirectory(absolutePath, options.category, options.recursive, options.embeddings, options.type);
      
      console.log(`\nImport complete!`);
      console.log(`Files processed: ${result.processed}`);
      console.log(`Files imported: ${result.imported}`);
      console.log(`Files skipped: ${result.skipped}`);
      
      if (options.embeddings) {
        console.log(`Embeddings generated: ${result.imported} code examples`);
      } else {
        console.log(`⚠️  Embeddings NOT generated - use re-index command later if needed`);
      }
      
      if (result.errors.length > 0) {
        console.log(`\nErrors:`);
        result.errors.forEach(err => console.log(`  - ${err}`));
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Error importing directory:', error);
      process.exit(1);
    }
  });

// Database commands
const dbCommand = program.command('db');

dbCommand
  .command('stats')
  .description('Show database statistics')
  .action(async () => {
    try {
      await db.initialize();
      const stats = await db.getStats();
      
      console.log('Database Statistics:');
      console.log('-'.repeat(40));
      console.log(`Total Examples: ${stats.totalExamples}`);
      console.log(`Total Documentation: ${stats.totalDocumentation}`);
      console.log(`Total Categories: ${stats.totalCategories}`);
      console.log(`Database Path: ${path.resolve(dbPath)}`);
      
      // Get file size
      const dbStats = fs.statSync(dbPath);
      console.log(`Database Size: ${(dbStats.size / 1024 / 1024).toFixed(2)} MB`);
      
      process.exit(0);
    } catch (error) {
      console.error('Error getting database stats:', error);
      process.exit(1);
    }
  });

dbCommand
  .command('vacuum')
  .description('Optimize database (VACUUM)')
  .action(async () => {
    try {
      await db.initialize();
      console.log('Optimizing database...');
      await db.vacuum();
      console.log('Database optimization complete!');
      
      process.exit(0);
    } catch (error) {
      console.error('Error optimizing database:', error);
      process.exit(1);
    }
  });

dbCommand
  .command('clear-usage')
  .description('Clear old usage statistics')
  .option('-d, --days <days>', 'Clear entries older than X days', '90')
  .action(async (options: { days: string }) => {
    try {
      await db.initialize();
      const days = parseInt(options.days);
      console.log(`Clearing usage statistics older than ${days} days...`);
      
      const result = await db.clearOldUsageStats(days);
      console.log(`Cleared ${result} usage entries.`);
      
      process.exit(0);
    } catch (error) {
      console.error('Error clearing usage stats:', error);
      process.exit(1);
    }
  });

dbCommand
  .command('reindex-embeddings')
  .description('Generate embeddings for existing code examples that don\'t have them')
  .option('--force', 'Skip Ollama availability checks', false)
  .action(async (options: { force: boolean }) => {
    try {
      await db.initialize();
      
      // Check Ollama availability
      if (!options.force) {
        console.log('Checking Ollama availability...');
        const ollamaCheck = await checkOllamaAvailability();
        
        if (!ollamaCheck.available) {
          console.error(`\n❌ Ollama Error: ${ollamaCheck.error}`);
          console.error(`   URL: ${ollamaCheck.url}`);
          console.error(`\n⚠️  Cannot generate embeddings without Ollama.`);
          console.error(`\nOptions:`);
          console.error(`   1. Start Ollama: ollama serve`);
          console.error(`   2. Skip this check: --force`);
          process.exit(1);
        }
        
        if (!ollamaCheck.hasModel) {
          const embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
          console.error(`\n❌ Embedding model '${embeddingModel}' not found.`);
          console.error(`   Install it with: ollama pull ${embeddingModel}`);
          process.exit(1);
        }
        
        console.log(`✅ Ollama is available at ${ollamaCheck.url}`);
        console.log(`✅ Embedding model available`);
      }
      
      console.log('\nGenerating embeddings for existing code examples...');
      const result = await indexing.reindexEmbeddings();
      
      console.log(`\nRe-indexing complete!`);
      console.log(`Examples processed: ${result.processed}`);
      console.log(`Embeddings generated: ${result.generated}`);
      console.log(`Already had embeddings: ${result.skipped}`);
      
      if (result.errors.length > 0) {
        console.log(`\nErrors:`);
        result.errors.forEach(err => console.log(`  - ${err}`));
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Error re-indexing embeddings:', error);
      process.exit(1);
    }
  });

// Usage statistics commands
const usageCommand = program.command('usage');

usageCommand
  .command('top-queries')
  .description('Show top search queries')
  .option('-l, --limit <limit>', 'Number of results to show', '10')
  .action(async (options: { limit: string }) => {
    try {
      await db.initialize();
      const limit = parseInt(options.limit);
      const queries = await db.getTopQueries(limit);
      
      if (queries.length === 0) {
        console.log('No usage data found.');
      } else {
        console.log('Top Search Queries:');
        console.log('Count\tQuery');
        console.log('-'.repeat(40));
        
        queries.forEach(q => {
          console.log(`${q.count}\t${q.query}`);
        });
      }
      
      process.exit(0);
    } catch (error) {
      console.error('Error getting usage stats:', error);
      process.exit(1);
    }
  });

// Ollama utility commands
const ollamaCommand = program.command('ollama');

ollamaCommand
  .command('check')
  .description('Check Ollama availability and embedding model')
  .action(async () => {
    try {
      console.log('Checking Ollama availability...');
      const ollamaCheck = await checkOllamaAvailability();
      
      if (ollamaCheck.available) {
        console.log(`✅ Ollama is running at ${ollamaCheck.url}`);
        
        if (ollamaCheck.hasModel) {
          console.log(`✅ Embedding model is available`);
        } else {
          const embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
          console.warn(`⚠️  Embedding model '${embeddingModel}' not found`);
          console.warn(`   Install it with: ollama pull ${embeddingModel}`);
        }
      } else {
        console.error(`❌ Ollama Error: ${ollamaCheck.error}`);
        console.error(`   URL: ${ollamaCheck.url}`);
        console.error(`\n💡 Try:`);
        console.error(`   ollama serve`);
      }
      
      process.exit(ollamaCheck.available ? 0 : 1);
    } catch (error) {
      console.error('Error checking Ollama:', error);
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}