# Firebase accounts

Atelier has a Hub overview, Google sign-in, and separate private account storage for wishlists and Studio builds. Guest mode continues using the original local JSON files. Sign-in and sign-up share one **Continue with Google** button.

The current local installation connects to `atelier-cs2-hub`. Google sign-in is enabled, the Firestore database is in `nam5`, and the included security rules are deployed. No billing account was linked. The actual web configuration lives in ignored `data/firebase-config.json`; no administrative credential is served to the browser or committed.

## Connecting another installation

1. In your Firebase project, register a web app. Copy its configuration into `data/firebase-config.json`, using `firebase-config.example.json` for the shape.
2. Enable Google in Authentication → Sign-in method, with your project’s support email and display name. Firebase also supports configuring it with `firebase init auth` and `firebase deploy --only auth`.
3. Add `localhost` and `127.0.0.1` to Authentication’s authorized domains for local use. The current app expects the standard `PROJECT.firebaseapp.com` auth domain.
4. Create a Cloud Firestore database, then deploy the included rules:

   ```sh
   npm ci --ignore-scripts
   npx firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```

5. Start Atelier and use **Continue with Google** in a normal browser. Allow the Google popup. Embedded browsers can restrict OAuth popups; if the popup does not appear, open the local address in Chrome, Edge, or Safari.

An absent configuration leaves Google sign-in disabled. A failed configured connection blocks account writes; it does not silently save account data to a guest workspace.

## Storage and migration

- Firebase Authentication handles Google identity and session persistence. The app does not collect passwords.
- Firestore documents are `users/{uid}/private/wishlist` and `users/{uid}/private/studio`.
- Rules require the authenticated UID to match the document owner, limit collection sizes, and enforce Studio revision increments. The client validates imported profiles and command values before using them.
- Studio writes use a transaction and revision check. A conflicting tab must export its unsaved profile and reload rather than overwrite newer work.
- Wishlist edits use transactions. Market and wishlist views refresh on the existing 15-second UI interval; Studio loads the account library on opening.
- **Bring local data to my account** copies only wishlist/targets and Studio builds. It preserves cloud entries on duplicate names/IDs and retains local originals. Repeating it does not duplicate entries. No automatic migration occurs at sign-in.
- Account data is not persisted into the server’s local files. Signing out returns to that computer’s guest workspace. In-flight pages reject writes after an account change.
- Firebase sign-in uses the SDK’s normal auth persistence. Firestore uses its default memory cache, not a persistent shared-device disk cache.
- Account export includes wishlist and Studio data. Market price history remains local to the original guest tracker and is not shown as an account’s personal history.

## Hosting boundary

This release connects the existing **local** app to Firebase; it does not publish the Node server to the internet. It still binds to loopback and keeps local guest APIs. Do not expose that server publicly as a multi-user backend: guest data is shared on that computer. Public Hub hosting needs a separate market-data service and browser-specific guest storage. Firebase account records already have user isolation.

## Verification

`npm test` runs config generation, local persistence, migration, and validation tests. `npm run test:rules` requires Java 21 and runs the Firestore Emulator with a demo project; it checks owner access, rejected cross-account and anonymous requests, unsupported paths, size limits, and stale revisions. It does not connect to the production project.

Google provider configuration and generation of an authorization URL were checked against the real project. The personal Google consent/login step must be completed by the user; it was not automated or impersonated.

References: [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [Firebase web SDK](https://firebase.google.com/docs/web/alt-setup), [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions), [rules and authentication](https://firebase.google.com/docs/rules/rules-and-auth).
