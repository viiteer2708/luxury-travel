// api/ppto-medios.js — fotos y retoques de un presupuesto ya creado, desde /panel/.
//
// Se separó de api/ppto-crear.js por una razón muy concreta: una función Edge
// tiene que empezar a responder en 25 segundos. Leer el presupuesto con Gemini
// ya se come buena parte de ese margen, y buscar y subir ocho fotos encima lo
// reventaría. Así el panel llama aquí una vez por foto y va enseñando el avance,
// que además es lo que Victor quiere ver: qué foto le ha tocado a cada tramo.
//
// Acciones (campo `accion` del cuerpo):
//   foto        — busca una foto de stock en Openverse, la sube a nuestro
//                 almacén y la deja puesta en el hero o en un tramo
//   galeria     — trae las fotos del alojamiento desde el enlace del proveedor
//                 y las REALOJA en nuestro almacén (nunca se enlaza fuera)
//   quitar_foto — descarta una foto concreta
//   enlace      — muestra u oculta al cliente el enlace original del alojamiento
//   publicar    — pasa el presupuesto de borrador a enviado
//
// Las fotos NO se enlazan desde donde estén: se copian a un bucket propio de
// Supabase Storage. Enlazar a Wikimedia o a la web del proveedor sería regalar
// el dato de dónde sale la propuesta y depender de que no borren la foto.
//
// Env vars: PPTO_PANEL_CLAVE, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y
// GEMINI_API_KEY (esta última para el portero de marcas de la galería; sin ella
// las fotos del alojamiento no se comprueban y el panel lo dice).

export const config = { runtime: 'edge' };

const BUCKET = 'ppto-fotos';
const ID_RE = /^HE-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;

// Modelo con visión para el portero de marcas de la galería. Va aparte del que
// lee el presupuesto: aquí se pide un sí/no sobre una imagen, y para eso el
// modelo más pequeño y rápido es el que toca.
const MODELO_VISION = 'gemini-3.5-flash-lite';

const OPENVERSE = 'https://api.openverse.org/v1/images/';
// Licencias comercialmente seguras. cc0 y pdm no piden ni atribución; by y
// by-sa sí, y por eso se guarda el crédito para pintarlo al pie de la página.
const LICENCIAS_LIBRES = 'cc0,pdm';
const LICENCIAS_CON_CREDITO = 'by,by-sa';
const SIN_ATRIBUCION = ['cc0', 'pdm'];

const EXT_OK = /\.(jpe?g|png|webp|avif)(\?|$)/i;
const TIPOS_IMG = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' };

const MAX_HERO = 4_500_000;
const MAX_TRAMO = 1_800_000;
const MAX_GALERIA = 6;

const UA = 'HorizonteExclusivo/1.0 (+https://www.horizonteexclusivo.es)';
// Nombres que casi nunca son una foto de verdad: logos, iconos y píxeles de
// seguimiento. Colar el logo del proveedor en la galería sería justo lo que
// todo esto intenta evitar.
const NO_FOTO = /logo|icon|sprite|pixel|badge|flag|avatar|placeholder|banner-?ad|favicon|loader|spinner/i;

const VENTANA_MS = 300_000;
const MAX_POR_VENTANA = 120;
const vistos = new Map();

