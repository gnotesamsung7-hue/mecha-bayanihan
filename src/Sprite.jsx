import React, { useId } from 'react';

const O = '#0b1020';
const SW = 2.2;

export function shade(hex, amt) {
  let h = (hex || '#888888').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  r = f(r); g = f(g); b = f(b);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

const st = { stroke: O, strokeWidth: SW, strokeLinejoin: 'round', strokeLinecap: 'round' };

function Flame({ x, y, w = 6, h = 10, color = '#fde047', core = '#fb923c' }) {
  return (
    <g className="thruster">
      <ellipse cx={x} cy={y + h / 2} rx={w / 2} ry={h / 2} fill={core} opacity="0.85" />
      <ellipse cx={x} cy={y + h / 2.6} rx={w / 3.4} ry={h / 3} fill={color} />
    </g>
  );
}

// ---------------- BACKPACKS ----------------
function Pack({ id, c, glow }) {
  switch (id) {
    case 'thrusters':
      return (
        <g>
          <Flame x={31} y={62} w={7} h={12} />
          <Flame x={69} y={62} w={7} h={12} />
          <rect x={25} y={38} width={12} height={25} rx={4} fill={shade(c.s, -0.15)} {...st} />
          <rect x={63} y={38} width={12} height={25} rx={4} fill={shade(c.s, -0.15)} {...st} />
          <rect x={28} y={42} width={6} height={4} rx={1} fill={c.a} />
          <rect x={66} y={42} width={6} height={4} rx={1} fill={c.a} />
        </g>
      );
    case 'eagle': {
      const wing = (
        <g>
          <path d="M38 46 L6 26 L10 36 L2 40 L9 46 L3 52 L12 55 L8 62 L36 60 Z" fill={c.s} {...st} />
          <path d="M14 36 L33 49 M10 46 L33 53 M12 55 L33 57" stroke={shade(c.s, 0.35)} strokeWidth="1.6" fill="none" />
          <path d="M6 26 L10 36 L18 34 Z" fill={c.a} stroke={O} strokeWidth="1.4" />
        </g>
      );
      return <g>{wing}<g transform="translate(100,0) scale(-1,1)">{wing}</g></g>;
    }
    case 'plume': {
      const cols = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
      return (
        <g>
          {cols.map((col, i) => {
            const ang = -75 + i * 25;
            return (
              <g key={i} transform={`rotate(${ang} 50 60)`}>
                <ellipse cx={50} cy={22} rx={6.5} ry={30} fill={col} {...st} strokeWidth={1.8} />
                <ellipse cx={50} cy={8} rx={3} ry={5} fill="#fff" opacity="0.7" />
              </g>
            );
          })}
        </g>
      );
    }
    case 'batwings': {
      const wing = (
        <g>
          <path d="M38 44 L4 18 Q8 34 2 44 Q10 42 10 52 Q16 46 20 58 Q26 50 36 60 Z" fill={c.s} {...st} />
          <path d="M38 44 L6 22 M36 50 L10 46 M36 55 L20 56" stroke={c.a} strokeWidth="1.5" fill="none" />
        </g>
      );
      return <g>{wing}<g transform="translate(100,0) scale(-1,1)">{wing}</g></g>;
    }
    case 'serpent':
      return (
        <g>
          <circle cx={50} cy={54} r={40} fill="none" stroke={O} strokeWidth={10} />
          <circle cx={50} cy={54} r={40} fill="none" stroke={c.p} strokeWidth={7} />
          <circle cx={50} cy={54} r={40} fill="none" stroke={c.a} strokeWidth={3} strokeDasharray="4 7" />
          <path d="M10 54 L2 46 L4 58 Z M90 54 L98 46 L96 58 Z" fill={c.a} {...st} strokeWidth={1.5} />
        </g>
      );
    case 'banca':
      return (
        <g>
          <path d="M8 50 L92 50 M8 56 L92 56" stroke={O} strokeWidth={5} />
          <path d="M8 50 L92 50 M8 56 L92 56" stroke="#d6b370" strokeWidth={3} />
          <path d="M20 50 v6 M30 50 v6 M70 50 v6 M80 50 v6" stroke="#8b6b3a" strokeWidth={1.2} />
          <ellipse cx={8} cy={53} rx={6} ry={9} fill={c.s} {...st} />
          <ellipse cx={92} cy={53} rx={6} ry={9} fill={c.s} {...st} />
          <Flame x={8} y={62} w={5} h={9} />
          <Flame x={92} y={62} w={5} h={9} />
        </g>
      );
    default:
      return null;
  }
}

// ---------------- LEGS ----------------
function Legs({ id, c }) {
  if (id === 'none') {
    return (
      <g>
        <Flame x={50} y={80} w={14} h={18} color={shade(c.e, 0.4)} core={c.a} />
        <path d="M36 66 L64 66 L56 82 Q50 88 44 82 Z" fill={c.p} {...st} />
        <path d="M42 72 L58 72" stroke={c.a} strokeWidth={2} />
      </g>
    );
  }
  const heavy = id === 'heavy';
  const thr = id === 'thruster';
  const w = heavy ? 14 : thr ? 10 : 11;
  const lx = heavy ? 33 : thr ? 37 : 36;
  const rx = 100 - lx - w;
  const leg = (x) => (
    <g key={x}>
      <rect x={x} y={65} width={w} height={20} rx={3} fill={c.p} {...st} />
      <rect x={x + 2} y={70} width={w - 4} height={5} rx={1.5} fill={c.s} />
      <path d={`M${x - 3} 84 h${w + 6} l-1 8 h${-(w + 4)} z`} fill={shade(c.s, -0.1)} {...st} />
    </g>
  );
  return (
    <g>
      {thr && <><Flame x={lx + w / 2} y={92} w={6} h={9} /><Flame x={rx + w / 2} y={92} w={6} h={9} /></>}
      {leg(lx)}{leg(rx)}
      {thr && (
        <g fill={c.a} stroke={O} strokeWidth={1.5} strokeLinejoin="round">
          <path d={`M${lx} 68 L${lx - 6} 80 L${lx} 80 Z`} />
          <path d={`M${rx + w} 68 L${rx + w + 6} 80 L${rx + w} 80 Z`} />
        </g>
      )}
    </g>
  );
}

// ---------------- ARMS ----------------
function ArmLeft({ id, c }) {
  switch (id) {
    case 'heavy':
      return (
        <g>
          <rect x={17} y={55} width={14} height={15} rx={3} fill={c.s} {...st} />
          <rect x={18} y={68} width={11} height={7} rx={2} fill={shade(c.p, -0.2)} {...st} />
          <rect x={12} y={43} width={23} height={14} rx={5} fill={c.p} {...st} />
          <path d="M15 49 h17" stroke={c.a} strokeWidth={2.5} />
        </g>
      );
    case 'blade':
      return (
        <g>
          <path d="M20 57 L8 50 L18 70 Z" fill={c.e} opacity="0.9" {...st} strokeWidth={1.4} />
          <rect x={20} y={54} width={10} height={13} rx={3} fill={c.p} {...st} />
          <circle cx={25} cy={71} r={4.5} fill={c.s} {...st} />
          <circle cx={26} cy={51} r={7} fill={c.s} {...st} />
        </g>
      );
    case 'claw':
      return (
        <g>
          <rect x={20} y={54} width={10} height={13} rx={3} fill={c.p} {...st} />
          <path d="M20 68 l-3 9 M24 69 l-1 10 M28 68 l2 9" stroke={O} strokeWidth={4.2} />
          <path d="M20 68 l-3 9 M24 69 l-1 10 M28 68 l2 9" stroke={c.a} strokeWidth={2} />
          <rect x={19} y={65} width={12} height={5} rx={2} fill={c.s} {...st} />
          <circle cx={26} cy={51} r={7} fill={c.s} {...st} />
        </g>
      );
    default:
      return (
        <g>
          <rect x={20} y={54} width={10} height={13} rx={3} fill={c.p} {...st} />
          <circle cx={25} cy={71} r={4.5} fill={c.s} {...st} />
          <circle cx={26} cy={51} r={7} fill={c.s} {...st} />
          <circle cx={26} cy={51} r={2.2} fill={c.a} />
        </g>
      );
  }
}

// ---------------- TORSO ----------------
function Torso({ id, c, glow }) {
  switch (id) {
    case 'heavy':
      return (
        <g>
          <path d="M30 46 h40 l-4 24 h-32 z" fill={c.p} {...st} />
          <rect x={38} y={61} width={24} height={8} rx={2} fill={c.s} {...st} strokeWidth={1.6} />
          <rect x={35} y={50} width={10} height={6} rx={1.5} fill={c.a} {...st} strokeWidth={1.4} />
          <rect x={55} y={50} width={10} height={6} rx={1.5} fill={c.a} {...st} strokeWidth={1.4} />
          <circle cx={50} cy={55} r={4} fill={c.e} filter={glow} />
        </g>
      );
    case 'slim':
      return (
        <g>
          <path d="M37 47 h26 l-4 21 h-18 z" fill={c.p} {...st} />
          <path d="M40 50 L50 60 L60 50" stroke={c.a} strokeWidth={3} fill="none" strokeLinejoin="round" />
          <rect x={42} y={62} width={16} height={6} rx={2} fill={c.s} {...st} strokeWidth={1.4} />
          <circle cx={50} cy={54} r={2.8} fill={c.e} filter={glow} />
        </g>
      );
    case 'jeepney':
      return (
        <g>
          <rect x={32} y={46} width={36} height={23} rx={4} fill={c.p} {...st} />
          <rect x={37} y={49} width={26} height={10} rx={2} fill={shade(c.p, -0.35)} {...st} strokeWidth={1.4} />
          {[40, 44, 48, 52, 56, 60].map((x) => <path key={x} d={`M${x} 50 v8`} stroke="#f8fafc" strokeWidth={1.4} />)}
          <rect x={32.5} y={61} width={35} height={3.2} fill={c.s} />
          <rect x={32.5} y={64.2} width={35} height={1.8} fill={c.a} />
          <rect x={32.5} y={66} width={35} height={1.2} fill="#2563eb" />
          <rect x={45} y={60.5} width={10} height={4.5} rx={1} fill="#f8fafc" stroke={O} strokeWidth={1} />
          <circle cx={30} cy={48} r={3} fill={c.a} {...st} strokeWidth={1.3} />
          <circle cx={70} cy={48} r={3} fill={c.a} {...st} strokeWidth={1.3} />
        </g>
      );
    default:
      return (
        <g>
          <path d="M34 47 h32 l-3 21 h-26 z" fill={c.p} {...st} />
          <rect x={40} y={61} width={20} height={7} rx={2} fill={c.s} {...st} strokeWidth={1.5} />
          <rect x={39} y={51} width={8} height={5} rx={1.2} fill={c.a} />
          <rect x={53} y={51} width={8} height={5} rx={1.2} fill={c.a} />
          <circle cx={50} cy={56} r={3} fill={c.e} filter={glow} />
        </g>
      );
  }
}

// ---------------- HEADS ----------------
function Eyes({ c, glow, y = 31, slant = 0, gap = 9, w = 7, h = 4 }) {
  return (
    <g filter={glow}>
      <rect x={50 - gap / 2 - w} y={y} width={w} height={h} rx={1.5} fill={c.e} transform={`rotate(${slant} ${50 - gap / 2 - w / 2} ${y + h / 2})`} />
      <rect x={50 + gap / 2} y={y} width={w} height={h} rx={1.5} fill={c.e} transform={`rotate(${-slant} ${50 + gap / 2 + w / 2} ${y + h / 2})`} />
    </g>
  );
}

function Horse({ x, y, flip }) {
  return (
    <g transform={`translate(${x} ${y}) ${flip ? 'scale(-1,1)' : ''}`}>
      <path d="M-5 6 L-4 1 L-1 0 L1 -5 L4 -4 L3 -1 L5 1 L5 5 L3 5 L3 3 L-2 3 L-3 7 Z" fill="#e2e8f0" stroke={O} strokeWidth={1.2} strokeLinejoin="round" />
    </g>
  );
}

function Head({ id, c, glow }) {
  const helmet = (x = 28, w = 44, fill = c.p) => <rect x={x} y={14} width={w} height={32} rx={13} fill={fill} {...st} />;
  const visor = <rect x={34} y={26} width={32} height={13} rx={5} fill={O} />;
  switch (id) {
    case 'tanod':
      return (
        <g>
          {helmet()}{visor}<Eyes c={c} glow={glow} />
          <path d="M26 24 Q50 0 74 24 Z" fill={c.s} {...st} />
          <path d="M23 24 h54 l-6 5 h-42 z" fill={shade(c.s, -0.3)} {...st} />
          <path d="M50 9 l1.8 3.6 4 .6 -2.9 2.8 .7 4 -3.6 -1.9 -3.6 1.9 .7 -4 -2.9 -2.8 4 -.6 z" fill={c.a} stroke={O} strokeWidth={1} />
          <rect x={44} y={41} width={12} height={3} rx={1} fill={c.s} />
        </g>
      );
    case 'salakot':
      return (
        <g>
          {helmet()}{visor}
          <rect x={36} y={31} width={28} height={4} rx={2} fill={c.e} filter={glow} />
          <polygon points="10,27 50,2 90,27" fill={c.s} {...st} />
          <path d="M22 20 L50 4 L78 20 M30 24 L50 8 L70 24 M38 10 L44 25 M62 10 L56 25 M50 4 V26" stroke={shade(c.s, -0.3)} strokeWidth={1.2} fill="none" />
          <path d="M14 26 h72" stroke={c.a} strokeWidth={3} />
          <circle cx={50} cy={3.5} r={2.5} fill={c.a} stroke={O} strokeWidth={1.2} />
        </g>
      );
    case 'jeep':
      return (
        <g>
          <path d="M60 14 L66 2" stroke={O} strokeWidth={2.4} />
          <path d="M66 2 l8 2 -8 3 z" fill={c.s} stroke={O} strokeWidth={1} />
          {helmet()}
          <rect x={34} y={24} width={32} height={17} rx={6} fill={shade(c.p, -0.4)} {...st} strokeWidth={1.6} />
          <circle cx={42} cy={31} r={5} fill="#f8fafc" stroke={O} strokeWidth={1.4} />
          <circle cx={58} cy={31} r={5} fill="#f8fafc" stroke={O} strokeWidth={1.4} />
          <circle cx={42} cy={31} r={3.2} fill={c.e} filter={glow} />
          <circle cx={58} cy={31} r={3.2} fill={c.e} filter={glow} />
          {[44, 47, 50, 53, 56].map((x) => <path key={x} d={`M${x} 37 v3`} stroke="#f8fafc" strokeWidth={1.2} />)}
          <rect x={28.5} y={19} width={43} height={3} fill={c.s} />
          <rect x={28.5} y={22} width={43} height={1.6} fill={c.a} />
          <Horse x={41} y={13} />
          <Horse x={59} y={13} flip />
        </g>
      );
    case 'sarimanok': {
      const cols = [c.s, '#facc15', c.a, '#ec4899', '#3b82f6'];
      return (
        <g>
          {cols.map((col, i) => (
            <g key={i} transform={`rotate(${-40 + i * 20} 50 18)`}>
              <path d="M50 18 Q44 6 50 -6 Q56 6 50 18 Z" fill={col} {...st} strokeWidth={1.6} />
            </g>
          ))}
          {helmet()}{visor}<Eyes c={c} glow={glow} y={29} slant={-8} />
          <polygon points="45,38 55,38 50,47" fill="#facc15" {...st} strokeWidth={1.6} />
          <path d="M31 30 q-3 4 1 7 q3 1 2 -2 M69 30 q3 4 -1 7 q-3 1 -2 -2" stroke={c.a} strokeWidth={1.6} fill="none" />
          <path d="M40 16 q10 -5 20 0" stroke={c.s} strokeWidth={3} fill="none" />
        </g>
      );
    }
    case 'agila':
      return (
        <g>
          <polygon points="34,18 18,2 40,14" fill={c.s} {...st} strokeWidth={1.6} />
          <polygon points="42,15 34,-2 50,13" fill={shade(c.s, 0.2)} {...st} strokeWidth={1.6} />
          <polygon points="66,18 82,2 60,14" fill={c.s} {...st} strokeWidth={1.6} />
          <polygon points="58,15 66,-2 50,13" fill={shade(c.s, 0.2)} {...st} strokeWidth={1.6} />
          {helmet()}
          <path d="M28 26 Q50 16 72 26 L72 22 Q50 10 28 22 Z" fill={c.s} />
          {visor}<Eyes c={c} glow={glow} y={29} slant={-14} w={8} h={3.5} />
          <path d="M44 37 h12 q0 6 -6 10 q-1 -4 -6 -6 z" fill={c.a} {...st} strokeWidth={1.6} />
        </g>
      );
    case 'kapre':
      return (
        <g>
          <path d="M31 20 Q22 12 24 2 Q30 10 36 16 Z" fill="#d6d3d1" {...st} strokeWidth={1.6} />
          <path d="M69 20 Q78 12 76 2 Q70 10 64 16 Z" fill="#d6d3d1" {...st} strokeWidth={1.6} />
          {helmet(25, 50)}
          <rect x={32} y={25} width={36} height={14} rx={4} fill={O} />
          <rect x={30} y={23} width={40} height={4} rx={2} fill={shade(c.p, -0.4)} />
          <Eyes c={c} glow={glow} y={30} slant={12} w={8} />
          <polygon points="36,42 64,42 57,51 43,51" fill={c.s} {...st} strokeWidth={1.6} />
          <path d="M46 44 v5 M50 44 v6 M54 44 v5" stroke={shade(c.s, -0.4)} strokeWidth={1.2} />
        </g>
      );
    case 'tikbalang':
      return (
        <g>
          <path d="M30 22 L24 8 L33 16 L34 4 L41 14 L44 2 L50 13 L56 2 L59 14 L66 4 L67 16 L76 8 L70 22 Z" fill={c.s} {...st} strokeWidth={1.6} />
          <polygon points="31,18 29,8 37,15" fill={c.p} {...st} strokeWidth={1.4} />
          <polygon points="69,18 71,8 63,15" fill={c.p} {...st} strokeWidth={1.4} />
          <rect x={30} y={13} width={40} height={30} rx={12} fill={c.p} {...st} />
          <rect x={35} y={22} width={30} height={9} rx={3} fill={O} />
          <Eyes c={c} glow={glow} y={24.5} slant={16} w={7} h={3.2} gap={10} />
          <rect x={38} y={32} width={24} height={17} rx={8} fill={shade(c.p, -0.2)} {...st} />
          <circle cx={45} cy={43} r={1.6} fill={O} /><circle cx={55} cy={43} r={1.6} fill={O} />
          <path d="M42 36 h16" stroke={c.a} strokeWidth={1.6} />
        </g>
      );
    case 'manananggal':
      return (
        <g>
          <path d="M26 22 Q20 44 24 62 L32 52 L34 64 L40 46 L50 40 L60 46 L66 64 L68 52 L76 62 Q80 44 74 22 Q50 6 26 22 Z" fill={c.s} {...st} />
          <polygon points="27,24 18,14 29,32" fill={c.a} {...st} strokeWidth={1.4} />
          <polygon points="73,24 82,14 71,32" fill={c.a} {...st} strokeWidth={1.4} />
          {helmet(30, 40)}
          <path d="M30 26 Q50 10 70 26 L70 20 Q50 6 30 20 Z" fill={c.s} />
          {visor}<Eyes c={c} glow={glow} y={30} slant={14} w={8} h={3.5} />
          <path d="M44 40 l2 5 2 -5 M52 40 l2 5 2 -5" fill="#f8fafc" stroke={O} strokeWidth={1} />
        </g>
      );
    case 'bakunawa':
      return (
        <g>
          <path d="M32 20 Q20 10 14 14 Q22 16 26 26 Z" fill={c.a} {...st} strokeWidth={1.6} />
          <path d="M68 20 Q80 10 86 14 Q78 16 74 26 Z" fill={c.a} {...st} strokeWidth={1.6} />
          <path d="M28 30 L16 34 L28 38 Z M72 30 L84 34 L72 38 Z" fill={c.p} {...st} strokeWidth={1.4} />
          {helmet(27, 46)}
          <path d="M30 22 Q50 12 70 22" stroke={c.a} strokeWidth={2.4} fill="none" />
          <rect x={33} y={25} width={34} height={11} rx={4} fill={O} />
          <Eyes c={c} glow={glow} y={28} slant={18} w={8} h={3.5} gap={10} />
          <path d="M34 38 h32 l-5 11 h-22 z" fill={c.s} {...st} strokeWidth={1.6} />
          <path d="M39 38 l2 4 2 -4 M57 38 l2 4 2 -4" fill="#f8fafc" stroke={O} strokeWidth={0.9} />
        </g>
      );
    case 'visor':
      return (
        <g>
          <path d="M66 18 L74 4" stroke={O} strokeWidth={2.4} />
          <circle cx={74} cy={4} r={2} fill={c.a} />
          {helmet()}
          <rect x={30} y={27} width={40} height={9} rx={4} fill={O} />
          <rect x={32} y={29} width={36} height={5} rx={2.5} fill={c.e} filter={glow} />
          <path d="M34 20 h32" stroke={c.s} strokeWidth={3} />
          <rect x={44} y={39} width={12} height={4} rx={1.5} fill={c.s} />
        </g>
      );
    default:
      return <g>{helmet()}{visor}<Eyes c={c} glow={glow} /></g>;
  }
}

// ---------------- HELD WEAPONS ----------------
function Weapon({ id, c, glow }) {
  switch (id) {
    case 'rifle':
      return (
        <g transform="rotate(18 75 70)">
          <rect x={68} y={66} width={30} height={6} rx={1.5} fill="#334155" {...st} strokeWidth={1.6} />
          <rect x={74} y={62} width={9} height={4} rx={1} fill={c.s} stroke={O} strokeWidth={1.2} />
          <rect x={95} y={66.5} width={3} height={5} fill={c.e} filter={glow} />
          <rect x={72} y={72} width={4} height={6} rx={1} fill="#334155" stroke={O} strokeWidth={1.2} />
        </g>
      );
    case 'sword':
      return (
        <g transform="rotate(-28 76 70)">
          <rect x={73.5} y={30} width={5} height={38} rx={2.5} fill={c.e} opacity="0.95" filter={glow} />
          <rect x={74.8} y={33} width={2.4} height={33} rx={1.2} fill="#fff" />
          <rect x={70} y={66} width={12} height={3.5} rx={1} fill={c.a} stroke={O} strokeWidth={1.2} />
          <rect x={74} y={69} width={4} height={8} rx={1} fill="#57534e" stroke={O} strokeWidth={1.2} />
        </g>
      );
    case 'shield':
      return (
        <g>
          <path d="M6 50 h24 v14 q0 13 -12 19 q-12 -6 -12 -19 z" fill={c.s} {...st} />
          <path d="M9 53 h18 v11 q0 10 -9 15 q-9 -5 -9 -15 z" fill="none" stroke={c.a} strokeWidth={1.6} />
          <g transform="translate(18 64)">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d="M0 -7 L1.4 -3 L-1.4 -3 Z" fill={c.a} transform={`rotate(${a})`} />)}
            <circle r={3} fill={c.a} stroke={O} strokeWidth={0.8} />
          </g>
        </g>
      );
    case 'cannon':
      return (
        <g transform="rotate(-12 70 40)">
          <rect x={62} y={34} width={32} height={8} rx={2} fill={shade(c.s, -0.2)} {...st} strokeWidth={1.8} />
          <rect x={90} y={33} width={6} height={10} rx={1.5} fill={c.a} stroke={O} strokeWidth={1.4} />
          <circle cx={96} cy={38} r={2} fill={c.e} filter={glow} />
        </g>
      );
    case 'axe':
      return (
        <g>
          <path d="M74 76 L88 40" stroke={O} strokeWidth={5} />
          <path d="M74 76 L88 40" stroke="#78350f" strokeWidth={3} />
          <path d="M84 40 Q98 38 98 52 Q92 48 86 50 Z" fill="#a8a29e" {...st} strokeWidth={1.6} />
          <path d="M97 43 Q98 47 97.5 51" stroke={c.a} strokeWidth={1.5} fill="none" />
        </g>
      );
    case 'whip':
      return (
        <g>
          <path d="M76 70 Q98 56 90 78 T98 96" stroke={O} strokeWidth={4.5} fill="none" strokeLinecap="round" />
          <path d="M76 70 Q98 56 90 78 T98 96" stroke={c.a} strokeWidth={2.4} fill="none" strokeLinecap="round" filter={glow} />
          <rect x={72} y={66} width={6} height={9} rx={1.5} fill="#44403c" stroke={O} strokeWidth={1.2} />
        </g>
      );
    case 'sticks':
      return (
        <g>
          {[['M76 72 L92 48'], ['M24 72 L8 48']].map(([d], i) => (
            <g key={i}>
              <path d={d} stroke={O} strokeWidth={5} strokeLinecap="round" />
              <path d={d} stroke="#c8a165" strokeWidth={3} strokeLinecap="round" />
              <path d={d} stroke={c.a} strokeWidth={3} strokeDasharray="2 6" strokeLinecap="butt" />
            </g>
          ))}
        </g>
      );
    case 'lance':
      return (
        <g>
          <path d="M70 84 L96 36" stroke={O} strokeWidth={6} strokeLinecap="round" />
          <path d="M70 84 L96 36" stroke={c.e} strokeWidth={3.4} strokeLinecap="round" filter={glow} />
          <path d="M96 36 L92 46 L99 44 Z" fill="#fff" stroke={O} strokeWidth={1} />
        </g>
      );
    default:
      return null;
  }
}

