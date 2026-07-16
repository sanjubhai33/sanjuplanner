# Daily Planner — Installable Native App

A daily planner web app wrapped with **Capacitor** so you can install it as a real Android APK (Play Store ready) and iOS app (App Store ready). All data stays on‑device — fully offline, no login, no backend.

## What you'll get

- **Home / Today view** — timeline of today's tasks by hour, quick add button
- **Task detail** — title, description/notes, date, start time, duration, priority, completion checkbox
- **Lists view** — all tasks grouped by day (Today, Tomorrow, Upcoming, Completed)
- **Calendar picker** — jump to any date and see that day's timeline
- **Edit / delete / mark complete** with swipe or tap actions
- **Fully offline** — tasks saved in device storage (IndexedDB via localforage); works with no internet, forever
- **Installable** — Add to Home Screen as PWA immediately, and export to GitHub to build a real `.apk` / `.aab` / `.ipa` with Capacitor

## How installation works

 mobile builds cannot be produced inside Lovable's sandbox — Android Studio / Xcode are required. The flow is:

1. I build the full app + Capacitor config here in Lovable.
2. You click **GitHub → Export** to push the project to your GitHub.
3. You clone it locally and run the documented commands (`npm i`, `npx cap add android`, `npx cap sync`, `npx cap open android`) to build the APK in Android Studio, or `npx cap add ios` for Xcode.
4. Install the APK on your phone directly, or publish to Play Store / App Store.

I'll include a clear `README-mobile.md` with every command so it's copy‑paste.

Meanwhile the same app works as an **installable PWA** right from the published Lovable URL — on Android you can "Add to Home Screen" and it launches fullscreen like a real app, no build step needed. Good for testing before you package the native build.

## Design direction

Before I build, I'll generate 3 visual directions (calm minimal / bold modern / warm paper‑like) and let you pick — planner apps live and die on how the timeline feels.

## Technical details

- **Frontend**: TanStack Start (existing template), React, Tailwind
- **Storage**: `localforage` (IndexedDB) — survives app restarts, no server
- **State**: TanStack Query with a local async storage adapter
- **PWA**: web app manifest + icons so it's installable to home screen immediately
- **Native shell**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, `@capacitor/ios`, plus `capacitor.config.ts`
- **No Lovable Cloud** — everything is local‑only per your offline requirement
- **Docs file** `README-mobile.md` with the exact GitHub → Android Studio → APK steps

## Out of scope (say the word to add)

- Cloud sync across devices (would need Lovable Cloud + login using google account)
- Push notifications / reminders (needs Capacitor plugin + native permissions)
- Recurring tasks / subtasks / tags
- Play Store / App Store submission — I build the project, you submit

## Next step

Approve and I'll ask you to pick a design direction, then build it end to end.