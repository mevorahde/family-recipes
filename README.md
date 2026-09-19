# Family Recipes

A private-write, public-read family cookbook built with React, TypeScript,
Firebase Authentication, Cloud Firestore, and Firebase callable functions.
It preserves shared recipes, revision history, recovery workflows, and several
assisted import paths in a browser-friendly interface.

[Open the family cookbook](https://mevorahde.github.io/family-recipes/).

Anyone can browse the published recipes. Editing is restricted to explicitly
provisioned family members; the application does not provide public account
registration.

## Find a recipe

Browse the cookbook, search by recipe name or tag, or choose a category. You don’t need to sign in to read recipes.

## Add a recipe

1. Select **Sign In** and enter your email and password.
2. Select **Add Recipe**.
3. Enter the recipe details, or import a Word document, saved email, or recipe website.
4. Check the details and select **Save Recipe**.

Have a photo or screenshot? Under **Start with a photo**, choose a JPG, PNG, or WebP image and select **Read photo**. Your photo is sent to Google to read the text, but isn’t saved in the cookbook. Review the text carefully—especially handwriting, amounts, and temperatures—then select **Add text to recipe**. You can add more pages the same way before saving.

Photo imports also suggest missing recipe details. For text already in the recipe box, select **Fill empty details from text**. Check the suggested title, category, and tags before saving. Servings, times, and source stay blank unless stated in the text, and details you’ve already entered are kept.

Photo text cleanup removes recognizable letterhead above the recipe and corrects common spelling errors. **Compare with original text** shows what was there before cleanup. For text already in the recipe box, use **Clean up recipe text**. Always review the result: unusual handwriting and spelling may still need a manual correction, and quantities are never guessed.

## Keep the cookbook up to date

1. Sign in and open a recipe.
2. Select **Edit recipe**, make your changes, and select **Save changes**.
3. Use **Move up** or **Move down** to change its place in the cookbook.
4. To remove a recipe, select **Delete recipe** and confirm.

We can both update any recipe, no matter who added it. Changes are shared, so we’ll always see the same cookbook.

Deleted something by mistake? Open **Recently deleted** and select **Restore recipe**.

To remove it for good from the app, choose **Delete permanently** and confirm. This also removes its saved versions and cannot be undone in the app. Existing backups and original recipe files are not erased.

To recover earlier wording, open a recipe and choose **Previous versions**. You can preview an older version before restoring it.

For a paper copy, open a recipe and select **Print recipe**.

Wait for **Changes saved for everyone** before leaving an edit. If you lose your connection, keep the page open—your unsaved draft stays in the form.

When you’re finished, select **Sign Out**.

## Architecture and data handling

- Vite builds the React and TypeScript single-page application for GitHub
  Pages.
- Firebase Authentication identifies approved editors.
- Firestore security rules allow public recipe reads and restrict writes,
  history, trash, and recovery data to enabled family members.
- Callable Firebase functions perform bounded website imports, image OCR, and
  permanent deletion.
- Built-in Markdown recipes are combined with shared Firestore recipes in the
  browser.

Website imports send the requested public URL to a callable function. Photo
imports send the selected image to Google Cloud Vision for text recognition;
the image is not saved as a cookbook asset by this application. Imported and
recognized text must be reviewed before saving, especially quantities,
temperatures, handwriting, and source attribution.

## Local development

Use Node.js 22, which matches the Firebase Functions runtime declared by the
repository. The Firestore emulator tests also require a supported Java runtime
available on `PATH`. Install the locked dependencies for both workspaces:

```bash
npm ci
npm --prefix functions ci
```

Copy `.env.example` to `.env.local` and populate the six documented
`VITE_FIREBASE_*` identifiers for a Firebase project you control. Do not commit
local environment files, service-account credentials, or exported recipe data.
Firebase web configuration identifies a project; authorization is enforced by
Authentication and Firestore rules rather than by treating those identifiers
as secrets.

Start the Vite development server:

```bash
npm run dev
```

## Verification

Run the application checks from the repository root:

```bash
npm run build
npm run lint
npm test
npm run test:firestore
```

The Firestore test command builds the functions package and runs the rules
tests against the Firebase emulator with the isolated
`demo-family-recipes` project identifier. It does not require the production
Firebase project, but Firebase CLI cannot start the emulator without Java.

## Deployment boundaries

`npm run deploy` builds the front end and publishes `dist` to GitHub Pages.
Firebase rules and functions are separate infrastructure and are not deployed
by that command. Review the target Firebase project before using Firebase CLI
deployment commands.

## License

The application source code and original software documentation authored by
David E. Mevorah are available under the [MIT License](LICENSE). Recipes,
photographs, imported source material, personal or family content, trademarks,
and other third-party material are not covered by that license and remain
subject to their respective rights holders' terms.
