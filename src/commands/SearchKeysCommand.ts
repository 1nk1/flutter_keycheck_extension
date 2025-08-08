import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';

/**
 * Command to search testing keys
 */
export class SearchKeysCommand extends BaseCommand {
    protected async executeImpl(): Promise<void> {
        if (!this.ensureServicesReady()) {
            return;
        }

        const treeProvider = this.providerRegistry.treeProvider;
        if (!treeProvider) {
            this.showWarning('Tree provider not available');
            return;
        }

        const query = await vscode.window.showInputBox({
            prompt: 'Search testing keys',
            placeHolder: 'Enter key name or value to search'
        });

        if (query) {
            treeProvider.setSearchQuery(query);
            this.showInfo(`Searching for: ${query}`);
        }
    }
}