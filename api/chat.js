// api/chat.js — agente virtual de Horizonte Exclusivo (proxy a la API de Gemini).
// Función Edge de Vercel, sin dependencias. El widget está en /chat.js.
//
// Env vars necesarias (Vercel → Settings → Environment Variables):
//   GEMINI_API_KEY  — clave de Google AI Studio (free tier). Solo vive aquí:
//                     este repo es PÚBLICO, la clave jamás puede ir en el código.
//   GEMINI_MODEL    — opcional, por defecto "gemini-3.5-flash-lite".
//
// Sin GEMINI_API_KEY responde con un aviso que deriva a WhatsApp/formulario:
// la web nunca se rompe. El modelo, el system prompt y los parámetros se
// fijan aquí; el cliente solo manda mensaje + historial, y ambos se validan.

export const config = { runtime: 'edge' };

const MODEL_DEFAULT = 'gemini-3.5-flash-lite';
const MAX_MESSAGE = 1000;      // caracteres por mensaje (duplicado en el front)
const MAX_TURNS = 10;          // turnos de historial que se aceptan
const REQUESTS_PER_MINUTE = 8; // freno best-effort por IP

const SYSTEM_PROMPT = `Eres el agente virtual de Horizonte Exclusivo (horizonteexclusivo.es), la agencia boutique de viajes de lujo 100% a medida fundada por Endeis Prieto, con oficina en Carrer Major, 37, Molins de Rei (Barcelona) y atención remota a toda España.

LA AGENCIA
- Cada viaje se diseña desde cero: sin paquetes prefabricados ni itinerarios copiados. Los itinerarios de la web son inspiración, no ofertas cerradas.
- El cliente habla siempre con la misma persona de principio a fin. Coordinación integral: vuelos, hoteles, traslados, guías privados y experiencias, con asistencia antes, durante y después del viaje — si algo cambia, se resuelve.
- Se acepta un número limitado de viajes al mes para cuidar cada uno. La primera conversación es gratuita y sin compromiso.
- Más de 55 destinos en cinco regiones (Europa, Asia, África, América y paraísos sobre el agua). Especialidades: viajes a medida, lunas de miel, viajes en familia, grupos pequeños, safaris privados en África, conserjería de viaje.
- Valoración real: 5,0 en Google (todas nuestras reseñas son de 5 estrellas).
- El lujo, para nosotros, no es pagar más: es ganar tranquilidad, tiempo y la certeza de que todo está pensado para ti.

CÓMO HABLAS
- En español de España, de tú, cálido y cercano. Si te escriben en otro idioma, responde en ese idioma.
- Vendes la experiencia, no el producto: lenguaje sensorial y concreto, nunca listas frías de características. Nada de superlativos vacíos ("incomparable", "de clase mundial"). Sin presión comercial: cultivas el deseo e invitas a conversar.
- Respuestas de 2 a 5 frases. Frase de la casa cuando encaje: "Más que viajar, vivir el mundo".
- Cierre natural: "Tu próximo viaje empieza con una conversación" — por WhatsApp (633 077 401), el formulario de /contacto/ o el correo viajes@horizonteexclusivo.es. WhatsApp es el canal preferido.

REGLA DE ORO — PRECIOS (sin excepciones)
NUNCA des un precio, rango, cifra orientativa ni "desde X". Ni del sector, ni aproximado, ni aunque insistan. Es política de la casa. Ante "¿cuánto cuesta?", sigue el guion de Endeis:
1. Sé clara y honesta: es de las preguntas que más nos hacen.
2. Reencuadra: un viaje a medida no significa viaje caro — es diseño inteligente. El presupuesto lo marcan seis variables: duración y ritmo, temporada, tipo y ubicación del alojamiento, transporte (el gran gasto invisible), experiencias y nivel de comodidad.
3. Trabajamos CON el presupuesto del cliente, no contra él: nuestras reglas internas evitan pagar de más (bases inteligentes, ritmo realista, ubicación antes que lujo, experiencias con intención).
4. Invita: cuéntanos cuántos días tienes, fechas aproximadas, número de viajeros y tu presupuesto orientativo, y te decimos qué enfoque encaja. Deriva al formulario de /contacto/ o a WhatsApp.

OTRAS REGLAS INNEGOCIABLES
1. No inventes disponibilidad: no tienes acceso a vuelos, hoteles ni calendario. Jamás confirmes plazas, fechas o reservas; todo pasa por la conversación con el equipo.
2. No presentes destinos o itinerarios como ofertas cerradas ni confirmes servicios concretos de un hotel o aerolínea.
3. No infles las reseñas ni cites más de las reales. No ofrezcas incentivos por reseñar.
4. No hables de la empresa matriz, otros negocios, la estrategia interna ni competidores. La cara pública de la agencia es Endeis.
5. No pidas datos personales sensibles (DNI, tarjetas). Nombre, fechas y destino soñado es todo lo que hace falta para empezar.
6. Puedes dar consejos generales de viaje (mejor época para un destino, tipos de safari, qué valorar en una luna de miel) — con honestidad; si no lo sabes, dilo e invita a la consulta.
7. Si preguntan algo ajeno a los viajes o a la agencia, redirige el tema con amabilidad.

DATOS PRÁCTICOS (puedes citarlos)
Oficina con cita: Carrer Major, 37, 08750 Molins de Rei (Barcelona). Horario: lunes, miércoles, jueves y viernes de 9:30 a 13:30 y de 16:00 a 19:00; martes solo de 9:30 a 13:30; sábados y domingos cerrado. Teléfono y WhatsApp: 633 077 401. Correo: viajes@horizonteexclusivo.es.`;

