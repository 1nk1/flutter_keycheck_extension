import * as vscode from 'vscode';

import { KeyCategory, KeyStatistics, TestingKey } from '../models/testingKey';
import { KeyScanner } from '../services/keyScanner';
import { FileUtils } from '../utils/fileUtils';

export class KeyTreeProvider implements vscode.TreeDataProvider<KeyTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<KeyTreeItem | undefined | null | void> = new vscode.EventEmitter<KeyTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<KeyTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private showUnusedKeys: boolean = true;
    private searchQuery: string = '';

    constructor(private keyScanner: KeyScanner) {
        // Listen to configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('flutterTestingKeys.showUnusedKeys')) {
                this.showUnusedKeys = vscode.workspace.getConfiguration('flutterTestingKeys').get('showUnusedKeys', true);
                this.refresh();
            }
        });

        // Initialize configuration
        this.showUnusedKeys = vscode.workspace.getConfiguration('flutterTestingKeys').get('showUnusedKeys', true);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: KeyTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: KeyTreeItem): Promise<KeyTreeItem[]> {
        if (!element) {
            // Root level - return categories or search results
            if (this.searchQuery) {
                return this.getSearchResults();
            }
            return this.getCategories();
        } else if (element.contextValue === 'category') {
            // Category level - return keys in category
            return this.getKeysInCategory(element.category!);
        } else if (element.contextValue === 'search') {
            // Search results level - return matching keys
            return this.getSearchResults();
        }

        return [];
    }

    /**
     * Get category nodes
     */
    private async getCategories(): Promise<KeyTreeItem[]> {
        const keys = await this.keyScanner.scanAllKeys();
        const filteredKeys = this.filterKeys(keys);
        const categories = this.groupKeysByCategory(filteredKeys);

        const items: KeyTreeItem[] = [];

        // Add statistics node
        const stats = this.keyScanner.getKeyStatistics();
        items.push(new KeyTreeItem(
            `Statistics (${stats.totalKeys} total, ${stats.usedKeys} used)`,
            vscode.TreeItemCollapsibleState.Collapsed,
            'statistics',
            undefined,
            undefined,
            stats
        ));

        // Add category nodes
        for (const [category, categoryKeys] of Object.entries(categories)) {
            if (categoryKeys.length > 0) {
                items.push(new KeyTreeItem(
                    category,
                    vscode.TreeItemCollapsibleState.Expanded,
                    'category',
                    category as KeyCategory,
                    undefined,
                    undefined,
                    categoryKeys.length
                ));
            }
        }

        return items;
    }

    /**
     * Get keys in a specific category
     */
    private async getKeysInCategory(category: KeyCategory): Promise<KeyTreeItem[]> {
        const keys = await this.keyScanner.scanAllKeys();
        const categoryKeys = keys.filter(key => key.category === category);
        const filteredKeys = this.filterKeys(categoryKeys);

        return filteredKeys.map(key => new KeyTreeItem(
            key.name,
            vscode.TreeItemCollapsibleState.None,
            'key',
            undefined,
            key
        ));
    }

    /**
     * Get search results
     */
    private async getSearchResults(): Promise<KeyTreeItem[]> {
        if (!this.searchQuery) {
            return [];
        }

        const keys = await this.keyScanner.scanAllKeys();
        const matchingKeys = keys.filter(key =>
            key.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            key.value.toLowerCase().includes(this.searchQuery.toLowerCase())
        );

        const filteredKeys = this.filterKeys(matchingKeys);

        return filteredKeys.map(key => new KeyTreeItem(
            `${key.name} (${key.category})`,
            vscode.TreeItemCollapsibleState.None,
            'key',
            undefined,
            key
        ));
    }

    /**
     * Filter keys based on configuration
     */
    private filterKeys(keys: TestingKey[]): TestingKey[] {
        if (this.showUnusedKeys) {
            return keys;
        }
        return keys.filter(key => key.isUsed);
    }

    /**
     * Group keys by category
     */
    private groupKeysByCategory(keys: TestingKey[]): Record<string, TestingKey[]> {
        return keys.reduce((acc, key) => {
            const category = key.category.toString();
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(key);
            return acc;
        }, {} as Record<string, TestingKey[]>);
    }

    /**
     * Set search query
     */
    setSearchQuery(query: string): void {
        this.searchQuery = query;
        this.refresh();
    }

    /**
     * Clear search
     */
    clearSearch(): void {
        this.searchQuery = '';
        this.refresh();
    }

    /**
     * Toggle unused keys visibility
     */
    toggleUnusedKeys(): void {
        this.showUnusedKeys = !this.showUnusedKeys;

        // Update configuration
        vscode.workspace.getConfiguration('flutterTestingKeys').update(
            'showUnusedKeys',
            this.showUnusedKeys,
            vscode.ConfigurationTarget.Workspace
        );

        this.refresh();
    }
}

