// Catálogo de categorías de contenido para las pantallas LED del escaparate.
// `rotationDays` = cada cuánto se le pide a la IA copy nueva para esa categoría.
// Entre medias, la pantalla sigue mostrando la última versión (no se regenera sin necesidad).

module.exports = [
  {
    key: 'oferta',
    label: 'Oferta / gancho de la semana',
    rotationDays: 7,
    accent: 'green',
    brief:
      'La pieza más llamativa de la semana: una promoción, ventaja competitiva o urgencia sobre ' +
      'cerrajería, alarmas/CCTV, puertas acorazadas o domótica (ej. cerrajero urgente 24h, revisión ' +
      'gratuita de alarma, refuerzo de puerta antes del verano). Debe cambiar cada semana. No mencionar ' +
      'automatismos: no es un servicio activo.',
  },
  {
    key: 'catalogo',
    label: 'Servicio destacado',
    rotationDays: 14,
    accent: 'gray',
    brief:
      'Un servicio concreto del catálogo (cerrajería, alarmas y videovigilancia CCTV, puertas acorazadas, ' +
      'domótica/control desde el móvil). Rota cada dos semanas por un servicio distinto al de la última vez. ' +
      'No mencionar automatismos.',
  },
  {
    key: 'caso_exito',
    label: 'Confianza / resultados',
    rotationDays: 14,
    accent: 'green',
    brief:
      'Prueba social basada en los valores reales de la marca: "hacemos lo que decimos", equipo propio que ' +
      'fabrica, instala y responde, cercanía real, sin depender de terceros. No inventar cifras ni ' +
      'testimonios de clientes reales concretos (se sustituirá por fotos de proyectos reales cuando el ' +
      'equipo las facilite).',
  },
  {
    key: 'marca',
    label: 'Marca',
    rotationDays: 30,
    accent: 'green',
    brief:
      'Refuerzo de marca: "Ibérica Seguridad, Asesores en Seguridad", especialidad (seguridad para el hogar ' +
      'y el negocio), zona de servicio (Almería capital y provincia). Tono profesional, cercano, directo y ' +
      'sin rodeos. Cambia poco, casi siempre el mismo mensaje de fondo.',
  },
  {
    key: 'cta',
    label: 'Llamada a la acción / QR',
    rotationDays: 30,
    accent: 'gray',
    brief:
      'CTA directo a pedir presupuesto ahora mismo escaneando el QR en pantalla. Mensaje muy corto y claro.',
  },
];
