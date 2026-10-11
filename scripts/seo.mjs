export const pages = {
  "about.html": [
    "/about",
    "About CSKit — Independent Free Counter-Strike Tools",
    "Learn about CSKit, the independent free Counter-Strike 2 toolkit, its data sources, limitations and public source code.",
  ],
  "privacy.html": [
    "/privacy",
    "Your Data & Privacy — CSKit",
    "How CSKit stores guest and account data, handles public player lookups and lets you export or remove your saved workspace records.",
  ],
  "hub.html": [
    "/",
    "CSKit — Free CS2 Tools, Config Builder & Practice Planner",
    "Your free Counter-Strike 2 toolkit. Build configs and crosshairs, check Leetify stats, plan practice, compare setups and track skin prices.",
  ],
  "dashboard.html": [
    "/",
    "CSKit — Your Free Counter-Strike 2 Workspace",
    "Keep your CS2 builds, practice plans, experiments and skin watchlist together in one free, private workspace.",
  ],
  "studio.html": [
    "/studio",
    "CS2 Crosshair & Config Builder — CSKit Loadout Studio",
    "Build and preview CS2 crosshairs, viewmodels, sensitivity and keybinds. Save named setups and export validated autoexec configs for free.",
  ],
  "index.html": [
    "/market",
    "CS2 Skin Prices & Wishlist Tracker — CSKit",
    "Browse Counter-Strike 2 skins, compare current Skinport listing prices and save exact item variants with personal price targets.",
  ],
  "performance.html": [
    "/performance",
    "CS2 Leetify Rating & Player Stats Lookup — CSKit",
    "Look up available Leetify ratings, aim, positioning, utility and recent CS2 match results. See provider attribution and find your next practice focus.",
  ],
  "improve.html": [
    "/improve",
    "CS2 Practice Planner & Training Drills — CSKit",
    "Build free 10, 20, 30 or 60-minute CS2 practice plans. Work on aim, movement, positioning, utility and teamplay, and record your observations.",
  ],
  "experiments.html": [
    "/experiments",
    "Compare CS2 Settings with Personal Experiments — CSKit",
    "Compare two saved CS2 setups with locked config snapshots and manually logged practice results. Keep evidence and recover your original settings.",
  ],
  "maps.html": [
    "/maps",
    "Dust II Map Explorer & Practice Reference — CSKit",
    "Explore the Dust II radar overview, zoom and pan, save your map favorite and build a utility practice routine in CSKit.",
  ],
  "tools.html": [
    "/tools",
    "CS2 eDPI & cm/360 Sensitivity Calculator — CSKit",
    "Calculate CS2 eDPI, cm/360, inches/360 and mousepad travel with explicit assumptions. Compare display aspect ratios and find free CS2 tools.",
  ],
  "updates.html": [
    "/updates",
    "CSKit Release Notes & Counter-Strike Update Sources",
    "See what is new in CSKit, which features are available and what is planned. Find direct links to official Counter-Strike release notes.",
  ],
  "community.html": [
    "/community",
    "CSKit Community Roadmap & Config Sharing",
    "Export and exchange CS2 config files yourself. See the roadmap for opt-in public profiles, shared setups and squads.",
  ],
  "account.html": [
    "/account",
    "Your CSKit Account & Data",
    "Manage your optional CSKit Google sign-in, export your wishlist and Studio builds, or keep using the toolkit as a local guest.",
  ],
};
const escape = (s) =>
  s.replace(
    /[&"<>]/g,
    (c) => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c],
  );
export function applySeo(html, file) {
  const entry = pages[file];
  if (!entry) return html;
  const [route, title, description] = entry,
    url = "https://cskit.site" + route;
  html = html
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .replace(
      /<meta\b[^>]*(?:name|property)="(?:description|robots|theme-color|og:[^"]+|twitter:[^"]+)"[^>]*>/gi,
      "",
    )
    .replace(/<link\b[^>]*rel="canonical"[^>]*>/gi, "")
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
  const image = "https://cskit.site/social-cskit-v2.png";
  const graph = [
    {
      "@type": "Organization",
      "@id": "https://cskit.site/#organization",
      name: "CSKit",
      url: "https://cskit.site/",
      logo: "https://cskit.site/cskit-icon-dark.png",
      sameAs: ["https://github.com/DallenLarson/cs2-atelier"],
    },
    {
      "@type": "WebSite",
      "@id": "https://cskit.site/#website",
      name: "CSKit",
      alternateName: "CSKit.site",
      url: "https://cskit.site/",
      description: pages["hub.html"][2],
      publisher: { "@id": "https://cskit.site/#organization" },
    },
    {
      "@type": "WebPage",
      "@id": url + "#page",
      url,
      name: title,
      description,
      isPartOf: { "@id": "https://cskit.site/#website" },
    },
  ];
  const metadata = `<title>${escape(title)}</title><meta name="description" content="${escape(description)}"/><link rel="canonical" href="${url}"/><meta name="robots" content="${file === "account.html" || file === "community.html" ? "noindex,follow" : "index,follow,max-image-preview:large"}"/><meta name="theme-color" content="#0B0F11"/><meta property="og:type" content="website"/><meta property="og:site_name" content="CSKit"/><meta property="og:locale" content="en_US"/><meta property="og:title" content="${escape(title)}"/><meta property="og:description" content="${escape(description)}"/><meta property="og:url" content="${url}"/><meta property="og:image" content="${image}"/><meta property="og:image:secure_url" content="${image}"/><meta property="og:image:type" content="image/png"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/><meta property="og:image:alt" content="CSKit — Your free Counter-Strike toolkit. Setup, stats, practice and skins."/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="${escape(title)}"/><meta name="twitter:description" content="${escape(description)}"/><meta name="twitter:image" content="${image}"/><meta name="twitter:image:alt" content="CSKit — Your free Counter-Strike toolkit"/><script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}</script>`;
  return html.replace("</head>", metadata + "</head>");
}