/* ═══════════════════════ handler ═══════════════════════ */

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const claveBuena = getEnv('PPTO_PANEL_CLAVE');
  if (!claveBuena) return json({ ok: false, error: 'El panel todavía no está configurado.' }, 503);
  if (!igual(req.headers.get('x-ppto-clave') || '', claveBuena)) {
    return json({ ok: false, error: 'La contraseña no es correcta.' }, 401);
  }

  const ip = (req.headers.get('x-forwarded-for') || 'sin-ip').split(',')[0].trim();
  if (pasado(ip)) return json({ ok: false, error: 'Demasiadas peticiones seguidas. Espera un minuto.' }, 429);

  let cuerpo;
  try { cuerpo = await req.json(); }
  catch (_) { return json({ ok: false, error: 'bad_request' }, 400); }

  const id = String((cuerpo && cuerpo.id) || '').trim().toUpperCase();
  if (!ID_RE.test(id)) return json({ ok: false, error: 'Ese identificador no existe.' }, 422);

  const base = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) return json({ ok: false, error: 'Falta la conexión con la base de datos.' }, 503);

  const fila = await leer(base, key, id);
  if (!fila) return json({ ok: false, error: 'No encuentro ese presupuesto.' }, 404);

  const accion = String((cuerpo && cuerpo.accion) || '').trim();

  try {
    if (accion === 'foto') return await accionFoto(base, key, id, fila, cuerpo);
    if (accion === 'galeria') return await accionGaleria(base, key, id, fila, cuerpo);
    if (accion === 'quitar_foto') return await accionQuitarFoto(base, key, id, fila, cuerpo);
    if (accion === 'enlace') return await accionEnlace(base, key, id, fila, cuerpo);
    if (accion === 'publicar') return await accionPublicar(base, key, id);
  } catch (e) {
    console.error('[ppto-medios]', accion, e && e.message);
    return json({ ok: false, error: 'Algo ha fallado por el camino. Vuelve a intentarlo.' }, 502);
  }

  return json({ ok: false, error: 'Acción desconocida.' }, 422);
}

/* ═══════════════════════ foto de stock ═══════════════════════ */

async function accionFoto(base, key, id, fila, cuerpo) {
  const consulta = String((cuerpo && cuerpo.consulta) || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!consulta) return json({ ok: false, error: 'Dime qué foto busco.' }, 422);

  const slot = String((cuerpo && cuerpo.slot) || 'hero').trim();
  const esHero = slot === 'hero';
  const indice = esHero ? -1 : parseInt(slot, 10);
  const itinerario = Array.isArray(fila.itinerario) ? fila.itinerario : [];
  if (!esHero && !(indice >= 0 && indice < itinerario.length)) {
    return json({ ok: false, error: 'Ese tramo del viaje no existe.' }, 422);
  }

  // `salto` es el botón "otra foto": se queda con el siguiente resultado en vez
  // de con el primero, sin volver a plantear la búsqueda.
  const salto = Math.max(0, Math.min(11, parseInt((cuerpo && cuerpo.salto) || 0, 10) || 0));

  const hallazgo = await buscarEnOpenverse(consulta, salto);
  if (!hallazgo) {
    return json({ ok: false, error: `No he encontrado ninguna foto libre de «${consulta}». Prueba con otras palabras.` }, 404);
  }

  const tope = esHero ? MAX_HERO : MAX_TRAMO;
  const descarga = await descargarImagen(hallazgo.url, tope) ||
                   (hallazgo.thumbnail ? await descargarImagen(hallazgo.thumbnail, tope) : null);
  if (!descarga) {
    return json({ ok: false, error: 'He encontrado la foto pero no he podido traérmela. Prueba con «otra foto».' }, 502);
  }

  const nombre = `${id}/${esHero ? 'hero' : 'tramo-' + indice}-${sufijo()}.${descarga.ext}`;
  const publica = await subir(base, key, nombre, descarga);
  if (!publica) return json({ ok: false, error: 'No he podido guardar la foto.' }, 502);

  // El crédito solo hace falta con licencias que piden atribución.
  const creditos = Array.isArray(fila.creditos) ? fila.creditos.slice(0, 40) : [];
  if (SIN_ATRIBUCION.indexOf(String(hallazgo.licencia || '').toLowerCase()) === -1) {
    creditos.push({
      archivo: publica,
      titulo: hallazgo.titulo,
      autor: hallazgo.autor,
      licencia: (hallazgo.licencia || 'cc').toUpperCase() + (hallazgo.version ? ' ' + hallazgo.version : ''),
      licencia_url: hallazgo.licenciaUrl,
      origen: hallazgo.origen,
    });
  }

  const cambios = { creditos };
  if (esHero) {
    cambios.hero_imagen = publica;
  } else {
    const nuevo = itinerario.map((d, i) => {
      if (i !== indice) return d;
      const imgs = (Array.isArray(d.imagenes) ? d.imagenes : []).filter(Boolean);
      // Hasta tres por tramo: a partir de ahí el carrusel cansa más que enseña.
      return Object.assign({}, d, { imagenes: imgs.concat([publica]).slice(-3) });
    });
    cambios.itinerario = nuevo;
  }

  const ok = await guardar(base, key, id, cambios);
  if (!ok) return json({ ok: false, error: 'No he podido guardar la foto en el presupuesto.' }, 502);

  return json({
    ok: true,
    slot,
    url: publica,
    credito: SIN_ATRIBUCION.indexOf(String(hallazgo.licencia || '').toLowerCase()) === -1
      ? `${hallazgo.titulo} — ${hallazgo.autor}`
      : null,
    titulo: hallazgo.titulo,
    buscado: hallazgo.buscado,
  }, 200);
}

