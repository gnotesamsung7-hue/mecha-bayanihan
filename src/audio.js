// ============================================================
// Web Audio SFX synth + Voice-over engine (TTS lines or custom clips with FX)
// ============================================================
import { VOICE_LINES, VOICE_DEFAULTS } from './data.js';

let ctx = null;
let master = null, sfxBus = null, voiceBus = null;
const state = { muted: false, sfxVol: 0.7, voiceVol: 0.9, voiceOn: true };

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.connect(master);
      voiceBus = ctx.createGain(); voiceBus.connect(master);
      applyVolumes();
    } catch { ctx = null; return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function applyVolumes() {
  if (!ctx) return;
  master.gain.value = state.muted ? 0 : 1;
  sfxBus.gain.value = state.sfxVol;
  voiceBus.gain.value = state.voiceVol;
}

export const audio = {
  unlock() { ensure(); },
  setMuted(m) { state.muted = m; applyVolumes(); if (m) { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch {} try { window.AndroidApp && window.AndroidApp.stopSpeak(); } catch {} } },
  setSfxVol(v) { state.sfxVol = v; applyVolumes(); },
  setVoiceVol(v) { state.voiceVol = v; applyVolumes(); },
  setVoiceOn(v) { state.voiceOn = v; },
  get state() { return { ...state }; },
};

function noiseBuffer(c, dur) {
  const len = Math.floor(c.sampleRate * dur);
  const b = c.createBuffer(1, len, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function tone(c, { type = 'sine', f0 = 440, f1 = null, dur = 0.15, vol = 0.3, delay = 0, attack = 0.005 }) {
  const t = c.currentTime + delay;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfxBus);
  o.start(t); o.stop(t + dur + 0.05);
}

function noise(c, { dur = 0.4, vol = 0.4, freq = 1200, f1 = 120, type = 'lowpass', delay = 0, q = 0.8 }) {
  const t = c.currentTime + delay;
  const src = c.createBufferSource(); src.buffer = noiseBuffer(c, dur);
  const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(sfxBus);
  src.start(t); src.stop(t + dur + 0.05);
}

export function sfx(name) {
  if (state.muted) return;
  const c = ensure(); if (!c) return;
  try {
    switch (name) {
      case 'beep': tone(c, { type: 'square', f0: 880, dur: 0.06, vol: 0.12 }); break;
      case 'select': tone(c, { type: 'square', f0: 660, dur: 0.05, vol: 0.12 }); tone(c, { type: 'square', f0: 990, dur: 0.07, vol: 0.12, delay: 0.05 }); break;
      case 'cancel': tone(c, { type: 'square', f0: 520, f1: 260, dur: 0.12, vol: 0.1 }); break;
      case 'move': tone(c, { type: 'triangle', f0: 220, f1: 520, dur: 0.18, vol: 0.18 }); noise(c, { dur: 0.2, vol: 0.06, freq: 3000, f1: 800, type: 'bandpass' }); break;
      case 'beam': tone(c, { type: 'sawtooth', f0: 1800, f1: 180, dur: 0.35, vol: 0.18 }); tone(c, { type: 'sine', f0: 2600, f1: 900, dur: 0.25, vol: 0.12 }); noise(c, { dur: 0.3, vol: 0.08, freq: 6000, f1: 1500, type: 'highpass' }); break;
      case 'shot': for (let i = 0; i < 4; i++) { noise(c, { dur: 0.06, vol: 0.25, freq: 2500, f1: 400, delay: i * 0.07 }); tone(c, { type: 'square', f0: 300, f1: 90, dur: 0.05, vol: 0.12, delay: i * 0.07 }); } break;
      case 'missile': noise(c, { dur: 0.5, vol: 0.18, freq: 800, f1: 3000, type: 'bandpass', q: 2 }); tone(c, { type: 'sawtooth', f0: 200, f1: 900, dur: 0.45, vol: 0.08 }); break;
      case 'slash': noise(c, { dur: 0.18, vol: 0.3, freq: 7000, f1: 1200, type: 'bandpass', q: 1.5 }); tone(c, { type: 'triangle', f0: 1400, f1: 300, dur: 0.15, vol: 0.12 }); break;
      case 'mega': tone(c, { type: 'sawtooth', f0: 120, f1: 1200, dur: 0.4, vol: 0.15 }); tone(c, { type: 'sawtooth', f0: 1600, f1: 100, dur: 0.7, vol: 0.2, delay: 0.35 }); noise(c, { dur: 0.8, vol: 0.2, freq: 5000, f1: 200, delay: 0.35 }); break;
      case 'rainbow': [523, 659, 784, 1047, 1319].forEach((f, i) => tone(c, { type: 'triangle', f0: f, dur: 0.2, vol: 0.12, delay: i * 0.05 })); tone(c, { type: 'sawtooth', f0: 2000, f1: 150, dur: 0.6, vol: 0.18, delay: 0.25 }); break;
      case 'hit': noise(c, { dur: 0.2, vol: 0.35, freq: 1800, f1: 200 }); tone(c, { type: 'square', f0: 160, f1: 60, dur: 0.15, vol: 0.18 }); break;
      case 'crit': noise(c, { dur: 0.3, vol: 0.45, freq: 4000, f1: 150 }); tone(c, { type: 'square', f0: 1200, f1: 2400, dur: 0.12, vol: 0.12 }); tone(c, { type: 'square', f0: 180, f1: 40, dur: 0.25, vol: 0.2 }); break;
      case 'miss': tone(c, { type: 'sine', f0: 900, f1: 1400, dur: 0.12, vol: 0.08 }); noise(c, { dur: 0.15, vol: 0.06, freq: 5000, f1: 9000, type: 'highpass' }); break;
      case 'explosion': noise(c, { dur: 1.1, vol: 0.6, freq: 900, f1: 40 }); tone(c, { type: 'sine', f0: 110, f1: 30, dur: 0.9, vol: 0.4 }); noise(c, { dur: 0.4, vol: 0.25, freq: 4000, f1: 300, delay: 0.1 }); break;
      case 'shieldUp': tone(c, { type: 'triangle', f0: 400, f1: 1200, dur: 0.2, vol: 0.15 }); tone(c, { type: 'sine', f0: 1200, dur: 0.25, vol: 0.08, delay: 0.15 }); break;
      case 'powerup': [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(c, { type: 'square', f0: f, dur: 0.1, vol: 0.09, delay: i * 0.06 })); break;
      case 'chain': [784, 988, 1175, 1568].forEach((f, i) => tone(c, { type: 'square', f0: f, dur: 0.12, vol: 0.1, delay: i * 0.07 })); tone(c, { type: 'sawtooth', f0: 200, f1: 1600, dur: 0.35, vol: 0.08 }); break;
      case 'heal': [523, 784, 1047].forEach((f, i) => tone(c, { type: 'sine', f0: f, dur: 0.25, vol: 0.1, delay: i * 0.08 })); break;
      case 'phase': tone(c, { type: 'square', f0: 330, dur: 0.12, vol: 0.12 }); tone(c, { type: 'square', f0: 247, dur: 0.2, vol: 0.12, delay: 0.13 }); break;
      case 'victory': [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(c, { type: 'square', f0: f, dur: i === 6 ? 0.5 : 0.14, vol: 0.12, delay: i * 0.13 })); break;
      case 'defeat': [392, 349, 311, 262].forEach((f, i) => tone(c, { type: 'triangle', f0: f, dur: 0.35, vol: 0.15, delay: i * 0.3 })); break;
      case 'gacha': for (let i = 0; i < 10; i++) tone(c, { type: 'triangle', f0: 600 + i * 120, dur: 0.06, vol: 0.08, delay: i * 0.04 }); break;
      case 'reveal': tone(c, { type: 'triangle', f0: 880, f1: 1320, dur: 0.15, vol: 0.12 }); break;
      case 'ssr': [523, 659, 784, 1047, 1319, 1568, 2093].forEach((f, i) => tone(c, { type: 'sine', f0: f, dur: 0.4, vol: 0.1, delay: i * 0.07 })); noise(c, { dur: 1.0, vol: 0.08, freq: 8000, f1: 4000, type: 'highpass' }); break;
      case 'build': for (let i = 0; i < 3; i++) { noise(c, { dur: 0.08, vol: 0.25, freq: 3000, f1: 600, delay: i * 0.12 }); tone(c, { type: 'square', f0: 200 + i * 100, dur: 0.06, vol: 0.12, delay: i * 0.12 }); } tone(c, { type: 'square', f0: 880, dur: 0.25, vol: 0.12, delay: 0.4 }); break;
      case 'error': tone(c, { type: 'square', f0: 180, dur: 0.18, vol: 0.14 }); tone(c, { type: 'square', f0: 140, dur: 0.22, vol: 0.14, delay: 0.16 }); break;
      case 'radio': noise(c, { dur: 0.12, vol: 0.12, freq: 2000, f1: 1800, type: 'bandpass', q: 3 }); tone(c, { type: 'sine', f0: 1500, dur: 0.06, vol: 0.06, delay: 0.1 }); break;
      default: tone(c, { f0: 440, dur: 0.05, vol: 0.1 });
    }
  } catch { /* ignore audio errors */ }
}

// ---------------- IndexedDB clip storage ----------------
const DB_NAME = 'mechaBayanihanVO';
function openDB() {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('clips');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (e) { reject(e); }
  });
}
export async function saveClip(key, blob) {
  const db = await openDB();
  return new Promise((res, rej) => { const tx = db.transaction('clips', 'readwrite'); tx.objectStore('clips').put(blob, key); tx.oncomplete = () => res(true); tx.onerror = () => rej(tx.error); });
}
export async function loadClip(key) {
  try {
    const db = await openDB();
    return await new Promise((res) => { const tx = db.transaction('clips', 'readonly'); const r = tx.objectStore('clips').get(key); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); });
  } catch { return null; }
}
export async function deleteClip(key) {
  try { const db = await openDB(); return await new Promise((res) => { const tx = db.transaction('clips', 'readwrite'); tx.objectStore('clips').delete(key); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }); } catch { return false; }
}
export async function listClipKeys() {
  try { const db = await openDB(); return await new Promise((res) => { const tx = db.transaction('clips', 'readonly'); const r = tx.objectStore('clips').getAllKeys(); r.onsuccess = () => res(r.result || []); r.onerror = () => res([]); }); } catch { return []; }
}
export async function clearClips() {
  try { const db = await openDB(); return await new Promise((res) => { const tx = db.transaction('clips', 'readwrite'); tx.objectStore('clips').clear(); tx.oncomplete = () => res(true); tx.onerror = () => res(false); }); } catch { return false; }
}

