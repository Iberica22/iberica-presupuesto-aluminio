// Catálogo de categorías de contenido para las pantallas LED del escaparate.
// `rotationDays` = cada cuánto se le pide a la IA copy nueva para esa categoría.
// Entre medias, la pantalla sigue mostrando la última versión (no se regenera sin necesidad).

module.exports = [
  {
    key: 'oferta',
    label: 'Oferta / gancho de la semana',
    rotationDays: 7,
    accent: 'blue',
    brief:
      'La pieza más llamativa de la semana: una promoción, ventaja competitiva o urgencia ' +
      '(financiación, presupuesto gratis en 5 minutos, oferta de temporada). Debe cambiar cada semana.',
  },
  {
    key: 'catalogo',
    label: 'Producto destacado',
    rotationDays: 14,
    accent: 'green',
    brief:
      'Un producto o línea concreta del catálogo (ventanas correderas, practicables EVO, RPT alta ' +
      'eficiencia, cerramientos de terraza, toldos, mamparas). Rota cada dos semanas por un producto distinto ' +
      'al de la última vez.',
  },
  {
    key: 'caso_exito',
    label: 'Confianza / resultados',
    rotationDays: 14,
    accent: 'blue',
    brief:
      'Prueba social: años de experiencia, clientes satisfechos, garantía de instalación, sellos de calidad. ' +
      'No inventar cifras ni testimonios de clientes reales concretos; usar mensajes genéricos de confianza ' +
      '(se sustituirá por fotos de proyectos reales cuando el equipo las facilite).',
  },
  {
    key: 'marca',
    label: 'Marca',
    rotationDays: 30,
    accent: 'blue',
    brief:
      'Refuerzo de marca: quiénes son, especialidad (carpintería de aluminio), zona de servicio (Sevilla y ' +
      'provincia). Tono profesional y cercano. Cambia poco, casi siempre el mismo mensaje de fondo.',
  },
  {
    key: 'cta',
    label: 'Llamada a la acción / QR',
    rotationDays: 30,
    accent: 'green',
    brief:
      'CTA directo a pedir presupuesto ahora mismo escaneando el QR en pantalla. Mensaje muy corto y claro.',
  },
];
