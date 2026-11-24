import React, { useState } from 'react';
import { Palette, Copy, FileImage, Check, ClipboardList } from 'lucide-react';
import { ART_CUES, CUTIN_ART_CUES, MECHA, PILOTS, INSTALLED_ART } from '../data.js';
import { MechaSprite, PilotPortrait } from '../Sprite.jsx';
import { Panel, SectionTitle, Btn, copyText } from '../ui.jsx';
import { sfx } from '../audio.js';

const MECHA_BY_FILE = {
  'mecha_jeepney_kaiser.png': 'jeepneyKaiser', 'mecha_tanod_01.png': 'tanod01', 'mecha_tanod_custom.png': 'tanodCustom', 'mecha_agila_mk2.png': 'agilaMk2',
  'mecha_sarimanok_zeta.png': 'sarimanokZ', 'mecha_kapre.png': 'kapreGrunt', 'mecha_tikbalang_custom.png': 'tikbalangCustom', 'mecha_manananggal.png': 'manananggal', 'mecha_bakunawa_boss.png': 'bakunawa',
};
const PILOT_BY_FILE = {
  'pilot_migo_santos.png': 'migo', 'pilot_kapitan_pula.png': 'kapitanPula', 'pilot_tisoy_ramos.png': 'tisoy', 'pilot_mang_berto.png': 'berto',
  'pilot_inday_kidlat.png': 'inday', 'pilot_reyna_diwata.png': 'diwata', 'pilot_datu_dilim.png': 'datuDilim',
};

export default function ArtCues({ save, toast }) {
  const [copied, setCopied] = useState('');
  const groups = [...new Set([...ART_CUES, ...CUTIN_ART_CUES].map((c) => c.group))];

  async function doCopy(text, id, label) {
    const ok = await copyText(text);
    sfx(ok ? 'beep' : 'error');
    setCopied(id); setTimeout(() => setCopied((c) => (c === id ? '' : c)), 1400);
    toast(ok ? `${label} copied` : 'Copy blocked — long-press the text to copy.');
  }

  const customCues = save.customMecha.map((m) => ({
    group: 'Your Custom Mecha', file: `mecha_custom_${m.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.png`, title: m.name, custom: m,
    prompt: ART_CUES.find((c) => c.file === 'mecha_custom_template.png').prompt
      .replace('a bamboo-pattern salakot hat helmet with a glowing visor, standard armored body, bangka outrigger boosters on its back, holding arnis twin batons', `${m.look.head} style head, ${m.look.torso} body, ${m.look.arms} arms, ${m.look.legs === 'none' ? 'no legs, hovering on a flame trail' : `${m.look.legs} legs`}, ${m.look.pack === 'none' ? 'no backpack' : `${m.look.pack} backpack`}, holding a ${m.look.weapon}, named ${m.name}`)
      .replace('[PRIMARY]', m.look.colors.p).replace('[SECONDARY]', m.look.colors.s).replace('[ACCENT]', m.look.colors.a),
  }));
  const all = [...ART_CUES, ...CUTIN_ART_CUES, ...customCues];

  return (
    <div className="space-y-4">
      <SectionTitle icon={Palette} sub="Ready-made prompts for an outside image generator. Each card has one-tap Copy Prompt and Copy File Name, so your generated art lines up with the game's file names.">Art Cues — Game Art Prompts</SectionTitle>
      <Panel className="p-3 flex flex-wrap gap-2 items-center">
        <span className="text-xs text-slate-300 mr-auto">{all.length} prompts · {Object.keys(INSTALLED_ART).length} already in the game · consistent SD-chibi mecha style</span>
        <Btn small variant="amber" onClick={() => doCopy(all.map((c) => `${c.file}\n${c.prompt}`).join('\n\n'), 'all', 'All prompts')}><ClipboardList size={13} /> Copy all prompts</Btn>
        <Btn small variant="slate" onClick={() => doCopy(all.map((c) => c.file).join('\n'), 'files', 'File list')}><FileImage size={13} /> Copy file list</Btn>
      </Panel>
      {[...groups, ...(customCues.length ? ['Your Custom Mecha'] : [])].map((g) => (
        <div key={g}>
          <div className="text-xs tracking-[0.25em] text-amber-300 mb-2">{g.toUpperCase()}</div>
          <div className="grid gap-2 md:grid-cols-2">
            {all.filter((c) => c.group === g).map((c) => {
              const mid = MECHA_BY_FILE[c.file]; const pid = PILOT_BY_FILE[c.file] || (c.file.startsWith('cutin_') ? c.file.slice(6, -4) : null);
              return (
                <Panel key={c.file} className="p-2.5 flex gap-2.5">
                  <div className="shrink-0 w-16 h-16 rounded-lg bg-slate-800/70 flex items-center justify-center">
                    {INSTALLED_ART[c.file] ? <img src={INSTALLED_ART[c.file]} alt="" className="w-16 h-16 object-cover rounded-lg" /> : c.custom ? <MechaSprite look={c.custom.look} size={60} /> : mid ? <MechaSprite look={MECHA[mid].look} size={60} /> : pid ? <PilotPortrait pilot={PILOTS[pid]} size={56} /> : <Palette className="text-slate-500" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="font-bold text-sm text-slate-100 flex items-center gap-1.5">{c.title}{INSTALLED_ART[c.file] && <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/50 rounded px-1 py-0.5 flex items-center gap-0.5"><Check size={10} /> IN GAME</span>}</div>
                    <button onClick={() => doCopy(c.file, c.file + 'f', 'File name')} className="w-full text-left font-mono text-[11px] text-cyan-200 bg-slate-800 rounded px-1.5 py-1 flex items-center gap-1 hover:bg-slate-700">
                      {copied === c.file + 'f' ? <Check size={12} className="text-emerald-300" /> : <FileImage size={12} />}<span className="truncate">{c.file}</span>
                    </button>
                    <p className="text-[11px] text-slate-300 leading-snug select-text">{c.prompt}</p>
                    <div className="flex gap-1.5">
                      <Btn small variant="cyan" onClick={() => doCopy(c.prompt, c.file + 'p', 'Prompt')}>{copied === c.file + 'p' ? <Check size={12} /> : <Copy size={12} />} Copy prompt</Btn>
                      <Btn small variant="slate" onClick={() => doCopy(c.file, c.file + 'f', 'File name')}>{copied === c.file + 'f' ? <Check size={12} /> : <FileImage size={12} />} Copy file name</Btn>
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