// ---------------- Voice settings ----------------
const VO_KEY = 'mechaBayanihan_vo_v1';
let voSettings = {};
try { voSettings = JSON.parse(localStorage.getItem(VO_KEY) || '{}') || {}; } catch { voSettings = {}; }
export function getVoiceSettings() { return voSettings; }
export function setVoiceSetting(pilotId, cue, patch) {
  voSettings = { ...voSettings, [pilotId]: { ...(voSettings[pilotId] || {}), [cue]: { ...((voSettings[pilotId] || {})[cue] || {}), ...patch } } };
  try { localStorage.setItem(VO_KEY, JSON.stringify(voSettings)); } catch {}
  return voSettings;
}
export function setPilotVoice(pilotId, patch) {
  voSettings = { ...voSettings, [pilotId]: { ...(voSettings[pilotId] || {}), _voice: { ...((voSettings[pilotId] || {})._voice || {}), ...patch } } };
  try { localStorage.setItem(VO_KEY, JSON.stringify(voSettings)); } catch {}
  return voSettings;
}
export function resetVoiceSettings() { voSettings = {}; try { localStorage.removeItem(VO_KEY); } catch {} }

export function resolveLine(pilotId, cue) {
  const s = (voSettings[pilotId] || {})[cue] || {};
  const base = (VOICE_LINES[pilotId] || VOICE_LINES.kadete)[cue] || '';
  return {
    text: s.text ?? base,
    mode: s.mode || 'tts',
    fx: s.fx || 'none',
  };
}
export function resolveVoice(pilotId) {
  const d = VOICE_DEFAULTS[pilotId] || { pitch: 1, rate: 1 };
  const v = (voSettings[pilotId] || {})._voice || {};
  return { pitch: v.pitch ?? d.pitch, rate: v.rate ?? d.rate, voiceURI: v.voiceURI || '' };
}

