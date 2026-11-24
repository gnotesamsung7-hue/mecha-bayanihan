import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Box, Film, Swords, Shield, Zap, FastForward, Flag, Hourglass, Undo2, Crosshair, Crown, Wrench, X, Check, Trophy, Skull, ScrollText } from 'lucide-react';
import { MechaSprite, PilotPortrait } from './Sprite.jsx';
import Cinematic, { buildExchange } from './Cinematic.jsx';
import Board3D from './Board3D.jsx';
import { ClassBadge, Bar, hpColor, Btn, Modal, StatPill } from './ui.jsx';
import { TERRAIN, PILOTS } from './data.js';
import { sfx, playVoice } from './audio.js';
import {
  GRID, key, dist, hexDist, unitAt, byUid, alive, terrainAt, reachable, attackTiles, targetsFrom, bestWeaponFor, weaponUsable, inRange,
  forecast as computeForecast, resolveCombat, startPhase, aiPlan, moveUnit, tensionLevel, clone, checkEnd,
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
const VBW = HEX_W * (GRID + 0.5);
const VBH = HEX_H + (GRID - 1) * HEX_H * 0.75;
function hexCenter(x, y) { return [(x + 0.5 * (y & 1)) * HEX_W + HEX_W / 2, y * HEX_H * 0.75 + HEX_R]; }
function hexPoints(cx, cy, r) { return [-90, -30, 30, 90, 150, 210].map((a) => { const t = (a * Math.PI) / 180; return `${(cx + r * Math.cos(t)).toFixed(1)},${(cy + r * Math.sin(t)).toFixed(1)}`; }).join(' '); }

function TensionChip({ t }) {
  const lv = tensionLevel(t);
  const cls = lv === 'SUPER' ? 'bg-gradient-to-r from-amber-400 to-fuchsia-500 text-slate-950 animate-pulse' : lv === 'HIGH' ? 'bg-amber-500/80 text-slate-950' : 'bg-slate-700 text-slate-200';
  const label = lv === 'SUPER' ? 'SUPERCHARGED' : lv === 'HIGH' ? 'HIGH' : 'NORMAL';
  return <span className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-wider ${cls}`}>{label} {t}</span>;
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

function ForecastCard({ b, fc, onWeapon, onConfirm, onCancel, enemyPreview }) {
  const f = useMemo(() => computeForecast(b, fc.attUid, fc.tgtUid, fc.wIdx), [b, fc]);
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
          ↩ Counter: {f.counter ? `${f.counter.weapon.name} — ${f.counter.hit}% / ${f.counter.dmg} dmg` : 'No counter-attack'}
        </div>
        <div className={`rounded px-2 py-1 ${f.support ? 'bg-emerald-950/50 text-emerald-200' : 'bg-slate-800/50 text-slate-500'}`}>
          ⚡ Support Attack: {f.support ? `${f.support.unit.name} — ${f.support.hit}% / ${f.support.dmg} dmg` : 'none in 2 tiles'}
        </div>
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
  const [sel, setSel] = useState(null); // selected uid
  const [inspect, setInspect] = useState(null);
  const [fc, setFc] = useState(null); // {attUid,tgtUid,wIdx}
  const [enemyFc, setEnemyFc] = useState(null);
  const [auto, setAuto] = useState(initialAuto);
  const autoRef = useRef(initialAuto);
  const busy = useRef(false);
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

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { autoRef.current = auto; }, [auto]);
  useEffect(() => {
    const onBack = () => { if (!rewards && !cutin) setConfirmRetreat((v) => !v); };
    window.addEventListener('mbt-back', onBack);
    return () => window.removeEventListener('mbt-back', onBack);
  }, [rewards, cutin]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [battle.log, showLog]);

  const spd = () => (autoRef.current ? 0.5 : 1);
  const wait = (ms) => sleep(ms * spd());

  // sortie voice
  useEffect(() => {
    const first = initial.units.find((u) => u.team === 'player');
    const t = setTimeout(() => { if (first) playVoice(first.pilotId, 'sortie'); showBanner('PLAYER PHASE', 'player'); }, 400);
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
        case 'banner': showBanner(ev.text, ev.kind); if (ev.kind === 'ult') { sfx('powerup'); await wait(700); } else { sfx('chain'); await wait(900); } break;
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
          const u = byUid(bRef.current, ev.uid || '') || null; void u;
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
    setSel(null); setFc(null); setEnemyFc(null);
    sfx(result === 'VICTORY' ? 'victory' : 'defeat');
    const lead = b.units.find((u) => u.team === 'player' && u.hp > 0) || b.units.find((u) => u.team === 'player');
    if (lead) setTimeout(() => playVoice(lead.pilotId, result === 'VICTORY' ? 'victory' : 'defeat', { force: true }), 600);
    showBanner(result === 'VICTORY' ? 'MISSION COMPLETE' : 'MISSION FAILED', result === 'VICTORY' ? 'player' : 'enemy');
    const r = onResult(result, nb);
    setTimeout(() => mounted.current && setRewards({ result, ...r }), 1300);
  }

  // ---------- attack execution ----------
  async function executeAttack(attUid, tgtUid, wIdx) {
    const pre = bRef.current;
    const res = resolveCombat(pre, attUid, tgtUid, wIdx);
    const mode = cutinsRef.current === 'off' ? 'off' : (autoRef.current || cutinsRef.current === 'short') ? 'short' : 'full';
    const exchange = mode !== 'off' ? buildExchange(res.events, pre) : null;
    if (exchange && mounted.current) {
      await new Promise((resolve) => setCutin({ exchange, mode, resolve, key: Date.now() }));
      if (mounted.current) setCutin(null);
    }
    const fin = await play(res.events, pre, res.battle, !!exchange);
    return { fin, chained: res.chained, result: res.battle.result };
  }

  // ---------- AI team turn ----------
  async function runTeam(team) {
    let guard = 0;
    while (mounted.current && guard++ < 40) {
      const b = bRef.current;
      if (b.result || checkEnd(b)) return checkEnd(b);
      const foes = alive(b).filter((u) => u.team !== team);
      const units = alive(b).filter((u) => u.team === team && !u.acted)
        .sort((p, q) => Math.min(...foes.map((f) => dist(p, f))) - Math.min(...foes.map((f) => dist(q, f))));
      if (!units.length) return null;
      if (team === 'player' && !autoRef.current) return null; // auto turned off mid-way
      const u = units[0];
      setSel(u.uid);
      const plan = aiPlan(b, u);
      if (plan.x !== u.x || plan.y !== u.y) {
        sfx('move');
        setBattle(moveUnit(bRef.current, u.uid, plan.x, plan.y));
        await wait(380);
      }
      if (plan.targetUid) {
        const fcObj = { attUid: u.uid, tgtUid: plan.targetUid, wIdx: plan.wIdx };
        setEnemyFc(fcObj);
        await wait(team === 'enemy' ? 750 : 450);
        setEnemyFc(null);
        const { result } = await executeAttack(u.uid, plan.targetUid, plan.wIdx);
        if (result) return result;
      } else {
        const nb = clone(bRef.current); const nu = byUid(nb, u.uid); nu.acted = true; nu.moved = true; setBattle(nb);
        await wait(150);
      }
    }
    return null;
  }

  async function endPhase() {
    if (busy.current) return;
    busy.current = true;
    setSel(null); setFc(null); setInspect(null);
    try {
      sfx('phase');
      let b = { ...bRef.current, phase: 'ENEMY_PHASE', log: [...bRef.current.log, { text: `Turn ${bRef.current.turn} — Enemy Phase`, kind: 'sys' }] };
      setBattle(b);
      showBanner('ENEMY PHASE', 'enemy');
      await wait(1000);
      const sp = startPhase(bRef.current, 'enemy');
      await play(sp.events, bRef.current, { ...sp.battle, phase: 'ENEMY_PHASE' });
      const r = await runTeam('enemy');
      if (r) { finish(r, bRef.current); return; }
      setSel(null);
      const sp2 = startPhase({ ...bRef.current, turn: bRef.current.turn + 1 }, 'player');
      const nb = { ...sp2.battle, phase: 'PLAYER_IDLE', log: [...sp2.battle.log, { text: `Turn ${sp2.battle.turn} — Player Phase`, kind: 'sys' }] };
      sfx('phase');
      showBanner('PLAYER PHASE', 'player');
      await play(sp2.events, bRef.current, nb);
      setBattle({ ...bRef.current, phase: 'PLAYER_IDLE' });
    } finally {
      busy.current = false;
      if (mounted.current) setTick((t) => t + 1);
    }
  }

  // auto-battle driver
  const [tick, setTick] = useState(0);
  const autoRunning = useRef(false);
  useEffect(() => {
    if (!auto || busy.current || autoRunning.current || bRef.current.result) return;
    if (!['PLAYER_IDLE', 'UNIT_SELECTED', 'TARGETING'].includes(bRef.current.phase)) return;
    autoRunning.current = true;
    (async () => {
      let r = null;
      try {
        busy.current = true;
        setFc(null); setInspect(null);
        setBattle({ ...bRef.current, phase: 'ANIMATING' });
        r = await runTeam('player');
      } finally { busy.current = false; }
      try {
        if (!mounted.current) return;
        if (r) { finish(r, bRef.current); return; }
        setSel(null);
        if (!autoRef.current) { setBattle({ ...bRef.current, phase: 'PLAYER_IDLE' }); return; }
        await endPhase();
      } finally { autoRunning.current = false; if (mounted.current) setTick((t) => t + 1); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, tick, battle.phase]);

  // ---------- player interaction ----------
  const selUnit = sel ? byUid(battle, sel) : null;
  const playerControl = !auto && !busy.current && ['PLAYER_IDLE', 'UNIT_SELECTED', 'TARGETING'].includes(battle.phase);
  const moveSet = useMemo(() => (selUnit && selUnit.team === 'player' && !selUnit.moved && playerControl && !fc ? reachable(battle, selUnit) : null), [battle, selUnit, playerControl, fc]);
  const atkSet = useMemo(() => {
    if (!selUnit || selUnit.team !== 'player' || !playerControl) return null;
    if (!selUnit.moved && moveSet) { const s = attackTiles(battle, selUnit, [...moveSet.keys()]); moveSet.forEach((_, k) => s.delete(k)); return s; }
    return attackTiles(battle, selUnit, [key(selUnit.x, selUnit.y)]);
  }, [battle, selUnit, moveSet, playerControl]);
  const inspectUnit = inspect ? byUid(battle, inspect) : null;
  const threatSet = useMemo(() => {
    if (!inspectUnit || inspectUnit.hp <= 0 || inspectUnit.team !== 'enemy') return null;
    const mv = reachable(battle, inspectUnit);
    return attackTiles(battle, inspectUnit, [...mv.keys()]);
  }, [battle, inspectUnit]);

  function setPhase(p) { setBattle({ ...bRef.current, phase: p }); }

  function selectUnit(u) {
    sfx('select');
    setSel(u.uid); setFc(null); setInspect(null);
    setPhase('UNIT_SELECTED');
  }
  function deselect() { setSel(null); setFc(null); setPhase('PLAYER_IDLE'); }

  function openForecast(att, tgt) {
    const d = dist(att, tgt);
    let wIdx = bestWeaponFor(att, d, 'cheap');
    if (wIdx < 0) return;
    sfx('beep');
    setFc({ attUid: att.uid, tgtUid: tgt.uid, wIdx });
    setPhase('TARGETING');
  }

  function onCellClick(x, y) {
    if (!playerControl) return;
    const b = bRef.current;
    const u = unitAt(b, x, y);
    const S = sel ? byUid(b, sel) : null;
    if (fc) { // clicking elsewhere while forecasting
      if (u && u.team === 'enemy' && S && targetsFrom(b, S, S.x, S.y).some((e) => e.uid === u.uid)) { openForecast(S, u); return; }
      setFc(null); if (S && S.moved) setPhase('TARGETING'); else if (S) setPhase('UNIT_SELECTED'); return;
    }
    if (!S || S.acted) {
      if (u && u.team === 'player' && !u.acted) return selectUnit(u);
      if (u) { sfx('beep'); setInspect(u.uid); setSel(null); setPhase('PLAYER_IDLE'); return; }
      setInspect(null); return;
    }
    // S selected
    if (u && u.uid === S.uid) {
      if (!S.moved) { const nb = moveUnit(b, S.uid, S.x, S.y); setBattle({ ...nb, phase: 'TARGETING' }); sfx('beep'); }
      return;
    }
    if (u && u.team === 'player' && !u.acted) {
      if (S.moved) return; // must finish this unit first
      return selectUnit(u);
    }
    if (u && u.team === 'enemy') {
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
    if (!S.moved && moveSet && moveSet.has(key(x, y))) {
      sfx('move');
      const nb = moveUnit(b, S.uid, x, y);
      setBattle({ ...nb, phase: 'TARGETING' });
      return;
    }
    if (!S.moved) { sfx('cancel'); deselect(); }
  }

  async function confirmAttack() {
    if (!fc || busy.current) return;
    busy.current = true;
    const { attUid, tgtUid, wIdx } = fc;
    setFc(null);
    setPhase('ANIMATING');
    let out;
    try { out = await executeAttack(attUid, tgtUid, wIdx); } finally { busy.current = false; }
    if (!mounted.current) return;
    if (out.result) { finish(out.result, bRef.current); return; }
    if (out.chained) { setSel(attUid); setBattle({ ...bRef.current, phase: 'UNIT_SELECTED' }); return; }
    afterUnitDone();
  }

  function afterUnitDone() {
    setSel(null);
    const b = bRef.current;
    setBattle({ ...b, phase: 'PLAYER_IDLE' });
    if (!alive(b).some((u) => u.team === 'player' && !u.acted)) setTimeout(() => endPhase(), 450);
  }

  function doWait() {
    const b = bRef.current; if (!sel) return;
    const nb = clone(b); const u = byUid(nb, sel); u.acted = true; u.moved = true;
    sfx('beep');
    setBattle(nb); setFc(null);
    setTimeout(afterUnitDone, 0);
  }
  function cancelMove() {
    const b = bRef.current; if (!sel) return;
    const nb = clone(b); const u = byUid(nb, sel); u.x = u.ox; u.y = u.oy; u.moved = false;
    sfx('cancel'); setFc(null);
    setBattle({ ...nb, phase: 'UNIT_SELECTED' });
  }

  const toggleAuto = () => { sfx('select'); setAuto((a) => !a); setFc(null); };

  // ---------- render ----------
  const phaseLabel = { PLAYER_IDLE: 'PLAYER PHASE', UNIT_SELECTED: 'UNIT SELECTED', TARGETING: 'TARGETING', ANIMATING: auto ? 'AUTO-BATTLE' : 'ANIMATING', ENEMY_PHASE: 'ENEMY PHASE', VICTORY: 'VICTORY', DEFEAT: 'DEFEAT' }[battle.phase] || battle.phase;
  const phaseColor = battle.phase === 'ENEMY_PHASE' || battle.phase === 'DEFEAT' ? 'text-rose-300 border-rose-500/50' : battle.phase === 'VICTORY' ? 'text-amber-200 border-amber-400/60' : 'text-cyan-200 border-cyan-400/50';
  const playersLeft = alive(battle).filter((u) => u.team === 'player').length;
  const enemiesLeft = alive(battle).filter((u) => u.team === 'enemy').length;
  const sideUnit = (fc && byUid(battle, fc.attUid)) || selUnit || inspectUnit;
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
          <Btn small variant="cyan" onClick={endPhase} disabled={!playerControl}><Hourglass size={14} /> End Phase</Btn>
          <Btn small variant="rose" onClick={() => setConfirmRetreat(true)} disabled={!!battle.result}><Flag size={14} /> Retreat</Btn>
        </div>

        <div className="flex flex-col lg:flex-row gap-3 items-start">
          {/* hex board */}
          <div className="w-full lg:w-auto flex justify-center">
            <div className="relative select-none rounded-xl overflow-hidden hud-border bg-slate-950/40" style={{ width: 'min(94vw, 620px, calc((100vh - 200px) * 1.18))', minWidth: 280, aspectRatio: `${VBW} / ${VBH}` }}>
              {view === '3d' ? (
                <Board3D battle={battle} stage={stage} moveSet={moveSet} atkSet={atkSet} threatSet={threatSet} tgtKey={tgtKey} selUid={sel} onCellClick={onCellClick} fx={fxState} onFail={() => onView && onView('2d')} />
              ) : (<>
              {stage.art && <img src={stage.art} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 pointer-events-none" />}
              <svg viewBox={`0 0 ${VBW} ${VBH}`} className="absolute inset-0 w-full h-full">
                {battle.map.map((row, y) => row.split('').map((ch, x) => {
                  const [cx, cy] = hexCenter(x, y); const k = key(x, y);
                  const t = TERRAIN[ch] || TERRAIN['.'];
                  const isMove = moveSet?.has(k), isAtk = !isMove && atkSet?.has(k), isThreat = !isMove && !isAtk && threatSet?.has(k);
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
                      {tgtHere && <polygon points={hexPoints(cx, cy, HEX_R - 5)} fill="none" stroke="#fcd34d" strokeWidth="5" />}
                      <polygon points={hexPoints(cx, cy, HEX_R - 2)} className="hex-hover" fill="#fff" opacity="0" />
                    </g>
                  );
                }))}
              </svg>
              {/* units */}
              <div className="absolute inset-0 pointer-events-none">
                {battle.units.filter((u) => u.hp > 0 || fxState.booms.some((bm) => bm.x === u.x && bm.y === u.y)).map((u) => {
                  const isSel = u.uid === sel;
                  const [cx, cy] = hexCenter(u.x, u.y);
                  return (
                    <div key={u.uid} className="absolute transition-all duration-300 ease-out" style={{ left: `${((cx - HEX_W / 2) / VBW) * 100}%`, top: `${((cy - HEX_H / 2) / VBH) * 100}%`, width: `${(HEX_W / VBW) * 100}%`, height: `${(HEX_H / VBH) * 100}%`, opacity: u.hp > 0 ? 1 : 0.2 }}>
                      <div key={fxState.shakes[u.uid] || 0} className={`relative w-full h-full ${fxState.shakes[u.uid] ? 'anim-shake' : ''}`}>
                        <div className={`absolute left-[14%] right-[14%] bottom-[18%] h-[15%] rounded-[50%] ${u.team === 'player' ? 'bg-sky-400/40 border border-sky-300/70' : 'bg-rose-500/40 border border-rose-400/70'} ${isSel ? 'anim-glow ring-2 ring-cyan-300' : ''}`} />
                        <div className="absolute left-[6%] right-[6%] top-[12%] bottom-[16%]">
                          <MechaSprite look={u.look} size="100%" dim={u.team === 'player' && u.acted && battle.phase !== 'ENEMY_PHASE'} bob={!u.acted} />
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
                  <div className={`anim-banner px-6 sm:px-10 py-2 sm:py-3 font-black italic tracking-[0.15em] text-xl sm:text-3xl border-y-2 ${fxState.banner.kind === 'chain' ? 'bg-gradient-to-r from-cyan-500/90 via-amber-400/90 to-cyan-500/90 text-slate-950 border-white shadow-[0_0_40px_rgba(34,211,238,.9)]' : fxState.banner.kind === 'enemy' ? 'bg-rose-700/90 text-white border-rose-300' : fxState.banner.kind === 'ult' ? 'bg-gradient-to-r from-fuchsia-700/90 to-amber-500/90 text-white border-amber-200 shadow-[0_0_40px_rgba(244,114,182,.9)]' : 'bg-sky-700/90 text-white border-sky-300'}`}>
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
              ) : fc ? (
                <ForecastCard b={battle} fc={fc} onWeapon={(i) => setFc({ ...fc, wIdx: i })} onConfirm={confirmAttack} onCancel={() => { sfx('cancel'); setFc(null); setPhase(selUnit?.moved ? 'TARGETING' : 'UNIT_SELECTED'); }} />
              ) : sideUnit ? (
                <UnitCard u={sideUnit} b={battle} />
              ) : (
                <div className="p-3 text-xs text-slate-400 space-y-1.5">
                  <div className="text-cyan-200 font-bold text-sm">Command Brief</div>
                  <p>Tap a <span className="text-sky-300">blue unit</span> to see its <span className="text-sky-300">move tiles</span> and <span className="text-rose-300">attack range</span>. Tap a blue tile to move, then tap an enemy for the Battle Forecast.</p>
                  <p>Tap an enemy directly from the red zone and your unit will auto-path into range.</p>
                  <p>Kill = <b className="text-amber-300">CHAIN STEP</b> (act again, up to 2×). Hits build <b className="text-fuchsia-300">Tension</b>; at 200 your Ultimate unlocks.</p>
                  <p><Wrench size={11} className="inline text-emerald-300" /> Talyer docks heal 15% HP/EN each turn · Debris gives +15% EVA/DEF. The board is hexagonal — every tile has 6 neighbors.</p>
                </div>
              )}
              {playerControl && selUnit && selUnit.team === 'player' && !fc && (
                <div className="px-2.5 pb-2.5 flex gap-2">
                  {selUnit.moved && <Btn small variant="green" className="flex-1" onClick={doWait}><Check size={14} /> Wait</Btn>}
                  {!selUnit.moved && <Btn small variant="green" className="flex-1" onClick={doWait}><Check size={14} /> Wait here</Btn>}
                  {selUnit.moved && selUnit.chain === 0 && <Btn small variant="slate" onClick={cancelMove}><Undo2 size={14} /> Undo Move</Btn>}
                  {!selUnit.moved && <Btn small variant="slate" onClick={deselect}><X size={14} /> Deselect</Btn>}
                </div>
              )}
            </div>
            {/* roster strip */}
            <div className="grid grid-cols-4 gap-1.5">
              {battle.units.filter((u) => u.team === 'player').map((u) => (
                <button key={u.uid} onClick={() => u.hp > 0 && onCellClick(u.x, u.y)} className={`rounded-lg p-1 text-left bg-slate-950/80 border ${u.uid === sel ? 'border-cyan-300' : 'border-slate-700'} ${u.hp <= 0 ? 'opacity-30' : u.acted ? 'opacity-60' : ''}`}>
                  <div className="flex justify-center"><MechaSprite look={u.look} size={34} dim={u.acted || u.hp <= 0} /></div>
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
