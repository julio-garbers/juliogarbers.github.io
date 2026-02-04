/**
 * Face Memory Experiment
 *
 * This experiment measures race and smile memory accuracy
 * across different profile picture sizes.
 *
 * Design:
 * - 12 rounds total
 * - Each round: 8 images in 2x4 grid shown for 5 seconds
 * - One question per round (race count OR smile count)
 * - 6 big rounds, 6 small rounds
 * - 6 race questions, 6 smile questions
 * - Balanced: 3 of each size × question type combination
 */

// Initialize jsPsych
const jsPsych = initJsPsych({
    show_progress_bar: false,
    on_finish: async function() {
        // Mark experiment as ended to disable fullscreen monitoring
        experimentEnded = true;

        // Exit fullscreen when experiment ends
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
        }

        // Export data
        await exportData(jsPsych, participantId,
            (method) => console.log(`Data exported via ${method}`),
            (error) => console.error('Export failed:', error)
        );

        // Close the tab after a short delay
        setTimeout(() => {
            window.close();
            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center;
                            height: 100vh; font-family: sans-serif; text-align: center;">
                    <div>
                        <h1>Thank you!</h1>
                        <p>Your responses have been recorded.</p>
                        <p>You may now close this tab.</p>
                    </div>
                </div>
            `;
        }, 1000);
    }
});

// ============================================================================
// CUSTOM PROGRESS BAR
// ============================================================================

let progressBarCreated = false;

/**
 * Create and inject custom progress bar into the page
 */
function createCustomProgressBar() {
    if (progressBarCreated) return;

    const progressBar = document.createElement('div');
    progressBar.id = 'custom-progress-bar';
    progressBar.innerHTML = `
        <span class="progress-label">Progress</span>
        <div class="progress-track">
            <div class="progress-fill" style="width: 0%"></div>
        </div>
    `;
    document.body.appendChild(progressBar);
    progressBarCreated = true;
}

/**
 * Update custom progress bar
 * @param {number} fraction - Progress fraction between 0 and 1
 */
function updateProgressBar(fraction) {
    if (!progressBarCreated) {
        createCustomProgressBar();
    }
    const fill = document.querySelector('#custom-progress-bar .progress-fill');
    if (fill) {
        fill.style.width = `${Math.round(fraction * 100)}%`;
    }
}

/**
 * Show or hide the progress bar
 * @param {boolean} visible - Whether to show the progress bar
 */
function setProgressBarVisible(visible) {
    const bar = document.getElementById('custom-progress-bar');
    if (bar) {
        bar.style.display = visible ? 'flex' : 'none';
    }
}

// ============================================================================
// DISPLAY REQUIREMENTS (FULLSCREEN & ZOOM)
// ============================================================================

// Track zoom check attempts and bypass
let zoomCheckAttempts = 0;
let zoomCheckBypassed = false;

// Track zoom changes during experiment
let initialDPR = null;
let zoomChanges = [];
let zoomCheckInterval = null;
let experimentTerminatedDueToZoom = false;
let zoomTrackingActive = false;
let inPracticeMode = true; // Start in practice mode

// Store the approved DPR from display check
let approvedDPR = null;

/**
 * Initialize zoom tracking - call this after zoom check passes
 * Saves the approved DPR and monitors for changes
 */
function initZoomTracking() {
    if (zoomTrackingActive) return;

    zoomTrackingActive = true;
    // Save the DPR that was approved during display check
    approvedDPR = window.devicePixelRatio;
    initialDPR = approvedDPR;

    // Method 1: Listen for resize events
    window.addEventListener('resize', checkForZoomChange);

    // Method 2: Use matchMedia to detect DPR changes (more reliable)
    setupMatchMediaListener();

    // Method 3: Poll every 500ms as backup (most reliable)
    zoomCheckInterval = setInterval(checkForZoomChange, 500);

    console.log('Zoom tracking initialized. Approved DPR:', approvedDPR);
}

/**
 * Mark practice as complete - zoom changes will now terminate instead of warn
 */
function endPracticeMode() {
    inPracticeMode = false;
    console.log('Practice mode ended. Zoom changes will now terminate the experiment.');
}

/**
 * Setup matchMedia listener for DPR changes
 */
function setupMatchMediaListener() {
    const updateDPRQuery = () => {
        const dpr = window.devicePixelRatio;
        const query = `(resolution: ${dpr}dppx)`;
        const mql = window.matchMedia(query);

        const handler = () => {
            checkForZoomChange();
            mql.removeEventListener('change', handler);
            setupMatchMediaListener();
        };

        mql.addEventListener('change', handler);
    };

    updateDPRQuery();
}

// Track last warned DPR to avoid repeated warnings for same zoom level
let lastWarnedDPR = null;

/**
 * Check for zoom change and handle accordingly
 * Compares against the approved DPR from display check
 */
function checkForZoomChange() {
    if (!zoomTrackingActive || experimentEnded || experimentTerminatedDueToZoom) return;

    const currentDPR = window.devicePixelRatio;
    // Compare against the approved DPR from display check (NEVER changes after being set)
    if (approvedDPR !== null && Math.abs(currentDPR - approvedDPR) > 0.01) {
        const timestamp = new Date().toISOString();
        zoomChanges.push({
            timestamp: timestamp,
            approved_dpr: approvedDPR,
            current_dpr: currentDPR,
            detected_zoom: Math.round(currentDPR * 100)
        });
        console.log(`Zoom change detected: Approved DPR ${approvedDPR} -> Current ${currentDPR}`);

        // During practice: show warning (but don't update approvedDPR!)
        // After practice: terminate immediately
        if (inPracticeMode) {
            // Only show warning if this is a different zoom level than last warned
            if (lastWarnedDPR === null || Math.abs(currentDPR - lastWarnedDPR) > 0.01) {
                showZoomWarning();
                lastWarnedDPR = currentDPR;
            }
        } else {
            // Main experiment - terminate!
            terminateExperimentDueToZoom();
        }
    }
}

/**
 * Show zoom warning during practice (doesn't terminate)
 */
function showZoomWarning() {
    // Remove any existing warning
    const existing = document.getElementById('zoom-warning-overlay');
    if (existing) existing.remove();

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const zoomResetKey = isMac ? 'Cmd + 0' : 'Ctrl + 0';

    const overlay = document.createElement('div');
    overlay.id = 'zoom-warning-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    overlay.innerHTML = `
        <div style="background: white; padding: 40px; border-radius: 10px; max-width: 500px; text-align: center;">
            <h2 style="color: #ffc107; margin-top: 0;">Warning: Zoom Change Detected</h2>
            <p style="font-size: 16px; line-height: 1.6;">
                A change in your browser zoom level was detected.
            </p>
            <p style="font-size: 14px; color: #dc3545; font-weight: bold;">
                Please reset your zoom to 100% by pressing <kbd>${zoomResetKey}</kbd> before continuing.
            </p>
            <p style="font-size: 14px; color: #666;">
                This is just a practice round, so you can continue. However, during the main experiment,
                <strong>any zoom change from the approved level will immediately terminate the experiment</strong>.
            </p>
            <button id="zoom-warning-continue" style="
                margin-top: 15px;
                padding: 12px 30px;
                font-size: 16px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            ">I Understand - Continue</button>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('zoom-warning-continue').addEventListener('click', () => {
        overlay.remove();
    });
}

/**
 * Terminate experiment due to zoom change
 */
function terminateExperimentDueToZoom() {
    if (experimentTerminatedDueToZoom) return;
    experimentTerminatedDueToZoom = true;

    // Stop the polling
    if (zoomCheckInterval) {
        clearInterval(zoomCheckInterval);
    }

    // Show termination message
    const overlay = document.createElement('div');
    overlay.id = 'zoom-termination-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    overlay.innerHTML = `
        <div style="background: white; padding: 40px; border-radius: 10px; max-width: 500px; text-align: center;">
            <h2 style="color: #dc3545; margin-top: 0;">Experiment Terminated</h2>
            <p style="font-size: 16px; line-height: 1.6;">
                The experiment has been terminated because a <strong>zoom level change</strong> was detected.
            </p>
            <p style="font-size: 14px; color: #666;">
                As stated in the instructions, changing your browser zoom during the experiment invalidates the results.
            </p>
            <p style="font-size: 14px; color: #666;">
                Please close this tab. If you believe this was an error, you may try again with a new session.
            </p>
        </div>
    `;
    document.body.appendChild(overlay);

    // End the jsPsych experiment
    jsPsych.endExperiment('Experiment terminated: Zoom level changed during experiment.');
}

/**
 * Get zoom tracking data for export
 */
function getZoomTrackingData() {
    return {
        zoom_check_bypassed: zoomCheckBypassed,
        zoom_check_attempts: zoomCheckAttempts,
        approved_dpr: approvedDPR,
        initial_dpr: initialDPR,
        zoom_changes_count: zoomChanges.length,
        zoom_changes: zoomChanges,
        terminated_due_to_zoom: experimentTerminatedDueToZoom
    };
}

/**
 * Detect browser zoom level using devicePixelRatio
 */
function detectZoomLevel() {
    const dpr = window.devicePixelRatio || 1;

    let baseDPR = 1;
    if (dpr >= 1.9 && dpr <= 2.1) {
        baseDPR = 2;
    } else if (dpr >= 2.9 && dpr <= 3.1) {
        baseDPR = 3;
    } else if (dpr >= 3.9 && dpr <= 4.1) {
        baseDPR = 2;
    } else if (dpr > 2.1 && dpr < 2.9) {
        baseDPR = 2;
    } else if (dpr > 3.1 && dpr < 3.9) {
        baseDPR = 2;
    } else {
        baseDPR = 1;
    }

    return Math.round((dpr / baseDPR) * 100);
}

function isZoomAt100(tolerance = 5) {
    const zoom = detectZoomLevel();
    return zoom >= (100 - tolerance) && zoom <= (100 + tolerance);
}

function isFullscreen() {
    return !!(document.fullscreenElement ||
              document.webkitFullscreenElement ||
              document.mozFullScreenElement ||
              document.msFullscreenElement);
}

function getZoomInstructions() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    if (isMac) {
        return `<kbd>Cmd</kbd> + <kbd>0</kbd> (zero)`;
    } else {
        return `<kbd>Ctrl</kbd> + <kbd>0</kbd> (zero)`;
    }
}

let fullscreenWarningShown = false;
let experimentEnded = false;

function setupFullscreenMonitoring() {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
}

function handleFullscreenChange() {
    if (!isFullscreen() && !fullscreenWarningShown && roundNumber >= 0 && !experimentEnded) {
        showFullscreenWarning();
    }
}

function showFullscreenWarning() {
    fullscreenWarningShown = true;
    const overlay = document.createElement('div');
    overlay.id = 'fullscreen-warning-overlay';
    overlay.innerHTML = `
        <div class="fullscreen-warning-content">
            <h2>Fullscreen Required</h2>
            <p>You have exited fullscreen mode.</p>
            <p>For accurate results, this experiment must be completed in fullscreen.</p>
            <button id="return-fullscreen-btn" class="jspsych-btn">Return to Fullscreen</button>
        </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('return-fullscreen-btn').addEventListener('click', async () => {
        try {
            await document.documentElement.requestFullscreen();
            overlay.remove();
            fullscreenWarningShown = false;
        } catch (err) {
            console.error('Failed to enter fullscreen:', err);
        }
    });
}

// ============================================================================
// EXPERIMENT STATE
// ============================================================================

const participantId = jsPsych.randomization.randomID(10);
let demographicData = {};
let roundNumber = 0;

// ============================================================================
// DISPLAY REQUIREMENTS CHECK
// ============================================================================

const displayRequirementsIntro = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div class="instruction-container">
            <h1>Display Requirements</h1>
            <p>This experiment requires precise image sizing for accurate results.</p>
            <p>Before we begin, please ensure:</p>
            <ol>
                <li><strong>Fullscreen mode:</strong> The experiment will enter fullscreen automatically</li>
                <li><strong>100% browser zoom:</strong> Your browser zoom must be set to 100%</li>
            </ol>
            <h3>How to set zoom to 100%:</h3>
            <p>Press ${getZoomInstructions()} to reset your browser zoom to 100%.</p>

            <div style="margin-top: 20px; padding: 15px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px;">
                <p style="margin: 0; color: #721c24;"><strong>Important:</strong> Do NOT change your browser zoom after this check. If a zoom change is detected during the experiment, <strong>the experiment will be terminated immediately</strong>.</p>
            </div>

            <p style="margin-top: 20px;">Click "Check Display Settings" when ready.</p>
        </div>
    `,
    choices: ['Check Display Settings'],
    data: { trial_type: 'display_requirements_intro' }
};

const enterFullscreen = {
    type: jsPsychFullscreen,
    fullscreen_mode: true,
    message: `
        <div class="instruction-container">
            <h2>Enter Fullscreen</h2>
            <p>Click the button below to enter fullscreen mode.</p>
        </div>
    `,
    button_label: 'Enter Fullscreen',
    delay_after: 200,
    on_finish: function() {
        setupFullscreenMonitoring();
        // Note: zoom tracking starts after display check passes, before practice
    }
};

const zoomCheck = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function() {
        // Increment attempt counter
        zoomCheckAttempts++;

        const zoomLevel = detectZoomLevel();
        const zoomOk = isZoomAt100();
        const fullscreenOk = isFullscreen();
        const showBypass = zoomCheckAttempts >= 3 && !zoomOk && fullscreenOk;

        let statusHtml = `
            <div class="instruction-container">
                <h2>Display Check</h2>
                <div class="display-check-status">
        `;

        if (fullscreenOk) {
            statusHtml += `
                <p class="check-item check-pass">
                    <span class="check-icon">&#10004;</span> Fullscreen: Active
                </p>`;
        } else {
            statusHtml += `
                <p class="check-item check-fail">
                    <span class="check-icon">&#10008;</span> Fullscreen: Not active
                </p>`;
        }

        const debugInfo = { devicePixelRatio: window.devicePixelRatio };
        const baseDPR = debugInfo.devicePixelRatio >= 1.9 ? 2 : 1;

        if (zoomOk) {
            statusHtml += `
                <p class="check-item check-pass">
                    <span class="check-icon">&#10004;</span> Zoom Level: ~100% (detected: ${zoomLevel}%)
                </p>`;
        } else {
            statusHtml += `
                <p class="check-item check-fail">
                    <span class="check-icon">&#10008;</span> Zoom Level: ${zoomLevel}% (should be 100%)
                </p>`;
        }

        statusHtml += `</div>`;

        if (!zoomOk || !fullscreenOk) {
            statusHtml += `
                <div class="display-fix-instructions">
                    <h3>Please fix the following:</h3>
                    <ul>`;
            if (!fullscreenOk) {
                statusHtml += `<li>Click "Re-enter Fullscreen" below</li>`;
            }
            if (!zoomOk) {
                statusHtml += `<li>Press ${getZoomInstructions()} to reset zoom to 100%</li>`;
            }
            statusHtml += `
                    </ul>
                    <p>Then click "Check Again" to verify.</p>
                </div>`;

            // Show bypass option after 2 failed attempts (only if fullscreen is OK)
            if (showBypass) {
                statusHtml += `
                    <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffc107;">
                        <p style="margin: 0 0 10px 0;"><strong>Having trouble?</strong></p>
                        <p style="margin: 0; font-size: 14px;">If your browser zoom is actually at 100% but our detection isn't working correctly (e.g., due to display scaling), you can proceed anyway.</p>
                    </div>`;
            }
        } else {
            statusHtml += `
                <div class="display-ready">
                    <p><strong>All display requirements met!</strong></p>
                    <p>Click "Continue" to begin the experiment.</p>
                </div>`;
        }

        statusHtml += `</div>`;
        return statusHtml;
    },
    choices: function() {
        const zoomOk = isZoomAt100();
        const fullscreenOk = isFullscreen();
        const showBypass = zoomCheckAttempts >= 3 && !zoomOk && fullscreenOk;

        if (zoomOk && fullscreenOk) {
            return ['Continue'];
        } else if (!fullscreenOk) {
            return ['Re-enter Fullscreen', 'Check Again'];
        } else if (showBypass) {
            return ['Check Again', 'Proceed Anyway'];
        } else {
            return ['Check Again'];
        }
    },
    data: { trial_type: 'zoom_check' },
    on_finish: async function(data) {
        const zoomOk = isZoomAt100();
        const fullscreenOk = isFullscreen();
        data.zoom_level = detectZoomLevel();
        data.zoom_ok = zoomOk;
        data.fullscreen_ok = fullscreenOk;
        data.attempt_number = zoomCheckAttempts;

        // Check if user clicked "Proceed Anyway" (index 1 when bypass is shown)
        const showBypass = zoomCheckAttempts >= 3 && !zoomOk && fullscreenOk;
        if (showBypass && data.response === 1) {
            zoomCheckBypassed = true;
            data.zoom_bypassed = true;
        }

        if (data.response === 0 && !fullscreenOk) {
            try {
                await document.documentElement.requestFullscreen();
            } catch (err) {
                console.error('Failed to enter fullscreen:', err);
            }
        }
    }
};

const displayCheckLoop = {
    timeline: [zoomCheck],
    loop_function: function(data) {
        const lastTrial = data.values()[0];
        // Continue looping if requirements not met AND not bypassed
        if (lastTrial.zoom_bypassed) {
            return false; // Stop looping - user bypassed
        }
        return !(lastTrial.zoom_ok && lastTrial.fullscreen_ok);
    }
};

// ============================================================================
// WELCOME & CONSENT
// ============================================================================

const welcome = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div class="instruction-container">
            <h1>Welcome to the Face Memory Study</h1>
            <p>Thank you for your interest in participating in this research study.</p>
            <p>This study investigates how people remember faces in profile pictures of different sizes.</p>
            <p>The study will take approximately <strong>10-15 minutes</strong> to complete.</p>
            <p>Please click "Continue" to read the consent information.</p>
        </div>
    `,
    choices: ['Continue'],
    data: { trial_type: 'welcome' }
};

