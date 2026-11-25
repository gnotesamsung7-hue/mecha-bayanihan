// ============================================================
// MECHA BAYANIHAN TACTICS — game data (original Pinoy-pop-culture roster)
// ============================================================

import iconImg from './assets/icon.webp';
import keyartImg from './assets/keyart.webp';
import bgStage1Img from './assets/bg_stage1.webp';
import jeepneyKaiserImg from './assets/jeepney_kaiser.webp';
import bgStage2Img from './assets/bg_stage2.webp';
import bgStage3Img from './assets/bg_stage3.webp';
import tanod01Img from './assets/mecha_tanod01.webp';
import tanodCustomImg from './assets/mecha_tanod_custom.webp';
import agilaImg from './assets/mecha_agila.webp';
import sarimanokImg from './assets/mecha_sarimanok.webp';
import kapreImg from './assets/mecha_kapre.webp';
import tikbalangImg from './assets/mecha_tikbalang.webp';
import manananggalImg from './assets/mecha_manananggal.webp';
import bakunawaImg from './assets/mecha_bakunawa.webp';
import customTemplateImg from './assets/mecha_custom_template.webp';
import pilotMigoImg from './assets/pilot_migo.webp';
import pilotDiwataImg from './assets/pilot_diwata.webp';
import cutinMigoImg from './assets/cutin_migo.webp';
import cutinDiwataImg from './assets/cutin_diwata.webp';

export const GAME_TITLE = 'Mecha Bayanihan Tactics';
export const APP_VERSION = 'v1.3.0';
export const CUSTOM_TEMPLATE_IMG = customTemplateImg;
export const ICON_IMG = iconImg;
export const KEYART_IMG = keyartImg;

// Art from the Art Cues tab that has been added to the game, keyed by its file name.
export const INSTALLED_ART = {
  'icon_app_512.png': iconImg,
  'ui_title_keyart.png': keyartImg,
  'bg_stage1_orbital_edsa.png': bgStage1Img,
  'mecha_jeepney_kaiser.png': jeepneyKaiserImg,
  'bg_stage2_divisoria_underground.png': bgStage2Img,
  'bg_stage3_bakunawa_eclipse.png': bgStage3Img,
  'mecha_tanod_01.png': tanod01Img,
  'mecha_tanod_custom.png': tanodCustomImg,
  'mecha_agila_mk2.png': agilaImg,
  'mecha_sarimanok_zeta.png': sarimanokImg,
  'mecha_kapre.png': kapreImg,
  'mecha_tikbalang_custom.png': tikbalangImg,
  'mecha_manananggal.png': manananggalImg,
  'mecha_bakunawa_boss.png': bakunawaImg,
  'mecha_custom_template.png': customTemplateImg,
  'pilot_migo_santos.png': pilotMigoImg,
  'pilot_reyna_diwata.png': pilotDiwataImg,
  'cutin_migo.png': cutinMigoImg,
  'cutin_diwata.png': cutinDiwataImg,
};

// ---------- Terrain ----------
export const TERRAIN = {
  '.': { id: 'space', name: 'Kalawakan (Space)', short: 'Space', cost: 1, eva: 0, def: 0, heal: 0 },
  '#': { id: 'debris', name: 'Debris (Jeep Wreck / Asteroid)', short: 'Debris', cost: 1, eva: 15, def: 15, heal: 0 },
  'H': { id: 'dock', name: 'Talyer Dock (Repair Bay)', short: 'Talyer', cost: 1, eva: 0, def: 0, heal: 15 },
};

// ---------- Classes ----------
export const CLASSES = {
  Attacker: { color: 'bg-rose-600', text: 'text-rose-300', ring: 'ring-rose-400', desc: '+10% ATK. Built to land killing blows and chain steps.' },
  Defender: { color: 'bg-sky-600', text: 'text-sky-300', ring: 'ring-sky-400', desc: '+15% DEF, +10% HP. Intercepts heavy hits on adjacent allies (Support Defense).' },
  Supporter: { color: 'bg-emerald-600', text: 'text-emerald-300', ring: 'ring-emerald-400', desc: '+20 EN. Support Attacks deal 60% instead of 50%.' },
};

export const RARITY_STYLE = {
  R: { text: 'text-slate-200', bg: 'from-slate-600 to-slate-800', border: 'border-slate-400', glow: 'shadow-slate-400/40' },
  SR: { text: 'text-amber-200', bg: 'from-amber-600 to-orange-900', border: 'border-amber-300', glow: 'shadow-amber-400/60' },
  SSR: { text: 'text-fuchsia-100', bg: 'from-fuchsia-600 via-cyan-600 to-amber-500', border: 'border-fuchsia-200', glow: 'shadow-fuchsia-400/80' },
};

