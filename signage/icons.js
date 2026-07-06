// Iconos mínimos dibujados a mano en SVG (sin depender de ninguna librería de iconos).
// Cada uno se dibuja dentro de un viewBox 0 0 100 100, color controlado por el llamador.

function lock(color) {
  return `
    <rect x="26" y="46" width="48" height="42" rx="6" fill="none" stroke="${color}" stroke-width="8"/>
    <path d="M34 46 V32 a16 16 0 0 1 32 0 V46" fill="none" stroke="${color}" stroke-width="8"/>
    <circle cx="50" cy="65" r="6" fill="${color}"/>
    <line x1="50" y1="71" x2="50" y2="80" stroke="${color}" stroke-width="7" stroke-linecap="round"/>
  `;
}

function camera(color) {
  return `
    <rect x="10" y="34" width="58" height="34" rx="8" fill="none" stroke="${color}" stroke-width="8"/>
    <circle cx="34" cy="51" r="12" fill="none" stroke="${color}" stroke-width="7"/>
    <circle cx="34" cy="51" r="4" fill="${color}"/>
    <rect x="60" y="42" width="14" height="18" rx="3" fill="${color}"/>
    <line x1="20" y1="26" x2="20" y2="34" stroke="${color}" stroke-width="7" stroke-linecap="round"/>
  `;
}

function shield(color) {
  return `<path d="M50 6 L90 22 V50 C90 74 72 90 50 96 C28 90 10 74 10 50 V22 Z"
    fill="none" stroke="${color}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M32 50 L45 63 L70 36" fill="none" stroke="${color}" stroke-width="8"
    stroke-linecap="round" stroke-linejoin="round"/>`;
}

function percent(color) {
  return `
    <circle cx="28" cy="28" r="14" fill="none" stroke="${color}" stroke-width="8"/>
    <circle cx="72" cy="72" r="14" fill="none" stroke="${color}" stroke-width="8"/>
    <line x1="18" y1="82" x2="82" y2="18" stroke="${color}" stroke-width="8" stroke-linecap="round"/>
  `;
}

function phone(color) {
  return `<rect x="30" y="6" width="40" height="88" rx="10" fill="none" stroke="${color}" stroke-width="7"/>
    <circle cx="50" cy="84" r="4" fill="${color}"/>`;
}

function star(color) {
  const points = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 44 : 20;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    points.push(`${(50 + r * Math.cos(angle)).toFixed(1)},${(50 + r * Math.sin(angle)).toFixed(1)}`);
  }
  return `<polygon points="${points.join(' ')}" fill="${color}"/>`;
}

function home(color) {
  return `<path d="M10 52 L50 12 L90 52" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="24" y="50" width="52" height="42" fill="none" stroke="${color}" stroke-width="8"/>
    <rect x="44" y="66" width="14" height="26" fill="${color}"/>`;
}

const ICONS = { lock, shield, percent, camera, phone, star, home };

function renderIcon(name, color) {
  const fn = ICONS[name] || star;
  return fn(color);
}

module.exports = { renderIcon };
