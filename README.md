# FUFA · Team balancer

A web app for splitting a group of amateur footballers into two even 5-a-side or 6-a-side
teams and laying them out on a tactics board. Works on desktop and on a phone.

Built from the Claude Design handoff bundle (`Team Balancer.html` + the FUFA design system)
as a real Vite + React app.

## What it does

The app has four pages, switched from the header on desktop and the bottom tab bar on a phone:
the **Balancer** (squad, board, balance readout), the **Player stats** table, the **Stat ladder**
and the **Match history**.

### Balancer

- **Squad** — a card grid of players with ten 0–100 stats each (PAC, SHO, PAS, DEF, PHY, DRI,
  STA for stamina, GKP for goalkeeping, VIS for vision, POS for positioning), a primary position
  and any number of "can also play" positions, plus any number of nicknames. Add, edit and delete
  anyone. Overall (OVR) is weighted by primary position: a striker's shooting, pace and
  positioning count for more than their defending, vision is weighted towards the players who
  create, and goalkeeping carries a keeper's rating while staying a token weight outfield.

  The **card / mini** toggle beside *Add player* switches the grid between full cards and a mini
  view of name and overall only — denser for picking a squad from a long roster or scanning
  ratings at a glance. Tapping still selects and benches; the choice is remembered.
- **Balance** — pick exactly `2 × team size` players (everyone else is benched) and the balancer
  splits them by overall, per-stat averages and position mix. Each side always gets a keeper —
  the best two goalkeepers, falling back to anyone who can also play there, then to the best
  goalkeeping rating in the pool. **Reshuffle** re-runs it for a different split of equal
  quality.
- **Board** — a vertical dark tactics pitch with red and blue pins placed freeform near their
  position band. Drag a pin to reposition it; tap a pin then tap an opponent to swap the two
  between teams. **Stat labels** toggles the per-pin stat lines. Pins are labelled first name
  plus second initial ("Sam O"), so two players sharing a first name still read apart.
- **Balance readout** — balance score out of 100 and the average-OVR delta, team total and
  average, stat-by-stat comparison bars, strongest/weakest callouts, and the position mix.
- **Paste list** — paste a WhatsApp signup thread or numbered list. Numbering, timestamps,
  links and notes like `(GK)` are stripped, names are fuzzy-matched against each player's name
  **and their nicknames** (correct any match from the dropdown), header lines and chatter come
  in pre-skipped, and unknown names are created at 60 across the board with the editor walking
  you through them one by one. Nicknames are what make this reliable: add whatever the group
  actually types — "Sank", "Bobby" — and the matcher finds the right player.
- **WhatsApp text** — chat-ready text with a live preview, copy to clipboard and a native share
  sheet where there is one:

  ```
  📅 Fri 07/08/26 | 🕢 7.30pm | ⚽ Tolworth Pitch 8

  🔴 Team Red/White ⚪
  Siv, Sank, Bobby, Ali, Ahren, Matt

  🔵 Team Blue/Black ⚫
  Sam O, Senthan R, Feranmi A, Niro K, Umesh R, Karthi S
  ```

  Names are first name plus second initial, matching the board.

  Date, kick-off and pitch are entered in the dialog. The clock emoji follows the kick-off time
  to the nearest half hour, and any detail left blank drops out of the first line. **Include
  ratings** is off by default — turn it on to append each player's OVR and a team average and
  balance line.
- **Export PNG** — the board drawn to a canvas so the image matches what's on screen. On phones
  it goes to the share sheet when available, otherwise it downloads. Two switches in the header
  shape the image, and they combine freely:
  - **PNG ratings** (on by default) — whether OVR numbers sit next to the names on each pin.
  - **PNG summary** (off by default) — adds a strip under the pitch carrying the balance
    readout: each side's average OVR and total, the balance score, and the per-stat averages
    with the leading side highlighted. It extends the image by 190px rather than covering any
    of the pitch.

### Match history

History is organised by **game week** — one session, typically a Friday, holding however many
matches you played that night.

- **Record result** on the Balancer logs the drafted teams against a date. If a week already
  exists for that date the match joins it ("match 2 of this session"); otherwise the week is
  created. The date on a match is what decides its week, so editing a match's date moves it
  between weeks, and a week with no matches left disappears.
- **Nominations** — after the first match of a week is recorded, the app asks for **best
  attacker**, **best midfielder**, **best defender** and the **overall POTM**. Only players who
  turned out that week can be nominated, and nobody is filtered out by position — the lists are
  just ordered so the obvious candidates come first. Skip and come back to it from the week's
  Nominations button; editing a score later won't re-open the prompt.
- **Ratings that week** — creating a week snapshots every participating player's ten ratings and
  their OVR. Expand a week to see them, with anyone re-rated since shown as `81 › 70 −11` plus
  exactly what moved (`PAC 92→50 · SHO 86→70`, and a position change if there was one). Players
  nobody has touched read as a plain list of what they were rated on the day.
- **From** and **To** dates filter to a range of weeks, and the summary above — weeks, matches
  played, wins each side, draws, goals — recomputes for whatever the range shows.

