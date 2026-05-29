"""Industry (NACE Rev. 2) level helpers — pandas build.

The data carries the 4-digit code only; the 1/2/3-digit views are derived by
joining the nace_lookup table. Level 1 = section (letter), 2 = division,
3 = group, 4 = class. Labels are always shown to the user, never codes.
"""

import pandas as pd

from . import data as data_lib

# level -> (code column, label column) in nace_lookup
LEVEL_COLS = {
    1: ("sec_code", "sec_label"),
    2: ("div_code", "div_label"),
    3: ("grp_code", "grp_label"),
    4: ("cls_code", "cls_label"),
}

LEVEL_NAME = {
    1: "Section (1-digit)",
    2: "Division (2-digit)",
    3: "Group (3-digit)",
    4: "Class (4-digit)",
}


def lookup() -> pd.DataFrame:
    return data_lib.nace_lookup()


def attach_level(df: pd.DataFrame, level: int) -> pd.DataFrame:
    """Join nace_lookup to a frame with a `nace4` column, adding `ind_code`
    and `ind_label` for the requested level. Left join preserves `df`'s rows."""
    code_col, label_col = LEVEL_COLS[level]
    lk = lookup()[["nace4", code_col, label_col]].rename(
        columns={code_col: "ind_code", label_col: "ind_label"}
    )
    return df.merge(lk, on="nace4", how="left", sort=False)


def level_options(level: int) -> list[tuple[str, str]]:
    """Distinct (code, label) at a level, sorted by label — for filter pickers."""
    code_col, label_col = LEVEL_COLS[level]
    opts = (
        lookup()[[code_col, label_col]]
        .dropna()
        .drop_duplicates()
        .sort_values(label_col, kind="stable")
    )
    return list(zip(opts[code_col].tolist(), opts[label_col].tolist()))


def codes_for_level_values(level: int, values: list[str]) -> set[str]:
    """All 4-digit codes whose `level`-code is in `values` — used to translate
    a filter selection into a nace4 membership test."""
    code_col, _ = LEVEL_COLS[level]
    if not values:
        return set()
    lk = lookup()
    return set(lk.loc[lk[code_col].isin(values), "nace4"].dropna().tolist())
