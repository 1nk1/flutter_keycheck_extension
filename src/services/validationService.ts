import { KeyDetail, KeyStatus, KeyValidationReport, UsageLocation, ValidationConfig, ValidationResult, ValidationSummary } from '../models/keyValidation';
import { TestingKey, ValidationIssue } from '../models/testingKey';
import { DartParser } from '../utils/dartParser';
import { FileUtils } from '../utils/fileUtils';
import { KeyScanner } from './keyScanner';

export class ValidationService {
    constructor(private keyScanner: KeyScanner) {}

    /**
     * Validate all keys in the project
     */
    async validateKeys(config?: ValidationConfig): Promise<ValidationResult> {
        const startTime = Date.now();
        const workspaceRoot = FileUtils.getWorkspaceRoot();

        if (!workspaceRoot) {
            throw new Error('No workspace folder found');
        }

        const keys = await this.keyScanner.scanAllKeys(true);
        const issues: ValidationIssue[] = [];

        // Validate each key
        for (const key of keys) {
            const keyIssues = await this.validateSingleKey(key, config);
            issues.push(...keyIssues);
        }

        // Find hardcoded keys
        const hardcodedIssues = await this.findHardcodedKeys(workspaceRoot);
        issues.push(...hardcodedIssues);

        // Find duplicate keys
        const duplicateIssues = this.findDuplicateKeys(keys);
        issues.push(...duplicateIssues);

        const validationTime = Date.now() - startTime;
        const usedKeys = keys.filter(key => key.isUsed).length;
        const unusedKeys = keys.length - usedKeys;
        const duplicateKeys = duplicateIssues.length;

        return {
            totalKeys: keys.length,
            usedKeys,
            unusedKeys,
            duplicateKeys,
            issues,
            validationTime,
            projectPath: workspaceRoot
        };
    }

    /**
     * Validate a single key
     */
    private async validateSingleKey(key: TestingKey, config?: ValidationConfig): Promise<ValidationIssue[]> {
        const issues: ValidationIssue[] = [];

        // Check if key is unused
        if (config?.includeUnused !== false && !key.isUsed) {
            issues.push({
                severity: 'warning',
                message: `Key '${key.name}' is defined but never used`,
                fix: `Consider removing unused key or adding it to widgets`
            });
        }

        // Check naming convention
        if (config?.checkNamingConvention && config.namingPattern) {
            if (!config.namingPattern.test(key.name)) {
                issues.push({
                    severity: 'warning',
                    message: `Key '${key.name}' doesn't follow naming convention`,
                    fix: `Rename to follow the project's naming pattern`
                });
            }
        }

        // Check if key value is meaningful
        if (key.value.length < 3) {
            issues.push({
                severity: 'info',
                message: `Key '${key.name}' has a very short value: '${key.value}'`,
                fix: `Consider using a more descriptive key value`
            });
        }

        // Check for potential issues in key value
        if (key.value.includes(' ')) {
            issues.push({
                severity: 'info',
                message: `Key '${key.name}' contains spaces in value`,
                fix: `Consider using underscores or camelCase instead of spaces`
            });
        }

        return issues;
    }

    /**
     * Find hardcoded keys that should be constants
     */
    private async findHardcodedKeys(workspaceRoot: string): Promise<ValidationIssue[]> {
        const issues: ValidationIssue[] = [];
        const dartFiles = await FileUtils.findDartFiles(workspaceRoot, ['generated', '.g.dart']);

        for (const file of dartFiles) {
            const hardcodedKeys = DartParser.findHardcodedKeys(file);

            for (const hardcoded of hardcodedKeys) {
                issues.push({
                    severity: 'warning',
                    message: `Hardcoded key found: '${hardcoded.key}' in ${FileUtils.getRelativePath(file)}`,
                    fix: `Replace with KeyConstants.${DartParser.generateConstantName(hardcoded.key)}`,
                    line: hardcoded.line,
                    column: hardcoded.column
                });
            }
        }

        return issues;
    }

    /**
     * Find duplicate keys
     */
    private findDuplicateKeys(keys: TestingKey[]): ValidationIssue[] {
        const issues: ValidationIssue[] = [];
        const keyMap = new Map<string, TestingKey[]>();

        // Group keys by value
        for (const key of keys) {
            if (!keyMap.has(key.value)) {
                keyMap.set(key.value, []);
            }
            keyMap.get(key.value)!.push(key);
        }

        // Find duplicates
        for (const [value, duplicateKeys] of keyMap.entries()) {
            if (duplicateKeys.length > 1) {
                for (const key of duplicateKeys) {
                    issues.push({
                        severity: 'error',
                        message: `Duplicate key value '${value}' found in key '${key.name}'`,
                        fix: `Ensure each key has a unique value`,
                        line: key.line
                    });
                }
            }
        }

        return issues;
    }

    /**
     * Generate detailed validation report
     */
    async generateReport(): Promise<KeyValidationReport> {
        const validationResult = await this.validateKeys();
        const keys = this.keyScanner.getCachedKeys();

        const summary: ValidationSummary = {
            totalScanned: keys.length,
            validKeys: keys.length - validationResult.issues.length,
            problematicKeys: validationResult.issues.length,
            coveragePercentage: keys.length > 0 ? (validationResult.usedKeys / keys.length) * 100 : 0
        };

        const keyDetails: KeyDetail[] = await this.generateKeyDetails(keys);
        const recommendations = this.generateRecommendations(validationResult, keys);

        return {
            summary,
            keyDetails,
            recommendations,
            generatedAt: new Date()
        };
    }