// Openverse busca en Y, no en O: exige que TODAS las palabras aparezcan. Una
// consulta descriptiva como «Canal du Midi lock plane trees» devuelve cero
// resultados mientras que «Canal du Midi» devuelve 240. Por eso se va recortando
// por el final: el modelo pone el topónimo delante, así que lo último en caerse
// es el nombre del sitio, que es lo único que no se puede perder — una foto
// preciosa del sitio equivocado hace más daño que una normalita del sitio bueno.
function variantesConsulta(consulta) {
  const palabras = consulta.split(/\s+/).filter(Boolean);
  const variantes = [consulta];
  for (const n of [4, 3, 2, 1]) {
    if (n >= palabras.length) continue;
    const v = palabras.slice(0, n).join(' ');
    if (variantes.indexOf(v) === -1) variantes.push(v);
  }
  return variantes;
}

// Todos los huecos de la propuesta son apaisados: la portada ocupa el ancho de
// la pantalla y el carrusel es de 800×533. Una foto vertical ahí sale recortada
// por el centro y casi siempre se lleva por delante lo que la hacía buena. Así
// que primero se busca solo entre las apaisadas, con la consulta completa y con
// todos sus recortes, y solo si no aparece nada se acepta cualquier proporción.
async function buscarEnOpenverse(consulta, salto) {
  return await barrer(consulta, salto, { aspect_ratio: 'wide' })
      || await barrer(consulta, salto, {});
}

async function barrer(consulta, salto, extra) {
  // Dentro de cada consulta se relajan los filtros: primero lo grande y sin
  // atribución, y solo al final se aceptan licencias que piden crédito.
  const filtros = [
    Object.assign({ license: LICENCIAS_LIBRES, size: 'large' }, extra),
    Object.assign({ license: LICENCIAS_LIBRES }, extra),
    Object.assign({ license: LICENCIAS_LIBRES + ',' + LICENCIAS_CON_CREDITO }, extra),
  ];

  for (const q of variantesConsulta(consulta)) {
    for (const f of filtros) {
      const p = new URLSearchParams(Object.assign({ q, mature: 'false', page_size: '16' }, f));
      let data;
      try {
        const r = await fetch(OPENVERSE + '?' + p.toString(), {
          headers: { accept: 'application/json', 'user-agent': UA },
          signal: AbortSignal.timeout(9_000),
        });
        if (!r.ok) continue;
        data = await r.json();
      } catch (_) { continue; }

      const res = (data && Array.isArray(data.results) ? data.results : [])
        .filter(x => x && typeof x.url === 'string' && EXT_OK.test(x.url));
      if (!res.length) continue;

      const elegido = res[salto % res.length];
      return {
        url: elegido.url,
        thumbnail: elegido.thumbnail || '',
        titulo: limpiarTitulo(elegido.title),
        autor: String(elegido.creator || 'Autor desconocido').slice(0, 90),
        licencia: elegido.license || '',
        version: elegido.license_version || '',
        licenciaUrl: elegido.license_url || 'https://creativecommons.org/',
        origen: elegido.foreign_landing_url || elegido.url,
        buscado: q,
      };
    }
  }
  return null;
}

function limpiarTitulo(t) {
  return String(t || 'Sin título').replace(/^File:/, '').replace(/\.\w+$/, '').slice(0, 120);
}

/* ═══════════════════════ galería del alojamiento ═══════════════════════ */
//
// El barco (o el hotel) suele venir con un enlace a la web del proveedor. Ese
// enlace NO se le pasa al cliente por defecto: llevaría a la marca de quien nos
// vende el viaje y a su precio público. Lo que sí se puede hacer es traerse las
// fotos y enseñarlas dentro de la propuesta, que es lo que el cliente quería:
// ver dónde va a dormir.

