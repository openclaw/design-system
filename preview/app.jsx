import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { getReferenceArea, getReferencePage, introductionPage } from "./navigation.js";
import { mountPage } from "./page-lifecycle.js";
import { ReactShell } from "./react-shell.jsx";
import {
  createPreviewHistoryState,
  readPreviewHistoryState,
  resolvePreviewRoute,
  resolvePreviewSiteRoot,
  shouldInterceptPreviewLink,
  updatePreviewHistoryScroll,
} from "./router.js";
import { getStaticRouteContent } from "./static-route-content.js";

let referenceRuntimePromise;
const previewHistoryEntryKey = "carapacePreviewEntry";
const previewScrollStoragePrefix = "carapacePreviewScroll:";

function readPersistedScrollPosition(entryId) {
  if (!entryId) return null;
  try {
    const position = JSON.parse(
      window.sessionStorage.getItem(`${previewScrollStoragePrefix}${entryId}`),
    );
    if (!Number.isFinite(position?.scrollX) || !Number.isFinite(position?.scrollY)) return null;
    return position;
  } catch {
    return null;
  }
}

function persistScrollPosition(entryId, position) {
  if (!entryId) return;
  try {
    window.sessionStorage.setItem(
      `${previewScrollStoragePrefix}${entryId}`,
      JSON.stringify(position),
    );
  } catch {
    // History restoration remains available in memory when storage is unavailable.
  }
}

function clearPersistedScrollPosition(entryId) {
  if (!entryId) return;
  try {
    window.sessionStorage.removeItem(`${previewScrollStoragePrefix}${entryId}`);
  } catch {
    // Ignore restricted storage; the stale entry is scoped to this browser session.
  }
}

function loadReferenceRuntime() {
  referenceRuntimePromise ??= import("./reference-runtime.js").catch((error) => {
    referenceRuntimePromise = undefined;
    throw error;
  });
  return referenceRuntimePromise;
}

function routeLabel(pageId) {
  if (pageId === introductionPage.id) return "Carapace";
  const page = getReferencePage(pageId);
  const area = getReferenceArea(pageId);
  return page?.id === area?.id ? area.label : page?.label || "Carapace";
}

function updateDocumentMetadata(pageId, path) {
  const label = routeLabel(pageId);
  const canonicalUrl = new URL(path, "https://carapace.design/");

  document.title = label === "Carapace" ? label : `${label} · Carapace`;
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", canonicalUrl.href);
  document.querySelector('meta[property="og:url"]')?.setAttribute("content", canonicalUrl.href);
  document.body.dataset.previewPage = pageId;
  document.body.dataset.previewRoute = getReferenceArea(pageId)?.id || pageId;
}

function scrollToHash(hash) {
  if (!hash) return false;
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    // An invalid escape is not a valid in-page destination.
  }
  const target = document.getElementById(id);
  if (!target) return false;
  target.scrollIntoView();
  return true;
}

