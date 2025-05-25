import { Router, Request, Response } from 'express';

const router = Router();

// Create new API key
router.post('/api-keys', async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, permissions = ['read'] } = req.body;
        
        if (!name) {
            res.status(400).json({ error: 'Name is required' });
            return;
        }
        
        const { db } = req.app.locals.services;
        const { id, key } = await db.createApiKey(name, permissions);
        
        res.json({
            id,
            key,
            name,
            permissions,
            message: 'Save this key securely - it cannot be retrieved later'
        });
    } catch (error) {
        const { logger } = req.app.locals.services;
        logger.error('Error creating API key:', error);
        res.status(500).json({ error: 'Failed to create API key' });
    }
});

// Import documentation
router.post('/import', async (req: Request, res: Response): Promise<void> => {
    try {
        const { path, category = 'general', type = 'code' } = req.body;
        
        if (!path) {
            res.status(400).json({ error: 'Path is required' });
            return;
        }
        
        const { indexing } = req.app.locals.services;
        
        if (type === 'code') {
            await indexing.importDirectory(path, { category });
        } else {
            // Handle other types like documentation
            res.status(501).json({ error: 'Documentation import not yet implemented' });
            return;
        }
        
        res.json({ message: 'Import started', path, category });
    } catch (error) {
        const { logger } = req.app.locals.services;
        logger.error('Import error:', error);
        res.status(500).json({ error: 'Import failed' });
    }
});

// Get usage statistics
router.get('/stats/usage', async (_req: Request, res: Response) => {
    try {
        
        // This would need to be implemented in the database service
        res.json({
            message: 'Usage statistics endpoint',
            // Add actual stats here
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get usage statistics' });
    }
});

export const adminRouter = router;