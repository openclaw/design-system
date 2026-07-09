const tokenDefinitions = [
  ["Page", "--oc-bg-page"],
  ["Surface", "--oc-bg-surface"],
  ["Elevated", "--oc-bg-elevated"],
  ["Primary text", "--oc-text-primary"],
  ["Secondary text", "--oc-text-secondary"],
  ["Muted text", "--oc-text-muted"],
  ["Primary accent", "--oc-accent-primary"],
  ["Accent hover", "--oc-accent-primary-hover"],
  ["Secondary accent", "--oc-accent-secondary"],
];

const root = document.documentElement;
const tokenGrid = document.querySelector("[data-token-grid]");
const themeButtons = document.querySelectorAll("[data-theme-choice]");
const dialog = document.querySelector("dialog");
const dialogTrigger = document.querySelector("[data-open-dialog]");
const previewNavLinks = document.querySelectorAll("[data-preview-link]");
const previewSections = [...document.querySelectorAll("[data-preview-section]")];
const previewContextTitle = document.querySelector("[data-preview-context-title]");
const previewContextMeta = document.querySelector("[data-preview-context-meta]");

function renderTokens() {
  const styles = getComputedStyle(root);
  tokenGrid.replaceChildren(
    ...tokenDefinitions.map(([label, variable]) => {
      const value = styles.getPropertyValue(variable).trim();
      const swatch = document.createElement("div");
      swatch.className = "swatch";
      swatch.innerHTML = `
        <div class="swatch-color" style="--swatch: ${value}"></div>
        <div class="swatch-meta">
          <strong>${label}</strong>
          <code>${variable} · ${value}</code>
        </div>
      `;
      return swatch;
    }),
  );
}

function setTheme(theme) {
  root.dataset.theme = theme;
  localStorage.setItem("openclaw-preview-theme", theme);
  renderTokens();
}

for (const button of themeButtons) {
  button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
}

dialogTrigger.addEventListener("click", () => dialog.showModal());

function setActivePreviewSection(section) {
  const target = section.id ? `#${section.id}` : null;

  for (const link of previewNavLinks) {
    const active = target && link.getAttribute("href") === target;
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }

  if (previewContextTitle) {
    previewContextTitle.textContent = section.dataset.previewTitle || "Overview";
  }

  if (previewContextMeta) {
    previewContextMeta.textContent = section.dataset.previewMeta || "OpenClaw design system";
  }
}

function syncPreviewNavigation() {
  const focusLine = window.innerHeight * 0.32;
  const activeSection = previewSections.reduce(
    (active, section) => (section.getBoundingClientRect().top <= focusLine ? section : active),
    previewSections[0],
  );

  if (activeSection) setActivePreviewSection(activeSection);
}

if (previewSections.length > 0) {
  let pendingSync = false;
  const scheduleNavigationSync = () => {
    if (pendingSync) return;
    pendingSync = true;
    requestAnimationFrame(() => {
      pendingSync = false;
      syncPreviewNavigation();
    });
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(scheduleNavigationSync, {
      rootMargin: "-18% 0px -64% 0px",
      threshold: [0, 0.2, 0.8],
    });
    for (const section of previewSections) observer.observe(section);
  }

  window.addEventListener("scroll", scheduleNavigationSync, { passive: true });
  window.addEventListener("resize", scheduleNavigationSync);
  scheduleNavigationSync();
}

renderTokens();
