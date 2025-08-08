import { BaseCommand } from './BaseCommand';

/**
 * Command to clear search filter
 */
export class ClearSearchCommand extends BaseCommand {
    protected async executeImpl(): Promise<void> {
        if (!this.ensureServicesReady()) {
            return;
        }

        const treeProvider = this.providerRegistry.treeProvider;
        if (!treeProvider) {
            this.showWarning('Tree provider not available');
            return;
        }

        treeProvider.clearSearch();
        this.showInfo('Search cleared');
    }
}