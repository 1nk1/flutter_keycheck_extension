import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { TestingKey } from '../models/testingKey';

/**
 * Repository Connector for External Repository Analysis
 * Downloads and analyzes testing keys from external repositories before build
 */
export class RepositoryConnector {
    private readonly GITHUB_API = 'https://api.github.com';
    private readonly GITLAB_API = 'https://gitlab.com/api/v4';
    private repositoryCache: Map<string, RepositoryAnalysisResult> = new Map();
    private authTokens: Map<string, string> = new Map();

    constructor() {
        this.loadAuthTokens();
    }

    /**
     * Load authentication tokens from VSCode settings
     */
    private loadAuthTokens(): void {
        const config = vscode.workspace.getConfiguration('flutterTestingKeys.repositories');
        const githubToken = config.get<string>('githubToken');
        const gitlabToken = config.get<string>('gitlabToken');
        
        if (githubToken) {
            this.authTokens.set('github', githubToken);
        }
        if (gitlabToken) {
            this.authTokens.set('gitlab', gitlabToken);
        }
    }

    /**
     * Analyze repositories defined in configuration
     */
    async analyzeConfiguredRepositories(): Promise<RepositoryAnalysisReport> {
        console.log('🔗 RepositoryConnector: Analyzing configured repositories...');
        
        const config = vscode.workspace.getConfiguration('flutterTestingKeys.repositories');
        const repositories = config.get<RepositoryConfig[]>('external') || [];
        
        if (repositories.length === 0) {
            return {
                totalRepositories: 0,
                analysisResults: [],
                totalExternalKeys: 0,
                conflictsWithLocal: [],
                recommendations: ['No external repositories configured']
            };
        }

        const analysisResults: RepositoryAnalysisResult[] = [];
        
        for (const repo of repositories) {
            console.log(`🔍 Analyzing repository: ${repo.url}`);
            try {
                const result = await this.analyzeRepository(repo);
                analysisResults.push(result);
            } catch (error) {
                console.error(`❌ Failed to analyze repository ${repo.url}:`, error);
                analysisResults.push({
                    config: repo,
                    status: 'failed',
                    error: error instanceof Error ? error.message : String(error),
                    testingKeys: [],
                    metadata: {
                        lastCommit: '',
                        branch: repo.branch || 'main',
                        size: 0,
                        language: 'unknown'
                    },
                    analysisTime: Date.now()
                });
            }
        }

        // Detect conflicts with local keys
        const conflicts = await this.detectConflictsWithLocal(analysisResults);
        
        const totalKeys = analysisResults.reduce((sum, result) => sum + result.testingKeys.length, 0);
        
        return {
            totalRepositories: repositories.length,
            analysisResults,
            totalExternalKeys: totalKeys,
            conflictsWithLocal: conflicts,
            recommendations: this.generateRepositoryRecommendations(analysisResults, conflicts)
        };
    }

    /**
     * Analyze single repository
     */
    private async analyzeRepository(config: RepositoryConfig): Promise<RepositoryAnalysisResult> {
        const cacheKey = `${config.url}@${config.branch || 'main'}`;
        
        // Check cache
        if (this.repositoryCache.has(cacheKey)) {
            const cached = this.repositoryCache.get(cacheKey)!;
            // Return cached if less than 1 hour old
            if (Date.now() - cached.analysisTime < 60 * 60 * 1000) {
                console.log(`📋 Using cached analysis for ${config.url}`);
                return cached;
            }
        }

        const repoInfo = this.parseRepositoryUrl(config.url);
        if (!repoInfo) {
            throw new Error(`Invalid repository URL: ${config.url}`);
        }

        let result: RepositoryAnalysisResult;

        switch (repoInfo.provider) {
            case 'github':
                result = await this.analyzeGitHubRepository(config, repoInfo);
                break;
            case 'gitlab':
                result = await this.analyzeGitLabRepository(config, repoInfo);
                break;
            default:
                throw new Error(`Unsupported repository provider: ${repoInfo.provider}`);
        }

        // Cache result
        this.repositoryCache.set(cacheKey, result);
        return result;
    }

