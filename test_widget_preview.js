const vscode = require('vscode');

/**
 * Test script to verify widget preview functionality
 */
async function testWidgetPreview() {
    console.log('Testing Widget Preview functionality...');
    
    try {
        // Test 1: Check if command is registered
        const commands = await vscode.commands.getCommands(true);
        const widgetPreviewCommand = commands.find(cmd => cmd === 'flutterTestingKeys.openWidgetPreview');
        
        if (widgetPreviewCommand) {
            console.log('✅ Widget Preview command is registered');
        } else {
            console.log('❌ Widget Preview command NOT found');
            return false;
        }
        
        // Test 2: Try to execute the command
        console.log('🧪 Attempting to open Widget Preview...');
        await vscode.commands.executeCommand('flutterTestingKeys.openWidgetPreview');
        console.log('✅ Widget Preview command executed successfully');
        
        return true;
    } catch (error) {
        console.error('❌ Widget Preview test failed:', error);
        return false;
    }
}

// Run the test if this is being executed directly
if (require.main === module) {
    testWidgetPreview().then(success => {
        console.log(success ? '🎉 All tests passed!' : '💥 Tests failed!');
        process.exit(success ? 0 : 1);
    });
}

module.exports = { testWidgetPreview };