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

Signed-in users can also add recipes directly from the site (see below) — those are stored in Firestore instead of as files.

## Sign-in & adding recipes from the site

Anyone can view/search recipes. Only signed-in users can add, delete their own Firestore recipes, and import recipes via the "Add Recipe" page. This is powered by [Firebase](https://firebase.google.com) (Authentication, Firestore, and Cloud Functions), since GitHub Pages only serves static files.

### One-time Firebase setup

1. Create a free project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Authentication** → Users → manually add a user for yourself (admin) and any family members you want to allow to add recipes.
4. **Firestore Database** → create a database (production mode) → **Rules** tab → paste in the contents of [firestore.rules](firestore.rules).
5. Project settings → Your apps → add a **Web app** → copy the config values.
6. Copy [.env.example](.env.example) to `.env.local` and fill in the values from step 5.
7. For deployed builds, add the same values as **repository secrets** (Settings → Secrets and variables → Actions) with the same names as in `.env.example`, so the GitHub Actions workflow can inject them at build time.

`.env.local` is gitignored and never committed — only you (and GitHub Actions secrets) have the actual keys.

### Website imports

The Add Recipe page imports Word `.docx`, saved-email `.eml` and Outlook `.msg` files in the browser. Website imports use the authenticated `importRecipeUrl` Cloud Function so recipe sites that block browser CORS requests can still be imported when they expose standard Recipe JSON-LD data.

Cloud Functions require the Firebase project to use the **Blaze** plan. After authenticating the Firebase CLI, deploy the importer with:

```bash
npx firebase-tools@latest deploy --only functions:importRecipeUrl
```

The function accepts only public HTTPS addresses, validates DNS results and redirects, and requires a signed-in Firebase user.

## Development

```bash
npm install
npm run dev      # start local dev server
npm run build    # type-check and build for production
npm run preview  # preview the production build locally
npm --prefix functions run build  # type-check the Cloud Function
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

