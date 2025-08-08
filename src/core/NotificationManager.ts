import * as vscode from 'vscode';
import { ErrorInfo, ErrorLevel, ErrorCategory } from './ErrorHandler';

/**
 * Notification priority levels
 */
export enum NotificationPriority {
    LOW = 'low',
    NORMAL = 'normal', 
    HIGH = 'high',
    URGENT = 'urgent'
}

/**
 * Notification display options
 */
export interface NotificationOptions {
    /** Priority level affects display behavior */
    priority: NotificationPriority;
    /** Whether to show as modal dialog */
    modal?: boolean;
    /** Custom action buttons */
    actions?: string[];
    /** Timeout in milliseconds (0 = no timeout) */
    timeout?: number;
    /** Whether to suppress duplicate notifications */
    suppressDuplicates?: boolean;
    /** Context for the notification */
    context?: Record<string, any>;
}

/**
 * Notification result
 */
export interface NotificationResult {
    /** Whether user interacted with notification */
    interacted: boolean;
    /** Action chosen by user (if any) */
    action?: string;
    /** Whether notification was dismissed by timeout */
    timedOut: boolean;
}

/**
 * Enhanced notification manager for better user experience
 */
export class NotificationManager {
    private static instance: NotificationManager;
    private recentNotifications = new Map<string, Date>();
    private readonly DUPLICATE_THRESHOLD_MS = 5000; // 5 seconds

    private constructor() {}

    /**
     * Get singleton instance
     */
    static getInstance(): NotificationManager {
        if (!NotificationManager.instance) {
            NotificationManager.instance = new NotificationManager();
        }
        return NotificationManager.instance;
    }

    /**
     * Show notification for error with intelligent formatting
     */
    async showErrorNotification(errorInfo: ErrorInfo): Promise<NotificationResult> {
        const options = this.getNotificationOptionsForError(errorInfo);
        const message = this.formatErrorMessage(errorInfo);
        
        return this.showNotification(message, options);
    }

    /**
     * Show generic notification with options
     */
    async showNotification(
        message: string,
        options: NotificationOptions
    ): Promise<NotificationResult> {
        // Check for duplicates if suppression is enabled
        if (options.suppressDuplicates) {
            const key = this.getNotificationKey(message);
            const lastShown = this.recentNotifications.get(key);
            
            if (lastShown && (Date.now() - lastShown.getTime()) < this.DUPLICATE_THRESHOLD_MS) {
                return {
                    interacted: false,
                    timedOut: false
                };
            }
            
            this.recentNotifications.set(key, new Date());
        }

        // Show notification based on priority and options
        return this.displayNotification(message, options);
    }

    /**
     * Show success notification
     */
    async showSuccess(
        message: string,
        actions?: string[],
        timeout: number = 3000
    ): Promise<NotificationResult> {
        return this.showNotification(message, {
            priority: NotificationPriority.NORMAL,
            actions,
            timeout
        });
    }

    /**
     * Show warning notification
     */
    async showWarning(
        message: string,
        actions?: string[],
        modal: boolean = false
    ): Promise<NotificationResult> {
        return this.showNotification(message, {
            priority: NotificationPriority.HIGH,
            actions,
            modal
        });
    }

    /**
     * Show critical error notification
     */
    async showCritical(
        message: string,
        actions?: string[],
        modal: boolean = true
    ): Promise<NotificationResult> {
        return this.showNotification(message, {
            priority: NotificationPriority.URGENT,
            actions,
            modal
        });
    }

