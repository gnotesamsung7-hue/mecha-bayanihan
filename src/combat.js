// ============================================================
// Pure tactical combat logic (no React). Units are plain objects.
// ============================================================
import { TERRAIN, MECHA, PILOTS } from './data.js';
import { getMecha, getPilot, combinedStats } from './game.js';

export const GRID = 8;
export const key = (x, y) => `${x},${y}`;
// Hex grid: pointy-top hexes, "odd-r" offset rows (odd rows shifted right by half a hex).
const toCube = (x, y) => { const q = x - (y - (y & 1)) / 2; return [q, y, -q - y]; };
export const hexDist = (x1, y1, x2, y2) => { const [a, b, c] = toCube(x1, y1); const [d, e, f] = toCube(x2, y2); return Math.max(Math.abs(a - d), Math.abs(b - e), Math.abs(c - f)); };
export const dist = (a, b) => hexDist(a.x, a.y, b.x, b.y);
const NB_EVEN = [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]];
const NB_ODD = [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]];
export const neighbors = (x, y) => (y & 1 ? NB_ODD : NB_EVEN).map(([dx, dy]) => [x + dx, y + dy]);
export const inBounds = (x, y) => x >= 0 && y >= 0 && x < GRID && y < GRID;
export const terrainAt = (b, x, y) => TERRAIN[b.map[y][x]] || TERRAIN['.'];
export const alive = (b) => b.units.filter((u) => u.hp > 0);
export const unitAt = (b, x, y) => b.units.find((u) => u.hp > 0 && u.x === x && u.y === y) || null;
export const byUid = (b, uid) => b.units.find((u) => u.uid === uid) || null;
export const tensionLevel = (t) => (t >= 200 ? 'SUPER' : t >= 150 ? 'HIGH' : 'NORMAL');
export const clone = (b) => ({ ...b, units: b.units.map((u) => ({ ...u })), log: [...b.log] });