    /**
     * Parse repository URL to extract provider and details
     */
    private parseRepositoryUrl(url: string): RepositoryInfo | null {
        // GitHub patterns
        const githubMatch = url.match(/github\\.com[\\/:]([^/]+)[\\/]([^/]+?)(\\.git)?$/);
        if (githubMatch) {
            return {
                provider: 'github',
                owner: githubMatch[1],
                repo: githubMatch[2].replace('.git', ''),
                url
            };
        }

        // GitLab patterns
        const gitlabMatch = url.match(/gitlab\\.com[\\/:]([^/]+)[\\/]([^/]+?)(\\.git)?$/);
        if (gitlabMatch) {
            return {
                provider: 'gitlab',
                owner: gitlabMatch[1],
                repo: gitlabMatch[2].replace('.git', ''),
                url
            };
        }

        return null;
    }

    /**
     * Analyze GitHub repository
     */
    private async analyzeGitHubRepository(
        config: RepositoryConfig, 
        repoInfo: RepositoryInfo
    ): Promise<RepositoryAnalysisResult> {
        const headers: Record<string, string> = {
            'User-Agent': 'VSCode-Flutter-Testing-Keys-Extension',
            'Accept': 'application/vnd.github.v3+json'
        };

        const githubToken = this.authTokens.get('github');
        if (githubToken) {
            headers['Authorization'] = `token ${githubToken}`;
        }

        try {
            // Get repository metadata
            const repoData = await this.fetchJson(`${this.GITHUB_API}/repos/${repoInfo.owner}/${repoInfo.repo}`, headers);
            
            // Get repository contents
            const branch = config.branch || repoData.default_branch || 'main';
            const contentsUrl = `${this.GITHUB_API}/repos/${repoInfo.owner}/${repoInfo.repo}/contents`;
            
            // Find Dart/Flutter files
            const dartFiles = await this.findDartFilesInGitHub(contentsUrl, headers, branch);
            
            // Analyze testing keys in found files
            const testingKeys: ExternalRepositoryKey[] = [];
            for (const file of dartFiles) {
                const fileKeys = await this.analyzeGitHubFile(file, headers, config);
                testingKeys.push(...fileKeys);
            }

            return {
                config,
                status: 'success',
                testingKeys,
                metadata: {
                    lastCommit: repoData.pushed_at,
                    branch,
                    size: repoData.size,
                    language: repoData.language || 'Dart'
                },
                analysisTime: Date.now()
            };
        } catch (error) {
            throw new Error(`GitHub API error: ${error}`);
        }
    }

    /**
     * Analyze GitLab repository
     */
    private async analyzeGitLabRepository(
        config: RepositoryConfig, 
        repoInfo: RepositoryInfo
    ): Promise<RepositoryAnalysisResult> {
        const headers: Record<string, string> = {
            'User-Agent': 'VSCode-Flutter-Testing-Keys-Extension'
        };

        const gitlabToken = this.authTokens.get('gitlab');
        if (gitlabToken) {
            headers['Private-Token'] = gitlabToken;
        }

        try {
            // Get project info
            const projectPath = encodeURIComponent(`${repoInfo.owner}/${repoInfo.repo}`);
            const projectData = await this.fetchJson(`${this.GITLAB_API}/projects/${projectPath}`, headers);
            
            // Get repository tree
            const branch = config.branch || projectData.default_branch || 'main';
            const treeUrl = `${this.GITLAB_API}/projects/${projectData.id}/repository/tree?ref=${branch}&recursive=true`;
            const tree = await this.fetchJson(treeUrl, headers);
            
            // Find Dart files
            const dartFiles = tree.filter((item: any) => 
                item.type === 'blob' && item.path.endsWith('.dart')
            );
            
            // Analyze testing keys
            const testingKeys: ExternalRepositoryKey[] = [];
            for (const file of dartFiles.slice(0, 10)) { // Limit to avoid rate limiting
                const fileKeys = await this.analyzeGitLabFile(file, projectData.id, headers, config, branch);
                testingKeys.push(...fileKeys);
            }

            return {
                config,
                status: 'success',
                testingKeys,
                metadata: {
                    lastCommit: projectData.last_activity_at,
                    branch,
                    size: projectData.repository_size || 0,
                    language: 'Dart'
                },
                analysisTime: Date.now()
            };
        } catch (error) {
            throw new Error(`GitLab API error: ${error}`);
        }
    }

