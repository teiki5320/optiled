// Miniatures dessinées (SVG → WebP 192 × 192) pour les cultures sans image générée.
// Même cadrage que les miniatures existantes : sujet centré, ombré, sur fond violet sombre.
// Usage : node scripts/miniatures.mjs [id …]   (sans argument : toutes)
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const FOND = '#26182a';

/** Cadre commun : fond, halo discret et ombre portée sous le sujet. */
function cadre(contenu, defs = '', ombre = { cx: 96, cy: 158, rx: 52, ry: 9 }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="384" height="384">
  <defs>
    <radialGradient id="halo" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#34233a"/><stop offset="1" stop-color="${FOND}"/></radialGradient>
    <radialGradient id="ombre"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    ${defs}
  </defs>
  <rect width="192" height="192" fill="url(#halo)"/>
  <ellipse cx="${ombre.cx}" cy="${ombre.cy}" rx="${ombre.rx}" ry="${ombre.ry}" fill="url(#ombre)"/>
  ${contenu}
</svg>`;
}

/** Feuille en goutte orientée (angle en degrés), avec nervure centrale. */
function feuille({ x, y, l, w, angle, grad, nervure = '#d7f0b8', opaciteNervure = 0.45 }) {
  return `<g transform="translate(${x} ${y}) rotate(${angle})">
    <path d="M0 0 C ${w} ${-l * 0.25}, ${w * 0.9} ${-l * 0.8}, 0 ${-l} C ${-w * 0.9} ${-l * 0.8}, ${-w} ${-l * 0.25}, 0 0 Z" fill="url(#${grad})"/>
    <path d="M0 0 L0 ${-l * 0.92}" stroke="${nervure}" stroke-opacity="${opaciteNervure}" stroke-width="1.2" fill="none"/>
  </g>`;
}

const vert = (id, a, b) => `<linearGradient id="${id}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;

const DESSINS = {
  mache() {
    const defs = vert('f', '#2f5f24', '#6aa84a') + vert('f2', '#244d1c', '#4f8c38');
    let s = '';
    for (let i = 0; i < 9; i++) s += feuille({ x: 96, y: 104, l: 58, w: 17, angle: i * 40, grad: i % 2 ? 'f' : 'f2' });
    for (let i = 0; i < 5; i++) s += feuille({ x: 96, y: 104, l: 30, w: 10, angle: i * 72 + 20, grad: 'f' });
    return cadre(s, defs, { cx: 96, cy: 160, rx: 58, ry: 10 });
  },

  mesclun() {
    const defs = vert('v1', '#3f7d2b', '#8ccf5a') + vert('v2', '#2c5a22', '#5e9e3e') + vert('r1', '#4a1024', '#9c2f4f') + vert('r2', '#5b1a2c', '#b24a66');
    const f = [
      { x: 70, y: 140, l: 62, w: 20, angle: -35, grad: 'v1' },
      { x: 120, y: 142, l: 60, w: 19, angle: 38, grad: 'r1', nervure: '#f2b6c6' },
      { x: 96, y: 146, l: 70, w: 18, angle: 2, grad: 'v2' },
      { x: 82, y: 146, l: 56, w: 16, angle: -12, grad: 'r2', nervure: '#f2b6c6' },
      { x: 110, y: 146, l: 58, w: 17, angle: 16, grad: 'v1' },
      { x: 60, y: 146, l: 44, w: 13, angle: -62, grad: 'v2' },
      { x: 134, y: 146, l: 46, w: 14, angle: 64, grad: 'v1' },
    ];
    return cadre(f.map(feuille).join(''), defs);
  },

  thym() {
    const defs = vert('t', '#4d6b45', '#8faa7c');
    let s = '<g stroke="#7a5a3c" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M96 158 C 94 120, 92 90, 96 40"/><path d="M95 120 C 80 105, 70 92, 62 70"/><path d="M95 110 C 110 96, 122 84, 130 62"/></g>';
    const tiges = [[96, 158, 96, 40], [95, 120, 62, 70], [95, 110, 130, 62]];
    for (const [x1, y1, x2, y2] of tiges) {
      for (let t = 0.15; t <= 1; t += 0.12) {
        const x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
        s += `<ellipse cx="${x - 4.5}" cy="${y}" rx="4" ry="2.4" transform="rotate(-30 ${x - 4.5} ${y})" fill="url(#t)"/>`;
        s += `<ellipse cx="${x + 4.5}" cy="${y - 2}" rx="4" ry="2.4" transform="rotate(30 ${x + 4.5} ${y - 2})" fill="url(#t)"/>`;
      }
    }
    return cadre(s, defs, { cx: 96, cy: 162, rx: 44, ry: 8 });
  },

  origan() {
    const defs = vert('o', '#3d7a34', '#7cbf5a');
    let s = '<path d="M96 160 C 95 120, 94 80, 96 38" stroke="#5b7a3a" stroke-width="3" fill="none" stroke-linecap="round"/>';
    const niveaux = [140, 118, 96, 76, 58];
    niveaux.forEach((y, i) => {
      const t = 1 - i * 0.14;
      s += `<ellipse cx="${96 - 16 * t}" cy="${y}" rx="${15 * t}" ry="${10 * t}" transform="rotate(-18 ${96 - 16 * t} ${y})" fill="url(#o)"/>`;
      s += `<ellipse cx="${96 + 16 * t}" cy="${y - 3}" rx="${15 * t}" ry="${10 * t}" transform="rotate(18 ${96 + 16 * t} ${y - 3})" fill="url(#o)"/>`;
    });
    s += '<g fill="#e7a6d8">' + [[92, 34], [99, 31], [96, 27], [102, 36], [89, 38]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3"/>`).join('') + '</g>';
    return cadre(s, defs, { cx: 96, cy: 163, rx: 40, ry: 8 });
  },

  romarin() {
    const defs = vert('r', '#2f4f32', '#6f9a70');
    let s = '';
    const branche = (x0, y0, x1, y1) => {
      s += `<path d="M${x0} ${y0} L${x1} ${y1}" stroke="#6b5236" stroke-width="2.6" stroke-linecap="round"/>`;
      const a = Math.atan2(y1 - y0, x1 - x0);
      for (let t = 0.08; t <= 1; t += 0.07) {
        const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        for (const c of [-1, 1]) {
          const ang = a + c * 1.05, l = 15 - t * 5;
          s += `<path d="M${x} ${y} l${Math.cos(ang) * l} ${Math.sin(ang) * l}" stroke="url(#r)" stroke-width="3.2" stroke-linecap="round"/>`;
        }
      }
    };
    branche(84, 160, 70, 36);
    branche(104, 162, 124, 44);
    return cadre(s, defs, { cx: 96, cy: 164, rx: 42, ry: 8 });
  },

  sauge() {
    const defs = vert('s', '#5f7a5a', '#a9bfa0') + vert('s2', '#50694c', '#93ab8a');
    const f = [
      { x: 96, y: 156, l: 96, w: 26, angle: -32, grad: 's2', nervure: '#e8f0e0' },
      { x: 96, y: 156, l: 96, w: 26, angle: 32, grad: 's2', nervure: '#e8f0e0' },
      { x: 96, y: 158, l: 110, w: 30, angle: 0, grad: 's', nervure: '#eef4e8' },
    ];
    let s = f.map(feuille).join('');
    // texture veloutée : nervures secondaires
    s += '<g stroke="#eef4e8" stroke-opacity=".25" stroke-width="1" fill="none">';
    for (let i = 1; i < 6; i++) s += `<path d="M96 ${158 - i * 17} q ${12 + i} -6 ${20 - i} -14"/><path d="M96 ${158 - i * 17} q ${-12 - i} -6 ${-20 + i} -14"/>`;
    s += '</g>';
    return cadre(s, defs, { cx: 96, cy: 162, rx: 50, ry: 9 });
  },

  aneth() {
    let s = '<g stroke="#5f9a3f" stroke-linecap="round" fill="none">';
    s += '<path d="M96 162 C 96 130, 95 100, 96 70" stroke-width="3"/>';
    const fronde = (x0, y0, ang, l) => {
      const x1 = x0 + Math.cos(ang) * l, y1 = y0 + Math.sin(ang) * l;
      s += `<path d="M${x0} ${y0} L${x1} ${y1}" stroke-width="1.8"/>`;
      for (let t = 0.2; t <= 1; t += 0.13) {
        const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
        for (const c of [-0.7, 0.7]) s += `<path d="M${x} ${y} l${Math.cos(ang + c) * 11} ${Math.sin(ang + c) * 11}" stroke="#8ccf5a" stroke-width="1"/>`;
      }
    };
    [[96, 140, -2.5, 52], [96, 140, -0.64, 52], [96, 118, -2.2, 46], [96, 118, -0.94, 46], [96, 96, -1.9, 40], [96, 96, -1.24, 40]].forEach(([x, y, a, l]) => fronde(x, y, a, l));
    s += '</g>';
    // ombelle jaune
    s += '<g stroke="#c9b24a" stroke-width="1.2">';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i * Math.PI) / 8;
      s += `<path d="M96 70 l${Math.cos(a) * 22} ${Math.sin(a) * 16}"/>`;
    }
    s += '</g><g fill="#f2d65a">';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI + (i * Math.PI) / 8;
      s += `<circle cx="${96 + Math.cos(a) * 22}" cy="${70 + Math.sin(a) * 16}" r="3.4"/>`;
    }
    s += '</g>';
    return cadre(s, '', { cx: 96, cy: 165, rx: 46, ry: 8 });
  },

  'tomate-naine'() {
    const defs = `<radialGradient id="tom" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ff8a6a"/><stop offset=".45" stop-color="#e3301f"/><stop offset="1" stop-color="#8a130d"/></radialGradient>`;
    const baies = [[72, 118, 22], [112, 112, 24], [92, 146, 21], [128, 146, 18]];
    let s = '<path d="M96 36 C 96 60, 84 76, 72 96 M96 60 C 104 76, 110 88, 112 90 M90 74 C 92 100, 92 116, 92 126 M108 84 C 118 104, 126 120, 128 128" stroke="#4f7d2f" stroke-width="3" fill="none" stroke-linecap="round"/>';
    for (const [x, y, r] of baies) {
      s += `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#tom)"/>`;
      s += `<ellipse cx="${x - r * 0.35}" cy="${y - r * 0.4}" rx="${r * 0.22}" ry="${r * 0.12}" fill="#fff" opacity=".45" transform="rotate(-30 ${x - r * 0.35} ${y - r * 0.4})"/>`;
      s += `<g fill="#3f7a2a" transform="translate(${x} ${y - r + 2})">` + [0, 72, 144, 216, 288].map((a) => `<path d="M0 0 l-2.6 -1 l2.6 -9 l2.6 9 z" transform="rotate(${a})"/>`).join('') + '</g>';
    }
    return cadre(s, defs, { cx: 100, cy: 170, rx: 56, ry: 9 });
  },

  radis() {
    const defs =
      `<radialGradient id="rad" cx="38%" cy="35%" r="70%"><stop offset="0" stop-color="#ff7aa0"/><stop offset=".55" stop-color="#d81e5b"/><stop offset="1" stop-color="#7d0f35"/></radialGradient>` +
      vert('fe', '#2f6a2a', '#6fb04a');
    let s = '';
    s += feuille({ x: 96, y: 96, l: 62, w: 20, angle: -30, grad: 'fe' });
    s += feuille({ x: 96, y: 96, l: 66, w: 21, angle: 22, grad: 'fe' });
    s += feuille({ x: 96, y: 96, l: 56, w: 18, angle: -4, grad: 'fe' });
    s += '<path d="M96 150 C 97 160, 99 168, 102 178" stroke="#f4e6ea" stroke-width="2.4" fill="none" stroke-linecap="round"/>';
    s += '<path d="M96 96 C 128 96, 132 132, 110 148 C 102 154, 90 154, 82 148 C 60 132, 64 96, 96 96 Z" fill="url(#rad)"/>';
    s += '<path d="M84 146 C 90 152, 102 152, 108 146 C 104 156, 88 156, 84 146 Z" fill="#f7e9ee" opacity=".9"/>';
    s += '<ellipse cx="84" cy="114" rx="7" ry="4" fill="#fff" opacity=".35" transform="rotate(-35 84 114)"/>';
    return cadre(s, defs, { cx: 98, cy: 166, rx: 40, ry: 8 });
  },

  safran() {
    const defs =
      `<linearGradient id="pet" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#6a3aa8"/><stop offset=".6" stop-color="#a176e0"/><stop offset="1" stop-color="#d6c0f7"/></linearGradient>` +
      vert('tige', '#3f7a35', '#8fcf6a');
    let s = '';
    s += '<path d="M90 164 C 88 140, 84 120, 70 96" stroke="url(#tige)" stroke-width="3" fill="none"/><path d="M102 164 C 106 140, 112 124, 126 104" stroke="url(#tige)" stroke-width="3" fill="none"/>';
    s += '<path d="M96 164 L96 112" stroke="#e9e2d0" stroke-width="5" stroke-linecap="round"/>';
    const petales = [-58, -30, 0, 30, 58];
    for (const a of petales) s += `<g transform="translate(96 112) rotate(${a})"><path d="M0 0 C 16 -12, 16 -46, 0 -60 C -16 -46, -16 -12, 0 0 Z" fill="url(#pet)" opacity="${a === 0 ? 1 : 0.92}"/><path d="M0 -4 L0 -52" stroke="#4a2280" stroke-opacity=".35" stroke-width="1"/></g>`;
    s += '<g stroke="#e0301e" stroke-width="3.2" stroke-linecap="round" fill="none"><path d="M96 104 C 92 86, 86 76, 80 68"/><path d="M96 104 C 97 86, 98 74, 99 64"/><path d="M96 104 C 102 86, 108 78, 114 70"/></g>';
    s += '<g stroke="#f5c542" stroke-width="2.2" stroke-linecap="round"><path d="M92 104 L88 86"/><path d="M100 104 L104 86"/></g>';
    return cadre(s, defs, { cx: 96, cy: 168, rx: 40, ry: 8 });
  },

  wasabi() {
    const defs =
      `<linearGradient id="rhi" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7fa35a"/><stop offset=".5" stop-color="#b8d58a"/><stop offset="1" stop-color="#6d9048"/></linearGradient>` +
      `<radialGradient id="coeur" cx="45%" cy="40%" r="70%"><stop offset="0" stop-color="#7cc35a"/><stop offset="1" stop-color="#2f6a25"/></radialGradient>`;
    let s = '';
    const coeur = (x, y, r, a) =>
      `<g transform="translate(${x} ${y}) rotate(${a})"><path d="M0 ${r * 0.9} C ${-r * 1.4} ${-r * 0.1}, ${-r * 0.7} ${-r * 1.1}, 0 ${-r * 0.45} C ${r * 0.7} ${-r * 1.1}, ${r * 1.4} ${-r * 0.1}, 0 ${r * 0.9} Z" fill="url(#coeur)"/><path d="M0 ${r * 0.8} L0 ${-r * 0.4}" stroke="#cfe8b8" stroke-opacity=".4" stroke-width="1"/></g>`;
    s += '<g stroke="#8dbb66" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M92 112 C 84 90, 70 76, 56 64"/><path d="M96 110 C 96 86, 96 64, 96 46"/><path d="M100 112 C 110 90, 124 78, 138 66"/></g>';
    s += coeur(54, 58, 20, -20) + coeur(96, 40, 22, 0) + coeur(140, 60, 20, 20);
    s += '<path d="M78 112 C 78 104, 114 104, 114 112 L110 160 C 108 168, 84 168, 82 160 Z" fill="url(#rhi)"/>';
    s += '<g fill="#5f7f3e" opacity=".6">' + [[88, 124], [102, 130], [90, 142], [104, 150], [94, 156]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="2.2"/>`).join('') + '</g>';
    return cadre(s, defs, { cx: 96, cy: 170, rx: 36, ry: 7 });
  },
};

/** Agrandissement pour remplir le cadre comme les miniatures existantes (sujet ≈ 70 % du cadre). */
const ECHELLE = { mache: 1.2, mesclun: 1.2, thym: 1.3, origan: 1.25, romarin: 1.25, sauge: 1.1, aneth: 1.2, 'tomate-naine': 1.12, radis: 1.15, safran: 1.2, wasabi: 1.15 };

function agrandir(svg, k) {
  if (!k || k === 1) return svg;
  // Le sujet et son ombre sont agrandis autour du centre ; le fond reste en place.
  return svg.replace(/(<rect width="192" height="192" fill="url\(#halo\)"\/>)([\s\S]*)(<\/svg>)/, `$1<g transform="translate(96 100) scale(${k}) translate(-96 -100)">$2</g>$3`);
}

const sortie = resolve('public/images/legumes');
mkdirSync(sortie, { recursive: true });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(DESSINS);
for (const id of ids) {
  if (!DESSINS[id]) {
    console.error(`Pas de dessin pour « ${id} »`);
    process.exitCode = 1;
    continue;
  }
  const info = await sharp(Buffer.from(agrandir(DESSINS[id](), ECHELLE[id]))).resize(192, 192).webp({ quality: 85 }).toFile(resolve(sortie, `${id}.webp`));
  console.log(`${id}.webp : ${Math.round(info.size / 1024)} Ko`);
}