    /**
     * Show progress notification for long-running operations
     */
    async showProgress(
        title: string,
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<void>
    ): Promise<void> {
        return vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title,
                cancellable: false
            },
            task
        );
    }

    /**
     * Get notification options based on error info
     */
    private getNotificationOptionsForError(errorInfo: ErrorInfo): NotificationOptions {
        const baseOptions: NotificationOptions = {
            priority: NotificationPriority.NORMAL,
            suppressDuplicates: true,
            context: errorInfo.context
        };

        switch (errorInfo.level) {
            case ErrorLevel.CRITICAL:
                return {
                    ...baseOptions,
                    priority: NotificationPriority.URGENT,
                    modal: true,
                    actions: errorInfo.recoveryActions,
                    timeout: 0 // No timeout for critical errors
                };

            case ErrorLevel.ERROR:
                return {
                    ...baseOptions,
                    priority: NotificationPriority.HIGH,
                    actions: errorInfo.recoveryActions,
                    timeout: 10000 // 10 seconds
                };

            case ErrorLevel.WARNING:
                return {
                    ...baseOptions,
                    priority: NotificationPriority.NORMAL,
                    timeout: 8000 // 8 seconds
                };

            case ErrorLevel.INFO:
                return {
                    ...baseOptions,
                    priority: NotificationPriority.LOW,
                    timeout: 5000 // 5 seconds
                };

            default:
                return baseOptions;
        }
    }

    /**
     * Format error message for user display
     */
    private formatErrorMessage(errorInfo: ErrorInfo): string {
        let message = errorInfo.message;

        // Add context information if relevant
        if (errorInfo.context) {
            if (errorInfo.context.filePath) {
                const fileName = errorInfo.context.filePath.split('/').pop();
                message += ` (in ${fileName})`;
            }
            if (errorInfo.context.lineNumber) {
                message += ` at line ${errorInfo.context.lineNumber}`;
            }
        }

        // Add helpful suffix based on category
        switch (errorInfo.category) {
            case ErrorCategory.FILE_SYSTEM:
                message += '. Please check file permissions and try again.';
                break;
            case ErrorCategory.PARSING:
                message += '. Please check your Dart syntax.';
                break;
            case ErrorCategory.NETWORK:
                message += '. Please check your internet connection.';
                break;
            case ErrorCategory.CONFIGURATION:
                message += '. Please check your extension settings.';
                break;
        }

        return message;
    }

    /**
     * Actually display the notification using VS Code API
     */
    private async displayNotification(
        message: string,
        options: NotificationOptions
    ): Promise<NotificationResult> {
        const actions = options.actions || [];
        let promise: Thenable<string | undefined>;

        // Choose the appropriate VS Code notification method
        switch (options.priority) {
            case NotificationPriority.URGENT:
                if (options.modal) {
                    promise = vscode.window.showErrorMessage(
                        message,
                        { modal: true },
                        ...actions
                    );
                } else {
                    promise = vscode.window.showErrorMessage(message, ...actions);
                }
                break;

            case NotificationPriority.HIGH:
                promise = vscode.window.showWarningMessage(message, ...actions);
                break;

            case NotificationPriority.NORMAL:
                promise = vscode.window.showInformationMessage(message, ...actions);
                break;

            case NotificationPriority.LOW:
                // For low priority, just use info but with shorter timeout
                promise = vscode.window.showInformationMessage(message, ...actions);
                break;

            default:
                promise = vscode.window.showInformationMessage(message, ...actions);
        }

        // Handle timeout if specified
        let result: string | undefined;
        let timedOut = false;

        if (options.timeout && options.timeout > 0) {
            result = await Promise.race([
                promise,
                this.createTimeoutPromise(options.timeout)
            ]);
            timedOut = result === 'TIMEOUT';
        } else {
            result = await promise;
        }

        return {
            interacted: !!result && result !== 'TIMEOUT',
            action: result && result !== 'TIMEOUT' ? result : undefined,
            timedOut
        };
    }

    /**
     * Create a timeout promise
     */
    private createTimeoutPromise(timeout: number): Promise<'TIMEOUT'> {
        return new Promise(resolve => {
            setTimeout(() => resolve('TIMEOUT'), timeout);
        });
    }

    /**
     * Generate key for duplicate detection
     */
    private getNotificationKey(message: string): string {
        // Use first 100 characters to create a reasonable key
        return message.substring(0, 100);
    }

    /**
     * Clear recent notifications cache
     */
    clearCache(): void {
        this.recentNotifications.clear();
    }

    /**
     * Clean up old notifications from cache
     */
    private cleanupCache(): void {
        const now = Date.now();
        for (const [key, date] of this.recentNotifications.entries()) {
            if (now - date.getTime() > this.DUPLICATE_THRESHOLD_MS * 2) {
                this.recentNotifications.delete(key);
            }
        }
    }

    /**
     * Start periodic cache cleanup
     */
    startCleanup(): void {
        setInterval(() => this.cleanupCache(), this.DUPLICATE_THRESHOLD_MS);
    }

    /**
     * Dispose of the notification manager
     */
    dispose(): void {
        this.clearCache();
    }
}

/**
 * Convenience class for common notification scenarios
 */
export class NotificationHelpers {
    private static manager = NotificationManager.getInstance();

    /**
     * Show scanning progress
     */
    static async showScanProgress(
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<void>
    ): Promise<void> {
        return this.manager.showProgress('Scanning Flutter testing keys...', task);
    }

    /**
     * Show validation progress
     */
    static async showValidationProgress(
        task: (progress: vscode.Progress<{ message?: string; increment?: number }>) => Promise<void>
    ): Promise<void> {
        return this.manager.showProgress('Validating testing keys...', task);
    }

    /**
     * Show operation success
     */
    static async showOperationSuccess(
        operation: string,
        details?: string
    ): Promise<NotificationResult> {
        const message = `${operation} completed successfully${details ? `: ${details}` : ''}`;
        return this.manager.showSuccess(message);
    }

    /**
     * Show file operation result
     */
    static async showFileOperationResult(
        operation: string,
        fileName: string,
        success: boolean
    ): Promise<NotificationResult> {
        if (success) {
            return this.manager.showSuccess(`${operation} ${fileName} successfully`);
        } else {
            return this.manager.showWarning(
                `Failed to ${operation.toLowerCase()} ${fileName}`,
                ['Retry', 'Open file location']
            );
        }
    }

    /**
     * Show configuration error
     */
    static async showConfigurationError(
        setting: string,
        issue: string
    ): Promise<NotificationResult> {
        return this.manager.showWarning(
            `Configuration issue with '${setting}': ${issue}`,
            ['Open Settings', 'Use Defaults', 'Ignore']
        );
    }

    /**
     * Show initialization status
     */
    static async showInitializationStatus(
        isFlutterProject: boolean,
        servicesReady: boolean
    ): Promise<NotificationResult> {
        if (!isFlutterProject) {
            return this.manager.showNotification(
                'Flutter Testing Keys: Not a Flutter project detected',
                {
                    priority: NotificationPriority.LOW,
                    timeout: 3000
                }
            );
        }

        if (servicesReady) {
            return this.manager.showSuccess(
                'Flutter Testing Keys extension is ready',
                undefined,
                2000
            );
        } else {
            return this.manager.showWarning(
                'Flutter Testing Keys extension failed to initialize',
                ['Retry', 'Check Logs', 'Report Issue']
            );
        }
    }

    /**
     * Show key statistics
     */
    static async showKeyStatistics(
        totalKeys: number,
        unusedKeys: number
    ): Promise<NotificationResult> {
        if (unusedKeys === 0) {
            return this.manager.showSuccess(
                `All ${totalKeys} testing keys are being used`
            );
        } else {
            return this.manager.showNotification(
                `Found ${unusedKeys} unused testing keys out of ${totalKeys} total`,
                {
                    priority: NotificationPriority.NORMAL,
                    actions: ['Show Unused Keys', 'Generate Report'],
                    timeout: 8000
                }
            );
        }
    }
}