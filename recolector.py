#!/usr/bin/env python3
"""
recolector.py  –  Recolección masiva de partidas de Brawl Stars
================================================================
Trabajo de Fin de Grado

Pipeline:
  1. Top 200 jugadores del ranking global
  2. Battlelog de cada jugador (últimas 25 partidas)
  3. Expansión: club de cada jugador → miembros → sus battlelogs
  4. Deduplicación por battleTime + todos los participantes
  5. Exporta partidas.json y partidas.csv

Instalación:
  pip install aiohttp python-dotenv

Configuración (.env):
  BRAWL_API_TOKEN=<clave del developer portal>
"""

from __future__ import annotations

import asyncio
import csv
import json
import os
import sys
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional

import aiohttp

# ─────────────────────────────────────────────────────────────
# Configuración
# ─────────────────────────────────────────────────────────────

def _read_dotenv(path: str = ".env") -> dict[str, str]:
    """Lee un .env sin tocar os.environ (evita OSError en Windows con JWTs largos)."""
    for enc in ("utf-8-sig", "utf-8", "utf-16"):
        try:
            result: dict[str, str] = {}
            with open(path, encoding=enc) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, _, v = line.partition("=")
                        result[k.strip()] = v.strip()
            return result
        except UnicodeDecodeError:
            continue
        except FileNotFoundError:
            return {}
    return {}

_env = _read_dotenv()

# Acepta tanto BRAWL_API_TOKEN (nombre del proyecto) como BRAWL_API_KEY
API_KEY = (
    _env.get("BRAWL_API_TOKEN")
    or _env.get("BRAWL_API_KEY")
    or os.getenv("BRAWL_API_TOKEN")
    or os.getenv("BRAWL_API_KEY")
    or ""
).strip()
BASE_URL      = "https://api.brawlstars.com/v1"
CALLS_PER_SEC = 5     # máx. peticiones simultáneas en cualquier ventana de 1 s
TOP_PLAYERS   = 200   # jugadores a leer del ranking global
MAX_CLUBS     = 100   # clubs máximos a expandir
OUTPUT_JSON   = "partidas.json"
OUTPUT_CSV    = "partidas.csv"

CSV_COLS = ["fecha", "modo", "mapa", "resultado", "brawler", "trofeos_brawler"]

# ─────────────────────────────────────────────────────────────
# Estado global
# (asyncio es single-threaded → no necesitamos locks)
# ─────────────────────────────────────────────────────────────

_battles: dict[str, dict] = {}     # clave de batalla → fila procesada
_seen:    set[str]         = set()  # tags de jugadores ya procesados
_cnt = dict(jugadores=0, clubs=0, battlelogs=0, brutas=0, unicas=0)

_rl: Optional["_RateLimiter"] = None  # se instancia en main()


# ─────────────────────────────────────────────────────────────
# Rate limiter: semáforo + liberación diferida = ventana 1 s
# ─────────────────────────────────────────────────────────────

class _RateLimiter:
    """
    Permite como máximo `rps` peticiones en cualquier intervalo de 1 segundo.
    Cada slot del semáforo se libera 1 segundo después de ser adquirido,
    implementando una ventana deslizante sin busy-wait.
    """
    def __init__(self, rps: int) -> None:
        self._sem = asyncio.Semaphore(rps)

    @asynccontextmanager
    async def __call__(self):
        await self._sem.acquire()
        try:
            yield
        finally:
            asyncio.get_running_loop().call_later(1.0, self._sem.release)


# ─────────────────────────────────────────────────────────────
# Utilidades
# ─────────────────────────────────────────────────────────────

def _norm(tag: str) -> str:
    """Normaliza un tag: mayúsculas + prefijo #."""
    t = tag.strip().upper()
    return t if t.startswith("#") else f"#{t}"

def _enc(tag: str) -> str:
    """Encoda el # del tag para la URL de la API."""
    return tag.replace("#", "%23")

def _battle_key(entry: dict) -> str:
    """
    Clave única de deduplicación:
      battleTime  +  tags de TODOS los participantes ordenados.

    Dos jugadores que comparten la misma partida generan la misma
    clave, independientemente de cuál se procesó primero.
    """
    b = entry.get("battle", {})
    tags: list[str] = []

    for team in b.get("teams", []):       # modos por equipos
        for p in team:
            tags.append(p.get("tag", ""))

    for p in b.get("players", []):        # showdown / duels (sin equipos)
        tags.append(p.get("tag", ""))

    return f"{entry.get('battleTime', '')}|{'|'.join(sorted(tags))}"

def _parse_dt(bt: str) -> str:
    """'20240115T123456.000Z'  →  '2024-01-15 12:34:56'"""
    try:
        return datetime.strptime(bt, "%Y%m%dT%H%M%S.%fZ").strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return bt

