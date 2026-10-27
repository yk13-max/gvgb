# Hosting it

The app is a static bundle plus one serverless function. The function keeps the group's
document in [Netlify Blobs](https://docs.netlify.com/blobs/overview/), which every Netlify
site has built in — there is no database to create and nothing else to sign up for.

## First deploy

1. **Connect the repo.** In Netlify, *Add new site → Import an existing project*, pick
   `yk13-max/gvgb`, and point it at the branch you want live. `netlify.toml` already sets
   the build command (`npm run build`), the publish directory (`dist`) and the API route,
   so take the defaults on the build step.
2. **Set the password.** *Site configuration → Environment variables → Add a variable*:

   | Key | Value |
   | --- | --- |
   | `TB_PASSWORD` | whatever you want the organisers to type |
   | `TB_FORMULA_PASSWORD` | a second code for the team formula page |

   Until `TB_PASSWORD` is set the site is readable but nothing can be saved, and the app says
   so rather than silently dropping changes. Until `TB_FORMULA_PASSWORD` is set the team
   formula page stays locked for everyone; everything else works as normal.
3. **Redeploy** so the function picks the variable up (*Deploys → Trigger deploy*). Netlify
   does not re-run functions with new environment variables until the next deploy.
4. **Seed it.** Open the site, click the status chip in the header, sign in with the
   password, and the roster in front of you is written to the shared store as revision 1.
   If you already have a backup file, use *Data → Import data* first and that is what gets
   seeded.

After that, every push to the connected branch rebuilds and redeploys. Deploys do not touch
the stored document — the data outlives the code.

## Who can do what

- **Anyone with the link** can read everything: roster, ratings, the board, match history.
  There is no login and nothing is private. Don't put anything in there you would mind the
  whole group seeing.
- **Anyone with the password** can edit. It is one shared password, not an account per
  person, so the change log can only say who did something because each device is asked for a
  name when it signs in. Treat the names as labels, not proof.
- The password is checked by the function on every write. It is held in the browser's
  `localStorage` on each device that signs in, so it is typed once per phone. *Sign out*
  in the shared-data dialog removes it from that device. Changing `TB_PASSWORD` in Netlify
  signs everyone out at their next save.
- **The team formula** needs the group password *and* `TB_FORMULA_PASSWORD`. The page asks
  for the code, the server checks it, and any save that changes the formula without it is
  turned away (the rest of that save still goes through). The code is kept on the device
  until sign-out and re-checked each time the page opens, so changing it in Netlify locks
  every device out of the formula until they enter the new one. Ten wrong codes in fifteen
  minutes and the check stops answering until the window passes. Restoring a backup from
  *Backups & history* only needs the group password, and can bring back an older formula.

## How saving works

The whole app is one JSON document: players and their ratings, the game weeks with their
nominations and ratings snapshots, the current squad, the format, the fixture details and
the drafted board. It is exactly what *Data → Export all data* writes to a file.

- Editing anything schedules a save about a second later, so a burst of typing is one write.
- Each save carries the revision it was based on. If the store has moved on since — someone
  else saved first — the function refuses the write and hands back what it is actually
  holding. The app then asks which copy to keep rather than merging two rosters by guesswork.
- Every tab re-checks the revision every 20 seconds, and whenever it comes back to the
  foreground. With nothing unsaved locally it just takes the newer version.
- Offline, changes queue in the browser and go up when the connection returns.
- Each save is also summarised into a change log (`log` in the same blob store), and once a
  week the first save keeps a backup of what it replaced (`backups` plus one `backup/<id>` key
  each; the newest twelve are kept). Restoring a backup goes through the function, backs up
  the current data first, and is logged. None of this needs setting up — it lives in the same
  Netlify Blobs store as the document.

## Running it locally

```bash
npm install
npm run serve     # netlify dev: the app and the function together on :8888
```

`netlify dev` gives you a local blob store, so the data is separate from the live site. Put
the password in a `.env` file at the repo root (it is gitignored):

```
TB_PASSWORD=letmein
TB_FORMULA_PASSWORD=1357
```

`npm run dev` runs Vite on its own with no function behind it. That is a supported way to
use the app, not a broken one: it falls back to this-browser-only storage and the status
chip reads **On this device**. Same for opening `dist/` from any plain static host.

## Moving the data

The store is the source of truth, but it is not the only copy:

- **Export all data** writes the live document to a file, any time, signed in or not.
- **Import data** replaces it — useful for seeding a new site, rolling back a bad week, or
  moving to different hosting.

To move hosts entirely: export, deploy somewhere new, import, done. The only thing tied to
Netlify is the function in `netlify/functions/data.js`, which is about eighty lines of
GET/PUT around a key-value store.

## If the API 404s

`netlify/functions/data.js` ends with `export const config = { path: '/api/data' }`, which
is what puts the function on that path. A function with a custom path is **not** also
served at `/.netlify/functions/data`, so do not add a `netlify.toml` redirect pointing
there — it will 404, and a `force = true` one will not even fall through to the app.

The client knows both spellings and uses whichever answers, so the app survives either
arrangement. If `/api/data` returns Netlify's "Page not found" rather than JSON or the
app's own HTML, a redirect like that is the first thing to look for.
