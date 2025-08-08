import * as vscode from 'vscode';
import { TestingKey } from '../models/testingKey';
import { WidgetHighlighter } from './widgetHighlighter';
import { ContextAnalyzer, KeyContext } from './contextAnalyzer';
import { DartParser } from '../utils/dartParser';
import { FileUtils } from '../utils/fileUtils';

/**
 * NavigationService - Сервис для умной навигации по клику в Widget Tree
 * 
 * Основные функции:
 * - Переход к определению ключа с точным позиционированием
 * - Подсвечивание контекста и области видимости
 * - Показ информации о Widget границах
 * - Поддержка множественных использований ключа
 */
export class NavigationService {
    private widgetHighlighter: WidgetHighlighter;
    private contextAnalyzer: ContextAnalyzer;
    private activeDecorations: Map<string, vscode.TextEditorDecorationType[]> = new Map();

    constructor() {
        this.widgetHighlighter = new WidgetHighlighter();
        this.contextAnalyzer = new ContextAnalyzer();
    }

    /**
     * Основной метод навигации к определению ключа
     */
    async navigateToKeyDefinition(testingKey: TestingKey): Promise<boolean> {
        try {
            if (!testingKey.usageLocations || testingKey.usageLocations.length === 0) {
                return await this.navigateToKeyDeclaration(testingKey);
            }

            // Если у ключа множественные использования, показать список выбора
            if (testingKey.usageLocations.length > 1) {
                return await this.handleMultipleUsages(testingKey);
            }

            // Навигация к единственному использованию
            return await this.navigateToSingleUsage(testingKey, testingKey.usageLocations[0]);

        } catch (error) {
            console.error('Navigation error:', error);
            vscode.window.showErrorMessage(`Navigation failed: ${error}`);
            return false;
        }
    }

    /**
     * Навигация к объявлению ключа (в KeyConstants файле)
     */
    private async navigateToKeyDeclaration(testingKey: TestingKey): Promise<boolean> {
        try {
            const uri = vscode.Uri.file(testingKey.filePath);
            const position = new vscode.Position(testingKey.line - 1, 0);
            const range = new vscode.Range(position, position);

            // Открыть документ и показать позицию
            const document = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(document);
            
            // Точное позиционирование курсора на ключ
            const keyPosition = await this.findExactKeyPosition(document, testingKey);
            if (keyPosition) {
                editor.selection = new vscode.Selection(keyPosition, keyPosition);
                editor.revealRange(new vscode.Range(keyPosition, keyPosition), vscode.TextEditorRevealType.InCenter);
            } else {
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            }

            // Подсветить объявление ключа
            await this.highlightKeyDeclaration(editor, testingKey);

            // Показать информационное сообщение
            vscode.window.showInformationMessage(
                `📍 Key declaration: ${testingKey.name}`,
                { modal: false }
            );

            return true;
        } catch (error) {
            console.error('Error navigating to key declaration:', error);
            return false;
        }
    }

    /**
     * Обработка множественных использований ключа
     */
    private async handleMultipleUsages(testingKey: TestingKey): Promise<boolean> {
        const usageItems: vscode.QuickPickItem[] = testingKey.usageLocations!.map((location, index) => {
            const relativePath = vscode.workspace.asRelativePath(location.uri.fsPath);
            const line = location.range.start.line + 1;
            
            return {
                label: `${relativePath}:${line}`,
                description: `Usage ${index + 1} of ${testingKey.usageLocations!.length}`,
                detail: this.getUsagePreview(location)
            };
        });

        // Добавить опцию перехода к объявлению
        usageItems.unshift({
            label: `📋 Declaration in ${vscode.workspace.asRelativePath(testingKey.filePath)}`,
            description: `Line ${testingKey.line}`,
            detail: `Go to key declaration: ${testingKey.name} = '${testingKey.value}'`
        });

        const selectedItem = await vscode.window.showQuickPick(usageItems, {
            placeHolder: `Select location for key: ${testingKey.name}`,
            matchOnDescription: true,
            matchOnDetail: true
        });

        if (!selectedItem) {
            return false;
        }

        // Если выбрано объявление
        if (selectedItem.label.startsWith('📋 Declaration')) {
            return await this.navigateToKeyDeclaration(testingKey);
        }

        // Найти соответствующее использование
        const usageIndex = usageItems.indexOf(selectedItem) - 1; // -1 из-за добавленного объявления
        const location = testingKey.usageLocations![usageIndex];
        
        return await this.navigateToSingleUsage(testingKey, location);
    }

    /**
     * Навигация к конкретному использованию ключа
     */
    private async navigateToSingleUsage(testingKey: TestingKey, location: vscode.Location): Promise<boolean> {
        try {
            // Открыть документ
            const document = await vscode.workspace.openTextDocument(location.uri);
            const editor = await vscode.window.showTextDocument(document);

            // Позиционировать курсор
            const keyPosition = location.range.start;
            editor.selection = new vscode.Selection(keyPosition, keyPosition);
            editor.revealRange(location.range, vscode.TextEditorRevealType.InCenter);

            // Анализировать контекст использования ключа
            const context = await this.contextAnalyzer.analyzeKeyContext(document, location, testingKey);
            
            // Подсветить Widget и его область
            await this.highlightKeyUsageContext(editor, context);

            // Показать информацию о контексте
            await this.showContextInformation(context, testingKey);

            return true;
        } catch (error) {
            console.error('Error navigating to key usage:', error);
            return false;
        }
    }

