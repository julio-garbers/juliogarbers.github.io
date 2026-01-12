# Julio Garbers - Personal Academic Website

Personal academic website built with HTML, CSS, and vanilla JavaScript.

## Structure

```
website/
├── index.html      # Home page
├── research.html   # Research publications & working papers
├── cv.html         # Curriculum Vitae page
├── styles.css      # All styling
└── README.md       # This file
```

NOTE: potentially add dashboard in the future.

## Local Development

```bash
# Using uv
uv run -m http.server 8000
```

Then visit `http://localhost:8000`

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

## Deployment 

After deploying, connect to `juliogarbers.com`:
1. Update domain's DNS settings
2. Add a CNAME record pointing to my hosting provider
3. Configure the custom domain in my hosting dashboard
