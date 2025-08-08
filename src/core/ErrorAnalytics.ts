import * as vscode from 'vscode';
import { ErrorHandler, ErrorInfo, ErrorLevel, ErrorCategory } from './ErrorHandler';

/**
 * Error pattern detection
 */
export interface ErrorPattern {
    /** Pattern identifier */
    id: string;
    /** Pattern name */
    name: string;
    /** Pattern description */
    description: string;
    /** Error category this pattern applies to */
    category: ErrorCategory;
    /** Minimum occurrences to trigger pattern */
    threshold: number;
    /** Time window for pattern detection (in milliseconds) */
    timeWindow: number;
    /** Severity of this pattern */
    severity: ErrorLevel;
    /** Suggested actions */
    suggestedActions: string[];
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    /** Average response time for operations */
    avgResponseTime: number;
    /** Number of operations per minute */
    operationsPerMinute: number;
    /** Memory usage (in MB) */
    memoryUsage: number;
    /** Error rate (percentage) */
    errorRate: number;
    /** System health score (0-100) */
    healthScore: number;
}

/**
 * Trend analysis data
 */
export interface TrendData {
    /** Time period label */
    period: string;
    /** Error count for this period */
    errorCount: number;
    /** Most common error category */
    topCategory: ErrorCategory;
    /** Health score for this period */
    healthScore: number;
}

/**
 * Error analytics report
 */
export interface AnalyticsReport {
    /** Report generation timestamp */
    timestamp: Date;
    /** Report period (in hours) */
    periodHours: number;
    /** Total errors in period */
    totalErrors: number;
    /** Error breakdown by category */
    categoryBreakdown: Map<ErrorCategory, number>;
    /** Error breakdown by level */
    levelBreakdown: Map<ErrorLevel, number>;
    /** Detected patterns */
    patterns: ErrorPattern[];
    /** Performance metrics */
    performance: PerformanceMetrics;
    /** Trend data */
    trends: TrendData[];
    /** Recommendations */
    recommendations: string[];
}

/**
 * Error analytics and monitoring system
 */
export class ErrorAnalytics {
    private static instance: ErrorAnalytics;
    private errorHandler: ErrorHandler;
    private performanceData: Array<{ timestamp: Date; operation: string; duration: number; success: boolean }> = [];
    private patterns: ErrorPattern[] = [];
    private lastAnalysisTime = new Date();
    private readonly MAX_PERFORMANCE_DATA = 1000;

    private constructor() {
        this.errorHandler = ErrorHandler.getInstance();
        this.initializePatterns();
        this.startPerformanceMonitoring();
        this.startPeriodicAnalysis();
    }

    /**
     * Get singleton instance
     */
    static getInstance(): ErrorAnalytics {
        if (!ErrorAnalytics.instance) {
            ErrorAnalytics.instance = new ErrorAnalytics();
        }
        return ErrorAnalytics.instance;
    }

    /**
     * Initialize common error patterns
     */
    private initializePatterns(): void {
        this.patterns = [
            {
                id: 'frequent_file_errors',
                name: 'Frequent File Access Errors',
                description: 'Multiple file system errors in short time period',
                category: ErrorCategory.FILE_SYSTEM,
                threshold: 5,
                timeWindow: 300000, // 5 minutes
                severity: ErrorLevel.WARNING,
                suggestedActions: [
                    'Check file permissions',
                    'Verify disk space',
                    'Restart VS Code',
                    'Check antivirus settings'
                ]
            },
            {
                id: 'parsing_errors_spike',
                name: 'Parsing Errors Spike',
                description: 'Sudden increase in Dart parsing errors',
                category: ErrorCategory.PARSING,
                threshold: 10,
                timeWindow: 600000, // 10 minutes
                severity: ErrorLevel.WARNING,
                suggestedActions: [
                    'Check recent file changes',
                    'Validate Dart syntax',
                    'Update Dart SDK',
                    'Clear cache and refresh'
                ]
            },
            {
                id: 'command_failures',
                name: 'Command Execution Failures',
                description: 'Multiple command execution failures',
                category: ErrorCategory.COMMAND,
                threshold: 3,
                timeWindow: 180000, // 3 minutes
                severity: ErrorLevel.ERROR,
                suggestedActions: [
                    'Restart extension',
                    'Check Flutter project structure',
                    'Verify dependencies',
                    'Report to extension developers'
                ]
            },
            {
                id: 'initialization_problems',
                name: 'Initialization Problems',
                description: 'Repeated initialization failures',
                category: ErrorCategory.INITIALIZATION,
                threshold: 2,
                timeWindow: 120000, // 2 minutes
                severity: ErrorLevel.CRITICAL,
                suggestedActions: [
                    'Restart VS Code',
                    'Check extension installation',
                    'Verify Flutter project setup',
                    'Check system requirements'
                ]
            },
            {
                id: 'network_issues',
                name: 'Network Connectivity Issues',
                description: 'Network operation failures',
                category: ErrorCategory.NETWORK,
                threshold: 3,
                timeWindow: 300000, // 5 minutes
                severity: ErrorLevel.WARNING,
                suggestedActions: [
                    'Check internet connection',
                    'Verify proxy settings',
                    'Try offline mode',
                    'Check firewall settings'
                ]
            }
        ];
    }

