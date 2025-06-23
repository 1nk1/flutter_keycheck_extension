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
}
