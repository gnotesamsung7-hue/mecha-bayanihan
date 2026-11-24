import React, { useEffect, useRef, useState } from 'react';
import { SkipForward, Zap } from 'lucide-react';
import { MechaSprite, PilotPortrait } from './Sprite.jsx';
import { PILOTS, INSTALLED_ART } from './data.js';
import { hpColor } from './ui.jsx';
import { sfx, playVoice, resolveLine } from './audio.js';

// Turn resolveCombat events into cut-in scenes (one per strike).
export function buildExchange(events, pre) {
  const units = {};
  pre.units.forEach((u) => { units[u.uid] = { ...u }; });
  const scenes = [];
  let cur = null, pendingUlt = false;
  for (const ev of events) {
    if (ev.t === 'banner' && ev.kind === 'ult') { pendingUlt = true; continue; }
    if (ev.t === 'attack') {
      cur = { from: ev.from, to: ev.to, fx: ev.fx, label: ev.label, side: ev.side, ult: ev.side === 'main' && pendingUlt, outcome: null };
      pendingUlt = false; scenes.push(cur); continue;
    }
    if (!cur) continue;
    if (ev.t === 'miss') cur.outcome = 'evade';
    else if (ev.t === 'intercept') cur.guard = ev.by;
    else if (ev.t === 'damage') { cur.outcome = cur.outcome || 'hit'; cur.victim = ev.uid; cur.amount = ev.amount; cur.crit = ev.crit; cur.hpAfter = ev.hpAfter; }
    else if (ev.t === 'destroy') cur.killed = ev.uid;
  }
  if (!scenes.length) return null;
  return { scenes, units, leftUid: scenes[0].from, rightUid: scenes[0].to };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FX_SND = { beam: 'beam', shot: 'shot', missile: 'missile', slash: 'slash', mega: 'mega', rainbow: 'rainbow' };
const FX_COL = { beam: '#22d3ee', shot: '#fde047', missile: '#fb923c', slash: '#f8fafc', mega: '#f472b6', rainbow: '#a78bfa' };
const LINE_CUE = { main: 'attack', support: 'attack', counter: 'counter' };

function lineText(pilotId, cue) { return resolveLine(pilotId, cue).text; }

export default function Cinematic({ exchange, mode = 'full', stageArt, onDone }) {
  const { scenes, units, leftUid, rightUid } = exchange;
  const full = mode === 'full';
  const [hp, setHp] = useState(() => Object.fromEntries(Object.values(units).map((u) => [u.uid, u.hp])));
  const [st, setSt] = useState({ idx: 0, phase: 'line', shooterSide: 'L', extra: null, label: null, dmg: null, mono: null, dialog: null, boom: false, evade: null, flash: 0, shake: 0 });
  const [typed, setTyped] = useState('');
  const skipped = useRef(false);
  const doneRef = useRef(false);
  const finish = () => { if (doneRef.current) return; doneRef.current = true; onDone(); };

  const left = units[leftUid], right = units[rightUid];
  const sideOf = (uid) => {
    if (uid === leftUid) return 'L';
    if (uid === rightUid) return 'R';
    return units[uid]?.team === left.team ? 'L' : 'R';
  };

  // typewriter for dialogue
  useEffect(() => {
    const text = st.mono?.text || st.dialog?.text || '';
    if (!full) { setTyped(text); return; }
    setTyped('');
    let i = 0;
    const id = setInterval(() => { i += 2; setTyped(text.slice(0, i)); if (i >= text.length) clearInterval(id); }, 28);
    return () => clearInterval(id);
  }, [st.mono, st.dialog, full]);

  useEffect(() => {
    let live = true;
    const T = (f, s) => (full ? f : s);
    const wait = async (ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (!live || skipped.current) return false; await sleep(30); } return live && !skipped.current; };
    (async () => {
      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i];
        const shooter = units[s.from];
        const target = units[s.to];
        const sSide = sideOf(s.from);
        const extra = (s.side === 'support') ? { uid: s.from, side: sSide, kind: 'support' } : null;
        // ultimate monologue
        if (s.ult) {
          setSt((x) => ({ ...x, idx: i, mono: { pilotId: shooter.pilotId, name: shooter.pilotName, weapon: s.label, text: lineText(shooter.pilotId, 'ultimate') }, dialog: null, label: null, dmg: null, extra: null, boom: false, evade: null }));
          sfx('powerup');
          playVoice(shooter.pilotId, 'ultimate', { force: true });
          const len = lineText(shooter.pilotId, 'ultimate').length;
          if (!(await wait(T(Math.min(7000, 1600 + len * 38), Math.min(4500, 1200 + len * 22))))) break;
        }
        // shooter line
        const cue = LINE_CUE[s.side] || 'attack';
        setSt((x) => ({ ...x, idx: i, mono: null, shooterSide: sSide, extra, phase: 'line', label: s.side === 'counter' ? 'COUNTER!' : s.side === 'support' ? 'SUPPORT ATTACK!' : null, dmg: null, boom: false, evade: null,
          dialog: { pilotId: shooter.pilotId, name: shooter.pilotName, side: sSide, text: s.ult ? `${s.label}!` : lineText(shooter.pilotId, cue), enemy: shooter.team === 'enemy' } }));
        if (!s.ult) playVoice(shooter.pilotId, cue, { force: true });
        if (!(await wait(T(s.ult ? 450 : 900, 300)))) break;
        // fire
        setSt((x) => ({ ...x, phase: 'fire', label: null }));
        sfx(FX_SND[s.fx] || 'beam');
        if (s.fx === 'mega' || s.fx === 'rainbow') setSt((x) => ({ ...x, flash: x.flash + 1 }));
        if (!(await wait(T(s.fx === 'slash' ? 380 : 460, 300)))) break;
        // impact
        const tSide = sideOf(s.to);
        if (s.outcome === 'evade') {
          sfx('miss');
          setSt((x) => ({ ...x, phase: 'impact', evade: tSide, label: 'EVADE!', dialog: { pilotId: target.pilotId, name: target.pilotName, side: tSide, text: lineText(target.pilotId, 'evade'), enemy: target.team === 'enemy' } }));
          playVoice(target.pilotId, 'evade', { force: true });
          if (!(await wait(T(1400, 550)))) break;
          continue;
        }
        const guardU = s.guard ? units[s.guard] : null;
        if (guardU) {
          sfx('shieldUp');
          setSt((x) => ({ ...x, phase: 'impact', extra: { uid: guardU.uid, side: tSide, kind: 'guard' }, label: 'SUPPORT DEFENSE!', dialog: { pilotId: guardU.pilotId, name: guardU.pilotName, side: tSide, text: lineText(guardU.pilotId, 'guard'), enemy: guardU.team === 'enemy' } }));
          playVoice(guardU.pilotId, 'guard', { force: true });
          if (!(await wait(T(650, 250)))) break;
        }
        if (s.victim) setHp((h) => ({ ...h, [s.victim]: s.hpAfter }));
        sfx(s.crit ? 'crit' : 'hit');
        setSt((x) => ({ ...x, phase: 'impact', dmg: { amount: s.amount, crit: s.crit, side: tSide, key: i }, label: s.crit ? 'CRITICAL!' : x.label, shake: x.shake + 1, flash: s.crit ? x.flash + 1 : x.flash }));
        if (!guardU && s.victim && !s.killed && full) {
          const v = units[s.victim];
          setSt((x) => ({ ...x, dialog: { pilotId: v.pilotId, name: v.pilotName, side: tSide, text: lineText(v.pilotId, 'hit'), enemy: v.team === 'enemy' } }));
          if (v.team === 'player' || v.boss) playVoice(v.pilotId, 'hit', { force: true });
        }
        if (!(await wait(T(900, 420)))) break;
        if (s.killed) {
          const v = units[s.killed];
          sfx('explosion');
          setSt((x) => ({ ...x, boom: true, dialog: { pilotId: v.pilotId, name: v.pilotName, side: sideOf(v.uid), text: lineText(v.pilotId, 'destroyed'), enemy: v.team === 'enemy' } }));
          playVoice(v.pilotId, 'destroyed', { force: true });
          if (!(await wait(T(1300, 600)))) break;
        }
      }
      if (live) finish();
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scene = scenes[Math.min(st.idx, scenes.length - 1)];
  const shooterUid = scene.from;
  const isFire = st.phase === 'fire';
  const extra = st.extra ? units[st.extra.uid] : null;
  const portraitArt = (pid) => INSTALLED_ART[`cutin_${pid}.png`];

  const Slot = ({ u, side }) => {
    if (!u) return null;
    const isShooter = u.uid === shooterUid && !(st.extra && st.extra.kind === 'support' && st.extra.side === side);
    const dash = isFire && isShooter && scene.fx === 'slash';
    const lunge = isFire && isShooter && scene.fx !== 'slash';
    const evading = st.evade === side && st.phase === 'impact';
    const cls = dash ? (side === 'L' ? 'cin-dash-r' : 'cin-dash-l') : lunge ? (side === 'L' ? 'cin-lunge-r' : 'cin-lunge-l') : evading ? (side === 'L' ? 'cin-evade-l' : 'cin-evade-r') : '';
    const hidden = (st.extra?.kind === 'support' && st.extra.side === side && u.uid !== st.extra.uid);
    const dead = st.boom && scene.killed === u.uid;
    return (
      <div className={`absolute bottom-[20%] w-[34%] aspect-square ${side === 'L' ? 'left-[9%]' : 'right-[9%]'}`} style={{ opacity: hidden ? 0.25 : 1, transition: 'opacity .2s' }}>
        {evading && <div className="absolute inset-0 cin-ghost" style={{ transform: `translate(${side === 'L' ? '-8%' : '8%'},-10%)` }}><MechaSprite look={u.look} size="100%" flip={side === 'R'} /></div>}
        <div key={`${st.idx}-${st.phase}-${st.shake}`} className={`absolute inset-0 ${cls} ${st.dmg && st.dmg.side === side && st.phase === 'impact' && !st.extra?.kind ? 'anim-shake' : ''}`} style={{ opacity: dead ? 0 : 1, transition: 'opacity .5s .2s' }}>
          <MechaSprite look={u.look} size="100%" flip={side === 'R'} bob />
        </div>
      </div>
    );
  };

  // projectile geometry in % of stage
  const fromSide = (st.extra?.kind === 'support') ? st.extra.side : sideOf(shooterUid);
  const x1 = fromSide === 'L' ? 30 : 70, x2 = fromSide === 'L' ? 72 : 28;
  const col = FX_COL[scene.fx] || '#22d3ee';
  const HpBox = ({ u, align }) => (
    <div className={`w-[44%] ${align === 'R' ? 'text-right' : ''}`}>
      <div className={`flex items-center gap-1 text-[10px] sm:text-xs font-bold ${u.team === 'player' ? 'text-sky-200' : 'text-rose-200'} ${align === 'R' ? 'justify-end' : ''}`}>{u.name}<span className="text-slate-400 font-normal truncate">· {u.pilotName}</span></div>
      <div className="h-2 sm:h-2.5 bg-slate-900/90 rounded overflow-hidden border border-white/10"><div className={`${hpColor(hp[u.uid], u.maxHp)} h-full transition-all duration-500`} style={{ width: `${(hp[u.uid] / u.maxHp) * 100}%`, marginLeft: align === 'R' ? 'auto' : 0 }} /></div>
      <div className="text-[10px] tabular-nums text-slate-300">{Math.max(0, Math.round(hp[u.uid]))}/{u.maxHp}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-40 bg-black/85 flex items-center justify-center select-none" onClick={() => { skipped.current = true; finish(); }}>
      <div className={`relative w-full max-w-4xl aspect-square sm:aspect-[16/9] overflow-hidden sm:rounded-2xl ${st.dmg?.crit && st.phase === 'impact' ? 'cin-shake-screen' : ''}`} onClick={(e) => e.stopPropagation()}>
        {stageArt ? <img src={stageArt} alt="" className="absolute inset-0 w-full h-full object-cover scale-125 blur-[2px] opacity-70" /> : <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-rose-950" />}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        <div className="absolute inset-0 speed-lines opacity-60" />
        <div className="absolute inset-x-0 top-0 h-[7%] bg-black" /><div className="absolute inset-x-0 bottom-0 h-[7%] bg-black" />

        {/* HP header */}
        <div className="absolute top-[8%] inset-x-[3%] flex justify-between">
          <HpBox u={left} align="L" /><HpBox u={right} align="R" />
        </div>

        <Slot u={left} side="L" />
        <Slot u={right} side="R" />

        {/* support / guard unit sliding in */}
        {extra && (
          <div key={`ex-${st.idx}-${st.extra.kind}`} className={`absolute bottom-[14%] w-[26%] aspect-square ${st.extra.side === 'L' ? 'left-[22%] cin-in-l' : 'right-[22%] cin-in-r'}`}>
            <MechaSprite look={extra.look} size="100%" flip={st.extra.side === 'R'} bob />
            {st.extra.kind === 'guard' && <div className="absolute inset-[-8%] rounded-full border-4 border-sky-300 bg-sky-400/20 shield-pulse" />}
          </div>
        )}

        {/* projectile */}
        {isFire && scene.fx !== 'slash' && (
          <div className="absolute inset-0 pointer-events-none">
            {(scene.fx === 'beam' || scene.fx === 'mega' || scene.fx === 'rainbow') && (
              <div className="absolute cin-beam rounded-full" style={{ left: `${Math.min(x1, x2)}%`, width: `${Math.abs(x2 - x1)}%`, top: scene.fx === 'beam' ? '48%' : '44%', height: scene.fx === 'beam' ? '3%' : '10%', transformOrigin: fromSide === 'L' ? 'left center' : 'right center', background: scene.fx === 'rainbow' ? 'linear-gradient(90deg,#ef4444,#facc15,#22c55e,#3b82f6,#a855f7)' : `linear-gradient(90deg, ${col}, #fff, ${col})`, boxShadow: `0 0 24px 6px ${col}` }} />
            )}
            {(scene.fx === 'shot' || scene.fx === 'missile') && [0, 1, 2, 3].map((k) => (
              <div key={k} className="absolute cin-shot rounded-full" style={{ left: `${x1}%`, top: `${44 + k * 3}%`, width: scene.fx === 'missile' ? '3%' : '1.6%', height: scene.fx === 'missile' ? '2.2%' : '1.2%', background: col, boxShadow: `0 0 12px 4px ${col}`, animationDelay: `${k * 0.06}s`, '--dx': `${((x2 - x1) / 100) * 900}%` }} />
            ))}
          </div>
        )}
        {isFire && scene.fx === 'slash' && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
            <path d={fromSide === 'L' ? 'M58 25 Q78 45 70 80' : 'M42 25 Q22 45 30 80'} stroke="#fff" strokeWidth="2.4" fill="none" className="anim-beam" style={{ '--len': 70, strokeDasharray: 70 }} />
            <path d={fromSide === 'L' ? 'M58 25 Q78 45 70 80' : 'M42 25 Q22 45 30 80'} stroke="#22d3ee" strokeWidth="1" fill="none" className="anim-beam" style={{ '--len': 70, strokeDasharray: 70 }} />
          </svg>
        )}
        {st.flash > 0 && <div key={`f${st.flash}`} className="absolute inset-0 bg-white anim-flash pointer-events-none" />}

        {/* impact effects */}
        {st.dmg && st.phase === 'impact' && (
          <div key={`d${st.dmg.key}`} className={`absolute cin-dmg font-black drop-shadow-[0_3px_0_rgba(0,0,0,.9)] ${st.dmg.crit ? 'text-amber-300 text-4xl sm:text-6xl' : 'text-white text-3xl sm:text-5xl'}`} style={{ left: st.dmg.side === 'L' ? '26%' : '74%', top: '30%' }}>{st.dmg.amount}</div>
        )}
        {st.boom && (
          <div className="absolute pointer-events-none" style={{ left: sideOf(scene.killed) === 'L' ? '26%' : '74%', top: '50%' }}>
            {[0, 1, 2].map((k) => <div key={k} className="absolute anim-boom rounded-full" style={{ width: 160 - k * 40, height: 160 - k * 40, left: -(80 - k * 20) + (k - 1) * 14, top: -(80 - k * 20) + (k % 2) * 12, background: ['#f97316', '#fde047', '#ffffff'][k], animationDelay: `${k * 0.12}s` }} />)}
          </div>
        )}
        {st.label && (
          <div key={`l${st.idx}${st.label}`} className={`absolute left-1/2 top-[30%] cin-pop font-black italic tracking-widest text-2xl sm:text-4xl px-4 py-1 -skew-x-12 ${st.label === 'EVADE!' ? 'text-cyan-200' : st.label === 'CRITICAL!' ? 'text-amber-300' : st.label === 'SUPPORT DEFENSE!' ? 'text-sky-200' : st.label === 'COUNTER!' ? 'text-rose-300' : 'text-emerald-300'}`} style={{ textShadow: '0 0 14px rgba(0,0,0,.9), 0 3px 0 #000' }}>{st.label}</div>
        )}

        {/* dialogue */}
        {st.dialog && !st.mono && (
          <div key={`dl${st.idx}${st.dialog.name}${st.dialog.text}`} className={`absolute bottom-[8%] ${st.dialog.side === 'L' ? 'left-[2%] cin-in-l' : 'right-[2%] cin-in-r'} w-[78%] sm:w-[60%] flex items-center gap-2 bg-slate-950/90 border ${st.dialog.enemy ? 'border-rose-400/60' : 'border-cyan-400/60'} rounded-xl p-2 ${st.dialog.side === 'R' ? 'flex-row-reverse text-right' : ''}`}>
            <div className="shrink-0 rounded-lg overflow-hidden">{portraitArt(st.dialog.pilotId) ? <img src={portraitArt(st.dialog.pilotId)} alt="" className="w-12 h-12 sm:w-14 sm:h-14 object-cover" /> : <PilotPortrait pilot={PILOTS[st.dialog.pilotId] || PILOTS.kadete} size={52} />}</div>
            <div className="min-w-0">
              <div className={`text-[10px] sm:text-xs font-black tracking-wider ${st.dialog.enemy ? 'text-rose-300' : 'text-amber-300'}`}>{st.dialog.name}</div>
              <div className="text-xs sm:text-base text-white leading-snug">“{typed}”</div>
            </div>
          </div>
        )}

        {/* ultimate monologue */}
        {st.mono && (
          <div className="absolute inset-0 flex items-center">
            <div className="absolute inset-x-0 top-[18%] bottom-[18%] mono-band bg-gradient-to-r from-fuchsia-900/95 via-slate-950/95 to-amber-900/90 border-y-2 border-amber-300/80" />
            <div className="relative flex items-center gap-3 sm:gap-5 px-4 sm:px-8 w-full">
              <div className="portrait-in shrink-0 rounded-2xl overflow-hidden ring-4 ring-amber-300/80 shadow-[0_0_40px_rgba(251,191,36,.6)]">
                {portraitArt(st.mono.pilotId) ? <img src={portraitArt(st.mono.pilotId)} alt="" className="w-24 h-24 sm:w-40 sm:h-40 object-cover" /> : <PilotPortrait pilot={PILOTS[st.mono.pilotId] || PILOTS.kadete} size={window.innerWidth < 640 ? 96 : 160} />}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] sm:text-xs font-black tracking-[0.3em] text-amber-300">{st.mono.name}</div>
                {st.mono.text && <div className="text-sm sm:text-xl text-white leading-snug mt-1 italic">“{typed}”</div>}
                <div className="mt-2 text-lg sm:text-3xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-fuchsia-300 flex items-center gap-2"><Zap className="text-amber-300 shrink-0" />{st.mono.weapon}</div>
              </div>
            </div>
          </div>
        )}

        <button onClick={() => { skipped.current = true; finish(); }} className="absolute top-[8%] left-1/2 -translate-x-1/2 bg-black/60 border border-white/30 text-white text-[11px] font-bold rounded-full px-3 py-1 flex items-center gap-1 hover:bg-black/80">
          <SkipForward size={12} /> Skip
        </button>
      </div>
    </div>
  );
}
