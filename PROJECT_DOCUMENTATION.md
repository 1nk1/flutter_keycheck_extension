# Flutter Testing Keys Inspector - Project Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Core Components](#core-components)
4. [API Reference](#api-reference)
5. [Development Guide](#development-guide)
6. [Testing Strategy](#testing-strategy)
7. [Deployment](#deployment)
8. [SuperClaude Framework](#superclaude-framework)

## 🎯 Overview

### Project Summary

Flutter Testing Keys Inspector is a VS Code extension that provides professional testing key management and validation for Flutter projects. It offers intelligent code analysis, auto-completion, and seamless integration with the flutter_keycheck CLI tool.

### Key Features

- **Visual Tree View**: Hierarchical display of testing keys organized by categories
- **Smart Auto-completion**: Context-aware KeyConstants suggestions with usage statistics  
- **Code Actions**: Quick fixes for hardcoded keys, missing constants, and imports
- **Validation Engine**: Comprehensive analysis with detailed reporting
- **CLI Integration**: Seamless flutter_keycheck validation support
- **Real-time Updates**: Auto-refresh on file changes and configuration updates
- **Usage Analytics**: Track key usage patterns and coverage metrics

### Technology Stack

- **Language**: TypeScript 4.9.4
- **Platform**: VS Code Extension (^1.74.0)
- **Build Tool**: Webpack 5.75.0
- **Testing**: Mocha 11.7.0
- **Linting**: ESLint 8.28.0

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension Host                     │
├─────────────────────────────────────────────────────────────┤
│                    Extension Entry Point                      │
│                     (extension.ts)                           │
├─────────────────┬────────────┬────────────┬─────────────────┤
│    Providers    │  Services   │   Models   │     Utils       │
├─────────────────┼────────────┼────────────┼─────────────────┤
│ CodeAction      │ KeyScanner  │ TestingKey │ DartParser      │
│ Completion      │ Validation  │ KeyValid.  │ FileUtils       │
│ KeyTree         │ FlutterKC   │            │                 │
└─────────────────┴────────────┴────────────┴─────────────────┘
```

### Component Interaction Flow

1. **Extension Activation**: Triggered when VS Code detects a Flutter project
2. **Service Initialization**: KeyScanner, ValidationService, and FlutterKeycheckService are initialized
3. **Provider Registration**: Language providers and tree view are registered
4. **Event Handling**: File changes, saves, and user commands trigger updates
5. **Data Flow**: Services analyze code → Providers display results → Users interact

### Directory Structure

```
flutter_keycheck_extension/
├── src/                    # TypeScript source code
│   ├── extension.ts       # Main entry point
│   ├── models/            # Data models and interfaces
│   ├── providers/         # VS Code API providers
│   ├── services/          # Core business logic
│   ├── utils/             # Helper utilities
│   └── test/              # Test suites
├── out/                   # Compiled JavaScript
├── resources/             # Extension assets
├── SuperClaude_Framework/ # Development framework
└── package.json          # Extension manifest
```

## 🔧 Core Components

### Extension Entry Point (`extension.ts`)

The main entry point that handles:
- Extension activation and deactivation
- Service initialization
- Command registration
- Event listener setup

Key functions:
- `activate(context)`: Initializes the extension
- `deactivate()`: Cleanup on extension deactivation
- `registerCommands()`: Registers all extension commands
- `registerEventListeners()`: Sets up file watchers and event handlers

### Services

#### KeyScanner Service
**Purpose**: Scans Dart files to discover and catalog testing keys

**Key Methods**:
- `scanWorkspace()`: Full workspace scan
- `scanFile(uri)`: Single file scan
- `getKeyConstants()`: Returns discovered keys
- `findKeyUsages(key)`: Locates key usage in code

#### ValidationService
**Purpose**: Validates key usage and identifies issues

**Key Methods**:
- `validate()`: Comprehensive validation
- `validateFile(uri)`: File-specific validation
- `generateReport()`: Creates validation report
- `checkNamingConvention(key)`: Validates naming patterns

#### FlutterKeycheckService
**Purpose**: Integrates with flutter_keycheck CLI tool

**Key Methods**:
- `isInstalled()`: Checks CLI availability
- `runValidation()`: Executes CLI validation
- `parseResults(output)`: Processes CLI output
- `installTool()`: Handles CLI installation

### Providers

#### KeyTreeProvider
**Purpose**: Provides tree view data for the Testing Keys panel

**Features**:
- Hierarchical key organization
- Category-based grouping
- Usage statistics display
- Real-time updates

#### CompletionProvider
**Purpose**: Offers intelligent auto-completion for KeyConstants

**Features**:
- Context-aware suggestions
- Usage statistics in completions
- Smart bracket insertion
- Import statement handling

#### CodeActionProvider
**Purpose**: Provides quick fixes and code actions

**Actions**:
- Replace hardcoded keys
- Add missing key imports
- Create new key constants
- Organize keys by category

### Models

#### TestingKey Interface
```typescript
interface TestingKey {
  name: string;
  value: string;
  category: KeyCategory;
  usageCount: number;
  definitionLocation: vscode.Location;
  usageLocations: vscode.Location[];
  lastUsed?: Date;
}
```

#### KeyCategory Enum
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

### Utilities

#### DartParser
**Purpose**: Parses Dart code to extract key information

**Key Methods**:
- `extractKeyConstants(content)`: Finds key definitions
- `findKeyUsages(content)`: Locates key usage
- `categorizeKey(name, context)`: Determines key category
- `extractWidgetType(code)`: Identifies widget types

#### FileUtils
**Purpose**: File system operations and Flutter project detection

**Key Methods**:
- `getWorkspaceRoot()`: Returns workspace path
- `isFlutterProject(path)`: Validates Flutter project
- `findKeyConstantsFile()`: Locates key constants file
- `readFile(path)`: Safe file reading

## 📚 API Reference

### Commands

| Command | ID | Description |
|---------|-----|-------------|
| Refresh | `flutterTestingKeys.refresh` | Rescan all keys in workspace |
| Validate | `flutterTestingKeys.validate` | Run comprehensive validation |
| Generate Report | `flutterTestingKeys.generateReport` | Create detailed analysis report |
| Add New Key | `flutterTestingKeys.addKey` | Interactive key creation wizard |
| Go to Definition | `flutterTestingKeys.goToDefinition` | Navigate to key definition |

### Configuration

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `flutterTestingKeys.autoValidate` | boolean | true | Auto-validate on save |
| `flutterTestingKeys.keyConstantsPath` | string | "lib/constants/key_constants.dart" | KeyConstants file path |
| `flutterTestingKeys.showUnusedKeys` | boolean | true | Show unused keys in tree |
| `flutterTestingKeys.enableDiagnostics` | boolean | true | Enable diagnostic messages |

### Events

The extension listens to and emits several events:

- `onDidChangeTextDocument`: Triggers key re-scanning
- `onDidSaveTextDocument`: Triggers validation if enabled
- `onDidChangeConfiguration`: Updates settings
- `onDidChangeWorkspaceFolders`: Re-initializes for new workspace

## 🛠️ Development Guide

### Prerequisites

- Node.js 16.x or higher
- VS Code 1.74.0 or higher
- TypeScript 4.9.4
- Git

### Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/flutter-testing-keys-inspector.git
   cd flutter-testing-keys-inspector
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development**:
   ```bash
   npm run watch
   ```

4. **Run extension**:
   - Press `F5` in VS Code
   - New Extension Development Host window opens
   - Open a Flutter project to test

### Building

```bash
# Compile TypeScript
npm run compile

# Build with webpack
npm run webpack

# Package extension
npm run package
```

### Code Style

- Follow TypeScript best practices
- Use ESLint configuration provided
- Maintain consistent naming conventions
- Document public APIs with JSDoc

## 🧪 Testing Strategy

### Test Structure

```
src/test/
├── runTest.ts          # Test runner configuration
└── suite/
    ├── index.ts        # Test suite entry
    └── extension.test.ts # Extension tests
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Debug tests
F5 → Select "Extension Tests"
```

### Test Categories

1. **Unit Tests**: Service and utility logic
2. **Integration Tests**: Provider functionality
3. **E2E Tests**: Full extension workflow

## 📦 Deployment

### Publishing Process

1. **Update version**:
   ```json
   "version": "1.0.1"
   ```

2. **Update CHANGELOG.md**

3. **Build and package**:
   ```bash
   npm run vscode:prepublish
   vsce package
   ```

4. **Publish**:
   ```bash
   vsce publish
   ```

### CI/CD Pipeline

GitHub Actions workflow handles:
- Automated testing on PR
- Version validation
- Package building
- Release creation

## 🚀 SuperClaude Framework

This project includes the SuperClaude Framework for enhanced development capabilities.

### Framework Components

- **Commands**: Advanced development commands (`/analyze`, `/build`, etc.)
- **Personas**: Specialized AI personalities for different domains
- **MCP Servers**: Integrated development tools
- **Orchestrator**: Intelligent routing and decision-making

### Key Features

- **Wave Mode**: Multi-stage execution for complex operations
- **Task Management**: Structured workflow with progress tracking
- **Token Efficiency**: Optimized communication
- **Quality Gates**: 8-step validation cycle

### Usage

The framework enhances development with:
- Automated code analysis
- Intelligent refactoring suggestions
- Comprehensive testing strategies
- Documentation generation

For detailed framework documentation, see the `SuperClaude_Framework/` directory.

---

## 📞 Support & Resources

- **Issues**: [GitHub Issues](https://github.com/your-username/flutter-testing-keys-inspector/issues)
- **Wiki**: [Project Wiki](https://github.com/your-username/flutter-testing-keys-inspector/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/flutter-testing-keys-inspector/discussions)
- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **License**: MIT License - see [LICENSE](LICENSE)