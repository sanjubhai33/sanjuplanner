## Plan A — PWA install polish (abhi)

Aapka PWA setup pehle se 90% ready hai (`manifest.webmanifest`, icons, head tags sab set). Sirf ek chhota install helper add karna hai taaki phone pe Chrome ka install prompt easily use ho sake.

### Changes

1. **`src/components/install-app-button.tsx` (new)**
   - `beforeinstallprompt` event listen kare
   - Jab event fire ho, ek chhota "Install app" button dikhaye (Today page ke header ke paas)
   - Click pe `prompt()` call kare → user "Add" dabaye → home screen icon
   - iOS (Safari) pe event nahi milta → wahaan ek tiny hint dikhaye: "Share → Add to Home Screen"
   - Jab app already installed ho (`display-mode: standalone`) to button hide

2. **`src/routes/__root.tsx`** — header ke right side (Sign out ke pehle) me `<InstallAppButton />` mount karna. Sirf tab dikhega jab install possible ho, warna invisible.

3. **No manifest changes, no service worker, no new deps.** Aapke `manifest.webmanifest`, `icon-512.png`, aur head tags jaise hain waise rahenge.

### Aapko kya karna hoga

1. Main change karunga → aap top-right **Publish** dabaoge.
2. Publish hone ke baad live link (`...lovable.app`) apne phone Chrome me kholo.
3. Ya to header me "Install app" button dikhega — tap karo → "Add".
4. Ya Chrome menu (⋮) → **Install app** / **Add to Home Screen**.
5. Home screen pe Daily Planner icon aa jayega, tap karke fullscreen app jaisa chalega.

### Parallel: GitHub connection issue

Main khud se GitHub OAuth flow bypass nahi kar sakta (security), lekin aapke liye ready-to-send support message `.lovable/plan.md` me pehle se hai. Jab aap wapas aao, ye do kaam parallel karenge:
- Aap support ko wo message bhej do (ya laptop/kisi aur device se ek baar GitHub connect kar lo)
- Ek baar connect ho gaya → `.github/workflows/android-apk.yml` (already committed hai!) automatic real APK bana dega → download → install → **Play Store jaisa asli app**

Matlab APK ka poora setup pehle se code me ready hai, sirf GitHub connect ka ek step baaki hai.

Approve karo to Phase A ka install button add kar deta hu.