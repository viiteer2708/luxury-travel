#!/usr/bin/env python3
"""
Publicaciones automáticas en la ficha de Google (Google Business Profile) de Horizonte Exclusivo.

Publica, una vez por semana, el siguiente post de la cola `scripts_seo/gbp_posts.json` que ya
haya llegado a su semana y no esté publicado. Cada post lleva texto (sin precios, sin teléfonos,
≤1.500 caracteres), botón «Más información» con URL (con UTM para medir clics en la web) y una
foto del propio repo (URL pública de la web).

API: Google Business Profile — endpoint heredado v4 `localPosts` (sigue activo en 2026):
  POST https://mybusiness.googleapis.com/v4/accounts/{acc}/locations/{loc}/localPosts
Autenticación: OAuth 2.0 con la cuenta de Victor (scope business.manage) → refresh token guardado
en un fichero .env SOLO en el VPS (nunca en este repo, que es público).

Fichero .env (por defecto /root/.gbp-horizonte.env, chmod 600):
  GBP_CLIENT_ID=…            (cliente OAuth «Web» del proyecto horizonte-seo)
  GBP_CLIENT_SECRET=…
  GBP_REFRESH_TOKEN=…        (obtenido una vez con OAuth Playground)
  GBP_ACCOUNT_ID=…           (los da `--descubrir`)
  GBP_LOCATION_ID=…

Uso:
  python3 scripts_seo/gbp_post.py --descubrir            # lista cuentas y fichas → IDs para el .env
  python3 scripts_seo/gbp_post.py --listar               # últimos posts publicados en la ficha
  python3 scripts_seo/gbp_post.py --publicar --dry-run   # qué publicaría hoy, sin publicar
  python3 scripts_seo/gbp_post.py --publicar [--commit] [--telegram]
      publica el siguiente post pendiente cuya semana ya haya llegado; con --commit marca el post
      como publicado en gbp_posts.json y hace commit+push; con --telegram avisa a Victor.
  python3 scripts_seo/gbp_post.py --publicar --id 2026-08-24-luna-de-miel   # uno concreto

Sin dependencias externas (solo biblioteca estándar).
"""
import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
COLA = RAIZ / "scripts_seo" / "gbp_posts.json"
BASE_WEB = "https://www.horizonteexclusivo.es"
ENV_DEFECTO = "/root/.gbp-horizonte.env"
ENV_TELEGRAM = "/root/.telegram-avisos.env"
V4 = "https://mybusiness.googleapis.com/v4"


