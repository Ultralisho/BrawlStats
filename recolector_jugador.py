#!/usr/bin/env python3
"""
recolector_jugador.py  –  Recolección centrada en un jugador específico
=======================================================================
Trabajo de Fin de Grado

Pipeline:
  1. Battlelog del jugador semilla (#GLGGQQCC)
  2. Extracción de todos los tags con los que jugó (compañeros + rivales)
  3. Battlelog de cada uno de esos jugadores
  4. Expansión por clanes: clan del semilla + clanes de sus oponentes
  5. Battlelogs de miembros de esos clanes
  6. Deduplicación + exportación

Instalación:
  pip install aiohttp

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

SEED_TAG      = "#2LO8J0VRCL"             # jugador de origen
API_KEY       = (
    _env.get("BRAWL_API_TOKEN") or _env.get("BRAWL_API_KEY")
    or os.getenv("BRAWL_API_TOKEN") or os.getenv("BRAWL_API_KEY")
    or ""
).strip()
BASE_URL      = "https://api.brawlstars.com/v1"
CALLS_PER_SEC = 5
MAX_CLUBS     = 50       # clubs máximos a expandir (fase 4)
OUTPUT_JSON   = "partidas_jugador.json"
OUTPUT_CSV    = "partidas_jugador.csv"

CSV_COLS = ["fecha", "modo", "mapa", "resultado", "brawler", "trofeos_brawler"]

# ─────────────────────────────────────────────────────────────
# Estado global
# ─────────────────────────────────────────────────────────────

_battles: dict[str, dict] = {}
_seen:    set[str]         = set()
_cnt = dict(jugadores=0, clubs=0, battlelogs=0, brutas=0, unicas=0)
_rl: Optional["_RateLimiter"] = None


# ─────────────────────────────────────────────────────────────
# Rate limiter
# ─────────────────────────────────────────────────────────────

class _RateLimiter:
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
    t = tag.strip().upper()
    return t if t.startswith("#") else f"#{t}"

def _enc(tag: str) -> str:
    return tag.replace("#", "%23")

def _battle_key(entry: dict) -> str:
    b = entry.get("battle", {})
    tags: list[str] = []
    for team in b.get("teams", []):
        for p in team:
            tags.append(p.get("tag", ""))
    for p in b.get("players", []):
        tags.append(p.get("tag", ""))
    return f"{entry.get('battleTime', '')}|{'|'.join(sorted(tags))}"

def _participants(entry: dict) -> list[str]:
    """Devuelve todos los tags de participantes de una batalla."""
    b = entry.get("battle", {})
    tags: list[str] = []
    for team in b.get("teams", []):
        for p in team:
            if p.get("tag"):
                tags.append(_norm(p["tag"]))
    for p in b.get("players", []):
        if p.get("tag"):
            tags.append(_norm(p["tag"]))
    return tags

def _parse_dt(bt: str) -> str:
    try:
        return datetime.strptime(bt, "%Y%m%dT%H%M%S.%fZ").strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return bt

def _make_row(entry: dict, player_tag: str) -> dict:
    event = entry.get("event", {})
    b     = entry.get("battle", {})
    ptag  = player_tag.upper()

    brawler = "?"
    trofeos: Optional[int] = None

    for team in b.get("teams", []):
        for p in team:
            if p.get("tag", "").upper() == ptag:
                br      = p.get("brawler", {})
                brawler = br.get("name", "?")
                trofeos = br.get("trophies")
                break

    if brawler == "?":
        for p in b.get("players", []):
            if p.get("tag", "").upper() == ptag:
                br      = p.get("brawler", {})
                brawler = br.get("name", "?")
                trofeos = br.get("trophies")
                break

    return {
        "fecha":           _parse_dt(entry.get("battleTime", "")),
        "modo":            event.get("mode") or b.get("mode", "?"),
        "mapa":            event.get("map", "?"),
        "resultado":       b.get("result", "?"),
        "brawler":         brawler,
        "trofeos_brawler": trofeos,
        "_player_tag":    player_tag,
        "_battle_time":   entry.get("battleTime", ""),
        "_event_id":      event.get("id"),
        "_type":          b.get("type", "?"),
        "_rank":          b.get("rank"),
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
    async with _rl():
        try:
            async with session.get(
                f"{BASE_URL}/{path}",
                headers={"Authorization": f"Bearer {API_KEY}"},
                timeout=aiohttp.ClientTimeout(total=20),
            ) as r:
                if r.status == 200:
                    return await r.json()
                if _verbose:
                    body = await r.text()
                    print(f"\n  ⚠  HTTP {r.status} en /{path}: {body[:200]}", flush=True)
                if r.status == 429:
                    await asyncio.sleep(2)
                return None
        except (asyncio.TimeoutError, aiohttp.ClientError):
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
    """Procesa un jugador: battlelog + perfil en paralelo. Devuelve tag del clan."""
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


async def _process_seed(session: aiohttp.ClientSession, tag: str) -> tuple[list[str], Optional[str]]:
    """
    Procesa el jugador semilla.
    Devuelve (lista de tags de participantes en sus partidas, tag del clan).
    """
    tag = _norm(tag)
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

    participant_tags: set[str] = set()
    for entry in battles_raw:
        key = _battle_key(entry)
        if key not in _battles:
            _battles[key] = _make_row(entry, tag)
            _cnt["unicas"] += 1
        for ptag in _participants(entry):
            if ptag != tag:
                participant_tags.add(ptag)

    _log()

    club_tag = None
    if perfil and isinstance(perfil, dict) and perfil.get("club"):
        club_tag = perfil["club"].get("tag")

    return list(participant_tags), club_tag


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

    print("━" * 58)
    print(f"  Recolector centrado en jugador · TFG")
    print(f"  Semilla: {SEED_TAG}")
    print("━" * 58)
    print(f"  API key: ...{API_KEY[-12:]}  ({len(API_KEY)} chars)")

    async with aiohttp.ClientSession(
        connector=aiohttp.TCPConnector(limit=30)
    ) as session:

        # ── Fase 1: Jugador semilla ────────────────────────────────────
        print(f"\n[1/4] Procesando jugador semilla {SEED_TAG} …")
        print()
        participant_tags, seed_club = await _process_seed(session, SEED_TAG)
        print(f"\n      {_cnt['unicas']} partidas del semilla │ "
              f"{len(participant_tags)} participantes encontrados")
        if seed_club:
            print(f"      Club del semilla: {seed_club}")

        # ── Fase 2: Battlelogs de participantes ────────────────────────
        new_tags = [t for t in participant_tags if t not in _seen]
        print(f"\n[2/4] Battlelogs de {len(new_tags)} participantes …")
        print()

        results = await asyncio.gather(
            *[_process(session, t) for t in new_tags],
            return_exceptions=True,
        )

        club_tags: set[str] = {
            r for r in results
            if isinstance(r, str) and r
        }
        if seed_club:
            club_tags.add(seed_club)

        print(f"\n      {_cnt['unicas']} partidas únicas │ "
              f"{len(club_tags)} clubs distintos")

        # ── Fase 3: Expansión por clanes ───────────────────────────────
        to_expand = list(club_tags)[:MAX_CLUBS]
        _cnt["clubs"] = len(to_expand)
        print(f"\n[3/4] Miembros de {len(to_expand)} clanes …")
        print()

        member_lists = await asyncio.gather(
            *[_club_members(session, ct) for ct in to_expand],
            return_exceptions=True,
        )

        clan_tags: list[str] = []
        for ml in member_lists:
            if isinstance(ml, list):
                for mt in ml:
                    if _norm(mt) not in _seen:
                        clan_tags.append(mt)
        clan_tags = list(dict.fromkeys(clan_tags))

        print(f"\n      {len(clan_tags)} miembros nuevos de clanes")
        print()

        await asyncio.gather(
            *[_process(session, t) for t in clan_tags],
            return_exceptions=True,
        )
        print(f"\n      {_cnt['unicas']} partidas únicas en total")

        # ── Fase 4: Guardar ────────────────────────────────────────────
        print(f"\n[4/4] Guardando resultados …")
        _export(list(_battles.values()))

    c = _cnt
    print(f"\n{'━' * 58}")
    print(f"  RESUMEN")
    print(f"{'━' * 58}")
    print(f"  Jugadores procesados  : {c['jugadores']}")
    print(f"  Clanes expandidos     : {c['clubs']}")
    print(f"  Battlelogs obtenidos  : {c['battlelogs']}")
    print(f"  Partidas brutas       : {c['brutas']}")
    print(f"  Partidas únicas       : {c['unicas']}")
    print(f"{'━' * 58}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n\n  Interrumpido. {_cnt['unicas']} partidas recolectadas hasta ahora.")
        if _battles:
            print("  Guardando datos parciales …")
            _export(list(_battles.values()))
