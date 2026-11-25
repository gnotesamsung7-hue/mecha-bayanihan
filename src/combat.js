// ============================================================
// Pure tactical combat logic (no React). Units are plain objects.
// Turn order is speed-based: every unit has a charge time (ct) that counts
// down; the lowest acts next. Faster (higher MOB) units act more often, and
// skipping the move and/or attack makes the next turn come sooner.
// ============================================================
import { TERRAIN, MECHA, PILOTS, FLAGSHIPS, BONDS, INSTALLED_ART } from './data.js';
import { getMecha, getPilot, combinedStats } from './game.js';

export const GRID = 10; // default map size; real size comes from the stage map
export const key = (x, y) => `${x},${y}`;
export const colsOf = (b) => b.map[0].length;
export const rowsOf = (b) => b.map.length;
// Hex grid: pointy-top hexes, "odd-r" offset rows (odd rows shifted right by half a hex).
const toCube = (x, y) => { const q = x - (y - (y & 1)) / 2; return [q, y, -q - y]; };
const fromCube = (q, r) => [q + (r - (r & 1)) / 2, r];
const CUBE_DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
export const hexDist = (x1, y1, x2, y2) => { const [a, b, c] = toCube(x1, y1); const [d, e, f] = toCube(x2, y2); return Math.max(Math.abs(a - d), Math.abs(b - e), Math.abs(c - f)); };
export const dist = (a, b) => hexDist(a.x, a.y, b.x, b.y);
const NB_EVEN = [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]];
const NB_ODD = [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]];
export const neighbors = (x, y) => (y & 1 ? NB_ODD : NB_EVEN).map(([dx, dy]) => [x + dx, y + dy]);
export const inBounds = (b, x, y) => x >= 0 && y >= 0 && x < colsOf(b) && y < rowsOf(b);
export const terrainAt = (b, x, y) => TERRAIN[b.map[y][x]] || TERRAIN['.'];
export const alive = (b) => b.units.filter((u) => u.hp > 0);
export const unitAt = (b, x, y) => b.units.find((u) => u.hp > 0 && u.x === x && u.y === y) || null;
export const byUid = (b, uid) => b.units.find((u) => u.uid === uid) || null;
export const tensionLevel = (t) => (t >= 200 ? 'SUPER' : t >= 150 ? 'HIGH' : 'NORMAL');
export const clone = (b) => ({ ...b, units: b.units.map((u) => ({ ...u })), log: [...b.log], warn: [...(b.warn || [])] });

// ---------- speed & counter points ----------
const TURN_LEN = 100; // charge-time ticks per numbered turn
export const turnOf = (time) => Math.floor(time / TURN_LEN) + 1;
export const baseDelay = (u) => Math.round(10000 / (u.mob + 20));
// What the unit has done this turn decides how soon it acts again.
export function delayFactor(u) {
  const moved = u.x !== u.sx || u.y !== u.sy;
  if (moved && u.attacked) return 1;
  if (u.attacked) return 0.8; // skipped the move
  if (moved) return 0.7; // skipped the attack
  return 0.5; // skipped both
}
export const turnDelay = (u) => Math.round(baseDelay(u) * delayFactor(u));
export const cpMax = (u) => (u.ship ? 2 : u.mob >= 95 ? 3 : u.mob >= 70 ? 2 : 1);
export const cpRegen = (u) => (u.mob >= 85 ? 2 : 1);

let uidSeq = 1;
// Captured Dilim frames get a Bayanihan repaint (or a hue shift on artwork) when they fight on your side.
const LIBERATED = { p: '#0e7490', s: '#e2e8f0', a: '#facc15', e: '#22d3ee' };
function makeUnit(mecha, pilot, team, x, y, scale = 1, boss = false) {
  const s = combinedStats(mecha, pilot);
  const hpMul = scale * (boss ? 1.5 : 1);
  const maxHp = Math.round(s.hp * hpMul);
  const look = team === 'player' && mecha.faction === 'Dilim' ? (mecha.look.img ? { ...mecha.look, hue: mecha.look.liberatedHue || 180 } : { ...mecha.look, colors: LIBERATED }) : { ...mecha.look };
  const atk = Math.round(s.atk * (team === 'enemy' && !boss ? scale : boss ? 0.75 : 1));
  const def = Math.round(s.def * (team === 'enemy' && !boss ? Math.sqrt(scale) : boss ? 0.85 : 1));
  const u = {
    uid: `u${uidSeq++}`, team, mechaId: mecha.id, name: mecha.short || mecha.name, fullName: mecha.name, cls: mecha.cls, rarity: mecha.rarity,
    look, baseLook: look, weapons: mecha.weapons.map((w) => ({ ...w })),
    pilotId: pilot.id, pilotName: pilot.name, skill: pilot.skill.id, skillName: pilot.skill.name,
    x, y, ox: x, oy: y, sx: x, sy: y,
    maxHp, hp: maxHp, maxEn: s.en, en: s.en,
    atk, def, mob: s.mob, move: s.move, base: { atk, def, mob: s.mob, move: s.move },
    modes: mecha.modes || null, mode: 0, awakened: false, awakenArt: mecha.awakenArt || null, transformed: false,
    ship: !!mecha.ship, tension: 100, acted: false, moved: false, attacked: false, chain: 0, boss,
  };
  u.cp = cpMax(u);
  u.ct = Math.round(baseDelay(u) * 0.5);
  return u;
}

