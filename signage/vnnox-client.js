const crypto = require('crypto');
const config = require('./config');

// Esquema de autenticación del API Gateway de VNNOX (NovaCloud Open Platform), confirmado
// por su documentación real: cabeceras AppKey/Nonce/CurTime + CheckSum = SHA256(AppSecret + Nonce + CurTime).
function buildAuthHeaders(appKey, appSecret) {
  const nonce = crypto.randomBytes(8).toString('hex');
  const curTime = Math.floor(Date.now() / 1000).toString();
  const checkSum = crypto
    .createHash('sha256')
    .update(appSecret + nonce + curTime)
    .digest('hex');

  return {
    AppKey: appKey,
    Nonce: nonce,
    CurTime: curTime,
    CheckSum: checkSum,
  };
}

class VnnoxNotConfiguredError extends Error {}

class VnnoxClient {
  constructor({ apiHost, appKey, appSecret, paths } = config.vnnox) {
    this.apiHost = apiHost;
    this.appKey = appKey;
    this.appSecret = appSecret;
    this.paths = paths;
  }

  isConfigured() {
    return Boolean(this.appKey && this.appSecret);
  }

  async request(pathName, { method = 'GET', body } = {}) {
    if (!this.isConfigured()) {
      throw new VnnoxNotConfiguredError(
        'Faltan VNNOX_APP_KEY / VNNOX_APP_SECRET. Configúralos como variables de entorno.'
      );
    }
    const headers = buildAuthHeaders(this.appKey, this.appSecret);
    const url = `${this.apiHost}${pathName}`;

    const init = { method, headers };
    if (body) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url, init);
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      throw new Error(`VNNOX API ${pathName} → HTTP ${res.status}: ${text.slice(0, 500)}`);
    }
    return json;
  }

  // Confirmado en la documentación real de la cuenta: GET /v2/player/list
  async listPlayers() {
    return this.request(this.paths.listPlayers);
  }

  // Confirmado en la documentación real de la cuenta: POST /v2/player/program/normal.
  // Sin `schedule`, VNNOX reproduce el programa en bucle 24h — que es justo lo que
  // queremos (las 4 tarjetas rotando sin más). `pages` es la lista de tarjetas a mostrar,
  // construida por run.js a partir de las imágenes ya renderizadas.
  async publishProgram(playerIds, pages) {
    return this.request(this.paths.publishProgram, {
      method: 'POST',
      body: { playerIds, pages },
    });
  }
}

module.exports = { VnnoxClient, VnnoxNotConfiguredError, buildAuthHeaders };