// ---------- Mecha roster ----------
// look: part ids for the procedural SVG sprite renderer (see Sprite.jsx)
export const MECHA = {
  tanod01: {
    id: 'tanod01', name: 'TND-01 Tanod', short: 'Tanod', cls: 'Supporter', rarity: 'R', faction: 'Bayanihan',
    hp: 420, en: 120, atk: 62, def: 55, mob: 60, move: 4,
    lore: 'Mass-produced barangay patrol frame. Cheap, loyal, always on the night shift.',
    weapons: [
      { name: 'Batuta Rifle', power: 70, min: 1, max: 3, en: 0, hit: 75, crit: 5, fx: 'beam' },
      { name: 'Pito Flare Missiles', power: 90, min: 2, max: 4, en: 15, hit: 66, crit: 8, fx: 'missile' },
      { name: 'Ronda Barrage', power: 170, min: 1, max: 4, en: 40, hit: 80, crit: 15, ult: true, fx: 'mega' },
    ],
    look: { img: tanod01Img, head: 'tanod', torso: 'standard', arms: 'standard', legs: 'standard', pack: 'thrusters', weapon: 'rifle', colors: { p: '#e2e8f0', s: '#1d4ed8', a: '#facc15', e: '#22d3ee' } },
  },
  tanodCustom: {
    id: 'tanodCustom', name: 'TND-02 Tanod Custom', short: 'Tanod Custom', cls: 'Defender', rarity: 'SR', faction: 'Bayanihan',
    hp: 620, en: 130, atk: 66, def: 85, mob: 55, move: 4,
    lore: 'Upgraded with a riot shield forged from old jeepney bumpers. Nobody gets past the barangay hall.',
    weapons: [
      { name: 'Tanod Carbine', power: 80, min: 1, max: 3, en: 0, hit: 78, crit: 5, fx: 'beam' },
      { name: 'Bumper Shield Bash', power: 95, min: 1, max: 1, en: 10, hit: 85, crit: 10, fx: 'slash' },
      { name: 'Barangay Wall Cannon', power: 190, min: 2, max: 4, en: 45, hit: 78, crit: 15, ult: true, fx: 'mega' },
    ],
    look: { img: tanodCustomImg, head: 'tanod', torso: 'heavy', arms: 'heavy', legs: 'heavy', pack: 'thrusters', weapon: 'shield', colors: { p: '#1e3a8a', s: '#e2e8f0', a: '#f59e0b', e: '#67e8f9' } },
  },
  agilaMk2: {
    id: 'agilaMk2', name: 'AGL-2 Agila Mk-II', short: 'Agila Mk-II', cls: 'Attacker', rarity: 'SR', faction: 'Bayanihan',
    hp: 560, en: 150, atk: 88, def: 65, mob: 82, move: 5,
    lore: 'Modeled on the Haring Ibon (Philippine eagle). Fast, proud, and endangered on the battlefield.',
    weapons: [
      { name: 'Talon Beam Rifle', power: 105, min: 1, max: 3, en: 0, hit: 78, crit: 10, fx: 'beam' },
      { name: 'Feather Vulcans', power: 70, min: 1, max: 2, en: 0, hit: 86, crit: 5, fx: 'shot' },
      { name: 'Haring Ibon Dive', power: 230, min: 1, max: 3, en: 55, hit: 82, crit: 25, ult: true, fx: 'mega' },
    ],
    look: { img: agilaImg, head: 'agila', torso: 'slim', arms: 'standard', legs: 'thruster', pack: 'eagle', weapon: 'rifle', colors: { p: '#f8fafc', s: '#78350f', a: '#fbbf24', e: '#fde047' } },
  },
  sarimanokZ: {
    id: 'sarimanokZ', name: 'SRM-Z Sarimanok Zeta', short: 'Sarimanok Z', cls: 'Attacker', rarity: 'SSR', faction: 'Bayanihan',
    hp: 680, en: 180, atk: 108, def: 72, mob: 98, move: 6,
    lore: 'The legendary bird of fortune from Lanao, rebuilt as a prism-plumed super frame. Good luck for allies, very bad luck for enemies.',
    weapons: [
      { name: 'Prism Beam Rifle', power: 125, min: 1, max: 4, en: 0, hit: 80, crit: 12, fx: 'beam' },
      { name: 'Kampilan Saber', power: 140, min: 1, max: 1, en: 10, hit: 86, crit: 18, fx: 'slash' },
      { name: 'Bahaghari Burst', power: 290, min: 2, max: 5, en: 70, hit: 85, crit: 30, ult: true, fx: 'rainbow' },
    ],
    look: { img: sarimanokImg, head: 'sarimanok', torso: 'slim', arms: 'blade', legs: 'thruster', pack: 'plume', weapon: 'sword', colors: { p: '#f8fafc', s: '#dc2626', a: '#16a34a', e: '#22d3ee' } },
  },
  kapreGrunt: {
    id: 'kapreGrunt', name: 'KPR-06 Kapre', short: 'Kapre', cls: 'Attacker', rarity: 'R', faction: 'Dilim',
    hp: 470, en: 110, atk: 72, def: 58, mob: 58, move: 4,
    lore: 'Hulking tree-giant frame of the Dilim Legion. Its smoke stacks glow like embers in a balete tree.',
    weapons: [
      { name: 'Usok Machine Gun', power: 80, min: 1, max: 3, en: 0, hit: 72, crit: 6, fx: 'shot' },
      { name: 'Balete Axe', power: 100, min: 1, max: 1, en: 0, hit: 80, crit: 10, fx: 'slash' },
      { name: 'Higanteng Hampas', power: 180, min: 1, max: 2, en: 40, hit: 78, crit: 18, ult: true, fx: 'mega' },
    ],
    look: { img: kapreImg, liberatedHue: 180, head: 'kapre', torso: 'heavy', arms: 'heavy', legs: 'standard', pack: 'thrusters', weapon: 'axe', colors: { p: '#166534', s: '#57534e', a: '#f97316', e: '#fb923c' } },
  },
  tikbalangCustom: {
    id: 'tikbalangCustom', name: 'TKB-07 Tikbalang Custom', short: 'Tikbalang C', cls: 'Attacker', rarity: 'SR', faction: 'Dilim',
    hp: 560, en: 130, atk: 90, def: 66, mob: 78, move: 5,
    lore: 'Horse-headed trickster frame. Pilots say it makes you lose your way — wear your shirt inside-out.',
    weapons: [
      { name: 'Heat Whip', power: 110, min: 1, max: 2, en: 0, hit: 80, crit: 12, fx: 'slash' },
      { name: 'Hoof Cannon', power: 95, min: 2, max: 3, en: 10, hit: 72, crit: 8, fx: 'missile' },
      { name: 'Ligaw na Daan', power: 220, min: 1, max: 2, en: 50, hit: 86, crit: 25, ult: true, fx: 'mega' },
    ],
    look: { img: tikbalangImg, liberatedHue: 180, head: 'tikbalang', torso: 'standard', arms: 'claw', legs: 'heavy', pack: 'thrusters', weapon: 'whip', colors: { p: '#334155', s: '#7c2d12', a: '#38bdf8', e: '#ef4444' } },
  },
  manananggal: {
    id: 'manananggal', name: 'MNG-14 Manananggal', short: 'Manananggal', cls: 'Attacker', rarity: 'SR', faction: 'Dilim',
    hp: 600, en: 150, atk: 96, def: 68, mob: 86, move: 6,
    lore: 'Splits from its lower frame at night and hunts on bat wings. Keep garlic in the cockpit.',
    weapons: [
      { name: 'Dila Beam Lance', power: 115, min: 1, max: 2, en: 0, hit: 80, crit: 14, fx: 'beam' },
      { name: 'Bat-Wing Funnels', power: 100, min: 2, max: 4, en: 15, hit: 75, crit: 10, fx: 'missile' },
      { name: 'Hating-Gabi Hunt', power: 245, min: 1, max: 4, en: 60, hit: 82, crit: 28, ult: true, fx: 'mega' },
    ],
    look: { img: manananggalImg, liberatedHue: 260, head: 'manananggal', torso: 'slim', arms: 'claw', legs: 'none', pack: 'batwings', weapon: 'lance', colors: { p: '#4c1d95', s: '#1e1b4b', a: '#f43f5e', e: '#fb7185' } },
  },
  bakunawa: {
    id: 'bakunawa', name: 'BKN-04 Bakunawa', short: 'Bakunawa', cls: 'Defender', rarity: 'SSR', faction: 'Dilim',
    hp: 900, en: 200, atk: 112, def: 98, mob: 70, move: 5,
    lore: 'The moon-eating sea serpent as a fortress-class super frame. When it rises, the sky goes dark and every pot gets banged.',
    weapons: [
      { name: 'Buwan Mega Particle', power: 130, min: 2, max: 4, en: 0, hit: 78, crit: 12, fx: 'beam' },
      { name: 'Serpent Fang', power: 90, min: 1, max: 1, en: 0, hit: 82, crit: 10, fx: 'slash' },
      { name: 'Eklipse Devourer', power: 300, min: 1, max: 5, en: 80, hit: 82, crit: 30, ult: true, fx: 'mega' },
    ],
    look: { img: bakunawaImg, liberatedHue: 210, head: 'bakunawa', torso: 'heavy', arms: 'heavy', legs: 'heavy', pack: 'serpent', weapon: 'shield', colors: { p: '#991b1b', s: '#0f172a', a: '#f59e0b', e: '#fde047' } },
  },
  jeepneyKaiser: {
    id: 'jeepneyKaiser', name: 'JPY-78 Jeepney Kaiser', short: 'Jeepney Kaiser', cls: 'Attacker', rarity: 'SR', faction: 'Bayanihan',
    hp: 600, en: 140, atk: 92, def: 70, mob: 76, move: 5,
    lore: 'King of the road, now king of the sky. Chrome horses on the hood, sabit-ready running boards, and a horn that can crack armor.',
    weapons: [
      { name: 'Busina Beam Rifle', power: 110, min: 1, max: 3, en: 0, hit: 80, crit: 10, fx: 'beam' },
      { name: 'Estribo Saber', power: 125, min: 1, max: 1, en: 10, hit: 86, crit: 15, fx: 'slash' },
      { name: 'Para Po! Full Throttle', power: 240, min: 1, max: 3, en: 55, hit: 82, crit: 25, ult: true, fx: 'mega' },
    ],
    look: { img: jeepneyKaiserImg, head: 'jeep', torso: 'jeepney', arms: 'standard', legs: 'standard', pack: 'thrusters', weapon: 'rifle', colors: { p: '#cbd5e1', s: '#dc2626', a: '#facc15', e: '#22d3ee' } },
  },
};

