# Señalización LED del escaparate

Pipeline autónomo que cada semana decide qué contenido mostrar en las pantallas LED de la
tienda, lo genera y lo publica en VNNOX.

## Cómo funciona

1. **Estrategia** (`strategy.js`): un prompt de marketing/marca (con contexto de la empresa,
   temporada del año, etc.) le pide a OpenAI el copy de las categorías que tocan renovar esta
   semana. El resto de categorías se mantiene tal cual — así el contenido rota a distinta
   velocidad según su tipo:

   | Categoría               | Rotación   |
   |-------------------------|------------|
   | Oferta / gancho semana  | 7 días     |
   | Servicio destacado      | 14 días    |
   | Confianza / resultados  | 14 días    |
   | Marca                   | 30 días    |
   | CTA / QR                | 30 días    |

   Servicios activos: cerrajería, alarmas y videovigilancia (CCTV), puertas acorazadas, domótica.
   Automatismos (motorización) NO está activo, el prompt tiene instrucción explícita de no
   mencionarlo.

   Editable en `categories.js`.

2. **Render** (`render.js` + `svg-template.js`): cada slide se dibuja como SVG con la paleta
   de marca (la misma de `public/style.css`) y se convierte a PNG a la resolución configurada
   (1920×1080 por defecto). Incluye un QR que enlaza directamente a este chatbot de
   presupuestos, para cerrar el círculo escaparate → presupuesto.

3. **Publicación** (`vnnox-client.js`): sube las imágenes y actualiza el programa/playlist en
   VNNOX, y lo publica en las pantallas configuradas.

4. **Automatización**: `scheduler.js` lo ejecuta cada lunes 07:00 (hora de España) dentro del
   propio servidor de Railway (siempre corriendo). También hay un endpoint manual para
   probarlo cuando quieras: `POST /api/signage/run-now` con cabecera `x-admin-token`.

## Configuración necesaria (variables de entorno)

```
OPENAI_API_KEY=...                # ya la tenéis para el chatbot

SIGNAGE_SITE_URL=https://vuestro-dominio   # para el QR de las pantallas
SIGNAGE_ADMIN_TOKEN=un-token-cualquiera    # para poder llamar a /api/signage/run-now

VNNOX_APP_KEY=...
VNNOX_APP_SECRET=...
VNNOX_TERMINAL_IDS=id1,id2                 # IDs de los reproductores/pantallas en VNNOX
VNNOX_API_HOST=https://open-eu.vnnox.com   # host de la región EU (por defecto)
```

### Cómo conseguir las claves de VNNOX

1. Entra en `developer-en.vnnox.com` con la misma cuenta de `eu.vnnox.com`.
2. Genera tu AppKey (AK) y AppSecret (AS) — son automáticos al entrar la primera vez.
3. Busca los IDs de tus pantallas/reproductores (sección "Player"/"Terminal").

### ⚠️ Importante: verificar las rutas del API antes del primer uso real

No pude acceder a la documentación completa de VNNOX de forma automatizada (su web bloquea
tráfico de bots), así que **solo la autenticación está confirmada al 100%** (cabeceras
`AppKey/Nonce/CurTime/CheckSum`, ver `vnnox-client.js`). Las rutas de subida de media y de
gestión de programa (`vnnox.paths.uploadMedia`, `upsertProgram`, `publishProgram` en
`config.js`) son mi mejor estimación siguiendo el patrón `/v2/...` que sí verifiqué (el
listado de reproductores, `/v2/player/list`, está confirmado).

Antes de dar por bueno el primer envío real:

1. Entra en el "API Explorer" interactivo de `developer-en.vnnox.com` con vuestra cuenta.
2. Busca las llamadas de subida de media y de creación/publicación de programa, y compara
   la ruta exacta con la de `config.js`.
3. Si difiere, ajústala con las variables de entorno `VNNOX_PATH_UPLOAD_MEDIA`,
   `VNNOX_PATH_UPSERT_PROGRAM`, `VNNOX_PATH_PUBLISH_PROGRAM` (no hace falta tocar código).

Hasta que esto esté verificado, ejecuta siempre primero en modo prueba:

```bash
npm run signage:dry-run   # genera las imágenes en signage/output/ sin publicar nada
```

Revisa las PNG generadas y, cuando estén verificadas las rutas, prueba una publicación real:

```bash
npm run signage:run
```

## Fotos reales de proyectos

La categoría "Confianza / resultados" usa mensajes genéricos porque no tengo fotos reales de
proyectos. En cuanto el equipo tenga fotos de antes/después, lo ideal es sustituir esa
categoría por imágenes reales en vez de solo texto — decidme y lo integro.
