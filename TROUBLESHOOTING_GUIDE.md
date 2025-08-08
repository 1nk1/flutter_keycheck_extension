# VSCode Extension Troubleshooting Guide

## Issues Fixed

### Root Causes Identified:
1. **Missing Command Registrations** - Commands declared in `package.json` but not registered in `extension.ts`
2. **Complex Dependency Failures** - ErrorBoundary and other services failing silently
3. **Activation Event Timing** - Extension not activating when TreeView is accessed

### Fixes Applied:

#### 1. Added Missing Command Registrations
- Added `flutterTestingKeys.generateReport` 
- Added `flutterTestingKeys.goToDefinition`
- All commands from `package.json` now match `extension.ts`

#### 2. Improved Error Handling
- Non-critical errors (like scanning failures) don't prevent extension activation
- Better logging and verification of registrations
- Graceful degradation instead of complete failure

#### 3. Enhanced Activation Events
- Added `"*"` activation for debugging (temporary)
- Added all missing command activation events
- TreeView should now be accessible immediately

## Testing Your Extension

### 1. Install the Fixed Version
```bash
code --install-extension flutter-testing-keys-inspector-1.4.0.vsix --force
```

### 2. Check Console Output
1. Open VSCode
2. Go to View → Output
3. Select "Extension Host" from dropdown
4. Look for logs starting with "ПРОСТОЕ РАСШИРЕНИЕ АКТИВИРУЕТСЯ!"

### 3. Verify TreeView
1. Open File Explorer (Ctrl+Shift+E)
2. Look for "Testing Keys" section at bottom
3. Should show either keys or "No Flutter project detected"

### 4. Test Commands
Open Command Palette (Ctrl+Shift+P) and test:
- `Flutter Testing Keys: Refresh`
- `Flutter Testing Keys: Validate Keys`
- `Flutter Testing Keys: Generate Report`
- `Flutter Testing Keys: Add New Key`
- `Flutter Testing Keys: Open Widget Preview`

## Expected Behavior

### Successful Activation:
- Console shows: "ПРОСТОЕ РАСШИРЕНИЕ АКТИВИРУЕТСЯ!"
- Console shows: "Все команды зарегистрированы успешно"
- Console shows: "Расширение активировано успешно!"
- TreeView appears in Explorer panel
- All commands work in Command Palette

### If Still Not Working:

#### Debug Steps:
1. **Check Console Logs** - Look for any error messages in Extension Host output
2. **Verify Installation** - Run `code --list-extensions` to confirm installation
3. **Try Flutter Project** - Open a folder with `pubspec.yaml` to trigger Flutter detection
4. **Restart VSCode** - Sometimes needed after extension updates

#### Common Issues:
- **TreeView not visible** - Check if Explorer panel is open and scroll down
- **Commands not found** - Check Extension Host console for registration errors
- **No data in TreeView** - Normal if no Flutter project is open

## Performance Note

The current version uses `"*"` activation for debugging, which impacts VSCode startup performance. Once confirmed working, we should remove this and use specific activation events only.

## Next Steps

After confirming this version works:
1. Remove `"*"` from activationEvents
2. Test specific activation triggers
3. Add back complex KeyScanner functionality gradually
4. Implement proper error boundaries for production use

## Debug Commands Added

All commands now include console logging:
- Check Extension Host output to verify command execution
- Each command shows success message when executed
- TreeView operations are logged for debugging