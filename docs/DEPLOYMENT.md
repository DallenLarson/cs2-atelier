# CSKit deployment

Canonical domain: **https://cskit.site**. Firebase fallback: https://atelier-cs2-hub.web.app. `www.cskit.site` redirects to the canonical domain through Firebase's custom-domain configuration.

## Architecture

- Firebase Hosting serves only the generated `dist/` directory. It never serves the desktop `data/` directory or its write APIs.
- Guests save wishlist and Studio data in browser storage, scoped to the current origin. Clearing site data clears guest work; export a backup or sign in and explicitly import first. Guest storage on the fallback hostname and custom domain is separate.
- Google accounts use Firebase Auth and private per-user Firestore documents. Existing accounts and their data stay in the original project, `atelier-cs2-hub`.
- GitHub Actions fetches public Skinport USD quotes and ByMykel's artwork catalog. The `market-data` branch contains only the latest generated public snapshot. It is intentionally replaced with a parentless commit each run; do not use it for source code or historical data. The `main` branch history is preserved.
- The browser checks the feed every five minutes while open. The GitHub job requests five-minute updates independently of the user's computer, but scheduling, upstream limits, and CDN caching can delay them. Snapshots older than 30 minutes are marked delayed. GitHub can disable schedules in inactive public repositories; check Actions if updates stop.
- If fetching fails, the browser can use its cached snapshot or the last deployment's bundled snapshot. The displayed timestamp remains the original observation time. Public hosting does not collect personal price history; that remains a desktop feature.

## Publishing

Push `main` to run **Publish CSKit**. It tests source, fetches a fresh public feed, builds, and deploys only Hosting. It does not deploy or weaken Firestore rules.

Keyless Google authentication uses `projects/345561783504/locations/global/workloadIdentityPools/cskit-github/providers/github`. Its trust condition restricts repository ID `1396653515`, owner ID `98286629`, and `refs/heads/main`. The `cskit-publisher` service account has Firebase Hosting Admin and Service Usage Consumer on this project, with no Firestore data role.

For an authenticated local deployment:

```sh
npm ci --ignore-scripts
npm test
npm run feed
npm run build
npx firebase deploy --only hosting --project atelier-cs2-hub
```

No paid backend or billing upgrade is needed for this setup within the providers' free quotas. Hosting and account quotas still apply.

## Namecheap DNS

Keep Namecheap BasicDNS. The connection uses these records:

| Type  | Host  | Value                          |
| ----- | ----- | ------------------------------ |
| A     | `@`   | `199.36.158.100`               |
| TXT   | `@`   | `hosting-site=atelier-cs2-hub` |
| CNAME | `www` | `atelier-cs2-hub.web.app`      |

Certificate challenge TXT values are supplied by Firebase and can change. Inspect Firebase Hosting custom-domain status for current values. Do not remove unrelated mail or verification records. Firebase provisions and renews HTTPS after DNS ownership and routing are verified.

Both `cskit.site` and `www.cskit.site` are authorized in Firebase Authentication. Google sign-in currently uses the existing `atelier-cs2-hub.firebaseapp.com` OAuth handler to preserve the configured OAuth client.

## Optional Steam service

The Steam friends backend is separate from static Hosting and remains disabled pending billing approval and a server-side Steam Web API key. It is not included in automatic Hosting deployment. See [Steam friends activation](STEAM-FRIENDS.md). Existing free static hosting does not imply that the optional backend is cost-free.
