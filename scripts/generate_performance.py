import csv
from datetime import date, timedelta

OUT_PATH = "data/performance/performance.csv"
SCHEDULE_PATH = "data/experiments/experiment_schedule.csv"

GRID_EFFECTS = {
    "AA": 0.01,
    "AB": 0.00,
    "AC": -0.01,
    "AD": -0.015,
    "AE": 0.008,
    "AF": -0.006,
    "AG": -0.02,
    "AH": -0.012,
    "AI": -0.018,
}

GRID_APR = {
    "AA": 0.0508,
    "AB": 0.0512,
    "AC": 0.0520,
    "AD": 0.0526,
    "AE": 0.0504,
    "AF": 0.0522,
    "AG": 0.0531,
    "AH": 0.0536,
    "AI": 0.0542,
}


def daterange(start: date, end: date, step_days: int = 7):
    current = start
    while current <= end:
        yield current
        current += timedelta(days=step_days)


def parse_date(value: str) -> date:
    year, month, day = value.split("-")
    return date(int(year), int(month), int(day))


def load_schedule():
    windows = []
    with open(SCHEDULE_PATH) as f:
        reader = csv.DictReader(f)
        for row in reader:
            windows.append(
                (
                    parse_date(row["Experiment Start"]),
                    parse_date(row["Experiment End"]),
                    row["Grid"],
                )
            )
    return windows


def active_grids(current: date, windows):
    active = []
    for start, end, grid in windows:
        if start <= current <= end:
            active.append(grid)
    return list(sorted(set(active)))


def generate_row(current: date, grid_id: str):
    base_apps = 900
    grid_effect = GRID_EFFECTS[grid_id]
    seasonal = 40 * (current.month - 1) / 5
    applications = int(base_apps + seasonal + 20 * grid_effect * 100)
    approval_rate = 0.42 + grid_effect
    approvals = int(applications * approval_rate)
    booked_rate = 0.58 + grid_effect / 2
    booked = int(approvals * booked_rate)
    apr = GRID_APR[grid_id]

    return [
        current.isoformat(),
        grid_id,
        applications,
        approvals,
        booked,
        f"{apr:.4f}",
    ]


if __name__ == "__main__":
    start = parse_date("2025-10-01")
    end = parse_date("2026-06-30")
    windows = load_schedule()

    rows = []
    for current in daterange(start, end, step_days=7):
        grids = active_grids(current, windows)
        for grid_id in grids:
            if grid_id not in GRID_EFFECTS:
                continue
            rows.append(generate_row(current, grid_id))

    with open(OUT_PATH, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["Date", "Grid", "Applications", "Approvals", "Booked", "APR"])
        writer.writerows(rows)

    print("Wrote:", OUT_PATH, "rows:", len(rows))
