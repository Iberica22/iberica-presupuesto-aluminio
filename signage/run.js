const fs = require('fs');
const path = require('path');
const config = require('./config');
const { buildWeeklyPlan } = require('./strategy');
const { renderPlan } = require('./render');
const { VnnoxClient, VnnoxNotConfiguredError } = require('./vnnox-client');

const LOG_DIR = path.join(__dirname, 'logs');

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

  const mediaRefs = [];
  for (const item of rendered) {
    const media = await client.uploadMedia(item.buffer, `${item.key}.png`);
    mediaRefs.push(media);
  }
  const program = await client.upsertProgram(config.vnnox.programName, mediaRefs);
  await client.publishToTerminals(program.id || program.programId, config.vnnox.terminalIds);

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