export function createBattle(stage, squad, save) {
  const units = [];
  let i = 0;
  for (const slot of squad) {
    if (!slot?.mechaId || i >= stage.maxDeploy) continue;
    const m = getMecha(slot.mechaId, save);
    if (!m) continue;
    const [x, y] = stage.playerSpawns[i];
    units.push(makeUnit(m, getPilot(slot.pilotId || 'kadete'), 'player', x, y));
    i++;
  }
  if (stage.playerShip) units.push(makeUnit(FLAGSHIPS.balangay, PILOTS.luz, 'player', ...stage.playerShip));
  for (const e of stage.enemies) {
    units.push(makeUnit(MECHA[e.mecha], PILOTS[e.pilot] || PILOTS.grunt, 'enemy', e.x, e.y, stage.scale, !!e.boss));
  }
  if (stage.enemyShip) units.push(makeUnit(FLAGSHIPS.karakoa, PILOTS.sitan, 'enemy', ...stage.enemyShip, stage.enemyShipScale || 1));
  return { stageId: stage.id, map: stage.map, time: 0, turn: 1, phase: 'IDLE', active: null, warn: [], units, log: [{ text: `Turn 1 — ${stage.name}: sortie!`, kind: 'sys' }], kills: 0, result: null };
}

// ---------- Forms: switchable modes + Awakening ----------
export function applyForm(u) {
  const m = u.modes?.[u.mode];
  const mod = m?.mod || {};
  let atk = u.base.atk * (1 + (mod.atkPct || 0) / 100);
  let def = u.base.def * (1 + (mod.defPct || 0) / 100);
  let mob = u.base.mob + (mod.mob || 0);
  if (u.awakened) { atk *= 1.2; def *= 1.15; mob += 15; }
  u.atk = Math.round(atk); u.def = Math.round(def); u.mob = mob;
  u.move = Math.max(1, u.base.move + (mod.move || 0));
  const art = (u.awakened && INSTALLED_ART[u.awakenArt]) || (m?.art && INSTALLED_ART[m.art]) || null;
  u.look = { ...u.baseLook, ...(art ? { img: art, facing: 'L' } : {}), aura: u.awakened || undefined, mode: u.mode ? m.name : undefined };
  u.cp = Math.min(u.cp, cpMax(u));
}
export const canTransform = (u) => !!u.modes && u.modes.length > 1 && !u.moved && !u.attacked && !u.transformed;
export const canAwaken = (u) => !u.ship && !u.awakened && u.tension >= 200;

export function transform(b0, uid) {
  const b = clone(b0); const u = byUid(b, uid);
  u.mode = (u.mode + 1) % u.modes.length; u.transformed = true;
  applyForm(u);
  const m = u.modes[u.mode];
  const events = [
    { t: 'banner', text: `${m.name.toUpperCase()}!`, kind: 'form' },
    { t: 'log', text: `🔁 ${u.name} transforms: ${m.name}${m.desc ? ` (${m.desc})` : ''}`, kind: 'chain' },
  ];
  return { battle: b, events };
}

export function awaken(b0, uid) {
  const b = clone(b0); const u = byUid(b, uid);
  u.awakened = true; u.en = u.maxEn;
  applyForm(u);
  const events = [
    { t: 'voice', pilotId: u.pilotId, cue: 'chain', team: u.team, boss: u.boss },
    { t: 'banner', text: 'AWAKENING!', kind: 'ult' },
    { t: 'pop', uid: u.uid, text: 'AWAKENED!', kind: 'super' },
    { t: 'log', text: `🌟 ${u.name} AWAKENS! +20% ATK, +15% DEF, +15 MOB, EN restored, stronger Ultimate`, kind: 'chain' },
  ];
  return { battle: b, events };
}

// ---------- Movement ----------
export function reachable(b, u) {
  const res = new Map();
  const start = key(u.x, u.y);
  const q = [[u.x, u.y, 0]];
  const seen = new Map([[start, 0]]);
  while (q.length) {
    const [x, y, c] = q.shift();
    const occ = unitAt(b, x, y);
    if (!occ || occ.uid === u.uid) res.set(key(x, y), c);
    for (const [nx, ny] of neighbors(x, y)) {
      if (!inBounds(b, nx, ny)) continue;
      const nc = c + terrainAt(b, nx, ny).cost;
      if (nc > u.move) continue;
      const o = unitAt(b, nx, ny);
      if (o && o.team !== u.team) continue;
      const k = key(nx, ny);
      if (seen.has(k) && seen.get(k) <= nc) continue;
      seen.set(k, nc);
      q.push([nx, ny, nc]);
    }
  }
  return res;
}

