// BeatFrame Keyboard Shortcuts Registry (Node-safe: zero top-level DOM side effects)

export const DEFAULT_SHORTCUTS = Object.freeze([
  // Transport
  {
    id: "playPause",
    group: "transport",
    groupFa: "پخش و کنترل",
    labelFa: "پخش یا توقف",
    descFa: "شروع یا متوقف کردن پخش پیش نمایش",
    combo: "Space",
  },
  {
    id: "restart",
    group: "transport",
    groupFa: "پخش و کنترل",
    labelFa: "بازگشت به ابتدا",
    descFa: "پرش به ثانیه صفر و پخش دوباره",
    combo: "KeyR",
  },
  {
    id: "mute",
    group: "transport",
    groupFa: "پخش و کنترل",
    labelFa: "قطع یا وصل صدا",
    descFa: "بی صدا کردن یا برگرداندن صدای موزیک",
    combo: "KeyM",
  },

  // Stepping
  {
    id: "stepBack",
    group: "stepping",
    groupFa: "حرکت در تایم لاین",
    labelFa: "عقب رفتن سریع",
    descFa: "حرکت یک ثانیه به عقب در تایم لاین",
    combo: "ArrowLeft",
  },
  {
    id: "stepForward",
    group: "stepping",
    groupFa: "حرکت در تایم لاین",
    labelFa: "جلو رفتن سریع",
    descFa: "حرکت یک ثانیه به جلو در تایم لاین",
    combo: "ArrowRight",
  },
  {
    id: "frameBack",
    group: "stepping",
    groupFa: "حرکت در تایم لاین",
    labelFa: "یک فریم به عقب",
    descFa: "جابجایی دقیق یک فریم به عقب",
    combo: "Shift+ArrowLeft",
  },
  {
    id: "frameForward",
    group: "stepping",
    groupFa: "حرکت در تایم لاین",
    labelFa: "یک فریم به جلو",
    descFa: "جابجایی دقیق یک فریم به جلو",
    combo: "Shift+ArrowRight",
  },
  {
    id: "prevAct",
    group: "stepping",
    groupFa: "حرکت در تایم لاین",
    labelFa: "پرده قبلی",
    descFa: "پرش به نقطه شروع بخش قبلی سناریو",
    combo: "BracketLeft",
  },
  {
    id: "nextAct",
    group: "stepping",
    groupFa: "حرکت در تایم لاین",
    labelFa: "پرده بعدی",
    descFa: "پرش به نقطه شروع بخش بعدی سناریو",
    combo: "BracketRight",
  },
  {
    id: "nudgeBarBack",
    group: "stepping",
    groupFa: "حرکت در تایم لاین",
    labelFa: "جابجایی یک میزان به عقب",
    descFa: "عقب بردن نقطه شروع موزیک به اندازه یک میزان کامل",
    combo: "Comma",
  },
  {
    id: "nudgeBarForward",
    group: "stepping",
    groupFa: "حرکت در تایم لاین",
    labelFa: "جابجایی یک میزان به جلو",
    descFa: "جلو بردن نقطه شروع موزیک به اندازه یک میزان کامل",
    combo: "Period",
  },
  {
    id: "nudgeFineBack",
    group: "stepping",
    groupFa: "حرکت در تایم لاین",
    labelFa: "تنظیم ریز به عقب",
    descFa: "عقب بردن دقیق نقطه شروع موزیک با گام کوتاه",
    combo: "Shift+Comma",
  },
  {
    id: "nudgeFineForward",
    group: "stepping",
    groupFa: "حرکت در تایم لاین",
    labelFa: "تنظیم ریز به جلو",
    descFa: "جلو بردن دقیق نقطه شروع موزیک با گام کوتاه",
    combo: "Shift+Period",
  },

  // Audio Sync Hub
  {
    id: "toggleSyncDrawer",
    group: "audioSync",
    groupFa: "سینک موزیک و ریتم",
    labelFa: "پنل سینک موزیک",
    descFa: "باز یا بسته کردن کشوی تنظیمات موزیک و ریتم",
    combo: "KeyS",
  },
  {
    id: "cycleSyncMode",
    group: "audioSync",
    groupFa: "سینک موزیک و ریتم",
    labelFa: "تغییر حالت سینک",
    descFa: "جابجایی بین حالت های هماهنگ سازی سرعت و ریتم",
    combo: "KeyT",
  },
  {
    id: "togglePitchLock",
    group: "audioSync",
    groupFa: "سینک موزیک و ریتم",
    labelFa: "قفل گام صدا",
    descFa: "ثابت نگه داشتن زیر و بمی صدا هنگام تغییر BPM",
    combo: "KeyP",
  },
  {
    id: "syncClipToMusic",
    group: "audioSync",
    groupFa: "سینک موزیک و ریتم",
    labelFa: "سینک خودکار با ضرب",
    descFa: "هم تراز کردن نقطه اوج ویدیو با بهترین ضرب موزیک",
    combo: "KeyC",
  },
  {
    id: "toggleBeatMagnet",
    group: "audioSync",
    groupFa: "سینک موزیک و ریتم",
    labelFa: "آهنربای ضرب",
    descFa: "چسباندن خودکار برش موزیک به نزدیک ترین ضرب",
    combo: "KeyB",
  },
  {
    id: "toggleAutoLoop",
    group: "audioSync",
    groupFa: "سینک موزیک و ریتم",
    labelFa: "تکرار خودکار میزان",
    descFa: "تکرار نرم بخش کوتاه موزیک روی خط میزان",
    combo: "KeyL",
  },
  {
    id: "slice1",
    group: "audioSync",
    groupFa: "سینک موزیک و ریتم",
    labelFa: "برش پیشنهادی اول",
    descFa: "انتخاب اولین بخش پیشنهادی و پرانرژی موزیک",
    combo: "Shift+Digit1",
  },
  {
    id: "slice2",
    group: "audioSync",
    groupFa: "سینک موزیک و ریتم",
    labelFa: "برش پیشنهادی دوم",
    descFa: "انتخاب دومین بخش پیشنهادی موزیک",
    combo: "Shift+Digit2",
  },
  {
    id: "slice3",
    group: "audioSync",
    groupFa: "سینک موزیک و ریتم",
    labelFa: "برش پیشنهادی سوم",
    descFa: "انتخاب سومین بخش پیشنهادی موزیک",
    combo: "Shift+Digit3",
  },
  {
    id: "pinAnchor",
    group: "audioSync",
    groupFa: "سینک موزیک و ریتم",
    labelFa: "سنجاق کردن ضرب فعلی",
    descFa: "قفل کردن نقطه اوج ویدیو روی لحظه فعلی موزیک",
    combo: "KeyK",
  },

  // Slides & View
  {
    id: "slide1",
    group: "slidesView",
    groupFa: "اسلاید و نما",
    labelFa: "اسلاید ۰۱",
    descFa: "رفتن به استایل اول (2-BIT)",
    combo: "Digit1",
  },
  {
    id: "slide2",
    group: "slidesView",
    groupFa: "اسلاید و نما",
    labelFa: "اسلاید ۰۲",
    descFa: "رفتن به استایل دوم (آتشکده 2-BIT)",
    combo: "Digit2",
  },
  {
    id: "slide3",
    group: "slidesView",
    groupFa: "اسلاید و نما",
    labelFa: "اسلاید ۰۳",
    descFa: "رفتن به استایل سوم (کینتیک پانچ)",
    combo: "Digit3",
  },
  {
    id: "slide4",
    group: "slidesView",
    groupFa: "اسلاید و نما",
    labelFa: "اسلاید ۰۴",
    descFa: "رفتن به استایل چهارم (آتشکده پرو)",
    combo: "Digit4",
  },
  {
    id: "slide5",
    group: "slidesView",
    groupFa: "اسلاید و نما",
    labelFa: "اسلاید ۰۵",
    descFa: "رفتن به استایل پنجم (سایبرپانک)",
    combo: "Digit5",
  },
  {
    id: "toggleHud",
    group: "slidesView",
    groupFa: "اسلاید و نما",
    labelFa: "نمایش یا مخفی کردن نوار ابزار",
    descFa: "جمع کردن کنترل ها برای تماشای تمام صفحه",
    combo: "KeyH",
  },
  {
    id: "toggleAspect",
    group: "slidesView",
    groupFa: "اسلاید و نما",
    labelFa: "تغییر نسبت تصویر",
    descFa: "جابجایی بین نمای عمودی 9:16 و افقی 16:9",
    combo: "KeyA",
  },

  // Export & Help
  {
    id: "exportVideo",
    group: "exportHelp",
    groupFa: "خروجی و راهنما",
    labelFa: "خروجی ویدیو MP4",
    descFa: "ضبط و ذخیره ویدیوی نهایی با کیفیت کامل",
    combo: "KeyE",
  },
  {
    id: "exportPng",
    group: "exportHelp",
    groupFa: "خروجی و راهنما",
    labelFa: "ذخیره فریم PNG",
    descFa: "گرفتن عکس باکیفیت از فریم فعلی",
    combo: "Shift+KeyE",
  },
  {
    id: "toggleHelp",
    group: "exportHelp",
    groupFa: "خروجی و راهنما",
    labelFa: "راهنمای میانبرها",
    descFa: "باز یا بسته کردن پنجره لیست و ویرایش میانبرها",
    combo: "Slash",
    altCombos: Object.freeze(["Shift+Slash"]),
  },
  {
    id: "closeOverlay",
    group: "exportHelp",
    groupFa: "خروجی و راهنما",
    labelFa: "بستن پنجره ها",
    descFa: "بستن کشوی سینک یا راهنمای میانبرها",
    combo: "Escape",
  },
]);

