#!/usr/bin/env python3
"""
Radiografía de UNA página en Search Console: por qué consultas aparece, en qué posición,
y qué ha cambiado respecto al periodo anterior.

Existe porque la «posición media» de una página engaña. Es la media de TODAS las consultas
por las que aparece, así que una página puede «bajar» 26 puestos sin haber empeorado en
nada: basta con que empiece a salir para consultas nuevas y malas. Sin este desglose no se
puede distinguir un desplome real de una simple dilución.

Uso (necesita GOOGLE_SA_JSON, así que en la práctica se lanza desde el workflow gsc-pagina.yml):
    python3 scripts_seo/diagnostico_pagina.py --pagina /viajes-a-medida-barcelona/
"""
import argparse
import json
import os
import time
import urllib.parse
import urllib.request
from datetime import date, timedelta

import jwt  # PyJWT

SITE_URL = "sc-domain:horizonteexclusivo.es"
BASE = "https://www.horizonteexclusivo.es"
SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"
API = f"https://searchconsole.googleapis.com/webmasters/v3/sites/{urllib.parse.quote(SITE_URL, safe='')}/searchAnalytics/query"
LAG_DAYS = 3
WINDOW_DAYS = 28


def load_service_account():
    sa_json = os.environ.get("GOOGLE_SA_JSON")
    if sa_json:
        return json.loads(sa_json)
    with open(os.environ.get("GOOGLE_SA_FILE", "service-account.json")) as f:
        return json.load(f)


def get_token(sa):
    now = int(time.time())
    signed = jwt.encode({"iss": sa["client_email"], "scope": SCOPE, "aud": sa["token_uri"],
                         "iat": now, "exp": now + 3600}, sa["private_key"], algorithm="RS256")
    data = urllib.parse.urlencode({
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": signed}).encode()
    req = urllib.request.Request(sa["token_uri"], data=data)
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode())["access_token"]


def consultas_de(token, pagina, start, end):
    body = json.dumps({
        "startDate": start.isoformat(), "endDate": end.isoformat(),
        "dimensions": ["query"],
        "dimensionFilterGroups": [{"filters": [
            {"dimension": "page", "operator": "equals", "expression": BASE + pagina}]}],
        "rowLimit": 500, "dataState": "final",
    }).encode()
    req = urllib.request.Request(API, data=body)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read().decode())
    return {row["keys"][0]: {"pos": row["position"], "impr": int(row["impressions"]),
                             "clicks": int(row["clicks"])} for row in data.get("rows", [])}


def totales_de(token, pagina, start, end):
    """Total REAL de la página, sin desglosar por consulta. Imprescindible: Search Console
    anonimiza las consultas poco frecuentes, así que sumar el desglose da muy por debajo.
    El 14-ago el desglose de /viajes-a-medida-barcelona/ veía 1 impresión en el periodo
    anterior cuando el total real era otro — y de ahí salió un diagnóstico equivocado."""
    body = json.dumps({
        "startDate": start.isoformat(), "endDate": end.isoformat(),
        "dimensions": [],
        "dimensionFilterGroups": [{"filters": [
            {"dimension": "page", "operator": "equals", "expression": BASE + pagina}]}],
        "dataState": "final",
    }).encode()
    req = urllib.request.Request(API, data=body)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as r:
        filas = json.loads(r.read().decode()).get("rows", [])
    if not filas:
        return {"impr": 0, "clicks": 0, "pos": 0.0}
    f = filas[0]
    return {"impr": int(f["impressions"]), "clicks": int(f["clicks"]), "pos": f["position"]}


def resumen(d):
    if not d:
        return 0, 0, 0.0
    impr = sum(v["impr"] for v in d.values())
    clicks = sum(v["clicks"] for v in d.values())
    # posición media ponderada por impresiones, que es como la calcula Search Console
    pos = sum(v["pos"] * v["impr"] for v in d.values()) / impr if impr else 0.0
    return impr, clicks, pos


def fmt(p):
    return f"{p:.1f}".replace(".", ",")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pagina", required=True)
    ap.add_argument("--top", type=int, default=25)
    args = ap.parse_args()

    token = get_token(load_service_account())
    end = date.today() - timedelta(days=LAG_DAYS)
    start = end - timedelta(days=WINDOW_DAYS - 1)
    prev_end = start - timedelta(days=1)
    prev_start = prev_end - timedelta(days=WINDOW_DAYS - 1)

    ahora = consultas_de(token, args.pagina, start, end)
    antes = consultas_de(token, args.pagina, prev_start, prev_end)

    ta = totales_de(token, args.pagina, start, end)
    tb = totales_de(token, args.pagina, prev_start, prev_end)
    ia, ca, pa = resumen(ahora)
    ib, cb, pb = resumen(antes)
    print(f"🔎 {args.pagina}")
    print(f"   TOTAL REAL ahora ({start:%d/%m}-{end:%d/%m}): {ta['impr']} impr · {ta['clicks']} clics · pos {fmt(ta['pos'])}")
    print(f"   TOTAL REAL antes ({prev_start:%d/%m}-{prev_end:%d/%m}): {tb['impr']} impr · {tb['clicks']} clics · pos {fmt(tb['pos'])}")
    oculto_a = ta["impr"] - ia
    oculto_b = tb["impr"] - ib
    print(f"   (el desglose por consulta solo ve {ia} y {ib} impr: Search Console oculta "
          f"{oculto_a} y {oculto_b} de consultas poco frecuentes)")
    print(f"   consultas visibles: {len(ahora)} ahora · {len(antes)} antes")
    print()

    nuevas = [q for q in ahora if q not in antes]
    perdidas = [q for q in antes if q not in ahora]
    if nuevas:
        impr_n = sum(ahora[q]["impr"] for q in nuevas)
        pos_n = sum(ahora[q]["pos"] * ahora[q]["impr"] for q in nuevas) / impr_n if impr_n else 0
        print(f"➕ consultas NUEVAS: {len(nuevas)} · {impr_n} impr · pos media {fmt(pos_n)}")
        for q in sorted(nuevas, key=lambda x: -ahora[x]["impr"])[:args.top]:
            d = ahora[q]
            print(f"     {fmt(d['pos']):>6} · {d['impr']:4d} impr · «{q}»")
        print()
    if perdidas:
        impr_p = sum(antes[q]["impr"] for q in perdidas)
        print(f"➖ consultas PERDIDAS: {len(perdidas)} · {impr_p} impr")
        for q in sorted(perdidas, key=lambda x: -antes[x]["impr"])[:args.top]:
            d = antes[q]
            print(f"     {fmt(d['pos']):>6} · {d['impr']:4d} impr · «{q}»")
        print()

    comunes = [q for q in ahora if q in antes]
    if comunes:
        print("🔁 consultas que estaban en los DOS periodos (aquí se ve si ha empeorado de verdad):")
        for q in sorted(comunes, key=lambda x: -ahora[x]["impr"])[:args.top]:
            a, b = ahora[q], antes[q]
            delta = b["pos"] - a["pos"]
            flecha = "=" if abs(delta) < 0.5 else ("▲" if delta > 0 else "▼")
            print(f"     {fmt(b['pos']):>6} → {fmt(a['pos']):>6} {flecha} · {a['impr']:4d} impr · «{q}»")


if __name__ == "__main__":
    main()
