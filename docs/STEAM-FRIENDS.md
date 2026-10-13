# Steam friends comparison

## Current release status

The friends panel and backend implementation are prepared and tested. **Production Steam linking is disabled** until the backend has been activated. The existing public Leetify lookup remains operational. A private account-saved custom scoreboard supports your chosen profile and up to 20 friends entered by profile link. Only user-entered identifiers and settings are saved; ratings are fetched live. A selected profile is unverified until it matches a server-verified Steam identity. No global or historical/all-time ranking is included.

## User flow

1. Sign in with Google. A guest cannot claim a Steam identity or retrieve a friends list.
2. Choose Sign in through Steam. Steam verifies the identity on steamcommunity.com; CSKit never collects Steam credentials.
3. Return to CSKit with the same Google account. The authenticated finish step links the verified Steam64 ID. Your own Performance lookup becomes the default.
4. Choose Compare my Steam friends. The server requests the linked profile's Steam friends list; client-supplied Steam IDs are ignored.
5. Current Leetify profiles are fetched in batches of 20, sorted by Leetify Rating, Aim, Positioning or Utility. The user is highlighted. Equal scores share rank (1, 1, 3). Missing/private profiles are excluded, not assigned zero. Partial results and checked/total counts remain explicit until all friends have been checked. Friends need no CSKit account.
6. Disconnect Steam to remove the private link and unique ownership record. The Google account remains intact.

## Activation — account owner required

Firebase project `atelier-cs2-hub` currently has billing disabled. Cloud Functions requires Blaze. Do not enable billing or create a paid resource without the owner's approval. `maxInstances: 2`, `minInstances: 0` limit scaling/idle compute but are **not a spending cap**. Establish a billing budget/alerts with the owner; alerts do not stop spending.

After the owner enables billing and registers their Steam developer key for `cskit.site`:

```sh
npm ci --prefix functions --ignore-scripts
npx firebase functions:secrets:set STEAM_WEB_API_KEY --project atelier-cs2-hub
npx firebase deploy --only functions --project atelier-cs2-hub
node scripts/activate-steam.mjs
npm run build
npx firebase deploy --only hosting --project atelier-cs2-hub
```

The `secrets:set` prompt is interactive. Enter the secret directly there, **never in chat, source control or a shell argument**. Use https://steamcommunity.com/dev/apikey to register/manage it. The Steam user must handle any login, Steam Guard or agreement acceptance. The key is server-side only; visitors don't supply keys.

The activation script checks backend readiness before enabling the frontend and same-origin `/api/steam/**` rewrite. Commit both resulting config changes so GitHub Hosting deploys retain activation. The existing GitHub publishing identity intentionally cannot deploy Functions or manage secrets; backend changes require an authenticated owner deployment. No broader CI permissions are added here.

Configure Firestore TTL for `expireAt` on collection groups `steamLinkSessions`, `steamNonces`, and `steamRateLimits`. These Date fields only clean up expired records; correctness checks use expiry and one-use transactions, not asynchronous TTL deletion. TTL usage may be billed. Use normal Firebase/GCP consoles after billing approval.

Then verify on the canonical domain:

- Guest calls to start/status/friends cannot access data.
- A real Google → Steam → same Google finish round trip succeeds.
- Another Google UID cannot claim the same Steam ID, nor finish another user's flow.
- Public friends load; private friends receive a privacy explanation.
- Unlink and relink behave correctly.

## Security and data boundaries

The server validates Firebase ID tokens (including revocation), requires the Google sign-in provider, checks Origin on mutations, binds ten-minute random state to a secure HttpOnly SameSite=Lax browser cookie and UID, validates Steam's assertion against its fixed HTTPS endpoint, and checks signed fields, endpoint, identity, nonce age and exact return URL. A consumed nonce cannot be replayed. Linking uses Firestore transactions and a unique Steam owner index; final linking requires another authenticated Google request after the Steam redirect. The service returns no tokens, secrets, raw assertions or upstream URLs in errors.

Firebase Hosting forwards only `__session` cookies; that cookie is restricted to `/api/steam` and cleared after linking. All service responses use `private, no-store`. Never cache the callback at a proxy.

Only a verified Steam64 ID and linking time are stored under the user's private document. A server-only uniqueness record maps Steam64 ID to UID. All these paths remain denied to Firestore clients under the existing rules. Temporary handshake and per-UID throttle records are server-only. No public user directory is created. Steam friends lists and Leetify responses are not persisted; they exist only for the current comparison. Steam privacy is respected; OpenID login does not grant access to a private friends list.

## Tests and limits

`npm test` covers OpenID forgery/expiry/field validation, Google/Origin requirements, key redaction, private friends, tied/negative/missing scores, and roster validation. `npm run test:rules` additionally exercises Firestore claim races, UID/browser mismatch, replay, unlink and denied client access using emulators. These are protocol/emulator tests, not a substitute for the first real production Steam login.

The unmodified sign-in button comes from https://community.fastly.steamstatic.com/public/images/signinthroughsteam/sits_01.png. Official references:

- https://steamcommunity.com/dev
- https://partner.steamgames.com/doc/webapi/ISteamUser
- https://firebase.google.com/docs/functions/get-started
- https://leetify.com/blog/leetify-api-developer-guidelines/amp/
