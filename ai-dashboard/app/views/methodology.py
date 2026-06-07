"""Methodology — how the numbers are built and how to read them."""

import streamlit as st

from lib import branding

branding.page_header(
    "Methodology", "How the numbers are built and how to read them."
)
st.caption("Read this before quoting any figure from the dashboard.")

st.markdown(
    """
## What this dashboard measures

It tracks the **diffusion of artificial intelligence across Luxembourg firms**
from May 2013 to April 2026. For each firm with a website, we retrieve archived
snapshots of that website over time from a large public web archive, extract the
text, and use a language model to judge whether the page shows evidence that the
firm *uses or offers AI*. A firm counts as **AI-active** from the first month we
see such evidence onward.

## The firm population

The denominator is the population of real, operating Luxembourg firms, built
from official company-register information.

A raw register of Luxembourg legal entities is dominated by **holding companies
and investment vehicles** — passive financial shells with no staff, no
operations and no website. Luxembourg is the European hub for these. Counting
them would make the firm universe look several times larger than the real
economy. We therefore remove them, following the **official national
convention**: the statistical office defines the "market economy" by excluding
exactly these holding and fund categories. After this cleaning the population
contains roughly **126,000 firms (about 72,000 currently operating)**, against
an official benchmark of **~44,000–48,000 active market-economy enterprises**
in recent years. The remaining gap is the difference between a register count
(every legally-active unit) and the statistical count (only units with measured
turnover or employment) — we cannot close it without turnover data, and we do
not try to.

By default the dashboard shows **businesses**. Public bodies, non-profits and
entities with an unrecorded legal form are incompletely covered by the register,
and their AI signal is dominated by topic/policy discourse and shared-website
misattribution (below), so they are opt-in via the *Firm type* filter rather
than mixed into the headline.

## The two adoption rates

Only some firms can be observed (those whose website appears in the archive),
and observable firms are not a random sample — they skew toward larger,
more digital, certain-industry firms. We therefore report two rates:

- **Observed share** — among firms we actually observe, the fraction showing AI
  use. Simple and transparent, but it runs high because observable firms are
  more AI-prone.
- **Representative share** — the observed shares reweighted so each industry ×
  size group counts in proportion to its true share of the Luxembourg firm
  population. This corrects for our sample over- or under-representing
  industries and sizes, and it reweights to the firm population *active in each
  month* (so firm entry and exit are handled).

Reweighting corrects *composition*. It cannot correct selection *within* a
group — a firm with no website is also less likely to use AI — so the
representative rate narrows the gap to the truth but does not eliminate it. It
is best read as a better-justified estimate, not the final word.

## "Not observed" is not "no AI"

Whether a firm is *observed* is a firm-level property: a firm is observed if
its website appears in at least one archived snapshot **within its activity
period**. For an observed firm we then assign a state to every month of its
active period:

| State | Meaning | How we use it |
|-------|---------|---------------|
| AI-active | The firm has shown AI evidence by this month (see the one-way rule below) | counts toward adoption |
| Observed, not AI | The firm is observed in-period but has not yet shown AI evidence | counts in the denominator |
| Not observed | The firm has no in-period snapshot at all | excluded from every rate; never treated as "no AI" |

Two consequences worth being explicit about. First, treating a firm we never
see online as "not using AI" would invent evidence, so those firms are dropped
from the rates entirely, not scored as zero. Second, because observation is a
firm-level property, an observed firm's months *without* a snapshot are still
filled in by the one-way rule below (not left out) — so the pre-adoption part
of the curve, especially in the early years, rests on that assumption rather
than on a fresh snapshot every month.

## Adoption is treated as a one-way step

Once a firm shows AI evidence, we treat it as an adopter from that month onward,
even if a later snapshot happens not to mention AI. Adoption is modelled as a
state change, not a month-to-month on/off signal. We never mark a firm an
adopter *before* its first observed evidence.

## Small numbers are suppressed

A share computed from very few firms is unreliable, so — following standard
statistical-office practice — **any share based on fewer than 30 observed firms
is not shown** (left blank on heatmaps and maps, gapped on time series). We
never replace a suppressed value with a zero or a blank that could be mistaken
for a real low value, and we show the number of firms behind each estimate on
hover. A 95% confidence band accompanies the headline time series whenever
every month in the current selection clears the 30-firm threshold.

## The map

The map assigns each firm to its commune and shows the latest-month observed
share by commune. It responds to the **Firm type** and **Industry** sidebar
filters — so you can map, say, manufacturing businesses only — while the finer
filters (size, activity status, and the website / ownership attribution
toggles) are not held at commune level and leave it unchanged. Communes with
fewer than 30 observed firms are greyed out.

## Known limitations

- We only see firms with a website that the archive captured; firms without a
  web presence are invisible regardless of how the numbers are weighted, and
  some of them surely use AI.
- The register's "active" flag means *legally registered*, not necessarily
  *trading*; this is the main reason our firm count exceeds the official one.
- The AI classifier reads marketing-style language; pure infrastructure
  providers may be over-counted and firms using AI silently may be under-counted.
- Many firms list a **group or portal website** shared with other entities; the
  AI shown there belongs to the group, not the individual firm. Firms with their
  own website show ~10% AI versus ~38% for heavily-shared sites. The *Only firms
  with their own website* filter isolates the firms whose web signal is
  unambiguously their own.
- Seen from the ownership side, subsidiaries of a **multi-firm corporate group**
  (identified from the firm's ultimate owner) show ~34% AI versus ~12% for
  standalone firms — the same group-attribution effect. The *Only standalone
  firms* filter excludes group subsidiaries.
- Two early archive crawls returned no usable pages, lowering how often firms
  were seen in those windows. The month axis itself is continuous (each firm's
  state is carried across months by the one-way rule), so this affects
  observation density, not the shape of the time axis.

## Sources

- AI evidence: a large public web archive of Luxembourg firm websites,
  classified with a large language model.
- Firm population and attributes: official company-register information.
- Benchmarks: Eurostat Structural Business Statistics and Business Demography,
  and the national statistical office's enterprise statistics.
"""
)

branding.page_footer()
