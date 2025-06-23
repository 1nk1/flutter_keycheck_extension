import { exec } from 'child_process';
import { promisify } from 'util';
import * as vscode from 'vscode';
import { ValidationResult } from '../models/keyValidation';
import { FileUtils } from '../utils/fileUtils';
import { ValidationService } from './validationService';

const execAsync = promisify(exec);

export class FlutterKeycheckService {
    constructor(private validationService: ValidationService) {}

    /**
     * Check if flutter_keycheck is available
     */
    async isFlutterKeycheckAvailable(): Promise<boolean> {
        try {
            const workspaceRoot = FileUtils.getWorkspaceRoot();
            if (!workspaceRoot) {
                return false;
            }

            // Check if flutter_keycheck is in pubspec.yaml
            const pubspecPath = `${workspaceRoot}/pubspec.yaml`;
            const pubspecContent = FileUtils.readFileContent(pubspecPath);

            if (pubspecContent && pubspecContent.includes('flutter_keycheck')) {
                return true;
            }

            // Try to run flutter_keycheck command
            await execAsync('flutter pub run flutter_keycheck --help', {
                cwd: workspaceRoot,
                timeout: 5000
            });

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Install flutter_keycheck dependency
     */
    async installFlutterKeycheck(): Promise<boolean> {
        try {
            const workspaceRoot = FileUtils.getWorkspaceRoot();
            if (!workspaceRoot) {
                throw new Error('No workspace folder found');
            }

            // Add to pubspec.yaml dev_dependencies
            const pubspecPath = `${workspaceRoot}/pubspec.yaml`;
            const pubspecContent = FileUtils.readFileContent(pubspecPath);

            if (!pubspecContent) {
                throw new Error('Could not read pubspec.yaml');
            }

            if (pubspecContent.includes('flutter_keycheck')) {
                vscode.window.showInformationMessage('flutter_keycheck is already installed');
                return true;
            }

            // Add flutter_keycheck to dev_dependencies
            let updatedContent = pubspecContent;
            if (pubspecContent.includes('dev_dependencies:')) {
                updatedContent = pubspecContent.replace(
                    'dev_dependencies:',
                    'dev_dependencies:\n  flutter_keycheck: ^1.0.0'
                );
            } else {
                updatedContent += '\n\ndev_dependencies:\n  flutter_keycheck: ^1.0.0\n';
            }

            FileUtils.writeFile(pubspecPath, updatedContent);

            // Run flutter pub get
            await this.runFlutterPubGet();

            vscode.window.showInformationMessage('flutter_keycheck installed successfully');
            return true;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to install flutter_keycheck: ${error}`);
            return false;
        }
    }

    /**
     * Run flutter pub get
     */
    private async runFlutterPubGet(): Promise<void> {
        const workspaceRoot = FileUtils.getWorkspaceRoot();
        if (!workspaceRoot) {
            throw new Error('No workspace folder found');
        }

        await execAsync('flutter pub get', {
            cwd: workspaceRoot,
            timeout: 30000
        });
    }

    /**
     * Validate keys using flutter_keycheck
     */
    async validateKeysWithCLI(): Promise<ValidationResult> {
        const workspaceRoot = FileUtils.getWorkspaceRoot();
        if (!workspaceRoot) {
            throw new Error('No workspace folder found');
        }

        // Check if flutter_keycheck is available
        const isAvailable = await this.isFlutterKeycheckAvailable();
        if (!isAvailable) {
            // Fall back to internal validation
            vscode.window.showWarningMessage(
                'flutter_keycheck not found. Using internal validation. Would you like to install flutter_keycheck?',
                'Install', 'Use Internal'
            ).then(selection => {
                if (selection === 'Install') {
                    this.installFlutterKeycheck();
                }
            });

            return await this.validationService.validateKeys();
        }

        try {
            const { stdout } = await execAsync(
                'flutter pub run flutter_keycheck --output json',
                {
                    cwd: workspaceRoot,
                    timeout: 60000
                }
            );

            return this.parseFlutterKeycheckOutput(stdout);
        } catch (error) {
            console.error('Flutter keycheck CLI failed:', error);

            // Fall back to internal validation
            vscode.window.showWarningMessage(
                'flutter_keycheck CLI failed. Using internal validation.'
            );

            return await this.validationService.validateKeys();
        }
    }

    /**
     * Parse flutter_keycheck JSON output
     */
    private parseFlutterKeycheckOutput(output: string): ValidationResult {
        try {
            const data = JSON.parse(output);

            return {
                totalKeys: data.total_keys || 0,
                usedKeys: data.used_keys || 0,
                unusedKeys: data.unused_keys || 0,
                duplicateKeys: data.duplicate_keys || 0,
                issues: data.issues || [],
                validationTime: data.validation_time || 0,
                projectPath: data.project_path || FileUtils.getWorkspaceRoot() || ''
            };
        } catch (error) {
            console.error('Failed to parse flutter_keycheck output:', error);

            // Try to parse text output
            return this.parseFlutterKeycheckTextOutput(output);
        }
    }

    /**
     * Parse flutter_keycheck text output (fallback)
     */
    private parseFlutterKeycheckTextOutput(output: string): ValidationResult {
        const lines = output.split('\n');
        let totalKeys = 0;
        let usedKeys = 0;
        let unusedKeys = 0;

        for (const line of lines) {
            if (line.includes('Total keys:')) {
                totalKeys = parseInt(line.match(/\d+/)?.[0] || '0');
            } else if (line.includes('Used keys:')) {
                usedKeys = parseInt(line.match(/\d+/)?.[0] || '0');
            } else if (line.includes('Unused keys:')) {
                unusedKeys = parseInt(line.match(/\d+/)?.[0] || '0');
            }
        }

        return {
            totalKeys,
            usedKeys,
            unusedKeys,
            duplicateKeys: 0,
            issues: [],
            validationTime: 0,
            projectPath: FileUtils.getWorkspaceRoot() || ''
        };
    }

    /**
     * Generate report using flutter_keycheck
     */
    async generateReportWithCLI(): Promise<string> {
        const validationResult = await this.validateKeysWithCLI();

        return `# Flutter Testing Keys Validation Report

## Summary
- **Total Keys**: ${validationResult.totalKeys}
- **Used Keys**: ${validationResult.usedKeys}
- **Unused Keys**: ${validationResult.unusedKeys}
- **Duplicate Keys**: ${validationResult.duplicateKeys}
- **Validation Time**: ${validationResult.validationTime}ms

## Issues Found

${validationResult.issues.length === 0 ? 'No issues found! 🎉' : ''}

${validationResult.issues.map((issue, index) => `
### ${index + 1}. ${issue.severity?.toUpperCase() || 'INFO'}: ${issue.message}
${issue.fix ? `**Fix**: ${issue.fix}` : ''}
${issue.line ? `**Line**: ${issue.line}` : ''}
`).join('\n')}

## Recommendations

${this.generateCLIRecommendations(validationResult)}

---
*Generated by Flutter Testing Keys Inspector using flutter_keycheck CLI*
`;
    }

    /**
     * Generate recommendations for CLI results
     */
    private generateCLIRecommendations(result: ValidationResult): string {
        const recommendations: string[] = [];

        if (result.unusedKeys > 0) {
            recommendations.push('- Consider removing unused key constants to keep the codebase clean');
        }

        if (result.duplicateKeys > 0) {
            recommendations.push('- Fix duplicate key values to avoid confusion');
        }

        if (result.issues.length > 0) {
            recommendations.push('- Address the issues listed above for better code quality');
        }

        if (result.totalKeys === 0) {
            recommendations.push('- Create a KeyConstants file to centralize testing keys');
        }

        const coveragePercentage = result.totalKeys > 0 ? (result.usedKeys / result.totalKeys) * 100 : 0;
        if (coveragePercentage < 80) {
            recommendations.push(`- Improve key usage coverage (currently ${coveragePercentage.toFixed(1)}%)`);
        }

        if (recommendations.length === 0) {
            recommendations.push('- Great job! No specific recommendations at this time.');
        }

        return recommendations.join('\n');
    }

    /**
     * Run flutter_keycheck with custom options
     */
    async runWithOptions(options: {
        includeUnused?: boolean;
        includeDuplicates?: boolean;
        outputFormat?: 'json' | 'text';
        excludePatterns?: string[];
    }): Promise<ValidationResult> {
        const workspaceRoot = FileUtils.getWorkspaceRoot();
        if (!workspaceRoot) {
            throw new Error('No workspace folder found');
        }

        let command = 'flutter pub run flutter_keycheck';

        if (options.outputFormat === 'json') {
            command += ' --output json';
        }

        if (options.includeUnused === false) {
            command += ' --no-unused';
        }

        if (options.includeDuplicates === false) {
            command += ' --no-duplicates';
        }

        if (options.excludePatterns && options.excludePatterns.length > 0) {
            command += ` --exclude "${options.excludePatterns.join(',')}"`;
        }

        try {
            const { stdout } = await execAsync(command, {
                cwd: workspaceRoot,
                timeout: 60000
            });

            return this.parseFlutterKeycheckOutput(stdout);
        } catch (error) {
            console.error('Flutter keycheck with options failed:', error);
            return await this.validationService.validateKeys();
        }
    }

    /**
     * Check project configuration for flutter_keycheck
     */
    async checkProjectConfiguration(): Promise<{
        isInstalled: boolean;
        version?: string;
        configPath?: string;
        hasConfig: boolean;
    }> {
        const workspaceRoot = FileUtils.getWorkspaceRoot();
        if (!workspaceRoot) {
            return { isInstalled: false, hasConfig: false };
        }

        const isInstalled = await this.isFlutterKeycheckAvailable();

        // Check for configuration file
        const configPath = `${workspaceRoot}/flutter_keycheck.yaml`;
        const hasConfig = FileUtils.fileExists(configPath);

        let version: string | undefined;
        if (isInstalled) {
            try {
                const { stdout } = await execAsync('flutter pub run flutter_keycheck --version', {
                    cwd: workspaceRoot,
                    timeout: 10000
                });
                version = stdout.trim();
            } catch {
                // Version not available
            }
        }

        return {
            isInstalled,
            version,
            configPath: hasConfig ? configPath : undefined,
            hasConfig
        };
    }

    /**
     * Create default flutter_keycheck configuration
     */
    async createDefaultConfig(): Promise<boolean> {
        const workspaceRoot = FileUtils.getWorkspaceRoot();
        if (!workspaceRoot) {
            return false;
        }

        const configPath = `${workspaceRoot}/flutter_keycheck.yaml`;
        const defaultConfig = `# Flutter Keycheck Configuration
# Paths to scan for key usage
scan_paths:
  - lib/
  - test/

# Path to key constants file
key_constants_path: lib/constants/key_constants.dart

# Patterns to exclude from scanning
exclude_patterns:
  - "**/*.g.dart"
  - "**/generated/**"

# Validation options
validation:
  check_unused: true
  check_duplicates: true
  check_naming_convention: true
  naming_pattern: "^[a-zA-Z][a-zA-Z0-9_]*$"

# Output options
output:
  format: json
  include_suggestions: true
  include_usage_locations: true
`;

        return FileUtils.writeFile(configPath, defaultConfig);
    }
}
