# SI Tech Calculator

A tiny web app to calculate Space Engineers tech crafting requirements.

Open `index.html` in a browser. Choose a tech and quantity, then click Calculate.

The calculator shows:

- How many of each tech item must be crafted up for the requested tech.
- Raw resource totals.
- T3 assembler time and uranium usage, based on a T3 assembler with 4 normal speed modules drawing 22.4 MW.

Craft timing assumptions:

- Common Tech: 6 seconds each
- Rare Tech: 10 seconds each
- Exotic, Prosonic, and Tellurium Tech: 20 seconds each

Power assumption: 1 MW for 1 second uses 3.59 grams of uranium.

## Publish on GitHub Pages

This project is ready to deploy as a static GitHub Pages site.

1. Create a GitHub repository for this project.
2. Push your `main` branch to GitHub.
3. The workflow in `.github/workflows/pages.yml` will publish `index.html`, `styles.css`, and `script.js` automatically.

After the first push, GitHub Pages will host the calculator at a URL like:
`https://<username>.github.io/<repository>`
