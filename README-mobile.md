# Build the Daily Planner as a native Android / iOS app

The app runs as an installable PWA out of the box (published Lovable URL →
"Add to Home Screen"). To build a real APK / IPA:

## 1. Get the code

Use **GitHub → Export** in Lovable, then on your machine:

```bash
git clone <your-repo>
cd <your-repo>
npm install
```

## 2. Build the web assets

```bash
npm run build
```

This produces `dist/`, which Capacitor packages into the native app.

## 3. Add the native platforms (one‑time)

```bash
npx cap add android
npx cap add ios      # macOS + Xcode only
```

## 4. Sync web assets → native project

Run this after every `npm run build`:

```bash
npx cap sync
```

## 5. Open in the native IDE

```bash
npx cap open android   # opens Android Studio
npx cap open ios       # opens Xcode
```

### Android → APK

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
Install the resulting `app-debug.apk` on your phone (enable "Install unknown apps"
in Settings first) or upload the signed AAB to the Play Store.

### iOS → IPA

In Xcode: pick a Team in Signing & Capabilities, then **Product → Archive**.
Requires an Apple Developer account for device install / App Store submission.

## App identity

- `appId`: `app.lovable.dailyplanner` — change in `capacitor.config.ts` before publishing.
- `appName`: `Daily Planner`.
- Icons / splash: replace `public/icon-512.png`, then re‑run `npx cap sync`.

## Offline

All tasks are saved in IndexedDB on the device. No network is required after
first launch. Nothing is uploaded anywhere.
