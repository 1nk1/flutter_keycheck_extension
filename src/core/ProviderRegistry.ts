import * as vscode from 'vscode';
import { CodeActionProvider } from '../providers/codeActionProvider';
import { CompletionProvider } from '../providers/completionProvider';
import { KeyTreeProvider } from '../providers/keyTreeProvider';
import { ServiceManager } from './ServiceManager';

/**
 * Manages VS Code provider registration and lifecycle
 */
export class ProviderRegistry {
    private _treeProvider?: KeyTreeProvider;
    private _disposables: vscode.Disposable[] = [];

    constructor(private serviceManager: ServiceManager) {}

    /**
     * Register all VS Code providers
     */
    async registerProviders(context: vscode.ExtensionContext): Promise<void> {
        console.log('ProviderRegistry: Attempting to register providers...');
        console.log('ProviderRegistry: ServiceManager initialized:', this.serviceManager.isInitialized);
        console.log('ProviderRegistry: KeyScanner available:', !!this.serviceManager.keyScanner);
        
        // Always register TreeView, even without services (will show empty state)
        const keyScanner = this.serviceManager.keyScanner || null;

        try {
            // Initialize tree provider (always)
            this._treeProvider = new KeyTreeProvider(keyScanner);
            
            // Register tree view (always)
            const treeView = vscode.window.createTreeView('flutterTestingKeys', {
                treeDataProvider: this._treeProvider,
                showCollapseAll: true
            });
            this._disposables.push(treeView);

            // Only register language providers if we have services
            if (this.serviceManager.isInitialized && keyScanner) {
                const completionProvider = new CompletionProvider(keyScanner);
                const codeActionProvider = new CodeActionProvider(keyScanner);

                const completionDisposable = vscode.languages.registerCompletionItemProvider(
                    { scheme: 'file', language: 'dart' },
                    completionProvider,
                    '.',
                    '('
                );
                this._disposables.push(completionDisposable);

                const codeActionDisposable = vscode.languages.registerCodeActionsProvider(
                    { scheme: 'file', language: 'dart' },
                    codeActionProvider
                );
                this._disposables.push(codeActionDisposable);
            }

            // Add all disposables to context
            context.subscriptions.push(...this._disposables);

            console.log('Providers registered successfully');
        } catch (error) {
            console.error('Failed to register providers:', error);
            throw error;
        }
    }

    /**
     * Get the tree provider instance
     */
    get treeProvider(): KeyTreeProvider | undefined {
        return this._treeProvider;
    }

    /**
     * Refresh the tree view
     */
    refreshTreeView(): void {
        if (this._treeProvider) {
            this._treeProvider.refresh();
        }
    }

    /**
     * Dispose of all providers
     */
    dispose(): void {
        this._disposables.forEach(disposable => disposable.dispose());
        this._disposables = [];
        this._treeProvider = undefined;
        console.log('Providers disposed');
    }
}