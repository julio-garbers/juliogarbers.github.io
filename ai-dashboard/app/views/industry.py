"""Industry — AI-adoption share by industry x year (heatmap)."""

import plotly.graph_objects as go
import streamlit as st

from lib import aggregations as agg
from lib import branding
from lib import filters as filters_lib
from lib import nace as nace_lib
from lib import stats as stats_lib
from lib.style import SHARE_SCALE, apply_layout

fs = filters_lib.render_sidebar()

branding.page_header(
    "AI Adoption by Industry",
    f"Share of observed firms using AI, by industry and year — cells with "
    f"fewer than {stats_lib.MIN_OBS} observed firms are left blank.",
)

level = st.radio(
    "Industry detail",
    options=[1, 2, 3, 4],
    index=0,
    horizontal=True,
    format_func=lambda lv: nace_lib.LEVEL_NAME[lv],
    help="Coarser levels (1-digit sections) have more firms per cell and fewer "
    "blanks; finer levels (4-digit classes) show detail but suppress more.",
)

raw = agg.industry_heatmap(fs, level)
if raw.empty:
    st.warning("No firms match the current filters.")
    st.stop()

# Keep only industries that have at least one reportable (year) cell.
reportable = raw.loc[raw["rate_display"].notna(), "ind_label"].unique().tolist()
shown = raw[raw["ind_label"].isin(reportable)]
n_hidden = raw["ind_label"].nunique() - len(reportable)

if shown.empty:
    st.warning(
        f"No industry at this level has {stats_lib.MIN_OBS}+ observed firms in "
        "any year under the current filters. Try a coarser level or wider "
        "filters."
    )
    st.stop()

# Pivot to industry x year, ordered by latest-year share (busiest at top).
shown = shown.assign(share=100 * shown["rate_display"])
pivot = shown.pivot(index="ind_label", columns="year", values="share")
year_cols = sorted(pivot.columns.tolist(), key=int)
latest = year_cols[-1]
pivot = pivot.sort_values(latest, ascending=False, na_position="last")
pdf = pivot[year_cols]

# Customdata: observed-firm counts per cell, for the hover.
counts = (
    shown.pivot(index="ind_label", columns="year", values="n_sample")
    .reindex(pdf.index)[year_cols]
)

fig = go.Figure(
    go.Heatmap(
        z=pdf.values,
        x=[str(c) for c in year_cols],
        y=pdf.index.tolist(),
        customdata=counts.values,
        colorscale=SHARE_SCALE,
        colorbar=dict(title="AI share (%)"),
        hovertemplate=(
            "<b>%{y}</b><br>%{x}: %{z:.1f}%"
            "<br>%{customdata:,} observed firms<extra></extra>"
        ),
        hoverongaps=False,
        xgap=1,
        ygap=1,
    )
)
apply_layout(
    fig,
    height=max(360, 24 * len(pdf) + 120),
    margin=dict(l=260, r=20, t=30, b=40),
    xaxis_title=None,
    yaxis_title=None,
)
fig.update_xaxes(side="top")
st.plotly_chart(fig, width="stretch")

note = f"Blank cells: fewer than {stats_lib.MIN_OBS} observed firms that year."
if n_hidden > 0:
    note += (
        f" {n_hidden} industries hidden entirely "
        f"(never reach {stats_lib.MIN_OBS} firms)."
    )
st.caption(note)

branding.page_footer()
