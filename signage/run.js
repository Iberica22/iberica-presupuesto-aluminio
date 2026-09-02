const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const { buildWeeklyPlan } = require('./strategy');
const { renderPlan } = require('./render');
const { VnnoxClient, VnnoxNotConfiguredError } = require('./vnnox-client');

const LOG_DIR = path.join(__dirname, 'logs');

// Cada widget PICTURE necesita su URL pública, tamaño y MD5 — no hace falta "subir" nada a
// VNNOX antes, su servidor descarga la imagen él solo desde /signage-preview/<key>.png.
function buildPage(item) {
  return {
    name: item.key,
    repeatCount: 1,
    widgets: [
      {
        zIndex: 1,
        type: 'PICTURE',
        size: item.buffer.length,
        md5: crypto.createHash('md5').update(item.buffer).digest('hex'),
        duration: config.vnnox.slideDurationMs,
        url: `${config.siteUrl}/signage-preview/${item.key}.png`,
        layout: { x: '0%', y: '0%', width: '100%', height: '100%' },
      },
    ],
  };
}

async function publishToScreens(rendered) {
  const client = new VnnoxClient();
  if (!client.isConfigured()) {
    return {
      published: false,
      reason:
        'VNNOX_APP_KEY / VNNOX_APP_SECRET no configurados: las imágenes se generaron pero no se han subido a las pantallas.',
    };
  }
  if (!config.vnnox.terminalIds.length) {
    return {
      published: false,
      reason: 'VNNOX_TERMINAL_IDS vacío: no sé a qué pantalla(s) publicar.',
    };
  }
  if (!config.siteUrl) {
    return {
      published: false,
      reason:
        'SIGNAGE_SITE_URL (o RAILWAY_PUBLIC_DOMAIN) no configurado: VNNOX necesita una URL pública desde la que descargar las imágenes.',
    };
  }

  const pages = rendered.map(buildPage);
  await client.publishProgram(config.vnnox.terminalIds, pages);

  return { published: true };
}

async function runWeeklySignage({ publish = true } = {}) {
  const startedAt = new Date().toISOString();
  const plan = await buildWeeklyPlan();
  const rendered = await renderPlan(plan);

  let publishResult = { published: false, reason: 'Publicación desactivada (dry-run).' };
  if (publish) {
    try {
      publishResult = await publishToScreens(rendered);
    } catch (err) {
      publishResult = {
        published: false,
        reason: err instanceof VnnoxNotConfiguredError ? err.message : `Error publicando: ${err.message}`,
      };
    }
  }

  const summary = {
    startedAt,
    finishedAt: new Date().toISOString(),
    slides: plan.map((s) => ({
      key: s.key,
      label: s.label,
      badge: s.badge,
      poolIndex: s.poolIndex,
      poolSize: s.poolSize,
      headline: s.headline,
    })),
    publish: publishResult,
  };

  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(LOG_DIR, `run-${startedAt.replace(/[:.]/g, '-')}.json`),
    JSON.stringify(summary, null, 2),
    'utf-8'
  );

  return summary;
}

if (require.main === module) {
  const publish = !process.argv.includes('--dry-run');
  runWeeklySignage({ publish })
    .then((summary) => {
      console.log(JSON.stringify(summary, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error en el pipeline de señalización:', err);
      process.exit(1);
    });
}

module.exports = { runWeeklySignage };
