import * as vscode from 'vscode';
import { ServiceManager } from './ServiceManager';
import { ProviderRegistry } from './ProviderRegistry';

/**
 * Manages VS Code event listener registration
 */
export class EventHandlers {
    constructor(
        private serviceManager: ServiceManager,
        private providerRegistry: ProviderRegistry
    ) {}

    /**
     * Register all event listeners
     */
    registerEventListeners(context: vscode.ExtensionContext): void {
        // Auto-validate on file save
        const onSaveDisposable = vscode.workspace.onDidSaveTextDocument(
            async (document) => this.handleFileSave(document)
        );
        context.subscriptions.push(onSaveDisposable);

        // Refresh on configuration change
        const onConfigChangeDisposable = vscode.workspace.onDidChangeConfiguration(
            async (e) => this.handleConfigurationChange(e)
        );
        context.subscriptions.push(onConfigChangeDisposable);

        // Refresh when files are created
        const onCreateDisposable = vscode.workspace.onDidCreateFiles(
            async (e) => this.handleFilesCreated(e)
        );
        context.subscriptions.push(onCreateDisposable);

        // Refresh when files are deleted
        const onDeleteDisposable = vscode.workspace.onDidDeleteFiles(
            async (e) => this.handleFilesDeleted(e)
        );
        context.subscriptions.push(onDeleteDisposable);

        // Handle active editor changes
        const onEditorChangeDisposable = vscode.window.onDidChangeActiveTextEditor(
            async (editor) => this.handleActiveEditorChange(editor)
        );
        context.subscriptions.push(onEditorChangeDisposable);

        console.log('Event listeners registered');
    }

    /**
     * Handle file save events
     */
    private async handleFileSave(document: vscode.TextDocument): Promise<void> {
        if (document.languageId !== 'dart') {
            return;
        }

        const config = vscode.workspace.getConfiguration('flutterTestingKeys');
        const autoValidate = config.get('autoValidate', true);

        if (!autoValidate || !this.serviceManager.keyScanner) {
            return;
        }

        try {
            // Refresh keys if KeyConstants file was saved
            if (document.fileName.includes('key_constants') || 
                document.fileName.includes('constants')) {
                await this.serviceManager.keyScanner.scanAllKeys(true);
                this.providerRegistry.refreshTreeView();
            }

            // Show diagnostic information if enabled
            const enableDiagnostics = config.get('enableDiagnostics', true);
            if (enableDiagnostics) {
                // Could add diagnostic collection here in the future
            }
        } catch (error) {
            console.error('Error handling file save:', error);
        }
    }

    /**
     * Handle configuration changes
     */
    private async handleConfigurationChange(e: vscode.ConfigurationChangeEvent): Promise<void> {
        if (!e.affectsConfiguration('flutterTestingKeys')) {
            return;
        }

        try {
            if (this.serviceManager.keyScanner) {
                await this.serviceManager.keyScanner.scanAllKeys(true);
                this.providerRegistry.refreshTreeView();
            }
        } catch (error) {
            console.error('Error handling configuration change:', error);
        }
    }

    /**
     * Handle file creation events
     */
    private async handleFilesCreated(e: vscode.FileCreateEvent): Promise<void> {
        const dartFiles = e.files.filter(file => file.path.endsWith('.dart'));
        if (dartFiles.length === 0) {
            return;
        }

        try {
            if (this.serviceManager.keyScanner) {
                await this.serviceManager.keyScanner.scanAllKeys(true);
                this.providerRegistry.refreshTreeView();
            }
        } catch (error) {
            console.error('Error handling files created:', error);
        }
    }

    /**
     * Handle file deletion events
     */
    private async handleFilesDeleted(e: vscode.FileDeleteEvent): Promise<void> {
        const dartFiles = e.files.filter(file => file.path.endsWith('.dart'));
        if (dartFiles.length === 0) {
            return;
        }

        try {
            if (this.serviceManager.keyScanner) {
                await this.serviceManager.keyScanner.scanAllKeys(true);
                this.providerRegistry.refreshTreeView();
            }
        } catch (error) {
            console.error('Error handling files deleted:', error);
        }
    }

    /**
     * Handle active editor changes
     */
    private async handleActiveEditorChange(editor: vscode.TextEditor | undefined): Promise<void> {
        if (!editor || editor.document.languageId !== 'dart') {
            return;
        }

        try {
            // Could highlight current file's keys in tree view
            // This is a placeholder for future enhancement
        } catch (error) {
            console.error('Error handling active editor change:', error);
        }
    }
}