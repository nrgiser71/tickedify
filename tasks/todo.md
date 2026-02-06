# Flutter App - Tickedify Acties Scherm (Read-Only)

## Taken

- [x] 1. CORS middleware toevoegen aan server.js
- [x] 2. Flutter project aanmaken (`flutter create`)
- [x] 3. pubspec.yaml dependencies toevoegen
- [x] 4. Config bestanden (app_config.dart, theme.dart)
- [x] 5. Data modellen (task.dart, project.dart, context_model.dart)
- [x] 6. API service layer (api_service.dart, auth_service.dart, data_service.dart)
- [x] 7. State management providers (auth, task, filter)
- [x] 8. Login scherm
- [x] 9. Actions scherm + widgets (filter_bar, task_list_item)
- [x] 10. main.dart entry point met routing
- [x] 11. Test flutter build (web) - BUILD SUCCESVOL

## Review

### Samenvatting wijzigingen

**1. Backend (server.js)**
- CORS middleware toegevoegd na security headers (regel 32-48)
- Alleen specifieke localhost origins toegestaan voor Flutter dev
- OPTIONS preflight afhandeling

**2. Flutter project structuur (`flutter_app/`)**

```
lib/
  main.dart                      - Entry point, ProviderScope, auth routing
  config/
    app_config.dart              - Base URL (staging/productie switch)
    theme.dart                   - macOS design tokens uit style.css
  models/
    task.dart                    - Task model met fromJson + datumStatus helper
    project.dart                 - Project model (id, naam)
    context_model.dart           - Context model (id, naam)
  services/
    api_service.dart             - Singleton Dio + 401 interceptor
    api_service_native.dart      - PersistCookieJar voor iOS/Android
    api_service_web.dart         - withCredentials voor Flutter Web
    auth_service.dart            - Login/logout/session check
    data_service.dart            - GET acties, projecten, contexten
  providers/
    auth_provider.dart           - Login state (Riverpod StateNotifier)
    task_provider.dart           - Tasks + filtered/sorted provider
    filter_provider.dart         - 6 filters als StateNotifier
  screens/
    login_screen.dart            - Email + wachtwoord login
    actions_screen.dart          - Hoofdscherm met filters + takenlijst
  widgets/
    filter_bar.dart              - 6 filter controls (zoek, project, context, datum, prioriteit, toekomstig)
    task_list_item.dart          - Visueel identiek aan web (border kleuren, prioriteit dots, info chips)
```

**3. Key design decisions:**
- Conditionele imports (`api_service_native.dart` / `api_service_web.dart`) voor platform-specifieke cookie handling
- Filter logica 1-op-1 geport van app.js:8868-8927
- Sort logica 1-op-1 geport van app.js:5302-5318
- Prioriteit kleuren exact overgenomen: hoog=#FF4444, gemiddeld=#FF9500, laag=#8E8E93
- Overdue/today/future border kleuren exact als CSS (rood/blauw/grijs)

**4. Build resultaat:**
- `flutter analyze` - 0 issues
- `flutter build web` - SUCCESS
