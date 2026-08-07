// api/ppto.js — presupuestos privados de Horizonte Exclusivo.
//
// Sirve /ppto/{ID} (vía el rewrite de vercel.json) como una página con el
// branding de la casa, lista para enviar al cliente final. Función Edge de
// Vercel, sin dependencias npm: este repo no tiene package.json y no lo va a
// tener. Habla con Supabase por la REST API de PostgREST con fetch, igual que
// api/chat.js habla con Gemini.
//
// Env vars necesarias (Vercel → Settings → Environment Variables):
//   SUPABASE_URL               — https://<ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  — clave service_role. SOLO vive aquí: este repo
//                                es PÚBLICO, jamás puede ir en el código.
//
// Sin env vars la página responde con un aviso sobrio que deriva a WhatsApp:
// la web nunca enseña un stack trace ni un error de Vercel.
//
// ── POR QUÉ ESTA FUNCIÓN NO HACE `select=*` ─────────────────────────────────
// La tabla `presupuestos` tiene una columna `interno` (jsonb) donde se guarda
// lo que venía en el presupuesto del mayorista y que el cliente JAMÁS puede
// ver: comisión de la agencia, neto, nombre del proveedor, localizadores.
// Seleccionando columnas explícitas, esa columna no se pide nunca y por tanto
// es físicamente imposible que llegue al navegador, aunque alguien meta ahí lo
// que sea. Un `select=*` convertiría un descuido en una fuga. No lo cambies.
// ────────────────────────────────────────────────────────────────────────────

export const config = { runtime: 'edge' };

// Columnas que se sirven al navegador. `interno` NO está aquí, y no debe estar.
const COLUMNAS = [
  'id', 'estado',
  'cliente_nombre',
  'destino', 'region', 'titulo', 'subtitulo',
  'fecha_salida', 'fecha_regreso', 'noches', 'viajeros',
  'hero_imagen', 'resumen', 'itinerario', 'alojamientos',
  'incluye', 'no_incluye',
  'precio_total', 'precio_por_persona', 'moneda',
  'condiciones_pago', 'valido_hasta', 'notas_cliente', 'creditos',
].join(',');

const ID_RE = /^HE-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/;
// Las imágenes solo pueden salir del propio repo: evita que un valor mal
// guardado en la base inyecte CSS o cargue recursos de terceros.
const RUTA_IMG_RE = /^\/images\/[A-Za-z0-9._/-]+$/;
// Segundo origen permitido, y solo uno: el bucket `ppto-fotos` de nuestro
// Supabase, donde api/ppto-medios.js copia las fotos de stock y las del
// alojamiento. Se copian en vez de enlazarse a propósito — enlazar a Wikimedia
// o a la web del proveedor sería contarle al cliente de dónde sale la propuesta
// y quedarnos sin foto el día que la borren de allí.
const RUTA_ALMACEN_RE = /^https:\/\/[a-z0-9-]{1,60}\.supabase\.co\/storage\/v1\/object\/public\/ppto-fotos\/[A-Za-z0-9._/-]+$/;

const TEL = '+34 633 077 401';
const TEL_WA = '34633077401';
const EMAIL = 'viajes@horizonteexclusivo.es';
const HERO_FALLBACK = '/images/photos/photo-1506377585622-bedcbb027afc-1920.webp';

export default async function handler(req) {
  const url = new URL(req.url);
  const id = (url.searchParams.get('id') || '').trim().toUpperCase();

  // Un ID con formato imposible ni siquiera llega a la base.
  if (!ID_RE.test(id)) return html(paginaNoEncontrado(), 404);

  const base = getEnv('SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!base || !key) {
    console.error('[ppto] SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY sin configurar.');
    return html(paginaAviso(
      'Estamos preparando tu propuesta',
      'Tu presupuesto estará disponible en unos minutos. Si tienes prisa, escríbenos por WhatsApp y te lo pasamos al momento.'
    ), 503);
  }

  let p;
  try {
    const r = await fetch(
      `${base}/rest/v1/presupuestos?id=eq.${encodeURIComponent(id)}&select=${COLUMNAS}&limit=1`,
      {
        headers: {
          apikey: key,
          authorization: `Bearer ${key}`,
          accept: 'application/json',
        },
      }
    );
    if (!r.ok) {
      console.error('[ppto] PostgREST respondió', r.status, await r.text());
      return html(paginaAviso(
        'No hemos podido cargar tu propuesta',
        'Ha sido un problema nuestro, no tuyo. Escríbenos por WhatsApp y te la enviamos ahora mismo.'
      ), 503);
    }
    const filas = await r.json();
    p = Array.isArray(filas) ? filas[0] : null;
  } catch (e) {
    console.error('[ppto] Error consultando Supabase:', e && e.message);
    return html(paginaAviso(
      'No hemos podido cargar tu propuesta',
      'Ha sido un problema nuestro, no tuyo. Escríbenos por WhatsApp y te la enviamos ahora mismo.'
    ), 503);
  }

  if (!p) return html(paginaNoEncontrado(), 404);
  if (p.estado === 'caducado') return html(paginaCaducada(p), 200);

  return html(paginaPresupuesto(p), 200);
}

/* ═══════════════════════ utilidades ═══════════════════════ */

function getEnv(name) {
  try { return (typeof process !== 'undefined' && process.env && process.env[name]) || ''; }
  catch (_) { return ''; }
}

function html(body, status) {
  return new Response(body, {
    status,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Duplicado a propósito con vercel.json: quien entre por /api/ppto
      // directamente también queda fuera de los buscadores y de las cachés.
      'x-robots-tag': 'noindex, nofollow, noarchive',
      'cache-control': 'private, no-store',
    },
  });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function imagen(ruta, fallback) {
  const r = typeof ruta === 'string' ? ruta.trim() : '';
  return (RUTA_IMG_RE.test(r) || RUTA_ALMACEN_RE.test(r)) ? r : (fallback || '');
}

// Enlaces que salen de la base: solo https y sin comillas ni espacios, para que
// un valor mal guardado no pueda romperse fuera del atributo href.
function enlaceSeguro(v) {
  const s = typeof v === 'string' ? v.trim() : '';
  return /^https:\/\/[^\s<>"'`]+$/i.test(s) ? s : '';
}

function lista(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) { try { const j = JSON.parse(v); return Array.isArray(j) ? j : []; } catch (_) { return []; } }
  return [];
}

function objeto(v) {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim()) { try { const j = JSON.parse(v); return (j && typeof j === 'object') ? j : {}; } catch (_) { return {}; } }
  return {};
}