export const weaponUsable = (u, w) => u.en >= w.en && (!w.ult || u.tension >= 200);
export const inRange = (w, d) => d >= w.min && d <= w.max;
// single-target weapons (map weapons are fired separately)
export const usableWeapons = (u) => u.weapons.map((w, i) => ({ w, i })).filter(({ w }) => !w.map && weaponUsable(u, w));
export const mapWeapons = (u) => u.weapons.map((w, i) => ({ w, i })).filter(({ w }) => w.map);

export function enemiesOf(b, u) { return alive(b).filter((o) => o.team !== u.team); }
export function alliesOf(b, u) { return alive(b).filter((o) => o.team === u.team && o.uid !== u.uid); }

export function targetsFrom(b, u, x, y) {
  const ws = usableWeapons(u);
  return enemiesOf(b, u).filter((e) => ws.some(({ w }) => inRange(w, hexDist(e.x, e.y, x, y))));
}

export function attackTiles(b, u, positions) {
  const ws = usableWeapons(u);
  const set = new Set();
  for (const pk of positions) {
    const [px, py] = pk.split(',').map(Number);
    for (let ny = 0; ny < rowsOf(b); ny++) for (let nx = 0; nx < colsOf(b); nx++) {
      const d = hexDist(px, py, nx, ny);
      if (ws.some(({ w }) => d >= w.min && d <= w.max)) set.add(key(nx, ny));
    }
  }
  return set;
}

export function bestWeaponFor(u, d, prefer = 'damage') {
  const ws = usableWeapons(u).filter(({ w }) => inRange(w, d));
  if (!ws.length) return -1;
  ws.sort((a, b) => b.w.power - a.w.power);
  if (prefer === 'cheap') { const free = ws.filter(({ w }) => !w.ult); if (free.length) return free[0].i; }
  return ws[0].i;
}

// ---------- Map weapons (area attacks) ----------
// Returns the aim options: one per hex direction for line/cone, one per centre tile for burst.
export function mapOptions(b, u, w) {
  const [q0, r0] = toCube(u.x, u.y);
  const inside = ([x, y]) => inBounds(b, x, y);
  if (w.map === 'burst') {
    const out = [];
    for (let y = 0; y < rowsOf(b); y++) for (let x = 0; x < colsOf(b); x++) {
      const d = hexDist(u.x, u.y, x, y);
      if (d < w.min || d > w.max) continue;
      const tiles = [];
      for (let ty = 0; ty < rowsOf(b); ty++) for (let tx = 0; tx < colsOf(b); tx++) if (hexDist(x, y, tx, ty) <= 1) tiles.push(key(tx, ty));
      out.push({ id: key(x, y), center: key(x, y), tiles });
    }
    return out;
  }
  return CUBE_DIRS.map(([dq, dr], di) => {
    const line = [];
    for (let k = 1; k <= w.len; k++) line.push(fromCube(q0 + dq * k, r0 + dr * k));
    let tiles;
    if (w.map === 'line') tiles = line.filter(inside).map(([x, y]) => key(x, y));
    else {
      tiles = [];
      for (let y = 0; y < rowsOf(b); y++) for (let x = 0; x < colsOf(b); x++) {
        const d = hexDist(u.x, u.y, x, y);
        if (d < 1 || d > w.len) continue;
        const [lx, ly] = line[d - 1];
        if (hexDist(x, y, lx, ly) <= Math.floor(d / 2)) tiles.push(key(x, y));
      }
    }
    return { id: `d${di}`, tiles };
  }).filter((o) => o.tiles.length);
}
export const unitsOnTiles = (b, tiles, team) => alive(b).filter((o) => o.team === team && tiles.includes(key(o.x, o.y)));

// ---------- Formulas ----------
function auraPenalty(b, att) {
  // enemies of the attacker with pressure/boss skill within 2 tiles
  return enemiesOf(b, att).some((o) => (o.skill === 'pressure' || o.skill === 'boss') && dist(o, att) <= 2) ? 15 : 0;
}

export function hitChance(b, att, tgt, w) {
  const terr = terrainAt(b, tgt.x, tgt.y);
  let h = w.hit + (att.mob - tgt.mob) * 0.5;
  if (att.skill === 'newtype') h += 20;
  if (tgt.skill === 'newtype') h -= 20;
  h -= terr.eva;
  h -= auraPenalty(b, att);
  return Math.round(Math.max(5, Math.min(99, h)));
}

export function critChance(att, w) {
  let c = w.crit;
  if (att.skill === 'redcomet') c += 20;
  if (att.tension >= 200) c += 40;
  return Math.max(0, Math.min(100, c));
}

