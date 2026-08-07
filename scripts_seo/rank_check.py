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

# Consultas vigiladas. El orden es el del mensaje.
KEYWORDS = [
    "viajes a medida barcelona",
    "agencia de viajes",
    "agencia de viajes molins de rei",
    "viajes a medida",
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


def fmt_pos(p):
    return f"{p:.1f}".replace(".", ",")


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

    lineas = [
        "📊 Horizonte Exclusivo — posiciones en Google",
        f"Ventana: {start.strftime('%d/%m')} a {end.strftime('%d/%m')} "
        f"(28 días, vs los 28 anteriores)",
        "",
    ]

    for kw in KEYWORDS:
        d = now_rows.get(kw)
        if not d:
            lineas.append(f"🔍 «{kw}»")
            lineas.append("   sin impresiones en la ventana")
            for q, rd in related(now_rows, kw, kw):
                lineas.append(
                    f"   ↳ «{q}»: pos {fmt_pos(rd['pos'])} ({rd['impr']} impr.)"
                )
            lineas.append("")
            continue

        prev = prev_rows.get(kw)
        prev_pos = prev["pos"] if prev else None
        nota = "  ⚠️ pocas impresiones, dato ruidoso" if d["impr"] < 10 else ""
        lineas.append(f"🔍 «{kw}»")
        lineas.append(
            f"   pos {fmt_pos(d['pos'])}  {arrow(d['pos'], prev_pos)}{nota}"
        )
        lineas.append(f"   {d['impr']} impresiones · {d['clicks']} clics")
        lineas.append("")

    total_impr = sum(d["impr"] for d in now_rows.values())
    total_clicks = sum(d["clicks"] for d in now_rows.values())
    prev_impr = sum(d["impr"] for d in prev_rows.values())
    dif = total_impr - prev_impr
    signo = "+" if dif >= 0 else ""
    lineas.append(
        f"TOTAL web: {total_impr} impresiones ({signo}{dif} vs periodo anterior) "
        f"· {total_clicks} clics"
    )

    msg = "\n".join(lineas)
    print(msg)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(msg)


if __name__ == "__main__":
    main()
