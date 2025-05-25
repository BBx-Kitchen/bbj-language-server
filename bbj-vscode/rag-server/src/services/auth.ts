import { DatabaseService } from './database';
import { Logger } from 'winston';
import { Request, Response, NextFunction } from 'express';

export class AuthService {
    private db: DatabaseService;
    private logger?: Logger;
    
    constructor(db: DatabaseService, logger?: Logger) {
        this.db = db;
        this.logger = logger;
    }
    
    // Middleware for authenticating API requests
    authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            const apiKey = req.body.apiKey || req.query.apiKey;
            
            let key: string | null = null;
            
            if (authHeader && authHeader.startsWith('Bearer ')) {
                key = authHeader.substring(7);
            } else if (apiKey) {
                key = apiKey as string;
            }
            
            if (!key) {
                res.status(401).json({ error: 'API key required' });
                return;
            }
            
            const validation = await this.db.validateApiKey(key);
            
            if (!validation.valid) {
                res.status(401).json({ error: 'Invalid API key' });
                return;
            }
            
            // Add key info to request
            (req as any).apiKeyId = validation.id;
            (req as any).permissions = validation.permissions;
            
            next();
        } catch (error) {
            this.logger?.error('Authentication error:', error);
            res.status(500).json({ error: 'Authentication failed' });
        }
    };
    
    // Check if user has specific permission
    hasPermission(permissions: string[], required: string): boolean {
        return permissions.includes(required) || permissions.includes('admin');
    }
    
    // Create initial admin key if none exists
    async ensureAdminKey() {
        const keys = await this.db.getCodeExamples(); // Check if DB has any data
        
        if (keys.length === 0) {
            const { key } = await this.db.createApiKey('Initial Admin', ['admin']);
            this.logger?.info('Created initial admin API key:', key);
            console.log('\n========================================');
            console.log('INITIAL ADMIN API KEY (save this!):');
            console.log(key);
            console.log('========================================\n');
        }
    }
    
    // Create API key
    async createApiKey(name: string, permissions: string[]): Promise<string> {
        const result = await this.db.createApiKey(name, permissions);
        return result.key;
    }
}