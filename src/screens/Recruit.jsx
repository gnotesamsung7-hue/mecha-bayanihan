import React, { useState } from 'react';
import { Sparkles, Gem, Star, Info } from 'lucide-react';
import { GACHA_POOL, GACHA_RATES, PITY_LIMIT, DUPE_REWARD, PULL_COST, MECHA, PILOTS, RARITY_STYLE } from '../data.js';
import { MechaSprite, PilotPortrait } from '../Sprite.jsx';
import { Panel, SectionTitle, Btn, Modal, RarityBadge, ClassBadge } from '../ui.jsx';
import { sfx, playVoice } from '../audio.js';

function rollRarity(forceSR) {
  const r = Math.random();
  if (r < GACHA_RATES.SSR) return 'SSR';
  if (r < GACHA_RATES.SSR + GACHA_RATES.SR || forceSR) return 'SR';
  return 'R';
}

export function doPulls(save, n) {
  let pity = save.pity;
  const owned = { mecha: new Set(save.ownedMecha), pilot: new Set(save.ownedPilots) };
  let capital = 0, bp = 0;
  const results = [];
  for (let i = 0; i < n; i++) {
    pity += 1;
    let rar = rollRarity(n === 10 && i === 9 && !results.some((x) => x.rarity !== 'R'));
    if (pity >= PITY_LIMIT) rar = 'SSR';
    if (rar === 'SSR') pity = 0;
    const pool = GACHA_POOL[rar];
    const item = pool[Math.floor(Math.random() * pool.length)];
    const set = owned[item.type];
    const dupe = set.has(item.id);
    if (dupe) { capital += DUPE_REWARD[rar].capital; bp += DUPE_REWARD[rar].bp; } else set.add(item.id);
    results.push({ ...item, rarity: rar, dupe, pityHit: rar === 'SSR' && pity === 0 && i >= 0 });
  }
  return {
    results,
    next: { ...save, pity, diamonds: save.diamonds - (n === 10 ? PULL_COST.ten : PULL_COST.single), capital: save.capital + capital, blueprints: save.blueprints + bp, ownedMecha: [...owned.mecha], ownedPilots: [...owned.pilot], stats: { ...save.stats, pulls: (save.stats.pulls || 0) + n } },
    capital, bp,
  };
}

function Card({ r, i }) {
  const s = RARITY_STYLE[r.rarity];
  const data = r.type === 'mecha' ? MECHA[r.id] : PILOTS[r.id];
  return (
    <div className="anim-card" style={{ animationDelay: `${i * 0.18}s` }}>
      <div className={`relative rounded-xl p-[2px] bg-gradient-to-br ${s.bg} shadow-lg ${s.glow}`}>
        <div className="rounded-[10px] bg-slate-950/90 p-2 h-full flex flex-col items-center gap-1 relative overflow-hidden">
          {r.rarity === 'SSR' && <div className="absolute inset-0 ssr-shine pointer-events-none" />}
          <div className="flex w-full justify-between items-center"><RarityBadge r={r.rarity} small />{r.dupe ? <span className="text-[9px] text-slate-400">DUPE</span> : <span className="text-[9px] font-black text-emerald-300">NEW!</span>}</div>
          {r.type === 'mecha' ? <MechaSprite look={data.look} size={70} /> : <PilotPortrait pilot={data} size={62} />}
          <div className={`text-[11px] font-bold text-center leading-tight ${s.text}`}>{r.type === 'mecha' ? data.short : data.name}</div>
          <div className="text-[9px] text-slate-400">{r.type === 'mecha' ? <ClassBadge cls={data.cls} small /> : data.skill.name}</div>
          {r.dupe && <div className="text-[9px] text-amber-200">+{DUPE_REWARD[r.rarity].capital}C +{DUPE_REWARD[r.rarity].bp}BP</div>}
        </div>
      </div>
    </div>
  );
}

