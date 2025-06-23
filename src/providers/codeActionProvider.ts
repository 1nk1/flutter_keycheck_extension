import * as vscode from 'vscode';

import { TestingKey } from '../models/testingKey';
import { KeyScanner } from '../services/keyScanner';
import { DartParser } from '../utils/dartParser';
import { FileUtils } from '../utils/fileUtils';

export class CodeActionProvider implements vscode.CodeActionProvider {
    constructor(private keyScanner: KeyScanner) {}

    async provideCodeActions(
        document: vscode.TextDocument,
        range: vscode.Range | vscode.Selection,
        context: vscode.CodeActionContext,
        token: vscode.CancellationToken
    ): Promise<vscode.CodeAction[]> {
        // Only provide actions for Dart files
        if (!document.fileName.endsWith('.dart')) {
            return [];
        }

        // Unused parameters
        void context;
        void token;

        const actions: vscode.CodeAction[] = [];
        const text = document.getText(range);
        const lineText = document.lineAt(range.start.line).text;

        // Find hardcoded keys and suggest replacing with constants
        const hardcodedActions = await this.createHardcodedKeyActions(document, range, text);
        actions.push(...hardcodedActions);

        // Suggest adding missing keys to widgets
        const missingKeyActions = await this.createMissingKeyActions(document, range, lineText);
        actions.push(...missingKeyActions);

        // Suggest creating new key constants
        const newKeyActions = await this.createNewKeyActions(document, range, text);
        actions.push(...newKeyActions);

        // Suggest importing KeyConstants
        const importActions = await this.createImportActions(document);
        actions.push(...importActions);

        // Suggest organizing keys
        const organizeActions = await this.createOrganizeActions(document);
        actions.push(...organizeActions);

        return actions;
    }

