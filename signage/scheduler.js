const cron = require('node-cron');
const { runWeeklySignage } = require('./run');

// Todos los lunes a las 07:00 (hora de España). La estrategia decide internamente qué
// categorías necesitan copy nuevo esta semana; el resto de contenido se mantiene tal cual.
const WEEKLY_CRON = process.env.SIGNAGE_CRON || '0 7 * * 1';

function start() {
  if (process.env.SIGNAGE_ENABLED === 'false') {
    console.log('Señalización LED: deshabilitada (SIGNAGE_ENABLED=false).');
    return;
  }

  cron.schedule(
    WEEKLY_CRON,
    async () => {
      console.log('Señalización LED: iniciando actualización semanal...');
      try {
        const summary = await runWeeklySignage({ publish: true });
        console.log('Señalización LED: actualización completada.', summary.publish);
      } catch (err) {
        console.error('Señalización LED: error en la ejecución semanal.', err);
      }
    },
    { timezone: 'Europe/Madrid' }
  );

  console.log(`Señalización LED: programada (cron "${WEEKLY_CRON}", Europe/Madrid).`);
}

module.exports = { start };