function RouteView({ route, siteRoot, navigation }) {
  const routeRootRef = useRef(null);
  const [referenceLoadError, setReferenceLoadError] = useState(null);
  const [referenceLoadAttempt, setReferenceLoadAttempt] = useState(0);
  const staticContent = useMemo(
    () => getStaticRouteContent(route.pageId, siteRoot),
    [route.pageId, siteRoot],
  );

  useEffect(() => {
    updateDocumentMetadata(route.pageId, route.path);
    const root = routeRootRef.current;
    if (!root) return undefined;
    let lifecycle;
    let disposed = false;
    const refreshTheme = (event) => lifecycle?.refreshTheme(event.detail?.theme);
    window.addEventListener("previewthemechange", refreshTheme);
    setReferenceLoadError(null);
    const finishMount = () => {
      if (disposed) return;
      lifecycle = mountPage(root, { pageId: route.pageId });
    };
    if (staticContent === null) {
      void loadReferenceRuntime().then(({ mountReferenceRuntime }) => {
        if (disposed) return;
        mountReferenceRuntime(root, route.pageId);
        finishMount();
        scrollToHash(route.hash);
      }).catch((error) => {
        if (disposed) return;
        setReferenceLoadError(error);
      });
    } else {
      finishMount();
    }
    return () => {
      disposed = true;
      window.removeEventListener("previewthemechange", refreshTheme);
      lifecycle?.cleanup();
    };
  }, [referenceLoadAttempt, route.pageId, route.path, staticContent]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (navigation.kind === "restore") {
        window.scrollTo(navigation.scrollX, navigation.scrollY);
        return;
      }
      if (!scrollToHash(route.hash)) window.scrollTo(0, 0);
      if (navigation.kind === "push") {
        document.getElementById("main-content")?.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [navigation, route.hash]);

  return staticContent === null ? (
    <div className="preview-route-content" ref={routeRootRef}>
      {referenceLoadError ? (
        <section className="reference-runtime-error" role="alert">
          <strong>Reference preview failed to load.</strong>
          <span>The component runtime may be temporarily unavailable.</span>
          <button type="button" onClick={() => setReferenceLoadAttempt((attempt) => attempt + 1)}>
            Retry
          </button>
        </section>
      ) : (
        <div className="page-layout">
          <article className="preview-stage reference-page" data-reference-content />
        </div>
      )}
    </div>
  ) : (
    <div
      className="preview-route-content"
      ref={routeRootRef}
      dangerouslySetInnerHTML={{ __html: staticContent }}
    />
  );
}

function PreviewApp({ initialRoute, siteRoot }) {
  const [entry, setEntry] = useState(() => ({
    route: initialRoute,
    navigation: { kind: "initial", sequence: 0, scrollX: 0, scrollY: 0 },
  }));
  const entryRef = useRef(entry);
  const historySessionRef = useRef(Date.now().toString(36));
  const historyEntrySequenceRef = useRef(0);
  const currentHistoryEntryRef = useRef("");
  const scrollPositionsRef = useRef(new Map());
  entryRef.current = entry;

  const nextHistoryEntryId = useCallback(() => {
    historyEntrySequenceRef.current += 1;
    return `${historySessionRef.current}-${historyEntrySequenceRef.current}`;
  }, []);

  const saveCurrentScroll = useCallback(() => {
    const current = entryRef.current.route;
    const existing = readPreviewHistoryState(window.history.state);
    if (
      existing?.pageId === current.pageId
      && existing.hash === current.hash
      && existing.scrollX === window.scrollX
      && existing.scrollY === window.scrollY
    ) {
      scrollPositionsRef.current.delete(currentHistoryEntryRef.current);
      clearPersistedScrollPosition(currentHistoryEntryRef.current);
      return;
    }
    const state = existing
      ? updatePreviewHistoryScroll(window.history.state, window.scrollX, window.scrollY)
      : createPreviewHistoryState(
        current.pageId,
        { hash: current.hash, scrollX: window.scrollX, scrollY: window.scrollY },
        window.history.state,
      );
    window.history.replaceState(state, "", window.location.href);
    scrollPositionsRef.current.delete(currentHistoryEntryRef.current);
    clearPersistedScrollPosition(currentHistoryEntryRef.current);
  }, []);

  const navigate = useCallback((href) => {
    const target = resolvePreviewRoute(href, siteRoot);
    if (!target) return false;

    const current = entryRef.current.route;
    if (target.href === current.href) {
      if (!scrollToHash(target.hash)) window.scrollTo(0, 0);
      return true;
    }

    saveCurrentScroll();
    const historyEntryId = nextHistoryEntryId();
    window.history.pushState(
      createPreviewHistoryState(
        target.pageId,
        { hash: target.hash },
        { [previewHistoryEntryKey]: historyEntryId },
      ),
      "",
      target.href,
    );
    currentHistoryEntryRef.current = historyEntryId;
    const nextEntry = {
      route: target,
      navigation: {
        kind: "push",
        sequence: entryRef.current.navigation.sequence + 1,
        scrollX: 0,
        scrollY: 0,
      },
    };
    entryRef.current = nextEntry;
    setEntry(nextEntry);
    return true;
  }, [nextHistoryEntryId, saveCurrentScroll, siteRoot]);

  useEffect(() => {
    const previousRestoration = window.history.scrollRestoration;
    const initialHistoryEntryId =
      typeof window.history.state?.[previewHistoryEntryKey] === "string"
        ? window.history.state[previewHistoryEntryKey]
        : nextHistoryEntryId();
    currentHistoryEntryRef.current = initialHistoryEntryId;
    window.history.scrollRestoration = "manual";
    window.history.replaceState(
      createPreviewHistoryState(
        initialRoute.pageId,
        {
          hash: initialRoute.hash,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        },
        {
          ...window.history.state,
          [previewHistoryEntryKey]: initialHistoryEntryId,
        },
      ),
      "",
      initialRoute.href,
    );

    const handleClick = (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const anchor = target?.closest("a[href]");
      if (!anchor || !shouldInterceptPreviewLink(event, anchor, siteRoot)) return;
      event.preventDefault();
      navigate(anchor.href);
    };
    const handlePopState = (event) => {
      const outgoingHistoryEntryId = currentHistoryEntryRef.current;
      if (outgoingHistoryEntryId) {
        const outgoingPosition = {
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        };
        scrollPositionsRef.current.set(outgoingHistoryEntryId, outgoingPosition);
        persistScrollPosition(outgoingHistoryEntryId, outgoingPosition);
      }

      const route = resolvePreviewRoute(window.location.href, siteRoot);
      if (!route) return;
      const state = readPreviewHistoryState(event.state);
      const historyEntryId = typeof event.state?.[previewHistoryEntryKey] === "string"
        ? event.state[previewHistoryEntryKey]
        : nextHistoryEntryId();
      if (event.state?.[previewHistoryEntryKey] !== historyEntryId) {
        window.history.replaceState(
          createPreviewHistoryState(
            route.pageId,
            {
              hash: route.hash,
              scrollX: state?.scrollX,
              scrollY: state?.scrollY,
            },
            {
              ...event.state,
              [previewHistoryEntryKey]: historyEntryId,
            },
          ),
          "",
          route.href,
        );
      }
      currentHistoryEntryRef.current = historyEntryId;
      const savedPosition =
        scrollPositionsRef.current.get(historyEntryId)
        || readPersistedScrollPosition(historyEntryId);
      const nextEntry = {
        route,
        navigation: {
          kind: state?.pageId === route.pageId ? "restore" : "initial",
          sequence: entryRef.current.navigation.sequence + 1,
          scrollX: savedPosition?.scrollX ?? state?.scrollX ?? 0,
          scrollY: savedPosition?.scrollY ?? state?.scrollY ?? 0,
        },
      };
      entryRef.current = nextEntry;
      setEntry(nextEntry);
    };
    const handlePageHide = () => saveCurrentScroll();

    document.addEventListener("click", handleClick);
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pagehide", handlePageHide);
      window.history.scrollRestoration = previousRestoration;
    };
  }, [initialRoute, navigate, nextHistoryEntryId, saveCurrentScroll, siteRoot]);

  return (
    <ReactShell
      currentPageId={entry.route.pageId}
      siteRootHref={siteRoot}
      onNavigate={navigate}
    >
      <RouteView
        key={entry.route.pageId}
        route={entry.route}
        siteRoot={siteRoot}
        navigation={entry.navigation}
      />
    </ReactShell>
  );
}

export function mountPreviewApp() {
  const siteRoot = resolvePreviewSiteRoot(window.location.href);
  const initialRoute = resolvePreviewRoute(window.location.href, siteRoot);
  if (!initialRoute) throw new Error(`Unknown preview route: ${window.location.href}`);

  const mount = document.createElement("div");
  mount.id = "preview-app";
  document.body.replaceChildren(mount);
  createRoot(mount).render(<PreviewApp initialRoute={initialRoute} siteRoot={siteRoot} />);
}
