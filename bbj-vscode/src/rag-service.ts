import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

interface CodeExample {
    id: string;
    content: string;
    context: string;
    keywords: string[];
    embedding?: number[];
}

interface RetrievalResult {
    examples: CodeExample[];
    documentation: string[];
}

export class RAGService {
    private outputChannel: vscode.OutputChannel;
    private codeExamples: CodeExample[] = [];
    private embeddingService: EmbeddingService;
    private isInitialized = false;
    private remoteRagUrl?: string;
    private remoteRagApiKey?: string;
    private useRemoteRag: boolean = false;
    
    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.embeddingService = new EmbeddingService(outputChannel);
        
        // Check for remote RAG configuration
        const config = vscode.workspace.getConfiguration('bbj.ai');
        this.remoteRagUrl = config.get<string>('remoteRagUrl');
        this.remoteRagApiKey = config.get<string>('remoteRagApiKey');
        this.useRemoteRag = config.get<boolean>('useRemoteRag', false) && !!this.remoteRagUrl;
        
        if (this.useRemoteRag) {
            this.log(`Using remote RAG service at: ${this.remoteRagUrl}`);
        } else {
            this.log('Using local RAG indexing');
        }
    }
    
    async initialize(): Promise<void> {
        if (this.isInitialized) return;
        
        this.log('Initializing RAG service...');
        
        // Index workspace BBj files
        await this.indexWorkspaceFiles();
        
        // Index built-in BBj examples and documentation
        await this.indexBuiltInExamples();
        
        this.isInitialized = true;
        this.log('RAG service initialized');
    }
    
    async retrieveRelevantContext(
        query: string,
        currentContext: string,
        maxExamples: number = 3
    ): Promise<RetrievalResult> {
        if (!this.isInitialized) {
            await this.initialize();
        }
        
        // Use remote RAG if configured
        if (this.useRemoteRag) {
            return await this.retrieveFromRemoteRag(query, currentContext, maxExamples);
        }
        
        // Otherwise use local RAG
        // Create embedding for the query
        const queryEmbedding = await this.embeddingService.getEmbedding(query);
        
        // Find similar code examples
        const relevantExamples = await this.findSimilarExamples(
            queryEmbedding, 
            maxExamples
        );
        
        // Get relevant documentation
        const documentation = await this.getRelevantDocumentation(query);
        
        this.log(`Retrieved ${relevantExamples.length} examples and ${documentation.length} docs for query: ${query}`);
        
        return {
            examples: relevantExamples,
            documentation
        };
    }
    
    private async retrieveFromRemoteRag(
        query: string,
        context: string,
        maxExamples: number
    ): Promise<RetrievalResult> {
        try {
            const response = await fetch(`${this.remoteRagUrl}/api/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.remoteRagApiKey}`
                },
                body: JSON.stringify({
                    query,
                    context,
                    maxExamples,
                    maxDocs: 2
                })
            });
            
            if (!response.ok) {
                throw new Error(`Remote RAG error: ${response.statusText}`);
            }
            
            const data = await response.json() as {
                examples: Array<{
                    content: string;
                    context: string;
                    keywords: string[];
                }>;
                documentation: Array<{
                    content: string;
                }>;
            };
            
            // Convert remote format to local format
            const examples: CodeExample[] = data.examples.map((ex, index) => ({
                id: `remote:${index}`,
                content: ex.content,
                context: ex.context,
                keywords: ex.keywords
            }));
            
            const documentation = data.documentation.map(doc => doc.content);
            
            this.log(`Retrieved ${examples.length} examples and ${documentation.length} docs from remote RAG`);
            
            return { examples, documentation };
        } catch (error) {
            this.log(`Remote RAG error: ${error}`);
            this.log('Falling back to local RAG');
            
            // Fallback to local RAG
            const queryEmbedding = await this.embeddingService.getEmbedding(query);
            const relevantExamples = await this.findSimilarExamples(queryEmbedding, maxExamples);
            const documentation = await this.getRelevantDocumentation(query);
            
            return { examples: relevantExamples, documentation };
        }
    }
    
    private async indexWorkspaceFiles(): Promise<void> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return;
        
        for (const folder of workspaceFolders) {
            await this.indexDirectory(folder.uri.fsPath);
        }
    }
    
    private async indexDirectory(dirPath: string): Promise<void> {
        try {
            const files = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const file of files) {
                const filePath = path.join(dirPath, file.name);
                
                if (file.isDirectory() && !file.name.startsWith('.')) {
                    await this.indexDirectory(filePath);
                } else if (file.name.endsWith('.bbj') || file.name.endsWith('.bbl')) {
                    await this.indexFile(filePath);
                }
            }
        } catch (error) {
            this.log(`Error indexing directory ${dirPath}: ${error}`);
        }
    }
    
    private async indexFile(filePath: string): Promise<void> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const examples = this.extractCodeExamples(content, filePath);
            
            // Generate embeddings for each example
            for (const example of examples) {
                example.embedding = await this.embeddingService.getEmbedding(
                    example.content + ' ' + example.context
                );
            }
            
            this.codeExamples.push(...examples);
            this.log(`Indexed ${examples.length} examples from ${filePath}`);
        } catch (error) {
            this.log(`Error indexing file ${filePath}: ${error}`);
        }
    }
    
    private extractCodeExamples(content: string, filePath: string): CodeExample[] {
        const examples: CodeExample[] = [];
        const lines = content.split('\n');
        
        // Extract function definitions, class definitions, and interesting code blocks
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim().toUpperCase();
            
            if (this.isInterestingCodeStart(line)) {
                const example = this.extractCodeBlock(lines, i, filePath);
                if (example) {
                    examples.push(example);
                }
            }
        }
        
        return examples;
    }
    
    private isInterestingCodeStart(line: string): boolean {
        return (
            line.startsWith('DEF ') ||
            line.startsWith('CLASS ') ||
            line.startsWith('FOR ') ||
            line.startsWith('WHILE ') ||
            line.startsWith('IF ') ||
            line.startsWith('MSGBOX') ||
            line.includes('CALLBACK') ||
            line.includes('SQL') ||
            line.includes('PRINT') ||
            line.includes('READ') ||
            line.includes('OPEN')
        );
    }
    
    private extractCodeBlock(lines: string[], startIndex: number, filePath: string): CodeExample | null {
        const blockLines: string[] = [];
        
        // Extract a meaningful code block (up to 10 lines or until logical end)
        for (let i = startIndex; i < Math.min(lines.length, startIndex + 10); i++) {
            blockLines.push(lines[i]);
            
            const line = lines[i].trim().toUpperCase();
            if (line.startsWith('END') || line.startsWith('NEXT') || line.startsWith('FI')) {
                break;
            }
        }
        
        if (blockLines.length === 0) return null;
        
        // Extract context (comments and surrounding code)
        const contextLines: string[] = [];
        for (let i = Math.max(0, startIndex - 3); i < startIndex; i++) {
            if (lines[i].trim().startsWith('REM') || lines[i].trim().startsWith('rem')) {
                contextLines.push(lines[i]);
            }
        }
        
        return {
            id: `${path.basename(filePath)}:${startIndex}`,
            content: blockLines.join('\n'),
            context: contextLines.join('\n'),
            keywords: this.extractKeywords(blockLines.join('\n'))
        };
    }
    
    private extractKeywords(code: string): string[] {
        const keywords: string[] = [];
        const upperCode = code.toUpperCase();
        
        // BBj-specific keywords to extract
        const bbjKeywords = [
            'MSGBOX', 'PRINT', 'FOR', 'NEXT', 'IF', 'THEN', 'ELSE', 'FI',
            'WHILE', 'WEND', 'DEF', 'FNEND', 'CLASS', 'CLASSEND',
            'CALLBACK', 'SQL', 'OPEN', 'READ', 'WRITE', 'CLOSE',
            'DIM', 'LET', 'GOTO', 'GOSUB', 'RETURN'
        ];
        
        for (const keyword of bbjKeywords) {
            if (upperCode.includes(keyword)) {
                keywords.push(keyword);
            }
        }
        
        return keywords;
    }
    
    private async indexBuiltInExamples(): Promise<void> {
        // Index the examples directory if it exists
        const examplesPath = path.join(__dirname, '../../examples');
        try {
            await this.indexDirectory(examplesPath);
        } catch (error) {
            this.log(`Examples directory not found: ${examplesPath}`);
        }
        
        // Index documentation directories
        await this.indexDocumentationDirectories();
        
        // Add common BBj patterns
        await this.addCommonPatterns();
    }
    
    private async indexDocumentationDirectories(): Promise<void> {
        const docPaths = [
            // Standard documentation locations
            path.join(__dirname, '../../documentation'),
            path.join(__dirname, '../../docs'),
            path.join(__dirname, '../../README.md'),
            path.join(__dirname, '../../READMORE.md'),
            
            // Workspace documentation
            ...this.getWorkspaceDocumentationPaths()
        ];
        
        for (const docPath of docPaths) {
            try {
                const stats = await fs.stat(docPath);
                if (stats.isDirectory()) {
                    await this.indexDocumentationDirectory(docPath);
                } else if (stats.isFile() && this.isDocumentationFile(docPath)) {
                    await this.indexDocumentationFile(docPath);
                }
            } catch (error) {
                // File/directory doesn't exist, skip silently
            }
        }
    }
    
    private getWorkspaceDocumentationPaths(): string[] {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return [];
        
        const paths: string[] = [];
        
        for (const folder of workspaceFolders) {
            const basePath = folder.uri.fsPath;
            
            // Common documentation directories
            paths.push(
                path.join(basePath, 'docs'),
                path.join(basePath, 'documentation'),
                path.join(basePath, 'help'),
                path.join(basePath, 'guides'),
                path.join(basePath, 'manual'),
                path.join(basePath, 'api-docs'),
                
                // Common documentation files
                path.join(basePath, 'README.md'),
                path.join(basePath, 'READMORE.md'),
                path.join(basePath, 'USAGE.md'),
                path.join(basePath, 'GUIDE.md'),
                path.join(basePath, 'API.md'),
                path.join(basePath, 'REFERENCE.md'),
                path.join(basePath, 'CHANGELOG.md'),
                path.join(basePath, 'CONTRIBUTING.md')
            );
        }
        
        return paths;
    }
    
    private async indexDocumentationDirectory(dirPath: string): Promise<void> {
        try {
            const files = await fs.readdir(dirPath, { withFileTypes: true });
            
            for (const file of files) {
                const filePath = path.join(dirPath, file.name);
                
                if (file.isDirectory() && !file.name.startsWith('.')) {
                    await this.indexDocumentationDirectory(filePath);
                } else if (file.isFile() && this.isDocumentationFile(filePath)) {
                    await this.indexDocumentationFile(filePath);
                }
            }
        } catch (error) {
            this.log(`Error indexing documentation directory ${dirPath}: ${error}`);
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
    
    private async indexDocumentationFile(filePath: string): Promise<void> {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const docExamples = this.extractDocumentationContent(content, filePath);
            
            // Generate embeddings for documentation sections
            for (const example of docExamples) {
                example.embedding = await this.embeddingService.getEmbedding(
                    example.content + ' ' + example.context
                );
            }
            
            this.codeExamples.push(...docExamples);
            this.log(`Indexed ${docExamples.length} documentation sections from ${filePath}`);
        } catch (error) {
            this.log(`Error indexing documentation file ${filePath}: ${error}`);
        }
    }
    
    private extractDocumentationContent(content: string, filePath: string): CodeExample[] {
        const examples: CodeExample[] = [];
        const lines = content.split('\n');
        
        let currentSection = '';
        let currentContent: string[] = [];
        let inCodeBlock = false;
        let codeBlockContent: string[] = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Detect headers (markdown or other formats)
            if (line.match(/^#{1,6}\s/) || line.match(/^[=-]{3,}$/)) {
                // Save previous section if it has content
                if (currentContent.length > 0) {
                    examples.push(this.createDocumentationExample(
                        currentSection,
                        currentContent.join('\n'),
                        filePath,
                        i - currentContent.length
                    ));
                }
                
                currentSection = line.replace(/^#+\s*/, '').trim();
                currentContent = [];
            }
            
            // Detect code blocks
            if (line.trim().startsWith('```')) {
                if (inCodeBlock) {
                    // End of code block
                    if (codeBlockContent.length > 0) {
                        examples.push(this.createDocumentationExample(
                            `${currentSection} - Code Example`,
                            codeBlockContent.join('\n'),
                            filePath,
                            i - codeBlockContent.length,
                            ['CODE', 'EXAMPLE']
                        ));
                    }
                    codeBlockContent = [];
                    inCodeBlock = false;
                } else {
                    // Start of code block
                    inCodeBlock = true;
                }
            } else if (inCodeBlock) {
                codeBlockContent.push(line);
            } else {
                currentContent.push(line);
            }
        }
        
        // Add the last section
        if (currentContent.length > 0) {
            examples.push(this.createDocumentationExample(
                currentSection,
                currentContent.join('\n'),
                filePath,
                lines.length - currentContent.length
            ));
        }
        
        return examples.filter(ex => ex.content.trim().length > 10); // Only meaningful content
    }
    
    private createDocumentationExample(
        section: string,
        content: string,
        filePath: string,
        lineNumber: number,
        additionalKeywords: string[] = []
    ): CodeExample {
        const keywords = [
            ...this.extractKeywords(content),
            ...additionalKeywords,
            'DOCUMENTATION',
            'REFERENCE'
        ];
        
        return {
            id: `doc:${path.basename(filePath)}:${lineNumber}`,
            content: content.trim(),
            context: `Documentation: ${section}`,
            keywords
        };
    }
    
    private async addCommonPatterns(): Promise<void> {
        const patterns = [
            {
                content: 'A = MSGBOX("Hello World")',
                context: 'Display a simple message box',
                keywords: ['MSGBOX', 'MESSAGE', 'DIALOG']
            },
            {
                content: 'FOR I=1 TO 10\n    PRINT I\nNEXT I',
                context: 'Simple for loop to print numbers',
                keywords: ['FOR', 'LOOP', 'PRINT', 'COUNTER']
            },
            {
                content: 'IF X > 0 THEN\n    PRINT "Positive"\nFI',
                context: 'Conditional statement example',
                keywords: ['IF', 'CONDITION', 'COMPARISON']
            }
        ];
        
        for (const pattern of patterns) {
            const example: CodeExample = {
                id: `builtin:${patterns.indexOf(pattern)}`,
                content: pattern.content,
                context: pattern.context,
                keywords: pattern.keywords,
                embedding: await this.embeddingService.getEmbedding(
                    pattern.content + ' ' + pattern.context
                )
            };
            this.codeExamples.push(example);
        }
    }
    
    private async findSimilarExamples(
        queryEmbedding: number[], 
        maxResults: number
    ): Promise<CodeExample[]> {
        if (!queryEmbedding || this.codeExamples.length === 0) {
            return [];
        }
        
        // Calculate cosine similarity with all examples
        const similarities = this.codeExamples
            .filter(example => example.embedding)
            .map(example => ({
                example,
                similarity: this.cosineSimilarity(queryEmbedding, example.embedding!)
            }))
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, maxResults);
        
        return similarities.map(s => s.example);
    }
    
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
    
    private async getRelevantDocumentation(query: string): Promise<string[]> {
        // This could retrieve from:
        // - BBj documentation
        // - JavaDoc comments
        // - README files
        // - Built-in help text
        
        const docs: string[] = [];
        
        // Simple keyword-based documentation retrieval
        const upperQuery = query.toUpperCase();
        
        if (upperQuery.includes('MSGBOX')) {
            docs.push('MSGBOX(message$) - Displays a message dialog box');
        }
        
        if (upperQuery.includes('FOR')) {
            docs.push('FOR variable = start TO end [STEP increment] - Creates a loop');
        }
        
        if (upperQuery.includes('PRINT')) {
            docs.push('PRINT expression [,expression]... - Outputs values to console');
        }
        
        return docs;
    }
    
    private log(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`[${timestamp}] RAG: ${message}`);
    }
    
    dispose(): void {
        this.embeddingService.dispose();
    }
}

