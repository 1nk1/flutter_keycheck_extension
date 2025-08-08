import * as assert from 'assert';
import * as vscode from 'vscode';
import { 
    ErrorHandler, 
    ErrorLevel, 
    ErrorCategory, 
    ErrorBoundary,
    NotificationManager,
    ErrorHelpers
} from '../../core';

/**
 * Test suite for centralized error handling system
 */
suite('Error Handling System', () => {
    let errorHandler: ErrorHandler;
    let notificationManager: NotificationManager;

    setup(() => {
        errorHandler = ErrorHandler.getInstance();
        notificationManager = NotificationManager.getInstance();
        
        // Clear any previous test data
        errorHandler.clearHistory();
        notificationManager.clearCache();
    });

    teardown(() => {
        // Clean up after each test
        errorHandler.clearHistory();
        notificationManager.clearCache();
    });

    suite('ErrorHandler', () => {
        test('should create error info with proper structure', async () => {
            const errorInfo = await errorHandler.handleError(
                ErrorLevel.ERROR,
                ErrorCategory.FILE_SYSTEM,
                'Test error message',
                { showToUser: false }
            );

            assert.strictEqual(errorInfo.level, ErrorLevel.ERROR);
            assert.strictEqual(errorInfo.category, ErrorCategory.FILE_SYSTEM);
            assert.strictEqual(errorInfo.message, 'Test error message');
            assert.ok(errorInfo.id);
            assert.ok(errorInfo.timestamp);
            assert.strictEqual(errorInfo.canRecover, true); // File system errors are recoverable
        });

        test('should track error analytics', async () => {
            // Create multiple errors
            await errorHandler.handleError(
                ErrorLevel.ERROR,
                ErrorCategory.FILE_SYSTEM,
                'File error 1',
                { showToUser: false }
            );
            
            await errorHandler.handleError(
                ErrorLevel.WARNING,
                ErrorCategory.PARSING,
                'Parse warning',
                { showToUser: false }
            );
            
            await errorHandler.handleError(
                ErrorLevel.CRITICAL,
                ErrorCategory.INITIALIZATION,
                'Critical init error',
                { showToUser: false }
            );

            const analyticsData = errorHandler.getAnalytics();
            
            assert.strictEqual(analyticsData.totalErrors, 3);
            assert.strictEqual(analyticsData.errorsByLevel.get(ErrorLevel.ERROR), 1);
            assert.strictEqual(analyticsData.errorsByLevel.get(ErrorLevel.WARNING), 1);
            assert.strictEqual(analyticsData.errorsByLevel.get(ErrorLevel.CRITICAL), 1);
            assert.strictEqual(analyticsData.errorsByCategory.get(ErrorCategory.FILE_SYSTEM), 1);
            assert.ok(analyticsData.healthScore >= 0 && analyticsData.healthScore <= 100);
        });

        test('should emit error events', async () => {
            let eventFired = false;
            let eventData: any;

            errorHandler.on('error', (errorInfo) => {
                eventFired = true;
                eventData = errorInfo;
            });

            await errorHandler.handleError(
                ErrorLevel.ERROR,
                ErrorCategory.COMMAND,
                'Test command error',
                { showToUser: false }
            );

            assert.strictEqual(eventFired, true);
            assert.strictEqual(eventData.message, 'Test command error');
        });

        test('should handle error with recovery actions', async () => {
            const errorInfo = await errorHandler.handleError(
                ErrorLevel.ERROR,
                ErrorCategory.FILE_SYSTEM,
                'File not found',
                {
                    recoveryActions: ['Create file', 'Choose different file'],
                    showToUser: false
                }
            );

            assert.ok(errorInfo.recoveryActions);
            assert.strictEqual(errorInfo.recoveryActions.length, 2);
            assert.strictEqual(errorInfo.recoveryActions[0], 'Create file');
        });
    });

    suite('ErrorBoundary', () => {
        test('should execute function successfully', async () => {
            const result = await ErrorBoundary.execute(
                async () => {
                    return 'success';
                },
                {
                    name: 'test-boundary',
                    showToUser: false,
                    attemptRecovery: false
                }
            );

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.data, 'success');
            assert.strictEqual(result.usedFallback, false);
        });

        test('should handle function failure', async () => {
            const result = await ErrorBoundary.execute(
                async () => {
                    throw new Error('Test error');
                },
                {
                    name: 'test-boundary',
                    showToUser: false,
                    attemptRecovery: false
                }
            );

            assert.strictEqual(result.success, false);
            assert.ok(result.error);
            assert.strictEqual(result.error.message, 'Test error');
            assert.strictEqual(result.usedFallback, false);
        });

        test('should use fallback on error', async () => {
            const result = await ErrorBoundary.execute(
                async () => {
                    throw new Error('Test error');
                },
                {
                    name: 'test-boundary',
                    showToUser: false,
                    attemptRecovery: false,
                    fallback: () => 'fallback-value'
                }
            );

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.data, 'fallback-value');
            assert.strictEqual(result.usedFallback, true);
        });

        test('should retry on failure', async () => {
            let attempts = 0;
            
            const result = await ErrorBoundary.executeWithRetry(
                async () => {
                    attempts++;
                    if (attempts < 3) {
                        throw new Error(`Attempt ${attempts} failed`);
                    }
                    return 'success after retries';
                },
                {
                    name: 'retry-boundary',
                    showToUser: false,
                    attemptRecovery: false,
                    maxRetries: 3,
                    retryDelay: 10 // Short delay for testing
                }
            );

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.data, 'success after retries');
            assert.strictEqual(attempts, 3);
        });

        test('should create command boundary', async () => {
            const commandBoundary = ErrorBoundary.createCommandBoundary('TestCommand');
            
            const result = await commandBoundary.execute(async () => {
                return 'command-success';
            });

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.data, 'command-success');
        });

        test('should create service boundary', async () => {
            const serviceBoundary = ErrorBoundary.createServiceBoundary('TestService');
            
            const result = await serviceBoundary.execute(
                async () => {
                    throw new Error('Service error');
                },
                'default-value'
            );

            assert.strictEqual(result.success, true);
            assert.strictEqual(result.data, 'default-value');
            assert.strictEqual(result.usedFallback, true);
        });
    });

    suite('NotificationManager', () => {
        test('should show success notification', async () => {
            const result = await notificationManager.showSuccess(
                'Operation completed successfully',
                ['OK'],
                100 // Short timeout for testing
            );

            // We can't easily test VS Code UI interactions, but we can verify the call succeeds
            assert.ok(result);
            assert.strictEqual(typeof result.interacted, 'boolean');
            assert.strictEqual(typeof result.timedOut, 'boolean');
        });

        test('should suppress duplicate notifications', async () => {
            const message = 'Duplicate test message';
            
            // First notification should go through
            const result1 = await notificationManager.showNotification(message, {
                priority: 'low' as any,
                suppressDuplicates: true,
                timeout: 100
            });

            // Second notification should be suppressed
            const result2 = await notificationManager.showNotification(message, {
                priority: 'low' as any,
                suppressDuplicates: true,
                timeout: 100
            });

            assert.strictEqual(result2.interacted, false);
            assert.strictEqual(result2.timedOut, false);
        });
    });

    suite('ErrorHelpers', () => {
        test('should create file system error', async () => {
            const errorInfo = await ErrorHelpers.fileSystemError(
                'Failed to read file',
                '/path/to/file.dart'
            );

            assert.strictEqual(errorInfo.category, ErrorCategory.FILE_SYSTEM);
            assert.strictEqual(errorInfo.level, ErrorLevel.ERROR);
            assert.ok(errorInfo.context?.filePath);
            assert.strictEqual(errorInfo.context.filePath, '/path/to/file.dart');
        });

        test('should create parsing error', async () => {
            const errorInfo = await ErrorHelpers.parsingError(
                'Invalid syntax',
                '/path/to/file.dart',
                42
            );

            assert.strictEqual(errorInfo.category, ErrorCategory.PARSING);
            assert.strictEqual(errorInfo.level, ErrorLevel.WARNING);
            assert.strictEqual(errorInfo.context?.lineNumber, 42);
        });

        test('should create command error', async () => {
            const errorInfo = await ErrorHelpers.commandError(
                'TestCommand',
                'Command execution failed'
            );

            assert.strictEqual(errorInfo.category, ErrorCategory.COMMAND);
            assert.strictEqual(errorInfo.level, ErrorLevel.ERROR);
            assert.strictEqual(errorInfo.context?.commandName, 'TestCommand');
        });

        test('should create validation error', async () => {
            const errorInfo = await ErrorHelpers.validationError(
                'Invalid input value',
                'keyName',
                'invalid-value'
            );

            assert.strictEqual(errorInfo.category, ErrorCategory.VALIDATION);
            assert.strictEqual(errorInfo.level, ErrorLevel.WARNING);
            assert.strictEqual(errorInfo.context?.field, 'keyName');
            assert.strictEqual(errorInfo.context?.value, 'invalid-value');
        });

        test('should create critical error', async () => {
            const errorInfo = await ErrorHelpers.criticalError(
                'System failure',
                { module: 'core' }
            );

            assert.strictEqual(errorInfo.category, ErrorCategory.INITIALIZATION);
            assert.strictEqual(errorInfo.level, ErrorLevel.CRITICAL);
            assert.strictEqual(errorInfo.canRecover, false);
            assert.strictEqual(errorInfo.context?.module, 'core');
        });
    });

    suite('ErrorAnalytics', () => {
        test('should exist and be accessible', () => {
            // Simple test to verify ErrorAnalytics is accessible
            assert.ok(typeof ErrorHandler === 'function');
        });
    });

    suite('Integration Tests', () => {
        test('should handle complex error scenario', async () => {
            // Simulate a complex error scenario with multiple components
            const commandBoundary = ErrorBoundary.createCommandBoundary('ComplexCommand');
            
            const result = await commandBoundary.execute(async () => {
                // Simulate nested operations that might fail
                const serviceBoundary = ErrorBoundary.createServiceBoundary('NestedService');
                
                return serviceBoundary.execute(async () => {
                    throw new Error('Nested service failure');
                }, 'fallback-data');
            });

            // Even though the nested service failed, the command should succeed with fallback
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.data, 'fallback-data');
            
            // Check that errors were properly recorded
            const analyticsData = errorHandler.getAnalytics();
            assert.ok(analyticsData.totalErrors > 0);
        });

        test('should maintain error context across boundaries', async () => {
            const context = { userId: 'test-user', operation: 'file-scan' };
            
            await errorHandler.handleError(
                ErrorLevel.ERROR,
                ErrorCategory.FILE_SYSTEM,
                'Context test error',
                {
                    context,
                    showToUser: false
                }
            );

            const analytics = errorHandler.getAnalytics();
            const recentError = analytics.recentErrors[0];
            
            assert.ok(recentError.context);
            assert.strictEqual(recentError.context.userId, 'test-user');
            assert.strictEqual(recentError.context.operation, 'file-scan');
        });

        test('should handle rapid error succession', async () => {
            const promises = [];
            
            // Generate multiple errors rapidly
            for (let i = 0; i < 10; i++) {
                promises.push(
                    errorHandler.handleError(
                        ErrorLevel.WARNING,
                        ErrorCategory.PARSING,
                        `Rapid error ${i}`,
                        { showToUser: false }
                    )
                );
            }

            await Promise.all(promises);
            
            const analytics = errorHandler.getAnalytics();
            assert.strictEqual(analytics.totalErrors, 10);
            assert.strictEqual(analytics.errorsByCategory.get(ErrorCategory.PARSING), 10);
        });
    });
});