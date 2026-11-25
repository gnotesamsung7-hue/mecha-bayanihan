import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { renderToStaticMarkup } from 'react-dom/server';
import { RotateCcw, RotateCw, Maximize, ArrowDownToLine } from 'lucide-react';
import { MechaSprite } from './Sprite.jsx';
import { TERRAIN } from './data.js';
import { key } from './combat.js';

// ---- hex geometry (pointy-top, odd-r offset rows) ----
const R = 0.5;
const W = Math.sqrt(3) * R;
let OFF_X = (9 + 0.5) * W / 2;
let OFF_Z = 9 * 0.75 * (2 * R) / 2;
function setDims(cols, rows) { OFF_X = ((cols - 1) + 0.5) * W / 2; OFF_Z = (rows - 1) * 0.75 * (2 * R) / 2; }
const HEIGHT = { space: 0.12, debris: 0.42, dock: 0.18 };
export function tilePos(x, y) { return new THREE.Vector3((x + 0.5 * (y & 1)) * W - OFF_X, 0, y * 1.5 * R - OFF_Z); }

// ---- textures ----
const texCache = new Map();
function mechaTexture(look) {
  const k = JSON.stringify(look);
  if (texCache.has(k)) return texCache.get(k);
  // artwork gets a wider canvas so winged / long-weapon art isn't shrunk
  const c = document.createElement('canvas'); c.width = look.img ? 384 : 256; c.height = 256;
  const glow = (g) => { if (look.aura) { g.shadowColor = '#fbbf24'; g.shadowBlur = 22; } };
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const img = new Image();
  img.onload = () => { const g = c.getContext('2d'); g.clearRect(0, 0, 256, 256); glow(g); g.drawImage(img, 8, 8, 240, 240); tex.needsUpdate = true; };
  if (look.img) {
    // draw the art directly, letterboxed into the square like the SVG does
    const raw = new Image();
    raw.onload = () => {
      const g = c.getContext('2d'); const s = Math.min(352 / raw.width, 234 / raw.height);
      const w = raw.width * s, h = raw.height * s;
      if (look.hue) g.filter = `hue-rotate(${look.hue}deg)`;
      glow(g);
      g.drawImage(raw, (384 - w) / 2, 256 - h - 10, w, h); tex.needsUpdate = true;
    };
    raw.src = look.img;
  } else {
    let svg = renderToStaticMarkup(<MechaSprite look={look} size={256} />);
    if (!svg.includes('xmlns=')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  texCache.set(k, tex);
  return tex;
}

function hpCanvas(u) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 24;
  drawHp(c, u);
  return c;
}
function drawHp(c, u) {
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 24);
  g.fillStyle = 'rgba(2,6,23,.85)'; g.fillRect(14, 8, 100, 10);
  const pct = Math.max(0, u.hp / u.maxHp);
  g.fillStyle = u.team === 'player' ? '#38bdf8' : '#f43f5e'; g.fillRect(16, 10, 96 * pct, 6);
  if (u.tension >= 200) { g.fillStyle = '#e879f9'; g.beginPath(); g.moveTo(120, 4); g.lineTo(114, 13); g.lineTo(119, 13); g.lineTo(115, 22); g.lineTo(124, 11); g.lineTo(119, 11); g.closePath(); g.fill(); }
  if (u.boss) { g.fillStyle = '#fbbf24'; g.beginPath(); g.moveTo(2, 20); g.lineTo(2, 8); g.lineTo(6, 13); g.lineTo(9, 5); g.lineTo(12, 13); g.lineTo(12, 20); g.closePath(); g.fill(); }
}

function hexLine(r, y, color, opacity = 1) {
  const pts = [];
  for (let i = 0; i <= 6; i++) { const a = (i * Math.PI) / 3; pts.push(new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r)); }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}

const FX_COLOR = { beam: 0x22d3ee, shot: 0xfde047, missile: 0xfb923c, slash: 0xf8fafc, mega: 0xf472b6, rainbow: 0xa78bfa };

