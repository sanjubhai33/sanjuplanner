# Daily Planner — Install as Android App (APK)

Yeh guide bata rahi hai kaise APK banta hai aur phone me install hota hai.

## Kaise kaam karta hai

APK ek hybrid app hai:

- App khulte hi published site load karta hai: `https://sanjuplanner.lovable.app`
- Server-side features (login, cloud sync, AI daily report) internet pe chalte hain.
- Tasks, journal, water tracker, notes, reminders **offline** bhi kaam karte hain — data phone me localforage me save hota hai aur internet aane par apne aap cloud me sync ho jata hai.
- Pehli baar app open karte time internet chahiye (WebView assets cache karne ke liye). Uske baad bina internet ke bhi app khulti hai.

## APK build karne ke steps (GitHub Actions)

1. GitHub repo khol ke **Actions** tab me jao.
2. Left side me **Build Android APK** workflow select karo.
3. Right side **Run workflow** → **main** branch → **Run workflow**.
4. ~10–15 min ruko jab tak green tick na aa jaye.
5. Run open karo → sabse niche **Artifacts** → **Daily-Planner-debug-apk** download karo.
6. ZIP ke andar `Daily-Planner-debug.apk` hai — usko phone pe bhejo (WhatsApp / Drive / USB).

## Phone me install

1. APK file phone me open karo.
2. Android puchhega: "Install from unknown sources" — allow karo.
3. **Install** dabao → **Open**.
4. Pehli baar internet on rakho (Wi-Fi ya mobile data).
5. Login karo → naam daalo → aap tayaar ho.

Ab home screen pe **Daily Planner** icon hai, Play Store wale app jaisa.

## Update kaise karo

Jab bhi Lovable me changes karte ho aur publish karte ho, APK apne aap latest version load karega (kyunki app live site se chalta hai). APK dobara install karne ki zaroorat sirf tab hai jab app icon, name, ya native settings change ho.

## Notes

- AI daily report, login, cross-device sync → internet zaruri.
- Task add/edit, journal, water, reminders → offline bhi kaam karte hain.
- Cross-device: same email/password se kisi bhi phone/browser pe login karke wahi data milega.
