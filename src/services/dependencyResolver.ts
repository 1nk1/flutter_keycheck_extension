import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
// Removed js-yaml import - will use simple string parsing instead

/**
 * Dependency Resolver for External Package Analysis
 * Analyzes pubspec.yaml dependencies and resolves testing keys from external packages
 */
export class DependencyResolver {
    private dependencyCache: Map<string, DependencyAnalysisResult> = new Map();
    private readonly PUB_DEV_API = 'https://pub.dev/api';

    /**
     * Analyze all dependencies in project
     */
    async analyzeDependencies(projectPath: string): Promise<DependencyAnalysisReport> {
        console.log('🔍 DependencyResolver: Analyzing dependencies...');
        
        const pubspecPath = path.join(projectPath, 'pubspec.yaml');
        if (!fs.existsSync(pubspecPath)) {
            return {
                totalDependencies: 0,
                externalPackages: [],
                testingKeyConflicts: [],
                securityIssues: [],
                recommendations: ['No pubspec.yaml found in project']
            };
        }

        try {
            const pubspecContent = fs.readFileSync(pubspecPath, 'utf8');
            const pubspec = this.parsePubspecYaml(pubspecContent);
            
            const dependencies = this.extractDependencies(pubspec);
            console.log(`📦 Found ${dependencies.length} dependencies to analyze`);
            
            const analysisResults: DependencyAnalysisResult[] = [];
            
            // Analyze each dependency
            for (const dep of dependencies) {
                console.log(`🔍 Analyzing dependency: ${dep.name}@${dep.version}`);
                const result = await this.analyzeDependency(dep);
                analysisResults.push(result);
            }

            // Detect conflicts and issues
            const conflicts = this.detectTestingKeyConflicts(analysisResults);
            const securityIssues = this.detectSecurityIssues(analysisResults);
            const recommendations = this.generateRecommendations(analysisResults, conflicts, securityIssues);

            return {
                totalDependencies: dependencies.length,
                externalPackages: analysisResults,
                testingKeyConflicts: conflicts,
                securityIssues,
                recommendations
            };
        } catch (error) {
            console.error('❌ Error analyzing dependencies:', error);
            return {
                totalDependencies: 0,
                externalPackages: [],
                testingKeyConflicts: [],
                securityIssues: [],
                recommendations: [`Failed to analyze dependencies: ${error}`]
            };
        }
    }

