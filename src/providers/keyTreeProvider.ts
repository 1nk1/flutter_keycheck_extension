import * as vscode from 'vscode';

import { KeyCategory, KeyStatistics, TestingKey } from '../models/testingKey';
import { KeyScanner } from '../services/keyScanner';
import { FileUtils } from '../utils/fileUtils';

interface WidgetContext {
    widgetType: string;
    context: string;
    lineText: string;
    fileName: string;
}

export class KeyTreeProvider implements vscode.TreeDataProvider<KeyTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<KeyTreeItem | undefined | null | void> = new vscode.EventEmitter<KeyTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<KeyTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private showUnusedKeys: boolean = true;
    private searchQuery: string = '';

    constructor(private keyScanner: KeyScanner | null) {
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

    /**
     * Get empty state when no key scanner available
     */
    private getEmptyState(): KeyTreeItem[] {
        const emptyItem = new KeyTreeItem(
            'No Flutter project detected',
            vscode.TreeItemCollapsibleState.None,
            'empty'
        );
        emptyItem.tooltip = 'Open a Flutter project to see testing keys';
        emptyItem.iconPath = new vscode.ThemeIcon('info');
        return [emptyItem];
    }

    getTreeItem(element: KeyTreeItem): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: KeyTreeItem): Promise<KeyTreeItem[]> {
        // If no keyScanner, return empty state
        if (!this.keyScanner) {
            return this.getEmptyState();
        }

        if (!element) {
            // Root level - return categories or search results
            if (this.searchQuery) {
                return this.getSearchResults();
            }
            return this.getCategories();
        } else if (element.contextValue === 'category') {
            // Category level - return keys in category
            return this.getKeysInCategory(element.category!);
        } else if (element.contextValue === 'key' && element.key) {
            // Key level - return usage locations
            return this.getKeyUsageLocations(element.key);
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
        const keys = await this.keyScanner!.scanAllKeys();
        const filteredKeys = this.filterKeys(keys);
        const categories = this.groupKeysByCategory(filteredKeys);

        const items: KeyTreeItem[] = [];

        // Add statistics node
        const stats = this.keyScanner!.getKeyStatistics();
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
        const keys = await this.keyScanner!.scanAllKeys();
        const categoryKeys = keys.filter(key => key.category === category);
        const filteredKeys = this.filterKeys(categoryKeys);

        const items: KeyTreeItem[] = [];
        
        for (const key of filteredKeys) {
            // Main key item
            const keyItem = new KeyTreeItem(
                key.name,
                key.usageLocations && key.usageLocations.length > 0 ? 
                    vscode.TreeItemCollapsibleState.Collapsed : 
                    vscode.TreeItemCollapsibleState.None,
                'key',
                undefined,
                key
            );
            items.push(keyItem);
            
            // Add usage locations as children if expanded
            if (key.usageLocations && key.usageLocations.length > 0) {
                // This will be handled in getChildren for expandable items
            }
        }
        
        return items;
    }

    /**
     * Get search results
     */
    private async getSearchResults(): Promise<KeyTreeItem[]> {
        if (!this.searchQuery) {
            return [];
        }

        const keys = await this.keyScanner!.scanAllKeys();
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
     * Get usage locations for a specific key
     */
    private async getKeyUsageLocations(key: TestingKey): Promise<KeyTreeItem[]> {
        if (!key.usageLocations || key.usageLocations.length === 0) {
            return [];
        }

        const usageItems: KeyTreeItem[] = [];
        
        for (let i = 0; i < key.usageLocations.length; i++) {
            const location = key.usageLocations[i];
            const fileName = this.getFileName(location.uri.fsPath);
            const lineNum = location.range.start.line + 1;
            
            // Get widget context for this usage
            const widgetContext = await this.getWidgetContext(location);
            
            const usageItem = new KeyTreeItem(
                `${fileName}:${lineNum} - ${widgetContext.widgetType}`,
                vscode.TreeItemCollapsibleState.None,
                'usage',
                undefined,
                key,
                undefined,
                undefined,
                i,
                location,
                widgetContext
            );
            
            usageItems.push(usageItem);
        }
        
        return usageItems;
    }

    /**
     * Get widget context for a key usage location
     */
    private async getWidgetContext(location: vscode.Location): Promise<WidgetContext> {
        try {
            const document = await vscode.workspace.openTextDocument(location.uri);
            const line = document.lineAt(location.range.start.line);
            const lineText = line.text;
            
            // Extract widget type from the line
            const widgetMatch = lineText.match(/\b([A-Z]\w*(?:Button|Field|Dialog|Card|List|Tab|Icon|Widget))\b/);
            const widgetType = widgetMatch ? widgetMatch[1] : 'Widget';
            
            // Get surrounding context (3 lines before and after)
            const startLine = Math.max(0, location.range.start.line - 3);
            const endLine = Math.min(document.lineCount - 1, location.range.start.line + 3);
            
            let context = '';
            for (let i = startLine; i <= endLine; i++) {
                const contextLine = document.lineAt(i);
                const prefix = i === location.range.start.line ? '→ ' : '  ';
                context += `${prefix}${i + 1}: ${contextLine.text.trim()}\n`;
            }
            
            return {
                widgetType,
                context,
                lineText: lineText.trim(),
                fileName: this.getFileName(location.uri.fsPath)
            };
        } catch (error) {
            return {
                widgetType: 'Unknown',
                context: 'Unable to read file context',
                lineText: '',
                fileName: this.getFileName(location.uri.fsPath)
            };
        }
    }

    /**
     * Get filename from full path
     */
    private getFileName(filePath: string): string {
        const parts = filePath.split('/');
        return parts[parts.length - 1];
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
        public readonly count?: number,
        public readonly usageIndex?: number,
        public readonly location?: vscode.Location,
        public readonly widgetContext?: WidgetContext
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
            case 'usage':
                this.setupUsageItem();
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

        // Add command to use smart navigation
        this.command = {
            command: 'flutterTestingKeys.goToDefinition',
            title: 'Go to Definition',
            arguments: [this]
        };
    }

    private setupStatisticsItem(): void {
        this.iconPath = new vscode.ThemeIcon('graph');
        this.description = 'Project overview';

        if (this.statistics) {
            this.tooltip = this.createStatisticsTooltip();
        }
    }

    private setupUsageItem(): void {
        if (!this.location || !this.widgetContext) {
            return;
        }

        // Set description with visual widget indicator
        const widgetEmoji = this.getWidgetEmoji(this.widgetContext.widgetType);
        this.description = `${widgetEmoji} ${this.widgetContext.lineText.length > 40 
            ? this.widgetContext.lineText.substring(0, 40) + '...'
            : this.widgetContext.lineText}`;

        // Set icon based on widget type
        this.iconPath = this.getWidgetIcon(this.widgetContext.widgetType);
        
        // Create tooltip with widget context and visual preview
        this.tooltip = this.createUsageTooltip();

        // Add command to use smart navigation
        this.command = {
            command: 'flutterTestingKeys.goToDefinition',
            title: 'Go to Usage',
            arguments: [this]
        };
    }

    /**
     * Get emoji representation for widget type
     */
    private getWidgetEmoji(widgetType: string): string {
        switch (widgetType.toLowerCase()) {
            case 'elevatedbutton':
            case 'textbutton':
            case 'outlinedbutton':
                return '🔘';
            case 'textfield':
            case 'textformfield':
                return '📝';
            case 'checkbox':
                return '☑️';
            case 'card':
                return '🗃️';
            case 'listview':
            case 'listtile':
                return '📋';
            case 'dialog':
            case 'alertdialog':
                return '💬';
            case 'appbar':
                return '📊';
            case 'floatingactionbutton':
                return '➕';
            case 'container':
                return '📦';
            case 'scaffold':
                return '🏗️';
            case 'column':
            case 'row':
                return '📐';
            case 'image':
                return '🖼️';
            case 'icon':
                return '🎨';
            default:
                return '🧩';
        }
    }

    /**
     * Get VS Code icon for widget type
     */
    private getWidgetIcon(widgetType: string): vscode.ThemeIcon {
        switch (widgetType.toLowerCase()) {
            case 'elevatedbutton':
            case 'textbutton':
            case 'outlinedbutton':
                return new vscode.ThemeIcon('zap', new vscode.ThemeColor('charts.blue'));
            case 'textfield':
            case 'textformfield':
                return new vscode.ThemeIcon('edit', new vscode.ThemeColor('charts.green'));
            case 'checkbox':
                return new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.purple'));
            case 'card':
                return new vscode.ThemeIcon('credit-card', new vscode.ThemeColor('charts.orange'));
            case 'listview':
            case 'listtile':
                return new vscode.ThemeIcon('list-unordered', new vscode.ThemeColor('charts.yellow'));
            case 'dialog':
            case 'alertdialog':
                return new vscode.ThemeIcon('comment-discussion', new vscode.ThemeColor('charts.red'));
            case 'appbar':
                return new vscode.ThemeIcon('browser', new vscode.ThemeColor('charts.blue'));
            case 'floatingactionbutton':
                return new vscode.ThemeIcon('add', new vscode.ThemeColor('charts.green'));
            case 'container':
                return new vscode.ThemeIcon('package', new vscode.ThemeColor('charts.gray'));
            default:
                return new vscode.ThemeIcon('symbol-method', new vscode.ThemeColor('charts.blue'));
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

    private createUsageTooltip(): vscode.MarkdownString {
        if (!this.widgetContext || !this.location) {
            return new vscode.MarkdownString('');
        }

        const tooltip = new vscode.MarkdownString();
        tooltip.supportHtml = true;
        
        // Add visual widget preview
        const widgetPreview = this.generateWidgetPreview(this.widgetContext.widgetType, this.key?.name || '');
        tooltip.appendMarkdown(`**🎨 Widget Preview**\n\n`);
        tooltip.appendMarkdown(widgetPreview);
        tooltip.appendMarkdown(`\n\n---\n\n`);
        
        tooltip.appendMarkdown(`**📍 Usage Location**\n\n`);
        tooltip.appendMarkdown(`**File:** ${this.widgetContext.fileName}\n\n`);
        tooltip.appendMarkdown(`**Widget:** ${this.widgetContext.widgetType}\n\n`);
        tooltip.appendMarkdown(`**Line:** ${this.location.range.start.line + 1}\n\n`);
        
        if (this.key) {
            tooltip.appendMarkdown(`**Key:** \`${this.key.name}\` = \`${this.key.value}\`\n\n`);
        }
        
        tooltip.appendMarkdown(`**📋 Code Context:**\n`);
        tooltip.appendCodeblock(this.widgetContext.context, 'dart');

        return tooltip;
    }

    /**
     * Generate ASCII visual preview of the widget
     */
    private generateWidgetPreview(widgetType: string, keyName: string): string {
        const keyLabel = keyName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
        
        switch (widgetType.toLowerCase()) {
            case 'elevatedbutton':
            case 'textbutton':
            case 'outlinedbutton':
                return this.generateButtonPreview(widgetType, keyLabel);
            
            case 'textfield':
            case 'textformfield':
                return this.generateTextFieldPreview(keyLabel);
            
            case 'checkbox':
                return this.generateCheckboxPreview(keyLabel);
            
            case 'card':
                return this.generateCardPreview(keyLabel);
            
            case 'listview':
            case 'listtile':
                return this.generateListPreview(keyLabel);
            
            case 'dialog':
            case 'alertdialog':
                return this.generateDialogPreview(keyLabel);
            
            case 'appbar':
                return this.generateAppBarPreview(keyLabel);
            
            case 'floatingactionbutton':
                return this.generateFABPreview(keyLabel);
            
            case 'container':
                return this.generateContainerPreview(keyLabel);
            
            default:
                return this.generateGenericWidgetPreview(widgetType, keyLabel);
        }
    }

    private generateButtonPreview(type: string, label: string): string {
        const buttonText = label || 'Button';
        const buttonStyle = type === 'ElevatedButton' ? '█' : type === 'OutlinedButton' ? '▢' : '▬';
        
        return `\`\`\`
┌─────────────────────┐
│  ${buttonStyle} ${buttonText.padEnd(15)} │
│     [${type}]     │
└─────────────────────┘
        Key: ${label}
\`\`\``;
    }

    private generateTextFieldPreview(label: string): string {
        const fieldLabel = label || 'Text Field';
        
        return `\`\`\`
┌─────────────────────┐
│ ${fieldLabel}       │
│ ┌─────────────────┐ │
│ │ Enter text...   │ │
│ └─────────────────┘ │
└─────────────────────┘
        Key: ${label}
\`\`\``;
    }

    private generateCheckboxPreview(label: string): string {
        const checkLabel = label || 'Checkbox';
        
        return `\`\`\`
┌─────────────────────┐
│ ☐ ${checkLabel}     │
│   [Checkbox]        │
└─────────────────────┘
        Key: ${label}
\`\`\``;
    }

    private generateCardPreview(label: string): string {
        const cardLabel = label || 'Card';
        
        return `\`\`\`
╭─────────────────────╮
│                     │
│    ${cardLabel}     │
│                     │
│   [Card Widget]     │
│                     │
╰─────────────────────╯
        Key: ${label}
\`\`\``;
    }

    private generateListPreview(label: string): string {
        const listLabel = label || 'List Item';
        
        return `\`\`\`
┌─────────────────────┐
│ ● ${listLabel}      │
│ ● Item 2            │
│ ● Item 3            │
│   [List/ListView]   │
└─────────────────────┘
        Key: ${label}
\`\`\``;
    }

    private generateDialogPreview(label: string): string {
        const dialogLabel = label || 'Dialog';
        
        return `\`\`\`
    ┌─────────────┐
    │  ${dialogLabel} │
    │             │
    │   [Dialog]  │
    │             │
    │  [OK] [Cancel] │
    └─────────────┘
        Key: ${label}
\`\`\``;
    }

    private generateAppBarPreview(label: string): string {
        const appBarLabel = label || 'App Bar';
        
        return `\`\`\`
┌─────────────────────┐
│ ☰  ${appBarLabel}   │
│    [AppBar]      ⋮  │
└─────────────────────┘
        Key: ${label}
\`\`\``;
    }

    private generateFABPreview(label: string): string {
        const fabLabel = label || 'FAB';
        
        return `\`\`\`
              ┌─────┐
              │  +  │
              │ FAB │
              └─────┘
        Key: ${label}
\`\`\``;
    }

    private generateContainerPreview(label: string): string {
        const containerLabel = label || 'Container';
        
        return `\`\`\`
┌─────────────────────┐
│                     │
│   ${containerLabel} │
│   [Container]       │
│                     │
└─────────────────────┘
        Key: ${label}
\`\`\``;
    }

    private generateGenericWidgetPreview(widgetType: string, label: string): string {
        const widgetLabel = label || widgetType;
        
        return `\`\`\`
┌─────────────────────┐
│                     │
│   ${widgetLabel}    │
│   [${widgetType}]   │
│                     │
└─────────────────────┘
        Key: ${label}  
\`\`\``;
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
