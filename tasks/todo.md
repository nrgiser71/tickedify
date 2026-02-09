# Flutter App Klaarmaken voor Delen met Bedrijf

## Todo

- [x] Stap 1: Fix `dynamic` types → `int?` in Task model + TaskProvider
- [x] Stap 2: Voeg `DateStatus` enum toe + update TaskListItem
- [x] Stap 3: Fix untyped `List` parameter in ActionsScreen
- [x] Stap 4: Voeg null guards toe in DataService
- [x] Stap 5: Verwijder onnodige debug logging in AuthService
- [x] Stap 6: Flutter analyze → 0 issues (twee keer gecontroleerd)
- [x] Stap 7: Security placeholders (credentials + URLs)

## Review

### Samenvatting wijzigingen

**1. `lib/models/task.dart`** - Type safety + enum
- `dynamic projectId/contextId` → `int?` met proper `int.tryParse` in `fromJson`
- Nieuw `DateStatus` enum (`overdue`, `today`, `future`, `noDate`)
- `String get datumStatus` → `DateStatus get datumStatus`

**2. `lib/providers/task_provider.dart`** - Getypte parameters
- `getProjectName(dynamic)` → `getProjectName(int?)`
- `getContextName(dynamic)` → `getContextName(int?)`

**3. `lib/screens/actions_screen.dart`** - Getypte lijst
- `List filteredTasks` → `List<Task> filteredTasks`
- `Task` import toegevoegd

**4. `lib/services/data_service.dart`** - Null safety
- `data['acties'] as List` → `data['acties'] as List? ?? []` (alle 3 lijsten)

**5. `lib/services/auth_service.dart`** - Debug logging opgeschoond
- Verwijderd: `dev.log('AUTH: Response data: ${e.response?.data}')` (logt volledige response)

**6. `lib/providers/auth_provider.dart`** - Security
- Credentials → `demo@example.com` / `demo-password`

**7. `lib/config/app_config.dart`** - Security
- URLs → `https://api.example.com` / `https://dev.example.com`

### Verificatie
- `flutter analyze` → 0 issues (gecontroleerd na stap 5 en na stap 7)