    /**
     * Simple YAML parser for pubspec.yaml - avoids external dependencies
     */
    private parsePubspecYaml(content: string): PubspecYaml {
        const result: PubspecYaml = {};
        const lines = content.split('\n');
        
        let currentSection = '';
        let currentDepSection = '';
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            if (trimmed.startsWith('name:')) {
                result.name = trimmed.split(':')[1].trim().replace(/['"]/g, '');
            } else if (trimmed === 'dependencies:') {
                currentSection = 'dependencies';
                currentDepSection = 'dependencies';
                result.dependencies = {};
            } else if (trimmed === 'dev_dependencies:') {
                currentSection = 'dev_dependencies';
                currentDepSection = 'dev_dependencies';
                result.dev_dependencies = {};
            } else if (trimmed === 'environment:') {
                currentSection = 'environment';
                result.environment = {};
            } else if (currentSection && line.startsWith('  ') && !line.startsWith('    ')) {
                // Parse dependency
                if (currentDepSection && trimmed.includes(':')) {
                    const parts = trimmed.split(':');
                    const depName = parts[0].trim();
                    let depVersion = parts[1] ? parts[1].trim() : 'any';
                    
                    // Clean up version string
                    depVersion = depVersion.replace(/['"]/g, '');
                    if (depVersion.startsWith('^') || depVersion.startsWith('>=')) {
                        // Keep version as is
                    } else if (depVersion === '') {
                        depVersion = 'any';
                    }
                    
                    if (currentDepSection === 'dependencies') {
                        result.dependencies![depName] = depVersion;
                    } else if (currentDepSection === 'dev_dependencies') {
                        result.dev_dependencies![depName] = depVersion;
                    }
                } else if (currentSection === 'environment' && trimmed.includes(':')) {
                    const parts = trimmed.split(':');
                    const envKey = parts[0].trim();
                    const envValue = parts[1] ? parts[1].trim().replace(/['"]/g, '') : '';
                    if (envKey === 'sdk' || envKey === 'flutter') {
                        result.environment![envKey] = envValue;
                    }
                }
            } else if (!line.startsWith('  ')) {
                // Reset section if we encounter a non-indented line
                if (trimmed && !trimmed.startsWith('#')) {
                    currentSection = '';
                    currentDepSection = '';
                }
            }
        }
        
        return result;
    }

    /**
     * Extract dependencies from pubspec.yaml
     */
    private extractDependencies(pubspec: PubspecYaml): DependencyReference[] {
        const dependencies: DependencyReference[] = [];
        
        // Regular dependencies
        if (pubspec.dependencies) {
            for (const [name, versionSpec] of Object.entries(pubspec.dependencies)) {
                if (name !== 'flutter' && typeof versionSpec === 'string') {
                    dependencies.push({
                        name,
                        version: versionSpec,
                        type: 'runtime',
                        source: 'pub.dev'
                    });
                }
            }
        }
        
        // Dev dependencies
        if (pubspec.dev_dependencies) {
            for (const [name, versionSpec] of Object.entries(pubspec.dev_dependencies)) {
                if (name !== 'flutter_test' && typeof versionSpec === 'string') {
                    dependencies.push({
                        name,
                        version: versionSpec,
                        type: 'development',
                        source: 'pub.dev'
                    });
                }
            }
        }
        
        return dependencies;
    }

    /**
     * Analyze individual dependency
     */
    private async analyzeDependency(dependency: DependencyReference): Promise<DependencyAnalysisResult> {
        const cacheKey = `${dependency.name}@${dependency.version}`;
        
        // Check cache first
        if (this.dependencyCache.has(cacheKey)) {
            console.log(`📋 Using cached analysis for ${dependency.name}`);
            return this.dependencyCache.get(cacheKey)!;
        }

        try {
            // Fetch package info from pub.dev
            const packageInfo = await this.fetchPackageInfo(dependency.name);
            
            // Analyze testing keys (if package source is available)
            const testingKeys = await this.analyzePackageTestingKeys(dependency, packageInfo);
            
            // Check for known issues
            const knownIssues = await this.checkKnownIssues(dependency, packageInfo);
            
            const result: DependencyAnalysisResult = {
                ...dependency,
                packageInfo,
                testingKeys,
                hasTestingKeys: testingKeys.length > 0,
                securityScore: this.calculateSecurityScore(packageInfo, knownIssues),
                lastUpdated: packageInfo?.latest?.published ? new Date(packageInfo.latest.published) : new Date(),
                knownIssues,
                recommendations: this.generatePackageRecommendations(dependency, packageInfo, testingKeys, knownIssues)
            };
            
            // Cache result
            this.dependencyCache.set(cacheKey, result);
            return result;
            
        } catch (error) {
            console.warn(`⚠️ Could not analyze dependency ${dependency.name}:`, error);
            return {
                ...dependency,
                packageInfo: null,
                testingKeys: [],
                hasTestingKeys: false,
                securityScore: 0,
                lastUpdated: new Date(),
                knownIssues: [`Analysis failed: ${error}`],
                recommendations: [`Could not analyze package ${dependency.name}`]
            };
        }
    }

    /**
     * Fetch package information from pub.dev
     */
    private async fetchPackageInfo(packageName: string): Promise<PubPackageInfo | null> {
        return new Promise((resolve, reject) => {
            const url = `${this.PUB_DEV_API}/packages/${packageName}`;
            
            https.get(url, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        if (res.statusCode === 200) {
                            const packageInfo = JSON.parse(data) as PubPackageInfo;
                            resolve(packageInfo);
                        } else {
                            resolve(null);
                        }
                    } catch (error) {
                        reject(error);
                    }
                });
            }).on('error', (error) => {
                reject(error);
            });
        });
    }

    /**
     * Analyze testing keys in external package
     */
    private async analyzePackageTestingKeys(
        dependency: DependencyReference, 
        packageInfo: PubPackageInfo | null
    ): Promise<ExternalTestingKey[]> {
        const testingKeys: ExternalTestingKey[] = [];
        
        // For now, we'll use heuristics based on package name and description
        // In a full implementation, this would download and analyze the package source
        
        if (packageInfo) {
            const pubspec = packageInfo.latest?.pubspec;
            const description = (pubspec as any)?.description || '';
            const name = dependency.name.toLowerCase();
            
            // Heuristic detection of packages likely to have testing keys
            if (name.includes('test') || name.includes('integration') || name.includes('ui') || 
                description.toLowerCase().includes('test') || description.toLowerCase().includes('widget')) {
                
                // Generate likely testing key patterns
                const keyPatterns = this.generateLikelyTestingKeys(dependency.name, packageInfo);
                testingKeys.push(...keyPatterns);
            }
        }
        
        return testingKeys;
    }

    /**
     * Generate likely testing key patterns based on package analysis
     */
    private generateLikelyTestingKeys(packageName: string, packageInfo: PubPackageInfo): ExternalTestingKey[] {
        const keys: ExternalTestingKey[] = [];
        const cleanName = packageName.replace(/[^a-zA-Z0-9]/g, '_');
        
        // Common testing key patterns
        const patterns = [
            `${cleanName}_widget`,
            `${cleanName}_button`,
            `${cleanName}_field`,
            `test_${cleanName}`,
            `${cleanName}_test_key`
        ];
        
        for (const pattern of patterns) {
            keys.push({
                keyName: pattern,
                packageName,
                packageVersion: packageInfo.latest?.version || 'unknown',
                keyType: 'widget',
                confidence: 0.6, // Heuristic confidence
                source: 'pattern-analysis',
                potentialConflicts: []
            });
        }
        
        return keys;
    }

    /**
     * Check for known security/compatibility issues
     */
    private async checkKnownIssues(
        dependency: DependencyReference, 
        packageInfo: PubPackageInfo | null
    ): Promise<string[]> {
        const issues: string[] = [];
        
        if (!packageInfo) {
            issues.push('Package not found on pub.dev');
            return issues;
        }
        
        // Check package age
        const publishedDate = new Date(packageInfo.latest?.published || 0);
        const monthsOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        
        if (monthsOld > 12) {
            issues.push(`Package is ${Math.round(monthsOld)} months old - may be outdated`);
        }
        
        // Check popularity score
        if (packageInfo.metrics && packageInfo.metrics.score < 50) {
            issues.push(`Low pub.dev score: ${packageInfo.metrics.score}/100`);
        }
        
        // Check for null safety
        const pubspec = packageInfo.latest?.pubspec;
        if (pubspec && pubspec.environment && pubspec.environment.sdk) {
            const sdkConstraint = pubspec.environment.sdk;
            if (!sdkConstraint.includes('>=2.12.0') && !sdkConstraint.includes('>=3.0.0')) {
                issues.push('Package may not support null safety');
            }
        }
        
        return issues;
    }

    /**
     * Calculate security score for package
     */
    private calculateSecurityScore(packageInfo: PubPackageInfo | null, knownIssues: string[]): number {
        if (!packageInfo) return 0;
        
        let score = 100;
        
        // Deduct for each known issue
        score -= knownIssues.length * 15;
        
        // Factor in pub.dev metrics
        if (packageInfo.metrics) {
            const pubScore = packageInfo.metrics.score || 0;
            score = Math.min(score, pubScore);
        }
        
        // Factor in maintenance
        const publishedDate = new Date(packageInfo.latest?.published || 0);
        const monthsOld = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsOld > 6) {
            score -= Math.min(30, monthsOld * 2);
        }
        
        return Math.max(0, Math.round(score));
    }

