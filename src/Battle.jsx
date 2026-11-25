import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Box, Film, Swords, Shield, Zap, FastForward, Flag, Hourglass, Undo2, Crosshair, Crown, Wrench, X, Check, Trophy, Skull, ScrollText, Repeat, Sparkles, Radiation, Users, Ship, AlertTriangle } from 'lucide-react';
import { MechaSprite, PilotPortrait } from './Sprite.jsx';
import Cinematic, { buildExchange } from './Cinematic.jsx';
import Board3D from './Board3D.jsx';
import { ClassBadge, Bar, hpColor, Btn, Modal, StatPill } from './ui.jsx';
import { TERRAIN, PILOTS } from './data.js';
import { sfx, playVoice } from './audio.js';
import {
  key, dist, hexDist, unitAt, byUid, alive, terrainAt, reachable, attackTiles, targetsFrom, bestWeaponFor, weaponUsable, inRange,
  forecast as computeForecast, resolveCombat, resolveMap, mapOptions, mapWeapons, unitsOnTiles, aiPlan, moveUnit, tensionLevel, clone, checkEnd,
  nextActor, beginTurn, endTurn, turnEvents, turnOrder, delayFactor, cpMax, canTransform, canAwaken, transform, awaken, hitChance, baseDamage, TEAM_COST,
} from './combat.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FX_SOUND = { beam: 'beam', shot: 'shot', missile: 'missile', slash: 'slash', mega: 'mega', rainbow: 'rainbow' };
const FX_COLOR = { beam: '#22d3ee', shot: '#fde047', missile: '#fb923c', slash: '#f8fafc', mega: '#f472b6', rainbow: '#a78bfa' };

// deterministic star field per tile
function stars(x, y) {
  const out = []; let s = (x * 73856093) ^ (y * 19349663);
  for (let i = 0; i < 3; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; const a = (s % 100); s = (s * 1103515245 + 12345) & 0x7fffffff; const b2 = (s % 100); out.push([a, b2]); }
  return out;
}

// Pointy-top hex geometry (odd-r offset). One hex is 100 wide in SVG units.
const HEX_W = 100;
const HEX_R = HEX_W / Math.sqrt(3); // circumradius ≈ 57.7
const HEX_H = HEX_R * 2;
const boardSize = (b) => [HEX_W * (b.map[0].length + 0.5), HEX_H + (b.map.length - 1) * HEX_H * 0.75];
function hexCenter(x, y) { return [(x + 0.5 * (y & 1)) * HEX_W + HEX_W / 2, y * HEX_H * 0.75 + HEX_R]; }
function hexPoints(cx, cy, r) { return [-90, -30, 30, 90, 150, 210].map((a) => { const t = (a * Math.PI) / 180; return `${(cx + r * Math.cos(t)).toFixed(1)},${(cy + r * Math.sin(t)).toFixed(1)}`; }).join(' '); }

