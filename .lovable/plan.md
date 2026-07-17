Do I know what the issue is? Yes.

The new screenshot shows the APK build now reaches **Check build tools**, but fails on the Capacitor command. The problem is that the workflow runs:

```text
npx --no-install cap --version
```

**before** `npm install` runs. On GitHub’s fresh build machine, dependencies are not installed yet, so the local Capacitor CLI executable is not available and npm prints:

```text
npm error could not determine executable to run
```

Files involved:
- `.github/workflows/android-apk.yml` — wrong step order and fragile Capacitor command placement
- `package.json` / `package-lock.json` — Capacitor CLI is already present, so the workflow should install dependencies first and then call the local CLI

Plan:
1. Move dependency installation before any Capacitor CLI command.
2. Replace the failing pre-install `npx --no-install cap --version` check with a post-install local CLI check.
3. Use stable local commands for Capacitor:
   ```text
   ./node_modules/.bin/cap --version
   ./node_modules/.bin/cap add android
   ./node_modules/.bin/cap sync android
   ```
4. Keep Node 22 and Java 21 because the log now confirms those are working.
5. Keep the final APK artifact name exactly as `Daily-Planner-debug-apk` with `Daily-Planner-debug.apk` inside it.
6. Verify the workflow YAML structure after editing so you only need to press **Run workflow** again.

After you approve, I’ll apply this fix directly.

<presentation-actions>
  <presentation-open-history>View History</presentation-open-history>
</presentation-actions>

<presentation-actions>
<presentation-link url="https://docs.lovable.dev/tips-tricks/troubleshooting">Troubleshooting docs</presentation-link>
</presentation-actions>