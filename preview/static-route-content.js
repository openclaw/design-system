import homeHtml from "./index.html?raw";
import foundationsHtml from "./foundations/index.html?raw";
import interfaceHtml from "./interface/index.html?raw";
import compositionsHtml from "./compositions/index.html?raw";
import resourcesHtml from "./resources/index.html?raw";
import homeArtworkUrl from "./assets/carapace-home-artwork.avif?url";

const staticRoutes = new Map([
  ["overview", { html: homeHtml, path: "" }],
  ["foundations", { html: foundationsHtml, path: "foundations/" }],
  ["interface", { html: interfaceHtml, path: "interface/" }],
  ["compositions", { html: compositionsHtml, path: "compositions/" }],
  ["resources", { html: resourcesHtml, path: "resources/" }],
]);

function rewriteUrl(value, pageUrl) {
  if (!value || value.startsWith("data:") || value.startsWith("blob:")) return value;
  return new URL(value, pageUrl).href;
}

export function getStaticRouteContent(pageId, siteRoot) {
  const route = staticRoutes.get(pageId);
  if (!route) return null;

  const pageUrl = new URL(route.path, siteRoot);
  const parsed = new DOMParser().parseFromString(route.html, "text/html");
  const main = parsed.querySelector("main.preview-main");
  if (!main) return null;

  main.querySelector(".canvas-header")?.remove();
  for (const element of main.querySelectorAll("[href], [src]")) {
    if (element.hasAttribute("href")) {
      element.setAttribute("href", rewriteUrl(element.getAttribute("href"), pageUrl));
    }
    if (element.hasAttribute("src")) {
      const source = element.getAttribute("src");
      element.setAttribute(
        "src",
        source === "./assets/carapace-home-artwork.avif"
          ? homeArtworkUrl
          : rewriteUrl(source, pageUrl),
      );
    }
  }

  return main.innerHTML;
}

export function hasStaticRouteContent(pageId) {
  return staticRoutes.has(pageId);
}
