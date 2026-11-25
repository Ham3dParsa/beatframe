import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_SHORTCUTS,
  eventToCombo,
  formatCombo,
  createShortcutStore,
} from "../src/core/shortcuts.js";

function createMemoryStorage() {
  const map = new Map();
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null;
    },
    setItem(key, value) {
      map.set(key, String(value));
    },
    removeItem(key) {
      map.delete(key);
    },
    clear() {
      map.clear();
    },
  };
}

function keyEvent(code, opts = {}) {
  return {
    code,
    ctrlKey: Boolean(opts.ctrlKey),
    altKey: Boolean(opts.altKey),
    shiftKey: Boolean(opts.shiftKey),
    metaKey: Boolean(opts.metaKey),
    target: opts.target ?? null,
  };
}

test("DEFAULT_SHORTCUTS covers all required actions with zero middle dots", () => {
  assert.equal(DEFAULT_SHORTCUTS.length, 34);

  const ids = new Set();
  for (const item of DEFAULT_SHORTCUTS) {
    assert.ok(item.id && !ids.has(item.id), `Duplicate or empty id: ${item.id}`);
    ids.add(item.id);
    assert.ok(item.group && item.groupFa && item.labelFa && item.descFa && item.combo);
    for (const field of [item.groupFa, item.labelFa, item.descFa, item.combo]) {
      assert.equal(field.includes("\u00b7"), false, `Middle dot found in ${item.id}: ${field}`);
    }
  }

  const requiredIds = [
    "playPause", "restart", "mute",
    "stepBack", "stepForward", "frameBack", "frameForward",
    "prevAct", "nextAct", "nudgeBarBack", "nudgeBarForward", "nudgeFineBack", "nudgeFineForward",
    "toggleSyncDrawer", "cycleSyncMode", "togglePitchLock", "syncClipToMusic",
    "toggleBeatMagnet", "toggleAutoLoop", "slice1", "slice2", "slice3", "pinAnchor",
    "slide1", "slide2", "slide3", "slide4", "slide5", "toggleHud", "toggleAspect",
    "exportVideo", "exportPng", "toggleHelp", "closeOverlay",
  ];
  for (const id of requiredIds) {
    assert.ok(ids.has(id), `Missing shortcut id: ${id}`);
  }
});

test("eventToCombo normalizes codes with modifiers and ignores bare modifier keys", () => {
  assert.equal(eventToCombo(keyEvent("Space")), "Space");
  assert.equal(eventToCombo(keyEvent("Digit1", { shiftKey: true })), "Shift+Digit1");
  assert.equal(eventToCombo(keyEvent("KeyE", { ctrlKey: true, shiftKey: true })), "Ctrl+Shift+KeyE");
  assert.equal(eventToCombo(keyEvent("ArrowLeft", { altKey: true, ctrlKey: true })), "Ctrl+Alt+ArrowLeft");
  assert.equal(eventToCombo(keyEvent("Slash", { shiftKey: true })), "Shift+Slash");

  // Bare modifier keys must be ignored
  for (const modCode of [
    "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight",
    "AltLeft", "AltRight", "MetaLeft", "MetaRight",
  ]) {
    assert.equal(eventToCombo(keyEvent(modCode, { shiftKey: true })), null);
  }
  assert.equal(eventToCombo(null), null);
  assert.equal(eventToCombo({}), null);
});

test("formatCombo produces clean human-readable keycap labels", () => {
  assert.equal(formatCombo("Space"), "Space");
  assert.equal(formatCombo("Shift+Digit1"), "Shift + 1");
  assert.equal(formatCombo("ArrowLeft"), "←");
  assert.equal(formatCombo("ArrowRight"), "→");
  assert.equal(formatCombo("Shift+ArrowLeft"), "Shift + ←");
  assert.equal(formatCombo("BracketLeft"), "[");
  assert.equal(formatCombo("BracketRight"), "]");
  assert.equal(formatCombo("Slash"), "?");
  assert.equal(formatCombo("Shift+Slash"), "?");
  assert.equal(formatCombo("Escape"), "Esc");
  assert.equal(formatCombo("KeyK"), "K");
  assert.equal(formatCombo("Shift+KeyE"), "Shift + E");
  assert.equal(formatCombo("Comma"), ",");
  assert.equal(formatCombo("Shift+Period"), "Shift + .");
  assert.equal(formatCombo(""), "");
  assert.equal(formatCombo(null), "");
});