    /**
     * Record performance data
     */
    recordPerformance(operation: string, duration: number, success: boolean): void {
        this.performanceData.push({
            timestamp: new Date(),
            operation,
            duration,
            success
        });

        // Maintain size limit
        if (this.performanceData.length > this.MAX_PERFORMANCE_DATA) {
            this.performanceData = this.performanceData.slice(-this.MAX_PERFORMANCE_DATA);
        }
    }

    /**
     * Analyze errors and detect patterns
     */
    async analyzeErrors(periodHours: number = 24): Promise<AnalyticsReport> {
        const analytics = this.errorHandler.getAnalytics();
        const cutoffTime = new Date(Date.now() - periodHours * 60 * 60 * 1000);
        
        // Filter recent errors
        const recentErrors = analytics.recentErrors.filter(
            error => error.timestamp >= cutoffTime
        );

        // Detect patterns
        const detectedPatterns = this.detectPatterns(recentErrors);

        // Calculate performance metrics
        const performance = this.calculatePerformanceMetrics(cutoffTime);

        // Generate trends
        const trends = this.generateTrends(recentErrors, periodHours);

        // Generate recommendations
        const recommendations = this.generateRecommendations(
            recentErrors,
            detectedPatterns,
            performance
        );

        return {
            timestamp: new Date(),
            periodHours,
            totalErrors: recentErrors.length,
            categoryBreakdown: this.getCategoryBreakdown(recentErrors),
            levelBreakdown: this.getLevelBreakdown(recentErrors),
            patterns: detectedPatterns,
            performance,
            trends,
            recommendations
        };
    }

    /**
     * Detect error patterns in recent errors
     */
    private detectPatterns(errors: ErrorInfo[]): ErrorPattern[] {
        const detectedPatterns: ErrorPattern[] = [];

        for (const pattern of this.patterns) {
            const relevantErrors = errors.filter(
                error => error.category === pattern.category &&
                error.timestamp >= new Date(Date.now() - pattern.timeWindow)
            );

            if (relevantErrors.length >= pattern.threshold) {
                detectedPatterns.push(pattern);
            }
        }

        return detectedPatterns;
    }

    /**
     * Calculate performance metrics
     */
    private calculatePerformanceMetrics(cutoffTime: Date): PerformanceMetrics {
        const recentData = this.performanceData.filter(
            data => data.timestamp >= cutoffTime
        );

        if (recentData.length === 0) {
            return {
                avgResponseTime: 0,
                operationsPerMinute: 0,
                memoryUsage: 0,
                errorRate: 0,
                healthScore: 100
            };
        }

        const avgResponseTime = recentData.reduce((sum, data) => sum + data.duration, 0) / recentData.length;
        const timeSpanMinutes = (Date.now() - cutoffTime.getTime()) / 60000;
        const operationsPerMinute = recentData.length / timeSpanMinutes;
        const errorRate = (recentData.filter(data => !data.success).length / recentData.length) * 100;
        
        // Memory usage - simplified calculation
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
        
        // Health score based on error rate and response time
        const healthScore = Math.max(0, 100 - (errorRate * 2) - Math.min(avgResponseTime / 100, 20));

        return {
            avgResponseTime: Math.round(avgResponseTime),
            operationsPerMinute: Math.round(operationsPerMinute * 10) / 10,
            memoryUsage: Math.round(memoryUsage * 10) / 10,
            errorRate: Math.round(errorRate * 10) / 10,
            healthScore: Math.round(healthScore)
        };
    }

