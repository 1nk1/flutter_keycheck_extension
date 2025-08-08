# 🎬 Flutter Testing Keys Inspector - Demo Instructions

## ✅ Шаги для тестирования расширения

### 1. **Установка завершена**
Расширение успешно установлено в VS Code. Вы должны увидеть:
- ✅ Extension 'flutter-testing-keys-inspector.vsix' was successfully installed

### 2. **Открытие Flutter проекта**
Откройте папку `test_flutter_project` в VS Code:
```bash
cd test_flutter_project
code .
```

### 3. **Активация расширения**
После открытия Flutter проекта расширение должно автоматически активироваться:

**Что должно произойти:**
- 🔍 VS Code обнаруживает `pubspec.yaml`
- ⚡ Расширение автоматически активируется
- 📝 В консоли должно появиться: "Flutter Testing Keys Inspector is now active!"

### 4. **Поиск Tree View в Explorer Panel**

**Где искать:**
1. Откройте Explorer panel (боковая панель слева, иконка папки)
2. Прокрутите вниз в Explorer panel
3. Должна появиться секция **"Testing Keys"**

**Ожидаемый результат:**
```
EXPLORER
├── 📁 TEST_FLUTTER_PROJECT
├── 📁 OUTLINE
├── 📁 TIMELINE
└── 📁 TESTING KEYS ← Здесь должна быть эта секция!
    ├── 📊 Statistics (23 total, 4 used)
    ├── 📁 Buttons (4 keys)
    ├── 📁 Text Fields (4 keys)
    ├── 📁 Navigation (4 keys)
    └── ...
```

### 5. **Если Tree View не появился - диагностика**

#### Проверьте вывод консоли:
1. `Ctrl+Shift+P` → "Developer: Toggle Developer Tools"
2. Перейдите на вкладку "Console"
3. Найдите сообщения от расширения

#### Проверьте статус расширения:
1. `Ctrl+Shift+P` → "Extensions: Show Installed Extensions"
2. Найдите "Flutter Testing Keys Inspector"
3. Убедитесь, что расширение включено

#### Принудительно активируйте расширение:
1. `Ctrl+Shift+P` → "Developer: Reload Window"
2. Или закройте и снова откройте VS Code

### 6. **Тестирование функций расширения**

#### А) Auto-completion:
1. Откройте файл `lib/main.dart`
2. Найдите строку с `Key(KeyConstants.`
3. Поставьте курсор после точки и нажмите `Ctrl+Space`
4. Должны появиться предложения с ключами

#### Б) Команды:
1. `Ctrl+Shift+P`
2. Введите "Flutter Keys"
3. Должны появиться команды:
   - Flutter Keys: Refresh
   - Flutter Keys: Validate
   - Flutter Keys: Generate Report
   - Flutter Keys: Add New Key

#### В) Issues Detection:
1. Откройте файл `lib/main.dart`
2. Найдите строку `key: const Key('hardcoded_cancel_button')`
3. Под hardcoded ключом должна появиться красная волнистая линия
4. Щелкните правой кнопкой → должны появиться Quick Fixes

### 7. **Возможные проблемы и решения**

#### Проблема: Tree View не появляется
**Решения:**
1. Убедитесь, что открыт именно Flutter проект (есть `pubspec.yaml`)
2. Проверьте, что файл `lib/constants/key_constants.dart` существует
3. Попробуйте команду "Flutter Keys: Refresh"
4. Перезагрузите VS Code

#### Проблема: Нет auto-completion
**Решения:**
1. Убедитесь, что расширение Dart установлено
2. Проверьте, что KeyConstants импортирован в файле
3. Попробуйте `Ctrl+Space` для принудительного вызова

#### Проблема: Команды не работают
**Решения:**
1. Проверьте консоль разработчика на ошибки
2. Убедитесь, что проект - это Flutter проект
3. Попробуйте перезагрузить расширение

### 8. **Проверка логов расширения**

1. `Ctrl+Shift+P` → "Output"
2. В выпадающем списке справа выберите "Flutter Testing Keys"
3. Просмотрите логи для диагностики проблем

### 9. **Демонстрация возможностей**

После успешной активации вы можете продемонстрировать:

1. **Tree View**: Структурированное отображение всех ключей
2. **Statistics**: Статистика использования ключей (23 total, 4 used)
3. **Categories**: Группировка по типам (Buttons, Text Fields, etc.)
4. **Usage Tracking**: Показ количества использований каждого ключа
5. **Issue Detection**: Обнаружение дубликатов и неиспользуемых ключей
6. **Quick Fixes**: Автоматические исправления для hardcoded ключей

### 10. **Дополнительные файлы для тестирования**

В проекте уже созданы:
- ✅ `lib/main.dart` - основной файл с примерами использования ключей
- ✅ `lib/constants/key_constants.dart` - файл с 23 ключами
- ✅ `lib/pages/home_page.dart` - дополнительные примеры с hardcoded ключами
- ✅ `test/widget_test.dart` - тесты с использованием ключей
- ✅ `pubspec.yaml` - Flutter конфигурация

## 🎯 Ожидаемый результат

Если все работает правильно, вы должны увидеть:

```
📊 TESTING KEYS (в Explorer panel)
├── 📊 Statistics (23 total, 4 used, 19 unused)
├── 📁 Buttons (4 keys)
│   ├── 🔑 loginButton ✅ (2 uses)
│   ├── 🔑 submitButton ✅ (2 uses)
│   ├── ⚠️ cancelButton (0 uses)
│   └── ⚠️ logoutButton (0 uses)
├── 📁 Text Fields (4 keys)
│   ├── 🔑 emailField ✅ (2 uses)
│   ├── 🔑 passwordField ✅ (2 uses)
│   ├── ⚠️ usernameField (0 uses)
│   └── ⚠️ searchField (0 uses)
└── ... другие категории
```

**Индикаторы успешной работы:**
- ✅ Зеленые иконки для используемых ключей
- ⚠️ Желтые иконки для неиспользуемых ключей
- 📊 Точная статистика (4 used из 23 total)
- 🔍 Auto-completion работает при вводе `KeyConstants.`
- 🔧 Quick fixes доступны для hardcoded ключей
- 📝 Команды "Flutter Keys" в Command Palette

Если что-то не работает, проверьте консоль разработчика и логи расширения для диагностики! 🐛