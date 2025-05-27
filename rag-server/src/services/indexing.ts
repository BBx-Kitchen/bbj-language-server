import { DatabaseService } from './database';
import { Logger } from 'winston';
import fs from 'fs/promises';
import path from 'path';

export class IndexingService {
    private db: DatabaseService;
    private logger?: Logger;
    private generateEmbeddingsFlag: boolean = true;
    
    constructor(db: DatabaseService, logger?: Logger) {
        this.db = db;
        this.logger = logger;
    }
    
    async initialize() {
        this.logger?.info('Indexing service initialized');
        
        // Check if initial indexing is needed
        const examples = await this.db.getCodeExamples();
        if (examples.length === 0) {
            this.logger?.info('No examples found, consider running initial import');
        }
    }
    
    async importDirectory(dirPath: string, options: { 
        category?: string; 
        recursive?: boolean;
        fileExtensions?: string[];
    } = {}) {
        const { category = 'general', recursive = true, fileExtensions = ['.bbj', '.bbl'] } = options;
        
        try {
            const files = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const file of files) {
                const filePath = path.join(dirPath, file.name);
                
                if (file.isDirectory() && recursive) {
                    await this.importDirectory(filePath, options);
                } else if (file.isFile()) {
                    const ext = path.extname(file.name).toLowerCase();
                    if (fileExtensions.includes(ext)) {
                        await this.importFile(filePath, category);
                    }
                }
            }
        } catch (error) {
            this.logger?.error(`Error importing directory ${dirPath}:`, error);
            throw error;
        }
    }
    
    async importFile(filePath: string, category: string) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const examples = this.extractExamples(content, filePath);
            
            for (const example of examples) {
                // Generate embedding only if flag is enabled
                const embedding = this.generateEmbeddingsFlag 
                    ? await this.generateEmbedding(example.content)
                    : [];
                
                await this.db.insertCodeExample({
                    ...example,
                    embedding,
                    category,
                    source: path.basename(filePath)
                });
            }
            
            this.logger?.info(`Imported ${examples.length} examples from ${filePath} ${this.generateEmbeddingsFlag ? 'with' : 'without'} embeddings`);
        } catch (error) {
            this.logger?.error(`Error importing file ${filePath}:`, error);
            throw error;
        }
    }
    
    private extractExamples(content: string, filePath: string): any[] {
        const examples: any[] = [];
        const lines = content.split('\n');
        
        // Simple extraction - can be enhanced
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim().toUpperCase();
            
            if (this.isInterestingLine(line)) {
                const example = this.extractCodeBlock(lines, i, filePath);
                if (example) {
                    examples.push(example);
                    i += example.content.split('\n').length - 1;
                }
            }
        }
        
        return examples;
    }
    
    private isInterestingLine(line: string): boolean {
        const patterns = ['DEF ', 'CLASS ', 'FOR ', 'WHILE ', 'IF ', 'MSGBOX', 'PRINT', 'SQL'];
        return patterns.some(pattern => line.includes(pattern));
    }
    
    private extractCodeBlock(lines: string[], startIndex: number, filePath: string): any {
        const blockLines: string[] = [];
        let context = '';
        
        // Look for comments above
        if (startIndex > 0 && lines[startIndex - 1].trim().toLowerCase().startsWith('rem')) {
            context = lines[startIndex - 1].trim();
        }
        
        // Extract code block
        for (let i = startIndex; i < Math.min(lines.length, startIndex + 10); i++) {
            blockLines.push(lines[i]);
            
            const line = lines[i].trim().toUpperCase();
            if (line.startsWith('END') || line.startsWith('NEXT') || line.startsWith('FI')) {
                break;
            }
        }
        
        if (blockLines.length === 0) return null;
        
        return {
            id: `${path.basename(filePath)}:${startIndex}`,
            content: blockLines.join('\n'),
            context,
            keywords: this.extractKeywords(blockLines.join('\n'))
        };
    }
    
    private extractKeywords(code: string): string[] {
        const keywords: string[] = [];
        const upperCode = code.toUpperCase();
        
        const bbjKeywords = [
            'MSGBOX', 'PRINT', 'FOR', 'NEXT', 'IF', 'THEN', 'ELSE', 'FI',
            'WHILE', 'WEND', 'DEF', 'FNEND', 'CLASS', 'CLASSEND',
            'CALLBACK', 'SQL', 'OPEN', 'READ', 'WRITE', 'CLOSE'
        ];
        
        for (const keyword of bbjKeywords) {
            if (upperCode.includes(keyword)) {
                keywords.push(keyword);
            }
        }
        
        return keywords;
    }
    
    async generateEmbedding(text: string): Promise<number[]> {
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
            return data.embedding || [];
        } catch (error: any) {
            // More user-friendly error message
            if (error.cause?.code === 'ECONNREFUSED') {
                this.logger?.error('Ollama is not running. Please start Ollama with: ollama serve');
                this.logger?.error('Visit https://ollama.ai for installation instructions');
            } else {
                this.logger?.error('Failed to generate embedding:', error.message || error);
            }
            // Return empty embedding as fallback
            return [];
        }
    }
    
    // Wrapper method for CLI compatibility
    async indexDirectory(dirPath: string, category: string, recursive: boolean = true, generateEmbeddings: boolean = true, importType: string = 'code'): Promise<{ processed: number; imported: number; skipped: number; errors: string[] }> {
        const result = { processed: 0, imported: 0, skipped: 0, errors: [] as string[] };
        
        try {
            const startCount = (await this.db.getCodeExamples()).length;
            
            // Temporarily store the original setting
            const originalEmbeddings = this.generateEmbeddingsFlag;
            this.generateEmbeddingsFlag = generateEmbeddings;
            
            // Determine file extensions based on import type
            let fileExtensions: string[] = [];
            
            if (importType === 'code' || importType === 'both') {
                fileExtensions.push('.bbj', '.bbl', '.bbjs', '.bbx');
            }
            
            if (importType === 'docs' || importType === 'both') {
                fileExtensions.push('.md', '.txt', '.rst', '.adoc');
            }
            
            await this.importDirectory(dirPath, {
                category,
                recursive,
                fileExtensions
            });
            
            // If importing documentation, also import as documentation entries
            if (importType === 'docs' || importType === 'both') {
                await this.importDocumentationDirectory(dirPath, category, recursive);
            }
            
            // Restore original setting
            this.generateEmbeddingsFlag = originalEmbeddings;
            
            const endCount = (await this.db.getCodeExamples()).length;
            result.imported = endCount - startCount;
            result.processed = result.imported; // Simplified for now
            
        } catch (error: any) {
            result.errors.push(error.message || 'Unknown error');
        }
        
        return result;
    }
    
    // Re-index embeddings for existing examples
    async reindexEmbeddings(): Promise<{ processed: number; generated: number; skipped: number; errors: string[] }> {
        const result = { processed: 0, generated: 0, skipped: 0, errors: [] as string[] };
        
        try {
            // Get all examples without embeddings (or with empty embeddings)
            const examples = await this.db.getCodeExamples();
            
            for (const example of examples) {
                result.processed++;
                
                // Check if example already has embeddings
                if (example.embedding && example.embedding.length > 0) {
                    result.skipped++;
                    continue;
                }
                
                try {
                    // Generate embedding
                    const embedding = await this.generateEmbedding(example.content + ' ' + example.context);
                    
                    // Update the example with the new embedding
                    await this.db.insertCodeExample({
                        ...example,
                        embedding
                    });
                    
                    result.generated++;
                    
                    if (result.generated % 10 === 0) {
                        console.log(`Generated ${result.generated} embeddings...`);
                    }
                } catch (error: any) {
                    result.errors.push(`Error generating embedding for ${example.id}: ${error.message}`);
                }
            }
        } catch (error: any) {
            result.errors.push(error.message || 'Unknown error');
        }
        
        return result;
    }
    
    // Import documentation files specifically for the documentation table
    async importDocumentationDirectory(dirPath: string, category: string, recursive: boolean = true): Promise<void> {
        try {
            const files = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const file of files) {
                const filePath = path.join(dirPath, file.name);
                
                if (file.isDirectory() && recursive && !file.name.startsWith('.')) {
                    await this.importDocumentationDirectory(filePath, category, recursive);
                } else if (file.isFile() && this.isDocumentationFile(filePath)) {
                    await this.importDocumentationFile(filePath, category);
                }
            }
        } catch (error) {
            this.logger?.error(`Error importing documentation directory ${dirPath}:`, error);
        }
    }
    
    private isDocumentationFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        const basename = path.basename(filePath).toLowerCase();
        
        return (
            ext === '.md' ||
            ext === '.txt' ||
            ext === '.rst' ||
            ext === '.adoc' ||
            basename.includes('readme') ||
            basename.includes('guide') ||
            basename.includes('doc') ||
            basename.includes('manual') ||
            basename.includes('help')
        );
    }
    
    async importDocumentationFile(filePath: string, category: string): Promise<void> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const sections = this.extractDocumentationSections(content, filePath);
            
            for (const section of sections) {
                // Generate embedding only if flag is enabled
                const embedding = this.generateEmbeddingsFlag 
                    ? await this.generateEmbedding(section.title + ' ' + section.content)
                    : [];
                
                await this.db.insertDocumentation({
                    id: section.id,
                    title: section.title,
                    content: section.content,
                    category,
                    tags: section.tags,
                    embedding,
                    source: path.basename(filePath)
                });
            }
            
            this.logger?.info(`Imported ${sections.length} documentation sections from ${filePath} ${this.generateEmbeddingsFlag ? 'with' : 'without'} embeddings`);
        } catch (error) {
            this.logger?.error(`Error importing documentation file ${filePath}:`, error);
            throw error;
        }
    }
    
    private extractDocumentationSections(content: string, filePath: string): Array<{
        id: string;
        title: string;
        content: string;
        tags: string[];
    }> {
        const sections: Array<{
            id: string;
            title: string;
            content: string;
            tags: string[];
        }> = [];
        
        const lines = content.split('\n');
        let currentSection = '';
        let currentContent: string[] = [];
        let sectionIndex = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Detect markdown headers
            const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (headerMatch) {
                // Save previous section if it has content
                if (currentSection && currentContent.length > 0) {
                    const content = currentContent.join('\n').trim();
                    if (content.length > 10) { // Only meaningful content
                        sections.push({
                            id: `${path.basename(filePath)}:${sectionIndex}`,
                            title: currentSection,
                            content,
                            tags: this.extractDocumentationTags(currentSection + ' ' + content)
                        });
                        sectionIndex++;
                    }
                }
                
                currentSection = headerMatch[2].trim();
                currentContent = [];
            } else {
                currentContent.push(line);
            }
        }
        
        // Add the last section
        if (currentSection && currentContent.length > 0) {
            const content = currentContent.join('\n').trim();
            if (content.length > 10) {
                sections.push({
                    id: `${path.basename(filePath)}:${sectionIndex}`,
                    title: currentSection,
                    content,
                    tags: this.extractDocumentationTags(currentSection + ' ' + content)
                });
            }
        }
        
        // If no sections found (no headers), create one section for the entire document
        if (sections.length === 0) {
            const title = path.basename(filePath, path.extname(filePath));
            sections.push({
                id: `${path.basename(filePath)}:0`,
                title,
                content: content.trim(),
                tags: this.extractDocumentationTags(title + ' ' + content)
            });
        }
        
        return sections;
    }
    
    private extractDocumentationTags(text: string): string[] {
        const tags: string[] = [];
        const upperText = text.toUpperCase();
        
        // Common BBj-related documentation tags
        const docTags = [
            'INSTALLATION', 'SETUP', 'CONFIGURATION', 'GETTING STARTED',
            'TUTORIAL', 'GUIDE', 'REFERENCE', 'API', 'EXAMPLES',
            'TROUBLESHOOTING', 'FAQ', 'BEST PRACTICES', 'TIPS',
            'FUNCTIONS', 'VARIABLES', 'CLASSES', 'METHODS',
            'GUI', 'BUI', 'DWC', 'DATABASE', 'SQL', 'JDBC',
            'ERROR HANDLING', 'DEBUGGING', 'PERFORMANCE', 'SECURITY'
        ];
        
        for (const tag of docTags) {
            if (upperText.includes(tag)) {
                tags.push(tag.toLowerCase().replace(/\s+/g, '-'));
            }
        }
        
        // Add BBj-specific keywords
        const bbjKeywords = [
            'MSGBOX', 'PRINT', 'FOR', 'WHILE', 'IF', 'DEF', 'CLASS',
            'CALLBACK', 'SQL', 'OPEN', 'READ', 'WRITE', 'CLOSE'
        ];
        
        for (const keyword of bbjKeywords) {
            if (upperText.includes(keyword)) {
                tags.push(keyword.toLowerCase());
            }
        }
        
        return [...new Set(tags)]; // Remove duplicates
    }
}