export const STARTER_MECHA = ['tanod01', 'kapreGrunt', 'jeepneyKaiser'];

// ---------- Pilots ----------
export const PILOTS = {
  migo: {
    id: 'migo', name: 'Migo Santos', rarity: 'SR', title: 'Batang Probinsya Ace',
    story: 'Grew up in a Nueva Ecija rice barrio fixing his late father\'s half-built jeepney. When the Dilim Legion burned the harvest, he hot-wired the Jeepney Kaiser prototype — wearing the anting-anting his Lola swore protects those who protect others.',
    skill: { id: 'newtype', name: 'Anting-Anting', desc: '+20% Hit & Evasion.' },
    stats: { atk: 6, def: 4, mob: 10 },
    img: pilotMigoImg,
    look: { skin: '#c68642', hair: '#111827', style: 'spiky', acc: 'headband', accColor: '#dc2626', suit: '#1d4ed8' },
  },
  kapitanPula: {
    id: 'kapitanPula', name: 'Kapitan Pula', rarity: 'SSR', title: 'The Red Captain',
    story: 'Once the Dilim Legion\'s most feared ace. He defected the night Datu Dilim ordered the fishing villages of Manila Bay plunged into darkness — his mother\'s village. He still wears her red cap.',
    skill: { id: 'redcomet', name: 'Pulang Kidlat', desc: '+1 Move, +20% Crit Rate.' },
    stats: { atk: 12, def: 4, mob: 12 },
    look: { skin: '#e0ac69', hair: '#fbbf24', style: 'short', acc: 'cap', accColor: '#b91c1c', suit: '#991b1b' },
  },
  tisoy: {
    id: 'tisoy', name: 'Tisoy Ramos', rarity: 'R', title: 'Tirador ng Tondo',
    story: 'A mestizo street kid from Tondo who never lost a tirador (slingshot) contest. He sends every peso of pilot pay home to his little siblings, and never wastes a shot.',
    skill: { id: 'sniper', name: 'Tirador', desc: '+15% Support Attack damage.' },
    stats: { atk: 5, def: 2, mob: 6 },
    look: { skin: '#f1c27d', hair: '#7c2d12', style: 'short', acc: 'bandana', accColor: '#16a34a', suit: '#065f46' },
  },
  berto: {
    id: 'berto', name: 'Mang Berto', rarity: 'R', title: 'Beteranong Drayber',
    story: 'Drove the Cubao–Quiapo jeepney route for thirty years. When the orbital skyway fell, he ferried survivors out through the debris in his old jeep. Calm, stubborn, and impossible to rattle.',
    skill: { id: 'veteran', name: 'Beterano', desc: '+20% DEF.' },
    stats: { atk: 4, def: 10, mob: 2 },
    look: { skin: '#8d5524', hair: '#9ca3af', style: 'bald', acc: 'towel', accColor: '#f8fafc', suit: '#57534e' },
  },
  inday: {
    id: 'inday', name: 'Inday Kidlat', rarity: 'SR', title: 'Spitfire ng Visayas',
    story: 'A Dinagyang festival dancer from Iloilo. Lightning struck her family\'s boat during a storm — she survived with uncanny reflexes and a fighting spirit that grows with every beat of the drum.',
    skill: { id: 'biosensor', name: 'Dugong Bayani', desc: 'Double Tension gain from hits & kills.' },
    stats: { atk: 8, def: 3, mob: 9 },
    look: { skin: '#c68642', hair: '#111827', style: 'bun', acc: 'clip', accColor: '#f472b6', suit: '#7e22ce' },
  },
  diwata: {
    id: 'diwata', name: 'Reyna Diwata', rarity: 'SSR', title: 'Diwata ng Bundok',
    story: 'The last diwata of Bundok Kalinaw, asleep for a thousand years until the Dilim Legion began cutting her sacred forest to build war machines. She fights so the trees will stop crying.',
    skill: { id: 'pressure', name: 'Titig ng Diwata', desc: 'Enemies within 2 tiles suffer -15% Hit.' },
    stats: { atk: 10, def: 8, mob: 8 },
    img: pilotDiwataImg,
    look: { skin: '#e0ac69', hair: '#065f46', style: 'long', acc: 'tiara', accColor: '#fde047', suit: '#14532d' },
  },
  kadete: {
    id: 'kadete', name: 'Kadete (Auto Pilot)', rarity: 'R', title: 'Academy Trainee', hidden: true,
    story: 'A fresh academy graduate who learned everything from the manual. Still learning.',
    skill: { id: 'none', name: 'No Skill', desc: 'A rookie. Does what the manual says.' },
    stats: { atk: 0, def: 0, mob: 0 },
    look: { skin: '#d1a374', hair: '#1f2937', style: 'short', acc: 'none', accColor: '#000', suit: '#475569' },
  },
  grunt: {
    id: 'grunt', name: 'Dilim Soldier', rarity: 'R', title: 'Dilim Legion', hidden: true,
    story: 'A conscript of the Dilim Legion, fighting in the dark.',
    skill: { id: 'none', name: 'No Skill', desc: '' },
    stats: { atk: 0, def: 0, mob: 0 },
    look: { skin: '#a8a29e', hair: '#1f2937', style: 'short', acc: 'visor', accColor: '#ef4444', suit: '#3f3f46' },
  },
  datuDilim: {
    id: 'datuDilim', name: 'Datu Dilim', rarity: 'SSR', title: 'Lord of the Eclipse', hidden: true,
    story: 'An ancient chieftain who taught the Bakunawa its hunger. Seven moons once lit the islands; he believes that when the last one is eaten, hope — and war — will end forever.',
    skill: { id: 'boss', name: 'Eklipse Aura', desc: 'Enemies within 2 tiles suffer -15% Hit. +20% DEF.' },
    stats: { atk: 18, def: 10, mob: 10 },
    look: { skin: '#78716c', hair: '#f8fafc', style: 'long', acc: 'crown', accColor: '#f59e0b', suit: '#450a0a' },
  },
};

