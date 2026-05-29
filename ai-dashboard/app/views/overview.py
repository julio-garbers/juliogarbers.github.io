"""Overview — headline adoption time series + KPIs."""

import plotly.graph_objects as go
import streamlit as st

from lib import aggregations as agg
from lib import branding
from lib import filters as filters_lib
from lib import stats as stats_lib
from lib.style import COLORS, apply_layout

fs = filters_lib.render_sidebar()

branding.page_header(
    "AI Adoption in Luxembourg",
    "Share of firms showing evidence of AI use on their website, May 2013 – April 2026.",
)

ts = agg.time_series(fs)
k = agg.kpis(fs)

if ts.empty or k.n_population == 0:
    st.warning("No firms match the current filters.")
    st.stop()

# --- KPI tiles -------------------------------------------------------------
latest = ts.iloc[-1]
c1, c2, c3 = st.columns(3)
c1.metric(
    "Firms observed online",
    f"{k.n_sample:,}",
    help="Firms whose website appeared in the web archive at least once over "
    "2013–2026 — the firms whose AI use we can directly measure (a firm need "
    "not be observed in every month).",
)
latest_obs = latest["rate_display"]
c2.metric(
    f"Observed share ({latest['month_date']:%b %Y})",
    f"{100 * latest_obs:.1f}%" if latest_obs == latest_obs else "—",  # NaN guard
    help="Estimator A — among observed firms.",
)
# Suppress the representative KPI too when the latest month is thin, so the
# tile and the chart (which gaps below MIN_OBS) agree.
latest_rep = (
    latest["rate_rep"] if latest["observed"] >= stats_lib.MIN_OBS else float("nan")
)
c3.metric(
    f"Representative share ({latest['month_date']:%b %Y})",
    f"{100 * latest_rep:.1f}%" if latest_rep == latest_rep else "—",
    help="Estimator B — reweighted to the full firm population by industry "
    "and size.",
)

st.markdown("---")

# --- Time series chart -----------------------------------------------------
# Suppress both estimators in months with too few observed firms.
reliable = ts["observed"] >= stats_lib.MIN_OBS
obs_y = (100 * ts["rate_display"]).where(reliable)
rep_y = (100 * ts["rate_rep"]).where(reliable)
no_suppression = bool(reliable.all())

fig = go.Figure()
if no_suppression:
    fig.add_trace(
        go.Scatter(
            x=list(ts["month_date"]) + list(ts["month_date"][::-1]),
            y=list(100 * ts["ci_hi"]) + list(100 * ts["ci_lo"][::-1]),
            fill="toself",
            fillcolor="rgba(31, 78, 121, 0.12)",
            line=dict(width=0),
            hoverinfo="skip",
            showlegend=False,
        )
    )
fig.add_trace(
    go.Scatter(
        x=ts["month_date"],
        y=obs_y,
        mode="lines",
        name="Observed share",
        connectgaps=False,
        line=dict(color=COLORS["observed"], width=3),
        hovertemplate="<b>Observed</b> %{y:.1f}%<br>%{x|%b %Y}<extra></extra>",
    )
)
fig.add_trace(
    go.Scatter(
        x=ts["month_date"],
        y=rep_y,
        mode="lines",
        name="Representative share",
        connectgaps=False,
        line=dict(color=COLORS["representative"], width=2.5, dash="dash"),
        hovertemplate="<b>Representative</b> %{y:.1f}%<br>%{x|%b %Y}<extra></extra>",
    )
)
apply_layout(
    fig,
    yaxis_title="Share of firms using AI (%)",
    xaxis_title=None,
    hovermode="x unified",
    height=440,
    legend=dict(orientation="h", yanchor="bottom", y=1.0, xanchor="left", x=0),
)
st.plotly_chart(fig, width="stretch")
st.caption(
    f"Shaded band = 95% confidence interval on the observed share. Latest "
    f"observed share is based on {int(latest['observed']):,} observed firms."
)

# --- Reliability note if the selection is thin -----------------------------
thin = ts[ts["observed"] < stats_lib.MIN_OBS]
if len(thin) > 0:
    st.info(
        f"{len(thin)} of {len(ts)} months have fewer than {stats_lib.MIN_OBS} "
        "observed firms and are not plotted for the observed share — narrow "
        "filters leave little to measure in those months."
    )

# --- Estimator explainer (below the plot) ----------------------------------
with st.expander("What do the two lines mean?", expanded=False):
    st.markdown(
        """
        - **Observed share** — of the firms we can actually see online, the
          fraction showing AI use. Cleanest signal, but it leans high because
          firms with a rich web presence are more likely both to be observed
          *and* to use AI.
        - **Representative share** — the observed shares reweighted so that each
          industry × size group counts in proportion to its true weight in the
          Luxembourg firm population. This corrects for our sample
          over-representing some industries and sizes.

        Reweighting cannot fix selection *within* a group (a firm with no
        website is also less likely to use AI), so the representative line
        narrows the gap to the truth but does not close it entirely.
        """
    )

branding.page_footer()