export function getTTSVoices() {
  try { return window.speechSynthesis ? window.speechSynthesis.getVoices() : []; } catch { return []; }
}

function pickVoice(uri) {
  const voices = getTTSVoices();
  if (uri) { const v = voices.find((x) => x.voiceURI === uri); if (v) return v; }
  return voices.find((v) => /fil|tl[-_]PH/i.test(v.lang)) || voices.find((v) => /en[-_]PH/i.test(v.lang)) || null;
}

// ---- FX graph for clips ----
function buildFx(c, fx, input) {
  let node = input;
  const out = c.createGain();
  if (fx === 'radio') {
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    const ws = c.createWaveShaper(); const curve = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3); } ws.curve = curve;
    node.connect(hp); hp.connect(lp); lp.connect(ws); ws.connect(out);
  } else if (fx === 'robot') {
    const ring = c.createGain(); ring.gain.value = 0;
    const osc = c.createOscillator(); osc.frequency.value = 55; osc.type = 'square';
    const og = c.createGain(); og.gain.value = 1; osc.connect(og); og.connect(ring.gain); osc.start();
    const dry = c.createGain(); dry.gain.value = 0.35;
    node.connect(ring); ring.connect(out); node.connect(dry); dry.connect(out);
    out._osc = osc;
  } else if (fx === 'cockpit') {
    const conv = c.createConvolver();
    const len = Math.floor(c.sampleRate * 0.7); const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    conv.buffer = ir; const wet = c.createGain(); wet.gain.value = 0.55; const dry = c.createGain(); dry.gain.value = 0.8;
    node.connect(conv); conv.connect(wet); wet.connect(out); node.connect(dry); dry.connect(out);
  } else {
    node.connect(out);
  }
  out.connect(voiceBus);
  return out;
}

