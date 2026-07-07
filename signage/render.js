const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const QRCode = require('qrcode');
const config = require('./config');
const { buildSlideSvg } = require('./svg-template');

const OUTPUT_DIR = path.join(__dirname, 'output');
const PHOTOS_DIR = path.join(__dirname, 'assets', 'photos');

// Si existe signage/assets/photos/<key>.(jpg|png), se usa como fondo del slide en vez del
// degradado de color liso. Devuelve null si no hay foto (comportamiento actual sin cambios).
function findPhotoDataUri(key) {
  for (const ext of ['jpg', 'jpeg', 'png']) {
    const filePath = path.join(PHOTOS_DIR, `${key}.${ext}`);
    if (fs.existsSync(filePath)) {
      const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
      const base64 = fs.readFileSync(filePath).toString('base64');
      return `data:${mime};base64,${base64}`;
    }
  }
  return null;
}

async function renderSlide(slide) {
  const qrDataUri = config.siteUrl
    ? await QRCode.toDataURL(config.siteUrl, { margin: 1, width: 220 })
    : null;
  const photoDataUri = findPhotoDataUri(slide.key);

  const svg = buildSlideSvg(slide, {
    width: config.screen.width,
    height: config.screen.height,
    qrDataUri,
    siteUrl: config.siteUrl,
    photoDataUri,
  });

  const filePath = path.join(OUTPUT_DIR, `${slide.key}.png`);
  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(filePath, buffer);

  return { key: slide.key, filePath, buffer };
}

async function renderPlan(plan) {
  const results = [];
  for (const slide of plan) {
    results.push(await renderSlide(slide));
  }
  return results;
}

module.exports = { renderSlide, renderPlan, OUTPUT_DIR };