export const STARTER_PILOTS = ['migo', 'tisoy', 'berto'];

// ---------- Tech tree ----------
export const TECH_TREE = [
  { line: 'Bayanihan Line', color: '#22d3ee', nodes: [
    { id: 'tanod01' },
    { id: 'tanodCustom', from: 'tanod01', capital: 2500, bp: 15 },
    { id: 'agilaMk2', from: 'tanodCustom', capital: 5000, bp: 30 },
    { id: 'sarimanokZ', from: 'agilaMk2', capital: 9000, bp: 60 },
  ] },
  { line: 'Dilim Line (captured tech)', color: '#f59e0b', nodes: [
    { id: 'kapreGrunt' },
    { id: 'tikbalangCustom', from: 'kapreGrunt', capital: 2500, bp: 15 },
    { id: 'manananggal', from: 'tikbalangCustom', capital: 5000, bp: 30 },
    { id: 'bakunawa', from: 'manananggal', capital: 9000, bp: 60 },
  ] },
];

// ---------- Gacha ----------
export const GACHA_POOL = {
  R: [{ type: 'mecha', id: 'tanod01' }, { type: 'mecha', id: 'kapreGrunt' }, { type: 'pilot', id: 'tisoy' }, { type: 'pilot', id: 'berto' }],
  SR: [{ type: 'mecha', id: 'tanodCustom' }, { type: 'mecha', id: 'tikbalangCustom' }, { type: 'mecha', id: 'agilaMk2' }, { type: 'mecha', id: 'manananggal' }, { type: 'mecha', id: 'jeepneyKaiser' }, { type: 'pilot', id: 'migo' }, { type: 'pilot', id: 'inday' }],
  SSR: [{ type: 'mecha', id: 'sarimanokZ' }, { type: 'mecha', id: 'bakunawa' }, { type: 'pilot', id: 'kapitanPula' }, { type: 'pilot', id: 'diwata' }],
};
export const GACHA_RATES = { SSR: 0.05, SR: 0.25, R: 0.70 };
export const PITY_LIMIT = 30;
export const DUPE_REWARD = { R: { capital: 500, bp: 2 }, SR: { capital: 1500, bp: 6 }, SSR: { capital: 3000, bp: 20 } };
export const PULL_COST = { single: 300, ten: 3000 };

// ---------- Stages ----------
export const STAGES = [
  {
    id: 's1', num: 1, name: 'Orbital EDSA Skirmish', sub: 'Tutorial-friendly 3v3 debris-field brawl',
    desc: 'A Dilim scouting squad is raiding the orbital skyway above EDSA. Jeepney wrecks float everywhere — use them for cover.',
    maxDeploy: 3, scale: 1.0,
    map: [
      '..#.....',
      '.....#..',
      '..#....#',
      '........',
      '.#...#..',
      '....#...',
      '..H.....',
      '........',
    ],
    playerSpawns: [[2, 7], [4, 7], [6, 7]],
    enemies: [
      { mecha: 'kapreGrunt', pilot: 'grunt', x: 1, y: 0 },
      { mecha: 'kapreGrunt', pilot: 'grunt', x: 4, y: 0 },
      { mecha: 'kapreGrunt', pilot: 'grunt', x: 6, y: 1 },
    ],
    reward: { capital: 1500, bp: 6, diamonds: 100 }, firstClear: { diamonds: 600, capital: 1000, bp: 6 },
    bg: 'from-indigo-950 via-slate-950 to-slate-900', art: bgStage1Img,
  },
  {
    id: 's2', num: 2, name: 'Divisoria Underground', sub: '4v5 defense with healing Talyer bays',
    desc: 'The Dilim Legion is tunneling under the Divisoria market. Hold the line — the Talyer repair bays restore 15% HP/EN each turn.',
    maxDeploy: 4, scale: 1.15, requires: 's1',
    map: [
      '#..##..#',
      '........',
      '.#....#.',
      '...##...',
      '........',
      '.#....#.',
      '..H..H..',
      '#......#',
    ],
    playerSpawns: [[2, 7], [3, 7], [4, 7], [5, 7]],
    enemies: [
      { mecha: 'kapreGrunt', pilot: 'grunt', x: 1, y: 0 },
      { mecha: 'kapreGrunt', pilot: 'grunt', x: 6, y: 0 },
      { mecha: 'tikbalangCustom', pilot: 'grunt', x: 2, y: 0 },
      { mecha: 'tikbalangCustom', pilot: 'grunt', x: 5, y: 0 },
      { mecha: 'kapreGrunt', pilot: 'grunt', x: 3, y: 1 },
    ],
    reward: { capital: 2500, bp: 12, diamonds: 150 }, firstClear: { diamonds: 900, capital: 2000, bp: 12 },
    bg: 'from-stone-950 via-slate-950 to-amber-950', art: bgStage2Img,
  },
  {
    id: 's3', num: 3, name: 'Bakunawa Eclipse', sub: '4v6 boss battle vs. the moon-eater',
    desc: 'Datu Dilim has awakened the Bakunawa super frame to swallow the moon. Bang every pot you have — and bring it down!',
    maxDeploy: 4, scale: 1.0, requires: 's2',
    map: [
      '...##...',
      '.#....#.',
      '........',
      '#..H...#',
      '...#....',
      '.#....#.',
      '..H..H..',
      '........',
    ],
    playerSpawns: [[1, 7], [3, 7], [4, 7], [6, 7]],
    enemies: [
      { mecha: 'bakunawa', pilot: 'datuDilim', x: 3, y: 0, boss: true },
      { mecha: 'manananggal', pilot: 'grunt', x: 5, y: 1 },
      { mecha: 'tikbalangCustom', pilot: 'grunt', x: 1, y: 1 },
      { mecha: 'kapreGrunt', pilot: 'grunt', x: 6, y: 2 },
      { mecha: 'kapreGrunt', pilot: 'grunt', x: 0, y: 2 },
      { mecha: 'kapreGrunt', pilot: 'grunt', x: 7, y: 2 },
    ],
    reward: { capital: 5000, bp: 25, diamonds: 300 }, firstClear: { diamonds: 1500, capital: 4000, bp: 25 },
    bg: 'from-rose-950 via-slate-950 to-black', art: bgStage3Img,
  },
];

