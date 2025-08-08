import * as vscode from 'vscode';
import { TestingKey } from '../models/testingKey';

/**
 * Интерфейс для контекста использования ключа
 */
export interface KeyContext {
    location: vscode.Location;
    widgetType?: string;
    widgetRange?: vscode.Range;
    methodName?: string;
    methodRange?: vscode.Range;
    scopeInfo?: string;
    scopeRange?: vscode.Range;
    keyUsageRange?: vscode.Range;
    parentWidgets: string[];
    indentationLevel: number;
    codeBlock: {
        start: vscode.Position;
        end: vscode.Position;
        content: string;
    };
}

/**
 * ContextAnalyzer - Сервис для анализа контекста и области видимости ключей
 * 
 * Анализирует:
 * - Тип Widget-а в котором используется ключ
 * - Границы Widget-а и его область видимости
 * - Метод или функцию в которой находится ключ
 * - Уровень вложенности и родительские Widget-ы
 * - Контекст кода для подсвечивания
 */
export class ContextAnalyzer {
    // Regex паттерны для анализа Dart кода
    private static readonly WIDGET_PATTERNS = {
        // Основные Widget паттерны
        WIDGET_CONSTRUCTOR: /(\w+)\s*\([^)]*key:\s*Key\(KeyConstants\.(\w+)\)/,
        WIDGET_WITH_KEY: /(\w+)\s*\(\s*[^)]*key:\s*Key\(KeyConstants\.(\w+)\)[^)]*\)/,
        WIDGET_DECLARATION: /(\w+)\s*\(/,
        
        // Flutter специфичные Widget-ы
        FLUTTER_WIDGETS: /\b(Scaffold|AppBar|Container|Column|Row|Stack|Positioned|Flexible|Expanded|SizedBox|Padding|Center|Align|TextField|ElevatedButton|TextButton|IconButton|FloatingActionButton|Card|ListTile|Drawer|BottomNavigationBar|TabBar|Dialog|AlertDialog|SnackBar|Chip|Switch|Checkbox|Radio|Slider|ProgressIndicator|RefreshIndicator|ListView|GridView|PageView|TabView|CustomScrollView|SingleChildScrollView|Hero|AnimatedContainer|FadeTransition|SlideTransition|ScaleTransition|RotationTransition)\b/g,
        
        // Методы и функции
        METHOD_DECLARATION: /(\w+)\s*\([^)]*\)\s*(?:async\s*)?\s*{/,
        BUILD_METHOD: /Widget\s+build\s*\([^)]*\)\s*{/,
        
        // Скобки и блоки кода
        OPENING_BRACE: /{/g,
        CLOSING_BRACE: /}/g,
        OPENING_PAREN: /\(/g,
        CLOSING_PAREN: /\)/g
    };

    constructor() {}

    /**
     * Анализировать контекст использования ключа
     */
    async analyzeKeyContext(
        document: vscode.TextDocument,
        location: vscode.Location,
        testingKey: TestingKey
    ): Promise<KeyContext> {
        try {
            const position = location.range.start;
            const line = document.lineAt(position.line);
            const lineText = line.text;

            // Базовый контекст
            const context: KeyContext = {
                location,
                parentWidgets: [],
                indentationLevel: this.getIndentationLevel(lineText),
                codeBlock: {
                    start: position,
                    end: position,
                    content: lineText.trim()
                }
            };

            // Найти диапазон использования ключа
            context.keyUsageRange = this.findKeyUsageRange(document, position, testingKey.name);

            // Анализировать Widget в котором используется ключ
            const widgetInfo = await this.analyzeWidgetContext(document, position);
            if (widgetInfo) {
                context.widgetType = widgetInfo.type;
                context.widgetRange = widgetInfo.range;
            }

            // Анализировать метод
            const methodInfo = await this.analyzeMethodContext(document, position);
            if (methodInfo) {
                context.methodName = methodInfo.name;
                context.methodRange = methodInfo.range;
            }

            // Анализировать область видимости
            const scopeInfo = await this.analyzeScopeContext(document, position);
            if (scopeInfo) {
                context.scopeInfo = scopeInfo.description;
                context.scopeRange = scopeInfo.range;
            }

            // Найти родительские Widget-ы
            context.parentWidgets = await this.findParentWidgets(document, position);

            // Определить блок кода для подсвечивания
            context.codeBlock = await this.findCodeBlock(document, position);

            return context;

        } catch (error) {
            console.error('Error analyzing key context:', error);
            return {
                location,
                parentWidgets: [],
                indentationLevel: 0,
                codeBlock: {
                    start: location.range.start,
                    end: location.range.end,
                    content: ''
                }
            };
        }
    }

    /**
     * Найти диапазон использования ключа
     */
    private findKeyUsageRange(
        document: vscode.TextDocument,
        position: vscode.Position,
        keyName: string
    ): vscode.Range {
        try {
            const line = document.lineAt(position.line);
            const lineText = line.text;
            
            // Найти KeyConstants.keyName в строке
            const keyPattern = new RegExp(`KeyConstants\\.${keyName}`, 'g');
            const match = keyPattern.exec(lineText);
            
            if (match) {
                const startCol = match.index;
                const endCol = match.index + match[0].length;
                
                return new vscode.Range(
                    new vscode.Position(position.line, startCol),
                    new vscode.Position(position.line, endCol)
                );
            }

            // Fallback - выделить всю строку
            return new vscode.Range(
                new vscode.Position(position.line, 0),
                new vscode.Position(position.line, lineText.length)
            );

        } catch (error) {
            console.error('Error finding key usage range:', error);
            return new vscode.Range(position, position);
        }
    }

    /**
     * Анализировать контекст Widget-а
     */
    private async analyzeWidgetContext(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<{ type: string; range: vscode.Range } | null> {
        try {
            const lineText = document.lineAt(position.line).text;
            
            // Попробовать найти Widget на текущей строке
            const widgetMatch = lineText.match(ContextAnalyzer.WIDGET_PATTERNS.WIDGET_CONSTRUCTOR);
            if (widgetMatch) {
                const widgetType = widgetMatch[1];
                const widgetRange = await this.findWidgetBoundaries(document, position, widgetType);
                return { type: widgetType, range: widgetRange };
            }

            // Поиск Widget-а в окружающих строках
            for (let i = Math.max(0, position.line - 10); i <= Math.min(document.lineCount - 1, position.line + 5); i++) {
                const currentLine = document.lineAt(i).text;
                const flutterWidgetMatch = currentLine.match(ContextAnalyzer.WIDGET_PATTERNS.FLUTTER_WIDGETS);
                
                if (flutterWidgetMatch && this.isWithinWidgetScope(document, position, new vscode.Position(i, 0))) {
                    const widgetType = flutterWidgetMatch[0];
                    const widgetRange = await this.findWidgetBoundaries(document, new vscode.Position(i, 0), widgetType);
                    return { type: widgetType, range: widgetRange };
                }
            }

            return null;
        } catch (error) {
            console.error('Error analyzing widget context:', error);
            return null;
        }
    }

    /**
     * Найти границы Widget-а
     */
    private async findWidgetBoundaries(
        document: vscode.TextDocument,
        startPosition: vscode.Position,
        widgetType: string
    ): Promise<vscode.Range> {
        try {
            // Найти начало Widget-а
            let widgetStartLine = startPosition.line;
            let widgetStartCol = 0;
            
            const startLineText = document.lineAt(widgetStartLine).text;
            const widgetIndex = startLineText.indexOf(widgetType);
            if (widgetIndex !== -1) {
                widgetStartCol = widgetIndex;
            }

            // Найти конец Widget-а по балансу скобок
            let braceCount = 0;
            let parenCount = 0;
            let endLine = widgetStartLine;
            let endCol = startLineText.length;

            for (let i = widgetStartLine; i < document.lineCount; i++) {
                const lineText = document.lineAt(i).text;
                
                // Подсчитать скобки в строке
                for (let j = (i === widgetStartLine ? widgetStartCol : 0); j < lineText.length; j++) {
                    const char = lineText[j];
                    
                    if (char === '(') {
                        parenCount++;
                    } else if (char === ')') {
                        parenCount--;
                        if (parenCount === 0 && i > widgetStartLine) {
                            endLine = i;
                            endCol = j + 1;
                            break;
                        }
                    } else if (char === '{') {
                        braceCount++;
                    } else if (char === '}') {
                        braceCount--;
                    }
                }

                if (parenCount <= 0 && braceCount <= 0 && i > widgetStartLine) {
                    break;
                }
            }

            return new vscode.Range(
                new vscode.Position(widgetStartLine, widgetStartCol),
                new vscode.Position(endLine, endCol)
            );

        } catch (error) {
            console.error('Error finding widget boundaries:', error);
            return new vscode.Range(startPosition, startPosition);
        }
    }

    /**
     * Анализировать контекст метода
     */
    private async analyzeMethodContext(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<{ name: string; range: vscode.Range } | null> {
        try {
            // Поиск метода выше текущей позиции
            for (let i = position.line; i >= Math.max(0, position.line - 50); i--) {
                const lineText = document.lineAt(i).text;
                
                // Проверить на build метод
                if (ContextAnalyzer.WIDGET_PATTERNS.BUILD_METHOD.test(lineText)) {
                    const methodRange = await this.findMethodBoundaries(document, new vscode.Position(i, 0));
                    return { name: 'build', range: methodRange };
                }

                // Проверить на обычный метод
                const methodMatch = lineText.match(ContextAnalyzer.WIDGET_PATTERNS.METHOD_DECLARATION);
                if (methodMatch) {
                    const methodName = methodMatch[1];
                    const methodRange = await this.findMethodBoundaries(document, new vscode.Position(i, 0));
                    
                    // Проверить что position находится внутри этого метода
                    if (position.line >= i && position.line <= methodRange.end.line) {
                        return { name: methodName, range: methodRange };
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Error analyzing method context:', error);
            return null;
        }
    }

    /**
     * Найти границы метода
     */
    private async findMethodBoundaries(
        document: vscode.TextDocument,
        startPosition: vscode.Position
    ): Promise<vscode.Range> {
        try {
            let braceCount = 0;
            let foundOpeningBrace = false;
            let endLine = startPosition.line;

            for (let i = startPosition.line; i < document.lineCount; i++) {
                const lineText = document.lineAt(i).text;
                
                for (const char of lineText) {
                    if (char === '{') {
                        braceCount++;
                        foundOpeningBrace = true;
                    } else if (char === '}') {
                        braceCount--;
                        if (foundOpeningBrace && braceCount === 0) {
                            endLine = i;
                            return new vscode.Range(
                                startPosition,
                                new vscode.Position(endLine, lineText.length)
                            );
                        }
                    }
                }
            }

            return new vscode.Range(startPosition, startPosition);
        } catch (error) {
            console.error('Error finding method boundaries:', error);
            return new vscode.Range(startPosition, startPosition);
        }
    }

    /**
     * Анализировать область видимости
     */
    private async analyzeScopeContext(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<{ description: string; range: vscode.Range } | null> {
        try {
            const indentLevel = this.getIndentationLevel(document.lineAt(position.line).text);
            
            // Найти блок кода с таким же или меньшим уровнем отступа
            let scopeStart = position.line;
            let scopeEnd = position.line;

            // Поиск начала области видимости
            for (let i = position.line - 1; i >= 0; i--) {
                const lineText = document.lineAt(i).text.trim();
                if (lineText === '') continue;
                
                const currentIndent = this.getIndentationLevel(document.lineAt(i).text);
                if (currentIndent < indentLevel) {
                    scopeStart = i;
                    break;
                }
            }

            // Поиск конца области видимости
            for (let i = position.line + 1; i < document.lineCount; i++) {
                const lineText = document.lineAt(i).text.trim();
                if (lineText === '') continue;
                
                const currentIndent = this.getIndentationLevel(document.lineAt(i).text);
                if (currentIndent < indentLevel) {
                    scopeEnd = i - 1;
                    break;
                }
                scopeEnd = i;
            }

            const scopeRange = new vscode.Range(
                new vscode.Position(scopeStart, 0),
                new vscode.Position(scopeEnd, document.lineAt(scopeEnd).text.length)
            );

            const description = `Code block (${scopeEnd - scopeStart + 1} lines, indent level ${indentLevel})`;

            return { description, range: scopeRange };

        } catch (error) {
            console.error('Error analyzing scope context:', error);
            return null;
        }
    }

    /**
     * Найти родительские Widget-ы
     */
    private async findParentWidgets(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<string[]> {
        try {
            const parents: string[] = [];
            const currentIndent = this.getIndentationLevel(document.lineAt(position.line).text);

            // Поиск родительских Widget-ов по уровню отступа
            for (let i = position.line - 1; i >= 0; i--) {
                const lineText = document.lineAt(i).text;
                const lineIndent = this.getIndentationLevel(lineText);

                if (lineIndent < currentIndent) {
                    const flutterWidgetMatch = lineText.match(ContextAnalyzer.WIDGET_PATTERNS.FLUTTER_WIDGETS);
                    if (flutterWidgetMatch) {
                        parents.unshift(flutterWidgetMatch[0]);
                        if (parents.length >= 5) break; // Ограничить количество родительских Widget-ов
                    }
                }
            }

            return parents;
        } catch (error) {
            console.error('Error finding parent widgets:', error);
            return [];
        }
    }

    /**
     * Найти блок кода для подсвечивания
     */
    private async findCodeBlock(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<{ start: vscode.Position; end: vscode.Position; content: string }> {
        try {
            const currentLine = position.line;
            const currentIndent = this.getIndentationLevel(document.lineAt(currentLine).text);

            // Найти начало и конец логического блока
            let startLine = currentLine;
            let endLine = currentLine;

            // Поиск начала блока
            for (let i = currentLine - 1; i >= 0; i--) {
                const lineText = document.lineAt(i).text.trim();
                if (lineText === '') continue;

                const indent = this.getIndentationLevel(document.lineAt(i).text);
                if (indent < currentIndent || lineText.includes('{') || lineText.includes('(')) {
                    startLine = i;
                    break;
                }
            }

            // Поиск конца блока
            for (let i = currentLine + 1; i < document.lineCount; i++) {
                const lineText = document.lineAt(i).text.trim();
                if (lineText === '') continue;

                const indent = this.getIndentationLevel(document.lineAt(i).text);
                if (indent < currentIndent || lineText.includes('}') || lineText.includes(')')) {
                    endLine = i;
                    break;
                }
            }

            // Получить содержимое блока
            const lines = [];
            for (let i = startLine; i <= endLine; i++) {
                lines.push(document.lineAt(i).text);
            }

            return {
                start: new vscode.Position(startLine, 0),
                end: new vscode.Position(endLine, document.lineAt(endLine).text.length),
                content: lines.join('\n')
            };

        } catch (error) {
            console.error('Error finding code block:', error);
            return {
                start: position,
                end: position,
                content: document.lineAt(position.line).text
            };
        }
    }

    /**
     * Получить уровень отступа строки
     */
    private getIndentationLevel(lineText: string): number {
        try {
            const match = lineText.match(/^(\s*)/);
            if (match) {
                const indent = match[1];
                // Считать что 1 таб = 4 пробела
                return indent.replace(/\t/g, '    ').length / 2;
            }
            return 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Проверить находится ли позиция в области видимости Widget-а
     */
    private isWithinWidgetScope(
        document: vscode.TextDocument,
        position: vscode.Position,
        widgetPosition: vscode.Position
    ): boolean {
        try {
            // Простая проверка по номеру строки и отступу
            if (position.line < widgetPosition.line) {
                return false;
            }

            const widgetIndent = this.getIndentationLevel(document.lineAt(widgetPosition.line).text);
            const positionIndent = this.getIndentationLevel(document.lineAt(position.line).text);

            return positionIndent > widgetIndent;
        } catch (error) {
            return false;
        }
    }
}