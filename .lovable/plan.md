Problem confirmed: the APK is currently configured to load `https://sanjuplanner.lovable.app` inside the app WebView. Capacitor’s own docs say `server.url` is for live-reload/external loading and is not intended for production. That means when internet is off, the APK tries to open the website and fails instead of opening the bundled app files.

Plan:
1. **Make APK truly offline-first**
   - Remove the external `server.url` from `capacitor.config.ts`.
   - Keep the app bundled from the local built web files so the APK opens without internet.

2. **Stop building a fake online fallback**
   - Update the GitHub Actions APK workflow so it does not create an `index.html` that redirects to the live website.
   - If the real local app build is missing, the workflow should fail clearly instead of producing an APK that cannot work offline.

3. **Preserve online features when internet returns**
   - Keep login, cloud sync, and AI reports online-only.
   - Keep tasks, journal, water tracker, reminders, and saved local data usable offline.
   - Existing sync manager will upload/download data again when internet comes back.

4. **Clarify first-open behavior**
   - First login still needs internet.
   - After logging in once, the app can open offline and use locally saved planner data.

5. **Rebuild APK**
   - After these changes, run GitHub Actions again and download the new APK.
   - The old APK must be replaced/reinstalled because native app config is inside the APK.