export interface TestingKey {
    name: string;
    value: string;
    category: KeyCategory;
    filePath: string;
    line: number;
    isDefined: boolean;
    isUsed: boolean;
    usageFiles?: string[];
    usageCount?: number;
    usageLocations?: import('vscode').Location[];
}

export enum KeyCategory {
    TextFields = 'Text Fields',
    Buttons = 'Buttons',
    Checkboxes = 'Checkboxes',
    Dropdowns = 'Dropdowns',
    Navigation = 'Navigation',
    GameElements = 'Game Elements',
    Settings = 'Settings',
    Lists = 'Lists',
    Cards = 'Cards',
    Dialogs = 'Dialogs',
    Other = 'Other'
}

export interface KeyValidation {
    key: TestingKey;
    issues: ValidationIssue[];
    suggestions: string[];
}

export interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    message: string;
    fix?: string;
    line?: number;
    column?: number;
}

export interface KeyStatistics {
    totalKeys: number;
    usedKeys: number;
    unusedKeys: number;
    categoryCounts: Record<KeyCategory, number>;
    mostUsedKeys: TestingKey[];
    unusedKeysList: TestingKey[];
}

export interface KeySearchResult {
    key: TestingKey;
    matches: KeySearchMatch[];
}

export interface KeySearchMatch {
    filePath: string;
    line: number;
    column: number;
    context: string;
}
