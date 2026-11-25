// BeatFrame Zero-Dependency RTL Floating Micro-Tooltip Portal

const COLD_DELAY_MS = 180;
const WARM_WINDOW_MS = 300;
const VIEWPORT_MARGIN = 10;
const TARGET_GAP = 8;
const TRIGGER_SELECTOR = "[data-tip-title], [data-tip-body]";
const STYLE_ID = "bfTooltipStyles";

const BASE_CSS = `
#bfTooltip.bf-tooltip {
  position: fixed;
  z-index: 90;
  pointer-events: none;
  max-width: 260px;
  padding: 8px 10px;
  border-radius: 10px;
  background: var(--hud-bg, rgba(12, 15, 22, 0.94));
  border: 1px solid var(--hud-border, rgba(255, 255, 255, 0.16));
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.52);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--hud-text, #f1f5f9);
  font-family: var(--font-fa, system-ui, sans-serif);
  font-size: 12px;
  line-height: 1.5;
  text-align: right;
  opacity: 0;
  transform: translateY(4px);
  transition: opacity 120ms ease, transform 120ms ease;
  visibility: hidden;
}
#bfTooltip.bf-tooltip[data-placement="bottom"] {
  transform: translateY(-4px);
}
#bfTooltip.bf-tooltip.is-visible {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
}
#bfTooltip .bf-tooltip-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
#bfTooltip .bf-tooltip-title {
  font-weight: 600;
  font-size: 12px;
  color: var(--hud-text, #f1f5f9);
}
#bfTooltip .bf-tooltip-kbd {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 6px;
  background: var(--hud-surface, rgba(255, 255, 255, 0.1));
  border: 1px solid var(--hud-border, rgba(255, 255, 255, 0.18));
  color: var(--hud-text, #f1f5f9);
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 10.5px;
  line-height: 1.45;
  white-space: nowrap;
}
#bfTooltip .bf-tooltip-body {
  margin-top: 3px;
  font-size: 11.5px;
  color: var(--hud-muted, #94a3b8);
}
#bfTooltip .bf-tooltip-state {
  margin-top: 5px;
  padding-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.09);
  font-size: 11px;
  color: var(--hud-accent, #34d399);
}
`;

function ensureStyles(doc) {
  if (!doc || !doc.head) return;
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = BASE_CSS;
  doc.head.appendChild(style);
}

function getOrCreatePortal(doc) {
  let el = doc.getElementById("bfTooltip");
  if (!el) {
    el = doc.createElement("div");
    el.id = "bfTooltip";
    doc.body.appendChild(el);
  }
  el.className = "bf-tooltip";
  el.setAttribute("dir", "rtl");
  el.setAttribute("role", "tooltip");
  el.setAttribute("aria-hidden", "true");
  el.style.position = "fixed";
  el.style.zIndex = "90";
  el.style.pointerEvents = "none";
  el.style.left = "0px";
  el.style.top = "0px";
  return el;
}

function matchesFocusVisible(el) {
  if (!el || typeof el.matches !== "function") return false;
  try {
    return el.matches(":focus-visible");
  } catch {
    return false;
  }
}

/**
 * Initializes the singleton RTL floating micro-tooltip portal.
 * Reads declarative data-tip-title, data-tip-body, data-tip-shortcut, and data-tip-state.
 */
