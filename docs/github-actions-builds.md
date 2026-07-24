# GitHub Actions Cloud Builds

## Overview

This project now includes GitHub Actions workflows for both Android and iOS.

- Android workflow file: `.github/workflows/android-build.yml`
- iOS workflow file: `.github/workflows/ios-build.yml`

## What Each Workflow Produces

### Android

- Runner: `ubuntu-latest`
- Output artifact: `android-release-apk`
- Output file: `android/app/build/outputs/apk/release/app-release.apk`

Current note:

- The Android workflow now expects a real release keystore through repository secrets.
- Required secrets: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.
- Without those secrets, the workflow stops with a clear signing error instead of silently producing a debug-signed release APK.
- Local signing instructions are documented in `docs/android-release-signing.md`.

### iOS

- Runner: `macos-14`
- Output artifact: `ios-simulator-app`
- Output file: `ios/build/Build/Products/Debug-iphonesimulator/LiveKitReactNativeMeet.app`

Current note:

- The iOS workflow builds a simulator app with `CODE_SIGNING_ALLOWED=NO`.
- This verifies that the app can compile in GitHub Actions.
- It does not generate a signed IPA for App Store or TestFlight.

## To Produce a Real iOS IPA Later

You will need:

1. An Apple Developer account.
2. A distribution certificate.
3. A provisioning profile.
4. GitHub repository secrets for the signing assets.
5. A follow-up workflow that archives and exports the app for `iphoneos`.

## Current Recommendation

- Use the Android workflow only after configuring release-signing secrets.
- Use the iOS workflow now as compile verification.
- When you are ready for TestFlight or Ad Hoc distribution, add iOS signing and IPA export in a second step.
