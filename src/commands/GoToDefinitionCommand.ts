import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';

/**
 * Command to navigate to key definition
 */
export class GoToDefinitionCommand extends BaseCommand {
    protected async executeImpl(item: unknown): Promise<void> {
        // Type guard for item with key property
        if (!item || typeof item !== 'object' || !('key' in item)) {
            this.showWarning('No key selected');
            return;
        }

        const typedItem = item as { key: { filePath: string; line: number } };
        const uri = vscode.Uri.file(typedItem.key.filePath);
        const position = new vscode.Position(typedItem.key.line - 1, 0);
        
        await vscode.window.showTextDocument(uri, {
            selection: new vscode.Range(position, position)
        });
    }
}