export function baseDamage(b, att, tgt, w, mult = 1) {
  const terr = terrainAt(b, tgt.x, tgt.y);
  const def = tgt.def * (1 + terr.def / 100);
  const tMul = att.tension >= 200 ? 1.2 : att.tension >= 150 ? 1.1 : 1;
  const awMul = att.awakened && w.ult ? 1.2 : 1;
  return Math.max(1, Math.round(((w.power + att.atk) * 100) / (100 + def) * tMul * awMul * mult));
}

export function supportAttacker(b, att, tgt) {
  const cands = alliesOf(b, att).filter((a) => dist(a, tgt) <= 2 && a.weapons.length);
  if (!cands.length) return null;
  cands.sort((p, q) => q.atk - p.atk);
  return cands[0];
}
function supportMult(s) { return (s.cls === 'Supporter' ? 0.6 : 0.5) + (s.skill === 'sniper' ? 0.15 : 0); }
function supportWeapon(s) { return s.weapons.filter((w) => !w.ult && !w.map).sort((a, b) => b.power - a.power)[0] || s.weapons[0]; }

export function supportDefender(b, tgt) {
  const c = alive(b).filter((o) => o.team === tgt.team && o.uid !== tgt.uid && o.cls === 'Defender' && !o.ship && dist(o, tgt) === 1 && o.hp > 0);
  if (!c.length) return null;
  c.sort((p, q) => q.hp - p.hp);
  return c[0];
}
const isHeavy = (dmg, tgt) => dmg >= tgt.hp || dmg >= tgt.maxHp * 0.3;

// A unit can only counter while it has counter points left.
export function counterOption(b, att, tgt) {
  if ((tgt.cp || 0) <= 0) return null;
  const d = dist(att, tgt);
  const ws = tgt.weapons.map((w, i) => ({ w, i })).filter(({ w }) => !w.ult && !w.map && tgt.en >= w.en && inRange(w, d));
  if (!ws.length) return null;
  ws.sort((p, q) => q.w.power - p.w.power);
  return ws[0];
}

// ---------- Team-up attacks ----------
export function bondFor(a, b) { return BONDS.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a)) || null; }
function teamWeapon(a, d) {
  const ws = a.weapons.filter((w) => !w.ult && !w.map && a.en >= w.en && inRange(w, d)).sort((p, q) => q.power - p.power);
  return ws[0] || null;
}
// An adjacent ally with 150+ Tension who can reach the target joins in for a full-power strike.
export function teamPartner(b, att, tgt) {
  if (att.ship || att.tension < 150) return null;
  const cands = alliesOf(b, att).filter((a) => !a.ship && a.tension >= 150 && dist(a, att) === 1 && teamWeapon(a, dist(a, tgt)));
  if (!cands.length) return null;
  cands.sort((p, q) => q.atk - p.atk);
  const a = cands[0];
  const bond = bondFor(att.pilotId, a.pilotId);
  return { unit: a, weapon: teamWeapon(a, dist(a, tgt)), name: bond ? bond.name : 'Bayanihan Combo', mult: bond ? 1.2 : 1, bond: !!bond };
}
export const TEAM_COST = 50;

export function forecast(b, attUid, tgtUid, wIdx, teamUid = null) {
  const att = byUid(b, attUid), tgt = byUid(b, tgtUid);
  const w = att.weapons[wIdx];
  const hit = hitChance(b, att, tgt, w), crit = critChance(att, w), dmg = baseDamage(b, att, tgt, w);
  const sDef = isHeavy(dmg, tgt) ? supportDefender(b, tgt) : null;
  const tp = teamPartner(b, att, tgt);
  const team = teamUid && tp && tp.unit.uid === teamUid ? { ...tp, dmg: baseDamage(b, tp.unit, tgt, tp.weapon, tp.mult), hit: hitChance(b, tp.unit, tgt, tp.weapon) } : null;
  let support = null;
  const sAtt = team ? null : supportAttacker(b, att, tgt);
  if (sAtt) { const sw = supportWeapon(sAtt); support = { unit: sAtt, weapon: sw, dmg: baseDamage(b, sAtt, tgt, sw, supportMult(sAtt)), hit: hitChance(b, sAtt, tgt, sw) }; }
  const co = counterOption(b, att, tgt);
  const counter = co ? { weapon: co.w, dmg: baseDamage(b, tgt, att, co.w), hit: hitChance(b, tgt, att, co.w), crit: critChance(tgt, co.w) } : null;
  return { att, tgt, w, hit, crit, dmg, support, team, teamAvail: tp, supportDef: sDef ? { unit: sDef, dmg: Math.round(dmg * 0.65) } : null, counter, lethal: !sDef && dmg >= tgt.hp };
}