// Formateo español a mano: no dependemos de que el runtime traiga ICU completo.
function euros(n, moneda) {
  const num = Number(n);
  if (!isFinite(num)) return '';
  const decimales = Math.abs(num % 1) > 0.004;
  const fijo = num.toFixed(decimales ? 2 : 0);
  const [ent, dec] = fijo.split('.');
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const simbolo = (moneda && moneda !== 'EUR') ? ` ${moneda}` : ' €';
  return miles + (dec ? ',' + dec : '') + simbolo;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function fechaLarga(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
}

function fechaCorta(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  return `${Number(m[3])} ${MESES[Number(m[2]) - 1].slice(0, 3)}`;
}

// "a" + "el Canal du Midi" es "al Canal du Midi", no "a el Canal du Midi".
// Los destinos con artículo (el Cairo, el Canal du Midi, la Toscana) son
// bastante comunes y una preposición mal contraída canta muchísimo en una
// propuesta que se supone escrita a mano para ese cliente.
function conPrep(prep, destino) {
  const d = String(destino || '').trim();
  if (!d) return '';
  if (/^el\s+/i.test(d)) {
    const resto = d.replace(/^el\s+/i, '');
    if (prep === 'a') return `al ${resto}`;
    if (prep === 'de') return `del ${resto}`;
  }
  return `${prep} ${d}`;
}

function textoViajeros(v) {
  const o = objeto(v);
  const a = Number(o.adultos) || 0;
  const n = Number(o.ninos) || 0;
  const partes = [];
  if (a) partes.push(a === 1 ? '1 adulto' : `${a} adultos`);
  if (n) partes.push(n === 1 ? '1 niño' : `${n} niños`);
  return partes.join(' · ');
}

/* ═══════════════════════ armazón de página ═══════════════════════ */

function documento({ titulo, cuerpo, heroImg }) {
  return `<!DOCTYPE html>
<html lang="es-ES">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow, noarchive">
<title>${esc(titulo)}</title>
<link rel="icon" type="image/x-icon" href="/images/genfavicon-package/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/images/genfavicon-package/genfavicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/images/genfavicon-package/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
${heroImg ? `<link rel="preload" as="image" href="${esc(heroImg)}" fetchpriority="high">` : ''}
<style>${CSS}</style>
</head>
<body>
${cuerpo}
</body>
</html>`;
}

/* ═══════════════════════ CSS ═══════════════════════
   Va embebido aquí y no en /styles.css a propósito: /styles.css es el CSS de
   las 150 páginas públicas y estas páginas son la excepción de la casa. Los
   componentes (.dest-hero, .itinerary-block, .includes-grid…) están copiados
   de escocia/index.html, que es donde viven de verdad en este proyecto.
   De /styles.css solo se heredan los tokens, .btn, .reveal y el foco visible. */
const CSS = `
section { padding: 100px 0; }
.section-header { text-align: center; margin-bottom: 56px; }
.section-label { font-size: 0.75rem; letter-spacing: 4px; text-transform: uppercase; color: var(--gold); margin-bottom: 16px; display: block; }
.section-title { font-size: clamp(1.9rem, 4vw, 2.8rem); color: var(--white); margin-bottom: 16px; }
.divider { width: 60px; height: 1px; background: var(--gold); margin: 20px auto; }

/* ── Barra superior: logo y nada más. Aquí no queremos que el cliente se vaya
      a navegar destinos; queremos que lea su viaje y decida. ── */
.ppto-top { position: fixed; top: 0; left: 0; width: 100%; height: 70px; z-index: 1000; background: var(--dark); border-bottom: 1px solid rgba(201,169,110,0.15); display: flex; align-items: center; }
.ppto-top .container { display: flex; align-items: center; justify-content: space-between; gap: 16px; width: 100%; }
.ppto-top img { height: 44px; width: auto; }
.ppto-ref { text-align: right; font-size: 0.72rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); line-height: 1.5; }
.ppto-ref strong { display: block; color: var(--gold); font-weight: 500; letter-spacing: 2px; }
.ppto-para { display: block; }

.dest-hero { min-height: calc(70vh - 110px); display: flex; align-items: center; justify-content: center; text-align: center; position: relative; overflow: hidden; padding: 110px 0 40px; background-size: cover; background-position: center; background-attachment: fixed; }
.dest-hero::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,10,10,0.15) 0%, rgba(10,10,10,0.35) 50%, var(--dark) 100%); }
.dest-hero-content { position: relative; z-index: 2; max-width: 860px; padding: 0 24px; }
.dest-hero-content h1 { font-size: clamp(2.2rem, 5.5vw, 4.2rem); font-weight: 700; color: var(--white); line-height: 1.12; margin-bottom: 18px; text-shadow: 0 2px 4px rgba(0,0,0,0.8), 0 4px 20px rgba(0,0,0,0.6), 0 8px 40px rgba(0,0,0,0.4); }
.dest-hero-content .dest-duration { font-size: 0.85rem; letter-spacing: 3px; text-transform: uppercase; color: var(--white); font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.8), 0 4px 20px rgba(0,0,0,0.6); }
.dest-hero-content .section-label { font-size: 0.85rem; letter-spacing: 5px; margin-bottom: 18px; color: var(--gold-light); text-shadow: 0 2px 4px rgba(0,0,0,0.9), 0 4px 20px rgba(0,0,0,0.7); }

.ppto-intro { padding: 80px 0 40px; }
.dest-intro-text { max-width: 780px; margin: 0 auto; text-align: center; font-size: 1.05rem; color: var(--text); line-height: 1.9; font-weight: 300; }
.dest-intro-text + .dest-intro-text { margin-top: 18px; }

/* ── Itinerario ── */
.itinerary-block { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; margin-bottom: 80px; position: relative; z-index: 2; }
.itinerary-block:last-child { margin-bottom: 0; }
.itinerary-block.reverse .itinerary-carousel { order: 2; }
.itinerary-block.reverse .itinerary-content { order: 1; }
.itinerary-carousel { position: relative; border-radius: var(--radius); overflow: hidden; height: 400px; background: var(--dark-card); }
.itinerary-carousel .carousel-slide { position: absolute; inset: 0; opacity: 0; transition: opacity 0.6s ease; }
.itinerary-carousel .carousel-slide.active { opacity: 1; }
.itinerary-carousel .carousel-slide img { width: 100%; height: 100%; object-fit: cover; }
.carousel-controls { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 12px; z-index: 2; }
.carousel-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.4); background: rgba(0,0,0,0.45); backdrop-filter: blur(4px); color: #fff; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease; }
.carousel-btn:hover { background: rgba(0,0,0,0.7); border-color: rgba(255,255,255,0.7); }
.carousel-dots { display: flex; gap: 8px; }
.carousel-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.45); border: none; cursor: pointer; transition: all 0.3s ease; padding: 0; }
.carousel-dot.active { background: var(--gold); transform: scale(1.2); }
.itinerary-content .section-label { text-align: left; margin-bottom: 12px; }
.itinerary-content h3 { font-size: 1.8rem; color: var(--white); margin-bottom: 16px; }
.itinerary-content p { font-size: 0.95rem; color: var(--text-muted); line-height: 1.8; font-weight: 300; }
.itinerary-content .noche-en { margin-top: 20px; font-size: 0.85rem; color: var(--text); letter-spacing: 0.5px; }
.itinerary-content .noche-en span { color: var(--gold); }

/* ── Alojamientos ── */
.hoteles-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; }
.hoteles-grid.una-sola { max-width: 620px; margin: 0 auto; }
.hotel-card { background: var(--dark-card); border: 1px solid rgba(201,169,110,0.15); border-radius: var(--radius); overflow: hidden; transition: var(--transition); }
.hotel-card:hover { border-color: rgba(201,169,110,0.35); transform: translateY(-4px); }
/* El acolchado vive en el cuerpo, no en la tarjeta: así la galería llega a
   sangre hasta los bordes de la ficha en vez de quedarse con un marco. */
.hotel-cuerpo { padding: 30px 26px; }
.hotel-card h3 { font-size: 1.25rem; color: var(--white); margin-bottom: 6px; }
.hotel-card .hotel-meta { font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); margin-bottom: 14px; }
.hotel-card .hotel-datos { font-size: 0.82rem; color: var(--text); margin-bottom: 12px; font-weight: 400; }
.hotel-card p { font-size: 0.88rem; color: var(--text-muted); line-height: 1.8; font-weight: 300; }
.hotel-galeria { height: 260px; border-radius: 0; }
.hoteles-grid.una-sola .hotel-galeria { height: 340px; }
.hotel-ficha { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px 20px; margin-top: 22px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.07); }
.hotel-ficha li { display: flex; flex-direction: column; gap: 3px; }
.hotel-ficha li span { font-size: 0.66rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); }
.hotel-ficha li strong { font-size: 0.92rem; color: var(--text); font-weight: 400; }
.hotel-enlace { display: inline-block; margin-top: 20px; font-size: 0.78rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--gold); border-bottom: 1px solid rgba(201,169,110,0.35); padding-bottom: 3px; transition: var(--transition); }
.hotel-enlace:hover { color: var(--gold-light); border-color: var(--gold-light); }

/* ── Qué incluye / qué no ── */
.includes-wrap { background: var(--dark-soft); border-top: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05); }
.includes-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 28px; }
.include-card { background: var(--dark-card); border: 1px solid rgba(255,255,255,0.05); border-radius: var(--radius); padding: 32px 26px; text-align: center; transition: var(--transition); }
.include-card:hover { border-color: rgba(201,169,110,0.2); transform: translateY(-4px); }
.include-card .include-icon { font-size: 1.8rem; margin-bottom: 14px; display: block; }
.include-card p { font-size: 0.9rem; color: var(--text); line-height: 1.7; font-weight: 300; }
.no-incluye { margin-top: 64px; max-width: 780px; margin-left: auto; margin-right: auto; text-align: center; }
.no-incluye h3 { font-family: 'Inter', sans-serif; font-size: 0.78rem; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: var(--text-muted); margin-bottom: 20px; }
.no-incluye ul { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 28px; }
.no-incluye li { font-size: 0.85rem; color: var(--text-muted); font-weight: 300; position: relative; padding-left: 16px; }
.no-incluye li::before { content: '—'; position: absolute; left: 0; color: rgba(201,169,110,0.5); }

/* ── La inversión ── */
.inversion { text-align: center; }
.precio-total { font-family: 'Playfair Display', serif; font-size: clamp(3rem, 9vw, 5.5rem); font-weight: 700; color: var(--gold); line-height: 1; margin: 8px 0 12px; }
.precio-pp { font-size: 0.95rem; color: var(--text); font-weight: 300; letter-spacing: 0.5px; }
.precio-nota { max-width: 620px; margin: 36px auto 0; font-size: 0.88rem; color: var(--text-muted); line-height: 1.9; font-weight: 300; }
.precio-nota strong { color: var(--text); font-weight: 500; }
.precio-legal { max-width: 620px; margin: 20px auto 0; font-size: 0.78rem; color: var(--text-muted); line-height: 1.8; font-weight: 300; opacity: 0.85; }

/* ── Pilares ── */
.pilares-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 28px; }
.pilar { text-align: center; padding: 8px; }
.pilar .include-icon { font-size: 1.7rem; margin-bottom: 14px; display: block; }
.pilar h3 { font-family: 'Inter', sans-serif; font-size: 0.9rem; font-weight: 600; color: var(--white); margin-bottom: 10px; letter-spacing: 0.5px; }
.pilar p { font-size: 0.86rem; color: var(--text-muted); line-height: 1.8; font-weight: 300; }
.resena { text-align: center; margin-top: 56px; font-size: 0.9rem; color: var(--text-muted); font-weight: 300; }
.resena .estrellas { color: var(--gold); letter-spacing: 3px; display: block; margin-bottom: 8px; font-size: 1rem; }

/* ── Decisión ── */
.decision { text-align: center; background: var(--dark-soft); border-top: 1px solid rgba(255,255,255,0.05); }
.decision h2 { font-size: clamp(1.8rem, 3.5vw, 2.5rem); color: var(--white); margin-bottom: 16px; }
.decision p { color: var(--text-muted); font-weight: 300; max-width: 560px; margin: 0 auto 36px; line-height: 1.8; }
.decision-botones { display: flex; flex-wrap: wrap; gap: 16px; justify-content: center; align-items: center; }
.btn-outline { background: transparent; color: var(--white); border: 1px solid rgba(255,255,255,0.25); }
.btn-outline:hover { border-color: var(--gold); color: var(--gold); transform: translateY(-2px); }
.btn-texto { background: none; border: none; color: var(--text-muted); font-family: 'Inter', sans-serif; font-size: 0.8rem; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer; padding: 12px 18px; transition: var(--transition); }
.btn-texto:hover { color: var(--gold); }

/* ── Footer reducido ── */
.ppto-footer { padding: 64px 0 40px; border-top: 1px solid rgba(201,169,110,0.15); text-align: center; }
.ppto-footer img { height: 60px; width: auto; margin: 0 auto 22px; }
.ppto-footer p { font-size: 0.85rem; color: var(--text-muted); font-weight: 300; line-height: 1.9; }
.ppto-footer a { color: var(--gold); }
.ppto-footer a:hover { color: var(--gold-light); }
.ppto-footer .horario { margin-top: 14px; font-size: 0.78rem; opacity: 0.8; }
/* Créditos de las fotos de banco que piden atribución. Discreto, pero está:
   una licencia Creative Commons se cumple o no se usa la foto. */
.ppto-footer .creditos { margin-top: 22px; font-size: 0.68rem; line-height: 1.7; opacity: 0.55; }
.ppto-footer .creditos a { color: inherit; text-decoration: underline; }
.ppto-footer .firma { margin-top: 26px; font-family: 'Playfair Display', serif; font-style: italic; color: var(--text); font-size: 0.95rem; }

/* ── Barra inferior fija en móvil: precio y CTA siempre a la vista.
      Es lo que convierte: el cliente no tiene que buscar el botón. ── */
.barra-movil { display: none; position: fixed; bottom: 0; left: 0; width: 100%; z-index: 900; background: rgba(10,10,10,0.97); backdrop-filter: blur(12px); border-top: 1px solid rgba(201,169,110,0.25); padding: 12px 16px; align-items: center; justify-content: space-between; gap: 12px; }
.barra-movil .barra-precio { font-family: 'Playfair Display', serif; font-size: 1.35rem; color: var(--gold); line-height: 1.2; }
.barra-movil .barra-precio small { display: block; font-family: 'Inter', sans-serif; font-size: 0.62rem; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-muted); }
.barra-movil .btn { padding: 13px 22px; font-size: 0.75rem; }

/* ── Modal de confirmación ── */
.modal-fondo { position: fixed; inset: 0; z-index: 1200; background: rgba(0,0,0,0.82); backdrop-filter: blur(6px); display: none; align-items: center; justify-content: center; padding: 24px; }
.modal-fondo.abierto { display: flex; }
.modal { background: var(--dark-card); border: 1px solid rgba(201,169,110,0.25); border-radius: var(--radius); max-width: 520px; width: 100%; padding: 44px 36px; text-align: center; }
.modal h2 { font-size: 1.7rem; color: var(--white); margin-bottom: 16px; }
.modal p { font-size: 0.92rem; color: var(--text-muted); line-height: 1.9; font-weight: 300; margin-bottom: 28px; }
.modal .modal-botones { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
.modal .estrellas { color: var(--gold); font-size: 1.6rem; letter-spacing: 6px; display: block; margin-bottom: 18px; }

/* ── Página de aviso (no encontrado / caducado) ── */
.aviso { min-height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 120px 24px 80px; }
.aviso-caja { max-width: 560px; }
.aviso-caja img { height: 64px; width: auto; margin: 0 auto 32px; }
.aviso-caja h1 { font-size: clamp(1.8rem, 4vw, 2.6rem); color: var(--white); margin-bottom: 18px; }
.aviso-caja p { color: var(--text-muted); font-weight: 300; line-height: 1.9; margin-bottom: 32px; }

@media (max-width: 1024px) { .includes-grid { grid-template-columns: repeat(2, 1fr); } }

@media (max-width: 768px) {
  section { padding: 72px 0; }
  .dest-hero { background-attachment: scroll; }
  .route-line { display: none; }
  .itinerary-block { grid-template-columns: 1fr; gap: 26px; }
  .itinerary-block.reverse .itinerary-carousel, .itinerary-block.reverse .itinerary-content { order: unset; }
  .itinerary-carousel { height: 280px; }
  .includes-grid { grid-template-columns: 1fr; }
  .ppto-top img { height: 36px; }
  .ppto-ref { font-size: 0.62rem; letter-spacing: 1px; }
  /* En 375px el nombre del cliente no cabe junto al logo y se partía en tres
     líneas, desbordando la barra. El cliente ya sabe que es para él: en móvil
     basta con la referencia. */
  .ppto-para { display: none; }
  .barra-movil { display: flex; }
  body { padding-bottom: 76px; }
  .decision-botones .btn { width: 100%; justify-content: center; }
}

/* ── Impresión: el cliente se lleva un PDF legible con Ctrl+P, sin librerías.
      Fondo blanco y tinta oscura, pero el dorado se queda en los acentos y en
      el precio: es lo que hace que el PDF siga siendo de Horizonte. ── */
@media print {
  @page { margin: 14mm; }
  html, body { background: #fff !important; color: #1a1a1a !important; }
  .ppto-top, .barra-movil, .modal-fondo, .decision-botones, .btn, .btn-texto,
  .carousel-controls, .whatsapp-float, .route-line, #avisoCookies { display: none !important; }
  .reveal { opacity: 1 !important; transform: none !important; }
  /* El PDF tiene que caber en 4 páginas: en pantalla el aire es elegante, en
     papel es una hoja más que nadie lee. Se comprimen rejillas y cuerpos de
     texto, no se quita contenido. */
  section { padding: 10px 0 !important; }
  .section-header { margin-bottom: 10px !important; }
  .section-title { font-size: 15pt !important; }
  .divider { margin: 8px auto !important; }
  .dest-hero { min-height: auto !important; padding: 0 0 10px !important; background: none !important; color: #1a1a1a !important; display: block; text-align: left; border-bottom: 2px solid #c9a96e; }
  .dest-hero::after { display: none !important; }
  .dest-hero-content { max-width: none; padding: 0; }
  /* Color en papel por ELEMENTO, no clase a clase: enumerando clases es fácil
     dejarse una y que un título blanco acabe invisible sobre blanco. Las reglas
     doradas de abajo ganan por especificidad donde toca. */
  * { text-shadow: none !important; }
  h1, h2, h3, h4 { color: #111 !important; }
  p, li, span, small, strong, b, td, div { color: #333 !important; }
  .section-label, .hotel-meta, .precio-total, .estrellas, .ppto-footer a,
  .itinerary-content .noche-en span { color: #a8863f !important; }
  .cabecera-print span { color: #666 !important; }
  /* El footer es un <footer> y /styles.css estiliza ese elemento con fondo
     oscuro: sin esto, en papel salía tinta gris sobre banda negra. */
  .includes-wrap, .decision, .hotel-card, .include-card, .modal,
  .ppto-footer, .itinerary-carousel { background: #fff !important; border-color: #ddd !important; }
  .itinerary-block, .hotel-card, .include-card, .pilar, .inversion { break-inside: avoid; page-break-inside: avoid; }
  .itinerary-block { grid-template-columns: 1fr 1.6fr !important; gap: 14px !important; margin-bottom: 12px !important; }
  .itinerary-carousel { height: 118px !important; }
  .itinerary-carousel .carousel-slide { position: relative; opacity: 0; }
  .itinerary-carousel .carousel-slide.active { opacity: 1; }
  .itinerary-carousel .carousel-slide:not(.active) { display: none; }
  .itinerary-content h3 { font-size: 12.5pt !important; margin-bottom: 6px !important; }
  .itinerary-content p { font-size: 8.5pt !important; line-height: 1.5 !important; }
  .itinerary-content .noche-en { margin-top: 8px !important; font-size: 8pt !important; }
  .dest-intro-text { font-size: 9pt !important; line-height: 1.6 !important; }
  .ppto-intro { padding: 14px 0 6px !important; }

  .hoteles-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
  .hotel-cuerpo { padding: 12px 14px !important; }
  .hotel-galeria { height: 95px !important; }
  .hotel-ficha { margin-top: 10px !important; padding-top: 8px !important; gap: 4px 12px !important; }
  .hotel-ficha li span { font-size: 6.5pt !important; }
  .hotel-ficha li strong { font-size: 8pt !important; }
  .hotel-enlace { display: none !important; }
  .ppto-footer .creditos { font-size: 6pt !important; opacity: 1 !important; margin-top: 10px !important; }
  .hotel-card h3 { font-size: 11.5pt !important; }
  .hotel-card .hotel-meta { font-size: 7pt !important; margin-bottom: 6px !important; }
  .hotel-card .hotel-datos { font-size: 8pt !important; margin-bottom: 6px !important; }
  .hotel-card p { font-size: 8pt !important; line-height: 1.5 !important; }

  .includes-grid, .pilares-grid { grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; }
  .include-card, .pilar { padding: 10px 8px !important; }
  .include-card .include-icon, .pilar .include-icon { font-size: 11pt !important; margin-bottom: 4px !important; }
  .include-card p, .pilar p { font-size: 7.5pt !important; line-height: 1.4 !important; }
  .pilar h3 { font-size: 8.5pt !important; margin-bottom: 5px !important; }
  .no-incluye { margin-top: 16px !important; }
  .no-incluye h3 { font-size: 7pt !important; margin-bottom: 8px !important; }
  .no-incluye li { font-size: 7.5pt !important; }
  .resena { margin-top: 16px !important; font-size: 8pt !important; }

  .precio-total { font-size: 30pt !important; margin: 4px 0 6px !important; }
  .precio-pp { font-size: 9pt !important; }
  .precio-nota { margin-top: 14px !important; font-size: 8.5pt !important; line-height: 1.6 !important; }
  .precio-legal { margin-top: 10px !important; font-size: 7.5pt !important; line-height: 1.5 !important; }

  .decision h2 { font-size: 14pt !important; margin-bottom: 8px !important; }
  .decision p { font-size: 8.5pt !important; margin-bottom: 0 !important; }
  .ppto-footer { padding: 16px 0 6px !important; }
  .ppto-footer img { height: 40px !important; margin-bottom: 10px !important; }
  .ppto-footer p { font-size: 8pt !important; line-height: 1.6 !important; }
  .ppto-footer .firma { margin-top: 10px !important; font-size: 9pt !important; }
  .cabecera-print { display: block !important; }
  a[href]::after { content: none !important; }
}
.cabecera-print { display: none; }
@media print { .cabecera-print { display: flex !important; align-items: center; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 8px; margin-bottom: 14px; }
  .cabecera-print img { height: 34px; width: auto; }
  .cabecera-print span { font-size: 9pt; color: #666; letter-spacing: 1px; } }

@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1 !important; transform: none !important; transition: none !important; }
  * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
`;

/* ═══════════════════════ la página del presupuesto ═══════════════════════ */

function paginaPresupuesto(p) {
  const hero = imagen(p.hero_imagen, HERO_FALLBACK);
  const nombre = String(p.cliente_nombre || '').trim();
  const nombreCorto = nombre.split(/\s+/)[0] || '';
  const destino = String(p.destino || '').trim();
  const its = lista(p.itinerario);
  const hoteles = lista(p.alojamientos);
  const incluye = lista(p.incluye);
  const noIncluye = lista(p.no_incluye);

  // Línea de contexto del hero: fechas · noches · viajeros.
  const metaHero = [
    (p.fecha_salida && p.fecha_regreso)
      ? `${fechaCorta(p.fecha_salida)} – ${fechaCorta(p.fecha_regreso)} ${String(p.fecha_regreso).slice(0, 4)}`
      : (p.fecha_salida ? fechaLarga(p.fecha_salida) : ''),
    p.noches ? `${p.noches} ${Number(p.noches) === 1 ? 'noche' : 'noches'}` : '',
    textoViajeros(p.viajeros),
  ].filter(Boolean).join(' · ');

  const mensajeWa = `Hola Endeis, te escribo por el presupuesto ${p.id} ${conPrep('de', destino)}. Me gustaría comentar…`;
  const urlWa = `https://wa.me/${TEL_WA}?text=${encodeURIComponent(mensajeWa)}`;

  const cuerpo = `
<header class="ppto-top">
  <div class="container">
    <a href="/" aria-label="Horizonte Exclusivo"><img src="/images/logo-trimmed.png" alt="Horizonte Exclusivo" width="160" height="44"></a>
    <p class="ppto-ref"><strong>Presupuesto ${esc(p.id)}</strong>${nombre ? `<span class="ppto-para">Preparado para ${esc(nombre)}</span>` : ''}</p>
  </div>
</header>

<main>
  <div class="container cabecera-print" aria-hidden="true">
    <img src="/images/logo-trimmed.png" alt="Horizonte Exclusivo">
    <span>Presupuesto ${esc(p.id)}${nombre ? ` · ${esc(nombre)}` : ''}</span>
  </div>

  <section class="dest-hero" style="background-image:url('${esc(hero)}')">
    <div class="dest-hero-content">
      ${p.region ? `<span class="section-label">${esc(p.region)}</span>` : ''}
      <h1>${esc(p.titulo || destino)}</h1>
      ${metaHero ? `<p class="dest-duration">${esc(metaHero)}</p>` : ''}
    </div>
  </section>

  <section class="ppto-intro">
    <div class="container">
      ${p.subtitulo ? `<p class="dest-intro-text reveal"><strong style="color:var(--white);font-weight:400">${esc(p.subtitulo)}</strong></p>` : ''}
      ${p.resumen ? `<p class="dest-intro-text reveal">${esc(p.resumen)}</p>` : ''}
    </div>
  </section>

  ${its.length ? bloqueItinerario(its) : ''}
  ${hoteles.length ? bloqueHoteles(hoteles) : ''}
  ${incluye.length ? bloqueIncluye(incluye, noIncluye) : ''}

  <section class="inversion" id="inversion">
    <div class="container">
      <div class="section-header reveal">
        <span class="section-label">La inversión</span>
        <h2 class="section-title">Tu viaje${destino ? ` ${esc(conPrep('a', destino))}` : ''}</h2>
        <div class="divider" aria-hidden="true"></div>
      </div>
      <div class="reveal">
        <p class="precio-total">${esc(euros(p.precio_total, p.moneda))}</p>
        ${p.precio_por_persona ? `<p class="precio-pp">${esc(euros(p.precio_por_persona, p.moneda))} por persona</p>` : ''}
        ${p.condiciones_pago ? `<p class="precio-nota"><strong>Cómo se paga.</strong> ${esc(p.condiciones_pago)}</p>` : ''}
        ${p.notas_cliente ? `<p class="precio-nota">${esc(p.notas_cliente)}</p>` : ''}
        <p class="precio-legal">${p.valido_hasta ? `Propuesta válida hasta el ${esc(fechaLarga(p.valido_hasta))}. ` : ''}Los precios están sujetos a disponibilidad y a las variaciones del mercado hasta el momento de la reserva. En cuanto nos digas que sí, bloqueamos lo que se pueda bloquear y te confirmamos todo por escrito.</p>
      </div>
    </div>
  </section>

  ${bloquePilares()}

  <section class="decision" id="decision">
    <div class="container">
      <h2 class="reveal">${nombreCorto ? `${esc(nombreCorto)}, ¿lo hacemos realidad?` : '¿Lo hacemos realidad?'}</h2>
      <p class="reveal">Dinos que sí y me pongo con ello hoy mismo. Si prefieres cambiar algo antes —una noche más, otro hotel, otro ritmo—, escríbeme y lo ajustamos: para eso está hecho a medida.</p>
      <div class="decision-botones reveal">
        <button type="button" class="btn btn-primary" id="btnReservar">Reservar mi viaje &#10230;</button>
        <a class="btn btn-outline" href="${esc(urlWa)}" target="_blank" rel="noopener" id="btnWhatsapp">Hablar por WhatsApp</a>
        <button type="button" class="btn-texto" id="btnPdf">Descargar PDF</button>
      </div>
    </div>
  </section>
</main>

<footer class="ppto-footer">
  <div class="container">
    <img src="/images/logo-trimmed.png" alt="Horizonte Exclusivo" width="200" height="60">
    <p>
      Carrer Major, 37 · 08750 Molins de Rei (Barcelona)<br>
      <a href="tel:${esc(TEL.replace(/\s/g, ''))}">${esc(TEL)}</a> · <a href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a><br>
      <a href="https://www.instagram.com/viajeshorizonteexclusivo/" target="_blank" rel="noopener">@viajeshorizonteexclusivo</a>
    </p>
    <p class="horario">Lunes, miércoles, jueves y viernes de 9:30 a 13:30 y de 16:00 a 19:00 · Martes de 9:30 a 13:30</p>
    <p class="firma">Más que viajar, vivir el mundo</p>
    ${bloqueCreditos(p.creditos)}
  </div>
</footer>

<div class="barra-movil" id="barraMovil">
  <p class="barra-precio"><small>Tu viaje</small>${esc(euros(p.precio_total, p.moneda))}</p>
  <button type="button" class="btn btn-primary" id="btnReservarMovil">Reservar &#10230;</button>
</div>

<div class="modal-fondo" id="modalFondo" role="dialog" aria-modal="true" aria-labelledby="modalTitulo" aria-hidden="true">
  <div class="modal">
    <div id="modalPaso1">
      <h2 id="modalTitulo">¿Confirmamos${destino ? ` ${esc(destino)}` : ''}?</h2>
      <p>Vas a confirmar el diseño de tu viaje${destino ? ` ${esc(conPrep('a', destino))}` : ''}. Endeis te escribirá hoy mismo para los siguientes pasos. Todavía no se te cobra nada.</p>
      <div class="modal-botones">
        <button type="button" class="btn btn-primary" id="btnConfirmar">Sí, adelante &#10230;</button>
        <button type="button" class="btn btn-outline" id="btnCancelar">Ahora no</button>
      </div>
    </div>
    <div id="modalPaso2" hidden>
      <span class="estrellas" aria-hidden="true">&#10022;</span>
      <h2>Tu viaje${destino ? ` ${esc(conPrep('a', destino))}` : ''} está en marcha</h2>
      <p>Gracias por la confianza${nombreCorto ? `, ${esc(nombreCorto)}` : ''}. Endeis te escribe hoy mismo para concretar fechas y empezar a reservar. A partir de aquí, no tienes que preocuparte de nada más.</p>
      <div class="modal-botones">
        <a class="btn btn-primary" href="${esc(urlWa)}" target="_blank" rel="noopener">Escribir a Endeis</a>
        <button type="button" class="btn btn-outline" id="btnCerrar2">Cerrar</button>
      </div>
    </div>
  </div>
</div>

<script>${JS_PAGINA}</script>
<script>window.__PPTO_ID=${JSON.stringify(p.id)};</script>
`;

  return documento({
    titulo: `Tu viaje${destino ? ` ${conPrep('a', destino)}` : ''} · Horizonte Exclusivo`,
    cuerpo,
    heroImg: hero,
  });
}

function bloqueItinerario(its) {
  const bloques = its.map((d, i) => {
    const imgs = (Array.isArray(d.imagenes) && d.imagenes.length ? d.imagenes : [d.imagen])
      .map(x => imagen(x, ''))
      .filter(Boolean);
    const slides = imgs.length ? imgs : [HERO_FALLBACK];
    const etiqueta = d.dia == null || d.dia === '' ? `Día ${i + 1}`
      : (/^d[ií]a/i.test(String(d.dia)) ? String(d.dia) : `Día ${d.dia}`);
    return `
      <article class="itinerary-block${i % 2 ? ' reverse' : ''} reveal">
        <div class="itinerary-carousel">
          ${slides.map((src, j) => `<div class="carousel-slide${j ? '' : ' active'}"><img src="${esc(src)}" alt="${esc(d.titulo || etiqueta)}" width="800" height="533" loading="lazy" decoding="async"></div>`).join('')}
          <div class="carousel-controls">
            <button class="carousel-btn carousel-prev" type="button" aria-label="Imagen anterior de ${esc(d.titulo || etiqueta)}">&#8249;</button>
            <div class="carousel-dots">
              ${slides.map((_, j) => `<button class="carousel-dot${j ? '' : ' active'}" type="button" aria-label="Imagen ${j + 1} de ${slides.length}"></button>`).join('')}
            </div>
            <button class="carousel-btn carousel-next" type="button" aria-label="Imagen siguiente de ${esc(d.titulo || etiqueta)}">&#8250;</button>
          </div>
        </div>
        <div class="itinerary-content">
          <span class="section-label">${esc(etiqueta)}</span>
          <h3>${esc(d.titulo || '')}</h3>
          ${d.texto ? `<p>${esc(d.texto)}</p>` : ''}
          ${d.alojamiento ? `<p class="noche-en"><span>&#10022;</span> Noche en ${esc(d.alojamiento)}</p>` : ''}
        </div>
      </article>`;
  }).join('');

  return `
  <section id="itinerario">
    <div class="container">
      <div class="section-header reveal">
        <span class="section-label">Día a día</span>
        <h2 class="section-title">Cómo será tu viaje</h2>
        <div class="divider" aria-hidden="true"></div>
      </div>
      ${bloques}
    </div>
  </section>`;
}

// Cuando el alojamiento ES el viaje —un barco, un tren, un lodge— el cliente
// quiere verlo, no leerlo. De ahí la galería y la ficha de datos: es la parte
// de la propuesta que más preguntas se ahorra por WhatsApp.
function esNavegable(h) {
  return /barco|boat|velero|catamar|p[eé]nich|crucero|goleta|dahabiya/i
    .test([h.nombre, h.categoria, h.regimen].filter(Boolean).join(' '));
}

function bloqueHoteles(hoteles) {
  const cards = hoteles.map((h, i) => {
    const datos = [
      h.ciudad,
      h.noches ? `${h.noches} ${Number(h.noches) === 1 ? 'noche' : 'noches'}` : '',
      h.regimen,
    ].filter(Boolean).join(' · ');

    const fotos = lista(h.galeria).map(x => imagen(x, '')).filter(Boolean).slice(0, 6);
    const ficha = lista(h.ficha)
      .filter(f => f && f.etiqueta && f.valor)
      .slice(0, 10);
    const enlace = enlaceSeguro(h.enlace);
    const nombre = h.nombre || (esNavegable(h) ? 'el barco' : 'el alojamiento');

    return `
      <article class="hotel-card reveal">
        ${fotos.length ? galeriaAlojamiento(fotos, nombre) : ''}
        <div class="hotel-cuerpo">
          <h3>${esc(h.nombre || '')}</h3>
          ${h.categoria ? `<p class="hotel-meta">${esc(h.categoria)}</p>` : ''}
          ${datos ? `<p class="hotel-datos">${esc(datos)}</p>` : ''}
          ${h.nota ? `<p>${esc(h.nota)}</p>` : ''}
          ${ficha.length ? `
          <ul class="hotel-ficha">
            ${ficha.map(f => `<li><span>${esc(f.etiqueta)}</span><strong>${esc(f.valor)}</strong></li>`).join('')}
          </ul>` : ''}
          ${enlace ? `<a class="hotel-enlace" href="${esc(enlace)}" target="_blank" rel="noopener noreferrer nofollow">${esNavegable(h) ? 'Ver el barco por dentro' : 'Ver el alojamiento'} &#10230;</a>` : ''}
        </div>
      </article>`;
  }).join('');

  return `
  <section id="alojamientos">
    <div class="container">
      <div class="section-header reveal">
        <span class="section-label">Dónde dormirás</span>
        <h2 class="section-title">${hoteles.length === 1 ? 'Tu casa durante el viaje' : 'Las casas que hemos elegido'}</h2>
        <div class="divider" aria-hidden="true"></div>
      </div>
      <div class="hoteles-grid${hoteles.length === 1 ? ' una-sola' : ''}">${cards}</div>
    </div>
  </section>`;
}

// Las fotos de banco con licencia cc0 o de dominio público no piden nada. Las
// que sí piden atribución (CC BY, CC BY-SA) la llevan aquí: api/ppto-medios.js
// solo guarda crédito de esas, así que si la lista está vacía es que ninguna
// foto lo necesitaba, no que se nos haya olvidado.
function bloqueCreditos(creditos) {
  const cs = lista(creditos)
    .filter(c => c && c.titulo)
    .slice(0, 24)
    .map(c => {
      const url = enlaceSeguro(c.licencia_url);
      const lic = esc(c.licencia || 'CC');
      return `${esc(c.titulo)}, ${esc(c.autor || 'autor desconocido')} (${url ? `<a href="${esc(url)}" target="_blank" rel="noopener nofollow">${lic}</a>` : lic})`;
    });
  return cs.length ? `<p class="creditos">Fotografías con licencia libre: ${cs.join(' · ')}</p>` : '';
}

// Reutiliza la clase .itinerary-carousel a propósito: así el mismo JS que mueve
// los carruseles del itinerario mueve también este, sin una línea de más.
function galeriaAlojamiento(fotos, nombre) {
  const controles = fotos.length > 1 ? `
          <div class="carousel-controls">
            <button class="carousel-btn carousel-prev" type="button" aria-label="Foto anterior de ${esc(nombre)}">&#8249;</button>
            <div class="carousel-dots">
              ${fotos.map((_, j) => `<button class="carousel-dot${j ? '' : ' active'}" type="button" aria-label="Foto ${j + 1} de ${fotos.length}"></button>`).join('')}
            </div>
            <button class="carousel-btn carousel-next" type="button" aria-label="Foto siguiente de ${esc(nombre)}">&#8250;</button>
          </div>` : '';

  return `
        <div class="itinerary-carousel hotel-galeria">
          ${fotos.map((src, j) => `<div class="carousel-slide${j ? '' : ' active'}"><img src="${esc(src)}" alt="${esc(nombre)}" width="800" height="533" loading="lazy" decoding="async"></div>`).join('')}
          ${controles}
        </div>`;
}

// Iconos por palabra clave: el presupuesto del mayorista no trae iconos, así
// que se deducen del propio texto. Si no encaja ninguno, una estrella dorada.
// El ORDEN importa: gana la primera que encaja. Lo específico va antes que lo
// genérico — "el barco durante las siete noches" es un barco, no un hotel, y
// con la regla de "noche" por delante le tocaba el icono equivocado.
const ICONOS = [
  [/vuelo|avi[oó]n|a[eé]re/i, '&#9992;&#65039;'],
  [/barco|crucero|navega|velero|amarr|embarc|n[aá]utic/i, '&#128676;'],
  [/cabina|camarote|a bordo|litera/i, '&#128719;&#65039;'],
  [/hotel|alojamiento|noche|resort|ryokan|lodge|riad/i, '&#127976;'],
  [/traslado|transfer|coche|conductor|chofer/i, '&#128663;'],
  [/tren|ferrocarril|jr pass/i, '&#128645;'],
  [/gu[ií]a|visita|excursi[oó]n|experiencia|tour/i, '&#129517;'],
  [/desayuno|comida|cena|pensi[oó]n|gastron/i, '&#127869;&#65039;'],
  [/seguro|asisten|cobertura/i, '&#128737;&#65039;'],
  [/entrada|ticket|acceso/i, '&#127903;&#65039;'],
  [/documenta|visado|tr[aá]mite/i, '&#128220;'],
];

function iconoPara(texto) {
  for (const [re, ico] of ICONOS) if (re.test(texto)) return ico;
  return '&#10022;';
}

function bloqueIncluye(incluye, noIncluye) {
  const cards = incluye.map(t => `
      <div class="include-card reveal">
        <span class="include-icon" aria-hidden="true">${iconoPara(String(t))}</span>
        <p>${esc(t)}</p>
      </div>`).join('');

  return `
  <section class="includes-wrap" id="incluye">
    <div class="container">
      <div class="section-header reveal">
        <span class="section-label">Sin sorpresas</span>
        <h2 class="section-title">Qué incluye tu viaje</h2>
        <div class="divider" aria-hidden="true"></div>
      </div>
      <div class="includes-grid">${cards}</div>
      ${noIncluye.length ? `
      <div class="no-incluye reveal">
        <h3>Y qué no incluye</h3>
        <ul>${noIncluye.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      </div>` : ''}
    </div>
  </section>`;
}

function bloquePilares() {
  const pilares = [
    ['&#9998;', 'Diseñado solo para ti', 'Este itinerario no existía antes de esta conversación. No es un paquete con tu nombre encima: está pensado desde cero para vuestro ritmo, vuestras fechas y lo que os apetece de verdad.'],
    ['&#128100;', 'La misma persona, de principio a fin', 'Hablas siempre con Endeis. No hay centralita, ni un departamento distinto para cada cosa, ni tener que volver a explicar tu viaje.'],
    ['&#129517;', 'Todo coordinado', 'Vuelos, hoteles, traslados, guías y experiencias encajados en el orden correcto. Tú recibes un plan cerrado, no una lista de cosas por resolver.'],
    ['&#128241;', 'Acompañamiento durante el viaje', 'Si algo se tuerce mientras estás fuera —un vuelo que cambia, un plan que se cae—, tienes a alguien al otro lado que lo resuelve. Ese es el lujo de verdad: no tener que pensar en nada más.'],
  ];
  return `
  <section id="por-que">
    <div class="container">
      <div class="section-header reveal">
        <span class="section-label">Por qué con nosotros</span>
        <h2 class="section-title">Lo que va incluido y no se ve</h2>
        <div class="divider" aria-hidden="true"></div>
      </div>
      <div class="pilares-grid">
        ${pilares.map(([i, t, d]) => `
        <div class="pilar reveal">
          <span class="include-icon" aria-hidden="true">${i}</span>
          <h3>${t}</h3>
          <p>${d}</p>
        </div>`).join('')}
      </div>
      <p class="resena reveal">
        <span class="estrellas" aria-hidden="true">&#9733; &#9733; &#9733; &#9733; &#9733;</span>
        Valoración de 5,0 sobre 5 en Google. Todas nuestras reseñas son de cinco estrellas.
      </p>
    </div>
  </section>`;
}

/* ═══════════════════════ JS de la página ═══════════════════════
   Va embebido y NO se carga /scripts.js: ese script da por hecho que existe el
   navbar completo (hace addEventListener sobre #hamburger sin comprobar si es
   null) y aquí no hay navbar, así que reventaría en la primera línea y se
   llevaría por delante el resto del JS. El contrato de .reveal se reimplementa
   igual que allí para que la página se sienta idéntica al resto del sitio. */
const JS_PAGINA = `
(function () {
  var ID = window.__PPTO_ID || '';

  // Scroll reveal (mismo comportamiento escalonado que /scripts.js)
  var obs = new IntersectionObserver(function (entries) {
    var lote = 0;
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var el = e.target;
      el.style.transitionDelay = (lote++ * 80) + 'ms';
      el.classList.add('visible');
      el.addEventListener('transitionend', function () { el.style.transitionDelay = ''; }, { once: true });
      obs.unobserve(el);
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(function (el) { obs.observe(el); });

  // Timeline SVG punteada entre los bloques del itinerario (oculta en móvil)
  function dibujarRuta() {
    var cont = document.querySelector('#itinerario .container');
    if (!cont) return;
    var previa = cont.querySelector('.route-line');
    if (previa) previa.remove();
    var bloques = cont.querySelectorAll('.itinerary-block');
    if (window.innerWidth <= 768 || bloques.length < 2) return;

    cont.style.position = 'relative';
    var w = cont.offsetWidth, h = cont.scrollHeight, cx = w / 2;
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.classList.add('route-line');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';

    var pts = [];
    bloques.forEach(function (b) { pts.push({ top: b.offsetTop, bottom: b.offsetTop + b.offsetHeight, cy: b.offsetTop + b.offsetHeight / 2 }); });

    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M ' + cx + ' ' + pts[0].top + ' L ' + cx + ' ' + pts[pts.length - 1].bottom);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'rgba(255,255,255,0.10)');
    path.setAttribute('stroke-width', '1.5');
    path.setAttribute('stroke-dasharray', '6 4');
    svg.appendChild(path);

    pts.forEach(function (b) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', cx); c.setAttribute('cy', b.cy); c.setAttribute('r', '5');
      c.setAttribute('fill', '#0a0a0a');
      c.setAttribute('stroke', 'rgba(201,169,110,0.4)');
      c.setAttribute('stroke-width', '1.5');
      svg.appendChild(c);
    });
    cont.prepend(svg);
  }
  window.addEventListener('load', dibujarRuta);
  window.addEventListener('resize', dibujarRuta);

  // Carruseles del itinerario
  document.querySelectorAll('.itinerary-carousel').forEach(function (car) {
    var slides = car.querySelectorAll('.carousel-slide');
    var dots = car.querySelectorAll('.carousel-dot');
    var prev = car.querySelector('.carousel-prev');
    var next = car.querySelector('.carousel-next');
    var i = 0;
    function ir(n) {
      slides[i].classList.remove('active'); dots[i].classList.remove('active');
      i = (n + slides.length) % slides.length;
      slides[i].classList.add('active'); dots[i].classList.add('active');
    }
    if (prev) prev.addEventListener('click', function () { ir(i - 1); });
    if (next) next.addEventListener('click', function () { ir(i + 1); });
    dots.forEach(function (d, j) { d.addEventListener('click', function () { ir(j); }); });
    var x0 = null;
    car.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    car.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var d = x0 - e.changedTouches[0].clientX;
      if (Math.abs(d) > 50) ir(i + (d > 0 ? 1 : -1));
      x0 = null;
    });
  });

  // Telemetría: sin bloquear ni molestar. Saber si el cliente ha abierto el
  // presupuesto (y cuántas veces) es información de venta muy valiosa.
  function evento(tipo, extra) {
    if (!ID) return Promise.resolve();
    var payload = { id: ID, tipo: tipo };
    if (extra) payload.meta = extra;
    return fetch('/api/ppto-evento', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(function () {});
  }
  evento('vista', { ancho: window.innerWidth });

  // Modal de confirmación
  var fondo = document.getElementById('modalFondo');
  var paso1 = document.getElementById('modalPaso1');
  var paso2 = document.getElementById('modalPaso2');
  var ultimoFoco = null;

  function abrir() {
    ultimoFoco = document.activeElement;
    fondo.classList.add('abierto');
    fondo.setAttribute('aria-hidden', 'false');
    var f = fondo.querySelector('button, a'); if (f) f.focus();
    document.body.style.overflow = 'hidden';
  }
  function cerrar() {
    fondo.classList.remove('abierto');
    fondo.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (ultimoFoco) ultimoFoco.focus();
  }

  ['btnReservar', 'btnReservarMovil'].forEach(function (id) {
    var b = document.getElementById(id);
    if (b) b.addEventListener('click', abrir);
  });
  var cancelar = document.getElementById('btnCancelar');
  if (cancelar) cancelar.addEventListener('click', cerrar);
  var cerrar2 = document.getElementById('btnCerrar2');
  if (cerrar2) cerrar2.addEventListener('click', cerrar);
  fondo.addEventListener('click', function (e) { if (e.target === fondo) cerrar(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && fondo.classList.contains('abierto')) cerrar();
  });

  var confirmar = document.getElementById('btnConfirmar');
  if (confirmar) confirmar.addEventListener('click', function () {
    confirmar.disabled = true;
    confirmar.textContent = 'Un momento…';
    evento('aceptado').then(function () {
      paso1.hidden = true;
      paso2.hidden = false;
      var f = paso2.querySelector('a, button'); if (f) f.focus();
    });
  });

  var wa = document.getElementById('btnWhatsapp');
  if (wa) wa.addEventListener('click', function () { evento('whatsapp'); });

  var pdf = document.getElementById('btnPdf');
  if (pdf) pdf.addEventListener('click', function () { evento('pdf'); window.print(); });
})();
`;

/* ═══════════════════════ páginas de estado ═══════════════════════ */

function marcoAviso(titulo, texto, cta) {
  return documento({
    titulo: `${titulo} · Horizonte Exclusivo`,
    cuerpo: `
<main class="aviso">
  <div class="aviso-caja">
    <img src="/images/logo-trimmed.png" alt="Horizonte Exclusivo" width="213" height="64">
    <h1>${esc(titulo)}</h1>
    <p>${texto}</p>
    ${cta}
  </div>
</main>`,
  });
}

function botonesContacto(mensaje) {
  const wa = `https://wa.me/${TEL_WA}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ''}`;
  return `<div class="decision-botones">
      <a class="btn btn-primary" href="${esc(wa)}" target="_blank" rel="noopener">Escribir por WhatsApp</a>
      <a class="btn btn-outline" href="mailto:${esc(EMAIL)}">Enviar un email</a>
    </div>`;
}

// Un enlace equivocado no puede acabar en un 404 de Vercel: el cliente estaba
// esperando SU viaje y lo que ve tiene que seguir siendo de la casa.
function paginaNoEncontrado() {
  return marcoAviso(
    'No encontramos esta propuesta',
    'Puede que el enlace esté incompleto o que la propuesta ya no esté activa. Escríbenos y te la reenviamos en un minuto — la tenemos guardada.',
    botonesContacto('Hola Endeis, he intentado abrir mi presupuesto y el enlace no funciona.')
  );
}

function paginaCaducada(p) {
  const destino = String(p.destino || '').trim();
  return marcoAviso(
    'Esta propuesta ya ha vencido',
    `El itinerario${destino ? ` de tu viaje ${esc(conPrep('a', destino))}` : ''} sigue en pie, pero los precios de vuelos y hoteles se mueven y esta versión se ha quedado atrás. Escríbenos y te preparamos una propuesta actualizada${destino ? ' con el mismo viaje' : ''}.`,
    botonesContacto(`Hola Endeis, mi presupuesto ${p.id}${destino ? ` ${conPrep('de', destino)}` : ''} ha caducado. ¿Me lo puedes actualizar?`)
  );
}

function paginaAviso(titulo, texto) {
  return marcoAviso(titulo, esc(texto), botonesContacto('Hola Endeis, no consigo abrir mi presupuesto.'));
}