// Placeholder flagship drawing (faces left) until ship art is added in Art Cues.
function ShipArt({ c, glow, enemy }) {
  return (
    <g strokeLinejoin="round">
      <path d="M8 58 L96 58 L90 64 L14 64 Z" fill={c.s} stroke={O} strokeWidth={1.4} />
      <path d="M2 74 L98 74 L92 80 L8 80 Z" fill={c.s} stroke={O} strokeWidth={1.4} />
      <path d="M16 61 L16 77 M84 61 L84 77 M50 61 L50 77" stroke={O} strokeWidth={2} />
      <path d={enemy ? 'M2 52 L-2 38 L12 46 L20 60 L88 60 L96 50 L98 70 L10 72 Z' : 'M0 48 L14 58 L88 60 L100 50 L96 70 L12 72 Z'} fill={c.p} stroke={O} strokeWidth={1.6} />
      <path d="M14 64 L94 64" stroke={c.a} strokeWidth={2.5} />
      <rect x="44" y="34" width="26" height="24" rx="3" fill={c.p} stroke={O} strokeWidth={1.4} />
      <rect x="48" y="38" width="18" height="6" rx="1.5" fill={c.e} filter={glow} />
      <path d="M58 34 L58 18 M50 22 L66 22" stroke={O} strokeWidth={2} />
      {enemy ? <path d="M54 20 L66 14 L64 30 L54 30 Z" fill={c.s} stroke={O} strokeWidth={1} /> : <path d="M60 14 L76 22 L60 30 Z" fill={c.a} stroke={O} strokeWidth={1} />}
      <rect x="18" y="50" width="22" height="6" rx="2" fill={c.s} stroke={O} strokeWidth={1.2} transform="rotate(-8 29 53)" />
      <circle cx="16" cy="55" r="2.4" fill={c.e} filter={glow} />
      {[30, 76].map((x) => <rect key={x} x={x} y="52" width="8" height="5" rx="1" fill={O} />)}
      <circle cx="26" cy="66" r="4" fill={c.a} stroke={O} strokeWidth={1.2} />
      <path d="M98 56 L108 54 L108 66 L98 64 Z" fill={c.e} opacity=".85" filter={glow} />
    </g>
  );
}

