const { renderIcon } = require('./icons');

const PALETTE = {
  blue: '#1F4E79',
  blueMid: '#2E75B6',
  blueLight: '#D6E4F0',
  bluePale: '#EBF3FB',
  green: '#1A7340',
  greenBg: '#E8F5EE',
  text: '#1A1A2E',
  muted: '#6B7280',
  white: '#FFFFFF',
};

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Divide un texto en líneas de como mucho `maxChars` caracteres, sin cortar palabras.
function wrapText(text, maxChars) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function textBlock({ x, y, lines, fontSize, lineHeight, fill, weight = 700 }) {
  return `<text x="${x}" y="${y}" font-family="'Segoe UI', Arial, sans-serif" font-size="${fontSize}"
    font-weight="${weight}" fill="${fill}">
    ${lines
      .map(
        (line, i) =>
          `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
      )
      .join('')}
  </text>`;
}

function buildSlideSvg(slide, { width, height, qrDataUri, siteUrl }) {
  const accent = PALETTE[slide.accent] || PALETTE.blue;
  const accentBg = slide.accent === 'green' ? PALETTE.greenBg : PALETTE.bluePale;

  const headlineLines = wrapText(slide.headline, 18).slice(0, 2);
  const subLines = wrapText(slide.subheadline, 40).slice(0, 2);

  const headlineFontSize = 108;
  const headlineLineHeight = 118;
  const headlineStartY = 460;

  const subStartY = headlineStartY + headlineLines.length * headlineLineHeight + 70;

  const showQr = Boolean(qrDataUri && siteUrl);

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${PALETTE.white}"/>
      <stop offset="1" stop-color="${accentBg}"/>
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#bg)"/>

  <!-- Cabecera de marca -->
  <rect x="0" y="0" width="${width}" height="150" fill="${PALETTE.blue}"/>
  <text x="70" y="70" font-family="'Segoe UI', Arial, sans-serif" font-size="46" font-weight="700"
    fill="${PALETTE.white}" letter-spacing="1">IBÉRICA SEGURIDAD</text>
  <text x="70" y="112" font-family="'Segoe UI', Arial, sans-serif" font-size="26"
    fill="${PALETTE.blueLight}">Carpintería de Aluminio · Sevilla</text>

  ${
    slide.badge
      ? `<rect x="70" y="220" width="${Math.max(220, slide.badge.length * 26 + 80)}" height="66" rx="33" fill="${accent}"/>
         <text x="${70 + Math.max(220, slide.badge.length * 26 + 80) / 2}" y="262" text-anchor="middle"
           font-family="'Segoe UI', Arial, sans-serif" font-size="30" font-weight="700"
           fill="${PALETTE.white}">${escapeXml(slide.badge.toUpperCase())}</text>`
      : ''
  }

  <!-- Icono -->
  <g transform="translate(1560, 130) scale(2.4)">
    ${renderIcon(slide.icon, accent)}
  </g>

  ${textBlock({
    x: 70,
    y: headlineStartY,
    lines: headlineLines,
    fontSize: headlineFontSize,
    lineHeight: headlineLineHeight,
    fill: PALETTE.text,
  })}

  ${textBlock({
    x: 70,
    y: subStartY,
    lines: subLines,
    fontSize: 44,
    lineHeight: 56,
    fill: PALETTE.muted,
    weight: 400,
  })}

  ${
    showQr
      ? `<rect x="${width - 320}" y="${height - 320}" width="260" height="260" rx="16" fill="${PALETTE.white}"
           stroke="${PALETTE.border || '#DDE3EC'}" stroke-width="2"/>
         <image x="${width - 300}" y="${height - 300}" width="220" height="220" href="${qrDataUri}"/>
         <text x="${width - 190}" y="${height - 34}" text-anchor="middle"
           font-family="'Segoe UI', Arial, sans-serif" font-size="24" font-weight="600"
           fill="${PALETTE.blue}">Presupuesto al instante</text>`
      : ''
  }

  <!-- Franja inferior -->
  <rect x="0" y="${height - 14}" width="${width}" height="14" fill="${accent}"/>
</svg>`.trim();
}

module.exports = { buildSlideSvg, PALETTE };
