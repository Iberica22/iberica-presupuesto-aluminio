const fs = require('fs');
const path = require('path');

const STATE_PATH = path.join(__dirname, 'state.json');

// Nota: en Railway el filesystem no es persistente entre despliegues, así que este
// estado puede reiniciarse de vez en cuando. Efecto en la práctica: alguna categoría
// se regenerará algo antes de lo previsto. No afecta a la corrección del sistema.
function load() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  } catch {
    return { slides: {} };
  }
}

function save(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

function needsRefresh(state, category, now = new Date()) {
  const entry = state.slides[category.key];
  if (!entry) return true;
  const last = new Date(entry.generatedAt);
  const elapsedDays = (now - last) / (1000 * 60 * 60 * 24);
  return elapsedDays >= category.rotationDays;
}

module.exports = { load, save, needsRefresh, STATE_PATH };
