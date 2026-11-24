import React, { useEffect, useRef, useState } from 'react';
import { Mic, Play, Upload, Trash2, Square, Volume2, Music, RotateCcw, Radio } from 'lucide-react';
import { VOICE_CUES, VOICE_PILOTS, VOICE_LINES, PILOTS } from '../data.js';
import { PilotPortrait } from '../Sprite.jsx';
import { Panel, SectionTitle, Btn } from '../ui.jsx';
import {
  sfx, audio, playVoice, getVoiceSettings, setVoiceSetting, setPilotVoice, resolveLine, resolveVoice, getTTSVoices,
  saveClip, loadClip, deleteClip, listClipKeys, invalidateClip, playClipBlob, startRecording, resetVoiceSettings, clearClips,
} from '../audio.js';

const FX = [['none', 'Clean'], ['robot', 'Robot'], ['radio', 'Radio comms'], ['cockpit', 'Cockpit echo'], ['deep', 'Deep (slow)'], ['chipmunk', 'Chipmunk (fast)']];
const SFX_PAD = [['beam', 'Beam rifle'], ['shot', 'Machine gun'], ['missile', 'Missiles'], ['slash', 'Saber'], ['mega', 'Ultimate'], ['rainbow', 'Bahaghari'], ['hit', 'Hit'], ['crit', 'Critical'], ['explosion', 'Explosion'], ['shieldUp', 'Guard'], ['powerup', 'Tension up'], ['chain', 'Chain step'], ['heal', 'Talyer heal'], ['victory', 'Victory'], ['defeat', 'Defeat'], ['ssr', 'SSR pull']];