// ---------- Resolution ----------
function gainTension(u, amt, events) {
  const before = tensionLevel(u.tension);
  u.tension = Math.min(200, u.tension + amt * (u.skill === 'biosensor' ? 2 : 1) * (u.boss ? 0.4 : 1));
  const after = tensionLevel(u.tension);
  if (after !== before) events.push({ t: 'tension', uid: u.uid, level: after });
}

function strike(b, att, tgt, w, mult, side, events, rng) {
  // returns {hit, dmg, killed, victim}
  events.push({ t: 'attack', from: att.uid, to: tgt.uid, fx: w.fx, label: w.name, side });
  const h = hitChance(b, att, tgt, w);
  if (rng() * 100 >= h) {
    events.push({ t: 'miss', uid: tgt.uid });
    events.push({ t: 'log', text: `${att.name} → ${tgt.name}: ${w.name} MISSED`, kind: side === 'counter' ? 'enemy-miss' : 'miss' });
    return { hit: false };
  }
  const crit = rng() * 100 < critChance(att, w);
  let dmg = Math.round(baseDamage(b, att, tgt, w, mult) * (0.92 + rng() * 0.16) * (crit ? 1.5 : 1));
  let victim = tgt;
  if (side === 'main' && isHeavy(dmg, tgt)) {
    const d = supportDefender(b, tgt);
    if (d) {
      dmg = Math.max(1, Math.round(dmg * 0.65));
      victim = d;
      events.push({ t: 'intercept', by: d.uid, for: tgt.uid });
      events.push({ t: 'log', text: `🛡 SUPPORT DEFENSE! ${d.name} intercepts for ${tgt.name} (-35%)`, kind: 'support' });
    }
  }
  victim.hp = Math.max(0, victim.hp - dmg);
  events.push({ t: 'damage', uid: victim.uid, amount: dmg, crit, hpAfter: victim.hp });
  events.push({ t: 'log', text: `${att.name} → ${victim.name}: ${w.name} ${crit ? 'CRITICAL ' : ''}${dmg} dmg`, kind: crit ? 'crit' : att.team === 'player' ? 'hit' : 'enemy-hit' });
  gainTension(att, side === 'map' ? 6 : 10, events);
  gainTension(victim, 5, events);
  if (victim.pilotId && victim.hp > 0 && victim.team === 'player') events.push({ t: 'voice', pilotId: victim.pilotId, cue: 'hit' });
  let killed = false;
  if (victim.hp <= 0) {
    killed = true;
    events.push({ t: 'destroy', uid: victim.uid });
    events.push({ t: 'log', text: `💥 ${victim.name} (${victim.pilotName}) destroyed!`, kind: 'kill' });
    if (victim.team === 'player' || victim.boss || victim.ship) events.push({ t: 'voice', pilotId: victim.pilotId, cue: 'destroyed' });
    gainTension(att, 30, events);
  }
  return { hit: true, dmg, killed, victim };
}