A history saved before weeks existed migrates automatically: flat matches sharing a date are
grouped into one week.

### Stat ladder

One stat at a time, everyone on the same 0–100 scale. Click a stat to switch to it, then drag a
player up or down to rate them against the others — the point being that "better than Ali,
worse than Sam" is easier to judge than a number in isolation. Arrow keys nudge the focused
player by 1, Page keys by 10, and the dashed line marks the squad average. Benched players are
dashed and dimmed. Chips fan into columns when a band gets crowded so nothing overlaps; on a
phone the scale is taller than the screen and scrolls vertically.

### Player stats

The whole roster as one editable table — every player down the side, every rating across the
top.

- **Edit in place** — name, primary position, the "can also play" chips and all ten ratings are
  editable directly in their cells. OVR recomputes as you type, and the averages row at the
  bottom follows the rows currently shown. Editing a rating clears the current teams, since the
  split it produced is no longer the one those ratings give; re-balance to get it back.
- **Filter any column** — a filter row sits under the headers: substring search on name,
  dropdowns for primary position, "can also play" and squad status, and a `≥`/`≤` pair on each
  rating and on OVR. Filters combine, and **Clear filters** resets them.
- **Sort any column** — click a header to sort ascending, again for descending.
- The row's pencil opens the same full editor used elsewhere; the bin deletes.
- **Import JSON / Export JSON** — the same backup the header's **Data** button gives you, from
  the page where you are most likely to want it.

On a phone the table scrolls sideways with the player name column pinned to the left edge, and
the header, filter and averages rows stay pinned while you scroll.

### Data

The roster, format, selection, squad view, game weeks and the kick-off time and pitch are saved to
`localStorage` — there is no backend and no account. Clearing site data, switching browser or
picking up a new phone loses the lot, so the header carries a **Data** button on every page (in
the actions sheet on a phone) with the two halves of a backup:

- **Export all data** — writes `fufa-backup-YYYY-MM-DD.json`, holding everything above: every
  player with their nicknames and ten ratings, every game week with its matches, nominations and
  ratings snapshots, and the format, squad selection, squad view and kick-off details. It is
  plain readable JSON, so it can be diffed, edited or kept in a repo.
- **Import data** — reads that file back and restores the app to exactly the state it was
  exported in. It also accepts a hand-written `{"players": [...]}` object or a plain array of
  players, for seeding a roster from somewhere else: missing stats are filled at 60, colliding or
  missing ids are re-issued, and nameless entries are dropped. Player ids survive a full backup
  intact, which is what keeps the squad selection and every recorded week pointing at the right
  people. Importing replaces what's there, so it says what the file holds and confirms first.

## Layouts

- **Desktop (>1100px)** — three columns: squad, board, balance readout.
- **Tablet (761–1100px)** — squad and board side by side, balance readout full width below.
- **Phone (≤760px)** — one pane at a time with a bottom tab bar (Squad / Board / Balance / Table
  / Ladder / History), 44px touch targets, and pins enlarged to 44px. Balancing jumps you
  straight to the Board tab.

  The header stays one row that never scrolls: the wordmark, a **…** button, and the one action
  worth a tap of its own — *Balance teams*, which becomes *Re-balance* once there are teams.
  Everything the desktop header spreads across its width moves into the **…** sheet, grouped and
  stacked full width: the format toggle, Paste list and Reshuffle, WhatsApp text / Export PNG /
  Record result, the three board-and-image switches, and Export / Import data. Anything that
  needs teams is greyed out until there are teams, and every action is two taps from anywhere.

## Running it

```bash
npm install
npm run dev      # dev server, also reachable from a phone on the same network
npm run build    # production build into dist/
npm run preview  # serve the production build
```

`dist/` is a static bundle — it can be served from anywhere, including a subpath.

## Layout of the code

```
src/
  ds/           FUFA design system primitives (Button, Icon, Input, Select, Switch, Dialog…)
  lib/
    model.js        stats model, position-weighted OVR, balancing algorithm, pitch placement
    parseList.js    WhatsApp signup-list parser and fuzzy roster matching
    whatsapp.js     teams + match details -> chat-ready text
    exportBoard.js  board -> PNG
    backup.js       the whole app state <-> one JSON file
    weeks.js        game weeks: grouping matches by date, award slots, ratings
                    snapshots and their diffs, and migrating pre-week history
    storage.js      localStorage persistence, and back-filling stats added since a
                    roster was last saved
  components/   RosterPanel, PlayerCard, PlayerEditor, Pitch, Metrics, StatsTable,
                StatLadder, History, ImportDialog, ShareDialog, RecordResultDialog,
                WeekAwardsDialog
  styles/       design tokens + the shell's responsive layout
  App.jsx       state, balancing, pin drag/swap, view switching, the phone actions sheet
```

Design tokens (color, type, spacing, radius, shadow) come from the FUFA design system and are
untouched; `--team-red` and `--team-blue` are additions for this surface, since the system has
no team palette. Fonts (Barlow Condensed, Inter, JetBrains Mono) load from Google Fonts.
