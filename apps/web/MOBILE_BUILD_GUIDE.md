# 📱 SyndeoCare Mobile — Build & Publish Guide

This project uses **Capacitor**: the same React/Vite web codebase runs natively on iOS and Android. Edit the web app once → both platforms update.

---

## 🔧 One-time setup (your computer)

You need:

- **Node 20+** and **npm** or **bun**
- **For Android**: [Android Studio](https://developer.android.com/studio) (Hedgehog or newer) + JDK 17
- **For iOS**: A Mac with **Xcode 15+** and an Apple Developer account ($99/yr)

### Steps

```bash
# 1. Pull the latest from GitHub (Export from Lovable → GitHub first)
git clone <your-repo-url>
cd <project>

# 2. Install dependencies
bun install        # or: npm install

# 3. Add native platforms (only the first time)
npx cap add android
npx cap add ios

# 4. Build the web app
bun run build      # or: npm run build

# 5. Sync the web build into native projects
npx cap sync
```

> Run `bun run build && npx cap sync` after **every** pull from GitHub.

---

## ▶️ Run on a device or emulator

### Android

```bash
npx cap run android          # auto-pick device/emulator
# or open in Android Studio:
npx cap open android
```

### iOS (Mac only)

```bash
npx cap run ios
# or open in Xcode:
npx cap open ios
```

---

## 🔔 Push Notifications setup

Native push is already wired in (`src/hooks/useNativePush.ts`) and saves tokens to the `push_tokens` table. You just need to provision the credentials:

### Android (Firebase Cloud Messaging)

1. Create a Firebase project → Add Android app with package id `app.lovable.d9cdd12a438c46568d56af72b6f76e2c`.
2. Download `google-services.json` → drop it in `android/app/`.
3. Re-run `npx cap sync android`.

### iOS (Apple Push Notification service)

1. In Apple Developer Console → Identifiers → enable **Push Notifications** for your app id.
2. Create an APNs Auth Key (.p8) and note the Key ID + Team ID.
3. In Xcode: Signing & Capabilities → **+ Capability** → Push Notifications + Background Modes (Remote notifications).
4. Add your APNs key to Firebase (FCM is used as the gateway) **or** send directly via APNs from the backend.

---

## 📦 Build a release APK / AAB (Google Play)

```bash
bun run build && npx cap sync android
npx cap open android
```

In Android Studio:

1. **Build → Generate Signed Bundle / APK → Android App Bundle**.
2. Create a keystore (keep it safe — required for every future update).
3. Choose **release** variant → Finish.
4. The `.aab` lands in `android/app/release/`.

Upload the `.aab` at [Google Play Console](https://play.google.com/console/) → Create app → Production → New release.

### Avoiding the "app may be harmful" warning

That warning usually appears when you install a **debug** or **sideloaded** APK that is not distributed through Google Play. It is not caused by a screen inside the app itself.

For a production install experience:

1. Build a **release** APK/AAB, not `assembleDebug`.
2. Sign it with your own keystore.
3. Prefer Play Console, Internal App Sharing, or Internal Testing for distribution.

This repo now supports release signing through either `android/keystore.properties` or these environment variables:

```bash
export ANDROID_KEYSTORE_PATH="/absolute/path/to/your-upload-keystore.jks"
export ANDROID_KEYSTORE_PASSWORD="your-store-password"
export ANDROID_KEY_ALIAS="your-key-alias"
export ANDROID_KEY_PASSWORD="your-key-password"
```

Then build the release artifact:

```bash
cd android
./gradlew assembleRelease
```

---

## 🍎 Build for App Store

```bash
bun run build && npx cap sync ios
npx cap open ios
```

In Xcode:

1. Select **Any iOS Device** as target.
2. **Product → Archive**.
3. Window → Organizer → Distribute App → **App Store Connect**.

Then in [App Store Connect](https://appstoreconnect.apple.com/), create a new app and submit your build for review.

---

## 🌐 Remote updates from the live AWS app

Android builds now default to loading the live AWS-hosted app at `http://54.221.113.197`, so when you deploy web changes there, the mobile app will pick them up without rebuilding the APK.

If you need to point the app at a different hosted environment, override the URL before syncing:

```bash
export CAPACITOR_REMOTE_APP_URL="http://54.221.113.197"
npx cap sync android
```

The legacy `CAPACITOR_LIVE_RELOAD_URL` variable still works, but `CAPACITOR_REMOTE_APP_URL` is the preferred name now.

To switch back to a fully bundled offline APK that ignores the hosted site, disable remote updates before syncing:

```bash
export CAPACITOR_DISABLE_REMOTE_UPDATES="true"
bun run build && npx cap sync android
```

---

## ✅ Checklist before submitting

- [ ] App icon (`1024×1024 PNG`) added via Android Studio's Image Asset wizard + Xcode AppIcon set
- [ ] Splash screen images generated (`npx capacitor-assets generate` after `bun add -D @capacitor/assets`)
- [ ] Privacy Policy URL + Terms URL (already live at `/privacy` and `/terms`)
- [ ] Push credentials configured (FCM for Android, APNs for iOS)
- [ ] Confirm the live AWS URL is the one you want the app to load, or set `CAPACITOR_DISABLE_REMOTE_UPDATES=true` for a bundled offline build
- [ ] Version bumped in `android/app/build.gradle` (`versionCode` + `versionName`) and in Xcode (Version + Build)
- [ ] Tested sign-up, sign-in, push notification, geolocation, file upload on a real device
- [ ] Release APK/AAB is signed with your own keystore before sharing outside development

---

## 🆘 Troubleshooting

| Issue                  | Fix                                                                           |
| ---------------------- | ----------------------------------------------------------------------------- |
| White screen on launch | Did you run `bun run build && npx cap sync`?                                  |
| Push token not saving  | Check `push_tokens` table RLS + that user is signed in                        |
| Deep links not working | Verify `intent-filter` in `AndroidManifest.xml` + Associated Domains in Xcode |
| Build fails on Android | Set `JAVA_HOME` to JDK 17, not 11 or 21                                       |

---

Made with ❤️ for SyndeoCare.