export function resolveCombat(b0, attUid, tgtUid, wIdx, rng = Math.random, teamUid = null) {
  const b = clone(b0);
  const events = [];
  const att = byUid(b, attUid), tgt = byUid(b, tgtUid);
  const w = att.weapons[wIdx];
  const tp = teamUid ? teamPartner(b, att, tgt) : null;
  const team = tp && tp.unit.uid === teamUid ? tp : null;
  att.en = Math.max(0, att.en - w.en);
  att.attacked = true;
  if (w.ult) { att.tension = 150; events.push({ t: 'tension', uid: att.uid, level: 'HIGH' }); }
  if (team) {
    const p = byUid(b, team.unit.uid);
    att.tension = Math.max(100, att.tension - TEAM_COST); p.tension = Math.max(100, p.tension - TEAM_COST);
    p.ct += Math.round(baseDelay(p) * 0.25); // the partner spends effort too
    events.push({ t: 'banner', text: `TEAM-UP: ${team.name.toUpperCase()}`, kind: 'team' });
    events.push({ t: 'log', text: `🤝 TEAM-UP! ${att.name} + ${p.name}: ${team.name}${team.bond ? ' (bond +20%)' : ''}`, kind: 'chain' });
  }
  events.push({ t: 'voice', pilotId: att.pilotId, cue: w.ult ? 'ultimate' : 'attack', team: att.team, boss: att.boss });
  if (w.ult) events.push({ t: 'banner', text: w.name.toUpperCase(), kind: 'ult' });

  const main = strike(b, att, tgt, w, 1, 'main', events, rng);
  const mainKilledTarget = main.hit && main.killed && main.victim.uid === tgt.uid;
  if (main.killed) b.kills += att.team === 'player' ? 1 : 0;

  if (tgt.hp > 0 && team) {
    const p = byUid(b, team.unit.uid);
    const r = strike(b, p, tgt, team.weapon, team.mult, 'team', events, rng);
    if (r.killed && p.team === 'player') b.kills += 1;
  } else if (tgt.hp > 0) {
    // Support attack
    const s = supportAttacker(b, att, tgt);
    if (s) {
      const sw = supportWeapon(s);
      events.push({ t: 'log', text: `⚡ SUPPORT ATTACK from ${s.name}!`, kind: 'support' });
      const r = strike(b, s, tgt, sw, supportMult(s), 'support', events, rng);
      if (r.killed && s.team === 'player') b.kills += 1;
    }
  }
  // Counter (costs 1 counter point)
  let attackerDied = false;
  if (tgt.hp > 0 && att.hp > 0) {
    const co = counterOption(b, att, tgt);
    if (co) {
      tgt.en = Math.max(0, tgt.en - co.w.en);
      tgt.cp -= 1;
      events.push({ t: 'log', text: `↩ ${tgt.name} counters! (${tgt.cp} counter point${tgt.cp === 1 ? '' : 's'} left)`, kind: 'sys' });
      const r = strike(b, tgt, att, co.w, 1, 'counter', events, rng);
      if (r.killed) { attackerDied = true; if (tgt.team === 'player') b.kills += 1; }
    } else if ((tgt.cp || 0) <= 0 && tgt.weapons.some((cw) => !cw.ult && !cw.map && inRange(cw, dist(att, tgt)))) {
      events.push({ t: 'log', text: `${tgt.name} has no counter points left — can't counter!`, kind: 'sys' });
    }
  }
  // Chain step
  const killedNow = tgt.hp <= 0;
  if (!attackerDied && att.hp > 0 && (mainKilledTarget || (killedNow && main.hit)) && att.chain < 2 && b.result == null) {
    att.chain += 1; att.acted = false; att.moved = false; att.ox = att.x; att.oy = att.y;
    events.push({ t: 'chain', uid: att.uid, n: att.chain });
    events.push({ t: 'banner', text: 'CHAIN STEP!', kind: 'chain' });
    events.push({ t: 'voice', pilotId: att.pilotId, cue: 'chain', team: att.team });
    events.push({ t: 'log', text: `✨ CHAIN STEP! ${att.name} acts again (${att.chain}/2)`, kind: 'chain' });
  } else {
    att.acted = true; att.moved = true;
  }
  b.result = checkEnd(b);
  return { battle: b, events, chained: !att.acted && att.hp > 0 };
}

// Map weapons hit every enemy in the area. No support, no counters, no chain step.
export function resolveMap(b0, attUid, wIdx, tiles, rng = Math.random) {
  const b = clone(b0);
  const events = [];
  const att = byUid(b, attUid);
  const w = att.weapons[wIdx];
  att.en = Math.max(0, att.en - w.en);
  att.attacked = true; att.acted = true; att.moved = true;
  if (w.ult) { att.tension = 150; events.push({ t: 'tension', uid: att.uid, level: 'HIGH' }); }
  events.push({ t: 'voice', pilotId: att.pilotId, cue: w.ult ? 'ultimate' : 'attack', team: att.team, boss: att.boss || att.ship });
  events.push({ t: 'banner', text: `MAP WEAPON: ${w.name.toUpperCase()}`, kind: 'map' });
  events.push({ t: 'area', tiles, fx: w.fx });
  const targets = unitsOnTiles(b, tiles, att.team === 'player' ? 'enemy' : 'player');
  if (!targets.length) events.push({ t: 'log', text: `${att.name}: ${w.name} hits nothing!`, kind: 'miss' });
  for (const t of targets) {
    if (t.hp <= 0) continue;
    const r = strike(b, att, t, w, 1, 'map', events, rng);
    if (r.killed && att.team === 'player') b.kills += 1;
  }
  b.result = checkEnd(b);
  return { battle: b, events };
}

export function checkEnd(b) {
  const a = alive(b);
  const pShip = b.units.find((u) => u.ship && u.team === 'player');
  const eShip = b.units.find((u) => u.ship && u.team === 'enemy');
  const boss = b.units.find((u) => u.boss);
  if ((pShip && pShip.hp <= 0) || !a.some((u) => u.team === 'player')) return 'DEFEAT';
  if (!a.some((u) => u.team === 'enemy') || (boss && boss.hp <= 0) || (eShip && eShip.hp <= 0)) return 'VICTORY';
  return null;
}

// ---------- Timeline ----------
function cmpTurn(p, q) {
  return p.ct - q.ct || (p.team === 'player' ? -1 : 1) - (q.team === 'player' ? -1 : 1) || q.mob - p.mob || (p.uid < q.uid ? -1 : 1);
}

// Advance time to the next unit's turn.
export function nextActor(b0) {
  const b = clone(b0);
  const live = alive(b).sort(cmpTurn);
  const u = live[0];
  const dt = Math.max(0, u.ct);
  const prevTurn = turnOf(b.time);
  b.time += dt;
  live.forEach((o) => { o.ct -= dt; });
  b.turn = turnOf(b.time);
  return { battle: b, uid: u.uid, prevTurn };
}

