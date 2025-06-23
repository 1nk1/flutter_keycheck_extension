# Contributing to Flutter Testing Keys Inspector

Thank you for your interest in contributing to Flutter Testing Keys Inspector! We welcome contributions from the community and appreciate your help in making this extension better.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Style Guidelines](#style-guidelines)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 16.x or higher
- VS Code 1.74.0 or higher
- Git

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**

   ```bash
   git clone https://github.com/your-username/flutter-testing-keys-inspector.git
   cd flutter-testing-keys-inspector
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Open in VS Code:**

   ```bash
   code .
   ```

5. **Start development mode:**

   ```bash
   npm run watch
   ```

6. **Run the extension:**
   - Press `F5` to open a new Extension Development Host window
   - Open a Flutter project to test the extension

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-new-validation-rule`
- `fix/tree-view-refresh-issue`
- `docs/update-readme-examples`

### Commit Messages

Follow conventional commit format:

- `feat: add support for custom key patterns`
- `fix: resolve auto-completion performance issue`
- `docs: update installation instructions`
- `test: add unit tests for key scanner`

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linting
npm run lint

# Run type checking
npm run compile
```

### Writing Tests

- Add unit tests for new features in `src/test/suite/`
- Use descriptive test names
- Mock external dependencies
- Test both success and error cases

Example:

```typescript
suite('KeyScanner Tests', () => {
  test('should categorize button keys correctly', () => {
    const scanner = new KeyScanner();
    const key = { name: 'loginButton', value: 'login_button' };
    const category = scanner.categorizeKey(key);
    assert.strictEqual(category, KeyCategory.Buttons);
  });
});
```

## Submitting Changes

### Pull Request Process

1. **Update your fork:**

   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes and commit:**

   ```bash
   git add .
   git commit -m "feat: your descriptive commit message"
   ```

4. **Push to your fork:**

   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request** on GitHub

### Pull Request Guidelines

- **Title:** Clear and descriptive
- **Description:** Explain what changes you made and why
- **Screenshots:** Include before/after screenshots for UI changes
- **Testing:** Describe how you tested your changes
- **Breaking Changes:** Clearly mark any breaking changes

## Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

```typescript
/**
 * Scans the workspace for testing keys
 * @param forceRefresh Whether to ignore cache and rescan all files
 * @returns Promise resolving to array of found testing keys
 */
async scanAllKeys(forceRefresh: boolean = false): Promise<TestingKey[]> {
    // Implementation
}
```

### File Organization

```bash
src/
├── extension.ts          # Main extension entry point
├── models/              # Data models and interfaces
├── services/            # Business logic services
├── providers/           # VS Code providers
├── utils/               # Utility functions
└── test/               # Test files
```

### Code Quality

- Run `npm run lint` before committing
- Fix all TypeScript errors
- Maintain test coverage above 80%
- Use meaningful commit messages

## Issue Guidelines

### Bug Reports

Include:

- VS Code version
- Extension version
- Flutter/Dart version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs if applicable

### Feature Requests

Include:

- Clear description of the feature
- Use case and motivation
- Proposed implementation (if any)
- Examples of similar features

## Development Tips

### Debugging

1. **Extension Host Debugging:**

   - Set breakpoints in your code
   - Press `F5` to start debugging
   - Use the Debug Console for logging

2. **Output Channel:**

   ```typescript
   const outputChannel = vscode.window.createOutputChannel('Flutter Testing Keys');
   outputChannel.appendLine('Debug message');
   outputChannel.show();
   ```

### Testing with Real Projects

1. Create a test Flutter project
2. Add various key usage patterns
3. Test all extension features
4. Verify performance with large projects

### Performance Considerations

- Use async/await for I/O operations
- Implement caching for expensive operations
- Debounce file change events
- Profile memory usage for large projects

## Recognition

Contributors will be:

- Listed in the README
- Mentioned in release notes
- Invited to join the maintainers team (for significant contributions)

## Questions?

- 💬 [Start a Discussion](https://github.com/your-username/flutter-testing-keys-inspector/discussions)
- 📧 Email: [maintainer@example.com](mailto:maintainer@example.com)
- 🐛 [Report Issues](https://github.com/your-username/flutter-testing-keys-inspector/issues)

Thank you for contributing! 🎉
