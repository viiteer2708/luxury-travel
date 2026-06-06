# Guía de activación — 3 quick wins

> Para Victor. No hace falta saber programar: solo seguir los pasos y pegar tres
> datos en un archivo. Lo "difícil" ya está hecho en el código. Lo que falta es
> que tú abras unas cuentas y copies/pegues los identificadores.

---

## 1. Qué está hecho y qué tienes que hacer tú

Ya están **programados y cableados** en la web los tres quick wins. Solo están
"apagados" esperando tus datos:

| Quick win | Qué hace | Estado en el código | Lo que falta (tú) |
|-----------|----------|---------------------|-------------------|
| **1. Medición** | Cuenta visitas y conversiones (formulario, WhatsApp, alta en la guía) con Google Analytics 4 + píxel de Meta. Solo carga **tras aceptar cookies**. | Listo. Espera 2 IDs. | Crear cuenta GA4 y píxel de Meta, y pegar los IDs en `scripts.js`. |
| **2. Instagram** | El icono de Instagram del footer (en las 148 páginas) y el dato de redes sociales del buscador (`schema`) ya apuntan a `instagram.com/viajeshorizonteexclusivo`. | Listo. | Crear la cuenta `@viajeshorizonteexclusivo` para que el enlace lleve a algún sitio real. |
| **3. Lead magnet + email** | Quien deja su email en la home o en las 12 guías del blog recibe automáticamente un correo con el enlace a la guía. | El formulario ya envía el email a un webhook de Make. Falta el "escenario" en Make y la lista de correo. | Montar el flujo en Make + Brevo y pegar la URL del webhook nuevo en `scripts.js`. |

**Dónde se pegan tus datos.** Casi todo se reduce a tocar **tres líneas** del
archivo `scripts.js` (en la raíz del proyecto):

```js
window.HE_CONFIG = {
    GA4_ID: 'G-XXXXXXXXXX',            // ← Quick win 1
    META_PIXEL_ID: 'XXXXXXXXXXXXXXX',  // ← Quick win 1
    LEAD_WEBHOOK: 'https://hook.eu2.make.com/REEMPLAZAR_LEAD_MAGNET' // ← Quick win 3
};
```

> Importante: mientras esas líneas tengan los valores de ejemplo
> (`G-XXXXXXXXXX`, etc.), **no se carga nada** y la web funciona igual. El código
> detecta el valor de ejemplo y no lo activa. Así que no hay prisa ni riesgo: se
> activa solo cuando pegas un valor real.

Checklist global (lo desglosamos abajo):

- [ ] **QW1** — Crear GA4 y copiar el ID `G-XXXXXXXXXX`.
- [ ] **QW1** — Crear el píxel de Meta y copiar el ID numérico.
- [ ] **QW1** — Pegar los dos IDs en `scripts.js`.
- [ ] **QW2** — Crear la cuenta `@viajeshorizonteexclusivo` en Instagram.
- [ ] **QW3** — Crear cuenta y lista en Brevo.
- [ ] **QW3** — Montar el escenario en Make y copiar la URL del webhook.
- [ ] **QW3** — Pegar la URL en `LEAD_WEBHOOK` de `scripts.js`.
- [ ] **QW3** — Comprobar que la guía existe en `/recursos/guia-gran-viaje/`.
- [ ] **Legal** — Actualizar la página de Política de Cookies.
- [ ] **Publicar** — `git add` / `commit` / `push` y verificar en la web.

---

## 2. QUICK WIN 1 — Medición (Google Analytics 4 + píxel de Meta)

Objetivo: saber cuánta gente entra, de dónde viene y cuántos contactan. La web
ya tiene cableados estos tres "eventos" (conversiones) que verás en los informes:

