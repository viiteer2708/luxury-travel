// api/ppto-crear.js — alta de un presupuesto desde el panel privado /panel/.
//
// Victor pega el texto del presupuesto (o sube el PDF que le han mandado),
// escribe el nombre del cliente y le da a un botón. Aquí es donde eso se
// convierte en una fila de `presupuestos` con un ID nuevo, ya limpia de
// proveedor y de margen, y en los dos mensajes de envío listos para copiar.
//
// El parseo lo hace Gemini, la misma API que ya usa api/chat.js. La LIMPIEZA
// no: se comprueba después con expresiones regulares, en este archivo. Fiarse
// de que el modelo ha quitado la comisión sería fiar el modelo de negocio a
// una instrucción en lenguaje natural. El modelo redacta; el código verifica.
//
// Función Edge de Vercel, sin dependencias. Env vars:
//   PPTO_PANEL_CLAVE           — contraseña del panel. Sin ella, el panel no abre.
//   GEMINI_API_KEY             — la misma que usa el agente virtual
//   PPTO_GEMINI_MODEL          — opcional; por defecto "gemini-3.5-flash"
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

export const config = { runtime: 'edge' };

const MODELO_DEFECTO = 'gemini-3.5-flash';
const MODELO_RESERVA = 'gemini-3.5-flash-lite'; // el que ya funciona en api/chat.js
const WEB = 'https://www.horizonteexclusivo.es';
const TEL = '+34 633 077 401';
const EMAIL = 'viajes@horizonteexclusivo.es';

// Sin 0, O, 1, I ni L: el ID se dicta por teléfono. 32 símbolos y 8 posiciones.
const ALFABETO = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

const ID_RE = /^HE-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;

const MIMES_OK = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const MAX_TEXTO = 60_000;

const REGIONES = ['Europa', 'Asia', 'África', 'América', 'Paraísos'];

// Freno por IP, mismo patrón que api/chat.js y api/ppto-evento.js.
const VENTANA_MS = 300_000;
const MAX_POR_VENTANA = 12;
const vistos = new Map();

/* ═══════════════════════ el guion del modelo ═══════════════════════ */

const INSTRUCCIONES = `Eres el redactor de propuestas de Horizonte Exclusivo, una agencia de viajes a
medida de Molins de Rei (Barcelona). La asesora que firma se llama Endeis.

Recibes el presupuesto TAL CUAL se lo ha mandado un mayorista o un receptivo a la agencia: un email,
un PDF, un WhatsApp. Tu trabajo es devolver un JSON con ese mismo viaje contado para el cliente
final. Devuelves JSON y nada más: sin explicaciones, sin markdown, sin bloques de código.

## La regla que manda sobre todas las demás

El cliente no puede intuir ni que hay un intermediario ni que hay un margen. Todo lo que huela a
proveedor o a negocio entre empresas sale de los campos que ve el cliente y se va al objeto
"interno", que nunca se le enseña a nadie.

Fuera de los campos visibles, sin excepción: nombre y marca del mayorista, receptivo, turoperador o
naviera; comisión, neto, PVP neto, margen, markup, fee, rappel, over, descuento de agencia;
localizadores, expedientes, referencias de reserva, release, cupos; teléfonos, emails y personas de
contacto del proveedor; condiciones de pago DEL PROVEEDOR (depósitos con vencimiento a la agencia);
y cualquier frase del estilo "tarifa confidencial" o "uso interno". Tampoco dejes el nombre del
proveedor escondido dentro del nombre de un hotel, de un barco o de una excursión.

Ojo con los nombres de producto: si el barco, el tren o el circuito llevan la marca del proveedor
("Le Boat Clipper", "Crucero Nicko Tours"), en los campos visibles va solo el modelo o el nombre
neutro ("Clipper"), y la marca completa se guarda en "interno".

## El precio

El precio que devuelves en "precio_total" es lo que PAGA EL CLIENTE. No calculas márgenes, no sumas
ni restas comisiones y no propones otro precio.

Cuidado, porque los proveedores etiquetan mal: una línea llamada "PRECIO TOTAL" o "TOTAL A PAGAR"
puede ser el neto de la agencia, es decir, lo que la agencia le paga al proveedor después de
descontar su comisión. El precio del cliente es el bruto, ANTES de descontar la comisión: suele ser
la línea del producto ("precio del crucero", "total viaje", "PVP"), ya con los descuentos
comerciales aplicados. Si hay varios números y no está claro, elige el mayor de los candidatos
razonables, copia TODAS las líneas de precio literalmente en "interno.desglose_original" y añade un
aviso explicando la duda. Más vale que Victor lo revise a que el cliente pague de menos.

Si el presupuesto trae varias opciones (hotel A / hotel B), quédate con la primera y avisa de que
había más de una.

## Cómo se escribe

Español de España. Trata de "vosotros" (o de "tú" si viaja una sola persona). Cercano, cálido y
tranquilizador, aspiracional sin ser cursi y sin superlativos de folleto. Frases cortas. El cliente
tiene que imaginarse el viaje, no leer una ficha técnica: donde el mayorista pone "D3: traslado
aeropuerto-hotel en privado", tú escribes qué se siente al llegar y que no tiene que preocuparse de
nada.

Reescribir NO es añadir. No inventes servicios, hoteles, excursiones, categorías, estrellas ni
garantías que no estén en el original. Si el mayorista pone "hotel 4 estrellas", no lo subes a
"boutique de lujo". Un día libre se cuenta como día libre, con gracia, pero libre. Todo lo que
prometas de más lo acaba pagando la agencia.

Nunca presentes el precio como garantizado: de eso ya se encarga la página.

## El JSON que devuelves

{
  "destino": "el Canal du Midi",            // como se diría en una frase, con artículo si lo lleva
  "region": "Europa|Asia|África|América|Paraísos",
  "titulo": "Siete noches navegando el Canal du Midi",   // sin precio, máximo 70 caracteres
  "subtitulo": "Una frase de gancho, máximo 140 caracteres",
  "resumen": "Párrafo de apertura de 3 a 5 frases, personal, el que enamora del viaje",
  "fecha_salida": "AAAA-MM-DD o null",
  "fecha_regreso": "AAAA-MM-DD o null",
  "noches": 7,
  "viajeros": {"adultos": 2, "ninos": 0},   // null si el presupuesto no lo dice
  "itinerario": [
    {
      "dia": "1 – 3",                        // como se lee: "1", "2 – 4", "8"
      "titulo": "Tokio",
      "texto": "3 a 5 frases contando ese tramo del viaje",
      "alojamiento": "Dónde se duerme ese tramo, o null",
      "foto": "Tokyo Senso-ji temple"        // ver abajo
    }
  ],
  "alojamientos": [
    {
      "nombre": "Nombre del hotel o del barco, sin la marca del proveedor",
      "ciudad": "Ciudad o zona",
      "noches": 4,
      "categoria": "4 estrellas / Ryokan / Categoría Confort…, tal cual venga",
      "regimen": "Alojamiento y desayuno / Media pensión / Barco completo…",
      "nota": "2 o 3 frases de por qué este alojamiento y no otro. Es la frase que más trabaja de la página",
      "enlace": "https://… si el texto trae un enlace de ESTE alojamiento; si no, null",
      "mostrar_enlace": false,   // ver abajo: solo true si Victor lo pide expresamente
      "ficha": [{"etiqueta": "Cabinas", "valor": "2"}]   // datos concretos del original; [] si no hay
    }
  ],
  "incluye": ["Frases cortas, una por servicio incluido"],
  "no_incluye": ["Lo que no va incluido, también en frases cortas"],
  "precio_total": 1419,
  "precio_por_persona": null,
  "moneda": "EUR",
  "condiciones_pago": "Condiciones de pago DEL CLIENTE, o null",
  "valido_hasta": "AAAA-MM-DD o null",
  "notas_cliente": "Fianzas, anticipos de carburante, avisos prácticos que el cliente debe saber. null si no hay",
  "foto_hero": "Canal du Midi plane trees",
  "interno": {
    "proveedor": "…", "desglose_original": "…", "referencia_proveedor": "…",
    "contacto_proveedor": "…", "condiciones_pago_proveedor": "…", "nota": "…"
  },
  "avisos": ["Lo que Victor tiene que revisar o completar antes de enviarlo"]
}

## Las consultas de foto

"foto_hero" y el campo "foto" de cada tramo son búsquedas para un banco de imágenes libres
(Openverse, que indexa sobre todo en inglés).

**El topónimo va SIEMPRE al principio.** Ese buscador exige que aparezcan todas las palabras de la
consulta, así que cuando no encuentra nada se va recortando la consulta por el final hasta que
encuentra: lo último que puede quedar en pie tiene que ser el nombre del sitio. Detrás del topónimo
pon dos o tres palabras descriptivas en inglés de lo que debería verse: "Kyoto Fushimi Inari torii
gates", "Canal du Midi plane trees", "Beziers old bridge river".

Sitios reales del viaje, nunca genéricos tipo "beautiful landscape": una foto del sitio equivocado
se nota y tira por tierra el resto de la propuesta.

## El enlace del alojamiento

Por defecto **"mostrar_enlace" va a false**, aunque hayas encontrado un enlace. El enlace de un hotel
o de un barco lleva a la web de quien nos vende el viaje, y con ella a su marca y a su precio público:
enseñárselo al cliente es una decisión comercial, no un detalle de formato, y la toma Victor.

Solo lo pones a **true** cuando Victor lo pida en sus indicaciones con todas las letras: "quiero que
vean el barco", "añade el enlace para que puedan verlo", "pon el enlace del hotel". Que el enlace
aparezca en el presupuesto del mayorista NO es pedirlo — ahí está porque el proveedor se lo manda a
la agencia, no al cliente.

## Avisos

En "avisos" pones, en español y en una frase cada uno, lo que quede pendiente: precio dudoso,
faltan fechas, faltan viajeros, había varias opciones, el original no dice el régimen… Es lo primero
que Victor va a leer. Si está todo claro, devuelve [].`;