// ---------- Workshop (Create Your Own Mecha) ----------
export const BASE_CUSTOM = { hp: 380, en: 110, atk: 60, def: 50, mob: 55, move: 4 };

export const PARTS = {
  head: [
    { id: 'salakot', name: 'Salakot Helm', mod: { def: 10 } },
    { id: 'tanod', name: 'Tanod Cap', mod: { en: 20 } },
    { id: 'jeep', name: 'Jeepney Hood', mod: { atk: 5, def: 5 } },
    { id: 'sarimanok', name: 'Sarimanok Crest', mod: { atk: 8 } },
    { id: 'agila', name: 'Agila Crest', mod: { mob: 8 } },
    { id: 'kapre', name: 'Kapre Horns', mod: { hp: 40 } },
    { id: 'tikbalang', name: 'Tikbalang Snout', mod: { mob: 6, atk: 3 } },
    { id: 'manananggal', name: 'Manananggal Mane', mod: { atk: 10, def: -3 } },
    { id: 'bakunawa', name: 'Bakunawa Jaw', mod: { def: 8, en: 15 } },
    { id: 'visor', name: 'Bantay Visor', mod: { mob: 4, en: 10 } },
  ],
  torso: [
    { id: 'standard', name: 'Standard Frame', mod: { hp: 100, def: 10 } },
    { id: 'heavy', name: 'Heavy Frame', mod: { hp: 220, def: 30, mob: -10 } },
    { id: 'slim', name: 'Slim Frame', mod: { hp: 60, mob: 20 } },
    { id: 'jeepney', name: 'Jeepney Grille Frame', mod: { hp: 150, def: 15, atk: 10, mob: -5 } },
  ],
  arms: [
    { id: 'standard', name: 'Standard Arms', mod: { atk: 10 } },
    { id: 'heavy', name: 'Heavy Arms', mod: { atk: 5, def: 15 } },
    { id: 'blade', name: 'Blade Arms', mod: { atk: 22, def: -5 } },
    { id: 'claw', name: 'Claw Arms', mod: { atk: 16, mob: 5 } },
  ],
  legs: [
    { id: 'standard', name: 'Standard Legs', mod: { mob: 5 } },
    { id: 'heavy', name: 'Heavy Legs', mod: { hp: 60, def: 15, mob: -5 } },
    { id: 'thruster', name: 'Thruster Legs', mod: { mob: 15, move: 1 } },
    { id: 'none', name: 'Float Core (no legs)', mod: { mob: 20, move: 1, hp: -40 } },
  ],
  pack: [
    { id: 'none', name: 'No Backpack', mod: {} },
    { id: 'thrusters', name: 'Twin Thrusters', mod: { mob: 10, en: 20 } },
    { id: 'banca', name: 'Bangka Outrigger', mod: { en: 40, def: 5 } },
    { id: 'eagle', name: 'Agila Wings', mod: { mob: 15, en: 10 } },
    { id: 'plume', name: 'Bahaghari Plume', mod: { atk: 10, mob: 10 } },
    { id: 'batwings', name: 'Bat Wings', mod: { mob: 20, hp: -20 } },
    { id: 'serpent', name: 'Serpent Coil', mod: { en: 30, def: 10 } },
  ],
};

export const CUSTOM_WEAPONS = [
  { id: 'rifle', name: 'Beam Rifle', power: 105, min: 1, max: 3, en: 0, hit: 78, crit: 10, fx: 'beam', held: 'rifle' },
  { id: 'bolo', name: 'Bolo Saber', power: 125, min: 1, max: 1, en: 10, hit: 85, crit: 15, fx: 'slash', held: 'sword' },
  { id: 'arnis', name: 'Arnis Twin Batons', power: 95, min: 1, max: 1, en: 0, hit: 90, crit: 20, fx: 'slash', held: 'sticks' },
  { id: 'lantaka', name: 'Lantaka Cannon', power: 115, min: 2, max: 4, en: 15, hit: 70, crit: 8, fx: 'missile', held: 'cannon' },
  { id: 'sumpit', name: 'Sumpit Needle Gun', power: 85, min: 1, max: 4, en: 5, hit: 82, crit: 12, fx: 'shot', held: 'rifle' },
  { id: 'pana', name: 'Pana Missiles', power: 100, min: 2, max: 5, en: 15, hit: 72, crit: 10, fx: 'missile', held: 'cannon' },
  { id: 'kampilan', name: 'Kampilan Greatblade', power: 135, min: 1, max: 1, en: 15, hit: 80, crit: 18, fx: 'slash', held: 'sword' },
];

export const CUSTOM_ULTS = [
  { id: 'bayanihan', name: 'Bayanihan Buster', power: 240, min: 1, max: 3, en: 55, hit: 82, crit: 25, ult: true, fx: 'mega' },
  { id: 'bagyo', name: 'Bagyo Typhoon Spin', power: 230, min: 1, max: 2, en: 50, hit: 90, crit: 25, ult: true, fx: 'mega' },
  { id: 'lantakaGiga', name: 'Lantaka Gigacannon', power: 260, min: 2, max: 5, en: 70, hit: 78, crit: 20, ult: true, fx: 'mega' },
  { id: 'sinag', name: 'Sinag Solar Beam', power: 250, min: 1, max: 4, en: 60, hit: 82, crit: 22, ult: true, fx: 'rainbow' },
];

export const COLOR_PRESETS = [
  { name: 'Jeepney Fiesta', colors: { p: '#cbd5e1', s: '#dc2626', a: '#facc15', e: '#22d3ee' } },
  { name: 'Watawat', colors: { p: '#f8fafc', s: '#1d4ed8', a: '#dc2626', e: '#fde047' } },
  { name: 'Halo-Halo', colors: { p: '#c084fc', s: '#fef3c7', a: '#f472b6', e: '#22d3ee' } },
  { name: 'Tanod Night', colors: { p: '#1e3a8a', s: '#e2e8f0', a: '#f59e0b', e: '#67e8f9' } },
  { name: 'Kapre Balete', colors: { p: '#166534', s: '#57534e', a: '#f97316', e: '#fb923c' } },
  { name: 'Ube Eclipse', colors: { p: '#4c1d95', s: '#1e1b4b', a: '#f43f5e', e: '#fb7185' } },
  { name: 'Mangga Gold', colors: { p: '#facc15', s: '#15803d', a: '#f97316', e: '#22d3ee' } },
  { name: 'Tricycle Chrome', colors: { p: '#94a3b8', s: '#0f172a', a: '#22c55e', e: '#a3e635' } },
];

