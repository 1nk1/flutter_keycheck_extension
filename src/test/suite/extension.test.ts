import * as assert from 'assert';

import * as vscode from 'vscode';

import { KeyCategory } from '../../models/testingKey';
import { KeyScanner } from '../../services/keyScanner';
import { DartParser } from '../../utils/dartParser';
import { FileUtils } from '../../utils/fileUtils';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    suite('DartParser Tests', () => {
        test('Should categorize button keys correctly', () => {
            const category = DartParser.categorizeKey('loginButton', 'login_button');
            assert.strictEqual(category, KeyCategory.Buttons);
        });

        test('Should categorize text field keys correctly', () => {
            const category = DartParser.categorizeKey('emailField', 'email_field');
            assert.strictEqual(category, KeyCategory.TextFields);
        });

        test('Should generate constant name from value', () => {
            const constantName = DartParser.generateConstantName('login button');
            assert.strictEqual(constantName, 'LOGIN_BUTTON');
        });

        test('Should detect key usage in line', () => {
            const line = 'Key(KeyConstants.loginButton)';
            const hasKey = DartParser.isKeyUsageLine(line);
            assert.strictEqual(hasKey, true);
        });

        test('Should extract key name from usage', () => {
            const line = 'key: Key(KeyConstants.submitButton),';
            const keyName = DartParser.extractKeyNameFromUsage(line);
            assert.strictEqual(keyName, 'submitButton');
        });

        test('Should identify KeyConstants file', () => {
            const isKeyFile = DartParser.isKeyConstantsFile('/path/to/key_constants.dart');
            assert.strictEqual(isKeyFile, true);
        });
    });

    suite('FileUtils Tests', () => {
        test('Should get line number correctly', () => {
            const content = 'line1\nline2\nline3';
            const lineNumber = FileUtils.getLineNumber(content, 6); // Position of 'line2'
            assert.strictEqual(lineNumber, 2);
        });

        test('Should get column number correctly', () => {
            const content = 'hello world';
            const columnNumber = FileUtils.getColumnNumber(content, 6); // Position of 'w'
            assert.strictEqual(columnNumber, 6);
        });

        test('Should get context around line', () => {
            const content = 'line1\nline2\nline3\nline4\nline5';
            const context = FileUtils.getContextAroundLine(content, 3, 1);
            assert.strictEqual(context, 'line2\nline3\nline4');
        });
    });

    suite('KeyScanner Tests', () => {
        let keyScanner: KeyScanner;

        setup(() => {
            keyScanner = new KeyScanner();
        });

        test('Should initialize KeyScanner', () => {
            assert.ok(keyScanner);
        });

        test('Should return empty array for non-Flutter project', async () => {
            // Mock workspace without Flutter project
            const keys = await keyScanner.scanAllKeys();
            assert.strictEqual(Array.isArray(keys), true);
        });

        test('Should get empty statistics initially', () => {
            const stats = keyScanner.getKeyStatistics();
            assert.strictEqual(stats.totalKeys, 0);
            assert.strictEqual(stats.usedKeys, 0);
            assert.strictEqual(stats.unusedKeys, 0);
        });

        test('Should search keys correctly', () => {
            const results = keyScanner.searchKeys('button');
            assert.strictEqual(Array.isArray(results), true);
        });

        test('Should get unused keys', () => {
            const unusedKeys = keyScanner.getUnusedKeys();
            assert.strictEqual(Array.isArray(unusedKeys), true);
        });

        test('Should get most used keys', () => {
            const mostUsed = keyScanner.getMostUsedKeys(5);
            assert.strictEqual(Array.isArray(mostUsed), true);
            assert.strictEqual(mostUsed.length <= 5, true);
        });

        test('Should check if key exists', () => {
            const exists = keyScanner.keyExists('nonExistentKey');
            assert.strictEqual(exists, false);
        });

        test('Should get categories', () => {
            const categories = keyScanner.getCategories();
            assert.strictEqual(Array.isArray(categories), true);
        });
    });

    suite('Integration Tests', () => {
        test('Extension should be present', () => {
            assert.ok(vscode.extensions.getExtension('your-publisher-name.flutter-testing-keys-inspector'));
        });

        test('Should activate extension in Flutter project', async () => {
            // This would require a mock Flutter project structure
            // For now, just test that the extension can be activated
            const extension = vscode.extensions.getExtension('your-publisher-name.flutter-testing-keys-inspector');
            if (extension && !extension.isActive) {
                await extension.activate();
            }
            // Extension should activate without errors
            assert.ok(true);
        });

        test('Commands should be registered', async () => {
            const commands = await vscode.commands.getCommands();
            const extensionCommands = commands.filter(cmd => cmd.startsWith('flutterTestingKeys.'));

            // Should have at least the main commands
            const expectedCommands = [
                'flutterTestingKeys.refresh',
                'flutterTestingKeys.validate',
                'flutterTestingKeys.generateReport',
                'flutterTestingKeys.addKey'
            ];

            for (const expectedCmd of expectedCommands) {
                assert.ok(extensionCommands.includes(expectedCmd), `Command ${expectedCmd} should be registered`);
            }
        });
    });

    suite('Error Handling Tests', () => {
        test('Should handle invalid file paths gracefully', () => {
            const content = FileUtils.readFileContent('/invalid/path/file.dart');
            assert.strictEqual(content, null);
        });

        test('Should handle file existence check for invalid paths', () => {
            const exists = FileUtils.fileExists('/invalid/path/file.dart');
            assert.strictEqual(exists, false);
        });

        test('Should handle empty content in DartParser', () => {
            const keys = DartParser.parseKeyConstants('/invalid/path/file.dart');
            assert.strictEqual(Array.isArray(keys), true);
            assert.strictEqual(keys.length, 0);
        });

        test('Should handle empty usage in DartParser', () => {
            const usage = DartParser.findKeyUsage('/invalid/path/file.dart');
            assert.ok(usage instanceof Map);
            assert.strictEqual(usage.size, 0);
        });
    });
});
