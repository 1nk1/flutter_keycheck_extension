import * as vscode from 'vscode';

/**
 * WidgetHighlighter - Сервис для подсвечивания Widget областей
 * 
 * Создает различные типы декораций для визуального выделения:
 * - Объявления ключей в KeyConstants
 * - Использования ключей в Widget-ах
 * - Границы Widget-ов
 * - Области видимости ключей
 * - Контекстные области кода
 */
export class WidgetHighlighter {
    private decorationTypes: Map<string, vscode.TextEditorDecorationType> = new Map();

    constructor() {
        this.initializeDecorationTypes();
    }

    /**
     * Инициализация типов декораций
     */
    private initializeDecorationTypes(): void {
        // Декорация для объявления ключей
        const keyDeclaration = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            borderRadius: '3px',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: new vscode.ThemeColor('editor.findMatchBorder'),
            overviewRulerColor: new vscode.ThemeColor('editor.findMatchHighlightBackground'),
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                contentText: ' 🔑',
                color: new vscode.ThemeColor('editor.foreground'),
                fontWeight: 'bold'
            }
        });

        // Декорация для использования ключей
        const keyUsage = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.wordHighlightBackground'),
            borderRadius: '2px',
            borderWidth: '1px',
            borderStyle: 'dotted',
            borderColor: new vscode.ThemeColor('editor.wordHighlightBorder'),
            overviewRulerColor: new vscode.ThemeColor('editor.wordHighlightBackground'),
            overviewRulerLane: vscode.OverviewRulerLane.Center,
            after: {
                contentText: ' ⚡',
                color: new vscode.ThemeColor('charts.blue'),
                fontWeight: 'normal'
            }
        });

        // Декорация для границ Widget
        const widgetBoundary = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.selectionHighlightBackground'),
            borderRadius: '4px',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: new vscode.ThemeColor('charts.green'),
            overviewRulerColor: new vscode.ThemeColor('charts.green'),
            overviewRulerLane: vscode.OverviewRulerLane.Full,
            isWholeLine: false,
            before: {
                contentText: '📱',
                color: new vscode.ThemeColor('charts.green'),
                fontWeight: 'bold',
                margin: '0 4px 0 0'
            }
        });

        // Декорация для области видимости
        const scopeHighlight = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editor.lineHighlightBackground'),
            borderRadius: '2px',
            borderWidth: '1px',
            borderStyle: 'dashed',
            borderColor: new vscode.ThemeColor('charts.purple'),
            overviewRulerColor: new vscode.ThemeColor('charts.purple'),
            overviewRulerLane: vscode.OverviewRulerLane.Left,
            opacity: '0.3',
            before: {
                contentText: '🔍',
                color: new vscode.ThemeColor('charts.purple'),
                margin: '0 2px 0 0'
            }
        });

        // Декорация для ошибок и предупреждений
        const errorHighlight = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('errorBackground'),
            borderRadius: '3px',
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: new vscode.ThemeColor('errorForeground'),
            overviewRulerColor: new vscode.ThemeColor('errorForeground'),
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                contentText: ' ❌',
                color: new vscode.ThemeColor('errorForeground'),
                fontWeight: 'bold'
            }
        });

        // Декорация для предупреждений
        const warningHighlight = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('warningBackground'),
            borderRadius: '3px',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: new vscode.ThemeColor('warningForeground'),
            overviewRulerColor: new vscode.ThemeColor('warningForeground'),
            overviewRulerLane: vscode.OverviewRulerLane.Right,
            after: {
                contentText: ' ⚠️',
                color: new vscode.ThemeColor('warningForeground'),
                fontWeight: 'bold'
            }
        });

        // Декорация для информационных подсветок
        const infoHighlight = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editorInfo.background'),
            borderRadius: '2px',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: new vscode.ThemeColor('editorInfo.foreground'),
            overviewRulerColor: new vscode.ThemeColor('editorInfo.foreground'),
            overviewRulerLane: vscode.OverviewRulerLane.Center,
            after: {
                contentText: ' ℹ️',
                color: new vscode.ThemeColor('editorInfo.foreground')
            }
        });

        // Сохранить все типы декораций
        this.decorationTypes.set('keyDeclaration', keyDeclaration);
        this.decorationTypes.set('keyUsage', keyUsage);
        this.decorationTypes.set('widgetBoundary', widgetBoundary);
        this.decorationTypes.set('scopeHighlight', scopeHighlight);
        this.decorationTypes.set('errorHighlight', errorHighlight);
        this.decorationTypes.set('warningHighlight', warningHighlight);
        this.decorationTypes.set('infoHighlight', infoHighlight);
    }

    /**
     * Создать декорацию для объявления ключа
     */
    createKeyDeclarationDecoration(): vscode.TextEditorDecorationType {
        return this.decorationTypes.get('keyDeclaration')!;
    }

    /**
     * Создать декорацию для использования ключа
     */
    createKeyUsageDecoration(): vscode.TextEditorDecorationType {
        return this.decorationTypes.get('keyUsage')!;
    }

    /**
     * Создать декорацию для границ Widget
     */
    createWidgetBoundaryDecoration(): vscode.TextEditorDecorationType {
        return this.decorationTypes.get('widgetBoundary')!;
    }

    /**
     * Создать декорацию для области видимости
     */
    createScopeHighlightDecoration(): vscode.TextEditorDecorationType {
        return this.decorationTypes.get('scopeHighlight')!;
    }

    /**
     * Создать декорацию для ошибок
     */
    createErrorHighlightDecoration(): vscode.TextEditorDecorationType {
        return this.decorationTypes.get('errorHighlight')!;
    }

    /**
     * Создать декорацию для предупреждений
     */
    createWarningHighlightDecoration(): vscode.TextEditorDecorationType {
        return this.decorationTypes.get('warningHighlight')!;
    }

    /**
     * Создать декорацию для информации
     */
    createInfoHighlightDecoration(): vscode.TextEditorDecorationType {
        return this.decorationTypes.get('infoHighlight')!;
    }

    /**
     * Создать кастомную декорацию с заданными параметрами
     */
    createCustomDecoration(options: {
        backgroundColor?: string | vscode.ThemeColor;
        borderColor?: string | vscode.ThemeColor;
        borderStyle?: string;
        borderWidth?: string;
        icon?: string;
        opacity?: string;
        isWholeLine?: boolean;
    }): vscode.TextEditorDecorationType {
        return vscode.window.createTextEditorDecorationType({
            backgroundColor: options.backgroundColor,
            borderRadius: '3px',
            borderWidth: options.borderWidth || '1px',
            borderStyle: options.borderStyle || 'solid',
            borderColor: options.borderColor,
            opacity: options.opacity,
            isWholeLine: options.isWholeLine || false,
            after: options.icon ? {
                contentText: ` ${options.icon}`,
                color: options.borderColor,
                fontWeight: 'bold'
            } : undefined
        });
    }

    /**
     * Применить множественные декорации к редактору
     */
    applyMultipleDecorations(
        editor: vscode.TextEditor,
        decorations: Array<{
            type: vscode.TextEditorDecorationType;
            ranges: vscode.Range[];
        }>
    ): void {
        try {
            decorations.forEach(({ type, ranges }) => {
                editor.setDecorations(type, ranges);
            });
        } catch (error) {
            console.error('Error applying multiple decorations:', error);
        }
    }

    /**
     * Очистить все декорации в редакторе
     */
    clearAllDecorations(editor: vscode.TextEditor): void {
        try {
            this.decorationTypes.forEach(decorationType => {
                editor.setDecorations(decorationType, []);
            });
        } catch (error) {
            console.error('Error clearing decorations:', error);
        }
    }

    /**
     * Создать анимированную декорацию (мигающую)
     */
    createAnimatedDecoration(
        editor: vscode.TextEditor,
        range: vscode.Range,
        duration: number = 2000
    ): void {
        try {
            const animatedDecoration = vscode.window.createTextEditorDecorationType({
                backgroundColor: new vscode.ThemeColor('charts.yellow'),
                borderRadius: '4px',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: new vscode.ThemeColor('charts.orange'),
                after: {
                    contentText: ' ✨',
                    color: new vscode.ThemeColor('charts.orange'),
                    fontWeight: 'bold'
                }
            });

            // Применить декорацию
            editor.setDecorations(animatedDecoration, [range]);

            // Убрать через заданное время
            setTimeout(() => {
                editor.setDecorations(animatedDecoration, []);
                animatedDecoration.dispose();
            }, duration);

        } catch (error) {
            console.error('Error creating animated decoration:', error);
        }
    }

    /**
     * Подсветить весь Widget блок с контекстом
     */
    highlightWidgetBlock(
        editor: vscode.TextEditor,
        startLine: number,
        endLine: number,
        widgetType: string
    ): vscode.TextEditorDecorationType {
        try {
            const blockDecoration = vscode.window.createTextEditorDecorationType({
                backgroundColor: new vscode.ThemeColor('editor.selectionBackground'),
                borderRadius: '4px',
                borderWidth: '2px',
                borderStyle: 'solid',
                borderColor: new vscode.ThemeColor('charts.blue'),
                overviewRulerColor: new vscode.ThemeColor('charts.blue'),
                overviewRulerLane: vscode.OverviewRulerLane.Full,
                before: {
                    contentText: `${widgetType} `,
                    color: new vscode.ThemeColor('charts.blue'),
                    fontWeight: 'bold',
                    backgroundColor: new vscode.ThemeColor('editor.background'),
                    border: '1px solid',
                    borderColor: new vscode.ThemeColor('charts.blue'),
                    margin: '0 4px 0 0'
                }
            });

            const range = new vscode.Range(
                new vscode.Position(startLine, 0),
                new vscode.Position(endLine, Number.MAX_SAFE_INTEGER)
            );

            editor.setDecorations(blockDecoration, [range]);
            return blockDecoration;

        } catch (error) {
            console.error('Error highlighting widget block:', error);
            return this.createInfoHighlightDecoration();
        }
    }

    /**
     * Создать декорацию с tooltip информацией
     */
    createTooltipDecoration(
        tooltipText: string,
        severity: 'info' | 'warning' | 'error' = 'info'
    ): vscode.TextEditorDecorationType {
        const colors = {
            info: { bg: 'editorInfo.background', fg: 'editorInfo.foreground', icon: 'ℹ️' },
            warning: { bg: 'warningBackground', fg: 'warningForeground', icon: '⚠️' },
            error: { bg: 'errorBackground', fg: 'errorForeground', icon: '❌' }
        };

        const color = colors[severity];

        return vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor(color.bg),
            borderRadius: '3px',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: new vscode.ThemeColor(color.fg),
            after: {
                contentText: ` ${color.icon}`,
                color: new vscode.ThemeColor(color.fg),
                fontWeight: 'bold'
            },
            rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
        });
    }

    /**
     * Dispose метод для очистки всех ресурсов
     */
    dispose(): void {
        try {
            this.decorationTypes.forEach(decorationType => {
                decorationType.dispose();
            });
            this.decorationTypes.clear();
        } catch (error) {
            console.error('Error disposing WidgetHighlighter:', error);
        }
    }

    /**
     * Получить статистику использования декораций
     */
    getDecorationStats(): {
        totalTypes: number;
        activeDecorations: string[];
    } {
        return {
            totalTypes: this.decorationTypes.size,
            activeDecorations: Array.from(this.decorationTypes.keys())
        };
    }
}