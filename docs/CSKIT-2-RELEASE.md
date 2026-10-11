# CSKit 2.0 foundation release

Based on the owner's October 10 design specification. This release implements the foundation and a bounded set of launch features; it is not completion of the entire roadmap.

## Available

- Unified sidebar, responsive drawer, collapsible desktop navigation and keyboard-searchable tool palette.
- Dashboard with saved Studio build, practice and experiment counts, map favorites and watchlist entry point. Cards can be reordered, hidden and restored.
- Private versioned workspace: guest browser storage; signed-in Firestore records; revision conflicts never overwrite newer data. Account drafts remain locally recoverable. JSON import adds copies and preserves originals.
- Practice routines with 10/20/30/60-minute plans, eight original drills, manual completion history and observations.
- Experiments with two immutable Studio profile snapshots, manual observations, descriptive averages, conclusions and copy-to-Studio recovery.
- Sensitivity calculator with explicit yaw assumptions, aspect-ratio helper and keyboard-operable Dust II map explorer.
- Performance links to relevant practice categories without claiming that a metric proves a weakness.
- Existing Market, Wishlist, Studio and Leetify lookup retained. Guest tools no longer require the account-choice dialog.
- Route-specific metadata, Open Graph/Twitter large cards, JSON-LD, sitemap and a branded 1200 × 630 share image. Account and planned Community pages are noindex.

## Not yet available

Steam activation still requires owner billing/key setup. Verified callouts/lineups, public profiles/squads/moderation, official crosshair share codes, full Studio revision history, multiple named wishlists, dream loadouts, automated patch impacts, detailed match analysis, recommendations based on validated thresholds and demo ingestion are not shipped in this release.

## Data behavior

New records use `users/{uid}/private/workspace`; no public reads. Guest and account workspaces stay separate. To transfer guest plans, export the guest workspace, sign in, and import as copies. Existing Studio/wishlist migration remains unchanged. New workspace export is separate from the existing account backup. Clearing a workspace does not delete Studio profiles, wishlists or the Google account.

Cloud save failure keeps a local draft. Use Export draft and load latest account copy to recover without losing either side, then import the exported draft as copies. Storage limits: 50 plans, 500 completions, 30 experiments, 200 observations per experiment, 600 KB serialized workspace. No Leetify responses are persisted. No new analytics or notifications are enabled.

## Search launch follow-up

Submit `https://cskit.site/sitemap.xml` in Google Search Console after owner verification. Search indexing and rankings are Google's decisions; metadata and a sitemap do not guarantee ranking. The site is an independent toolkit, not an official Valve product. Share caches may need time to refresh; the new image uses a versioned filename.
