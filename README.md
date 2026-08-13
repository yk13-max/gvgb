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

- **Squad** — a card grid of players with eight 0–100 stats each (PAC, SHO, PAS, DEF, PHY, DRI,
  STA for stamina, GKP for goalkeeping), a primary position and any number of "can also play"
  positions, plus any number of nicknames. Add, edit and delete anyone. Overall (OVR) is weighted
  by primary position: a striker's shooting and pace count for more than their defending, and
  goalkeeping carries a keeper's rating while staying a token weight outfield.
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
  it goes to the share sheet when available, otherwise it downloads. The **PNG ratings** switch
  in the header controls whether OVR numbers appear next to the names on the exported image; it
  is on by default.

### Match history

**Record result** on the Balancer logs the drafted teams: the date played (typically a Friday),
whether the match actually went ahead, the final score and the pitch. A called-off fixture can be
logged too — the teams are kept, without a score.

The history page lists every result newest first, colour-flagged by winner, with the two squads
and buttons to edit or delete an entry. **From** and **To** dates filter the list to a range, and
the summary above it — played, red wins, blue wins, draws, goals for and against — recomputes for
whatever the range shows.

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

- **Edit in place** — name, primary position, the "can also play" chips and all eight ratings are
  editable directly in their cells. OVR recomputes as you type, and the averages row at the
  bottom follows the rows currently shown. Editing a rating clears the current teams, since the
  split it produced is no longer the one those ratings give; re-balance to get it back.
- **Filter any column** — a filter row sits under the headers: substring search on name,
  dropdowns for primary position, "can also play" and squad status, and a `≥`/`≤` pair on each
  rating and on OVR. Filters combine, and **Clear filters** resets them.
- **Sort any column** — click a header to sort ascending, again for descending.
- The row's pencil opens the same full editor used elsewhere; the bin deletes.
- **Import JSON / Export JSON** — export writes a file holding the roster, the match history and
  the format. Import accepts that file, a bare `{"players": [...]}` object, or a plain array of
  players; missing stats are filled at 60, colliding or missing ids are re-issued, and nameless
  entries are dropped. Importing replaces the current roster, so it confirms first — export a
  copy before you do.

On a phone the table scrolls sideways with the player name column pinned to the left edge, and
the header, filter and averages rows stay pinned while you scroll.

The roster, format, selection, match history and the kick-off time and pitch are saved to
`localStorage` — there is no backend and no account. Clearing site data resets to the twelve
sample players, so use **Export JSON** for anything you want to keep.

## Layouts

- **Desktop (>1100px)** — three columns: squad, board, balance readout.
- **Tablet (761–1100px)** — squad and board side by side, balance readout full width below.
- **Phone (≤760px)** — one pane at a time with a bottom tab bar (Squad / Board / Balance / Table
  / Ladder / History), a sticky header whose action row scrolls horizontally, 44px touch targets,
  and pins enlarged to 44px. Balancing jumps you straight to the Board tab.

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
    backup.js       roster + history <-> JSON file
    storage.js      localStorage persistence, and back-filling stats added since a
                    roster was last saved
  components/   RosterPanel, PlayerCard, PlayerEditor, Pitch, Metrics, StatsTable,
                StatLadder, History, ImportDialog, ShareDialog, RecordResultDialog
  styles/       design tokens + the shell's responsive layout
  App.jsx       state, balancing, pin drag/swap, view switching
```

Design tokens (color, type, spacing, radius, shadow) come from the FUFA design system and are
untouched; `--team-red` and `--team-blue` are additions for this surface, since the system has
no team palette. Fonts (Barlow Condensed, Inter, JetBrains Mono) load from Google Fonts.