function TensionChip({ t }) {
  const lv = tensionLevel(t);
  const cls = lv === 'SUPER' ? 'bg-gradient-to-r from-amber-400 to-fuchsia-500 text-slate-950 animate-pulse' : lv === 'HIGH' ? 'bg-amber-500/80 text-slate-950' : 'bg-slate-700 text-slate-200';
  const label = lv === 'SUPER' ? 'SUPERCHARGED' : lv === 'HIGH' ? 'HIGH' : 'NORMAL';
  return <span className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider ${cls}`}>{label} {t}</span>;
}

function CpPips({ u }) {
  const max = cpMax(u);
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-slate-400" title="Counter points: each counter-attack costs 1. Refills at the start of the unit's turn (faster for agile units); holding fire gives +1.">
      <span>Counter</span>
      {Array.from({ length: max }, (_, i) => <span key={i} className={`w-2.5 h-2.5 rotate-45 border ${i < u.cp ? 'bg-rose-400 border-rose-200' : 'border-slate-600'}`} />)}
      <span className="tabular-nums">{u.cp}/{max}</span>
    </div>
  );
}

function TurnBar({ b }) {
  const order = turnOrder(b, 8);
  const act = b.active ? byUid(b, b.active) : null;
  const Chip = ({ u, now, me }) => (
    <div title={`${u.fullName} (${u.pilotName})`} className={`relative shrink-0 rounded-md p-0.5 border-2 ${now ? 'w-12 h-12 sm:w-14 sm:h-14 border-amber-300 shadow-[0_0_14px_rgba(252,211,77,.7)]' : 'w-9 h-9 sm:w-11 sm:h-11'} ${u.team === 'player' ? 'bg-sky-950/80' + (now ? '' : ' border-sky-500/70') : 'bg-rose-950/80' + (now ? '' : ' border-rose-500/70')} ${me ? 'ring-2 ring-amber-300/80 ring-offset-1 ring-offset-slate-950' : ''}`}>
      <MechaSprite look={u.look} size="100%" />
      {u.ship && <Ship className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-300" />}
      {u.boss && <Crown className="absolute -top-1 -right-1 w-3.5 h-3.5 text-amber-300" />}
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 bg-slate-950/85 rounded-xl hud-border px-2 py-1.5 overflow-x-auto" data-turnbar>
      <div className="text-[9px] font-black tracking-widest text-amber-300 leading-tight shrink-0 w-9">TURN<br />ORDER</div>
      {act && <><Chip u={act} now /><span className="text-[9px] font-black text-amber-300 shrink-0">NOW ›</span></>}
      {order.map((uid, i) => { const u = byUid(b, uid); return u ? <Chip key={`${uid}-${i}`} u={u} me={uid === b.active} /> : null; })}
    </div>
  );
}

function MapCard({ b, aim, onConfirm, onCancel }) {
  const att = byUid(b, b.active); const w = att.weapons[aim.wIdx];
  const opt = aim.opts.find((o) => o.id === aim.optId);
  const hits = opt ? unitsOnTiles(b, opt.tiles, att.team === 'player' ? 'enemy' : 'player') : [];
  return (
    <div className="p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-black tracking-[0.2em] text-orange-300 flex items-center gap-1"><Radiation size={13} /> MAP WEAPON</div>
        <button onClick={onCancel} className="text-slate-400 hover:text-white"><X size={16} /></button>
      </div>
      <div className="text-sm font-bold text-white">{w.name}</div>
      <div className="text-[11px] text-slate-400">Power {w.power} · EN {w.en} · {w.map === 'line' ? `straight line, ${w.len} tiles` : w.map === 'cone' ? `cone, ${w.len} tiles` : 'burst'} · hits every enemy in the area · no counters</div>
      {!opt ? <div className="text-xs text-amber-200 bg-amber-500/10 rounded px-2 py-1.5">Tap a red tile on the board to aim.</div> : (
        <div className="space-y-1">
          {hits.length ? hits.map((t) => (
            <div key={t.uid} className="text-[11px] flex justify-between bg-rose-950/50 rounded px-2 py-1"><span className="text-rose-200">{t.name}</span><span className="tabular-nums text-slate-300">{hitChance(b, att, t, w)}% · ~{baseDamage(b, att, t, w)} dmg{baseDamage(b, att, t, w) >= t.hp ? ' · LETHAL' : ''}</span></div>
          )) : <div className="text-xs text-slate-400">No enemies in this area.</div>}
        </div>
      )}
      <div className="flex gap-2">
        <Btn variant="amber" className="flex-1" onClick={onConfirm} disabled={!opt || !hits.length}><Radiation size={15} /> Fire ({hits.length} target{hits.length === 1 ? '' : 's'})</Btn>
        <Btn variant="slate" onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  );
}

function UnitCard({ u, b }) {
  if (!u) return null;
  const pilot = PILOTS[u.pilotId] || PILOTS.kadete;
  const terr = terrainAt(b, u.x, u.y);
  return (
    <div className="p-2.5 space-y-2">
      <div className="flex gap-2 items-center">
        <div className={`rounded-lg ${u.team === 'player' ? 'bg-sky-950/60' : 'bg-rose-950/60'} p-1`}><MechaSprite look={u.look} size={56} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`font-bold ${u.team === 'player' ? 'text-sky-200' : 'text-rose-200'}`}>{u.fullName}</span>
            {u.boss && <span className="text-[9px] bg-rose-600 px-1 rounded font-black">BOSS</span>}
            {u.ship && <span className="text-[9px] bg-amber-600 px-1 rounded font-black">FLAGSHIP</span>}
            {u.awakened && <span className="text-[9px] bg-gradient-to-r from-amber-400 to-fuchsia-500 text-slate-950 px-1 rounded font-black">AWAKENED</span>}
            {u.mode > 0 && <span className="text-[9px] bg-cyan-700 px-1 rounded font-black">{u.modes[u.mode].name.toUpperCase()}</span>}
          </div>
          <div className="flex gap-1 items-center mt-0.5"><ClassBadge cls={u.cls} small /><TensionChip t={u.tension} /></div>
          <div className="flex items-center gap-1.5 mt-1">
            <PilotPortrait pilot={pilot} size={22} />
            <div className="text-[11px] leading-tight"><div className="text-slate-200">{u.pilotName}</div><div className="text-amber-300/90">{u.skillName}</div></div>
          </div>
        </div>
      </div>
      <Bar value={u.hp} max={u.maxHp} color={hpColor(u.hp, u.maxHp)} label="HP" />
      <Bar value={u.en} max={u.maxEn} color="bg-sky-400" label="EN" />
      <Bar value={u.tension - 100} max={100} color={u.tension >= 200 ? 'bg-fuchsia-400' : 'bg-amber-400'} label={`Tension ${u.tension}/200`} />
      <CpPips u={u} />
      {u.ship && <div className="text-[10px] text-amber-200">🚢 Allies next to this ship repair 10% HP/EN on their turn. {u.team === 'player' ? 'If it sinks, the battle is lost.' : 'Sink it to win!'}</div>}
      <div className="grid grid-cols-4 gap-1">
        <StatPill label="ATK" value={u.atk} /><StatPill label="DEF" value={u.def} /><StatPill label="MOB" value={u.mob} /><StatPill label="MOVE" value={u.move} />
      </div>
      <div className="text-[10px] text-slate-400">Terrain: <span className="text-slate-200">{terr.name}</span>{terr.eva ? ` (+${terr.eva}% EVA/DEF)` : ''}{terr.heal ? ` (+${terr.heal}% HP/EN per turn)` : ''}</div>
      <div className="space-y-1">
        {u.weapons.map((w, i) => {
          const ok = weaponUsable(u, w);
          return (
            <div key={i} className={`text-[11px] flex justify-between gap-2 rounded px-1.5 py-1 ${w.ult ? 'bg-fuchsia-950/50 border border-fuchsia-500/30' : 'bg-slate-800/60'} ${ok ? '' : 'opacity-50'}`}>
              <span className="truncate">{w.ult && <Zap size={10} className="inline text-fuchsia-300 mr-0.5" />}{w.name}</span>
              <span className="text-slate-400 shrink-0 tabular-nums">PWR {w.power} · R{w.min}-{w.max} · EN {w.en} · {w.hit}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ForecastCard({ b, fc, onWeapon, onTeam, onConfirm, onCancel, enemyPreview }) {
  const f = useMemo(() => computeForecast(b, fc.attUid, fc.tgtUid, fc.wIdx, fc.team || null), [b, fc]);
  const { att, tgt } = f;
  const d = dist(att, tgt);
  const killHint = f.lethal;
  const Side = ({ u, align }) => (
    <div className={`flex-1 min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <MechaSprite look={u.look} size={44} />
        <div className="min-w-0">
          <div className={`text-xs font-bold truncate ${u.team === 'player' ? 'text-sky-200' : 'text-rose-200'}`}>{u.name}</div>
          <div className="text-[10px] text-slate-400 truncate">{u.pilotName}</div>
        </div>
      </div>
      <Bar value={u.hp} max={u.maxHp} color={hpColor(u.hp, u.maxHp)} h="h-2" />
      <div className="text-[10px] tabular-nums text-slate-300">{u.hp}/{u.maxHp}</div>
    </div>
  );
  return (
    <div className="p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-black tracking-[0.2em] text-amber-300 flex items-center gap-1"><Crosshair size={13} /> {enemyPreview ? 'ENEMY ATTACK' : 'BATTLE FORECAST'}</div>
        {!enemyPreview && <button onClick={onCancel} className="text-slate-400 hover:text-white"><X size={16} /></button>}
      </div>
      <div className="flex gap-2 items-start">
        <Side u={att} /><div className="text-amber-300 font-black text-sm pt-3">VS</div><Side u={tgt} align="right" />
      </div>
      {!enemyPreview && (
        <div className="flex flex-wrap gap-1">
          {att.weapons.map((w, i) => {
            if (w.map) return null;
            const ok = weaponUsable(att, w) && inRange(w, d);
            return (
              <button key={i} disabled={!ok} onClick={() => { sfx('beep'); onWeapon(i); }}
                className={`text-[10px] px-1.5 py-1 rounded border transition ${i === fc.wIdx ? 'border-amber-300 bg-amber-500/25 text-amber-100' : 'border-slate-600 bg-slate-800/60 text-slate-300'} ${w.ult ? 'border-fuchsia-400/60' : ''} disabled:opacity-30`}>
                {w.ult && <Zap size={9} className="inline text-fuchsia-300" />} {w.name}{w.ult && att.tension < 200 ? ' (needs 200 Tension)' : ''}
              </button>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-3 gap-1">
        <StatPill label="Hit" value={`${f.hit}%`} accent="text-cyan-200" />
        <StatPill label="Damage" value={f.dmg} accent={killHint ? 'text-rose-300' : 'text-white'} />
        <StatPill label="Crit" value={`${f.crit}%`} accent="text-amber-200" />
      </div>
      <div className="space-y-1 text-[11px]">
        <div className={`rounded px-2 py-1 ${f.counter ? 'bg-rose-950/50 text-rose-200' : 'bg-slate-800/50 text-slate-400'}`}>
          ↩ Counter: {f.counter ? `${f.counter.weapon.name} — ${f.counter.hit}% / ${f.counter.dmg} dmg (uses 1 of ${tgt.cp} counter pts)` : tgt.cp <= 0 ? 'None — target is out of counter points!' : 'No counter-attack'}
        </div>
        {f.team ? (
          <div className="rounded px-2 py-1 bg-gradient-to-r from-emerald-900/70 to-cyan-900/70 text-emerald-100 font-bold">🤝 TEAM-UP: {f.team.name} — {f.team.unit.name} {f.team.hit}% / {f.team.dmg} dmg{f.team.bond ? ' (bond +20%)' : ''}</div>
        ) : (
          <div className={`rounded px-2 py-1 ${f.support ? 'bg-emerald-950/50 text-emerald-200' : 'bg-slate-800/50 text-slate-500'}`}>
            ⚡ Support Attack: {f.support ? `${f.support.unit.name} — ${f.support.hit}% / ${f.support.dmg} dmg` : 'none in 2 tiles'}
          </div>
        )}
        {!enemyPreview && f.teamAvail && (
          <button onClick={() => { sfx('beep'); onTeam(f.team ? null : f.teamAvail.unit.uid); }} className={`w-full rounded px-2 py-1.5 border font-bold ${f.team ? 'border-emerald-300 bg-emerald-500/25 text-emerald-100' : 'border-emerald-500/50 bg-slate-800/60 text-emerald-200'}`}>
            <Users size={12} className="inline mr-1" />{f.team ? 'Team-Up ON — tap to cancel' : `Team-Up with ${f.teamAvail.unit.name}: ${f.teamAvail.name} (−${TEAM_COST} Tension each)`}
          </button>
        )}
        <div className={`rounded px-2 py-1 ${f.supportDef ? 'bg-sky-950/50 text-sky-200' : 'bg-slate-800/50 text-slate-500'}`}>
          🛡 Support Defense: {f.supportDef ? `${f.supportDef.unit.name} intercepts (takes ~${f.supportDef.dmg})` : 'none'}
        </div>
        {killHint && att.chain < 2 && att.team === 'player' && <div className="rounded px-2 py-1 bg-amber-500/20 text-amber-200 font-bold text-center">LETHAL ON HIT → CHAIN STEP!</div>}
      </div>
      {!enemyPreview && (
        <div className="flex gap-2">
          <Btn variant="amber" className="flex-1" onClick={onConfirm}><Swords size={15} /> Confirm Attack</Btn>
          <Btn variant="slate" onClick={onCancel}>Cancel</Btn>
        </div>
      )}
    </div>
  );
}

export default function Battle({ stage, initial, onResult, onExit, initialAuto = false, cutins = 'full', onCutins, view = '3d', onView }) {
  const [battle, setBattleState] = useState(initial);
  const bRef = useRef(initial);
  const setBattle = useCallback((b) => { bRef.current = b; setBattleState(b); }, []);
  const [sel, setSel] = useState(null); // selected uid (the active unit on your turn)
  const [inspect, setInspect] = useState(null);
  const [fc, setFc] = useState(null); // {attUid,tgtUid,wIdx,team}
  const [enemyFc, setEnemyFc] = useState(null);
  const [mapAim, setMapAim] = useState(null); // {wIdx, opts, optId}
  const [areaFx, setAreaFx] = useState(null); // tiles flashing for an area attack
  const [auto, setAuto] = useState(initialAuto);
  const autoRef = useRef(initialAuto);
  const busy = useRef(false);
  const advancing = useRef(false);
  const mounted = useRef(true);
  const [fxState, setFx] = useState({ beams: [], pops: [], booms: [], shakes: {}, flash: 0, banner: null });
  const fxId = useRef(1);
  const [rewards, setRewards] = useState(null);
  const [confirmRetreat, setConfirmRetreat] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [cutin, setCutin] = useState(null);
  const cutinsRef = useRef(cutins);
  useEffect(() => { cutinsRef.current = cutins; }, [cutins]);
  const logRef = useRef(null);
  const resultHandled = useRef(false);
  const [tick, setTick] = useState(0);

  useEffect(() => { mounted.current = true; window.__mbtBattle = () => bRef.current; return () => { mounted.current = false; delete window.__mbtBattle; }; }, []);
  useEffect(() => { autoRef.current = auto; }, [auto]);
  useEffect(() => {
    const onBack = () => { if (!rewards && !cutin) setConfirmRetreat((v) => !v); };
    window.addEventListener('mbt-back', onBack);
    return () => window.removeEventListener('mbt-back', onBack);
  }, [rewards, cutin]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [battle.log, showLog]);

  const spd = () => (autoRef.current ? 0.5 : 1);
  const wait = (ms) => sleep(ms * spd());

  // sortie voice, turn-1 events, then start the timeline
  useEffect(() => {
    const first = initial.units.find((u) => u.team === 'player');
    const t = setTimeout(async () => {
      if (!mounted.current) return;
      if (first) playVoice(first.pilotId, 'sortie');
      showBanner('BATTLE START', 'player');
      await sleep(1100);
      const te = turnEvents(bRef.current, stage, 0, 1);
      await play(te.events, bRef.current, te.battle);
      advance();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showBanner(text, kind) {
    const id = fxId.current++;
    setFx((s) => ({ ...s, banner: { id, text, kind } }));
    setTimeout(() => mounted.current && setFx((s) => (s.banner?.id === id ? { ...s, banner: null } : s)), 1400);
  }
  function addPop(uid, text, kind) {
    const u = byUid(bRef.current, uid); if (!u) return;
    const id = fxId.current++;
    setFx((s) => ({ ...s, pops: [...s.pops, { id, x: u.x, y: u.y, text, kind }] }));
    setTimeout(() => mounted.current && setFx((s) => ({ ...s, pops: s.pops.filter((p) => p.id !== id) })), 1050);
  }
  function addBeam(fromUid, toUid, fx) {
    const a = byUid(bRef.current, fromUid), t = byUid(bRef.current, toUid); if (!a || !t) return;
    const id = fxId.current++;
    setFx((s) => ({ ...s, beams: [...s.beams, { id, x1: a.x, y1: a.y, x2: t.x, y2: t.y, fx }] }));
    setTimeout(() => mounted.current && setFx((s) => ({ ...s, beams: s.beams.filter((p) => p.id !== id) })), 500);
  }
  function addBoom(uid) {
    const u = byUid(bRef.current, uid); if (!u) return;
    const id = fxId.current++;
    setFx((s) => ({ ...s, booms: [...s.booms, { id, x: u.x, y: u.y }] }));
    setTimeout(() => mounted.current && setFx((s) => ({ ...s, booms: s.booms.filter((p) => p.id !== id) })), 700);
  }
  function shake(uid) { setFx((s) => ({ ...s, shakes: { ...s.shakes, [uid]: (s.shakes[uid] || 0) + 1 } })); }
  function flash() { setFx((s) => ({ ...s, flash: s.flash + 1 })); }

  // ---------- event playback ----------
  async function play(events, pre, final, quick = false) {
    const disp = clone(final);
    disp.result = null;
    disp.units.forEach((u) => { const p = byUid(pre, u.uid); if (p) u.hp = p.hp; });
    setBattle(disp);
    for (const ev of events) {
      if (!mounted.current) return;
      if (quick) {
        // the cut-in already showed this exchange: just sync the board
        if (ev.t === 'damage') { const nb = clone(bRef.current); byUid(nb, ev.uid).hp = ev.hpAfter; setBattle(nb); continue; }
        if (ev.t === 'destroy') { addBoom(ev.uid); sfx('explosion'); await wait(350); continue; }
        if (ev.t === 'banner' && ev.kind === 'chain') { showBanner(ev.text, ev.kind); sfx('chain'); playVoice(byUid(bRef.current, events.find((e) => e.t === 'chain')?.uid || '')?.pilotId || 'kadete', 'chain', { force: true }); await wait(900); continue; }
        if (ev.t !== 'log') continue;
      }
      switch (ev.t) {
        case 'banner':
          showBanner(ev.text, ev.kind);
          if (ev.kind === 'ult' || ev.kind === 'form') { sfx('powerup'); await wait(700); }
          else if (ev.kind === 'map') { sfx('mega'); flash(); await wait(900); }
          else if (ev.kind === 'warn' || ev.kind === 'enemy' || ev.kind === 'player') { sfx('phase'); await wait(1000); }
          else { sfx('chain'); await wait(900); }
          break;
        case 'area': setAreaFx(ev.tiles); flash(); await wait(450); setTimeout(() => mounted.current && setAreaFx(null), 600); break;
        case 'spawn': addPop(ev.uid, 'REINFORCEMENT!', 'tension'); sfx('select'); await wait(350); break;
        case 'pop': addPop(ev.uid, ev.text, ev.kind); break;
        case 'attack': {
          sfx(FX_SOUND[ev.fx] || 'beam'); addBeam(ev.from, ev.to, ev.fx);
          if (ev.fx === 'mega' || ev.fx === 'rainbow') flash();
          await wait(ev.fx === 'mega' || ev.fx === 'rainbow' ? 520 : 340);
          break;
        }
        case 'damage': {
          const u = byUid(bRef.current, ev.uid); if (u) { const nb = clone(bRef.current); byUid(nb, ev.uid).hp = ev.hpAfter; setBattle(nb); }
          shake(ev.uid); addPop(ev.uid, ev.crit ? `CRIT ${ev.amount}` : `${ev.amount}`, ev.crit ? 'crit' : 'dmg');
          sfx(ev.crit ? 'crit' : 'hit'); if (ev.crit) flash();
          await wait(420); break;
        }
        case 'miss': addPop(ev.uid, 'MISS', 'miss'); sfx('miss'); await wait(320); break;
        case 'intercept': addPop(ev.by, 'GUARD!', 'guard'); sfx('shieldUp'); await wait(300); break;
        case 'destroy': addBoom(ev.uid); sfx('explosion'); await wait(520); break;
        case 'tension': if (ev.level === 'SUPER') { addPop(ev.uid, 'SUPERCHARGED!', 'super'); sfx('powerup'); await wait(300); } else if (ev.level === 'HIGH') { addPop(ev.uid, 'TENSION HIGH', 'tension'); } break;
        case 'voice': {
          if (ev.team === 'enemy' && !ev.boss && ev.cue !== 'destroyed') break;
          playVoice(ev.pilotId, ev.cue); break;
        }
        case 'heal': addPop(ev.uid, `+${ev.amount}`, 'heal'); sfx('heal'); await wait(300); break;
        case 'log': { const nb = { ...bRef.current, log: [...bRef.current.log, { text: ev.text, kind: ev.kind }].slice(-80) }; setBattle(nb); break; }
        default: break;
      }
    }
    const logs = events.filter((e) => e.t === 'log').map((e) => ({ text: e.text, kind: e.kind }));
    const fin = { ...final, log: [...pre.log, ...logs].slice(-80) };
    setBattle(fin);
    return fin;
  }

  function finish(result, b) {
    if (resultHandled.current) return;
    resultHandled.current = true;
    const nb = { ...b, phase: result, result };
    setBattle(nb);
    setSel(null); setFc(null); setEnemyFc(null); setMapAim(null);
    sfx(result === 'VICTORY' ? 'victory' : 'defeat');
    const lead = b.units.find((u) => u.team === 'player' && u.hp > 0 && !u.ship) || b.units.find((u) => u.team === 'player');
    if (lead) setTimeout(() => playVoice(lead.pilotId, result === 'VICTORY' ? 'victory' : 'defeat', { force: true }), 600);
    showBanner(result === 'VICTORY' ? 'MISSION COMPLETE' : 'MISSION FAILED', result === 'VICTORY' ? 'player' : 'enemy');
    const r = onResult(result, nb);
    setTimeout(() => mounted.current && setRewards({ result, ...r }), 1300);
  }

  // ---------- attack execution ----------
  async function executeAttack(attUid, tgtUid, wIdx, teamUid = null) {
    const pre = bRef.current;
    const res = resolveCombat(pre, attUid, tgtUid, wIdx, Math.random, teamUid);
    const mode = cutinsRef.current === 'off' ? 'off' : (autoRef.current || cutinsRef.current === 'short') ? 'short' : 'full';
    const exchange = mode !== 'off' ? buildExchange(res.events, pre) : null;
    if (exchange && mounted.current) {
      await new Promise((resolve) => setCutin({ exchange, mode, resolve, key: Date.now() }));
      if (mounted.current) setCutin(null);
    }
    const fin = await play(res.events, pre, res.battle, !!exchange);
    return { fin, chained: res.chained, result: res.battle.result };
  }
  async function executeMap(attUid, wIdx, tiles) {
    const pre = bRef.current;
    const res = resolveMap(pre, attUid, wIdx, tiles);
    await play(res.events, pre, res.battle);
    return res.battle.result;
  }

  // ---------- AI turn for one unit ----------
  async function runAI(uid) {
    for (let step = 0; step < 3 && mounted.current; step++) {
      let b = bRef.current; let u = byUid(b, uid);
      if (!u || u.hp <= 0) return checkEnd(b);
      setSel(uid);
      if (canAwaken(u)) { const aw = awaken(b, uid); await play(aw.events, b, aw.battle); b = bRef.current; u = byUid(b, uid); }
      const plan = aiPlan(b, u);
      if (plan.x !== u.x || plan.y !== u.y) {
        sfx('move');
        setBattle(moveUnit(bRef.current, u.uid, plan.x, plan.y));
        await wait(380);
      }
      if (plan.map) {
        setAreaFx(plan.map.tiles); showBanner('MAP WEAPON INCOMING!', u.team === 'enemy' ? 'enemy' : 'map');
        await wait(u.team === 'enemy' ? 1000 : 600);
        setAreaFx(null);
        return await executeMap(u.uid, plan.map.wIdx, plan.map.tiles);
      }
      if (!plan.targetUid) return null;
      const fcObj = { attUid: u.uid, tgtUid: plan.targetUid, wIdx: plan.wIdx };
      setEnemyFc(fcObj);
      await wait(u.team === 'enemy' ? 750 : 450);
      setEnemyFc(null);
      const { result, chained } = await executeAttack(u.uid, plan.targetUid, plan.wIdx);
      if (result) return result;
      if (!chained) return null;
    }
    return null;
  }

  // ---------- timeline: run turns until it's your move ----------
  async function advance() {
    if (advancing.current || resultHandled.current) return;
    advancing.current = true; busy.current = true;
    setSel(null); setFc(null); setMapAim(null);
    try {
      for (let guard = 0; guard < 500 && mounted.current; guard++) {
        let end = checkEnd(bRef.current); if (end) { finish(end, bRef.current); return; }
        const nx = nextActor(bRef.current);
        setBattle(nx.battle);
        if (nx.battle.turn > nx.prevTurn) {
          const te = turnEvents(bRef.current, stage, nx.prevTurn, nx.battle.turn);
          await play(te.events, bRef.current, te.battle);
          end = checkEnd(bRef.current); if (end) { finish(end, bRef.current); return; }
        }
        const bt = beginTurn(bRef.current, nx.uid);
        await play(bt.events, bRef.current, bt.battle);
        const u = byUid(bRef.current, nx.uid);
        if (u.team === 'player' && !autoRef.current) {
          sfx('select');
          setSel(u.uid); setInspect(null);
          setBattle({ ...bRef.current, phase: 'UNIT_SELECTED' });
          return; // wait for the player
        }
        setBattle({ ...bRef.current, phase: u.team === 'enemy' ? 'ENEMY_TURN' : 'ANIMATING' });
        await wait(u.team === 'enemy' ? 350 : 150);
        const r = await runAI(u.uid);
        if (r) { finish(r, bRef.current); return; }
        setBattle(endTurn(bRef.current, u.uid));
        setSel(null);
      }
    } finally {
      advancing.current = false; busy.current = false;
      if (mounted.current) setTick((t) => t + 1);
    }
  }

  function endPlayerTurn() {
    const b = bRef.current; if (!b.active) return;
    setFc(null); setMapAim(null); setSel(null);
    setBattle({ ...endTurn(b, b.active), phase: 'IDLE' });
    setTimeout(() => advance(), 250);
  }

  // auto-battle: take over your current unit, then keep going
  async function autoTakeover() {
    if (busy.current) return;
    busy.current = true;
    const uid = bRef.current.active;
    setFc(null); setMapAim(null); setInspect(null);
    setBattle({ ...bRef.current, phase: 'ANIMATING' });
    let r = null;
    try { r = await runAI(uid); } finally { busy.current = false; }
    if (!mounted.current) return;
    if (r) { finish(r, bRef.current); return; }
    setBattle(endTurn(bRef.current, uid));
    advance();
  }
  useEffect(() => {
    if (!auto) return;
    const b = bRef.current;
    if (busy.current || advancing.current || b.result) return;
    const a = b.active && byUid(b, b.active);
    if (a && a.team === 'player' && ['UNIT_SELECTED', 'TARGETING', 'MAPAIM'].includes(b.phase)) autoTakeover();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, tick]);

  // ---------- player interaction ----------
  const activeUnit = battle.active ? byUid(battle, battle.active) : null;
  const playerControl = !auto && !busy.current && !!activeUnit && activeUnit.team === 'player' && ['UNIT_SELECTED', 'TARGETING', 'MAPAIM'].includes(battle.phase);
  const selUnit = playerControl ? activeUnit : (sel ? byUid(battle, sel) : null);
  const moveSet = useMemo(() => (playerControl && !selUnit.moved && !fc && !mapAim ? reachable(battle, selUnit) : null), [battle, selUnit, playerControl, fc, mapAim]);
  const atkSet = useMemo(() => {
    if (areaFx) return new Set(areaFx);
    if (mapAim) { const o = mapAim.opts.find((x) => x.id === mapAim.optId); return o ? new Set(o.tiles) : null; }
    if (!playerControl) return null;
    if (!selUnit.moved && moveSet) { const s = attackTiles(battle, selUnit, [...moveSet.keys()]); moveSet.forEach((_, k) => s.delete(k)); return s; }
    return attackTiles(battle, selUnit, [key(selUnit.x, selUnit.y)]);
  }, [battle, selUnit, moveSet, playerControl, mapAim, areaFx]);
  const inspectUnit = inspect ? byUid(battle, inspect) : null;
  const threatSet = useMemo(() => {
    if (mapAim) return new Set(mapAim.opts.flatMap((o) => (mapAim.opts[0].center ? [o.center] : o.tiles)));
    if (!inspectUnit || inspectUnit.hp <= 0 || inspectUnit.team !== 'enemy') return null;
    const mv = inspectUnit.boss ? new Map([[key(inspectUnit.x, inspectUnit.y), 0]]) : reachable(battle, inspectUnit);
    return attackTiles(battle, inspectUnit, [...mv.keys()]);
  }, [battle, inspectUnit, mapAim]);
  const hazardSet = useMemo(() => (battle.warn?.length ? new Set(battle.warn) : null), [battle.warn]);

  function setPhase(p) { setBattle({ ...bRef.current, phase: p }); }

  function openForecast(att, tgt) {
    const d = dist(att, tgt);
    const wIdx = bestWeaponFor(att, d, 'cheap');
    if (wIdx < 0) return;
    sfx('beep');
    setFc({ attUid: att.uid, tgtUid: tgt.uid, wIdx, team: null });
    setPhase('TARGETING');
  }

  function onCellClick(x, y) {
    const b = bRef.current;
    const u = unitAt(b, x, y);
    if (!playerControl) { if (u) { sfx('beep'); setInspect(u.uid); } return; }
    const S = byUid(b, b.active);
    const k = key(x, y);
    if (mapAim) {
      const opt = mapAim.opts.find((o) => (o.center ? o.center === k : o.tiles.includes(k)));
      if (opt) { sfx('beep'); setMapAim({ ...mapAim, optId: opt.id }); }
      return;
    }
    if (fc) { // clicking elsewhere while forecasting
      if (u && u.team !== S.team && targetsFrom(b, S, S.x, S.y).some((e) => e.uid === u.uid)) { openForecast(S, u); return; }
      setFc(null); setPhase(S.moved ? 'TARGETING' : 'UNIT_SELECTED'); return;
    }
    if (u && u.uid === S.uid) {
      if (!S.moved) { const nb = moveUnit(b, S.uid, S.x, S.y); setBattle({ ...nb, phase: 'TARGETING' }); sfx('beep'); }
      return;
    }
    if (u && u.team === S.team) { sfx('beep'); setInspect(u.uid); return; }
    if (u) {
      if (targetsFrom(b, S, S.x, S.y).some((e) => e.uid === u.uid)) return openForecast(S, u);
      if (!S.moved && moveSet) {
        // auto-path: best tile to strike from
        let best = null;
        for (const [pk, cost] of moveSet) {
          const [mx, my] = pk.split(',').map(Number);
          const d = hexDist(mx, my, u.x, u.y);
          if (bestWeaponFor(S, d, 'cheap') < 0) continue;
          const terr = terrainAt(b, mx, my);
          const score = terr.eva * 2 + terr.heal - cost;
          if (!best || score > best.score) best = { mx, my, score };
        }
        if (best) {
          sfx('move');
          const nb = moveUnit(b, S.uid, best.mx, best.my);
          setBattle({ ...nb, phase: 'TARGETING' });
          setTimeout(() => openForecast(byUid(bRef.current, S.uid), byUid(bRef.current, u.uid)), 260);
          return;
        }
      }
      sfx('beep'); setInspect(u.uid); return;
    }
    if (!S.moved && moveSet && moveSet.has(k)) {
      sfx('move');
      const nb = moveUnit(b, S.uid, x, y);
      setBattle({ ...nb, phase: 'TARGETING' });
      setInspect(null);
      return;
    }
    setInspect(null);
  }

  async function confirmAttack() {
    if (!fc || busy.current) return;
    busy.current = true;
    const { attUid, tgtUid, wIdx, team } = fc;
    setFc(null);
    setPhase('ANIMATING');
    let out;
    try { out = await executeAttack(attUid, tgtUid, wIdx, team); } finally { busy.current = false; }
    if (!mounted.current) return;
    if (out.result) { finish(out.result, bRef.current); return; }
    if (out.chained) { setBattle({ ...bRef.current, phase: 'UNIT_SELECTED' }); setTick((t) => t + 1); return; }
    endPlayerTurn();
  }

  function startMapAim(wIdx) {
    const b = bRef.current; const S = byUid(b, b.active);
    sfx('beep'); setFc(null); setInspect(null);
    setMapAim({ wIdx, opts: mapOptions(b, S, S.weapons[wIdx]), optId: null });
    setPhase('MAPAIM');
  }
  async function confirmMap() {
    if (!mapAim || busy.current) return;
    const opt = mapAim.opts.find((o) => o.id === mapAim.optId); if (!opt) return;
    busy.current = true;
    const b = bRef.current; const uid = b.active;
    setMapAim(null); setPhase('ANIMATING');
    let r;
    try { r = await executeMap(uid, mapAim.wIdx, opt.tiles); } finally { busy.current = false; }
    if (!mounted.current) return;
    if (r) { finish(r, bRef.current); return; }
    endPlayerTurn();
  }
  function cancelMap() { sfx('cancel'); setMapAim(null); setPhase(byUid(bRef.current, bRef.current.active)?.moved ? 'TARGETING' : 'UNIT_SELECTED'); }

  async function doForm(kind) {
    if (busy.current) return;
    busy.current = true;
    const b = bRef.current;
    const res = kind === 'awaken' ? awaken(b, b.active) : transform(b, b.active);
    try { await play(res.events, b, res.battle); } finally { busy.current = false; }
    setBattle({ ...bRef.current, phase: byUid(bRef.current, bRef.current.active).moved ? 'TARGETING' : 'UNIT_SELECTED' });
    setTick((t) => t + 1);
  }

  function doWait() { sfx('beep'); endPlayerTurn(); }
  function cancelMove() {
    const b = bRef.current; if (!b.active) return;
    const nb = clone(b); const u = byUid(nb, b.active); u.x = u.ox; u.y = u.oy; u.moved = false;
    sfx('cancel'); setFc(null);
    setBattle({ ...nb, phase: 'UNIT_SELECTED' });
  }

  const toggleAuto = () => { sfx('select'); setAuto((a) => !a); setFc(null); setMapAim(null); };

  // ---------- render ----------
  const [VBW, VBH] = boardSize(battle);
  const phaseLabel = { IDLE: '…', UNIT_SELECTED: 'YOUR TURN', TARGETING: 'YOUR TURN', MAPAIM: 'AIM MAP WEAPON', ANIMATING: auto ? 'AUTO-BATTLE' : 'ANIMATING', ENEMY_TURN: 'ENEMY TURN', VICTORY: 'VICTORY', DEFEAT: 'DEFEAT' }[battle.phase] || battle.phase;
  const phaseColor = battle.phase === 'ENEMY_TURN' || battle.phase === 'DEFEAT' ? 'text-rose-300 border-rose-500/50' : battle.phase === 'VICTORY' ? 'text-amber-200 border-amber-400/60' : 'text-cyan-200 border-cyan-400/50';
  const waitFactor = playerControl ? delayFactor(selUnit) : 1;
  const waitHint = waitFactor === 1 ? '' : waitFactor === 0.8 ? ' · skipped move: next turn 20% sooner' : waitFactor === 0.7 ? ' · skipped attack: next turn 30% sooner' : ' · stood by: next turn 50% sooner';
  const playersLeft = alive(battle).filter((u) => u.team === 'player' && !u.ship).length;
  const enemiesLeft = alive(battle).filter((u) => u.team === 'enemy' && !u.ship).length;
  const sideUnit = (fc && byUid(battle, fc.attUid)) || inspectUnit || selUnit;
  const tgtUnit = fc && byUid(battle, fc.tgtUid);
  const tgtKey = tgtUnit ? key(tgtUnit.x, tgtUnit.y) : null;

  return (
    <div className={`min-h-[calc(100vh-110px)] bg-gradient-to-b ${stage.bg} scan-bg`}>
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3">
        {/* top bar */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <div className="mr-auto min-w-0">
            <div className="text-[10px] text-amber-300 tracking-[0.3em]">STAGE {stage.num}</div>
            <div className="font-bold text-cyan-100 truncate">{stage.name}</div>
          </div>
          <div className="text-xs px-2 py-1 rounded border border-slate-600 text-slate-200">TURN <b>{battle.turn}</b></div>
          <div className={`text-xs px-2 py-1 rounded border font-bold tracking-wider ${phaseColor}`}>{phaseLabel}</div>
          <div className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-300"><span className="text-sky-300">{playersLeft}</span> vs <span className="text-rose-300">{enemiesLeft}</span></div>
          <Btn small variant="slate" onClick={() => { sfx('beep'); onView && onView(view === '3d' ? '2d' : '3d'); }} title="Switch 3D / 2D board"><Box size={14} /> {view === '3d' ? '3D' : '2D'}</Btn>
          <Btn small variant={cutins === 'off' ? 'slate' : 'cyan'} onClick={() => { sfx('beep'); onCutins && onCutins(cutins === 'full' ? 'short' : cutins === 'short' ? 'off' : 'full'); }} title="Attack cut-in sequences"><Film size={14} /> Cut-ins: {cutins === 'full' ? 'Full' : cutins === 'short' ? 'Short' : 'Off'}</Btn>
          <Btn small variant={auto ? 'amber' : 'slate'} onClick={toggleAuto} title="Auto-Battle at 2x speed"><FastForward size={14} /> Auto 2x {auto ? 'ON' : 'OFF'}</Btn>
          <Btn small variant="rose" onClick={() => setConfirmRetreat(true)} disabled={!!battle.result}><Flag size={14} /> Retreat</Btn>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 items-start">
          {/* hex board */}
          <div className="w-full lg:w-auto flex flex-col items-center gap-2">
            <div style={{ width: 'min(94vw, 660px, calc((100vh - 260px) * 1.12))', minWidth: 280 }}><TurnBar b={battle} /></div>
            <div className="relative select-none rounded-xl overflow-hidden hud-border bg-slate-950/40" style={{ width: 'min(94vw, 660px, calc((100vh - 260px) * 1.12))', minWidth: 280, aspectRatio: `${VBW} / ${VBH}` }}>
              {view === '3d' ? (
                <Board3D battle={battle} stage={stage} moveSet={moveSet} atkSet={atkSet} threatSet={threatSet} hazardSet={hazardSet} tgtKey={tgtKey} selUid={battle.active || sel} onCellClick={onCellClick} fx={fxState} onFail={() => onView && onView('2d')} />
              ) : (<>
              {stage.art && <img src={stage.art} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none" />}
              <svg viewBox={`0 0 ${VBW} ${VBH}`} className="absolute inset-0 w-full h-full">
                {battle.map.map((row, y) => row.split('').map((ch, x) => {
                  const [cx, cy] = hexCenter(x, y); const k = key(x, y);
                  const t = TERRAIN[ch] || TERRAIN['.'];
                  const isMove = moveSet?.has(k), isAtk = !isMove && atkSet?.has(k), isThreat = !isMove && !isAtk && threatSet?.has(k), isHaz = hazardSet?.has(k);
                  const tgt = fc && byUid(battle, fc.tgtUid);
                  const tgtHere = tgt && tgt.x === x && tgt.y === y;
                  return (
                    <g key={k} data-tile={k} className="hex cursor-pointer" onClick={() => onCellClick(x, y)}>
                      <polygon points={hexPoints(cx, cy, HEX_R - 1.5)} fill={t.id === 'space' ? '#020617' : t.id === 'debris' ? '#1e293b' : '#022c22'} fillOpacity={t.id === 'space' ? (stage.art ? 0.3 : 0.55) : 0.85} stroke="#155e75" strokeOpacity=".55" strokeWidth="2" />
                      {t.id === 'space' && stars(x, y).map(([sa, sb], i) => <circle key={i} cx={cx - 30 + sa * 0.6} cy={cy - 30 + sb * 0.6} r="1.6" fill="#fff" opacity=".5" />)}
                      {t.id === 'debris' && (
                        <g transform={`translate(${cx - 40} ${cy - 40}) scale(2)`} opacity=".85">
                          <path d="M6 28 L12 18 L22 20 L26 30 L14 34 Z" fill="#475569" stroke="#0b1020" strokeWidth="1.2" />
                          <path d="M24 12 L32 8 L36 16 L30 20 Z" fill="#64748b" stroke="#0b1020" strokeWidth="1.2" />
                          <rect x="22" y="24" width="12" height="6" rx="1.5" fill="#b91c1c" stroke="#0b1020" strokeWidth="1" transform="rotate(-18 28 27)" />
                          <circle cx="24" cy="31" r="1.6" fill="#0b1020" /><circle cx="32" cy="28" r="1.6" fill="#0b1020" />
                        </g>
                      )}
                      {t.id === 'dock' && (
                        <g>
                          <polygon points={hexPoints(cx, cy, HEX_R - 14)} fill="none" stroke="#34d399" strokeOpacity=".7" strokeWidth="3" strokeDasharray="8 6" />
                          <path transform={`translate(${cx - 22} ${cy - 22}) scale(1.85)`} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill="none" stroke="#6ee7b7" strokeOpacity=".85" strokeWidth="1.6" strokeLinejoin="round" />
                        </g>
                      )}
                      {isMove && <polygon points={hexPoints(cx, cy, HEX_R - 3)} fill="#0ea5e9" opacity=".42" className="tile-pulse" />}
                      {isAtk && <polygon points={hexPoints(cx, cy, HEX_R - 3)} fill="#f43f5e" opacity=".32" />}
                      {isThreat && <polygon points={hexPoints(cx, cy, HEX_R - 3)} fill="#f43f5e" opacity=".16" />}
                      {isHaz && <g className="tile-pulse"><polygon points={hexPoints(cx, cy, HEX_R - 4)} fill="#f59e0b" opacity=".35" stroke="#fbbf24" strokeWidth="3" strokeDasharray="10 6" /><text x={cx} y={cy + 12} textAnchor="middle" fontSize="34" fill="#fde68a">⚠</text></g>}
                      {tgtHere && <polygon points={hexPoints(cx, cy, HEX_R - 5)} fill="none" stroke="#fcd34d" strokeWidth="5" />}
                      <polygon points={hexPoints(cx, cy, HEX_R - 2)} className="hex-hover" fill="#fff" opacity="0" />
                    </g>
                  );
                }))}
              </svg>
              {/* units */}
              <div className="absolute inset-0 pointer-events-none">
                {battle.units.filter((u) => u.hp > 0 || fxState.booms.some((bm) => bm.x === u.x && bm.y === u.y)).map((u) => {
                  const isSel = u.uid === (battle.active || sel);
                  const big = u.ship ? 1.7 : u.boss ? 1.2 : 1;
                  const [cx, cy] = hexCenter(u.x, u.y);
                  return (
                    <div key={u.uid} className="absolute transition-all duration-300 ease-out" style={{ left: `${((cx - HEX_W / 2) / VBW) * 100}%`, top: `${((cy - HEX_H / 2) / VBH) * 100}%`, width: `${(HEX_W / VBW) * 100}%`, height: `${(HEX_H / VBH) * 100}%`, opacity: u.hp > 0 ? 1 : 0.2 }}>
                      <div key={fxState.shakes[u.uid] || 0} className={`relative w-full h-full ${fxState.shakes[u.uid] ? 'anim-shake' : ''}`} style={big !== 1 ? { transform: `scale(${big})`, transformOrigin: '50% 80%' } : undefined}>
                        <div className={`absolute left-[14%] right-[14%] bottom-[18%] h-[15%] rounded-[50%] ${u.team === 'player' ? 'bg-sky-400/40 border border-sky-300/70' : 'bg-rose-500/40 border border-rose-400/70'} ${isSel ? 'anim-glow ring-2 ring-cyan-300' : ''}`} />
                        <div className="absolute left-[6%] right-[6%] top-[12%] bottom-[16%]">
                          <MechaSprite look={u.look} size="100%" bob />
                        </div>
                        {u.boss && <Crown className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-1/4 text-amber-300 drop-shadow" />}
                        {u.tension >= 200 && <Zap className="absolute top-[14%] right-[4%] w-1/4 h-1/5 text-fuchsia-300 animate-pulse" />}
                        <div className="absolute left-[18%] right-[18%] bottom-[12%] h-[5%] bg-slate-900/90 rounded-sm overflow-hidden">
                          <div className={`${u.team === 'player' ? 'bg-sky-400' : 'bg-rose-500'} h-full transition-all duration-300`} style={{ width: `${(u.hp / u.maxHp) * 100}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* beams */}
              <svg viewBox={`0 0 ${VBW} ${VBH}`} className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <linearGradient id="rbw" x1="0" x2="1"><stop offset="0" stopColor="#ef4444" /><stop offset=".25" stopColor="#facc15" /><stop offset=".5" stopColor="#22c55e" /><stop offset=".75" stopColor="#3b82f6" /><stop offset="1" stopColor="#a855f7" /></linearGradient>
                </defs>
                {fxState.beams.map((bm) => {
                  const [x1, y1] = hexCenter(bm.x1, bm.y1); const [x2, y2] = hexCenter(bm.x2, bm.y2);
                  const len = Math.hypot(x2 - x1, y2 - y1) + 10;
                  const col = FX_COLOR[bm.fx] || '#22d3ee';
                  if (bm.fx === 'slash') return (
                    <g key={bm.id}>
                      <path d={`M${x2 - 40} ${y2 - 35} Q${x2 + 10} ${y2 - 10} ${x2 + 35} ${y2 + 40}`} stroke="#fff" strokeWidth="10" fill="none" strokeLinecap="round" className="anim-beam" style={{ '--len': 140, strokeDasharray: 140 }} />
                      <path d={`M${x2 - 40} ${y2 - 35} Q${x2 + 10} ${y2 - 10} ${x2 + 35} ${y2 + 40}`} stroke="#22d3ee" strokeWidth="4" fill="none" strokeLinecap="round" className="anim-beam" style={{ '--len': 140, strokeDasharray: 140 }} />
                    </g>
                  );
                  const w = bm.fx === 'mega' ? 22 : bm.fx === 'rainbow' ? 26 : bm.fx === 'shot' ? 5 : 9;
                  return (
                    <g key={bm.id}>
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={bm.fx === 'rainbow' ? 'url(#rbw)' : col} strokeWidth={w} strokeLinecap="round" opacity=".55" className="anim-beam" style={{ '--len': len, strokeDasharray: bm.fx === 'shot' ? '14 18' : len }} />
                      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth={Math.max(2, w / 3)} strokeLinecap="round" className="anim-beam" style={{ '--len': len, strokeDasharray: bm.fx === 'shot' ? '14 18' : len }} />
                      <circle cx={x2} cy={y2} r={w * 1.6} fill={col} opacity=".6" className="anim-boom" />
                    </g>
                  );
                })}
                {fxState.booms.map((bm) => {
                  const [bx, by] = hexCenter(bm.x, bm.y);
                  return (
                    <g key={bm.id} transform={`translate(${bx} ${by})`}>
                      <g className="anim-boom" style={{ transformOrigin: 'center', transformBox: 'fill-box' }}>
                        <circle r="55" fill="#f97316" opacity=".8" /><circle r="38" fill="#fde047" /><circle r="18" fill="#fff" />
                      </g>
                    </g>
                  );
                })}
              </svg>
              </>)}
              {/* flash */}
              {fxState.flash > 0 && <div key={fxState.flash} className="absolute inset-0 bg-white pointer-events-none anim-flash" />}
              {/* popups */}
              <div className="absolute inset-0 pointer-events-none">
                {fxState.pops.map((p) => {
                  const [px, py] = hexCenter(p.x, p.y);
                  return (
                    <div key={p.id} className={`absolute anim-float font-black whitespace-nowrap drop-shadow-[0_2px_0_rgba(0,0,0,.9)] ${p.kind === 'crit' ? 'text-amber-300 text-lg sm:text-2xl' : p.kind === 'miss' ? 'text-slate-300 text-sm' : p.kind === 'heal' ? 'text-emerald-300 text-base' : p.kind === 'super' ? 'text-fuchsia-300 text-xs sm:text-sm' : p.kind === 'tension' ? 'text-amber-200 text-[10px] sm:text-xs' : p.kind === 'guard' ? 'text-sky-300 text-sm' : 'text-white text-base sm:text-xl'}`}
                      style={{ left: `${(px / VBW) * 100}%`, top: `${((py - 50) / VBH) * 100}%` }}>{p.text}</div>
                  );
                })}
              </div>
              {/* banner */}
              {fxState.banner && (
                <div key={fxState.banner.id} className="absolute inset-x-0 top-[40%] flex justify-center pointer-events-none">
                  <div className={`anim-banner px-6 sm:px-10 py-2 sm:py-3 font-black italic tracking-[0.15em] text-lg sm:text-3xl text-center border-y-2 ${fxState.banner.kind === 'map' ? 'bg-gradient-to-r from-orange-600/90 via-rose-600/90 to-orange-600/90 text-white border-amber-200 shadow-[0_0_40px_rgba(249,115,22,.9)]' : fxState.banner.kind === 'team' ? 'bg-gradient-to-r from-emerald-500/90 to-cyan-500/90 text-slate-950 border-white shadow-[0_0_40px_rgba(52,211,153,.9)]' : fxState.banner.kind === 'form' ? 'bg-cyan-600/90 text-white border-cyan-200' : fxState.banner.kind === 'warn' ? 'bg-amber-500/90 text-slate-950 border-amber-100' : fxState.banner.kind === 'chain' ? 'bg-gradient-to-r from-cyan-500/90 via-amber-400/90 to-cyan-500/90 text-slate-950 border-white shadow-[0_0_40px_rgba(34,211,238,.9)]' : fxState.banner.kind === 'enemy' ? 'bg-rose-700/90 text-white border-rose-300' : fxState.banner.kind === 'ult' ? 'bg-gradient-to-r from-fuchsia-700/90 to-amber-500/90 text-white border-amber-200 shadow-[0_0_40px_rgba(244,114,182,.9)]' : 'bg-sky-700/90 text-white border-sky-300'}`}>
                    {fxState.banner.text}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* side panel */}
          <div className="w-full lg:flex-1 lg:max-w-sm space-y-2">
            <div className="bg-slate-950/85 rounded-xl hud-border">
              {enemyFc && byUid(battle, enemyFc.attUid) && byUid(battle, enemyFc.tgtUid) ? (
                <ForecastCard b={battle} fc={enemyFc} enemyPreview />
              ) : mapAim && playerControl ? (
                <MapCard b={battle} aim={mapAim} onConfirm={confirmMap} onCancel={cancelMap} />
              ) : fc ? (
                <ForecastCard b={battle} fc={fc} onWeapon={(i) => setFc({ ...fc, wIdx: i })} onTeam={(t) => setFc({ ...fc, team: t })} onConfirm={confirmAttack} onCancel={() => { sfx('cancel'); setFc(null); setPhase(selUnit?.moved ? 'TARGETING' : 'UNIT_SELECTED'); }} />
              ) : sideUnit ? (
                <UnitCard u={sideUnit} b={battle} />
              ) : (
                <div className="p-3 text-xs text-slate-400 space-y-1.5">
                  <div className="text-cyan-200 font-bold text-sm">Command Brief</div>
                  <p><b className="text-amber-300">Turn order</b> follows speed (MOB) — the bar above the board shows who moves next. Skip your move or attack and your next turn comes sooner.</p>
                  <p>Counter-attacks cost <b className="text-rose-300">counter points</b> ◆. Agile units hold more and refill faster; holding fire gives +1.</p>
                  <p>Kill = <b className="text-amber-300">CHAIN STEP</b>. At 200 <b className="text-fuchsia-300">Tension</b>: Ultimate + <b>Awakening</b>. Some mecha <b>Transform</b>. Ships and boss frames have <b className="text-orange-300">Map weapons</b>. Next to an ally with both at 150+ Tension? <b className="text-emerald-300">Team-Up</b>.</p>
                  <p><Ship size={11} className="inline text-amber-300" /> Win: sink the enemy flagship, defeat the boss, or wipe out the enemy. Lose if BRP Balangay sinks. <AlertTriangle size={11} className="inline text-amber-300" /> Get off ⚠ tiles before hazards hit.</p>
                  <p><Wrench size={11} className="inline text-emerald-300" /> Talyer docks and your flagship repair units next to them.</p>
                </div>
              )}
              {playerControl && !fc && !mapAim && (
                <div className="px-2.5 pb-2.5 space-y-1.5" data-actions>
                  {inspectUnit && inspectUnit.uid !== selUnit.uid && <button onClick={() => setInspect(null)} className="w-full text-[11px] text-cyan-300 underline">Back to {selUnit.name}</button>}
                  <div className="flex flex-wrap gap-1.5">
                    {canTransform(selUnit) && <Btn small variant="cyan" onClick={() => doForm('transform')} title={selUnit.modes[(selUnit.mode + 1) % selUnit.modes.length].desc || ''}><Repeat size={14} /> {selUnit.modes[(selUnit.mode + 1) % selUnit.modes.length].name}</Btn>}
                    {canAwaken(selUnit) && <Btn small variant="amber" onClick={() => doForm('awaken')}><Sparkles size={14} /> AWAKEN</Btn>}
                    {!selUnit.attacked && mapWeapons(selUnit).map(({ w, i }) => (
                      <Btn key={i} small variant="rose" disabled={!weaponUsable(selUnit, w)} onClick={() => startMapAim(i)} title={!weaponUsable(selUnit, w) ? (w.ult && selUnit.tension < 200 ? 'Needs 200 Tension' : `Needs ${w.en} EN`) : 'Area attack'}><Radiation size={14} /> {w.name.replace(' (MAP)', '')}</Btn>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Btn small variant="green" className="flex-1" onClick={doWait}><Hourglass size={14} /> End Turn{waitHint}{!selUnit.attacked ? ' · +1 ◆' : ''}</Btn>
                    {selUnit.moved && selUnit.chain === 0 && (selUnit.x !== selUnit.ox || selUnit.y !== selUnit.oy) && <Btn small variant="slate" onClick={cancelMove}><Undo2 size={14} /> Undo</Btn>}
                  </div>
                </div>
              )}
            </div>
            {/* roster strip */}
            <div className="grid grid-cols-5 gap-1.5">
              {battle.units.filter((u) => u.team === 'player').map((u) => (
                <button key={u.uid} onClick={() => { if (u.hp > 0) { sfx('beep'); setInspect(u.uid); } }} className={`rounded-lg p-1 text-left bg-slate-950/80 border ${u.uid === battle.active ? 'border-amber-300' : 'border-slate-700'} ${u.hp <= 0 ? 'opacity-30' : ''}`}>
                  <div className="flex justify-center"><MechaSprite look={u.look} size={34} dim={u.hp <= 0} /></div>
                  <div className="text-[9px] truncate text-slate-200">{u.name}</div>
                  <Bar value={u.hp} max={u.maxHp} color={hpColor(u.hp, u.maxHp)} h="h-1" />
                  <div className={`h-1 mt-0.5 rounded ${u.tension >= 200 ? 'bg-fuchsia-400' : u.tension >= 150 ? 'bg-amber-400' : 'bg-slate-700'}`} />
                </button>
              ))}
            </div>
            {/* combat log */}
            <div className="bg-slate-950/85 rounded-xl hud-border">
              <button className="w-full flex items-center justify-between px-2.5 py-1.5 text-[11px] font-bold tracking-widest text-cyan-200" onClick={() => setShowLog((s) => !s)}>
                <span className="flex items-center gap-1"><ScrollText size={13} /> COMBAT LOG</span><span className="text-slate-500">{showLog ? 'tap to shrink' : 'tap to expand'}</span>
              </button>
              <div ref={logRef} className={`${showLog ? 'h-56' : 'h-24'} overflow-y-auto px-2.5 pb-2 space-y-0.5 text-[11px] font-mono transition-all`}>
                {battle.log.map((l, i) => (
                  <div key={i} className={{ crit: 'text-amber-300', kill: 'text-orange-300 font-bold', chain: 'text-cyan-300 font-bold', support: 'text-emerald-300', heal: 'text-emerald-300', miss: 'text-slate-500', 'enemy-miss': 'text-slate-500', 'enemy-hit': 'text-rose-300', sys: 'text-slate-400 italic', hit: 'text-sky-200' }[l.kind] || 'text-slate-300'}>{l.text}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {cutin && <Cinematic key={cutin.key} exchange={cutin.exchange} mode={cutin.mode} stageArt={stage.art} onDone={cutin.resolve} />}
      {confirmRetreat && (
        <Modal onClose={() => setConfirmRetreat(false)}>
          <div className="p-5 space-y-3 text-center">
            <Flag className="mx-auto text-rose-300" />
            <div className="font-bold text-lg">Retreat from battle?</div>
            <p className="text-sm text-slate-400">No rewards will be earned for this sortie.</p>
            <div className="flex gap-2 justify-center"><Btn variant="rose" onClick={() => { mounted.current = false; onExit(); }}>Retreat</Btn><Btn variant="slate" onClick={() => setConfirmRetreat(false)}>Keep fighting</Btn></div>
          </div>
        </Modal>
      )}
      {rewards && (
        <Modal onClose={() => {}}>
          <div className="p-5 space-y-3 text-center">
            {rewards.result === 'VICTORY' ? <Trophy size={40} className="mx-auto text-amber-300" /> : <Skull size={40} className="mx-auto text-rose-300" />}
            <div className={`text-2xl font-black tracking-widest ${rewards.result === 'VICTORY' ? 'text-amber-200' : 'text-rose-300'}`}>{rewards.result === 'VICTORY' ? 'MISSION COMPLETE' : 'MISSION FAILED'}</div>
            <div className="text-sm text-slate-400">Turns: {battle.turn} · Enemies destroyed: {battle.units.filter((u) => u.team === 'enemy' && u.hp <= 0).length}</div>
            {rewards.result === 'VICTORY' ? (
              <div className="grid grid-cols-3 gap-2">
                <StatPill label="Capital" value={`+${rewards.capital}`} accent="text-amber-200" />
                <StatPill label="Blueprints" value={`+${rewards.bp}`} accent="text-cyan-200" />
                <StatPill label="Diamonds" value={`+${rewards.diamonds}`} accent="text-fuchsia-200" />
              </div>
            ) : <p className="text-sm text-slate-300">Consolation pay: +{rewards.capital} Capital. Upgrade in Develop or Recruit, then sortie again!</p>}
            {rewards.firstClear && <div className="text-xs text-amber-300 font-bold">★ FIRST CLEAR BONUS INCLUDED ★</div>}
            <Btn variant="amber" className="w-full" onClick={onExit}>Return to Base</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
