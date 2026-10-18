# Xiaomi 14T APK — Motion Lab

Native Android UI/UX demonstration built with Kotlin and Jetpack Compose. No webview, no internet permissions.

## What to try
- Home: animated dashboard with progress bars and quick actions.
- Buttons: spring interactions, selectable chips, expand/collapse and feedback.
- Motion: elastic orb and draggable card that returns with spring physics.
- Studio: dark/light theme, accent palette, motion strength and haptic toggle.
- Native floating 4-tab dock at the bottom.

## Build and download
1. Open **Actions** → **Build Android APK**.
2. Choose the newest successful run.
3. Under **Artifacts**, download **Xiaomi-14T-Motion-Lab-debug** (ZIP).
4. Extract `app-debug.apk`, install it on Android, and allow installation from that source if Android prompts.

The GitHub artifact is a ZIP (not a direct .apk URL). To get a persistent direct .apk download, publish a Release with the built APK attached. The debug APK is development-signed, not a production release.

Uses Java 17, Android Gradle Plugin 8.9.2, Kotlin 2.1.20, Compose BOM 2025.04.01.
