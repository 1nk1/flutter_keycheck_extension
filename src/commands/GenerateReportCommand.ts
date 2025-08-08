import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';

/**
 * Command to generate validation report
 */
export class GenerateReportCommand extends BaseCommand {
    protected async executeImpl(): Promise<void> {
        if (!this.ensureServicesReady()) {
            return;
        }

        const validationService = this.serviceManager.validationService;
        if (!validationService) {
            this.showWarning('Validation service not available');
            return;
        }

        const report = await validationService.generateMarkdownReport();
        const doc = await vscode.workspace.openTextDocument({
            content: report,
            language: 'markdown'
        });
        await vscode.window.showTextDocument(doc);
    }
}