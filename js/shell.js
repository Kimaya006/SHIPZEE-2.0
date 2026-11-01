// The frame around every screen inside the app: the green top bar and the
// tabs (bottom bar on phones, sidebar on wide screens).
//
// A page calls startPage() once. It runs the guard, builds the frame for the
// user's role, then runs the page's own code. Adding a screen later means
// adding one line to TABS below plus one new page.

import { requireRole } from "./guard.js";
import { dashboardFor } from "./routes.js";

// Simple line icons. These strings are written by us and never contain user
// input, which is the only reason it is safe to put them in with innerHTML.
const ICON_START =
  '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';

const ICONS = {
  home: ICON_START + '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  post: ICON_START + '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
  trips:
    ICON_START +
    '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>',
  requests:
    ICON_START + '<path d="M3 13l3-8h12l3 8"/><path d="M3 13v6h18v-6h-5l-2 3h-4l-2-3z"/></svg>',
  search: ICON_START + '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/></svg>',
  parcels:
    ICON_START + '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
  profile: ICON_START + '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>'
};

const TABS = {
  driver: [
    { key: "home", label: "Home", href: "driver-home.html", icon: "home" },
    { key: "post", label: "Post trip", href: "driver-post.html", icon: "post" },
    { key: "trips", label: "My trips", href: "driver-trips.html", icon: "trips" },
    { key: "requests", label: "Requests", href: "driver-requests.html", icon: "requests" },
    { key: "profile", label: "Profile", href: "profile.html", icon: "profile" }
  ],
  sender: [
    { key: "search", label: "Find a driver", href: "sender-search.html", icon: "search" },
    { key: "parcels", label: "My parcels", href: "sender-parcels.html", icon: "parcels" },
    { key: "profile", label: "Profile", href: "profile.html", icon: "profile" }
  ]
};

function buildTopbar(profile) {
  const bar = document.createElement("header");
  bar.className = "topbar";

  const brand = document.createElement("a");
  brand.className = "brand";
  brand.href = dashboardFor(profile.role);

  const logo = document.createElement("img");
  logo.src = "assets/logo.svg";
  logo.alt = "";
  logo.width = 30;
  logo.height = 30;

  const name = document.createElement("span");
  name.textContent = "Shipzee";
  brand.append(logo, name);

  const right = document.createElement("div");
  right.className = "topbar-right";

  const pill = document.createElement("span");
  pill.className = "role-pill";
  pill.textContent = profile.role === "driver" ? "Driver" : "Sender";

  const avatar = document.createElement("a");
  avatar.className = "avatar";
  avatar.href = "profile.html";
  avatar.setAttribute("aria-label", "Your profile");
  avatar.textContent = profile.name.trim().charAt(0).toUpperCase();

  right.append(pill, avatar);
  bar.append(brand, right);
  return bar;
}

function buildTabbar(role, activeKey) {
  const nav = document.createElement("nav");
  nav.className = "tabbar";
  nav.setAttribute("aria-label", "Main");

  for (const tab of TABS[role]) {
    const link = document.createElement("a");
    link.className = "tab";
    link.href = tab.href;

    // aria-current tells screen readers which page you are on.
    if (tab.key === activeKey) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }

    const icon = document.createElement("span");
    icon.className = "tab-icon";
    icon.innerHTML = ICONS[tab.icon];

    const label = document.createElement("span");
    label.textContent = tab.label;

    link.append(icon, label);
    nav.appendChild(link);
  }

  return nav;
}

// role: "driver", "sender" or "any" (pages both roles can open, like Profile).
// tab: which tab to highlight.
export function startPage({ role, tab }, onReady) {
  requireRole(role, (profile, user) => {
    const app = document.getElementById("app");
    app.prepend(buildTopbar(profile));
    app.append(buildTabbar(profile.role, tab));
    onReady(profile, user);
  });
}
