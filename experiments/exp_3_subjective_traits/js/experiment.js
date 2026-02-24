/**
 * Subjective Traits Perception Experiment (Experiment 3)
 *
 * This experiment measures subjective trait ratings (trustworthiness,
 * competence, attractiveness, friendliness) and rating confidence
 * across different profile picture sizes.
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

        // Export data (Google Sheets if configured, otherwise CSV download)
        await exportData(jsPsych, participantId,
            (method) => console.log(`Data exported via ${method}`),
            (error) => console.error('Export failed:', error)
        );

        // Close the tab after a short delay to ensure data is sent
        setTimeout(() => {
            window.close();
            // If window.close() doesn't work (some browsers block it),
            // show a message to the user
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
    // Create bar if it doesn't exist yet
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
    // Create a media query that matches the current DPR
    const updateDPRQuery = () => {
        const dpr = window.devicePixelRatio;
        const query = `(resolution: ${dpr}dppx)`;
        const mql = window.matchMedia(query);

        const handler = () => {
            checkForZoomChange();
            // Re-setup with new DPR
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
 * Detect browser zoom level
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

    const zoomLevel = Math.round((dpr / baseDPR) * 100);
    return zoomLevel;
}

/**
 * Check if zoom level is approximately 100% (within tolerance)
 */
function isZoomAt100(tolerance = 5) {
    const zoom = detectZoomLevel();
    return zoom >= (100 - tolerance) && zoom <= (100 + tolerance);
}

/**
 * Check if browser is in fullscreen mode
 */
function isFullscreen() {
    return !!(document.fullscreenElement ||
              document.webkitFullscreenElement ||
              document.mozFullScreenElement ||
              document.msFullscreenElement);
}

/**
 * Get instructions for setting zoom based on detected OS/browser
 */
function getZoomInstructions() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    if (isMac) {
        return `<kbd>Cmd</kbd> + <kbd>0</kbd> (zero)`;
    } else {
        return `<kbd>Ctrl</kbd> + <kbd>0</kbd> (zero)`;
    }
}

// Track if fullscreen warning has been shown
let fullscreenWarningShown = false;

// Track if experiment has ended (to disable fullscreen monitoring)
let experimentEnded = false;

/**
 * Set up fullscreen exit detection
 */
function setupFullscreenMonitoring() {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
}

function handleFullscreenChange() {
    if (!isFullscreen() && !fullscreenWarningShown && trialNumber >= 0 && !experimentEnded) {
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

// Generate unique participant ID
const participantId = jsPsych.randomization.randomID(10);

// Store experiment data
let demographicData = {};
let trialNumber = 0;


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
    }
};

