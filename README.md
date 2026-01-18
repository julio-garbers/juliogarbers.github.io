# Julio Garbers - Personal Academic Website

Personal academic website built with HTML, CSS, and vanilla JavaScript.

## Structure

```
website/
├── index.html                          # Home page
├── research.html                       # Research publications & working papers
├── policy.html                         # Policy reports
├── blog.html                           # Blog listing page
├── cv.html                             # Curriculum Vitae
├── styles.css                          # Global styling
├── posts/                              # Blog posts
│   └── website_languages_lux/          # "The Linguistic Web of Luxembourg"
│       └── index.html                  # Post content with Plotly visualizations
└── README.md                           # This file
```

## Local Development

```bash
# Using uv
uv run -m http.server 8000
```

Then visit `http://localhost:8000`

## Customization

### Colors
Edit the CSS variables at the top of `styles.css`:
```css
:root {
  --color-bg: #faf9f7;        /* Background */
  --color-accent: #1a5f7a;    /* Links & accents */
  /* ... */
}
```

### Fonts
The site uses Google Fonts (Playfair Display + Source Sans 3). To use different fonts, update the `<link>` tag in the HTML files and the CSS variables.

## Adding a Blog Post

1. Create a new folder in `posts/` (e.g., `posts/my-new-post/`)
2. Add an `index.html` file with the post content
3. Add a `thumbnail.png` for the blog listing
4. Add a new entry in `blog.html` linking to the post