"""
Fetch NBA shot chart + career stats for select players via nba_api.
Saves lightweight JSON files into data/nba/.
"""

import sys, os, json, time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '.pylibs'))

from nba_api.stats.endpoints import shotchartdetail, playercareerstats
from nba_api.stats.static import players

OUT = os.path.join(os.path.dirname(__file__), '..', 'data', 'nba')
os.makedirs(OUT, exist_ok=True)

# Notable players — diverse play-styles for interesting shot charts
PLAYERS = [
    {"name": "Stephen Curry",   "id": 201939,  "seasons": ["2023-24", "2022-23", "2021-22"]},
    {"name": "LeBron James",    "id": 2544,     "seasons": ["2023-24", "2022-23", "2021-22"]},
    {"name": "Kevin Durant",    "id": 201142,   "seasons": ["2023-24", "2022-23", "2021-22"]},
    {"name": "Luka Doncic",     "id": 1629029,  "seasons": ["2023-24", "2022-23", "2021-22"]},
    {"name": "Nikola Jokic",    "id": 203999,   "seasons": ["2023-24", "2022-23", "2021-22"]},
    {"name": "Giannis Antetokounmpo", "id": 203507, "seasons": ["2023-24", "2022-23", "2021-22"]},
]

def fetch_shots(player_id, season):
    """Fetch shot chart data for a player/season."""
    print(f"  Fetching shots for player {player_id}, season {season}...")
    try:
        data = shotchartdetail.ShotChartDetail(
            team_id=0,
            player_id=player_id,
            season_nullable=season,
            context_measure_simple='FGA',
        )
        df = data.get_data_frames()[0]
        shots = []
        for _, row in df.iterrows():
            shots.append({
                "x": int(row["LOC_X"]),
                "y": int(row["LOC_Y"]),
                "made": int(row["SHOT_MADE_FLAG"]),
                "type": row["SHOT_TYPE"],
                "zone": row["SHOT_ZONE_BASIC"],
                "area": row["SHOT_ZONE_AREA"],
                "range": row["SHOT_ZONE_RANGE"],
                "distance": int(row["SHOT_DISTANCE"]),
                "action": row["ACTION_TYPE"],
                "quarter": int(row["PERIOD"]),
            })
        return shots
    except Exception as e:
        print(f"    Error: {e}")
        return []


def fetch_career(player_id):
    """Fetch career regular-season stats."""
    print(f"  Fetching career stats for player {player_id}...")
    try:
        career = playercareerstats.PlayerCareerStats(player_id=player_id)
        df = career.season_totals_regular_season.get_data_frame()
        seasons = []
        for _, row in df.iterrows():
            seasons.append({
                "season": row["SEASON_ID"],
                "team": row["TEAM_ABBREVIATION"],
                "gp": int(row["GP"]),
                "pts": float(row["PTS"]),
                "reb": float(row["REB"]),
                "ast": float(row["AST"]),
                "fgPct": round(float(row["FG_PCT"] or 0), 3),
                "fg3Pct": round(float(row["FG3_PCT"] or 0), 3),
                "ftPct": round(float(row["FT_PCT"] or 0), 3),
                "min": float(row["MIN"]),
            })
        return seasons
    except Exception as e:
        print(f"    Error: {e}")
        return []


def main():
    all_data = []

    for p in PLAYERS:
        print(f"\n=== {p['name']} ===")
        player_obj = {
            "id": p["id"],
            "name": p["name"],
            "shots": {},
            "career": [],
        }

        # Career stats
        player_obj["career"] = fetch_career(p["id"])
        time.sleep(1)  # rate limit

        # Shot charts per season
        for season in p["seasons"]:
            shots = fetch_shots(p["id"], season)
            player_obj["shots"][season] = shots
            print(f"    -> {len(shots)} shots")
            time.sleep(1)  # rate limit

        all_data.append(player_obj)

    # Write combined file
    out_path = os.path.join(OUT, "players.json")
    with open(out_path, "w") as f:
        json.dump(all_data, f)
    print(f"\nWrote {out_path} ({os.path.getsize(out_path) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
