// ============================================================
// Persistence, roster helpers, custom mecha builder math
// ============================================================
import { MECHA, PILOTS, STARTER_MECHA, STARTER_PILOTS, PARTS, BASE_CUSTOM, CUSTOM_WEAPONS, CUSTOM_ULTS, CLASSES } from './data.js';

const SAVE_KEY = 'mechaBayanihan_save_v1';

export function defaultSave() {
  return {
    capital: 5000, blueprints: 20, diamonds: 3000,
    ownedMecha: [...STARTER_MECHA], ownedPilots: [...STARTER_PILOTS],
    cleared: [], pity: 0, customMecha: [],
    squad: [
      { mechaId: 'jeepneyKaiser', pilotId: 'migo' },
      { mechaId: 'tanod01', pilotId: 'tisoy' },
      { mechaId: 'kapreGrunt', pilotId: 'berto' },
      { mechaId: null, pilotId: null },
    ],
    settings: { muted: false, sfxVol: 0.7, voiceVol: 0.9, voiceOn: true, cutins: 'full', view: '3d' },
    stats: { pulls: 0, kills: 0, sorties: 0 },
  };
}

let storageOK = true;
export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const s = JSON.parse(raw);
    const d = defaultSave();
    return { ...d, ...s, settings: { ...d.settings, ...(s.settings || {}) }, stats: { ...d.stats, ...(s.stats || {}) }, squad: Array.isArray(s.squad) && s.squad.length === 4 ? s.squad : d.squad, customMecha: Array.isArray(s.customMecha) ? s.customMecha : [] };
  } catch { storageOK = false; return defaultSave(); }
}
export function writeSave(s) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); storageOK = true; } catch { storageOK = false; }
}
export function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch {} }
export function isStorageOK() { return storageOK; }

// ---------- roster ----------
export function getMecha(id, save) {
  if (!id) return null;
  if (MECHA[id]) return MECHA[id];
  return (save?.customMecha || []).find((m) => m.id === id) || null;
}
export function getPilot(id) { return PILOTS[id] || PILOTS.kadete; }

export function combinedStats(mecha, pilot) {
  if (!mecha) return null;
  const p = pilot || PILOTS.kadete;
  const cls = mecha.cls;
  let hp = mecha.hp, en = mecha.en, atk = mecha.atk + (p.stats.atk || 0), def = mecha.def + (p.stats.def || 0), mob = mecha.mob + (p.stats.mob || 0), move = mecha.move;
  if (cls === 'Attacker') atk = Math.round(atk * 1.1);
  if (cls === 'Defender') { def = Math.round(def * 1.15); hp = Math.round(hp * 1.1); }
  if (cls === 'Supporter') en += 20;
  const sk = p.skill.id;
  if (sk === 'veteran' || sk === 'boss') def = Math.round(def * 1.2);
  if (sk === 'redcomet') move += 1;
  return { hp, en, atk, def, mob, move };
}

// ---------- custom mecha ----------
export function partById(slot, id) { return PARTS[slot].find((p) => p.id === id) || PARTS[slot][0]; }

export function customStats(design) {
  const s = { ...BASE_CUSTOM };
  ['head', 'torso', 'arms', 'legs', 'pack'].forEach((slot) => {
    const m = partById(slot, design[slot]).mod;
    Object.entries(m).forEach(([k, v]) => { s[k] = (s[k] || 0) + v; });
  });
  // free tuning points
  const t = design.tune || {};
  s.hp += (t.hp || 0) * 20; s.en += (t.en || 0) * 5; s.atk += (t.atk || 0) * 3; s.def += (t.def || 0) * 3; s.mob += (t.mob || 0) * 3;
  s.move = Math.max(3, Math.min(7, s.move));
  return s;
}

export const TUNE_POINTS = 10;

export function buildCustomMecha(design, id) {
  const stats = customStats(design);
  const w1 = CUSTOM_WEAPONS.find((w) => w.id === design.w1) || CUSTOM_WEAPONS[0];
  const w2 = CUSTOM_WEAPONS.find((w) => w.id === design.w2) || CUSTOM_WEAPONS[1];
  const ult = CUSTOM_ULTS.find((w) => w.id === design.ult) || CUSTOM_ULTS[0];
  const stripW = ({ id: _i, held: _h, ...rest }) => rest;
  return {
    id: id || `custom_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    name: design.name?.trim() || 'Custom Mecha', short: (design.name?.trim() || 'Custom').slice(0, 14),
    cls: CLASSES[design.cls] ? design.cls : 'Attacker', rarity: 'SR', faction: 'Custom', custom: true,
    hp: stats.hp, en: stats.en, atk: stats.atk, def: stats.def, mob: stats.mob, move: stats.move,
    lore: design.lore?.trim() || 'Built by hand in your own talyer. Gawang Pinoy!',
    weapons: [stripW(w1), stripW(w2), stripW(ult)],
    look: { head: design.head, torso: design.torso, arms: design.arms, legs: design.legs, pack: design.pack, weapon: design.held || w1.held, colors: { ...design.colors } },
    design,
  };
}

export function encodeDesign(design) {
  try { return 'MBT1:' + btoa(unescape(encodeURIComponent(JSON.stringify(design)))); } catch { return ''; }
}
export function decodeDesign(code) {
  try {
    const raw = code.trim().replace(/^MBT1:/, '');
    const d = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (!d || typeof d !== 'object' || !d.head || !d.colors) return null;
    const valid = (slot) => PARTS[slot].some((p) => p.id === d[slot]);
    if (!['head', 'torso', 'arms', 'legs', 'pack'].every(valid)) return null;
    const hex = /^#[0-9a-fA-F]{6}$/;
    ['p', 's', 'a', 'e'].forEach((k) => { if (!hex.test(d.colors[k] || '')) d.colors[k] = '#888888'; });
    d.name = String(d.name || 'Shared Mecha').slice(0, 24);
    d.lore = String(d.lore || '').slice(0, 140);
    return d;
  } catch { return null; }
}

// Captured Dilim frames wear a Bayanihan repaint on your side (matches combat.js).
export function playerLook(m) {
  if (!m) return null;
  if (m.faction !== 'Dilim') return m.look;
  return m.look.img ? { ...m.look, hue: m.look.liberatedHue || 180 } : { ...m.look, colors: { p: '#0e7490', s: '#e2e8f0', a: '#facc15', e: '#22d3ee' } };
}