    /**
     * Find Dart files in GitHub repository
     */
    private async findDartFilesInGitHub(
        contentsUrl: string, 
        headers: Record<string, string>, 
        branch: string,
        path: string = ''
    ): Promise<GitHubFile[]> {
        const dartFiles: GitHubFile[] = [];
        
        try {
            const url = `${contentsUrl}${path ? '/' + path : ''}?ref=${branch}`;
            const contents = await this.fetchJson(url, headers);
            
            if (Array.isArray(contents)) {
                for (const item of contents) {
                    if (item.type === 'file' && item.name.endsWith('.dart')) {
                        dartFiles.push({
                            name: item.name,
                            path: item.path,
                            download_url: item.download_url,
                            size: item.size
                        });
                    } else if (item.type === 'dir' && dartFiles.length < 50) { // Limit recursion
                        const subFiles = await this.findDartFilesInGitHub(contentsUrl, headers, branch, item.path);
                        dartFiles.push(...subFiles);
                    }
                }
            }
        } catch (error) {
            console.warn(`Could not fetch contents from ${contentsUrl}${path}:`, error);
        }
        
        return dartFiles;
    }

    /**
     * Analyze testing keys in GitHub file
     */
    private async analyzeGitHubFile(
        file: GitHubFile, 
        headers: Record<string, string>, 
        config: RepositoryConfig
    ): Promise<ExternalRepositoryKey[]> {
        const keys: ExternalRepositoryKey[] = [];
        
        try {
            if (file.size > 100000) { // Skip very large files
                return keys;
            }
            
            const content = await this.fetchText(file.download_url, headers);
            const foundKeys = this.extractTestingKeysFromDartCode(content, file.path);
            
            for (const key of foundKeys) {
                keys.push({
                    ...key,
                    repository: config.url,
                    filePath: file.path,
                    branch: config.branch || 'main'
                });
            }
        } catch (error) {
            console.warn(`Could not analyze file ${file.path}:`, error);
        }
        
        return keys;
    }

    /**
     * Analyze testing keys in GitLab file
     */
    private async analyzeGitLabFile(
        file: any, 
        projectId: number, 
        headers: Record<string, string>, 
        config: RepositoryConfig,
        branch: string
    ): Promise<ExternalRepositoryKey[]> {
        const keys: ExternalRepositoryKey[] = [];
        
        try {
            const fileUrl = `${this.GITLAB_API}/projects/${projectId}/repository/files/${encodeURIComponent(file.path)}/raw?ref=${branch}`;
            const content = await this.fetchText(fileUrl, headers);
            const foundKeys = this.extractTestingKeysFromDartCode(content, file.path);
            
            for (const key of foundKeys) {
                keys.push({
                    ...key,
                    repository: config.url,
                    filePath: file.path,
                    branch
                });
            }
        } catch (error) {
            console.warn(`Could not analyze GitLab file ${file.path}:`, error);
        }
        
        return keys;
    }

