# Chhote fixes — Google card, keyboard, widget

Sirf ye 4 cheezein. Baaki kuch nahi badlega.

## 1. Google Calendar card ko Calendar section me le jana

Abhi card "Today" screen par hai (web page aur APK dono me). Use hata kar Calendar tab me month grid ke upar dikhaya jayega — web (`/calendar`) aur mobile APK dono me same jagah. Card ka design, buttons aur sync ka kaam bilkul waise hi rahega.

## 2. Likhte waqt screen kaala hona / input upar chala jana

Video me jo dikha: keyboard khulte hi page upar chala jata hai aur likha hua text keyboard ke peeche chhup jata hai.

Fix (bina naya plugin add kiye):
- Android activity me `windowSoftInputMode="adjustResize"` set karna, taki keyboard khulne par page sikud jaye, upar khisak kar kaala area na chhode.
- Jis input/textarea par tap karo, wo focus par apne aap view me scroll ho jaye.
- Mobile screens ke neeche thoda extra padding, taki aakhri field keyboard ke peeche na jaye.

Ye sirf layout/keyboard behaviour hai — koi feature nahi badlega.

## 3. Chhota widget

Home-screen widget pehle se hai (aaj ke tasks, done count, paani, next task). Isme sirf chhota sa sudhar: tap karne par app khule aur task complete/paani badalne par widget turant refresh ho. Naya bada widget nahi banayenge.

## 4. "Access blocked: lovable.dev has not completed the Google verification process"

Ye app ka bug nahi hai — ye Google Cloud Console ki setting hai. Aapka OAuth app abhi "Testing" mode me hai, isliye sirf approved test users hi login kar sakte hai.

Aapko ye karna hoga (2 minute):
1. https://console.cloud.google.com/auth/audience kholein (wahi project select karein jisme client ID banaya tha).
2. "Test users" section me **+ Add users** dabaye.
3. Apna Gmail likhein: `sanjeevkummar31@gmail.com` (aur koi bhi doosra Gmail jisse login karna ho).
4. Save karein.
5. App me "Connect Google Calendar" dobara dabaye — ab consent screen khulega (warning aaye to "Advanced" → "Go to ... (unsafe)" par tap karein, ye aapka hi app hai).

Ye step ke bina koi bhi code change kaam nahi karega — restriction Google ki taraf se hai.

## Technical notes

- `src/routes/index.tsx` aur `src/mobile/MobileApp.tsx` (TodayScreen) se `GoogleConnectCard` hataya jayega, `src/routes/calendar.tsx` aur mobile `CalendarScreen` me add hoga.
- `android/app/src/main/AndroidManifest.xml` me activity par `android:windowSoftInputMode="adjustResize"`.
- Input/textarea par `onFocus` → `scrollIntoView({ block: "center" })`, aur mobile form containers me bottom padding.
- Widget: `PlannerWidgetProvider` me pending-intent se app launch + tasks/paani change hone par widget update broadcast.
- APK par asar dekhne ke liye GitHub Actions se naya APK build karke reinstall karna hoga.
