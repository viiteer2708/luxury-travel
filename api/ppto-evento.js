// api/ppto-evento.js — registro de eventos de los presupuestos privados.
//
// La página /ppto/{ID} manda aquí lo que hace el cliente: vista | aceptado |
// pdf | whatsapp. Con eso Endeis sabe si han abierto la propuesta, cuántas
// veces y cuándo han dicho que sí. Cuando el evento es `aceptado`, además del
// registro sale un aviso por email, con el mismo patrón que usa
// grupo-new-energy-web/api/lead.js (Brevo por fetch, sin dependencias npm).
//
// Función Edge de Vercel. Env vars (Vercel → Settings → Environment Variables):
//   SUPABASE_URL               — https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  — clave service_role; SOLO aquí, el repo es PÚBLICO
//   BREVO_API_KEY              — clave API v3 de Brevo (si falta, no se manda email)
//   BREVO_SENDER_EMAIL         — remitente VERIFICADO en Brevo
//   PPTO_AVISO_EMAIL           — destino del aviso (por defecto viajes@horizonteexclusivo.es)
//
// Si Brevo no está configurado el evento SE GUARDA igual y solo queda un aviso
// en los logs: perder el registro de una aceptación sería mucho peor que
// perder el email.

export const config = { runtime: 'edge' };

const ID_RE = /^HE-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;
const TIPOS = ['vista', 'aceptado', 'pdf', 'whatsapp'];
const AVISO_DEFAULT = 'viajes@horizonteexclusivo.es';
const WEB = 'https://www.horizonteexclusivo.es';

// Freno best-effort por IP, igual que en api/chat.js. La memoria de una Edge
// Function no es compartida entre regiones ni permanente: esto no es una
// defensa seria, solo evita que un bucle del navegador infle la tabla.
const VENTANA_MS = 60_000;
const MAX_POR_VENTANA = 20;
const vistos = new Map();

export default async function handler(req) {
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405);

  let cuerpo;
  try { cuerpo = await req.json(); }
  catch (_) { return json({ ok: false, error: 'bad_request' }, 400); }

  const id = String((cuerpo && cuerpo.id) || '').trim().toUpperCase();
  const tipo = String((cuerpo && cuerpo.tipo) || '').trim().toLowerCase();
  if (!ID_RE.test(id) || TIPOS.indexOf(tipo) === -1) {
    return json({ ok: false, error: 'validation' }, 422);
  }

  const ip = req.headers.get('x-forwarded-for') || 'sin-ip';
  if (pasado(ip)) return json({ ok: false, error: 'rate_limited' }, 429);

  const base = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) {
    console.error('[ppto-evento] Supabase sin configurar; evento perdido:', { id, tipo });
    return json({ ok: true, registrado: false }, 200);
  }

  const meta = sanearMeta(cuerpo && cuerpo.meta);
  meta.ua = (req.headers.get('user-agent') || '').slice(0, 200);
  meta.pais = req.headers.get('x-vercel-ip-country') || '';

  const cab = {
    apikey: key,
    authorization: `Bearer ${key}`,
    'content-type': 'application/json',
    accept: 'application/json',
  };

  try {
    await fetch(`${base}/rest/v1/presupuesto_eventos`, {
      method: 'POST',
      headers: { ...cab, prefer: 'return=minimal' },
      body: JSON.stringify({ presupuesto_id: id, tipo, meta }),
    });
  } catch (e) {
    console.error('[ppto-evento] No se pudo registrar el evento:', e && e.message);
    return json({ ok: true, registrado: false }, 200);
  }

  // `vista` solo adelanta el estado desde "enviado": si está en borrador es que
  // lo está mirando Endeis, y si ya está aceptado no queremos retroceder.
  if (tipo === 'vista') {
    await parchear(base, cab, `id=eq.${id}&estado=eq.enviado`, { estado: 'visto' });
    return json({ ok: true }, 200);
  }

  if (tipo === 'aceptado') {
    await parchear(base, cab, `id=eq.${id}&estado=neq.caducado`, { estado: 'aceptado' });
    await avisar(base, cab, id);
  }

  return json({ ok: true }, 200);
}

/* ═══════════════════════ auxiliares ═══════════════════════ */

function pasado(ip) {
  const ahora = Date.now();
  const reg = vistos.get(ip);
  if (!reg || ahora - reg.desde > VENTANA_MS) { vistos.set(ip, { desde: ahora, n: 1 }); return false; }
  reg.n += 1;
  return reg.n > MAX_POR_VENTANA;
}

