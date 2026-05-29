"""Luxembourg AI Adoption Dashboard — entry point (browser / stlite build).

Run locally:  streamlit run dashboard_web/app.py
In the browser: mounted by index.html via stlite (Pyodide).

Uses st.navigation so the page list is explicit (no stray landing tab). Each
view manages its own sidebar; the global filter selection persists across the
analytic pages via st.session_state.
"""

from pathlib import Path

import streamlit as st

from lib import branding
from lib import data as data_lib
from lib import style  # noqa: F401  registers the plotly template

st.set_page_config(
    page_title="Luxembourg AI Adoption · LISER",
    page_icon=str(Path(__file__).parent / "assets" / "favicon.png"),
    layout="wide",
    initial_sidebar_state="expanded",
)

if not data_lib.ready():
    branding.inject_css()
    st.error(
        "Dashboard data not found. The CSV cubes must be present in the "
        "`data/` folder next to the app."
    )
    st.stop()

pages = [
    st.Page("views/overview.py", title="Overview", icon=":material/trending_up:", default=True),
    st.Page("views/industry.py", title="Industry", icon=":material/factory:"),
    st.Page("views/geography.py", title="Map", icon=":material/map:"),
    st.Page("views/coverage.py", title="Coverage", icon=":material/balance:"),
    st.Page("views/methodology.py", title="Methodology", icon=":material/menu_book:"),
]
st.navigation(pages).run()
