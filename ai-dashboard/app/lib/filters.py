"""Global filter state + sidebar widget — pandas build.

State lives in st.session_state['filters'] so every page sees one selection.
All filter dimensions are columns of the pre-computed cubes, so applying a
filter is a cheap in-memory predicate. Predicates are built as boolean masks;
nulls are treated as non-matching (dropped), matching the original polars
`.filter()` semantics — except where a dimension explicitly keeps nulls (the
incorporation-decade range keeps firms with an unknown founding date).
"""

from dataclasses import dataclass, field

import numpy as np
import pandas as pd
import streamlit as st

from . import nace as nace_lib

SIZE_ORDER = [
    "Small company",
    "Medium sized company",
    "Large company",
    "Very large company",
]
STATUS_LABELS = ["Operating", "Closed", "Status unknown"]


@dataclass
class FilterState:
    nace_level: int = 1
    nace_values: list[str] = field(default_factory=list)   # codes at nace_level
    sizes: list[str] = field(default_factory=list)         # [] = all
    status: list[str] = field(default_factory=lambda: list(STATUS_LABELS))
    only_confirmed_dates: bool = False
    decade_range: tuple[int, int] = (1900, 2020)

    def key(self) -> tuple:
        """Hashable signature for caching aggregation results (st.cache_data)."""
        return (
            self.nace_level,
            tuple(self.nace_values),
            tuple(self.sizes),
            tuple(self.status),
            self.only_confirmed_dates,
            self.decade_range,
        )


def get_state() -> FilterState:
    if "filters" not in st.session_state:
        st.session_state["filters"] = FilterState()
    return st.session_state["filters"]


def render_sidebar() -> FilterState:
    fs = get_state()
    with st.sidebar:
        st.markdown("### Filters")
        st.caption(
            "Adjust the set of firms behind every chart. By default all "
            "Luxembourg firms are included."
        )

        # --- Industry: two-stage (level, then industries by label) ---
        st.markdown("**Industry**")
        level_label = st.selectbox(
            "Detail level",
            options=[1, 2, 3, 4],
            index=fs.nace_level - 1,
            format_func=lambda lv: nace_lib.LEVEL_NAME[lv],
            help="Pick how finely to choose industries, then select them below.",
        )
        if level_label != fs.nace_level:
            fs.nace_level = level_label
            fs.nace_values = []  # reset selection when the level changes

        options = nace_lib.level_options(fs.nace_level)
        code_to_label = dict(options)
        chosen_labels = st.multiselect(
            "Industries",
            options=[lab for _, lab in options],
            default=[code_to_label[c] for c in fs.nace_values if c in code_to_label],
            placeholder="All industries",
        )
        label_to_code = {lab: code for code, lab in options}
        fs.nace_values = [label_to_code[lab] for lab in chosen_labels]

        st.markdown("---")

        # --- Size ---
        fs.sizes = st.multiselect(
            "Company size",
            options=SIZE_ORDER,
            default=fs.sizes,
            placeholder="All sizes",
            help="Size classes combine employees, turnover and assets.",
        )

        # --- Status ---
        fs.status = st.multiselect(
            "Activity status",
            options=STATUS_LABELS,
            default=fs.status,
            help="Operating = currently active; Closed = ceased; "
            "Status unknown = not recorded.",
        )

        # --- Estimated dates ---
        fs.only_confirmed_dates = st.checkbox(
            "Only firms with confirmed start & end dates",
            value=fs.only_confirmed_dates,
            help="Exclude firms whose activity period had to be estimated from "
            "when they first/last appeared online, for cleaner inference.",
        )

        # --- Incorporation period ---
        fs.decade_range = st.select_slider(
            "Founded between",
            options=list(range(1900, 2030, 10)),
            value=fs.decade_range,
            format_func=lambda y: f"{y}s",
            help="Decade of incorporation. Firms with an unknown founding date "
            "are always included.",
        )

        st.markdown("---")
        if st.button("Reset filters", width="stretch"):
            st.session_state["filters"] = FilterState()
            st.rerun()

    st.session_state["filters"] = fs
    return fs


# =============================================================================
# Apply to a cube carrying the panel dimensions
# =============================================================================

def _as_bool(series: pd.Series) -> np.ndarray:
    """Boolean mask with nulls treated as False (matches polars .filter)."""
    return series.fillna(False).to_numpy(dtype=bool)


def _status_mask(df: pd.DataFrame, selected: list[str]) -> np.ndarray | None:
    if set(selected) == set(STATUS_LABELS) or not selected:
        return None
    ia = df["is_active"]
    parts: list[np.ndarray] = []
    if "Operating" in selected:
        parts.append(_as_bool(ia == True))  # noqa: E712
    if "Closed" in selected:
        parts.append(_as_bool(ia == False))  # noqa: E712
    if "Status unknown" in selected:
        parts.append(ia.isna().to_numpy(dtype=bool))
    if not parts:
        return np.zeros(len(df), dtype=bool)
    mask = parts[0]
    for p in parts[1:]:
        mask = mask | p
    return mask


def predicates(df: pd.DataFrame, fs: FilterState) -> list[np.ndarray]:
    preds: list[np.ndarray] = []

    if fs.nace_values:
        codes = nace_lib.codes_for_level_values(fs.nace_level, fs.nace_values)
        preds.append(df["nace4"].isin(list(codes)).to_numpy(dtype=bool))

    if fs.sizes:
        preds.append(df["size_classification"].isin(fs.sizes).to_numpy(dtype=bool))

    sm = _status_mask(df, fs.status)
    if sm is not None:
        preds.append(sm)

    if fs.only_confirmed_dates:
        preds.append(
            _as_bool(df["period_imputed_start"] == False)  # noqa: E712
            & _as_bool(df["period_imputed_end"] == False)  # noqa: E712
        )

    lo, hi = fs.decade_range
    if (lo, hi) != (1900, 2020):
        # Firms with an unknown founding date are always kept (matches the
        # sidebar help) — a null decade must not be silently dropped.
        d = df["decade_incorporation"]
        in_range = _as_bool((d >= lo) & (d <= hi))
        preds.append(d.isna().to_numpy(dtype=bool) | in_range)

    return preds


def apply(df: pd.DataFrame, fs: FilterState) -> pd.DataFrame:
    masks = predicates(df, fs)
    if not masks:
        return df
    combined = np.ones(len(df), dtype=bool)
    for m in masks:
        combined &= m
    return df[combined]
