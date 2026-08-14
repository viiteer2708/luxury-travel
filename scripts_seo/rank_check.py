#!/usr/bin/env python3
"""
Informe semanal de posiciones en Google para las consultas vigiladas.

Usa la Search Analytics API de Search Console (posición REAL que ve Google,
incluidas las búsquedas localizadas) en vez de rascar la SERP: desde un
servidor la SERP devuelve captcha y, aunque respondiera, daría posiciones sin
localizar — que para este negocio son las que importan.

Service account: env var GOOGLE_SA_JSON (igual que inspect_sitemap.py).
Salida: mensaje listo para Telegram en --out (default: stdout).
"""
import argparse
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, timedelta

import jwt  # PyJWT

SITE_URL = "sc-domain:horizonteexclusivo.es"
SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
API = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(SITE_URL, safe='')}/searchAnalytics/query"

# Consultas vigiladas, agrupadas por frente. El orden es el del mensaje.
# Las cuatro primeras (local + genéricas) son las que pidió Victor el 7-ago; el resto se
# añadieron el 14-ago para poder medir lo que se trabajó ese día — sin ellas, el informe
# no diría nada de la pilar de «viajes exclusivos» ni de la página del precio.
BLOQUES = [
    ("LOCAL — el pack que sí se puede ganar", [
        "agencia de viajes molins de rei",
        "viajes a medida barcelona",
    ]),
    ("EXCLUSIVO — pilar nueva del 14-ago", [
        "viaje exclusivo diseñado para mí",
        "viaje exclusivo",
        "viajes exclusivos",
        "viajes exclusivos a medida",
        "agencia de viajes exclusivos",
    ]),
    ("PRECIO — página reescrita el 14-ago", [
        "cuánto cuesta un viaje a medida",
        "precio viaje a medida",
    ]),
    ("AUTORIDAD — se gana con enlaces, no con contenido", [
        "agencia de viajes de lujo",
        "viajes de lujo",
        "agencia de viajes",
        "viajes a medida",
    ]),
]
KEYWORDS = [k for _, ks in BLOQUES for k in ks]

# Páginas vigiladas: las pilares y las money pages. Miden el trabajo hecho mucho mejor que
# las consultas, porque una página nueva tarda en rankear pero empieza a recibir impresiones.
PAGINAS = [
    ("/viajes-exclusivos-a-medida/", "pilar nueva 14-ago"),
    ("/cuanto-cuesta-viaje-a-medida/", "reescrita 14-ago"),
    ("/viajes-a-medida-barcelona/", ""),
    ("/safari-de-lujo-a-medida/", ""),
    ("/viajes-de-empresa-a-medida/", ""),
    ("/agencia-viajes-lujo-barcelona/", ""),
    ("/molins-de-rei/", ""),
    ("/destinos/", ""),
]

# Search Console publica los datos con 2-3 días de retraso.
LAG_DAYS = 3
WINDOW_DAYS = 28


def load_service_account():
    sa_json = os.environ.get("GOOGLE_SA_JSON")
    if sa_json:
        return json.loads(sa_json)
    path = os.environ.get("GOOGLE_SA_FILE", "service-account.json")
    with open(path) as f:
        return json.load(f)


def get_token(sa, scope):
    now = int(time.time())
    payload = {
        "iss": sa["client_email"],
        "scope": scope,
        "aud": sa["token_uri"],
        "iat": now,
        "exp": now + 3600,
    }
    signed = jwt.encode(payload, sa["private_key"], algorithm="RS256")
    data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": signed,
    }).encode()
    req = urllib.request.Request(sa["token_uri"], data=data)
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())["access_token"]


def query_rows(token, start, end, limit=25000):
    """Todas las consultas del periodo, con posición media, impresiones y clics."""
    body = json.dumps({
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": ["query"],
        "rowLimit": limit,
        "dataState": "final",
    }).encode()
    req = urllib.request.Request(API, data=body)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode())
    return {
        row["keys"][0]: {
            "pos": row["position"],
            "impr": int(row["impressions"]),
            "clicks": int(row["clicks"]),
        }
        for row in data.get("rows", [])
    }


def query_pages(token, start, end, limit=1000):
    """Lo mismo pero por página. Una pilar recién publicada tarda semanas en rankear una
    consulta concreta, pero empieza a recibir impresiones enseguida: por eso este bloque
    detecta antes si algo se mueve."""
    body = json.dumps({
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": ["page"],
        "rowLimit": limit,
        "dataState": "final",
    }).encode()
    req = urllib.request.Request(API, data=body)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode())
    fuera = {}
    for row in data.get("rows", []):
        ruta = urllib.parse.urlparse(row["keys"][0]).path
        fuera[ruta] = {
            "pos": row["position"],
            "impr": int(row["impressions"]),
            "clicks": int(row["clicks"]),
        }
    return fuera