    /**
     * Extract testing keys from Dart source code
     */
    private extractTestingKeysFromDartCode(content: string, filePath: string): TestingKeyMatch[] {
        const keys: TestingKeyMatch[] = [];
        const lines = content.split('\\n');
        
        // Patterns to match testing keys
        const keyPatterns = [
            // Key('key_name')
            /Key\\s*\\(\\s*['\"]([^'\"]+)['\"]\\s*\\)/g,
            // ValueKey('key_name')
            /ValueKey\\s*\\(\\s*['\"]([^'\"]+)['\"]\\s*\\)/g,
            // find.byKey(Key('key_name'))
            /find\\.byKey\\s*\\(\\s*Key\\s*\\(\\s*['\"]([^'\"]+)['\"]\\s*\\)\\s*\\)/g,
            // static const String keyName = 'key_value'
            /static\\s+const\\s+String\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*=\\s*['\"]([^'\"]+)['\"]/g,
            // const String keyName = 'key_value'
            /const\\s+String\\s+([a-zA-Z_][a-zA-Z0-9_]*)\\s*=\\s*['\"]([^'\"]+)['\"]/g
        ];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            for (const pattern of keyPatterns) {
                let match;
                while ((match = pattern.exec(line)) !== null) {
                    const keyValue = match[1] || match[2];
                    const keyName = match[2] ? match[1] : keyValue;
                    
                    if (keyValue && keyValue.length > 0) {
                        keys.push({
                            name: keyName,
                            value: keyValue,
                            line: i + 1,
                            context: line.trim(),
                            keyType: this.determineKeyType(line, keyValue)
                        });
                    }
                }
                pattern.lastIndex = 0; // Reset regex
            }
        }
        
        return keys;
    }

    /**
     * Determine key type based on context
     */
    private determineKeyType(context: string, keyValue: string): string {
        const lowerContext = context.toLowerCase();
        const lowerValue = keyValue.toLowerCase();
        
        if (lowerContext.includes('button') || lowerValue.includes('button')) {
            return 'button';
        } else if (lowerContext.includes('field') || lowerValue.includes('field')) {
            return 'field';
        } else if (lowerContext.includes('text') || lowerValue.includes('text')) {
            return 'text';
        } else if (lowerContext.includes('card') || lowerValue.includes('card')) {
            return 'card';
        } else {
            return 'widget';
        }
    }

    /**
     * Detect conflicts between external repository keys and local keys
     */
    private async detectConflictsWithLocal(
        repositoryResults: RepositoryAnalysisResult[]
    ): Promise<KeyConflictReport[]> {
        const conflicts: KeyConflictReport[] = [];
        
        // Get local keys from current workspace
        const localKeys = await this.getLocalTestingKeys();
        const localKeysByName = new Map<string, TestingKey>();
        
        for (const key of localKeys) {
            localKeysByName.set(key.name, key);
        }
        
        // Check for conflicts
        for (const repoResult of repositoryResults) {
            if (repoResult.status !== 'success') continue;
            
            for (const externalKey of repoResult.testingKeys) {
                const localKey = localKeysByName.get(externalKey.name);
                
                if (localKey) {
                    // Same name, check if values differ
                    if (localKey.value !== externalKey.value) {
                        conflicts.push({
                            keyName: externalKey.name,
                            conflictType: 'value-mismatch',
                            localKey: {
                                value: localKey.value,
                                file: localKey.filePath,
                                line: localKey.line
                            },
                            externalKey: {
                                value: externalKey.value,
                                repository: externalKey.repository,
                                file: externalKey.filePath,
                                line: externalKey.line
                            },
                            severity: 'high',
                            resolution: 'Rename one of the conflicting keys or ensure values match'
                        });
                    } else {
                        conflicts.push({
                            keyName: externalKey.name,
                            conflictType: 'name-duplication',
                            localKey: {
                                value: localKey.value,
                                file: localKey.filePath,
                                line: localKey.line
                            },
                            externalKey: {
                                value: externalKey.value,
                                repository: externalKey.repository,
                                file: externalKey.filePath,
                                line: externalKey.line
                            },
                            severity: 'medium',
                            resolution: 'Consider using prefixes to differentiate keys'
                        });
                    }
                }
            }
        }
        
        return conflicts;
    }

    /**
     * Get local testing keys from current workspace
     */
    private async getLocalTestingKeys(): Promise<TestingKey[]> {
        try {
            const { KeyScanner } = await import('./keyScanner');
            const scanner = new KeyScanner();
            return await scanner.scanAllKeys();
        } catch (error) {
            console.warn('Could not scan local keys:', error);
            return [];
        }
    }

    /**
     * Generate recommendations based on analysis
     */
    private generateRepositoryRecommendations(
        results: RepositoryAnalysisResult[],
        conflicts: KeyConflictReport[]
    ): string[] {
        const recommendations: string[] = [];
        
        const successfulRepos = results.filter(r => r.status === 'success');
        const failedRepos = results.filter(r => r.status === 'failed');
        
        if (failedRepos.length > 0) {
            recommendations.push(`❌ ${failedRepos.length} repositories failed analysis - check authentication and URLs`);
        }
        
        if (conflicts.length > 0) {
            const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');
            if (highSeverityConflicts.length > 0) {
                recommendations.push(`🚨 ${highSeverityConflicts.length} high-severity key conflicts found - immediate attention required`);
            }
            recommendations.push(`⚠️ Total conflicts found: ${conflicts.length} - consider using key prefixes`);
        }
        
        const totalKeys = successfulRepos.reduce((sum, result) => sum + result.testingKeys.length, 0);
        if (totalKeys > 0) {
            recommendations.push(`📋 Found ${totalKeys} testing keys across ${successfulRepos.length} external repositories`);
        }
        
        if (successfulRepos.length === 0 && results.length > 0) {
            recommendations.push('🔧 Configure authentication tokens for better repository access');
        }
        
        return recommendations;
    }

    /**
     * Utility method to fetch JSON from URL
     */
    private fetchJson(url: string, headers: Record<string, string> = {}): Promise<any> {
        return new Promise((resolve, reject) => {
            https.get(url, { headers }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        if (res.statusCode === 200) {
                            resolve(JSON.parse(data));
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', reject);
        });
    }

    /**
     * Utility method to fetch text from URL
     */
    private fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
        return new Promise((resolve, reject) => {
            https.get(url, { headers }, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    }
                });
            }).on('error', reject);
        });
    }

    /**
     * Clear repository cache
     */
    clearCache(): void {
        this.repositoryCache.clear();
        console.log('🧹 Repository cache cleared');
    }
}

// Type definitions
export interface RepositoryConfig {
    url: string;
    branch?: string;
    name?: string;
    enabled?: boolean;
}

interface RepositoryInfo {
    provider: 'github' | 'gitlab';
    owner: string;
    repo: string;
    url: string;
}

interface GitHubFile {
    name: string;
    path: string;
    download_url: string;
    size: number;
}

interface TestingKeyMatch {
    name: string;
    value: string;
    line: number;
    context: string;
    keyType: string;
}

export interface ExternalRepositoryKey extends TestingKeyMatch {
    repository: string;
    filePath: string;
    branch: string;
}

export interface RepositoryAnalysisResult {
    config: RepositoryConfig;
    status: 'success' | 'failed';
    error?: string;
    testingKeys: ExternalRepositoryKey[];
    metadata: {
        lastCommit: string;
        branch: string;
        size: number;
        language: string;
    };
    analysisTime: number;
}

export interface RepositoryAnalysisReport {
    totalRepositories: number;
    analysisResults: RepositoryAnalysisResult[];
    totalExternalKeys: number;
    conflictsWithLocal: KeyConflictReport[];
    recommendations: string[];
}

export interface KeyConflictReport {
    keyName: string;
    conflictType: 'value-mismatch' | 'name-duplication';
    localKey: {
        value: string;
        file: string;
        line: number;
    };
    externalKey: {
        value: string;
        repository: string;
        file: string;
        line: number;
    };
    severity: 'low' | 'medium' | 'high';
    resolution: string;
}