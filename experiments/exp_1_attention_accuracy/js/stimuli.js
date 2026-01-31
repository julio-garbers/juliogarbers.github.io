/**
 * Stimulus Configuration for Face Perception Experiment
 *
 * Image naming convention: {race}_{gender}_{smile}_{id}_{size}.{ext}
 * Example: black_male_smile_01_big.jpeg
 *
 * Races: black, asian, white, hispanic
 * Genders: male, female
 * Smile: smile, nosmile
 * IDs: 01, 02 (two individuals per race-gender combination)
 * Sizes: big (256x256), small (104x104)
 * Extensions: .jpeg for big, .png for small
 */

const STIMULI_CONFIG = {
    // Base path for images (adjust if needed for deployment)
    imagePath: 'images/',

    // Image dimensions
    sizes: {
        big: { width: 256, height: 256 },
        small: { width: 104, height: 104 }
    },

    // All 16 individuals (2 per race × gender combination)
    individuals: [
        // Black individuals
        { id: 'black_male_01', race: 'black', gender: 'male' },
        { id: 'black_male_02', race: 'black', gender: 'male' },
        { id: 'black_female_01', race: 'black', gender: 'female' },
        { id: 'black_female_02', race: 'black', gender: 'female' },

        // Asian individuals
        { id: 'asian_male_01', race: 'asian', gender: 'male' },
        { id: 'asian_male_02', race: 'asian', gender: 'male' },
        { id: 'asian_female_01', race: 'asian', gender: 'female' },
        { id: 'asian_female_02', race: 'asian', gender: 'female' },

        // White individuals
        { id: 'white_male_01', race: 'white', gender: 'male' },
        { id: 'white_male_02', race: 'white', gender: 'male' },
        { id: 'white_female_01', race: 'white', gender: 'female' },
        { id: 'white_female_02', race: 'white', gender: 'female' },

        // Hispanic individuals
        { id: 'hispanic_male_01', race: 'hispanic', gender: 'male' },
        { id: 'hispanic_male_02', race: 'hispanic', gender: 'male' },
        { id: 'hispanic_female_01', race: 'hispanic', gender: 'female' },
        { id: 'hispanic_female_02', race: 'hispanic', gender: 'female' }
    ],

    // Practice trial configuration
    // Uses white_female_01 as practice (with smile, big size)
    // Ground truth values for checking answers
    practice: {
        race: 'white',
        gender: 'female',
        id: '01',
        smile: true,    // Ground truth: smiling
        size: 'big'     // Practice shown in big size
    }
};

/**
 * Generate the image filename for a given stimulus configuration
 * @param {string} individualId - The individual's ID (e.g., 'black_male_01')
 * @param {string} size - 'big' or 'small'
 * @param {boolean} smile - true for smiling, false for not smiling
 * @returns {string} The complete image path
 */
function getImagePath(individualId, size, smile) {
    // Parse individualId to extract race, gender, and number
    // Format: {race}_{gender}_{id} e.g., 'black_male_01'
    const parts = individualId.split('_');
    const race = parts[0];
    const gender = parts[1];
    const idNum = parts[2];

    const smileStr = smile ? 'smile' : 'nosmile';
    const ext = size === 'big' ? 'jpeg' : 'png';

    // New format: {race}_{gender}_{smile}_{id}_{size}.{ext}
    return `${STIMULI_CONFIG.imagePath}${race}_${gender}_${smileStr}_${idNum}_${size}.${ext}`;
}

/**
 * Generate a placeholder image as a data URL
 * @param {string} label - Text label for the placeholder
 * @param {number} size - Image dimensions (square)
 * @param {boolean} smile - Whether to show a smile
 * @returns {string} Data URL of the placeholder image
 */
function generatePlaceholder(label, size, smile) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Gray background
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    // Simple face
    const centerX = size / 2;
    const centerY = size / 2;
    const faceRadius = size * 0.35;

    // Face circle
    ctx.fillStyle = '#A0A0A0';
    ctx.beginPath();
    ctx.arc(centerX, centerY, faceRadius, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#333';
    const eyeY = centerY - faceRadius * 0.15;
    const eyeOffset = faceRadius * 0.3;
    ctx.beginPath();
    ctx.arc(centerX - eyeOffset, eyeY, faceRadius * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + eyeOffset, eyeY, faceRadius * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.strokeStyle = '#333';
    ctx.lineWidth = Math.max(2, size * 0.02);
    ctx.beginPath();
    const mouthY = centerY + faceRadius * 0.3;
    if (smile) {
        ctx.arc(centerX, mouthY - faceRadius * 0.1, faceRadius * 0.25, 0.1 * Math.PI, 0.9 * Math.PI);
    } else {
        ctx.moveTo(centerX - faceRadius * 0.2, mouthY);
        ctx.lineTo(centerX + faceRadius * 0.2, mouthY);
    }
    ctx.stroke();

    // Label
    ctx.fillStyle = '#FFF';
    ctx.font = `bold ${Math.max(10, size * 0.08)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(label, centerX, size - 10);

    return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Get the practice trial image (generated placeholder)
 * @returns {string} Data URL of the practice placeholder image
 */
function getPracticeImagePath() {
    const p = STIMULI_CONFIG.practice;
    const size = p.size === 'big' ? 256 : 104;
    return generatePlaceholder('PRACTICE', size, p.smile);
}

/**
 * Generate a balanced stimulus assignment for one participant
 * Ensures: 8 big/8 small, 8 smile/8 nosmile, each individual seen once
 * @returns {Array} Array of 16 trial configurations
 */
function generateStimulusAssignment() {
    // Create the 4 conditions with 4 slots each
    const conditions = [
        { size: 'big', smile: true },
        { size: 'big', smile: false },
        { size: 'small', smile: true },
        { size: 'small', smile: false }
    ];

    // Shuffle individuals
    const shuffledIndividuals = jsPsych.randomization.shuffle([...STIMULI_CONFIG.individuals]);

    // Assign 4 individuals to each condition
    const trials = [];
    for (let i = 0; i < 16; i++) {
        const conditionIndex = Math.floor(i / 4);
        const condition = conditions[conditionIndex];
        const individual = shuffledIndividuals[i];

        trials.push({
            individual_id: individual.id,
            race: individual.race,
            gender: individual.gender,
            size: condition.size,
            smile: condition.smile,
            image_path: getImagePath(individual.id, condition.size, condition.smile)
        });
    }

    // Shuffle the presentation order
    return jsPsych.randomization.shuffle(trials);
}

/**
 * Get all possible image paths for preloading
 * @returns {Array} Array of all image paths
 */
function getAllImagePaths() {
    const paths = [];
    const sizes = ['big', 'small'];
    const smiles = [true, false];

    // Main experiment images only (practice is generated, not loaded)
    for (const individual of STIMULI_CONFIG.individuals) {
        for (const size of sizes) {
            for (const smile of smiles) {
                paths.push(getImagePath(individual.id, size, smile));
            }
        }
    }

    return paths;
}
