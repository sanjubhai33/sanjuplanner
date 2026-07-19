## Problem

APK par sirf "Loading…" dikhta hai (online + offline dono me). Reason:

1. `useSession()` (src/lib/session.ts) `supabase.auth.getSession()` ka wait karta hai. APK ke pehle launch me agar network slow/absent hai ya storage init me delay ho, `loading` kabhi `false` nahi hota → "Loading…" screen atki rehti hai.
2. TanStack Start ka prerendered `_shell.html` bundle correctly attach nahi ho raha to JS hydrate hi nahi hoga — sirf SSR-emitted "Loading…" text screen par baithi rehti hai.

## Fix

### 1. `src/lib/session.ts` — hard timeout + local cache
- Pehle localStorage/localforage se cached session ID / display name padhke `loading=false` set karna (offline-first).
- `getSession()` par 2.5s ka timeout: jo bhi pehle aa jaye (Supabase ya timeout), `loading` ko `false` kar do. Session hain to render, warna AuthPage. Baad me `onAuthStateChange` naturally update kar dega jab network aayega.
- Try/catch daalna taaki Supabase init throw kare to app crash na ho.

### 2. `src/routes/__root.tsx` — SSR shell ko truly static banana
- `AppLayout` (jo `useSession` call karta hai) ko `<ClientOnly fallback={<LoadingShell/>}>` me wrap karo. SSR sirf static "Loading…" markup emit karega; poori auth/session logic hydration ke baad hi chalegi. Isse `_shell.html` deterministic hoga aur hydration mismatch nahi hoga.
- `AuthPage` / `RemindersManager` / `SyncManager` sab client-only boundary ke andar.

### 3. `vite.config.ts` — clean prerender config
- Purana `nitro.prerender` override hata do (ab zaroorat nahi rahi, kyunki root SSR-safe hai). SPA prerender `_shell` output as-is chhod do.

### 4. `.github/workflows/android-apk.yml` — shell validation
- Jab `_shell.html` ko `dist/client/index.html` par copy karte hain, uske baad grep karke pakka karo ki us HTML me `<script` tag maujood hai aur `#root` / `#app` mount point hai. Agar nahi to build fail ho (fallback minimal HTML nahi banana — usme JS bundle nahi hoti aur wahi "Loading" wali problem repeat hoti hai).

### 5. Capacitor tweak
- `capacitor.config.ts` me `android.allowMixedContent: true` aur `webContentsDebuggingEnabled: true` (debug builds) — taaki agar phir bhi issue ho to `chrome://inspect` se real error dikhe.

## Result

- Offline: cached session ya AuthPage 2.5s ke andar dikhega — infinite loading gayab.
- Online: normal flow, thoda faster kyunki cached session pehle render hota hai.
- JS bundle validation build me pakad legi agar shell tootegi.
