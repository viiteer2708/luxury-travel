#!/usr/bin/env python3
"""
Inspección de URLs del sitemap de Horizonte Exclusivo vía URL Inspection API.

Diseñado para correr en GitHub Actions:
- Service account leído de la env var GOOGLE_SA_JSON (contenido JSON del archivo).
- Salida: archivo JSON en la ruta indicada por --out (default: latest_inspection.json).

También funciona localmente si existe ./service-account.json.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
from datetime import datetime

import jwt  # PyJWT

SITE_URL = "sc-domain:horizonteexclusivo.es"
BASE_URL = "https://www.horizonteexclusivo.es"
SCOPE_INSPECTION = "https://www.googleapis.com/auth/webmasters"

URLS_RESPALDO = [
    "/", "/destinos/", "/pro-tips/", "/blog/", "/contacto/", "/quien-hay-detras/",
    "/molins-de-rei/", "/europa/", "/asia/", "/africa/", "/america/", "/paraisos/",
    "/alaska/", "/albania/", "/alemania/", "/argentina/", "/aruba/", "/bahamas/",
    "/bali/", "/belgica/", "/botsuana/", "/brasil/", "/camboya/", "/canada/",
    "/chicago-nueva-orleans/", "/china/", "/colombia/", "/costa-oeste-usa/",
    "/costa-rica/", "/croacia/", "/cuba/", "/disneyland-paris/",
    "/dubai-abu-dhabi-maldivas/", "/ecuador/", "/egipto/", "/escocia/",
    "/filipinas/", "/florida/", "/francia/", "/grecia/", "/hawai/", "/india/",
    "/islandia/", "/italia/", "/jamaica/", "/japon/", "/kenia-zanzibar/",
    "/madagascar/", "/malasia/", "/maldivas/", "/malta/", "/marruecos/",
    "/mauricio/", "/namibia/", "/noruega/", "/peru/", "/polinesia-francesa/",
    "/portugal/", "/praga-viena-budapest/", "/seychelles/", "/singapur/",
    "/sri-lanka/", "/sudafrica/", "/suiza/", "/tailandia/", "/tanzania/",
    "/turquia/", "/uganda/", "/vietnam/",
    "/pro-tips-aruba/", "/pro-tips-bahamas/", "/pro-tips-camboya/", "/pro-tips-croacia/",
    "/pro-tips-cuba/", "/pro-tips-egipto/",
    "/pro-tips-india/", "/pro-tips-japon/", "/pro-tips-noruega/",
    "/pro-tips-uganda/",
    "/viaje-a-medida-que-es/", "/viaje-a-medida-vs-por-tu-cuenta/",
    "/viaje-premium-que-es/", "/viajes-pequenos-recuerdos-grandes/",
    "/cuanto-cuesta-viaje-a-medida/", "/como-planifico-un-gran-viaje/",
    "/antes-de-reservar-viaje-grande/", "/luna-de-miel-a-medida/",
    "/errores-comunes-organizar-viaje/", "/jet-lag-cambios-horarios/",
    "/checklist-pre-viaje/", "/itinerario-ritmo-realista/",
    "/que-reservar-primero-gran-viaje/",
    "/aviso-legal/", "/politica-de-cookies/", "/politica-de-privacidad/",
]
def cargar_urls():
    """
    Las URLs a inspeccionar salen del sitemap.xml del propio repo, no de una lista
    escrita a mano. La lista a mano se quedaba vieja en silencio: el 14-ago-2026
    había 10 páginas en el sitemap que nadie vigilaba —entre ellas las pilares de
    agosto (safari, empresa, viajes-a-medida-barcelona)—, así que no sabíamos si
    estaban indexadas. Si el sitemap no se puede leer, se usa el respaldo.
    """
    ruta = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sitemap.xml")
    try:
        with open(ruta, encoding="utf-8") as fh:
            urls = re.findall(r"<loc>" + re.escape(BASE_URL) + r"([^<]*)</loc>", fh.read())
    except OSError as e:
        print(f"No he podido leer {ruta} ({e}); tiro del respaldo.")
        return URLS_RESPALDO
    if not urls:
        print("El sitemap no ha dado ninguna URL; tiro del respaldo.")
        return URLS_RESPALDO
    return sorted(set(urls))


URLS = cargar_urls()



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


def inspect(token, url):
    api = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
    body = json.dumps({"inspectionUrl": url, "siteUrl": SITE_URL}).encode()
    req = urllib.request.Request(api, data=body)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": {"code": e.code, "message": (e.read() or b"").decode()[:300]}}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="scripts_seo/latest_inspection.json")
    args = ap.parse_args()

    sa = load_service_account()
    token = get_token(sa, SCOPE_INSPECTION)
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Inspeccionando {len(URLS)} URLs")

    indexed = []
    not_indexed = []
    errors = []
    results = {}

    for i, path in enumerate(URLS, 1):
        r = inspect(token, BASE_URL + path)
        if "error" in r:
            errors.append({"url": path, "error": r["error"]})
            if r["error"].get("code") == 429:
                time.sleep(60)
            print(f"[{i}/{len(URLS)}] {path} ERROR {r['error'].get('code')}")
        else:
            idx = r.get("inspectionResult", {}).get("indexStatusResult", {})
            verdict = idx.get("verdict", "UNKNOWN")
            results[path] = {
                "verdict": verdict,
                "coverage": idx.get("coverageState", "UNKNOWN"),
                "crawled": idx.get("lastCrawlTime", "N/A"),
                "indexing_state": idx.get("indexingState", "UNKNOWN"),
            }
            if verdict == "PASS":
                indexed.append(path)
                print(f"[{i}/{len(URLS)}] {path} OK")
            else:
                not_indexed.append(path)
                print(f"[{i}/{len(URLS)}] {path} NO ({results[path]['coverage']})")
        time.sleep(0.5) if i % 50 else time.sleep(10)

    report = {
        "fecha": datetime.now().isoformat(),
        "total": len(URLS),
        "indexadas": len(indexed),
        "no_indexadas": len(not_indexed),
        "errores": len(errors),
        "detalle_indexadas": indexed,
        "detalle_no_indexadas": not_indexed,
        "detalle_errores": errors,
        "resultados_completos": results,
    }
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"Total: {len(URLS)} | Indexadas: {len(indexed)} | No: {len(not_indexed)} | Err: {len(errors)}")
    print(f"Guardado: {args.out}")


if __name__ == "__main__":
    main()
