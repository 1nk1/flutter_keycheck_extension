import * as vscode from 'vscode';
import { EventEmitter } from 'events';

/**
 * Error severity levels
 */
export enum ErrorLevel {
    /** Critical errors that prevent core functionality */
    CRITICAL = 'critical',
    /** Errors that affect functionality but don't prevent core operations */
    ERROR = 'error', 
    /** Warnings about potential issues */
    WARNING = 'warning',
    /** Informational messages for user awareness */
    INFO = 'info'
}

/**
 * Error categories for better classification and handling
 */
export enum ErrorCategory {
    /** File system related errors */
    FILE_SYSTEM = 'file_system',
    /** Dart/Flutter parsing errors */
    PARSING = 'parsing',
    /** Network/API related errors */
    NETWORK = 'network',
    /** Extension initialization errors */
    INITIALIZATION = 'initialization',
    CRITICAL = 'critical',
    /** Command execution errors */
    COMMAND = 'command',
    /** User input/validation errors */
    VALIDATION = 'validation',
    /** Configuration related errors */
    CONFIGURATION = 'configuration',
    /** Unknown/unexpected errors */
    UNKNOWN = 'unknown'
}

/**
 * Structured error information
 */
export interface ErrorInfo {
    /** Unique error identifier */
    id: string;
    /** Error severity level */
    level: ErrorLevel;
    /** Error category */
    category: ErrorCategory;
    /** User-friendly message */
    message: string;
    /** Technical details for debugging */
    details?: string;
    /** Suggested recovery actions */
    recoveryActions?: string[];
    /** Whether this error can be automatically recovered from */
    canRecover: boolean;
    /** Original error object if available */
    originalError?: Error;
    /** Context information (file path, command name, etc.) */
    context?: Record<string, any>;
    /** Timestamp when error occurred */
    timestamp: Date;
}

/**
 * Error recovery result
 */
export interface RecoveryResult {
    /** Whether recovery was successful */
    success: boolean;
    /** Message about recovery attempt */
    message: string;
    /** Whether to retry the original operation */
    shouldRetry: boolean;
}

/**
 * Error analytics data
 */
export interface ErrorAnalytics {
    /** Error frequency by category */
    errorsByCategory: Map<ErrorCategory, number>;
    /** Error frequency by level */
    errorsByLevel: Map<ErrorLevel, number>;
    /** Recent errors (last 50) */
    recentErrors: ErrorInfo[];
    /** Total error count */
    totalErrors: number;
    /** System health score (0-100) */
    healthScore: number;
}

/**
 * Centralized error handling service
 */
export class ErrorHandler extends EventEmitter {
    private static instance: ErrorHandler;
    private errorHistory: ErrorInfo[] = [];
    private readonly MAX_HISTORY_SIZE = 500;
    private errorCounts = new Map<ErrorCategory, number>();
    private levelCounts = new Map<ErrorLevel, number>();
    private isEnabled = true;

    private constructor() {
        super();
        this.initializeErrorCounts();
    }

    /**
     * Get singleton instance
     */
    static getInstance(): ErrorHandler {
        if (!ErrorHandler.instance) {
            ErrorHandler.instance = new ErrorHandler();
        }
        return ErrorHandler.instance;
    }

    /**
     * Initialize error count maps
     */
    private initializeErrorCounts(): void {
        Object.values(ErrorCategory).forEach(category => {
            this.errorCounts.set(category, 0);
        });
        Object.values(ErrorLevel).forEach(level => {
            this.levelCounts.set(level, 0);
        });
    }

    /**
     * Handle an error with full context and recovery options
     */
    async handleError(
        level: ErrorLevel,
        category: ErrorCategory,
        message: string,
        options: {
            details?: string;
            originalError?: Error;
            context?: Record<string, any>;
            recoveryActions?: string[];
            canRecover?: boolean;
            showToUser?: boolean;
        } = {}
    ): Promise<ErrorInfo> {
        if (!this.isEnabled) {
            return this.createErrorInfo(level, category, message, options);
        }

        const errorInfo = this.createErrorInfo(level, category, message, options);
        
        // Add to history
        this.addToHistory(errorInfo);
        
        // Update analytics
        this.updateAnalytics(errorInfo);
        
        // Log the error
        this.logError(errorInfo);
        
        // Show to user if appropriate
        if (options.showToUser !== false) {
            await this.showErrorToUser(errorInfo);
        }
        
        // Emit event for subscribers
        this.emit('error', errorInfo);
        
        // Attempt recovery if possible
        if (errorInfo.canRecover) {
            await this.attemptRecovery(errorInfo);
        }

        return errorInfo;
    }

