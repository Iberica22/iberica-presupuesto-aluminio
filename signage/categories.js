// Catálogo de categorías de contenido para las pantallas LED del escaparate.
//
// Diseño (revisado tras consultar a los agentes de marca/contenido): la pantalla la ve
// sobre todo gente pasando por la calle (2-4 seg, sin necesidad activa), así que el
// objetivo principal de 4 de estas piezas es RECUERDO DE MARCA, no conversión inmediata.
// Por eso:
//  - `rotationDays` es más largo que antes: el recuerdo se construye con repetición, no
//    con contenido nuevo constante.
//  - `poolSize`: en vez de pedir texto nuevo a la IA cada vez que toca rotar, se genera
//    UN SET CERRADO de `poolSize` mensajes (una sola vez, o cuando el set envejece mucho)
//    y el sistema simplemente avanza al siguiente de la lista en cada rotación.
//  - El icono NUNCA lo elige la IA: es fijo por servicio, para que el reconocimiento sea
//    visual (mismo icono = mismo servicio, siempre) antes que por lectura del texto.
//  - El QR (ahora a WhatsApp) y el teléfono son elementos FIJOS de la plantilla — no hay
//    ya una categoría "CTA" propia que les "robe turno" a las demás.

// badgeLabel: texto corto para el badge en pantalla (el badge no tiene sitio para etiquetas
// largas). label: nombre descriptivo, solo para logs/documentación interna.
const SERVICES = [
  { id: 'cerrajeria', label: 'Cerrajería urgente', badgeLabel: 'CERRAJERÍA', icon: 'lock' },
  { id: 'alarmas', label: 'Alarmas y CCTV', badgeLabel: 'ALARMAS', icon: 'camera' },
  { id: 'puertas', label: 'Puertas acorazadas', badgeLabel: 'PUERTAS', icon: 'shield' },
  { id: 'domotica', label: 'Domótica', badgeLabel: 'DOMÓTICA', icon: 'home' },
];

const CATEGORIES = [
  {
    key: 'oferta',
    label: 'Oferta de la semana',
    badgeLabel: 'OFERTA',
    rotationDays: 7,
    poolSize: 6,
    accent: 'green',
    icon: 'percent',
    formula:
      'Formato pregunta, siempre: empieza con "¿Y si...?", "¿Sabías que...?" o equivalente. ' +
      'Es la fórmula reconocible de esta categoría, repítela en las 6 variantes.',
    brief:
      'Gancho memorable sobre un problema cotidiano de seguridad del hogar/negocio (quedarse ' +
      'fuera de casa, una cerradura antigua, no saber si la puerta es segura, etc.). No pide ' +
      'una acción inmediata, solo planta la idea para que se recuerde. No mencionar automatismos.',
  },
  {
    key: 'catalogo',
    label: 'Servicio destacado',
    rotationDays: 21,
    accent: 'gray',
    // Esta categoría no tiene "poolSize" propio: rota en orden fijo por los 4 servicios,
    // uno por vez, y cada servicio tiene su icono fijo (nunca elegido por la IA).
    services: SERVICES,
    brief:
      'Formato "¿Sabías que también hacemos...?": amplía qué servicios asocia la gente con la ' +
      'marca, sin presionar a la acción. Un mensaje por cada uno de los 4 servicios.',
  },
  {
    key: 'caso_exito',
    label: 'Confianza / resultados',
    badgeLabel: 'CONFIANZA',
    rotationDays: 30,
    poolSize: 4,
    accent: 'green',
    icon: 'star',
    brief:
      'Prueba social basada en los valores reales de marca: "hacemos lo que decimos", equipo ' +
      'propio que fabrica, instala y responde, cercanía real, sin depender de terceros. No ' +
      'inventar cifras ni testimonios de clientes reales concretos.',
  },
  {
    key: 'marca',
    label: 'Marca',
    badgeLabel: 'IBÉRICA SEGURIDAD',
    rotationDays: 90,
    poolSize: 3,
    accent: 'green',
    icon: 'shield',
    brief:
      'Mensaje institucional puro: misión "Seguridad que se siente cerca", especialidad y zona ' +
      '(Almería capital y provincia). Tono profesional, cercano, directo. Casi no debería cambiar.',
  },
];

module.exports = { CATEGORIES, SERVICES };
