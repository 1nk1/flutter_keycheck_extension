import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';

/**
 * Command to install flutter_keycheck package
 */
export class InstallFlutterKeycheckCommand extends BaseCommand {
    protected async executeImpl(): Promise<void> {
        if (!this.ensureServicesReady()) {
            return;
        }

        const flutterKeycheckService = this.serviceManager.flutterKeycheckService;
        if (!flutterKeycheckService) {
            this.showWarning('Flutter keycheck service not available');
            return;
        }

        const success = await flutterKeycheckService.installFlutterKeycheck();
        if (success) {
            this.showInfo('flutter_keycheck installed successfully');
        }
    }
}

/**
 * Command to validate keys using CLI
 */
export class ValidateWithCLICommand extends BaseCommand {
    protected async executeImpl(): Promise<void> {
        if (!this.ensureServicesReady()) {
            return;
        }

        const flutterKeycheckService = this.serviceManager.flutterKeycheckService;
        if (!flutterKeycheckService) {
            this.showWarning('Flutter keycheck service not available');
            return;
        }

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
            this.showInfo(message);
        }
    }
}