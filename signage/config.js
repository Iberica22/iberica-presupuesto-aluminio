// Configuración del pipeline de contenido para las pantallas LED.
// Todo se lee de variables de entorno para no tocar código al desplegar.

function envInt(name, fallback) {
  const v = parseInt(process.env[name], 10);
  return Number.isFinite(v) ? v : fallback;
}

// Quita espacios/saltos de línea accidentales al copiar/pegar claves (típico en Windows).
function envTrimmed(name, fallback = '') {
  return (process.env[name] || fallback).trim();
}

module.exports = {
  // 432x216 = resolución real de la pantalla LED de la tienda (confirmada vía VNNOX
  // GET /v2/player/list), no 1920x1080 como se asumió antes de tener el dato real.
  screen: {
    width: envInt('SIGNAGE_SCREEN_WIDTH', 432),
    height: envInt('SIGNAGE_SCREEN_HEIGHT', 216),
  },

  openaiModel: process.env.SIGNAGE_OPENAI_MODEL || 'gpt-4o-mini',

  // URL pública de este chatbot de presupuestos, para el QR de las pantallas.
  siteUrl:
    process.env.SIGNAGE_SITE_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : ''),

  vnnox: {
    // Host regional del API Gateway. El panel del cliente es eu.vnnox.com → región EU.
    apiHost: envTrimmed('VNNOX_API_HOST', 'https://open-eu.vnnox.com'),
    appKey: envTrimmed('VNNOX_APP_KEY'),
    appSecret: envTrimmed('VNNOX_APP_SECRET'),
    terminalIds: (process.env.VNNOX_TERMINAL_IDS || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    programName: process.env.VNNOX_PROGRAM_NAME || 'Ibérica Seguridad - Escaparate',
    // ⚠️ Rutas del API aún sin verificar contra el "API Explorer" de developer-en.vnnox.com
    // (la documentación bloquea el acceso automatizado). Verificar y ajustar aquí una vez
    // tengáis AK/AS — ver signage/README.md.
    paths: {
      listPlayers: process.env.VNNOX_PATH_LIST_PLAYERS || '/v2/player/list',
      uploadMedia: process.env.VNNOX_PATH_UPLOAD_MEDIA || '/v2/media/upload',
      upsertProgram: process.env.VNNOX_PATH_UPSERT_PROGRAM || '/v2/program/save',
      publishProgram: process.env.VNNOX_PATH_PUBLISH_PROGRAM || '/v2/program/publish',
    },
  },

  adminToken: envTrimmed('SIGNAGE_ADMIN_TOKEN'),
};