export const CUSTOM_COST = { capital: 2000, bp: 10 };
export const CUSTOM_LIMIT = 6;

// ---------- Voice-over cues ----------
export const VOICE_CUES = [
  { id: 'sortie', name: 'Sortie / Deploy' },
  { id: 'attack', name: 'Attack' },
  { id: 'counter', name: 'Counter-Attack' },
  { id: 'evade', name: 'Evasion' },
  { id: 'guard', name: 'Support Defense' },
  { id: 'hit', name: 'Taking Damage' },
  { id: 'ultimate', name: 'Ultimate Monologue' },
  { id: 'chain', name: 'Chain Step' },
  { id: 'destroyed', name: 'Destroyed' },
  { id: 'victory', name: 'Victory' },
  { id: 'defeat', name: 'Defeat' },
];

export const VOICE_LINES = {
  migo: { sortie: 'Migo Santos, lalarga na! Para sa barrio!', attack: 'Para sa mga palayang sinunog n\'yo!', counter: 'Akala mo tapos na? Sagot ko \'to!', evade: 'Hindi mo ako matatamaan — may anting-anting ako!', guard: 'Ako na ang sasalo, kasama!', hit: 'Aray! Kaya pa \'to, Itay!', ultimate: 'Itay, ito na \'yung jeep na pinangarap mong buuin. Lola, sa anting-anting mo ako kumakapit. Para sa bawat barrio na sinunog nila... ilalabas ko na ang lahat!', chain: 'Isa pa! Hindi pa tapos ang ani!', destroyed: 'Lola... pasensya na...', victory: 'Panalo tayo! Bayanihan!', defeat: 'Babawi tayo. Itatanim ulit natin ang lahat.' },
  kapitanPula: { sortie: 'Kapitan Pula, sasabak. Ngayon, para sa liwanag.', attack: 'Kilala ko ang bawat galaw ng Dilim!', counter: 'Ako ang nagturo n\'yan sa inyo!', evade: 'Masyado kang mabagal, dating kasama.', guard: 'Hindi ko na hahayaang may mawala pa.', hit: 'Galos lang \'yan.', ultimate: 'Dati, pinaglingkuran ko ang dilim. Nakita ko kung paano nila nilamon ang mga ilaw ng Manila Bay — ang baryo ng nanay ko. Hindi na mauulit. Pulang Kidlat... ngayon, para sa liwanag!', chain: 'Sunod-sunod lang \'yan!', destroyed: 'Inay... sana sapat na ang ginawa ko...', victory: 'Ganyan ang tunay na kapitan.', defeat: 'Umatras muna tayo. Hindi pa ito ang huli.' },
  tisoy: { sortie: 'Tisoy, naka-posisyon na! Tondo represent!', attack: 'Isang bato, isang tama, pare!', counter: 'Uy, ako naman!', evade: 'Sanay akong umilag sa tsinelas ni Nanay!', guard: 'Takpan kita, tol!', hit: 'Uy, masakit \'yon!', ultimate: 'Sa Tondo, isang bato lang ang meron ka. Kaya dapat tama ang tama. Para kina Bunso na naghihintay sa bahay... isang tira, isang tagumpay!', chain: 'Sabay-sabay tayo!', destroyed: 'Bunso... uwi na si Kuya...', victory: 'Sisiw lang! Pang-merienda \'to!', defeat: 'Grabe, talo tayo... sorry, Bunso.' },
  berto: { sortie: 'Si Mang Berto \'to, hijo. Sakay na kayo.', attack: 'Kabisado ko ang bawat lubak ng daang \'to!', counter: 'Huwag mong sisingitan ang beterano!', evade: 'Tatlumpung taon akong umiwas sa butas ng kalsada!', guard: 'Sa likod ko kayo, mga anak!', hit: 'Matibay pa ang lumang bakal!', ultimate: 'Tatlumpung taon kong minaneho ang ruta ng Cubao. Hindi ako umatras sa baha, sa trapik, sa bagyo. Hindi rin ako aatras sa inyo. Mga pasahero ko kayong lahat — ihahatid ko kayo nang buhay!', chain: 'Hindi pa ako tapos, hijo!', destroyed: 'Mga anak... kayo na ang magmaneho...', victory: 'Kain tayo pagkatapos nito! Libre ko!', defeat: 'Sayang... pero babangon tayo bukas.' },
  inday: { sortie: 'Inday Kidlat, ready na po! Hala bira!', attack: 'Hiyaaa! Sayaw ng kidlat!', counter: 'Ay, ganun? Eto sa\'yo!', evade: 'Mas mabilis pa ako sa tambol ng Dinagyang!', guard: 'Ako bahala, Ate, Kuya!', hit: 'Ay, kabayo!', ultimate: 'Noong gabing tinamaan ng kidlat ang bangka namin, akala ko katapusan ko na. Pero nabuhay ako — at sumabay ang kidlat sa dugo ko! Sa Dinagyang, sumasayaw kami sa dagundong ng tambol. Ngayon, ang puso ko ang tambol!', chain: 'Ang saya! Isa pa!', destroyed: 'Hindi... pa ako... tapos sumayaw...', victory: 'Yehey! Panalo! Hala bira!', defeat: 'Iiyak muna ako saglit... tapos laban ulit!' },
  diwata: { sortie: 'Ang Reyna ng Bundok Kalinaw ay gising na.', attack: 'Lumuhod ka sa harap ng gubat.', counter: 'Ang bundok ay sumasagot.', evade: 'Hindi mo mahahawakan ang hangin.', guard: 'Sumilong kayo sa aking mga ugat.', hit: 'Lapastangan!', ultimate: 'Libong taon akong nagbantay sa bundok. Nakita kong umiyak ang mga puno sa ilalim ng inyong bakal. Pinutol ninyo ang aking gubat para gumawa ng mga makinang pandigma. Ngayon, malalaman ninyo kung bakit natatakot ang tao sa dilim ng kagubatan!', chain: 'Hindi pa sapat.', destroyed: 'Ang gubat ay... maghihintay...', victory: 'Ganyan ang biyaya ng kalikasan.', defeat: 'Babalik ako, kasama ang mga ugat ng bundok.' },
  kadete: { sortie: 'Kadete, handa na!', attack: 'Tira!', counter: 'Counter-attack!', evade: 'Iwas!', guard: 'Ako na ang sasalo!', hit: 'Tinamaan ako!', ultimate: 'Sabi sa manual: kapag puno na ang Tension, ibigay ang lahat! Ultimate attack!', chain: 'Isa pa!', destroyed: 'Eject! Eject!', victory: 'Mission complete!', defeat: 'Retreat!' },
  grunt: { sortie: 'Para sa Dilim!', attack: 'Durugin sila!', counter: 'Gumanti kayo!', evade: 'Muntik na!', guard: 'Takpan ang kasama!', hit: 'Ugh! Tinamaan ako!', ultimate: 'Para sa Datu! Ibigay ang lahat ng lakas!', chain: 'Isa pa!', destroyed: 'Datu... patawad...', victory: 'Panalo ang Dilim!', defeat: 'Umatras!' },
  datuDilim: { sortie: 'Kakainin ko ang buwan... at kayo!', attack: 'Walang liwanag para sa inyo!', counter: 'Mangahas kayong lumapit?', evade: 'Ang anino ay hindi natatamaan.', guard: 'Protektahan ang Bakunawa!', hit: 'Isang kagat lang \'yan!', ultimate: 'Pitong buwan ang lumiwanag sa langit noon. Isa-isa silang nilamon ng Bakunawa — at ako ang nagturo sa kanya ng gutom. Kapag wala nang liwanag, wala nang pag-asa. At kapag wala nang pag-asa, wala nang digmaan. Ngayong gabi, ang huling buwan!', chain: 'Higit pa!', destroyed: 'Ang buwan... nakatakas... muli...', victory: 'Dilim ang hari!', defeat: 'Hindi pa ito ang wakas!' },
};