async function accionGaleria(base, key, id, fila, cuerpo) {
  const indiceEnlace = Math.max(0, parseInt((cuerpo && cuerpo.indice) || 0, 10) || 0);
  const enlace = String((cuerpo && cuerpo.url) || '').trim() || enlaceGuardado(fila, indiceEnlace);
  if (!/^https:\/\/[^\s<>"']+$/i.test(enlace)) {
    return json({ ok: false, error: 'Ese enlace no vale. Tiene que empezar por https://' }, 422);
  }

  const alojamientos = Array.isArray(fila.alojamientos) ? fila.alojamientos : [];
  const indice = Math.max(0, parseInt((cuerpo && cuerpo.indice) || 0, 10) || 0);
  if (!alojamientos.length) return json({ ok: false, error: 'Este presupuesto no tiene alojamientos.' }, 422);
  if (indice >= alojamientos.length) return json({ ok: false, error: 'Ese alojamiento no existe.' }, 422);

  let pagina;
  try {
    const r = await fetch(enlace, {
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
      redirect: 'follow',
      signal: AbortSignal.timeout(12_000),
    });
    if (!r.ok) return json({ ok: false, error: `La página del alojamiento ha respondido ${r.status}. Descarga tú las fotos y me las pasas.` }, 502);
    pagina = (await r.text()).slice(0, 900_000);
  } catch (_) {
    return json({ ok: false, error: 'No he podido abrir esa página. Puede que bloquee a los robots.' }, 502);
  }

  const candidatas = extraerImagenes(pagina, enlace);
  if (!candidatas.length) {
    return json({ ok: false, error: 'En esa página no he encontrado fotos que pueda traerme.' }, 404);
  }

  const apiKey = getEnv('GEMINI_API_KEY');

  // Streaming, por lo mismo que en api/ppto-crear.js: mirar seis fotos una a
  // una se pasa de los 25 segundos que la función puede tardar en arrancar.
  return flujo(async (manda) => {
    const puestas = [];
    const descartadas = [];
    let n = 0;

    for (const src of candidatas.slice(0, MAX_GALERIA + 4)) {
      if (puestas.length >= MAX_GALERIA) break;
      n++;
      manda({ paso: `Mirando la foto ${n}…` });

      // El mínimo de tamaño se sube: en la ficha del proveedor conviven la foto
      // buena y su miniatura de 205 píxeles, y la miniatura no sirve de nada en
      // una galería de 260 de alto.
      const descarga = await descargarImagen(src, MAX_TRAMO, 25_000);
      if (!descarga) continue;

      const marca = await llevaMarca(apiKey, descarga);
      if (marca.hayMarca) {
        descartadas.push(marca.texto || 'lleva la marca del proveedor');
        continue;
      }

      const nombre = `${id}/aloj-${indice}-${sufijo()}.${descarga.ext}`;
      const publica = await subir(base, key, nombre, descarga);
      if (publica) puestas.push(publica);
    }

    if (!puestas.length) {
      return manda({
        ok: false,
        error: descartadas.length
          ? `He mirado ${n} fotos y las he descartado todas: llevan a la vista la marca de quien nos vende el viaje (${descartadas[0]}). Enseñarlas sería contarle al cliente con quién contratas.`
          : 'He visto las fotos pero no he podido traerme ninguna con calidad suficiente.',
        descartadas,
      });
    }

    // REEMPLAZA la galería, no añade. Concatenando y cortando a MAX_GALERIA se
    // conservaban las fotos VIEJAS y se tiraban las recién comprobadas, mientras
    // la respuesta informaba de las nuevas: el panel decía «cuatro fotos, sin
    // marcas» y la propuesta seguía enseñando el casco con el nombre del
    // proveedor. Un fallo que no se ve desde el panel es el peor de todos.
    const nuevos = alojamientos.map((a, i) => i === indice
      ? Object.assign({}, a, { galeria: puestas })
      : a);

    const ok = await guardar(base, key, id, { alojamientos: nuevos });
    if (!ok) return manda({ ok: false, error: 'No he podido guardar la galería.' });

    manda({
      ok: true,
      fotos: puestas,
      descartadas,
      aviso: descartadas.length
        ? `He descartado ${descartadas.length} foto(s) porque llevaban la marca del proveedor a la vista.`
        : (apiKey ? '' : 'Ojo: sin la clave de Gemini no he podido comprobar si llevan marcas. Míralas tú.'),
    });
  });
}

// La comprobación que de verdad protege la regla de oro. Las fotos de producto
// del proveedor suelen llevar su nombre en el casco o en el rótulo, en letra
// pequeña: en la miniatura del panel no se ve, y en la propuesta abierta en un
// portátil sí. Un cliente que lee «leboat.com» en el barco busca el precio en
// Google y la propuesta se convierte en una comparación de precios.
async function llevaMarca(apiKey, descarga) {
  if (!apiKey) return { hayMarca: false, texto: '' };

  const PREGUNTA = 'Mira esta foto de un alojamiento o de un medio de transporte de un viaje. ' +
    '¿Se lee o se ve alguna MARCA COMERCIAL: un nombre de empresa, un logotipo, una dirección web, ' +
    'un rótulo de compañía, una matrícula con marca, una pegatina? Fíjate en cascos, fachadas, ' +
    'toldos, uniformes y letreros, incluso si el texto es pequeño. ' +
    'Responde solo con este JSON: {"marca": true|false, "texto": "qué se lee, o cadena vacía"}';

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_VISION}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: PREGUNTA },
              { inline_data: { mime_type: descarga.tipo, data: aBase64(descarga.datos) } },
            ],
          }],
          generationConfig: { temperature: 0, maxOutputTokens: 200, responseMimeType: 'application/json' },
        }),
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (!r.ok) {
      console.warn('[ppto-medios] Vision respondió', r.status);
      return { hayMarca: false, texto: '' };
    }
    const data = await r.json();
    const partes = (((data.candidates || [])[0] || {}).content || {}).parts || [];
    const salida = partes.map(p => p.text || '').join('').trim();
    const o = JSON.parse(salida.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    return { hayMarca: !!o.marca, texto: String(o.texto || '').slice(0, 120) };
  } catch (e) {
    // Si la comprobación falla, la foto NO pasa. Es la única postura sensata:
    // el coste de descartar una foto buena es que Victor busque otra; el de
    // publicar una mala es enseñarle el proveedor al cliente.
    console.warn('[ppto-medios] No se ha podido comprobar la marca:', e && e.message);
    return { hayMarca: true, texto: 'no he podido comprobar si lleva marca' };
  }
}

