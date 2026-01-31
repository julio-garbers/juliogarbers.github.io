/**
 * Face Perception Experiment
 *
 * This experiment measures race and smile detection accuracy
 * across different profile picture sizes.
 */

// Initialize jsPsych
const jsPsych = initJsPsych({
    show_progress_bar: true,
    auto_update_progress_bar: false,
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
// DISPLAY REQUIREMENTS (FULLSCREEN & ZOOM)
// ============================================================================

/**
 * Detect browser zoom level
 * Returns the zoom level as a percentage (100 = no zoom)
 *
 * Uses devicePixelRatio which directly reflects browser zoom:
 * - Standard display at 100% zoom: DPR = 1.0
 * - Standard display at 120% zoom: DPR = 1.2
 * - Standard display at 150% zoom: DPR = 1.5
 * - Retina display at 100% zoom: DPR = 2.0
 * - Retina display at 150% zoom: DPR = 3.0
 */
function detectZoomLevel() {
    const dpr = window.devicePixelRatio || 1;

    // Determine the base DPR (the DPR at 100% zoom for this display)
    // Standard displays have base DPR = 1, Retina/HiDPI have base DPR = 2 or higher
    //
    // We detect this by checking if DPR is close to a whole number >= 2
    // If DPR is 2.0, 2.1, 1.9, etc., it's likely a Retina display at ~100% zoom
    // If DPR is 1.0, 1.2, 1.5, etc., it's likely a standard display

    let baseDPR = 1;

    // Check for Retina/HiDPI displays (base DPR of 2 or 3)
    // These displays have DPR = 2.0 at 100% zoom
    if (dpr >= 1.9 && dpr <= 2.1) {
        baseDPR = 2; // Retina at 100%
    } else if (dpr >= 2.9 && dpr <= 3.1) {
        baseDPR = 3; // 3x display at 100%
    } else if (dpr >= 3.9 && dpr <= 4.1) {
        baseDPR = 2; // Retina at 200% zoom, or 4x display at 100%
    } else if (dpr > 2.1 && dpr < 2.9) {
        // Retina display with zoom (e.g., DPR 2.4 = Retina at 120%)
        baseDPR = 2;
    } else if (dpr > 3.1 && dpr < 3.9) {
        // Could be Retina at high zoom or 3x display with zoom
        baseDPR = 2;
    } else {
        // Standard display (DPR < 1.9)
        baseDPR = 1;
    }

    // Calculate zoom level
    const zoomLevel = Math.round((dpr / baseDPR) * 100);

    return zoomLevel;
}

/**
 * Check if zoom level is approximately 100% (within tolerance)
 * @param {number} tolerance - Acceptable deviation in percentage points (default: 5)
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
    const isWindows = navigator.platform.toUpperCase().indexOf('WIN') >= 0;

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
 * Shows a warning if user exits fullscreen during the experiment
 */
function setupFullscreenMonitoring() {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
}

function handleFullscreenChange() {
    // Only show warning if experiment has started (past the setup phase),
    // user has exited fullscreen, and experiment hasn't ended
    if (!isFullscreen() && !fullscreenWarningShown && trialNumber >= 0 && !experimentEnded) {
        showFullscreenWarning();
    }
}

function showFullscreenWarning() {
    fullscreenWarningShown = true;

    // Create overlay
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

    // Handle return to fullscreen
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

// Initial screen explaining display requirements
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
            <p>Click "Check Display Settings" when ready.</p>
        </div>
    `,
    choices: ['Check Display Settings'],
    data: { trial_type: 'display_requirements_intro' }
};

// Enter fullscreen
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
        // Start monitoring for fullscreen exit
        setupFullscreenMonitoring();
    }
};

// Check zoom level (loops until correct)
const zoomCheck = {
    type: jsPsychHtmlButtonResponse,
    stimulus: function() {
        const zoomLevel = detectZoomLevel();
        const zoomOk = isZoomAt100();
        const fullscreenOk = isFullscreen();

        let statusHtml = `
            <div class="instruction-container">
                <h2>Display Check</h2>
                <div class="display-check-status">
        `;

        // Fullscreen status
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

        // Zoom status
        // Get debug info
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

        // Debug info (can be removed in production)
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

        // Show instructions if not ready
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

        if (zoomOk && fullscreenOk) {
            return ['Continue'];
        } else if (!fullscreenOk) {
            return ['Re-enter Fullscreen', 'Check Again'];
        } else {
            return ['Check Again'];
        }
    },
    data: { trial_type: 'zoom_check' },
    on_finish: async function(data) {
        const zoomOk = isZoomAt100();
        const fullscreenOk = isFullscreen();

        // Record the check results
        data.zoom_level = detectZoomLevel();
        data.zoom_ok = zoomOk;
        data.fullscreen_ok = fullscreenOk;

        // If user clicked "Re-enter Fullscreen"
        if (data.response === 0 && !fullscreenOk) {
            try {
                await document.documentElement.requestFullscreen();
            } catch (err) {
                console.error('Failed to enter fullscreen:', err);
            }
        }
    }
};

// Loop the zoom check until requirements are met
const displayCheckLoop = {
    timeline: [zoomCheck],
    loop_function: function(data) {
        const lastTrial = data.values()[0];
        // Continue looping if requirements not met
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
            <p>This study investigates how people perceive faces in profile pictures of different sizes.</p>
            <p>The study will take approximately <strong>5-10 minutes</strong> to complete.</p>
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

            <p><strong>Purpose:</strong> This study examines how people perceive facial features in profile pictures of varying sizes.</p>

            <p><strong>Procedure:</strong> You will view a series of face images and answer questions about each one. The entire study takes approximately 5-10 minutes.</p>

            <p><strong>Risks:</strong> There are no known risks associated with this study beyond those of everyday life.</p>

            <p><strong>Benefits:</strong> While there are no direct benefits to you, your participation will contribute to scientific understanding of face perception.</p>

            <p><strong>Confidentiality:</strong> Your responses are anonymous. No personally identifying information is collected. Data will be used for research purposes only.</p>

            <p><strong>Voluntary Participation:</strong> Your participation is entirely voluntary. You may withdraw at any time by closing your browser window.</p>

            <p><strong>Contact:</strong> If you have questions about this study, please contact the research team.</p>

            <div class="consent-checkbox">
                <p><strong>By clicking "I Agree" below, you confirm that:</strong></p>
                <ul>
                    <li>You have read and understood the above information</li>
                    <li>You are 18 years of age or older</li>
                    <li>You voluntarily agree to participate in this study</li>
                </ul>
            </div>
        </div>
    `,
    choices: ['I Agree', 'I Do Not Agree'],
    data: { trial_type: 'consent' },
    on_finish: function(data) {
        if (data.response === 1) {
            // User did not consent - end experiment
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
            <p>Please provide the following information. All responses are anonymous.</p>
        </div>
    `,
    html: `
        <div class="demographics-form">
            <div class="form-group">
                <label for="age">Age:</label>
                <input type="number" id="age" name="age" min="18" max="120" required>
            </div>

            <div class="form-group">
                <label>Gender:</label>
                <div class="radio-group">
                    <label><input type="radio" name="gender" value="male" required> Male</label>
                    <label><input type="radio" name="gender" value="female"> Female</label>
                    <label><input type="radio" name="gender" value="non-binary"> Non-binary</label>
                    <label><input type="radio" name="gender" value="other"> Other</label>
                    <label><input type="radio" name="gender" value="prefer_not_to_say"> Prefer not to say</label>
                </div>
            </div>

            <div class="form-group">
                <label>Race/Ethnicity (select all that apply):</label>
                <div class="checkbox-group">
                    <label><input type="checkbox" name="race_asian" value="asian"> Asian</label>
                    <label><input type="checkbox" name="race_black" value="black"> Black or African American</label>
                    <label><input type="checkbox" name="race_hispanic" value="hispanic"> Hispanic or Latino</label>
                    <label><input type="checkbox" name="race_white" value="white"> White</label>
                    <label><input type="checkbox" name="race_native" value="native"> Native American or Alaska Native</label>
                    <label><input type="checkbox" name="race_pacific" value="pacific"> Native Hawaiian or Pacific Islander</label>
                    <label><input type="checkbox" name="race_other" value="other"> Other</label>
                    <label><input type="checkbox" name="race_prefer_not" value="prefer_not_to_say"> Prefer not to say</label>
                </div>
            </div>

            <div class="form-group">
                <label>Highest level of education completed:</label>
                <select name="education" required>
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

            <p>In this study, you will view a series of <strong>profile pictures</strong> and answer questions about each one.</p>

            <h3>How each trial works:</h3>
            <ol>
                <li>A face image will appear on screen for <strong>2 seconds</strong></li>
                <li>The image will disappear and you will see a brief fixation cross (+)</li>
                <li>You will then answer <strong>two questions</strong> about the face you just saw</li>
            </ol>

            <h3>The questions will ask about:</h3>
            <ul>
                <li><strong>Race:</strong> What is the race of the person shown?</li>
                <li><strong>Expression:</strong> Was the person smiling?</li>
            </ul>

            <h3>Important:</h3>
            <ul>
                <li>Please respond as <strong>quickly and accurately</strong> as possible</li>
                <li>You will have <strong>10 seconds</strong> to answer each question</li>
                <li>Pay close attention to the image, as it only appears briefly</li>
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
                <li>Look carefully at the face image (it appears for 2 seconds)</li>
                <li>Answer the two questions that follow</li>
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
    stimulus: function() {
        // Get practice trial data
        const practiceData = jsPsych.data.get().filter({ is_practice: true }).last(1).values()[0];

        let feedbackHtml = `<div class="instruction-container feedback-container">
            <h2>Practice Complete!</h2>`;

        if (practiceData) {
            const raceCorrect = practiceData.race_correct;
            const smileCorrect = practiceData.smile_correct;

            feedbackHtml += `<p>Your responses:</p>
            <ul>
                <li>Race question: ${raceCorrect ? '<span class="correct">Correct</span>' : '<span class="incorrect">Incorrect</span>'}</li>
                <li>Smile question: ${smileCorrect ? '<span class="correct">Correct</span>' : '<span class="incorrect">Incorrect</span>'}</li>
            </ul>`;
        }

        feedbackHtml += `
            <p>Great! You now understand how the task works.</p>
            <p>In the main experiment, you will see <strong>16 face images</strong>.</p>
            <p>There will be no feedback during the main experiment.</p>
            <p>Click "Begin Experiment" when you're ready to start.</p>
        </div>`;

        return feedbackHtml;
    },
    choices: ['Begin Experiment'],
    data: { trial_type: 'practice_feedback' }
};

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
    // Randomly determine question order
    const raceFirst = Math.random() < 0.5;

    // Randomize option orders
    const raceOptions = jsPsych.randomization.shuffle(['Asian', 'Black', 'Hispanic', 'White']);
    const smileOptions = jsPsych.randomization.shuffle(['Yes', 'No']);

    // Trial data to be recorded
    const baseTrialData = {
        participant_id: participantId,
        individual_id: stimulus.individual_id,
        true_race: stimulus.race,
        true_gender: stimulus.gender,
        size_condition: stimulus.size,
        smile_condition: stimulus.smile,
        question_order: raceFirst ? 'race_first' : 'smile_first',
        is_practice: isPractice
    };

    // Variables to store responses
    let raceResponse = null;
    let raceRT = null;
    let smileResponse = null;
    let smileRT = null;

    // 1. Display image for 2 seconds
    const imageDisplay = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function() {
            const dimensions = STIMULI_CONFIG.sizes[stimulus.size];
            return `
                <div class="image-container">
                    <img src="${stimulus.image_path}"
                         width="${dimensions.width}"
                         height="${dimensions.height}"
                         alt="Face image"
                         class="stimulus-image ${stimulus.size}">
                </div>
            `;
        },
        choices: "NO_KEYS",
        trial_duration: 2000,
        data: { trial_part: 'image_display', ...baseTrialData }
    };

    // 2. Fixation cross for 500ms
    const fixation = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: '<div class="fixation">+</div>',
        choices: "NO_KEYS",
        trial_duration: 500,
        data: { trial_part: 'fixation' }
    };

    // 3. Race question
    const raceQuestion = {
        type: jsPsychHtmlButtonResponse,
        stimulus: '<p class="question-text">What is the race of the person shown?</p>',
        choices: raceOptions,
        trial_duration: 10000,  // 10 second timeout
        data: {
            trial_part: 'race_question',
            question_number: raceFirst ? 1 : 2,
            options_order: raceOptions.join(',')
        },
        on_finish: function(data) {
            if (data.response !== null) {
                raceResponse = raceOptions[data.response].toLowerCase();
                raceRT = data.rt;
            } else {
                raceResponse = null;
                raceRT = null;
            }
        }
    };

    // 4. Smile question
    const smileQuestion = {
        type: jsPsychHtmlButtonResponse,
        stimulus: '<p class="question-text">Was the person shown smiling?</p>',
        choices: smileOptions,
        trial_duration: 10000,  // 10 second timeout
        data: {
            trial_part: 'smile_question',
            question_number: raceFirst ? 2 : 1,
            options_order: smileOptions.join(',')
        },
        on_finish: function(data) {
            if (data.response !== null) {
                smileResponse = smileOptions[data.response].toLowerCase();
                smileRT = data.rt;
            } else {
                smileResponse = null;
                smileRT = null;
            }
        }
    };

    // 5. Record complete trial data using call-function plugin
    // The data returned here will be saved to jsPsych's data collection
    const recordData = {
        type: jsPsychCallFunction,
        func: function() {
            // Determine correctness
            const raceCorrect = raceResponse === stimulus.race;
            const smileCorrect = (smileResponse === 'yes') === stimulus.smile;

            // Increment trial number (only for main trials)
            if (!isPractice) {
                trialNumber++;
                // Update progress bar
                jsPsych.setProgressBar(trialNumber / 16);
            }

            // Return the complete trial data (will be saved automatically)
            return {
                participant_id: participantId,
                trial_number: isPractice ? 'practice' : trialNumber,
                individual_id: stimulus.individual_id,
                true_race: stimulus.race,
                true_gender: stimulus.gender,
                size_condition: stimulus.size,
                smile_condition: stimulus.smile ? 'smile' : 'nosmile',
                question_order: raceFirst ? 'race_first' : 'smile_first',
                race_response: raceResponse,
                race_rt: raceRT,
                race_correct: raceCorrect,
                smile_response: smileResponse,
                smile_rt: smileRT,
                smile_correct: smileCorrect,
                is_practice: isPractice
            };
        },
        data: {
            trial_type: 'trial_complete'
        }
    };

    // Build timeline based on question order
    const timeline = [imageDisplay, fixation];
    if (raceFirst) {
        timeline.push(raceQuestion, smileQuestion);
    } else {
        timeline.push(smileQuestion, raceQuestion);
    }
    timeline.push(recordData);

    return {
        timeline: timeline
    };
}

// ============================================================================
// MAIN EXPERIMENT TRIALS
// ============================================================================

const mainTrials = {
    timeline: [
        {
            type: jsPsychCallFunction,
            func: function() {
                // This will be replaced with actual trial
            }
        }
    ],
    timeline_variables: [],  // Will be populated dynamically
    on_timeline_start: function() {
        // Generate stimulus assignment when trials begin
        this.timeline_variables = generateStimulusAssignment();
    }
};

// Create the main experiment procedure
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
            <p>This study investigates how people perceive facial features—specifically race and expression—in profile pictures of different sizes. We are interested in whether smaller profile pictures make certain features more or less noticeable compared to others.</p>

            <p>Your responses will help us understand how the size of profile pictures might influence perceptions in online platforms.</p>

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
    continue_after_error: true,  // Continue even if some images fail (for demo without images)
    on_error: function(file) {
        console.warn('Failed to preload:', file);
    }
};

// ============================================================================
// BUILD AND RUN EXPERIMENT
// ============================================================================

// Build the complete timeline
const timeline = [
    preload,
    displayRequirementsIntro,
    enterFullscreen,
    displayCheckLoop,
    welcome,
    consent,
    demographics,
    instructions,
    practiceIntro,
    practiceTrial,
    practiceFeedback
];

// Add main experiment trials
const mainExperimentTrials = createMainExperiment();
timeline.push(mainExperimentTrials);

// Add debrief
timeline.push(debrief);

// Run the experiment
jsPsych.run(timeline);