    /**
     * Generate package-specific recommendations
     */
    private generatePackageRecommendations(
        dependency: DependencyReference,
        packageInfo: PubPackageInfo | null,
        testingKeys: ExternalTestingKey[],
        knownIssues: string[]
    ): string[] {
        const recommendations: string[] = [];
        
        if (!packageInfo) {
            recommendations.push(`Verify package name: ${dependency.name}`);
            return recommendations;
        }
        
        // Version recommendations
        const currentVersion = packageInfo.latest?.version;
        if (currentVersion && dependency.version !== currentVersion) {
            recommendations.push(`Consider updating to latest version: ${currentVersion}`);
        }
        
        // Testing key recommendations
        if (testingKeys.length > 0) {
            recommendations.push(`Package may contain ${testingKeys.length} testing keys - review for conflicts`);
        }
        
        // Security recommendations
        if (knownIssues.length > 2) {
            recommendations.push(`Consider finding alternative package - ${knownIssues.length} issues detected`);
        }
        
        return recommendations;
    }

    /**
     * Detect testing key conflicts between dependencies
     */
    private detectTestingKeyConflicts(analysisResults: DependencyAnalysisResult[]): TestingKeyConflict[] {
        const conflicts: TestingKeyConflict[] = [];
        const keysByName: Map<string, ExternalTestingKey[]> = new Map();
        
        // Group keys by name
        for (const result of analysisResults) {
            for (const key of result.testingKeys) {
                if (!keysByName.has(key.keyName)) {
                    keysByName.set(key.keyName, []);
                }
                keysByName.get(key.keyName)!.push(key);
            }
        }
        
        // Find conflicts
        for (const [keyName, keys] of keysByName.entries()) {
            if (keys.length > 1) {
                const packages = keys.map(k => k.packageName);
                const uniquePackages = [...new Set(packages)];
                
                if (uniquePackages.length > 1) {
                    conflicts.push({
                        keyName,
                        conflictingPackages: uniquePackages,
                        affectedKeys: keys,
                        severity: keys.length > 2 ? 'high' : 'medium',
                        resolution: `Consider renaming or prefixing keys to avoid conflicts`
                    });
                }
            }
        }
        
        return conflicts;
    }

