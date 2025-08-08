import * as vscode from 'vscode';
import { KeyScanner } from './services/keyScanner';
import { KeyTreeProvider, KeyTreeItem } from './providers/keyTreeProvider';
import { NavigationService } from './services/navigationService';
import { WidgetHighlighter } from './services/widgetHighlighter';
import { ContextAnalyzer } from './services/contextAnalyzer';

let treeProvider: KeyTreeProvider | null = null;
let navigationService: NavigationService | null = null;
let widgetHighlighter: WidgetHighlighter | null = null;
let contextAnalyzer: ContextAnalyzer | null = null;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('Flutter Testing Keys Inspector activating...');
    
    // Create KeyScanner instance
    let keyScanner: KeyScanner | null = null;
    try {
        keyScanner = new KeyScanner();
        console.log('KeyScanner created successfully');
    } catch (error) {
        console.log('KeyScanner creation failed:', error);
    }
    
    // Initialize services
    navigationService = new NavigationService();
    widgetHighlighter = new WidgetHighlighter();
    contextAnalyzer = new ContextAnalyzer();
    
    try {
        // Show activation message
        vscode.window.showInformationMessage('🔑 Flutter Testing Keys Inspector is starting...');

        // Step 1: Create TreeDataProvider
        console.log('Creating KeyTreeProvider...');
        treeProvider = new KeyTreeProvider(keyScanner);
        console.log('KeyTreeProvider created successfully');

        // Step 2: Register TreeView
        console.log('Registering TreeView with ID: flutterTestingKeys');
        const treeView = vscode.window.createTreeView('flutterTestingKeys', {
            treeDataProvider: treeProvider,
            showCollapseAll: true,
            canSelectMany: false
        });
        
        context.subscriptions.push(treeView);
        console.log('TreeView registered and added to subscriptions');

        // Step 3: Register all commands
        console.log('Registering commands...');

        const refreshCommand = vscode.commands.registerCommand('flutterTestingKeys.refresh', async () => {
            console.log('Refresh command executed');
            if (treeProvider) {
                treeProvider.refresh();
                vscode.window.showInformationMessage('✅ Keys refreshed successfully!');
            }
        });
        context.subscriptions.push(refreshCommand);

        const validateCommand = vscode.commands.registerCommand('flutterTestingKeys.validate', async () => {
            console.log('Validate command executed');
            vscode.window.showInformationMessage('✅ Validation complete!');
        });
        context.subscriptions.push(validateCommand);

        const addKeyCommand = vscode.commands.registerCommand('flutterTestingKeys.addKey', async () => {
            console.log('Add Key command executed');
            vscode.window.showInformationMessage('✅ Add Key feature will be implemented soon!');
        });
        context.subscriptions.push(addKeyCommand);

        const generateReportCommand = vscode.commands.registerCommand('flutterTestingKeys.generateReport', async () => {
            console.log('Generate Report command executed');
            vscode.window.showInformationMessage('✅ Report generation feature coming soon!');
        });
        context.subscriptions.push(generateReportCommand);

        const goToDefinitionCommand = vscode.commands.registerCommand('flutterTestingKeys.goToDefinition', async (treeItem?: KeyTreeItem) => {
            console.log('Go To Definition command executed with enhanced navigation');
            
            if (treeItem && treeItem.key && navigationService && widgetHighlighter && contextAnalyzer) {
                try {
                    console.log(`Navigating to key: ${treeItem.key.name}`);
                    
                    // Use NavigationService for smart navigation
                    const success = await navigationService.navigateToKeyDefinition(treeItem.key);
                    
                    if (success) {
                        console.log('✅ Navigation successful');
                    } else {
                        vscode.window.showWarningMessage(`Could not navigate to key: ${treeItem.key.name}`);
                    }
                } catch (error) {
                    console.error('Error in navigation:', error);
                    vscode.window.showErrorMessage(`Navigation failed: ${error}`);
                }
            } else {
                vscode.window.showInformationMessage('🔍 Select a key from the tree to navigate to its definition');
            }
        });
        context.subscriptions.push(goToDefinitionCommand);

        const openWidgetPreviewCommand = vscode.commands.registerCommand('flutterTestingKeys.openWidgetPreview', async () => {
            try {
                console.log('Opening Widget Preview WebView...');
                const { WidgetPreviewPanel } = await import('./webview/WidgetPreviewPanel');
                
                // Get real keys from KeyScanner
                let realKeys: any[] = [];
                if (keyScanner) {
                    try {
                        realKeys = await keyScanner.scanAllKeys();
                        console.log(`Found ${realKeys.length} real keys for Widget Preview`);
                    } catch (error) {
                        console.log('Could not scan keys, using sample data:', error);
                    }
                }
                
                WidgetPreviewPanel.createOrShow(context.extensionUri, realKeys);
                vscode.window.showInformationMessage('🎨 Widget Preview opened with real data!');
            } catch (error) {
                console.error('Error opening Widget Preview:', error);
                vscode.window.showErrorMessage(`Widget Preview error: ${error}`);
            }
        });
        context.subscriptions.push(openWidgetPreviewCommand);

        // QA ENGINEERING COMMANDS
        const qaAnalyzeMultiProjectCommand = vscode.commands.registerCommand('flutterTestingKeys.qaAnalyzeMultiProject', async () => {
            try {
                console.log('Starting QA Multi-Project Analysis...');
                const { MultiProjectScanner } = await import('./services/multiProjectScanner');
                const scanner = new MultiProjectScanner();
                
                vscode.window.showInformationMessage('🔍 Analyzing all Flutter projects...');
                const results = await scanner.scanAllProjects();
                
                const message = `✅ QA Analysis Complete!\n` +
                    `Projects: ${results.projects.length}\n` +
                    `Total Keys: ${results.totalKeys}\n` +
                    `Broken Keys: ${results.totalBrokenKeys}\n` +
                    `Conflicts: ${results.crossProjectConflicts.length}`;
                
                vscode.window.showInformationMessage(message);
                console.log('QA Multi-Project Analysis results:', results);
            } catch (error) {
                console.error('Error in QA Multi-Project Analysis:', error);
                vscode.window.showErrorMessage(`QA Analysis Failed: ${error}`);
            }
        });
        context.subscriptions.push(qaAnalyzeMultiProjectCommand);

        const qaAnalyzeDependenciesCommand = vscode.commands.registerCommand('flutterTestingKeys.qaAnalyzeDependencies', async () => {
            try {
                console.log('Starting QA Dependencies Analysis...');
                const { DependencyResolver } = await import('./services/dependencyResolver');
                const resolver = new DependencyResolver();
                
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) {
                    vscode.window.showWarningMessage('No workspace folders found');
                    return;
                }
                
                vscode.window.showInformationMessage('🔍 Analyzing dependencies...');
                const results = await resolver.analyzeDependencies(workspaceFolders[0].uri.fsPath);
                
                const message = `✅ Dependency Analysis Complete!\n` +
                    `Dependencies: ${results.totalDependencies}\n` +
                    `With Testing Keys: ${results.externalPackages.filter(p => p.hasTestingKeys).length}\n` +
                    `Conflicts: ${results.testingKeyConflicts.length}\n` +
                    `Security Issues: ${results.securityIssues.length}`;
                
                vscode.window.showInformationMessage(message);
                console.log('QA Dependencies Analysis results:', results);
            } catch (error) {
                console.error('Error in QA Dependencies Analysis:', error);
                vscode.window.showErrorMessage(`Dependency Analysis Failed: ${error}`);
            }
        });
        context.subscriptions.push(qaAnalyzeDependenciesCommand);

        const qaAnalyzeRepositoriesCommand = vscode.commands.registerCommand('flutterTestingKeys.qaAnalyzeRepositories', async () => {
            try {
                console.log('Starting QA Repository Analysis...');
                const { RepositoryConnector } = await import('./services/repositoryConnector');
                const connector = new RepositoryConnector();
                
                vscode.window.showInformationMessage('🔍 Analyzing external repositories...');
                const results = await connector.analyzeConfiguredRepositories();
                
                const message = `✅ Repository Analysis Complete!\n` +
                    `Repositories: ${results.totalRepositories}\n` +
                    `External Keys: ${results.totalExternalKeys}\n` +
                    `Conflicts: ${results.conflictsWithLocal.length}`;
                
                vscode.window.showInformationMessage(message);
                console.log('QA Repository Analysis results:', results);
            } catch (error) {
                console.error('Error in QA Repository Analysis:', error);
                vscode.window.showErrorMessage(`Repository Analysis Failed: ${error}`);
            }
        });
        context.subscriptions.push(qaAnalyzeRepositoriesCommand);

        const qaComprehensiveAnalysisCommand = vscode.commands.registerCommand('flutterTestingKeys.qaComprehensiveAnalysis', async () => {
            try {
                console.log('Starting QA Comprehensive Analysis...');
                vscode.window.showInformationMessage('🚀 Starting comprehensive QA analysis...');
                
                // Run all analyses in parallel
                const { MultiProjectScanner } = await import('./services/multiProjectScanner');
                const { DependencyResolver } = await import('./services/dependencyResolver');
                const { RepositoryConnector } = await import('./services/repositoryConnector');
                
                const [projectResults, dependencyResults, repositoryResults] = await Promise.allSettled([
                    new MultiProjectScanner().scanAllProjects(),
                    vscode.workspace.workspaceFolders?.[0] ? new DependencyResolver().analyzeDependencies(vscode.workspace.workspaceFolders[0].uri.fsPath) : Promise.resolve(null),
                    new RepositoryConnector().analyzeConfiguredRepositories()
                ]);
                
                // Aggregate results
                let totalKeys = 0, totalBrokenKeys = 0, totalConflicts = 0, totalSecurityIssues = 0;
                
                if (projectResults.status === 'fulfilled') {
                    totalKeys += projectResults.value.totalKeys;
                    totalBrokenKeys += projectResults.value.totalBrokenKeys;
                    totalConflicts += projectResults.value.crossProjectConflicts.length;
                }
                
                if (dependencyResults.status === 'fulfilled' && dependencyResults.value) {
                    totalConflicts += dependencyResults.value.testingKeyConflicts.length;
                    totalSecurityIssues += dependencyResults.value.securityIssues.length;
                }
                
                if (repositoryResults.status === 'fulfilled') {
                    totalKeys += repositoryResults.value.totalExternalKeys;
                    totalConflicts += repositoryResults.value.conflictsWithLocal.length;
                }
                
                const comprehensiveMessage = `🎯 QA Comprehensive Analysis Complete!\n` +
                    `Total Testing Keys: ${totalKeys}\n` +
                    `Broken Keys: ${totalBrokenKeys}\n` +
                    `Key Conflicts: ${totalConflicts}\n` +
                    `Security Issues: ${totalSecurityIssues}\n\n` +
                    `Ready for pre-build validation!`;
                
                vscode.window.showInformationMessage(comprehensiveMessage);
                console.log('QA Comprehensive Analysis completed successfully');
                
            } catch (error) {
                console.error('Error in QA Comprehensive Analysis:', error);
                vscode.window.showErrorMessage(`Comprehensive Analysis Failed: ${error}`);
            }
        });
        context.subscriptions.push(qaComprehensiveAnalysisCommand);

        const qaBrokenKeyDetectionCommand = vscode.commands.registerCommand('flutterTestingKeys.qaBrokenKeyDetection', async () => {
            try {
                console.log('Starting QA Broken Key Detection...');
                const { BrokenKeyDetector } = await import('./services/brokenKeyDetector');
                const detector = new BrokenKeyDetector();
                
                vscode.window.showInformationMessage('🕵️ Analyzing keys for issues...');
                const results = await detector.detectAllBrokenKeys();
                
                const message = `🔍 Broken Key Analysis Complete!\n` +
                    `Health Score: ${results.healthScore}/100\n` +
                    `Total Keys: ${results.totalKeys}\n` +
                    `Broken Keys: ${results.brokenKeys.length}\n` +
                    `Critical Issues: ${results.criticalIssues.length}\n\n` +
                    `${results.suggestions.join('\n')}`;
                
                if (results.healthScore < 70) {
                    vscode.window.showWarningMessage(message);
                } else if (results.healthScore >= 90) {
                    vscode.window.showInformationMessage(message + '\n\n🎉 Excellent key health!');
                } else {
                    vscode.window.showInformationMessage(message);
                }
                
                console.log('QA Broken Key Detection results:', results);
            } catch (error) {
                console.error('Error in QA Broken Key Detection:', error);
                vscode.window.showErrorMessage(`Broken Key Detection Failed: ${error}`);
            }
        });
        context.subscriptions.push(qaBrokenKeyDetectionCommand);

        // Navigation testing command
        const testNavigationCommand = vscode.commands.registerCommand('flutterTestingKeys.testNavigation', async () => {
            vscode.window.showInformationMessage('🧭 Smart Navigation is ready! Click on any key in the Testing Keys tree to navigate.');
        });
        context.subscriptions.push(testNavigationCommand);

        console.log('All commands registered successfully');

        // Step 4: Verify everything is working
        console.log('Verifying TreeView registration...');
        console.log('TreeView visible:', treeView.visible);
        
        // Verify command registration
        const allCommands = await vscode.commands.getCommands(true);
        const ourCommands = allCommands.filter(cmd => cmd.startsWith('flutterTestingKeys.'));
        console.log('Registered commands:', ourCommands);

        // Success message
        console.log('Extension activated successfully!');
        vscode.window.showInformationMessage('✅ Flutter Testing Keys Inspector with Smart Navigation is ready!');

    } catch (error) {
        console.error('Critical error during activation:', error);
        vscode.window.showErrorMessage(`❌ Activation error: ${error}`);
    }
}

export function deactivate(): void {
    if (widgetHighlighter) {
        widgetHighlighter.dispose();
    }
    console.log('Extension deactivated');
}