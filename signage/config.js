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

  // URL pública de este chatbot de presupuestos (ya no se usa para el QR de las pantallas,
  // que ahora apunta a WhatsApp — se deja por si hace falta en el futuro).
  siteUrl:
    process.env.SIGNAGE_SITE_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : ''),

  // Contacto fijo mostrado siempre en las 4 categorías (no son secretos, son públicos por
  // diseño: se muestran en la pantalla del escaparate).
  contact: {
    // Teléfono fijo/centralita, mostrado como texto en la cabecera.
    phone: envTrimmed('SIGNAGE_PHONE', '950 08 80 86'),
    // Número de WhatsApp conectado al chatbot: el QR abre una conversación directa con un
    // mensaje predefinido, en vez de cargar la web — más rápido para quien pasa por la calle.
    whatsappNumber: envTrimmed('SIGNAGE_WHATSAPP_NUMBER', '34661665929'),
    whatsappMessage: envTrimmed('SIGNAGE_WHATSAPP_MESSAGE', 'Hola, quiero información'),
  },

  vnnox: {
    // Host confirmado directamente en la cuenta real (NovaCloud Open Platform → pestaña
    // "Authentication" → "Domain Name and Key"): open-au.vnnox.com, NO open-eu.vnnox.com
    // como se asumió al principio por analogía con el panel eu.vnnox.com — VNNOX asigna el
    // nodo de API por cuenta, no necesariamente coincide con el país del panel web.
    apiHost: envTrimmed('VNNOX_API_HOST', 'https://open-au.vnnox.com'),
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