const zoomCheck = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function() {
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

        const debugInfo = {
            innerWidth: window.innerWidth,
            innerHeight: window.innerHeight,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height,
            availWidth: window.screen.availWidth,
            devicePixelRatio: window.devicePixelRatio
        };

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

        const baseDPR = debugInfo.devicePixelRatio >= 1.9 ? 2 : 1;
        statusHtml += `
            <details style="margin-top: 15px; font-size: 12px; color: #666;">
                <summary>Debug Info</summary>
                <pre style="text-align: left; background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto;">
devicePixelRatio: ${debugInfo.devicePixelRatio}
baseDPR (detected): ${baseDPR}
calculated zoom: ${Math.round((debugInfo.devicePixelRatio / baseDPR) * 100)}%
---
innerWidth: ${debugInfo.innerWidth}
screen.width: ${debugInfo.screenWidth}
                </pre>
            </details>`;

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
        if (lastTrial.zoom_bypassed) {
            return false;
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
            <h1>Welcome to the Face Perception Study</h1>
            <p>Thank you for your interest in participating in this research study.</p>
            <p>This study investigates how people form impressions of faces in profile pictures of different sizes.</p>
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

            <p><strong>What you'll do:</strong> View face images and rate them on several subjective traits.</p>

            <p><strong>Risks & Benefits:</strong> No known risks. Your participation contributes to face perception research.</p>

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

            <p><strong>Rate how you think most people would perceive this person.</strong></p>

            <p>You will view face images and rate each person on four traits:</p>
            <ul>
                <li><strong>Trustworthiness</strong> — how honest, dependable, and safe this person seems. Think of this as whether someone would feel comfortable renting this person's home on a platform like Airbnb.</li>
                <li><strong>Competence</strong> — how capable and reliable this person seems at managing tasks and responsibilities</li>
                <li><strong>Attractiveness</strong> — how physically appealing this person seems</li>
                <li><strong>Friendliness</strong> — how warm, approachable, and easy to get along with this person seems</li>
            </ul>

            <p>For each trait, you will provide:</p>
            <ol>
                <li>A rating from 0 to 100</li>
                <li>Your confidence in that rating (0 to 100)</li>
            </ol>

            <p>The face image will remain visible while you make your ratings.</p>

            <p><strong>Important:</strong></p>
            <ul>
                <li>You have 30 seconds per trait screen</li>
                <li style="color: #dc3545;">Do NOT change browser zoom (experiment will terminate)</li>
            </ul>

            <p>Click "Continue" to begin a practice trial.</p>
        </div>
    `,
    choices: ['Continue'],
    data: { trial_type: 'instructions' }
};

// ============================================================================
// PRACTICE TRIAL
// ============================================================================

const practiceIntro = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div class="instruction-container">
            <h2>Practice Trial</h2>
            <p>Let's do a practice trial so you can see how the task works.</p>
            <p>Remember:</p>
            <ul>
                <li>The face image will stay on screen while you rate</li>
                <li>Rate the person on each trait using the sliders</li>
                <li>Indicate your confidence in each rating</li>
            </ul>
            <p>Click "Start Practice" when you're ready.</p>
        </div>
    `,
    choices: ['Start Practice'],
    data: { trial_type: 'practice_intro' }
};

// Practice trial uses configured practice image
const practiceTrial = createTrial({
    individual_id: `${STIMULI_CONFIG.practice.race}_${STIMULI_CONFIG.practice.gender}_${STIMULI_CONFIG.practice.id}`,
    race: STIMULI_CONFIG.practice.race,
    gender: STIMULI_CONFIG.practice.gender,
    size: STIMULI_CONFIG.practice.size,
    smile: STIMULI_CONFIG.practice.smile,
    image_path: getPracticeImagePath()
}, true);  // true = is practice trial

const practiceFeedback = {
    type: jsPsychHtmlButtonResponse,
    stimulus: `
        <div class="instruction-container">
            <h2>Practice Complete!</h2>
            <p>Great! You now understand how the task works.</p>
            <p>In the main experiment, you will see <strong>16 face images</strong>.</p>
            <p>Click "Begin Experiment" when you're ready to start.</p>
        </div>
    `,
    choices: ['Begin Experiment'],
    data: { trial_type: 'practice_feedback' }
};

// ============================================================================
// TRAIT RATING HELPER — builds HTML for one trait screen
// ============================================================================

/**
 * Get the display label and question for a trait
 */
function getTraitInfo(trait) {
    const labels = {
        trustworthy: {
            question: 'How trustworthy do you think most people would consider this person?',
            lowAnchor: 'Not at all trustworthy',
            highAnchor: 'Extremely trustworthy'
        },
        competent: {
            question: 'How competent do you think most people would consider this person?',
            lowAnchor: 'Not at all competent',
            highAnchor: 'Extremely competent'
        },
        attractive: {
            question: 'How attractive do you think most people would consider this person?',
            lowAnchor: 'Not at all attractive',
            highAnchor: 'Extremely attractive'
        },
        friendly: {
            question: 'How friendly do you think most people would consider this person?',
            lowAnchor: 'Not at all friendly',
            highAnchor: 'Extremely friendly'
        }
    };
    return labels[trait];
}

/**
 * Build the HTML for a single trait rating screen
 * @param {string} trait - 'trustworthy', 'competent', 'attractive', or 'friendly'
 * @param {string} imagePath - path to stimulus image
 * @param {string} sizeClass - 'big' or 'small'
 * @param {Object} dimensions - {width, height} of the image
 * @returns {string} HTML string
 */
function buildTraitFormHTML(trait, imagePath, sizeClass, dimensions) {
    const info = getTraitInfo(trait);

    let html = '<div class="trait-rating-container">';

    // Show the stimulus image at the top of every trait screen
    html += `
        <div class="image-container" style="margin-bottom: 15px;">
            <img src="${imagePath}"
                 width="${dimensions.width}"
                 height="${dimensions.height}"
                 alt="Face image"
                 class="stimulus-image ${sizeClass}">
        </div>
    `;

    // Trait question
    html += `<p class="trait-question">${info.question}</p>`;

    // Trait rating slider
    html += `
        <div class="slider-container">
            <label>Your rating:</label>
            <div class="slider-wrapper">
                <input type="range" id="${trait}_rating" name="${trait}_rating"
                       min="0" max="100" value="50" step="1">
                <div class="slider-anchors">
                    <span>${info.lowAnchor}</span>
                    <span>${info.highAnchor}</span>
                </div>
                <div class="slider-value placeholder" id="${trait}_rating_display">Move the slider</div>
            </div>
        </div>
    `;

    // Confidence slider
    html += `
        <div class="slider-container">
            <label>How confident are you in this estimate of what others would think?</label>
            <div class="slider-wrapper">
                <input type="range" id="${trait}_confidence" name="${trait}_confidence"
                       min="0" max="100" value="50" step="1">
                <div class="slider-anchors">
                    <span>Not at all confident</span>
                    <span>Extremely confident</span>
                </div>
                <div class="slider-value placeholder" id="${trait}_confidence_display">Move the slider</div>
            </div>
        </div>
    `;

    html += '</div>';
    return html;
}

// ============================================================================
// TRIAL CREATION FUNCTION
// ============================================================================

/**
 * Creates a complete trial sequence for one stimulus
 * @param {Object} stimulus - The stimulus configuration
 * @param {boolean} isPractice - Whether this is a practice trial
 * @returns {Object} jsPsych timeline object
 */
function createTrial(stimulus, isPractice = false) {
    // Randomize trait order per trial
    const traitOrder = jsPsych.randomization.shuffle(['trustworthy', 'competent', 'attractive', 'friendly']);

    // Variables to store responses per trait
    const responses = {
        trustworthy: { rating: null, confidence: null, rt: null },
        competent: { rating: null, confidence: null, rt: null },
        attractive: { rating: null, confidence: null, rt: null },
        friendly: { rating: null, confidence: null, rt: null }
    };

    // Image dimensions for embedding in trait screens
    const dimensions = STIMULI_CONFIG.sizes[stimulus.size];

    // Three trait rating screens (in randomized order), each showing the image
    const traitScreens = traitOrder.map((trait, index) => {
        return {
            type: jsPsychSurveyHtmlForm,
            preamble: '',
            html: function() {
                return buildTraitFormHTML(trait, stimulus.image_path, stimulus.size, dimensions);
            },
            button_label: 'Next',
            trial_duration: 30000, // 30 second timeout
            data: {
                trial_part: 'trait_rating',
                trait: trait,
                trait_position: index + 1
            },
            on_load: function() {
                // Set up slider interaction tracking
                const ratingSlider = document.getElementById(`${trait}_rating`);
                const confSlider = document.getElementById(`${trait}_confidence`);
                const ratingDisplay = document.getElementById(`${trait}_rating_display`);
                const confDisplay = document.getElementById(`${trait}_confidence_display`);

                let ratingInteracted = false;
                let confInteracted = false;

                // Update slider fill percentage CSS variable
                function updateSliderFill(slider) {
                    const percent = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
                    slider.style.setProperty('--slider-percent', percent + '%');
                }

                // Rating slider events
                ratingSlider.addEventListener('input', function() {
                    if (!ratingInteracted) {
                        ratingInteracted = true;
                        ratingSlider.classList.add('slider-interacted');
                        ratingDisplay.classList.remove('placeholder');
                    }
                    ratingDisplay.textContent = this.value;
                    updateSliderFill(this);
                });

                // Confidence slider events
                confSlider.addEventListener('input', function() {
                    if (!confInteracted) {
                        confInteracted = true;
                        confSlider.classList.add('slider-interacted');
                        confDisplay.classList.remove('placeholder');
                    }
                    confDisplay.textContent = this.value;
                    updateSliderFill(this);
                });

                // Disable submit until both sliders have been interacted with
                const submitBtn = document.querySelector('#jspsych-survey-html-form-next');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.style.opacity = '0.5';

                    const checkReady = () => {
                        if (ratingInteracted && confInteracted) {
                            submitBtn.disabled = false;
                            submitBtn.style.opacity = '1';
                        }
                    };

                    ratingSlider.addEventListener('input', checkReady);
                    confSlider.addEventListener('input', checkReady);
                }
            },
            on_finish: function(data) {
                if (data.response) {
                    responses[trait].rating = parseInt(data.response[`${trait}_rating`]);
                    responses[trait].confidence = parseInt(data.response[`${trait}_confidence`]);
                    responses[trait].rt = data.rt;
                } else {
                    // Timeout — no response
                    responses[trait].rating = null;
                    responses[trait].confidence = null;
                    responses[trait].rt = null;
                }
            }
        };
    });

    // 4. Record complete trial data using call-function plugin
    const recordData = {
        type: jsPsychCallFunction,
        func: function() {
            // Increment trial number (only for main trials)
            if (!isPractice) {
                trialNumber++;
                updateProgressBar(trialNumber / 16);
            }

            // Construct full image name
            const parts = stimulus.individual_id.split('_');
            const smileStr = stimulus.smile ? 'smile' : 'nosmile';
            const imageName = `${parts[0]}_${parts[1]}_${smileStr}_${parts[2]}_${stimulus.size}`;

            return {
                participant_id: participantId,
                trial_number: isPractice ? 'practice' : trialNumber,
                image_name: imageName,
                true_race: stimulus.race,
                true_gender: stimulus.gender,
                size_condition: stimulus.size,
                smile_condition: stimulus.smile ? 'smile' : 'nosmile',
                trait_order: traitOrder.join(','),
                trustworthy_rating: responses.trustworthy.rating,
                trustworthy_confidence: responses.trustworthy.confidence,
                trustworthy_rt: responses.trustworthy.rt,
                competent_rating: responses.competent.rating,
                competent_confidence: responses.competent.confidence,
                competent_rt: responses.competent.rt,
                attractive_rating: responses.attractive.rating,
                attractive_confidence: responses.attractive.confidence,
                attractive_rt: responses.attractive.rt,
                friendly_rating: responses.friendly.rating,
                friendly_confidence: responses.friendly.confidence,
                friendly_rt: responses.friendly.rt,
                is_practice: isPractice
            };
        },
        data: {
            trial_type: 'trial_complete'
        }
    };

    // Build timeline: 3 trait screens (each with image) → record
    const timeline = [...traitScreens, recordData];

    return {
        timeline: timeline
    };
}

