const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'state.json');

// Nota: en Railway el filesystem no es persistente entre despliegues, así que este
// estado puede reiniciarse de vez en cuando. Efecto en la práctica: se regenera algún set
// de textos antes de lo previsto. No afecta a la corrección del sistema.
function load() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return { categories: {} };
  }
}

function save(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

function daysSince(iso) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

// El set cerrado de textos se regenera muy de tarde en tarde (por defecto, cada 6 meses):
// el objetivo es repetición, no novedad, así que casi nunca hace falta pedir nada nuevo a la IA.
function needsNewPool(entry, maxAgeDays = 180) {
  return !entry || !Array.isArray(entry.pool) || entry.pool.length === 0 || daysSince(entry.poolGeneratedAt) >= maxAgeDays;
}

// Avanza al siguiente elemento del set cada `rotationDays`, en bucle. Si el set es nuevo
// (recién generado), empieza por el primero.
function needsAdvance(entry, rotationDays) {
  return !entry || entry.currentIndex == null || daysSince(entry.lastAdvanceAt) >= rotationDays;
}

module.exports = { load, save, daysSince, needsNewPool, needsAdvance, STATE_PATH };
