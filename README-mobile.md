# Daily Planner — Phone Install Guide

## Abhi turant: phone home screen pe install (PWA)

Ye APK nahi hai, lekin phone pe app icon banega aur fullscreen app jaisa khulega.

1. Lovable me **Publish** dabao.
2. Live `.lovable.app` link apne Android phone ke **Chrome** me kholo.
3. App ke header me **Install app** button dikhe to tap karo.
4. Agar button prompt na khole: Chrome menu (⋮) → **Install app** / **Add to Home Screen**.
5. Home screen pe **Daily Planner** icon aa jayega.

---

## Baad me: real APK (Play Store app jaisa install)

Aapko laptop pe Android Studio ya Java install karne ki zaroorat **nahi** hai.
Sab kuch GitHub cloud me automatic build hoga. Bas GitHub connect hona zaroori hai.

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
2. Page ke sabse niche **Artifacts** section me **Daily-Planner-debug-apk** dikhega
3. Us pe click karke ZIP download karo → extract karo → `Daily-Planner-debug.apk` milega
4. APK ko phone me bhejo (WhatsApp / Google Drive / USB)
5. Phone me file kholo → "Install unknown apps" allow karo → **Install** ✅

Ho gaya! App ab normal Android APK ki tarah installed hoga.

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
- **GitHub Connect nahi khul raha**: `.lovable/github-connect-checklist.md` follow karo.
- **Support ko message bhejna hai**: `.lovable/support-message.md` copy-paste karo.
- **GitHub ke bina backup chahiye**: `.lovable/apk-plan-b.md` dekho.
- **Actions run fail**: Logs kholo, error mujhe bhejo — fix kar dunga.
- **Purana app update nahi ho raha**: `capacitor.config.ts` me `appId` same rakho (`com.avinash.dailyplanner`) — badalne pe naya app ban jata hai.
