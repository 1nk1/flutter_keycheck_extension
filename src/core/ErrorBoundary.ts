import { ErrorHandler, ErrorLevel, ErrorCategory, ErrorHelpers } from './ErrorHandler';
import { NotificationManager } from './NotificationManager';

/**
 * Error boundary configuration
 */
export interface ErrorBoundaryConfig {
    /** Name of the boundary for logging */
    name: string;
    /** Whether to show errors to user */
    showToUser: boolean;
    /** Whether to attempt recovery */
    attemptRecovery: boolean;
    /** Fallback function to execute on error */
    fallback?: () => Promise<any> | any;
    /** Custom error category */
    category?: ErrorCategory;
}

/**
 * Result of error boundary execution
 */
export interface BoundaryResult<T> {
    /** Whether operation succeeded */
    success: boolean;
    /** Result data (if successful) */
    data?: T;
    /** Error information (if failed) */
    error?: Error;
    /** Whether fallback was used */
    usedFallback: boolean;
}

/**
 * Error boundary for wrapping operations with error handling
 */
export class ErrorBoundary {
    private static errorHandler = ErrorHandler.getInstance();
    private static notificationManager = NotificationManager.getInstance();

    /**
     * Execute a function within an error boundary
     */
    static async execute<T>(
        fn: () => Promise<T> | T,
        config: ErrorBoundaryConfig
    ): Promise<BoundaryResult<T>> {
        try {
            const result = await fn();
            return {
                success: true,
                data: result,
                usedFallback: false
            };
        } catch (error) {
            return this.handleBoundaryError<T>(error, config);
        }
    }

    /**
     * Execute a function with automatic retry on failure
     */
    static async executeWithRetry<T>(
        fn: () => Promise<T> | T,
        config: ErrorBoundaryConfig & { maxRetries?: number; retryDelay?: number }
    ): Promise<BoundaryResult<T>> {
        const maxRetries = config.maxRetries || 3;
        const retryDelay = config.retryDelay || 1000;
        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const result = await fn();
                return {
                    success: true,
                    data: result,
                    usedFallback: false
                };
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                if (attempt < maxRetries) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
                    continue;
                }
            }
        }

        // All retries failed
        return this.handleBoundaryError<T>(
            lastError || new Error('Unknown error'),
            { ...config, name: `${config.name} (after ${maxRetries} retries)` }
        );
    }

    /**
     * Handle error within boundary
     */
    private static async handleBoundaryError<T>(
        error: unknown,
        config: ErrorBoundaryConfig
    ): Promise<BoundaryResult<T>> {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        // Log error through centralized handler
        await this.errorHandler.handleError(
            ErrorLevel.ERROR,
            config.category || ErrorCategory.UNKNOWN,
            `Error in ${config.name}: ${errorObj.message}`,
            {
                originalError: errorObj,
                context: { boundaryName: config.name },
                showToUser: config.showToUser,
                canRecover: config.attemptRecovery
            }
        );

        // Try fallback if available
        if (config.fallback) {
            try {
                const fallbackResult = await config.fallback();
                return {
                    success: true,
                    data: fallbackResult,
                    usedFallback: true
                };
            } catch (fallbackError) {
                await this.errorHandler.handleError(
                    ErrorLevel.WARNING,
                    config.category || ErrorCategory.UNKNOWN,
                    `Fallback failed in ${config.name}`,
                    {
                        originalError: fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)),
                        context: { boundaryName: config.name, originalError: errorObj.message },
                        showToUser: false
                    }
                );
            }
        }

        return {
            success: false,
            error: errorObj,
            usedFallback: false
        };
    }

    /**
     * Create a command boundary wrapper
     */
    static createCommandBoundary(commandName: string) {
        return {
            async execute<T>(fn: () => Promise<T> | T, showToUser: boolean = true): Promise<BoundaryResult<T>> {
                return ErrorBoundary.execute(fn, {
                    name: `Command: ${commandName}`,
                    showToUser,
                    attemptRecovery: true,
                    category: ErrorCategory.COMMAND,
                    fallback: async () => {
                        // Default fallback for commands - show helpful message
                        if (showToUser) {
                            await ErrorBoundary.notificationManager.showWarning(
                                `Command '${commandName}' encountered an issue. Please try again.`,
                                ['Retry', 'Report Issue']
                            );
                        }
                        return undefined;
                    }
                });
            }
        };
    }

    /**
     * Create a service boundary wrapper
     */
    static createServiceBoundary(serviceName: string) {
        return {
            async execute<T>(
                fn: () => Promise<T> | T,
                fallbackValue?: T,
                showToUser: boolean = false
            ): Promise<BoundaryResult<T>> {
                return ErrorBoundary.execute(fn, {
                    name: `Service: ${serviceName}`,
                    showToUser,
                    attemptRecovery: false,
                    category: ErrorCategory.UNKNOWN,
                    fallback: fallbackValue !== undefined ? () => fallbackValue : undefined
                });
            }
        };
    }

    /**
     * Create a file operation boundary wrapper
     */
    static createFileOperationBoundary(operation: string, filePath?: string) {
        return {
            async execute<T>(fn: () => Promise<T> | T): Promise<BoundaryResult<T>> {
                return ErrorBoundary.execute(fn, {
                    name: `File ${operation}`,
                    showToUser: true,
                    attemptRecovery: true,
                    category: ErrorCategory.FILE_SYSTEM,
                    fallback: async () => {
                        await ErrorHelpers.fileSystemError(
                            `Failed to ${operation}${filePath ? ` ${filePath}` : ''}`,
                            filePath
                        );
                        return undefined;
                    }
                });
            }
        };
    }

    /**
     * Create a parsing boundary wrapper
     */
    static createParsingBoundary(filePath: string) {
        return {
            async execute<T>(fn: () => Promise<T> | T, fallbackValue?: T): Promise<BoundaryResult<T>> {
                return ErrorBoundary.execute(fn, {
                    name: 'Dart Parsing',
                    showToUser: false, // Parsing errors are usually not critical
                    attemptRecovery: false,
                    category: ErrorCategory.PARSING,
                    fallback: fallbackValue !== undefined ? () => fallbackValue : undefined
                });
            }
        };
    }

    /**
     * Create a network operation boundary wrapper
     */
    static createNetworkBoundary(operation: string) {
        return {
            async execute<T>(fn: () => Promise<T> | T): Promise<BoundaryResult<T>> {
                return ErrorBoundary.executeWithRetry(fn, {
                    name: `Network: ${operation}`,
                    showToUser: true,
                    attemptRecovery: true,
                    category: ErrorCategory.NETWORK,
                    maxRetries: 3,
                    retryDelay: 2000,
                    fallback: async () => {
                        await ErrorBoundary.notificationManager.showWarning(
                            `Network operation '${operation}' failed. Please check your connection.`,
                            ['Retry', 'Work Offline']
                        );
                        return undefined;
                    }
                });
            }
        };
    }
}

