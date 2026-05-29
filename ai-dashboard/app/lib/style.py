"""Shared Plotly theme + LISER palette.

Colours are LISER's official brand palette (from the .ase swatch files):
navy #000070, red #E30613, blue #0099FF, cyan #00AEEF, plus the navy/blue
sequential ramps and a neutral grey ramp.
"""

import plotly.graph_objects as go
import plotly.io as pio

# --- LISER brand colours ---------------------------------------------------
NAVY = "#000070"      # primary
NAVY_DEEP = "#000066"
RED = "#E30613"       # accent / contrast
BLUE = "#0099FF"      # secondary
CYAN = "#00AEEF"
TEAL = "#006699"
INK = "#283137"       # body text (LISER dark grey)
GREY = "#61737B"
GREY_LT = "#A6B3BA"
GRID = "#EEF1F4"

COLORS = {
    "observed": NAVY,            # Estimator A — observed share
    "representative": RED,       # Estimator B — post-stratified
    "population": "#CCC6E0",     # light indigo — population bars
    "sample": NAVY,              # sample bars
    "ai": BLUE,
    "official": GREY,            # benchmark reference line
    "muted": GREY_LT,
    "caution": "#D0CCD0",
}

# Categorical sequence — LISER ramp mix, high-contrast first.
CATEGORICAL = [
    NAVY, RED, CYAN, TEAL, "#4A3D8B", BLUE, "#990000", "#0092C1",
    "#7366A4", "#56C4EF", "#C64128", "#4BABD1", "#9D93C1", "#35BBDE",
]

# Sequential scale for the AI-share heatmap / choropleth (LISER blue ramp,
# light -> navy).
SHARE_SCALE = [
    [0.00, "#EAF4FB"],
    [0.15, "#D0ECFB"],
    [0.35, "#9CD8F5"],
    [0.55, "#56C4EF"],
    [0.75, "#0099FF"],
    [0.90, "#006699"],
    [1.00, NAVY],
]

FONT_FAMILY = "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"


def _template() -> go.layout.Template:
    t = go.layout.Template()
    t.layout = go.Layout(
        font=dict(family=FONT_FAMILY, size=13, color=INK),
        plot_bgcolor="white",
        paper_bgcolor="white",
        colorway=CATEGORICAL,
        title=dict(font=dict(family=FONT_FAMILY, size=16, color=NAVY)),
        xaxis=dict(showgrid=True, gridcolor=GRID, zeroline=False, linecolor="#D9DEE3",
                   tickfont=dict(color=GREY)),
        yaxis=dict(showgrid=True, gridcolor=GRID, zeroline=False, linecolor="#D9DEE3",
                   tickfont=dict(color=GREY)),
        legend=dict(bgcolor="rgba(255,255,255,0.9)", bordercolor="#E5E9ED",
                    borderwidth=1, font=dict(color=INK)),
        margin=dict(l=60, r=20, t=50, b=50),
        hoverlabel=dict(bgcolor="white", bordercolor="#E5E9ED",
                        font=dict(family=FONT_FAMILY, size=12, color=INK)),
    )
    return t


pio.templates["liser"] = _template()
pio.templates.default = "liser"


def apply_layout(fig: go.Figure, **kwargs) -> go.Figure:
    fig.update_layout(template="liser", **kwargs)
    return fig