def _make_row(entry: dict, player_tag: str) -> dict:
    """
    Construye la fila de datos de una partida desde la perspectiva
    del jugador `player_tag` (para obtener su brawler y trofeos).
    Los campos con prefijo _ se guardan en JSON pero se omiten del CSV básico.
    """
    event = entry.get("event", {})
    b     = entry.get("battle", {})
    ptag  = player_tag.upper()

    brawler = "?"
    trofeos: Optional[int] = None

    # Buscar al jugador en modos por equipos
    for team in b.get("teams", []):
        for p in team:
            if p.get("tag", "").upper() == ptag:
                br      = p.get("brawler", {})
                brawler = br.get("name", "?")
                trofeos = br.get("trophies")
                break

    # Buscar en modos individuales (showdown, duels)
    if brawler == "?":
        for p in b.get("players", []):
            if p.get("tag", "").upper() == ptag:
                br      = p.get("brawler", {})
                brawler = br.get("name", "?")
                trofeos = br.get("trophies")
                break

    return {
        # ── Columnas CSV ──────────────────────────────────────────────
        "fecha":           _parse_dt(entry.get("battleTime", "")),
        "modo":            event.get("mode") or b.get("mode", "?"),
        "mapa":            event.get("map", "?"),
        "resultado":       b.get("result", "?"),     # victory / defeat / draw
        "brawler":         brawler,
        "trofeos_brawler": trofeos,
        # ── Extra (solo JSON) ─────────────────────────────────────────
        "_player_tag":    player_tag,
        "_battle_time":   entry.get("battleTime", ""),
        "_event_id":      event.get("id"),
        "_type":          b.get("type", "?"),        # ranked / friendly / …
        "_rank":          b.get("rank"),             # posición en showdown
        "_trophy_change": b.get("trophyChange"),
        "_star_player":   (b.get("starPlayer") or {}).get("tag"),
    }

def _log() -> None:
    c = _cnt
    print(
        f"\r  jugadores {c['jugadores']:>4} │ "
        f"battlelogs {c['battlelogs']:>4} │ "
        f"partidas únicas {c['unicas']:>6}",
        end="", flush=True,
    )


# ─────────────────────────────────────────────────────────────
# Capa de red
# ─────────────────────────────────────────────────────────────

async def _get(session: aiohttp.ClientSession, path: str, _verbose: bool = False) -> Optional[dict]:
    """GET rate-limitado con manejo básico de errores."""
    async with _rl():
        try:
            async with session.get(
                f"{BASE_URL}/{path}",
                headers={"Authorization": f"Bearer {API_KEY}"},
                timeout=aiohttp.ClientTimeout(total=20),
            ) as r:
                if r.status == 200:
                    return await r.json()
                body = None
                try:
                    body = await r.text()
                except Exception:
                    pass
                if _verbose or path.startswith("rankings"):
                    print(f"\n  ⚠  HTTP {r.status} en /{path}", flush=True)
                    if body:
                        print(f"      Respuesta: {body[:300]}", flush=True)
                if r.status == 404:
                    return None
                if r.status == 403:
                    if _verbose or path.startswith("rankings"):
                        print("      → Verifica que la API key sea válida y tu IP esté en la allowlist.", flush=True)
                    return None
                if r.status == 429:
                    await asyncio.sleep(2)
                    return None
                return None
        except asyncio.TimeoutError:
            if _verbose or path.startswith("rankings"):
                print(f"\n  ⚠  Timeout conectando a /{path}", flush=True)
            return None
        except aiohttp.ClientError as e:
            if _verbose or path.startswith("rankings"):
                print(f"\n  ⚠  Error de red en /{path}: {e}", flush=True)
            return None


async def _battlelog(session: aiohttp.ClientSession, tag: str) -> list[dict]:
    data = await _get(session, f"players/{_enc(tag)}/battlelog")
    return (data or {}).get("items", [])

async def _profile(session: aiohttp.ClientSession, tag: str) -> Optional[dict]:
    return await _get(session, f"players/{_enc(tag)}")

async def _club_members(session: aiohttp.ClientSession, club_tag: str) -> list[str]:
    data = await _get(session, f"clubs/{_enc(club_tag)}/members")
    return [m["tag"] for m in (data or {}).get("items", [])]


# ─────────────────────────────────────────────────────────────
# Lógica de recolección
# ─────────────────────────────────────────────────────────────

async def _process(session: aiohttp.ClientSession, raw_tag: str) -> Optional[str]:
    """
    Procesa un jugador:
      - Descarga battlelog y perfil en paralelo (2 peticiones concurrentes).
      - Añade al estado global las partidas que aún no habíamos visto.
      - Devuelve el tag del club del jugador, si tiene uno.
    Los jugadores ya procesados se saltan sin petición adicional.
    """
    tag = _norm(raw_tag)
    if tag in _seen:
        return None
    _seen.add(tag)

    battles_raw, perfil = await asyncio.gather(
        _battlelog(session, tag),
        _profile(session, tag),
        return_exceptions=True,
    )

    if isinstance(battles_raw, Exception):
        battles_raw = []
    if isinstance(perfil, Exception):
        perfil = None

    _cnt["battlelogs"] += 1
    _cnt["jugadores"]  += 1
    _cnt["brutas"]     += len(battles_raw)

    for entry in battles_raw:
        key = _battle_key(entry)
        if key not in _battles:
            _battles[key] = _make_row(entry, tag)
            _cnt["unicas"] += 1

    _log()

    if perfil and isinstance(perfil, dict) and perfil.get("club"):
        return perfil["club"].get("tag")
    return None


