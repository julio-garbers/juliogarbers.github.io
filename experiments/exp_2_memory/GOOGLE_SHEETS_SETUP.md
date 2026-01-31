# Google Sheets Configuration

Both experiments send data to the **same Google Sheets file** but to **different sheets**.

## Sheet Structure

| Sheet Tab | Experiment | Content |
|-----------|------------|---------|
| **att_acc** | Experiment 1 (Attention/Accuracy) | 16 trials per participant |
| **memory** | Experiment 2 (Memory) | 12 rounds per participant |
| **debug** | Both | Debug logging |

---

## Data Columns Reference

### att_acc Sheet (Experiment 1)

| Column | Description |
|--------|-------------|
| timestamp | When data was submitted |
| participant_id | Unique ID |
| demo_* | Demographics |
| trial_number | 1-16 or "practice" |
| individual_id | Which face was shown |
| true_race / true_gender | Ground truth |
| size_condition | "big" or "small" |
| smile_condition | "smile" or "nosmile" |
| question_order | "race_first" or "smile_first" |
| race_response / race_rt / race_correct | Race question data |
| smile_response / smile_rt / smile_correct | Smile question data |

### memory Sheet (Experiment 2)

| Column | Description |
|--------|-------------|
| timestamp | When data was submitted |
| participant_id | Unique ID |
| demo_* | Demographics |
| round_number | 1-12 or "practice" |
| size_condition | "big" or "small" |
| question_type | "race" or "smile" |
| actual_* | True count in the grid |
| *_response | Participant's count |
| *_error | Response minus actual (negative = undercount) |
| response_rt | Response time in ms |

---

## Google Apps Script

The following script is deployed in Google Sheets to handle data from both experiments.

