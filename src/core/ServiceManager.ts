import * as vscode from 'vscode';
import { KeyScanner } from '../services/keyScanner';
import { ValidationService } from '../services/validationService';
import { FlutterKeycheckService } from '../services/flutterKeycheckService';
import { FileUtils } from '../utils/fileUtils';
import { ErrorBoundary, ErrorHelpers, NotificationHelpers, ErrorCategory, ErrorLevel } from './';

/**
 * Manages the lifecycle and dependencies of extension services
 */
export class ServiceManager {
    private _keyScanner?: KeyScanner;
    private _validationService?: ValidationService;
    private _flutterKeycheckService?: FlutterKeycheckService;
    private _isInitialized = false;
    private _extensionContext?: vscode.ExtensionContext;

    /**
     * Initialize all services for a Flutter project
     */
    async initialize(): Promise<boolean> {
        const boundary = ErrorBoundary.createServiceBoundary('ServiceManager');
        
        const result = await boundary.execute(async () => {
            // Check if it's a Flutter project
            const workspaceRoot = FileUtils.getWorkspaceRoot();
            console.log('ServiceManager: Workspace root:', workspaceRoot);
            
            const isFlutterProject = workspaceRoot && FileUtils.isFlutterProject(workspaceRoot);
            console.log('ServiceManager: Is Flutter project:', isFlutterProject);
            
            if (!isFlutterProject) {
                console.log('ServiceManager: Not a Flutter project, services will not be initialized');
                await NotificationHelpers.showInitializationStatus(false, false);
                return false;
            }

            // Initialize services in dependency order
            this._keyScanner = new KeyScanner();
            this._validationService = new ValidationService(this._keyScanner);
            this._flutterKeycheckService = new FlutterKeycheckService(this._validationService);

            this._isInitialized = true;
            console.log('Services initialized successfully');
            await NotificationHelpers.showInitializationStatus(true, true);
            return true;
        }, false); // Don't show to user by default

        if (!result.success) {
            await ErrorHelpers.criticalError(
                'Failed to initialize extension services',
                { workspaceRoot: FileUtils.getWorkspaceRoot() },
                result.error
            );
            this._isInitialized = false;
            return false;
        }

        return result.data || false;
    }

    /**
     * Dispose of all services
     */
    dispose(): void {
        this._keyScanner = undefined;
        this._validationService = undefined;
        this._flutterKeycheckService = undefined;
        this._isInitialized = false;
        console.log('Services disposed');
    }

    // Getters with null checks
    get keyScanner(): KeyScanner | undefined {
        return this._keyScanner;
    }

    get validationService(): ValidationService | undefined {
        return this._validationService;
    }

    get flutterKeycheckService(): FlutterKeycheckService | undefined {
        return this._flutterKeycheckService;
    }

    get isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * Set extension context
     */
    setExtensionContext(context: vscode.ExtensionContext): void {
        this._extensionContext = context;
    }

    /**
     * Get extension context
     */
    getExtensionContext(): vscode.ExtensionContext | undefined {
        return this._extensionContext;
    }

    /**
     * Check if services are ready and show warning if not
     */
    ensureServicesReady(): boolean {
        if (!this._isInitialized) {
            vscode.window.showWarningMessage('Extension not fully initialized. Please open a Flutter project.');
            return false;
        }
        return true;
    }

    /**
     * Perform initial scan of keys with error handling
     */
    async performInitialScan(): Promise<void> {
        if (!this._keyScanner) {
            await ErrorHelpers.commandError(
                'performInitialScan',
                'Key scanner not initialized'
            );
            return;
        }

        const boundary = ErrorBoundary.createServiceBoundary('KeyScanner');
        const result = await boundary.execute(async () => {
            await NotificationHelpers.showScanProgress(async (progress) => {
                progress.report({ message: 'Scanning Flutter testing keys...' });
                await this._keyScanner!.scanAllKeys();
                progress.report({ message: 'Scan completed', increment: 100 });
            });
            console.log('Initial key scan completed');
        });

        if (!result.success) {
            await ErrorHelpers.commandError(
                'performInitialScan',
                'Failed to complete initial key scan',
                result.error
            );
        }
    }
}