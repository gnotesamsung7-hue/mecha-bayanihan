import React, { useState } from 'react';
import { GitBranch, Lock, Check, Coins, FileText, ArrowRight } from 'lucide-react';
import { TECH_TREE, MECHA } from '../data.js';
import { MechaSprite } from '../Sprite.jsx';
import { Panel, SectionTitle, Btn, ClassBadge, RarityBadge, StatPill } from '../ui.jsx';
import { sfx } from '../audio.js';

export default function Develop({ save, setSave, toast }) {
  const [pick, setPick] = useState({ line: 0, idx: 1 });
  const node = TECH_TREE[pick.line].nodes[pick.idx];
  const m = MECHA[node.id];
  const owned = save.ownedMecha.includes(node.id);
  const prevOwned = !node.from || save.ownedMecha.includes(node.from);
  const afford = node.capital ? save.capital >= node.capital && save.blueprints >= node.bp : true;
  const from = node.from ? MECHA[node.from] : null;

  function develop() {
    if (owned || !prevOwned || !afford) { sfx('error'); return; }
    sfx('build');
    setSave((s) => ({ ...s, capital: s.capital - node.capital, blueprints: s.blueprints - node.bp, ownedMecha: [...s.ownedMecha, node.id] }));
    toast(`Developed ${m.name}!`);
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={GitBranch} sub="Spend Capital + Blueprints to evolve a mecha into its next tier. You keep the older unit too.">Develop — Tech Tree</SectionTitle>
      <Panel className="p-3 overflow-x-auto no-scrollbar">
        <div className="min-w-[640px] space-y-6 py-2">
          {TECH_TREE.map((line, li) => (
            <div key={line.line}>
              <div className="text-xs tracking-[0.25em] mb-2" style={{ color: line.color }}>{line.line.toUpperCase()}</div>
              <div className="flex items-center">
                {line.nodes.map((n, ni) => {
                  const mm = MECHA[n.id];
                  const own = save.ownedMecha.includes(n.id);
                  const avail = !own && (!n.from || save.ownedMecha.includes(n.from));
                  const active = pick.line === li && pick.idx === ni;
                  return (
                    <React.Fragment key={n.id}>
                      {ni > 0 && (
                        <div className="flex-1 h-1 mx-1 rounded relative" style={{ background: own ? line.color : avail ? `${line.color}80` : '#334155' }}>
                          <ArrowRight size={14} className="absolute -top-[5px] right-0 translate-x-1/2" style={{ color: own || avail ? line.color : '#475569' }} />
                        </div>
                      )}
                      <button onClick={() => { sfx('beep'); setPick({ line: li, idx: ni }); }}
                        className={`w-[124px] shrink-0 rounded-xl p-2 text-center border-2 transition ${active ? 'scale-105' : ''} ${own ? 'bg-slate-900' : avail ? 'bg-slate-900/80 animate-pulse' : 'bg-slate-950 opacity-60'}`}
                        style={{ borderColor: active ? '#fde047' : own ? line.color : avail ? `${line.color}99` : '#334155' }}>
                        <div className="relative flex justify-center">
                          <MechaSprite look={mm.look} size={70} dim={!own && !avail} />
                          {own && <Check size={16} className="absolute top-0 right-0 text-emerald-300" />}
                          {!own && !avail && <Lock size={14} className="absolute top-0 right-0 text-slate-400" />}
                        </div>
                        <div className="text-[11px] font-bold text-slate-100 truncate">{mm.short}</div>
                        <div className="text-[9px] text-slate-400">Tier {ni + 1} · {mm.rarity}</div>
                      </button>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel amber className="p-3 grid gap-3 md:grid-cols-[180px_1fr]">
        <div className="flex flex-col items-center justify-center bg-gradient-to-b from-slate-800/60 to-slate-950 rounded-xl p-2">
          <MechaSprite look={m.look} size={150} bob />
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap"><span className="text-lg font-bold text-amber-100">{m.name}</span><RarityBadge r={m.rarity} /><ClassBadge cls={m.cls} /></div>
          <p className="text-xs text-slate-300">{m.lore}</p>
          <div className="grid grid-cols-6 gap-1">
            <StatPill label="HP" value={m.hp} /><StatPill label="EN" value={m.en} /><StatPill label="ATK" value={m.atk} /><StatPill label="DEF" value={m.def} /><StatPill label="MOB" value={m.mob} /><StatPill label="MOV" value={m.move} />
          </div>
          <div className="text-[11px] text-slate-300 space-y-0.5">{m.weapons.map((w, i) => <div key={i}>{w.ult ? '⚡ ' : '• '}{w.name} — PWR {w.power}, R{w.min}-{w.max}, EN {w.en}</div>)}</div>
          {owned ? <div className="text-emerald-300 text-sm font-bold flex items-center gap-1"><Check size={16} /> Already in your hangar</div>
            : !node.from ? <div className="text-slate-400 text-sm">Base unit — obtain from Recruit.</div>
            : (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-sm flex gap-3">
                  <span className={`flex items-center gap-1 ${save.capital >= node.capital ? 'text-amber-200' : 'text-rose-400'}`}><Coins size={14} />{node.capital.toLocaleString()}</span>
                  <span className={`flex items-center gap-1 ${save.blueprints >= node.bp ? 'text-cyan-200' : 'text-rose-400'}`}><FileText size={14} />{node.bp}</span>
                </div>
                <Btn variant="amber" disabled={!prevOwned || !afford} onClick={develop}>{!prevOwned ? `Requires ${from.short}` : !afford ? 'Not enough resources' : `Evolve ${from.short} → ${m.short}`}</Btn>
              </div>
            )}
        </div>
      </Panel>
    </div>
  );
}