- `generate_lead` — alguien envía el formulario de **/contacto/**.
- `whatsapp_click` — alguien pulsa el botón flotante de **WhatsApp**.
- `subscribe` — alguien se da de alta en el **lead magnet** (la guía).

En Meta, `generate_lead` y `subscribe` se registran como **Lead**, y
`whatsapp_click` como **Contact**. No tienes que configurar nada de esto: viene
hecho.

### 2.1. Crear la propiedad de Google Analytics 4 y sacar el ID

- [ ] Entra en **https://analytics.google.com** con tu cuenta de Google (usa la
      del negocio, p. ej. la de `viajes@horizonteexclusivo.es` si está en Google).
- [ ] Abajo a la izquierda pulsa el engranaje **Administrar** (Admin).
- [ ] En la columna **Cuenta**, pulsa **Crear** → **Cuenta**. Nombre:
      `Horizonte Exclusivo`. Acepta las condiciones.
- [ ] Después te pedirá crear una **Propiedad**. Nombre: `horizonteexclusivo.es`.
      Zona horaria: **España (GMT+1)**. Moneda: Euro (da igual, no la usaremos).
- [ ] En "Detalles del negocio" elige sector **Viajes** y tamaño pequeño. En
      "Objetivos" marca **Generar clientes potenciales / Leads**.
- [ ] Cuando pregunte la **plataforma**, elige **Web**. Pon la URL
      `https://www.horizonteexclusivo.es` y como nombre del flujo `Web principal`.
- [ ] Al terminar verás la pantalla del **flujo de datos web**. Arriba a la
      derecha aparece el **ID de medición**, con el formato **`G-XXXXXXXXXX`**
      (la G seguida de letras y números). **Cópialo.** Ese es tu `GA4_ID`.

> No necesitas pegar el código que Google te ofrece ("etiqueta de Google"): la
> web ya lo carga sola con ese ID, y solo después de que el visitante acepte
> cookies. Solo necesitas el ID.

### 2.2. Crear el píxel de Meta y sacar el ID numérico

- [ ] Entra en **https://business.facebook.com** (Meta Business Suite). Si no
      tienes cuenta de empresa, créala (es gratis) con tu Facebook.
- [ ] Ve a **Configuración del negocio** (Business Settings) → en el menú,
      **Orígenes de datos** → **Conjuntos de datos / Píxeles** (antes "Pixels").
      Atajo directo: abre el **Administrador de eventos** (Events Manager) en
      **https://business.facebook.com/events_manager**.
- [ ] Pulsa **Conectar orígenes de datos** → **Web** → **Continuar**.
- [ ] Nombre del conjunto de datos / píxel: `Horizonte Exclusivo Web`. Pon la URL
      `https://www.horizonteexclusivo.es` y continúa.
- [ ] Cuando pregunte cómo instalarlo, elige **Instalar el código manualmente**
      (NO uses la integración con partners). No copies nada del código: solo nos
      interesa el número.
- [ ] El **ID del píxel / conjunto de datos** es un número largo (15-16 cifras),
      visible bajo el nombre del píxel en el Administrador de eventos. **Cópialo.**
      Ese es tu `META_PIXEL_ID`.

### 2.3. Dónde pegar los dos IDs

Abre el archivo `scripts.js` (raíz del proyecto). Busca, cerca del principio, el
bloque `window.HE_CONFIG`. Cambia **solo** lo que está entre comillas.

**ANTES:**

```js
window.HE_CONFIG = {
    GA4_ID: 'G-XXXXXXXXXX',            // ← pega aquí tu ID de Google Analytics 4
    META_PIXEL_ID: 'XXXXXXXXXXXXXXX',  // ← pega aquí tu ID de píxel de Meta
    LEAD_WEBHOOK: 'https://hook.eu2.make.com/REEMPLAZAR_LEAD_MAGNET' // ← webhook de Make para la guía
};
```

**DESPUÉS** (ejemplo con datos inventados; usa los tuyos reales):

```js
window.HE_CONFIG = {
    GA4_ID: 'G-AB12CD34EF',            // ← pega aquí tu ID de Google Analytics 4
    META_PIXEL_ID: '1234567890123456', // ← pega aquí tu ID de píxel de Meta
    LEAD_WEBHOOK: 'https://hook.eu2.make.com/REEMPLAZAR_LEAD_MAGNET' // ← webhook de Make para la guía
};
```

- [ ] Pega tu `GA4_ID` real (empieza por `G-`).
- [ ] Pega tu `META_PIXEL_ID` real (solo números).
- [ ] No toques las comas ni las comillas. Cada valor va **entre comillas
      simples** `'...'`.
- [ ] El `LEAD_WEBHOOK` lo dejamos como está de momento; lo cambiamos en el
      Quick win 3.

Guarda el archivo. (La publicación, en el apartado 6.)

### 2.4. Comprobar que funciona

Una vez publicado (apartado 6), espera 2-3 minutos y prueba:

- [ ] **Google Analytics — Tiempo real.** Abre tu web en el móvil o en una
      ventana de incógnito y **pulsa "Aceptar" en el banner de cookies**. Luego,
      en GA4, ve a **Informes → Tiempo real**. Deberías verte aparecer como 1
      usuario activo en unos segundos. Si pulsas WhatsApp o envías el formulario,
      verás el evento `whatsapp_click` o `generate_lead` en la lista de eventos
      en tiempo real.
- [ ] **Píxel de Meta — Pixel Helper.** Instala en Chrome la extensión gratuita
      **Meta Pixel Helper**. Entra en la web, **acepta cookies** y pulsa el icono
      de la extensión: debe decir que ha encontrado **1 píxel** con tu ID y un
      evento **PageView**. Al pulsar WhatsApp o enviar el formulario, marcará
      **Contact** o **Lead**.

> RECORDATORIO CLAVE: si **no** pulsas **"Aceptar"** en el banner de cookies, NO
> se carga nada y no verás datos. Es a propósito: cumplimos el RGPD/AEPD cargando
> la analítica solo con consentimiento. Para repetir la prueba desde cero, borra
> las cookies del sitio o usa una ventana de incógnito nueva.

---

## 3. QUICK WIN 2 — Instagram

El enlace ya está puesto en el footer de las 148 páginas y en los datos que lee
Google (campo `sameAs` del `schema`), apuntando a:

**https://www.instagram.com/viajeshorizonteexclusivo/**

Solo falta que esa cuenta **exista**.

### 3.1. Crear la cuenta @horizonteexclusivo

- [ ] Descarga la app de Instagram o entra en **https://www.instagram.com**.
- [ ] Regístrate con el email del negocio (`viajes@horizonteexclusivo.es` es lo
      ideal). En **nombre de usuario** pon exactamente **`horizonteexclusivo`**
      (sin mayúsculas, sin puntos, sin guiones). Es el dato que tiene que coincidir.
- [ ] En **Configuración → Tipo de cuenta**, pásala a **Cuenta de empresa**
      (categoría: *Agencia de viajes*). Así tendrás estadísticas y podrás
      enlazarla luego con Meta Business para anuncios.
- [ ] **Foto de perfil:** el logotipo (sirve `images/logo-trimmed.png`,
      preferiblemente recortado en cuadrado y sobre fondo oscuro `#0a0a0a`).
- [ ] **Nombre visible:** `Horizonte Exclusivo`.
- [ ] **Biografía** (ejemplo, voz de Endeis, sin precios):

      > Diseño cada viaje a medida para que no tengas que preocuparte de nada.
      > Viajes de lujo, artesanales, hechos para ti. Molins de Rei · Barcelona.
      > Más que viajar, vivir el mundo.

- [ ] **Enlace de la bio:** `https://www.horizonteexclusivo.es` (o directamente
      `/contacto/` si prefieres llevar al formulario).

### 3.2. Confirmar el enlace (y qué hacer si el nombre final es distinto)

Si has podido registrar exactamente `horizonteexclusivo`, **no tienes que tocar
nada**: el footer y el `schema` ya apuntan ahí.

Si ese nombre estaba pillado y has tenido que usar otro (por ejemplo
`horizonteexclusivo.viajes`), entonces hay que actualizar el enlace en dos
sitios y volver a generar los datos del buscador:

- [ ] Abre `build-schema.js` y, en el objeto del negocio, cambia la línea
      `instagram: 'https://www.instagram.com/viajeshorizonteexclusivo/'` por tu URL real.
- [ ] Ejecuta en una terminal, dentro de la carpeta del proyecto:
      `node build-schema.js` (esto reescribe el dato de redes en todas las
      páginas).
- [ ] Reemplaza el enlace antiguo en los footers: busca en todo el proyecto
      `instagram.com/viajeshorizonteexclusivo` y sustitúyelo por tu nuevo nombre de
      usuario. (Cualquier editor de código tiene "Buscar y reemplazar en todo el
      proyecto"; en VS Code es `Ctrl+Mayús+H`.)
- [ ] Publica (apartado 6) y comprueba que el icono del footer abre tu perfil.

> Consejo: si puedes, **quédate con `horizonteexclusivo`** aunque tengas que
> reclamarlo más adelante. Es lo más limpio y evita tener que tocar código.

---

## 4. QUICK WIN 3 — Lead magnet + email automático

Qué pasa hoy: cuando alguien deja su email en la sección de captación de la home
o en cualquiera de las 12 guías del blog, el código envía esos datos a un webhook
de Make con esta forma:

```json
{
  "email": "persona@ejemplo.com",
  "tipo": "lead-magnet-guia",
  "fecha": "2026-06-06T10:00:00.000Z",
  "pagina_origen": "https://www.horizonteexclusivo.es/blog/..."
}
```

Lo que falta: que Make reciba ese email, lo **guarde en una lista** y le **mande
un correo** con el enlace a la guía. Lo montamos en dos herramientas gratuitas:
**Make** (la automatización) y **Brevo** (la lista de correo y el envío). Brevo
es gratis, está en la UE y cumple RGPD; si prefieres Mailchimp, al final hay una
nota.

> COMPRUEBA ESTO ANTES DE NADA: el email enviará a la gente a
> **`/recursos/guia-gran-viaje/`**. Esa página **ya existe** en el proyecto
> (`recursos/guia-gran-viaje/index.html`). Aun así, ábrela una vez en
> `https://www.horizonteexclusivo.es/recursos/guia-gran-viaje/` y confirma que se
> ve bien antes de que empiece a llegar gente. La página es `noindex` (no sale en
> Google) a propósito: es el "regalo" exclusivo para quien deja su email.

### 4.1. Crear cuenta y lista en Brevo

- [ ] Entra en **https://www.brevo.com** y crea una cuenta (plan gratuito).
      Verifica tu email y tu dominio remitente cuando te lo pida (te guían para
      poner unos registros que confirman que puedes enviar desde
      `@horizonteexclusivo.es`; mejor eso que enviar desde un Gmail).
- [ ] En el menú **Contactos → Listas**, pulsa **Crear una lista**. Nómbrala
      `Guía gran viaje` (o `Newsletter`). Guárdala.
- [ ] En **Configuración (engranaje) → Claves API / SMTP & API**, genera una
      **API key** y guárdala a mano: Make te la pedirá una sola vez para
      conectarse.

### 4.2. Montar el escenario en Make

- [ ] Entra en **https://www.make.com** con la misma cuenta donde ya tienes el
      webhook del formulario de contacto (la región es **eu2**, la misma que ya
      usáis).
- [ ] Pulsa **Create a new scenario**.
- [ ] **Módulo 1 — el webhook.** Busca **Webhooks → Custom webhook** y añádelo.
      Pulsa **Add**, ponle nombre `Lead magnet guia` y **copia la URL** que te da
      (será algo como `https://hook.eu2.make.com/abcd1234...`). **Guárdala**, la
      pegarás en `scripts.js` en el paso 4.3.
- [ ] (Opcional pero recomendado) Para que Make "aprenda" la forma de los datos:
      con el webhook esperando ("Determine data structure"), abre tu web, deja un
      email de prueba en la guía y dale a enviar. Make capturará el ejemplo y ya
      reconocerá los campos `email`, `tipo`, `fecha` y `pagina_origen`.
- [ ] **Módulo 2 — guardar en Brevo.** Añade detrás un módulo
      **Brevo (Sendinblue) → Create or update a contact**. La primera vez te
      pedirá la **API key** de Brevo (la del paso 4.1). En **Email** elige el
      campo `email` que llega del webhook. En **Lists**, marca la lista
      `Guía gran viaje`.
- [ ] **Módulo 3 — enviar el correo.** Tienes dos opciones:
      - Sencilla y fiable: añade un módulo **Email → Send an email** (o
        **Brevo → Send a transactional email**) y redacta el correo de
        bienvenida (texto en 4.4). En **To** usa el campo `email` del webhook.
      - Alternativa "manos libres": en lugar del módulo 3, configura en **Brevo →
        Automatizaciones** un mensaje de bienvenida que se dispare al entrar un
        contacto en la lista. Así Make solo guarda y Brevo envía. Para empezar,
        la opción del módulo de email en Make es la más directa.
- [ ] Arriba a la izquierda, activa el escenario (interruptor **ON /
      Scheduling**) para que quede escuchando 24/7.

### 4.3. Pegar la URL del webhook nuevo en scripts.js

Vuelve a `scripts.js`, al bloque `window.HE_CONFIG`, y cambia **solo** la línea
del `LEAD_WEBHOOK` por la URL que copiaste de Make en el paso 4.2.

**ANTES:**

```js
    LEAD_WEBHOOK: 'https://hook.eu2.make.com/REEMPLAZAR_LEAD_MAGNET' // ← webhook de Make para la guía
```

**DESPUÉS** (ejemplo; usa tu URL real):

```js
    LEAD_WEBHOOK: 'https://hook.eu2.make.com/abcd1234tu-webhook-real' // ← webhook de Make para la guía
```

- [ ] Pega tu URL real entre las comillas simples.
- [ ] Comprueba que ya **no aparece la palabra `REEMPLAZAR`** (mientras esté, el
      código no envía nada: es la señal de "aún sin configurar").
- [ ] Guarda. Tras publicar, deja un email de prueba en la guía y comprueba que:
      (1) llega a la lista de Brevo y (2) te llega el correo de bienvenida.

### 4.4. Idea de email de bienvenida (voz de Endeis, sin precios)

**Asunto:** Tu guía para soñar (y planificar) el gran viaje

**Cuerpo:**

> Hola:
>
> Soy Endeis, de Horizonte Exclusivo. Gracias por dejarme acompañarte un trocito
> en tu próximo gran viaje. Aquí tienes la guía que te prometí, con lo que de
> verdad marca la diferencia cuando un viaje se diseña a medida y con calma:
>
> 👉 [Leer la guía](https://www.horizonteexclusivo.es/recursos/guia-gran-viaje/)
>
> Léela sin prisa. Y si, al terminar, te apetece que pensemos juntos tu viaje
> —sin compromiso, solo una conversación—, escríbeme por aquí:
> [Cuéntame tu viaje](https://www.horizonteexclusivo.es/contacto/). Yo me ocupo
> de todo lo demás para que tú solo tengas que disfrutar.
>
> Un abrazo,
> Endeis · Horizonte Exclusivo
> Más que viajar, vivir el mundo.

- [ ] Personaliza el saludo con el nombre si en el futuro pides el nombre en el
      formulario (hoy solo se pide el email, así que "Hola:" funciona perfecto).
- [ ] Repasa que **no aparezca ningún precio ni cifra**. Es política comercial:
      cero precios, siempre.

> Alternativa Mailchimp: si te resultara más cómodo, el flujo es idéntico
> (Make → módulo de Mailchimp "Add/Update Subscriber" → Mailchimp envía un
> correo de bienvenida con automatización). Recomiendo **Brevo** por ser gratis,
> europeo y más sencillo para empezar.

---

## 5. PASO LEGAL — Actualizar la Política de Cookies

Ahora que la web sí usa cookies de **análisis** (Google Analytics 4) y de
**marketing** (píxel de Meta), la página de cookies tiene que decirlo. Hoy ese
documento, en el apartado **"Cookies de terceros"**, dice literalmente:

> *"En la actualidad, www.horizonteexclusivo.es no utiliza cookies de análisis,
> publicidad ni redes sociales de terceros…"*

…y eso dejará de ser cierto en cuanto pegues los IDs del Quick win 1.

Edita el archivo `politica-de-cookies/index.html`, busca ese párrafo (justo
debajo del título `<h2>Cookies de terceros</h2>`) y sustitúyelo por algo como
esto (texto de ejemplo; revísalo con tu asesoría si quieres ir sobre seguro):

> **Cookies de terceros (análisis y marketing).** Con tu consentimiento previo
> —que prestas al pulsar "Aceptar" en el aviso de cookies—, este sitio utiliza
> cookies de terceros con fines de análisis y de marketing: **Google Analytics
> 4** (Google Ireland Ltd.), que nos ayuda a entender de forma agregada cómo se
> usa la web para mejorarla, y el **píxel de Meta** (Meta Platforms Ireland
> Ltd.), que nos permite medir la eficacia de nuestras campañas en Facebook e
> Instagram. Estas cookies **no se instalan hasta que las aceptas**; si las
> rechazas o no las aceptas, no se cargan. Puedes cambiar de opinión en
> cualquier momento borrando las cookies desde tu navegador (ver el apartado
> siguiente) y la web seguirá funcionando con normalidad.

- [ ] Sustituye el párrafo de "Cookies de terceros".
- [ ] Cambia la fecha de **"Última actualización"** (en el hero pone hoy
      *"8 de marzo de 2025"*) por la fecha en que publiques (por ejemplo,
      *6 de junio de 2026*).
- [ ] Opcional recomendado: pide a tu asesoría que confirme el texto y, si lo
      cree necesario, añade un enlace a las políticas de privacidad de Google y
      de Meta.

> El banner de cookies ya está listo: su texto ("Usamos cookies propias y de
> terceros para analizar el tráfico…") y los botones **Aceptar / Rechazar** ya
> cumplen el modelo de consentimiento previo. No hay que tocarlo.

---

## 6. PUBLICAR y verificar

Todos los cambios (los IDs, el webhook, el texto de cookies) viven en archivos
del proyecto. Para que aparezcan en la web hay que **publicarlos**. El sitio está
en Vercel y se publica solo cuando subes los cambios con Git.

Desde una terminal, en la carpeta del proyecto:

```bash
git add scripts.js politica-de-cookies/index.html
git commit -m "Activar medición (GA4 + Meta), webhook del lead magnet y cookies de terceros"
git push
```

> Si también tocaste el Instagram en `build-schema.js` y los footers, añade esos
> archivos al `git add` (o usa `git add -A` para incluir todo lo cambiado).

- [ ] `git add` de los archivos modificados.
- [ ] `git commit` con un mensaje claro.
- [ ] `git push`. Vercel detecta el push y publica solo en 1-2 minutos.

### Checklist final de verificación (tras publicar)

- [ ] Abro la web en **incógnito** y veo el **banner de cookies**.
- [ ] Pulso **Aceptar**.
- [ ] **GA4 → Tiempo real**: me veo como usuario activo.
- [ ] Pulso **WhatsApp**: aparece el evento `whatsapp_click` en GA4.
- [ ] Envío el **formulario de /contacto/**: aparece `generate_lead` en GA4 y me
      llega el aviso del formulario como siempre.
- [ ] **Meta Pixel Helper** detecta 1 píxel con mi ID y el evento PageView; al
      pulsar WhatsApp marca **Contact** y al enviar el formulario, **Lead**.
- [ ] Dejo un **email de prueba** en la sección de la guía (home o un post del
      blog): el contacto **aparece en la lista de Brevo** y me llega el **correo
      de bienvenida** con el enlace a la guía.
- [ ] El enlace del correo abre **/recursos/guia-gran-viaje/** y la guía se ve
      bien (no es una página en blanco).
- [ ] El **icono de Instagram** del footer abre el perfil correcto.
- [ ] La **Política de cookies** ya menciona Google Analytics 4 y el píxel de
      Meta, con la fecha actualizada.
- [ ] Repaso final: **en ningún sitio aparecen precios ni cifras de coste**.

---

### Recordatorios de oro

1. **Cero precios.** Nunca, en ningún email, bio o página. Política comercial.
2. La analítica **solo carga tras "Aceptar"** cookies. Si pruebas y no ves
   datos, casi siempre es porque no aceptaste (o estás reutilizando una sesión
   donde ya rechazaste: usa incógnito).
3. Mientras un valor en `HE_CONFIG` tenga su texto de ejemplo
   (`G-XXXXXXXXXX`, `XXXXXXXXXXXXXXX`, `REEMPLAZAR_...`), ese quick win está
   **apagado** y la web funciona igual. Se enciende al pegar el dato real.
