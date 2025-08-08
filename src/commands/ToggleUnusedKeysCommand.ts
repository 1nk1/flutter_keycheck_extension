import { BaseCommand } from './BaseCommand';

/**
 * Command to toggle unused keys visibility
 */
export class ToggleUnusedKeysCommand extends BaseCommand {
    protected async executeImpl(): Promise<void> {
        if (!this.ensureServicesReady()) {
            return;
        }

        const treeProvider = this.providerRegistry.treeProvider;
        if (!treeProvider) {
            this.showWarning('Tree provider not available');
            return;
        }

        treeProvider.toggleUnusedKeys();
    }
}