# ---------------------------------------------------------------- utilidades
def leer_env(ruta):
    env = {}
    p = Path(ruta)
    if not p.exists():
        return env
    for ln in p.read_text(encoding="utf-8").splitlines():
        ln = ln.strip()
        if not ln or ln.startswith("#") or "=" not in ln:
            continue
        k, v = ln.split("=", 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def http(url, datos=None, cabeceras=None, metodo=None, form=False):
    """Petición HTTP con JSON (o formulario) y respuesta JSON. Devuelve (status, dict)."""
    cuerpo = None
    cab = dict(cabeceras or {})
    if datos is not None:
        if form:
            cuerpo = urllib.parse.urlencode(datos).encode()
            cab["Content-Type"] = "application/x-www-form-urlencoded"
        else:
            cuerpo = json.dumps(datos).encode()
            cab["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=cuerpo, headers=cab, method=metodo)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            txt = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(txt) if txt.strip() else {})
    except urllib.error.HTTPError as e:
        txt = e.read().decode("utf-8", "replace")
        try:
            return e.code, json.loads(txt)
        except ValueError:
            return e.code, {"error": txt[:800]}


def access_token(env):
    faltan = [k for k in ("GBP_CLIENT_ID", "GBP_CLIENT_SECRET", "GBP_REFRESH_TOKEN") if not env.get(k)]
    if faltan:
        raise SystemExit(f"Falta en el .env: {', '.join(faltan)}. Ver docs/GBP-POSTS-AUTOMATICOS.md (fase 2).")
    st, r = http("https://oauth2.googleapis.com/token", {
        "client_id": env["GBP_CLIENT_ID"], "client_secret": env["GBP_CLIENT_SECRET"],
        "refresh_token": env["GBP_REFRESH_TOKEN"], "grant_type": "refresh_token",
    }, form=True)
    if st != 200 or "access_token" not in r:
        raise SystemExit(f"No he podido renovar el token OAuth ({st}): {r}")
    return r["access_token"]


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


def telegram(texto):
    env = leer_env(ENV_TELEGRAM)
    tk, chat = env.get("TELEGRAM_TOKEN"), env.get("TELEGRAM_CHAT_ID")
    if not tk or not chat:
        print("(Telegram sin configurar; no aviso)")
        return
    st, r = http(f"https://api.telegram.org/bot{tk}/sendMessage", {"chat_id": chat, "text": texto}, form=True)
    print("Telegram:", "ok" if r.get("ok") else f"FALLO {st} {str(r)[:200]}")


# ---------------------------------------------------------------- acciones
def descubrir(env):
    tok = access_token(env)
    st, r = http("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", cabeceras=auth(tok))
    if st != 200:
        raise SystemExit(f"accounts.list → {st}: {r}\n(Si es 403/429 con cuota 0: el proyecto aún no tiene el acceso aprobado o la cuota concedida.)")
    for a in r.get("accounts", []):
        print(f"CUENTA  {a.get('name')}  ·  {a.get('accountName')}  ·  {a.get('type')}")
        acc = a["name"]  # accounts/123
        st2, r2 = http(
            f"https://mybusinessbusinessinformation.googleapis.com/v1/{acc}/locations?readMask=name,title,storefrontAddress&pageSize=20",
            cabeceras=auth(tok))
        if st2 != 200:
            print(f"   locations.list → {st2}: {r2}")
            continue
        for l in r2.get("locations", []):
            dirc = l.get("storefrontAddress", {})
            print(f"   FICHA  {l.get('name')}  ·  {l.get('title')}  ·  {' '.join(dirc.get('addressLines', []))} {dirc.get('locality', '')}")
    print("\nEn el .env: GBP_ACCOUNT_ID = número tras 'accounts/' · GBP_LOCATION_ID = número tras 'locations/'.")


def listar(env):
    tok = access_token(env)
    url = f"{V4}/accounts/{env['GBP_ACCOUNT_ID']}/locations/{env['GBP_LOCATION_ID']}/localPosts?pageSize=10"
    st, r = http(url, cabeceras=auth(tok))
    if st != 200:
        raise SystemExit(f"localPosts.list → {st}: {r}")
    posts = r.get("localPosts", [])
    print(f"{len(posts)} publicaciones (las más recientes):")
    for p in posts:
        print(f"- {p.get('createTime', '')[:10]}  {p.get('state')}  {p.get('summary', '')[:90]!r}")


def cargar_cola():
    if not COLA.exists():
        raise SystemExit(f"No existe {COLA}: aún no hay lote de posts aprobado.")
    return json.loads(COLA.read_text(encoding="utf-8"))


def elegir(cola, id_concreto=None):
    hoy = date.today().isoformat()
    pend = [p for p in cola["posts"] if not p.get("publicado")]
    if id_concreto:
        c = [p for p in pend if p["id"] == id_concreto]
        if not c:
            raise SystemExit(f"No hay post pendiente con id {id_concreto}")
        return c[0]
    listos = sorted([p for p in pend if p["semana"] <= hoy], key=lambda p: p["semana"])
    return listos[0] if listos else None


def validar(post):
    txt = post["texto"]
    problemas = []
    if len(txt) > 1500:
        problemas.append(f"texto de {len(txt)} caracteres (>1500)")
    for mala in ("€", "euros", "http://", "https://", "@"):
        if mala in txt:
            problemas.append(f"el texto contiene «{mala}»")
    import re
    if re.search(r"\d[\d\s.\-]{7,}\d", txt):
        problemas.append("el texto contiene algo que parece un teléfono")
    foto = RAIZ / post["foto"].lstrip("/")
    if not foto.exists():
        problemas.append(f"la foto {post['foto']} no existe en el repo")
    if not post["boton"]["url"].startswith(BASE_WEB):
        problemas.append("la URL del botón no es de la web")
    return problemas


def publicar(env, args):
    cola = cargar_cola()
    post = elegir(cola, args.id)
    if not post:
        print("Nada que publicar hoy: ningún post pendiente ha llegado a su semana.")
        return 0
    problemas = validar(post)
    if problemas:
        msg = f"⛔ No publico «{post['id']}»: " + "; ".join(problemas)
        print(msg)
        if args.telegram:
            telegram("🔴 Post de la ficha de Google NO publicado. " + msg)
        return 2
    cuerpo = {
        "languageCode": "es",
        "topicType": "STANDARD",
        "summary": post["texto"],
        "callToAction": {"actionType": post["boton"].get("tipo", "LEARN_MORE"), "url": post["boton"]["url"]},
        "media": [{"mediaFormat": "PHOTO", "sourceUrl": BASE_WEB + post["foto"]}],
    }
    print(f"Post «{post['id']}» (semana {post['semana']}, {len(post['texto'])} caracteres) → {post['boton']['url']}")
    if args.dry_run:
        print(json.dumps(cuerpo, ensure_ascii=False, indent=2))
        print("(dry-run: no publicado)")
        return 0
    tok = access_token(env)
    url = f"{V4}/accounts/{env['GBP_ACCOUNT_ID']}/locations/{env['GBP_LOCATION_ID']}/localPosts"
    st, r = http(url, cuerpo, cabeceras=auth(tok), metodo="POST")
    if st not in (200, 201) or "name" not in r:
        msg = f"localPosts.create → {st}: {json.dumps(r, ensure_ascii=False)[:600]}"
        print("FALLO", msg)
        if args.telegram:
            telegram(f"🔴 El post de la ficha de Google «{post['id']}» ha fallado: {msg[:500]}")
        return 1
    post["publicado"] = datetime.now().isoformat(timespec="minutes")
    post["gbp_name"] = r["name"]
    post["gbp_url"] = r.get("searchUrl", "")
    print("Publicado:", r["name"], r.get("state"), r.get("searchUrl", ""))
    COLA.write_text(json.dumps(cola, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.commit:
        subprocess.run(["git", "-C", str(RAIZ), "add", str(COLA)], check=False)
        subprocess.run(["git", "-C", str(RAIZ), "commit", "-q", "-m",
                        f"Ficha de Google: publicado el post «{post['id']}»"], check=False)
        subprocess.run(["git", "-C", str(RAIZ), "push", "-q", "origin", "master"], check=False)
    if args.telegram:
        telegram(f"✅ Publicado en la ficha de Google el post de la semana ({post['id']}).\n"
                 f"{post['texto'][:200]}…\n{post.get('gbp_url') or ''}".strip())
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--env", default=ENV_DEFECTO)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--descubrir", action="store_true")
    g.add_argument("--listar", action="store_true")
    g.add_argument("--publicar", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--id", default=None)
    ap.add_argument("--commit", action="store_true")
    ap.add_argument("--telegram", action="store_true")
    args = ap.parse_args()
    env = leer_env(args.env)
    if args.descubrir:
        return descubrir(env)
    if args.listar:
        return listar(env)
    return publicar(env, args)


if __name__ == "__main__":
    sys.exit(main() or 0)
