# Flutter Testing Keys Inspector - API Documentation

## 📋 Table of Contents

1. [Services API](#services-api)
2. [Providers API](#providers-api)
3. [Models & Interfaces](#models--interfaces)
4. [Utility Functions](#utility-functions)
5. [Extension Commands](#extension-commands)
6. [Configuration API](#configuration-api)
7. [Events & Callbacks](#events--callbacks)

## 🔧 Services API

### KeyScanner Service

**Import**: `import { KeyScanner } from './services/keyScanner';`

#### Constructor
```typescript
new KeyScanner()
```
Creates a new instance of the KeyScanner service.

#### Methods

##### `scanWorkspace(): Promise<void>`
Scans the entire workspace for key constants and their usages.

**Returns**: Promise that resolves when scanning is complete

**Example**:
```typescript
await keyScanner.scanWorkspace();
```

##### `scanFile(uri: vscode.Uri): Promise<void>`
Scans a specific file for key constants and usages.

**Parameters**:
- `uri`: VS Code URI of the file to scan

**Returns**: Promise that resolves when file scanning is complete

**Example**:
```typescript
await keyScanner.scanFile(vscode.Uri.file('/path/to/file.dart'));
```

##### `getKeyConstants(): TestingKey[]`
Returns all discovered key constants.

**Returns**: Array of TestingKey objects

**Example**:
```typescript
const keys = keyScanner.getKeyConstants();
console.log(`Found ${keys.length} keys`);
```

##### `findKeyUsages(keyName: string): vscode.Location[]`
Finds all usage locations for a specific key.

**Parameters**:
- `keyName`: Name of the key to search for

**Returns**: Array of VS Code Location objects

**Example**:
```typescript
const usages = keyScanner.findKeyUsages('loginButton');
```

##### `getKeyByName(name: string): TestingKey | undefined`
Retrieves a specific key by its name.

**Parameters**:
- `name`: Name of the key

**Returns**: TestingKey object or undefined if not found

##### `getKeyStatistics(): KeyStatistics`
Gets comprehensive statistics about all keys.

**Returns**: KeyStatistics object with counts and coverage data

---

### ValidationService

**Import**: `import { ValidationService } from './services/validationService';`

#### Constructor
```typescript
new ValidationService(keyScanner: KeyScanner)
```

**Parameters**:
- `keyScanner`: Instance of KeyScanner service

#### Methods

##### `validate(): Promise<ValidationResult>`
Performs comprehensive validation of all keys.

**Returns**: Promise resolving to ValidationResult

**Example**:
```typescript
const result = await validationService.validate();
if (!result.isValid) {
    console.log(`Found ${result.errors.length} errors`);
}
```

##### `validateFile(uri: vscode.Uri): Promise<ValidationResult>`
Validates keys in a specific file.

**Parameters**:
- `uri`: VS Code URI of the file to validate

**Returns**: Promise resolving to ValidationResult

##### `generateReport(): KeyValidationReport`
Generates a detailed validation report.

**Returns**: KeyValidationReport with comprehensive analysis

**Example**:
```typescript
const report = validationService.generateReport();
console.log(`Total keys: ${report.summary.totalKeys}`);
console.log(`Unused keys: ${report.summary.unusedKeys}`);
```

##### `checkNamingConvention(keyName: string): boolean`
Validates if a key name follows naming conventions.

**Parameters**:
- `keyName`: Name of the key to check

**Returns**: true if valid, false otherwise

---

### FlutterKeycheckService

**Import**: `import { FlutterKeycheckService } from './services/flutterKeycheckService';`

#### Constructor
```typescript
new FlutterKeycheckService(validationService: ValidationService)
```

**Parameters**:
- `validationService`: Instance of ValidationService

#### Methods

##### `isInstalled(): Promise<boolean>`
Checks if flutter_keycheck CLI tool is installed.

**Returns**: Promise resolving to boolean

##### `runValidation(options?: ValidationOptions): Promise<ValidationResult>`
Runs validation using flutter_keycheck CLI.

**Parameters**:
- `options`: Optional validation configuration

**Returns**: Promise resolving to ValidationResult

**Example**:
```typescript
const result = await flutterKeycheckService.runValidation({
    checkUnused: true,
    checkDuplicates: true,
    checkNamingConvention: true
});
```

##### `installTool(): Promise<boolean>`
Installs the flutter_keycheck CLI tool.

**Returns**: Promise resolving to boolean indicating success

##### `getVersion(): Promise<string | null>`
Gets the installed version of flutter_keycheck.

**Returns**: Promise resolving to version string or null

---

## 🎨 Providers API

### KeyTreeProvider

**Import**: `import { KeyTreeProvider } from './providers/keyTreeProvider';`

#### Constructor
```typescript
new KeyTreeProvider(keyScanner: KeyScanner)
```

#### Methods

##### `refresh(): void`
Refreshes the tree view data.

**Example**:
```typescript
treeProvider.refresh();
```

##### `getTreeItem(element: KeyTreeItem): vscode.TreeItem`
Gets the tree item representation.

**Parameters**:
- `element`: KeyTreeItem to get representation for

**Returns**: VS Code TreeItem

##### `getChildren(element?: KeyTreeItem): Thenable<KeyTreeItem[]>`
Gets children of a tree item.

**Parameters**:
- `element`: Parent element (optional)

**Returns**: Promise resolving to array of KeyTreeItem

#### Events

##### `onDidChangeTreeData`
Event that fires when tree data changes.

**Type**: `vscode.Event<KeyTreeItem | undefined | null | void>`

---

### CompletionProvider

**Import**: `import { CompletionProvider } from './providers/completionProvider';`

#### Methods

##### `provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.CompletionItem[]`

Provides completion items for KeyConstants.

**Parameters**:
- `document`: Current text document
- `position`: Cursor position
- `token`: Cancellation token
- `context`: Completion context

**Returns**: Array of CompletionItem objects

---

### CodeActionProvider

**Import**: `import { CodeActionProvider } from './providers/codeActionProvider';`

#### Methods

##### `provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.CodeAction[]`

Provides code actions for key-related issues.

**Parameters**:
- `document`: Current text document
- `range`: Selected range
- `context`: Code action context
- `token`: Cancellation token

**Returns**: Array of CodeAction objects

**Available Actions**:
- Replace hardcoded string with KeyConstants
- Add missing import for KeyConstants
- Create new key constant
- Organize keys by category

---

## 📊 Models & Interfaces

### TestingKey

```typescript
interface TestingKey {
    name: string;                        // Key constant name
    value: string;                       // String value of the key
    category: KeyCategory;               // Category classification
    usageCount: number;                  // Number of times used
    definitionLocation: vscode.Location; // Where key is defined
    usageLocations: vscode.Location[];   // Where key is used
    lastUsed?: Date;                     // Last usage timestamp
}
```

### KeyCategory

```typescript
enum KeyCategory {
    Buttons = "Buttons",
    TextFields = "Text Fields",
    Checkboxes = "Checkboxes",
    Dropdowns = "Dropdowns",
    Navigation = "Navigation",
    Lists = "Lists",
    Cards = "Cards",
    Dialogs = "Dialogs",
    GameElements = "Game Elements",
    Settings = "Settings",
    Other = "Other"
}
```

### ValidationResult

```typescript
interface ValidationResult {
    isValid: boolean;              // Overall validation status
    errors: ValidationIssue[];     // List of errors found
    warnings: ValidationIssue[];   // List of warnings
    info: ValidationIssue[];       // Informational messages
    timestamp: Date;               // When validation was performed
}
```

### ValidationIssue

```typescript
interface ValidationIssue {
    severity: 'error' | 'warning' | 'info';
    message: string;                        // Issue description
    keyName?: string;                       // Affected key
    location?: vscode.Location;             // Where issue occurs
    quickFix?: vscode.CodeAction;           // Suggested fix
}
```

### KeyStatistics

```typescript
interface KeyStatistics {
    totalKeys: number;           // Total number of keys
    usedKeys: number;            // Keys that are used
    unusedKeys: number;          // Keys never used
    duplicateValues: number;     // Keys with duplicate values
    byCategory: Record<KeyCategory, number>; // Count by category
    coverage: number;            // Usage percentage (0-100)
}
```

### KeyValidationReport

```typescript
interface KeyValidationReport {
    summary: ValidationSummary;     // High-level statistics
    details: KeyDetail[];           // Detailed key information
    issues: ValidationIssue[];      // All validation issues
    generatedAt: Date;              // Report timestamp
}
```

---

## 🛠️ Utility Functions

### DartParser

**Import**: `import { DartParser } from './utils/dartParser';`

#### Static Methods

##### `extractKeyConstants(content: string): KeyConstantInfo[]`
Extracts key constant definitions from Dart code.

**Parameters**:
- `content`: Dart source code

**Returns**: Array of KeyConstantInfo objects

**Example**:
```typescript
const keys = DartParser.extractKeyConstants(dartCode);
```

##### `findKeyUsages(content: string, keyName: string): number[]`
Finds line numbers where a key is used.

**Parameters**:
- `content`: Dart source code
- `keyName`: Name of the key to find

**Returns**: Array of line numbers

##### `categorizeKey(keyName: string, context?: string): KeyCategory`
Determines the category of a key based on its name and context.

**Parameters**:
- `keyName`: Name of the key
- `context`: Optional widget context

**Returns**: KeyCategory enum value

##### `extractWidgetType(code: string, position: number): string | null`
Extracts the widget type at a specific position.

**Parameters**:
- `code`: Dart source code
- `position`: Character position in code

**Returns**: Widget type name or null

---

### FileUtils

**Import**: `import { FileUtils } from './utils/fileUtils';`

#### Static Methods

##### `getWorkspaceRoot(): string | undefined`
Gets the root path of the current workspace.

**Returns**: Workspace root path or undefined

##### `isFlutterProject(rootPath: string): boolean`
Checks if a directory is a Flutter project.

**Parameters**:
- `rootPath`: Directory path to check

**Returns**: true if Flutter project, false otherwise

##### `findKeyConstantsFile(): vscode.Uri | undefined`
Locates the KeyConstants file in the workspace.

**Returns**: VS Code URI of the file or undefined

##### `readFile(path: string): Promise<string>`
Safely reads a file's contents.

**Parameters**:
- `path`: File path to read

**Returns**: Promise resolving to file contents

---

## 📌 Extension Commands

### Command Registration

Commands are registered in the extension's `package.json` and implemented in `extension.ts`.

### Available Commands

#### `flutterTestingKeys.refresh`
**Title**: "Refresh"  
**Icon**: `$(refresh)`  
**Description**: Rescans workspace for key changes

**Implementation**:
```typescript
vscode.commands.registerCommand('flutterTestingKeys.refresh', async () => {
    await keyScanner.scanWorkspace();
    treeProvider.refresh();
});
```

#### `flutterTestingKeys.validate`
**Title**: "Validate Keys"  
**Icon**: `$(check)`  
**Description**: Runs comprehensive validation

**Implementation**:
```typescript
vscode.commands.registerCommand('flutterTestingKeys.validate', async () => {
    const result = await validationService.validate();
    // Show results to user
});
```

#### `flutterTestingKeys.generateReport`
**Title**: "Generate Report"  
**Icon**: `$(report)`  
**Description**: Creates detailed validation report

#### `flutterTestingKeys.addKey`
**Title**: "Add New Key"  
**Icon**: `$(add)`  
**Description**: Interactive key creation wizard

#### `flutterTestingKeys.goToDefinition`
**Title**: "Go to Definition"  
**Icon**: `$(go-to-file)`  
**Description**: Navigate to key definition

---

## ⚙️ Configuration API

### Reading Configuration

```typescript
const config = vscode.workspace.getConfiguration('flutterTestingKeys');
const autoValidate = config.get<boolean>('autoValidate', true);
```

### Available Settings

#### `flutterTestingKeys.autoValidate`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Automatically validate keys on file save

#### `flutterTestingKeys.keyConstantsPath`
- **Type**: `string`
- **Default**: `"lib/constants/key_constants.dart"`
- **Description**: Path to KeyConstants file

#### `flutterTestingKeys.showUnusedKeys`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Show unused keys in tree view

#### `flutterTestingKeys.enableDiagnostics`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Enable diagnostic messages

### Watching Configuration Changes

```typescript
vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('flutterTestingKeys')) {
        // Handle configuration change
    }
});
```

---

## 📡 Events & Callbacks

### Extension Events

#### Document Events
```typescript
// File saved
vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.languageId === 'dart') {
        // Handle Dart file save
    }
});

// File changed
vscode.workspace.onDidChangeTextDocument((event) => {
    // Handle text changes
});
```

#### Workspace Events
```typescript
// File created
vscode.workspace.onDidCreateFiles((event) => {
    // Handle new files
});

// File deleted
vscode.workspace.onDidDeleteFiles((event) => {
    // Handle deleted files
});
```

### Custom Events

The extension emits custom events through the tree provider:

```typescript
// Tree data changed
treeProvider.onDidChangeTreeData((element) => {
    // Handle tree updates
});
```

### Diagnostic Events

```typescript
// Create diagnostics collection
const diagnostics = vscode.languages.createDiagnosticCollection('flutterKeys');

// Report issues
diagnostics.set(uri, [
    new vscode.Diagnostic(
        range,
        'Hardcoded key found',
        vscode.DiagnosticSeverity.Warning
    )
]);
```

---

## 🔍 Error Handling

### Service Errors

```typescript
try {
    const result = await validationService.validate();
} catch (error) {
    vscode.window.showErrorMessage(
        `Validation failed: ${error.message}`
    );
}
```

### Graceful Degradation

```typescript
// Check if flutter_keycheck is available
if (await flutterKeycheckService.isInstalled()) {
    // Use CLI tool
    result = await flutterKeycheckService.runValidation();
} else {
    // Fall back to built-in validation
    result = await validationService.validate();
}
```

---

## 📝 Usage Examples

### Complete Extension Setup

```typescript
import * as vscode from 'vscode';
import { KeyScanner } from './services/keyScanner';
import { ValidationService } from './services/validationService';
import { KeyTreeProvider } from './providers/keyTreeProvider';

export function activate(context: vscode.ExtensionContext) {
    // Initialize services
    const keyScanner = new KeyScanner();
    const validationService = new ValidationService(keyScanner);
    const treeProvider = new KeyTreeProvider(keyScanner);
    
    // Register tree view
    vscode.window.createTreeView('flutterTestingKeys', {
        treeDataProvider: treeProvider,
        showCollapseAll: true
    });
    
    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('flutterTestingKeys.refresh', 
            () => treeProvider.refresh()
        )
    );
    
    // Initial scan
    keyScanner.scanWorkspace();
}
```

### Custom Validation Rule

```typescript
class CustomValidationService extends ValidationService {
    protected validateKeyName(key: TestingKey): ValidationIssue | null {
        if (!key.name.startsWith('test_')) {
            return {
                severity: 'warning',
                message: 'Key names should start with "test_"',
                keyName: key.name,
                location: key.definitionLocation
            };
        }
        return null;
    }
}
```