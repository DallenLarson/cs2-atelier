const routes = [
  ["/dashboard", "Dashboard", "⌂"],
  ["/studio", "Studio", "⌘"],
  ["/performance", "Performance", "▥"],
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
const route = location.pathname === "/" ? "/dashboard" : location.pathname;
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
