# Image Files for Face Perception Experiment

## Required Images

This folder should contain all stimulus images for the experiment.

### Naming Convention

All images must follow this naming pattern:
```
{race}_{gender}_{smile}_{id}_{size}.{ext}
```

Where:
- **race**: `black`, `asian`, `white`, or `hispanic`
- **gender**: `male` or `female`
- **smile**: `smile` or `nosmile`
- **id**: `01` or `02` (two individuals per race-gender combination)
- **size**: `big` (256x256 pixels) or `small` (104x104 pixels)
- **ext**: `.jpeg` for big images, `.png` for small images

### Example Filenames

```
black_male_smile_01_big.jpeg
black_male_smile_01_small.png
black_male_nosmile_01_big.jpeg
black_male_nosmile_01_small.png
...
```

### Complete Image List (64 total)

#### Black Males (8 images)
- `black_male_smile_01_big.jpeg`
- `black_male_smile_01_small.png`
- `black_male_nosmile_01_big.jpeg`
- `black_male_nosmile_01_small.png`
- `black_male_smile_02_big.jpeg`
- `black_male_smile_02_small.png`
- `black_male_nosmile_02_big.jpeg`
- `black_male_nosmile_02_small.png`

#### Black Females (8 images)
- `black_female_smile_01_big.jpeg`
- `black_female_smile_01_small.png`
- `black_female_nosmile_01_big.jpeg`
- `black_female_nosmile_01_small.png`
- `black_female_smile_02_big.jpeg`
- `black_female_smile_02_small.png`
- `black_female_nosmile_02_big.jpeg`
- `black_female_nosmile_02_small.png`

#### Asian Males (8 images)
- `asian_male_smile_01_big.jpeg`
- `asian_male_smile_01_small.png`
- `asian_male_nosmile_01_big.jpeg`
- `asian_male_nosmile_01_small.png`
- `asian_male_smile_02_big.jpeg`
- `asian_male_smile_02_small.png`
- `asian_male_nosmile_02_big.jpeg`
- `asian_male_nosmile_02_small.png`

#### Asian Females (8 images)
- `asian_female_smile_01_big.jpeg`
- `asian_female_smile_01_small.png`
- `asian_female_nosmile_01_big.jpeg`
- `asian_female_nosmile_01_small.png`
- `asian_female_smile_02_big.jpeg`
- `asian_female_smile_02_small.png`
- `asian_female_nosmile_02_big.jpeg`
- `asian_female_nosmile_02_small.png`

#### White Males (8 images)
- `white_male_smile_01_big.jpeg`
- `white_male_smile_01_small.png`
- `white_male_nosmile_01_big.jpeg`
- `white_male_nosmile_01_small.png`
- `white_male_smile_02_big.jpeg`
- `white_male_smile_02_small.png`
- `white_male_nosmile_02_big.jpeg`
- `white_male_nosmile_02_small.png`

#### White Females (8 images)
- `white_female_smile_01_big.jpeg`
- `white_female_smile_01_small.png`
- `white_female_nosmile_01_big.jpeg`
- `white_female_nosmile_01_small.png`
- `white_female_smile_02_big.jpeg`
- `white_female_smile_02_small.png`
- `white_female_nosmile_02_big.jpeg`
- `white_female_nosmile_02_small.png`

#### Hispanic Males (8 images)
- `hispanic_male_smile_01_big.jpeg`
- `hispanic_male_smile_01_small.png`
- `hispanic_male_nosmile_01_big.jpeg`
- `hispanic_male_nosmile_01_small.png`
- `hispanic_male_smile_02_big.jpeg`
- `hispanic_male_smile_02_small.png`
- `hispanic_male_nosmile_02_big.jpeg`
- `hispanic_male_nosmile_02_small.png`

#### Hispanic Females (8 images)
- `hispanic_female_smile_01_big.jpeg`
- `hispanic_female_smile_01_small.png`
- `hispanic_female_nosmile_01_big.jpeg`
- `hispanic_female_nosmile_01_small.png`
- `hispanic_female_smile_02_big.jpeg`
- `hispanic_female_smile_02_small.png`
- `hispanic_female_nosmile_02_big.jpeg`
- `hispanic_female_nosmile_02_small.png`

### Practice Trial

The practice trial uses a generated placeholder image (gray face). The ground truth values (race, smile) are configured in `js/stimuli.js`.

## Image Specifications

- **Big size**: 256 x 256 pixels (JPEG format)
- **Small size**: 104 x 104 pixels (PNG format)
- **Standardization**: All images should be standardized for lighting, background, head position, and contrast

## Verification Script

To verify all images are present, you can run this in the browser console:

```javascript
const expected = getAllImagePaths();
expected.forEach(path => {
    fetch(path)
        .then(r => r.ok ? console.log('OK', path) : console.error('MISSING', path))
        .catch(() => console.error('MISSING', path));
});
```
