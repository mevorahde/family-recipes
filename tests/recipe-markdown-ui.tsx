// Read-only sample layout: no Firebase connection or recipe changes.
import { createRoot } from 'react-dom/client';
import ReactMarkdown from 'react-markdown';
import '../src/index.css';

const sample = `## Ingredients

- 2 cups cooked rice
- Chopped vegetables, prepared in small even pieces so they cook at roughly the same speed
- Sauce, to taste

## Instructions

1. Gather the ingredients.
2. Chop the vegetables.
3. Set out a mixing bowl.
4. Warm the pan.
5. Add the vegetables and stir gently, keeping the pieces moving around the pan until they are evenly cooked and ready for the next step.
6. Add the rice.
7. Stir together.
8. Add the sauce.
9. Mix well.
10. Divide among bowls, making sure each serving has some of the vegetables as well as rice, and bring everything to the table.

## Notes with substeps

1. Get ready.

   Keep your utensils nearby.

   - A spoon
   - A serving bowl

2. Serve together.
`;

createRoot(document.getElementById('root')!).render(
  <main className="page print-recipe"><h1>Recipe list spacing</h1><article className="recipe-content"><ReactMarkdown>{sample}</ReactMarkdown></article></main>,
);
