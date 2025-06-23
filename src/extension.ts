import * as vscode from 'vscode';

import { CodeActionProvider } from './providers/codeActionProvider';
import { CompletionProvider } from './providers/completionProvider';
import { KeyTreeProvider } from './providers/keyTreeProvider';
import { FlutterKeycheckService } from './services/flutterKeycheckService';
import { KeyScanner } from './services/keyScanner';
import { ValidationService } from './services/validationService';
import { FileUtils } from './utils/fileUtils';

let keyScanner: KeyScanner;
let validationService: ValidationService;
let flutterKeycheckService: FlutterKeycheckService;
let treeProvider: KeyTreeProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('Flutter Testing Keys Inspector is now active!');

    // Check if it's a Flutter project
    const workspaceRoot = FileUtils.getWorkspaceRoot();
    if (!workspaceRoot || !FileUtils.isFlutterProject(workspaceRoot)) {
        console.log('Not a Flutter project, extension will remain inactive');
        return;
    }

    // Initialize services
    keyScanner = new KeyScanner();
    validationService = new ValidationService(keyScanner);
    flutterKeycheckService = new FlutterKeycheckService(validationService);

    // Initialize providers
    treeProvider = new KeyTreeProvider(keyScanner);
    const completionProvider = new CompletionProvider(keyScanner);
    const codeActionProvider = new CodeActionProvider(keyScanner);

    // Register tree view
    vscode.window.createTreeView('flutterTestingKeys', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });

    // Register language providers
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { scheme: 'file', language: 'dart' },
            completionProvider,
            '.',
            '('
        )
    );

    context.subscriptions.push(
        vscode.languages.registerCodeActionsProvider(
            { scheme: 'file', language: 'dart' },
            codeActionProvider
        )
    );

    // Register commands
    registerCommands(context);

    // Register event listeners
    registerEventListeners(context);

    // Set context for when statement
    vscode.commands.executeCommand('setContext', 'flutterProject', true);

    // Initial scan
    keyScanner.scanAllKeys().then(() => {
        treeProvider.refresh();
    });
}