const consent = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div class="instruction-container consent-form">
            <h2>Informed Consent</h2>

            <p><strong>What you'll do:</strong> View grids of face images and answer questions about what you remember.</p>

            <p><strong>Risks & Benefits:</strong> No known risks. Your participation contributes to face memory research.</p>

            <p><strong>Privacy:</strong> Responses are anonymous. No identifying information is collected.</p>

            <p><strong>Voluntary:</strong> You may withdraw anytime by closing your browser.</p>

            <div class="consent-checkbox">
                <p><strong>By clicking "I Agree", you confirm:</strong></p>
                <ul>
                    <li>You have read and understood the above</li>
                    <li>You are 18 years or older</li>
                    <li>You agree to participate voluntarily</li>
                </ul>
            </div>
        </div>
    `,
    choices: ['I Agree', 'I Do Not Agree'],
    data: { trial_type: 'consent' },
    on_finish: function(data) {
        if (data.response === 1) {
            jsPsych.endExperiment('Thank you for your time. You have chosen not to participate in this study.');
        }
    }
};

// ============================================================================
// DEMOGRAPHICS
// ============================================================================

const demographics = {
    type: jsPsychSurveyHtmlForm,
    preamble: `
        <div class="instruction-container">
            <h2>Demographic Information</h2>
        </div>
    `,
    html: `
        <div class="demographics-form">
            <div class="form-group">
                <label for="age">Age:</label>
                <input type="number" id="age" name="age" min="18" max="120" required>
            </div>

            <div class="form-group">
                <label for="gender">Gender:</label>
                <select name="gender" id="gender" required>
                    <option value="">-- Select --</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non-binary">Non-binary</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
            </div>

            <div class="form-group">
                <label for="race">Race/Ethnicity:</label>
                <select name="race" id="race" required>
                    <option value="">-- Select --</option>
                    <option value="asian">Asian</option>
                    <option value="black">Black or African American</option>
                    <option value="hispanic">Hispanic or Latino</option>
                    <option value="white">White</option>
                    <option value="native">Native American or Alaska Native</option>
                    <option value="pacific">Native Hawaiian or Pacific Islander</option>
                    <option value="multiracial">Multiracial / Mixed</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
            </div>

            <div class="form-group">
                <label for="education">Education:</label>
                <select name="education" id="education" required>
                    <option value="">-- Select --</option>
                    <option value="less_than_high_school">Less than high school</option>
                    <option value="high_school">High school diploma or equivalent</option>
                    <option value="some_college">Some college, no degree</option>
                    <option value="associates">Associate's degree</option>
                    <option value="bachelors">Bachelor's degree</option>
                    <option value="masters">Master's degree</option>
                    <option value="doctorate">Doctorate or professional degree</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
            </div>
        </div>
    `,
    button_label: 'Continue',
    data: { trial_type: 'demographics' },
    on_finish: function(data) {
        demographicData = data.response;
    }
};

// ============================================================================
// INSTRUCTIONS
// ============================================================================

const instructions = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div class="instruction-container">
            <h2>Task Instructions</h2>

            <p>You will view grids of <strong>8 face images</strong> for 5 seconds, then answer a question about what you remember:</p>
            <ul>
                <li>How many faces of each race did you see?</li>
                <li>How many smiling/non-smiling faces did you see?</li>
            </ul>

            <p>You will complete <strong>12 rounds</strong> in total.</p>

            <p><strong>Important:</strong></p>
            <ul>
                <li>Pay close attention - images appear briefly</li>
                <li style="color: #dc3545;">Do NOT change browser zoom (experiment will terminate)</li>
            </ul>

            <p>Click "Continue" to begin a practice round.</p>
        </div>
    `,
    choices: ['Continue'],
    data: { trial_type: 'instructions' }
};

