import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { TestingKey } from '../models/testingKey';
import { KeyScanner } from './keyScanner';

/**
 * Broken Key Detection Engine
 * Advanced algorithms to detect and categorize broken testing keys
 */
export class BrokenKeyDetector {
    private keyScanner: KeyScanner;
    private brokenKeyCache: Map<string, BrokenKeyReport> = new Map();

    constructor() {
        this.keyScanner = new KeyScanner();
    }

    /**
     * Comprehensive broken key analysis
     */
    async detectAllBrokenKeys(projectPath?: string): Promise<BrokenKeyAnalysisReport> {
        console.log('🕵️ BrokenKeyDetector: Starting comprehensive analysis...');
        
        const workspacePath = projectPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
            return {
                totalKeys: 0,
                brokenKeys: [],
                criticalIssues: [],
                suggestions: ['No workspace folder found'],
                healthScore: 0
            };
        }

        try {
            // Scan all keys in the project
            const allKeys = await this.keyScanner.scanAllKeys();
            console.log(`📋 Found ${allKeys.length} keys to analyze`);

            const brokenKeys: BrokenKeyReport[] = [];
            const criticalIssues: CriticalIssue[] = [];

            // Analyze each key for issues
            for (const key of allKeys) {
                const issues = await this.analyzeKeyForIssues(key, workspacePath);
                if (issues.length > 0) {
                    const report: BrokenKeyReport = {
                        key,
                        issues,
                        severity: this.calculateSeverity(issues),
                        fixSuggestions: this.generateFixSuggestions(key, issues),
                        affectedFiles: await this.findAffectedFiles(key, workspacePath),
                        estimatedFixTime: this.estimateFixTime(issues)
                    };
                    
                    brokenKeys.push(report);
                    
                    // Track critical issues
                    if (report.severity === 'critical') {
                        criticalIssues.push({
                            keyName: key.name,
                            issueType: issues[0],
                            impact: 'Blocks testing automation',
                            urgency: 'immediate'
                        });
                    }
                }
            }

            const healthScore = this.calculateHealthScore(allKeys.length, brokenKeys);
            const suggestions = this.generateProjectSuggestions(brokenKeys, allKeys);

            console.log(`✅ Analysis complete: ${brokenKeys.length}/${allKeys.length} keys have issues`);

            return {
                totalKeys: allKeys.length,
                brokenKeys,
                criticalIssues,
                suggestions,
                healthScore
            };

        } catch (error) {
            console.error('❌ Error in broken key detection:', error);
            return {
                totalKeys: 0,
                brokenKeys: [],
                criticalIssues: [],
                suggestions: [`Analysis failed: ${error}`],
                healthScore: 0
            };
        }
    }

    /**
     * Analyze individual key for various issues
     */
    private async analyzeKeyForIssues(key: TestingKey, workspacePath: string): Promise<KeyIssue[]> {
        const issues: KeyIssue[] = [];

        // Issue 1: Undefined keys
        if (!key.isDefined) {
            issues.push('undefined-key');
        }

        // Issue 2: Unused keys
        if (!key.isUsed || key.usageCount === 0) {
            issues.push('unused-key');
        }

        // Issue 3: Missing source files
        const fullPath = path.resolve(workspacePath, key.filePath);
        if (!fs.existsSync(fullPath)) {
            issues.push('missing-source-file');
        }

        // Issue 4: Invalid naming patterns
        if (!this.validateKeyNaming(key.name)) {
            issues.push('invalid-naming');
        }

        // Issue 5: Duplicate key names
        if (await this.checkForDuplicates(key, workspacePath)) {
            issues.push('duplicate-key');
        }

        // Issue 6: Inconsistent key values
        if (await this.checkValueConsistency(key, workspacePath)) {
            issues.push('inconsistent-values');
        }

        // Issue 7: Wrong category classification
        if (this.detectWrongCategory(key)) {
            issues.push('wrong-category');
        }

        // Issue 8: Accessibility issues
        if (this.checkAccessibilityIssues(key)) {
            issues.push('accessibility-issue');
        }

        // Issue 9: Performance issues
        if (this.detectPerformanceIssues(key)) {
            issues.push('performance-issue');
        }

        // Issue 10: Security vulnerabilities
        if (this.checkSecurityVulnerabilities(key)) {
            issues.push('security-vulnerability');
        }

        return issues;
    }

    /**
     * Validate key naming conventions
     */
    private validateKeyNaming(keyName: string): boolean {
        // Check for common patterns: snake_case, camelCase, kebab-case
        const validPatterns = [
            /^[a-z][a-z0-9_]*[a-z0-9]$/,  // snake_case
            /^[a-z][a-zA-Z0-9]*$/,        // camelCase
            /^[a-z][a-z0-9-]*[a-z0-9]$/   // kebab-case
        ];

        return validPatterns.some(pattern => pattern.test(keyName));
    }

    /**
     * Check for duplicate key names
     */
    private async checkForDuplicates(key: TestingKey, workspacePath: string): Promise<boolean> {
        try {
            const allKeys = await this.keyScanner.scanAllKeys();
            const duplicates = allKeys.filter(k => k.name === key.name && k.filePath !== key.filePath);
            return duplicates.length > 0;
        } catch {
            return false;
        }
    }

    /**
     * Check value consistency across references
     */
    private async checkValueConsistency(key: TestingKey, workspacePath: string): Promise<boolean> {
        try {
            const allKeys = await this.keyScanner.scanAllKeys();
            const sameNameKeys = allKeys.filter(k => k.name === key.name);
            
            if (sameNameKeys.length <= 1) return false;
            
            const values = new Set(sameNameKeys.map(k => k.value));
            return values.size > 1;
        } catch {
            return false;
        }
    }

    /**
     * Detect wrong category classification
     */
    private detectWrongCategory(key: TestingKey): boolean {
        const name = key.name.toLowerCase();
        const category = key.category.toString().toLowerCase();

        // Heuristics for category detection
        if (name.includes('button') && !category.includes('button')) return true;
        if (name.includes('field') && !category.includes('field')) return true;
        if (name.includes('text') && !category.includes('text')) return true;
        if (name.includes('icon') && !category.includes('icon')) return true;

        return false;
    }

    /**
     * Check for accessibility issues
     */
    private checkAccessibilityIssues(key: TestingKey): boolean {
        const name = key.name.toLowerCase();
        
        // Keys that should have semantic labels
        const semanticRequiredPatterns = ['button', 'link', 'input', 'field'];
        const hasSemanticPattern = semanticRequiredPatterns.some(pattern => name.includes(pattern));
        
        if (hasSemanticPattern) {
            // Check if semantic information is present
            return !name.includes('label') && !name.includes('hint') && !name.includes('semantic');
        }

        return false;
    }

    /**
     * Detect performance issues
     */
    private detectPerformanceIssues(key: TestingKey): boolean {
        // Keys that might cause performance issues
        const name = key.name.toLowerCase();
        
        // Very long key names can impact performance
        if (key.name.length > 50) return true;
        
        // Keys with complex values
        if (key.value && key.value.length > 100) return true;
        
        // Keys that suggest expensive operations
        const expensivePatterns = ['animation', 'complex', 'heavy', 'large'];
        return expensivePatterns.some(pattern => name.includes(pattern));
    }

    /**
     * Check for security vulnerabilities
     */
    private checkSecurityVulnerabilities(key: TestingKey): boolean {
        const name = key.name.toLowerCase();
        const value = key.value?.toLowerCase() || '';
        
        // Potential security-sensitive patterns
        const securityPatterns = [
            'password', 'token', 'secret', 'api', 'auth', 'credential',
            'private', 'secure', 'admin', 'root'
        ];
        
        return securityPatterns.some(pattern => 
            name.includes(pattern) || value.includes(pattern)
        );
    }

    /**
     * Find files affected by broken keys
     */
    private async findAffectedFiles(key: TestingKey, workspacePath: string): Promise<string[]> {
        const affectedFiles: string[] = [];
        
        try {
            // Search for key usage in Dart files
            const dartFiles = await vscode.workspace.findFiles('**/*.dart');
            
            for (const file of dartFiles) {
                const content = fs.readFileSync(file.fsPath, 'utf8');
                if (content.includes(key.name) || content.includes(key.value || '')) {
                    affectedFiles.push(path.relative(workspacePath, file.fsPath));
                }
            }
        } catch (error) {
            console.warn('Could not search for affected files:', error);
        }
        
        return affectedFiles;
    }

    /**
     * Calculate severity based on issues
     */
    private calculateSeverity(issues: KeyIssue[]): 'low' | 'medium' | 'high' | 'critical' {
        const criticalIssues = ['missing-source-file', 'security-vulnerability', 'undefined-key'];
        const highIssues = ['duplicate-key', 'inconsistent-values', 'accessibility-issue'];
        const mediumIssues = ['unused-key', 'wrong-category', 'performance-issue'];
        
        if (issues.some(issue => criticalIssues.includes(issue))) return 'critical';
        if (issues.some(issue => highIssues.includes(issue))) return 'high';
        if (issues.some(issue => mediumIssues.includes(issue))) return 'medium';
        
        return 'low';
    }

    /**
     * Generate fix suggestions
     */
    private generateFixSuggestions(key: TestingKey, issues: KeyIssue[]): string[] {
        const suggestions: string[] = [];
        
        for (const issue of issues) {
            switch (issue) {
                case 'undefined-key':
                    suggestions.push(`Define key '${key.name}' in key constants file`);
                    break;
                case 'unused-key':
                    suggestions.push(`Remove unused key '${key.name}' or add test references`);
                    break;
                case 'missing-source-file':
                    suggestions.push(`Restore missing file: ${key.filePath}`);
                    break;
                case 'invalid-naming':
                    suggestions.push(`Rename '${key.name}' to follow naming conventions (snake_case/camelCase)`);
                    break;
                case 'duplicate-key':
                    suggestions.push(`Resolve duplicate key '${key.name}' by using unique names or prefixes`);
                    break;
                case 'inconsistent-values':
                    suggestions.push(`Standardize values for key '${key.name}' across all references`);
                    break;
                case 'wrong-category':
                    suggestions.push(`Update category for key '${key.name}' to match its purpose`);
                    break;
                case 'accessibility-issue':
                    suggestions.push(`Add semantic labels for accessibility-critical key '${key.name}'`);
                    break;
                case 'performance-issue':
                    suggestions.push(`Optimize key '${key.name}' to reduce performance impact`);
                    break;
                case 'security-vulnerability':
                    suggestions.push(`Review security implications of key '${key.name}' and sanitize if needed`);
                    break;
            }
        }
        
        return suggestions;
    }

    /**
     * Estimate fix time in minutes
     */
    private estimateFixTime(issues: KeyIssue[]): number {
        const timeMap: Record<KeyIssue, number> = {
            'undefined-key': 10,
            'unused-key': 5,
            'missing-source-file': 30,
            'invalid-naming': 15,
            'duplicate-key': 20,
            'inconsistent-values': 25,
            'wrong-category': 10,
            'accessibility-issue': 45,
            'performance-issue': 60,
            'security-vulnerability': 120
        };
        
        return issues.reduce((total, issue) => total + (timeMap[issue] || 10), 0);
    }

    /**
     * Calculate project health score (0-100)
     */
    private calculateHealthScore(totalKeys: number, brokenKeys: BrokenKeyReport[]): number {
        if (totalKeys === 0) return 100;
        
        const brokenCount = brokenKeys.length;
        const criticalCount = brokenKeys.filter(k => k.severity === 'critical').length;
        const highCount = brokenKeys.filter(k => k.severity === 'high').length;
        
        // Weighted scoring
        const criticalPenalty = criticalCount * 20;
        const highPenalty = highCount * 10;
        const generalPenalty = (brokenCount - criticalCount - highCount) * 5;
        
        const totalPenalty = criticalPenalty + highPenalty + generalPenalty;
        const maxPossiblePenalty = totalKeys * 20; // Worst case scenario
        
        const score = Math.max(0, 100 - (totalPenalty * 100) / maxPossiblePenalty);
        return Math.round(score);
    }

    /**
     * Generate project-level improvement suggestions
     */
    private generateProjectSuggestions(brokenKeys: BrokenKeyReport[], allKeys: TestingKey[]): string[] {
        const suggestions: string[] = [];
        
        const criticalCount = brokenKeys.filter(k => k.severity === 'critical').length;
        const unusedCount = brokenKeys.filter(k => k.issues.includes('unused-key')).length;
        const duplicateCount = brokenKeys.filter(k => k.issues.includes('duplicate-key')).length;
        const namingIssues = brokenKeys.filter(k => k.issues.includes('invalid-naming')).length;
        
        if (criticalCount > 0) {
            suggestions.push(`🚨 ${criticalCount} critical issues require immediate attention`);
        }
        
        if (unusedCount > allKeys.length * 0.2) {
            suggestions.push(`🧹 Consider cleanup: ${unusedCount} unused keys (${Math.round(unusedCount/allKeys.length*100)}% of total)`);
        }
        
        if (duplicateCount > 0) {
            suggestions.push(`🔄 ${duplicateCount} duplicate keys found - implement key naming strategy`);
        }
        
        if (namingIssues > allKeys.length * 0.1) {
            suggestions.push(`📝 ${namingIssues} keys have naming issues - establish naming conventions`);
        }
        
        if (brokenKeys.length === 0) {
            suggestions.push(`✅ All keys are healthy! Consider automated validation in CI/CD`);
        }
        
        return suggestions;
    }

    /**
     * Clear detection cache
     */
    clearCache(): void {
        this.brokenKeyCache.clear();
        console.log('🧹 Broken key detection cache cleared');
    }
}

// Type definitions
export type KeyIssue = 
    | 'undefined-key'
    | 'unused-key' 
    | 'missing-source-file'
    | 'invalid-naming'
    | 'duplicate-key'
    | 'inconsistent-values'
    | 'wrong-category'
    | 'accessibility-issue'
    | 'performance-issue'
    | 'security-vulnerability';

export interface BrokenKeyReport {
    key: TestingKey;
    issues: KeyIssue[];
    severity: 'low' | 'medium' | 'high' | 'critical';
    fixSuggestions: string[];
    affectedFiles: string[];
    estimatedFixTime: number; // in minutes
}

export interface CriticalIssue {
    keyName: string;
    issueType: string;
    impact: string;
    urgency: 'low' | 'medium' | 'high' | 'immediate';
}

export interface BrokenKeyAnalysisReport {
    totalKeys: number;
    brokenKeys: BrokenKeyReport[];
    criticalIssues: CriticalIssue[];
    suggestions: string[];
    healthScore: number; // 0-100
}