const RATE_FX = { deep: 0.78, chipmunk: 1.4 };
let currentSrc = null;
const bufferCache = new Map();

export async function playClipBlob(blob, fx = 'none') {
  const c = ensure(); if (!c || !blob) return false;
  try {
    const ab = await blob.arrayBuffer();
    const buf = await c.decodeAudioData(ab.slice(0));
    return playBuffer(buf, fx);
  } catch { return false; }
}

function playBuffer(buf, fx) {
  const c = ensure(); if (!c) return false;
  try { if (currentSrc) currentSrc.stop(); } catch {}
  const src = c.createBufferSource(); src.buffer = buf;
  if (RATE_FX[fx]) src.playbackRate.value = RATE_FX[fx];
  const out = buildFx(c, RATE_FX[fx] ? 'none' : fx, src);
  src.onended = () => { try { out._osc && out._osc.stop(); } catch {} };
  src.start(); currentSrc = src;
  return true;
}

export function speakText(text, { pitch = 1, rate = 1, voiceURI = '' } = {}) {
  if (state.muted || !text) return false;
  // Android app: speak with the phone's own text-to-speech engine
  if (window.AndroidApp && window.AndroidApp.speakEx) {
    try { return window.AndroidApp.speakEx(text, Math.max(0.1, Math.min(2, pitch)), Math.max(0.5, Math.min(2, rate))); } catch { /* fall through */ }
  }
  try {
    const synth = window.speechSynthesis; if (!synth) return false;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice(voiceURI); if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'fil-PH';
    u.pitch = Math.max(0, Math.min(2, pitch)); u.rate = Math.max(0.5, Math.min(2, rate)); u.volume = state.voiceVol;
    synth.speak(u);
    return true;
  } catch { return false; }
}

let lastVoiceAt = 0;
export async function playVoice(pilotId, cue, { force = false } = {}) {
  if (state.muted || (!state.voiceOn && !force)) return;
  const now = Date.now();
  if (!force && now - lastVoiceAt < 700) return; // avoid overlap spam
  lastVoiceAt = now;
  const line = resolveLine(pilotId, cue);
  if (line.mode === 'off') return;
  if (line.mode === 'clip') {
    const key = `${pilotId}:${cue}`;
    let buf = bufferCache.get(key);
    if (!buf) {
      const blob = await loadClip(key);
      if (blob) {
        try { const c = ensure(); buf = await c.decodeAudioData((await blob.arrayBuffer()).slice(0)); bufferCache.set(key, buf); } catch { buf = null; }
      }
    }
    if (buf) { playBuffer(buf, line.fx); return; }
  }
  if (line.fx === 'radio' || line.fx === 'cockpit') sfx('radio');
  speakText(line.text, resolveVoice(pilotId));
}
export function invalidateClip(key) { bufferCache.delete(key); }

// ---------------- Recording (works where mic permission is allowed) ----------------
export async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Recording is not supported in this browser.');
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise((resolve) => { rec.onstop = () => { stream.getTracks().forEach((t) => t.stop()); resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })); }; });
  rec.start();
  return { stop: () => { try { rec.stop(); } catch {} return done; } };
}
