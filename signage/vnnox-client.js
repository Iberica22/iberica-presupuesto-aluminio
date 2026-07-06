const crypto = require('crypto');
const config = require('./config');

// Esquema de autenticación del API Gateway de VNNOX (NovaCloud Open Platform), confirmado
// por su documentación pública: cabeceras AppKey/Nonce/CurTime + CheckSum = SHA256(AppSecret + Nonce + CurTime).
// https://developer-en.vnnox.com/ (requiere cuenta para ver el detalle completo de cada endpoint)
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

  async request(pathName, { method = 'GET', body, isMultipart = false } = {}) {
    if (!this.isConfigured()) {
      throw new VnnoxNotConfiguredError(
        'Faltan VNNOX_APP_KEY / VNNOX_APP_SECRET. Configúralos como variables de entorno.'
      );
    }
    const headers = buildAuthHeaders(this.appKey, this.appSecret);
    const url = `${this.apiHost}${pathName}`;

    const init = { method, headers };
    if (body && !isMultipart) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    } else if (body && isMultipart) {
      init.body = body; // se espera un FormData
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

  // Confirmado en la documentación pública: GET /v2/player/list
  async listPlayers() {
    return this.request(this.paths.listPlayers);
  }

  // ⚠️ Ruta/payload por confirmar en el "API Explorer" de vuestra cuenta antes del primer uso real
  // (developer-en.vnnox.com, sección Media). Ver signage/README.md.
  async uploadMedia(buffer, filename) {
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: 'image/png' }), filename);
    return this.request(this.paths.uploadMedia, { method: 'POST', body: form, isMultipart: true });
  }

  // ⚠️ Ruta/payload por confirmar (sección Program/Playlist).
  async upsertProgram(programName, mediaRefs) {
    return this.request(this.paths.upsertProgram, {
      method: 'POST',
      body: { name: programName, items: mediaRefs },
    });
  }

  // ⚠️ Ruta/payload por confirmar (sección Program → Publish/Sync a terminal).
  async publishToTerminals(programId, terminalIds) {
    return this.request(this.paths.publishProgram, {
      method: 'POST',
      body: { programId, terminalIds },
    });
  }
}

module.exports = { VnnoxClient, VnnoxNotConfiguredError, buildAuthHeaders };
