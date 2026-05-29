"""Map — AI-adoption share by commune (latest month)."""

import calendar

import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from lib import aggregations as agg
from lib import branding
from lib import data as data_lib
from lib import stats as stats_lib
from lib.style import SHARE_SCALE

year, month = agg.latest_period()
period = f"{calendar.month_name[month]} {year}"

branding.page_header(
    "AI Adoption across Luxembourg",
    f"Share of firms using AI by commune, {period} — the Overview's "
    "latest-month figure, mapped.",
)
st.caption(
    f"Communes with fewer than {stats_lib.MIN_OBS} observed firms are shown in "
    "grey. Covers all firms with a known commune; not affected by the sidebar "
    "filters on other pages."
)

geojson = data_lib.communes_geojson()
df = agg.map_data()

reportable = df[df["rate_display"].notna()].assign(share=100 * df["rate_display"])
suppressed = df[df["rate_display"].isna()]
all_lau2 = [f["properties"]["LAU2"] for f in geojson["features"]]

fig = go.Figure()
# Base layer: every commune in light grey (no-data + suppressed communes).
fig.add_trace(
    go.Choroplethmap(
        geojson=geojson,
        featureidkey="properties.LAU2",
        locations=all_lau2,
        z=[0] * len(all_lau2),
        colorscale=[[0, "#e9eef3"], [1, "#e9eef3"]],
        showscale=False,
        marker_line_color="#ffffff",
        marker_line_width=0.6,
        hoverinfo="skip",
    )
)
# Colored layer: reportable communes.
if not reportable.empty:
    fig.add_trace(
        go.Choroplethmap(
            geojson=geojson,
            featureidkey="properties.LAU2",
            locations=reportable["lau2"].astype(str).tolist(),
            z=reportable["share"].tolist(),
            customdata=reportable[["commune", "observed"]].to_numpy(),
            colorscale=SHARE_SCALE,
            zmin=0,
            colorbar=dict(title="AI share (%)", thickness=14, len=0.7),
            marker_line_color="#ffffff",
            marker_line_width=0.6,
            hovertemplate=(
                "<b>%{customdata[0]}</b><br>%{z:.1f}% using AI"
                "<br>%{customdata[1]:,} firms observed<extra></extra>"
            ),
        )
    )
# Plain white basemap (no tiles, works offline), web-mercator, centred on LU.
fig.update_layout(
    map_style="white-bg",
    map_center={"lat": 49.815, "lon": 6.13},
    map_zoom=8.4,
    margin=dict(l=0, r=0, t=10, b=0),
    height=640,
    paper_bgcolor="white",
    font=dict(family="Inter, system-ui, sans-serif", size=13, color="#1f2937"),
)
st.plotly_chart(fig, width="stretch", config={"scrollZoom": False})

# Companion ranking of reportable communes.
if not reportable.empty:
    ranked = (
        pd.DataFrame(
            {
                "Commune": reportable["commune"].astype(str),
                "AI share (%)": reportable["share"].round(1),
                "Firms observed": reportable["observed"],
            }
        )
        .sort_values("AI share (%)", ascending=False)
        .reset_index(drop=True)
    )
    st.subheader(f"Communes ranked by AI adoption — {period}")
    st.caption(
        f"{len(ranked)} communes with at least {stats_lib.MIN_OBS} observed "
        f"firms ({len(suppressed)} communes shown in grey)."
    )
    st.dataframe(ranked, width="stretch", hide_index=True)

branding.page_footer()
