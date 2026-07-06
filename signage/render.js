const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const QRCode = require('qrcode');
const config = require('./config');
const { buildSlideSvg } = require('./svg-template');

const OUTPUT_DIR = path.join(__dirname, 'output');

async function renderSlide(slide) {
  const qrDataUri = config.siteUrl
    ? await QRCode.toDataURL(config.siteUrl, { margin: 1, width: 220 })
    : null;

  const svg = buildSlideSvg(slide, {
    width: config.screen.width,
    height: config.screen.height,
    qrDataUri,
    siteUrl: config.siteUrl,
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