// btoa necesita una cadena binaria, y pasarle 130.000 bytes de golpe con
// String.fromCharCode(...bytes) revienta la pila. De ahí los trozos.
function aBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binario += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  }
  return btoa(binario);
}

function flujo(trabajo) {
  const codificador = new TextEncoder();
  const cuerpo = new ReadableStream({
    async start(control) {
      const manda = (o) => control.enqueue(codificador.encode(JSON.stringify(o) + '\n'));
      try { await trabajo(manda); }
      catch (e) {
        console.error('[ppto-medios] Error inesperado:', e && e.message);
        manda({ ok: false, error: 'Algo ha fallado por el camino. Vuelve a intentarlo.' });
      }
      control.close();
    },
  });
  return new Response(cuerpo, {
    status: 200,
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
      // Qué versión del código ha atendido la petición. Sin esto, comprobar un
      // arreglo en producción es adivinar: durante esta misma sesión tres
      // pruebas dieron por bueno o por malo un cambio que todavía no estaba
      // desplegado, porque la respuesta de la versión vieja es indistinguible.
      'x-ppto-build': (getEnv('VERCEL_GIT_COMMIT_SHA') || 'local').slice(0, 8),
      'x-accel-buffering': 'no',
    },
  });
}

function extraerImagenes(html, baseUrl) {
  const urls = [];
  const mete = (u) => {
    const abs = absoluta(u, baseUrl);
    if (!abs) return;
    if (!EXT_OK.test(abs)) return;
    if (NO_FOTO.test(abs)) return;
    if (urls.indexOf(abs) === -1) urls.push(abs);
  };

  // og:image primero: es la que el propio sitio considera su mejor foto.
  const og = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/ig;
  let m;
  while ((m = og.exec(html)) && urls.length < 30) mete(m[1]);

  const img = /<img\b[^>]*?\bsrc=["']([^"']+)["']/ig;
  while ((m = img.exec(html)) && urls.length < 30) mete(m[1]);

  // Muchas webs cargan la foto de verdad por data-src y dejan un píxel en src.
  const lazy = /\bdata-(?:src|original|lazy(?:-src)?)=["']([^"']+)["']/ig;
  while ((m = lazy.exec(html)) && urls.length < 30) mete(m[1]);

  return urls;
}

