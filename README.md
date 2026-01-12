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

## Deployment Options

### GitHub Pages (Free)
1. Create a repository on GitHub
2. Push these files to the repo
3. Go to Settings → Pages → Select "main" branch
4. Your site will be at `https://yourusername.github.io/reponame`

### Custom Domain
After deploying, you can connect `juliogarbers.com`:
1. Update your domain's DNS settings
2. Add a CNAME record pointing to your hosting provider
3. Configure the custom domain in your hosting dashboard

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). Mobile-responsive design included.
