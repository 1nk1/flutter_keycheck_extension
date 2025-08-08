import * as vscode from 'vscode';
import { ServiceManager } from './ServiceManager';
import { ProviderRegistry } from './ProviderRegistry';
import { CommandRegistry } from './CommandRegistry';
import { EventHandlers } from './EventHandlers';

/**
 * Core extension orchestrator managing all components
 */
export class ExtensionCore {
    private serviceManager: ServiceManager;
    private providerRegistry: ProviderRegistry;
    private commandRegistry: CommandRegistry;
    private eventHandlers: EventHandlers;

    constructor() {
        this.serviceManager = new ServiceManager();
        this.providerRegistry = new ProviderRegistry(this.serviceManager);
        this.commandRegistry = new CommandRegistry(this.serviceManager, this.providerRegistry);
        this.eventHandlers = new EventHandlers(this.serviceManager, this.providerRegistry);
    }

    /**
     * Activate the extension
     */
    async activate(context: vscode.ExtensionContext): Promise<void> {
        console.log('ExtensionCore: Flutter Testing Keys Inspector is now active!');

        try {
            // Set extension context in service manager FIRST
            console.log('ExtensionCore: Setting extension context...');
            this.serviceManager.setExtensionContext(context);
            
            // Register commands FIRST (always register for testing purposes)
            console.log('ExtensionCore: Registering commands...');
            try {
                this.commandRegistry.registerCommands(context);
                console.log('ExtensionCore: Commands registered successfully');
            } catch (commandError) {
                console.error('ExtensionCore: Failed to register commands:', commandError);
                // Don't throw here, continue with extension activation
            }
            
            // Initialize services
            console.log('ExtensionCore: Initializing services...');
            const servicesInitialized = await this.serviceManager.initialize();

            // Always register providers (they will handle empty state gracefully)
            console.log('ExtensionCore: Registering providers...');
            await this.providerRegistry.registerProviders(context);

            // Only proceed with full initialization if it's a Flutter project
            if (servicesInitialized) {

                // Register event listeners
                this.eventHandlers.registerEventListeners(context);

                // Set context for when statement
                await vscode.commands.executeCommand('setContext', 'flutterProject', true);

                // Perform initial scan
                await this.serviceManager.performInitialScan();
                this.providerRegistry.refreshTreeView();

                console.log('Extension fully activated for Flutter project');
            } else {
                console.log('Extension activated in limited mode (non-Flutter project)');
            }
        } catch (error) {
            console.error('Failed to activate extension:', error);
            vscode.window.showErrorMessage(`Failed to activate Flutter Testing Keys Inspector: ${error}`);
            throw error;
        }
    }

    /**
     * Deactivate the extension
     */
    deactivate(): void {
        console.log('Flutter Testing Keys Inspector deactivated');
        
        try {
            this.providerRegistry.dispose();
            this.serviceManager.dispose();
        } catch (error) {
            console.error('Error during deactivation:', error);
        }
    }

    // Getters for accessing components if needed
    get services(): ServiceManager {
        return this.serviceManager;
    }

    get providers(): ProviderRegistry {
        return this.providerRegistry;
    }

    get commands(): CommandRegistry {
        return this.commandRegistry;
    }
}