    /**
     * Generate trend data
     */
    private generateTrends(errors: ErrorInfo[], periodHours: number): TrendData[] {
        const trends: TrendData[] = [];
        const hoursPerPeriod = Math.max(1, Math.floor(periodHours / 12)); // Up to 12 data points
        
        for (let i = 0; i < periodHours; i += hoursPerPeriod) {
            const periodStart = new Date(Date.now() - (periodHours - i) * 60 * 60 * 1000);
            const periodEnd = new Date(Date.now() - (periodHours - i - hoursPerPeriod) * 60 * 60 * 1000);
            
            const periodErrors = errors.filter(
                error => error.timestamp >= periodStart && error.timestamp < periodEnd
            );
            
            const topCategory = this.getTopCategory(periodErrors);
            const healthScore = this.calculatePeriodHealthScore(periodErrors);
            
            trends.push({
                period: `${hoursPerPeriod}h ago`,
                errorCount: periodErrors.length,
                topCategory,
                healthScore
            });
        }

        return trends.reverse(); // Show oldest to newest
    }

    /**
     * Get category breakdown
     */
    private getCategoryBreakdown(errors: ErrorInfo[]): Map<ErrorCategory, number> {
        const breakdown = new Map<ErrorCategory, number>();
        
        for (const error of errors) {
            const count = breakdown.get(error.category) || 0;
            breakdown.set(error.category, count + 1);
        }
        
        return breakdown;
    }

    /**
     * Get level breakdown
     */
    private getLevelBreakdown(errors: ErrorInfo[]): Map<ErrorLevel, number> {
        const breakdown = new Map<ErrorLevel, number>();
        
        for (const error of errors) {
            const count = breakdown.get(error.level) || 0;
            breakdown.set(error.level, count + 1);
        }
        
        return breakdown;
    }

    /**
     * Get most common error category in a list
     */
    private getTopCategory(errors: ErrorInfo[]): ErrorCategory {
        const counts = this.getCategoryBreakdown(errors);
        let topCategory = ErrorCategory.UNKNOWN;
        let maxCount = 0;
        
        for (const [category, count] of counts) {
            if (count > maxCount) {
                maxCount = count;
                topCategory = category;
            }
        }
        
        return topCategory;
    }

    /**
     * Calculate health score for a specific period
     */
    private calculatePeriodHealthScore(errors: ErrorInfo[]): number {
        if (errors.length === 0) return 100;
        
        const criticalErrors = errors.filter(e => e.level === ErrorLevel.CRITICAL).length;
        const regularErrors = errors.filter(e => e.level === ErrorLevel.ERROR).length;
        const warnings = errors.filter(e => e.level === ErrorLevel.WARNING).length;
        
        const score = 100 - (criticalErrors * 20) - (regularErrors * 5) - (warnings * 1);
        return Math.max(0, Math.round(score));
    }

    /**
     * Generate recommendations based on analysis
     */
    private generateRecommendations(
        errors: ErrorInfo[],
        patterns: ErrorPattern[],
        performance: PerformanceMetrics
    ): string[] {
        const recommendations: string[] = [];

        // Pattern-based recommendations
        for (const pattern of patterns) {
            recommendations.push(`Pattern detected: ${pattern.name} - ${pattern.suggestedActions[0]}`);
        }

        // Performance-based recommendations
        if (performance.errorRate > 10) {
            recommendations.push('High error rate detected - consider stability improvements');
        }
        
        if (performance.avgResponseTime > 1000) {
            recommendations.push('Slow response times - consider performance optimization');
        }
        
        if (performance.memoryUsage > 100) {
            recommendations.push('High memory usage - consider memory optimization');
        }

        // Error level recommendations
        const criticalErrors = errors.filter(e => e.level === ErrorLevel.CRITICAL);
        if (criticalErrors.length > 0) {
            recommendations.push('Critical errors found - immediate attention required');
        }

        // Category-specific recommendations
        const categoryBreakdown = this.getCategoryBreakdown(errors);
        if ((categoryBreakdown.get(ErrorCategory.FILE_SYSTEM) || 0) > 5) {
            recommendations.push('Multiple file system errors - check permissions and disk space');
        }
        
        if ((categoryBreakdown.get(ErrorCategory.PARSING) || 0) > 10) {
            recommendations.push('Frequent parsing errors - validate Dart code syntax');
        }

        return recommendations.slice(0, 10); // Limit to top 10 recommendations
    }