export default function SoundStudio({ save, setSave, toast }) {
  const [pilotId, setPilotId] = useState('migo');
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);
  const [voices, setVoices] = useState(getTTSVoices());
  const [clips, setClips] = useState([]);
  const [rec, setRec] = useState(null); // {cue, handle}
  const fileRef = useRef(null);
  const uploadCue = useRef(null);
  const settings = save.settings;

  useEffect(() => {
    const upd = () => setVoices(getTTSVoices());
    try { window.speechSynthesis?.addEventListener?.('voiceschanged', upd); } catch {}
    upd();
    listClipKeys().then(setClips);
    return () => { try { window.speechSynthesis?.removeEventListener?.('voiceschanged', upd); } catch {} };
  }, []);

  const setSetting = (patch) => {
    setSave((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
    if ('sfxVol' in patch) audio.setSfxVol(patch.sfxVol);
    if ('voiceVol' in patch) audio.setVoiceVol(patch.voiceVol);
    if ('voiceOn' in patch) audio.setVoiceOn(patch.voiceOn);
  };

  const v = resolveVoice(pilotId);
  const pilot = PILOTS[pilotId];
  const owned = save.ownedPilots.includes(pilotId) || pilot.hidden;

  async function onFile(e) {
    const f = e.target.files?.[0]; e.target.value = '';
    const cue = uploadCue.current; if (!f || !cue) return;
    if (f.size > 8 * 1024 * 1024) { toast('Clip too big — keep it under 8 MB.'); return; }
    const k = `${pilotId}:${cue}`;
    try { await saveClip(k, f); invalidateClip(k); setVoiceSetting(pilotId, cue, { mode: 'clip' }); setClips(await listClipKeys()); sfx('select'); toast('Clip saved to this line.'); refresh(); }
    catch { toast('Could not store the clip in this browser.'); }
  }

  async function toggleRecord(cue) {
    if (rec) {
      const blob = await rec.handle.stop();
      const k = `${pilotId}:${rec.cue}`;
      setRec(null);
      try { await saveClip(k, blob); invalidateClip(k); setVoiceSetting(pilotId, rec.cue, { mode: 'clip' }); setClips(await listClipKeys()); toast('Recording saved!'); refresh(); }
      catch { toast('Could not store the recording.'); }
      return;
    }
    try { const handle = await startRecording(); setRec({ cue, handle }); sfx('beep'); }
    catch { toast('Microphone is blocked in this view. Use Upload (record with your phone\'s voice recorder app), or open the downloaded .html version.'); }
  }

  async function preview(cue) {
    audio.unlock();
    const line = resolveLine(pilotId, cue);
    if (line.mode === 'clip') {
      const blob = await loadClip(`${pilotId}:${cue}`);
      if (blob) { await playClipBlob(blob, line.fx); return; }
      toast('No clip yet — falling back to text-to-speech.');
    }
    playVoice(pilotId, cue, { force: true });
  }

  async function removeClip(cue) {
    const k = `${pilotId}:${cue}`;
    await deleteClip(k); invalidateClip(k); setVoiceSetting(pilotId, cue, { mode: 'tts' }); setClips(await listClipKeys()); sfx('cancel'); refresh();
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={Music} sub="Give every pilot their own in-game voice. Use text-to-speech, or upload/record your own clips with mecha voice effects. Lines play during battles.">Sound Studio — Voice-Overs</SectionTitle>
      <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={onFile} />

      <Panel className="p-3 grid gap-3 md:grid-cols-4">
        <label className="text-xs text-slate-300 space-y-1"><div className="flex items-center gap-1"><Volume2 size={13} /> SFX volume</div>
          <input type="range" min="0" max="1" step="0.05" value={settings.sfxVol} onChange={(e) => setSetting({ sfxVol: +e.target.value })} className="w-full accent-cyan-400" /></label>
        <label className="text-xs text-slate-300 space-y-1"><div className="flex items-center gap-1"><Mic size={13} /> Voice volume</div>
          <input type="range" min="0" max="1" step="0.05" value={settings.voiceVol} onChange={(e) => setSetting({ voiceVol: +e.target.value })} className="w-full accent-amber-400" /></label>
        <label className="flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={settings.voiceOn} onChange={(e) => setSetting({ voiceOn: e.target.checked })} className="w-4 h-4 accent-amber-400" /> Voice-overs in battle</label>
        <div className="flex gap-2 justify-end">
          <Btn small variant="rose" onClick={async () => { resetVoiceSettings(); await clearClips(); setClips([]); refresh(); toast('All voice lines reset to default.'); }}><RotateCcw size={12} /> Reset all voices</Btn>
        </div>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-[240px_1fr]">
        <Panel className="p-2 space-y-1 self-start">
          {VOICE_PILOTS.map((id) => {
            const p = PILOTS[id];
            const has = save.ownedPilots.includes(id) || p.hidden;
            const n = clips.filter((k) => k.startsWith(id + ':')).length;
            return (
              <button key={id} onClick={() => { sfx('beep'); setPilotId(id); }} className={`w-full flex items-center gap-2 rounded-lg p-1.5 text-left border ${pilotId === id ? 'border-amber-300 bg-amber-500/15' : 'border-transparent hover:bg-slate-800'}`}>
                <PilotPortrait pilot={p} size={34} />
                <div className="min-w-0">
                  <div className="text-sm text-slate-100 truncate">{p.name}</div>
                  <div className="text-[10px] text-slate-400">{has ? (p.hidden ? 'NPC voice' : 'In your roster') : 'Not recruited yet'}{n ? ` · ${n} clip${n > 1 ? 's' : ''}` : ''}</div>
                </div>
              </button>
            );
          })}
        </Panel>

        <div className="space-y-3">
          <Panel amber className="p-3 grid gap-3 md:grid-cols-[auto_1fr_1fr_1fr] items-center">
            <PilotPortrait pilot={pilot} size={64} />
            <label className="text-xs text-slate-300">TTS voice
              <select value={v.voiceURI} onChange={(e) => { setPilotVoice(pilotId, { voiceURI: e.target.value }); refresh(); }} className="w-full mt-0.5 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs">
                <option value="">Auto (Filipino if available)</option>
                {voices.map((vv) => <option key={vv.voiceURI} value={vv.voiceURI}>{vv.name} ({vv.lang})</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-300">Pitch {v.pitch.toFixed(2)}
              <input type="range" min="0.1" max="2" step="0.05" value={v.pitch} onChange={(e) => { setPilotVoice(pilotId, { pitch: +e.target.value }); refresh(); }} className="w-full accent-amber-400" />
            </label>
            <label className="text-xs text-slate-300">Speed {v.rate.toFixed(2)}
              <input type="range" min="0.5" max="1.8" step="0.05" value={v.rate} onChange={(e) => { setPilotVoice(pilotId, { rate: +e.target.value }); refresh(); }} className="w-full accent-amber-400" />
            </label>
            <div className="md:col-span-4 text-[11px] text-slate-300 italic">{pilot.story}</div>
            {!owned && <div className="md:col-span-4 text-[11px] text-amber-200">You haven't recruited {pilot.name} yet — you can still prepare their voice now.</div>}
            {window.AndroidApp ? <div className="md:col-span-4 text-[11px] text-slate-400">Voices come from your phone's text-to-speech engine. For Tagalog lines, install Filipino in your phone's Settings → Text-to-speech.</div>
              : !voices.length && <div className="md:col-span-4 text-[11px] text-slate-400">Your browser hasn't loaded text-to-speech voices yet. Press Play once, or use uploaded clips.</div>}
          </Panel>

          <Panel className="p-2 sm:p-3">
            <div className="space-y-2">
              {VOICE_CUES.map((c) => {
                const line = resolveLine(pilotId, c.id);
                const hasClip = clips.includes(`${pilotId}:${c.id}`);
                const isRec = rec?.cue === c.id;
                return (
                  <div key={c.id} className="rounded-lg bg-slate-900 border border-slate-700 p-2 grid gap-2 md:grid-cols-[110px_1fr_auto] items-center">
                    <div>
                      <div className="text-xs font-bold text-cyan-200">{c.name}</div>
                      <div className="text-[10px] text-slate-500">{hasClip ? '● clip saved' : 'no clip'}</div>
                    </div>
                    <div className="grid gap-1.5 sm:grid-cols-[1fr_120px_130px]">
                      <input value={line.text} onChange={(e) => { setVoiceSetting(pilotId, c.id, { text: e.target.value }); refresh(); }} className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm" placeholder={VOICE_LINES[pilotId]?.[c.id]} />
                      <select value={line.mode} onChange={(e) => { setVoiceSetting(pilotId, c.id, { mode: e.target.value }); refresh(); }} className="bg-slate-800 border border-slate-600 rounded px-1 py-1 text-xs">
                        <option value="tts">Text-to-speech</option><option value="clip">My clip</option><option value="off">Silent</option>
                      </select>
                      <select value={line.fx} onChange={(e) => { setVoiceSetting(pilotId, c.id, { fx: e.target.value }); refresh(); }} className="bg-slate-800 border border-slate-600 rounded px-1 py-1 text-xs">
                        {FX.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-1 justify-end">
                      <Btn small variant="cyan" onClick={() => preview(c.id)} title="Play"><Play size={13} /></Btn>
                      <Btn small variant={isRec ? 'rose' : 'slate'} onClick={() => toggleRecord(c.id)} disabled={!!rec && !isRec} title={isRec ? 'Stop & save' : 'Record'}>{isRec ? <><Square size={13} /> Stop</> : <Mic size={13} />}</Btn>
                      <Btn small variant="slate" onClick={() => { uploadCue.current = c.id; fileRef.current?.click(); }} title="Upload audio"><Upload size={13} /></Btn>
                      {hasClip && <Btn small variant="rose" onClick={() => removeClip(c.id)} title="Delete clip"><Trash2 size={13} /></Btn>}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Tip: FX like Robot and Radio apply to your own clips. With text-to-speech, Radio/Cockpit add a comms squelch before the line. Clips stay in this browser on this device.</p>
          </Panel>

          <Panel className="p-3">
            <div className="text-xs tracking-widest text-cyan-300 mb-2 flex items-center gap-1"><Radio size={13} /> SFX TEST PAD</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5">
              {SFX_PAD.map(([k, n]) => <Btn key={k} small variant="slate" onClick={() => { audio.unlock(); sfx(k); }}>{n}</Btn>)}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
