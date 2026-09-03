# "Access blocked" Google error — step by step fix

Ye error app ka bug nahi hai. Aapka Google OAuth client abhi **Testing** mode me hai,
isliye Google sirf un Gmail ko login dega jo "Test users" list me hai. Isko Google Cloud
Console me theek karna hoga — code se bypass nahi hota.

## Part 1 — Turant fix (2 minute, aaj kaam karne lagega)

1. Phone/laptop me kholo: https://console.cloud.google.com/auth/audience
2. Upar left me **project selector** par tap karo aur wahi project chuno jisme aapne
   Client ID banaya tha (jo naam aapne diya tha, jaise "Daily Planner").
3. Page par **Audience** dikhega. Wahan **Publishing status: Testing** likha hoga.
4. Neeche **Test users** section me **+ Add users** dabao.
5. Apna Gmail likho: `sanjeevkummar31@gmail.com`
   (jo bhi doosra Gmail se login karna ho, wo bhi ek-ek line me add karo — max 100).
6. **Save** dabao.
7. App me Calendar tab kholo → **Connect Google Calendar** dabao → apna Gmail chuno.
   Agar "Google hasn't verified this app" warning aaye to:
   **Advanced** → **Go to Daily Planner (unsafe)** → **Continue/Allow**.
   Ye aapka hi app hai, isliye safe hai.

Ab connect ho jayega.

## Part 2 — Future me ye error dobara na aaye

Testing mode me do dikkat hoti hain: naya Gmail block hota hai, aur refresh token
har 7 din me expire hota hai (yaani hafte baad dobara connect karna padta hai).
Permanent solution: app ko **In production** kar do.

1. Usi page par (https://console.cloud.google.com/auth/audience) **PUBLISH APP** button dabao.
2. Confirm karo. Status **In production** ho jayega.
3. Kyunki hum sirf `calendar.readonly` + email/profile scope use karte hain, Google
   in-production allow kar deta hai; "unverified app" warning screen aa sakti hai
   (Advanced → Go to ... par tap karke aage badh jana). Verification submit karna
   zaroori nahi jab tak aap public users ko na de rahe ho.
4. Publish karne ke baad: naya Gmail add karne ki zaroorat nahi, aur 7-din wala
   token expiry problem bhi khatm.

Agar Google verification maange (kabhi kabhi maangta hai), to bas "Prepare for
verification" form me app name, logo, homepage `https://sanjuplanner.lovable.app`
aur privacy policy URL bharna hota hai — batao to main ek privacy policy page
app me bana dunga.

## App me kya change hoga

Is fix ke liye code change zaroori nahi. Optional (aap bolo to):

- Connect fail hone par card me clear message: "Google ne block kiya — Google Cloud
  Console me test user add karo / app publish karo", saath me link.
- Ek simple `/privacy` page, taki future me Google verification maange to ready ho.

Aap "haan" bolo to bas yahi do chhoti cheezein add karunga, aur kuch nahi.
