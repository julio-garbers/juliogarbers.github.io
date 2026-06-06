"""LISER branding: global CSS, the navy header band, and the footer.

Call `page_header(title, subtitle)` at the top of every page and
`page_footer()` at the bottom. CSS is (re)injected by page_header; Streamlit
keeps a single active stylesheet per rerun so this is idempotent.
"""

import base64
from functools import lru_cache
from pathlib import Path

import streamlit as st

ASSETS = Path(__file__).resolve().parents[1] / "assets"

# --- LISER brand colours (mirror lib/style.py) -----------------------------
NAVY = "#000070"
RED = "#E30613"
CYAN = "#00AEEF"
INK = "#283137"

_FONT_IMPORT = (
    "@import url('https://fonts.googleapis.com/css2?"
    "family=Inter:wght@400;500;600;700;800&display=swap');"
)


@lru_cache(maxsize=4)
def _logo_b64(name: str) -> str:
    return base64.b64encode((ASSETS / name).read_bytes()).decode("ascii")


_CSS = f"""
<style>
{_FONT_IMPORT}

html, body, [class*="st-"], [class*="css"] {{
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}}
/* Keep Material Symbols icons (sidebar nav, widgets) in their icon font — the
   broad font rule above otherwise turns the ligatures into raw text
   ("trending_up", "factory", ...) overlapping the page titles. */
[data-testid="stIconMaterial"], span.material-icons,
.material-symbols-rounded, .material-symbols-outlined, [class*="material-symbols"] {{
    font-family: 'Material Symbols Rounded', 'Material Symbols Outlined', 'Material Icons' !important;
}}
.stApp {{ background: #FBFCFD; }}

/* Hide Streamlit chrome (toolbar / menu / footer) but keep the header so the
   sidebar collapse/expand control stays usable. */
[data-testid="stToolbar"], #MainMenu, footer, [data-testid="stDecoration"] {{ display: none !important; }}
header[data-testid="stHeader"] {{ background: transparent; }}

/* Content width + spacing */
[data-testid="stMainBlockContainer"], .block-container {{
    padding-top: 2.2rem; padding-bottom: 2rem; max-width: 1200px;
}}

/* Headings */
h1, h2, h3, h4 {{ color: {NAVY}; font-weight: 700; letter-spacing: .2px; }}
h2 {{ font-size: 1.35rem; margin-top: .4rem; }}
h3 {{ font-size: 1.12rem; }}
a, a:visited {{ color: #0099FF; }}

/* Caption / small text */
[data-testid="stCaptionContainer"], .stCaption {{ color: #61737B; }}

/* Metric cards */
[data-testid="stMetric"] {{
    background: #FFFFFF; border: 1px solid #E7EBEF; border-radius: 12px;
    padding: 14px 18px; box-shadow: 0 1px 2px rgba(16,24,40,.05);
}}
[data-testid="stMetricValue"] {{ color: {NAVY}; font-weight: 800; }}
[data-testid="stMetricLabel"] p {{ color: #61737B; font-weight: 600; letter-spacing: .3px; }}
[data-testid="stMetricDelta"] {{ color: #61737B; }}

/* Sidebar */
[data-testid="stSidebar"] {{ background: #F4F7FA; border-right: 1px solid #E7EBEF; }}
[data-testid="stSidebar"] h1, [data-testid="stSidebar"] h2, [data-testid="stSidebar"] h3 {{ color: {NAVY}; }}
[data-testid="stSidebar"] [data-testid="stWidgetLabel"] p {{ font-weight: 600; color: {INK}; }}

/* Expander */
[data-testid="stExpander"] {{ border: 1px solid #E7EBEF; border-radius: 10px; }}
[data-testid="stExpander"] summary {{ color: {NAVY}; font-weight: 600; }}

/* Dataframe */
[data-testid="stDataFrame"] {{ border: 1px solid #E7EBEF; border-radius: 10px; }}

/* Buttons */
.stButton button {{
    border-radius: 8px; border: 1px solid #C7D0D8; color: {NAVY}; font-weight: 600;
}}
.stButton button:hover {{ border-color: {NAVY}; color: {NAVY}; }}

/* ---- LISER header band ---- */
.liser-band {{
    background: linear-gradient(120deg, #000070 0%, #14148e 55%, #1d1da3 100%);
    display: flex; align-items: center; gap: 22px;
    padding: 20px 28px; border-radius: 12px 12px 0 0;
    box-shadow: 0 6px 18px rgba(0,0,40,.10);
}}
.liser-band-logo {{ height: 44px; }}
.liser-band-divider {{ width: 1px; height: 42px; background: rgba(255,255,255,.28); }}
.liser-band-title {{ color: #fff; font-size: 1.55rem; font-weight: 800; line-height: 1.18; letter-spacing: .2px; }}
.liser-band-sub {{ color: rgba(255,255,255,.82); font-size: .95rem; margin-top: 3px; font-weight: 400; }}
.liser-accent {{
    height: 4px; border-radius: 0 0 6px 6px; margin-bottom: 20px;
    background: linear-gradient(90deg, {NAVY} 0%, {RED} 50%, {CYAN} 100%);
}}

/* ---- Footer ---- */
.liser-footer {{
    margin-top: 44px; padding-top: 16px; border-top: 1px solid #E7EBEF;
    color: #7C797C; font-size: .82rem; line-height: 1.5;
    display: flex; justify-content: space-between; gap: 18px; flex-wrap: wrap;
}}
.liser-footer b {{ color: {NAVY}; font-weight: 700; }}
</style>
"""


def inject_css() -> None:
    st.markdown(_CSS, unsafe_allow_html=True)


def page_header(title: str, subtitle: str) -> None:
    """Inject the stylesheet and render the navy LISER header band."""
    inject_css()
    logo = _logo_b64("liser_logo_white.png")
    st.markdown(
        f"""
        <div class="liser-band">
          <img class="liser-band-logo" src="data:image/png;base64,{logo}" alt="LISER"/>
          <div class="liser-band-divider"></div>
          <div>
            <div class="liser-band-title">{title}</div>
            <div class="liser-band-sub">{subtitle}</div>
          </div>
        </div>
        <div class="liser-accent"></div>
        """,
        unsafe_allow_html=True,
    )


def page_footer() -> None:
    st.markdown(
        """
        <div class="liser-footer">
          <div><b>LISER</b> · Luxembourg Institute of Socio-Economic Research</div>
          <div>AI signal from public web-archive snapshots, classified with a large language model ·
          firm population from official registers &amp; Eurostat / STATEC benchmarks</div>
        </div>
        """,
        unsafe_allow_html=True,
    )
