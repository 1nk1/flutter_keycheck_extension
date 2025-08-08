import * as vscode from 'vscode';
import { KeyCategory, TestingKey } from '../models/testingKey';
import { FileUtils } from './fileUtils';

export class DartParser {
    // Regex patterns for parsing Dart code
    private static readonly KEY_CONSTANTS_PATTERN = /static\s+const\s+String\s+(\w+)\s*=\s*['"]([^'"]+)['"]/g;
    private static readonly KEY_USAGE_PATTERN = /Key\(KeyConstants\.(\w+)\)/g;
    private static readonly HARDCODED_KEY_PATTERN = /Key\(['"]([^'"]+)['"]\)/g;
    private static readonly WIDGET_KEY_PATTERN = /key:\s*Key\(KeyConstants\.(\w+)\)/g;
    private static readonly WIDGET_PATTERN = /(\w+)\s*\([^)]*key:\s*Key\(KeyConstants\.(\w+)\)/g;

    /**
     * Parse KeyConstants from a Dart file
     */
    static parseKeyConstants(filePath: string): TestingKey[] {
        const content = FileUtils.readFileContent(filePath);
        if (!content) {
            return [];
        }

        const keys: TestingKey[] = [];
        let match;

        // Reset regex state
        this.KEY_CONSTANTS_PATTERN.lastIndex = 0;

        while ((match = this.KEY_CONSTANTS_PATTERN.exec(content)) !== null) {
            const [, name, value] = match;
            const line = FileUtils.getLineNumber(content, match.index);
            const category = this.categorizeKey(name, value);

            keys.push({
                name,
                value,
                category,
                filePath,
                line,
                isDefined: true,
                isUsed: false,
                usageCount: 0
            });
        }

        return keys;
    }

    /**
     * Find key usage in Dart files
     */
    static findKeyUsage(filePath: string): Map<string, number> {
        const content = FileUtils.readFileContent(filePath);
        if (!content) {
            return new Map();
        }

        const usage = new Map<string, number>();
        let match;

        // Reset regex state
        this.KEY_USAGE_PATTERN.lastIndex = 0;

        while ((match = this.KEY_USAGE_PATTERN.exec(content)) !== null) {
            const keyName = match[1];
            usage.set(keyName, (usage.get(keyName) || 0) + 1);
        }

        return usage;
    }

    /**
     * Find key usage with locations in Dart files
     */
    static findKeyUsageWithLocations(filePath: string): Map<string, vscode.Location[]> {
        const content = FileUtils.readFileContent(filePath);
        if (!content) {
            return new Map();
        }

        const usageMap = new Map<string, vscode.Location[]>();
        let match;

        // Reset regex state
        this.KEY_USAGE_PATTERN.lastIndex = 0;

        while ((match = this.KEY_USAGE_PATTERN.exec(content)) !== null) {
            const keyName = match[1];
            const matchIndex = match.index;
            const line = FileUtils.getLineNumber(content, matchIndex);
            const startColumn = FileUtils.getColumnNumber(content, matchIndex);
            const endColumn = startColumn + match[0].length;

            const uri = vscode.Uri.file(filePath);
            const range = new vscode.Range(
                new vscode.Position(line - 1, startColumn),
                new vscode.Position(line - 1, endColumn)
            );
            const location = new vscode.Location(uri, range);

            if (!usageMap.has(keyName)) {
                usageMap.set(keyName, []);
            }
            usageMap.get(keyName)!.push(location);
        }

        return usageMap;
    }

    /**
     * Find hardcoded keys that should be constants
     */
    static findHardcodedKeys(filePath: string): Array<{key: string, line: number, column: number}> {
        const content = FileUtils.readFileContent(filePath);
        if (!content) {
            return [];
        }

        const hardcodedKeys: Array<{key: string, line: number, column: number}> = [];
        let match;

        // Reset regex state
        this.HARDCODED_KEY_PATTERN.lastIndex = 0;

        while ((match = this.HARDCODED_KEY_PATTERN.exec(content)) !== null) {
            const keyValue = match[1];
            const line = FileUtils.getLineNumber(content, match.index);
            const column = FileUtils.getColumnNumber(content, match.index);

            hardcodedKeys.push({
                key: keyValue,
                line,
                column
            });
        }

        return hardcodedKeys;
    }

