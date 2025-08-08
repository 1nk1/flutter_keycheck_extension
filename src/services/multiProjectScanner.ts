import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TestingKey } from '../models/testingKey';
import { KeyScanner } from './keyScanner';

/**
 * Multi-Project Scanner for QA Engineers
 * Analyzes testing keys across multiple Flutter projects simultaneously
 */
export class MultiProjectScanner {
    private projectScanners: Map<string, KeyScanner> = new Map();
    private projectKeys: Map<string, TestingKey[]> = new Map();
    private scanResults: ProjectScanResult[] = [];

    /**
     * Scan all Flutter projects in workspace folders
     */
    async scanAllProjects(): Promise<MultiProjectScanResult> {
        console.log('🔍 MultiProjectScanner: Starting multi-project scan...');
        
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return {
                projects: [],
                totalKeys: 0,
                totalBrokenKeys: 0,
                crossProjectConflicts: [],
                summary: 'No workspace folders found'
            };
        }

        this.scanResults = [];
        this.projectKeys.clear();
        this.projectScanners.clear();

        // Scan each workspace folder
        for (const folder of workspaceFolders) {
            const projectPath = folder.uri.fsPath;
            const projectName = folder.name;
            
            console.log(`📂 Scanning project: ${projectName}`);
            
            if (await this.isFlutterProject(projectPath)) {
                const result = await this.scanProject(projectName, projectPath);
                this.scanResults.push(result);
            } else {
                console.log(`⚠️ Skipping non-Flutter project: ${projectName}`);
            }
        }

        // Analyze cross-project conflicts
        const conflicts = this.detectCrossProjectConflicts();
        
        const totalKeys = this.scanResults.reduce((sum, result) => sum + result.keys.length, 0);
        const totalBrokenKeys = this.scanResults.reduce((sum, result) => sum + result.brokenKeys.length, 0);

        console.log(`✅ Multi-project scan completed: ${this.scanResults.length} projects, ${totalKeys} keys, ${totalBrokenKeys} broken keys`);

