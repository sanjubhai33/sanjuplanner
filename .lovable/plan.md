Plan to fix the APK build carefully:

1. **Stop guessing around the hidden log**
   - I confirmed the failure is now at **Build debug APK (step 18)**, not Java/Node/SDK setup.
   - GitHub blocks the detailed log without repository login, so the safest fix is to make the Android build path simpler and more stable.

2. **Pin mobile build versions to a stable set**
   - Pin Capacitor Android/Core/CLI and local-notifications to exact compatible versions instead of loose `^` versions.
   - Avoid the newest generated Android/Gradle combination if it is causing the repeated CI failure.

3. **Simplify the GitHub Actions workflow**
   - Keep Node 22, Java 21, Android SDK 36.
   - Remove risky Gradle/Kotlin/ProGuard patching blocks that can create new failures.
   - Use a clean order: install → build web → sync Capacitor → build APK → upload log/APK.

4. **Fix Android project config directly**
   - Add `buildToolsVersion = '36.0.0'` in `android/variables.gradle`.
   - Update `android/app/build.gradle` ProGuard file to the modern `proguard-android-optimize.txt`.
   - Keep package/app ID as `com.avinash.dailyplanner` and APK name as `Daily-Planner-debug.apk`.

5. **Improve failure output**
   - Keep `gradle-build.log` artifact upload on failure.
   - Add a clearer error extraction step so if anything remains, the next screenshot/log shows the exact real cause.

After this, you will run **Actions → Build Android APK → Run workflow** again; if it still fails, download/send the `android-gradle-build-log` artifact and I can fix the exact remaining line.