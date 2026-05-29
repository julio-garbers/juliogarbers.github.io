"""Query layer: every chart's data, computed from the small cubes — pandas build.

All functions take the current FilterState and return pandas frames. Results
are cached by the filter signature (FilterState.key()), so re-renders and page
switches with an unchanged selection are instant; none of them ever touch the
monthly panel.
"""

from dataclasses import dataclass

import numpy as np
import pandas as pd
import streamlit as st

from . import data as data_lib
from . import filters as filters_lib
from . import nace as nace_lib
from . import stats as stats_lib

# Cache key for FilterState arguments.
_FS_HASH = {filters_lib.FilterState: lambda fs: fs.key()}

# Year used for the sample-vs-official industry composition (latest official
# Structural Business Statistics reference year).
OFFICIAL_SECTION_YEAR = 2023


# =============================================================================
# Headline numbers
# =============================================================================

@dataclass
class KPIs:
    n_population: int
    n_sample: int
    n_ever_ai: int
    n_ever_observed: int
    coverage: float | None        # sample / population
    ever_rate: float | None       # ever_ai / ever_observed


@st.cache_data(show_spinner=False, hash_funcs=_FS_HASH)
def kpis(fs: filters_lib.FilterState) -> KPIs:
    df = filters_lib.apply(data_lib.cube_pop(), fs)
    n_pop = int(df["n_population"].sum())
    n_sample = int(df["n_sample"].sum())
    n_ever_ai = int(df["n_ever_ai"].sum())
    n_ever_obs = int(df["n_ever_observed"].sum())
    return KPIs(
        n_population=n_pop,
        n_sample=n_sample,
        n_ever_ai=n_ever_ai,
        n_ever_observed=n_ever_obs,
        coverage=(n_sample / n_pop) if n_pop else None,
        ever_rate=(n_ever_ai / n_ever_obs) if n_ever_obs else None,
    )


# =============================================================================
# Time series — both estimators
# =============================================================================

@st.cache_data(show_spinner=False, hash_funcs=_FS_HASH)
def time_series(fs: filters_lib.FilterState) -> pd.DataFrame:
    """Per-month frame with: month_date, observed, population, n_true,
    rate_obs/ci_lo/ci_hi/tier (Estimator A) and rate_rep (Estimator B)."""
    panel = filters_lib.apply(data_lib.cube_panel(), fs)

    monthly = (
        panel.groupby(["year", "month"], as_index=False, dropna=False)
        .agg(
            n_true=("n_true", "sum"),
            n_false=("n_false", "sum"),
            n_null=("n_null", "sum"),
        )
    )
    monthly["observed"] = monthly["n_true"] + monthly["n_false"]
    monthly["population"] = monthly["n_true"] + monthly["n_false"] + monthly["n_null"]
    monthly = stats_lib.add_observed_rate(monthly, pos="n_true", obs="observed")

    strata = (
        nace_lib.attach_level(panel, level=1)
        .rename(columns={"ind_code": "sec_code"})
        .groupby(
            ["sec_code", "size_classification", "year", "month"],
            as_index=False,
            dropna=False,
        )
        .agg(
            n_true=("n_true", "sum"),
            n_false=("n_false", "sum"),
            n_null=("n_null", "sum"),
        )
    )
    rep = stats_lib.weighted_series(strata)

    out = monthly.merge(rep, on=["year", "month"], how="left").sort_values(
        ["year", "month"]
    )
    out["month_date"] = pd.to_datetime(
        pd.DataFrame({"year": out["year"], "month": out["month"], "day": 1})
    )
    return out.reset_index(drop=True)


# =============================================================================
# Industry heatmap — share by industry x year, with >=30 suppression
# =============================================================================

@st.cache_data(show_spinner=False, hash_funcs=_FS_HASH)
def industry_heatmap(fs: filters_lib.FilterState, level: int) -> pd.DataFrame:
    """Per (industry-at-level, calendar year): observed AI share among distinct
    observed firms, with >=30-firm suppression. Uses cube_repr (firm counts)."""
    repr_all = data_lib.cube_repr()
    repr_ = filters_lib.apply(repr_all[repr_all["year"] > 0], fs)
    by = (
        nace_lib.attach_level(repr_, level=level)
        .loc[lambda d: d["ind_code"].notna()]
        .groupby(["ind_code", "ind_label", "year"], as_index=False, dropna=False)
        .agg(n_ai=("n_ai", "sum"), n_sample=("n_sample", "sum"))
    )
    by = stats_lib.add_observed_rate(by, pos="n_ai", obs="n_sample")
    return by.sort_values(["ind_label", "year"]).reset_index(drop=True)


