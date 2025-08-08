# 🧪 Flutter Testing Keys Inspector - Демонстрация навигации

## 🎯 Как протестировать новую функциональность

### 1. **Базовая навигация по клику**

#### Шаги тестирования:
1. 📂 Откройте Flutter проект в VSCode
2. 🔍 Убедитесь что есть файл `lib/constants/key_constants.dart` с ключами
3. 🌳 Откройте Tree View "Testing Keys" в Explorer
4. 🖱️ Кликните на любой ключ в категории (например, "Buttons")
5. 🎯 **Ожидаемый результат**: 
   - Переход к файлу с использованием ключа
   - Курсор на строке с `Key(KeyConstants.keyName)`
   - Подсветка ключа, Widget-а и области видимости
   - Toast с информацией о контексте

### 2. **Демонстрация умной навигации**

#### Команда:
```bash
Flutter Testing Keys: Demonstrate Smart Navigation
```

#### Что происходит:
- 🔍 Автоматически находит используемый ключ
- 🎯 Выполняет навигацию с полной подсветкой
- 📊 Показывает статистику декораций в консоли
- ⏱️ Автоматическая очистка через 10 секунд

### 3. **Тестирование подсветки Widget-ов**

#### Команда:
```bash
Flutter Testing Keys: Test Widget Highlighting
```

#### Подготовка:
1. 📝 Откройте любой `.dart` файл
2. 🖱️ Выделите текст (например, название Widget-а)
3. 🎨 Выполните команду

#### Результат:
- ⚡ Подсветка выделенного текста как "key usage"
- ✨ Анимированная декорация (3 секунды)
- 🧹 Автоматическая очистка через 8 секунд

### 4. **Анализ контекста файла**

#### Команда:
```bash
Flutter Testing Keys: Analyze Current File Context
```

#### Подготовка:
1. 📝 Откройте файл с Flutter Widget-ами
2. 📍 Поместите курсор внутри Widget-а (например, в TextField)
3. 🔍 Выполните команду

#### Информация в результате:
```
🔍 Context Analysis Results:
📍 Position: Line 45
📏 Indent Level: 6
📱 Widget: TextField
⚙️ Method: build
🏗️ Parent Widgets: Scaffold → Column → Container
🔍 Scope: Code block (12 lines, indent level 6)
```

### 5. **Статистика навигации**

#### Команда:
```bash
Flutter Testing Keys: Show Navigation Statistics
```

#### Отображаемая информация:
```
📊 Navigation & Key Statistics:

🔑 Total Keys: 25
✅ Used Keys: 18
❌ Unused Keys: 7
📂 Categories: 6

🏆 Top Categories:
  • Buttons: 8 keys
  • Text Fields: 6 keys
  • Navigation: 4 keys
  • Checkboxes: 3 keys
  • Dialogs: 2 keys

🔥 Most Used Keys:
  • loginButton: 5 usages
  • emailField: 4 usages
  • passwordField: 3 usages
```

## 🧪 Детальное тестирование компонентов

### NavigationService

#### Тест 1: Единственное использование ключа
```dart
// В файле lib/screens/login_screen.dart:
ElevatedButton(
  key: Key(KeyConstants.loginButton), // <- Должен переходить сюда
  onPressed: _login,
  child: Text('Login'),
)
```

**Ожидаемое поведение:**
- 🎯 Курсор на строке с `key: Key(KeyConstants.loginButton)`
- 🎨 Подсветка всего ElevatedButton блока
- 💡 Toast: "Key: loginButton | Widget: ElevatedButton | Method: build"

#### Тест 2: Множественные использования
```dart
// Ключ emailField используется в 3 местах:
// 1. lib/screens/login_screen.dart:23
// 2. lib/screens/register_screen.dart:45  
// 3. lib/widgets/email_form.dart:12
```

**Ожидаемое поведение:**
- 📋 QuickPick с 4 опциями (3 использования + объявление)
- 🔍 Превью каждого использования
- 🎯 Навигация к выбранному варианту

#### Тест 3: Неиспользуемый ключ
```dart
// В key_constants.dart:
static const String unusedKey = 'unused_key_value';
```

**Ожидаемое поведение:**
- 📍 Переход к объявлению в KeyConstants
- 🔑 Подсветка строки с объявлением
- 💡 Toast: "Key declaration: unusedKey"