// Del cliente solo aceptamos un puñado de datos y recortados: lo que llega del
// navegador nunca entra tal cual en la base.
function sanearMeta(m) {
  const out = {};
  if (m && typeof m === 'object' && !Array.isArray(m)) {
    const ancho = Number(m.ancho);
    if (isFinite(ancho) && ancho > 0 && ancho < 10000) out.ancho = Math.round(ancho);
  }
  return out;
}

async function parchear(base, cab, filtro, campos) {
  try {
    await fetch(`${base}/rest/v1/presupuestos?${filtro}`, {
      method: 'PATCH',
      headers: { ...cab, prefer: 'return=minimal' },
      body: JSON.stringify({ ...campos, actualizado_at: new Date().toISOString() }),
    });
  } catch (e) {
    console.error('[ppto-evento] No se pudo actualizar el estado:', e && e.message);
  }
}

// El aviso va a Endeis, no al cliente, pero sigue sin llevar nada del
// proveedor: solo lo que ya ve el cliente en su página. `interno` no se
// consulta aquí tampoco.
async function avisar(base, cab, id) {
  const apiKey = getEnv('BREVO_API_KEY');
  const remitente = getEnv('BREVO_SENDER_EMAIL');
  const destino = getEnv('PPTO_AVISO_EMAIL') || AVISO_DEFAULT;

  if (!apiKey || !remitente) {
    console.warn('[ppto-evento] BREVO_API_KEY o BREVO_SENDER_EMAIL sin configurar. Aceptación registrada pero SIN email:', id);
    return;
  }

  let p = null;
  try {
    const r = await fetch(
      `${base}/rest/v1/presupuestos?id=eq.${id}&select=id,cliente_nombre,cliente_email,cliente_telefono,destino,titulo,precio_total,moneda,fecha_salida&limit=1`,
      { headers: cab }
    );
    const filas = await r.json();
    p = Array.isArray(filas) ? filas[0] : null;
  } catch (e) {
    console.error('[ppto-evento] No se pudo leer el presupuesto para el aviso:', e && e.message);
  }
  if (!p) return;

  const asunto = `[Horizonte] ${p.cliente_nombre || 'Un cliente'} ha aceptado su viaje a ${p.destino || ''} — ${p.id}`;
  const htmlContent = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;line-height:1.6">
      <h2 style="margin:0 0 6px;color:#a8863f">Presupuesto aceptado</h2>
      <p style="margin:0 0 18px;color:#666">${esc(p.titulo || '')}</p>
      <table cellpadding="6" style="border-collapse:collapse">
        <tr><td><b>Referencia</b></td><td>${esc(p.id)}</td></tr>
        <tr><td><b>Cliente</b></td><td>${esc(p.cliente_nombre || '—')}</td></tr>
        ${p.cliente_email ? `<tr><td><b>Email</b></td><td><a href="mailto:${esc(p.cliente_email)}">${esc(p.cliente_email)}</a></td></tr>` : ''}
        ${p.cliente_telefono ? `<tr><td><b>Teléfono</b></td><td><a href="tel:${esc(p.cliente_telefono)}">${esc(p.cliente_telefono)}</a></td></tr>` : ''}
        <tr><td><b>Destino</b></td><td>${esc(p.destino || '—')}</td></tr>
        ${p.fecha_salida ? `<tr><td><b>Salida</b></td><td>${esc(p.fecha_salida)}</td></tr>` : ''}
        <tr><td><b>Importe</b></td><td>${esc(p.precio_total)} ${esc(p.moneda || 'EUR')}</td></tr>
      </table>
      <p style="margin:22px 0 0">
        <a href="${WEB}/ppto/${esc(p.id)}/" style="background:#c9a96e;color:#0a0a0a;padding:12px 24px;border-radius:50px;text-decoration:none;font-weight:600">Ver la propuesta</a>
      </p>
      <p style="margin:22px 0 0;color:#666;font-size:13px">Le dijiste que Endeis le escribe hoy mismo. Toca cumplirlo.</p>
    </div>`;

  try {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: 'Presupuestos Horizonte', email: remitente },
        to: [{ email: destino }],
        ...(p.cliente_email ? { replyTo: { email: p.cliente_email, name: p.cliente_nombre || '' } } : {}),
        subject: asunto,
        htmlContent,
      }),
    });
    if (!r.ok) console.error('[ppto-evento] Brevo respondió', r.status, await r.text());
  } catch (e) {
    console.error('[ppto-evento] Error enviando el aviso:', e && e.message);
  }
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getEnv(name) {
  try { return (typeof process !== 'undefined' && process.env && process.env[name]) || ''; }
  catch (_) { return ''; }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