// ============================================================================
// ROUND CREATION FUNCTION
// ============================================================================

/**
 * Creates a complete round sequence (grid display + question)
 * @param {Object} roundConfig - Configuration for this round
 * @param {boolean} isPractice - Whether this is a practice round
 * @returns {Object} jsPsych timeline object
 */
function createRound(roundConfig, isPractice = false) {
    // Generate the grid for this round (use practice images for practice round)
    const grid = isPractice
        ? generatePracticeGridForRound(roundConfig.size)
        : generateGridForRound(roundConfig.size);

    // Create grid order string: "individual_id:smile,individual_id:smile,..." for positions 1-8
    const gridOrder = grid.images.map(img =>
        `${img.individual_id}:${img.smile ? 'smile' : 'nosmile'}`
    ).join(',');

    // Randomize the order of input fields for questions
    const raceInputOrder = jsPsych.randomization.shuffle(['asian', 'black', 'hispanic', 'white']);
    const smileInputOrder = jsPsych.randomization.shuffle(['smiling', 'not_smiling']);

    // Track input order based on question type
    const inputOrder = roundConfig.questionType === 'race'
        ? raceInputOrder.join(',')
        : smileInputOrder.join(',');

    // Store round data - include all order information here so it's passed through jsPsych data chain
    const baseRoundData = {
        participant_id: participantId,
        round_number: isPractice ? 'practice' : null,  // Will be set during trial
        size_condition: roundConfig.size,
        question_type: roundConfig.questionType,
        is_practice: isPractice,
        grid_order: gridOrder,
        input_order: inputOrder,
        // Actual composition
        actual_asian: grid.composition.asian,
        actual_black: grid.composition.black,
        actual_hispanic: grid.composition.hispanic,
        actual_white: grid.composition.white,
        actual_smiling: grid.composition.smiling,
        actual_not_smiling: grid.composition.not_smiling
    };

    // Variables to store responses
    let responseData = {};
    let responseRT = null;
    let responseOrderArray = [];  // Track order in which inputs were filled

    // 0. Pre-round instruction - tell participant what question type to expect
    const questionTypeText = roundConfig.questionType === 'race'
        ? 'how many faces of <strong>each race</strong> you saw'
        : 'how many faces were <strong>smiling vs. not smiling</strong>';

    const preRoundInstruction = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `
            <div class="instruction-container pre-round-instruction">
                <h2>${isPractice ? 'Practice Round' : 'Next Round'}</h2>
                <p>In this round, you will be asked about:</p>
                <p class="question-preview">${questionTypeText}</p>
                <p>You will see <strong>8 faces</strong> for <strong>5 seconds</strong>.</p>
                <p>Click "Start" when you're ready.</p>
            </div>
        `,
        choices: ['Start'],
        data: { trial_part: 'pre_round_instruction', ...baseRoundData }
    };

    // 1. Display grid for 5 seconds
    const gridDisplay = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function() {
            const dimensions = STIMULI_CONFIG.sizes[roundConfig.size];
            let html = `
                <div class="image-grid-container">
                    <div class="image-grid">
            `;

            for (const img of grid.images) {
                html += `
                    <img src="${img.image_path}"
                         width="${dimensions.width}"
                         height="${dimensions.height}"
                         class="grid-image ${roundConfig.size}"
                         alt="Face">
                `;
            }

            html += `
                    </div>
                </div>
            `;
            return html;
        },
        choices: "NO_KEYS",
        trial_duration: STIMULI_CONFIG.displayDuration,
        data: { trial_part: 'grid_display', ...baseRoundData }
    };

    // 2. Fixation cross
    const fixation = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: '<div class="fixation">+</div>',
        choices: "NO_KEYS",
        trial_duration: 500,
        data: { trial_part: 'fixation' }
    };

    // 3. Question (race or smile) - with 30 second timeout
    const QUESTION_TIMEOUT = 30000;  // 30 seconds
    let question;

    // Labels for display
    const raceLabels = { asian: 'Asian', black: 'Black', hispanic: 'Hispanic', white: 'White' };
    const smileLabels = { smiling: 'Smiling', not_smiling: 'Not Smiling' };

    if (roundConfig.questionType === 'race') {
        // Build race inputs in randomized order
        const raceInputsHtml = raceInputOrder.map(race => `
            <div class="count-input-row">
                <span class="count-label">${raceLabels[race]}</span>
                <input type="number" name="${race}" class="count-input" min="0" max="8" value="0" required>
            </div>
        `).join('');

        question = {
            type: jsPsychSurveyHtmlForm,
            preamble: `
                <div class="question-container">
                    <p class="question-text">For each race, how many faces do you remember seeing?</p>
                </div>
            `,
            html: `
                <div class="count-input-group">
                    ${raceInputsHtml}
                    <div class="running-total" id="race-total">Total: 0 / 8</div>
                </div>
            `,
            button_label: 'Submit',
            data: { trial_part: 'race_question', ...baseRoundData },
            on_load: function() {
                // Start 30-second timeout
                const timeoutId = setTimeout(() => {
                    document.querySelector('#jspsych-survey-html-form-next').click();
                }, 30000);

                // Track response order - record when each input is first changed
                responseOrderArray.length = 0;  // Clear without reassigning
                document.querySelectorAll('.count-input').forEach(input => {
                    input.addEventListener('input', function handler() {
                        const inputName = this.getAttribute('name');
                        if (!responseOrderArray.includes(inputName)) {
                            responseOrderArray.push(inputName);
                        }
                    });
                });

                // Update running total
                document.querySelectorAll('.count-input').forEach(input => {
                    input.addEventListener('input', () => {
                        const total = Array.from(document.querySelectorAll('.count-input'))
                            .reduce((sum, el) => sum + (parseInt(el.value) || 0), 0);
                        document.getElementById('race-total').textContent = 'Total: ' + total + ' / 8';
                    });
                });

                // Store timeout ID to clear if submitted early
                window.currentTimeoutId = timeoutId;
            },
            on_finish: function(data) {
                if (window.currentTimeoutId) {
                    clearTimeout(window.currentTimeoutId);
                }
                responseData = data.response;
                responseRT = data.rt;
                // Store response order in data for later access
                data.response_order = responseOrderArray.join(',');
            }
        };
    } else {
        // Build smile inputs in randomized order
        const smileInputsHtml = smileInputOrder.map(smile => `
            <div class="count-input-row">
                <span class="count-label">${smileLabels[smile]}</span>
                <input type="number" name="${smile}" class="count-input" min="0" max="8" value="0" required>
            </div>
        `).join('');

        question = {
            type: jsPsychSurveyHtmlForm,
            preamble: `
                <div class="question-container">
                    <p class="question-text">How many smiling and non-smiling faces do you remember seeing?</p>
                </div>
            `,
            html: `
                <div class="count-input-group">
                    ${smileInputsHtml}
                    <div class="running-total" id="smile-total">Total: 0 / 8</div>
                </div>
            `,
            button_label: 'Submit',
            data: { trial_part: 'smile_question', ...baseRoundData },
            on_load: function() {
                // Start 30-second timeout
                const timeoutId = setTimeout(() => {
                    document.querySelector('#jspsych-survey-html-form-next').click();
                }, 30000);

                // Track response order - record when each input is first changed
                responseOrderArray.length = 0;  // Clear without reassigning
                document.querySelectorAll('.count-input').forEach(input => {
                    input.addEventListener('input', function handler() {
                        const inputName = this.getAttribute('name');
                        if (!responseOrderArray.includes(inputName)) {
                            responseOrderArray.push(inputName);
                        }
                    });
                });

                // Update running total
                document.querySelectorAll('.count-input').forEach(input => {
                    input.addEventListener('input', () => {
                        const total = Array.from(document.querySelectorAll('.count-input'))
                            .reduce((sum, el) => sum + (parseInt(el.value) || 0), 0);
                        document.getElementById('smile-total').textContent = 'Total: ' + total + ' / 8';
                    });
                });

                // Store timeout ID to clear if submitted early
                window.currentTimeoutId = timeoutId;
            },
            on_finish: function(data) {
                if (window.currentTimeoutId) {
                    clearTimeout(window.currentTimeoutId);
                }
                responseData = data.response;
                responseRT = data.rt;
                // Store response order in data for later access
                data.response_order = responseOrderArray.join(',');
            }
        };
    }

    // 4. Record complete round data
    // Note: We retrieve data from jsPsych data chain rather than closures to avoid capture issues
    const recordData = {
        type: jsPsychCallFunction,
        func: function() {
            if (!isPractice) {
                roundNumber++;
                updateProgressBar(roundNumber / 12);
            }

            // Get all data from the last question trial (which has baseRoundData spread into it)
            const questionTrialPart = roundConfig.questionType + '_question';
            const lastQuestionData = jsPsych.data.get().filter({trial_part: questionTrialPart}).last(1).values()[0];

            // DEBUG: Log what we're getting from the question trial
            console.log('=== DEBUG recordData ===');
            console.log('questionTrialPart:', questionTrialPart);
            console.log('lastQuestionData:', lastQuestionData);
            console.log('lastQuestionData.grid_order:', lastQuestionData ? lastQuestionData.grid_order : 'NO DATA');
            console.log('lastQuestionData.input_order:', lastQuestionData ? lastQuestionData.input_order : 'NO DATA');
            console.log('lastQuestionData.response_order:', lastQuestionData ? lastQuestionData.response_order : 'NO DATA');

            // Extract values from question trial data (more reliable than closures)
            const gridOrderFromData = lastQuestionData ? (lastQuestionData.grid_order || '') : '';
            const inputOrderFromData = lastQuestionData ? (lastQuestionData.input_order || '') : '';
            const responseOrderStr = lastQuestionData ? (lastQuestionData.response_order || '') : '';
            const questionResponse = lastQuestionData ? (lastQuestionData.response || {}) : {};
            const questionRT = lastQuestionData ? lastQuestionData.rt : null;

            // Get actual composition from the question trial data
            const actualAsian = lastQuestionData ? lastQuestionData.actual_asian : 0;
            const actualBlack = lastQuestionData ? lastQuestionData.actual_black : 0;
            const actualHispanic = lastQuestionData ? lastQuestionData.actual_hispanic : 0;
            const actualWhite = lastQuestionData ? lastQuestionData.actual_white : 0;
            const actualSmiling = lastQuestionData ? lastQuestionData.actual_smiling : 0;
            const actualNotSmiling = lastQuestionData ? lastQuestionData.actual_not_smiling : 0;

            // Calculate accuracy metrics using data from jsPsych data chain
            let accuracy = {};
            if (roundConfig.questionType === 'race') {
                const asianResp = parseInt(questionResponse.asian) || 0;
                const blackResp = parseInt(questionResponse.black) || 0;
                const hispanicResp = parseInt(questionResponse.hispanic) || 0;
                const whiteResp = parseInt(questionResponse.white) || 0;
                accuracy = {
                    asian_response: asianResp,
                    black_response: blackResp,
                    hispanic_response: hispanicResp,
                    white_response: whiteResp,
                    asian_error: asianResp - actualAsian,
                    black_error: blackResp - actualBlack,
                    hispanic_error: hispanicResp - actualHispanic,
                    white_error: whiteResp - actualWhite,
                    asian_correct: asianResp === actualAsian,
                    black_correct: blackResp === actualBlack,
                    hispanic_correct: hispanicResp === actualHispanic,
                    white_correct: whiteResp === actualWhite
                };
            } else {
                const smilingResp = parseInt(questionResponse.smiling) || 0;
                const notSmilingResp = parseInt(questionResponse.not_smiling) || 0;
                accuracy = {
                    smiling_response: smilingResp,
                    not_smiling_response: notSmilingResp,
                    smiling_error: smilingResp - actualSmiling,
                    not_smiling_error: notSmilingResp - actualNotSmiling,
                    smiling_correct: smilingResp === actualSmiling,
                    not_smiling_correct: notSmilingResp === actualNotSmiling
                };
            }

            const result = {
                participant_id: participantId,
                round_number: isPractice ? 'practice' : roundNumber,
                size_condition: roundConfig.size,
                question_type: roundConfig.questionType,
                is_practice: isPractice,
                grid_order: gridOrderFromData,
                input_order: inputOrderFromData,
                response_order: responseOrderStr,
                // Actual composition
                actual_asian: actualAsian,
                actual_black: actualBlack,
                actual_hispanic: actualHispanic,
                actual_white: actualWhite,
                actual_smiling: actualSmiling,
                actual_not_smiling: actualNotSmiling,
                // Responses and accuracy
                ...accuracy,
                response_rt: questionRT
            };

            // DEBUG: Log what we're returning
            console.log('=== DEBUG recordData RESULT ===');
            console.log('grid_order:', result.grid_order);
            console.log('input_order:', result.input_order);
            console.log('response_order:', result.response_order);
            console.log('asian_correct:', result.asian_correct);
            console.log('Full result:', result);

            return result;
        },
        data: { trial_type: 'round_complete' }
    };

    return {
        timeline: [preRoundInstruction, gridDisplay, fixation, question, recordData]
    };
}