### WidgetHighlighter

#### Тест декораций:
```typescript
// Различные типы подсветки:
createKeyDeclarationDecoration()  // 🔑 + желтая подсветка
createKeyUsageDecoration()        // ⚡ + синяя подсветка  
createWidgetBoundaryDecoration()  // 📱 + зеленая граница
createScopeHighlightDecoration()  // 🔍 + фиолетовый scope
createErrorHighlightDecoration()  // ❌ + красная ошибка
```

### ContextAnalyzer

#### Тест анализа Widget иерархии:
```dart
// Тестовая структура:
Scaffold(
  body: Column(
    children: [
      Container(
        child: TextField(
          key: Key(KeyConstants.testField), // <- Анализируется здесь
        )
      )
    ]
  )
)
```

**Ожидаемый результат:**
```typescript
{
  widgetType: "TextField",
  parentWidgets: ["Scaffold", "Column", "Container"],
  methodName: "build",
  indentationLevel: 12,
  scopeInfo: "Code block (8 lines, indent level 12)"
}
```

## 🔍 Расширенные сценарии тестирования

### 1. **Тестирование ошибок**

#### Сценарий: Файл не найден
- 📝 Создайте ключ в Tree View
- 🗑️ Удалите соответствующий файл
- 🖱️ Кликните по ключу

**Ожидаемое поведение:**
- ❌ Сообщение об ошибке
- 🔄 Fallback к базовой навигации

#### Сценарий: Некорректный ключ
- ✏️ Измените имя ключа в файле
- 🔄 Обновите Tree View
- 🖱️ Попробуйте навигацию

**Ожидаемое поведение:**
- ⚠️ Предупреждение о несоответствии
- 📍 Переход к объявлению ключа

### 2. **Тестирование производительности**

#### Большой проект (100+ ключей):
- 📊 Время навигации должно быть < 500ms
- 💾 Использование памяти стабильное
- 🔄 Кэширование работает корректно

#### Команды для теста производительности:
```bash
# 1. Загрузить много ключей
Flutter Testing Keys: Refresh

# 2. Тестировать навигацию
Flutter Testing Keys: Demonstrate Smart Navigation

# 3. Проверить статистику
Flutter Testing Keys: Show Navigation Statistics
```

### 3. **Интеграционное тестирование**

#### С другими расширениями:
- 🔍 Dart Code Intelligence
- 🎨 Flutter Widgets Inspector  
- 🧪 Flutter Test Runner

#### Тест совместимости:
1. 📂 Откройте проект с активными расширениями
2. 🔄 Выполните навигацию
3. ✅ Убедитесь что декорации не конфликтуют

## 🐛 Известные ограничения

### 1. **Парсинг сложных конструкций**
```dart
// Может не распознать в сложных случаях:
final key = someCondition 
  ? Key(KeyConstants.keyA) 
  : Key(KeyConstants.keyB);
```

### 2. **Динамические ключи**
```dart
// Не поддерживается:
Key(KeyConstants.getValue(dynamic_param))
```

### 3. **Комментированный код**
```dart
// Key(KeyConstants.commentedKey) - может быть найден ошибочно
```

## 🎯 Ожидаемые результаты тестирования

### ✅ Успешное тестирование должно показать:
- 🎯 **Точная навигация** к строке с ключом
- 🎨 **Визуальная подсветка** ключа, Widget-а и области
- 💡 **Информативные сообщения** с контекстом
- ⚡ **Быстрая работа** без задержек
- 🧹 **Автоматическая очистка** декораций
- 📊 **Корректная статистика** использования

### ⚠️ При проблемах проверьте:
- 📂 Правильная структура Flutter проекта
- 📝 Наличие файла `key_constants.dart`
- 🔍 Корректные имена ключей
- 🔄 Обновленность Tree View

## 🚀 Дальнейшие тесты

После базового тестирования можно экспериментировать с:
- 🎨 Кастомными темами VSCode
- 📱 Различными размерами окна
- 🔄 Быстрым переключением между файлами
- 🖱️ Различными способами навигации (клавиатура vs мышь)

---
*Полное тестирование архитектуры навигации обеспечивает стабильную работу всех компонентов системы*