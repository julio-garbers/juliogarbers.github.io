# Julio Garbers - Personal Academic Website

Personal academic website built with [Quarto](https://quarto.org/).

## Structure

```
website/
├── _quarto.yml                         # Site configuration
├── index.qmd                           # Home page
├── research.qmd                        # Research publications & working papers
├── policy.qmd                          # Policy reports
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

## Dependencies

- [Quarto](https://quarto.org/) - Document publishing system
- Python packages (managed via uv):
  - `plotly` - Interactive charts
  - `pandas` - Data manipulation
  - `jupyter` - Notebook execution
