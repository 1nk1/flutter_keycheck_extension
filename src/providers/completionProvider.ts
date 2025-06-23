import * as vscode from 'vscode';

import { TestingKey } from '../models/testingKey';
import { KeyScanner } from '../services/keyScanner';
import { DartParser } from '../utils/dartParser';

export class CompletionProvider implements vscode.CompletionItemProvider {
    constructor(private keyScanner: KeyScanner) {}

    async provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken,
        context: vscode.CompletionContext
    ): Promise<vscode.CompletionItem[]> {
        // Only provide completions for Dart files
        if (!document.fileName.endsWith('.dart')) {
            return [];
        }

        // Unused parameters
        void token;
        void context;

        const lineText = document.lineAt(position).text;
        const linePrefix = lineText.substring(0, position.character);

        // Check different completion contexts
        if (this.isKeyConstantsContext(linePrefix)) {
            return this.provideKeyConstantsCompletions();
        }

        if (this.isKeyConstructorContext(linePrefix)) {
            return this.provideKeyConstructorCompletions();
        }

        if (this.isWidgetKeyContext(linePrefix)) {
            return this.provideWidgetKeyCompletions();
        }

        return [];
    }

    /**
     * Check if we're in a KeyConstants context
     */
    private isKeyConstantsContext(linePrefix: string): boolean {
        return linePrefix.includes('KeyConstants.') ||
               !!linePrefix.match(/KeyConstants\s*\.\s*$/);
    }

    /**
     * Check if we're in a Key constructor context
     */
    private isKeyConstructorContext(linePrefix: string): boolean {
        return linePrefix.includes('Key(KeyConstants.') ||
               !!linePrefix.match(/Key\s*\(\s*KeyConstants\s*\.\s*$/);
    }

    /**
     * Check if we're in a widget key parameter context
     */
    private isWidgetKeyContext(linePrefix: string): boolean {
        return !!linePrefix.match(/key\s*:\s*Key\s*\(\s*KeyConstants\s*\.\s*$/) ||
               !!linePrefix.match(/key\s*:\s*KeyConstants\s*\.\s*$/);
    }

    /**
     * Provide KeyConstants completions
     */
    private async provideKeyConstantsCompletions(): Promise<vscode.CompletionItem[]> {
        const keys = await this.keyScanner.scanAllKeys();
        const completionItems: vscode.CompletionItem[] = [];

        for (const key of keys) {
            const item = this.createKeyCompletionItem(key);
            completionItems.push(item);
        }

        // Sort by usage frequency
        completionItems.sort((a, b) => {
            const aUsage = (a as unknown as { usageCount: number }).usageCount || 0;
            const bUsage = (b as unknown as { usageCount: number }).usageCount || 0;
            return bUsage - aUsage;
        });

        return completionItems;
    }

    /**
     * Provide Key constructor completions
     */
    private async provideKeyConstructorCompletions(): Promise<vscode.CompletionItem[]> {
        const keys = await this.keyScanner.scanAllKeys();
        const completionItems: vscode.CompletionItem[] = [];

        for (const key of keys) {
            const item = this.createKeyConstructorCompletionItem(key);
            completionItems.push(item);
        }

        return completionItems;
    }

    /**
     * Provide widget key completions
     */
    private async provideWidgetKeyCompletions(): Promise<vscode.CompletionItem[]> {
        const keys = await this.keyScanner.scanAllKeys();
        const completionItems: vscode.CompletionItem[] = [];

        for (const key of keys) {
            const item = this.createWidgetKeyCompletionItem(key);
            completionItems.push(item);
        }

        return completionItems;
    }

    /**
     * Create completion item for KeyConstants
     */
    private createKeyCompletionItem(key: TestingKey): vscode.CompletionItem {
        const item = new vscode.CompletionItem(key.name, vscode.CompletionItemKind.Constant);

        item.detail = `KeyConstants.${key.name}`;
        item.documentation = this.createKeyDocumentation(key);
        item.insertText = key.name;
        item.sortText = this.getSortText(key);

        // Add usage count for sorting
        (item as unknown as { usageCount: number }).usageCount = key.usageCount || 0;

        // Add filter text for better matching
        item.filterText = `${key.name} ${key.value} ${key.category}`;

        // Add tags based on key status
        item.tags = key.isUsed ? [] : [vscode.CompletionItemTag.Deprecated];

        return item;
    }

    /**
     * Create completion item for Key constructor
     */
    private createKeyConstructorCompletionItem(key: TestingKey): vscode.CompletionItem {
        const item = new vscode.CompletionItem(key.name, vscode.CompletionItemKind.Constructor);

        item.detail = `Key(KeyConstants.${key.name})`;
        item.documentation = this.createKeyDocumentation(key);
        item.insertText = `${key.name})`;
        item.sortText = this.getSortText(key);

        return item;
    }

    /**
     * Create completion item for widget key parameter
     */
    private createWidgetKeyCompletionItem(key: TestingKey): vscode.CompletionItem {
        const item = new vscode.CompletionItem(key.name, vscode.CompletionItemKind.Property);

        item.detail = `key: Key(KeyConstants.${key.name})`;
        item.documentation = this.createKeyDocumentation(key);
        item.insertText = `${key.name}`;
        item.sortText = this.getSortText(key);

        return item;
    }

    /**
     * Create documentation for key
     */
    private createKeyDocumentation(key: TestingKey): vscode.MarkdownString {
        const doc = new vscode.MarkdownString();

        doc.appendMarkdown(`**${key.name}**\n\n`);
        doc.appendMarkdown(`Value: \`${key.value}\`\n\n`);
        doc.appendMarkdown(`Category: ${key.category}\n\n`);
        doc.appendMarkdown(`Status: ${key.isUsed ? '✅ Used' : '⚠️ Unused'}\n\n`);

        if (key.usageCount && key.usageCount > 0) {
            doc.appendMarkdown(`Usage count: ${key.usageCount}\n\n`);
        }

        if (key.usageFiles && key.usageFiles.length > 0) {
            doc.appendMarkdown(`Used in ${key.usageFiles.length} file(s)\n\n`);
        }

        // Add code example
        doc.appendCodeblock(`
Widget build(BuildContext context) {
  return ElevatedButton(
    key: Key(KeyConstants.${key.name}),
    onPressed: () {},
    child: Text('Button'),
  );
}`, 'dart');

        return doc;
    }

    /**
     * Get sort text for proper ordering
     */
    private getSortText(key: TestingKey): string {
        // Prioritize used keys
        const usagePrefix = key.isUsed ? '0' : '1';

        // Then by usage count (higher first)
        const usageCount = String(999 - (key.usageCount || 0)).padStart(3, '0');

        // Finally by name
        return `${usagePrefix}_${usageCount}_${key.name}`;
    }

    /**
     * Resolve completion item with additional information
     */
    resolveCompletionItem(
        item: vscode.CompletionItem,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.CompletionItem> {
        // Add additional details when item is selected
        void token; // Unused parameter
        if (item.kind === vscode.CompletionItemKind.Constant) {
            // Add import statement if needed
            const additionalTextEdits = this.getImportEdits(item);
            if (additionalTextEdits.length > 0) {
                item.additionalTextEdits = additionalTextEdits;
            }
        }

        return item;
    }

    /**
     * Get import edits if KeyConstants import is missing
     */
    private getImportEdits(item: vscode.CompletionItem): vscode.TextEdit[] {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return [];
        }

        void item; // Unused parameter
        const document = editor.document;
        const text = document.getText();

        // Check if KeyConstants import already exists
        if (text.includes('KeyConstants') || DartParser.isKeyConstantsFile(document.fileName)) {
            return [];
        }

        // Find where to insert import
        const lines = text.split('\n');
        let insertLine = 0;

        // Find last import statement
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ')) {
                insertLine = i + 1;
            } else if (lines[i].trim() === '' && insertLine > 0) {
                // Empty line after imports
                break;
            } else if (!lines[i].startsWith('import ') && insertLine > 0) {
                // Non-import line after imports
                break;
            }
        }

        // Get KeyConstants import path
        const config = vscode.workspace.getConfiguration('flutterTestingKeys');
        const keyConstantsPath = config.get<string>('keyConstantsPath', 'lib/constants/key_constants.dart');
        const importStatement = DartParser.getKeyConstantsImport(keyConstantsPath);

        return [
            vscode.TextEdit.insert(
                new vscode.Position(insertLine, 0),
                `${importStatement}\n`
            )
        ];
    }
}