    /**
     * Найти точную позицию ключа в документе
     */
    private async findExactKeyPosition(document: vscode.TextDocument, testingKey: TestingKey): Promise<vscode.Position | null> {
        try {
            const line = document.lineAt(testingKey.line - 1);
            const lineText = line.text;
            
            // Найти позицию имени ключа в строке
            const keyNameIndex = lineText.indexOf(testingKey.name);
            if (keyNameIndex !== -1) {
                return new vscode.Position(testingKey.line - 1, keyNameIndex);
            }

            return null;
        } catch (error) {
            console.error('Error finding exact key position:', error);
            return null;
        }
    }

    /**
     * Подсветить объявление ключа
     */
    private async highlightKeyDeclaration(editor: vscode.TextEditor, testingKey: TestingKey): Promise<void> {
        try {
            const document = editor.document;
            const line = document.lineAt(testingKey.line - 1);
            const lineText = line.text;

            // Найти диапазон всего объявления ключа
            const declarationRange = new vscode.Range(
                new vscode.Position(testingKey.line - 1, 0),
                new vscode.Position(testingKey.line - 1, lineText.length)
            );

            // Создать декорацию для объявления
            const declarationType = this.widgetHighlighter.createKeyDeclarationDecoration();
            editor.setDecorations(declarationType, [declarationRange]);

            // Сохранить декорацию для последующей очистки
            const editorId = editor.document.uri.toString();
            if (!this.activeDecorations.has(editorId)) {
                this.activeDecorations.set(editorId, []);
            }
            this.activeDecorations.get(editorId)!.push(declarationType);

            // Автоматическая очистка через 5 секунд
            setTimeout(() => {
                this.clearDecorationsForEditor(editorId);
            }, 5000);

        } catch (error) {
            console.error('Error highlighting key declaration:', error);
        }
    }

    /**
     * Подсветить контекст использования ключа
     */
    private async highlightKeyUsageContext(editor: vscode.TextEditor, context: KeyContext): Promise<void> {
        try {
            const editorId = editor.document.uri.toString();
            const decorations: vscode.TextEditorDecorationType[] = [];

            // Подсветить сам ключ
            if (context.keyUsageRange) {
                const keyDecoration = this.widgetHighlighter.createKeyUsageDecoration();
                editor.setDecorations(keyDecoration, [context.keyUsageRange]);
                decorations.push(keyDecoration);
            }

            // Подсветить Widget границы
            if (context.widgetRange) {
                const widgetDecoration = this.widgetHighlighter.createWidgetBoundaryDecoration();
                editor.setDecorations(widgetDecoration, [context.widgetRange]);
                decorations.push(widgetDecoration);
            }

            // Подсветить область видимости
            if (context.scopeRange) {
                const scopeDecoration = this.widgetHighlighter.createScopeHighlightDecoration();
                editor.setDecorations(scopeDecoration, [context.scopeRange]);
                decorations.push(scopeDecoration);
            }

            // Сохранить декорации
            this.activeDecorations.set(editorId, decorations);

            // Автоматическая очистка через 8 секунд
            setTimeout(() => {
                this.clearDecorationsForEditor(editorId);
            }, 8000);

        } catch (error) {
            console.error('Error highlighting key usage context:', error);
        }
    }

    /**
     * Показать информацию о контексте
     */
    private async showContextInformation(context: KeyContext, testingKey: TestingKey): Promise<void> {
        try {
            let message = `🎯 Key: ${testingKey.name}`;
            
            if (context.widgetType) {
                message += `\n📱 Widget: ${context.widgetType}`;
            }
            
            if (context.methodName) {
                message += `\n⚙️ Method: ${context.methodName}`;
            }
            
            if (context.scopeInfo) {
                message += `\n🔍 Scope: ${context.scopeInfo}`;
            }

            // Показать toast уведомление
            vscode.window.showInformationMessage(message, { modal: false });

            // Также записать в Output Channel для детального анализа
            this.logNavigationInfo(context, testingKey);

        } catch (error) {
            console.error('Error showing context information:', error);
        }
    }

    /**
     * Получить превью использования ключа
     */
    private getUsagePreview(location: vscode.Location): string {
        try {
            // Это может быть улучшено для чтения содержимого файла
            const line = location.range.start.line + 1;
            return `Line ${line} - Key usage in widget`;
        } catch (error) {
            return 'Key usage';
        }
    }

    /**
     * Очистить декорации для конкретного редактора
     */
    private clearDecorationsForEditor(editorId: string): void {
        const decorations = this.activeDecorations.get(editorId);
        if (decorations) {
            // Найти активный редактор
            const activeEditor = vscode.window.visibleTextEditors.find(
                editor => editor.document.uri.toString() === editorId
            );

            if (activeEditor) {
                decorations.forEach(decoration => {
                    activeEditor.setDecorations(decoration, []);
                    decoration.dispose();
                });
            } else {
                // Если редактор не найден, просто удалить декорации
                decorations.forEach(decoration => decoration.dispose());
            }

            this.activeDecorations.delete(editorId);
        }
    }

    /**
     * Очистить все активные декорации
     */
    clearAllDecorations(): void {
        for (const editorId of this.activeDecorations.keys()) {
            this.clearDecorationsForEditor(editorId);
        }
    }

    /**
     * Записать информацию о навигации в лог
     */
    private logNavigationInfo(context: KeyContext, testingKey: TestingKey): void {
        try {
            console.log('Navigation completed:', {
                keyName: testingKey.name,
                keyValue: testingKey.value,
                widgetType: context.widgetType,
                methodName: context.methodName,
                scopeInfo: context.scopeInfo,
                filePath: context.location?.uri.fsPath,
                line: context.location?.range.start.line
            });
        } catch (error) {
            console.error('Error logging navigation info:', error);
        }
    }

    /**
     * Dispose метод для очистки ресурсов
     */
    dispose(): void {
        this.clearAllDecorations();
        this.widgetHighlighter.dispose();
    }
}