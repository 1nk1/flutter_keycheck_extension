import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';

/**
 * Command to validate testing keys
 */
export class ValidateCommand extends BaseCommand {
    protected async executeImpl(): Promise<void> {
        if (!this.ensureServicesReady()) {
            return;
        }

        const validationService = this.serviceManager.validationService;
        if (!validationService) {
            this.showWarning('Validation service not available');
            return;
        }

        const result = await validationService.validateKeys();
        const message = `Validation complete: ${result.totalKeys} keys found, ${result.issues.length} issues`;

        if (result.issues.length > 0) {
            const action = await vscode.window.showWarningMessage(
                message,
                'View Report',
                'Fix Issues'
            );

            if (action === 'View Report') {
                await vscode.commands.executeCommand('flutterTestingKeys.generateReport');
            }
        } else {
            this.showInfo(message);
        }
    }
}