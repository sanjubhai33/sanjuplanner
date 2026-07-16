## Problem
Aap Google login kar rahe ho aur page par error aa raha hai: “Unable to process request due to missing initial state.” Iska matlab browser ne Google login ke beech me temporary session data lose/block kar diya. Ye usually Chrome cookies/sessionStorage, Incognito, translator, app redirect, ya blocked third-party storage ki wajah se hota hai.

## Steps to try
1. Chrome ka **Incognito tab use na karein**. Normal tab me login karein.
2. Chrome me `auth.lovable.dev` page open hai to us tab ko close karein.
3. Chrome Settings → Site settings → **Third-party cookies** → temporarily **Allow third-party cookies** karein.
4. Chrome Settings → Privacy → **Clear browsing data** → Cookies + cache clear karein.
5. Chrome address bar me manually type karein: `https://lovable.dev`.
6. Chrome menu se **Desktop site ON** karein.
7. Google login start karein aur beech me back button, translate button, ya tab switch avoid karein.
8. Agar Lovable app khul jaye: Android Settings → Apps → Lovable → Open by default → **Open supported links OFF** karein.

## Agar phir bhi same error aaye
- Chrome ke bajay **Firefox** ya **Samsung Internet** me `https://lovable.dev` open karke Google login try karein.
- Ya Lovable app temporarily uninstall/disable karke Chrome login retry karein.
- Sabse reliable: ek baar laptop/desktop browser se login karke GitHub connect kar dein.

## Important
Isme project ke code me change karne se login fix nahi hoga, kyunki error Lovable authentication page par aa raha hai, aapke app ke andar nahi.