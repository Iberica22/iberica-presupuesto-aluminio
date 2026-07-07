const { renderIcon } = require('./icons');

// Fuentes instaladas explícitamente en el contenedor (ver nixpacks.toml). 'Segoe UI'/Arial
// no existen en Linux; sin una fuente real instalada, el texto sale en blanco o como "tofu".
const FONT_FAMILY = "'DejaVu Sans', 'Liberation Sans', sans-serif";

const PALETTE = {
  green: '#1F892D',
  greenMid: '#2FA23D',
  greenLight: '#DCEFDD',
  greenPale: '#EFF7F0',
  gray: '#7A7879',
  grayBg: '#EFEFEF',
  text: '#1A1A2E',
  muted: '#7A7879',
  white: '#FFFFFF',
};

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Divide un texto en líneas que quepan en `maxWidth` a un tamaño de fuente dado
// (estimación de ancho de carácter para fuentes sans-serif en negrita), sin cortar palabras.
function wrapText(text, maxWidth, fontSize, charWidthFactor = 0.56) {
  const maxChars = Math.max(4, Math.floor(maxWidth / (fontSize * charWidthFactor)));
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

function textBlock({ x, y, lines, fontSize, lineHeight, fill, weight = 700, outline = false }) {
  // El contorno es un refuerzo extra (cinturón y tirantes); la defensa real de legibilidad
  // es la banda-rótulo casi opaca dibujada detrás en buildSlideSvg, no este trazo.
  const strokeAttrs = outline
    ? `paint-order="stroke fill" stroke="#04120A" stroke-opacity="0.55" stroke-width="${Math.max(
        1,
        Math.round(fontSize * 0.06)
      )}" stroke-linejoin="round"`
    : '';
  return `<text x="${x}" y="${y}" font-family="${FONT_FAMILY}" font-size="${fontSize}"
    font-weight="${weight}" fill="${fill}" ${strokeAttrs}>
    ${lines
      .map(
        (line, i) =>
          `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`
      )
      .join('')}
  </text>`;
}

// Todas las medidas se calculan como proporción de width/height para que el mismo slide
// funcione tanto en una pantalla 1920x1080 como en una de 432x216 (resolución real de las
// pantallas LED de la tienda, muy distinta a la que se asumió al principio).
function buildSlideSvg(slide, { width, height, qrDataUri, siteUrl, photoDataUri }) {
  const accent = PALETTE[slide.accent] || PALETTE.green;
  const accentBg = slide.accent === 'gray' ? PALETTE.grayBg : PALETTE.greenPale;
  const hasPhoto = Boolean(photoDataUri);

  // Banda-rótulo casi opaca detrás del titular/subtítulo cuando hay foto de fondo: un
  // degradado suave NO garantiza contraste (con alpha 0.4 el contraste real cae a ~2:1
  // sobre un cielo claro). Alpha 0.83 sobre un verde casi negro sí lo garantiza (≥7:1)
  // sea cual sea la foto por debajo — no depende de que la IA acierte con el encuadre.
  const CAPTION_BG = '#07210F';
  const CAPTION_ALPHA = 0.83;
  const DIM_ALPHA = 0.2; // atenuador global sobre la foto completa

  const pad = Math.round(width * 0.035);
  const showQr = Boolean(qrDataUri && siteUrl);

  // ── Cabecera ──
  const headerHeight = Math.round(height * 0.24);
  const headerTitleSize = Math.max(9, Math.round(height * 0.1));
  const headerSubSize = Math.max(7, Math.round(height * 0.058));

  // ── Icono (arriba a la derecha, debajo/junto a la cabecera) ──
  const iconSize = Math.round(height * 0.32);
  const iconX = width - pad - iconSize;
  const iconY = headerHeight + Math.round(height * 0.05);

  // ── Badge (etiqueta pequeña) ──
  const badgeH = Math.round(height * 0.13);
  const badgeFontSize = Math.max(7, Math.round(height * 0.06));
  const badgeY = headerHeight + Math.round(height * 0.06);
  const badgeWidth = slide.badge ? Math.max(Math.round(width * 0.16), slide.badge.length * badgeFontSize * 0.65 + badgeH) : 0;

  // ── Zona de texto (deja hueco a la derecha para el QR en la franja inferior) ──
  const qrSize = Math.round(Math.min(width, height) * 0.52);
  const textAreaWidth = showQr ? width - pad * 2 - qrSize - pad : width - pad * 2;

  const headlineFontSize = Math.max(11, Math.round(height * 0.145));
  const headlineLineHeight = Math.round(headlineFontSize * 1.08);
  const headlineLines = wrapText(slide.headline, textAreaWidth, headlineFontSize).slice(0, 2);
  const headlineStartY = badgeY + badgeH + Math.round(height * 0.14);

  const subFontSize = Math.max(8, Math.round(height * 0.068));
  const subLineHeight = Math.round(subFontSize * 1.3);
  const subStartY = headlineStartY + headlineLines.length * headlineLineHeight + Math.round(height * 0.09);

  const bottomBarHeight = Math.max(2, Math.round(height * 0.012));

  // En pantallas muy bajas (poca altura), un titular de 2 líneas puede dejar apenas sitio
  // para el subtítulo. Recorta a las líneas que realmente quepan antes del borde inferior.
  const availableForSub = height - bottomBarHeight - pad - subStartY;
  const maxSubLines = Math.max(1, Math.min(2, Math.floor(availableForSub / subLineHeight) + 1));
  const subLines = wrapText(slide.subheadline, textAreaWidth, subFontSize, 0.52).slice(0, maxSubLines);

  // Banda-rótulo: ancho completo (de borde a borde), para no depender de acertar el
  // tamaño exacto del texto ni de dónde la foto tenga su zona "tranquila".
  const captionTop = headlineStartY - Math.round(headlineFontSize * 0.9) - Math.round(height * 0.02);
  const captionBottom = subLines.length
    ? subStartY + (subLines.length - 1) * subLineHeight + Math.round(subFontSize * 0.55) + Math.round(height * 0.03)
    : headlineStartY + Math.round(headlineFontSize * 0.5) + Math.round(height * 0.04);
  const captionHeight = captionBottom - captionTop;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${PALETTE.white}"/>
      <stop offset="1" stop-color="${accentBg}"/>
    </linearGradient>
  </defs>

  ${
    hasPhoto
      ? `<image x="0" y="0" width="${width}" height="${height}" href="${photoDataUri}"
           preserveAspectRatio="xMidYMid slice"/>
         <rect width="${width}" height="${height}" fill="#000000" fill-opacity="${DIM_ALPHA}"/>`
      : `<rect width="${width}" height="${height}" fill="url(#bg)"/>`
  }

  <!-- Cabecera de marca -->
  <rect x="0" y="0" width="${width}" height="${headerHeight}" fill="${PALETTE.green}"/>
  <text x="${pad}" y="${Math.round(headerHeight * 0.48)}" font-family="${FONT_FAMILY}"
    font-size="${headerTitleSize}" font-weight="700" fill="${PALETTE.white}" letter-spacing="0.5">IBÉRICA SEGURIDAD</text>
  <text x="${pad}" y="${Math.round(headerHeight * 0.82)}" font-family="${FONT_FAMILY}"
    font-size="${headerSubSize}" fill="${PALETTE.greenLight}">Asesores en Seguridad · Almería</text>

  ${
    slide.badge
      ? `<rect x="${pad}" y="${badgeY}" width="${badgeWidth}" height="${badgeH}" rx="${badgeH / 2}" fill="${accent}"/>
         <text x="${pad + badgeWidth / 2}" y="${badgeY + badgeH * 0.66}" text-anchor="middle"
           font-family="${FONT_FAMILY}" font-size="${badgeFontSize}" font-weight="700"
           fill="${PALETTE.white}">${escapeXml(slide.badge.toUpperCase())}</text>`
      : ''
  }

  ${
    showQr
      ? ''
      : `<!-- Icono (se omite cuando hay QR: en 432x216 no caben los dos sin solaparse). -->
         <!-- Chip sólido/casi opaco detrás: igual que el badge, inmune a la foto de fondo. -->
         <circle cx="${iconX + iconSize / 2}" cy="${iconY + iconSize / 2}" r="${iconSize * 0.62}"
           fill="${hasPhoto ? '#0A2A14' : PALETTE.white}" fill-opacity="${hasPhoto ? 0.78 : 1}"/>
         <g transform="translate(${iconX}, ${iconY}) scale(${(iconSize / 100).toFixed(3)})">
           ${renderIcon(slide.icon, accent)}
         </g>`
  }

  ${
    hasPhoto
      ? `<!-- Banda-rótulo: ancho completo, alpha alto, garantiza contraste sea cual sea la foto. -->
         <rect x="0" y="${captionTop}" width="${width}" height="${captionHeight}"
           fill="${CAPTION_BG}" fill-opacity="${CAPTION_ALPHA}"/>`
      : ''
  }

  ${textBlock({
    x: pad,
    y: headlineStartY,
    lines: headlineLines,
    fontSize: headlineFontSize,
    lineHeight: headlineLineHeight,
    fill: hasPhoto ? PALETTE.white : PALETTE.text,
    outline: hasPhoto,
  })}

  ${textBlock({
    x: pad,
    y: subStartY,
    lines: subLines,
    fontSize: subFontSize,
    lineHeight: subLineHeight,
    fill: hasPhoto ? PALETTE.greenLight : PALETTE.muted,
    weight: 400,
    outline: hasPhoto,
  })}

  ${
    showQr
      ? `<rect x="${width - pad - qrSize}" y="${height - pad - qrSize}" width="${qrSize}" height="${qrSize}" rx="${Math.round(qrSize * 0.06)}" fill="${PALETTE.white}"
           stroke="#DCE6DD" stroke-width="1"/>
         <image x="${width - pad - qrSize + Math.round(qrSize * 0.08)}" y="${height - pad - qrSize + Math.round(qrSize * 0.08)}"
           width="${Math.round(qrSize * 0.84)}" height="${Math.round(qrSize * 0.84)}" href="${qrDataUri}"/>`
      : ''
  }

  <!-- Franja inferior -->
  <rect x="0" y="${height - bottomBarHeight}" width="${width}" height="${bottomBarHeight}" fill="${accent}"/>
</svg>`.trim();
}

module.exports = { buildSlideSvg, PALETTE };