/**
 * Decorator for automatic error boundary wrapping
 */
export function withErrorBoundary(config: ErrorBoundaryConfig) {
    return function <T extends (...args: any[]) => any>(
        target: any,
        propertyName: string,
        descriptor: TypedPropertyDescriptor<T>
    ): TypedPropertyDescriptor<T> | void {
        if (descriptor.value) {
            const originalMethod = descriptor.value;
            
            descriptor.value = async function (this: any, ...args: any[]) {
                const result = await ErrorBoundary.execute(
                    () => originalMethod.apply(this, args),
                    config
                );
                
                if (result.success) {
                    return result.data;
                } else {
                    throw result.error || new Error(`Error in ${config.name}`);
                }
            } as T;
        }
    };
}

/**
 * Specialized decorators for common scenarios
 */
export const CommandBoundary = (commandName: string, showToUser: boolean = true) =>
    withErrorBoundary({
        name: `Command: ${commandName}`,
        showToUser,
        attemptRecovery: true,
        category: ErrorCategory.COMMAND
    });

export const ServiceBoundary = (serviceName: string) =>
    withErrorBoundary({
        name: `Service: ${serviceName}`,
        showToUser: false,
        attemptRecovery: false,
        category: ErrorCategory.UNKNOWN
    });

export const FileOperationBoundary = (operation: string) =>
    withErrorBoundary({
        name: `File ${operation}`,
        showToUser: true,
        attemptRecovery: true,
        category: ErrorCategory.FILE_SYSTEM
    });

/**
 * Global error handlers for unhandled errors
 */
export class GlobalErrorHandler {
    private static isInitialized = false;
    private static errorHandler = ErrorHandler.getInstance();

    /**
     * Initialize global error handling
     */
    static initialize(): void {
        if (this.isInitialized) {
            return;
        }

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.errorHandler.handleError(
                ErrorLevel.ERROR,
                ErrorCategory.UNKNOWN,
                'Unhandled promise rejection',
                {
                    details: String(reason),
                    context: { promise: promise.toString() },
                    showToUser: false
                }
            );
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.errorHandler.handleError(
                ErrorLevel.CRITICAL,
                ErrorCategory.UNKNOWN,
                'Uncaught exception',
                {
                    originalError: error,
                    showToUser: true,
                    canRecover: false
                }
            );
        });

        this.isInitialized = true;
    }

    /**
     * Dispose global error handlers
     */
    static dispose(): void {
        if (this.isInitialized) {
            process.removeAllListeners('unhandledRejection');
            process.removeAllListeners('uncaughtException');
            this.isInitialized = false;
        }
    }
}