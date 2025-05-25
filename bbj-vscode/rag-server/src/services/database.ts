import Database from 'better-sqlite3';
import { Logger } from 'winston';
import path from 'path';
import fs from 'fs/promises';

export interface CodeExample {
    id: string;
    content: string;
    context: string;
    keywords: string[];
    embedding: number[];
    source: string;
    category: string;
    language: string;
    created_at: Date;
    updated_at: Date;
    metadata?: Record<string, any>;
}

export interface Documentation {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    embedding: number[];
    source: string;
    created_at: Date;
    updated_at: Date;
}

export class DatabaseService {
    private db: Database.Database;
    private logger: Logger;
    
    constructor(logger: Logger) {
        this.logger = logger;
        const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/rag.db');
        
        // Ensure data directory exists
        this.ensureDataDirectory(path.dirname(dbPath));
        
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL'); // Better performance
        this.db.pragma('synchronous = NORMAL');
    }
    
    private async ensureDataDirectory(dirPath: string) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            this.logger.error('Failed to create data directory:', error);
        }
    }
    
    async initialize() {
        this.logger.info('Initializing database...');
        
        // Create tables
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS code_examples (
                id TEXT PRIMARY KEY,
                content TEXT NOT NULL,
                context TEXT,
                keywords TEXT,
                embedding TEXT,
                source TEXT NOT NULL,
                category TEXT,
                language TEXT DEFAULT 'bbj',
                metadata TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS documentation (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                category TEXT,
                tags TEXT,
                embedding TEXT,
                source TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS api_keys (
                id TEXT PRIMARY KEY,
                key_hash TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL,
                permissions TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_used DATETIME,
                is_active BOOLEAN DEFAULT 1
            );
            
            CREATE TABLE IF NOT EXISTS usage_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                api_key_id TEXT,
                endpoint TEXT,
                method TEXT,
                status_code INTEGER,
                response_time INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
            );
            
            -- Indexes for better search performance
            CREATE INDEX IF NOT EXISTS idx_code_examples_category ON code_examples(category);
            CREATE INDEX IF NOT EXISTS idx_code_examples_source ON code_examples(source);
            CREATE INDEX IF NOT EXISTS idx_documentation_category ON documentation(category);
            CREATE INDEX IF NOT EXISTS idx_documentation_source ON documentation(source);
            CREATE INDEX IF NOT EXISTS idx_usage_stats_api_key ON usage_stats(api_key_id);
            CREATE INDEX IF NOT EXISTS idx_usage_stats_created ON usage_stats(created_at);
        `);
        
        this.logger.info('Database initialized successfully');
    }
    
    // Code Examples CRUD
    async insertCodeExample(example: Omit<CodeExample, 'created_at' | 'updated_at'>): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO code_examples 
            (id, content, context, keywords, embedding, source, category, language, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            example.id,
            example.content,
            example.context || '',
            JSON.stringify(example.keywords || []),
            JSON.stringify(example.embedding || []),
            example.source,
            example.category || 'general',
            example.language || 'bbj',
            JSON.stringify(example.metadata || {})
        );
    }
    
    async getCodeExamples(filter?: { category?: string; source?: string }): Promise<CodeExample[]> {
        let query = 'SELECT * FROM code_examples WHERE 1=1';
        const params: any[] = [];
        
        if (filter?.category) {
            query += ' AND category = ?';
            params.push(filter.category);
        }
        
        if (filter?.source) {
            query += ' AND source = ?';
            params.push(filter.source);
        }
        
        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params);
        
        return rows.map(row => ({
            ...row,
            keywords: JSON.parse(row.keywords || '[]'),
            embedding: JSON.parse(row.embedding || '[]'),
            metadata: JSON.parse(row.metadata || '{}')
        }));
    }
    
    async searchByEmbedding(embedding: number[], limit: number = 10): Promise<CodeExample[]> {
        // Get all examples with embeddings
        const stmt = this.db.prepare('SELECT * FROM code_examples WHERE embedding IS NOT NULL');
        const rows = stmt.all();
        
        // Calculate similarities
        const results = rows
            .map(row => ({
                ...row,
                keywords: JSON.parse(row.keywords || '[]'),
                embedding: JSON.parse(row.embedding || '[]'),
                metadata: JSON.parse(row.metadata || '{}'),
                similarity: this.cosineSimilarity(embedding, JSON.parse(row.embedding || '[]'))
            }))
            .filter(row => row.similarity > 0)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
        
        return results;
    }
    
    // Documentation CRUD
    async insertDocumentation(doc: Omit<Documentation, 'created_at' | 'updated_at'>): Promise<void> {
        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO documentation 
            (id, title, content, category, tags, embedding, source)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
            doc.id,
            doc.title,
            doc.content,
            doc.category || 'general',
            JSON.stringify(doc.tags || []),
            JSON.stringify(doc.embedding || []),
            doc.source
        );
    }
    
    async searchDocumentation(embedding: number[], limit: number = 5): Promise<Documentation[]> {
        const stmt = this.db.prepare('SELECT * FROM documentation WHERE embedding IS NOT NULL');
        const rows = stmt.all();
        
        const results = rows
            .map(row => ({
                ...row,
                tags: JSON.parse(row.tags || '[]'),
                embedding: JSON.parse(row.embedding || '[]'),
                similarity: this.cosineSimilarity(embedding, JSON.parse(row.embedding || '[]'))
            }))
            .filter(row => row.similarity > 0)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
        
        return results;
    }
    
    // API Key Management
    async createApiKey(name: string, permissions: string[]): Promise<{ id: string; key: string }> {
        const crypto = require('crypto');
        const id = crypto.randomUUID();
        const key = `bbj_${crypto.randomBytes(32).toString('hex')}`;
        const keyHash = crypto.createHash('sha256').update(key).digest('hex');
        
        const stmt = this.db.prepare(`
            INSERT INTO api_keys (id, key_hash, name, permissions)
            VALUES (?, ?, ?, ?)
        `);
        
        stmt.run(id, keyHash, name, JSON.stringify(permissions));
        
        return { id, key };
    }
    
    async validateApiKey(key: string): Promise<{ valid: boolean; id?: string; permissions?: string[] }> {
        const crypto = require('crypto');
        const keyHash = crypto.createHash('sha256').update(key).digest('hex');
        
        const stmt = this.db.prepare('SELECT * FROM api_keys WHERE key_hash = ? AND is_active = 1');
        const row = stmt.get(keyHash);
        
        if (!row) {
            return { valid: false };
        }
        
        // Update last used
        const updateStmt = this.db.prepare('UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = ?');
        updateStmt.run(row.id);
        
        return {
            valid: true,
            id: row.id,
            permissions: JSON.parse(row.permissions || '[]')
        };
    }
    
    // Usage tracking
    async trackUsage(apiKeyId: string, endpoint: string, method: string, statusCode: number, responseTime: number) {
        const stmt = this.db.prepare(`
            INSERT INTO usage_stats (api_key_id, endpoint, method, status_code, response_time)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        stmt.run(apiKeyId, endpoint, method, statusCode, responseTime);
    }
    
    // Utility functions
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) return 0;
        
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        
        if (normA === 0 || normB === 0) return 0;
        
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    
    async close() {
        this.db.close();
    }
}