```javascript
/**
 * Google Apps Script for Face Perception Experiments
 *
 * Handles data from:
 * - Experiment 1: Attention/Accuracy → "att_acc" sheet
 * - Experiment 2: Memory → "memory" sheet
 * - Debug logging → "debug" sheet
 */

// ============================================================================
// CONFIGURATION - Sheet names for each experiment
// ============================================================================

const SHEET_NAMES = {
    attention: 'att_acc',   // Experiment 1: Attention/Accuracy
    memory: 'memory'        // Experiment 2: Memory
};

// ============================================================================
// MAIN REQUEST HANDLERS
// ============================================================================

/**
 * Handle POST requests from experiments
 */
function doPost(e) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Get or create debug sheet for logging
    let debugSheet = ss.getSheetByName('debug');
    if (!debugSheet) {
        debugSheet = ss.insertSheet('debug');
    }

    // Log what we received
    debugSheet.appendRow([new Date(), 'POST received']);
    debugSheet.appendRow([new Date(), 'e.parameter', JSON.stringify(e.parameter || {})]);
    debugSheet.appendRow([new Date(), 'e.postData', e.postData ? 'exists' : 'null']);

    if (e.postData) {
        debugSheet.appendRow([new Date(), 'e.postData.type', e.postData.type || 'no type']);
        debugSheet.appendRow([new Date(), 'e.postData.contents length', e.postData.contents ? e.postData.contents.length : 0]);
    }

    try {
        // Parse incoming data
        let data;
        if (e.parameter && e.parameter.data) {
            debugSheet.appendRow([new Date(), 'Parsing from e.parameter.data']);
            data = JSON.parse(e.parameter.data);
        } else if (e.postData && e.postData.contents) {
            debugSheet.appendRow([new Date(), 'Parsing from e.postData.contents']);
            data = JSON.parse(e.postData.contents);
        } else {
            debugSheet.appendRow([new Date(), 'ERROR', 'No data found']);
            throw new Error('No data received');
        }

        // Determine which experiment sent the data
        // Default to 'attention' for backwards compatibility with Experiment 1
        const experimentType = data.experiment || 'attention';
        const sheetName = SHEET_NAMES[experimentType] || SHEET_NAMES.attention;

        debugSheet.appendRow([new Date(), 'SUCCESS', 'experiment: ' + experimentType + ', participant_id: ' + data.participant_id]);

        // Get or create the appropriate sheet
        let sheet = ss.getSheetByName(sheetName);

        if (!sheet) {
            // Create the sheet if it doesn't exist
            sheet = ss.insertSheet(sheetName);
            if (experimentType === 'memory') {
                addMemoryHeaders(sheet);
            } else {
                addAttentionHeaders(sheet);
            }
        }

        // Add headers if sheet is empty
        if (sheet.getLastRow() === 0) {
            if (experimentType === 'memory') {
                addMemoryHeaders(sheet);
            } else {
                addAttentionHeaders(sheet);
            }
        }

        // Append the data to the appropriate sheet
        if (experimentType === 'memory') {
            appendMemoryData(sheet, data);
        } else {
            appendAttentionData(sheet, data);
        }

        // Return success response
        return ContentService
            .createTextOutput(JSON.stringify({
                status: 'success',
                experiment: experimentType,
                sheet: sheetName
            }))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        debugSheet.appendRow([new Date(), 'ERROR', error.toString()]);
        return ContentService
            .createTextOutput(JSON.stringify({
                status: 'error',
                message: error.toString()
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * Handle GET requests (for testing the endpoint)
 */
function doGet(e) {
    return ContentService
        .createTextOutput('Face Perception Experiments Data Collector v2.0\n\nSupported experiments:\n- attention → att_acc sheet\n- memory → memory sheet')
        .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================================
// EXPERIMENT 1: ATTENTION/ACCURACY
// ============================================================================

/**
 * Add headers for the Attention/Accuracy sheet
 */
function addAttentionHeaders(sheet) {
    const headers = [
        'timestamp',
        'participant_id',
        // Demographics
        'demo_age',
        'demo_gender',
        'demo_education',
        'demo_race_asian',
        'demo_race_black',
        'demo_race_hispanic',
        'demo_race_white',
        'demo_race_native',
        'demo_race_pacific',
        'demo_race_other',
        'demo_race_prefer_not',
        // Trial data
        'trial_number',
        'individual_id',
        'true_race',
        'true_gender',
        'size_condition',
        'smile_condition',
        'question_order',
        'race_response',
        'race_rt',
        'race_correct',
        'smile_response',
        'smile_rt',
        'smile_correct',
        'is_practice'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
}

/**
 * Append data from Experiment 1
 */
function appendAttentionData(sheet, data) {
    const timestamp = data.timestamp || new Date().toISOString();
    const participantId = data.participant_id || '';
    const demographics = data.demographics || {};
    const trials = data.trials || [];

    trials.forEach(trial => {
        const row = [
            timestamp,
            participantId,
            // Demographics
            demographics.age || '',
            demographics.gender || '',
            demographics.education || '',
            demographics.race_asian || '',
            demographics.race_black || '',
            demographics.race_hispanic || '',
            demographics.race_white || '',
            demographics.race_native || '',
            demographics.race_pacific || '',
            demographics.race_other || '',
            demographics.race_prefer_not || '',
            // Trial data
            trial.trial_number,
            trial.individual_id,
            trial.true_race,
            trial.true_gender,
            trial.size_condition,
            trial.smile_condition,
            trial.question_order,
            trial.race_response,
            trial.race_rt,
            trial.race_correct,
            trial.smile_response,
            trial.smile_rt,
            trial.smile_correct,
            trial.is_practice
        ];
        sheet.appendRow(row);
    });
}

// ============================================================================
// EXPERIMENT 2: MEMORY
// ============================================================================

/**
 * Add headers for the memory sheet
 */
function addMemoryHeaders(sheet) {
    const headers = [
        'timestamp',
        'participant_id',
        // Demographics
        'demo_age',
        'demo_gender',
        'demo_education',
        'demo_race_asian',
        'demo_race_black',
        'demo_race_hispanic',
        'demo_race_white',
        'demo_race_native',
        'demo_race_pacific',
        'demo_race_other',
        'demo_race_prefer_not',
        // Round info
        'round_number',
        'size_condition',
        'question_type',
        'is_practice',
        // Actual composition (ground truth)
        'actual_asian',
        'actual_black',
        'actual_hispanic',
        'actual_white',
        'actual_smiling',
        'actual_not_smiling',
        // Race question responses
        'asian_response',
        'black_response',
        'hispanic_response',
        'white_response',
        'asian_error',
        'black_error',
        'hispanic_error',
        'white_error',
        // Smile question responses
        'smiling_response',
        'not_smiling_response',
        'smiling_error',
        'not_smiling_error',
        // Timing
        'response_rt'
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
}

/**
 * Append data from Experiment 2
 */
function appendMemoryData(sheet, data) {
    const timestamp = data.timestamp || new Date().toISOString();
    const participantId = data.participant_id || '';
    const demographics = data.demographics || {};
    const rounds = data.rounds || [];

    rounds.forEach(round => {
        const row = [
            timestamp,
            participantId,
            // Demographics
            demographics.age || '',
            demographics.gender || '',
            demographics.education || '',
            demographics.race_asian || '',
            demographics.race_black || '',
            demographics.race_hispanic || '',
            demographics.race_white || '',
            demographics.race_native || '',
            demographics.race_pacific || '',
            demographics.race_other || '',
            demographics.race_prefer_not || '',
            // Round info
            round.round_number,
            round.size_condition,
            round.question_type,
            round.is_practice,
            // Actual composition
            round.actual_asian,
            round.actual_black,
            round.actual_hispanic,
            round.actual_white,
            round.actual_smiling,
            round.actual_not_smiling,
            // Race responses (empty if smile question)
            round.asian_response !== undefined ? round.asian_response : '',
            round.black_response !== undefined ? round.black_response : '',
            round.hispanic_response !== undefined ? round.hispanic_response : '',
            round.white_response !== undefined ? round.white_response : '',
            round.asian_error !== undefined ? round.asian_error : '',
            round.black_error !== undefined ? round.black_error : '',
            round.hispanic_error !== undefined ? round.hispanic_error : '',
            round.white_error !== undefined ? round.white_error : '',
            // Smile responses (empty if race question)
            round.smiling_response !== undefined ? round.smiling_response : '',
            round.not_smiling_response !== undefined ? round.not_smiling_response : '',
            round.smiling_error !== undefined ? round.smiling_error : '',
            round.not_smiling_error !== undefined ? round.not_smiling_error : '',
            // Timing
            round.response_rt
        ];
        sheet.appendRow(row);
    });
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

/**
 * Test Experiment 1 (Attention/Accuracy)
 */
function testAttentionExperiment() {
    const testData = {
        experiment: 'attention',
        participant_id: 'TEST_ATT_' + new Date().getTime(),
        timestamp: new Date().toISOString(),
        demographics: {
            age: '25',
            gender: 'female',
            education: 'bachelors'
        },
        trials: [
            {
                trial_number: 'practice',
                individual_id: 'white_female_01',
                true_race: 'white',
                true_gender: 'female',
                size_condition: 'big',
                smile_condition: 'smile',
                question_order: 'race_first',
                race_response: 'white',
                race_rt: 1500,
                race_correct: true,
                smile_response: 'yes',
                smile_rt: 1200,
                smile_correct: true,
                is_practice: true
            }
        ]
    };

    const mockEvent = {
        postData: { contents: JSON.stringify(testData) }
    };

    const result = doPost(mockEvent);
    console.log('Attention Test Result:', result.getContent());
}

/**
 * Test Experiment 2 (Memory)
 */
function testMemoryExperiment() {
    const testData = {
        experiment: 'memory',
        participant_id: 'TEST_MEM_' + new Date().getTime(),
        timestamp: new Date().toISOString(),
        demographics: {
            age: '28',
            gender: 'male',
            education: 'masters'
        },
        rounds: [
            {
                round_number: 'practice',
                size_condition: 'big',
                question_type: 'race',
                is_practice: true,
                actual_asian: 3,
                actual_black: 3,
                actual_hispanic: 3,
                actual_white: 3,
                actual_smiling: 6,
                actual_not_smiling: 6,
                asian_response: 2,
                black_response: 4,
                hispanic_response: 3,
                white_response: 3,
                asian_error: -1,
                black_error: 1,
                hispanic_error: 0,
                white_error: 0,
                response_rt: 15000
            }
        ]
    };

    const mockEvent = {
        postData: { contents: JSON.stringify(testData) }
    };

    const result = doPost(mockEvent);
    console.log('Memory Test Result:', result.getContent());
}
```

---

## Troubleshooting

### Sheet not being created
- Make sure you deployed a **new version** of the script after changes
- Run the test functions to manually create sheets

### Script errors
- Go to **Apps Script → Executions** to see error logs
- Check the **debug** sheet for detailed request logging
