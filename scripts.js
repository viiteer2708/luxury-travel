

/* ===== Carga de Schema =====
   El JSON-LD ahora se "hornea" de forma estática en cada página con
   `node build-schema.js`. Ya NO se inyecta schema-auto.js en cliente:
   evita el schema DUPLICADO en las 147 páginas internas y el override
   con assets rotos (logo.png 404) en la home. schema-auto.js se conserva
   únicamente como fuente de la lógica para build-schema.js. */

/* ===== Configuración de medición =====
   Rellena estos IDs y la analítica se activará automáticamente DESPUÉS
   del consentimiento del usuario. Mientras tengan los valores de ejemplo
   NO se carga absolutamente nada (la web funciona igual). */
window.HE_CONFIG = {
    GA4_ID: 'G-QT9YWGGQ7M',            // ← ID de Google Analytics 4 (flujo "Horizonte")
    META_PIXEL_ID: '2029103258000507',  // ← ID del píxel de Meta (Horizonte Exclusivo)
    LEAD_WEBHOOK: 'https://hook.eu2.make.com/REEMPLAZAR_LEAD_MAGNET' // ← webhook de Make para la guía
};

/* ===== Horizonte Exclusivo — Scripts Globales ===== */

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
    const wasScrolled = navbar.classList.contains('scrolled');
    const isScrolled = window.scrollY > 60;
    navbar.classList.toggle('scrolled', isScrolled);
    if (wasScrolled !== isScrolled) checkNavOverflow();
});

// Mobile menu toggle
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    navbar.classList.toggle('menu-open');
});

// Close menu on link click
navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
        navLinks.classList.remove('active');
        navbar.classList.remove('menu-open');
    });
});

// Auto-collapse navbar when items don't fit
function checkNavOverflow() {
    const navbar = document.getElementById('navbar');
    const navLinks = document.getElementById('navLinks');
    const container = navbar.querySelector('.container');

    navLinks.classList.remove('active');
    navbar.classList.remove('collapsed');
    navbar.classList.remove('menu-open');
    navLinks.style.flexShrink = '0';
    void navbar.offsetHeight;

    var bp = 1280;
    if (window.innerWidth <= bp || container.scrollWidth > container.clientWidth + 2) {
        navbar.classList.add('collapsed');
    }

    navLinks.style.flexShrink = '';
}

checkNavOverflow();
window.addEventListener('resize', checkNavOverflow);

// Touch-friendly dropdown (primer tap abre, segundo tap navega)
const dropdownParent = document.querySelector('.nav-links li .dropdown')?.parentElement;
if (dropdownParent) {
    const parentLink = dropdownParent.querySelector(':scope > a');
    parentLink.addEventListener('click', function(e) {
        if (navbar.classList.contains('collapsed')) return;
        if (!dropdownParent.classList.contains('dropdown-open')) {
            e.preventDefault();
            dropdownParent.classList.add('dropdown-open');
        }
    });
    document.addEventListener('click', function(e) {
        if (!dropdownParent.contains(e.target)) {
            dropdownParent.classList.remove('dropdown-open');
        }
    });
}

// Scroll reveal
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, { threshold: 0.15 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ===== Medición con consentimiento (RGPD) =====
// La analítica SOLO se carga tras "Aceptar". Sin consentimiento no se
// instala ninguna cookie de terceros (modelo de consentimiento previo, AEPD).
function heLoadAnalytics() {
    if (window.__heAnalyticsLoaded) return;
    var cfg = window.HE_CONFIG || {};
    // Google Analytics 4
    if (cfg.GA4_ID && cfg.GA4_ID.indexOf('G-') === 0 && cfg.GA4_ID !== 'G-XXXXXXXXXX') {
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + cfg.GA4_ID;
        document.head.appendChild(s);
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { dataLayer.push(arguments); };
        gtag('js', new Date());
        gtag('config', cfg.GA4_ID);
    }
    // Meta Pixel
    if (cfg.META_PIXEL_ID && cfg.META_PIXEL_ID !== 'XXXXXXXXXXXXXXX') {
        !function (f, b, e, v, n, t, s) {
            if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments) };
            if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
            t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
        }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', cfg.META_PIXEL_ID); fbq('track', 'PageView');
    }
    window.__heAnalyticsLoaded = true;
}

// Helper global para registrar conversiones (formulario, WhatsApp, guía)
window.heTrack = function (name, params, fbEvent) {
    try { if (window.gtag) gtag('event', name, params || {}); } catch (e) {}
    try { if (window.fbq) fbq('track', fbEvent || 'Lead', params || {}); } catch (e) {}
};

// Click en WhatsApp = evento de contacto
document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('a.whatsapp-float, a[href^="https://wa.me"], a[href*="api.whatsapp.com"]') : null;
    if (t) window.heTrack('whatsapp_click', { method: 'whatsapp' }, 'Contact');
});

// Envío del lead magnet (formulario de captación de email de la guía)
window.enviarLeadMagnet = function (form) {
    var emailInput = form.querySelector('input[type="email"]');
    var email = emailInput ? emailInput.value.trim() : '';
    if (!email) { if (emailInput) emailInput.reportValidity(); return false; }
    var cfg = window.HE_CONFIG || {};
    var datos = { email: email, tipo: 'lead-magnet-guia', fecha: new Date().toISOString(), pagina_origen: window.location.href };
    var box = form.closest('.lead-capture') || document;
    var ok = box.querySelector('.lead-success');
    form.style.display = 'none';
    if (ok) ok.style.display = 'block';
    window.heTrack('subscribe', { content_name: 'guia-gran-viaje' }, 'Lead');
    if (cfg.LEAD_WEBHOOK && cfg.LEAD_WEBHOOK.indexOf('REEMPLAZAR') === -1) {
        fetch(cfg.LEAD_WEBHOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) }).catch(function (err) { console.error('Error envío guía:', err); });
    }
    return false;
};

// ===== Banner de cookies =====
function acceptCookies() {
    localStorage.setItem('cookieConsent', 'accepted');
    var b = document.getElementById('cookieBanner'); if (b) b.style.display = 'none';
    heLoadAnalytics();
}

function rejectCookies() {
    localStorage.setItem('cookieConsent', 'rejected');
    var b = document.getElementById('cookieBanner'); if (b) b.style.display = 'none';
}

(function () {
    var consent = localStorage.getItem('cookieConsent');
    var banner = document.getElementById('cookieBanner');
    if (!consent) { if (banner) banner.style.display = 'block'; }
    else if (consent === 'accepted') { heLoadAnalytics(); }
})();

/* ---------- Agente virtual (chat con IA) ---------- */
/* Carga /chat.js en todas las páginas; el widget se monta solo. */
(function () {
    var s = document.createElement('script');
    s.src = '/chat.js';
    s.defer = true;
    document.body.appendChild(s);
})();
