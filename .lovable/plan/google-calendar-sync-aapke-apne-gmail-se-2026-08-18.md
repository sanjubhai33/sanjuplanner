# Google Calendar sync (aapke apne Gmail se)

Jis Gmail se aap Daily Planner me login karte ho, usi Google account ka Google Calendar
planner me sync hoga — device ka local calendar nahi. Har event planner me ek task ban
jayega: title, date, start time, duration. Jo event guzar chuka hai / cancelled hai, uska
status bhi update hoga.

## Aapko kya karna hoga (main guide karunga)

1. Chat me ek "Connect Google" card khulega — usme apna Google OAuth client banane ke liye
   ek form aayega. Us page pe Google Cloud Console ke steps likhe honge; main yahan bhi
   step-by-step batata rahunga (Client ID + Secret banana, redirect URI paste karna).
   Redirect URI (bilkul yahi daalna hoga):
   `https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback`
2. App me Settings me "Connect Google Calendar" button hoga — usse apna Gmail chunkar
   allow karna. Bas ek baar. Uske baad sync apne aap chalta rahega.

## App me kya banega

- Settings/profile area me **Google Calendar** card: Connect / Disconnect + "Last synced"
  + manual "Sync now" button.
- Connect hone ke baad automatic sync: app khulte hi, aur har kuch minute me background me
  (jab internet ho). Pichhle 30 din + aage ke 90 din ke events aayenge.
- Har imported event planner me task banega:
  - date = event ki date, start time = event ka time (all-day event = "All day")
  - duration = event ki length
  - cancelled event = planner se hata diya jayega
  - Google se aaya task badge "Google" ke saath dikhega
- Sync sirf ek taraf hai: Google → planner. Planner me kiye badlaav Google me wapas nahi
  jayenge (aapne yahi maanga tha).
- Aapke apne banaye tasks bilkul chhue nahi jayenge.

## APK aur offline

Sync ke liye internet chahiye. Sync hone ke baad tasks aapke cloud account me save hote hain,
aur APK me pehle se maujood sync se ye tasks phone par bhi aa jate hain — phir offline bhi
dikhte hain, notifications (30/15/5 min pehle) bhi unpe lagti hain. Connect/allow karne ka
step ek baar web app (browser) me karna sabse safe hai; uske baad APK apne aap data uthata
rahega.

## Technical details

- App User Connector `google_calendar` (per-user OAuth) — `connector_app_user--connect_client`
  se workspace client link hoga; scopes: `userinfo.email`, `userinfo.profile`,
  `calendar.readonly`.
- Naya server-only table `app_user_connections` (user_id, connector_id, encrypted
  connection key) — service_role ke alawa koi access nahi; key AES-256-GCM se encrypt hogi
  (`APP_USER_CONNECTION_KEY_SECRET`).
- `src/integrations/lovable/appUserConnector.ts` helper (server-only) + server functions:
  `startGoogleCalendarConnect`, `completeGoogleCalendarConnection`,
  `googleCalendarStatus`, `syncGoogleCalendar`, `disconnectGoogleCalendar` —
  sab `requireSupabaseAuth` ke saath.
- OAuth popup + return route `src/routes/oauth/google-calendar/return.tsx` (one-time code
  opener ko bhejta hai; key sirf server par exchange/store hoti hai).
- Sync server fn `calendar/v3/calendars/primary/events` (singleEvents=true, showDeleted=true,
  syncToken/updatedMin) call karke rows `tasks` table me upsert karega, mapping ke liye
  `tasks` me `google_event_id` column (unique per user) add hoga; planner ka local
  localforage store `SyncManager` ke through in tasks ko utha lega.
- UI: naya `src/components/google-calendar-card.tsx`, web Settings/Today header aur
  `src/mobile/MobileApp.tsx` dono me dikhega (APK me read-only status + "web me connect karo"
  hint, kyunki APK me server functions nahi chalte).