// El enlace del alojamiento se guardó apartado en `interno` al crear el
// presupuesto. Así el panel sigue pudiendo usarlo aunque Victor haya recargado
// la página y ya no lo tenga a mano en el navegador.
function enlaceGuardado(fila, indice) {
  const interno = (fila && fila.interno && typeof fila.interno === 'object') ? fila.interno : {};
  const enlaces = Array.isArray(interno.enlaces_alojamiento) ? interno.enlaces_alojamiento : [];
  return String(enlaces[indice] || enlaces[0] || '').trim();
}

function absoluta(u, baseUrl) {
  const s = String(u || '').trim();
  if (!s || /^data:/i.test(s)) return null;
  try {
    const abs = new URL(s, baseUrl);
    return abs.protocol === 'https:' ? abs.toString() : null;
  } catch (_) { return null; }
}

/* ═══════════════════════ retoques ═══════════════════════ */

async function accionQuitarFoto(base, key, id, fila, cuerpo) {
  const url = String((cuerpo && cuerpo.url) || '').trim();
  if (!url) return json({ ok: false, error: 'Dime qué foto quito.' }, 422);

  const itinerario = (Array.isArray(fila.itinerario) ? fila.itinerario : []).map(d => {
    if (!Array.isArray(d.imagenes)) return d;
    return Object.assign({}, d, { imagenes: d.imagenes.filter(x => x !== url) });
  });
  const alojamientos = (Array.isArray(fila.alojamientos) ? fila.alojamientos : []).map(a => {
    if (!Array.isArray(a.galeria)) return a;
    const g = a.galeria.filter(x => x !== url);
    const copia = Object.assign({}, a);
    if (g.length) copia.galeria = g; else delete copia.galeria;
    return copia;
  });
  const creditos = (Array.isArray(fila.creditos) ? fila.creditos : []).filter(c => c && c.archivo !== url);

  const cambios = { itinerario, alojamientos, creditos };
  if (fila.hero_imagen === url) cambios.hero_imagen = null;

  const ok = await guardar(base, key, id, cambios);
  return ok ? json({ ok: true }, 200) : json({ ok: false, error: 'No he podido quitarla.' }, 502);
}

// El enlace original del alojamiento vive apartado en `interno`. Esto es lo que
// lo saca a la luz, y solo cuando Victor lo pide expresamente desde el panel.
async function accionEnlace(base, key, id, fila, cuerpo) {
  const indice = Math.max(0, parseInt((cuerpo && cuerpo.indice) || 0, 10) || 0);
  const mostrar = !!(cuerpo && cuerpo.mostrar);
  const enlace = String((cuerpo && cuerpo.url) || '').trim() || enlaceGuardado(fila, indice);
  if (mostrar && !/^https:\/\/[^\s<>"']+$/i.test(enlace)) {
    return json({ ok: false, error: 'Ese enlace no vale.' }, 422);
  }

  const alojamientos = (Array.isArray(fila.alojamientos) ? fila.alojamientos : []).map((a, i) => {
    if (i !== indice) return a;
    const copia = Object.assign({}, a);
    if (mostrar) copia.enlace = enlace; else delete copia.enlace;
    return copia;
  });
  if (!alojamientos.length) return json({ ok: false, error: 'Este presupuesto no tiene alojamientos.' }, 422);

  const ok = await guardar(base, key, id, { alojamientos });
  return ok ? json({ ok: true, mostrando: mostrar }, 200) : json({ ok: false, error: 'No he podido guardarlo.' }, 502);
}

async function accionPublicar(base, key, id) {
  const ok = await guardar(base, key, id, { estado: 'enviado' });
  return ok ? json({ ok: true, estado: 'enviado' }, 200) : json({ ok: false, error: 'No he podido publicarlo.' }, 502);
}

/* ═══════════════════════ descarga y almacén ═══════════════════════ */

async function descargarImagen(url, tope, minimo) {
  try {
    const r = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'image/*' },
      redirect: 'follow',
      signal: AbortSignal.timeout(14_000),
    });
    if (!r.ok) return null;

    const tipo = String(r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const ext = TIPOS_IMG[tipo];
    if (!ext) return null;

    const declarado = parseInt(r.headers.get('content-length') || '0', 10);
    if (declarado && declarado > tope) return null;

    const datos = await r.arrayBuffer();
    // El Content-Length puede faltar o mentir: el tamaño de verdad se mira aquí.
    if (datos.byteLength > tope || datos.byteLength < (minimo || 2000)) return null;

    return { datos, tipo, ext };
  } catch (_) { return null; }
}

