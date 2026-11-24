import React, { useEffect, useState, useCallback } from 'react';
import { Map as MapIcon, Warehouse, GitBranch, Sparkles, Hammer, Music, Palette, QrCode, Coins, FileText, Gem, Volume2, VolumeX, RotateCcw, Play } from 'lucide-react';
import { GAME_TITLE, APP_VERSION, ICON_IMG, KEYART_IMG } from './data.js';
import { loadSave, writeSave, clearSave, defaultSave, isStorageOK } from './game.js';
import { audio, sfx, clearClips, resetVoiceSettings } from './audio.js';
import { createBattle } from './combat.js';
import { Btn, Modal } from './ui.jsx';
import Battle from './Battle.jsx';
import Sortie from './screens/Sortie.jsx';
import Hangar from './screens/Hangar.jsx';
import Develop from './screens/Develop.jsx';
import Recruit from './screens/Recruit.jsx';
import Workshop from './screens/Workshop.jsx';
import SoundStudio from './screens/SoundStudio.jsx';
import ArtCues from './screens/ArtCues.jsx';
import Share from './screens/Share.jsx';

const TABS = [
  { id: 'sortie', name: 'Sortie', icon: MapIcon },
  { id: 'hangar', name: 'Hangar', icon: Warehouse },
  { id: 'develop', name: 'Develop', icon: GitBranch },
  { id: 'recruit', name: 'Recruit', icon: Sparkles },
  { id: 'workshop', name: 'Workshop', icon: Hammer },
  { id: 'sound', name: 'Sound Studio', icon: Music },
  { id: 'art', name: 'Art Cues', icon: Palette },
  { id: 'share', name: 'Share', icon: QrCode },
];

function TitleScreen({ onStart }) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-950 flex flex-col items-center justify-end p-6 pb-14 text-center cursor-pointer overflow-hidden" onClick={onStart}>
      <img src={KEYART_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
      <div className="relative flex flex-col items-center">
        <img src={ICON_IMG} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-[0_0_24px_rgba(34,211,238,.6)] mb-3" />
        <div className="text-[11px] tracking-[0.5em] text-amber-300 drop-shadow">GAWANG PINOY TACTICAL MECHA RPG</div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-cyan-100 to-cyan-400 drop-shadow-[0_2px_8px_rgba(0,0,0,.9)]">MECHA BAYANIHAN</h1>
        <div className="text-2xl sm:text-3xl font-black tracking-[0.4em] text-amber-300 drop-shadow-[0_2px_6px_rgba(0,0,0,.9)]">TACTICS</div>
        <button className="mt-6 px-8 py-3 rounded-xl bg-slate-950/60 border-2 border-amber-300 text-amber-100 font-black tracking-widest flex items-center gap-2 animate-pulse"><Play size={18} /> TAP TO START</button>
      </div>
      <div className="absolute bottom-3 text-xs text-slate-400">{APP_VERSION}</div>
    </div>
  );
}

// In the Android app, saved files (QR card, mecha cards) go to the phone's Downloads folder.
const MIME = { png: 'image/png', html: 'text/html', txt: 'text/plain', json: 'application/json' };
function androidSaver() {
  const A = window.AndroidApp;
  if (!A || !A.saveFile) return null;
  return {
    async save({ filename, data }) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
      const ext = filename.split('.').pop().toLowerCase();
      if (!A.saveFile(filename, b64, MIME[ext] || 'application/octet-stream')) throw { code: 'unavailable' };
      return { status: 'saved' };
    },
  };
}