const BARE_MODIFIER_CODES = new Set([
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
  "OSLeft",
  "OSRight",
]);

const MODIFIER_ORDER = ["Ctrl", "Alt", "Shift", "Meta"];

const KEY_LABELS = {
  Space: "Space",
  Escape: "Esc",
  ArrowLeft: "←",
  ArrowRight: "→",
  ArrowUp: "↑",
  ArrowDown: "↓",
  BracketLeft: "[",
  BracketRight: "]",
  Comma: ",",
  Period: ".",
  Slash: "?",
  Backslash: "\\",
  Minus: "-",
  Equal: "=",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
  Enter: "Enter",
  Tab: "Tab",
  Backspace: "⌫",
  Delete: "Del",
};

function normalizeComboString(combo) {
  if (typeof combo !== "string") return null;
  const trimmed = combo.trim();
  if (!trimmed) return "";

  const parts = trimmed.split("+").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return "";

  const mods = new Set();
  let keyCode = null;

  for (const part of parts) {
    const lower = part.toLowerCase();
    if (lower === "ctrl" || lower === "control") {
      mods.add("Ctrl");
    } else if (lower === "alt" || lower === "option") {
      mods.add("Alt");
    } else if (lower === "shift") {
      mods.add("Shift");
    } else if (lower === "meta" || lower === "cmd" || lower === "command") {
      mods.add("Meta");
    } else {
      if (keyCode !== null) return null;
      keyCode = part;
    }
  }

  if (!keyCode || BARE_MODIFIER_CODES.has(keyCode)) return null;

  const ordered = [];
  for (const mod of MODIFIER_ORDER) {
    if (mods.has(mod)) ordered.push(mod);
  }
  ordered.push(keyCode);
  return ordered.join("+");
}

