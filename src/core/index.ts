// Export all core modules for easier imports
export { ExtensionCore } from './ExtensionCore';
export { ServiceManager } from './ServiceManager';
export { ProviderRegistry } from './ProviderRegistry';
export { CommandRegistry } from './CommandRegistry';
export { EventHandlers } from './EventHandlers';

// Export error handling system
export { 
    ErrorHandler, 
    ErrorLevel, 
    ErrorCategory, 
    ErrorInfo, 
    ErrorHelpers 
} from './ErrorHandler';
export { NotificationManager, NotificationHelpers, NotificationPriority } from './NotificationManager';
export { 
    ErrorBoundary, 
    GlobalErrorHandler,
    CommandBoundary,
    ServiceBoundary,
    FileOperationBoundary,
    withErrorBoundary
} from './ErrorBoundary';
export { ErrorAnalytics } from './ErrorAnalytics';