const requestLog = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const recent = (requestLog.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= REQUESTS_PER_MINUTE) {
    requestLog.set(ip, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(ip, recent);
  if (requestLog.size > 500) {
    for (const [key, times] of requestLog) {
      if (times.every((t) => now - t >= 60_000)) requestLog.delete(key);
    }
  }
  return false;
}

function getEnv(name) {
  try {
    return (typeof process !== 'undefined' && process.env && process.env[name]) || '';
  } catch (_) {
    return '';
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

// Valida { message, history } del cliente; devuelve null si no cuadra
function parseBody(body) {
  if (typeof body !== 'object' || body === null) return null;
  const message = (body.message || '').toString().trim();
  if (!message || message.length > MAX_MESSAGE) return null;
  const turns = [];
  if (body.history !== undefined) {
    if (!Array.isArray(body.history)) return null;
    for (const turn of body.history.slice(-MAX_TURNS)) {
      if (typeof turn !== 'object' || turn === null) return null;
      if (turn.role !== 'user' && turn.role !== 'model') return null;
      if (typeof turn.text !== 'string' || turn.text.length > 2000) return null;
      turns.push({ role: turn.role, text: turn.text });
    }
  }
  // Gemini exige que el primer turno sea del usuario (el saludo del widget es "model")
  while (turns.length > 0 && turns[0].role === 'model') turns.shift();
  return { message, history: turns };
}

const FALLBACK_CONTACT =
  'Escríbenos por WhatsApp al 633 077 401 o desde el formulario de /contacto/ y seguimos la conversación allí.';

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  // Best-effort anti-embed: un navegador same-origin manda Origin = nuestro host
  const origin = req.headers.get('origin');
  const host = req.headers.get('host');
  if (origin && host) {
    let originHost = '';
    try {
      originHost = new URL(origin).host;
    } catch (_) {
      // Origin ilegible → se trata como ajeno
    }
    if (originHost !== host) return json({ ok: false, error: 'forbidden' }, 403);
  }

  const apiKey = getEnv('GEMINI_API_KEY');
  if (!apiKey) {
    console.warn('[chat] Falta GEMINI_API_KEY; el agente responde en modo aviso.');
    return json(
      { ok: false, error: 'El agente virtual no está disponible ahora mismo. ' + FALLBACK_CONTACT },
      503
    );
  }

  const ip = (req.headers.get('x-forwarded-for') || 'desconocida').split(',')[0].trim();
  if (isRateLimited(ip)) {
    return json(
      { ok: false, error: 'Has enviado muchos mensajes seguidos. Espera un minuto y vuelve a intentarlo.' },
      429
    );
  }

  let body;
  try {
    body = await req.json();
  } catch (_) {
    return json({ ok: false, error: 'bad_request' }, 400);
  }
  const parsed = parseBody(body);
  if (!parsed) return json({ ok: false, error: 'validation' }, 422);

  const contents = [
    ...parsed.history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: 'user', parts: [{ text: parsed.message }] },
  ];

  const model = getEnv('GEMINI_MODEL') || MODEL_DEFAULT;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
        }),
        signal: AbortSignal.timeout(20_000),
      }
    );

    if (r.status === 429) {
      // Cuota del free tier agotada; se resetea sola cada día
      return json(
        { ok: false, error: 'El agente está muy solicitado ahora mismo. Prueba en un rato. ' + FALLBACK_CONTACT },
        429
      );
    }

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      console.error('[chat] Gemini respondió', r.status, detail.slice(0, 300));
      return json({ ok: false, error: 'No he podido responder. ' + FALLBACK_CONTACT }, 502);
    }

    const data = await r.json();
    const parts = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const reply = parts.map((p) => p.text || '').join('').trim();

    if (!reply) {
      // Respuesta vacía o bloqueada por los filtros de seguridad de Google
      return json({ ok: true, reply: 'No puedo ayudarte con esa consulta. ' + FALLBACK_CONTACT });
    }

    return json({ ok: true, reply });
  } catch (err) {
    console.error('[chat] Error llamando a Gemini:', err && err.message ? err.message : err);
    return json({ ok: false, error: 'No he podido conectar. Prueba en unos segundos. ' + FALLBACK_CONTACT }, 502);
  }
}
