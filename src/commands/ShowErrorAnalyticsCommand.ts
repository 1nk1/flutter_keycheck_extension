import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';
import { ErrorAnalytics, NotificationHelpers } from '../core';

/**
 * Command to show error analytics and system health information
 */
export class ShowErrorAnalyticsCommand extends BaseCommand {
    /**
     * Execute the show error analytics command
     */
    protected async executeImpl(): Promise<void> {
        const analytics = ErrorAnalytics.getInstance();
        
        // Show period selection
        const periodOptions = [
            'Last Hour',
            'Last 6 Hours', 
            'Last 24 Hours',
            'Last Week'
        ];

        const selectedPeriod = await vscode.window.showQuickPick(periodOptions, {
            placeHolder: 'Select time period for error analysis',
            title: 'Error Analytics - Time Period'
        });

        if (!selectedPeriod) {
            return;
        }

        let periodHours = 24; // default
        switch (selectedPeriod) {
            case 'Last Hour': periodHours = 1; break;
            case 'Last 6 Hours': periodHours = 6; break;
            case 'Last 24 Hours': periodHours = 24; break;
            case 'Last Week': periodHours = 168; break;
        }

        // Generate and show the report
        await NotificationHelpers.showScanProgress(
            async (progress: vscode.Progress<{ message?: string; increment?: number }>) => {
                progress.report({ message: 'Analyzing error patterns...' });
                
                const report = await analytics.analyzeErrors(periodHours);
                
                progress.report({ message: 'Generating report...', increment: 50 });
                
                await analytics.showAnalyticsReport(report);
                
                progress.report({ message: 'Report completed', increment: 100 });
                
                // Show summary notification
                await this.showReportSummary(report);
            }
        );
    }

    /**
     * Show a summary notification of the analytics report
     */
    private async showReportSummary(report: any): Promise<void> {
        const healthEmoji = this.getHealthEmoji(report.performance.healthScore);
        const message = `${healthEmoji} System Health: ${report.performance.healthScore}/100 | ` +
                       `Errors: ${report.totalErrors} | ` +
                       `Error Rate: ${report.performance.errorRate}%`;

        await vscode.window.showInformationMessage(message);
    }

    /**
     * Get health emoji based on score
     */
    private getHealthEmoji(score: number): string {
        if (score >= 90) return '🟢';
        if (score >= 70) return '🟡';
        if (score >= 50) return '🟠';
        return '🔴';
    }
}