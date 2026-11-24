import React from 'react';
import { Warehouse } from 'lucide-react';
import { MECHA, PILOTS, CLASSES } from '../data.js';
import { MechaSprite, PilotPortrait } from '../Sprite.jsx';
import { Panel, SectionTitle, ClassBadge, RarityBadge, StatPill } from '../ui.jsx';
import { getMecha, getPilot, combinedStats, playerLook } from '../game.js';
import { sfx } from '../audio.js';

export default function Hangar({ save, setSave }) {
  const ownedMecha = [...save.ownedMecha.map((id) => MECHA[id]).filter(Boolean), ...save.customMecha];
  const ownedPilots = save.ownedPilots.map((id) => PILOTS[id]).filter(Boolean);

  function assign(i, field, value) {
    sfx('beep');
    setSave((s) => {
      const squad = s.squad.map((x) => ({ ...x }));
      // keep unique: if value used in another slot, swap
      const other = squad.findIndex((x, j) => j !== i && x[field] === value && value);
      if (other >= 0) squad[other][field] = squad[i][field];
      squad[i][field] = value || null;
      return { ...s, squad };
    });
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={Warehouse} sub="Pair up to 4 pilots with 4 mecha. Stats shown are combined (mecha + pilot + class bonus).">Hangar — Squad Prep</SectionTitle>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {save.squad.map((slot, i) => {
          const m = getMecha(slot.mechaId, save);
          const p = slot.pilotId ? getPilot(slot.pilotId) : null;
          const st = m ? combinedStats(m, p || PILOTS.kadete) : null;
          return (
            <Panel key={i} className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[10px] tracking-[0.3em] text-amber-300">SLOT {i + 1}</div>
                {m && <div className="flex gap-1"><RarityBadge r={m.rarity} small /><ClassBadge cls={m.cls} small /></div>}
              </div>
              <div className="flex items-center justify-center h-28 rounded-lg bg-gradient-to-b from-slate-800/60 to-slate-950 relative">
                {m ? <MechaSprite look={playerLook(m)} size={104} bob /> : <span className="text-slate-600 text-sm">No mecha</span>}
                {p && <div className="absolute bottom-1 right-1"><PilotPortrait pilot={p} size={36} /></div>}
              </div>
              <select value={slot.mechaId || ''} onChange={(e) => assign(i, 'mechaId', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm">
                <option value="">— No mecha —</option>
                {ownedMecha.map((om) => <option key={om.id} value={om.id}>{om.name}{om.custom ? ' (Custom)' : ''}</option>)}
              </select>
              <select value={slot.pilotId || ''} onChange={(e) => assign(i, 'pilotId', e.target.value)} className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm">
                <option value="">— Kadete (auto pilot) —</option>
                {ownedPilots.map((op) => <option key={op.id} value={op.id}>{op.name} · {op.skill.name}</option>)}
              </select>
              {m && st && (
                <>
                  <div className="grid grid-cols-3 gap-1">
                    <StatPill label="HP" value={st.hp} accent="text-emerald-300" /><StatPill label="EN" value={st.en} accent="text-sky-300" /><StatPill label="ATK" value={st.atk} accent="text-rose-300" />
                    <StatPill label="DEF" value={st.def} accent="text-cyan-200" /><StatPill label="MOB" value={st.mob} accent="text-amber-200" /><StatPill label="MOVE" value={st.move} />
                  </div>
                  <div className="text-[10px] text-slate-400">{CLASSES[m.cls].desc}</div>
                  <div className="space-y-1">
                    {m.weapons.map((w, k) => (
                      <div key={k} className={`text-[11px] rounded px-1.5 py-1 flex justify-between gap-1 ${w.ult ? 'bg-fuchsia-950/60 text-fuchsia-100' : 'bg-slate-800/70'}`}>
                        <span className="truncate">{w.ult ? '⚡ ' : ''}{w.name}</span><span className="text-slate-400 shrink-0">P{w.power} R{w.min}-{w.max} EN{w.en}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] rounded bg-amber-500/10 border border-amber-500/30 px-2 py-1">
                    <b className="text-amber-200">{(p || PILOTS.kadete).skill.name}</b> <span className="text-slate-300">— {(p || PILOTS.kadete).skill.desc}</span>
                  </div>
                </>
              )}
            </Panel>
          );
        })}
      </div>
      <Panel className="p-3">
        <div className="text-xs tracking-widest text-cyan-300 mb-2">MECHA COLLECTION ({ownedMecha.length})</div>
        <div className="flex flex-wrap gap-2">
          {ownedMecha.map((m) => (
            <div key={m.id} className="w-[104px] rounded-lg bg-slate-900 border border-slate-700 p-1.5 text-center">
              <MechaSprite look={playerLook(m)} size={64} />
              <div className="text-[10px] text-slate-100 truncate">{m.short}</div>
              <div className="flex justify-center gap-1 mt-0.5"><RarityBadge r={m.rarity} small /><ClassBadge cls={m.cls} small /></div>
            </div>
          ))}
        </div>
        <div className="text-xs tracking-widest text-cyan-300 mt-4 mb-2">PILOT ROSTER ({ownedPilots.length})</div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ownedPilots.map((p) => (
            <div key={p.id} className="flex gap-2 items-start rounded-lg bg-slate-900 border border-slate-700 p-2">
              <PilotPortrait pilot={p} size={46} />
              <div className="min-w-0">
                <div className="flex items-center gap-1"><span className="text-sm font-bold text-slate-100">{p.name}</span><RarityBadge r={p.rarity} small /></div>
                <div className="text-[10px] text-slate-400">{p.title}</div>
                <div className="text-[11px]"><b className="text-amber-200">{p.skill.name}:</b> <span className="text-slate-300">{p.skill.desc}</span></div>
                <div className="text-[10px] text-slate-400 italic mt-0.5">{p.story}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