export function MechaSprite({ look, size = 64, className = '', dim = false, bob = false, flip = false, title }) {
  const uid = useId().replace(/:/g, '');
  const gid = `g${uid}`;
  const glow = `url(#${gid})`;
  const c = look?.colors || { p: '#cbd5e1', s: '#334155', a: '#facc15', e: '#22d3ee' };
  return (
    <svg viewBox="-4 -8 108 108" width={size} height={size} className={className} style={{ filter: dim ? 'grayscale(1) brightness(.6)' : look?.aura ? 'drop-shadow(0 0 4px #fde047) drop-shadow(0 0 10px #f59e0b)' : undefined, overflow: 'visible' }} role="img" aria-label={title || 'mecha'}>
      <defs>
        <filter id={gid} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g transform={flip ? 'translate(100,0) scale(-1,1)' : undefined}>
        <g className={bob ? 'bob' : undefined}>
          {look?.img ? (
            <image href={look.img} x={-4} y={-8} width={108} height={108} preserveAspectRatio="xMidYMid meet" style={look.hue ? { filter: `hue-rotate(${look.hue}deg)` } : undefined} />
          ) : look?.ship ? (
            <ShipArt c={c} glow={glow} enemy={look.ship === 'karakoa'} />
          ) : (
            <>
              <Pack id={look?.pack} c={c} glow={glow} />
              <Legs id={look?.legs} c={c} />
              <ArmLeft id={look?.arms} c={c} />
              <g transform="translate(100,0) scale(-1,1)"><ArmLeft id={look?.arms} c={c} /></g>
              <Torso id={look?.torso} c={c} glow={glow} />
              <Head id={look?.head} c={c} glow={glow} />
              <Weapon id={look?.weapon} c={c} glow={glow} />
            </>
          )}
        </g>
      </g>
    </svg>
  );
}

