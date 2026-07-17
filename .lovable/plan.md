## Goal
Make the installed Android APK behave like the web app: full features when online, and continue to work offline (tasks, journal, water — all localforage-backed) using cached assets.

## Current state (verified)
- App is TanStack Start with SSR + server functions (`requireSupabaseAuth`, AI report). It does **not** produce a pure static `dist/` bundle — the build outputs to `.output/`, not `dist/`.
- `capacitor.config.ts` still says `webDir: "dist"`. If the GitHub Actions workflow runs `cap sync` against `dist/`, the APK ships an empty/placeholder shell → app opens to a blank/"web not found" screen.
- Server functions (AI daily report, auth-gated data) require a live server. A fully-embedded static APK can't run them.
- Local data (tasks / journal / water / notes) already works offline via localforage and syncs on reconnect — that part is fine, it just needs the WebView to actually load the app.

## Approach: hybrid APK pointing at the published site
The simplest reliable way to get both online + offline in one APK:

1. **Point Capacitor at the published URL** so the WebView always loads the real app (server functions work, auth works, AI report works):
   ```ts
   // capacitor.config.ts
   server: {
     url: "https://sanjuplanner.lovable.app",
     androidScheme: "https",
     cleartext: false,
   }
   ```
2. **Ship a minimal bundled fallback** in `dist/` (an `index.html` that redirects / shows "Reconnecting…") so `cap sync` has something to package and the first cold offline launch shows a friendly screen instead of a Chromium error page.
3. **Offline behavior** relies on:
   - localforage (already in place) → tasks, journal, water, notes all readable/editable offline.
   - The Android WebView's HTTP cache → after first online launch, static JS/CSS/HTML are cached, so re-opens work offline.
   - On reconnect, `SyncManager` pushes local changes to the cloud (already implemented).
4. **Update `.github/workflows/android-apk.yml`**:
   - Replace `bun run build` (produces `.output/`, not `dist/`) with a step that writes the fallback `dist/index.html` before `cap sync`.
   - Keep the rest of the pipeline (icons, gradle assembleDebug, artifact upload as `Daily-Planner-debug.apk`).
5. **README-mobile.md**: update the "how to build APK" section to describe the new online-first + offline-cache model in plain Hindi/English so you know what to expect (e.g. "first launch needs internet; after that it opens even without internet").

## Trade-offs (so you know)
- AI daily report + login + cross-device sync **require internet** — no way around that, they call the server. Everything else (writing tasks, journal, water tracker, reminders/notifications) works fully offline.
- First install must be done with internet at least once so the WebView caches the app.
- Later, when you want a "true native" fully-offline-capable APK (Play Store style, no dependency on the published URL), we'd have to migrate the server functions to `/api/public/*` routes on the same domain and add a proper service worker — that's a bigger change and can be a next step.

## Files to change (build mode)
- `capacitor.config.ts` — add `server.url`.
- `.github/workflows/android-apk.yml` — emit `dist/index.html` fallback before `cap sync`.
- `README-mobile.md` — refresh install/offline notes.

## After you approve
Run the GitHub Action "Build Android APK" → download `Daily-Planner-debug.apk` artifact → install on your phone. First open with internet; after that it opens offline too.
