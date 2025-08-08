import { BaseCommand } from './BaseCommand';

/**
 * Command to refresh testing keys
 */
export class RefreshCommand extends BaseCommand {
    protected async executeImpl(): Promise<void> {
        if (!this.ensureServicesReady()) {
            return;
        }

        const keyScanner = this.serviceManager.keyScanner;
        if (!keyScanner) {
            this.showWarning('Key scanner not available');
            return;
        }

        await keyScanner.scanAllKeys(true);
        this.refreshTreeView();
        this.showInfo('Testing keys refreshed');
    }
}