    /**
     * Detect security issues across dependencies
     */
    private detectSecurityIssues(analysisResults: DependencyAnalysisResult[]): SecurityIssue[] {
        const issues: SecurityIssue[] = [];
        
        for (const result of analysisResults) {
            if (result.securityScore < 50) {
                issues.push({
                    packageName: result.name,
                    issueType: 'low-security-score',
                    severity: result.securityScore < 25 ? 'critical' : 'medium',
                    description: `Package ${result.name} has low security score: ${result.securityScore}/100`,
                    recommendation: result.securityScore < 25 ? 
                        'Consider removing this package or finding an alternative' :
                        'Monitor package updates and security advisories'
                });
            }
            
            // Check for other security patterns
            if (result.knownIssues.some(issue => issue.toLowerCase().includes('security'))) {
                issues.push({
                    packageName: result.name,
                    issueType: 'known-security-issue',
                    severity: 'high',
                    description: `Package ${result.name} has known security issues`,
                    recommendation: 'Review security advisories and consider alternatives'
                });
            }
        }
        
        return issues;
    }

    /**
     * Generate comprehensive recommendations
     */
    private generateRecommendations(
        analysisResults: DependencyAnalysisResult[],
        conflicts: TestingKeyConflict[],
        securityIssues: SecurityIssue[]
    ): string[] {
        const recommendations: string[] = [];
        
        // Overall statistics
        const totalPackages = analysisResults.length;
        const packagesWithKeys = analysisResults.filter(r => r.hasTestingKeys).length;
        const lowSecurityPackages = analysisResults.filter(r => r.securityScore < 60).length;
        
        if (packagesWithKeys > 0) {
            recommendations.push(`📋 ${packagesWithKeys}/${totalPackages} packages may contain testing keys`);
        }
        
        if (conflicts.length > 0) {
            recommendations.push(`⚠️ Found ${conflicts.length} potential testing key conflicts`);
        }
        
        if (securityIssues.length > 0) {
            recommendations.push(`🔒 ${securityIssues.length} security issues detected across dependencies`);
        }
        
        if (lowSecurityPackages > totalPackages * 0.3) {
            recommendations.push(`🚨 ${lowSecurityPackages}/${totalPackages} packages have concerning security scores`);
        }
        
        // Specific recommendations
        if (conflicts.length > 0) {
            recommendations.push('Consider using package prefixes for testing keys');
        }
        
        if (securityIssues.filter(i => i.severity === 'critical').length > 0) {
            recommendations.push('Immediately review critical security issues');
        }
        
        return recommendations;
    }

    /**
     * Clear dependency cache
     */
    clearCache(): void {
        this.dependencyCache.clear();
        console.log('🧹 Dependency cache cleared');
    }

    /**
     * Get cached analysis results
     */
    getCachedResults(): Array<{key: string, result: DependencyAnalysisResult}> {
        return Array.from(this.dependencyCache.entries()).map(([key, result]) => ({
            key,
            result
        }));
    }
}

// Type definitions
interface PubspecYaml {
    name?: string;
    dependencies?: Record<string, any>;
    dev_dependencies?: Record<string, any>;
    environment?: {
        sdk?: string;
        flutter?: string;
    };
}

interface PubPackageInfo {
    name: string;
    latest: {
        version: string;
        published: string;
        pubspec: PubspecYaml;
    };
    metrics?: {
        score: number;
        popularity: number;
        health: number;
        maintenance: number;
    };
}

export interface DependencyReference {
    name: string;
    version: string;
    type: 'runtime' | 'development';
    source: 'pub.dev' | 'git' | 'local';
}

export interface DependencyAnalysisResult extends DependencyReference {
    packageInfo: PubPackageInfo | null;
    testingKeys: ExternalTestingKey[];
    hasTestingKeys: boolean;
    securityScore: number;
    lastUpdated: Date;
    knownIssues: string[];
    recommendations: string[];
}

export interface ExternalTestingKey {
    keyName: string;
    packageName: string;
    packageVersion: string;
    keyType: 'widget' | 'button' | 'field' | 'other';
    confidence: number; // 0-1 confidence score
    source: 'source-analysis' | 'pattern-analysis' | 'documentation';
    potentialConflicts: string[];
}

export interface DependencyAnalysisReport {
    totalDependencies: number;
    externalPackages: DependencyAnalysisResult[];
    testingKeyConflicts: TestingKeyConflict[];
    securityIssues: SecurityIssue[];
    recommendations: string[];
}

export interface TestingKeyConflict {
    keyName: string;
    conflictingPackages: string[];
    affectedKeys: ExternalTestingKey[];
    severity: 'low' | 'medium' | 'high';
    resolution: string;
}

export interface SecurityIssue {
    packageName: string;
    issueType: 'low-security-score' | 'known-security-issue' | 'outdated-package';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
}