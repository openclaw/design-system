import { getReferenceArea, getReferencePage, referenceAreas } from "./navigation.js";

function hrefFor(path) {
  return `${document.body.dataset.previewRoot || "./"}${path}`;
}

function renderThemeControl() {
  return `
    <div class="oc-segmented theme-control" role="group" aria-label="Color theme">
      <button class="oc-segmented-item" type="button" data-theme-choice="light" aria-pressed="false">Light</button>
      <button class="oc-segmented-item" type="button" data-theme-choice="dark" aria-pressed="true">Dark</button>
    </div>
  `;
}

function renderTopbar() {
  const mount = document.querySelector("[data-shell-header]");
  if (!mount) return;

  mount.outerHTML = `
    <header class="topbar">
      <button class="mobile-nav-trigger" type="button" data-open-navigation aria-label="Open navigation">
        <span></span><span></span>
      </button>
      <a class="brand" href="${hrefFor("")}" aria-label="OpenClaw design system overview">
        <img class="brand-mark" src="https://openclaw.ai/favicon.svg" alt="" />
        <span class="brand-wordmark">OpenClaw</span>
        <span class="brand-context">Design System</span>
      </a>
      <div class="topbar-actions">
        <a class="github-link" href="https://github.com/openclaw/design-system" rel="noreferrer">GitHub</a>
        ${renderThemeControl()}
      </div>
    </header>
  `;
}

function renderSidebar() {
  const mount = document.querySelector("[data-shell-sidebar]");
  if (!mount) return;

  const currentId = document.body.dataset.previewPage || document.body.dataset.previewRoute;
  const currentArea = getReferenceArea(currentId);
  const areas = referenceAreas
    .map((area) => {
      const activeArea = currentArea?.id === area.id;
      const children = activeArea
        ? `<div class="sidebar-pages">${area.pages
            .map(
              (page) => `
                <a href="${hrefFor(page.path)}"${page.id === currentId ? ' aria-current="page"' : ""}>
                  ${page.label}
                </a>`,
            )
            .join("")}</div>`
        : "";

      return `
        <div class="sidebar-area${activeArea ? " is-active" : ""}">
          <a class="sidebar-area-link" href="${hrefFor(area.path)}"${area.id === currentId ? ' aria-current="page"' : ""}>
            <span>${area.label}</span>
          </a>
          ${children}
        </div>
      `;
    })
    .join("");

  mount.outerHTML = `
    <aside class="sidebar" data-navigation>
      <div class="sidebar-heading">
        <p class="eyebrow">Reference</p>
        <button class="mobile-nav-close" type="button" data-close-navigation aria-label="Close navigation">×</button>
      </div>
      <nav aria-label="Design system reference">${areas}</nav>
      <div class="version"><span>Release</span><strong>v0.0.1</strong></div>
    </aside>
  `;
}

function renderPageContext() {
  const currentId = document.body.dataset.previewPage || document.body.dataset.previewRoute;
  const page = getReferencePage(currentId);
  const area = getReferenceArea(currentId);
  const title = document.querySelector("[data-preview-context-title]");
  const meta = document.querySelector("[data-preview-context-meta]");

  if (title && page) title.textContent = page.label;
  if (meta && area) meta.textContent = area.label;
}

function bindNavigation() {
  const navigation = document.querySelector("[data-navigation]");
  const open = document.querySelector("[data-open-navigation]");
  const close = document.querySelector("[data-close-navigation]");
  if (!navigation || !open || !close) return;

  const setOpen = (value) => {
    navigation.classList.toggle("is-open", value);
    open.setAttribute("aria-expanded", String(value));
    document.body.classList.toggle("navigation-open", value);
  };

  open.addEventListener("click", () => setOpen(true));
  close.addEventListener("click", () => setOpen(false));
  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
}

export function renderShell() {
  renderTopbar();
  renderSidebar();
  renderPageContext();
  bindNavigation();
}
