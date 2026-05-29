"""Cached loaders for the pre-computed cubes and reference tables.

Browser / stlite build: the cubes ship as small **gzipped** CSVs and are read
with pandas (`gzip` is in Pyodide's stdlib; neither polars nor pyarrow is). The
firm-month panel is ~1.1M rows (~63 MB as plain CSV, ~2.7 MB gzipped), so
gzip keeps both the repo and the first-load download small. Explicit dtypes are
declared per file so the CSV round-trip reproduces the original parquet cubes
exactly (nullable booleans and nullable integers in particular).
"""

import gzip
import json
from pathlib import Path

import pandas as pd
import streamlit as st

DATA_DIR = Path(__file__).resolve().parents[1] / "data"

# Panel dimension dtypes shared by cube_pop / cube_panel / cube_repr.
_DIM_DTYPES = {
    "nace4": "string",
    "size_classification": "string",
    "is_active": "boolean",            # nullable: Operating / Closed / unknown
    "period_imputed_start": "boolean",
    "period_imputed_end": "boolean",
    "decade_incorporation": "Int64",   # nullable
}

_DTYPES = {
    "cube_pop.csv.gz": {
        **_DIM_DTYPES,
        "n_population": "int64",
        "n_sample": "int64",
        "n_ever_ai": "int64",
        "n_ever_observed": "int64",
    },
    "cube_panel.csv.gz": {
        **_DIM_DTYPES,
        "year": "int64",
        "month": "int64",
        "n_true": "int64",
        "n_false": "int64",
        "n_null": "int64",
    },
    "cube_repr.csv.gz": {
        **_DIM_DTYPES,
        "year": "int64",
        "n_sample": "int64",
        "n_ai": "int64",
    },
    "cube_city.csv.gz": {
        "lau2": "string",
        "commune": "string",
        "year": "int64",
        "month": "int64",
        "n_true": "int64",
        "n_false": "int64",
        "n_null": "int64",
    },
    "nace_lookup.csv.gz": {
        "nace4": "string",
        "sec_code": "string",
        "sec_label": "string",
        "div_code": "string",
        "div_label": "string",
        "grp_code": "string",
        "grp_label": "string",
        "cls_code": "string",
        "cls_label": "string",
    },
    "official_year.csv.gz": {
        "year": "int64",
        "official_active": "Int64",
        "kind": "string",
        "source": "string",
    },
    "official_section.csv.gz": {
        "sec_code": "string",
        "official_active": "Int64",
        "kind": "string",
    },
}


def _read(name: str) -> pd.DataFrame:
    # pandas infers gzip from the .gz extension (compression="infer").
    return pd.read_csv(DATA_DIR / name, dtype=_DTYPES[name], keep_default_na=True)


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
