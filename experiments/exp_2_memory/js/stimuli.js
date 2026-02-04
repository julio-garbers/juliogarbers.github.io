/**
 * Stimulus Configuration for Face Memory Experiment
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
    // Base path for images
    imagePath: '../images/',

    // Base path for practice images
    practiceImagePath: '../practice_images/',

    // Image dimensions
    sizes: {
        big: { width: 256, height: 256 },
        small: { width: 104, height: 104 }
    },

    // Grid configuration
    grid: {
        rows: 2,
        cols: 4,
        totalImages: 8
    },

    // Display duration in milliseconds
    displayDuration: 5000,  // 5 seconds

    // All races
    races: ['asian', 'black', 'hispanic', 'white'],

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

    // Practice individuals (8 total - one per race/gender combination)
    // hasSmile indicates if smile version exists (some only have nosmile)
    practiceIndividuals: [
        { id: 'black_male_01', race: 'black', gender: 'male', hasSmile: true },
        { id: 'black_female_01', race: 'black', gender: 'female', hasSmile: true },
        { id: 'asian_male_01', race: 'asian', gender: 'male', hasSmile: false },
        { id: 'asian_female_01', race: 'asian', gender: 'female', hasSmile: true },
        { id: 'white_male_01', race: 'white', gender: 'male', hasSmile: true },
        { id: 'white_female_01', race: 'white', gender: 'female', hasSmile: true },
        { id: 'hispanic_male_01', race: 'hispanic', gender: 'male', hasSmile: false },
        { id: 'hispanic_female_01', race: 'hispanic', gender: 'female', hasSmile: false }
    ]
};

/**
 * Generate the image filename for a given stimulus configuration
 * @param {string} individualId - The individual's ID (e.g., 'black_male_01')
 * @param {string} size - 'big' or 'small'
 * @param {boolean} smile - true for smiling, false for not smiling
 * @returns {string} The complete image path
 */
function getImagePath(individualId, size, smile) {
    const parts = individualId.split('_');
    const race = parts[0];
    const gender = parts[1];
    const idNum = parts[2];

    const smileStr = smile ? 'smile' : 'nosmile';
    const ext = size === 'big' ? 'jpeg' : 'png';

    return `${STIMULI_CONFIG.imagePath}${race}_${gender}_${smileStr}_${idNum}_${size}.${ext}`;
}

/**
 * Generate the practice image filename for a given stimulus configuration
 * @param {string} individualId - The individual's ID (e.g., 'black_male_01')
 * @param {string} size - 'big' or 'small'
 * @param {boolean} smile - true for smiling, false for not smiling
 * @returns {string} The complete practice image path
 */
function getPracticeImagePath(individualId, size, smile) {
    const parts = individualId.split('_');
    const race = parts[0];
    const gender = parts[1];
    const idNum = parts[2];

    const smileStr = smile ? 'smile' : 'nosmile';
    const ext = size === 'big' ? 'jpeg' : 'png';

    return `${STIMULI_CONFIG.practiceImagePath}${race}_${gender}_${smileStr}_${idNum}_${size}.${ext}`;
}

/**
 * Generate a practice grid of 8 images using practice images
 * @param {string} size - 'big' or 'small'
 * @returns {Object} Grid configuration with images and composition stats
 */
function generatePracticeGridForRound(size) {
    const gridImages = [];
    const composition = {
        asian: 0,
        black: 0,
        hispanic: 0,
        white: 0,
        smiling: 0,
        not_smiling: 0
    };

    // Use all 8 practice individuals
    const practiceIndividuals = [...STIMULI_CONFIG.practiceIndividuals];

    // Separate individuals by whether they have smile images
    const canSmile = practiceIndividuals.filter(ind => ind.hasSmile);
    const cannotSmile = practiceIndividuals.filter(ind => !ind.hasSmile);

    // Randomly select which of the canSmile individuals will smile
    // We have 5 who can smile, 3 who cannot - aim for ~4 smiling total
    const shuffledCanSmile = jsPsych.randomization.shuffle(canSmile);
    const numSmiling = Math.min(4, canSmile.length);

    const assignments = [];

    // Assign smiles to first numSmiling of the shuffled canSmile group
    shuffledCanSmile.forEach((individual, index) => {
        assignments.push({
            individual,
            smile: index < numSmiling
        });
    });

    // All cannotSmile individuals get nosmile
    cannotSmile.forEach(individual => {
        assignments.push({
            individual,
            smile: false
        });
    });

    // Build the grid
    for (const { individual, smile } of assignments) {
        const imagePath = getPracticeImagePath(individual.id, size, smile);

        gridImages.push({
            individual_id: individual.id,
            race: individual.race,
            gender: individual.gender,
            smile: smile,
            size: size,
            image_path: imagePath
        });

        // Update composition
        composition[individual.race]++;
        if (smile) {
            composition.smiling++;
        } else {
            composition.not_smiling++;
        }
    }

    // Shuffle the grid positions
    const shuffledGrid = jsPsych.randomization.shuffle(gridImages);

    return {
        images: shuffledGrid,
        composition: composition,
        size: size
    };
}