export class KeyTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly category?: KeyCategory,
        public readonly key?: TestingKey,
        public readonly statistics?: KeyStatistics,
        public readonly count?: number
    ) {
        super(label, collapsibleState);

        this.setupTreeItem();
    }

    private setupTreeItem(): void {
        switch (this.contextValue) {
            case 'category':
                this.setupCategoryItem();
                break;
            case 'key':
                this.setupKeyItem();
                break;
            case 'statistics':
                this.setupStatisticsItem();
                break;
        }
    }

    private setupCategoryItem(): void {
        this.description = `${this.count} keys`;
        this.iconPath = new vscode.ThemeIcon('folder');

        // Add color based on category
        if (this.category) {
            this.iconPath = this.getCategoryIcon(this.category);
        }
    }

    private setupKeyItem(): void {
        if (!this.key) {return;}

        this.description = this.key.value;
        this.tooltip = this.createKeyTooltip();

        // Set icon based on usage status
        if (this.key.isUsed) {
            this.iconPath = new vscode.ThemeIcon('key', new vscode.ThemeColor('charts.green'));
        } else {
            this.iconPath = new vscode.ThemeIcon('key', new vscode.ThemeColor('charts.orange'));
        }

        // Add command to open file
        this.command = {
            command: 'vscode.open',
            title: 'Open',
            arguments: [
                vscode.Uri.file(this.key.filePath),
                {
                    selection: new vscode.Range(
                        this.key.line - 1, 0,
                        this.key.line - 1, 0
                    )
                }
            ]
        };
    }

    private setupStatisticsItem(): void {
        this.iconPath = new vscode.ThemeIcon('graph');
        this.description = 'Project overview';

        if (this.statistics) {
            this.tooltip = this.createStatisticsTooltip();
        }
    }

    private createKeyTooltip(): vscode.MarkdownString {
        if (!this.key) {return new vscode.MarkdownString('');}

        const tooltip = new vscode.MarkdownString();
        tooltip.appendMarkdown(`**${this.key.name}**\n\n`);
        tooltip.appendMarkdown(`**Value:** \`${this.key.value}\`\n\n`);
        tooltip.appendMarkdown(`**Category:** ${this.key.category}\n\n`);
        tooltip.appendMarkdown(`**Status:** ${this.key.isUsed ? '✅ Used' : '⚠️ Unused'}\n\n`);

        if (this.key.usageCount && this.key.usageCount > 0) {
            tooltip.appendMarkdown(`**Usage Count:** ${this.key.usageCount}\n\n`);
        }

        tooltip.appendMarkdown(`**File:** ${FileUtils.getRelativePath(this.key.filePath)}:${this.key.line}\n\n`);

        if (this.key.usageFiles && this.key.usageFiles.length > 0) {
            tooltip.appendMarkdown(`**Used in ${this.key.usageFiles.length} files:**\n`);
            this.key.usageFiles.slice(0, 5).forEach(file => {
                tooltip.appendMarkdown(`- ${FileUtils.getRelativePath(file)}\n`);
            });

            if (this.key.usageFiles.length > 5) {
                tooltip.appendMarkdown(`- ... and ${this.key.usageFiles.length - 5} more\n`);
            }
        }

        return tooltip;
    }

    private createStatisticsTooltip(): vscode.MarkdownString {
        const tooltip = new vscode.MarkdownString();
        tooltip.appendMarkdown(`**Project Statistics**\n\n`);

        if (this.statistics) {
            tooltip.appendMarkdown(`**Total Keys:** ${this.statistics.totalKeys}\n`);
            tooltip.appendMarkdown(`**Used Keys:** ${this.statistics.usedKeys}\n`);
            tooltip.appendMarkdown(`**Unused Keys:** ${this.statistics.unusedKeys}\n\n`);

            const coverage = this.statistics.totalKeys > 0
                ? (this.statistics.usedKeys / this.statistics.totalKeys * 100).toFixed(1)
                : '0';
            tooltip.appendMarkdown(`**Coverage:** ${coverage}%\n\n`);

            if (this.statistics.categoryCounts) {
                tooltip.appendMarkdown(`**By Category:**\n`);
                Object.entries(this.statistics.categoryCounts).forEach(([category, count]) => {
                    tooltip.appendMarkdown(`- ${category}: ${count}\n`);
                });
            }
        }

        return tooltip;
    }

    private getCategoryIcon(category: KeyCategory): vscode.ThemeIcon {
        switch (category) {
            case KeyCategory.Buttons:
                return new vscode.ThemeIcon('circle-filled');
            case KeyCategory.TextFields:
                return new vscode.ThemeIcon('edit');
            case KeyCategory.Checkboxes:
                return new vscode.ThemeIcon('check');
            case KeyCategory.Dropdowns:
                return new vscode.ThemeIcon('chevron-down');
            case KeyCategory.Navigation:
                return new vscode.ThemeIcon('arrow-right');
            case KeyCategory.Lists:
                return new vscode.ThemeIcon('list-unordered');
            case KeyCategory.Cards:
                return new vscode.ThemeIcon('credit-card');
            case KeyCategory.Dialogs:
                return new vscode.ThemeIcon('comment-discussion');
            case KeyCategory.GameElements:
                return new vscode.ThemeIcon('game');
            case KeyCategory.Settings:
                return new vscode.ThemeIcon('settings-gear');
            default:
                return new vscode.ThemeIcon('symbol-misc');
        }
    }
}
