# Family Recipes

A personal collection of family and personal recipes I don't want to lose — pulled together from notebooks, texts, and scattered notes into one searchable place.

Built with React + Vite + TypeScript. Hosted on GitHub Pages.

## Adding a recipe

1. Create a new Markdown file in [src/recipes/](src/recipes/), e.g. `src/recipes/moms-lasagna.md`.
2. Add frontmatter at the top, then the recipe body in Markdown:

   ```markdown
   ---
   title: Mom's Lasagna
   category: Dinner
   tags: [pasta, italian, comfort-food]
   servings: "6"
   prepTime: 20 min
   cookTime: 45 min
   source: Mom
   ---

   ## Ingredients

   - ...

   ## Instructions

   1. ...
   ```

3. Save the file — it will automatically show up on the site (no code changes needed).

## Development

```bash
npm install
npm run dev      # start local dev server
npm run build    # type-check and build for production
npm run preview  # preview the production build locally
```

## Deployment

Pushing to `main` automatically builds and deploys the site to GitHub Pages via the workflow in [.github/workflows/deploy.yml](.github/workflows/deploy.yml).

To enable it the first time:

1. Push this repo to GitHub.
2. In the repo settings, go to **Pages** and set the source to **GitHub Actions**.
3. Push to `main` (or run the workflow manually) to trigger the first deploy.

Alternatively, deploy manually with:

```bash
npm run deploy
```

(this uses `gh-pages` to publish the `dist` folder to a `gh-pages` branch — make sure Pages is configured to serve from that branch if you use this method instead).

