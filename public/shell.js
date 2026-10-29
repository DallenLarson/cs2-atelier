const routes = [
  ["/dashboard", "Dashboard", "⌂"],
  ["/studio", "Studio", "⌘"],
  ["/performance", "Your Performance", "▥"],
  ["/improve", "Improve", "↗"],
  ["/experiments", "Experiments", "⇄"],
  ["/maps", "Maps", "◎"],
  ["/market", "Market", "◈"],
  ["/market#wishlist", "Wishlist", "♡"],
  ["/tools", "Tools", "⊞"],
  ["/community", "Community", "◌"],
  ["/updates", "Updates", "↻"],
];
const nav = document.querySelector("aside nav");
const route = location.pathname === "/" ? "/dashboard" : location.pathname.replace(/\.html$/, "");
if (nav) {
  const marketControls = nav.querySelector("[data-view]")
    ? [...nav.querySelectorAll("[data-view]")]
    : [];
  nav.setAttribute("aria-label", "Main navigation");
  nav.replaceChildren(
    ...routes.map(([href, name, icon]) => {
      const a = document.createElement("a");
      a.className = "nav";
      a.href = href;
      if (
        marketControls.length &&
        ["/market", "/market#wishlist"].includes(href)
      ) {
        const control = marketControls.find(
          (b) => b.dataset.view === (href.includes("#") ? "wishlist" : "all"),
        );
        a.onclick = (e) => {
          e.preventDefault();
          location.hash = href.includes("#") ? "wishlist" : "";
          control?.click();
          nav.querySelectorAll("a").forEach((link) => {
            const active = link === a;
            link.classList.toggle("active", active);
            if (active) link.setAttribute("aria-current", "page");
            else link.removeAttribute("aria-current");
          });
        };
      }
      a.innerHTML = `<span aria-hidden="true">${icon}</span><span class="nav-text">${name}</span>`;
      if (href === route) {
        a.classList.add("active");
        a.setAttribute("aria-current", "page");
      }
      return a;
    }),
  );
  if (marketControls.length) {
    const legacy = document.createElement("div");
    legacy.hidden = true;
    legacy.append(...marketControls);
    nav.after(legacy);
  }
}
const header = document.querySelector("main header");
if (header) {
  const menu = document.createElement("button");
  menu.className = "shell-menu";
  menu.textContent = "☰";
  menu.setAttribute("aria-label", "Toggle navigation");
  menu.setAttribute("aria-expanded", "false");
  menu.onclick = () => {
    const on = document.body.classList.toggle("nav-open");
    menu.setAttribute("aria-expanded", String(on));
  };
  header.prepend(menu);
  const search = document.createElement("button");
  search.className = "shell-search";
  search.innerHTML = "Search tools <kbd>Ctrl K</kbd>";
  header.append(search);
  const dialog = document.createElement("dialog");
  dialog.className = "command-palette";
  dialog.setAttribute("aria-labelledby", "palette-heading");
  dialog.innerHTML =
    '<div class="palette-top"><h2 id="palette-heading">Where to next?</h2><button type="button" aria-label="Close search">×</button></div><label for="tool-search">Search CSKit tools</label><input id="tool-search" type="search" placeholder="Crosshair, practice, wishlist…" autocomplete="off"/><div class="palette-results"></div>';
  document.body.append(dialog);
  const input = dialog.querySelector("input"),
    results = dialog.querySelector(".palette-results");
  const items = [
    ...routes,
    ["/tools#sensitivity", "Sensitivity · eDPI and cm/360", "↔"],
    ["/studio", "Config import and export", "⌘"],
    ["/improve?focus=Utility", "Utility practice", "↗"],
  ];
  const render = () => {
    results.replaceChildren(
      ...items
        .filter((x) => x[1].toLowerCase().includes(input.value.toLowerCase()))
        .map(([href, name]) => {
          const a = document.createElement("a");
          a.href = href;
          a.textContent = name + " →";
          return a;
        }),
    );
    if (!results.children.length)
      results.textContent = "No tools found. Try “Studio” or “practice”.";
  };
  search.onclick = () => {
    render();
    dialog.showModal();
    input.focus();
  };
  input.oninput = render;
  dialog.querySelector("button").onclick = () => dialog.close();
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      search.click();
    }
    if (e.key === "Escape") {
      document.body.classList.remove("nav-open");
      menu.setAttribute("aria-expanded", "false");
    }
  });
}

// Mobile navigation uses the same destinations and state as the desktop shell.
const mobileViewport = matchMedia("(max-width: 760px)");
const mobileNav = document.createElement("nav");
mobileNav.className = "mobile-tabs";
mobileNav.setAttribute("aria-label", "Mobile navigation");
const tabPaths = [
  ["/dashboard", "Home", "M3 10 12 3l9 7v11h-6v-7H9v7H3Z"],
  ["/market", "Market", "M3 7h18l-2 14H5L3 7Zm4 0V5a5 5 0 0 1 10 0v2"],
  ["/studio", "Studio", "M4 7h16M4 17h16M9 3v8M15 13v8"],
  ["/performance", "Stats", "M5 21V11M12 21V3M19 21V7"],
];
const glyph = (path) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
for (const [href, label, path] of tabPaths) {
  const a = document.createElement("a");
  a.href = href;
  a.innerHTML = glyph(path) + `<span>${label}</span>`;
  if (href === route) a.setAttribute("aria-current", "page");
  mobileNav.append(a);
}
const moreTab = document.createElement("button");
moreTab.type = "button";
moreTab.innerHTML = glyph("M4 6h16M4 12h16M4 18h16") + "<span>More</span>";
moreTab.setAttribute("aria-haspopup", "dialog");
mobileNav.append(moreTab);
document.body.append(mobileNav);
const sheet = document.createElement("dialog");
sheet.className = "mobile-sheet";
sheet.setAttribute("aria-labelledby", "mobile-sheet-title");
sheet.innerHTML = '<div class="mobile-sheet-heading"><div><small>YOUR COUNTER-STRIKE TOOLKIT</small><h2 id="mobile-sheet-title">Explore CSKit</h2></div><button type="button" aria-label="Close navigation">×</button></div><nav aria-label="All tools"></nav>';
for (const [href, label, icon] of [...routes, ["/account", "Account & data", "○"]]) {
  const a = document.createElement("a");
  a.href = href;
  a.innerHTML = `<span aria-hidden="true">${icon}</span><span>${label}</span><span aria-hidden="true">›</span>`;
  if (href === route) a.setAttribute("aria-current", "page");
  sheet.querySelector("nav").append(a);
}
document.body.append(sheet);
const closeSheet = () => sheet.close();
moreTab.onclick = () => sheet.showModal();
sheet.querySelector("button").onclick = closeSheet;
sheet.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeSheet();
  if (event.target === sheet) {
    const rect = sheet.getBoundingClientRect();
    if (event.clientY < rect.top || event.clientX < rect.left || event.clientX > rect.right) closeSheet();
  }
});
const resetMobile = () => {
  if (!mobileViewport.matches && sheet.open) closeSheet();
  if (mobileViewport.matches) {
    document.body.classList.remove("nav-open");
    document.querySelector(".shell-menu")?.setAttribute("aria-expanded", "false");
  }
};
mobileViewport.addEventListener("change", resetMobile);
resetMobile();
