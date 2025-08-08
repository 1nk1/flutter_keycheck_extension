import * as vscode from 'vscode';
import { ServiceManager } from './ServiceManager';
import { ProviderRegistry } from './ProviderRegistry';

// Import command classes
import { RefreshCommand } from '../commands/RefreshCommand';
import { ValidateCommand } from '../commands/ValidateCommand';
import { GenerateReportCommand } from '../commands/GenerateReportCommand';
import { AddKeyCommand } from '../commands/AddKeyCommand';
import { GoToDefinitionCommand } from '../commands/GoToDefinitionCommand';
import { SearchKeysCommand } from '../commands/SearchKeysCommand';
import { ClearSearchCommand } from '../commands/ClearSearchCommand';
import { ToggleUnusedKeysCommand } from '../commands/ToggleUnusedKeysCommand';
import { ShowStatisticsCommand } from '../commands/ShowStatisticsCommand';
import { InstallFlutterKeycheckCommand, ValidateWithCLICommand } from '../commands/FlutterKeycheckCommands';
// OpenWidgetPreviewCommand now handled directly in extension.ts

import { BaseCommand } from '../commands/BaseCommand';

/**
 * Manages command registration and lifecycle
 */
export class CommandRegistry {
    private commands: Map<string, BaseCommand> = new Map();

    constructor(
        private serviceManager: ServiceManager,
        private providerRegistry: ProviderRegistry
    ) {
        this.initializeCommands();
    }

    /**
     * Initialize all command instances
     */
    private initializeCommands(): void {
        this.commands.set('flutterTestingKeys.refresh', new RefreshCommand(this.serviceManager, this.providerRegistry));
        this.commands.set('flutterTestingKeys.validate', new ValidateCommand(this.serviceManager, this.providerRegistry));
        this.commands.set('flutterTestingKeys.generateReport', new GenerateReportCommand(this.serviceManager, this.providerRegistry));
        this.commands.set('flutterTestingKeys.addKey', new AddKeyCommand(this.serviceManager, this.providerRegistry));
        this.commands.set('flutterTestingKeys.goToDefinition', new GoToDefinitionCommand(this.serviceManager, this.providerRegistry));
        this.commands.set('flutterTestingKeys.searchKeys', new SearchKeysCommand(this.serviceManager, this.providerRegistry));
        this.commands.set('flutterTestingKeys.clearSearch', new ClearSearchCommand(this.serviceManager, this.providerRegistry));
        this.commands.set('flutterTestingKeys.toggleUnusedKeys', new ToggleUnusedKeysCommand(this.serviceManager, this.providerRegistry));
        this.commands.set('flutterTestingKeys.showStatistics', new ShowStatisticsCommand(this.serviceManager, this.providerRegistry));
        this.commands.set('flutterTestingKeys.installFlutterKeycheck', new InstallFlutterKeycheckCommand(this.serviceManager, this.providerRegistry));
        this.commands.set('flutterTestingKeys.validateWithCLI', new ValidateWithCLICommand(this.serviceManager, this.providerRegistry));
        // OpenWidgetPreviewCommand is handled directly in extension.ts
    }

    /**
     * Register all commands with VS Code
     */
    registerCommands(context: vscode.ExtensionContext): void {
        console.log('CommandRegistry: Starting command registration...');
        
        for (const [commandId, commandInstance] of this.commands) {
            try {
                const disposable = vscode.commands.registerCommand(
                    commandId, 
                    (...args) => commandInstance.execute(...args)
                );
                context.subscriptions.push(disposable);
                console.log(`CommandRegistry: Registered command: ${commandId}`);
            } catch (error) {
                console.error(`CommandRegistry: Failed to register command: ${commandId}`, error);
            }
        }

        console.log(`CommandRegistry: Successfully registered ${this.commands.size} commands`);
    }

    /**
     * Get a command instance by ID
     */
    getCommand(commandId: string): BaseCommand | undefined {
        return this.commands.get(commandId);
    }

    /**
     * Get all registered command IDs
     */
    getCommandIds(): string[] {
        return Array.from(this.commands.keys());
    }
}