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

# firm_category code -> friendly label. Default is businesses only — public
# bodies, non-profits and uncoded entities are poorly covered by the register
# and their AI signal is dominated by topic/discourse and group-site
# misattribution (see Methodology), so they are opt-in.
FIRM_TYPES = {
    "commercial": "Businesses",
    "non_profit": "Non-profits",
    "public": "Public sector",
    "unknown": "Unknown legal form",
    "other": "Other",
}


@dataclass
class FilterState:
    nace_level: int = 1
    nace_values: list[str] = field(default_factory=list)   # codes at nace_level
    firm_types: list[str] = field(default_factory=lambda: ["commercial"])
    sizes: list[str] = field(default_factory=list)         # [] = all
    status: list[str] = field(default_factory=lambda: list(STATUS_LABELS))
    own_website_only: bool = False
    independent_only: bool = False
    only_confirmed_dates: bool = False
    decade_range: tuple[int, int] = (1900, 2020)

    def key(self) -> tuple:
        """Hashable signature for caching aggregation results (st.cache_data)."""
        return (
            self.nace_level,
            tuple(self.nace_values),
            tuple(self.firm_types),
            tuple(self.sizes),
            tuple(self.status),
            self.own_website_only,
            self.independent_only,
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
            "Adjust the set of firms behind every chart. By default the charts "
            "show Luxembourg **businesses**."
        )

        # --- Firm type ---
        codes = list(FIRM_TYPES)
        chosen_types = st.multiselect(
            "Firm type",
            options=[FIRM_TYPES[c] for c in codes],
            default=[FIRM_TYPES[c] for c in fs.firm_types],
            placeholder="All firm types",
            help="Defaults to Businesses — the cleanest denominator. Public "
            "bodies, non-profits and uncoded entities are poorly covered by the "
            "register and their AI signal is noisier — opt in with care. "
            "Clearing the box shows all firm types.",
        )
        label_to_type = {v: k for k, v in FIRM_TYPES.items()}
        fs.firm_types = [label_to_type[v] for v in chosen_types]

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

        # --- Attribution: own website + standalone ---
        fs.own_website_only = st.checkbox(
            "Only firms with their own website",
            value=fs.own_website_only,
            help="Exclude firms whose website is shared with other firms (a "
            "group / portal / management-company site). The AI on such sites "
            "belongs to the group, not the individual firm — own-site firms "
            "show ~10% AI vs ~38% for heavily-shared sites.",
        )
        fs.independent_only = st.checkbox(
            "Only standalone firms",
            value=fs.independent_only,
            help="Exclude subsidiaries of a multi-firm corporate group "
            "(identified by a shared Global Ultimate Owner). The group's AI is "
            "often mis-attributed to each subsidiary — standalone firms show "
            "~12% AI vs ~34% for large groups.",
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


def _decade_mask(df: pd.DataFrame, lo: int, hi: int) -> np.ndarray:
    # Firms with an unknown founding date are always kept — a null decade must
    # not be silently dropped.
    d = df["decade_incorporation"]
    in_range = _as_bool((d >= lo) & (d <= hi))
    return d.isna().to_numpy(dtype=bool) | in_range


def _specs(fs: FilterState) -> list:
    """(required_columns, mask_builder) per active filter. apply() runs them
    all; apply_present() runs only those whose columns exist in the frame."""
    specs: list = []

    if fs.nace_values:
        codes = list(nace_lib.codes_for_level_values(fs.nace_level, fs.nace_values))
        specs.append((("nace4",), lambda df: df["nace4"].isin(codes).to_numpy(dtype=bool)))

    # Firm type: a non-empty selection includes exactly those categories;
    # empty == all firm types (matches the original polars predicate).
    if fs.firm_types:
        ft = list(fs.firm_types)
        specs.append((("firm_category",),
                      lambda df: df["firm_category"].isin(ft).to_numpy(dtype=bool)))

    if fs.own_website_only:
        specs.append((("own_website",),
                      lambda df: _as_bool(df["own_website"] == True)))  # noqa: E712

    if fs.independent_only:
        specs.append((("in_group",),
                      lambda df: _as_bool(df["in_group"] == False)))  # noqa: E712

    if fs.sizes:
        sz = list(fs.sizes)
        specs.append((("size_classification",),
                      lambda df: df["size_classification"].isin(sz).to_numpy(dtype=bool)))

    if not (set(fs.status) == set(STATUS_LABELS) or not fs.status):
        sel = list(fs.status)
        specs.append((("is_active",), lambda df: _status_mask(df, sel)))

    if fs.only_confirmed_dates:
        specs.append((
            ("period_imputed_start", "period_imputed_end"),
            lambda df: _as_bool(df["period_imputed_start"] == False)  # noqa: E712
            & _as_bool(df["period_imputed_end"] == False),  # noqa: E712
        ))

    lo, hi = fs.decade_range
    if (lo, hi) != (1900, 2020):
        specs.append((("decade_incorporation",), lambda df: _decade_mask(df, lo, hi)))

    return specs


def _combine(df: pd.DataFrame, masks: list[np.ndarray]) -> pd.DataFrame:
    if not masks:
        return df
    combined = np.ones(len(df), dtype=bool)
    for m in masks:
        combined &= m
    return df[combined]


def predicates(df: pd.DataFrame, fs: FilterState) -> list[np.ndarray]:
    return [fn(df) for _cols, fn in _specs(fs)]


def apply(df: pd.DataFrame, fs: FilterState) -> pd.DataFrame:
    return _combine(df, [fn(df) for _cols, fn in _specs(fs)])


def apply_present(df: pd.DataFrame, fs: FilterState) -> pd.DataFrame:
    """Like apply(), but only predicates whose referenced columns all exist in
    `df` — for cubes carrying a subset of the panel dimensions (cube_city has
    firm_category + nace4 but not size / status / attribution). Mirrors the
    polars apply_present in dashboard/lib/filters.py."""
    cols = set(df.columns)
    return _combine(df, [fn(df) for need, fn in _specs(fs) if set(need) <= cols])