export function initTooltips({ root = document, getShortcutLabel } = {}) {
  const doc = root.ownerDocument || root;
  const win = doc.defaultView || globalThis;

  ensureStyles(doc);
  const portal = getOrCreatePortal(doc);

  let activeTarget = null;
  let pendingTarget = null;
  let showTimer = null;
  let isVisible = false;
  let lastHideAt = 0;
  let disposed = false;

  function clearTimer() {
    if (showTimer !== null) {
      win.clearTimeout(showTimer);
      showTimer = null;
    }
    pendingTarget = null;
  }

  function findTrigger(node) {
    if (!node || typeof node.closest !== "function") return null;
    const match = node.closest(TRIGGER_SELECTOR);
    if (!match) return null;
    if (root !== doc && !root.contains(match)) return null;
    return match;
  }

  function renderContent(target) {
    const title = (target.getAttribute("data-tip-title") || "").trim();
    const body = (target.getAttribute("data-tip-body") || "").trim();
    const shortcutId = (target.getAttribute("data-tip-shortcut") || "").trim();
    const state = (target.getAttribute("data-tip-state") || "").trim();

    let shortcutText = "";
    if (shortcutId && typeof getShortcutLabel === "function") {
      try {
        shortcutText = String(getShortcutLabel(shortcutId) || "").trim();
      } catch {
        shortcutText = "";
      }
    }

    if (!title && !body && !shortcutText && !state) {
      return false;
    }

    portal.textContent = "";

    if (title || shortcutText) {
      const head = doc.createElement("div");
      head.className = "bf-tooltip-head";

      if (title) {
        const titleEl = doc.createElement("span");
        titleEl.className = "bf-tooltip-title";
        titleEl.textContent = title;
        head.appendChild(titleEl);
      }

      if (shortcutText) {
        const kbdEl = doc.createElement("kbd");
        kbdEl.className = "bf-tooltip-kbd";
        kbdEl.setAttribute("dir", "ltr");
        kbdEl.textContent = shortcutText;
        head.appendChild(kbdEl);
      }

      portal.appendChild(head);
    }

    if (body) {
      const bodyEl = doc.createElement("div");
      bodyEl.className = "bf-tooltip-body";
      bodyEl.textContent = body;
      portal.appendChild(bodyEl);
    }

    if (state) {
      const stateEl = doc.createElement("div");
      stateEl.className = "bf-tooltip-state";
      stateEl.textContent = state;
      portal.appendChild(stateEl);
    }

    return true;
  }

  function positionPortal(target) {
    const rect = target.getBoundingClientRect();
    const vw = win.innerWidth || doc.documentElement.clientWidth || 0;
    const vh = win.innerHeight || doc.documentElement.clientHeight || 0;

    // Measure after content update
    const tipRect = portal.getBoundingClientRect();
    const tipW = tipRect.width;
    const tipH = tipRect.height;

    const spaceAbove = rect.top - TARGET_GAP - VIEWPORT_MARGIN;
    const spaceBelow = vh - rect.bottom - TARGET_GAP - VIEWPORT_MARGIN;

    let placement = "top";
    let top = rect.top - TARGET_GAP - tipH;

    if (spaceAbove < tipH && spaceBelow >= spaceAbove) {
      placement = "bottom";
      top = rect.bottom + TARGET_GAP;
    }

    const maxTop = Math.max(VIEWPORT_MARGIN, vh - tipH - VIEWPORT_MARGIN);
    top = Math.max(VIEWPORT_MARGIN, Math.min(maxTop, top));

    let left = rect.left + (rect.width - tipW) / 2;
    const maxLeft = Math.max(VIEWPORT_MARGIN, vw - tipW - VIEWPORT_MARGIN);
    left = Math.max(VIEWPORT_MARGIN, Math.min(maxLeft, left));

    portal.setAttribute("data-placement", placement);
    portal.style.left = `${Math.round(left)}px`;
    portal.style.top = `${Math.round(top)}px`;
  }

  function showNow(target) {
    if (disposed || !target || !target.isConnected) {
      hide();
      return;
    }
    clearTimer();

    const hasContent = renderContent(target);
    if (!hasContent) {
      hide();
      return;
    }

    activeTarget = target;
    positionPortal(target);
    portal.classList.add("is-visible");
    portal.setAttribute("aria-hidden", "false");
    isVisible = true;
  }

  function scheduleShow(target, { immediate = false } = {}) {
    if (disposed || !target) return;
    if (isVisible && activeTarget === target) {
      refresh();
      return;
    }

    clearTimer();
    const warm = isVisible || (Date.now() - lastHideAt <= WARM_WINDOW_MS);

    if (immediate || warm) {
      showNow(target);
      return;
    }

    pendingTarget = target;
    showTimer = win.setTimeout(() => {
      const next = pendingTarget;
      showTimer = null;
      pendingTarget = null;
      if (next) showNow(next);
    }, COLD_DELAY_MS);
  }

  function hide() {
    clearTimer();
    if (isVisible) {
      lastHideAt = Date.now();
    }
    isVisible = false;
    activeTarget = null;
    portal.classList.remove("is-visible");
    portal.setAttribute("aria-hidden", "true");
  }

  function refresh() {
    if (disposed || !isVisible || !activeTarget) return;
    if (!activeTarget.isConnected) {
      hide();
      return;
    }
    const hasContent = renderContent(activeTarget);
    if (!hasContent) {
      hide();
      return;
    }
    positionPortal(activeTarget);
  }

  function onPointerOver(e) {
    if (e.pointerType === "touch") return;
    const trigger = findTrigger(e.target);
    if (!trigger) return;
    if (trigger === activeTarget && isVisible) return;
    if (trigger === pendingTarget) return;
    scheduleShow(trigger);
  }

  function onPointerOut(e) {
    if (e.pointerType === "touch") return;
    const fromTrigger = findTrigger(e.target);
    if (!fromTrigger) return;
    const toTrigger = findTrigger(e.relatedTarget);
    if (toTrigger === fromTrigger) return;
    if (toTrigger) {
      scheduleShow(toTrigger);
    } else if (fromTrigger === activeTarget || fromTrigger === pendingTarget) {
      hide();
    }
  }

  function onFocusIn(e) {
    const trigger = findTrigger(e.target);
    if (!trigger) return;
    if (matchesFocusVisible(trigger)) {
      scheduleShow(trigger, { immediate: true });
    }
  }

  function onFocusOut(e) {
    const fromTrigger = findTrigger(e.target);
    if (!fromTrigger) return;
    if (fromTrigger === activeTarget || fromTrigger === pendingTarget) {
      hide();
    }
  }

  function onPointerDown() {
    hide();
  }

  function onKeyDown(e) {
    if (e.code === "Escape") hide();
  }

  function onScrollOrResize() {
    if (isVisible) hide();
  }

  root.addEventListener("pointerover", onPointerOver);
  root.addEventListener("pointerout", onPointerOut);
  root.addEventListener("focusin", onFocusIn);
  root.addEventListener("focusout", onFocusOut);
  root.addEventListener("pointerdown", onPointerDown, true);
  win.addEventListener("keydown", onKeyDown, true);
  win.addEventListener("scroll", onScrollOrResize, true);
  win.addEventListener("resize", onScrollOrResize);
  win.addEventListener("blur", onScrollOrResize);

  function dispose() {
    if (disposed) return;
    disposed = true;
    hide();
    root.removeEventListener("pointerover", onPointerOver);
    root.removeEventListener("pointerout", onPointerOut);
    root.removeEventListener("focusin", onFocusIn);
    root.removeEventListener("focusout", onFocusOut);
    root.removeEventListener("pointerdown", onPointerDown, true);
    win.removeEventListener("keydown", onKeyDown, true);
    win.removeEventListener("scroll", onScrollOrResize, true);
    win.removeEventListener("resize", onScrollOrResize);
    win.removeEventListener("blur", onScrollOrResize);
    if (portal.parentNode) {
      portal.parentNode.removeChild(portal);
    }
  }

  return { refresh, hide, dispose };
}
