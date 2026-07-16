# Daily Planner — Android APK Install Guide

Aapko laptop pe Android Studio ya Java install karne ki zaroorat **nahi** hai.
Sab kuch GitHub cloud me automatic build hoga. Bas 3 step:

## Step 1 — GitHub pe push karo

1. Lovable editor me upar right / plus (+) menu → **GitHub → Connect project**
2. Apna GitHub account authorize karo → **Create Repository** dabao
3. Project apne aap GitHub pe chala jayega ✅

## Step 2 — APK build karao (cloud me)

1. GitHub pe apni repo kholo
2. Upar **Actions** tab pe click karo
3. Left side "**Build Android APK**" workflow chuno
4. Right side **Run workflow** button → green **Run workflow** dabao
5. ~5–8 minute wait karo (progress dikhta rahega)

## Step 3 — APK download & install

1. Build complete hone pe us run ko kholo
2. Page ke sabse niche **Artifacts** section me **app-debug-apk** dikhega
3. Us pe click karke ZIP download karo → extract karo → `app-debug.apk` milega
4. APK ko phone me bhejo (WhatsApp / Google Drive / USB)
5. Phone me file kholo → "Install unknown apps" allow karo → **Install** ✅

Ho gaya! App ab Play Store app jaise home screen pe hoga. Notifications, reminders (7am/11pm water, 30/15/5 min task alerts, 11pm journal, 11:59pm AI rating) sab native chalenge — app band ho ya phone reboot ho, tab bhi.

---

## Baad me update kaise karein

Jab aap Lovable me kuch badloge, wo GitHub pe automatic sync hoga → GitHub Actions automatic naya APK bana dega. Sirf Actions se latest APK download karke phone me install kar lena (purana replace ho jayega, data safe rahega).

---

## Advanced: Play Store ke liye signed release APK/AAB

Jab aap Google Play Store pe app daalna chahoge:

1. Ek keystore file banao (ek baar):
   ```bash
   keytool -genkey -v -keystore release.keystore -alias dailyplanner -keyalg RSA -keysize 2048 -validity 10000
   ```
2. GitHub repo → **Settings → Secrets and variables → Actions** me daalo:
   - `ANDROID_KEYSTORE_BASE64` = `base64 release.keystore` ka output
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS` = `dailyplanner`
   - `ANDROID_KEY_PASSWORD`
3. Mujhe (Lovable AI) bolo "signed release APK workflow add karo" — main workflow me release job add kar dunga jo signed AAB banayega Play Store ke liye.
4. Play Console pe $25 one-time fee de ke developer account banao → AAB upload karo.

---

## Troubleshooting

- **"Install blocked"**: Phone settings me apne browser/file manager ke liye "Install unknown apps" allow karo.
- **Actions run fail**: Logs kholo, error mujhe (Lovable) bhejo — fix kar dunga.
- **Purana app update nahi ho raha**: `capacitor.config.ts` me `appId` same rakho (`com.avinash.dailyplanner`) — badalne pe naya app ban jata hai.