export const VOICE_PILOTS = ['migo', 'kapitanPula', 'tisoy', 'berto', 'inday', 'diwata', 'kadete', 'grunt', 'datuDilim'];

export const VOICE_DEFAULTS = {
  migo: { pitch: 1.0, rate: 1.05 }, kapitanPula: { pitch: 0.85, rate: 1.0 }, tisoy: { pitch: 1.1, rate: 1.1 },
  berto: { pitch: 0.7, rate: 0.9 }, inday: { pitch: 1.45, rate: 1.1 }, diwata: { pitch: 1.2, rate: 0.85 },
  kadete: { pitch: 1.0, rate: 1.0 }, grunt: { pitch: 0.6, rate: 1.05 }, datuDilim: { pitch: 0.5, rate: 0.8 },
};

// ---------- Art prompt cues ----------
const STYLE = 'SD chibi super-deformed mecha game sprite, big head small body, cel-shaded, clean thick dark outlines, vibrant saturated colors, glowing thruster flames, front three-quarter view, full body, plain transparent background, original design, no text, no logos';
const PILOT_STYLE = 'anime chibi pilot portrait bust, Filipino character, expressive face, clean cel shading, thick outlines, warm rim light, plain transparent background, original character, no text';

export const ART_CUES = [
  { group: 'Mecha', file: 'mecha_jeepney_kaiser.png', title: 'Jeepney Kaiser', prompt: `${STYLE}. A heroic robot built from a Filipino passenger jeepney: chrome silver armor, red and yellow racing stripes with a thin blue pinstripe, front grille chest plate, two round headlight eyes glowing cyan, two tiny chrome horse ornaments on its head, side mirrors on the shoulders, holding a beam rifle shaped like a jeepney horn.` },
  { group: 'Mecha', file: 'mecha_tanod_01.png', title: 'TND-01 Tanod', prompt: `${STYLE}. A cheerful barangay night-patrol robot: white armor with royal-blue trim, a peaked patrol cap helmet with a gold star badge, cyan twin eyes, a flashlight on the shoulder, holding a long baton-rifle.` },
  { group: 'Mecha', file: 'mecha_tanod_custom.png', title: 'TND-02 Tanod Custom', prompt: `${STYLE}. A heavy defender robot in navy blue and white with amber trim, peaked patrol cap helmet, bulky shoulders, a big riot shield made from a chrome jeepney bumper with a golden eight-ray sun emblem.` },
  { group: 'Mecha', file: 'mecha_agila_mk2.png', title: 'AGL-2 Agila Mk-II', prompt: `${STYLE}. A sleek attacker robot inspired by the Philippine eagle: white chest, brown feathered wing binders spread wide, a shaggy crest of feather fins on the head, a gold beak-shaped faceplate, yellow eyes, holding a talon-shaped beam rifle.` },
  { group: 'Mecha', file: 'mecha_sarimanok_zeta.png', title: 'SRM-Z Sarimanok Zeta', prompt: `${STYLE}. A legendary super robot inspired by the Maranao sarimanok bird: white armor with red and green accents, a tall ornate multicolor crest, a huge fan of rainbow prism tail feathers behind it, okir-style curling gold patterns, wielding a glowing kampilan sword.` },
  { group: 'Mecha', file: 'mecha_kapre.png', title: 'KPR-06 Kapre', prompt: `${STYLE}. A hulking forest-giant villain robot: dark green and bark-brown armor, short horns, glowing ember-orange eyes, smoking exhaust stacks on its back like a giant's cigar smoke, root-like cables, holding a big wooden-looking axe.` },
  { group: 'Mecha', file: 'mecha_tikbalang_custom.png', title: 'TKB-07 Tikbalang Custom', prompt: `${STYLE}. A tall trickster villain robot with a horse-shaped head and long mane of steel spikes, slate-gray and rust armor, red slanted eyes, clawed hands, hoof-shaped feet, cracking a glowing blue heat whip.` },
  { group: 'Mecha', file: 'mecha_manananggal.png', title: 'MNG-14 Manananggal', prompt: `${STYLE}. A spooky flying villain robot with only an upper body hovering on a purple flame trail, big bat-membrane wings, long flowing armored hair plates, small fangs on the faceplate, deep purple and midnight-blue armor with pink-red glowing eyes, holding a beam lance.` },
  { group: 'Mecha', file: 'mecha_bakunawa_boss.png', title: 'BKN-04 Bakunawa (Boss)', prompt: `${STYLE}. A giant boss robot inspired by the moon-eating sea serpent: crimson and black armor with gold trim, a dragon-serpent head with curved horns and fangs, a coiled serpent tail ring behind it, a crescent-moon shield, menacing yellow eyes, eclipse glow.` },
  { group: 'Mecha', file: 'mecha_custom_template.png', title: 'Your Custom Mecha (template)', prompt: `${STYLE}. A custom robot wearing a bamboo-pattern salakot hat helmet with a glowing visor, standard armored body, bangka outrigger boosters on its back, holding arnis twin batons. Colors: [PRIMARY], [SECONDARY], accent [ACCENT].` },
  { group: 'Pilots', file: 'pilot_migo_santos.png', title: 'Migo Santos', prompt: `${PILOT_STYLE}. A brave young provincial ace pilot, spiky black hair, red headband, blue pilot suit, determined grin, small anting-anting amulet necklace.` },
  { group: 'Pilots', file: 'pilot_kapitan_pula.png', title: 'Kapitan Pula', prompt: `${PILOT_STYLE}. A confident rival captain with short blond hair, a red captain's cap, crimson uniform with gold epaulets, smug smirk, lightning-bolt pin.` },
  { group: 'Pilots', file: 'pilot_tisoy_ramos.png', title: 'Tisoy Ramos', prompt: `${PILOT_STYLE}. A cheeky sharpshooter from Tondo with brown hair, green bandana, green pilot vest, slingshot tucked in his collar, winking.` },
  { group: 'Pilots', file: 'pilot_mang_berto.png', title: 'Mang Berto', prompt: `${PILOT_STYLE}. A kind veteran jeepney driver turned pilot, bald with gray stubble, white towel draped on his shoulder, gray work jacket, warm fatherly smile.` },
  { group: 'Pilots', file: 'pilot_inday_kidlat.png', title: 'Inday Kidlat', prompt: `${PILOT_STYLE}. An energetic Visayan girl pilot, black hair in a bun with a pink lightning clip, purple pilot suit, fist raised, crackling electricity.` },
  { group: 'Pilots', file: 'pilot_reyna_diwata.png', title: 'Reyna Diwata', prompt: `${PILOT_STYLE}. A regal mountain fairy queen pilot, long dark-green hair with leaves, golden tiara, green flowing robe-style pilot suit, calm piercing gaze, floating fireflies.` },
  { group: 'Pilots', file: 'pilot_datu_dilim.png', title: 'Datu Dilim (Villain)', prompt: `${PILOT_STYLE}. A menacing villain chieftain, long white hair, golden crown of crescent moons, dark crimson armor cloak, glowing eyes, eclipse behind him.` },
  { group: 'Stages', file: 'bg_stage1_orbital_edsa.png', title: 'Stage 1 — Orbital EDSA', prompt: 'Top-down tactical game battle map background, 8x8 hexagon grid friendly, outer space above Metro Manila at night, floating wrecked jeepneys and asteroid chunks, city lights below, stylized painterly, high contrast, no text, no UI.' },
  { group: 'Stages', file: 'bg_stage2_divisoria_underground.png', title: 'Stage 2 — Divisoria Underground', prompt: 'Top-down tactical game battle map background, 8x8 hexagon grid friendly, underground tunnels beneath a crowded Filipino market, rubble, tarpaulin banners, glowing talyer repair bays with tools, warm amber lights, stylized painterly, no text, no UI.' },
  { group: 'Stages', file: 'bg_stage3_bakunawa_eclipse.png', title: 'Stage 3 — Bakunawa Eclipse', prompt: 'Top-down tactical game battle map background, 8x8 hexagon grid friendly, dark sea and sky during a blood-red lunar eclipse, a giant serpent silhouette coiling around the moon, floating islands of debris, dramatic red glow, stylized painterly, no text, no UI.' },
  { group: 'UI & Key Art', file: 'ui_title_keyart.png', title: 'Title Key Art', prompt: 'Epic anime key art for a mobile tactical mecha game: a chrome jeepney robot, an eagle robot and a sarimanok robot posing heroically in space above the Philippine islands, a crimson serpent boss robot looming behind the moon, dynamic lighting, confetti of fiesta banderitas, leave empty space at top for a logo, no text.' },
  { group: 'UI & Key Art', file: 'ui_gacha_card_frames.png', title: 'Gacha Card Frames (R / SR / SSR)', prompt: 'Three vertical trading card frames side by side for a mecha gacha game: silver R frame, gold SR frame with banderitas pattern, prismatic rainbow SSR frame with okir curling ornaments and sparkles, empty center, transparent background, no text.' },
  { group: 'UI & Key Art', file: 'fx_chain_step_banner.png', title: 'CHAIN STEP! Banner', prompt: 'Glowing slanted game banner graphic, cyan and gold energy streaks, speed lines, sparks, empty middle area for the words CHAIN STEP, transparent background.' },
  { group: 'UI & Key Art', file: 'icon_app_512.png', title: 'App Icon', prompt: 'Square mobile game app icon, a chibi chrome jeepney robot head with glowing cyan headlight eyes and tiny chrome horse ornaments, bold outline, starfield background, rounded corners, no text.' },
];

