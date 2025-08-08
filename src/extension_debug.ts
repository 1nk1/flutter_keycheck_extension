import * as vscode from 'vscode';

// Minimal TreeDataProvider for testing
class DebugTreeProvider implements vscode.TreeDataProvider<DebugTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<DebugTreeItem | undefined | null | void> = new vscode.EventEmitter<DebugTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<DebugTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        console.log('DEBUG: TreeProvider.refresh() called');
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DebugTreeItem): vscode.TreeItem {
        console.log('DEBUG: getTreeItem called for:', element.label);
        return element;
    }

    getChildren(element?: DebugTreeItem): Thenable<DebugTreeItem[]> {
        console.log('DEBUG: getChildren called, element:', element?.label || 'root');
        
        if (!element) {
            // Root level
            return Promise.resolve([
                new DebugTreeItem('Test Item 1', vscode.TreeItemCollapsibleState.None),
                new DebugTreeItem('Test Item 2', vscode.TreeItemCollapsibleState.None),
                new DebugTreeItem('Test Category', vscode.TreeItemCollapsibleState.Collapsed)
            ]);
        } else if (element.label === 'Test Category') {
            return Promise.resolve([
                new DebugTreeItem('Child Item 1', vscode.TreeItemCollapsibleState.None),
                new DebugTreeItem('Child Item 2', vscode.TreeItemCollapsibleState.None)
            ]);
        }
        
        return Promise.resolve([]);
    }
}

class DebugTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} - Debug item`;
        this.description = 'debug';
    }
}

// Main extension activation
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('=== DEBUG EXTENSION STARTING ===');
    
    try {
        // Show activation message
        await vscode.window.showInformationMessage('🔧 Debug Extension Activating...');
        console.log('DEBUG: Extension activate() function called');
        
        // Step 1: Create TreeDataProvider
        console.log('DEBUG: Creating TreeDataProvider...');
        const treeProvider = new DebugTreeProvider();
        console.log('DEBUG: TreeDataProvider created successfully');
        
        // Step 2: Register TreeView
        console.log('DEBUG: Registering TreeView with ID "flutterTestingKeys"...');
        const treeView = vscode.window.createTreeView('flutterTestingKeys', {
            treeDataProvider: treeProvider,
            showCollapseAll: true,
            canSelectMany: false
        });
        
        // Add to subscriptions
        context.subscriptions.push(treeView);
        console.log('DEBUG: TreeView registered and added to subscriptions');
        
        // Step 3: Register Commands
        console.log('DEBUG: Registering commands...');
        
        // Refresh command
        const refreshDisposable = vscode.commands.registerCommand('flutterTestingKeys.refresh', () => {
            console.log('DEBUG: Refresh command executed!');
            treeProvider.refresh();
            vscode.window.showInformationMessage('✅ Refresh command works!');
        });
        context.subscriptions.push(refreshDisposable);
        console.log('DEBUG: flutterTestingKeys.refresh registered');
        
        // Validate command
        const validateDisposable = vscode.commands.registerCommand('flutterTestingKeys.validate', () => {
            console.log('DEBUG: Validate command executed!');
            vscode.window.showInformationMessage('✅ Validate command works!');
        });
        context.subscriptions.push(validateDisposable);
        console.log('DEBUG: flutterTestingKeys.validate registered');
        
        // Add missing commands from package.json
        const generateReportDisposable = vscode.commands.registerCommand('flutterTestingKeys.generateReport', () => {
            console.log('DEBUG: GenerateReport command executed!');
            vscode.window.showInformationMessage('✅ Generate Report command works!');
        });
        context.subscriptions.push(generateReportDisposable);
        console.log('DEBUG: flutterTestingKeys.generateReport registered');
        
        const addKeyDisposable = vscode.commands.registerCommand('flutterTestingKeys.addKey', () => {
            console.log('DEBUG: AddKey command executed!');
            vscode.window.showInformationMessage('✅ Add Key command works!');
        });
        context.subscriptions.push(addKeyDisposable);
        console.log('DEBUG: flutterTestingKeys.addKey registered');
        
        const goToDefinitionDisposable = vscode.commands.registerCommand('flutterTestingKeys.goToDefinition', () => {
            console.log('DEBUG: GoToDefinition command executed!');
            vscode.window.showInformationMessage('✅ Go To Definition command works!');
        });
        context.subscriptions.push(goToDefinitionDisposable);
        console.log('DEBUG: flutterTestingKeys.goToDefinition registered');
        
        const openWidgetPreviewDisposable = vscode.commands.registerCommand('flutterTestingKeys.openWidgetPreview', () => {
            console.log('DEBUG: OpenWidgetPreview command executed!');
            vscode.window.showInformationMessage('✅ Open Widget Preview command works!');
        });
        context.subscriptions.push(openWidgetPreviewDisposable);
        console.log('DEBUG: flutterTestingKeys.openWidgetPreview registered');
        
        // Step 4: Verify registration
        console.log('DEBUG: Checking if TreeView is visible...');
        console.log('DEBUG: TreeView.visible =', treeView.visible);
        console.log('DEBUG: TreeView.selection =', treeView.selection);
        
        // Step 5: Test command registration
        console.log('DEBUG: Testing command registration...');
        const allCommands = await vscode.commands.getCommands(true);
        const ourCommands = allCommands.filter(cmd => cmd.startsWith('flutterTestingKeys.'));
        console.log('DEBUG: Registered commands:', ourCommands);
        
        // Final success message
        await vscode.window.showInformationMessage('✅ Debug Extension Activated Successfully!');
        console.log('=== DEBUG EXTENSION FULLY ACTIVATED ===');
        
    } catch (error) {
        console.error('DEBUG: Critical error during activation:', error);
        await vscode.window.showErrorMessage(`❌ Debug Extension Activation Failed: ${error}`);
        throw error;
    }
}

export function deactivate(): void {
    console.log('DEBUG: Extension deactivating...');
}