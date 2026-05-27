import math
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from models.round import RoundHole

# Expected strokes to complete hole by lie type and distance (yards)
# Based on simplified PGA Tour averages from Broadie's research

_TEE = {
    100: 2.87, 125: 2.93, 150: 3.00, 175: 3.08, 200: 3.15, 225: 3.28, 250: 3.42,
    300: 3.61, 325: 3.68, 350: 3.77, 375: 3.85, 400: 3.93, 425: 4.00, 450: 4.07,
    475: 4.14, 500: 4.22, 525: 4.29, 550: 4.37, 575: 4.45, 600: 4.53, 650: 4.69,
}

_FAIRWAY = {
    0: 0, 5: 1.05, 10: 1.55, 15: 1.75, 20: 1.92, 25: 2.08, 30: 2.20, 40: 2.34,
    50: 2.46, 60: 2.55, 75: 2.66, 100: 2.80, 125: 2.92, 150: 3.04, 175: 3.17,
    200: 3.31, 225: 3.44, 250: 3.57, 275: 3.70, 300: 3.83,
}

_ROUGH = {
    0: 0, 5: 1.15, 10: 1.68, 15: 1.90, 20: 2.10, 25: 2.26, 30: 2.38, 40: 2.52,
    50: 2.66, 60: 2.75, 75: 2.87, 100: 3.01, 125: 3.14, 150: 3.27, 175: 3.41,
    200: 3.55, 225: 3.68, 250: 3.81,
}

_BUNKER = {
    0: 0, 5: 1.35, 10: 1.95, 15: 2.18, 20: 2.38, 25: 2.55, 30: 2.70, 40: 2.84,
    50: 2.95, 60: 3.05, 75: 3.17, 100: 3.32, 125: 3.46, 150: 3.60, 175: 3.74,
    200: 3.88,
}

# Green distances in yards (1 yard ≈ 3 feet)
_GREEN = {
    0: 0, 1: 1.01, 2: 1.06, 3: 1.14, 4: 1.20, 5: 1.28, 7: 1.45, 10: 1.64,
    13: 1.79, 17: 1.94, 20: 2.06, 25: 2.17, 30: 2.26, 40: 2.38, 50: 2.48,
}

_PENALTY = {
    5: 2.45, 10: 2.72, 20: 2.98, 30: 3.18, 50: 3.40, 75: 3.55,
    100: 3.70, 125: 3.83, 150: 3.97, 175: 4.11, 200: 4.25,
}

_TABLES: dict[str, dict] = {
    "tee": _TEE,
    "fairway": _FAIRWAY,
    "rough": _ROUGH,
    "bunker": _BUNKER,
    "green": _GREEN,
    "penalty": _PENALTY,
}


def _interpolate(table: dict, distance: float) -> float:
    keys = sorted(table.keys())
    if distance <= keys[0]:
        return table[keys[0]]
    if distance >= keys[-1]:
        return table[keys[-1]]
    for i in range(len(keys) - 1):
        k1, k2 = keys[i], keys[i + 1]
        if k1 <= distance <= k2:
            t = (distance - k1) / (k2 - k1)
            return table[k1] + t * (table[k2] - table[k1])
    return table[keys[-1]]


def haversine_yards(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0
    rlat1, rlon1, rlat2, rlon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    dlat, dlon = rlat2 - rlat1, rlon2 - rlon1
    a = math.sin(dlat / 2) ** 2 + math.cos(rlat1) * math.cos(rlat2) * math.sin(dlon / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a)) * 1.09361


def expected_strokes(distance_yards: float, lie_type: str) -> float:
    return _interpolate(_TABLES.get(lie_type, _FAIRWAY), distance_yards)


def _sg_category(shot_number: int, lie_type: str, distance_yards: float, par: int) -> str:
    if shot_number == 1 and par >= 4:
        return "off_tee"
    if lie_type == "green":
        return "putting"
    if distance_yards <= 100:
        return "around_green"
    return "approach"


def compute_and_store_hole_sg(hole: "RoundHole") -> None:
    """Update distance_to_pin and stroke_gained on all shots in a completed hole."""
    if not hole.is_complete or hole.pin_latitude is None or hole.pin_longitude is None:
        return

    shots = sorted(hole.shots, key=lambda s: s.shot_number)
    for i, shot in enumerate(shots):
        if shot.latitude is None or shot.longitude is None:
            continue
        dist = haversine_yards(shot.latitude, shot.longitude, hole.pin_latitude, hole.pin_longitude)
        shot.distance_to_pin_yards = dist
        exp_start = expected_strokes(dist, shot.lie_type)

        if i + 1 < len(shots):
            nxt = shots[i + 1]
            if nxt.latitude is not None and nxt.longitude is not None:
                dist_end = haversine_yards(
                    nxt.latitude, nxt.longitude, hole.pin_latitude, hole.pin_longitude
                )
                exp_end = expected_strokes(dist_end, nxt.lie_type)
            else:
                exp_end = 0.0
        else:
            exp_end = 0.0

        shot.stroke_gained = round(exp_start - exp_end - 1.0, 3)


def calculate_hole_sg(hole: "RoundHole") -> dict:
    empty = {"total": 0.0, "off_tee": 0.0, "approach": 0.0, "around_green": 0.0, "putting": 0.0}
    if not hole.is_complete or hole.pin_latitude is None or hole.pin_longitude is None:
        return empty

    shots = sorted(hole.shots, key=lambda s: s.shot_number)
    if not shots:
        return empty

    result = {"total": 0.0, "off_tee": 0.0, "approach": 0.0, "around_green": 0.0, "putting": 0.0}
    for i, shot in enumerate(shots):
        if shot.latitude is None or shot.longitude is None:
            continue
        dist = haversine_yards(shot.latitude, shot.longitude, hole.pin_latitude, hole.pin_longitude)
        exp_start = expected_strokes(dist, shot.lie_type)

        if i + 1 < len(shots):
            nxt = shots[i + 1]
            if nxt.latitude is not None and nxt.longitude is not None:
                dist_end = haversine_yards(
                    nxt.latitude, nxt.longitude, hole.pin_latitude, hole.pin_longitude
                )
                exp_end = expected_strokes(dist_end, nxt.lie_type)
            else:
                exp_end = 0.0
        else:
            exp_end = 0.0

        sg = exp_start - exp_end - 1.0
        cat = _sg_category(shot.shot_number, shot.lie_type, dist, hole.par)
        result[cat] += sg
        result["total"] += sg

    return result


def calculate_round_sg(holes: list["RoundHole"]) -> dict:
    total = {"total": 0.0, "off_tee": 0.0, "approach": 0.0, "around_green": 0.0, "putting": 0.0}
    for hole in holes:
        if hole.is_complete:
            hsg = calculate_hole_sg(hole)
            for k in total:
                total[k] += hsg[k]
    return total
