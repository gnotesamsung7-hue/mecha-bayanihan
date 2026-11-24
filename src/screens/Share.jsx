import React, { useEffect, useState } from 'react';
import { QrCode, Copy, Download, ExternalLink, Printer, Smartphone } from 'lucide-react';
import QRCode from 'qrcode';
import { GAME_TITLE, APP_VERSION, MECHA } from '../data.js';
import { MechaSprite } from '../Sprite.jsx';
import { Panel, SectionTitle, Btn, copyText } from '../ui.jsx';
import { sfx } from '../audio.js';

// Baked in after publishing. Falls back to the current page address.
export const GAME_URL = 'https://claude.ai/artifact/MggDoMbR5FdtVKUakxFden';

// Latest signed APK, published by GitHub Actions on every build.
export const APK_URL = 'https://github.com/gnotesamsung7-hue/mecha-bayanihan/releases/latest/download/MechaBayanihan.apk';

export function gameLink() {
  if (GAME_URL) return GAME_URL;
  try { return window.location.href.split('#')[0]; } catch { return ''; }
}

export default function Share({ toast, downloads }) {
  const link = gameLink();
  const inApp = !!window.AndroidApp;
  const [qr, setQr] = useState('');
  const [webQr, setWebQr] = useState('');
  useEffect(() => {
    const opt = { margin: 1, width: 420, errorCorrectionLevel: 'M', color: { dark: '#0b1020', light: '#ffffff' } };
    QRCode.toDataURL(APK_URL, opt).then(setQr).catch(() => setQr(''));
    QRCode.toDataURL(link, opt).then(setWebQr).catch(() => setWebQr(''));
  }, [link]);

  async function downloadGame() {
    if (!downloads) return;
    try {
      const html = window.__PAGE_SNAPSHOT__ || ('<!DOCTYPE html>\n' + document.documentElement.outerHTML);
      await downloads.save({ filename: 'mecha-bayanihan-tactics.html', data: html });
      toast('Game file saved! Open it in any browser — works offline.');
    } catch (e) { if (e?.code !== 'declined') toast('Download is not available in this view.'); }
  }

  async function downloadCard() {
    if (!downloads || !qr) return;
    try {
      const W = 1200, H = 1800;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d');
      const grd = g.createLinearGradient(0, 0, W, H); grd.addColorStop(0, '#020617'); grd.addColorStop(0.6, '#0f172a'); grd.addColorStop(1, '#3b0764');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      const cols = ['#ef4444', '#facc15', '#22c55e', '#3b82f6', '#ec4899'];
      for (let i = 0; i < 20; i++) { g.fillStyle = cols[i % 5]; g.beginPath(); g.moveTo(i * 60, 0); g.lineTo(i * 60 + 60, 0); g.lineTo(i * 60 + 30, 56); g.fill(); }
      g.strokeStyle = '#22d3ee'; g.lineWidth = 10; g.strokeRect(30, 90, W - 60, H - 120);
      // sprites
      const sprites = document.querySelectorAll('[data-card-sprite] svg');
      const pos = [[120, 180], [450, 140], [780, 180]];
      for (let i = 0; i < sprites.length && i < 3; i++) {
        const img = new Image();
        const xml = new XMLSerializer().serializeToString(sprites[i]);
        await new Promise((r) => { img.onload = r; img.onerror = r; img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml); });
        g.drawImage(img, pos[i][0], pos[i][1], 300, 300);
      }
      g.textAlign = 'center';
      g.fillStyle = '#fde047'; g.font = 'bold 84px sans-serif'; g.fillText('MECHA BAYANIHAN', W / 2, 600);
      g.fillStyle = '#67e8f9'; g.font = 'bold 60px sans-serif'; g.fillText('TACTICS', W / 2, 680);
      const qi = new Image(); await new Promise((r) => { qi.onload = r; qi.onerror = r; qi.src = qr; });
      g.fillStyle = '#fff'; g.fillRect(W / 2 - 330, 740, 660, 660);
      g.drawImage(qi, W / 2 - 310, 760, 620, 620);
      g.fillStyle = '#e2e8f0'; g.font = 'bold 48px sans-serif'; g.fillText('Scan to download the Android app!', W / 2, 1490);
      g.fillStyle = '#94a3b8'; g.font = '24px sans-serif'; g.fillText(APK_URL.replace('https://', ''), W / 2, 1550);
      g.fillStyle = '#f59e0b'; g.font = 'bold 34px sans-serif'; g.fillText(`${APP_VERSION} · Gawang Pinoy tactical mecha RPG`, W / 2, 1630);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      await downloads.save({ filename: 'mecha-bayanihan-qr-card.png', data: blob });
      toast('Printable QR card saved!');
    } catch (e) { if (e?.code !== 'declined') toast('Could not save the card here.'); }
  }

  return (
    <div className="space-y-4">
      <SectionTitle icon={QrCode} sub="Friends scan the QR to download the Android app, or open the game in a browser.">Share & Download</SectionTitle>
      <div className="grid gap-3 md:grid-cols-[auto_1fr]">
        <Panel amber className="p-4 flex flex-col items-center gap-3">
          <div className="flex -space-x-4">
            {[MECHA.tanod01, MECHA.jeepneyKaiser, MECHA.sarimanokZ].map((m) => <div key={m.id} data-card-sprite><MechaSprite look={m.look} size={80} /></div>)}
          </div>
          {qr ? <img src={qr} alt="QR code to download the Android app" className="w-64 h-64 rounded-xl bg-white p-2" /> : <div className="w-64 h-64 rounded-xl bg-slate-800 animate-pulse" />}
          <div className="text-center">
            <div className="font-black text-amber-200 flex items-center gap-1 justify-center"><Smartphone size={16} /> Android app (latest build)</div>
            <div className="text-[11px] text-slate-400">{GAME_TITLE} {APP_VERSION} · scan with any phone camera</div>
          </div>
        </Panel>
        <Panel className="p-4 space-y-3">
          <div className="text-xs tracking-widest text-cyan-300">ANDROID APK LINK</div>
          <div className="font-mono text-xs bg-slate-800 rounded px-2 py-2 break-all text-slate-200">{APK_URL}</div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="cyan" onClick={async () => { const ok = await copyText(APK_URL); sfx('beep'); toast(ok ? 'APK link copied!' : 'Select the link and copy it manually.'); }}><Copy size={14} /> Copy APK link</Btn>
            {downloads && <Btn variant="amber" onClick={downloadCard} disabled={!qr}><Printer size={14} /> Printable QR card (.png)</Btn>}
          </div>
          <div className="text-xs tracking-widest text-cyan-300 pt-2">PLAY IN A BROWSER</div>
          <div className="flex items-center gap-3">
            {webQr && <img src={webQr} alt="QR code to open the game" className="w-24 h-24 rounded-lg bg-white p-1 shrink-0" />}
            <div className="min-w-0 space-y-2">
              <div className="font-mono text-[11px] bg-slate-800 rounded px-2 py-1.5 break-all text-slate-200">{link}</div>
              <div className="flex flex-wrap gap-2">
                <Btn small variant="slate" onClick={async () => { const ok = await copyText(link); sfx('beep'); toast(ok ? 'Link copied!' : 'Select the link and copy it manually.'); }}><Copy size={13} /> Copy link</Btn>
                <a href={link} target="_blank" rel="noreferrer" className="bg-slate-700/40 text-slate-200 border border-slate-500/50 hover:bg-slate-600/50 rounded-lg px-2 py-1 text-xs font-semibold inline-flex items-center gap-1.5"><ExternalLink size={13} /> Open</a>
                {downloads && !inApp && <Btn small variant="slate" onClick={downloadGame}><Download size={13} /> Game file (.html)</Btn>}
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-slate-800/60 p-3 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-1 font-bold text-slate-100"><Smartphone size={14} /> Installing on Android</div>
            <p>1. Scan the QR and download <b>MechaBayanihan.apk</b>. 2. Open it and allow “install unknown apps” for your browser when asked. 3. New builds install over the old one and keep your progress.</p>
            <p>Custom mecha have their own QR share codes — find them in <b>Workshop → Share</b>.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}