    /**
     * Create structured error information
     */
    private createErrorInfo(
        level: ErrorLevel,
        category: ErrorCategory,
        message: string,
        options: {
            details?: string;
            originalError?: Error;
            context?: Record<string, any>;
            recoveryActions?: string[];
            canRecover?: boolean;
        }
    ): ErrorInfo {
        return {
            id: this.generateErrorId(),
            level,
            category,
            message,
            details: options.details || options.originalError?.message,
            recoveryActions: options.recoveryActions || this.getDefaultRecoveryActions(category),
            canRecover: options.canRecover ?? this.isRecoverable(category),
            originalError: options.originalError,
            context: options.context,
            timestamp: new Date()
        };
    }

    /**
     * Generate unique error ID
     */
    private generateErrorId(): string {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Add error to history with size management
     */
    private addToHistory(errorInfo: ErrorInfo): void {
        this.errorHistory.unshift(errorInfo);
        if (this.errorHistory.length > this.MAX_HISTORY_SIZE) {
            this.errorHistory = this.errorHistory.slice(0, this.MAX_HISTORY_SIZE);
        }
    }

    /**
     * Update error analytics
     */
    private updateAnalytics(errorInfo: ErrorInfo): void {
        // Update category counts
        const categoryCount = this.errorCounts.get(errorInfo.category) || 0;
        this.errorCounts.set(errorInfo.category, categoryCount + 1);
        
        // Update level counts
        const levelCount = this.levelCounts.get(errorInfo.level) || 0;
        this.levelCounts.set(errorInfo.level, levelCount + 1);
    }

    /**
     * Log error with appropriate detail level
     */
    private logError(errorInfo: ErrorInfo): void {
        const logMessage = `[${errorInfo.level.toUpperCase()}] ${errorInfo.category}: ${errorInfo.message}`;
        
        switch (errorInfo.level) {
            case ErrorLevel.CRITICAL:
            case ErrorLevel.ERROR:
                console.error(logMessage, {
                    id: errorInfo.id,
                    details: errorInfo.details,
                    context: errorInfo.context,
                    stack: errorInfo.originalError?.stack
                });
                break;
            case ErrorLevel.WARNING:
                console.warn(logMessage, {
                    id: errorInfo.id,
                    context: errorInfo.context
                });
                break;
            case ErrorLevel.INFO:
                console.info(logMessage);
                break;
        }
    }

    /**
     * Show error to user with appropriate UI
     */
    private async showErrorToUser(errorInfo: ErrorInfo): Promise<void> {
        const userMessage = this.getUserFriendlyMessage(errorInfo);
        
        switch (errorInfo.level) {
            case ErrorLevel.CRITICAL:
                if (errorInfo.recoveryActions && errorInfo.recoveryActions.length > 0) {
                    const action = await vscode.window.showErrorMessage(
                        userMessage,
                        { modal: true },
                        ...errorInfo.recoveryActions
                    );
                    if (action) {
                        await this.executeRecoveryAction(errorInfo, action);
                    }
                } else {
                    vscode.window.showErrorMessage(userMessage);
                }
                break;
                
            case ErrorLevel.ERROR:
                if (errorInfo.recoveryActions && errorInfo.recoveryActions.length > 0) {
                    const action = await vscode.window.showErrorMessage(
                        userMessage,
                        ...errorInfo.recoveryActions
                    );
                    if (action) {
                        await this.executeRecoveryAction(errorInfo, action);
                    }
                } else {
                    vscode.window.showErrorMessage(userMessage);
                }
                break;
                
            case ErrorLevel.WARNING:
                vscode.window.showWarningMessage(userMessage);
                break;
                
            case ErrorLevel.INFO:
                vscode.window.showInformationMessage(userMessage);
                break;
        }
    }

    /**
     * Get user-friendly error message
     */
    private getUserFriendlyMessage(errorInfo: ErrorInfo): string {
        switch (errorInfo.category) {
            case ErrorCategory.FILE_SYSTEM:
                return `File operation failed: ${errorInfo.message}`;
            case ErrorCategory.PARSING:
                return `Unable to parse Dart code: ${errorInfo.message}`;
            case ErrorCategory.NETWORK:
                return `Network error: ${errorInfo.message}`;
            case ErrorCategory.INITIALIZATION:
                return `Extension initialization failed: ${errorInfo.message}`;
            case ErrorCategory.COMMAND:
                return `Command execution failed: ${errorInfo.message}`;
            case ErrorCategory.VALIDATION:
                return `Validation error: ${errorInfo.message}`;
            case ErrorCategory.CONFIGURATION:
                return `Configuration error: ${errorInfo.message}`;
            default:
                return errorInfo.message;
        }
    }

    /**
     * Get default recovery actions for error category
     */
    private getDefaultRecoveryActions(category: ErrorCategory): string[] {
        switch (category) {
            case ErrorCategory.FILE_SYSTEM:
                return ['Retry', 'Check permissions', 'Open folder'];
            case ErrorCategory.PARSING:
                return ['Check syntax', 'Reformat code', 'View details'];
            case ErrorCategory.NETWORK:
                return ['Retry', 'Check connection', 'Use offline mode'];
            case ErrorCategory.INITIALIZATION:
                return ['Restart extension', 'Check configuration', 'Report issue'];
            case ErrorCategory.COMMAND:
                return ['Retry', 'Check prerequisites', 'View logs'];
            case ErrorCategory.VALIDATION:
                return ['Fix input', 'View requirements', 'Skip validation'];
            case ErrorCategory.CONFIGURATION:
                return ['Open settings', 'Reset to defaults', 'View documentation'];
            default:
                return ['Retry', 'Report issue'];
        }
    }

    /**
     * Check if error category is recoverable
     */
    private isRecoverable(category: ErrorCategory): boolean {
        switch (category) {
            case ErrorCategory.CRITICAL:
            case ErrorCategory.INITIALIZATION:
                return false;
            default:
                return true;
        }
    }

    /**
     * Attempt automatic recovery
     */
    private async attemptRecovery(errorInfo: ErrorInfo): Promise<RecoveryResult> {
        // Implement recovery strategies based on error category
        switch (errorInfo.category) {
            case ErrorCategory.FILE_SYSTEM:
                return this.recoverFileSystemError(errorInfo);
            case ErrorCategory.NETWORK:
                return this.recoverNetworkError(errorInfo);
            case ErrorCategory.PARSING:
                return this.recoverParsingError(errorInfo);
            default:
                return {
                    success: false,
                    message: 'No automatic recovery available',
                    shouldRetry: false
                };
        }
    }

    /**
     * Execute recovery action chosen by user
     */
    private async executeRecoveryAction(errorInfo: ErrorInfo, action: string): Promise<void> {
        switch (action) {
            case 'Retry':
                this.emit('retry', errorInfo);
                break;
            case 'Open settings':
                vscode.commands.executeCommand('workbench.action.openSettings', 'flutterTestingKeys');
                break;
            case 'View logs':
                vscode.commands.executeCommand('workbench.action.showErrorsWarnings');
                break;
            case 'Report issue':
                vscode.env.openExternal(vscode.Uri.parse('https://github.com/your-repo/issues'));
                break;
            // Add more recovery actions as needed
        }
    }

    /**
     * File system error recovery
     */
    private async recoverFileSystemError(errorInfo: ErrorInfo): Promise<RecoveryResult> {
        // Try to check if file/directory exists and is accessible
        try {
            if (errorInfo.context?.filePath) {
                const uri = vscode.Uri.file(errorInfo.context.filePath);
                await vscode.workspace.fs.stat(uri);
                return {
                    success: true,
                    message: 'File is now accessible',
                    shouldRetry: true
                };
            }
        } catch {
            // File still not accessible
        }
        
        return {
            success: false,
            message: 'File remains inaccessible',
            shouldRetry: false
        };
    }

    /**
     * Network error recovery
     */
    private async recoverNetworkError(errorInfo: ErrorInfo): Promise<RecoveryResult> {
        // For now, just suggest retry after a delay
        return {
            success: false,
            message: 'Network issue persists',
            shouldRetry: true
        };
    }

    /**
     * Parsing error recovery
     */
    private async recoverParsingError(errorInfo: ErrorInfo): Promise<RecoveryResult> {
        // Parsing errors usually require manual intervention
        return {
            success: false,
            message: 'Manual code review required',
            shouldRetry: false
        };
    }

    /**
     * Get error analytics
     */
    getAnalytics(): ErrorAnalytics {
        const healthScore = this.calculateHealthScore();
        
        return {
            errorsByCategory: new Map(this.errorCounts),
            errorsByLevel: new Map(this.levelCounts),
            recentErrors: this.errorHistory.slice(0, 50),
            totalErrors: this.errorHistory.length,
            healthScore
        };
    }

    /**
     * Calculate system health score (0-100)
     */
    private calculateHealthScore(): number {
        const recentErrors = this.errorHistory.slice(0, 50);
        const criticalErrors = recentErrors.filter(e => e.level === ErrorLevel.CRITICAL).length;
        const errors = recentErrors.filter(e => e.level === ErrorLevel.ERROR).length;
        const warnings = recentErrors.filter(e => e.level === ErrorLevel.WARNING).length;
        
        // Weight different error types
        const errorScore = (criticalErrors * 10) + (errors * 3) + (warnings * 1);
        const maxScore = 50 * 10; // Assume worst case of 50 critical errors
        
        const healthScore = Math.max(0, 100 - (errorScore / maxScore * 100));
        return Math.round(healthScore);
    }

    /**
     * Clear error history (for testing or cleanup)
     */
    clearHistory(): void {
        this.errorHistory = [];
        this.initializeErrorCounts();
    }

    /**
     * Enable/disable error handling
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    /**
     * Get recent errors by level
     */
    getRecentErrorsByLevel(level: ErrorLevel, limit: number = 10): ErrorInfo[] {
        return this.errorHistory
            .filter(error => error.level === level)
            .slice(0, limit);
    }

    /**
     * Get recent errors by category
     */
    getRecentErrorsByCategory(category: ErrorCategory, limit: number = 10): ErrorInfo[] {
        return this.errorHistory
            .filter(error => error.category === category)
            .slice(0, limit);
    }

    /**
     * Dispose of the error handler
     */
    dispose(): void {
        this.removeAllListeners();
        this.clearHistory();
    }
}

/**
 * Convenience functions for common error scenarios
 */
export class ErrorHelpers {
    private static errorHandler = ErrorHandler.getInstance();

