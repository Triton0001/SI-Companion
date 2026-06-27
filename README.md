# SI Tech Calculator

A tiny web app to calculate Space Engineers tech crafting requirements.

Open `index.html` in a browser. Choose a tech and quantity, then click Calculate.

The calculator shows:

- How many of each tech item must be crafted up for the requested tech.
- Raw resource totals.
- T3 assembler time and uranium usage, based on a T3 assembler with 4 normal speed modules drawing 22.4 MW.

The companion also includes an asteroid GPS database at `/asteroid-db/`. On Cloudflare Pages, asteroid data is stored in the shared D1 database through Pages Functions. On GitHub Pages or local files, the asteroid page falls back to browser-local storage unless it is opened with a shared API URL such as `?api=https://example.com/api`.

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

## Publish on Cloudflare Pages with shared asteroid data

Cloudflare Pages can host the companion and provide the shared asteroid API through Pages Functions and D1.

1. Create a D1 database named `si-companion-asteroids`.
2. Apply `migrations/0001_asteroid_records.sql` to that database.
3. In the Cloudflare Pages project, bind the D1 database to the variable name `DB`.
4. Add an environment variable named `EDITOR_KEYS` with one or more comma-separated editor keys.
5. Deploy the repo.

The asteroid app will call same-origin `/api/records` on Cloudflare Pages. Public users can view and import records. Edit, delete, and clear actions require an editor key entered in the app.