// Who acts next. The active unit is placed by what it has done so far (as if it ended its turn now).
export function turnOrder(b, n = 8) {
  const sim = alive(b).map((u) => ({ uid: u.uid, team: u.team, mob: u.mob, ct: u.uid === b.active ? turnDelay(u) : u.ct, d: baseDelay(u) }));
  const out = [];
  for (let i = 0; i < n && sim.length; i++) {
    sim.sort(cmpTurn);
    const s = sim[0]; const dt = s.ct;
    out.push(s.uid);
    sim.forEach((o) => { o.ct -= dt; });
    s.ct = s.d;
  }
  return out;
}

export function beginTurn(b0, uid) {
  const b = clone(b0);
  const events = [];
  const u = byUid(b, uid);
  b.active = uid;
  u.acted = false; u.moved = false; u.attacked = false; u.transformed = false; u.chain = 0;
  u.ox = u.sx = u.x; u.oy = u.sy = u.y;
  u.en = Math.min(u.maxEn, u.en + 5);
  u.cp = Math.min(cpMax(u), (u.cp || 0) + cpRegen(u));
  const terr = terrainAt(b, u.x, u.y);
  const ship = b.units.find((o) => o.ship && o.team === u.team && o.hp > 0 && o.uid !== u.uid);
  const pct = (terr.heal || 0) + (ship && dist(ship, u) <= 1 ? 10 : 0);
  if (pct) {
    const hpGain = Math.round(u.maxHp * pct / 100), enGain = Math.round(u.maxEn * pct / 100);
    const before = u.hp;
    u.hp = Math.min(u.maxHp, u.hp + hpGain); u.en = Math.min(u.maxEn, u.en + enGain);
    if (u.hp > before) events.push({ t: 'heal', uid: u.uid, amount: u.hp - before });
    const src = terr.heal && ship && dist(ship, u) <= 1 ? `Talyer Dock + ${ship.name}` : terr.heal ? 'Talyer Dock' : ship.name;
    events.push({ t: 'log', text: `🔧 ${src} repairs ${u.name}: +${u.hp - before} HP, +${enGain} EN`, kind: 'heal' });
  }
  return { battle: b, events };
}

export function endTurn(b0, uid) {
  const b = clone(b0);
  const u = byUid(b, uid);
  if (u && u.hp > 0) {
    if (!u.attacked) u.cp = Math.min(cpMax(u), u.cp + 1); // holding fire readies a counter
    u.ct = turnDelay(u);
    u.acted = true; u.moved = true;
  }
  b.active = null;
  return b;
}

// Stage events that fire when a new numbered turn begins.
export function turnEvents(b0, stage, fromTurn, toTurn) {
  const b = clone(b0);
  const events = [];
  for (let t = fromTurn + 1; t <= toTurn; t++) {
    if (t > 1) events.push({ t: 'log', text: `— Turn ${t} —`, kind: 'sys' });
    for (const ev of stage.events || []) {
      if (ev.type === 'hazard' && ev.turn - 1 === t) {
        b.warn = hazardTiles(b, ev);
        events.push({ t: 'banner', text: `WARNING: ${ev.name.toUpperCase()}`, kind: 'warn' });
        events.push({ t: 'log', text: `⚠ ${ev.text} Get off the marked tiles before turn ${ev.turn}!`, kind: 'enemy-hit' });
      }
      if (ev.turn !== t) continue;
      if (ev.type === 'reinforce') {
        events.push({ t: 'banner', text: ev.team === 'player' ? 'ALLY REINFORCEMENTS!' : 'ENEMY REINFORCEMENTS!', kind: ev.team === 'player' ? 'player' : 'enemy' });
        events.push({ t: 'log', text: `📡 ${ev.text}`, kind: 'sys' });
        for (const s of ev.units) {
          const spot = freeSpotNear(b, s.x, s.y);
          if (!spot) continue;
          const u = makeUnit(MECHA[s.mecha], PILOTS[s.pilot] || PILOTS.grunt, ev.team, spot[0], spot[1], ev.team === 'enemy' ? stage.scale : 1);
          b.units.push(u);
          events.push({ t: 'spawn', uid: u.uid });
        }
      }
      if (ev.type === 'hazard') {
        const tiles = hazardTiles(b, ev);
        events.push({ t: 'banner', text: ev.name.toUpperCase(), kind: 'warn' });
        events.push({ t: 'area', tiles, fx: 'missile' });
        for (const u of alive(b).filter((o) => tiles.includes(key(o.x, o.y)))) {
          const dmg = Math.min(u.hp - 1, Math.round(u.maxHp * ev.pct / 100));
          if (dmg <= 0) continue;
          u.hp -= dmg;
          events.push({ t: 'damage', uid: u.uid, amount: dmg, crit: false, hpAfter: u.hp });
          events.push({ t: 'log', text: `☄ ${ev.name} hits ${u.name} for ${dmg}!`, kind: u.team === 'player' ? 'enemy-hit' : 'hit' });
        }
        b.warn = [];
      }
    }
  }
  b.result = checkEnd(b);
  return { battle: b, events };
}
function hazardTiles(b, ev) {
  const out = [];
  ev.rows.forEach((y) => { for (let x = 0; x < colsOf(b); x++) out.push(key(x, y)); });
  return out;
}
function freeSpotNear(b, x, y) {
  let best = null, bd = Infinity;
  for (let ty = 0; ty < rowsOf(b); ty++) for (let tx = 0; tx < colsOf(b); tx++) {
    if (unitAt(b, tx, ty)) continue;
    const d = hexDist(x, y, tx, ty);
    if (d < bd) { bd = d; best = [tx, ty]; }
  }
  return best;
}

