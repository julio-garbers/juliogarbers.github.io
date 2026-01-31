# Face Perception Experiment (Attention/Accuracy)

An online experiment measuring race and smile detection accuracy across different profile picture sizes.

## Quick Start

```bash
cd /home/julio/Documents/airbnb/experiments/exp_1_attention_accuracy
python3 -m http.server 8000
# Open http://localhost:8000/index.html
```

Requires all 64 images in the `images/` folder.

## Experiment Design

### Hypotheses

**H1 (Race Detection):** In small pictures, race detection accuracy will remain high for Black faces while declining for Asian, Hispanic, and White faces, suggesting skin color remains detectable when other features become harder to perceive.

**H2 (Smile Detection):** In small pictures, smile detection accuracy will decline across all racial groups, as the facial features that convey smiling become harder to perceive.

**Implication:** Together, H1 and H2 suggest that smaller pictures increase the *relative* salience of skin color compared to other facial features—supporting the proposed mechanism.

### Structure

| Aspect | Value |
|--------|-------|
| Total Trials | 16 |
| Images per Trial | 1 |
| Display Duration | 2 seconds |
| Questions per Trial | 2 (race AND smile) |
| Size Conditions | Big (256px), Small (104px) |

### Balanced Design

Each participant sees all 16 individuals:
- Exactly 8 big + 8 small images
- Exactly 8 smiling + 8 not smiling images
- Question order randomized (race first vs. smile first)

### Trial Structure

1. **Image Display** (2 seconds) - Single face shown
2. **Fixation Cross** (0.5 seconds)
3. **Question 1** (10 second timeout) - Race OR Smile (randomized)
4. **Question 2** (10 second timeout) - The other question

### Questions

**Race Question:**
> "What is the race of the person you just saw?"
> - Asian / Black / Hispanic / White (order randomized)

**Smile Question:**
> "Was the person smiling?"
> - Yes / No (order randomized)

### Flow

1. Welcome
2. Consent
3. Demographics
4. Display Check (fullscreen + 100% zoom)
5. Instructions
6. Practice Trial (with feedback)
7. Main Experiment (16 trials, no feedback)
8. Debrief

## File Structure

```
exp_1_attention_accuracy/
├── index.html           # Main experiment
├── README.md            # This file
├── GOOGLE_SHEETS_SETUP.md # Google Sheets reference
├── css/
│   └── experiment.css   # Styling
├── js/
│   ├── stimuli.js       # Stimulus configuration
│   ├── experiment.js    # Main experiment logic
│   └── data-export.js   # Google Sheets export
└── images/
    ├── README.md        # Image naming instructions
    └── *.jpeg/*.png     # Stimulus images (64 total)
```

## Image Requirements

### Naming Convention

```
{race}_{gender}_{smile}_{id}_{size}.{ext}
```

- **race**: `black`, `asian`, `white`, `hispanic`
- **gender**: `male`, `female`
- **smile**: `smile`, `nosmile`
- **id**: `01`, `02`
- **size**: `big` (256x256), `small` (104x104)
- **ext**: `.jpeg` for big, `.png` for small

Example: `black_male_smile_01_big.jpeg`

64 images total (16 individuals × 2 sizes × 2 expressions). See `images/README.md` for the complete list.

## Data Output

Data is sent to the **`att_acc`** sheet in Google Sheets.

### Key Variables

| Variable | Description |
|----------|-------------|
| `participant_id` | Unique ID for each participant |
| `trial_number` | 1-16 for main trials, "practice" for practice |
| `individual_id` | Which individual was shown |
| `size_condition` | "big" or "small" |
| `smile_condition` | "smile" or "nosmile" |
| `question_order` | "race_first" or "smile_first" |
| `race_response` | Participant's race answer |
| `race_rt` | Response time (ms) |
| `race_correct` | Boolean |
| `smile_response` | "yes" or "no" |
| `smile_rt` | Response time (ms) |
| `smile_correct` | Boolean |

## Dependencies

All dependencies loaded from CDN:
- jsPsych 7.3.4
- jsPsych plugins (html-button-response, survey-html-form, fullscreen, etc.)