// ---------------- PILOT PORTRAIT ----------------
export function PilotPortrait({ pilot, size = 48, className = '' }) {
  const L = pilot?.look || {};
  const hair = L.hair || '#111';
  return (
    <svg viewBox="0 0 60 60" width={size} height={size} className={className} role="img" aria-label={pilot?.name || 'pilot'}>
      <defs>
        <clipPath id={`pc-${pilot?.id}`}><circle cx="30" cy="30" r="29" /></clipPath>
      </defs>
      {pilot?.img ? (
        <g clipPath={`url(#pc-${pilot?.id})`}>
          <rect width="60" height="60" fill={shade(L.suit || '#334155', -0.55)} />
          <image href={pilot.img} x="0" y="0" width="60" height="60" preserveAspectRatio="xMidYMin slice" />
        </g>
      ) : (
      <g clipPath={`url(#pc-${pilot?.id})`}>
        <rect width="60" height="60" fill="#0f172a" />
        <circle cx="30" cy="30" r="29" fill={shade(L.suit || '#334155', -0.55)} />
        {L.style === 'long' && <path d="M14 26 Q14 8 30 8 Q46 8 46 26 L48 50 L12 50 Z" fill={hair} stroke={O} strokeWidth="1.2" />}
        <path d="M8 62 Q10 44 30 43 Q50 44 52 62 Z" fill={L.suit || '#334155'} stroke={O} strokeWidth="1.4" />
        <path d="M24 44 L30 52 L36 44" fill="none" stroke={shade(L.suit || '#334155', 0.4)} strokeWidth="1.4" />
        {L.acc === 'towel' && <path d="M12 50 Q20 44 26 46 L24 58 L14 58 Z" fill="#f8fafc" stroke={O} strokeWidth="1.1" />}
        <rect x="26" y="36" width="8" height="8" fill={shade(L.skin, -0.1)} />
        <circle cx="30" cy="27" r="13" fill={L.skin} stroke={O} strokeWidth="1.4" />
        <circle cx="17.5" cy="28" r="2.5" fill={L.skin} stroke={O} strokeWidth="1" />
        <circle cx="42.5" cy="28" r="2.5" fill={L.skin} stroke={O} strokeWidth="1" />
        {L.style === 'spiky' && <path d="M16 24 L15 14 L20 18 L21 9 L26 15 L30 7 L34 15 L39 9 L40 18 L45 14 L44 24 Q30 16 16 24 Z" fill={hair} stroke={O} strokeWidth="1.2" />}
        {(L.style === 'short' || L.style === 'bun') && <path d="M17 25 Q16 12 30 12 Q44 12 43 25 Q38 18 30 19 Q22 18 17 25 Z" fill={hair} stroke={O} strokeWidth="1.2" />}
        {L.style === 'bun' && <circle cx="30" cy="10" r="5" fill={hair} stroke={O} strokeWidth="1.2" />}
        {L.style === 'long' && <path d="M17 25 Q18 12 30 12 Q42 12 43 25 Q36 16 30 20 Q24 16 17 25 Z" fill={hair} stroke={O} strokeWidth="1.2" />}
        {L.style === 'bald' && <path d="M22 37 Q30 41 38 37" stroke={hair} strokeWidth="2" fill="none" opacity=".7" />}
        <ellipse cx="25" cy="28" rx="1.8" ry="2.4" fill={O} />
        <ellipse cx="35" cy="28" rx="1.8" ry="2.4" fill={O} />
        <circle cx="25.6" cy="27.2" r=".6" fill="#fff" /><circle cx="35.6" cy="27.2" r=".6" fill="#fff" />
        <path d="M22 24 l5 -1 M33 23 l5 1" stroke={O} strokeWidth="1.2" />
        <path d="M27 34 Q30 36 33 34" stroke={O} strokeWidth="1.2" fill="none" />
        {L.acc === 'headband' && <><rect x="16" y="19" width="28" height="3.5" fill={L.accColor} stroke={O} strokeWidth="0.8" /><path d="M44 20 l7 3 -6 2" fill={L.accColor} stroke={O} strokeWidth="0.8" /></>}
        {L.acc === 'cap' && <><path d="M16 22 Q16 10 30 10 Q44 10 44 22 Z" fill={L.accColor} stroke={O} strokeWidth="1.1" /><path d="M14 22 h32 l-4 3 h-24 z" fill={shade(L.accColor, -0.35)} stroke={O} strokeWidth="1" /><path d="M30 13 l-2 4 h3 l-2 4" stroke="#fde047" strokeWidth="1" fill="none" /></>}
        {L.acc === 'bandana' && <><path d="M16 21 Q30 15 44 21 L44 24 Q30 19 16 24 Z" fill={L.accColor} stroke={O} strokeWidth="0.9" /><path d="M44 22 l6 -2 -2 5 z" fill={L.accColor} stroke={O} strokeWidth="0.8" /></>}
        {L.acc === 'clip' && <path d="M38 15 l-3 4 h3 l-3 4" stroke={L.accColor} strokeWidth="1.8" fill="none" />}
        {L.acc === 'tiara' && <path d="M21 15 l3 -5 3 4 3 -6 3 6 3 -4 3 5 Z" fill={L.accColor} stroke={O} strokeWidth="0.9" />}
        {L.acc === 'crown' && <path d="M19 15 Q22 6 26 13 Q30 4 34 13 Q38 6 41 15 Z" fill={L.accColor} stroke={O} strokeWidth="0.9" />}
        {L.acc === 'visor' && <rect x="18" y="25" width="24" height="5" rx="2" fill={L.accColor} opacity=".9" />}
      </g>
      )}
      <circle cx="30" cy="30" r="29" fill="none" stroke="rgba(148,163,184,.5)" strokeWidth="1" />
    </svg>
  );
}