    /**
     * Find widget types that use specific keys
     */
    static findWidgetUsage(filePath: string): Map<string, string[]> {
        const content = FileUtils.readFileContent(filePath);
        if (!content) {
            return new Map();
        }

        const widgetUsage = new Map<string, string[]>();
        let match;

        // Reset regex state
        this.WIDGET_PATTERN.lastIndex = 0;

        while ((match = this.WIDGET_PATTERN.exec(content)) !== null) {
            const [, widgetType, keyName] = match;

            if (!widgetUsage.has(keyName)) {
                widgetUsage.set(keyName, []);
            }

            const widgets = widgetUsage.get(keyName)!;
            if (!widgets.includes(widgetType)) {
                widgets.push(widgetType);
            }
        }

        return widgetUsage;
    }

    /**
     * Categorize a key based on its name and value
     */
    static categorizeKey(name: string, value: string): KeyCategory {
        const nameLower = name.toLowerCase();
        const valueLower = value.toLowerCase();

        // Check name patterns
        if (nameLower.includes('button') || nameLower.includes('btn')) {
            return KeyCategory.Buttons;
        }
        if (nameLower.includes('field') || nameLower.includes('input') || nameLower.includes('textfield')) {
            return KeyCategory.TextFields;
        }
        if (nameLower.includes('checkbox') || nameLower.includes('check')) {
            return KeyCategory.Checkboxes;
        }
        if (nameLower.includes('dropdown') || nameLower.includes('select')) {
            return KeyCategory.Dropdowns;
        }
        if (nameLower.includes('nav') || nameLower.includes('menu') || nameLower.includes('bar')) {
            return KeyCategory.Navigation;
        }
        if (nameLower.includes('list') || nameLower.includes('item')) {
            return KeyCategory.Lists;
        }
        if (nameLower.includes('card')) {
            return KeyCategory.Cards;
        }
        if (nameLower.includes('dialog') || nameLower.includes('modal') || nameLower.includes('popup')) {
            return KeyCategory.Dialogs;
        }
        if (nameLower.includes('game') || nameLower.includes('play')) {
            return KeyCategory.GameElements;
        }
        if (nameLower.includes('setting') || nameLower.includes('config') || nameLower.includes('language')) {
            return KeyCategory.Settings;
        }

        // Check value patterns
        if (valueLower.includes('button') || valueLower.includes('btn')) {
            return KeyCategory.Buttons;
        }
        if (valueLower.includes('field') || valueLower.includes('input')) {
            return KeyCategory.TextFields;
        }

        return KeyCategory.Other;
    }

    /**
     * Generate constant name from a value
     */
    static generateConstantName(value: string): string {
        return value
            .replace(/[^a-zA-Z0-9]/g, '_')
            .replace(/^_+|_+$/g, '')
            .replace(/_+/g, '_')
            .replace(/^([0-9])/, '_$1')
            .toUpperCase();
    }

    /**
     * Check if a line contains a key usage
     */
    static isKeyUsageLine(line: string): boolean {
        return this.KEY_USAGE_PATTERN.test(line) || this.WIDGET_KEY_PATTERN.test(line);
    }

    /**
     * Extract key name from a usage line
     */
    static extractKeyNameFromUsage(line: string): string | null {
        const keyMatch = line.match(/KeyConstants\.(\w+)/);
        return keyMatch ? keyMatch[1] : null;
    }

    /**
     * Check if file is a key constants file
     */
    static isKeyConstantsFile(filePath: string): boolean {
        return filePath.includes('key_constants') ||
               filePath.includes('keys.dart') ||
               filePath.includes('constants');
    }

