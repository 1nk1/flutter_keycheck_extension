import * as vscode from 'vscode';
import { ExtensionCore } from './core/ExtensionCore';
import { GlobalErrorHandler, NotificationManager } from './core';
import { ErrorAnalytics } from './core/ErrorAnalytics';

// Global extension core instance
let extensionCore: ExtensionCore;

/**
 * Extension activation entry point
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    console.log('БЛЯДЬ!!! РАСШИРЕНИЕ АКТИВИРУЕТСЯ!!!');
    vscode.window.showInformationMessage('Flutter Testing Keys Inspector активируется!');
    
    // СРОЧНАЯ ДИАГНОСТИКА - зарегистрируем одну простую команду для теста
    try {
        console.log('РЕГИСТРИРУЮ ТЕСТОВУЮ КОМАНДУ...');
        const testDisposable = vscode.commands.registerCommand('flutterTestingKeys.refresh', () => {
            console.log('ТЕСТОВАЯ КОМАНДА СРАБОТАЛА!');
            vscode.window.showInformationMessage('Refresh команда работает!');
        });
        context.subscriptions.push(testDisposable);
        console.log('ТЕСТОВАЯ КОМАНДА ЗАРЕГИСТРИРОВАНА!');
    } catch (error) {
        console.error('ОШИБКА РЕГИСТРАЦИИ ТЕСТОВОЙ КОМАНДЫ:', error);
    }
    
    // Initialize global error handling first
    GlobalErrorHandler.initialize();
    
    // Start notification cleanup
    const notificationManager = NotificationManager.getInstance();
    notificationManager.startCleanup();
    
    // Initialize analytics
    const analytics = ErrorAnalytics.getInstance();
    
    try {
        console.log('CREATING EXTENSION CORE...');
        extensionCore = new ExtensionCore();
        console.log('CALLING EXTENSION CORE ACTIVATE...');
        await extensionCore.activate(context);
        
        // Register cleanup for context disposal
        context.subscriptions.push({
            dispose: () => {
                GlobalErrorHandler.dispose();
                notificationManager.dispose();
                analytics.dispose();
            }
        });
    } catch (error) {
        console.error('Critical error during extension activation:', error);
        GlobalErrorHandler.dispose();
        throw error;
    }
}

/**
 * Extension deactivation entry point
 */
export function deactivate(): void {
    try {
        if (extensionCore) {
            extensionCore.deactivate();
        }
        
        // Clean up global error handling
        GlobalErrorHandler.dispose();
        NotificationManager.getInstance().dispose();
        ErrorAnalytics.getInstance().dispose();
    } catch (error) {
        console.error('Error during extension deactivation:', error);
    }
}