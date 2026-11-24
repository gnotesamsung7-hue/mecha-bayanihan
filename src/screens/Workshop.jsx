import React, { useEffect, useMemo, useState } from 'react';
import { Hammer, Shuffle, Save, Trash2, Share2, Download, Copy, Plus, Minus, Pencil, Coins, FileText, X } from 'lucide-react';
import QRCode from 'qrcode';
import { PARTS, CUSTOM_WEAPONS, CUSTOM_ULTS, COLOR_PRESETS, CUSTOM_COST, CUSTOM_LIMIT, CLASSES } from '../data.js';
import { MechaSprite } from '../Sprite.jsx';
import { Panel, SectionTitle, Btn, ClassBadge, StatPill, Modal, copyText } from '../ui.jsx';
import { customStats, buildCustomMecha, encodeDesign, decodeDesign, TUNE_POINTS } from '../game.js';
import { sfx } from '../audio.js';

const DEFAULT_DESIGN = {
  name: 'Bayani-X', lore: '', cls: 'Attacker',
  head: 'salakot', torso: 'standard', arms: 'standard', legs: 'thruster', pack: 'banca',
  colors: { p: '#f8fafc', s: '#1d4ed8', a: '#dc2626', e: '#fde047' },
  w1: 'arnis', w2: 'lantaka', ult: 'sinag', held: '', tune: { hp: 0, en: 0, atk: 0, def: 0, mob: 0 },
};
const HELD = [['', 'Auto (from main weapon)'], ['rifle', 'Rifle'], ['sword', 'Saber'], ['sticks', 'Arnis sticks'], ['cannon', 'Shoulder cannon'], ['shield', 'Shield'], ['axe', 'Axe'], ['whip', 'Whip'], ['lance', 'Lance']];
const SLOT_NAMES = { head: 'Head', torso: 'Torso', arms: 'Arms', legs: 'Legs', pack: 'Backpack' };
const TUNE_LABEL = { hp: 'HP +20', en: 'EN +5', atk: 'ATK +3', def: 'DEF +3', mob: 'MOB +3' };

function modText(mod) { return Object.entries(mod).map(([k, v]) => `${k.toUpperCase()} ${v > 0 ? '+' : ''}${v}`).join(' · ') || '—'; }

