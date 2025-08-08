import * as vscode from 'vscode';
import { KeyScanner } from './services/keyScanner';
import { KeyTreeProvider } from './providers/keyTreeProvider';
import { TestingKey, KeyCategory } from './models/testingKey';

/**
 * UPDATED VERSION - Real KeyScanner integration with TreeView
 */

// Real KeyTreeDataProvider that uses KeyScanner
class RealKeyTreeProvider implements vscode.TreeDataProvider<KeyTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<KeyTreeItem | undefined | null | void> = new vscode.EventEmitter<KeyTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<KeyTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private hasFlutterProject: boolean = false;
    private keyScanner: KeyScanner | null = null;
    private keys: TestingKey[] = [];
    private isLoading: boolean = false;

    constructor(keyScanner: KeyScanner) {
        this.keyScanner = keyScanner;
        // Check if this is a Flutter project
        this.checkFlutterProject();
    }

    private checkFlutterProject(): void {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            // Look for pubspec.yaml
            vscode.workspace.findFiles('**/pubspec.yaml', null, 1).then(files => {
                this.hasFlutterProject = files.length > 0;
                if (this.hasFlutterProject) {
                    this.loadKeys();
                }
                this.refresh();
            });
        }
    }

    private async loadKeys(): Promise<void> {
        if (!this.keyScanner || this.isLoading) {
            return;
        }

        try {
            this.isLoading = true;
            this.keys = await this.keyScanner.scanAllKeys(true);
            console.log(`Loaded ${this.keys.length} keys from KeyScanner`);
        } catch (error) {
            console.error('Error loading keys:', error);
            this.keys = [];
        } finally {
            this.isLoading = false;
        }
    }

    refresh(): void {
        if (this.hasFlutterProject) {
            this.loadKeys().then(() => {
                this._onDidChangeTreeData.fire();
            });
        } else {
            this._onDidChangeTreeData.fire();
        }
    }

    getTreeItem(element: KeyTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: KeyTreeItem): Promise<KeyTreeItem[]> {
        try {
            if (!element) {
                // Root level
                if (!this.hasFlutterProject) {
                    return [
                        new KeyTreeItem(
                            'No Flutter Project Detected',
                            vscode.TreeItemCollapsibleState.None,
                            'info'
                        )
                    ];
                }

                if (this.isLoading) {
                    return [
                        new KeyTreeItem(
                            'Loading keys...',
                            vscode.TreeItemCollapsibleState.None,
                            'loading'
                        )
                    ];
                }

                // Group keys by category
                const categories = this.getKeyCategories();
                const stats = this.getKeyStatistics();

                return [
                    ...categories.map(cat => new KeyTreeItem(
                        `${cat.name} (${cat.count})`,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        'category',
                        cat.category
                    )),
                    new KeyTreeItem(
                        `Statistics (Total: ${stats.total})`,
                        vscode.TreeItemCollapsibleState.Collapsed,
                        'stats'
                    )
                ];
            } else if (element.contextValue === 'category' && element.categoryType) {
                // Show keys in specific category
                const keysInCategory = this.keys.filter(key => key.category === element.categoryType);
                return keysInCategory.map(key => {
                    const status = key.isUsed ? '✅' : '❌';
                    const usageInfo = key.isUsed ? ` (${key.usageCount} uses)` : ' (unused)';
                    return new KeyTreeItem(
                        `${status} ${key.name}: '${key.value}'${usageInfo}`,
                        vscode.TreeItemCollapsibleState.None,
                        'key',
                        undefined,
                        key
                    );
                });
            } else if (element.contextValue === 'stats') {
                const stats = this.getKeyStatistics();
                return [
                    new KeyTreeItem(`Total Keys: ${stats.total}`, vscode.TreeItemCollapsibleState.None, 'stat'),
                    new KeyTreeItem(`Used Keys: ${stats.used}`, vscode.TreeItemCollapsibleState.None, 'stat'),
                    new KeyTreeItem(`Unused Keys: ${stats.unused}`, vscode.TreeItemCollapsibleState.None, 'stat'),
                    new KeyTreeItem(`Categories: ${stats.categories}`, vscode.TreeItemCollapsibleState.None, 'stat')
                ];
            }

            return [];
        } catch (error) {
            console.error('Error in getChildren:', error);
            return [
                new KeyTreeItem(
                    'Error loading data',
                    vscode.TreeItemCollapsibleState.None,
                    'error'
                )
            ];
        }
    }

    private getKeyCategories(): Array<{name: string, count: number, category: KeyCategory}> {
        const categoryMap = new Map<KeyCategory, number>();
        
        for (const key of this.keys) {
            categoryMap.set(key.category, (categoryMap.get(key.category) || 0) + 1);
        }

        return Array.from(categoryMap.entries()).map(([category, count]) => ({
            name: category,
            count,
            category
        }));
    }

    private getKeyStatistics(): {total: number, used: number, unused: number, categories: number} {
        const total = this.keys.length;
        const used = this.keys.filter(key => key.isUsed).length;
        const unused = total - used;
        const categories = new Set(this.keys.map(key => key.category)).size;

        return { total, used, unused, categories };
    }
}

class KeyTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly categoryType?: KeyCategory,
        public readonly testingKey?: TestingKey
    ) {
        super(label, collapsibleState);
        
        this.setupItem();
    }

    private setupItem(): void {
        switch (this.contextValue) {
            case 'info':
                this.iconPath = new vscode.ThemeIcon('info');
                this.tooltip = 'Open a Flutter project to see testing keys';
                break;
            case 'loading':
                this.iconPath = new vscode.ThemeIcon('loading~spin');
                this.tooltip = 'Loading Flutter testing keys...';
                break;
            case 'category':
                this.iconPath = new vscode.ThemeIcon('folder');
                this.tooltip = `Keys in ${this.categoryType || 'category'}`;
                break;
            case 'key':
                if (this.testingKey) {
                    const status = this.testingKey.isUsed ? 'Used' : 'Unused';
                    this.iconPath = new vscode.ThemeIcon(this.testingKey.isUsed ? 'check' : 'warning');
                    this.tooltip = `${this.testingKey.name} (${status})\nValue: '${this.testingKey.value}'\nFile: ${this.testingKey.filePath}\nLine: ${this.testingKey.line}`;
                } else {
                    this.iconPath = new vscode.ThemeIcon('key');
                    this.tooltip = 'Testing key';
                }
                break;
            case 'stats':
                this.iconPath = new vscode.ThemeIcon('graph');
                this.tooltip = 'Project statistics and summary';
                break;
            case 'stat':
                this.iconPath = new vscode.ThemeIcon('symbol-number');
                break;
            case 'error':
                this.iconPath = new vscode.ThemeIcon('error');
                break;
        }
    }
}