        return {
            projects: this.scanResults,
            totalKeys,
            totalBrokenKeys,
            crossProjectConflicts: conflicts,
            summary: `Scanned ${this.scanResults.length} Flutter projects`
        };
    }

    /**
     * Scan individual project
     */
    private async scanProject(projectName: string, projectPath: string): Promise<ProjectScanResult> {
        try {
            const scanner = new KeyScanner();
            this.projectScanners.set(projectName, scanner);

            // Scan keys in project
            const keys = await this.scanProjectKeys(projectPath);
            this.projectKeys.set(projectName, keys);

            // Detect broken keys
            const brokenKeys = await this.detectBrokenKeys(keys, projectPath);
            
            // Analyze dependencies
            const dependencies = await this.analyzeDependencies(projectPath);

            return {
                projectName,
                projectPath,
                keys,
                brokenKeys,
                dependencies,
                keyCategories: this.categorizeKeys(keys),
                issues: await this.detectProjectIssues(keys, projectPath)
            };
        } catch (error) {
            console.error(`❌ Error scanning project ${projectName}:`, error);
            return {
                projectName,
                projectPath,
                keys: [],
                brokenKeys: [],
                dependencies: [],
                keyCategories: {},
                issues: [`Failed to scan project: ${error}`]
            };
        }
    }

    /**
     * Check if directory is Flutter project
     */
    private async isFlutterProject(projectPath: string): Promise<boolean> {
        const pubspecPath = path.join(projectPath, 'pubspec.yaml');
        try {
            const exists = fs.existsSync(pubspecPath);
            if (exists) {
                const content = fs.readFileSync(pubspecPath, 'utf8');
                return content.includes('flutter:');
            }
            return false;
        } catch (error) {
            return false;
        }
    }

    /**
     * Scan keys in specific project
     */
    private async scanProjectKeys(projectPath: string): Promise<TestingKey[]> {
        const keys: TestingKey[] = [];
        const scanner = new KeyScanner();
        
        try {
            // Temporarily change working directory context for scanner
            const originalWorkspace = vscode.workspace.workspaceFolders;
            
            // Create temporary workspace folder for this project
            const projectUri = vscode.Uri.file(projectPath);
            const tempWorkspaceFolder: vscode.WorkspaceFolder = {
                uri: projectUri,
                name: path.basename(projectPath),
                index: 0
            };
            
            // Scan with project-specific context
            const projectKeys = await scanner.scanAllKeys();
            
            // Add project context to each key
            for (const key of projectKeys) {
                keys.push({
                    ...key,
                    filePath: key.filePath.replace(projectPath, `.${path.sep}`),
                    projectName: path.basename(projectPath)
                } as TestingKey & { projectName: string });
            }
            
            return keys;
        } catch (error) {
            console.warn(`⚠️ Could not scan keys in project ${projectPath}:`, error);
            return [];
        }
    }

    /**
     * Detect broken keys in project
     */
    private async detectBrokenKeys(keys: TestingKey[], projectPath: string): Promise<BrokenKeyReport[]> {
        const brokenKeys: BrokenKeyReport[] = [];
        
        for (const key of keys) {
            const issues: string[] = [];
            
            // Check if key is used
            if (!key.isUsed && key.usageCount === 0) {
                issues.push('Unused key - no references found');
            }
            
            // Check if key is defined properly
            if (!key.isDefined) {
                issues.push('Key referenced but not defined');
            }
            
            // Check naming conventions
            if (!this.isValidKeyName(key.name)) {
                issues.push('Invalid key naming convention');
            }
            
            // Check file existence
            const fullPath = path.join(projectPath, key.filePath);
            if (!fs.existsSync(fullPath)) {
                issues.push('Source file does not exist');
            }
            
            if (issues.length > 0) {
                brokenKeys.push({
                    key,
                    issues,
                    severity: this.calculateSeverity(issues),
                    fixSuggestions: this.generateFixSuggestions(key, issues)
                });
            }
        }
        
        return brokenKeys;
    }

    /**
     * Analyze project dependencies
     */
    private async analyzeDependencies(projectPath: string): Promise<DependencyInfo[]> {
        const dependencies: DependencyInfo[] = [];
        const pubspecPath = path.join(projectPath, 'pubspec.yaml');
        
        try {
            if (fs.existsSync(pubspecPath)) {
                const content = fs.readFileSync(pubspecPath, 'utf8');
                
                // Basic YAML parsing for dependencies
                const lines = content.split('\\n');
                let inDependencies = false;
                
                for (const line of lines) {
                    if (line.trim() === 'dependencies:') {
                        inDependencies = true;
                        continue;
                    }
                    
                    if (inDependencies && line.startsWith('  ') && line.includes(':')) {
                        const [name, version] = line.trim().split(':');
                        if (name && !name.includes('flutter')) {
                            dependencies.push({
                                name: name.trim(),
                                version: version ? version.trim() : 'any',
                                type: 'external',
                                hasTestingKeys: false // TODO: Implement analysis
                            });
                        }
                    }
                    
                    if (inDependencies && line.trim() && !line.startsWith('  ')) {
                        inDependencies = false;
                    }
                }
            }
        } catch (error) {
            console.warn(`Could not analyze dependencies for ${projectPath}:`, error);
        }
        
        return dependencies;
    }

    /**
     * Categorize keys by type/purpose
     */
    private categorizeKeys(keys: TestingKey[]): KeyCategoryStats {
        const categories: KeyCategoryStats = {};
        
        for (const key of keys) {
            const category = key.category.toString();
            if (!categories[category]) {
                categories[category] = {
                    count: 0,
                    used: 0,
                    unused: 0
                };
            }
            
            categories[category].count++;
            if (key.isUsed) {
                categories[category].used++;
            } else {
                categories[category].unused++;
            }
        }
        
        return categories;
    }

    /**
     * Detect cross-project key conflicts
     */
    private detectCrossProjectConflicts(): CrossProjectConflict[] {
        const conflicts: CrossProjectConflict[] = [];
        const keysByName: Map<string, Array<{project: string, key: TestingKey}>> = new Map();
        
        // Group keys by name across projects
        for (const [projectName, keys] of this.projectKeys.entries()) {
            for (const key of keys) {
                if (!keysByName.has(key.name)) {
                    keysByName.set(key.name, []);
                }
                keysByName.get(key.name)!.push({ project: projectName, key });
            }
        }
        
        // Find conflicts (same name, different values/purposes)
        for (const [keyName, usages] of keysByName.entries()) {
            if (usages.length > 1) {
                const values = new Set(usages.map(u => u.key.value));
                const categories = new Set(usages.map(u => u.key.category));
                
                if (values.size > 1 || categories.size > 1) {
                    conflicts.push({
                        keyName,
                        conflictType: values.size > 1 ? 'value-mismatch' : 'category-mismatch',
                        affectedProjects: usages.map(u => u.project),
                        details: usages.map(u => ({
                            project: u.project,
                            value: u.key.value,
                            category: u.key.category.toString(),
                            file: u.key.filePath
                        }))
                    });
                }
            }
        }
        
        return conflicts;
    }

    /**
     * Detect general project issues
     */
    private async detectProjectIssues(keys: TestingKey[], projectPath: string): Promise<string[]> {
        const issues: string[] = [];
        
        // Check for common issues
        const unusedKeys = keys.filter(k => !k.isUsed);
        if (unusedKeys.length > keys.length * 0.3) {
            issues.push(`High number of unused keys: ${unusedKeys.length}/${keys.length} (${Math.round(unusedKeys.length/keys.length*100)}%)`);
        }
        
        const undefinedKeys = keys.filter(k => !k.isDefined);
        if (undefinedKeys.length > 0) {
            issues.push(`Found ${undefinedKeys.length} referenced but undefined keys`);
        }
        
        const duplicateNames = new Set();
        const duplicates = keys.filter(k => {
            if (duplicateNames.has(k.name)) {
                return true;
            }
            duplicateNames.add(k.name);
            return false;
        });
        
        if (duplicates.length > 0) {
            issues.push(`Found ${duplicates.length} duplicate key names`);
        }
        
        return issues;
    }

    /**
     * Validate key naming convention
     */
    private isValidKeyName(keyName: string): boolean {
        // Snake_case or camelCase validation
        const snakeCase = /^[a-z][a-z0-9_]*[a-z0-9]$/;
        const camelCase = /^[a-z][a-zA-Z0-9]*$/;
        
        return snakeCase.test(keyName) || camelCase.test(keyName);
    }

    /**
     * Calculate issue severity
     */
    private calculateSeverity(issues: string[]): 'low' | 'medium' | 'high' | 'critical' {
        const criticalKeywords = ['not defined', 'does not exist'];
        const highKeywords = ['unused', 'invalid'];
        
        for (const issue of issues) {
            const lowerIssue = issue.toLowerCase();
            if (criticalKeywords.some(keyword => lowerIssue.includes(keyword))) {
                return 'critical';
            }
            if (highKeywords.some(keyword => lowerIssue.includes(keyword))) {
                return 'high';
            }
        }
        
        return issues.length > 2 ? 'medium' : 'low';
    }

    /**
     * Generate fix suggestions
     */
    private generateFixSuggestions(key: TestingKey, issues: string[]): string[] {
        const suggestions: string[] = [];
        
        for (const issue of issues) {
            if (issue.includes('Unused key')) {
                suggestions.push(`Remove unused key '${key.name}' or add references in test files`);
            }
            if (issue.includes('not defined')) {
                suggestions.push(`Add definition for key '${key.name}' in constants file`);
            }
            if (issue.includes('Invalid key naming')) {
                suggestions.push(`Rename '${key.name}' to use snake_case or camelCase convention`);
            }
            if (issue.includes('does not exist')) {
                suggestions.push(`Update file path or restore missing file: ${key.filePath}`);
            }
        }
        
        return suggestions;
    }

    /**
     * Get scan results
     */
    getResults(): MultiProjectScanResult {
        const totalKeys = this.scanResults.reduce((sum, result) => sum + result.keys.length, 0);
        const totalBrokenKeys = this.scanResults.reduce((sum, result) => sum + result.brokenKeys.length, 0);
        const conflicts = this.detectCrossProjectConflicts();

        return {
            projects: this.scanResults,
            totalKeys,
            totalBrokenKeys,
            crossProjectConflicts: conflicts,
            summary: `${this.scanResults.length} projects scanned`
        };
    }
}

// Type definitions for multi-project scanning
export interface MultiProjectScanResult {
    projects: ProjectScanResult[];
    totalKeys: number;
    totalBrokenKeys: number;
    crossProjectConflicts: CrossProjectConflict[];
    summary: string;
}

export interface ProjectScanResult {
    projectName: string;
    projectPath: string;
    keys: TestingKey[];
    brokenKeys: BrokenKeyReport[];
    dependencies: DependencyInfo[];
    keyCategories: KeyCategoryStats;
    issues: string[];
}

export interface BrokenKeyReport {
    key: TestingKey;
    issues: string[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    fixSuggestions: string[];
}

export interface DependencyInfo {
    name: string;
    version: string;
    type: 'external' | 'local' | 'flutter';
    hasTestingKeys: boolean;
}

export interface KeyCategoryStats {
    [category: string]: {
        count: number;
        used: number;
        unused: number;
    };
}

export interface CrossProjectConflict {
    keyName: string;
    conflictType: 'value-mismatch' | 'category-mismatch';
    affectedProjects: string[];
    details: Array<{
        project: string;
        value: string;
        category: string;
        file: string;
    }>;
}