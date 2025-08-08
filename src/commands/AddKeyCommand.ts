import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { FileUtils } from '../utils/fileUtils';

/**
 * Command to add a new testing key
 */
export class AddKeyCommand extends BaseCommand {
    protected async executeImpl(): Promise<void> {
        const keyName = await this.promptForKeyName();
        if (!keyName) {
            return;
        }

        const keyValue = await this.promptForKeyValue(keyName);
        if (!keyValue) {
            return;
        }

        await this.addKeyToConstantsFile(keyName, keyValue);
        await this.refreshKeysAndShowSuccess(keyName);
    }

    private async promptForKeyName(): Promise<string | undefined> {
        return await vscode.window.showInputBox({
            prompt: 'Enter key name',
            placeHolder: 'myButtonKey',
            validateInput: (value) => {
                if (!value || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
                    return 'Key name must be a valid identifier';
                }
                return null;
            }
        });
    }

    private async promptForKeyValue(keyName: string): Promise<string | undefined> {
        return await vscode.window.showInputBox({
            prompt: 'Enter key value',
            placeHolder: 'my_button_key',
            value: keyName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
        });
    }

    private async addKeyToConstantsFile(keyName: string, keyValue: string): Promise<void> {
        const workspaceRoot = FileUtils.getWorkspaceRoot();
        if (!workspaceRoot) {
            throw new Error('No workspace found');
        }

        const config = vscode.workspace.getConfiguration('flutterTestingKeys');
        const keyConstantsPath = config.get<string>('keyConstantsPath', 'lib/constants/key_constants.dart');
        const fullPath = `${workspaceRoot}/${keyConstantsPath}`;

        const content = this.generateFileContent(fullPath, keyName, keyValue);
        FileUtils.writeFile(fullPath, content);
    }

    private generateFileContent(fullPath: string, keyName: string, keyValue: string): string {
        if (FileUtils.fileExists(fullPath)) {
            const existingContent = FileUtils.readFileContent(fullPath) || '';
            return this.addKeyToExistingContent(existingContent, keyName, keyValue);
        } else {
            return `class KeyConstants {\n  static const String ${keyName} = '${keyValue}';\n}\n`;
        }
    }

    private addKeyToExistingContent(content: string, keyName: string, keyValue: string): string {
        const lines = content.split('\n');
        const insertIndex = lines.findIndex(line => line.includes('}'));
        
        if (insertIndex > 0) {
            lines.splice(insertIndex, 0, `  static const String ${keyName} = '${keyValue}';`);
            return lines.join('\n');
        }
        
        return content;
    }

    private async refreshKeysAndShowSuccess(keyName: string): Promise<void> {
        const keyScanner = this.serviceManager.keyScanner;
        if (keyScanner) {
            await keyScanner.scanAllKeys(true);
            this.refreshTreeView();
        }
        
        this.showInfo(`Key '${keyName}' added successfully`);

        // Open the constants file
        const workspaceRoot = FileUtils.getWorkspaceRoot();
        if (workspaceRoot) {
            const config = vscode.workspace.getConfiguration('flutterTestingKeys');
            const keyConstantsPath = config.get<string>('keyConstantsPath', 'lib/constants/key_constants.dart');
            const fullPath = `${workspaceRoot}/${keyConstantsPath}`;
            
            const doc = await vscode.workspace.openTextDocument(fullPath);
            await vscode.window.showTextDocument(doc);
        }
    }
}