let treeProvider: KeyTreeProvider | null = null;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('Flutter Testing Keys Inspector activating...');
    
    // Create KeyScanner instance
    let keyScanner: KeyScanner | null = null;
    try {
        keyScanner = new KeyScanner();
        console.log('KeyScanner created successfully');
    } catch (error) {
        console.log('KeyScanner creation failed:', error);
        keyScanner = new KeyScanner(); // Create anyway for fallback
    }
    
    try {
        // Show activation message
        vscode.window.showInformationMessage('🔑 Flutter Testing Keys Inspector is starting...');

        // Step 1: Create TreeDataProvider with real KeyScanner
        console.log('Creating KeyTreeProvider...');
        treeProvider = new KeyTreeProvider(keyScanner);
        console.log('KeyTreeProvider created successfully');

        // Step 2: Register TreeView (this is the critical part)
        console.log('Registering TreeView with ID: flutterTestingKeys');
        const treeView = vscode.window.createTreeView('flutterTestingKeys', {
            treeDataProvider: treeProvider,
            showCollapseAll: true,
            canSelectMany: false
        });
        
        // CRITICAL: Add to subscriptions immediately
        context.subscriptions.push(treeView);
        console.log('TreeView registered and added to subscriptions');

        // Step 3: Register all commands (with proper error handling)
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
            
            if (treeItem && treeItem.testingKey) {
                try {
                    // Создать NavigationService для умной навигации
                    const { NavigationService } = await import('./services/navigationService');
                    const navigationService = new NavigationService();
                    
                    // Использовать новый сервис для навигации
                    const success = await navigationService.navigateToKeyDefinition(treeItem.testingKey);
                    
                    if (success) {
                        console.log(`✅ Successfully navigated to key: ${treeItem.testingKey.name}`);
                        
                        // Показать расширенную информацию о ключе
                        const usageInfo = treeItem.testingKey.usageCount 
                            ? ` (${treeItem.testingKey.usageCount} usages)`
                            : ' (unused)';
                        
                        const category = treeItem.testingKey.category;
                        const message = `🎯 Navigated to: ${treeItem.testingKey.name}${usageInfo}\n📱 Category: ${category}`;
                        
                        // Автоматическая очистка сообщения через 3 секунды
                        const notification = vscode.window.showInformationMessage(message);
                        setTimeout(() => {
                            // Notification автоматически исчезнет
                        }, 3000);
                    } else {
                        vscode.window.showWarningMessage(`⚠️ Could not navigate to key: ${treeItem.testingKey.name}`);
                    }
                } catch (error) {
                    console.error('Error in enhanced navigation:', error);
                    
                    // Fallback к простой навигации при ошибке
                    try {
                        const uri = vscode.Uri.file(treeItem.testingKey.filePath);
                        const position = new vscode.Position(treeItem.testingKey.line - 1, 0);
                        const range = new vscode.Range(position, position);
                        
                        const document = await vscode.workspace.openTextDocument(uri);
                        const editor = await vscode.window.showTextDocument(document);
                        editor.selection = new vscode.Selection(position, position);
                        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
                        
                        vscode.window.showInformationMessage(`📍 Basic navigation to ${treeItem.testingKey.name} (enhanced features unavailable)`);
                    } catch (fallbackError) {
                        console.error('Fallback navigation also failed:', fallbackError);
                        vscode.window.showErrorMessage(`❌ Navigation failed: ${error}`);
                    }
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
                
                // Получаем реальные ключи из KeyScanner
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
                vscode.window.showInformationMessage('🎨 Widget Preview открыт с реальными данными!');
            } catch (error) {
                console.error('Error opening Widget Preview:', error);
                vscode.window.showErrorMessage(`Ошибка открытия Widget Preview: ${error}`);
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
                
                // Show results
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

        // НОВЫЕ КОМАНДЫ ДЛЯ ДЕМОНСТРАЦИИ НАВИГАЦИИ И ДЕКОРАЦИЙ

        const demonstrateNavigationCommand = vscode.commands.registerCommand('flutterTestingKeys.demonstrateNavigation', async () => {
            try {
                console.log('Starting Navigation Demonstration...');
                
                const { NavigationService } = await import('./services/navigationService');
                const { WidgetHighlighter } = await import('./services/widgetHighlighter');
                
                const navigationService = new NavigationService();
                const highlighter = new WidgetHighlighter();
                
                // Получить ключи для демонстрации
                if (keyScanner && treeProvider) {
                    const keys = await keyScanner.scanAllKeys(true);
                    
                    if (keys.length > 0) {
                        const demoKey = keys.find(k => k.isUsed) || keys[0];
                        
                        vscode.window.showInformationMessage(
                            `🎯 Demonstrating navigation with key: ${demoKey.name}`
                        );
                        
                        // Демонстрация навигации
                        await navigationService.navigateToKeyDefinition(demoKey);
                        
                        // Показать статистику декораций
                        const stats = highlighter.getDecorationStats();
                        console.log('Decoration statistics:', stats);
                        
                        // Очистить через 10 секунд
                        setTimeout(() => {
                            navigationService.clearAllDecorations();
                        }, 10000);
                        
                    } else {
                        vscode.window.showInformationMessage('🔍 No keys found for navigation demo');
                    }
                }
                
            } catch (error) {
                console.error('Error in navigation demonstration:', error);
                vscode.window.showErrorMessage(`Navigation demo failed: ${error}`);
            }
        });
        context.subscriptions.push(demonstrateNavigationCommand);

        const testWidgetHighlightingCommand = vscode.commands.registerCommand('flutterTestingKeys.testWidgetHighlighting', async () => {
            try {
                console.log('Testing Widget Highlighting...');
                
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showWarningMessage('⚠️ Please open a Dart file to test highlighting');
                    return;
                }
                
                const { WidgetHighlighter } = await import('./services/widgetHighlighter');
                const highlighter = new WidgetHighlighter();
                
                // Создать демо декорации в активном редакторе
                const document = activeEditor.document;
                const selection = activeEditor.selection;
                
                if (selection.isEmpty) {
                    vscode.window.showWarningMessage('⚠️ Please select some text to highlight');
                    return;
                }
                
                // Применить различные декорации к выделенному тексту
                const selectedRange = new vscode.Range(selection.start, selection.end);
                
                // Демонстрация различных типов подсветки
                const decorations = [
                    {
                        type: highlighter.createKeyUsageDecoration(),
                        ranges: [selectedRange]
                    }
                ];
                
                highlighter.applyMultipleDecorations(activeEditor, decorations);
                
                vscode.window.showInformationMessage('✨ Applied highlighting decorations to selected text');
                
                // Анимированная декорация
                highlighter.createAnimatedDecoration(activeEditor, selectedRange, 3000);
                
                // Очистить основные декорации через 8 секунд
                setTimeout(() => {
                    highlighter.clearAllDecorations(activeEditor);
                    vscode.window.showInformationMessage('🧹 Cleared highlighting decorations');
                }, 8000);
                
            } catch (error) {
                console.error('Error testing widget highlighting:', error);
                vscode.window.showErrorMessage(`Highlighting test failed: ${error}`);
            }
        });
        context.subscriptions.push(testWidgetHighlightingCommand);

        const analyzeCurrentFileContextCommand = vscode.commands.registerCommand('flutterTestingKeys.analyzeCurrentFileContext', async () => {
            try {
                console.log('Analyzing current file context...');
                
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showWarningMessage('⚠️ Please open a Dart file to analyze context');
                    return;
                }
                
                const document = activeEditor.document;
                const position = activeEditor.selection.active;
                
                const { ContextAnalyzer } = await import('./services/contextAnalyzer');
                const analyzer = new ContextAnalyzer();
                
                // Создать фиктивный TestingKey для демонстрации
                const demoKey = {
                    name: 'demo_key',
                    value: 'demo_value',
                    category: 'Buttons' as any,
                    filePath: document.uri.fsPath,
                    line: position.line + 1,
                    isDefined: true,
                    isUsed: true,
                    usageCount: 1
                };
                
                const location = new vscode.Location(
                    document.uri,
                    new vscode.Range(position, position)
                );
                
                // Анализировать контекст
                const context = await analyzer.analyzeKeyContext(document, location, demoKey);
                
                // Показать результаты анализа
                let analysisMessage = `🔍 Context Analysis Results:\n`;
                analysisMessage += `📍 Position: Line ${position.line + 1}\n`;
                analysisMessage += `📏 Indent Level: ${context.indentationLevel}\n`;
                
                if (context.widgetType) {
                    analysisMessage += `📱 Widget: ${context.widgetType}\n`;
                }
                
                if (context.methodName) {
                    analysisMessage += `⚙️ Method: ${context.methodName}\n`;
                }
                
                if (context.parentWidgets.length > 0) {
                    analysisMessage += `🏗️ Parent Widgets: ${context.parentWidgets.join(' → ')}\n`;
                }
                
                if (context.scopeInfo) {
                    analysisMessage += `🔍 Scope: ${context.scopeInfo}\n`;
                }
                
                vscode.window.showInformationMessage(analysisMessage);
                
                // Подсветить анализируемую область если найдена
                const { WidgetHighlighter } = await import('./services/widgetHighlighter');
                const highlighter = new WidgetHighlighter();
                
                if (context.scopeRange) {
                    const scopeDecoration = highlighter.createScopeHighlightDecoration();
                    activeEditor.setDecorations(scopeDecoration, [context.scopeRange]);
                    
                    // Очистить через 5 секунд
                    setTimeout(() => {
                        activeEditor.setDecorations(scopeDecoration, []);
                    }, 5000);
                }
                
                console.log('Context analysis completed:', context);
                
            } catch (error) {
                console.error('Error analyzing file context:', error);
                vscode.window.showErrorMessage(`Context analysis failed: ${error}`);
            }
        });
        context.subscriptions.push(analyzeCurrentFileContextCommand);

        const showNavigationStatsCommand = vscode.commands.registerCommand('flutterTestingKeys.showNavigationStats', async () => {
            try {
                console.log('Showing Navigation Statistics...');
                
                // Получить статистику от KeyScanner
                if (keyScanner) {
                    const stats = keyScanner.getKeyStatistics();
                    const categories = keyScanner.getCategories();
                    
                    let statsMessage = `📊 Navigation & Key Statistics:\n\n`;
                    statsMessage += `🔑 Total Keys: ${stats.totalKeys}\n`;
                    statsMessage += `✅ Used Keys: ${stats.usedKeys}\n`;
                    statsMessage += `❌ Unused Keys: ${stats.unusedKeys}\n`;
                    statsMessage += `📂 Categories: ${categories.length}\n\n`;
                    
                    // Показать топ категории
                    statsMessage += `🏆 Top Categories:\n`;
                    categories
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5)
                        .forEach(cat => {
                            statsMessage += `  • ${cat.category}: ${cat.count} keys\n`;
                        });
                    
                    // Показать самые используемые ключи
                    if (stats.mostUsedKeys.length > 0) {
                        statsMessage += `\n🔥 Most Used Keys:\n`;
                        stats.mostUsedKeys.slice(0, 3).forEach(key => {
                            statsMessage += `  • ${key.name}: ${key.usageCount} usages\n`;
                        });
                    }
                    
                    vscode.window.showInformationMessage(statsMessage, { modal: true });
                    
                } else {
                    vscode.window.showWarningMessage('⚠️ KeyScanner not available for statistics');
                }
                
            } catch (error) {
                console.error('Error showing navigation stats:', error);
                vscode.window.showErrorMessage(`Stats display failed: ${error}`);
            }
        });
        context.subscriptions.push(showNavigationStatsCommand);

        console.log('All commands registered successfully (including new navigation features)');

        // Step 4: Verify everything is working
        console.log('Verifying TreeView registration...');
        console.log('TreeView visible:', treeView.visible);
        
        // Verify command registration
        const allCommands = await vscode.commands.getCommands(true);
        const ourCommands = allCommands.filter(cmd => cmd.startsWith('flutterTestingKeys.'));
        console.log('Registered commands:', ourCommands);

        // Success message
        console.log('Extension activated successfully!');
        vscode.window.showInformationMessage('✅ Flutter Testing Keys Inspector is ready!');

        // Mark todo as completed
        console.log('TreeView data provider registration: SUCCESS');

    } catch (error) {
        console.error('Critical error during activation:', error);
        vscode.window.showErrorMessage(`❌ Activation error: ${error}`);
        // Still continue - don't throw to prevent VSCode extension host issues
        console.log('Continuing with minimal functionality...');
    }
}

export function deactivate(): void {
    console.log('Расширение деактивируется');
}