/* ═══════════════════════ handler ═══════════════════════ */

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  const claveBuena = getEnv('PPTO_PANEL_CLAVE');
  if (!claveBuena) {
    console.error('[ppto-crear] Falta PPTO_PANEL_CLAVE: el panel queda cerrado.');
    return json({ ok: false, error: 'El panel todavía no está configurado. Falta la contraseña en Vercel.' }, 503);
  }
  if (!igual(req.headers.get('x-ppto-clave') || '', claveBuena)) {
    return json({ ok: false, error: 'La contraseña no es correcta.' }, 401);
  }

  const ip = (req.headers.get('x-forwarded-for') || 'sin-ip').split(',')[0].trim();
  if (pasado(ip)) return json({ ok: false, error: 'Demasiadas propuestas seguidas. Espera unos minutos.' }, 429);

  let cuerpo;
  try { cuerpo = await req.json(); }
  catch (_) { return json({ ok: false, error: 'bad_request' }, 400); }

  const cliente = texto(cuerpo && cuerpo.cliente, 120);
  const clienteEmail = texto(cuerpo && cuerpo.cliente_email, 160);
  const clienteTelefono = texto(cuerpo && cuerpo.cliente_telefono, 40);
  // Aquí NO se colapsan los espacios: la estructura en líneas y columnas del
  // presupuesto es justo lo que hace que se entienda qué número es cada cosa.
  const originalCrudo = textoLargo(cuerpo && cuerpo.texto, MAX_TEXTO);
  // Se lee con holgura y se recorta DESPUÉS de apartar los enlaces largos: un
  // enlace de seguimiento puede ocupar él solo casi todo el espacio.
  const indicacionesCrudas = textoLargo(cuerpo && cuerpo.indicaciones, 8000);

  const a = apartarEnlacesLargos(originalCrudo);
  const b = apartarEnlacesLargos(indicacionesCrudas);
  const original = a.texto;
  const indicaciones = b.texto.slice(0, 2000);
  const enlacesApartados = a.enlaces.concat(b.enlaces).filter((v, i, l) => l.indexOf(v) === i);
  const archivo = cuerpo && cuerpo.archivo;
  const rehacerId = texto(cuerpo && cuerpo.rehacer, 12).toUpperCase();

  if (rehacerId && !ID_RE.test(rehacerId)) {
    return json({ ok: false, error: 'Ese código de propuesta no tiene buena pinta. Son las letras HE- y ocho caracteres.' }, 422);
  }
  if (!cliente) return json({ ok: false, error: 'Falta el nombre del cliente.' }, 422);

  // El archivo no viaja dentro de esta petición: el navegador lo ha subido al
  // buzón `ppto-entrada` y aquí solo llega su nombre. Así el techo deja de ser
  // el cuerpo de 4,5 MB de Vercel. Ver api/ppto-medios.js, acción `subida`.
  const rutaArchivo = texto(archivo && archivo.ruta, 80);
  const mimeArchivo = texto(archivo && archivo.mime, 60).toLowerCase();
  if (rutaArchivo) {
    if (!/^[A-Za-z0-9]{8,32}\.[a-z0-9]{2,5}$/.test(rutaArchivo)) {
      return json({ ok: false, error: 'Ese archivo no me cuadra. Vuelve a subirlo.' }, 422);
    }
    if (MIMES_OK.indexOf(mimeArchivo) === -1) {
      return json({ ok: false, error: 'Solo acepto PDF o una foto (JPG, PNG, WEBP).' }, 422);
    }
  }

  if (!original && !rutaArchivo) {
    return json({ ok: false, error: 'Pégame el texto del presupuesto o sube el PDF.' }, 422);
  }

  const apiKey = getEnv('GEMINI_API_KEY');
  if (!apiKey) {
    console.error('[ppto-crear] Falta GEMINI_API_KEY.');
    return json({ ok: false, error: 'Falta la clave de Gemini en Vercel; no puedo leer el presupuesto.' }, 503);
  }

  const base = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) {
    console.error('[ppto-crear] Supabase sin configurar.');
    return json({ ok: false, error: 'Falta la conexión con la base de datos en Vercel.' }, 503);
  }

  /* ── A partir de aquí se responde en streaming ──
     Una función Edge tiene que EMPEZAR a responder en 25 segundos, y leer un
     presupuesto entero con Gemini se pasa de ahí con facilidad (un PDF largo
     puede irse a 40). Así que la respuesta arranca en el acto con una línea de
     "voy por aquí" y el resultado llega por el mismo canal cuando está. De paso
     Victor ve el avance en vez de un botón parado. Formato NDJSON: una línea
     JSON por paso, la última es el resultado. */

  const partes = [];
  partes.push({ text: `El presupuesto va para: ${cliente}.` });
  if (indicaciones) partes.push({ text: `Indicaciones de Victor, mandan sobre el resto: ${indicaciones}` });
  if (original) partes.push({ text: `\n--- PRESUPUESTO RECIBIDO ---\n${original}` });

  return flujo(async (manda) => {
    /* ── 0. Recoger el archivo del buzón, si lo hay ── */

    if (rutaArchivo) {
      manda({ paso: 'Abriendo el archivo…' });
      const bytes = await recogerDelBuzon(base, key, rutaArchivo);
      // Se borra en cuanto se ha leído, salga bien o mal lo que viene después.
      // El buzón es un buzón: nada se queda a vivir ahí.
      await tirarDelBuzon(base, key, rutaArchivo);
      if (!bytes) {
        return manda({ ok: false, error: 'No he podido abrir el archivo que has subido. Vuelve a intentarlo.' });
      }
      partes.push({ inline_data: { mime_type: mimeArchivo, data: aBase64(bytes) } });
    }

    manda({ paso: rutaArchivo ? 'Leyendo el archivo…' : 'Leyendo el presupuesto…' });

    /* ── 1. El modelo lee el presupuesto ── */

    let crudo;
    try {
      crudo = await pedirAGemini(apiKey, partes);
    } catch (e) {
      const motivo = String((e && e.message) || '');
      console.error('[ppto-crear] Gemini:', motivo);

      // Los tres fallos que de verdad ocurren, y cada uno con lo que hay que
      // hacer. El de la cuota merece mensaje propio: decir "revisa el texto"
      // cuando el texto está perfecto manda a Victor a reescribir un presupuesto
      // que no tiene nada malo, y a repetirlo cinco veces.
      let error = 'No he podido leer el presupuesto. Revisa que el texto se entienda y prueba otra vez.';
      if (/timeout|abort/i.test(motivo)) {
        error = 'El presupuesto ha tardado demasiado en leerse. Si has subido un PDF, prueba a pegar el texto: va mucho más rápido.';
      } else if (/\b429\b|quota|rate.?limit/i.test(motivo)) {
        error = 'Se ha agotado la cuota diaria de lectura de presupuestos. No es culpa del texto: hoy ya no quedan. Se renueva sola mañana; si necesitas seguir hoy, avisa a Victor para que amplíe el plan.';
      }
      return manda({ ok: false, error });
    }

    let datos;
    try { datos = JSON.parse(limpiarVallas(crudo)); }
    catch (_) {
      console.error('[ppto-crear] JSON ilegible del modelo:', String(crudo).slice(0, 400));
      return manda({ ok: false, error: 'He leído el presupuesto pero me ha salido mal estructurado. Vuelve a darle al botón.' });
    }
    if (!datos || typeof datos !== 'object') {
      return manda({ ok: false, error: 'El presupuesto ha vuelto vacío. Revisa que el texto tenga el viaje.' });
    }

    /* ── 2. Se normaliza a lo que la base y la página esperan ── */

    manda({ paso: 'Comprobando que no se cuela nada del proveedor…' });

    const { fila, consultas, mostrarEnlace } = normalizar(datos, { cliente, clienteEmail, clienteTelefono, original, indicaciones, enlacesApartados });
    if (!fila.destino || !fila.titulo) {
      return manda({ ok: false, error: 'No he encontrado el viaje en lo que me has pasado. ¿Seguro que es el presupuesto?' });
    }
    if (!(Number(fila.precio_total) > 0)) {
      return manda({ ok: false, error: 'No he encontrado el precio del cliente. Dímelo en las indicaciones y vuelve a intentarlo.' });
    }

    /* ── 3. La limpieza se COMPRUEBA, no se da por hecha ── */

    const hallazgos = revisar(fila, datos && datos.interno);
    const avisos = listaTextos(datos && datos.avisos, 12, 300);
    const estado = hallazgos.length ? 'borrador' : 'enviado';

    /* ── 4. Alta, o rehacer la que ya existía ── */

    let id;
    let estadoFinal = estado;

    if (rehacerId) {
      manda({ paso: `Rehaciendo ${rehacerId} sobre el mismo enlace…` });
      const previa = await leerPrevia(base, key, rehacerId);
      if (!previa) {
        return manda({ ok: false, error: `No encuentro la propuesta ${rehacerId}. Repasa el código.` });
      }
      const hecho = await rehacer(base, key, rehacerId, fila, estado, previa, mostrarEnlace);
      if (!hecho.ok) {
        console.error('[ppto-crear] Rehacer fallido:', hecho.detalle);
        return manda({ ok: false, error: 'He preparado la propuesta nueva pero no he podido guardarla encima. Vuelve a intentarlo.' });
      }
      id = rehacerId;
      estadoFinal = estado === 'borrador' ? 'borrador' : (previa.estado === 'borrador' ? 'enviado' : previa.estado);
    } else {
      manda({ paso: 'Guardando la propuesta…' });
      id = generarId();
      let alta = await insertar(base, key, id, fila, estado, mostrarEnlace);
      if (alta.conflicto) { id = generarId(); alta = await insertar(base, key, id, fila, estado, mostrarEnlace); }
      if (!alta.ok) {
        console.error('[ppto-crear] Alta fallida:', alta.detalle);
        return manda({ ok: false, error: 'He preparado la propuesta pero no he podido guardarla. Vuelve a intentarlo.' });
      }
    }

    const url = `${WEB}/ppto/${id}/`;

    manda({
      ok: true,
      id,
      url,
      rehecho: !!rehacerId,
      estado: estadoFinal,
      hallazgos,
      avisos,
      resumen: {
        cliente,
        destino: fila.destino,
        titulo: fila.titulo,
        fechas: fila.fecha_salida && fila.fecha_regreso ? `${fila.fecha_salida} → ${fila.fecha_regreso}` : (fila.fecha_salida || ''),
        noches: fila.noches,
        viajeros: fila.viajeros,
        dias_itinerario: fila.itinerario.length,
        alojamientos: fila.alojamientos.map(a => a.nombre).filter(Boolean),
        precio_total: Number(fila.precio_total),
        precio_por_persona: fila.precio_por_persona == null ? null : Number(fila.precio_por_persona),
        moneda: fila.moneda,
        valido_hasta: fila.valido_hasta,
        enlace_alojamiento: fila.alojamientos.map(a => a.enlace).filter(Boolean)[0] || enlacesApartados[0] || null,
      enlace_visible: !!mostrarEnlace,
      },
      fotos: consultas,
      mensajes: mensajes({ cliente, url, fila, rehecho: !!rehacerId }),
    });
  });
}