    /**
     * Create actions for hardcoded keys
     */
    private async createHardcodedKeyActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        text: string
    ): Promise<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];
        const hardcodedKeyPattern = /Key\(['"]([^'"]+)['"]\)/g;
        let match;

        while ((match = hardcodedKeyPattern.exec(text)) !== null) {
            const keyValue = match[1];
            const constantName = DartParser.generateConstantName(keyValue);

            // Action to replace with existing constant
            const existingKey = await this.findExistingKey(keyValue);
            if (existingKey) {
                const replaceAction = new vscode.CodeAction(
                    `Replace with KeyConstants.${existingKey.name}`,
                    vscode.CodeActionKind.RefactorRewrite
                );

                const edit = new vscode.WorkspaceEdit();
                const fullRange = new vscode.Range(
                    range.start.line,
                    range.start.character + match.index!,
                    range.start.line,
                    range.start.character + match.index! + match[0].length
                );

                edit.replace(
                    document.uri,
                    fullRange,
                    `Key(KeyConstants.${existingKey.name})`
                );

                replaceAction.edit = edit;
                replaceAction.isPreferred = true;
                actions.push(replaceAction);
            } else {
                // Action to create new constant
                const createAction = new vscode.CodeAction(
                    `Create KeyConstants.${constantName}`,
                    vscode.CodeActionKind.QuickFix
                );

                const edit = await this.createNewKeyConstantEdit(keyValue, constantName);
                if (edit) {
                    // Replace hardcoded key with constant
                    const fullRange = new vscode.Range(
                        range.start.line,
                        range.start.character + match.index!,
                        range.start.line,
                        range.start.character + match.index! + match[0].length
                    );

                    edit.replace(
                        document.uri,
                        fullRange,
                        `Key(KeyConstants.${constantName})`
                    );

                    createAction.edit = edit;
                    actions.push(createAction);
                }
            }
        }

        return actions;
    }

    /**
     * Create actions for missing keys on widgets
     */
    private async createMissingKeyActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        lineText: string
    ): Promise<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];

        // Check if line contains a widget without a key
        const widgetPattern = /(\w+)\s*\(/;
        const widgetMatch = lineText.match(widgetPattern);

        if (widgetMatch && !lineText.includes('key:') && this.isWidgetThatShouldHaveKey(widgetMatch[1])) {
            const widgetName = widgetMatch[1];
            const keyName = this.generateKeyNameForWidget(widgetName, lineText);

            const addKeyAction = new vscode.CodeAction(
                `Add key to ${widgetName}`,
                vscode.CodeActionKind.QuickFix
            );

            let edit = new vscode.WorkspaceEdit();
            const insertPosition = this.findInsertPositionForKey(lineText, range.start);

            if (insertPosition) {
                edit.insert(
                    document.uri,
                    insertPosition,
                    `key: Key(KeyConstants.${keyName}), `
                );

                // Also create the key constant if it doesn't exist
                const constantEdit = await this.createNewKeyConstantEdit(keyName, keyName);
                if (constantEdit) {
                    edit = this.mergeWorkspaceEdits(edit, constantEdit);
                }

                addKeyAction.edit = edit;
                actions.push(addKeyAction);
            }
        }

        return actions;
    }

    /**
     * Create actions for new key constants
     */
    private async createNewKeyActions(
        document: vscode.TextDocument,
        range: vscode.Range,
        text: string
    ): Promise<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];

        // If text is selected and looks like a key name or value
        if (text && text.length > 0 && text.length < 50 && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(text)) {
            const createKeyAction = new vscode.CodeAction(
                `Create KeyConstants.${text}`,
                vscode.CodeActionKind.Refactor
            );

            const edit = await this.createNewKeyConstantEdit(text, text);
            if (edit) {
                createKeyAction.edit = edit;
                actions.push(createKeyAction);
            }
        }

        return actions;
    }

    /**
     * Create import actions
     */
    private async createImportActions(document: vscode.TextDocument): Promise<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];
        const text = document.getText();

        // Check if KeyConstants is used but not imported
        if (text.includes('KeyConstants') && !text.includes('import') && !DartParser.isKeyConstantsFile(document.fileName)) {
            const importAction = new vscode.CodeAction(
                'Import KeyConstants',
                vscode.CodeActionKind.QuickFix
            );

            const edit = new vscode.WorkspaceEdit();
            const config = vscode.workspace.getConfiguration('flutterTestingKeys');
            const keyConstantsPath = config.get<string>('keyConstantsPath', 'lib/constants/key_constants.dart');
            const importStatement = DartParser.getKeyConstantsImport(keyConstantsPath);

            // Find where to insert import
            const lines = text.split('\n');
            let insertLine = 0;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('import ')) {
                    insertLine = i + 1;
                }
            }

            edit.insert(
                document.uri,
                new vscode.Position(insertLine, 0),
                `${importStatement}\n`
            );

            importAction.edit = edit;
            actions.push(importAction);
        }

        return actions;
    }

    /**
     * Create organize actions
     */
    private async createOrganizeActions(document: vscode.TextDocument): Promise<vscode.CodeAction[]> {
        const actions: vscode.CodeAction[] = [];

        // Only for KeyConstants files
        if (DartParser.isKeyConstantsFile(document.fileName)) {
            const organizeAction = new vscode.CodeAction(
                'Organize KeyConstants by category',
                vscode.CodeActionKind.SourceOrganizeImports
            );

            const edit = await this.createOrganizeKeysEdit(document);
            if (edit) {
                organizeAction.edit = edit;
                actions.push(organizeAction);
            }
        }

        return actions;
    }

    /**
     * Find existing key by value
     */
    private async findExistingKey(value: string): Promise<TestingKey | undefined> {
        const keys = await this.keyScanner.scanAllKeys();
        return keys.find(key => key.value === value);
    }

    /**
     * Create edit for new key constant
     */
    private async createNewKeyConstantEdit(value: string, name: string): Promise<vscode.WorkspaceEdit | null> {
        const workspaceRoot = FileUtils.getWorkspaceRoot();
        if (!workspaceRoot) {
            return null;
        }

        const config = vscode.workspace.getConfiguration('flutterTestingKeys');
        const keyConstantsPath = config.get<string>('keyConstantsPath', 'lib/constants/key_constants.dart');
        const fullPath = `${workspaceRoot}/${keyConstantsPath}`;

        const edit = new vscode.WorkspaceEdit();

        if (!FileUtils.fileExists(fullPath)) {
            // Create KeyConstants file
            const keyConstantsContent = `class KeyConstants {
  static const String ${name} = '${value}';
}
`;
            edit.createFile(vscode.Uri.file(fullPath));
            edit.insert(vscode.Uri.file(fullPath), new vscode.Position(0, 0), keyConstantsContent);
        } else {
            // Add to existing file
            const content = FileUtils.readFileContent(fullPath);
            if (content) {
                const lines = content.split('\n');
                let insertLine = lines.length - 1; // Before closing brace

                // Find the last constant declaration
                for (let i = lines.length - 1; i >= 0; i--) {
                    if (lines[i].includes('static const String')) {
                        insertLine = i + 1;
                        break;
                    }
                }

                edit.insert(
                    vscode.Uri.file(fullPath),
                    new vscode.Position(insertLine, 0),
                    `  static const String ${name} = '${value}';\n`
                );
            }
        }

        return edit;
    }

    /**
     * Check if widget should have a key
     */
    private isWidgetThatShouldHaveKey(widgetName: string): boolean {
        const widgetsWithKeys = [
            'ElevatedButton', 'TextButton', 'OutlinedButton', 'IconButton',
            'TextField', 'TextFormField',
            'Checkbox', 'Radio', 'Switch',
            'DropdownButton', 'DropdownButtonFormField',
            'ListTile', 'Card', 'Container',
            'Scaffold', 'AppBar', 'FloatingActionButton'
        ];

        return widgetsWithKeys.includes(widgetName);
    }

    /**
     * Generate key name for widget
     */
    private generateKeyNameForWidget(widgetName: string, lineText: string): string {
        const baseName = widgetName.toLowerCase();

        // Try to extract meaningful context from the line
        const textMatch = lineText.match(/Text\(['"]([^'"]+)['"]\)/);
        if (textMatch) {
            const textValue = textMatch[1].toLowerCase().replace(/\s+/g, '_');
            return `${baseName}_${textValue}`;
        }

        // Use generic name
        return `${baseName}_key`;
    }

    /**
     * Find position to insert key parameter
     */
    private findInsertPositionForKey(lineText: string, lineStart: vscode.Position): vscode.Position | null {
        const openParenIndex = lineText.indexOf('(');
        if (openParenIndex === -1) {
            return null;
        }

        return new vscode.Position(lineStart.line, openParenIndex + 1);
    }

    /**
     * Create edit to organize keys by category
     */
    private async createOrganizeKeysEdit(document: vscode.TextDocument): Promise<vscode.WorkspaceEdit | null> {
        const keys = DartParser.parseKeyConstants(document.fileName);
        if (keys.length === 0) {
            return null;
        }

        // Group keys by category
        const groupedKeys = keys.reduce((acc, key) => {
            const category = key.category.toString();
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(key);
            return acc;
        }, {} as Record<string, TestingKey[]>);

        // Generate organized content
        let organizedContent = 'class KeyConstants {\n';

        for (const [category, categoryKeys] of Object.entries(groupedKeys)) {
            organizedContent += `  // ${category}\n`;
            categoryKeys.forEach(key => {
                organizedContent += `  static const String ${key.name} = '${key.value}';\n`;
            });
            organizedContent += '\n';
        }

        organizedContent += '}\n';

        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            organizedContent
        );

        return edit;
    }

    /**
     * Merge two workspace edits
     */
    private mergeWorkspaceEdits(edit1: vscode.WorkspaceEdit, edit2: vscode.WorkspaceEdit): vscode.WorkspaceEdit {
        const merged = new vscode.WorkspaceEdit();

        // Copy all edits from edit1
        edit1.entries().forEach(([uri, edits]) => {
            edits.forEach(edit => {
                if (edit instanceof vscode.TextEdit) {
                    merged.replace(uri, edit.range, edit.newText);
                }
            });
        });

        // Copy all edits from edit2
        edit2.entries().forEach(([uri, edits]) => {
            edits.forEach(edit => {
                if (edit instanceof vscode.TextEdit) {
                    merged.replace(uri, edit.range, edit.newText);
                }
            });
        });

        return merged;
    }
}