// ============================================================================
// PRACTICE ROUND
// ============================================================================

const practiceIntro = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div class="instruction-container">
            <h2>Practice Round</h2>
            <p>Let's do a practice round so you can see how the task works.</p>
            <p>Click "Continue" to proceed.</p>
        </div>
    `,
    choices: ['Continue'],
    data: { trial_type: 'practice_intro' }
};

// Practice round with race question
const practiceRound = createRound({
    size: 'big',
    questionType: 'race'
}, true);

const practiceFeedback = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div class="instruction-container feedback-container">
            <h2>Practice Complete!</h2>
            <p>Great! You now understand how the task works.</p>
            <p>In the main experiment, you will complete <strong>12 rounds</strong>.</p>
            <p>Some rounds will ask about race, others about smiling.</p>
            <p>Some rounds will show big pictures, others small pictures.</p>
            <p>Click "Begin Experiment" when you're ready to start.</p>
        </div>
    `,
    choices: ['Begin Experiment'],
    data: { trial_type: 'practice_feedback' }
};

// ============================================================================
// MAIN EXPERIMENT
// ============================================================================

function createMainExperiment() {
    const rounds = generateAllRounds();
    const trials = [];

    for (const roundConfig of rounds) {
        trials.push(createRound(roundConfig, false));
    }

    return { timeline: trials };
}