class EmbeddingService {
    private outputChannel: vscode.OutputChannel;
    
    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
    }
    
    async getEmbedding(text: string): Promise<number[]> {
        try {
            const config = vscode.workspace.getConfiguration('bbj.ai');
            const embeddingUrl = config.get<string>('embeddingUrl', 'http://localhost:11434/api/embeddings');
            const embeddingModel = config.get<string>('embeddingModel', 'nomic-embed-text');
            
            const response = await fetch(embeddingUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: embeddingModel,
                    prompt: text
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json() as { embedding?: number[] };
            return data.embedding || [];
        } catch (error) {
            this.log(`Error getting embedding: ${error}`);
            // Fallback to simple hash-based embedding
            return this.simpleEmbedding(text);
        }
    }
    
    private simpleEmbedding(text: string): number[] {
        // Simple fallback embedding based on character frequencies
        const embedding = new Array(384).fill(0);
        const normalized = text.toLowerCase();
        
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            const index = char % embedding.length;
            embedding[index] += 1;
        }
        
        // Normalize
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (magnitude > 0) {
            for (let i = 0; i < embedding.length; i++) {
                embedding[i] /= magnitude;
            }
        }
        
        return embedding;
    }
    
    private log(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.outputChannel.appendLine(`[${timestamp}] Embedding: ${message}`);
    }
    
    dispose(): void {
        // Clean up any resources
    }
}