/**
 * Normalizes a KeyboardEvent into a canonical combo string (e.g. "Shift+Digit1", "Space").
 * Returns null for bare modifier keys or malformed events.
 */
export function eventToCombo(e) {
  if (!e || typeof e.code !== "string" || !e.code) return null;
  if (e.code.includes("+") || /\s/.test(e.code)) return null;
  if (BARE_MODIFIER_CODES.has(e.code)) return null;

  const parts = [];
  if (e.ctrlKey) parts.push("Ctrl");
  if (e.altKey) parts.push("Alt");
  if (e.shiftKey) parts.push("Shift");
  if (e.metaKey) parts.push("Meta");
  parts.push(e.code);
  return parts.join("+");
}

/**
 * Formats a normalized combo string into a concise, human-readable keycap label.
 * Examples: "Space" -> "Space", "Shift+Digit1" -> "Shift + 1", "ArrowLeft" -> "←", "Slash" -> "?".
 */
export function formatCombo(combo) {
  if (!combo || typeof combo !== "string") return "";
  const normalized = normalizeComboString(combo);
  if (!normalized) return "";

  if (normalized === "Slash" || normalized === "Shift+Slash") {
    return "?";
  }

  const parts = normalized.split("+");
  const rawCode = parts.pop();

  let keyLabel = KEY_LABELS[rawCode];
  if (!keyLabel) {
    if (/^Key[A-Z]$/.test(rawCode)) {
      keyLabel = rawCode.slice(3);
    } else if (/^Digit[0-9]$/.test(rawCode)) {
      keyLabel = rawCode.slice(5);
    } else if (/^Numpad[0-9]$/.test(rawCode)) {
      keyLabel = `Num ${rawCode.slice(6)}`;
    } else {
      keyLabel = rawCode;
    }
  }

  const modLabels = parts.map((m) => (m === "Meta" ? "Cmd" : m));
  return [...modLabels, keyLabel].join(" + ");
}