def query_total(token, start, end):
    """Total del sitio, SIN dimensiones. Hace falta pedirlo aparte porque los totales por
    dimensión no cuadran: Search Console anonimiza las consultas poco frecuentes, así que
    sumar por consulta da menos clics de los reales (el 14-ago: 4 sumando consultas cuando
    solo /molins-de-rei/ ya tenía 5)."""
    body = json.dumps({
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "dimensions": [],
        "dataState": "final",
    }).encode()
    req = urllib.request.Request(API, data=body)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as r:
        filas = json.loads(r.read().decode()).get("rows", [])
    if not filas:
        return {"impr": 0, "clicks": 0}
    return {"impr": int(filas[0]["impressions"]), "clicks": int(filas[0]["clicks"])}


def fmt_pos(p):
    return f"{p:.1f}".replace(".", ",")


def fmt_clics(n):
    return "1 clic" if n == 1 else f"{n} clics"


def arrow(now_pos, prev_pos):
    """En posiciones, MENOS es mejor: 30 -> 12 es subir."""
    if prev_pos is None:
        return "· nueva"
    delta = prev_pos - now_pos
    if abs(delta) < 0.5:
        return "= igual"
    if delta > 0:
        return f"▲ sube {fmt_pos(abs(delta))}"
    return f"▼ baja {fmt_pos(abs(delta))}"


def related(rows, kw, exclude, limit=2):
    """Consultas parecidas con datos, para cuando la exacta no tiene impresiones."""
    words = [w for w in kw.split() if len(w) > 3]
    hits = [
        (q, d) for q, d in rows.items()
        if q != exclude and all(w in q for w in words)
    ]
    hits.sort(key=lambda x: -x[1]["impr"])
    return hits[:limit]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    sa = load_service_account()
    token = get_token(sa, SCOPE)

    end = date.today() - timedelta(days=LAG_DAYS)
    start = end - timedelta(days=WINDOW_DAYS - 1)
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=WINDOW_DAYS - 1)

    now_rows = query_rows(token, start, end)
    prev_rows = query_rows(token, prev_start, prev_end)
    now_pages = query_pages(token, start, end)
    prev_pages = query_pages(token, prev_start, prev_end)

    lineas = [
        "📊 Horizonte Exclusivo — posiciones en Google",
        f"Ventana: {start.strftime('%d/%m')} a {end.strftime('%d/%m')} "
        f"(28 días, vs los 28 anteriores)",
    ]

    # Una línea por consulta: con 13 consultas el formato de tres líneas hacía un mensaje
    # de Telegram que nadie lee entero.
    for titulo, kws in BLOQUES:
        lineas.append("")
        lineas.append(f"▸ {titulo}")
        for kw in kws:
            d = now_rows.get(kw)
            if not d:
                cerca = related(now_rows, kw, kw, limit=1)
                extra = (f" (↳ «{cerca[0][0]}» pos {fmt_pos(cerca[0][1]['pos'])}, "
                         f"{cerca[0][1]['impr']} impr.)") if cerca else ""
                lineas.append(f"  —  sin impresiones · «{kw}»{extra}")
                continue
            prev = prev_rows.get(kw)
            nota = " ⚠️" if d["impr"] < 10 else ""
            lineas.append(
                f"  {fmt_pos(d['pos'])} {arrow(d['pos'], prev['pos'] if prev else None)} · "
                f"{d['impr']} impr · {fmt_clics(d['clicks'])}{nota} · «{kw}»"
            )

    lineas.append("")
    lineas.append("📄 PÁGINAS TRABAJADAS")
    for ruta, nota in PAGINAS:
        d = now_pages.get(ruta)
        etiqueta = f" ({nota})" if nota else ""
        if not d:
            lineas.append(f"  —  sin impresiones · {ruta}{etiqueta}")
            continue
        prev = prev_pages.get(ruta)
        lineas.append(
            f"  {fmt_pos(d['pos'])} {arrow(d['pos'], prev['pos'] if prev else None)} · "
            f"{d['impr']} impr · {fmt_clics(d['clicks'])} · {ruta}{etiqueta}"
        )

    tot = query_total(token, start, end)
    tot_prev = query_total(token, prev_start, prev_end)
    dif = tot["impr"] - tot_prev["impr"]
    signo = "+" if dif >= 0 else ""
    lineas.append("")
    lineas.append(
        f"TOTAL web: {tot['impr']} impresiones ({signo}{dif} vs periodo anterior) "
        f"· {fmt_clics(tot['clicks'])}"
    )

    msg = "\n".join(lineas)
    print(msg)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(msg)


if __name__ == "__main__":
    main()
