# Daily Planner — Install as Android App (APK)

Yeh guide bata rahi hai kaise APK banta hai aur phone me install hota hai.

## Kaise kaam karta hai

APK ek hybrid app hai:

- App apne andar bundled planner files lekar install hota hai, isliye internet off hone par bhi app open hota hai.
- Login, cloud sync, aur AI daily report internet pe chalte hain.
- Tasks, journal, water tracker, notes, reminders **offline** bhi kaam karte hain — data phone me localforage me save hota hai aur internet aane par apne aap cloud me sync ho jata hai.
- Pehli baar login karne ke liye internet chahiye. Login ke baad saved planner data bina internet ke bhi open/edit hota hai.

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
4. Pehli baar login ke liye internet on rakho (Wi-Fi ya mobile data).
5. Login karo → naam daalo → phir offline mode bhi kaam karega.

Ab home screen pe **Daily Planner** icon hai, Play Store wale app jaisa.

## Update kaise karo

Frontend/app screen changes ke liye GitHub Actions se naya APK build karke install karna hoga. Backend/AI improvements publish ke baad online mode me update ho sakte hain.

## Notes

- AI daily report, login, cross-device sync → internet zaruri.
- Task add/edit, journal, water, reminders → offline bhi kaam karte hain.
- Cross-device: same email/password se kisi bhi phone/browser pe login karke wahi data milega.
