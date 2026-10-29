# CSKit launch readiness — October 29, 2026

Reviewed main at `22eaf31`, repository metadata, Firebase configuration, source and the live guest dashboard/market. Recommendation: invite a small beta after checking market freshness and private cloud writes; delay a broad promotion until those checks pass. Zero open issues is repository metadata, not evidence of a defect-free release.

## Strongest implemented features

- **Studio** (`public/studio*.js`): explicit overrides, config import/export, duplicate bind checks, saved profiles, illustrative previews and installation guidance. Good primary launch story. Commands and pro presets are dated snapshots, not continuously verified settings.
- **Market and wishlist** (`public/app.js`, `public/hosted.js`): real Skinport USD snapshots, exact-variant targets, local guest storage, cached fallback and external purchase links. Live page displayed 25,166 items.
- **Private workspace** (`workspace-core.js`, `workspace-store.js`, `firestore.rules`): practice plans, manual observations, paired setup experiments, recoverable drafts, revision conflict checks and explicit imports. Guest dashboard loaded successfully.
- **Performance and private scoreboard** (`performance*.js`, `scoreboard*.js`): validated Steam64/profile inputs, public Leetify lookup and saved roster preferences; ownership labels distinguish unverified selections from Steam verification. Source reviewed; authenticated production save not exercised.
- **Public structure** (`scripts/seo.mjs`, `scripts/build-hosted.mjs`): route-specific metadata, canonical URLs, share artwork, sitemap and 404. Firebase adds CSP and other response headers. Community is explicitly planned and noindex.

## Priority fixes before promotion

| Priority | Evidence / files | Smallest useful next step |
| --- | --- | --- |
| P0 | Live Market displayed delayed-price warning. Current fetched `market-data` snapshot was October 29 at 03:58:42 CDT, several hours before this review. `.github/workflows/market.yml` requests five-minute refreshes. | Check the latest Refresh market feed runs, run it once, and verify that the published timestamp advances across subsequent runs. Investigate schedule/permission/upstream failures from actual logs; cause is not established here. |
| P0 | `.github/workflows/publish.yml` deploys **hosting only**, while `firestore.rules` includes new workspace and scoreboard paths. | Verify deployed rules match the current file. Deploy reviewed rules through the owner-controlled Firebase workflow if needed. Test a fresh Google account saving/reloading wishlist, Studio, workspace and scoreboard; verify another account cannot read them. Source alone does not establish deployed rules. |
| P1 | `public/steam-service.json` is disabled; `docs/STEAM-FRIENDS.md` requires backend activation and owner billing/key setup. | Promote public lookup and manually saved private scoreboards accurately. Keep automated Steam verification/friends sync labeled unavailable. Activation can wait; it is not a free cosmetic switch. |
| P1 | Original market had only rifles/snipers, knives and containers; wear/StatTrak variants crowded results. | Included in this branch: condition, edition, weapon/type, min/max price, priced availability, gloves/pistols/SMGs/heavy/stickers, reset and combined cheapest variants. Shared engine covers hosted, desktop and signed-in wishlists. |
| P1 | `public/account.js` combined backup includes Studio/wishlist only. Workspace exports separately. Scoreboard is omitted; privacy text acknowledges account deletion is unavailable. | Next add scoreboard export/clear and make backup coverage explicit at each export button. Then provide one account-data export and deletion flow. Do not advertise a complete backup yet. |
| P2 | Community remains a planned route; Maps is Dust II only; practice/experiment results are manual. | Label Community as “Coming soon” in navigation. Launch copy should say “Dust II explorer” and “manual practice tracking.” Avoid implying automatic match analysis, demo ingestion or a shipped community network. |

## Changes in this branch

Combined browsing groups wear and StatTrak editions of the same named item and retains the cheapest **available, priced** matching variant. Filters apply before grouping. Souvenirs remain separate. Detail links, quantity, wishlist saves and targets refer to the exact selected variant. Saved wishlist entries are never grouped. No cross-market or live checkout-price guarantee is implied. Sorting low to high finds the cheapest matching rows.

Price status now says “Delayed · saved prices” instead of claiming the user is offline, and includes the snapshot's calendar date as well as time. The UI still shows existing stale-feed warnings.

## Validation and limits

`npm test`: 42 tests, 40 passed, 2 skipped (Firestore/Steam emulator cases). `npm run build` passed using the existing market-data snapshot; syntax and diff checks passed. Added regression tests cover grouped starred StatTrak names, available-vs-unavailable prices, intersecting filters, Souvenir separation and exact wishlist preservation. Updated the isolated server fixture for the shared filter module.

Live guest dashboard and market were inspected. New filter controls have not been browser-tested or deployed. Google sign-in, production cross-account access, actual CS2 config loading, external checkout and Steam linking were not end-to-end tested. Emulator security tests need their configured dependencies/runtime before claiming a complete release gate. The proposed code is delivered through a pull request so main's automatic public Hosting deployment is not triggered during this audit.