export default function Recruit({ save, setSave, toast }) {
  const [res, setRes] = useState(null);
  const [showRates, setShowRates] = useState(false);

  function pull(n) {
    const cost = n === 10 ? PULL_COST.ten : PULL_COST.single;
    if (save.diamonds < cost) { sfx('error'); toast('Not enough Diamonds — clear stages to earn more!'); return; }
    sfx('gacha');
    const out = doPulls(save, n);
    setSave(out.next);
    setRes(out);
    out.results.forEach((r, i) => setTimeout(() => sfx(r.rarity === 'SSR' ? 'ssr' : 'reveal'), 300 + i * 180));
    const ssrPilot = out.results.find((r) => r.rarity === 'SSR' && r.type === 'pilot' && !r.dupe);
    if (ssrPilot) setTimeout(() => playVoice(ssrPilot.id, 'sortie', { force: true }), 600 + out.results.length * 180);
  }

  const featured = [MECHA.sarimanokZ, MECHA.bakunawa];
  return (
    <div className="space-y-4">
      <SectionTitle icon={Sparkles} sub="Pull mecha and pilots. Duplicates convert into Capital + Blueprints.">Recruit — Bayanihan Fiesta Banner</SectionTitle>
      <Panel amber className="p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900/50 via-slate-950 to-amber-900/40" />
        <div className="absolute inset-x-0 top-0 h-6 flex justify-around opacity-80">
          {Array.from({ length: 18 }).map((_, i) => <div key={i} className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent" style={{ borderTopColor: ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#ec4899'][i % 5] }} />)}
        </div>
        <div className="relative grid md:grid-cols-[1fr_auto] gap-4 items-center pt-4">
          <div>
            <div className="text-[10px] tracking-[0.35em] text-amber-300">LIMITED · RATE UP</div>
            <div className="text-2xl sm:text-3xl font-black text-white">Fiesta ng mga Higante</div>
            <p className="text-sm text-slate-300 mt-1">SSR Sarimanok Zeta, SSR Bakunawa, Kapitan Pula & Reyna Diwata are in the pool. Guaranteed SSR every {PITY_LIMIT} pulls; 10x guarantees at least one SR.</p>
            <div className="mt-3 flex items-center gap-3">
              <div className="text-xs text-slate-300">Pity: <b className="text-amber-200">{save.pity}</b>/{PITY_LIMIT}</div>
              <div className="flex-1 max-w-xs h-2 bg-slate-800 rounded overflow-hidden"><div className="h-full bg-gradient-to-r from-amber-400 to-fuchsia-500" style={{ width: `${(save.pity / PITY_LIMIT) * 100}%` }} /></div>
            </div>
            <div className="mt-3 flex gap-2 flex-wrap">
              <Btn variant="cyan" onClick={() => pull(1)} disabled={save.diamonds < PULL_COST.single}><Gem size={14} /> 1x Pull · {PULL_COST.single}</Btn>
              <Btn variant="amber" onClick={() => pull(10)} disabled={save.diamonds < PULL_COST.ten}><Gem size={14} /> 10x Pull · {PULL_COST.ten.toLocaleString()}</Btn>
              <Btn variant="slate" small onClick={() => setShowRates(!showRates)}><Info size={13} /> Rates</Btn>
            </div>
            {showRates && (
              <div className="mt-2 text-[11px] text-slate-300 grid sm:grid-cols-3 gap-2">
                {['SSR', 'SR', 'R'].map((r) => (
                  <div key={r} className="bg-slate-900/80 rounded p-2">
                    <div className="flex items-center gap-1 mb-1"><RarityBadge r={r} small /> {(GACHA_RATES[r] * 100).toFixed(0)}%</div>
                    {GACHA_POOL[r].map((it) => <div key={it.id}>• {it.type === 'mecha' ? MECHA[it.id].short : PILOTS[it.id].name}</div>)}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-center -space-x-6">
            {featured.map((m, i) => <div key={m.id} className={`${i ? 'mt-6' : ''}`}><MechaSprite look={m.look} size={130} bob /></div>)}
          </div>
        </div>
      </Panel>
      {res && (
        <Modal onClose={() => setRes(null)} wide>
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-black text-amber-200 flex items-center gap-2"><Star className="fill-amber-300 text-amber-300" size={18} /> Recruit Results</div>
              <Btn small variant="slate" onClick={() => setRes(null)}>Close</Btn>
            </div>
            <div className={`grid gap-2 ${res.results.length > 1 ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-1 max-w-[160px] mx-auto'}`}>
              {res.results.map((r, i) => <Card key={i} r={r} i={i} />)}
            </div>
            {(res.capital > 0 || res.bp > 0) && <div className="mt-3 text-center text-sm text-amber-200">Duplicates converted: +{res.capital} Capital, +{res.bp} Blueprints</div>}
            <div className="mt-3 flex justify-center gap-2">
              <Btn variant="cyan" onClick={() => pull(1)} disabled={save.diamonds < PULL_COST.single}>Pull 1 more</Btn>
              <Btn variant="amber" onClick={() => pull(10)} disabled={save.diamonds < PULL_COST.ten}>Pull 10 more</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
