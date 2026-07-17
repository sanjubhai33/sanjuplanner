## Diagnosis

Job `build-apk` failed in **15 seconds** — bahut jaldi fail hua, matlab Gradle build tak pahucha hi nahi. Itni jaldi fail hone ka matlab lagbhag hamesha `bun install` step hai (lockfile mismatch, ya bun version conflict CI me). Gradle build hota to minimum 2-3 minute lagte.

Exact log dekhne ke liye user ko `build-apk` pe click karke red step expand karna padta — but plan is workflow ko itna robust bana do ki ye class of failure dobara na aaye.

## Fix — `.github/workflows/android-apk.yml` rewrite

1. **Bun hatao, npm use karo.** `bun install` GitHub Actions me lockfile-strictness aur cache issues ki wajah se flaky hai. Node 20 + `npm install --legacy-peer-deps` reliable hai kyunki `package-lock.json`/`package.json` sab standard hai.
2. **`npm install` (not `npm ci`)** — user ke paas exact `package-lock.json` sync na ho to `ci` fail karta hai; `install` forgiving hai.
3. **Har step ke aage `--stacktrace` / verbose flag** taaki agar fail ho to log me clear reason dikhe.
4. **Node 20 action versions latest** (`actions/checkout@v4`, `setup-node@v4`, `setup-java@v4`) — warning "Node.js 20 deprecated" ignore-able hai, failure ki wajah nahi.
5. **Gradle ke liye `--stacktrace --info`** add, taaki agar assembleDebug fail ho to Java/SDK issue clearly dikhe.
6. **`@capacitor/assets` step ko optional rakho** (already `|| true`) — icons na ban paye to bhi APK banega.
7. **APK naam aur upload waisa hi rakho** — user ka existing flow.

## Details section (technical)

New workflow structure:

```text
- checkout
- setup-node 20
- setup-java 17 (temurin)
- npm install --legacy-peer-deps --no-audit --no-fund
- write dist/index.html fallback
- npx cap add android (if missing)
- npx cap sync android
- chmod +x android/gradlew
- cd android && ./gradlew assembleDebug --no-daemon --stacktrace
- copy APK → apk/Daily-Planner-debug.apk
- upload-artifact@v4
```

Bun-related steps hataye jaayenge. `bunx` calls → `npx`.

## User ke liye step (plan approve karne ke baad)

1. Main approve karo, workflow file update ho jayegi + auto push hoga
2. GitHub → Actions → naya run apne aap chalega (push trigger se) ya "Run workflow" dabao
3. 8-12 min me `Daily-Planner-debug.apk` artifact ready

Agar phir bhi fail ho, is baar exact failing step ka log paste karna — npm-based workflow me error message clear aata hai.
