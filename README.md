# Family Recipes

A shared collection of family recipes. Anyone can search and read the archive.

## Add a recipe

1. Select **Sign In**.
2. Select **Add Recipe**.
3. Enter the recipe details, or import a Word document, saved email, or recipe website.
4. Review the imported details and make any needed edits.
5. Select **Save Recipe**.

## Keep the cookbook up to date

1. Sign in with any family account.
2. Open the recipe.
3. Use **Edit recipe** to update it, or **Move up / Move down** to change its position in the full cookbook.
4. To remove it for everyone, select **Delete recipe** and confirm.

All signed-in users have the same controls, regardless of who added a recipe. The home page and search results preserve the shared cookbook order; there is no separate list reorder mode.

Built-in markdown recipes are copied to Firestore when edited or when their order needs to be saved. Deleting a built-in recipe stores a `deleted: true` marker so it does not reappear from the bundled markdown. The original markdown file is retained. Removing that marker manually restores the built-in recipe (or its saved override). Firestore-only recipes are deleted normally.

## Development and checks

Use Node.js 22.18+ (or 24+) for the native TypeScript regression tests.

```sh
npm run build
npm run lint
npm test
npm run dev -- --port 5179 --strictPort
```

For signed-in, signed-out, and failed-write UI checks without changing real recipes, open `http://localhost:5179/tests/recipe-ui.html#/recipe/apple-cake`. This fixture uses only in-memory sample data; it is not included in the production build.

If controls appear missing or outdated, restart the correct Vite server and hard-refresh the browser before diagnosing permissions. For GitHub Pages, confirm the latest deployment completed, then reload the published site. Building locally does not publish the site.

## Deploy Firestore rules

The rules allow public reading and writes by **any Firebase-authenticated user**, not an email allowlist. Manage who can obtain an account in Firebase Auth if access should stay within the family.

The default Firebase project is `family-recipes-c62c5`, and `firebase.json` points to `firestore.rules`. Deploying the GitHub Pages site does not deploy these rules.

```sh
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules --project family-recipes-c62c5
```

Verify the CLI reports a successful rules release. See the [Firebase rules deployment guide](https://firebase.google.com/docs/rules/manage-deploy).

If the CLI reports expired credentials, run `npx firebase-tools login --reauth`, then retry the rules-only deployment.
