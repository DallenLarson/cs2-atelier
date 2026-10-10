# Leetify score checker — planned, not live

The hub shows a disabled WIP card. No scores, Steam links, API requests or account linking are implemented yet.

Planned experience: explicitly connect or enter a Steam identifier, view the available Leetify rating and recent performance, and follow a source link to the original profile. Respect profile privacy, unavailable players and missing matches; never substitute example scores for real results.

Before release:

- Confirm available fields, authentication, rate limits and permitted caching against the official API documentation: https://api-public-docs.cs-prod.leetify.com/.
- Keep the Leetify API key in a server-side secret, never in the static website or public market feed. Establish hosting/quota requirements before provisioning a backend.
- Preserve metric names and scales. Display the required unmodified attribution logo and source links according to https://leetify.com/blog/leetify-api-developer-guidelines/amp/.
- Obtain the player's explicit choice before storing a Steam identifier with their CSKit account. Add per-user access rules and removal controls.
- Test private profiles, missing data, expired credentials, rate limits and upstream outages. Show freshness and an honest unavailable state.

CSKit is an independent project and is not endorsed by Leetify or Valve.

# Search readiness

The site includes crawlable static descriptions, canonical URLs, WebSite/Organization structured data, a square 96px favicon, Apple touch icon, social preview, robots.txt and a sitemap. Search engines decide when to crawl and display changes; rankings are not guaranteed. In Google Search Console, verify cskit.site and submit https://cskit.site/sitemap.xml to monitor indexing.
