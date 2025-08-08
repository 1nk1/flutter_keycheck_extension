# Testing Documentation

## 📋 Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Architecture](#test-architecture)
3. [Test Suites](#test-suites)
4. [Testing Infrastructure](#testing-infrastructure)
5. [Best Practices](#best-practices)
6. [Running Tests](#running-tests)
7. [Continuous Integration](#continuous-integration)
8. [Coverage Reports](#coverage-reports)

## 🎯 Testing Strategy

### Testing Philosophy

The Flutter Testing Keys Inspector extension follows a comprehensive testing approach that ensures reliability, maintainability, and user satisfaction through multiple layers of testing.

### Testing Pyramid

```
                 /\
                /  \
               / E2E\
              /______\
             /        \
            /Integr    \
           /ation       \
          /______________\
         /                \
        /      Unit        \
       /____________________\
```

#### Unit Tests (Foundation - 70%)
- **Individual component testing**
- **Fast execution** (<100ms per test)
- **Isolated functionality**
- **Mock dependencies**

#### Integration Tests (Middle - 20%)
- **Component interaction testing**
- **Service integration**
- **Provider coordination**
- **VS Code API integration**

#### End-to-End Tests (Top - 10%)
- **Complete workflow testing**
- **User scenario validation**
- **Extension lifecycle**
- **Real workspace testing**

## 🏗️ Test Architecture

### Test Structure

```
src/test/
├── runTest.ts              # Test runner configuration
├── suite/
│   ├── index.ts           # Test suite entry point
│   ├── extension.test.ts   # Extension lifecycle tests
│   ├── errorHandling.test.ts # Error handling system tests
│   ├── services/          # Service-specific tests
│   │   ├── keyScanner.test.ts
│   │   ├── validationService.test.ts
│   │   └── flutterKeycheckService.test.ts
│   ├── providers/         # Provider tests
│   │   ├── treeProvider.test.ts
│   │   ├── completionProvider.test.ts
│   │   └── codeActionProvider.test.ts
│   ├── commands/          # Command tests
│   │   ├── baseCommand.test.ts
│   │   ├── refreshCommand.test.ts
│   │   └── validateCommand.test.ts
│   └── utils/             # Utility tests
│       ├── dartParser.test.ts
│       └── fileUtils.test.ts
├── fixtures/              # Test data and mock files
│   ├── dart/              # Sample Dart files
│   ├── projects/          # Mock Flutter projects
│   └── config/            # Test configurations
└── mocks/                 # Mock implementations
    ├── vscode.ts          # VS Code API mocks
    ├── services.ts        # Service mocks
    └── providers.ts       # Provider mocks
```

### Test Categories

#### 1. Unit Tests
**Purpose**: Test individual components in isolation

**Coverage Areas**:
- Service methods (KeyScanner, ValidationService, FlutterKeycheckService)
- Utility functions (DartParser, FileUtils)
- Model validation (TestingKey, ValidationResult)
- Command execution logic
- Error handling mechanisms

#### 2. Integration Tests
**Purpose**: Test component interactions and VS Code integration

**Coverage Areas**:
- Service → Provider communication
- Command → Service interactions
- VS Code API integration points
- Event handling workflows
- Configuration management

#### 3. Error Handling Tests
**Purpose**: Validate comprehensive error management system

**Coverage Areas**:
- Error classification and handling
- Recovery mechanisms
- User notification system
- Analytics and monitoring
- Boundary conditions

## 🧪 Test Suites

### Core Extension Tests (`extension.test.ts`)

```typescript
suite('Extension Activation', () => {
    test('should activate in Flutter projects', async () => {
        const workspaceUri = vscode.Uri.file('/mock/flutter/project');
        await vscode.workspace.updateWorkspaceFolders(0, 0, {
            uri: workspaceUri,
            name: 'Test Flutter Project'
        });

        const extension = vscode.extensions.getExtension(
            'your-publisher.flutter-testing-keys-inspector'
        );
        
        assert.ok(extension);
        await extension.activate();
        assert.strictEqual(extension.isActive, true);
    });

    test('should remain inactive in non-Flutter projects', async () => {
        const workspaceUri = vscode.Uri.file('/mock/regular/project');
        // Test implementation
    });
});
```

### Error Handling Tests (`errorHandling.test.ts`)

```typescript
suite('Error Handling System', () => {
    let errorHandler: ErrorHandler;
    let notificationManager: NotificationManager;

    setup(() => {
        errorHandler = ErrorHandler.getInstance();
        notificationManager = NotificationManager.getInstance();
        errorHandler.clearHistory();
        notificationManager.clearCache();
    });

    suite('ErrorHandler', () => {
        test('should create error info with proper structure', async () => {
            const errorInfo = await errorHandler.handleError(
                ErrorLevel.ERROR,
                ErrorCategory.FILE_SYSTEM,
                'Test error message',
                { showToUser: false }
            );

            assert.strictEqual(errorInfo.level, ErrorLevel.ERROR);
            assert.strictEqual(errorInfo.category, ErrorCategory.FILE_SYSTEM);
            assert.strictEqual(errorInfo.message, 'Test error message');
            assert.ok(errorInfo.id);
            assert.ok(errorInfo.timestamp);
            assert.strictEqual(errorInfo.canRecover, true);
        });

        test('should emit error events', (done) => {
            errorHandler.onError((errorInfo) => {
                assert.strictEqual(errorInfo.message, 'Event test');
                done();
            });

            errorHandler.handleError(
                ErrorLevel.WARNING,
                ErrorCategory.PARSING,
                'Event test',
                { showToUser: false }
            );
        });
    });

    suite('ErrorBoundary', () => {
        test('should execute function successfully', async () => {
            const boundary = new ErrorBoundary('TestBoundary');
            const result = await boundary.execute(() => 'success');
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.result, 'success');
            assert.strictEqual(result.error, undefined);
        });

        test('should handle function errors gracefully', async () => {
            const boundary = new ErrorBoundary('TestBoundary');
            const testError = new Error('Test error');
            
            const result = await boundary.execute(() => {
                throw testError;
            });
            
            assert.strictEqual(result.success, false);
            assert.strictEqual(result.error, testError);
        });

        test('should retry on failure when configured', async () => {
            let attempts = 0;
            const boundary = new ErrorBoundary('TestBoundary');
            
            const result = await boundary.executeWithRetry(
                () => {
                    attempts++;
                    if (attempts < 3) {
                        throw new Error('Retry test');
                    }
                    return 'success';
                },
                { maxRetries: 3 }
            );
            
            assert.strictEqual(result.success, true);
            assert.strictEqual(result.result, 'success');
            assert.strictEqual(attempts, 3);
        });
    });
});
```

### Service Tests (`services/keyScanner.test.ts`)

```typescript
suite('KeyScanner Service', () => {
    let keyScanner: KeyScanner;

    setup(() => {
        keyScanner = new KeyScanner();
    });

    test('should scan Dart file and extract keys', async () => {
        const mockDartContent = `
            class KeyConstants {
                static const String loginButton = 'login_button';
                static const String emailField = 'email_field';
            }
        `;

        const mockUri = vscode.Uri.file('/test/keys.dart');
        jest.spyOn(vscode.workspace, 'openTextDocument')
            .mockResolvedValue({ getText: () => mockDartContent } as any);

        await keyScanner.scanFile(mockUri);
        const keys = keyScanner.getKeyConstants();

        assert.strictEqual(keys.length, 2);
        assert.ok(keys.find(k => k.name === 'loginButton'));
        assert.ok(keys.find(k => k.name === 'emailField'));
    });

    test('should handle file read errors gracefully', async () => {
        const mockUri = vscode.Uri.file('/nonexistent/file.dart');
        jest.spyOn(vscode.workspace, 'openTextDocument')
            .mockRejectedValue(new Error('ENOENT: file not found'));

        // Should not throw
        await assert.doesNotReject(
            async () => await keyScanner.scanFile(mockUri)
        );
    });
});
```

### Provider Tests (`providers/completionProvider.test.ts`)

```typescript
suite('CompletionProvider', () => {
    let completionProvider: CompletionProvider;
    let mockKeyScanner: jest.Mocked<KeyScanner>;

    setup(() => {
        mockKeyScanner = {
            getKeyConstants: jest.fn(),
        } as any;
        
        completionProvider = new CompletionProvider(mockKeyScanner);
    });

    test('should provide completions for KeyConstants', () => {
        const mockKeys: TestingKey[] = [
            {
                name: 'loginButton',
                value: 'login_button',
                category: KeyCategory.Buttons,
                usageCount: 5,
                definitionLocation: {} as vscode.Location,
                usageLocations: []
            }
        ];

        mockKeyScanner.getKeyConstants.mockReturnValue(mockKeys);

        const document = {
            lineAt: () => ({ text: 'Key(KeyConstants.' })
        } as any;
        
        const position = new vscode.Position(0, 16);
        const completions = completionProvider.provideCompletionItems(
            document,
            position,
            {} as any,
            {} as any
        );

        assert.strictEqual(completions.length, 1);
        assert.strictEqual(completions[0].label, 'loginButton');
        assert.strictEqual(completions[0].detail, 'login_button');
    });
});
```

### Command Tests (`commands/validateCommand.test.ts`)

```typescript
suite('ValidateCommand', () => {
    let validateCommand: ValidateCommand;
    let mockValidationService: jest.Mocked<ValidationService>;

    setup(() => {
        mockValidationService = {
            validate: jest.fn(),
            generateReport: jest.fn()
        } as any;

        validateCommand = new ValidateCommand(mockValidationService);
    });

    test('should execute validation successfully', async () => {
        const mockResult: ValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            info: [],
            timestamp: new Date()
        };

        mockValidationService.validate.mockResolvedValue(mockResult);
        
        await assert.doesNotReject(
            async () => await validateCommand.execute()
        );
        
        expect(mockValidationService.validate).toHaveBeenCalledTimes(1);
    });

    test('should handle validation errors', async () => {
        mockValidationService.validate.mockRejectedValue(
            new Error('Validation failed')
        );

        // Should not throw due to BaseCommand error handling
        await assert.doesNotReject(
            async () => await validateCommand.execute()
        );
    });
});
```

## 🛠️ Testing Infrastructure

### Test Runner Configuration (`runTest.ts`)

```typescript
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
    try {
        const extensionDevelopmentPath = path.resolve(__dirname, '../../');
        const extensionTestsPath = path.resolve(__dirname, './suite/index');

        await runTests({
            extensionDevelopmentPath,
            extensionTestsPath,
            launchArgs: [
                '--disable-extensions',
                '--disable-workspace-trust'
            ]
        });
    } catch (err) {
        console.error('Failed to run tests');
        process.exit(1);
    }
}

main();
```

### Mock Setup

#### VS Code API Mocks (`mocks/vscode.ts`)

```typescript
export const vscode = {
    workspace: {
        openTextDocument: jest.fn(),
        getConfiguration: jest.fn(),
        onDidSaveTextDocument: jest.fn(),
        onDidChangeConfiguration: jest.fn(),
        workspaceFolders: []
    },
    window: {
        showInformationMessage: jest.fn(),
        showWarningMessage: jest.fn(),
        showErrorMessage: jest.fn(),
        createTreeView: jest.fn(),
        createOutputChannel: jest.fn()
    },
    commands: {
        registerCommand: jest.fn()
    },
    languages: {
        registerCompletionItemProvider: jest.fn(),
        registerCodeActionsProvider: jest.fn(),
        createDiagnosticCollection: jest.fn()
    },
    Uri: {
        file: (path: string) => ({ fsPath: path, path })
    },
    TreeItem: class {},
    CompletionItem: class {},
    CodeAction: class {},
    Position: class {},
    Range: class {},
    Location: class {}
};
```

### Test Fixtures

#### Sample Dart Files (`fixtures/dart/keyConstants.dart`)

```dart
class KeyConstants {
  // Button keys
  static const String loginButton = 'login_button';
  static const String submitButton = 'submit_button';
  static const String cancelButton = 'cancel_button';
  
  // Text field keys
  static const String emailField = 'email_field';
  static const String passwordField = 'password_field';
  
  // Navigation keys
  static const String homeTab = 'home_tab';
  static const String profileTab = 'profile_tab';
}
```

#### Mock Flutter Project (`fixtures/projects/flutter/pubspec.yaml`)

```yaml
name: test_flutter_app
description: Test Flutter application

version: 1.0.0+1

environment:
  sdk: '>=2.18.0 <4.0.0'
  flutter: ">=3.3.0"

dependencies:
  flutter:
    sdk: flutter

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.0

flutter:
  uses-material-design: true
```

## 📚 Best Practices

### Test Writing Guidelines

#### 1. Test Naming
- Use descriptive test names that explain what is being tested
- Follow pattern: `should [expected behavior] when [condition]`
- Group related tests in suites

#### 2. Test Structure
- **Arrange**: Set up test data and mocks
- **Act**: Execute the code under test
- **Assert**: Verify expected outcomes

#### 3. Mock Usage
- Mock external dependencies (VS Code API, file system)
- Use jest mocks for complex scenarios
- Keep mocks focused and minimal

#### 4. Error Testing
- Test both success and failure paths
- Verify error handling and recovery
- Test boundary conditions

#### 5. Async Testing
- Properly handle promises and async operations
- Use appropriate timeouts
- Test cancellation scenarios

### Code Coverage Guidelines

#### Minimum Coverage Targets
- **Overall**: 80%
- **Services**: 90%
- **Providers**: 85%
- **Commands**: 80%
- **Utilities**: 95%

#### Coverage Focus Areas
1. **Critical Path Testing**: Core functionality must be thoroughly tested
2. **Error Path Testing**: All error scenarios should be covered
3. **Edge Case Testing**: Boundary conditions and unusual inputs
4. **Integration Points**: VS Code API interactions

## 🚀 Running Tests

### Local Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run all tests
npm test

# Run specific test suite
npm test -- --grep "KeyScanner"

# Run tests with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### VS Code Integration

1. **Open Command Palette**: `Ctrl+Shift+P`
2. **Run Task**: `Tasks: Run Task`
3. **Select**: `npm: test`

Or use the integrated terminal:
```bash
npm test
```

### Debug Tests in VS Code

1. Set breakpoints in test files
2. Open Run and Debug view (`Ctrl+Shift+D`)
3. Select "Extension Tests" configuration
4. Press F5 to start debugging

## 🔄 Continuous Integration

### GitHub Actions Workflow (`.github/workflows/test.yml`)

```yaml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node-version: [16.x, 18.x]
    
    runs-on: ${{ matrix.os }}
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Compile
      run: npm run compile
    
    - name: Run tests
      run: npm test
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

### Quality Gates

Tests must pass before:
- **Pull Request Merging**: All tests green + coverage thresholds met
- **Release Creation**: Full test suite + integration tests
- **Deployment**: E2E tests in staging environment

## 📊 Coverage Reports

### Generating Coverage

```bash
# Generate coverage report
npm run test:coverage

# Open coverage report
open coverage/lcov-report/index.html
```

### Coverage Analysis

#### Key Metrics
- **Line Coverage**: Percentage of executed lines
- **Branch Coverage**: Percentage of executed branches
- **Function Coverage**: Percentage of called functions
- **Statement Coverage**: Percentage of executed statements

#### Coverage Exclusions
- Generated files (`*.g.ts`, `*.d.ts`)
- Test files themselves
- VS Code API type definitions
- Third-party library adaptations

### Monitoring Coverage Trends

1. **Baseline**: Establish minimum coverage requirements
2. **Trending**: Track coverage changes over time
3. **Reporting**: Include coverage in PR reviews
4. **Enforcement**: Fail builds if coverage drops below threshold

---

This comprehensive testing documentation ensures the Flutter Testing Keys Inspector extension maintains high quality, reliability, and user satisfaction through systematic testing approaches at all levels.