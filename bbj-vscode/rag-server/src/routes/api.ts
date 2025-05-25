import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';

const router = Router();

// Search endpoint - the main RAG retrieval API
router.post('/search', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
        const { query, context, maxExamples = 3, maxDocs = 2, apiKey } = req.body;
        
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        
        // Validate API key
        const authHeader = req.headers.authorization;
        const key = apiKey || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);
        
        if (!key) {
            return res.status(401).json({ error: 'API key required' });
        }
        
        const { db, search, logger } = req.app.locals.services;
        const validation = await db.validateApiKey(key);
        
        if (!validation.valid) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        
        // Generate embedding for the query
        const embedding = await search.generateEmbedding(query + ' ' + (context || ''));
        
        if (!embedding) {
            return res.status(500).json({ error: 'Failed to generate embedding' });
        }
        
        // Search for similar code examples and documentation
        const [examples, documentation] = await Promise.all([
            db.searchByEmbedding(embedding, maxExamples),
            db.searchDocumentation(embedding, maxDocs)
        ]);
        
        // Track usage
        const responseTime = Date.now() - startTime;
        await db.trackUsage(validation.id!, '/api/search', 'POST', 200, responseTime);
        
        res.json({
            examples: examples.map(ex => ({
                id: ex.id,
                content: ex.content,
                context: ex.context,
                keywords: ex.keywords,
                source: ex.source,
                category: ex.category,
                similarity: ex.similarity
            })),
            documentation: documentation.map(doc => ({
                id: doc.id,
                title: doc.title,
                content: doc.content,
                category: doc.category,
                tags: doc.tags,
                source: doc.source,
                similarity: doc.similarity
            })),
            metadata: {
                query,
                responseTime,
                totalResults: examples.length + documentation.length
            }
        });
    } catch (error) {
        const { logger } = req.app.locals.services;
        logger.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get available categories
router.get('/categories', async (req: Request, res: Response) => {
    try {
        const { db } = req.app.locals.services;
        const examples = await db.getCodeExamples();
        
        const categories = [...new Set(examples.map(ex => ex.category))];
        
        res.json({ categories });
    } catch (error) {
        const { logger } = req.app.locals.services;
        logger.error('Categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get statistics
router.get('/stats', async (req: Request, res: Response) => {
    try {
        const { db } = req.app.locals.services;
        
        const totalExamples = await db.getCodeExamples();
        const categories = [...new Set(totalExamples.map(ex => ex.category))];
        const sources = [...new Set(totalExamples.map(ex => ex.source))];
        
        res.json({
            totalExamples: totalExamples.length,
            totalCategories: categories.length,
            totalSources: sources.length,
            categories,
            sources
        });
    } catch (error) {
        const { logger } = req.app.locals.services;
        logger.error('Stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Batch search endpoint for multiple queries
router.post('/search/batch', async (req: Request, res: Response) => {
    const startTime = Date.now();
    
    try {
        const { queries, maxExamples = 3, maxDocs = 2, apiKey } = req.body;
        
        if (!queries || !Array.isArray(queries)) {
            return res.status(400).json({ error: 'Queries array is required' });
        }
        
        // Validate API key
        const authHeader = req.headers.authorization;
        const key = apiKey || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);
        
        if (!key) {
            return res.status(401).json({ error: 'API key required' });
        }
        
        const { db, search, logger } = req.app.locals.services;
        const validation = await db.validateApiKey(key);
        
        if (!validation.valid) {
            return res.status(401).json({ error: 'Invalid API key' });
        }
        
        // Process queries in parallel
        const results = await Promise.all(
            queries.map(async (queryObj: { query: string; context?: string }) => {
                const embedding = await search.generateEmbedding(
                    queryObj.query + ' ' + (queryObj.context || '')
                );
                
                if (!embedding) {
                    return { query: queryObj.query, error: 'Failed to generate embedding' };
                }
                
                const [examples, documentation] = await Promise.all([
                    db.searchByEmbedding(embedding, maxExamples),
                    db.searchDocumentation(embedding, maxDocs)
                ]);
                
                return {
                    query: queryObj.query,
                    examples,
                    documentation
                };
            })
        );
        
        // Track usage
        const responseTime = Date.now() - startTime;
        await db.trackUsage(validation.id!, '/api/search/batch', 'POST', 200, responseTime);
        
        res.json({
            results,
            metadata: {
                totalQueries: queries.length,
                responseTime
            }
        });
    } catch (error) {
        const { logger } = req.app.locals.services;
        logger.error('Batch search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export const apiRouter = router;