// ============================================================================
// MAIN EXPERIMENT TRIALS
// ============================================================================

function createMainExperiment() {
    const stimulusAssignment = generateStimulusAssignment();

    const trials = [];
    for (const stimulus of stimulusAssignment) {
        trials.push(createTrial(stimulus, false));
    }

    return {
        timeline: trials
    };
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
            <p>This study investigates how people form subjective impressions of faces — specifically trustworthiness, competence, attractiveness, and friendliness — based on profile pictures of different sizes. We are interested in whether smaller profile pictures affect these trait judgments and the confidence people have in those judgments.</p>

            <p>Your responses will help us understand how the size of profile pictures might influence perceptions and decision-making on online platforms.</p>

            <h3>Data Submission</h3>
            <p>When you click "Finish," your responses will be automatically submitted to the research team.</p>

            <p>If you have any questions about this study, please contact the research team.</p>

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
            console.log('Display check passed. Zoom tracking active.');
        }
    },
    welcome,
    consent,
    demographics,
    instructions,
    practiceIntro,
    practiceTrial,
    practiceFeedback,
    // Transition from practice to main experiment
    {
        type: jsPsychCallFunction,
        func: function() {
            endPracticeMode();
            createCustomProgressBar();
            updateProgressBar(0);
            console.log('Practice complete. Zoom monitoring now active.');
        }
    }
];

// Add main experiment trials
const mainExperimentTrials = createMainExperiment();
timeline.push(mainExperimentTrials);

// Add debrief
timeline.push(debrief);

// Run the experiment
jsPsych.run(timeline);