function registerCommands(context: vscode.ExtensionContext) {
    // Refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('flutterTestingKeys.refresh', async () => {
            await keyScanner.scanAllKeys(true);
            treeProvider.refresh();
            vscode.window.showInformationMessage('Testing keys refreshed');
        })
    );

    // Validate command
    context.subscriptions.push(
        vscode.commands.registerCommand('flutterTestingKeys.validate', async () => {
            try {
                const result = await validationService.validateKeys();
                const message = `Validation complete: ${result.totalKeys} keys found, ${result.issues.length} issues`;

                if (result.issues.length > 0) {
                    const action = await vscode.window.showWarningMessage(
                        message,
                        'View Report',
                        'Fix Issues'
                    );

                    if (action === 'View Report') {
                        vscode.commands.executeCommand('flutterTestingKeys.generateReport');
                    }
                } else {
                    vscode.window.showInformationMessage(message);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Validation failed: ${error}`);
            }
        })
    );

    // Generate report command
    context.subscriptions.push(
        vscode.commands.registerCommand('flutterTestingKeys.generateReport', async () => {
            try {
                const report = await validationService.generateMarkdownReport();
                const doc = await vscode.workspace.openTextDocument({
                    content: report,
                    language: 'markdown'
                });
                await vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to generate report: ${error}`);
            }
        })
    );

    // Add new key command
    context.subscriptions.push(
        vscode.commands.registerCommand('flutterTestingKeys.addKey', async () => {
            const keyName = await vscode.window.showInputBox({
                prompt: 'Enter key name',
                placeHolder: 'myButtonKey',
                validateInput: (value) => {
                    if (!value || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
                        return 'Key name must be a valid identifier';
                    }
                    return null;
                }
            });

            if (!keyName) {return;}

            const keyValue = await vscode.window.showInputBox({
                prompt: 'Enter key value',
                placeHolder: 'my_button_key',
                value: keyName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
            });

            if (!keyValue) {return;}

            try {
                const workspaceRoot = FileUtils.getWorkspaceRoot();
                if (!workspaceRoot) {
                    throw new Error('No workspace found');
                }

                const config = vscode.workspace.getConfiguration('flutterTestingKeys');
                const keyConstantsPath = config.get<string>('keyConstantsPath', 'lib/constants/key_constants.dart');
                const fullPath = `${workspaceRoot}/${keyConstantsPath}`;

                // Create or update KeyConstants file
                let content = '';
                if (FileUtils.fileExists(fullPath)) {
                    content = FileUtils.readFileContent(fullPath) || '';
                    // Add new key before closing brace
                    const lines = content.split('\n');
                    const insertIndex = lines.findIndex(line => line.includes('}'));
                    if (insertIndex > 0) {
                        lines.splice(insertIndex, 0, `  static const String ${keyName} = '${keyValue}';`);
                        content = lines.join('\n');
                    }
                } else {
                    content = `class KeyConstants {\n  static const String ${keyName} = '${keyValue}';\n}\n`;
                }

                FileUtils.writeFile(fullPath, content);

                // Refresh and show success
                await keyScanner.scanAllKeys(true);
                treeProvider.refresh();
                vscode.window.showInformationMessage(`Key '${keyName}' added successfully`);

                // Open the file
                const doc = await vscode.workspace.openTextDocument(fullPath);
                await vscode.window.showTextDocument(doc);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to add key: ${error}`);
            }
        })
    );

    // Go to definition command
    context.subscriptions.push(
        vscode.commands.registerCommand('flutterTestingKeys.goToDefinition', async (item) => {
            if (item && item.key) {
                const uri = vscode.Uri.file(item.key.filePath);
                const position = new vscode.Position(item.key.line - 1, 0);
                // Navigate to the key definition

                await vscode.window.showTextDocument(uri, {
                    selection: new vscode.Range(position, position)
                });
            }
        })
    );

    // Search keys command
    context.subscriptions.push(
        vscode.commands.registerCommand('flutterTestingKeys.searchKeys', async () => {
            const query = await vscode.window.showInputBox({
                prompt: 'Search testing keys',
                placeHolder: 'Enter key name or value to search'
            });

            if (query) {
                treeProvider.setSearchQuery(query);
                vscode.window.showInformationMessage(`Searching for: ${query}`);
            }
        })
    );

    // Clear search command
    context.subscriptions.push(
        vscode.commands.registerCommand('flutterTestingKeys.clearSearch', () => {
            treeProvider.clearSearch();
            vscode.window.showInformationMessage('Search cleared');
        })
    );

    // Toggle unused keys command
    context.subscriptions.push(
        vscode.commands.registerCommand('flutterTestingKeys.toggleUnusedKeys', () => {
            treeProvider.toggleUnusedKeys();
        })
    );

    // Install flutter_keycheck command
    context.subscriptions.push(
        vscode.commands.registerCommand('flutterTestingKeys.installFlutterKeycheck', async () => {
            const success = await flutterKeycheckService.installFlutterKeycheck();
            if (success) {
                vscode.window.showInformationMessage('flutter_keycheck installed successfully');
            }
        })
    );

    // Validate with CLI command
    context.subscriptions.push(
        vscode.commands.registerCommand('flutterTestingKeys.validateWithCLI', async () => {
            try {
                const result = await flutterKeycheckService.validateKeysWithCLI();
                const message = `CLI Validation complete: ${result.totalKeys} keys found, ${result.issues.length} issues`;

                if (result.issues.length > 0) {
                    const action = await vscode.window.showWarningMessage(
                        message,
                        'View Report'
                    );

                    if (action === 'View Report') {
                        const report = await flutterKeycheckService.generateReportWithCLI();
                        const doc = await vscode.workspace.openTextDocument({
                            content: report,
                            language: 'markdown'
                        });
                        await vscode.window.showTextDocument(doc);
                    }
                } else {
                    vscode.window.showInformationMessage(message);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`CLI validation failed: ${error}`);
            }
        })
    );

    // Show statistics command
    context.subscriptions.push(
        vscode.commands.registerCommand('flutterTestingKeys.showStatistics', async () => {
            const stats = keyScanner.getKeyStatistics();
            const coverage = stats.totalKeys > 0 ? (stats.usedKeys / stats.totalKeys * 100).toFixed(1) : '0';

            const message = `📊 Testing Keys Statistics

Total Keys: ${stats.totalKeys}
Used Keys: ${stats.usedKeys}
Unused Keys: ${stats.unusedKeys}
Coverage: ${coverage}%

Top Categories:
${Object.entries(stats.categoryCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([category, count]) => `• ${category}: ${count}`)
    .join('\n')}`;

            vscode.window.showInformationMessage(message, { modal: true });
        })
    );
}

function registerEventListeners(context: vscode.ExtensionContext) {
    // Auto-validate on file save
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async (document) => {
            if (document.languageId !== 'dart') {return;}

            const config = vscode.workspace.getConfiguration('flutterTestingKeys');
            const autoValidate = config.get('autoValidate', true);

            if (autoValidate) {
                // Refresh keys if KeyConstants file was saved
                if (document.fileName.includes('key_constants') ||
                    document.fileName.includes('constants')) {
                    await keyScanner.scanAllKeys(true);
                    treeProvider.refresh();
                }

                // Show diagnostic information
                const enableDiagnostics = config.get('enableDiagnostics', true);
                if (enableDiagnostics) {
                    // Could add diagnostic collection here
                }
            }
        })
    );

    // Refresh on configuration change
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('flutterTestingKeys')) {
                await keyScanner.scanAllKeys(true);
                treeProvider.refresh();
            }
        })
    );

    // Refresh when files are created/deleted
    context.subscriptions.push(
        vscode.workspace.onDidCreateFiles(async (e) => {
            const dartFiles = e.files.filter(file => file.path.endsWith('.dart'));
            if (dartFiles.length > 0) {
                await keyScanner.scanAllKeys(true);
                treeProvider.refresh();
            }
        })
    );

    context.subscriptions.push(
        vscode.workspace.onDidDeleteFiles(async (e) => {
            const dartFiles = e.files.filter(file => file.path.endsWith('.dart'));
            if (dartFiles.length > 0) {
                await keyScanner.scanAllKeys(true);
                treeProvider.refresh();
            }
        })
    );

    // Tree view selection
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (editor && editor.document.languageId === 'dart') {
                // Could highlight current file's keys in tree view
            }
        })
    );
}

export function deactivate() {
    console.log('Flutter Testing Keys Inspector deactivated');
}