// Envuelve el trabajo largo en una respuesta que empieza YA. Ojo con una cosa:
// a partir del primer byte la respuesta es un 200 pase lo que pase, así que los
// errores viajan dentro del cuerpo (`ok:false`) y el panel no puede fiarse del
// código HTTP. Es el precio de no chocar con el límite de los 25 segundos.
function flujo(trabajo) {
  const codificador = new TextEncoder();
  const cuerpo = new ReadableStream({
    async start(control) {
      const manda = (o) => control.enqueue(codificador.encode(JSON.stringify(o) + '\n'));
      try {
        await trabajo(manda);
      } catch (e) {
        console.error('[ppto-crear] Error inesperado:', e && e.message);
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
      // Que ningún intermediario acumule la respuesta antes de soltarla: si se
      // almacena en búfer, el primer byte deja de salir pronto y volvemos al
      // problema que este streaming venía a resolver.
      'x-accel-buffering': 'no',
    },
  });
}

/* ═══════════════════════ el buzón de entrada ═══════════════════════ */

const BUCKET_ENTRADA = 'ppto-entrada';

async function recogerDelBuzon(base, key, ruta) {
  try {
    const r = await fetch(`${base}/storage/v1/object/${BUCKET_ENTRADA}/${encodeURIComponent(ruta)}`, {
      headers: { apikey: key, authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(30_000),
    });
    if (!r.ok) {
      console.error('[ppto-crear] Buzón devolvió', r.status);
      return null;
    }
    const datos = await r.arrayBuffer();
    return datos.byteLength ? datos : null;
  } catch (e) {
    console.error('[ppto-crear] Recogiendo del buzón:', e && e.message);
    return null;
  }
}

async function tirarDelBuzon(base, key, ruta) {
  try {
    await fetch(`${base}/storage/v1/object/${BUCKET_ENTRADA}`, {
      method: 'DELETE',
      headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ prefixes: [ruta] }),
      signal: AbortSignal.timeout(12_000),
    });
  } catch (e) {
    // Si falla, el barrido de la siguiente subida lo recoge. No se corta el
    // alta por no haber podido tirar un archivo temporal.
    console.warn('[ppto-crear] No se ha podido vaciar el buzón:', e && e.message);
  }
}

