import { TestingKey, ValidationIssue } from './testingKey';

export interface ValidationResult {
    totalKeys: number;
    usedKeys: number;
    unusedKeys: number;
    duplicateKeys: number;
    issues: ValidationIssue[];
    validationTime: number;
    projectPath: string;
}

export interface KeyValidationReport {
    summary: ValidationSummary;
    keyDetails: KeyDetail[];
    recommendations: string[];
    generatedAt: Date;
}

export interface ValidationSummary {
    totalScanned: number;
    validKeys: number;
    problematicKeys: number;
    coveragePercentage: number;
}

export interface KeyDetail {
    key: TestingKey;
    status: KeyStatus;
    issues: ValidationIssue[];
    usageLocations: UsageLocation[];
}

export interface UsageLocation {
    filePath: string;
    line: number;
    column: number;
    context: string;
    widgetType?: string;
}

export enum KeyStatus {
    Valid = 'valid',
    Unused = 'unused',
    Missing = 'missing',
    Duplicate = 'duplicate',
    Invalid = 'invalid'
}

export interface ValidationConfig {
    includeUnused: boolean;
    includeDuplicates: boolean;
    checkNamingConvention: boolean;
    namingPattern?: RegExp;
    excludePatterns: string[];
    customCategories?: Record<string, string[]>;
}
