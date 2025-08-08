import * as vscode from 'vscode';
import { ServiceManager } from '../core/ServiceManager';
import { ProviderRegistry } from '../core/ProviderRegistry';
import { ErrorBoundary, ErrorHelpers, NotificationHelpers, NotificationManager } from '../core';

/**
 * Base class for all commands providing common functionality
 */
export abstract class BaseCommand {
    constructor(
        protected serviceManager: ServiceManager,
        protected providerRegistry: ProviderRegistry
    ) {}

    /**
     * Execute the command with centralized error handling
     */
    async execute(...args: unknown[]): Promise<void> {
        const commandName = this.constructor.name.replace('Command', '');
        const boundary = ErrorBoundary.createCommandBoundary(commandName);
        
        const result = await boundary.execute(async () => {
            await this.executeImpl(...args);
        });
        
        if (!result.success && result.error) {
            // Additional command-specific error handling can go here
            console.error(`Command ${commandName} failed:`, result.error);
        }
    }

    /**
     * Implementation of the command - to be overridden by subclasses
     */
    protected abstract executeImpl(...args: unknown[]): Promise<void>;

    /**
     * Check if services are ready and show warning if not
     */
    protected ensureServicesReady(): boolean {
        if (!this.serviceManager.ensureServicesReady()) {
            NotificationHelpers.showConfigurationError(
                'Service Initialization',
                'Extension services are not ready. Please ensure you have a Flutter project open.'
            );
            return false;
        }
        return true;
    }

    /**
     * Show information message using centralized system
     */
    protected async showInfo(message: string, actions?: string[]): Promise<void> {
        await NotificationHelpers.showOperationSuccess('Information', message);
    }

    /**
     * Show warning message using centralized system
     */
    protected async showWarning(message: string, actions?: string[]): Promise<void> {
        const notificationManager = NotificationManager.getInstance();
        await notificationManager.showWarning(message, actions);
    }

    /**
     * Show error message using centralized system
     */
    protected async showError(message: string, actions?: string[]): Promise<void> {
        const notificationManager = NotificationManager.getInstance();
        await notificationManager.showCritical(message, actions);
    }

    /**
     * Refresh the tree view
     */
    protected refreshTreeView(): void {
        this.providerRegistry.refreshTreeView();
    }
}