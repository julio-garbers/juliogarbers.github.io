/**
 * Data Export Module
 *
 * Handles sending experiment data to Google Sheets or downloading as CSV.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const DATA_EXPORT_CONFIG = {
    // Google Sheets Web App URL (set this after deploying your Google Apps Script)
    googleSheetsUrl: 'https://script.google.com/macros/s/AKfycbz9aAC62i3gNYQWIbYzjnM19zzxqckEfbxzxHAX09bCOExOqo4GWeZcYyr3S62bIeDr/exec'
};

// ============================================================================
// GOOGLE SHEETS EXPORT
// ============================================================================

/**
 * Send experiment data to Google Sheets using a form submission
 * This approach works around CORS restrictions
 * @param {Object} jsPsych - The jsPsych instance
 * @param {string} participantId - The participant's ID
 * @returns {Promise<boolean>} - Whether the export was successful
 */
async function sendToGoogleSheets(jsPsych, participantId) {
    if (!DATA_EXPORT_CONFIG.googleSheetsUrl) {
        console.warn('Google Sheets URL not configured. Falling back to CSV download.');
        return false;
    }

    // Get all trial data
    const allData = jsPsych.data.get().values();

    // Debug: log all trial types found
    console.log('All trial types:', allData.map(d => d.trial_type));
    console.log('All data:', JSON.stringify(allData, null, 2));

    // Filter to find trial data - look for call-function trials that have complete response data
    // The call-function plugin stores returned data in 'value' property
    // Only include entries that have race_response (indicating complete trial data)
    const trialData = allData.filter(d => {
        // Check for call-function trials with complete data in value property
        if (d.value && d.value.image_name && d.value.race_response !== undefined) {
            return true;
        }
        return false;
    });
    console.log('Found trial entries:', trialData.length);

    // Get demographics data - survey-html-form stores responses in 'response' property
    const demographicsEntry = allData.find(d =>
        d.trial_type === 'survey-html-form' && d.response && d.response.age !== undefined
    );
    const demographics = demographicsEntry ? demographicsEntry.response : {};
    console.log('Demographics:', demographics);

    // Get zoom tracking data
    const zoomTracking = typeof getZoomTrackingData === 'function' ? getZoomTrackingData() : {};

    // Prepare payload - check if data is in 'value' property (call-function plugin)
    const payload = {
        participant_id: participantId,
        timestamp: new Date().toISOString(),
        demographics: demographics,
        zoom_tracking: zoomTracking,
        trials: trialData.map(trial => {
            // Data from call-function plugin is stored in 'value' property
            const data = trial.value || trial;
            return {
                trial_number: data.trial_number,
                image_name: data.image_name,
                true_race: data.true_race,
                true_gender: data.true_gender,
                size_condition: data.size_condition,
                smile_condition: data.smile_condition,
                question_order: data.question_order,
                race_options_order: data.race_options_order,
                smile_options_order: data.smile_options_order,
                race_response: data.race_response,
                race_rt: data.race_rt,
                race_correct: data.race_correct,
                smile_response: data.smile_response,
                smile_rt: data.smile_rt,
                smile_correct: data.smile_correct,
                is_practice: data.is_practice
            };
        })
    };

    console.log('Payload trials count:', payload.trials.length);

    // Use form submission via hidden iframe to bypass CORS
    return new Promise((resolve) => {
        try {
            // Create a hidden iframe to receive the response
            const iframe = document.createElement('iframe');
            iframe.name = 'google-sheets-target-' + Date.now();
            iframe.style.display = 'none';
            document.body.appendChild(iframe);

            // Create a form
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = DATA_EXPORT_CONFIG.googleSheetsUrl;
            form.target = iframe.name;
            form.style.display = 'none';

            // Add the data as a hidden input
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'data';
            input.value = JSON.stringify(payload);
            form.appendChild(input);

            // Add form to document and submit
            document.body.appendChild(form);
            form.submit();

            console.log('Data sent to Google Sheets via form submission');

            // Clean up after a delay
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
