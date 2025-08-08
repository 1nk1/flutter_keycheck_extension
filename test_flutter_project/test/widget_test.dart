import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:test_flutter_project/main.dart';
import 'package:test_flutter_project/constants/key_constants.dart';

void main() {
  group('Login Page Tests', () {
    testWidgets('should display login form with proper keys', (WidgetTester tester) async {
      // Build our app and trigger a frame
      await tester.pumpWidget(const MyApp());

      // Verify that the login form is displayed
      expect(find.text('Login Demo'), findsOneWidget);

      // Test using KeyConstants - Extension validates these
      expect(find.byKey(Key(KeyConstants.emailField)), findsOneWidget);
      expect(find.byKey(Key(KeyConstants.passwordField)), findsOneWidget);
      expect(find.byKey(Key(KeyConstants.loginButton)), findsOneWidget);
      expect(find.byKey(Key(KeyConstants.submitButton)), findsOneWidget);

      // Test hardcoded key - Extension will flag this as an issue
      expect(find.byKey(const Key('hardcoded_cancel_button')), findsOneWidget);
    });

    testWidgets('should handle login button tap', (WidgetTester tester) async {
      await tester.pumpWidget(const MyApp());

      // Enter email
      await tester.enterText(
        find.byKey(Key(KeyConstants.emailField)),
        'test@example.com'
      );

      // Enter password
      await tester.enterText(
        find.byKey(Key(KeyConstants.passwordField)),
        'password123'
      );

      // Tap login button
      await tester.tap(find.byKey(Key(KeyConstants.loginButton)));
      await tester.pump();

      // Verify snackbar is shown
      expect(find.text('Login pressed'), findsOneWidget);
    });

    testWidgets('should handle submit button tap', (WidgetTester tester) async {
      await tester.pumpWidget(const MyApp());

      // Tap submit button
      await tester.tap(find.byKey(Key(KeyConstants.submitButton)));
      await tester.pump();

      // Verify snackbar is shown
      expect(find.text('Submit pressed'), findsOneWidget);
    });

    testWidgets('should handle cancel button tap', (WidgetTester tester) async {
      await tester.pumpWidget(const MyApp());

      // Tap cancel button (hardcoded key)
      await tester.tap(find.byKey(const Key('hardcoded_cancel_button')));
      await tester.pump();

      // Verify snackbar is shown
      expect(find.text('Cancel pressed'), findsOneWidget);
    });
  });

  group('Key Usage Analysis', () {
    test('should demonstrate key usage patterns', () {
      // This test demonstrates how the extension analyzes key usage
      
      // ✅ Keys used in tests (extension will track these)
      const usedKeys = [
        KeyConstants.emailField,
        KeyConstants.passwordField,
        KeyConstants.loginButton,
        KeyConstants.submitButton,
      ];

      // ❌ Hardcoded keys (extension will flag these)
      const hardcodedKeys = [
        'hardcoded_cancel_button',
        'home_tab_icon',
        'profile_tab_icon', 
        'settings_tab_icon',
        'add_button',
      ];

      // Extension analysis would show:
      // - 4 keys properly used from KeyConstants
      // - 5 hardcoded keys that should be moved to KeyConstants
      // - Usage statistics and recommendations
      
      expect(usedKeys.length, equals(4));
      expect(hardcodedKeys.length, equals(5));
    });
  });
}