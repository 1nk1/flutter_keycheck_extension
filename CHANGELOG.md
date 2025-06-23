# Changelog

All notable changes to the Flutter Testing Keys Inspector extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-XX

### Added

- 🔍 **Visual Tree View** - Hierarchical display of testing keys organized by categories
- 🎯 **Smart Auto-completion** - Context-aware KeyConstants suggestions with usage statistics
- ⚡ **Code Actions** - Quick fixes for hardcoded keys, missing constants, and imports
- 📊 **Validation Engine** - Comprehensive analysis with detailed reporting
- 🔧 **CLI Integration** - Seamless flutter_keycheck validation support
- 🚀 **Real-time Updates** - Auto-refresh on file changes and configuration updates
- 📈 **Usage Analytics** - Track key usage patterns and coverage metrics

### Features

- Automatic key categorization (Buttons, TextFields, Checkboxes, etc.)
- Interactive key creation wizard
- Intelligent import management
- Configurable validation rules
- Performance optimized scanning
- Multi-project workspace support

### Commands

- `Flutter Keys: Refresh` - Rescan all keys
- `Flutter Keys: Validate` - Run comprehensive validation
- `Flutter Keys: Generate Report` - Create detailed analysis report
- `Flutter Keys: Add New Key` - Interactive key creation wizard

### Configuration

- `flutterTestingKeys.autoValidate` - Auto-validate on file save
- `flutterTestingKeys.keyConstantsPath` - Path to KeyConstants file
- `flutterTestingKeys.showUnusedKeys` - Show unused keys in tree view
- `flutterTestingKeys.enableDiagnostics` - Enable diagnostic messages

### Technical

- TypeScript implementation with full type safety
- Comprehensive test suite with 80%+ coverage
- ESLint configuration for code quality
- Webpack bundling for optimized distribution
- GitHub Actions CI/CD pipeline

## [Unreleased]

### Planned

- Integration with more testing frameworks
- Advanced key usage analytics
- Custom validation rule editor
- Multi-language support
- Performance dashboard

---

For more details about each release, see the [GitHub Releases](https://github.com/your-username/flutter-testing-keys-inspector/releases) page.
