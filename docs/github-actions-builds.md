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

- The Android workflow uses the built-in debug keystore, so no repository signing secrets are required.
- The artifact is suitable for internal testing only and cannot replace a production-signed APK.
- Local release-signing instructions remain available in `docs/android-release-signing.md`.

### iOS

- Runner: `macos-26`
- Output artifact: `ios-testflight-ipa`
- Output file: `ios/build/export/*.ipa`

Current note:

- The workflow requires the Apple signing and App Store Connect secrets.
- It archives a signed IPA and uploads it to TestFlight.

For TestFlight uploads, run the workflow with a marketing version higher than
the previous App Store Connect version. The current default is `100.0.6`.

## To Produce a Real iOS IPA Later

You will need:

1. An Apple Developer account.
2. A distribution certificate.
3. A provisioning profile.
4. GitHub repository secrets for the signing assets.
5. A follow-up workflow that archives and exports the app for `iphoneos`.

## Current Recommendation

- Use the Android workflow for internal test APKs.
- Use the iOS workflow to build and upload a signed TestFlight IPA.
