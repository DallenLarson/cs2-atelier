# Performance integration — live

The Performance page supports Steam64 IDs, numeric Steam profile URLs, and Leetify profile URLs/UUIDs. It requests `/v3/profile` from Leetify's documented public API directly from the browser. No secret, paid backend or automated background polling is required. Keyless access has stricter upstream rate limits; the UI handles these explicitly and spaces user requests.

Displayed data: Leetify Rating (`ranks.leetify`), Premier, FACEIT level/Elo, Aim, Positioning, Utility, and up to ten recent matches. Missing fields appear as dashes. Recent-match raw rating fields are intentionally omitted because the API documentation uses inconsistent example scales. No metric is invented or rescaled. Private/unknown privacy modes fail closed.

Requests use no-store and credentials omit. No profile identifier or response is saved to localStorage, Firestore, GitHub feeds, or server storage. An explicit Google/local-guest choice precedes the first lookup in a tab session. This is a public lookup, not proof of Steam account ownership. The public lookup itself does not verify ownership. The separate Google + Steam linking and friends-only comparison implementation is prepared but awaits backend activation; see [Steam friends setup](STEAM-FRIENDS.md).

Official references:

- https://api-public-docs.cs-prod.leetify.com/
- https://leetify.com/blog/leetify-api-developer-guidelines/amp/
- Attribution image: unmodified “Leetify Badge White Large.png” from the official linked asset folder, Google Drive file `1SkDIGTav6Hqh15ZUMGEDCrmkOE-5mtKN`.

Steam friends activation requires a server-side Steam key and approved backend hosting. Public lookup remains keyless. Vanity-name resolution is still future work.

# Search readiness

The site includes crawlable static descriptions, canonical URLs, WebSite/Organization structured data, a square 96px favicon, Apple touch icon, social preview, robots.txt and a sitemap. Search engines decide when to crawl and display changes; rankings are not guaranteed. In Google Search Console, verify cskit.site and submit https://cskit.site/sitemap.xml to monitor indexing.