    /**
     * Generate detailed information for each key
     */
    private async generateKeyDetails(keys: TestingKey[]): Promise<KeyDetail[]> {
        const details: KeyDetail[] = [];

        for (const key of keys) {
            const status = this.determineKeyStatus(key);
            const issues = await this.validateSingleKey(key);
            const usageLocations = await this.findUsageLocations(key);

            details.push({
                key,
                status,
                issues,
                usageLocations
            });
        }

        return details;
    }

    /**
     * Determine key status
     */
    private determineKeyStatus(key: TestingKey): KeyStatus {
        if (!key.isDefined) {
            return KeyStatus.Missing;
        }
        if (!key.isUsed) {
            return KeyStatus.Unused;
        }
        return KeyStatus.Valid;
    }

    /**
     * Find usage locations for a key
     */
    private async findUsageLocations(key: TestingKey): Promise<UsageLocation[]> {
        const locations: UsageLocation[] = [];

        if (!key.usageFiles) {
            return locations;
        }

        for (const file of key.usageFiles) {
            const content = FileUtils.readFileContent(file);
            if (!content) {continue;}

            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes(`KeyConstants.${key.name}`)) {
                    const column = line.indexOf(`KeyConstants.${key.name}`);
                    const context = FileUtils.getContextAroundLine(content, i + 1, 1);
                    const widgetType = this.extractWidgetType(line);

                    locations.push({
                        filePath: file,
                        line: i + 1,
                        column,
                        context,
                        widgetType
                    });
                }
            }
        }

        return locations;
    }

    /**
     * Extract widget type from a line of code
     */
    private extractWidgetType(line: string): string | undefined {
        const widgetMatch = line.match(/(\w+)\s*\([^)]*key:/);
        return widgetMatch ? widgetMatch[1] : undefined;
    }

    /**
     * Generate recommendations based on validation results
     */
    private generateRecommendations(result: ValidationResult, keys: TestingKey[]): string[] {
        const recommendations: string[] = [];

        if (result.unusedKeys > 0) {
            recommendations.push(
                `Remove ${result.unusedKeys} unused key constants to keep the codebase clean`
            );
        }

        if (result.duplicateKeys > 0) {
            recommendations.push(
                `Fix ${result.duplicateKeys} duplicate key values to avoid confusion`
            );
        }

        const hardcodedIssues = result.issues.filter(issue =>
            issue.message.includes('Hardcoded key found')
        );
        if (hardcodedIssues.length > 0) {
            recommendations.push(
                `Replace ${hardcodedIssues.length} hardcoded keys with constants for better maintainability`
            );
        }

        const namingIssues = result.issues.filter(issue =>
            issue.message.includes("doesn't follow naming convention")
        );
        if (namingIssues.length > 0) {
            recommendations.push(
                `Update ${namingIssues.length} keys to follow consistent naming convention`
            );
        }

        if (keys.length === 0) {
            recommendations.push(
                'Create a KeyConstants file to centralize testing keys'
            );
        }

        const coveragePercentage = keys.length > 0 ? (result.usedKeys / keys.length) * 100 : 0;
        if (coveragePercentage < 80) {
            recommendations.push(
                `Improve key usage coverage (currently ${coveragePercentage.toFixed(1)}%)`
            );
        }

        if (recommendations.length === 0) {
            recommendations.push('Great job! No specific recommendations at this time.');
        }

        return recommendations;
    }

    /**
     * Generate markdown report
     */
    async generateMarkdownReport(): Promise<string> {
        const report = await this.generateReport();
        const validationResult = await this.validateKeys();

        return `# Flutter Testing Keys Validation Report

## Summary
- **Total Keys**: ${report.summary.totalScanned}
- **Valid Keys**: ${report.summary.validKeys}
- **Problematic Keys**: ${report.summary.problematicKeys}
- **Coverage**: ${report.summary.coveragePercentage.toFixed(1)}%
- **Validation Time**: ${validationResult.validationTime}ms

## Issues Found

${validationResult.issues.length === 0 ? 'No issues found! 🎉' : ''}

${validationResult.issues.map((issue, index) => `
### ${index + 1}. ${issue.severity.toUpperCase()}: ${issue.message}
${issue.fix ? `**Fix**: ${issue.fix}` : ''}
${issue.line ? `**Line**: ${issue.line}` : ''}
${issue.column ? `**Column**: ${issue.column}` : ''}
`).join('\n')}

## Key Details

${report.keyDetails.map(detail => `
### ${detail.key.name} (${detail.status})
- **Value**: \`${detail.key.value}\`
- **Category**: ${detail.key.category}
- **Usage Count**: ${detail.key.usageCount || 0}
- **File**: ${FileUtils.getRelativePath(detail.key.filePath)}:${detail.key.line}

${detail.usageLocations.length > 0 ? `**Used in**:
${detail.usageLocations.map(loc => `- ${FileUtils.getRelativePath(loc.filePath)}:${loc.line}${loc.widgetType ? ` (${loc.widgetType})` : ''}`).join('\n')}` : ''}

${detail.issues.length > 0 ? `**Issues**:
${detail.issues.map(issue => `- ${issue.severity}: ${issue.message}`).join('\n')}` : ''}
`).join('\n')}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*Generated by Flutter Testing Keys Inspector on ${report.generatedAt.toLocaleString()}*
`;
    }
}
