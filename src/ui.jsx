import React from 'react';
import { CLASSES, RARITY_STYLE } from './data.js';

export function ClassBadge({ cls, small }) {
  const c = CLASSES[cls] || CLASSES.Attacker;
  return <span className={`${c.color} ${small ? 'text-[9px] px-1' : 'text-[10px] px-1.5'} py-0.5 rounded font-bold uppercase tracking-wider text-white`}>{cls}</span>;
}

export function RarityBadge({ r, small }) {
  const s = RARITY_STYLE[r] || RARITY_STYLE.R;
  return <span className={`bg-gradient-to-r ${s.bg} ${s.text} ${small ? 'text-[9px] px-1' : 'text-[10px] px-1.5'} py-0.5 rounded font-black tracking-wider border ${s.border}`}>{r}</span>;
}

export function Bar({ value, max, color = 'bg-emerald-400', h = 'h-1.5', label }) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <div className="w-full">
      {label && <div className="flex justify-between text-[10px] text-slate-400"><span>{label}</span><span className="text-slate-200 tabular-nums">{Math.round(value)}/{Math.round(max)}</span></div>}
      <div className={`w-full ${h} bg-slate-800 rounded overflow-hidden`}>
        <div className={`${color} h-full transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function hpColor(v, m) { const p = v / Math.max(1, m); return p > 0.5 ? 'bg-emerald-400' : p > 0.25 ? 'bg-amber-400' : 'bg-rose-500'; }

export function Panel({ children, className = '', amber }) {
  return <div className={`bg-slate-900/80 rounded-xl ${amber ? 'hud-amber' : 'hud-border'} ${className}`}>{children}</div>;
}

export function Btn({ children, onClick, disabled, variant = 'cyan', className = '', title, small }) {
  const v = {
    cyan: 'bg-cyan-500/15 text-cyan-200 border-cyan-400/50 hover:bg-cyan-500/30',
    amber: 'bg-amber-500/20 text-amber-100 border-amber-400/60 hover:bg-amber-500/35',
    rose: 'bg-rose-500/15 text-rose-200 border-rose-400/50 hover:bg-rose-500/30',
    slate: 'bg-slate-700/40 text-slate-200 border-slate-500/50 hover:bg-slate-600/50',
    green: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/50 hover:bg-emerald-500/30',
  }[variant];
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className={`${v} border rounded-lg ${small ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'} font-semibold tracking-wide transition active:scale-95 disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1.5 justify-center ${className}`}>
      {children}
    </button>
  );
}

export function Modal({ children, onClose, wide }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3" onClick={onClose}>
      <div className={`bg-slate-950 hud-border rounded-2xl w-full ${wide ? 'max-w-3xl' : 'max-w-md'} max-h-[92vh] overflow-auto`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function StatPill({ label, value, accent }) {
  return (
    <div className="bg-slate-800/70 rounded px-1.5 py-1 text-center">
      <div className="text-[9px] text-slate-400 uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${accent || 'text-slate-100'}`}>{value}</div>
    </div>
  );
}

export function SectionTitle({ icon: Icon, children, sub }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg sm:text-xl font-bold text-cyan-200 flex items-center gap-2 tracking-wide">{Icon && <Icon size={20} className="text-amber-300" />}{children}</h2>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
    } catch { return false; }
  }
}