# =============================================================================
# Coverage — our observed sample vs the official firm count
# =============================================================================

@st.cache_data(show_spinner=False, hash_funcs=_FS_HASH)
def coverage_trend(fs: filters_lib.FilterState) -> pd.DataFrame:
    """Per calendar year: our observed sample (distinct firms) vs the official
    active-enterprise count, with coverage = sample / official."""
    repr_all = data_lib.cube_repr()
    df = filters_lib.apply(repr_all[repr_all["year"] > 0], fs)
    trend = (
        df.groupby("year", as_index=False)
        .agg(sample=("n_sample", "sum"))
        .sort_values("year")
    )
    official = data_lib.official_year()[["year", "official_active"]]
    trend = trend.merge(official, on="year", how="left")
    off = trend["official_active"].astype("Float64").to_numpy(dtype=float)
    with np.errstate(divide="ignore", invalid="ignore"):
        trend["coverage"] = np.where(
            ~np.isnan(off), trend["sample"].to_numpy(dtype=float) / off, np.nan
        )
    return trend.reset_index(drop=True)


@st.cache_data(show_spinner=False, hash_funcs=_FS_HASH)
def sample_vs_official_by_section(
    fs: filters_lib.FilterState, year: int
) -> pd.DataFrame:
    """Industry-section composition: our observed sample (firms observed in
    `year`) vs the official enterprise count, each as a share of its own total.
    Only sections present in the official data are kept."""
    repr_all = data_lib.cube_repr()
    df = filters_lib.apply(repr_all[repr_all["year"] == year], fs)
    sample = (
        nace_lib.attach_level(df, level=1)
        .loc[lambda d: d["ind_code"].notna()]
        .groupby(["ind_code", "ind_label"], as_index=False, dropna=False)
        .agg(sample=("n_sample", "sum"))
    )
    official = data_lib.official_section().rename(columns={"sec_code": "ind_code"})
    sec_labels = (
        nace_lib.lookup()[["sec_code", "sec_label"]]
        .drop_duplicates()
        .rename(columns={"sec_code": "ind_code", "sec_label": "ind_label"})
    )
    merged = (
        official.merge(sec_labels, on="ind_code", how="left")
        .merge(sample.drop(columns=["ind_label"]), on="ind_code", how="left")
    )
    merged["sample"] = merged["sample"].fillna(0)
    total_sample = merged["sample"].sum()
    total_official = merged["official_active"].sum()
    merged["sample_share"] = (
        merged["sample"] / total_sample if total_sample else np.nan
    )
    merged["official_share"] = (
        merged["official_active"].astype("Float64") / total_official
        if total_official
        else np.nan
    )
    return merged.sort_values("official_active", ascending=False).reset_index(
        drop=True
    )


# =============================================================================
# Map — observed share by commune for a given year
# =============================================================================

@st.cache_data(show_spinner=False)
def latest_period() -> tuple[int, int]:
    """Latest (year, month) in the panel — the period the map shows."""
    last = data_lib.cube_city().sort_values(["year", "month"]).iloc[-1]
    return int(last["year"]), int(last["month"])


@st.cache_data(show_spinner=False)
def map_data() -> pd.DataFrame:
    """Per commune at the latest month: observed AI share with >=30-firm
    suppression. Numerator = firms AI-active that month; denominator = firms
    active that month with in-period web data — exactly the Overview's
    latest-month observed share, split by commune. Not affected by the sidebar
    filters."""
    y, m = latest_period()
    city = data_lib.cube_city()
    city = city[(city["year"] == y) & (city["month"] == m)]
    by = (
        city.groupby(["lau2", "commune"], as_index=False, dropna=False)
        .agg(n_true=("n_true", "sum"), n_false=("n_false", "sum"))
    )
    by["observed"] = by["n_true"] + by["n_false"]
    return stats_lib.add_observed_rate(by, pos="n_true", obs="observed")