// btoa necesita una cadena binaria, y pasarle doce millones de bytes de golpe
// con String.fromCharCode(...bytes) revienta la pila. De ahí los trozos.
function aBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 8192) {
    binario += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  }
  return btoa(binario);
}

/* ═══════════════════════ Gemini ═══════════════════════ */

async function pedirAGemini(apiKey, partes) {
  const modelos = [getEnv('PPTO_GEMINI_MODEL') || MODELO_DEFECTO, MODELO_RESERVA];
  let ultimo = '';

  for (let i = 0; i < modelos.length; i++) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelos[i]}:generateContent`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: INSTRUCCIONES }] },
          contents: [{ role: 'user', parts: partes }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json',
          },
        }),
        // Holgado a propósito: la respuesta ya va en streaming, así que aquí no
        // manda el límite de los 25 segundos de la función sino la paciencia
        // de Victor mirando la barra de avance.
        signal: AbortSignal.timeout(70_000),
      }
    );

    if (r.ok) {
      const data = await r.json();
      const cand = data && data.candidates && data.candidates[0];
      const trozos = (cand && cand.content && cand.content.parts) || [];
      const salida = trozos.map(p => p.text || '').join('').trim();
      if (salida) return salida;
      throw new Error('respuesta vacía (' + ((cand && cand.finishReason) || 'sin motivo') + ')');
    }

    ultimo = await r.text().catch(() => '');
    // Un 404 es "ese modelo no existe en esta clave": se prueba el siguiente.
    // Cualquier otro error se propaga tal cual; reintentar no lo arreglaría.
    if (r.status !== 404) throw new Error(`Gemini ${r.status}: ${ultimo.slice(0, 200)}`);
    console.warn('[ppto-crear] Modelo no disponible:', modelos[i]);
  }

  throw new Error(`ningún modelo disponible: ${ultimo.slice(0, 200)}`);
}

// Por si el modelo devuelve el JSON envuelto en ```json pese a pedirle que no.
function limpiarVallas(s) {
  const t = String(s || '').trim();
  const m = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  return m ? m[1] : t;
}

