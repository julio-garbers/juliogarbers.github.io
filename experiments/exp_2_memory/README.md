# Face Memory Experiment

An online experiment measuring race and smile memory accuracy across different profile picture sizes.

## Quick Start

Run the server from the `experiments` folder:

```bash
cd /home/julio/Documents/airbnb/experiments
python3 -m http.server 8000
# Open http://localhost:8000/exp_2_memory/index.html
```

## Experiment Design

### Hypotheses

**H1 (Race Memory):** In small pictures, race recall accuracy will remain high for Black faces while declining for Asian, Hispanic, and White faces.

**H2 (Smile Memory):** In small pictures, smile recall accuracy will decline across all racial groups.

**H3 (Relative Salience):** The negative effect of small image size on recall accuracy will be larger for smiles than for race.

### Structure

| Aspect | Value |
|--------|-------|
| Total Rounds | 12 |
| Images per Round | 8 (2×4 grid) |
| Display Duration | 5 seconds |
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
2. **Grid Display** (5 seconds) - 8 faces in 2×4 grid
3. **Fixation Cross** (0.5 seconds)
4. **Question** - Either race counts OR smile counts (30 second timeout)

### Flow

1. Display Check (fullscreen + 100% zoom)
2. Welcome
3. Consent
4. Demographics
5. Instructions
6. Practice Round (uses practice images, with race question)
7. Main Experiment (12 rounds, no feedback)
8. Debrief

### Questions

**Race Question:**
> "For each race, how many faces do you remember seeing?"
> - Asian: [0-8]
> - Black: [0-8]
> - Hispanic: [0-8]
> - White: [0-8]

**Smile Question:**
> "How many smiling and non-smiling faces do you remember seeing?"
> - Smiling: [0-8]
> - Not Smiling: [0-8]

## File Structure

```
exp_2_memory/
├── index.html           # Main experiment
├── README.md            # This file
├── GOOGLE_SHEETS_SETUP.md # Google Sheets integration
├── css/
│   └── experiment.css   # Styling
└── js/
    ├── stimuli.js       # Stimulus configuration
    ├── experiment.js    # Main experiment logic
    └── data-export.js   # Google Sheets export
```

## Image Requirements

Images are stored in shared folders at the `experiments` level:
- `../images/` - Main experiment images (64 total)
- `../practice_images/` - Practice round images (32 total)

### Naming Convention

```
{race}_{gender}_{smile}_{id}_{size}.{ext}
```

- **race**: `black`, `asian`, `white`, `hispanic`
- **gender**: `male`, `female`
- **smile**: `smile`, `nosmile`
- **id**: `01`, `02` (main) or `01` (practice)
- **size**: `big` (256x256), `small` (104x104)
- **ext**: `.jpeg` for big, `.png` for small

## Data Output

Data is sent to the **"memory"** sheet in the same Google Sheets file as Experiment 1.

### Key Variables

| Variable | Description |
|----------|-------------|
| `round_number` | 1-12 or "practice" |
| `size_condition` | "big" or "small" |
| `question_type` | "race" or "smile" |
| `grid_order` | Order of images in grid positions 1-8 (e.g., "black_male_01:smile,asian_female_02:nosmile,...") |
| `input_order` | Order of input fields shown (e.g., "hispanic,black,white,asian") |
| `response_order` | Order participant filled in inputs (e.g., "black,white,hispanic,asian") |
| `actual_*` | True count of each category in the grid |
| `*_response` | Participant's reported count |
| `*_error` | Response - Actual (negative = undercount) |
| `*_correct` | TRUE/FALSE whether response matches actual |
| `response_rt` | Response time in milliseconds |

## Image Composition

Each round's 8-image grid is randomized with:
- At least some representation of each race (practice uses all 4 races, 2 each)
- At least 2 smiling and 2 non-smiling faces
- Random selection from available individuals

## Dependencies

Same as Experiment 1:
- jsPsych 7.3.4
- jsPsych plugins (html-button-response, survey-html-form, etc.)
- Fullscreen plugin for display requirements
