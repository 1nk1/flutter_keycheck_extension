# Flutter Testing Keys Inspector

[![Version](https://img.shields.io/visual-studio-marketplace/v/your-publisher-name.flutter-testing-keys-inspector)](https://marketplace.visualstudio.com/items?itemName=your-publisher-name.flutter-testing-keys-inspector)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/your-publisher-name.flutter-testing-keys-inspector)](https://marketplace.visualstudio.com/items?itemName=your-publisher-name.flutter-testing-keys-inspector)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/your-publisher-name.flutter-testing-keys-inspector)](https://marketplace.visualstudio.com/items?itemName=your-publisher-name.flutter-testing-keys-inspector)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Professional testing keys management and validation for Flutter projects with intelligent code analysis and automated suggestions.

![Flutter Testing Keys Inspector](resources/icon.png)

## ✨ Features

- 🔍 **Visual Tree View** - Hierarchical display of testing keys organized by categories
- 🎯 **Smart Auto-completion** - Context-aware KeyConstants suggestions with usage statistics
- ⚡ **Code Actions** - Quick fixes for hardcoded keys, missing constants, and imports
- 📊 **Validation Engine** - Comprehensive analysis with detailed reporting
- 🔧 **CLI Integration** - Seamless flutter_keycheck validation support
- 🚀 **Real-time Updates** - Auto-refresh on file changes and configuration updates
- 📈 **Usage Analytics** - Track key usage patterns and coverage metrics

## 🚀 Quick Start

### Installation

1. **From VS Code Marketplace:**

   - Open VS Code
   - Go to Extensions (`Ctrl+Shift+X`)
   - Search for "Flutter Testing Keys Inspector"
   - Click Install

2. **From Command Line:**

   ```bash
   code --install-extension your-publisher-name.flutter-testing-keys-inspector
   ```

### Basic Setup

1. **Create KeyConstants file** at `lib/constants/key_constants.dart`:

   ```dart
   class KeyConstants {
     static const String loginButton = 'login_button';
     static const String emailField = 'email_field';
     static const String passwordField = 'password_field';
   }
   ```

2. **Use keys in your widgets:**

   ```dart
   ElevatedButton(
     key: Key(KeyConstants.loginButton),
     onPressed: () => _handleLogin(),
     child: Text('Login'),
   )
   ```

3. **Check the Explorer panel** for the "Testing Keys" view

## 📖 Usage

### Tree View Navigation

The extension adds a "Testing Keys" panel to the Explorer view with:

- **📊 Statistics** - Project overview with key counts and coverage metrics
- **📁 Categories** - Keys organized by widget types (Buttons, TextFields, etc.)
- **🔑 Key Details** - Individual keys with usage information and file locations

### Intelligent Auto-completion

Smart suggestions when typing:

- `KeyConstants.` → Shows all available keys with usage statistics
- `Key(KeyConstants.` → Auto-completes with closing parenthesis
- `key: Key(KeyConstants.` → Widget key parameter completion

### Code Actions & Quick Fixes

Right-click in Dart files for instant improvements:

- **Replace hardcoded keys** with constants
- **Add missing keys** to widgets
- **Create new key constants** interactively
- **Import KeyConstants** automatically
- **Organize keys** by category

### Command Palette

Access via `Ctrl+Shift+P`:

- `Flutter Keys: Refresh` - Rescan all keys
- `Flutter Keys: Validate` - Run comprehensive validation
- `Flutter Keys: Generate Report` - Create detailed analysis report
- `Flutter Keys: Add New Key` - Interactive key creation wizard

## ⚙️ Configuration

Configure the extension in VS Code settings:

```json
{
  "flutterTestingKeys.autoValidate": true,
  "flutterTestingKeys.keyConstantsPath": "lib/constants/key_constants.dart",
  "flutterTestingKeys.showUnusedKeys": true,
  "flutterTestingKeys.enableDiagnostics": true
}
```

### Available Settings

| Setting             | Default                            | Description                               |
| ------------------- | ---------------------------------- | ----------------------------------------- |
| `autoValidate`      | `true`                             | Automatically validate keys on file save  |
| `keyConstantsPath`  | `lib/constants/key_constants.dart` | Path to KeyConstants file                 |
| `showUnusedKeys`    | `true`                             | Show unused keys in tree view             |
| `enableDiagnostics` | `true`                             | Enable diagnostic messages for key issues |

## 🔧 flutter_keycheck Integration

For enhanced performance and accuracy, the extension integrates with the `flutter_keycheck` CLI tool.

### Automatic Installation

The extension will automatically prompt to install `flutter_keycheck` when needed:

```yaml
# Added to pubspec.yaml dev_dependencies
dev_dependencies:
  flutter_keycheck: ^1.0.0
```

### Configuration File

Create `flutter_keycheck.yaml` in your project root:

```yaml
# Paths to scan for key usage
scan_paths:
  - lib/
  - test/

# Path to key constants file
key_constants_path: lib/constants/key_constants.dart

# Patterns to exclude from scanning
exclude_patterns:
  - '**/*.g.dart'
  - '**/generated/**'

# Validation options
validation:
  check_unused: true
  check_duplicates: true
  check_naming_convention: true
  naming_pattern: '^[a-zA-Z][a-zA-Z0-9_]*$'
```

### Performance Benefits

- ⚡ **3-5x faster** validation for large projects
- 🎯 **More accurate** key usage detection
- 📊 **Enhanced reporting** with detailed statistics

## 📋 Key Categories

Keys are automatically categorized based on naming patterns and usage context:

- 🔘 **Buttons** - ElevatedButton, TextButton, IconButton
- ✏️ **Text Fields** - TextField, TextFormField
- ☑️ **Checkboxes** - Checkbox, Radio, Switch
- 📋 **Dropdowns** - DropdownButton, DropdownButtonFormField
- 🧭 **Navigation** - AppBar, NavigationBar, BottomNavigationBar
- 📋 **Lists** - ListView, ListTile
- 🃏 **Cards** - Card, Container
- 💬 **Dialogs** - AlertDialog, BottomSheet
- 🎮 **Game Elements** - Custom game widgets
- ⚙️ **Settings** - Settings and configuration widgets
- 📦 **Other** - Miscellaneous widgets

## 💡 Best Practices

### Naming Convention

Use descriptive, consistent names:

```dart
// ✅ Good
static const String loginSubmitButton = 'login_submit_button';
static const String userEmailTextField = 'user_email_text_field';

// ❌ Avoid
static const String btn1 = 'b1';
static const String field = 'f';
```

### Organization by Feature

Group keys by screen or feature:

```dart
class KeyConstants {
  // Login Screen
  static const String loginEmailField = 'login_email_field';
  static const String loginPasswordField = 'login_password_field';
  static const String loginSubmitButton = 'login_submit_button';

  // Profile Screen
  static const String profileNameField = 'profile_name_field';
  static const String profileSaveButton = 'profile_save_button';
}
```

### Widget Testing Integration

Use keys consistently in tests:

```dart
testWidgets('login button triggers authentication', (tester) async {
  await tester.pumpWidget(MyApp());

  await tester.enterText(
    find.byKey(Key(KeyConstants.loginEmailField)),
    'test@example.com'
  );

  await tester.tap(find.byKey(Key(KeyConstants.loginSubmitButton)));
  await tester.pump();

  expect(find.text('Welcome'), findsOneWidget);
});
```

## 🐛 Troubleshooting

### Extension Not Activating

- Ensure you're in a Flutter project (contains `pubspec.yaml`)
- Verify `flutter:` is present in `pubspec.yaml`
- Restart VS Code if needed

### Keys Not Showing

- Check KeyConstants file exists at configured path
- Verify file contains `static const String` declarations
- Use "Flutter Keys: Refresh" command to rescan

### Auto-completion Not Working

- Ensure Dart language support is installed
- Check KeyConstants is imported in the file
- Verify file is saved and syntax is correct

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md).

### Development Setup

```bash
git clone https://github.com/your-username/flutter-testing-keys-inspector.git
cd flutter-testing-keys-inspector
npm install
npm run watch
```

Press `F5` to run the extension in a new Extension Development Host window.

### Running Tests

```bash
npm test
```

### Building

```bash
npm run package
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Flutter team for the amazing framework
- VS Code team for the excellent extension API
- Community contributors and feedback

## 📞 Support

- 🐛 [Report Issues](https://github.com/your-username/flutter-testing-keys-inspector/issues)
- 💡 [Feature Requests](https://github.com/your-username/flutter-testing-keys-inspector/issues/new?template=feature_request.md)
- 📖 [Documentation](https://github.com/your-username/flutter-testing-keys-inspector/wiki)
- 💬 [Discussions](https://github.com/your-username/flutter-testing-keys-inspector/discussions)