    /**
     * Handle file system errors
     */
    static async fileSystemError(
        message: string,
        filePath?: string,
        originalError?: Error
    ): Promise<ErrorInfo> {
        return this.errorHandler.handleError(
            ErrorLevel.ERROR,
            ErrorCategory.FILE_SYSTEM,
            message,
            {
                originalError,
                context: { filePath },
                recoveryActions: ['Retry', 'Check permissions', 'Open folder']
            }
        );
    }

    /**
     * Handle parsing errors
     */
    static async parsingError(
        message: string,
        filePath?: string,
        lineNumber?: number,
        originalError?: Error
    ): Promise<ErrorInfo> {
        return this.errorHandler.handleError(
            ErrorLevel.WARNING,
            ErrorCategory.PARSING,
            message,
            {
                originalError,
                context: { filePath, lineNumber },
                recoveryActions: ['Check syntax', 'View file', 'Skip file']
            }
        );
    }

    /**
     * Handle command execution errors
     */
    static async commandError(
        commandName: string,
        message: string,
        originalError?: Error
    ): Promise<ErrorInfo> {
        return this.errorHandler.handleError(
            ErrorLevel.ERROR,
            ErrorCategory.COMMAND,
            message,
            {
                originalError,
                context: { commandName },
                recoveryActions: ['Retry', 'Check prerequisites', 'View logs']
            }
        );
    }

    /**
     * Handle validation errors
     */
    static async validationError(
        message: string,
        field?: string,
        value?: any
    ): Promise<ErrorInfo> {
        return this.errorHandler.handleError(
            ErrorLevel.WARNING,
            ErrorCategory.VALIDATION,
            message,
            {
                context: { field, value },
                recoveryActions: ['Fix input', 'View requirements'],
                showToUser: true
            }
        );
    }

    /**
     * Handle critical initialization errors
     */
    static async criticalError(
        message: string,
        context?: Record<string, any>,
        originalError?: Error
    ): Promise<ErrorInfo> {
        return this.errorHandler.handleError(
            ErrorLevel.CRITICAL,
            ErrorCategory.INITIALIZATION,
            message,
            {
                originalError,
                context,
                canRecover: false,
                recoveryActions: ['Restart extension', 'Report issue']
            }
        );
    }

    /**
     * Handle informational messages
     */
    static async info(
        message: string,
        context?: Record<string, any>
    ): Promise<ErrorInfo> {
        return this.errorHandler.handleError(
            ErrorLevel.INFO,
            ErrorCategory.UNKNOWN,
            message,
            {
                context,
                canRecover: true,
                showToUser: false
            }
        );
    }
}