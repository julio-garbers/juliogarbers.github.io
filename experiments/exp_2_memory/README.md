# Face Memory Experiment

An online experiment measuring race and smile memory accuracy across different profile picture sizes.

## Quick Start

```bash
cd /home/julio/Documents/airbnb/experiments/exp_2_memory
python3 -m http.server 8001
# Then open http://localhost:8001/index.html
```

Images are shared with Experiment 1 via symlink.

## Experiment Design

### Hypotheses

**H1 (Race Memory):** In small pictures, race recall accuracy will remain high for Black faces while declining for Asian, Hispanic, and White faces.

**H2 (Smile Memory):** In small pictures, smile recall accuracy will decline across all racial groups.

**H3 (Relative Salience):** The negative effect of small image size on recall accuracy will be larger for smiles than for race.

### Structure

| Aspect | Value |
|--------|-------|
| Total Rounds | 12 |
| Images per Round | 12 (3×4 grid) |
| Display Duration | 10 seconds |
| Question per Round | 1 (race OR smile) |
| Size Conditions | Big (256px), Small (104px) |

### Balanced Design

Each participant completes 12 rounds:

| Size | Race Question | Smile Question |
|------|---------------|----------------|
| Big | 3 rounds | 3 rounds |
| Small | 3 rounds | 3 rounds |

### Round Structure

1. **Pre-round Instruction** - Tells participant what question type to expect
2. **Grid Display** (10 seconds) - 12 faces in 3×4 grid
3. **Fixation Cross** (0.5 seconds)
4. **Question** - Either race counts OR smile counts (30 second timeout)

### Flow

1. Welcome
2. Consent
3. Demographics
4. Display Check (fullscreen + 100% zoom)
5. Instructions
6. Practice Round (with feedback)
7. Main Experiment (12 rounds, no feedback)
8. Debrief

### Questions

**Race Question:**
> "For each race, how many faces do you remember seeing?"
> - Asian: [0-12]
> - Black: [0-12]
> - Hispanic: [0-12]
> - White: [0-12]

**Smile Question:**
> "How many smiling and non-smiling faces do you remember seeing?"
> - Smiling: [0-12]
> - Not Smiling: [0-12]

## File Structure

```
exp_2_memory/
├── index.html           # Main experiment
├── README.md            # This file
├── GOOGLE_SHEETS_SETUP.md # Google Sheets integration
├── css/
│   └── experiment.css   # Styling
├── js/
│   ├── stimuli.js       # Stimulus configuration
│   ├── experiment.js    # Main experiment logic
│   └── data-export.js   # Google Sheets export
└── images/              # Symlink to exp_1 images
```

## Data Output

Data is sent to the **"memory"** sheet in the same Google Sheets file as Experiment 1.

### Key Variables

| Variable | Description |
|----------|-------------|
| `round_number` | 1-12 or "practice" |
| `size_condition` | "big" or "small" |
| `question_type` | "race" or "smile" |
| `actual_*` | True count of each category in the grid |
| `*_response` | Participant's reported count |
| `*_error` | Response - Actual (negative = undercount) |
| `response_rt` | Response time in milliseconds |

## Image Composition

Each round's 12-image grid is randomized with:
- At least some representation of each race
- At least 2 smiling and 2 non-smiling faces
- Random selection from the 16 available individuals

## Dependencies

Same as Experiment 1:
- jsPsych 7.3.4
- jsPsych plugins (html-button-response, survey-html-form, etc.)
- Fullscreen plugin for display requirements