/* ═══════════════════════ normalización ═══════════════════════ */

function normalizar(d, ctx) {
  // La consulta de foto viaja pegada a su tramo hasta después del filtro: si se
  // recuperase luego por índice contra el array original, un tramo descartado
  // desplazaría todas las fotos y cada día del viaje saldría con la foto del
  // siguiente. Eso no se ve hasta que el cliente abre la página.
  const tramos = [];
  const itinerario = lista(d.itinerario).slice(0, 20).map(x => {
    const o = {
      dia: texto(x && x.dia, 20),
      titulo: texto(x && x.titulo, 90),
      texto: texto(x && x.texto, 1400),
    };
    const al = texto(x && x.alojamiento, 200);
    if (al) o.alojamiento = al;
    return { fila: o, foto: texto(x && x.foto, 120) };
  }).filter(x => x.fila.titulo || x.fila.texto)
    .map((x, i) => {
      tramos.push({ i, titulo: x.fila.titulo, consulta: x.foto || x.fila.titulo });
      return x.fila;
    });

  const alojamientos = lista(d.alojamientos).slice(0, 12).map(x => {
    const o = {
      nombre: texto(x && x.nombre, 120),
      ciudad: texto(x && x.ciudad, 90),
      categoria: texto(x && x.categoria, 90),
      regimen: texto(x && x.regimen, 90),
      nota: texto(x && x.nota, 800),
    };
    const n = entero(x && x.noches);
    if (n) o.noches = n;
    const enlace = urlHttps(x && x.enlace);
    if (enlace) o.enlace = enlace;
    const ficha = lista(x && x.ficha).slice(0, 12)
      .map(f => ({ etiqueta: texto(f && f.etiqueta, 40), valor: texto(f && f.valor, 90) }))
      .filter(f => f.etiqueta && f.valor);
    if (ficha.length) o.ficha = ficha;
    return o;
  }).filter(x => x.nombre);

  const v = d.viajeros;
  const adultos = entero(v && v.adultos);
  const ninos = entero(v && v.ninos);
  const viajeros = adultos ? { adultos, ninos: ninos || 0 } : null;

  const region = REGIONES.indexOf(texto(d.region, 20)) !== -1 ? texto(d.region, 20) : null;

  const fila = {
    cliente_nombre: ctx.cliente,
    cliente_email: ctx.clienteEmail || null,
    cliente_telefono: ctx.clienteTelefono || null,
    destino: texto(d.destino, 90),
    region,
    titulo: texto(d.titulo, 140),
    subtitulo: texto(d.subtitulo, 220) || null,
    resumen: texto(d.resumen, 1600) || null,
    fecha_salida: fechaIso(d.fecha_salida),
    fecha_regreso: fechaIso(d.fecha_regreso),
    noches: entero(d.noches),
    viajeros,
    itinerario,
    alojamientos,
    incluye: listaTextos(d.incluye, 24, 220),
    no_incluye: listaTextos(d.no_incluye, 24, 220),
    precio_total: numero(d.precio_total),
    precio_por_persona: numero(d.precio_por_persona),
    moneda: /^[A-Z]{3}$/.test(texto(d.moneda, 3).toUpperCase()) ? texto(d.moneda, 3).toUpperCase() : 'EUR',
    condiciones_pago: texto(d.condiciones_pago, 700) || null,
    valido_hasta: fechaIso(d.valido_hasta),
    notas_cliente: texto(d.notas_cliente, 1200) || null,
    interno: Object.assign(
      { origen: 'panel', creado_por: 'panel-web' },
      objeto(d.interno),
      {
        // El texto de partida se guarda aquí, donde no lo ve nadie: si mañana
        // hay una discusión sobre qué prometió el proveedor, está guardado.
        texto_original: String(ctx.original || '').slice(0, 20000) || null,
        indicaciones_victor: ctx.indicaciones || null,
      },
      // Los enlaces largos que se apartaron del texto entran aquí, que es de
      // donde el panel saca el botón de «traer las fotos del alojamiento».
      (ctx.enlacesApartados && ctx.enlacesApartados.length
        ? { enlaces_alojamiento: ctx.enlacesApartados } : {})
    ),
  };

  return {
    fila,
    // Sale de los alojamientos porque es donde el modelo la anota, pero viaja
    // aparte: `fila` se vuelca tal cual en la base y una clave de más rompería
    // el alta.
    mostrarEnlace: lista(d.alojamientos).some(x => x && x.mostrar_enlace === true),
    consultas: {
      hero: texto(d.foto_hero, 120) || fila.destino,
      tramos,
    },
  };
}

function texto(v, max) {
  if (v == null) return '';
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s.slice(0, max || 200);
}

// Un enlace normal se queda donde está: el modelo lo necesita para saber a qué
// alojamiento pertenece. Los kilométricos, no. El del barco del Canal du Midi
// medía 1.393 caracteres —era un rastreador de clics, no la ficha— y hacía dos
// destrozos a la vez: se comía casi entero el recuadro de indicaciones (que se
// recorta a 2.000) y acaparaba tanto la atención del modelo que el itinerario
// salía con un solo tramo en vez de tres. Se aparta, y se guarda para que el
// botón de «traer las fotos del alojamiento» pueda usarlo igual.
const ENLACE_RE = /\b(?:https?:\/\/\S+|www\.\S+|(?:[a-z0-9-]+\.)+[a-z]{2,}\/\S*)/gi;
const ENLACE_LARGO = 120;

