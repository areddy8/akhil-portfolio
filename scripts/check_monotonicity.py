import pandas as pd

def check(df: pd.DataFrame):
    df["Fixed.Rate"] = df["Fixed.Rate"].astype(float)

    # Check Tier monotonic: for each slice of other dims, rate increases as Tier increases
    group_cols = ["Term","Fico","Loan.Amount","Channel","Member"]
    for _, g in df.sort_values(["Tier"]).groupby(group_cols):
        rates = g.sort_values("Tier")["Fixed.Rate"].values
        if (rates[1:] < rates[:-1]).any():
            return False, ("Tier", g.head(1).to_dict("records")[0])

    # Check Term monotonic: for each slice, rate increases as Term increases
    group_cols = ["Tier","Fico","Loan.Amount","Channel","Member"]
    for _, g in df.sort_values(["Term"]).groupby(group_cols):
        rates = g.sort_values("Term")["Fixed.Rate"].values
        if (rates[1:] < rates[:-1]).any():
            return False, ("Term", g.head(1).to_dict("records")[0])

    return True, None

if __name__ == "__main__":
    for grid_id in ["AB","AC"]:
        df = pd.read_csv(f"data/grids/{grid_id}.csv")
        ok, info = check(df)
        print(grid_id, "OK" if ok else f"FAIL {info}")