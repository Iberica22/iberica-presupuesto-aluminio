const OpenAI = require('openai');
const config = require('./config');
const { CATEGORIES, SERVICES } = require('./categories');
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
Canal: pantalla LED de escaparate, se ve desde la calle o dentro de la tienda a varios metros,
sobre todo por gente pasando 2-4 segundos SIN necesidad activa en ese momento — el objetivo
principal es quedarse en la memoria (recuerdo de marca), no arrancar una conversión inmediata.
`.trim();

const SYSTEM_PROMPT = `
Eres el estratega de marketing y comunicación de una empresa de seguridad para el hogar y el
negocio. Escribes textos cortísimos para una pantalla LED de escaparate que la gente ve al pasar
(2-4 segundos de atención), pensados para RECORDARSE con el tiempo, no para vender en el momento.

Reglas de redacción:
- headline: máximo 6 palabras, en español, con gancho real (no genérico ni vacío).
- subheadline: máximo 10 palabras, complementa al headline, nunca lo repite.
- No inventes cifras de descuento, testimonios de clientes reales ni certificaciones que no se
  hayan dado como contexto.
- No menciones nunca "automatismos": no es un servicio activo.
- Si se te da una fórmula/patrón verbal fijo para la categoría, síguelo en TODAS las variantes que
  generes — el patrón repetido es lo que se reconoce, no el contenido concreto.

Responde SOLO con un JSON con esta forma exacta:
{"items": [{"headline": "...", "subheadline": "..."}, ...]}
`.trim();

async function callOpenAI(userPrompt) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: config.openaiModel,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  });
  const parsed = JSON.parse(response.choices[0].message.content);
  if (!Array.isArray(parsed.items)) throw new Error('Respuesta de estrategia sin "items"');
  return parsed.items;
}

// Genera el set cerrado de una categoría normal (oferta / caso_exito / marca): N variantes
// que comparten el mismo icono y la misma etiqueta (badge), fijados por código, no por la IA.
async function generatePoolForCategory(category) {
  const userPrompt = `
Contexto de marca:
${BRAND_BRIEF}

Categoría: "${category.label}". Enfoque: ${category.brief}
${category.formula ? `Fórmula/patrón fijo a repetir en las ${category.poolSize} variantes: ${category.formula}` : ''}

Genera ${category.poolSize} variantes distintas de headline+subheadline para esta categoría. Deben
poder repetirse en bucle durante meses, así que cada una debe funcionar de forma independiente.
`.trim();

  const items = await callOpenAI(userPrompt);
  return items.slice(0, category.poolSize).map((item) => ({
    headline: item.headline || '',
    subheadline: item.subheadline || '',
    badge: category.badgeLabel,
    icon: category.icon,
  }));
}

// Genera el "catálogo" de servicio destacado: un mensaje por cada uno de los 4 servicios,
// en orden fijo. El icono y la etiqueta vienen de SERVICES (código), nunca de la IA.
async function generateCatalogoPool(category) {
  const userPrompt = `
Contexto de marca:
${BRAND_BRIEF}

Categoría: "${category.label}". Enfoque: ${category.brief}

Genera un headline+subheadline para CADA uno de estos servicios, en este orden, uno por línea:
${SERVICES.map((s, i) => `${i + 1}. ${s.label}`).join('\n')}

Responde con un array "items" de exactamente ${SERVICES.length} elementos, en el mismo orden.
`.trim();

  const items = await callOpenAI(userPrompt);
  return SERVICES.map((service, i) => ({
    headline: (items[i] && items[i].headline) || '',
    subheadline: (items[i] && items[i].subheadline) || '',
    badge: service.badgeLabel,
    icon: service.icon,
    // Cada servicio necesita su propia foto de fondo (no tiene sentido una sola foto para
    // los 4): render.js la busca en signage/assets/photos/catalogo_<serviceId>.jpg.
    photoKey: `catalogo_${service.id}`,
  }));
}

// Decide qué categorías necesitan un set nuevo (raro: solo si no existe o si ha envejecido
// mucho, ver state.needsNewPool), avanza el índice de las que tocan rotar, y devuelve el
// plan completo (un slide por categoría) para renderizar esta ejecución.
async function buildWeeklyPlan() {
  const s = state.load();
  s.categories = s.categories || {};

  for (const category of CATEGORIES) {
    const entry = s.categories[category.key] || {};

    if (state.needsNewPool(entry)) {
      const pool = category.services
        ? await generateCatalogoPool(category)
        : await generatePoolForCategory(category);

      s.categories[category.key] = {
        pool,
        poolGeneratedAt: new Date().toISOString(),
        currentIndex: 0,
        lastAdvanceAt: new Date().toISOString(),
      };
    } else if (state.needsAdvance(entry, category.rotationDays)) {
      const nextIndex = (entry.currentIndex + 1) % entry.pool.length;
      s.categories[category.key] = {
        ...entry,
        currentIndex: nextIndex,
        lastAdvanceAt: new Date().toISOString(),
      };
    }
  }

  state.save(s);

  return CATEGORIES.map((category) => {
    const entry = s.categories[category.key];
    const current = entry.pool[entry.currentIndex];
    return {
      key: category.key,
      label: category.label,
      accent: category.accent,
      poolIndex: entry.currentIndex,
      poolSize: entry.pool.length,
      ...current,
    };
  });
}

module.exports = { buildWeeklyPlan, BRAND_BRIEF };
