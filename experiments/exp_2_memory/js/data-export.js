/**
 * Data Export Module for Memory Experiment
 *
 * Handles sending experiment data to Google Sheets (separate sheet from Experiment 1)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const DATA_EXPORT_CONFIG = {
    // Google Sheets Web App URL (same as Experiment 1, but data goes to "Memory" sheet)
    // IMPORTANT: Update the Google Apps Script to handle the "experiment" parameter
    googleSheetsUrl: 'https://script.google.com/macros/s/AKfycbz9aAC62i3gNYQWIbYzjnM19zzxqckEfbxzxHAX09bCOExOqo4GWeZcYyr3S62bIeDr/exec'
};

// ============================================================================
// GOOGLE SHEETS EXPORT
// ============================================================================

/**
 * Send experiment data to Google Sheets
 * @param {Object} jsPsych - The jsPsych instance
 * @param {string} participantId - The participant's ID
 * @returns {Promise<boolean>} - Whether the export was successful
 */
async function sendToGoogleSheets(jsPsych, participantId) {
    if (!DATA_EXPORT_CONFIG.googleSheetsUrl) {
        console.warn('Google Sheets URL not configured.');
        return false;
    }

    const allData = jsPsych.data.get().values();

    // Find round data (call-function trials with complete response data)
    const roundData = allData.filter(d => {
        if (d.value && d.value.round_number !== undefined && d.value.question_type) {
            return true;
        }
        return false;
    });

    // Get demographics data
    const demographicsEntry = allData.find(d =>
        d.trial_type === 'survey-html-form' && d.response && d.response.age !== undefined
    );
    const demographics = demographicsEntry ? demographicsEntry.response : {};

    // Prepare payload
    const payload = {
        experiment: 'memory',  // Tells the script to use the "Memory" sheet
        participant_id: participantId,
        timestamp: new Date().toISOString(),
        demographics: demographics,
        rounds: roundData.map(round => {
            const data = round.value || round;
            return {
                round_number: data.round_number,
                size_condition: data.size_condition,
                question_type: data.question_type,
                is_practice: data.is_practice,
                // Actual composition
                actual_asian: data.actual_asian,
                actual_black: data.actual_black,
                actual_hispanic: data.actual_hispanic,
                actual_white: data.actual_white,
                actual_smiling: data.actual_smiling,
                actual_not_smiling: data.actual_not_smiling,
                // Responses (race question)
                asian_response: data.asian_response,
                black_response: data.black_response,
                hispanic_response: data.hispanic_response,
                white_response: data.white_response,
                asian_error: data.asian_error,
                black_error: data.black_error,
                hispanic_error: data.hispanic_error,
                white_error: data.white_error,
                // Responses (smile question)
                smiling_response: data.smiling_response,
                not_smiling_response: data.not_smiling_response,
                smiling_error: data.smiling_error,
                not_smiling_error: data.not_smiling_error,
                // Response time
                response_rt: data.response_rt
            };
        })
    };

    console.log('Payload rounds count:', payload.rounds.length);

    // Use form submission via hidden iframe
    return new Promise((resolve) => {
        try {
            const iframe = document.createElement('iframe');
            iframe.name = 'google-sheets-target-' + Date.now();
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = DATA_EXPORT_CONFIG.googleSheetsUrl;
            form.target = iframe.name;
            form.style.display = 'none';

            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'data';
            input.value = JSON.stringify(payload);
            form.appendChild(input);

            document.body.appendChild(form);
            form.submit();

            console.log('Data sent to Google Sheets via form submission');

            setTimeout(() => {
                document.body.removeChild(form);
                document.body.removeChild(iframe);
            }, 5000);

            resolve(true);

        } catch (error) {
            console.error('Failed to send data to Google Sheets:', error);
            resolve(false);
        }
    });
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Export experiment data to Google Sheets
 * @param {Object} jsPsych - The jsPsych instance
 * @param {string} participantId - The participant's ID
 * @param {Function} onComplete - Callback when export is complete
 * @param {Function} onError - Callback if export fails
 */
async function exportData(jsPsych, participantId, onComplete, onError) {
    if (!DATA_EXPORT_CONFIG.googleSheetsUrl) {
        if (onError) onError('Google Sheets URL not configured');
        return;
    }

    const success = await sendToGoogleSheets(jsPsych, participantId);

    if (success) {
        if (onComplete) onComplete('sheets');
    } else {
        if (onError) onError('Failed to export data');
    }
}
