/**
 * Face Memory Experiment
 *
 * This experiment measures race and smile memory accuracy
 * across different profile picture sizes.
 *
 * Design:
 * - 12 rounds total
 * - Each round: 12 images in 3x4 grid shown for 10 seconds
 * - One question per round (race count OR smile count)
 * - 6 big rounds, 6 small rounds
 * - 6 race questions, 6 smile questions
 * - Balanced: 3 of each size × question type combination
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
// DISPLAY REQUIREMENTS (FULLSCREEN & ZOOM)
// ============================================================================

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
            <p>Click "Check Display Settings" when ready.</p>
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
        const zoomLevel = detectZoomLevel();
        const zoomOk = isZoomAt100();
        const fullscreenOk = isFullscreen();

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
        data.zoom_level = detectZoomLevel();
        data.zoom_ok = zoomOk;
        data.fullscreen_ok = fullscreenOk;

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

            <p><strong>Purpose:</strong> This study examines how people remember facial features in profile pictures of varying sizes.</p>

            <p><strong>Procedure:</strong> You will view grids of face images and answer questions about what you remember. The entire study takes approximately 10-15 minutes.</p>

            <p><strong>Risks:</strong> There are no known risks associated with this study beyond those of everyday life.</p>

            <p><strong>Benefits:</strong> While there are no direct benefits to you, your participation will contribute to scientific understanding of face memory.</p>

            <p><strong>Confidentiality:</strong> Your responses are anonymous. No personally identifying information is collected.</p>

            <p><strong>Voluntary Participation:</strong> Your participation is entirely voluntary. You may withdraw at any time by closing your browser window.</p>

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

            <p>In this study, you will view grids of <strong>profile pictures</strong> and answer questions about what you remember.</p>

            <h3>How each round works:</h3>
            <ol>
                <li>You will see a grid of <strong>12 face images</strong> for <strong>10 seconds</strong></li>
                <li>The images will disappear</li>
                <li>You will answer <strong>one question</strong> about what you remember</li>
            </ol>

            <h3>The questions will ask about:</h3>
            <ul>
                <li><strong>Race:</strong> How many faces of each race did you see?</li>
                <li><strong>Expression:</strong> How many smiling/non-smiling faces did you see?</li>
            </ul>

            <h3>Important:</h3>
            <ul>
                <li>Pay close attention to all the faces in the grid</li>
                <li>You will have <strong>30 seconds</strong> to answer each question</li>
                <li>You will complete <strong>12 rounds</strong> in total</li>
                <li>Try to remember as accurately as possible</li>
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
    // Generate the grid for this round
    const grid = generateGridForRound(roundConfig.size);

    // Store round data
    const baseRoundData = {
        participant_id: participantId,
        round_number: isPractice ? 'practice' : null,  // Will be set during trial
        size_condition: roundConfig.size,
        question_type: roundConfig.questionType,
        is_practice: isPractice,
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
                <p>You will see <strong>12 faces</strong> for <strong>10 seconds</strong>.</p>
                <p>Click "Start" when you're ready.</p>
            </div>
        `,
        choices: ['Start'],
        data: { trial_part: 'pre_round_instruction', ...baseRoundData }
    };

    // 1. Display grid for 10 seconds
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

    if (roundConfig.questionType === 'race') {
        question = {
            type: jsPsychSurveyHtmlForm,
            preamble: `
                <div class="question-container">
                    <p class="question-text">For each race, how many faces do you remember seeing?</p>
                </div>
            `,
            html: `
                <div class="count-input-group">
                    <div class="count-input-row">
                        <span class="count-label">Asian</span>
                        <input type="number" name="asian" class="count-input" min="0" max="12" value="0" required>
                    </div>
                    <div class="count-input-row">
                        <span class="count-label">Black</span>
                        <input type="number" name="black" class="count-input" min="0" max="12" value="0" required>
                    </div>
                    <div class="count-input-row">
                        <span class="count-label">Hispanic</span>
                        <input type="number" name="hispanic" class="count-input" min="0" max="12" value="0" required>
                    </div>
                    <div class="count-input-row">
                        <span class="count-label">White</span>
                        <input type="number" name="white" class="count-input" min="0" max="12" value="0" required>
                    </div>
                    <div class="running-total" id="race-total">Total: 0 / 12</div>
                </div>
            `,
            button_label: 'Submit',
            data: { trial_part: 'race_question', ...baseRoundData },
            on_load: function() {
                // Start 30-second timeout
                const timeoutId = setTimeout(() => {
                    document.querySelector('#jspsych-survey-html-form-next').click();
                }, 30000);

                // Update running total
                document.querySelectorAll('.count-input').forEach(input => {
                    input.addEventListener('input', () => {
                        const total = Array.from(document.querySelectorAll('.count-input'))
                            .reduce((sum, el) => sum + (parseInt(el.value) || 0), 0);
                        document.getElementById('race-total').textContent = 'Total: ' + total + ' / 12';
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
            }
        };
    } else {
        question = {
            type: jsPsychSurveyHtmlForm,
            preamble: `
                <div class="question-container">
                    <p class="question-text">How many smiling and non-smiling faces do you remember seeing?</p>
                </div>
            `,
            html: `
                <div class="count-input-group">
                    <div class="count-input-row">
                        <span class="count-label">Smiling</span>
                        <input type="number" name="smiling" class="count-input" min="0" max="12" value="0" required>
                    </div>
                    <div class="count-input-row">
                        <span class="count-label">Not Smiling</span>
                        <input type="number" name="not_smiling" class="count-input" min="0" max="12" value="0" required>
                    </div>
                    <div class="running-total" id="smile-total">Total: 0 / 12</div>
                </div>
            `,
            button_label: 'Submit',
            data: { trial_part: 'smile_question', ...baseRoundData },
            on_load: function() {
                // Start 30-second timeout
                const timeoutId = setTimeout(() => {
                    document.querySelector('#jspsych-survey-html-form-next').click();
                }, 30000);

                // Update running total
                document.querySelectorAll('.count-input').forEach(input => {
                    input.addEventListener('input', () => {
                        const total = Array.from(document.querySelectorAll('.count-input'))
                            .reduce((sum, el) => sum + (parseInt(el.value) || 0), 0);
                        document.getElementById('smile-total').textContent = 'Total: ' + total + ' / 12';
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
            }
        };
    }

    // 4. Record complete round data
    const recordData = {
        type: jsPsychCallFunction,
        func: function() {
            if (!isPractice) {
                roundNumber++;
                jsPsych.setProgressBar(roundNumber / 12);
            }

            // Calculate accuracy metrics
            let accuracy = {};
            if (roundConfig.questionType === 'race') {
                accuracy = {
                    asian_response: parseInt(responseData.asian) || 0,
                    black_response: parseInt(responseData.black) || 0,
                    hispanic_response: parseInt(responseData.hispanic) || 0,
                    white_response: parseInt(responseData.white) || 0,
                    asian_error: (parseInt(responseData.asian) || 0) - grid.composition.asian,
                    black_error: (parseInt(responseData.black) || 0) - grid.composition.black,
                    hispanic_error: (parseInt(responseData.hispanic) || 0) - grid.composition.hispanic,
                    white_error: (parseInt(responseData.white) || 0) - grid.composition.white
                };
            } else {
                accuracy = {
                    smiling_response: parseInt(responseData.smiling) || 0,
                    not_smiling_response: parseInt(responseData.not_smiling) || 0,
                    smiling_error: (parseInt(responseData.smiling) || 0) - grid.composition.smiling,
                    not_smiling_error: (parseInt(responseData.not_smiling) || 0) - grid.composition.not_smiling
                };
            }

            return {
                participant_id: participantId,
                round_number: isPractice ? 'practice' : roundNumber,
                size_condition: roundConfig.size,
                question_type: roundConfig.questionType,
                is_practice: isPractice,
                // Actual composition
                actual_asian: grid.composition.asian,
                actual_black: grid.composition.black,
                actual_hispanic: grid.composition.hispanic,
                actual_white: grid.composition.white,
                actual_smiling: grid.composition.smiling,
                actual_not_smiling: grid.composition.not_smiling,
                // Responses and accuracy
                ...accuracy,
                response_rt: responseRT
            };
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
    welcome,
    consent,
    demographics,
    instructions,
    practiceIntro,
    practiceRound,
    practiceFeedback
];

// Add main experiment
const mainExperiment = createMainExperiment();
timeline.push(mainExperiment);

// Add debrief
timeline.push(debrief);

// Run the experiment
jsPsych.run(timeline);
