import csv
import random
from pathlib import Path

random.seed(42)

OUT_DIR = Path("data/grids")
OUT_DIR.mkdir(parents=True, exist_ok=True)

TIERS = list(range(1, 11))          # 1-10
TERMS = list(range(2, 8))           # 2-7

# FICO bins from 600-850
FICO_BINS = [(600,619),(620,639),(640,659),(660,679),(680,699),
             (700,719),(720,739),(740,759),(760,779),(780,799),
             (800,819),(820,839),(840,850)]

# Loan amount buckets 0-100000
AMT_BUCKETS = [(0,9999),(10000,19999),(20000,29999),(30000,39999),(40000,49999),
               (50000,59999),(60000,69999),(70000,79999),(80000,89999),(90000,100000)]

CHANNELS = ["Affiliate", "NonAffiliate"]
MEMBER_STAT = ["Member", "NonMember"]

RATE_MIN = 0.03200
RATE_MAX = 0.06990

def fmt_bin(lo, hi):
    return f"{lo}-{hi}"

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def tier_effect(tier: int) -> float:
    # Strictly increasing. Roughly +10 bps per tier step.
    return (tier - 1) * 0.0010

def term_effect(term: int) -> float:
    # Strictly increasing. Roughly +12 bps per term step.
    return (term - 2) * 0.0012

def fico_credit(fico_lo: int, fico_hi: int) -> float:
    # Higher FICO lowers rate. Use midpoint.
    mid = (fico_lo + fico_hi) / 2.0
    # From 600 to 850 gives ~ -220 bps range
    return (mid - 600) * 0.000088  # 250 points * 8.8 bps ≈ 220 bps

def loan_effect(amt_lo: int, amt_hi: int) -> float:
    # Small effect: larger loans slightly better pricing (negative), but mild.
    mid = (amt_lo + amt_hi) / 2.0
    return - (mid / 100000.0) * 0.0006  # up to -6 bps

def channel_adjust(channel: str) -> float:
    return -0.0015 if channel == "Affiliate" else 0.0  # -15 bps

def member_adjust(member: str) -> float:
    return -0.0010 if member == "Member" else 0.0      # -10 bps

def generate_grid(grid_id: str, intercept: float, noise_bps: float = 0.0):
    """
    intercept: baseline rate before effects (e.g., 0.050)
    noise_bps: optional tiny jitter to make diffs interesting (0 keeps perfect monotonic)
    """
    path = OUT_DIR / f"{grid_id}.csv"
    with path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Tier","Term","Fico","Loan.Amount","Channel","Member","Fixed.Rate"])

        for tier in TIERS:
            for term in TERMS:
                for (f_lo, f_hi) in FICO_BINS:
                    for (a_lo, a_hi) in AMT_BUCKETS:
                        for ch in CHANNELS:
                            for mem in MEMBER_STAT:
                                rate = (
                                    intercept
                                    + tier_effect(tier)
                                    + term_effect(term)
                                    - fico_credit(f_lo, f_hi)
                                    + loan_effect(a_lo, a_hi)
                                    + channel_adjust(ch)
                                    + member_adjust(mem)
                                )

                                if noise_bps > 0:
                                    # jitter in bps, but keep small to avoid monotonic violations
                                    rate += random.uniform(-noise_bps, noise_bps) / 10000.0

                                rate = clamp(rate, RATE_MIN, RATE_MAX)
                                w.writerow([
                                    tier,
                                    term,
                                    fmt_bin(f_lo, f_hi),
                                    fmt_bin(a_lo, a_hi),
                                    ch,
                                    mem,
                                    f"{rate:.5f}",
                                ])
    return path

if __name__ == "__main__":
    grids = [
        ("AA", 0.0495, 0.0),  # long-run baseline
        ("AB", 0.0500, 0.0),
        ("AC", 0.0506, 0.0),
        ("AD", 0.0511, 0.0),
        ("AE", 0.0492, 0.0),  # lower-rate acquisition
        ("AF", 0.0509, 0.0),
        ("AG", 0.0514, 0.0),
        ("AH", 0.0518, 0.0),
        ("AI", 0.0522, 0.0),
    ]

    for grid_id, intercept, noise_bps in grids:
        path = generate_grid(grid_id, intercept=intercept, noise_bps=noise_bps)
        print("Wrote:", path)