async function subir(base, key, nombre, descarga) {
  try {
    const r = await fetch(`${base}/storage/v1/object/${BUCKET}/${nombre}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': descarga.tipo,
        'cache-control': 'max-age=31536000',
        'x-upsert': 'true',
      },
      body: descarga.datos,
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) {
      console.error('[ppto-medios] Storage respondió', r.status, (await r.text().catch(() => '')).slice(0, 200));
      return null;
    }
    return `${base}/storage/v1/object/public/${BUCKET}/${nombre}`;
  } catch (e) {
    console.error('[ppto-medios] Subida fallida:', e && e.message);
    return null;
  }
}

function sufijo() {
  const b = new Uint8Array(4);
  crypto.getRandomValues(b);
  return Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
}

/* ═══════════════════════ base de datos ═══════════════════════ */

// Aquí sí se lee `interno`: esta función solo la llama el panel, con la
// contraseña por delante, y necesita el enlace del alojamiento que se apartó
// al crear el presupuesto. Lo que nunca puede pasar es que `interno` salga en
// una respuesta: por eso las acciones devuelven campos concretos, nunca la fila.
const COLUMNAS = 'id,estado,hero_imagen,itinerario,alojamientos,creditos,interno';

async function leer(base, key, id) {
  try {
    const r = await fetch(`${base}/rest/v1/presupuestos?id=eq.${encodeURIComponent(id)}&select=${COLUMNAS}&limit=1`, {
      headers: { apikey: key, authorization: `Bearer ${key}`, accept: 'application/json' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) return null;
    const filas = await r.json();
    return Array.isArray(filas) ? filas[0] : null;
  } catch (_) { return null; }
}

async function guardar(base, key, id, cambios) {
  try {
    const r = await fetch(`${base}/rest/v1/presupuestos?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify(Object.assign({ actualizado_at: new Date().toISOString() }, cambios)),
      signal: AbortSignal.timeout(10_000),
    });
    return r.ok;
  } catch (_) { return false; }
}

/* ═══════════════════════ utilidades ═══════════════════════ */

function getEnv(name) {
  try { return (typeof process !== 'undefined' && process.env && process.env[name]) || ''; }
  catch (_) { return ''; }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
      // Qué versión del código ha atendido la petición. Sin esto, comprobar un
      // arreglo en producción es adivinar: durante esta misma sesión tres
      // pruebas dieron por bueno o por malo un cambio que todavía no estaba
      // desplegado, porque la respuesta de la versión vieja es indistinguible.
      'x-ppto-build': (getEnv('VERCEL_GIT_COMMIT_SHA') || 'local').slice(0, 8),
    },
  });
}

function igual(a, b) {
  const x = String(a), y = String(b);
  let dif = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    dif |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  }
  return dif === 0;
}

function pasado(ip) {
  const ahora = Date.now();
  const previo = vistos.get(ip);
  if (!previo || ahora - previo.desde > VENTANA_MS) {
    vistos.set(ip, { desde: ahora, n: 1 });
    if (vistos.size > 500) vistos.clear();
    return false;
  }
  previo.n += 1;
  return previo.n > MAX_POR_VENTANA;
}