const CUTIN_STYLE = 'dramatic anime mecha cockpit cut-in, wide 16:9 banner crop, pilot shouting toward the viewer, glowing cockpit monitors, diagonal speed lines, intense rim lighting, original character, no text, no logos';
export const CUTIN_ART_CUES = [
  { group: 'Cut-in Art', file: 'cutin_migo.png', title: 'Cut-in — Migo Santos', prompt: `${CUTIN_STYLE}. Young Filipino ace with spiky black hair and a red headband, an anting-anting amulet glowing at his chest, determined eyes, rice-field sunset reflected on the visor.` },
  { group: 'Cut-in Art', file: 'cutin_kapitanPula.png', title: 'Cut-in — Kapitan Pula', prompt: `${CUTIN_STYLE}. Confident blond captain in a faded red cap and crimson uniform, red lightning crackling around him, the lights of Manila Bay far below.` },
  { group: 'Cut-in Art', file: 'cutin_tisoy.png', title: 'Cut-in — Tisoy Ramos', prompt: `${CUTIN_STYLE}. Cheeky mestizo sharpshooter with a green bandana, one eye closed aiming through a targeting reticle, a slingshot charm hanging in the cockpit.` },
  { group: 'Cut-in Art', file: 'cutin_berto.png', title: 'Cut-in — Mang Berto', prompt: `${CUTIN_STYLE}. Calm bald veteran jeepney driver with gray stubble and a white towel on his shoulder, gripping the controls like a steering wheel, a rosary and route sign hanging from the dashboard.` },
  { group: 'Cut-in Art', file: 'cutin_inday.png', title: 'Cut-in — Inday Kidlat', prompt: `${CUTIN_STYLE}. Energetic Visayan girl with a black bun and pink lightning hair clip, electricity sparking from her hair, festival drum motifs glowing behind her.` },
  { group: 'Cut-in Art', file: 'cutin_diwata.png', title: 'Cut-in — Reyna Diwata', prompt: `${CUTIN_STYLE}. Regal forest-fairy queen with long dark-green hair woven with leaves and a golden tiara, eyes glowing emerald, roots and fireflies swirling through the cockpit.` },
  { group: 'Cut-in Art', file: 'cutin_datuDilim.png', title: 'Cut-in — Datu Dilim', prompt: `${CUTIN_STYLE}. Menacing ancient chieftain with long white hair and a crown of crescent moons, glowing eyes, a blood-red eclipse behind him and a serpent coiling in the shadows.` },
];