// ---------- AI ----------
function scoreStrike(tmp, probe, tgt, w) {
  const hit = hitChance(tmp, probe, tgt, w) / 100;
  const dmg = baseDamage(tmp, probe, tgt, w);
  let score = hit * Math.min(dmg, tgt.hp);
  if (dmg >= tgt.hp) score += 220 * hit;
  if (tgt.ship) score += 15; // the flagship is the win condition
  return { score, dmg, hit };
}

export function aiPlan(b, u) {
  // Fortress bosses hold their ground; a unit that already moved fires from where it stands.
  const moves = u.boss || u.moved ? new Map([[key(u.x, u.y), 0]]) : reachable(b, u);
  let best = null;
  const enemies = enemiesOf(b, u);
  const own = b.units.find((o) => o.ship && o.team === u.team && o.hp > 0 && o.uid !== u.uid);
  for (const [pk] of moves) {
    const [x, y] = pk.split(',').map(Number);
    const terr = terrainAt(b, x, y);
    const nearShip = own && hexDist(own.x, own.y, x, y) <= 1 && u.hp < u.maxHp * 0.6 ? 15 : 0;
    const posBonus = terr.eva * 0.6 + (terr.heal && u.hp < u.maxHp * 0.6 ? 25 : 0) + nearShip;
    const probe = { ...u, x, y };
    const tmp = { ...b, units: b.units.map((o) => (o.uid === u.uid ? probe : o)) };
    for (const e of enemies) {
      const d = hexDist(e.x, e.y, x, y);
      usableWeapons(u).forEach(({ w, i }) => {
        if (!inRange(w, d)) return;
        const tgt = byUid(tmp, e.uid);
        const s = scoreStrike(tmp, probe, tgt, w);
        let score = s.score;
        if (tgt.boss) score -= u.team === 'player' ? 25 : 0; // clear escorts first
        if (w.ult && s.dmg < tgt.hp * 0.5 && s.dmg < tgt.hp) score -= 30; // save ult for big moments
        score -= w.en * 0.3;
        const co = counterOption(tmp, probe, tgt);
        if (co && s.dmg < tgt.hp) score -= hitChance(tmp, tgt, probe, co.w) / 100 * baseDamage(tmp, tgt, probe, co.w) * 0.45;
        score += posBonus;
        if (!best || score > best.score) best = { score, x, y, targetUid: e.uid, wIdx: i };
      });
    }
    // map weapons: worth it when they catch several enemies
    mapWeapons(u).forEach(({ w, i }) => {
      if (!weaponUsable(u, w)) return;
      for (const opt of mapOptions(tmp, probe, w)) {
        const hits = unitsOnTiles(tmp, opt.tiles, u.team === 'player' ? 'enemy' : 'player');
        if (!hits.length) continue;
        let score = hits.reduce((acc, t) => acc + scoreStrike(tmp, probe, t, w).score, 0) - w.en * 0.3 + posBonus;
        if (hits.length < 2) score -= 80;
        if (!best || score > best.score) best = { score, x, y, map: { wIdx: i, tiles: opt.tiles } };
      }
    });
  }
  if (best) return best;
  // no target: advance toward nearest enemy (or heal on dock if hurt); flagships hang back
  let goal = null, gd = Infinity;
  for (const e of enemies) { const d = dist(u, e); if (d < gd) { gd = d; goal = e; } }
  let mv = null, md = Infinity;
  for (const [pk] of moves) {
    const [x, y] = pk.split(',').map(Number);
    const terr = terrainAt(b, x, y);
    let d = goal ? hexDist(goal.x, goal.y, x, y) : 0;
    if (u.ship) d = Math.abs(d - 4); // keep the ship at cannon range
    if (terr.heal && u.hp < u.maxHp * 0.5) d -= 4;
    d -= terr.eva / 30;
    if (d < md) { md = d; mv = { x, y }; }
  }
  return { x: mv?.x ?? u.x, y: mv?.y ?? u.y, wait: true };
}

export function moveUnit(b0, uid, x, y) {
  const b = clone(b0);
  const u = byUid(b, uid);
  u.x = x; u.y = y; u.moved = true;
  return b;
}
