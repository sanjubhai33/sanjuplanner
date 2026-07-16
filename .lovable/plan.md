## Plan: Phone se app install abhi + APK path ko ready rakhna

### Reality check
Main GitHub authorization/support ticket aapke account se khud nahi kar sakta. GitHub Connect button ka OAuth approval aapke phone/browser me hi complete hoga. Lekin main app side aur APK build setup ko itna ready kar sakta hu ki GitHub connect hote hi APK ban jaye.

### Part A — Abhi phone pe install jaisa experience
1. **PWA install button verify/fix**
   - Header me `Install app` button already add hua hai; main usko mobile pe safer banaunga.
   - Android Chrome me prompt aaye to direct install dialog khulega.
   - Agar prompt available nahi hua, app Chrome menu se install ho sakega because manifest/head tags already present hain.

2. **Manifest polish**
   - Manifest me Android installability fields verify karunga: `name`, `short_name`, `display: standalone`, `start_url`, `scope`, `theme_color`, icons.
   - Service worker/offline cache nahi add karunga, kyunki aapne abhi sirf install chahiye bola hai.

3. **Publish ke baad phone steps**
   - Aap Publish dabao.
   - Phone Chrome me live link kholo.
   - `Install app` button ya Chrome menu → `Install app / Add to Home Screen`.

### Part B — Baad me Play Store jaisa real APK
1. **GitHub Actions APK workflow harden karna**
   - Existing `.github/workflows/android-apk.yml` ko reliable banaunga.
   - APK artifact ka naam clear rakhunga: `Daily-Planner-debug.apk`.
   - Manual `Run workflow` aur automatic push build dono supported rahenge.

2. **Phone-friendly APK guide improve karna**
   - `README-mobile.md` me steps simple Hindi/Hinglish me update karunga.
   - GitHub Connect, Actions, APK download, ZIP extract, unknown apps allow — sab phone ke hisaab se.

3. **GitHub connection issue helper docs**
   - Support ko bhejne ke liye copy-paste message ready karunga.
   - Android Chrome troubleshooting checklist add karunga: popups, cookies, desktop site, clear site data, alternate browser.

### Result
Abhi aap PWA ko app icon ki tarah use kar paoge. Jab aap wapas aake GitHub connect kar doge, main real APK route complete/verify kara dunga — Play Store app jaise install hone wala APK.