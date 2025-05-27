import { DatabaseService } from './database';
import { Logger } from 'winston';

export class SearchService {
    private db: DatabaseService;
    private logger: Logger;
    
    constructor(db: DatabaseService, logger: Logger) {
        this.db = db;
        this.logger = logger;
    }
    
    async generateEmbedding(text: string): Promise<number[] | null> {
        const embeddingUrl = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
        const model = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
        
        try {
            const response = await fetch(`${embeddingUrl}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt: text })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Embedding API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            const data = await response.json() as { embedding: number[] };
            return data.embedding || null;
        } catch (error: any) {
            // More user-friendly error message
            if (error.cause?.code === 'ECONNREFUSED') {
                this.logger.error('Ollama is not running. Please start Ollama with: ollama serve');
                this.logger.error('Visit https://ollama.ai for installation instructions');
            } else {
                this.logger.error('Failed to generate embedding:', error.message || error);
            }
            return null;
        }
    }
    
    async search(query: string, options: {
        maxExamples?: number;
        maxDocs?: number;
        category?: string;
    } = {}): Promise<{
        examples: any[];
        documentation: any[];
    }> {
        const { maxExamples = 3, maxDocs = 2, category } = options;
        
        // Generate embedding for query
        const embedding = await this.generateEmbedding(query);
        if (!embedding) {
            this.logger.warn('Failed to generate embedding for query');
            return { examples: [], documentation: [] };
        }
        
        // Search for similar examples and documentation
        const [examples, documentation] = await Promise.all([
            this.db.searchByEmbedding(embedding, maxExamples),
            this.db.searchDocumentation(embedding, maxDocs)
        ]);
        
        // Filter by category if specified
        const filteredExamples = category 
            ? examples.filter(ex => ex.category === category)
            : examples;
        
        return {
            examples: filteredExamples,
            documentation
        };
    }
}