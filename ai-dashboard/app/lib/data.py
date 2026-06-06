"""Cached loaders for the pre-computed cubes and reference tables.

Browser / stlite build: the cubes ship as small **gzipped** CSVs and are read
with pandas (`gzip` is in Pyodide's stdlib; neither polars nor pyarrow is). The
firm-month panel is ~1.1M rows (~63 MB as plain CSV, ~2.7 MB gzipped), so gzip
keeps both the repo and the first-load download small.

IMPORTANT: every column is coerced to a **numpy-backed** dtype (object / int64 /
float64 / bool), never a pandas *nullable extension* dtype (string / boolean /
Int64). `st.cache_data` pickles each cached frame, and the extension arrays fail
to deserialize in stlite's Pyodide pandas build (`NDArrayBacked.__setstate__`
raises NotImplementedError). Reading every column as str first also preserves
leading zeros in codes like "0100".
"""

import gzip
import json
from pathlib import Path

import pandas as pd
import streamlit as st

DATA_DIR = Path(__file__).resolve().parents[1] / "data"

# Column kinds (by name); anything not listed stays object (str codes/labels).
_INT_COLS = {
    "year", "month", "n_population", "n_sample", "n_ever_ai", "n_ever_observed",
    "n_true", "n_false", "n_null", "n_ai",
}
_BOOL_COLS = {"is_active", "period_imputed_start", "period_imputed_end"}
_FLOAT_NA_COLS = {"decade_incorporation", "official_active"}

_FILES = [
    "cube_pop.csv.gz", "cube_panel.csv.gz", "cube_repr.csv.gz", "cube_city.csv.gz",
    "nace_lookup.csv.gz", "official_year.csv.gz", "official_section.csv.gz",
]


def _read(name: str) -> pd.DataFrame:
    # Read everything as str (preserves leading zeros, no dtype inference, no
    # extension arrays), then coerce to numpy-backed dtypes.
    df = pd.read_csv(DATA_DIR / name, dtype=str, keep_default_na=True)
    for col in df.columns:
        if col in _INT_COLS:
            df[col] = pd.to_numeric(df[col]).astype("int64")
        elif col in _FLOAT_NA_COLS:
            df[col] = pd.to_numeric(df[col])  # float64, NaN for missing
        elif col in _BOOL_COLS:
            # -> object with python True / False / NaN (numpy-backed object)
            df[col] = df[col].map({"True": True, "False": False}).astype(object)
        else:
            # codes / labels -> numpy object. (pandas 3.0's read_csv(dtype=str)
            # yields the new 'str' EXTENSION dtype which — like string/boolean/
            # Int64 — fails to unpickle in stlite's Pyodide pandas; .astype(object)
            # forces a plain numpy object array on every pandas version.)
            df[col] = df[col].astype(object)
    return df


@st.cache_data(show_spinner=False)
def cube_pop() -> pd.DataFrame:
    return _read("cube_pop.csv.gz")


@st.cache_data(show_spinner=False)
def cube_panel() -> pd.DataFrame:
    return _read("cube_panel.csv.gz")


@st.cache_data(show_spinner=False)
def cube_repr() -> pd.DataFrame:
    return _read("cube_repr.csv.gz")


@st.cache_data(show_spinner=False)
def cube_city() -> pd.DataFrame:
    return _read("cube_city.csv.gz")


@st.cache_data(show_spinner=False)
def nace_lookup() -> pd.DataFrame:
    return _read("nace_lookup.csv.gz")


@st.cache_data(show_spinner=False)
def official_year() -> pd.DataFrame:
    return _read("official_year.csv.gz")


@st.cache_data(show_spinner=False)
def official_section() -> pd.DataFrame:
    return _read("official_section.csv.gz")


@st.cache_data(show_spinner=False)
def communes_geojson() -> dict:
    with gzip.open(DATA_DIR / "communes4326.geojson.gz", "rt") as fh:
        return json.load(fh)


def ready() -> bool:
    return (DATA_DIR / "cube_panel.csv.gz").exists()