// ============================================================================
// DEBRIEF
// ============================================================================

const debrief = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div class="instruction-container">
            <h2>Study Complete!</h2>

            <p>Thank you for participating in this study.</p>

            <h3>About This Research</h3>
            <p>This study investigates how people remember facial features—specifically race and expression—in profile pictures of different sizes. We are interested in whether smaller profile pictures make certain features more or less memorable compared to others.</p>

            <p>Your responses will help us understand how the size of profile pictures might influence memory and perceptions in online platforms.</p>

            <h3>Data Submission</h3>
            <p>When you click "Finish," your responses will be automatically submitted.</p>

            <p><strong>Thank you again for your participation!</strong></p>
        </div>
    `,
    choices: ['Finish'],
    data: { trial_type: 'debrief' }
};

// ============================================================================
// PRELOAD IMAGES
// ============================================================================

const preload = {
    type: jsPsychPreload,
    images: getAllImagePaths(),
    show_detailed_errors: true,
    continue_after_error: true,
    on_error: function(file) {
        console.warn('Failed to preload:', file);
    }
};

// ============================================================================
// BUILD AND RUN EXPERIMENT
// ============================================================================

const timeline = [
    preload,
    displayRequirementsIntro,
    enterFullscreen,
    displayCheckLoop,
    // Start zoom tracking after display check passes
    {
        type: jsPsychCallFunction,
        func: function() {
            initZoomTracking();
            console.log('Display check passed. Zoom tracking active - changes will show warning until experiment starts.');
        }
    },
    welcome,
    consent,
    demographics,
    instructions,
    practiceIntro,
    practiceRound,
    practiceFeedback,
    // Transition from practice to main experiment - zoom changes will now terminate
    {
        type: jsPsychCallFunction,
        func: function() {
            endPracticeMode();
            createCustomProgressBar();
            updateProgressBar(0);
            console.log('Practice complete. Zoom monitoring now active - zoom changes will terminate experiment.');
        }
    }
];

// Add main experiment
const mainExperiment = createMainExperiment();
timeline.push(mainExperiment);

// Add debrief
timeline.push(debrief);

// Run the experiment
jsPsych.run(timeline);