export default function Board3D({ battle, stage, moveSet, atkSet, threatSet, hazardSet, tgtKey, selUid, onCellClick, fx, onFail }) {
  const mountRef = useRef(null);
  const T = useRef(null); // three.js state
  const [pops, setPops] = useState([]);

  // ---------- init ----------
  useEffect(() => {
    const mount = mountRef.current;
    setDims(battle.map[0].length, battle.map.length);
    const zs = battle.map.length / 8; // zoom out for bigger maps
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch (e) { onFail && onFail(); return undefined; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.Fog(0x020617, 14 * zs, 30 * zs);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 7.2 * zs, 6.4 * zs);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.08;
    controls.enablePan = false; controls.minDistance = 4.5; controls.maxDistance = 14 * zs;
    controls.minPolarAngle = 0.12; controls.maxPolarAngle = 1.3; controls.rotateSpeed = 0.7;
    controls.target.set(0, 0, 0.2); controls.update();

    // lights
    scene.add(new THREE.AmbientLight(0x8fa8ff, 0.9));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(4, 9, 5); scene.add(sun);
    const rim = new THREE.DirectionalLight(0x22d3ee, 0.6); rim.position.set(-6, 3, -6); scene.add(rim);

    // backdrop: stage art on a big curved panel + star field
    const starGeo = new THREE.BufferGeometry(); const sp = [];
    for (let i = 0; i < 900; i++) { const r = 22 + Math.random() * 8, th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI * 0.5; sp.push(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) - 4, r * Math.sin(ph) * Math.sin(th)); }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.8, fog: false })));
    if (stage.art) {
      const tl = new THREE.TextureLoader();
      tl.load(stage.art, (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        const floor = new THREE.Mesh(new THREE.CircleGeometry(16 * zs, 64), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.55, fog: false }));
        floor.rotation.x = -Math.PI / 2; floor.position.y = -0.6; scene.add(floor);
      });
    } else {
      const floor = new THREE.Mesh(new THREE.CircleGeometry(16, 64), new THREE.MeshBasicMaterial({ color: 0x0b1530, transparent: true, opacity: 0.7 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -0.6; scene.add(floor);
    }

    // tiles
    const tiles = []; const overlays = {}; const tileTop = {};
    const geoCache = {};
    const mats = {
      space: new THREE.MeshStandardMaterial({ color: 0x0f1d3a, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.88 }),
      debris: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95, metalness: 0.1 }),
      dock: new THREE.MeshStandardMaterial({ color: 0x065f46, emissive: 0x10b981, emissiveIntensity: 0.35, roughness: 0.5 }),
    };
    battle.map.forEach((row, y) => row.split('').forEach((ch, x) => {
      const t = TERRAIN[ch] || TERRAIN['.'];
      const h = HEIGHT[t.id];
      geoCache[h] = geoCache[h] || new THREE.CylinderGeometry(R * 0.95, R * 0.95, h, 6);
      const m = new THREE.Mesh(geoCache[h], mats[t.id]);
      const p = tilePos(x, y); m.position.set(p.x, h / 2, p.z);
      m.userData = { x, y }; scene.add(m); tiles.push(m);
      const edge = hexLine(R * 0.95, h / 2 + 0.002, 0x22d3ee, t.id === 'space' ? 0.35 : 0.2); edge.position.set(p.x, h / 2, p.z); scene.add(edge);
      tileTop[key(x, y)] = h;
      if (t.id === 'debris') {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 1, flatShading: true }));
        rock.position.set(p.x - 0.12, h + 0.08, p.z + 0.08); rock.rotation.set(Math.random(), Math.random(), 0); scene.add(rock);
        const wreck = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.14), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.7 }));
        wreck.position.set(p.x + 0.12, h + 0.05, p.z - 0.1); wreck.rotation.y = 0.6; scene.add(wreck);
      }
      if (t.id === 'dock') {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0x6ee7b7 }));
        ring.rotation.x = Math.PI / 2; ring.rotation.z = Math.PI / 6; ring.position.set(p.x, h + 0.01, p.z); scene.add(ring);
        const plusMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
        const a = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.06), plusMat); a.position.set(p.x, h + 0.01, p.z); scene.add(a);
        const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.22), plusMat); b.position.set(p.x, h + 0.01, p.z); scene.add(b);
      }
      // highlight overlay
      const ov = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.9, R * 0.9, 0.02, 6), new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0.45, depthWrite: false }));
      ov.position.set(p.x, h + 0.012, p.z); ov.visible = false; scene.add(ov);
      const ring = hexLine(R * 0.86, 0, 0xfcd34d, 1); ring.position.set(p.x, h + 0.03, p.z); ring.visible = false; scene.add(ring);
      overlays[key(x, y)] = { ov, ring, kind: null };
    }));

    const units = new Map();
    const transient = []; // beams/booms
    const raycaster = new THREE.Raycaster();
    let raf = 0, last = performance.now();

    function resize() {
      const w = mount.clientWidth, h = mount.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(resize); ro.observe(mount); resize();

    // tap vs drag
    let down = null;
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e) => {
      if (!down) return; const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y); down = null;
      if (moved > 8) return;
      const rect = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const sprites = [...units.values()].filter((u) => u.group.visible).map((u) => u.sprite);
      const hitU = raycaster.intersectObjects(sprites, false)[0];
      if (hitU) { const u = hitU.object.userData; T.current?.click(u.x, u.y); return; }
      const hitT = raycaster.intersectObjects(tiles, false)[0];
      if (hitT) T.current?.click(hitT.object.userData.x, hitT.object.userData.y);
    };
    renderer.domElement.addEventListener('pointerdown', onDown);
    renderer.domElement.addEventListener('pointerup', onUp);

    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      controls.update();
      const tt = now / 1000;
      // overlays pulse
      Object.values(overlays).forEach((o) => { if (o.kind === 'move') o.ov.material.opacity = 0.35 + Math.sin(tt * 4) * 0.12; if (o.kind === 'hazard') o.ov.material.opacity = 0.3 + Math.abs(Math.sin(tt * 5)) * 0.3; });
      // units
      units.forEach((u) => {
        const p = u.target;
        u.group.position.lerp(p, Math.min(1, dt * 10));
        if (u.shakeUntil > now) { const k = (u.shakeUntil - now) / 350; u.sprite.position.x = Math.sin(now / 18) * 0.06 * k; } else u.sprite.position.x = 0;
        u.sprite.position.y = 0.02 + (u.idle ? Math.sin(tt * 2.4 + u.phase) * 0.025 : 0);
        const bs = u.ship ? 1.4 : 1;
        if (u.sel) { u.base.scale.setScalar(bs * (1 + Math.sin(tt * 6) * 0.08)); u.base.material.opacity = 0.95; } else { u.base.scale.setScalar(bs); u.base.material.opacity = 0.7; }
      });
      // transient fx
      for (let i = transient.length - 1; i >= 0; i--) {
        const f = transient[i]; if (now < f.t0) continue; const k = (now - f.t0) / f.dur;
        if (k >= 1) { scene.remove(f.obj); f.obj.geometry?.dispose(); f.obj.material?.dispose(); transient.splice(i, 1); continue; }
        if (f.kind === 'beam') { f.obj.material.opacity = k < 0.6 ? 0.95 : 0.95 * (1 - (k - 0.6) / 0.4); f.obj.scale.set(1, Math.min(1, k / 0.35), 1); }
        if (f.kind === 'boom') { f.obj.scale.setScalar(0.2 + k * 1.4); f.obj.material.opacity = 1 - k; }
      }
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    T.current = {
      renderer, scene, camera, controls, units, overlays, tileTop, transient, zs, click: () => {},
      project(x, y, lift = 1.1) {
        const p = tilePos(x, y); p.y = (tileTop[key(x, y)] || 0.1) + lift; p.project(camera);
        return { left: (p.x * 0.5 + 0.5) * 100, top: (-p.y * 0.5 + 0.5) * 100 };
      },
    };
    // test hook: screen % position of a tile
    window.__mbt3d = { project: (x, y) => T.current?.project(x, y, 0.2) };

    return () => {
      cancelAnimationFrame(raf); ro.disconnect();
      renderer.domElement.removeEventListener('pointerdown', onDown);
      renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose(); renderer.dispose();
      scene.traverse((o) => { o.geometry?.dispose?.(); if (o.material && !Array.isArray(o.material)) o.material.dispose(); });
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      T.current = null; delete window.__mbt3d;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep latest click handler
  useEffect(() => { if (T.current) T.current.click = onCellClick; }, [onCellClick]);

  // ---------- overlays ----------
  useEffect(() => {
    const t = T.current; if (!t) return;
    Object.entries(t.overlays).forEach(([k, o]) => {
      const kind = moveSet?.has(k) ? 'move' : atkSet?.has(k) ? 'atk' : hazardSet?.has(k) ? 'hazard' : threatSet?.has(k) ? 'threat' : null;
      o.kind = kind; o.ov.visible = !!kind;
      if (kind === 'move') o.ov.material.color.setHex(0x0ea5e9);
      if (kind === 'atk') { o.ov.material.color.setHex(0xf43f5e); o.ov.material.opacity = 0.38; }
      if (kind === 'threat') { o.ov.material.color.setHex(0xf43f5e); o.ov.material.opacity = 0.16; }
      if (kind === 'hazard') { o.ov.material.color.setHex(0xf59e0b); o.ov.material.opacity = 0.42; }
      o.ring.visible = k === tgtKey;
    });
  }, [moveSet, atkSet, threatSet, hazardSet, tgtKey]);

  // ---------- units ----------
  useEffect(() => {
    const t = T.current; if (!t) return;
    const seen = new Set();
    battle.units.forEach((u) => {
      seen.add(u.uid);
      let e = t.units.get(u.uid);
      if (!e) {
        const group = new THREE.Group();
        const base = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.33, 32), new THREE.MeshBasicMaterial({ color: u.team === 'player' ? 0x38bdf8 : 0xf43f5e, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
        base.rotation.x = -Math.PI / 2; base.position.y = 0.01; group.add(base);
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: mechaTexture(u.look), transparent: true, alphaTest: 0.05 }));
        sprite.center.set(0.5, 0.04); const sc = u.ship ? 2.0 : u.boss ? 1.35 : 1.0; sprite.scale.set(sc * (u.look.img ? 1.5 : 1), sc, 1); sprite.userData = { x: u.x, y: u.y };
        group.add(sprite);
        const hc = hpCanvas(u); const htex = new THREE.CanvasTexture(hc);
        const hp = new THREE.Sprite(new THREE.SpriteMaterial({ map: htex, transparent: true, depthTest: false }));
        hp.scale.set(0.62, 0.116, 1); hp.position.y = sc + 0.12; hp.renderOrder = 10; group.add(hp);
        const p = tilePos(u.x, u.y); p.y = t.tileTop[key(u.x, u.y)];
        group.position.copy(p); t.scene.add(group);
        if (u.ship) base.scale.setScalar(1.4);
        e = { group, base, sprite, hp, hc, htex, target: p.clone(), shakeUntil: 0, phase: Math.random() * 6, lastHp: -1, lastT: -1, lookKey: JSON.stringify(u.look), ship: u.ship };
        t.units.set(u.uid, e);
      }
      const p = tilePos(u.x, u.y); p.y = t.tileTop[key(u.x, u.y)];
      e.target.copy(p);
      e.sprite.userData = { x: u.x, y: u.y };
      e.group.visible = u.hp > 0;
      e.sel = u.uid === selUid;
      const lk = JSON.stringify(u.look);
      if (lk !== e.lookKey) { e.lookKey = lk; e.sprite.material.map = mechaTexture(u.look); e.sprite.material.needsUpdate = true; }
      e.idle = true;
      if (e.lastHp !== u.hp || e.lastT !== u.tension) { drawHp(e.hc, u); e.htex.needsUpdate = true; e.lastHp = u.hp; e.lastT = u.tension; }
    });
    t.units.forEach((e, uid) => { if (!seen.has(uid)) { t.scene.remove(e.group); t.units.delete(uid); } });
  }, [battle.units, selUid]);

  // ---------- fx: shakes ----------
  const shakeSeen = useRef({});
  useEffect(() => {
    const t = T.current; if (!t) return;
    Object.entries(fx.shakes).forEach(([uid, n]) => {
      if (shakeSeen.current[uid] !== n) { shakeSeen.current[uid] = n; const e = t.units.get(uid); if (e) e.shakeUntil = performance.now() + 350; }
    });
  }, [fx.shakes]);

  // ---------- fx: beams / booms ----------
  const fxSeen = useRef(new Set());
  useEffect(() => {
    const t = T.current; if (!t) return;
    const now = performance.now();
    fx.beams.forEach((b) => {
      if (fxSeen.current.has(b.id)) return; fxSeen.current.add(b.id);
      const a = tilePos(b.x1, b.y1); a.y = t.tileTop[key(b.x1, b.y1)] + 0.5;
      const z = tilePos(b.x2, b.y2); z.y = t.tileTop[key(b.x2, b.y2)] + 0.5;
      if (b.fx === 'slash') {
        const s = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 24, Math.PI * 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        s.position.copy(z); s.lookAt(t.camera.position); scene_add(t, s, 'beam', 450, now); return;
      }
      const len = a.distanceTo(z);
      const thick = b.fx === 'mega' || b.fx === 'rainbow' ? 0.09 : b.fx === 'shot' ? 0.02 : 0.04;
      const geo = new THREE.CylinderGeometry(thick, thick, len, 8, 1, true); geo.translate(0, len / 2, 0);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: FX_COLOR[b.fx] || 0x22d3ee, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.position.copy(a); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), z.clone().sub(a).normalize());
      scene_add(t, m, 'beam', 480, now);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(thick * 3, 12, 8), new THREE.MeshBasicMaterial({ color: FX_COLOR[b.fx] || 0x22d3ee, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      hit.position.copy(z); scene_add(t, hit, 'boom', 420, now + 150);
    });
    fx.booms.forEach((b) => {
      if (fxSeen.current.has(b.id)) return; fxSeen.current.add(b.id);
      const p = tilePos(b.x, b.y); p.y = t.tileTop[key(b.x, b.y)] + 0.4;
      [0xf97316, 0xfde047].forEach((col, i) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.45 - i * 0.15, 16, 12), new THREE.MeshBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        s.position.copy(p); scene_add(t, s, 'boom', 650, now + i * 80);
      });
    });
  }, [fx.beams, fx.booms]);

  // ---------- popups (projected to screen) ----------
  useEffect(() => {
    const t = T.current; if (!t) return;
    setPops(fx.pops.map((p) => ({ ...p, pos: t.project(p.x, p.y) })));
  }, [fx.pops]);

  function view(kind) {
    const t = T.current; if (!t) return;
    const c = t.controls, cam = t.camera;
    const off = cam.position.clone().sub(c.target);
    if (kind === 'left' || kind === 'right') { off.applyAxisAngle(new THREE.Vector3(0, 1, 0), (kind === 'left' ? 1 : -1) * Math.PI / 3); cam.position.copy(c.target).add(off); }
    if (kind === 'reset') { cam.position.set(0, 7.2 * t.zs, 6.4 * t.zs); c.target.set(0, 0, 0.2); }
    if (kind === 'top') { cam.position.set(c.target.x, 10.5 * t.zs, c.target.z + 0.01); }
    c.update();
  }

  return (
    <div className="absolute inset-0">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="absolute inset-0 pointer-events-none">
        {pops.map((p) => (
          <div key={p.id} className={`absolute anim-float font-black whitespace-nowrap drop-shadow-[0_2px_0_rgba(0,0,0,.9)] ${p.kind === 'crit' ? 'text-amber-300 text-lg sm:text-2xl' : p.kind === 'miss' ? 'text-slate-300 text-sm' : p.kind === 'heal' ? 'text-emerald-300 text-base' : p.kind === 'super' ? 'text-fuchsia-300 text-xs sm:text-sm' : p.kind === 'tension' ? 'text-amber-200 text-[10px] sm:text-xs' : p.kind === 'guard' ? 'text-sky-300 text-sm' : 'text-white text-base sm:text-xl'}`}
            style={{ left: `${p.pos.left}%`, top: `${p.pos.top}%` }}>{p.text}</div>
        ))}
      </div>
      <div className="absolute bottom-2 left-2 flex gap-1">
        {[['left', RotateCcw, 'Rotate left'], ['right', RotateCw, 'Rotate right'], ['top', ArrowDownToLine, 'Top-down view'], ['reset', Maximize, 'Reset camera']].map(([k, Icon, label]) => (
          <button key={k} onClick={() => view(k)} title={label} aria-label={label} className="p-1.5 rounded-lg bg-slate-950/80 border border-cyan-500/40 text-cyan-200 hover:bg-slate-800"><Icon size={15} /></button>
        ))}
      </div>
      <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-slate-950/70 rounded px-1.5 py-0.5 pointer-events-none">Drag to rotate · pinch/scroll to zoom</div>
    </div>
  );
}

function scene_add(t, obj, kind, dur, t0) {
  t.scene.add(obj);
  t.transient.push({ obj, kind, dur, t0 });
  if (t0 > performance.now()) { obj.visible = false; setTimeout(() => { obj.visible = true; }, t0 - performance.now()); }
}