function isEditableTarget(target) {
  if (!target || typeof target !== "object") return false;
  const tag = typeof target.tagName === "string" ? target.tagName.toUpperCase() : "";
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return true;
  if (target.isContentEditable === true) return true;
  if (typeof target.getAttribute === "function") {
    const attr = target.getAttribute("contenteditable");
    if (attr === "" || attr === "true" || attr === "plaintext-only") return true;
  }
  return false;
}

/**
 * Creates a persistent, conflict-aware keyboard shortcut store.
 */
export function createShortcutStore({
  storage = globalThis.localStorage,
  storageKey = "beatframe_shortcuts_v6",
} = {}) {
  const byId = new Map(DEFAULT_SHORTCUTS.map((def) => [def.id, def]));
  let overrides = Object.create(null);

  function readStorage() {
    if (!storage || typeof storage.getItem !== "function") return;
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
      for (const [id, val] of Object.entries(parsed)) {
        if (!byId.has(id) || typeof val !== "string") continue;
        const norm = normalizeComboString(val);
        if (norm === null) continue;
        const def = byId.get(id);
        if (norm !== def.combo) {
          overrides[id] = norm;
        }
      }
    } catch {
      // Ignore corrupt or inaccessible storage
    }
  }

  function writeStorage() {
    if (!storage) return;
    try {
      const keys = Object.keys(overrides);
      if (keys.length === 0) {
        if (typeof storage.removeItem === "function") {
          storage.removeItem(storageKey);
        } else if (typeof storage.setItem === "function") {
          storage.setItem(storageKey, "{}");
        }
      } else if (typeof storage.setItem === "function") {
        storage.setItem(storageKey, JSON.stringify(overrides));
      }
    } catch {
      // Ignore storage quota or sandbox errors
    }
  }

  readStorage();

  function getCombo(actionId) {
    const def = byId.get(actionId);
    if (!def) return null;
    return Object.prototype.hasOwnProperty.call(overrides, actionId)
      ? overrides[actionId]
      : def.combo;
  }

  function getAll() {
    return DEFAULT_SHORTCUTS.map((def) => {
      const activeCombo = getCombo(def.id);
      return {
        id: def.id,
        group: def.group,
        groupFa: def.groupFa,
        labelFa: def.labelFa,
        descFa: def.descFa,
        combo: activeCombo,
        defaultCombo: def.combo,
        isCustom: activeCombo !== def.combo,
      };
    });
  }

  function matchEvent(e) {
    const combo = eventToCombo(e);
    if (!combo) return null;

    if (isEditableTarget(e.target) && combo !== "Escape") {
      return null;
    }

    // 1. Exact primary combo match
    for (const def of DEFAULT_SHORTCUTS) {
      const active = getCombo(def.id);
      if (active && active === combo) {
        return def.id;
      }
    }

    // 2. Alternate default combos (e.g. Shift+Slash for toggleHelp while on default Slash)
    for (const def of DEFAULT_SHORTCUTS) {
      if (!def.altCombos || def.altCombos.length === 0) continue;
      const active = getCombo(def.id);
      if (active === def.combo && def.altCombos.includes(combo)) {
        return def.id;
      }
    }

    return null;
  }

  function rebind(actionId, newCombo) {
    const def = byId.get(actionId);
    if (!def) return { ok: false, conflictClearedId: null };

    const normalized = normalizeComboString(newCombo);
    if (normalized === null) return { ok: false, conflictClearedId: null };

    let conflictClearedId = null;

    if (normalized !== "") {
      for (const other of DEFAULT_SHORTCUTS) {
        if (other.id === actionId) continue;
        if (getCombo(other.id) === normalized) {
          overrides[other.id] = "";
          conflictClearedId = other.id;
          break;
        }
      }
    }

    if (normalized === def.combo) {
      delete overrides[actionId];
    } else {
      overrides[actionId] = normalized;
    }

    writeStorage();
    return { ok: true, conflictClearedId };
  }

  function resetAll() {
    overrides = Object.create(null);
    writeStorage();
  }

  return {
    getAll,
    getCombo,
    matchEvent,
    rebind,
    resetAll,
  };
}