let uidSeq = 1;
// Captured Dilim frames get a Bayanihan repaint (or a hue shift on artwork) when they fight on your side.
const LIBERATED = { p: '#0e7490', s: '#e2e8f0', a: '#facc15', e: '#22d3ee' };
function makeUnit(mecha, pilot, team, x, y, scale = 1, boss = false) {
  const s = combinedStats(mecha, pilot);
  const hpMul = scale * (boss ? 1.5 : 1);
  const maxHp = Math.round(s.hp * hpMul);
  return {
    uid: `u${uidSeq++}`, team, mechaId: mecha.id, name: mecha.short || mecha.name, fullName: mecha.name, cls: mecha.cls, rarity: mecha.rarity,
    look: team === 'player' && mecha.faction === 'Dilim' ? (mecha.look.img ? { ...mecha.look, hue: mecha.look.liberatedHue || 180 } : { ...mecha.look, colors: LIBERATED }) : mecha.look, weapons: mecha.weapons.map((w) => ({ ...w })),
    pilotId: pilot.id, pilotName: pilot.name, skill: pilot.skill.id, skillName: pilot.skill.name,
    x, y, ox: x, oy: y,
    maxHp, hp: maxHp, maxEn: s.en, en: s.en,
    atk: Math.round(s.atk * (team === 'enemy' && !boss ? scale : boss ? 0.75 : 1)), def: Math.round(s.def * (team === 'enemy' && !boss ? Math.sqrt(scale) : boss ? 0.85 : 1)), mob: s.mob, move: s.move,
    tension: 100, acted: false, moved: false, chain: 0, boss,
  };
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
  for (const e of stage.enemies) {
    units.push(makeUnit(MECHA[e.mecha], PILOTS[e.pilot] || PILOTS.grunt, 'enemy', e.x, e.y, stage.scale, !!e.boss));
  }
  return { stageId: stage.id, map: stage.map, turn: 1, phase: 'PLAYER_IDLE', units, log: [{ text: `Turn 1 — Player Phase. ${stage.name}: sortie!`, kind: 'sys' }], kills: 0, result: null };
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
      if (!inBounds(nx, ny)) continue;
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
export const usableWeapons = (u) => u.weapons.map((w, i) => ({ w, i })).filter(({ w }) => weaponUsable(u, w));

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
    for (let ny = 0; ny < GRID; ny++) for (let nx = 0; nx < GRID; nx++) {
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
  return Math.max(1, Math.round(((w.power + att.atk) * 100) / (100 + def) * tMul * mult));
}

export function supportAttacker(b, att, tgt) {
  const cands = alliesOf(b, att).filter((a) => dist(a, tgt) <= 2 && a.weapons.length);
  if (!cands.length) return null;
  cands.sort((p, q) => q.atk - p.atk);
  return cands[0];
}
function supportMult(s) { return (s.cls === 'Supporter' ? 0.6 : 0.5) + (s.skill === 'sniper' ? 0.15 : 0); }
function supportWeapon(s) { return s.weapons.filter((w) => !w.ult).sort((a, b) => b.power - a.power)[0] || s.weapons[0]; }

export function supportDefender(b, tgt) {
  const c = alive(b).filter((o) => o.team === tgt.team && o.uid !== tgt.uid && o.cls === 'Defender' && dist(o, tgt) === 1 && o.hp > 0);
  if (!c.length) return null;
  c.sort((p, q) => q.hp - p.hp);
  return c[0];
}
const isHeavy = (dmg, tgt) => dmg >= tgt.hp || dmg >= tgt.maxHp * 0.3;

export function counterOption(b, att, tgt) {
  const d = dist(att, tgt);
  const ws = tgt.weapons.map((w, i) => ({ w, i })).filter(({ w }) => !w.ult && tgt.en >= w.en && inRange(w, d));
  if (!ws.length) return null;
  ws.sort((p, q) => q.w.power - p.w.power);
  return ws[0];
}

export function forecast(b, attUid, tgtUid, wIdx) {
  const att = byUid(b, attUid), tgt = byUid(b, tgtUid);
  const w = att.weapons[wIdx];
  const hit = hitChance(b, att, tgt, w), crit = critChance(att, w), dmg = baseDamage(b, att, tgt, w);
  const sDef = isHeavy(dmg, tgt) ? supportDefender(b, tgt) : null;
  const sAtt = supportAttacker(b, att, tgt);
  let support = null;
  if (sAtt) { const sw = supportWeapon(sAtt); support = { unit: sAtt, weapon: sw, dmg: baseDamage(b, sAtt, tgt, sw, supportMult(sAtt)), hit: hitChance(b, sAtt, tgt, sw) }; }
  const co = counterOption(b, att, tgt);
  const counter = co ? { weapon: co.w, dmg: baseDamage(b, tgt, att, co.w), hit: hitChance(b, tgt, att, co.w), crit: critChance(tgt, co.w) } : null;
  return { att, tgt, w, hit, crit, dmg, support, supportDef: sDef ? { unit: sDef, dmg: Math.round(dmg * 0.65) } : null, counter, lethal: !sDef && dmg >= tgt.hp };
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
  if (side !== 'counter' && side !== 'support' && isHeavy(dmg, tgt)) {
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
  gainTension(att, 10, events);
  gainTension(victim, 5, events);
  if (victim.pilotId && victim.hp > 0 && victim.team === 'player') events.push({ t: 'voice', pilotId: victim.pilotId, cue: 'hit' });
  let killed = false;
  if (victim.hp <= 0) {
    killed = true;
    events.push({ t: 'destroy', uid: victim.uid });
    events.push({ t: 'log', text: `💥 ${victim.name} (${victim.pilotName}) destroyed!`, kind: 'kill' });
    if (victim.team === 'player' || victim.boss) events.push({ t: 'voice', pilotId: victim.pilotId, cue: 'destroyed' });
    gainTension(att, 30, events);
  }
  return { hit: true, dmg, killed, victim };
}

export function resolveCombat(b0, attUid, tgtUid, wIdx, rng = Math.random) {
  const b = clone(b0);
  const events = [];
  const att = byUid(b, attUid), tgt = byUid(b, tgtUid);
  const w = att.weapons[wIdx];
  att.en = Math.max(0, att.en - w.en);
  if (w.ult) { att.tension = 150; events.push({ t: 'tension', uid: att.uid, level: 'HIGH' }); }
  events.push({ t: 'voice', pilotId: att.pilotId, cue: w.ult ? 'ultimate' : 'attack', team: att.team, boss: att.boss });
  if (w.ult) events.push({ t: 'banner', text: w.name.toUpperCase(), kind: 'ult' });

  const main = strike(b, att, tgt, w, 1, 'main', events, rng);
  const mainKilledTarget = main.hit && main.killed && main.victim.uid === tgt.uid;
  if (main.killed) b.kills += att.team === 'player' ? 1 : 0;

  // Support attack
  if (tgt.hp > 0) {
    const s = supportAttacker(b, att, tgt);
    if (s) {
      const sw = supportWeapon(s);
      events.push({ t: 'log', text: `⚡ SUPPORT ATTACK from ${s.name}!`, kind: 'support' });
      const r = strike(b, s, tgt, sw, supportMult(s), 'support', events, rng);
      if (r.killed && s.team === 'player') b.kills += 1;
    }
  }
  // Counter
  let attackerDied = false;
  if (tgt.hp > 0 && att.hp > 0) {
    const co = counterOption(b, att, tgt);
    if (co) {
      tgt.en = Math.max(0, tgt.en - co.w.en);
      events.push({ t: 'log', text: `↩ ${tgt.name} counters!`, kind: 'sys' });
      const r = strike(b, tgt, att, co.w, 1, 'counter', events, rng);
      if (r.killed) { attackerDied = true; if (tgt.team === 'player') b.kills += 1; }
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

export function checkEnd(b) {
  const a = alive(b);
  const boss = b.units.find((u) => u.boss);
  if (!a.some((u) => u.team === 'enemy') || (boss && boss.hp <= 0)) return 'VICTORY';
  if (!a.some((u) => u.team === 'player')) return 'DEFEAT';
  return null;
}

export function startPhase(b0, team) {
  const b = clone(b0);
  const events = [];
  for (const u of b.units) {
    if (u.team !== team || u.hp <= 0) continue;
    u.acted = false; u.moved = false; u.chain = 0; u.ox = u.x; u.oy = u.y;
    u.en = Math.min(u.maxEn, u.en + 5);
    const terr = terrainAt(b, u.x, u.y);
    if (terr.heal) {
      const hpGain = Math.round(u.maxHp * terr.heal / 100), enGain = Math.round(u.maxEn * terr.heal / 100);
      const before = u.hp;
      u.hp = Math.min(u.maxHp, u.hp + hpGain); u.en = Math.min(u.maxEn, u.en + enGain);
      events.push({ t: 'heal', uid: u.uid, amount: u.hp - before });
      events.push({ t: 'log', text: `🔧 Talyer Dock repairs ${u.name}: +${u.hp - before} HP, +${enGain} EN`, kind: 'heal' });
    }
  }
  return { battle: b, events };
}

// ---------- AI ----------
export function aiPlan(b, u) {
  // Fortress bosses hold their ground and fire from where they stand.
  const moves = u.boss ? new Map([[key(u.x, u.y), 0]]) : reachable(b, u);
  let best = null;
  const enemies = enemiesOf(b, u);
  for (const [pk] of moves) {
    const [x, y] = pk.split(',').map(Number);
    const terr = terrainAt(b, x, y);
    const posBonus = terr.eva * 0.6 + (terr.heal && u.hp < u.maxHp * 0.6 ? 25 : 0);
    const probe = { ...u, x, y };
    const tmp = { ...b, units: b.units.map((o) => (o.uid === u.uid ? probe : o)) };
    for (const e of enemies) {
      const d = hexDist(e.x, e.y, x, y);
      usableWeapons(u).forEach(({ w, i }) => {
        if (!inRange(w, d)) return;
        const tgt = byUid(tmp, e.uid);
        const hit = hitChance(tmp, probe, tgt, w) / 100;
        const dmg = baseDamage(tmp, probe, tgt, w);
        let score = hit * Math.min(dmg, tgt.hp) * 1.0;
        if (dmg >= tgt.hp) score += 220 * hit;
        if (tgt.boss) score -= u.team === 'player' ? 25 : 0; // clear escorts first
        if (w.ult && dmg < tgt.hp * 0.5 && dmg < tgt.hp) score -= 30; // save ult for big moments
        score -= w.en * 0.3;
        const co = counterOption(tmp, probe, tgt);
        if (co && dmg < tgt.hp) score -= hitChance(tmp, tgt, probe, co.w) / 100 * baseDamage(tmp, tgt, probe, co.w) * 0.45;
        score += posBonus;
        if (!best || score > best.score) best = { score, x, y, targetUid: e.uid, wIdx: i };
      });
    }
  }
  if (best) return best;
  // no target: advance toward nearest enemy (or heal on dock if hurt)
  let goal = null, gd = Infinity;
  for (const e of enemies) { const d = dist(u, e); if (d < gd) { gd = d; goal = e; } }
  let mv = null, md = Infinity;
  for (const [pk] of moves) {
    const [x, y] = pk.split(',').map(Number);
    const terr = terrainAt(b, x, y);
    let d = goal ? hexDist(goal.x, goal.y, x, y) : 0;
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