export default function App() {
  const [save, setSaveState] = useState(loadSave);
  const [tab, setTab] = useState('sortie');
  const [battle, setBattle] = useState(null);
  const [autoStart, setAutoStart] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [started, setStarted] = useState(false);
  const [downloads, setDownloads] = useState(androidSaver);

  const setSave = useCallback((fn) => setSaveState((s) => (typeof fn === 'function' ? fn(s) : fn)), []);
  useEffect(() => { writeSave(save); }, [save]);
  useEffect(() => {
    audio.setMuted(save.settings.muted); audio.setSfxVol(save.settings.sfxVol); audio.setVoiceVol(save.settings.voiceVol); audio.setVoiceOn(save.settings.voiceOn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    let live = true;
    try { if (window.claude && typeof window.claude.use === 'function') window.claude.use('downloads').then((d) => live && setDownloads(d || null)).catch(() => {}); } catch {}
    return () => { live = false; };
  }, []);

  const toast = useCallback((m) => { setToastMsg({ m, id: Date.now() }); }, []);

  // Android back button: battle → retreat prompt, other tabs → Sortie, Sortie → press twice to exit
  const lastBack = React.useRef(0);
  useEffect(() => {
    window.androidBack = () => {
      if (battle) { window.dispatchEvent(new Event('mbt-back')); return; }
      if (confirmReset) { setConfirmReset(false); return; }
      if (started && tab !== 'sortie') { setTab('sortie'); return; }
      if (Date.now() - lastBack.current < 2000) { try { window.AndroidApp && window.AndroidApp.exit(); } catch {} return; }
      lastBack.current = Date.now(); toast('Press back again to exit');
    };
    return () => { delete window.androidBack; };
  }, [battle, tab, started, confirmReset, toast]);
  useEffect(() => { if (!toastMsg) return; const t = setTimeout(() => setToastMsg(null), 2600); return () => clearTimeout(t); }, [toastMsg]);

  function toggleMute() {
    const m = !save.settings.muted; audio.setMuted(m);
    setSave((s) => ({ ...s, settings: { ...s.settings, muted: m } }));
    if (!m) sfx('select');
  }

  function startSortie(stage) {
    audio.unlock(); sfx('powerup');
    const initial = createBattle(stage, save.squad, save);
    setBattle({ stage, initial, key: Date.now() });
    setSave((s) => ({ ...s, stats: { ...s.stats, sorties: (s.stats.sorties || 0) + 1 } }));
  }

  function handleResult(stage, result, b) {
    const kills = b.units.filter((u) => u.team === 'enemy' && u.hp <= 0).length;
    if (result === 'VICTORY') {
      const first = !save.cleared.includes(stage.id);
      const r = { capital: stage.reward.capital + (first ? stage.firstClear.capital : 0), bp: stage.reward.bp + (first ? stage.firstClear.bp : 0), diamonds: stage.reward.diamonds + (first ? stage.firstClear.diamonds : 0), firstClear: first };
      setSave((s) => ({ ...s, capital: s.capital + r.capital, blueprints: s.blueprints + r.bp, diamonds: s.diamonds + r.diamonds, cleared: s.cleared.includes(stage.id) ? s.cleared : [...s.cleared, stage.id], stats: { ...s.stats, kills: (s.stats.kills || 0) + kills } }));
      return r;
    }
    const cons = 200 * kills + 100;
    setSave((s) => ({ ...s, capital: s.capital + cons, stats: { ...s.stats, kills: (s.stats.kills || 0) + kills } }));
    return { capital: cons, bp: 0, diamonds: 0 };
  }

  async function resetAll() {
    clearSave(); resetVoiceSettings(); await clearClips();
    setSaveState(defaultSave()); setConfirmReset(false); setBattle(null); setTab('sortie');
    sfx('cancel'); toast('All data reset. Fresh start, Kapitan!');
  }

  const Res = ({ icon: Icon, v, color, label }) => (
    <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-700 rounded-lg px-2 py-1" title={label}>
      <Icon size={14} className={color} /><span className="text-sm font-bold tabular-nums text-slate-100">{v.toLocaleString()}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200" onPointerDown={() => audio.unlock()}>
      {!started && <TitleScreen onStart={() => { audio.unlock(); sfx('powerup'); setStarted(true); }} />}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur border-b border-cyan-500/30 shadow-[0_2px_20px_-8px_rgba(34,211,238,.6)]">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-2 flex items-center gap-2 flex-wrap">
          <img src={ICON_IMG} alt="" className="w-9 h-9 rounded-lg" />
          <div className="mr-auto leading-tight">
            <div className="font-black tracking-wider text-cyan-200 text-sm sm:text-base">MECHA BAYANIHAN <span className="text-amber-300">TACTICS</span></div>
            <div className="text-[9px] text-slate-500 tracking-widest">{APP_VERSION} · COMMAND HUD</div>
          </div>
          <Res icon={Coins} v={save.capital} color="text-amber-300" label="Capital" />
          <Res icon={FileText} v={save.blueprints} color="text-cyan-300" label="Blueprints" />
          <Res icon={Gem} v={save.diamonds} color="text-fuchsia-300" label="Diamonds" />
          <button onClick={toggleMute} className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:border-cyan-400" title={save.settings.muted ? 'Unmute' : 'Mute'} aria-label="Toggle sound">
            {save.settings.muted ? <VolumeX size={16} className="text-rose-300" /> : <Volume2 size={16} className="text-cyan-300" />}
          </button>
          {!battle && <button onClick={() => setConfirmReset(true)} className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:border-rose-400" title="Reset Data" aria-label="Reset data"><RotateCcw size={16} className="text-slate-400" /></button>}
        </div>
        {!battle && (
          <nav className="max-w-6xl mx-auto px-2 sm:px-4 flex gap-1 overflow-x-auto no-scrollbar pb-1.5">
            {TABS.map((t) => (
              <button key={t.id} onClick={() => { sfx('beep'); setTab(t.id); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap border transition ${tab === t.id ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 shadow-[0_0_12px_-3px_rgba(34,211,238,.8)]' : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
                <t.icon size={15} className={tab === t.id ? 'text-amber-300' : ''} />{t.name}
              </button>
            ))}
          </nav>
        )}
      </header>

      {battle ? (
        <Battle key={battle.key} stage={battle.stage} initial={battle.initial} initialAuto={autoStart}
          cutins={save.settings.cutins} onCutins={(v) => setSave((s) => ({ ...s, settings: { ...s.settings, cutins: v } }))}
          view={save.settings.view} onView={(v) => setSave((s) => ({ ...s, settings: { ...s.settings, view: v } }))}
          onResult={(result, b) => handleResult(battle.stage, result, b)} onExit={() => { setBattle(null); setTab('sortie'); }} />
      ) : (
        <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4 scan-bg min-h-[calc(100vh-110px)]">
          {!isStorageOK() && <div className="mb-3 text-xs text-amber-200 bg-amber-900/30 border border-amber-600/40 rounded p-2">Saving is unavailable in this browser view — progress lasts until you close the page.</div>}
          {tab === 'sortie' && <Sortie save={save} onSortie={startSortie} auto={autoStart} setAuto={setAutoStart} goHangar={() => setTab('hangar')} />}
          {tab === 'hangar' && <Hangar save={save} setSave={setSave} />}
          {tab === 'develop' && <Develop save={save} setSave={setSave} toast={toast} />}
          {tab === 'recruit' && <Recruit save={save} setSave={setSave} toast={toast} />}
          {tab === 'workshop' && <Workshop save={save} setSave={setSave} toast={toast} downloads={downloads} />}
          {tab === 'sound' && <SoundStudio save={save} setSave={setSave} toast={toast} />}
          {tab === 'art' && <ArtCues save={save} toast={toast} />}
          {tab === 'share' && <Share toast={toast} downloads={downloads} />}
          <footer className="text-center text-[10px] text-slate-600 mt-8">{GAME_TITLE} {APP_VERSION} · original characters & mecha · progress saved on this device</footer>
        </main>
      )}

      {toastMsg && (
        <div key={toastMsg.id} className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-slate-900 border border-amber-400/60 text-amber-100 text-sm px-4 py-2 rounded-xl shadow-lg max-w-[92vw] text-center">{toastMsg.m}</div>
      )}
      {confirmReset && (
        <Modal onClose={() => setConfirmReset(false)}>
          <div className="p-5 space-y-3 text-center">
            <RotateCcw className="mx-auto text-rose-300" />
            <div className="font-bold text-lg">Reset all data?</div>
            <p className="text-sm text-slate-400">This erases Capital, Blueprints, Diamonds, unlocked mecha & pilots, custom mecha, cleared stages and saved voice clips on this device.</p>
            <div className="flex gap-2 justify-center"><Btn variant="rose" onClick={resetAll}>Yes, reset everything</Btn><Btn variant="slate" onClick={() => setConfirmReset(false)}>Cancel</Btn></div>
          </div>
        </Modal>
      )}
    </div>
  );
}
