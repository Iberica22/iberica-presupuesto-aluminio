const OpenAI = require('openai');
const config = require('./config');
const CATEGORIES = require('./categories');
const state = require('./state');

const BRAND_BRIEF = `
Empresa: Ibérica Seguridad — Asesores en Seguridad, Almería capital y provincia.
Servicios activos: cerrajería (incl. urgencias), alarmas y videovigilancia (CCTV), puertas
acorazadas/de seguridad, domótica y control desde el móvil. NO ofrecer "automatismos" (motorización
de puertas/persianas): no es un servicio activo actualmente, no lo menciones nunca como oferta.
Diferenciación: fabricantes, instaladores y asesores propios, sin depender de terceros — "todo en
uno, contigo en todo".
Misión de marca: "Seguridad que se siente cerca". Visión: "Liderar sin perder el alma".
Valores: compromiso que se nota (cumplen lo que prometen), cercanía real (trato humano, no frío ni
genérico), soluciones que piensan en ti (no venden más, venden mejor).
Personalidad: resolutivos por naturaleza, claros como el agua (comunicación directa y honesta, sin
tecnicismos ni letra pequeña), innovación con propósito (tecnología que suma, no que estorba).
Público: personas prácticas y ocupadas que valoran la confianza y la rapidez, quieren soluciones
completas sin depender de varios proveedores, y que alguien responda si algo falla.
Canal: pantalla LED de escaparate, se ve desde la calle o dentro de la tienda a varios metros.
`.trim();

const ICONS = ['lock', 'shield', 'percent', 'camera', 'phone', 'star', 'home'];
const ACCENTS = ['green', 'gray'];

const SYSTEM_PROMPT = `
Eres el estratega de marketing y comunicación de una empresa de seguridad para el hogar y el
negocio. Escribes textos cortísimos para una pantalla LED de escaparate que la gente ve al pasar
(2-4 segundos de atención).

Reglas de redacción:
- headline: máximo 6 palabras, en español, con gancho real (no genérico ni vacío).
- subheadline: máximo 10 palabras, complementa al headline, nunca lo repite.
- badge: máximo 3 palabras, opcional, para una etiqueta pequeña (puede ir vacío "").
- icon: elige exactamente uno de esta lista: ${ICONS.join(', ')}.
- accent: elige exactamente uno de esta lista: ${ACCENTS.join(', ')}.
- Ten en cuenta la fecha/estación del año para que el mensaje sea oportuno (calor en verano,
  aislamiento en invierno, etc.) cuando la categoría lo permita.
- No inventes cifras de descuento, testimonios de clientes reales ni certificaciones que no
  se hayan dado como contexto.

Responde SOLO con un JSON con esta forma exacta:
{"slides": [{"key": "...", "headline": "...", "subheadline": "...", "badge": "...", "icon": "...", "accent": "..."}]}
`.trim();

async function generateCopy(categoriesToRefresh) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const today = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const userPrompt = `
Contexto de marca:
${BRAND_BRIEF}

Fecha de hoy: ${today}

Genera copy nuevo para estas categorías (una entrada por cada "key"):
${categoriesToRefresh
  .map((c) => `- key: "${c.key}" (${c.label}). Enfoque: ${c.brief}`)
  .join('\n')}
`.trim();

  const response = await client.chat.completions.create({
    model: config.openaiModel,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });

  const parsed = JSON.parse(response.choices[0].message.content);
  if (!Array.isArray(parsed.slides)) throw new Error('Respuesta de estrategia sin "slides"');
  return parsed.slides;
}

// Decide qué categorías necesitan copy nuevo esta ejecución y devuelve el set completo
// de slides (mezclando lo recién generado con lo que sigue vigente).
async function buildWeeklyPlan() {
  const s = state.load();
  s.slides = s.slides || {};

  const toRefresh = CATEGORIES.filter((c) => state.needsRefresh(s, c));
  const fresh = toRefresh.length ? await generateCopy(toRefresh) : [];

  const now = new Date().toISOString();
  for (const item of fresh) {
    const category = CATEGORIES.find((c) => c.key === item.key);
    if (!category) continue;
    s.slides[item.key] = {
      generatedAt: now,
      headline: item.headline || '',
      subheadline: item.subheadline || '',
      badge: item.badge || '',
      icon: ICONS.includes(item.icon) ? item.icon : 'star',
      accent: ACCENTS.includes(item.accent) ? item.accent : category.accent,
    };
  }

  state.save(s);

  const plan = CATEGORIES.filter((c) => s.slides[c.key]).map((c) => ({
    key: c.key,
    label: c.label,
    refreshedNow: toRefresh.some((r) => r.key === c.key),
    ...s.slides[c.key],
  }));

  return plan;
}

module.exports = { buildWeeklyPlan, ICONS, ACCENTS, BRAND_BRIEF };
