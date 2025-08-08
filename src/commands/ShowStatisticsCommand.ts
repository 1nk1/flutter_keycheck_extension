import * as vscode from 'vscode';
import { BaseCommand } from './BaseCommand';

/**
 * Command to show testing keys statistics
 */
export class ShowStatisticsCommand extends BaseCommand {
    protected async executeImpl(): Promise<void> {
        if (!this.ensureServicesReady()) {
            return;
        }

        const keyScanner = this.serviceManager.keyScanner;
        if (!keyScanner) {
            this.showWarning('Key scanner not available');
            return;
        }

        const stats = keyScanner.getKeyStatistics();
        const coverage = stats.totalKeys > 0 
            ? (stats.usedKeys / stats.totalKeys * 100).toFixed(1) 
            : '0';

        const message = this.formatStatisticsMessage(stats, coverage);
        vscode.window.showInformationMessage(message, { modal: true });
    }

    private formatStatisticsMessage(stats: {
        totalKeys: number;
        usedKeys: number;
        unusedKeys: number;
        categoryCounts: Record<string, number>;
    }, coverage: string): string {
        const topCategories = Object.entries(stats.categoryCounts)
            .sort(([,a], [,b]) => (b as number) - (a as number))
            .slice(0, 5)
            .map(([category, count]) => `• ${category}: ${count}`)
            .join('\n');

        return `📊 Testing Keys Statistics

Total Keys: ${stats.totalKeys}
Used Keys: ${stats.usedKeys}
Unused Keys: ${stats.unusedKeys}
Coverage: ${coverage}%

Top Categories:
${topCategories}`;
    }
}