export function setCurrentSidebarLink(nav, current) {
  if (!nav || !current) return false;

  for (const link of nav.querySelectorAll(".oc-sidebar-link")) {
    if (link === current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }

  return true;
}

export function setSidebarDisclosure(toggle, panel, expanded) {
  if (!toggle || !panel) return false;
  toggle.setAttribute("aria-expanded", String(expanded));
  panel.hidden = !expanded;
  return true;
}

function setSidebarCollapseIcon(toggle, collapsed) {
  if (!toggle) return;
  const icon = collapsed ? "panel-left-open" : "panel-left-close";
  toggle.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>`;
  toggle.ownerDocument?.defaultView?.lucide?.createIcons({
    root: toggle,
    attrs: {
      "aria-hidden": "true",
      "stroke-width": "1.75",
    },
  });
}

export function setSidebarCollapsed(sidebar, toggle, collapsed) {
  if (!sidebar || !toggle) return false;
  sidebar.setAttribute("data-collapsed", String(collapsed));
  toggle.setAttribute("aria-expanded", String(!collapsed));
  toggle.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
  setSidebarCollapseIcon(toggle, collapsed);

  if (collapsed) {
    const workspaceToggle = sidebar.querySelector("[data-sidebar-workspace-toggle]");
    const workspaceMenu = sidebar.querySelector("[data-sidebar-workspace-menu]");
    setSidebarDisclosure(workspaceToggle, workspaceMenu, false);
  }
  return true;
}

export function setSidebarWorkspace(sidebar, option) {
  if (!sidebar || !option) return false;
  const name = option.getAttribute("data-sidebar-workspace-name");
  const description = option.getAttribute("data-sidebar-workspace-description");
  const initials = option.getAttribute("data-sidebar-workspace-initials");
  if (!name || !description || !initials) return false;

  for (const candidate of sidebar.querySelectorAll("[data-sidebar-workspace-option]")) {
    candidate.setAttribute("aria-pressed", String(candidate === option));
  }

  const title = sidebar.querySelector("[data-sidebar-workspace-title]");
  const subtitle = sidebar.querySelector("[data-sidebar-workspace-subtitle]");
  const avatar = sidebar.querySelector("[data-sidebar-workspace-avatar]");
  const fallback = sidebar.querySelector("[data-sidebar-workspace-avatar] .oc-avatar-fallback");
  if (title) title.textContent = name;
  if (subtitle) subtitle.textContent = description;
  if (avatar) avatar.setAttribute("aria-label", `${name} workspace`);
  if (fallback) fallback.textContent = initials;
  return true;
}

export function bindSidebars(root = document) {
  const sidebars = [...root.querySelectorAll(".oc-sidebar")];

  for (const sidebar of sidebars) {
    const nav = sidebar.querySelector(".oc-sidebar-nav");
    nav?.addEventListener("click", (event) => {
      const link = event.target.closest?.(".oc-sidebar-link");
      if (link && nav.contains(link)) setCurrentSidebarLink(nav, link);
    });

    const workspaceToggle = sidebar.querySelector("[data-sidebar-workspace-toggle]");
    const workspaceMenu = sidebar.querySelector("[data-sidebar-workspace-menu]");
    workspaceToggle?.addEventListener("click", () => {
      setSidebarDisclosure(
        workspaceToggle,
        workspaceMenu,
        workspaceToggle.getAttribute("aria-expanded") !== "true",
      );
    });
    for (const option of sidebar.querySelectorAll("[data-sidebar-workspace-option]")) {
      option.addEventListener("click", () => {
        setSidebarWorkspace(sidebar, option);
        setSidebarDisclosure(workspaceToggle, workspaceMenu, false);
        workspaceToggle?.focus();
      });
    }

    for (const toggle of sidebar.querySelectorAll("[data-sidebar-group-toggle]")) {
      const group = toggle.closest("[data-sidebar-group]");
      const panel = group?.querySelector("[data-sidebar-group-panel]");
      toggle.addEventListener("click", () => {
        setSidebarDisclosure(toggle, panel, toggle.getAttribute("aria-expanded") !== "true");
      });
    }

    const collapse = sidebar.querySelector("[data-sidebar-collapse]");
    collapse?.addEventListener("click", () => {
      setSidebarCollapsed(sidebar, collapse, sidebar.getAttribute("data-collapsed") !== "true");
    });

    sidebar.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || workspaceToggle?.getAttribute("aria-expanded") !== "true") {
        return;
      }
      setSidebarDisclosure(workspaceToggle, workspaceMenu, false);
      workspaceToggle.focus();
    });
  }

  return sidebars.length;
}