    /**
     * Get import statement for KeyConstants
     */
    static getKeyConstantsImport(keyConstantsPath: string): string {
        const importPath = keyConstantsPath.replace(/^lib\//, '').replace(/\.dart$/, '');
        return `import 'package:${this.getPackageName()}/${importPath}.dart';`;
    }

    /**
     * Get package name from pubspec.yaml
     */
    private static getPackageName(): string {
        const workspaceRoot = FileUtils.getWorkspaceRoot();
        if (!workspaceRoot) {
            return 'app';
        }

        const pubspecPath = `${workspaceRoot}/pubspec.yaml`;
        const pubspecContent = FileUtils.readFileContent(pubspecPath);

        if (pubspecContent) {
            const nameMatch = pubspecContent.match(/^name:\s*(.+)$/m);
            if (nameMatch) {
                return nameMatch[1].trim();
            }
        }

        return 'app';
    }

    // НОВЫЕ МЕТОДЫ ДЛЯ ОПРЕДЕЛЕНИЯ WIDGET BOUNDARIES

    /**
     * Найти границы Widget-а в коде
     */
    static findWidgetBoundaries(filePath: string, keyName: string): Array<{
        widgetType: string;
        startLine: number;
        endLine: number;
        startColumn: number;
        endColumn: number;
        keyLine: number;
        keyColumn: number;
    }> {
        const content = FileUtils.readFileContent(filePath);
        if (!content) {
            return [];
        }

        const boundaries: Array<{
            widgetType: string;
            startLine: number;
            endLine: number;
            startColumn: number;
            endColumn: number;
            keyLine: number;
            keyColumn: number;
        }> = [];

        const lines = content.split('\n');
        
        // Найти все использования ключа
        lines.forEach((line, lineIndex) => {
            const keyPattern = new RegExp(`Key\\(KeyConstants\\.${keyName}\\)`, 'g');
            let match;
            
            while ((match = keyPattern.exec(line)) !== null) {
                const keyColumn = match.index;
                
                // Найти Widget который содержит этот ключ
                const widgetInfo = this.findWidgetContainingKey(lines, lineIndex, keyColumn);
                if (widgetInfo) {
                    boundaries.push({
                        widgetType: widgetInfo.widgetType,
                        startLine: widgetInfo.startLine,
                        endLine: widgetInfo.endLine,
                        startColumn: widgetInfo.startColumn,
                        endColumn: widgetInfo.endColumn,
                        keyLine: lineIndex,
                        keyColumn: keyColumn
                    });
                }
            }
        });

        return boundaries;
    }

    /**
     * Найти Widget содержащий ключ на указанной позиции
     */
    private static findWidgetContainingKey(
        lines: string[],
        keyLine: number,
        keyColumn: number
    ): {
        widgetType: string;
        startLine: number;
        endLine: number;
        startColumn: number;
        endColumn: number;
    } | null {
        try {
            // Поиск Widget-а на текущей строке или выше
            for (let i = keyLine; i >= Math.max(0, keyLine - 20); i--) {
                const line = lines[i];
                const widgetMatch = line.match(/(\w+)\s*\(/);
                
                if (widgetMatch && this.isFlutterWidget(widgetMatch[1])) {
                    const widgetType = widgetMatch[1];
                    const startColumn = line.indexOf(widgetType);
                    
                    // Найти конец Widget-а
                    const endInfo = this.findWidgetEnd(lines, i, startColumn);
                    
                    if (endInfo) {
                        return {
                            widgetType,
                            startLine: i,
                            endLine: endInfo.line,
                            startColumn,
                            endColumn: endInfo.column
                        };
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('Error finding widget containing key:', error);
            return null;
        }
    }

    /**
     * Найти конец Widget-а по балансу скобок
     */
    private static findWidgetEnd(
        lines: string[],
        startLine: number,
        startColumn: number
    ): { line: number; column: number } | null {
        try {
            let parenthesesCount = 0;
            let braceCount = 0;
            let foundStart = false;

            for (let i = startLine; i < lines.length; i++) {
                const line = lines[i];
                const startPos = (i === startLine) ? startColumn : 0;

                for (let j = startPos; j < line.length; j++) {
                    const char = line[j];

                    if (char === '(') {
                        parenthesesCount++;
                        foundStart = true;
                    } else if (char === ')') {
                        parenthesesCount--;
                        if (foundStart && parenthesesCount === 0) {
                            return { line: i, column: j };
                        }
                    } else if (char === '{') {
                        braceCount++;
                    } else if (char === '}') {
                        braceCount--;
                    }

                    // Если есть незакрытые фигурные скобки, продолжаем поиск
                    if (foundStart && parenthesesCount === 0 && braceCount === 0 && i > startLine) {
                        return { line: i, column: j };
                    }
                }
            }

            return null;
        } catch (error) {
            console.error('Error finding widget end:', error);
            return null;
        }
    }

    /**
     * Проверить является ли строка Flutter Widget-ом
     */
    private static isFlutterWidget(name: string): boolean {
        const flutterWidgets = [
            // Layout widgets
            'Container', 'Column', 'Row', 'Stack', 'Positioned', 'Flexible', 'Expanded',
            'SizedBox', 'Padding', 'Center', 'Align', 'FittedBox', 'AspectRatio',
            
            // Input widgets
            'TextField', 'TextFormField', 'Checkbox', 'Radio', 'Switch', 'Slider',
            'DropdownButton', 'DropdownButtonFormField',
            
            // Button widgets
            'ElevatedButton', 'TextButton', 'OutlinedButton', 'IconButton',
            'FloatingActionButton', 'PopupMenuButton',
            
            // Display widgets
            'Text', 'RichText', 'Image', 'Icon', 'CircularProgressIndicator',
            'LinearProgressIndicator', 'Card', 'Chip', 'Avatar', 'CircleAvatar',
            
            // Scrollable widgets
            'ListView', 'GridView', 'PageView', 'SingleChildScrollView',
            'CustomScrollView', 'NestedScrollView',
            
            // Navigation widgets
            'Scaffold', 'AppBar', 'BottomNavigationBar', 'TabBar', 'Drawer',
            'BottomSheet', 'SnackBar', 'NavigationRail',
            
            // Dialog widgets
            'Dialog', 'AlertDialog', 'SimpleDialog', 'BottomSheet',
            
            // Animation widgets
            'AnimatedContainer', 'AnimatedOpacity', 'FadeTransition',
            'SlideTransition', 'ScaleTransition', 'RotationTransition',
            'Hero', 'AnimatedSwitcher',
            
            // Custom widgets (common patterns)
            'StatefulWidget', 'StatelessWidget', 'InheritedWidget',
            'CustomPaint', 'CustomScrollView'
        ];

        return flutterWidgets.includes(name) || name.endsWith('Widget');
    }

    /**
     * Найти все Widget-ы в файле с их позициями
     */
    static findAllWidgets(filePath: string): Array<{
        name: string;
        line: number;
        column: number;
        startLine: number;
        endLine: number;
        hasKey: boolean;
        keyNames: string[];
    }> {
        const content = FileUtils.readFileContent(filePath);
        if (!content) {
            return [];
        }

        const widgets: Array<{
            name: string;
            line: number;
            column: number;
            startLine: number;
            endLine: number;
            hasKey: boolean;
            keyNames: string[];
        }> = [];

        const lines = content.split('\n');

        lines.forEach((line, lineIndex) => {
            const widgetPattern = /(\w+)\s*\(/g;
            let match;

            while ((match = widgetPattern.exec(line)) !== null) {
                const widgetName = match[1];
                
                if (this.isFlutterWidget(widgetName)) {
                    const column = match.index;
                    
                    // Найти конец Widget-а
                    const endInfo = this.findWidgetEnd(lines, lineIndex, column);
                    const endLine = endInfo ? endInfo.line : lineIndex;

                    // Проверить есть ли ключи в этом Widget-е
                    const keyInfo = this.findKeysInWidgetRange(lines, lineIndex, endLine);

                    widgets.push({
                        name: widgetName,
                        line: lineIndex,
                        column,
                        startLine: lineIndex,
                        endLine,
                        hasKey: keyInfo.hasKey,
                        keyNames: keyInfo.keyNames
                    });
                }
            }
        });

        return widgets;
    }

    /**
     * Найти ключи в указанном диапазоне строк
     */
    private static findKeysInWidgetRange(
        lines: string[],
        startLine: number,
        endLine: number
    ): { hasKey: boolean; keyNames: string[] } {
        const keyNames: string[] = [];

        for (let i = startLine; i <= endLine && i < lines.length; i++) {
            const line = lines[i];
            const keyPattern = /Key\(KeyConstants\.(\w+)\)/g;
            let match;

            while ((match = keyPattern.exec(line)) !== null) {
                keyNames.push(match[1]);
            }
        }

        return {
            hasKey: keyNames.length > 0,
            keyNames
        };
    }

    /**
     * Получить контекстную информацию о Widget-е
     */
    static getWidgetContext(
        filePath: string,
        line: number
    ): {
        widgetName?: string;
        parentWidgets: string[];
        childWidgets: string[];
        indentLevel: number;
        methodName?: string;
        className?: string;
    } {
        const content = FileUtils.readFileContent(filePath);
        if (!content) {
            return {
                parentWidgets: [],
                childWidgets: [],
                indentLevel: 0
            };
        }

        const lines = content.split('\n');
        const currentLine = lines[line];
        const indentLevel = this.getIndentationLevel(currentLine);

        // Найти текущий Widget
        let widgetName: string | undefined;
        const widgetMatch = currentLine.match(/(\w+)\s*\(/);
        if (widgetMatch && this.isFlutterWidget(widgetMatch[1])) {
            widgetName = widgetMatch[1];
        }

        // Найти родительские Widget-ы
        const parentWidgets = this.findParentWidgets(lines, line, indentLevel);

        // Найти дочерние Widget-ы
        const childWidgets = this.findChildWidgets(lines, line, indentLevel);

        // Найти метод и класс
        const methodName = this.findContainingMethod(lines, line);
        const className = this.findContainingClass(lines, line);

        return {
            widgetName,
            parentWidgets,
            childWidgets,
            indentLevel,
            methodName,
            className
        };
    }

    /**
     * Получить уровень отступа
     */
    private static getIndentationLevel(line: string): number {
        const match = line.match(/^(\s*)/);
        if (match) {
            return match[1].length;
        }
        return 0;
    }

    /**
     * Найти родительские Widget-ы
     */
    private static findParentWidgets(lines: string[], currentLine: number, currentIndent: number): string[] {
        const parents: string[] = [];

        for (let i = currentLine - 1; i >= 0; i--) {
            const line = lines[i];
            const indent = this.getIndentationLevel(line);

            if (indent < currentIndent) {
                const widgetMatch = line.match(/(\w+)\s*\(/);
                if (widgetMatch && this.isFlutterWidget(widgetMatch[1])) {
                    parents.unshift(widgetMatch[1]);
                    currentIndent = indent;
                }
            }
        }

        return parents;
    }

    /**
     * Найти дочерние Widget-ы
     */
    private static findChildWidgets(lines: string[], currentLine: number, currentIndent: number): string[] {
        const children: string[] = [];

        for (let i = currentLine + 1; i < lines.length; i++) {
            const line = lines[i];
            const indent = this.getIndentationLevel(line);

            if (indent <= currentIndent) {
                break;
            }

            if (indent === currentIndent + 2 || indent === currentIndent + 4) {
                const widgetMatch = line.match(/(\w+)\s*\(/);
                if (widgetMatch && this.isFlutterWidget(widgetMatch[1])) {
                    children.push(widgetMatch[1]);
                }
            }
        }

        return children;
    }

    /**
     * Найти содержащий метод
     */
    private static findContainingMethod(lines: string[], currentLine: number): string | undefined {
        for (let i = currentLine; i >= 0; i--) {
            const line = lines[i];
            const methodMatch = line.match(/(\w+)\s*\([^)]*\)\s*(?:async\s*)?\s*{/);
            if (methodMatch) {
                return methodMatch[1];
            }
        }
        return undefined;
    }

    /**
     * Найти содержащий класс
     */
    private static findContainingClass(lines: string[], currentLine: number): string | undefined {
        for (let i = currentLine; i >= 0; i--) {
            const line = lines[i];
            const classMatch = line.match(/class\s+(\w+)/);
            if (classMatch) {
                return classMatch[1];
            }
        }
        return undefined;
    }
}