test("createShortcutStore matches default bindings including Slash and Shift+Slash for toggleHelp", () => {
  const storage = createMemoryStorage();
  const store = createShortcutStore({ storage });

  assert.equal(store.matchEvent(keyEvent("Space")), "playPause");
  assert.equal(store.matchEvent(keyEvent("KeyR")), "restart");
  assert.equal(store.matchEvent(keyEvent("Shift+ArrowLeft")), null); // raw code with + is not a KeyboardEvent code
  assert.equal(store.matchEvent(keyEvent("ArrowLeft", { shiftKey: true })), "frameBack");
  assert.equal(store.matchEvent(keyEvent("Digit3", { shiftKey: true })), "slice3");
  assert.equal(store.matchEvent(keyEvent("Digit3")), "slide3");
  assert.equal(store.matchEvent(keyEvent("KeyK")), "pinAnchor");
  assert.equal(store.matchEvent(keyEvent("Slash")), "toggleHelp");
  assert.equal(store.matchEvent(keyEvent("Slash", { shiftKey: true })), "toggleHelp");
  assert.equal(store.matchEvent(keyEvent("Escape")), "closeOverlay");
  assert.equal(store.getCombo("playPause"), "Space");
  assert.equal(store.getCombo("nonExistent"), null);
});

test("matchEvent guards INPUT, SELECT, TEXTAREA, and contentEditable targets except Escape", () => {
  const storage = createMemoryStorage();
  const store = createShortcutStore({ storage });

  const editableTargets = [
    { tagName: "INPUT" },
    { tagName: "SELECT" },
    { tagName: "TEXTAREA" },
    { tagName: "DIV", isContentEditable: true },
    { tagName: "DIV", getAttribute: (name) => (name === "contenteditable" ? "true" : null) },
  ];

  for (const target of editableTargets) {
    assert.equal(store.matchEvent(keyEvent("Space", { target })), null);
    assert.equal(store.matchEvent(keyEvent("KeyR", { target })), null);
    assert.equal(store.matchEvent(keyEvent("Slash", { target })), null);
    assert.equal(store.matchEvent(keyEvent("Escape", { target })), "closeOverlay");
  }

  // Non-editable target works normally
  assert.equal(store.matchEvent(keyEvent("Space", { target: { tagName: "BUTTON" } })), "playPause");
});

test("rebind handles conflicts, persists across store instances, and resetAll restores defaults", () => {
  const storage = createMemoryStorage();
  const storageKey = "beatframe_shortcuts_test";
  const storeA = createShortcutStore({ storage, storageKey });

  // Rebind restart to an unused key (no conflict)
  const r1 = storeA.rebind("restart", "KeyZ");
  assert.deepEqual(r1, { ok: true, conflictClearedId: null });
  assert.equal(storeA.getCombo("restart"), "KeyZ");
  assert.equal(storeA.matchEvent(keyEvent("KeyZ")), "restart");
  assert.equal(storeA.matchEvent(keyEvent("KeyR")), null);

  // Rebind mute to Space (conflicts with playPause -> clears playPause)
  const r2 = storeA.rebind("mute", "Space");
  assert.deepEqual(r2, { ok: true, conflictClearedId: "playPause" });
  assert.equal(storeA.getCombo("mute"), "Space");
  assert.equal(storeA.getCombo("playPause"), "");
  assert.equal(storeA.matchEvent(keyEvent("Space")), "mute");

  // Invalid rebind returns ok: false
  assert.deepEqual(storeA.rebind("unknownAction", "KeyQ"), { ok: false, conflictClearedId: null });
  assert.deepEqual(storeA.rebind("mute", "ShiftLeft"), { ok: false, conflictClearedId: null });

  // Verify persistence across a brand new store instance
  const storeB = createShortcutStore({ storage, storageKey });
  assert.equal(storeB.getCombo("restart"), "KeyZ");
  assert.equal(storeB.getCombo("mute"), "Space");
  assert.equal(storeB.getCombo("playPause"), "");
  assert.equal(storeB.matchEvent(keyEvent("Space")), "mute");

  const allB = storeB.getAll();
  const restartEntry = allB.find((x) => x.id === "restart");
  const playPauseEntry = allB.find((x) => x.id === "playPause");
  const toggleHudEntry = allB.find((x) => x.id === "toggleHud");
  assert.equal(restartEntry.isCustom, true);
  assert.equal(playPauseEntry.isCustom, true);
  assert.equal(toggleHudEntry.isCustom, false);

  // resetAll clears overrides and storage
  storeB.resetAll();
  assert.equal(storeB.getCombo("restart"), "KeyR");
  assert.equal(storeB.getCombo("mute"), "KeyM");
  assert.equal(storeB.getCombo("playPause"), "Space");
  assert.equal(storage.getItem(storageKey), null);

  const storeC = createShortcutStore({ storage, storageKey });
  assert.equal(storeC.getCombo("playPause"), "Space");
  assert.equal(storeC.getAll().every((x) => !x.isCustom), true);
});