    /**
     * Start performance monitoring
     */
    private startPerformanceMonitoring(): void {
        // Monitor VS Code events for performance tracking
        const recordEvent = (operation: string, startTime: number, success: boolean) => {
            const duration = Date.now() - startTime;
            this.recordPerformance(operation, duration, success);
        };

        // Example: Monitor command executions  
        // Note: VS Code doesn't provide a direct way to monitor command execution
        // This is a placeholder for future implementation
    }

    /**
     * Start periodic analysis
     */
    private startPeriodicAnalysis(): void {
        setInterval(async () => {
            try {
                const report = await this.analyzeErrors(1); // Analyze last hour
                
                // Check for critical patterns
                const criticalPatterns = report.patterns.filter(
                    p => p.severity === ErrorLevel.CRITICAL
                );
                
                if (criticalPatterns.length > 0) {
                    // Show notification for critical patterns
                    vscode.window.showWarningMessage(
                        `Extension health issue detected: ${criticalPatterns[0].name}`,
                        'View Details',
                        'Dismiss'
                    ).then(selection => {
                        if (selection === 'View Details') {
                            this.showAnalyticsReport(report);
                        }
                    });
                }
            } catch (error) {
                console.error('Error during periodic analysis:', error);
            }
        }, 300000); // Every 5 minutes
    }

    /**
     * Show analytics report in a new document
     */
    async showAnalyticsReport(report: AnalyticsReport): Promise<void> {
        const content = this.formatReportAsText(report);
        
        const doc = await vscode.workspace.openTextDocument({
            content,
            language: 'markdown'
        });
        
        await vscode.window.showTextDocument(doc);
    }

    /**
     * Format report as readable text
     */
    private formatReportAsText(report: AnalyticsReport): string {
        let content = `# Flutter Testing Keys - Error Analytics Report\n\n`;
        content += `**Generated:** ${report.timestamp.toLocaleString()}\n`;
        content += `**Period:** Last ${report.periodHours} hours\n\n`;

        content += `## Summary\n\n`;
        content += `- **Total Errors:** ${report.totalErrors}\n`;
        content += `- **Health Score:** ${report.performance.healthScore}/100\n`;
        content += `- **Error Rate:** ${report.performance.errorRate}%\n`;
        content += `- **Avg Response Time:** ${report.performance.avgResponseTime}ms\n\n`;

        if (report.patterns.length > 0) {
            content += `## Detected Patterns\n\n`;
            for (const pattern of report.patterns) {
                content += `### ${pattern.name}\n`;
                content += `**Description:** ${pattern.description}\n`;
                content += `**Severity:** ${pattern.severity}\n`;
                content += `**Suggested Actions:**\n`;
                for (const action of pattern.suggestedActions) {
                    content += `- ${action}\n`;
                }
                content += `\n`;
            }
        }

        content += `## Error Breakdown\n\n`;
        content += `### By Category\n`;
        for (const [category, count] of report.categoryBreakdown) {
            content += `- **${category}:** ${count}\n`;
        }
        
        content += `\n### By Level\n`;
        for (const [level, count] of report.levelBreakdown) {
            content += `- **${level}:** ${count}\n`;
        }

        if (report.recommendations.length > 0) {
            content += `\n## Recommendations\n\n`;
            for (const recommendation of report.recommendations) {
                content += `- ${recommendation}\n`;
            }
        }

        return content;
    }

    /**
     * Export analytics data
     */
    async exportAnalytics(periodHours: number = 24): Promise<string> {
        const report = await this.analyzeErrors(periodHours);
        return JSON.stringify(report, null, 2);
    }

    /**
     * Dispose of the analytics system
     */
    dispose(): void {
        this.performanceData = [];
        this.patterns = [];
    }
}