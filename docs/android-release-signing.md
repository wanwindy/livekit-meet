# Android Release Signing

The Android `release` build no longer falls back to the sample debug keystore.
You must provide a real release keystore before building `assembleRelease`.

## Local Build

Use JDK 17 for Android builds. The React Native Gradle plugin requests a Java 17 toolchain.

1. Generate or obtain your production keystore.
2. Copy `android/signing.properties.example` to `android/signing.properties`.
3. Fill in these values:

```properties
storeFile=app/release.keystore
storePassword=your-store-password
keyAlias=your-key-alias
keyPassword=your-key-password
```

4. Place the keystore file at the path referenced by `storeFile`.
5. Build the signed APK:

```powershell
cd android
.\gradlew.bat assembleRelease
```

The signed APK will be written to `android/app/build/outputs/apk/release/app-release.apk`.

## Environment Variable Alternative

Instead of `android/signing.properties`, you can provide signing values through environment variables:

- `ANDROID_KEYSTORE_PATH`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

## GitHub Actions Secrets

The Android workflow expects these repository secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

`ANDROID_KEYSTORE_BASE64` must contain the Base64-encoded keystore file. The workflow decodes it to `android/app/release.keystore` before building.

## Generate A Keystore

Example command:

```powershell
& "C:\Program Files\Java\jdk-21.0.10\bin\keytool.exe" `
  -genkeypair `
  -v `
  -storetype PKCS12 `
  -keystore android\app\release.keystore `
  -alias fangxinban-release `
  -keyalg RSA `
  -keysize 2048 `
  -validity 3650
```

Keep the keystore file and both passwords in secure storage. Without the original release key, future app upgrades cannot replace the installed app.
