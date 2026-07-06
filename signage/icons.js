// Iconos mínimos dibujados a mano en SVG (sin depender de ninguna librería de iconos).
// Cada uno se dibuja dentro de un viewBox 0 0 100 100, color controlado por el llamador.

function sun(color) {
  return `
    <circle cx="50" cy="50" r="22" fill="${color}"/>
    ${[0, 45, 90, 135, 180, 225, 270, 315]
      .map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 50 + Math.cos(rad) * 32;
        const y1 = 50 + Math.sin(rad) * 32;
        const x2 = 50 + Math.cos(rad) * 46;
        const y2 = 50 + Math.sin(rad) * 46;
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(
          1
        )}" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`;
      })
      .join('')}
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

function ruler(color) {
  return `
    <rect x="8" y="35" width="84" height="30" rx="4" fill="none" stroke="${color}" stroke-width="7"/>
    ${[20, 32, 44, 56, 68, 80]
      .map((x) => `<line x1="${x}" y1="35" x2="${x}" y2="${x % 24 === 20 ? 52 : 46}" stroke="${color}" stroke-width="5"/>`)
      .join('')}
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

const ICONS = { sun, shield, percent, ruler, phone, star, home };

function renderIcon(name, color) {
  const fn = ICONS[name] || star;
  return fn(color);
}

module.exports = { renderIcon };
