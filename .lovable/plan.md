# Automatic APK build via GitHub Actions (koi laptop setup nahi)

Aapko sirf ek GitHub account chahiye. Baaki sab **cloud me automatic** hoga — Android Studio, Java, Gradle kuch install nahi karna. APK ready hone pe download link mil jayega, phone me install karke Play Store app jaise use kar sakte ho.

## Kaise chalega (aap ka side)

1. Lovable me top-right **GitHub → Connect** → project ko apne GitHub pe push karo (2 click).
2. GitHub repo khol ke **Actions** tab pe jao → "Build Android APK" workflow → **Run workflow** button dabao.
3. 5–8 minute wait karo (cloud build ho raha hoga).
4. Wahi page pe niche **Artifacts → app-debug.apk** download karo.
5. Phone me file kholo → Install. Ho gaya. ✅

Baad me jab bhi aap app me kuch badloge, Lovable → GitHub push → Actions dubara run → naya APK. Bas.

## Main is turn me ye karunga

### 1. GitHub Actions workflow (main kaam)
Naya file `.github/workflows/android-apk.yml` — ye cloud me automatic:
- Node + Java 17 install karega
- `bun install` + `bun run build`
- `bunx cap add android` (agar missing hai)
- `bunx cap sync android`
- Gradle se `assembleDebug` chalayega
- `app-debug.apk` ko artifact ke roop me upload karega (aap download kar sako)
- Ek "Release APK" job bhi rakhunga (signed, Play Store-ready) — optional, jab aap keystore add karo tab chalega

Manual trigger (workflow_dispatch) rakhunga taaki aap button se run kar sako, aur `main` branch push pe bhi automatic build ho.

### 2. Capacitor config polish
- `capacitor.config.ts` me `appId` ko unique bana dunga: `com.avinash.dailyplanner` (Play Store me duplicate `app.lovable.*` allow nahi karta)
- App name confirm: "Daily Planner"
- Android permissions declare karunga (`POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`) — taaki 30/15/5 min task reminders aur 7am/11pm water alarms native pe sahi fire ho, phone reboot ke baad bhi.
- `@capacitor/local-notifications` plugin already code me use ho raha hai — package.json me dependency confirm karunga.

### 3. App icon + splash
- Aapka current `public/icon-512.png` use karke Android launcher icon aur splash generate hoga (Capacitor assets script). Workflow me `@capacitor/assets` chala dunga taaki har build me icon fresh generate ho.

### 4. AI online usage (aapne allow kiya)
Ye already aisa hi hai — Lovable AI Gateway internet use karke daily rating deta hai (11:59 PM). Native APK me bhi wahi work karega jab phone online ho. Offline hone pe tasks/journal local save hote rahenge, AI rating agli baar online hone pe ban jayegi. Ye behavior confirm hai, koi change nahi chahiye.

### 5. README-mobile.md update
Sirf 3 simple steps Hindi + English me:
- GitHub pe push karo
- Actions me "Run workflow" dabao
- APK download karke install karo

Purane local build steps hata dunga (aapne bola "A nahi aata") — taaki confusion na ho. Ek chhota "advanced: signed release APK" section end me chhota rakh dunga jab aap Play Store pe publish karna chaho.

## Play Store pe daalne ke liye (baad me, jab aap taiyaar ho)

Same workflow signed **AAB** bhi bana sakta hai. Aapko sirf ek baar keystore file GitHub Secrets me daalni hogi (main steps README me likh dunga). Play Console pe $25 one-time fee lagti hai Google ki — wo aap khud submit karoge, main file taiyaar kar dunga.

## Confirm karo

Kya main aage badhun aur ye GitHub Actions workflow + config changes bana dun?

- **Haan, build karo** — main sab files bana dunga, aap GitHub pe push karke APK download kar loge.
- **Ruk jao** — agar koi aur sawaal hai (jaise app ka naam badalna, icon change karna) to pehle bata do.
