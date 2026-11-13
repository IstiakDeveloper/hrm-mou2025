# Mousumi Flutter (Android + iOS)

Monorepo client for Mousumi ERP. Follows `docs/mobile-app/04-ARCHITECTURE-API.md`.

## Layout

```text
mobile/
  apps/mousumi_hrm/     # Android + iOS application
  packages/
    design_system/      # brand tokens + shared widgets
    api_client/         # Dio + /api/v1 DTOs
    auth_session/       # secure token + session controller
    app_core/           # flavors, service locator
```

## Prerequisites

- Flutter stable (repo verified with 3.24.x / Dart 3.5)
- Xcode for iOS builds (macOS)
- Android Studio / SDK for Android
- Laravel API running with `/api/v1` routes

## Configure API base URL

Default Android emulator → host machine:

```bash
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/api/v1
```

iOS simulator → host machine:

```bash
flutter run --dart-define=API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Physical device: use your LAN IP or staging HTTPS URL.

```bash
flutter run --dart-define=API_BASE_URL=https://staging.example.org/api/v1 --dart-define=FLAVOR=staging
```

## Run

```bash
cd mobile/apps/mousumi_hrm
flutter pub get
flutter analyze
flutter test
flutter run
```

## Backend pairing

1. `composer install`
2. migrate (includes `personal_access_tokens`)
3. `php artisan serve`
4. Login via `POST /api/v1/auth/staff/login` or the Flutter login screen

## Current foundation status

- Staff + branch PIN login screens
- Secure token storage
- Bootstrap-driven home / modules / me shell
- Movement-fine lock gate (423)
- Design tokens from UI blueprint

Next checklist items: P04 remaining polish, P06 attendance, P07 leave.
