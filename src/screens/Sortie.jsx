import React from 'react';
import { Rocket, Lock, Star, FastForward, Map as MapIcon, Coins, FileText, Gem } from 'lucide-react';
import { STAGES, MECHA, TERRAIN } from '../data.js';
import { MechaSprite } from '../Sprite.jsx';
import { Btn, Panel, SectionTitle, ClassBadge } from '../ui.jsx';
import { getMecha, getPilot, playerLook } from '../game.js';
import { sfx } from '../audio.js';

function MiniMap({ stage }) {
  const R = 10 / Math.sqrt(3), H = R * 2;
  const pts = (cx, cy) => [-90, -30, 30, 90, 150, 210].map((d) => { const t = (d * Math.PI) / 180; return `${(cx + (R - 0.6) * Math.cos(t)).toFixed(2)},${(cy + (R - 0.6) * Math.sin(t)).toFixed(2)}`; }).join(' ');
  return (
    <svg viewBox={`0 0 85 ${(H + 7 * H * 0.75).toFixed(1)}`} className="w-24 shrink-0 rounded border border-cyan-800/60 bg-cyan-950/40">
      {stage.map.map((row, y) => row.split('').map((ch, x) => {
        const isP = stage.playerSpawns.some(([px, py]) => px === x && py === y);
        const en = stage.enemies.find((e) => e.x === x && e.y === y);
        const t = TERRAIN[ch];
        const fill = en ? (en.boss ? '#fbbf24' : '#f43f5e') : isP ? '#38bdf8' : t.id === 'debris' ? '#64748b' : t.id === 'dock' ? '#10b981' : '#0f172a';
        return <polygon key={`${x}${y}`} points={pts((x + 0.5 * (y & 1)) * 10 + 5, y * H * 0.75 + R)} fill={fill} />;
      }))}
    </svg>
  );
}

export default function Sortie({ save, onSortie, auto, setAuto, goHangar }) {
  const deployed = save.squad.filter((s) => s.mechaId && getMecha(s.mechaId, save));
  return (
    <div className="space-y-4">
      <SectionTitle icon={MapIcon} sub="Choose a scenario. Clear one to unlock the next. First clears pay bonus Diamonds.">Sortie — Campaign Map</SectionTitle>
      <Panel className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs text-slate-400 tracking-widest">DEPLOY SQUAD</div>
          <div className="flex gap-2 flex-wrap flex-1">
            {save.squad.map((s, i) => {
              const m = getMecha(s.mechaId, save);
              return (
                <div key={i} className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 border ${m ? 'border-cyan-700 bg-slate-900' : 'border-dashed border-slate-700'}`}>
                  {m ? <><MechaSprite look={playerLook(m)} size={36} /><div className="text-[11px] leading-tight"><div className="text-slate-100">{m.short}</div><div className="text-slate-400">{getPilot(s.pilotId || 'kadete').name.split(' (')[0]}</div></div></> : <span className="text-[11px] text-slate-500 px-2">Empty slot</span>}
                </div>
              );
            })}
          </div>
          <Btn small variant="slate" onClick={goHangar}>Edit in Hangar</Btn>
          <Btn small variant={auto ? 'amber' : 'slate'} onClick={() => { sfx('beep'); setAuto(!auto); }}><FastForward size={14} /> Start in Auto 2x: {auto ? 'ON' : 'OFF'}</Btn>
        </div>
      </Panel>
      <div className="grid gap-3 md:grid-cols-3">
        {STAGES.map((st) => {
          const locked = st.requires && !save.cleared.includes(st.requires);
          const cleared = save.cleared.includes(st.id);
          const enemyIds = [...new Set(st.enemies.map((e) => e.mecha))];
          return (
            <Panel key={st.id} amber={st.num === 3} className={`p-3 flex flex-col gap-2 relative overflow-hidden ${locked ? 'opacity-60' : ''}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${st.bg} opacity-60 -z-0`} />
              {st.art && <img src={st.art} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none" />}
              <div className="relative flex items-start justify-between">
                <div>
                  <div className="text-[10px] tracking-[0.3em] text-amber-300">STAGE {st.num}</div>
                  <div className="font-bold text-cyan-100 text-lg leading-tight">{st.name}</div>
                  <div className="text-[11px] text-slate-300">{st.sub}</div>
                </div>
                {cleared ? <Star className="text-amber-300 fill-amber-300 shrink-0" /> : locked ? <Lock className="text-slate-400 shrink-0" /> : null}
              </div>
              <div className="relative flex gap-2">
                <MiniMap stage={st} />
                <p className="text-xs text-slate-300 leading-snug">{st.desc}</p>
              </div>
              <div className="relative flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-rose-300 tracking-widest mr-1">ENEMIES</span>
                {enemyIds.map((id) => <div key={id} title={MECHA[id].name} className="bg-rose-950/60 rounded"><MechaSprite look={MECHA[id].look} size={30} /></div>)}
                <span className="text-[10px] text-slate-400 ml-auto">{st.enemies.length} units · Deploy {st.maxDeploy}</span>
              </div>
              <div className="relative text-[11px] text-slate-300 flex gap-3 flex-wrap">
                <span className="flex items-center gap-1"><Coins size={12} className="text-amber-300" />{st.reward.capital}</span>
                <span className="flex items-center gap-1"><FileText size={12} className="text-cyan-300" />{st.reward.bp}</span>
                <span className="flex items-center gap-1"><Gem size={12} className="text-fuchsia-300" />{cleared ? st.reward.diamonds : `${st.reward.diamonds + st.firstClear.diamonds} (1st clear)`}</span>
              </div>
              <Btn variant={st.num === 3 ? 'amber' : 'cyan'} className="relative mt-auto" disabled={locked || !deployed.length} onClick={() => onSortie(st)}>
                <Rocket size={15} /> {locked ? `Clear Stage ${st.num - 1} first` : 'SORTIE!'}
              </Btn>
            </Panel>
          );
        })}
      </div>
      {!deployed.length && <p className="text-sm text-rose-300">Assign at least one mecha in the Hangar before sortie.</p>}
    </div>
  );
}