function apartarEnlacesLargos(texto) {
  const enlaces = [];
  const limpio = String(texto || '').replace(ENLACE_RE, (u) => {
    if (u.length <= ENLACE_LARGO) return u;
    const normalizado = /^https?:\/\//i.test(u) ? u.replace(/^http:/i, 'https:') : `https://${u}`;
    if (enlaces.indexOf(normalizado) === -1) enlaces.push(normalizado);
    return '(un enlace, guardado aparte)';
  });
  return { texto: limpio, enlaces: enlaces.slice(0, 5) };
}

// Igual que texto() pero conservando los saltos de línea.
function textoLargo(v, max) {
  if (v == null) return '';
  return String(v).replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim().slice(0, max || 2000);
}

function lista(v) { return Array.isArray(v) ? v : []; }

function listaTextos(v, maxItems, maxLen) {
  return lista(v).slice(0, maxItems || 20).map(x => texto(x, maxLen || 200)).filter(Boolean);
}

function objeto(v) { return (v && typeof v === 'object' && !Array.isArray(v)) ? v : {}; }

function entero(v) {
  const n = parseInt(v, 10);
  return isFinite(n) && n > 0 && n < 1000 ? n : null;
}

function numero(v) {
  const n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/[^\d.,-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
  return isFinite(n) && n >= 0 && n < 10_000_000 ? Math.round(n * 100) / 100 : null;
}

function fechaIso(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto(v, 12));
  if (!m) return null;
  const mes = Number(m[2]), dia = Number(m[3]);
  return (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) ? m[0] : null;
}