/**
 * Generate a random grid of 8 images for one round
 * Ensures at least 1 of each race and both smiling/non-smiling are present
 * @param {string} size - 'big' or 'small'
 * @returns {Object} Grid configuration with images and composition stats
 */
function generateGridForRound(size) {
    const gridImages = [];
    const composition = {
        asian: 0,
        black: 0,
        hispanic: 0,
        white: 0,
        smiling: 0,
        not_smiling: 0
    };

    // Shuffle individuals
    const shuffledIndividuals = jsPsych.randomization.shuffle([...STIMULI_CONFIG.individuals]);

    // Select 8 individuals for this round
    const selectedIndividuals = shuffledIndividuals.slice(0, 8);

    // For each individual, randomly assign smile or no-smile
    // But ensure we have at least 2 of each
    let smilingCount = 0;
    let notSmilingCount = 0;

    // First pass: assign randomly but track counts
    const assignments = selectedIndividuals.map(individual => {
        let smile;
        if (smilingCount >= 6) {
            smile = false;  // Force no-smile to ensure balance
        } else if (notSmilingCount >= 6) {
            smile = true;   // Force smile to ensure balance
        } else {
            smile = Math.random() < 0.5;
        }

        if (smile) smilingCount++;
        else notSmilingCount++;

        return { individual, smile };
    });

    // Ensure minimum of 2 smiling and 2 not-smiling
    if (smilingCount < 2) {
        // Convert some not-smiling to smiling
        for (let i = 0; i < assignments.length && smilingCount < 2; i++) {
            if (!assignments[i].smile) {
                assignments[i].smile = true;
                smilingCount++;
                notSmilingCount--;
            }
        }
    }
    if (notSmilingCount < 2) {
        // Convert some smiling to not-smiling
        for (let i = 0; i < assignments.length && notSmilingCount < 2; i++) {
            if (assignments[i].smile) {
                assignments[i].smile = false;
                notSmilingCount++;
                smilingCount--;
            }
        }
    }

    // Build the grid
    for (const { individual, smile } of assignments) {
        const imagePath = getImagePath(individual.id, size, smile);

        gridImages.push({
            individual_id: individual.id,
            race: individual.race,
            gender: individual.gender,
            smile: smile,
            size: size,
            image_path: imagePath
        });

        // Update composition
        composition[individual.race]++;
        if (smile) {
            composition.smiling++;
        } else {
            composition.not_smiling++;
        }
    }

    // Shuffle the grid positions
    const shuffledGrid = jsPsych.randomization.shuffle(gridImages);

    return {
        images: shuffledGrid,
        composition: composition,
        size: size
    };
}

/**
 * Generate all 12 rounds for the experiment
 * Balanced: 6 big, 6 small; 6 race questions, 6 smile questions
 * Each combination (size × question_type) appears 3 times
 * @returns {Array} Array of round configurations
 */
function generateAllRounds() {
    const rounds = [];

    // Create the 4 conditions, each repeated 3 times
    const conditions = [
        { size: 'big', questionType: 'race' },
        { size: 'big', questionType: 'smile' },
        { size: 'small', questionType: 'race' },
        { size: 'small', questionType: 'smile' }
    ];

    // Create 3 rounds of each condition
    for (const condition of conditions) {
        for (let rep = 0; rep < 3; rep++) {
            rounds.push({
                size: condition.size,
                questionType: condition.questionType,
                repetition: rep + 1
            });
        }
    }

    // Shuffle the round order
    return jsPsych.randomization.shuffle(rounds);
}

/**
 * Get all possible image paths for preloading
 * @returns {Array} Array of all image paths
 */
function getAllImagePaths() {
    const paths = [];
    const sizes = ['big', 'small'];

    // Practice images - only include smile versions for individuals that have them
    for (const individual of STIMULI_CONFIG.practiceIndividuals) {
        for (const size of sizes) {
            // Always include nosmile
            paths.push(getPracticeImagePath(individual.id, size, false));
            // Only include smile if available
            if (individual.hasSmile) {
                paths.push(getPracticeImagePath(individual.id, size, true));
            }
        }
    }

    // Main experiment images (all have both smile and nosmile)
    for (const individual of STIMULI_CONFIG.individuals) {
        for (const size of sizes) {
            paths.push(getImagePath(individual.id, size, false));
            paths.push(getImagePath(individual.id, size, true));
        }
    }

    return paths;
}
