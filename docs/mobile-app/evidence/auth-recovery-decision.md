# Auth recovery decision (P03.07)

Date: 2026-11-13  
Branch: `feature/flutter-mobile-app`

## Decision

Mobile password recovery is **web-only** until P01.05 confirms whether `routes/auth.php` is loaded at runtime.

## Bootstrap contract

```json
{
  "auth_recovery": {
    "mobile_supported": false,
    "channel": "web_only",
    "message": "Password recovery remains web-only until auth route runtime reconcile is signed off."
  }
}
```

## UX

Settings screen explains recovery is web-only. No mock recovery form is shown in Flutter.
