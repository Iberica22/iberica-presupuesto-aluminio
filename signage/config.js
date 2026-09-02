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

  // URL pública de este servidor: hace falta para dos cosas — construir las URLs de
  // /signage-preview/<categoría>.png que se le pasan a VNNOX (así no hay que "subir" nada,
  // VNNOX descarga la imagen solo con esa URL), y como fallback para el QR si algún día se
  // quisiera volver a apuntar a la web en vez de a WhatsApp.
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
    // Duración de cada tarjeta en pantalla dentro del bucle, en milisegundos.
    slideDurationMs: envInt('VNNOX_SLIDE_DURATION_MS', 10000),
    // Rutas confirmadas en la documentación real de la cuenta (developer-en.vnnox.com):
    // un único endpoint crea el programa Y lo publica a los reproductores a la vez — no
    // existe ni hace falta un paso separado de "subir media" (cada widget PICTURE lleva su
    // propia URL pública, tamaño y MD5; VNNOX descarga la imagen él solo).
    paths: {
      listPlayers: process.env.VNNOX_PATH_LIST_PLAYERS || '/v2/player/list',
      publishProgram: process.env.VNNOX_PATH_PUBLISH_PROGRAM || '/v2/player/program/normal',
    },
  },

  adminToken: envTrimmed('SIGNAGE_ADMIN_TOKEN'),
};
