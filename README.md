# tea house

A quiet digital tea house — pour a cup, browse a menu of offline activities, or manage
your own collection. Built as a calm alternative to doomscrolling.

No build step, no dependencies. Plain HTML, CSS, and JavaScript (ES modules), ready to
host on GitHub Pages.

## Project structure

```
index.html
css/
  styles.css
js/
  app.js          -- router, wires pages together
  data.js         -- shared activity data model + localStorage layer
  filtering.js    -- filtering & random-selection logic
  nav.js          -- navigation active-state helper
  pour.js         -- Pour page (teapot/teacup animation)
  browse.js       -- Browse page (filters + list)
  collection.js   -- Collection page (CRUD)
```

All three pages read and write through `js/data.js`, so there is one shared activity
list across the whole app. Data currently persists in the browser's `localStorage`
(key `tea-house:activities:v1`). The data layer is written as a small class with a
plain API (`getAll`, `add`, `update`, `remove`, `markCompleted`, `subscribe`) so it can
later be swapped for a real backend (e.g. Supabase) without touching the page code.

## Try it locally first (optional but recommended)

You don't need Node or any tooling — any static file server works, since the app uses
real ES module imports (`file://` won't work for those, it needs `http://`).

If you have Python installed:

```bash
cd tea-house
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Publishing to GitHub Pages — exact steps

### 1. Create the repository

1. Go to [github.com/new](https://github.com/new).
2. Name it whatever you like, e.g. `tea-house`.
3. Leave it **public** (GitHub Pages on a free account requires a public repo, unless
   you have GitHub Pro/Team/Enterprise).
4. Don't initialize with a README, `.gitignore`, or license — you already have these
   files locally.
5. Click **Create repository**.

### 2. Get the project files onto your computer

Download the files I generated in this chat (the `tea-house` folder with `index.html`,
`css/`, and `js/` inside it) to a folder on your computer.

### 3. Push the project to GitHub

Open a terminal, `cd` into the `tea-house` folder you downloaded, then run:

```bash
git init
git add .
git commit -m "Initial commit: tea house"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

Replace `YOUR-USERNAME/YOUR-REPO-NAME` with your actual GitHub username and the repo
name you picked in step 1. GitHub will show you this exact command on the empty repo's
page too ("...or push an existing repository from the command line").

If you'd rather skip the command line entirely: on your new repo's GitHub page, click
**Add file → Upload files**, then drag the whole `tea-house` folder's contents in
(keeping the `css` and `js` folders intact) and click **Commit changes**.

### 4. Turn on GitHub Pages

1. In your repository on GitHub, click **Settings**.
2. In the left sidebar, click **Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Under **Branch**, choose `main` and folder `/ (root)`, then click **Save**.
5. Wait a minute or two, then refresh the page — GitHub will show a banner with your
   live URL, something like:

   ```
   https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
   ```

That URL is your live tea house. Any time you push new commits to `main`, GitHub Pages
redeploys automatically within a minute or so.

### 5. Making future edits

```bash
git add .
git commit -m "describe what you changed"
git push
```

## Notes on what's implemented

- **Pour** — click/tap the word "pour" written into the teapot's body. The teapot
  lifts, tilts, and pours; the cup fills; an activity is chosen while it fills; the cup
  rotates from a side view to a top-down view to reveal the result. "pour again" and
  "do this" are plain text actions, not buttons. `prefers-reduced-motion` is respected:
  the large movement is skipped and the result appears with a quick, quiet fade.
- **Browse** — tea-menu-style filters (time, energy, mood, category) update results
  immediately with no separate "apply" step. Rows expand inline on click, no modals.
- **Collection** — add, edit (inline, expanded within the row), delete, favorite, and
  enable/disable. The add form and the edit form share one template.
- Colors, type (Petit Formal Script for titles, Manrope for headers/body), and the
  no-cards, whitespace-driven layout follow the brief's design direction.

## Ideas for a later pass

- Swap `js/data.js`'s internals for Supabase once you want the collection to sync
  across devices — the rest of the app doesn't need to change.
- Add a lightweight animated transition between routes.
- Add equipment/location as additional Browse filters if your collection grows enough
  to need them.
