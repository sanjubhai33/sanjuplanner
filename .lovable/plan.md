## Plan

I will make the GitHub APK build reliable so you only need to press **Run workflow** and install the downloaded APK.

### What I found
- The Android folder is not committed in the project, so GitHub Actions creates it during the build.
- The workflow currently uses **Java 17**, but current Capacitor Android versions require **Java 21**, which commonly causes APK build failures.
- The workflow creates a minimal `dist/` fallback, but it does not run the real app build before syncing Capacitor.

### Fix
1. Update `.github/workflows/android-apk.yml` to use **Java 21**.
2. Use a clean npm install command suitable for GitHub Actions.
3. Build the actual web app with `npm run build` before Capacitor sync.
4. Keep the fallback `dist/index.html` only as a safety step, not as the main app bundle.
5. Add Android SDK/Gradle cache-friendly setup so the build is more stable.
6. Keep the final artifact name simple: `Daily-Planner-debug-apk` containing `Daily-Planner-debug.apk`.

### Result for you
After this, you should only need to open GitHub → **Actions** → **Build Android APK** → **Run workflow**, then download and install the APK.