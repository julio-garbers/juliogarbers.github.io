"""Reliability gating and the two adoption-rate estimators — pandas build.

Estimator A — Observed share: AI-positive / observed firms.
Estimator B — Representative: post-stratification on industry section x size,
              weighted to the population active that month, with sub-threshold
              cells collapsed to their section margin then to the overall rate.

Display follows official statistical practice: a share is shown only when the
denominator clears MIN_OBS (=30); below that it is suppressed, never shown as
zero or blank. Wide confidence intervals flag "use with caution".

This is a faithful pandas/numpy re-expression of the polars original; numeric
parity against it is asserted by the parity test before deployment.
"""

import numpy as np
import pandas as pd

MIN_OBS = 30          # minimum observed firms to publish a share
CAUTION_CI_WIDTH = 0.20   # 95% CI wider than this -> "use with caution"
Z = 1.959963985        # 95% normal quantile


# =============================================================================
# Wilson score interval (vectorised with numpy)
# =============================================================================

def _wilson(pos: np.ndarray, n: np.ndarray):
    """Return (rate, lo, hi) arrays for a Wilson 95% interval. Entries with
    n <= 0 are NaN."""
    pos = np.asarray(pos, dtype=float)
    n = np.asarray(n, dtype=float)
    with np.errstate(divide="ignore", invalid="ignore"):
        p = pos / n
        denom = 1 + Z**2 / n
        center = (p + Z**2 / (2 * n)) / denom
        margin = (Z / denom) * np.sqrt(p * (1 - p) / n + Z**2 / (4 * n**2))
        rate = np.where(n > 0, p, np.nan)
        lo = np.where(n > 0, np.clip(center - margin, 0, 1), np.nan)
        hi = np.where(n > 0, np.clip(center + margin, 0, 1), np.nan)
    return rate, lo, hi


def add_observed_rate(df: pd.DataFrame, pos="n_true", obs="observed") -> pd.DataFrame:
    """Add rate / lo / hi / tier columns from positives + observed denominator."""
    df = df.copy()
    n = df[obs].to_numpy(dtype=float)
    rate, lo, hi = _wilson(df[pos].to_numpy(dtype=float), n)
    df["rate_obs"] = rate
    df["ci_lo"] = lo
    df["ci_hi"] = hi
    width = hi - lo
    df["tier"] = np.where(
        n < MIN_OBS,
        "suppressed",
        np.where(width >= CAUTION_CI_WIDTH, "caution", "reliable"),
    )
    # suppressed cells carry no displayable rate
    df["rate_display"] = np.where(n >= MIN_OBS, rate, np.nan)
    return df


# =============================================================================
# Estimator B — post-stratified, time-varying population weights
# =============================================================================

def weighted_series(strata: pd.DataFrame) -> pd.DataFrame:
    """Post-stratified adoption rate per (year, month).

    `strata` must have: sec_code, size_classification, year, month,
    n_true, n_false, n_null. Population weight of a stratum-month is the total
    firms active there (n_true+n_false+n_null). Cells with < MIN_OBS observed
    firms borrow the section-margin rate, then the overall rate.
    """
    base = strata.copy()
    base["pos"] = base["n_true"]
    base["obs"] = base["n_true"] + base["n_false"]
    base["pop"] = base["n_true"] + base["n_false"] + base["n_null"]

    # Section margin: rate + population per (section, month). dropna=False keeps
    # the unknown-section group, matching polars group_by (which keeps nulls).
    sec = (
        base.groupby(["sec_code", "year", "month"], as_index=False, dropna=False)
        .agg(pos_sec=("pos", "sum"), obs_sec=("obs", "sum"), pop_sec=("pop", "sum"))
    )
    sec["p_sec"] = np.where(
        sec["obs_sec"].to_numpy(dtype=float) >= MIN_OBS,
        sec["pos_sec"] / sec["obs_sec"],
        np.nan,
    )

    # Overall fallback = POPULATION-weighted mean of the estimable section
    # rates (not the observation-weighted pooled rate, which would re-inject
    # the very coverage bias the estimator corrects).
    est = sec[sec["p_sec"].notna()].copy()
    est["_num"] = est["p_sec"] * est["pop_sec"]
    allm = est.groupby(["year", "month"], as_index=False).agg(
        _num=("_num", "sum"), _den=("pop_sec", "sum")
    )
    allm["p_all"] = allm["_num"] / allm["_den"]
    allm = allm[["year", "month", "p_all"]]

    # Left joins. Rows with a null sec_code must NOT borrow the unknown-section
    # margin: polars joins with join_nulls=False (null != null), but pandas
    # merge DOES match NaN to NaN — so we drop null-key rows from the right
    # table, leaving null-section rows unmatched to fall through to p_all,
    # exactly as the polars original does. (The unknown-section group still
    # contributes to p_all above, via `est`, matching polars.)
    sec_join = sec.loc[
        sec["sec_code"].notna(), ["sec_code", "year", "month", "obs_sec", "p_sec"]
    ]
    joined = base.merge(
        sec_join, on=["sec_code", "year", "month"], how="left"
    ).merge(allm, on=["year", "month"], how="left")

    obs = joined["obs"].to_numpy(dtype=float)
    obs_sec = joined["obs_sec"].to_numpy(dtype=float)
    pos = joined["pos"].to_numpy(dtype=float)
    p_sec = joined["p_sec"].to_numpy(dtype=float)
    p_all = joined["p_all"].to_numpy(dtype=float)
    with np.errstate(divide="ignore", invalid="ignore"):
        joined["p"] = np.where(
            obs >= MIN_OBS,
            pos / obs,
            np.where(obs_sec >= MIN_OBS, p_sec, p_all),
        )

    valid = joined[joined["p"].notna() & (joined["pop"] > 0)].copy()
    valid["_wnum"] = valid["p"] * valid["pop"]
    out = valid.groupby(["year", "month"], as_index=False).agg(
        _wnum=("_wnum", "sum"), pop_total=("pop", "sum")
    )
    out["rate_rep"] = out["_wnum"] / out["pop_total"]
    return (
        out[["year", "month", "rate_rep", "pop_total"]]
        .sort_values(["year", "month"])
        .reset_index(drop=True)
    )