function urlHttps(v) {
  const s = texto(v, 500);
  return /^https:\/\/[^\s<>"']+$/i.test(s) ? s : null;
}

/* ═══════════════════════ la comprobación de limpieza ═══════════════════════ */
//
// Puerto del scripts/verificar_limpieza.py de la skill. Aquí se pasa sobre los
// datos ANTES de guardarlos; el script se sigue pasando sobre el HTML servido,
// que es lo que de verdad ve el cliente. Las dos cosas, no una.

const PATRONES = [
  ['comisión', /\bcomision(es)?\b/, 'delata que hay un intermediario cobrando'],
  ['comisionable', /\bcomisionable\b/, 'lenguaje interno de agencia'],
  ['neto', /\bneto[s]?\b/, 'el neto permite restar y deducir el margen'],
  ['margen', /\bmargen(es)?\b/, 'literalmente lo que no puede verse'],
  ['markup', /\bmark\s?-?up\b/, 'margen en inglés'],
  ['fee', /\bfee[s]?\b/, 'sobreprecio de agencia'],
  ['rappel', /\brappel(es)?\b/, 'incentivo del proveedor a la agencia'],
  ['over', /\bover\b|\bovercomision\w*\b/, 'sobrecomisión, jerga de turoperación'],
  ['precio agencia', /\b(precio|tarifa)\s+(de\s+)?agencia\b/, 'dos precios significa que hay margen'],
  ['confidencial', /\bconfidencial(es|idad)?\b/, 'nada de lo que ve el cliente es confidencial'],
  ['uso interno', /\buso\s+interno\b|\bsolo\s+interno\b/, 'marca de documento interno'],
  ['mayorista', /\bmayorista[s]?\b|\breceptivo[s]?\b|\bturoperador\w*\b|\btour\s?operador\w*\b/, 'nombra la cadena de intermediación'],
  ['localizador', /\blocalizador(es)?\b|\bbooking\s+ref\w*\b|\bpnr\b/, 'referencias del proveedor'],
  ['expediente', /\bexpediente\b/, 'numeración interna del proveedor'],
  ['release / cupo', /\brelease\b|\bcupo[s]?\b|\ballotment\b|\bstop\s?sales?\b/, 'condiciones del proveedor, no del cliente'],
  ['coste interno', /\bcoste\s+(real|neto|proveedor|interno)\b|\bcosto\s+neto\b/, 'el coste no es asunto del cliente'],
];

// Campos que acaban delante del cliente. `interno` no está, a propósito.
function visibles(fila) {
  const out = [];
  const push = (campo, v) => { const s = texto(v, 2000); if (s) out.push([campo, s]); };
  push('destino', fila.destino);
  push('título', fila.titulo);
  push('subtítulo', fila.subtitulo);
  push('resumen', fila.resumen);
  push('condiciones de pago', fila.condiciones_pago);
  push('notas', fila.notas_cliente);
  fila.itinerario.forEach((d, i) => {
    push(`itinerario ${i + 1} (título)`, d.titulo);
    push(`itinerario ${i + 1}`, d.texto);
    push(`itinerario ${i + 1} (alojamiento)`, d.alojamiento);
  });
  fila.alojamientos.forEach((a, i) => {
    push(`alojamiento ${i + 1} (nombre)`, a.nombre);
    push(`alojamiento ${i + 1}`, a.nota);
    (a.ficha || []).forEach(f => push(`alojamiento ${i + 1} (${f.etiqueta})`, f.valor));
  });
  fila.incluye.forEach((t, i) => push(`incluye ${i + 1}`, t));
  fila.no_incluye.forEach((t, i) => push(`no incluye ${i + 1}`, t));
  return out;
}

function revisar(fila, interno) {
  const hallazgos = [];

  // El nombre del proveedor cambia en cada presupuesto: el propio modelo dice
  // cuál era, y se comprueba que no haya quedado suelto por ninguna parte.
  const nombresProveedor = [];
  const io = objeto(interno);
  ['proveedor', 'mayorista', 'receptivo', 'operador'].forEach(k => {
    const s = texto(io[k], 90);
    if (s.length >= 4) nombresProveedor.push(s);
  });

  for (const [campo, valor] of visibles(fila)) {
    const plano = sinAcentos(valor);
    for (const [etiqueta, rx, motivo] of PATRONES) {
      const m = rx.exec(plano);
      if (m) hallazgos.push({ campo, termino: m[0], motivo });
    }
    for (const nombre of nombresProveedor) {
      // Se prueba el nombre entero y su primera palabra ("Le Boat" → "Boat"
      // dentro de "Le Boat Clipper" sigue delatando de quién es el barco).
      const trozos = [nombre].concat(nombre.split(/\s+/).filter(w => w.length >= 4));
      for (const t of trozos) {
        if (sinAcentos(valor).indexOf(sinAcentos(t)) !== -1) {
          hallazgos.push({ campo, termino: t, motivo: 'sigue apareciendo el nombre del proveedor' });
          break;
        }
      }
    }
  }

  // El enlace del alojamiento no se cuenta aquí: no es un descuido que haya que
  // corregir, es una decisión de Victor. Se guarda apartado en `interno` y el
  // panel le pregunta, con el aviso delante, si quiere enseñárselo al cliente.

  // Sin duplicados: el mismo término en el mismo campo se cuenta una vez.
  const claves = new Set();
  return hallazgos.filter(h => {
    const k = h.campo + '|' + h.termino;
    if (claves.has(k)) return false;
    claves.add(k);
    return true;
  }).slice(0, 30);
}

function sinAcentos(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/* ═══════════════════════ alta en Supabase ═══════════════════════ */

function generarId() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  // 256 es múltiplo exacto de 32: el resto no introduce sesgo.
  let s = '';
  for (let i = 0; i < 8; i++) s += ALFABETO[bytes[i] % 32];
  return 'HE-' + s;
}

// Deja la fila lista para guardar: aparta el enlace del alojamiento (que no
// puede salir a la página sin que Victor lo autorice) y arrastra lo que había
// antes cuando se está rehaciendo una propuesta que ya existía.
function paraGuardar(fila, previa, mostrarEnlace) {
  // El enlace se aparta SIEMPRE salvo que Victor lo haya pedido con todas las
  // letras en sus indicaciones. Por defecto queda guardado en `interno` y el
  // panel deja un botón: enseñar al cliente la web de quien nos vende el viaje
  // es una decisión comercial, no un detalle de formato.
  const alojamientos = fila.alojamientos.map(a => {
    const copia = Object.assign({}, a);
    if (!mostrarEnlace) delete copia.enlace;
    return copia;
  });

  // Rehacer no debería costarle a nadie las fotos del alojamiento: se tardan
  // cuarenta segundos en traer y comprobar, y el barco es el mismo aunque
  // cambien las fechas o el precio. Se conservan solo si sigue llamándose
  // igual — si el alojamiento ha cambiado, sus fotos ya no valen.
  const antes = (previa && Array.isArray(previa.alojamientos)) ? previa.alojamientos : [];
  alojamientos.forEach((a, i) => {
    const viejo = antes[i];
    if (!viejo || !Array.isArray(viejo.galeria) || !viejo.galeria.length) return;
    if (sinAcentos(viejo.nombre || '') !== sinAcentos(a.nombre || '')) return;
    a.galeria = viejo.galeria;
  });

  const enlaces = fila.alojamientos.map(a => a.enlace).filter(Boolean);
  const internoPrevio = (previa && previa.interno && typeof previa.interno === 'object') ? previa.interno : {};
  const interno = Object.assign({}, internoPrevio, fila.interno);
  const enlacesAntes = Array.isArray(internoPrevio.enlaces_alojamiento) ? internoPrevio.enlaces_alojamiento : [];
  const enlacesApartados = Array.isArray(fila.interno && fila.interno.enlaces_alojamiento)
    ? fila.interno.enlaces_alojamiento : [];
  const todos = enlaces.concat(enlacesApartados, enlacesAntes)
    .filter((v, i, a) => v && a.indexOf(v) === i);
  if (todos.length) interno.enlaces_alojamiento = todos;

  return Object.assign({}, fila, { alojamientos, interno });
}

async function insertar(base, key, id, fila, estado, mostrarEnlace) {
  const payload = Object.assign(paraGuardar(fila, null, mostrarEnlace), { id, estado });

  try {
    const r = await fetch(`${base}/rest/v1/presupuestos`, {
      method: 'POST',
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (r.ok) return { ok: true };
    const detalle = await r.text().catch(() => '');
    return { ok: false, conflicto: r.status === 409, detalle: `${r.status} ${detalle.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, conflicto: false, detalle: String(e && e.message) };
  }
}

// Rehacer: el MISMO enlace con el contenido nuevo. Es lo que hace falta cuando
// el mayorista manda el presupuesto corregido o el cliente pide un cambio: él
// ya tiene la dirección, puede habérsela reenviado a su pareja, y darle una
// distinta es pedirle que se organice él.
async function rehacer(base, key, id, fila, estado, previa, mostrarEnlace) {
  // `creado_at` no se toca (es la fecha en que se le propuso el viaje) y el
  // estado solo retrocede a borrador si la comprobación de limpieza ha
  // encontrado algo: una propuesta que ya se envió sigue enviada.
  const payload = Object.assign(paraGuardar(fila, previa, mostrarEnlace), {
    estado: estado === 'borrador' ? 'borrador' : (previa.estado === 'borrador' ? 'enviado' : previa.estado),
    actualizado_at: new Date().toISOString(),
  });

  // El correo y el móvil del cliente no se pierden por dejarlos en blanco al
  // rehacer: si el formulario viene vacío, se queda lo que ya había.
  if (!payload.cliente_email) payload.cliente_email = previa.cliente_email || null;
  if (!payload.cliente_telefono) payload.cliente_telefono = previa.cliente_telefono || null;

  try {
    const r = await fetch(`${base}/rest/v1/presupuestos?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
        prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    if (r.ok) return { ok: true };
    const detalle = await r.text().catch(() => '');
    return { ok: false, detalle: `${r.status} ${detalle.slice(0, 300)}` };
  } catch (e) {
    return { ok: false, detalle: String(e && e.message) };
  }
}

async function leerPrevia(base, key, id) {
  try {
    const r = await fetch(
      `${base}/rest/v1/presupuestos?id=eq.${encodeURIComponent(id)}` +
      `&select=id,estado,cliente_nombre,cliente_email,cliente_telefono,alojamientos,interno&limit=1`,
      {
        headers: { apikey: key, authorization: `Bearer ${key}`, accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      }
    );
    if (!r.ok) return null;
    const filas = await r.json();
    return Array.isArray(filas) ? filas[0] : null;
  } catch (_) { return null; }
}

/* ═══════════════════════ los dos mensajes de envío ═══════════════════════ */
//
// Ninguno lleva el precio. El cliente descubre el número dentro de la página,
// después de haberse enamorado del viaje: anunciarlo en el mensaje convierte
// la propuesta en una factura antes de que la abran.

// Todo el mensaje va en el MISMO tratamiento. Antes se conjugaba frase a frase
// y salían mezclas como «Échale un vistazo y decidme qué te parece», que es
// exactamente lo que delata un texto montado por una máquina en algo que se
// supone escrito a mano para ese cliente. Por defecto, "vosotros": el cliente
// típico de la casa es una pareja o una familia.
function trato(fila) {
  const solo = fila.viajeros && fila.viajeros.adultos === 1 && !fila.viajeros.ninos;
  return solo
    ? { tu: 'tu', laVeas: 'la veas', duermes: 'vas a dormir', dime: 'dime',
        teParece: 'te parece', hayas: 'hayas', puedas: 'puedas', tuViaje: 'tu viaje', soloParaTi: 'solo para ti' }
    : { tu: 'vuestra', laVeas: 'la veáis', duermes: 'vais a dormir', dime: 'decidme',
        teParece: 'os parece', hayas: 'hayáis', puedas: 'podáis', tuViaje: 'vuestro viaje', soloParaTi: 'solo para vosotros' };
}

function mayus(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function mensajes({ cliente, url, fila, rehecho }) {
  if (rehecho) return mensajesDeCambio({ cliente, url, fila });
  const saludo = tratamiento(cliente);
  const destino = fila.destino || 'el viaje';
  const aDestino = conPrep('a', destino);
  const t = trato(fila);
  const fechas = fila.fecha_salida && fila.fecha_regreso
    ? `, del ${dia(fila.fecha_salida)} al ${dia(fila.fecha_regreso)}`
    : '';

  const whatsapp =
`Hola ${saludo}, soy Endeis, de Horizonte Exclusivo.

Ya tengo lista ${t.tu} propuesta ${aDestino}${fechas}: ${fila.titulo}.

La he preparado en una página privada para que ${t.laVeas} con calma, con el itinerario día a día y dónde ${t.duermes}:
${url}

${mayus(t.dime)} qué ${t.teParece} y ajustamos lo que haga falta, que para eso está hecha a medida.`;

  const asunto = `${mayus(t.tu)} propuesta ${aDestino} ya está lista`;

  const email =
`Hola ${saludo}:

Ya tengo lista la propuesta de ${t.tuViaje} ${aDestino}${fechas}. La he preparado en una página privada, ${t.soloParaTi}, para que ${t.puedas} leerla con calma y enseñársela a quien ${t.dime === 'dime' ? 'quieras' : 'queráis'}:

${url}

Dentro está el itinerario día a día, dónde ${t.duermes} y qué incluye exactamente. Si algo no encaja —una noche más, otro ritmo, otro alojamiento—, ${t.dime} y lo ajustamos: para eso está hecho a medida.

Cuando ${t.hayas} podido verla, me ${t.dime === 'dime' ? 'cuentas' : 'contáis'} y seguimos.

Un abrazo,

Endeis
Horizonte Exclusivo
${TEL} · ${EMAIL}
Carrer Major, 37 · 08750 Molins de Rei (Barcelona)
Más que viajar, vivir el mundo`;

  return { whatsapp, email_asunto: asunto, email_cuerpo: email };
}

// Cuando se rehace una propuesta, el mensaje no puede decir «ya la tengo lista»:
// el cliente ya la tenía. Lo que hay que decirle es que la ha cambiado y que
// mire el mismo enlace de siempre — que además es lo que evita que abra por
// error la versión vieja que tiene en el correo de la semana pasada.
function mensajesDeCambio({ cliente, url, fila }) {
  const saludo = tratamiento(cliente);
  const aDestino = conPrep('a', fila.destino || 'el viaje');
  const t = trato(fila);
  const solo = t.dime === 'dime';
  const echa = solo ? 'Échale' : 'Echadle';
  const tienes = solo ? 'tienes' : 'tenéis';
  const mires = solo ? 'la mires' : 'la miréis';
  const busques = solo ? 'busques' : 'busquéis';

  const whatsapp =
`Hola ${saludo}, soy Endeis.

He actualizado ${t.tu} propuesta ${aDestino} con los cambios que hablamos. Está en el mismo enlace de siempre, así que no ${tienes} que buscar nada:
${url}

${echa} un vistazo y ${t.dime} qué ${t.teParece} ahora.`;

  const email =
`Hola ${saludo}:

He actualizado la propuesta de ${t.tuViaje} ${aDestino} con los cambios que comentamos. La ${tienes} en el mismo enlace de siempre, no hace falta que ${busques} el correo anterior:

${url}

Cuando ${mires}, ${t.dime} qué ${t.teParece} y seguimos ajustando lo que haga falta.

Un abrazo,

Endeis
Horizonte Exclusivo
${TEL} · ${EMAIL}`;

  return { whatsapp, email_asunto: `He actualizado ${t.tu} propuesta ${aDestino}`, email_cuerpo: email };
}

// "Familia Ferrer" no se saluda como "Familia": ahí va el nombre entero.
function tratamiento(nombre) {
  const n = texto(nombre, 120);
  if (/^(familia|flia|sres|sras|sr\.|sra\.|d\.|dña)/i.test(n)) return n;
  return n.split(/\s+/)[0] || n;
}

// "a" + "el Canal du Midi" es "al Canal du Midi".
function conPrep(prep, destino) {
  const d = texto(destino, 90);
  if (!d) return '';
  if (/^el\s+/i.test(d)) {
    const resto = d.replace(/^el\s+/i, '');
    if (prep === 'a') return `al ${resto}`;
    if (prep === 'de') return `del ${resto}`;
  }
  return `${prep} ${d}`;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function dia(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  return m ? `${Number(m[3])} de ${MESES[Number(m[2]) - 1]}` : '';
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

// Comparación en tiempo constante: con una comparación normal, el tiempo de
// respuesta va diciendo cuántos caracteres se han acertado.
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
