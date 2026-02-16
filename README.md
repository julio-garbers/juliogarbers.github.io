# Julio Garbers - Personal Academic Website

Personal academic website built with [Quarto](https://quarto.org/).

## Structure

```
website/
├── _quarto.yml                         # Site configuration
├── index.qmd                           # Home page
├── research.qmd                        # Research publications & working papers
├── data.qmd                            # Research datasets
├── policy.qmd                          # Policy reports
├── experiments.qmd                     # Experiments landing page
├── blog.qmd                            # Blog listing page
├── cv.qmd                              # Curriculum Vitae
├── styles/
│   └── custom.scss                     # Custom styling
├── assets/
│   ├── picture.png                     # Profile photo
│   ├── CV.pdf                          # CV document
│   └── wirtschaftsdienst.pdf           # Policy report
├── posts/                              # Blog posts
│   └── website_languages_lux/
│       ├── index.qmd                   # Post with Plotly visualizations
│       ├── stats.json                  # Data file
│       └── thumbnail.png               # Post thumbnail
├── experiments/                        # Password-protected experiments
│   ├── exp_1_attention_accuracy/       # Face perception study
│   └── exp_2_memory/                   # Face memory study
└── _site/                              # Generated output (gitignored)
```

## Local Development

```bash
# Install dependencies
uv sync

# Preview the site
QUARTO_PYTHON=.venv/bin/python quarto preview

# Build the site
QUARTO_PYTHON=.venv/bin/python quarto render
```

Then visit `http://localhost:4200`

## Publish

```bash
# Publish the website
QUARTO_PYTHON=.venv/bin/python quarto publish gh-pages
```

## Customization

### Colors
Edit the CSS variables in `styles/custom.scss`:
```scss
:root {
  --color-bg: #faf9f7;        /* Background */
  --color-accent: #1a5f7a;    /* Links & accents */
  /* ... */
}
```

### Fonts
The site uses Google Fonts (Playfair Display + Source Sans 3). To change fonts, update the `@import` in `styles/custom.scss` and the font variables.

## Adding a Blog Post

1. Create a new folder in `posts/` (e.g., `posts/my-new-post/`)
2. Add an `index.qmd` file with YAML frontmatter:
   ```yaml
   ---
   title: "Post Title"
   date: "2026-01-23"
   description: "Short description"
   image: "thumbnail.png"
   ---
   ```
3. Add a `thumbnail.png` for the blog listing
4. Run `quarto render` - the post will automatically appear in the blog listing

## Experiments

The `experiments/` folder contains password-protected jsPsych experiments. Password: `airbnb`

To change the password, edit the `CORRECT_PASSWORD` variable in each experiment's `index.html`.

## Dependencies

- [Quarto](https://quarto.org/) - Document publishing system
- Python packages (managed via uv):
  - `plotly` - Interactive charts
  - `polars` - Data manipulation
  - `jupyter` - Notebook execution