# ─────────────────────────────────────────────────────────────
# Exportación
# ─────────────────────────────────────────────────────────────

def _export(rows: list[dict]) -> None:
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    print(f"  → {OUTPUT_JSON}  ({len(rows)} registros, todos los campos)")

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_COLS, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    print(f"  → {OUTPUT_CSV}  ({len(rows)} filas · columnas: {', '.join(CSV_COLS)})")


# ─────────────────────────────────────────────────────────────
# Orquestación
# ─────────────────────────────────────────────────────────────

async def main() -> None:
    global _rl
    _rl = _RateLimiter(CALLS_PER_SEC)

    if not API_KEY:
        sys.exit(
            "❌  API key no encontrada.\n"
            "    Añade en tu .env:  BRAWL_API_TOKEN=<tu_clave>\n"
            "    Obtén tu clave en: https://developer.brawlstars.com/"
        )

    print("━" * 56)
    print("  Recolector de partidas Brawl Stars · TFG")
    print("━" * 56)
    print(f"  API key cargada: ...{API_KEY[-12:]}  ({len(API_KEY)} chars)")

    async with aiohttp.ClientSession(
        connector=aiohttp.TCPConnector(limit=30)
    ) as session:

        # ── Fase 1: Ranking global ─────────────────────────────────────
        print(f"\n[1/4] Ranking global (top {TOP_PLAYERS}) …")
        ranking = await _get(session, "rankings/global/players", _verbose=True)
        if not ranking:
            # Intentar con la variante alternativa del endpoint
            print("      Probando endpoint alternativo (countryCode=global) …", flush=True)
            ranking = await _get(session, "rankings/global/players?limit=200", _verbose=True)
        if not ranking:
            sys.exit(
                "\n❌  No se pudo obtener el ranking global.\n"
                "   Causas más comunes:\n"
                "   1. IP no añadida en https://developer.brawlstars.com/ → API Keys → tu key → Allowed IP Addresses\n"
                "   2. La API key ha expirado o es incorrecta\n"
                "   3. La key es del entorno de pruebas, no de producción\n"
                "   Revisa el mensaje HTTP impreso arriba para más detalle."
            )
        top = ranking.get("items", [])[:TOP_PLAYERS]
        print(f"      {len(top)} jugadores obtenidos")

        # ── Fase 2: Battlelogs de los top jugadores ────────────────────
        print(f"\n[2/4] Battlelogs de {len(top)} jugadores …")
        print()

        results = await asyncio.gather(
            *[_process(session, p["tag"]) for p in top],
            return_exceptions=True,
        )

        club_tags: set[str] = {
            r for r in results
            if isinstance(r, str) and r
        }
        print(f"\n      {_cnt['unicas']} partidas únicas | "
              f"{len(club_tags)} clubs distintos encontrados")

        # ── Fase 3: Expansión con miembros de clubs ────────────────────
        to_expand = list(club_tags)[:MAX_CLUBS]
        _cnt["clubs"] = len(to_expand)
        print(f"\n[3/4] Miembros de {len(to_expand)} clubs …")
        print()

        member_lists = await asyncio.gather(
            *[_club_members(session, ct) for ct in to_expand],
            return_exceptions=True,
        )

        new_tags: list[str] = []
        for ml in member_lists:
            if isinstance(ml, list):
                for mt in ml:
                    if _norm(mt) not in _seen:
                        new_tags.append(mt)
        new_tags = list(dict.fromkeys(new_tags))  # quitar dups, preservar orden

        print(f"\n      {len(new_tags)} nuevos jugadores de clubs")
        print()

        await asyncio.gather(
            *[_process(session, t) for t in new_tags],
            return_exceptions=True,
        )
        print(f"\n      {_cnt['unicas']} partidas únicas en total")

        # ── Fase 4: Guardar ────────────────────────────────────────────
        print(f"\n[4/4] Guardando resultados …")
        _export(list(_battles.values()))

    c = _cnt
    print(f"\n{'━' * 56}")
    print(f"  RESUMEN")
    print(f"{'━' * 56}")
    print(f"  Jugadores procesados  : {c['jugadores']}")
    print(f"  Clubs expandidos      : {c['clubs']}")
    print(f"  Battlelogs obtenidos  : {c['battlelogs']}")
    print(f"  Partidas brutas       : {c['brutas']}")
    print(f"  Partidas únicas       : {c['unicas']}")
    print(f"{'━' * 56}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n\n  Interrumpido. {_cnt['unicas']} partidas recolectadas hasta ahora.")
        if _battles:
            print("  Guardando datos …")
            _export(list(_battles.values()))
