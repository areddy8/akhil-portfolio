import csv
import random
from pathlib import Path

random.seed(42)

OUT_DIR = Path("data/population")
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT_PATH = OUT_DIR / "population_2025.csv"
GRIDS_DIR = Path("data/grids")

ROWS = 20000

TIERS = list(range(1, 11))
TERMS = [2, 3, 4, 5, 6, 7]
FICO_BINS = [
    (600, 619),
    (620, 639),
    (640, 659),
    (660, 679),
    (680, 699),
    (700, 719),
    (720, 739),
    (740, 759),
    (760, 779),
    (780, 799),
    (800, 819),
    (820, 839),
    (840, 850),
]
LOAN_PURPOSES = [
    "DebtConsolidation",
    "HomeImprovement",
    "Auto",
    "Medical",
    "MajorPurchase",
]
MEMBER_STATUS = ["Member", "NonMember"]
AFFILIATE_CHANNELS = ["Affiliate", "NonAffiliate"]

AMT_BUCKETS = [
    (0, 9999),
    (10000, 19999),
    (20000, 29999),
    (30000, 39999),
    (40000, 49999),
    (50000, 59999),
    (60000, 69999),
    (70000, 79999),
    (80000, 89999),
    (90000, 100000),
]


def fico_to_tier(fico: int) -> int:
    if fico >= 800:
        return random.choice([1, 2])
    if fico >= 760:
        return random.choice([2, 3, 4])
    if fico >= 720:
        return random.choice([3, 4, 5])
    if fico >= 680:
        return random.choice([4, 5, 6])
    if fico >= 640:
        return random.choice([6, 7, 8])
    return random.choice([8, 9, 10])


def sample_fico() -> int:
    lo, hi = random.choice(FICO_BINS)
    return random.randint(lo, hi)


def sample_income(fico: int) -> int:
    base = 35000 + max(fico - 600, 0) * 220
    noise = random.randint(-8000, 12000)
    return max(20000, base + noise)


def sample_term(purpose: str) -> int:
    if purpose in ("HomeImprovement", "MajorPurchase"):
        return random.choices(TERMS, weights=[1, 2, 3, 3, 2, 1])[0]
    if purpose == "Auto":
        return random.choices(TERMS, weights=[3, 3, 2, 1, 1, 1])[0]
    return random.choice(TERMS)


def sample_member(fico: int) -> str:
    return "Member" if random.random() < (0.45 + (fico - 600) / 1000) else "NonMember"


def sample_channel() -> str:
    return random.choices(AFFILIATE_CHANNELS, weights=[0.35, 0.65])[0]


def format_bin(lo: int, hi: int) -> str:
    return f"{lo}-{hi}"


def fico_bin(fico: int) -> str:
    for lo, hi in FICO_BINS:
        if lo <= fico <= hi:
            return format_bin(lo, hi)
    return format_bin(FICO_BINS[0][0], FICO_BINS[0][1])


def amt_bin(amount: int) -> str:
    for lo, hi in AMT_BUCKETS:
        if lo <= amount <= hi:
            return format_bin(lo, hi)
    return format_bin(AMT_BUCKETS[-1][0], AMT_BUCKETS[-1][1])


def load_grid_rates() -> dict:
    grids = {}
    for path in GRIDS_DIR.glob("*.csv"):
        grid_id = path.stem
        with path.open() as f:
            reader = csv.DictReader(f)
            grid_map = {}
            for row in reader:
                key = (
                    row["Tier"],
                    row["Term"],
                    row["Fico"],
                    row["Loan.Amount"],
                    row["Channel"],
                    row["Member"],
                )
                grid_map[key] = float(row["Fixed.Rate"])
            grids[grid_id] = grid_map
    return grids


def sample_loan_amount(fico: int) -> int:
    base = 12000 + max(fico - 600, 0) * 120
    noise = random.randint(-6000, 18000)
    return max(2000, min(100000, base + noise))


def approval_probability(fico: int, income: int, term: int, rate: float) -> float:
    score = 0.35 + (fico - 600) / 800
    score += (income - 30000) / 200000
    score -= (term - 2) * 0.02
    score -= (rate - 0.045) * 2
    return max(0.05, min(0.95, score))


def conversion_probability(approved: bool, member: str, channel: str) -> float:
    if not approved:
        return 0.0
    base = 0.55 if member == "Member" else 0.45
    if channel == "Affiliate":
        base -= 0.05
    return max(0.1, min(0.9, base))


def generate_row(grid_rates: dict, grid_ids: list) -> dict:
    fico = sample_fico()
    purpose = random.choice(LOAN_PURPOSES)
    tier = fico_to_tier(fico)
    term = sample_term(purpose)
    income = sample_income(fico)
    member = sample_member(fico)
    channel = sample_channel()
    loan_amount = sample_loan_amount(fico)
    grid_id = random.choice(grid_ids)
    key = (
        str(tier),
        str(term),
        fico_bin(fico),
        amt_bin(loan_amount),
        channel,
        member,
    )
    rate_selected = grid_rates.get(grid_id, {}).get(key, 0.0)
    if rate_selected == 0.0:
        rate_selected = random.uniform(0.045, 0.065)

    approve_prob = approval_probability(fico, income, term, rate_selected)
    approved = 1 if random.random() < approve_prob else 0
    declined = 1 - approved

    doc_upload = 1 if approved and random.random() < 0.75 else 0
    conversion_prob = conversion_probability(bool(approved), member, channel)
    converted = 1 if random.random() < conversion_prob else 0
    ds_to_signed = random.randint(1, 10) if converted else ""

    return {
        "Tier": tier,
        "Income": income,
        "Term": term,
        "Loan Purpose": purpose,
        "FICO": fico,
        "Member": member,
        "Affiliate Channel": channel,
        "Grid Assigned": grid_id,
        "Loan Amount": loan_amount,
        "Rate Selected": f"{rate_selected:.5f}",
        "WAC": f"{rate_selected:.5f}",
        "Approved": approved,
        "Declined": declined,
        "Conversion Rate": f"{conversion_prob:.3f}",
        "Converted": converted,
        "Doc Upload": doc_upload,
        "DS to Signed (days)": ds_to_signed,
    }


if __name__ == "__main__":
    grid_rates = load_grid_rates()
    grid_ids = list(grid_rates.keys()) or ["AB"]
    with OUT_PATH.open("w", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "Tier",
                "Income",
                "Term",
                "Loan Purpose",
                "FICO",
                "Member",
                "Affiliate Channel",
                "Grid Assigned",
                "Loan Amount",
                "Rate Selected",
                "WAC",
                "Approved",
                "Declined",
                "Conversion Rate",
                "Converted",
                "Doc Upload",
                "DS to Signed (days)",
            ],
        )
        writer.writeheader()
        for _ in range(ROWS):
            writer.writerow(generate_row(grid_rates, grid_ids))

    print("Wrote:", OUT_PATH, "rows:", ROWS)
