"""Coverage — how our observed sample compares with the official firm count."""

import plotly.graph_objects as go
import streamlit as st

from lib import aggregations as agg
from lib import branding
from lib import filters as filters_lib
from lib.style import COLORS, apply_layout

fs = filters_lib.render_sidebar()

branding.page_header(
    "How Representative is the Sample?",
    "Our observed sample versus the official Luxembourg firm count "
    "(Eurostat / STATEC).",
)
st.caption(
    "We only observe firms whose website appears in the web archive — read "
    "this before trusting any adoption rate."
)

trend = agg.coverage_trend(fs)
if trend.empty:
    st.warning("No firms match the current filters.")
    st.stop()

# Latest year that has an official benchmark, for the headline coverage figure.
with_official = trend[trend["official_active"].notna()]
k = agg.kpis(fs)

c1, c2, c3 = st.columns(3)
c1.metric("Firms observed online", f"{k.n_sample:,}")
if not with_official.empty:
    row = with_official.iloc[-1]
    c2.metric(
        f"Official active firms ({int(row['year'])})",
        f"{int(row['official_active']):,}",
        help="Eurostat / STATEC active market-economy enterprises.",
    )
    c3.metric(
        f"Coverage ({int(row['year'])})",
        f"{100 * row['coverage']:.0f}%",
        help="Observed firms as a share of the official firm count that year.",
    )

st.markdown("---")

# --- Coverage over time: sample vs official -------------------------------
st.subheader("Coverage over time")
tfig = go.Figure()
tfig.add_trace(
    go.Bar(
        x=trend["year"], y=trend["sample"], name="Observed sample",
        marker_color=COLORS["sample"],
        hovertemplate="%{x}<br>Observed: %{y:,}<extra></extra>",
    )
)
tfig.add_trace(
    go.Scatter(
        x=trend["year"], y=trend["official_active"],
        name="Official active firms (Eurostat)",
        mode="lines+markers",
        line=dict(color=COLORS["official"], width=2, dash="dot"),
        hovertemplate="%{x}<br>Official: %{y:,}<extra></extra>",
    )
)
apply_layout(
    tfig, height=380, yaxis_title="Number of firms", xaxis_title=None,
    legend=dict(orientation="h", yanchor="bottom", y=1.0, xanchor="left", x=0),
)
st.plotly_chart(tfig, width="stretch")
st.caption(
    "Coverage = observed firms ÷ official active firms (shown in the tile "
    "above). The official series stops at 2024 (the latest published year); "
    "2025–2026 show our sample alone — a reminder that the web data is more up "
    "to date than official statistics."
)

st.markdown("---")

# --- Industry composition: sample vs official -----------------------------
st.subheader(f"Industry mix: sample vs official ({agg.OFFICIAL_SECTION_YEAR})")
st.caption(
    "Share of firms by industry section, in our observed sample versus the "
    "official firm population. Gaps show which industries we over- or "
    "under-represent online."
)
comp = agg.sample_vs_official_by_section(fs, agg.OFFICIAL_SECTION_YEAR)
comp = comp[comp["official_active"] > 0]
labels = comp["ind_label"].fillna("(unknown)")
cfig = go.Figure()
cfig.add_trace(
    go.Bar(
        y=labels, x=100 * comp["official_share"], name="Official", orientation="h",
        marker_color=COLORS["official"], opacity=0.65,
        hovertemplate="<b>%{y}</b><br>Official: %{x:.1f}%<extra></extra>",
    )
)
cfig.add_trace(
    go.Bar(
        y=labels, x=100 * comp["sample_share"], name="Observed sample",
        orientation="h", marker_color=COLORS["sample"],
        hovertemplate="<b>%{y}</b><br>Sample: %{x:.1f}%<extra></extra>",
    )
)
apply_layout(
    cfig, barmode="group", height=max(360, 30 * len(comp) + 90),
    xaxis_title="Share of firms (%)", yaxis_title=None,
    legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
)
cfig.update_layout(yaxis=dict(autorange="reversed"))
st.plotly_chart(cfig, width="stretch")
st.caption(
    "Restricted to the market-economy sections the official statistics cover "
    "(both shares are computed within those sections). We have no comparable "
    "official breakdown by company size or founding year, so those are not "
    "shown."
)

branding.page_footer()