export default function Workshop({ save, setSave, toast, downloads }) {
  const [d, setD] = useState(DEFAULT_DESIGN);
  const [slot, setSlot] = useState('head');
  const [editing, setEditing] = useState(null);
  const [shareOf, setShareOf] = useState(null);
  const [qr, setQr] = useState('');
  const [importCode, setImportCode] = useState('');

  const stats = useMemo(() => customStats(d), [d]);
  const preview = useMemo(() => buildCustomMecha(d, 'preview'), [d]);
  const used = Object.values(d.tune).reduce((a, b) => a + b, 0);
  const atLimit = save.customMecha.length >= CUSTOM_LIMIT && !editing;
  const afford = save.capital >= CUSTOM_COST.capital && save.blueprints >= CUSTOM_COST.bp;

  const set = (patch) => setD((x) => ({ ...x, ...patch }));
  const setColor = (k, v) => setD((x) => ({ ...x, colors: { ...x.colors, [k]: v } }));
  const tune = (k, delta) => setD((x) => {
    const cur = x.tune[k] || 0; const tot = Object.values(x.tune).reduce((a, b) => a + b, 0);
    if (delta > 0 && tot >= TUNE_POINTS) return x; if (delta < 0 && cur <= 0) return x;
    sfx('beep'); return { ...x, tune: { ...x.tune, [k]: cur + delta } };
  });

  function randomize() {
    sfx('select');
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const pal = pick(COLOR_PRESETS).colors;
    set({ head: pick(PARTS.head).id, torso: pick(PARTS.torso).id, arms: pick(PARTS.arms).id, legs: pick(PARTS.legs).id, pack: pick(PARTS.pack).id, colors: { ...pal }, w1: pick(CUSTOM_WEAPONS).id, w2: pick(CUSTOM_WEAPONS).id, ult: pick(CUSTOM_ULTS).id, cls: pick(Object.keys(CLASSES)) });
  }

  function build() {
    if (editing) {
      sfx('build');
      setSave((s) => ({ ...s, customMecha: s.customMecha.map((m) => (m.id === editing ? buildCustomMecha(d, editing) : m)) }));
      toast(`${d.name || 'Mecha'} updated!`); setEditing(null); return;
    }
    if (atLimit) { sfx('error'); toast(`Hangar full — max ${CUSTOM_LIMIT} custom mecha.`); return; }
    if (!afford) { sfx('error'); toast('Not enough Capital / Blueprints.'); return; }
    sfx('build');
    const m = buildCustomMecha(d);
    setSave((s) => ({ ...s, capital: s.capital - CUSTOM_COST.capital, blueprints: s.blueprints - CUSTOM_COST.bp, customMecha: [...s.customMecha, m] }));
    toast(`${m.name} rolled out of your talyer! Assign it in the Hangar.`);
  }

  function edit(m) { sfx('select'); setD({ ...DEFAULT_DESIGN, ...m.design, tune: { ...DEFAULT_DESIGN.tune, ...(m.design?.tune || {}) } }); setEditing(m.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function remove(m) {
    sfx('cancel');
    setSave((s) => ({ ...s, customMecha: s.customMecha.filter((x) => x.id !== m.id), squad: s.squad.map((q) => (q.mechaId === m.id ? { ...q, mechaId: null } : q)) }));
    if (editing === m.id) setEditing(null);
  }
  function doImport() {
    const dd = decodeDesign(importCode);
    if (!dd) { sfx('error'); toast('That share code is not valid.'); return; }
    sfx('select'); setD({ ...DEFAULT_DESIGN, ...dd, tune: { ...DEFAULT_DESIGN.tune, ...(dd.tune || {}) } }); setEditing(null); setImportCode('');
    toast(`Loaded "${dd.name}" into the workshop. Build it to add it to your hangar.`);
  }

  useEffect(() => {
    if (!shareOf) { setQr(''); return; }
    QRCode.toDataURL(encodeDesign(shareOf.design), { margin: 1, width: 280, errorCorrectionLevel: 'L', color: { dark: '#0b1020', light: '#ffffff' } }).then(setQr).catch(() => setQr(''));
  }, [shareOf]);

  async function downloadCard(m) {
    if (!downloads) return;
    try {
      const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 840;
      const g = canvas.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 600, 840); grd.addColorStop(0, '#0f172a'); grd.addColorStop(1, '#1e1b4b');
      g.fillStyle = grd; g.fillRect(0, 0, 600, 840);
      g.strokeStyle = '#22d3ee'; g.lineWidth = 6; g.strokeRect(12, 12, 576, 816);
      const svgEl = document.querySelector(`[data-share-sprite="${m.id}"] svg`);
      if (svgEl) {
        const xml = new XMLSerializer().serializeToString(svgEl);
        const img = new Image();
        await new Promise((res) => { img.onload = res; img.onerror = res; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml); });
        g.drawImage(img, 150, 60, 300, 300);
      }
      g.fillStyle = '#fde047'; g.font = 'bold 40px sans-serif'; g.textAlign = 'center'; g.fillText(m.name, 300, 410);
      g.fillStyle = '#94a3b8'; g.font = '22px sans-serif'; g.fillText(`${m.cls} · HP ${m.hp} · ATK ${m.atk} · DEF ${m.def} · MOB ${m.mob}`, 300, 448);
      if (qr) { const qi = new Image(); await new Promise((res) => { qi.onload = res; qi.onerror = res; qi.src = qr; }); g.drawImage(qi, 180, 480, 240, 240); }
      g.fillStyle = '#cbd5e1'; g.font = '20px sans-serif'; g.fillText('Mecha Bayanihan Tactics · Workshop share code', 300, 760);
      g.fillStyle = '#64748b'; g.font = '16px sans-serif'; g.fillText('Scan, copy the code, paste it in Workshop → Import', 300, 790);
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'));
      await downloads.save({ filename: `${(m.name || 'mecha').replace(/[^a-z0-9]+/gi, '_')}_card.png`, data: blob });
      toast('Mecha card saved!');
    } catch (e) { if (e?.code !== 'declined') toast('Could not save the card here.'); }
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={Hammer} sub={`Mix parts, paint it, tune it, name it. Building costs ${CUSTOM_COST.capital.toLocaleString()} Capital + ${CUSTOM_COST.bp} Blueprints (editing is free). Up to ${CUSTOM_LIMIT} custom mecha.`}>Workshop — Create Your Own Mecha</SectionTitle>
      <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
        <Panel amber className="p-3 space-y-3 lg:sticky lg:top-2 self-start">
          <div className="relative rounded-xl bg-gradient-to-b from-slate-800/60 via-slate-900 to-slate-950 scan-bg flex items-center justify-center py-3">
            <MechaSprite look={preview.look} size={220} bob />
            <div className="absolute top-2 left-2"><ClassBadge cls={d.cls} /></div>
            {editing && <div className="absolute top-2 right-2 text-[10px] bg-amber-500 text-slate-950 font-black px-1.5 py-0.5 rounded">EDITING</div>}
          </div>
          <input value={d.name} maxLength={24} onChange={(e) => set({ name: e.target.value })} placeholder="Mecha name" className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 font-bold text-amber-100" />
          <div className="grid grid-cols-3 gap-1">
            <StatPill label="HP" value={stats.hp} accent="text-emerald-300" /><StatPill label="EN" value={stats.en} accent="text-sky-300" /><StatPill label="ATK" value={stats.atk} accent="text-rose-300" />
            <StatPill label="DEF" value={stats.def} accent="text-cyan-200" /><StatPill label="MOB" value={stats.mob} accent="text-amber-200" /><StatPill label="MOVE" value={stats.move} />
          </div>
          <div className="text-[10px] text-slate-400">Base stats before pilot & class bonus. {CLASSES[d.cls].desc}</div>
          <div className="flex gap-2">
            <Btn variant="amber" className="flex-1" onClick={build} disabled={!editing && (atLimit || !afford)}>
              {editing ? <><Save size={14} /> Save Changes</> : <><Hammer size={14} /> Build <span className="flex items-center gap-0.5 text-[11px]"><Coins size={11} />{CUSTOM_COST.capital}</span><span className="flex items-center gap-0.5 text-[11px]"><FileText size={11} />{CUSTOM_COST.bp}</span></>}
            </Btn>
            <Btn variant="slate" onClick={randomize} title="Randomize"><Shuffle size={14} /></Btn>
            {editing && <Btn variant="slate" onClick={() => { setEditing(null); setD(DEFAULT_DESIGN); }} title="Stop editing"><X size={14} /></Btn>}
          </div>
        </Panel>

        <div className="space-y-3">
          <Panel className="p-3">
            <div className="flex gap-1 flex-wrap mb-2">
              {Object.keys(SLOT_NAMES).map((s) => (
                <button key={s} onClick={() => { sfx('beep'); setSlot(s); }} className={`px-3 py-1 rounded-lg text-sm border ${slot === s ? 'border-amber-300 bg-amber-500/20 text-amber-100' : 'border-slate-600 text-slate-300'}`}>{SLOT_NAMES[s]}</button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
              {PARTS[slot].map((p) => {
                const look = { ...preview.look, [slot]: p.id };
                return (
                  <button key={p.id} onClick={() => { sfx('beep'); set({ [slot]: p.id }); }} className={`rounded-lg p-1.5 border text-center transition ${d[slot] === p.id ? 'border-cyan-300 bg-cyan-500/15' : 'border-slate-700 bg-slate-900 hover:border-slate-500'}`}>
                    <div className="flex justify-center"><MechaSprite look={look} size={64} /></div>
                    <div className="text-[11px] font-bold text-slate-100 leading-tight">{p.name}</div>
                    <div className="text-[9px] text-slate-400">{modText(p.mod)}</div>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel className="p-3 space-y-2">
            <div className="text-xs tracking-widest text-cyan-300">PAINT</div>
            <div className="flex flex-wrap gap-1.5">
              {COLOR_PRESETS.map((cp) => (
                <button key={cp.name} onClick={() => { sfx('beep'); set({ colors: { ...cp.colors } }); }} className="flex items-center gap-1 rounded-full border border-slate-600 px-2 py-1 text-[11px] hover:border-amber-300">
                  {['p', 's', 'a', 'e'].map((k) => <span key={k} className="w-3 h-3 rounded-full border border-black/50" style={{ background: cp.colors[k] }} />)}
                  {cp.name}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[['p', 'Main armor'], ['s', 'Secondary'], ['a', 'Accent / trim'], ['e', 'Eye / beam glow']].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 bg-slate-800/60 rounded px-2 py-1 text-xs">
                  <input type="color" value={d.colors[k]} onChange={(e) => setColor(k, e.target.value)} className="w-8 h-7 bg-transparent cursor-pointer" />{label}
                </label>
              ))}
            </div>
          </Panel>

          <Panel className="p-3 grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs tracking-widest text-cyan-300">CLASS & WEAPONS</div>
              <div className="flex gap-1">
                {Object.keys(CLASSES).map((c) => <button key={c} onClick={() => { sfx('beep'); set({ cls: c }); }} className={`flex-1 text-xs py-1 rounded border ${d.cls === c ? 'border-amber-300 bg-amber-500/20' : 'border-slate-600'}`}>{c}</button>)}
              </div>
              {[['w1', 'Main weapon', CUSTOM_WEAPONS], ['w2', 'Sub weapon', CUSTOM_WEAPONS], ['ult', 'Ultimate (needs 200 Tension)', CUSTOM_ULTS]].map(([k, label, list]) => (
                <label key={k} className="block text-[11px] text-slate-400">{label}
                  <select value={d[k]} onChange={(e) => set({ [k]: e.target.value })} className="w-full mt-0.5 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100">
                    {list.map((w) => <option key={w.id} value={w.id}>{w.name} — PWR {w.power}, R{w.min}-{w.max}, EN {w.en}, HIT {w.hit}%</option>)}
                  </select>
                </label>
              ))}
              <label className="block text-[11px] text-slate-400">Held weapon look
                <select value={d.held} onChange={(e) => set({ held: e.target.value })} className="w-full mt-0.5 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-slate-100">
                  {HELD.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                </select>
              </label>
            </div>
            <div className="space-y-2">
              <div className="text-xs tracking-widest text-cyan-300 flex justify-between"><span>TUNING</span><span className="text-amber-200">{TUNE_POINTS - used} pts left</span></div>
              {Object.keys(TUNE_LABEL).map((k) => (
                <div key={k} className="flex items-center gap-2 text-xs">
                  <span className="w-16 text-slate-300">{TUNE_LABEL[k]}</span>
                  <button onClick={() => tune(k, -1)} className="p-1 rounded bg-slate-800 border border-slate-600"><Minus size={12} /></button>
                  <div className="flex-1 flex gap-0.5">{Array.from({ length: TUNE_POINTS }).map((_, i) => <div key={i} className={`h-2 flex-1 rounded-sm ${i < (d.tune[k] || 0) ? 'bg-amber-400' : 'bg-slate-800'}`} />)}</div>
                  <button onClick={() => tune(k, 1)} className="p-1 rounded bg-slate-800 border border-slate-600"><Plus size={12} /></button>
                </div>
              ))}
              <textarea value={d.lore} maxLength={140} onChange={(e) => set({ lore: e.target.value })} placeholder="Short lore (optional)" rows={2} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs" />
            </div>
          </Panel>

          <Panel className="p-3 space-y-2">
            <div className="text-xs tracking-widest text-cyan-300">IMPORT A FRIEND'S MECHA</div>
            <div className="flex gap-2">
              <input value={importCode} onChange={(e) => setImportCode(e.target.value)} placeholder="Paste a share code (starts with MBT1:)" className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs font-mono" />
              <Btn small variant="cyan" onClick={doImport} disabled={!importCode.trim()}>Load</Btn>
            </div>
          </Panel>
        </div>
      </div>

      <Panel className="p-3">
        <div className="text-xs tracking-widest text-cyan-300 mb-2">YOUR CUSTOM MECHA ({save.customMecha.length}/{CUSTOM_LIMIT})</div>
        {!save.customMecha.length && <p className="text-sm text-slate-400">Nothing built yet. Design one above and hit Build!</p>}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {save.customMecha.map((m) => (
            <div key={m.id} className="flex gap-2 rounded-lg bg-slate-900 border border-slate-700 p-2">
              <MechaSprite look={m.look} size={72} />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-100 truncate">{m.name}</div>
                <div className="flex gap-1 items-center"><ClassBadge cls={m.cls} small /><span className="text-[10px] text-slate-400">HP {m.hp} · ATK {m.atk} · DEF {m.def}</span></div>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  <Btn small variant="slate" onClick={() => edit(m)}><Pencil size={12} /> Edit</Btn>
                  <Btn small variant="cyan" onClick={() => { sfx('select'); setShareOf(m); }}><Share2 size={12} /> Share</Btn>
                  <Btn small variant="rose" onClick={() => remove(m)}><Trash2 size={12} /></Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {shareOf && (
        <Modal onClose={() => setShareOf(null)}>
          <div className="p-4 space-y-3 text-center">
            <div className="font-bold text-amber-200 text-lg">Share “{shareOf.name}”</div>
            <div className="flex justify-center" data-share-sprite={shareOf.id}><MechaSprite look={shareOf.look} size={120} /></div>
            {qr ? <img src={qr} alt="Mecha share code QR" className="mx-auto rounded-lg w-56 h-56" /> : <div className="text-xs text-slate-400">Generating QR…</div>}
            <p className="text-xs text-slate-400">A friend scans this with their phone camera, copies the code, and pastes it into Workshop → Import.</p>
            <textarea readOnly value={encodeDesign(shareOf.design)} rows={3} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-[10px] font-mono" onFocus={(e) => e.target.select()} />
            <div className="flex gap-2 justify-center flex-wrap">
              <Btn variant="cyan" onClick={async () => { const ok = await copyText(encodeDesign(shareOf.design)); toast(ok ? 'Share code copied!' : 'Select the code and copy it manually.'); }}><Copy size={14} /> Copy code</Btn>
              {downloads && <Btn variant="amber" onClick={() => downloadCard(shareOf)}><Download size={14} /> Save card (.png)</Btn>}
              <Btn variant="slate" onClick={() => setShareOf(null)}>Close</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
