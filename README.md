# FUFA · Team balancer

A web app for splitting a group of amateur footballers into two even 5-a-side or 6-a-side
teams and laying them out on a tactics board. Works on desktop and on a phone.

Built from the Claude Design handoff bundle (`Team Balancer.html` + the FUFA design system)
as a real Vite + React app.

## What it does

The app has two pages, switched from the header on desktop and the bottom tab bar on a phone:
the **Balancer** (squad, board, balance readout) and the **Player stats** table.

### Balancer

- **Squad** — a card grid of players with six 0–100 stats each (PAC, SHO, PAS, DEF, PHY, DRI),
  a primary position and any number of "can also play" positions. Add, edit and delete anyone.
  Overall (OVR) is weighted by primary position: a striker's shooting and pace count for more
  than their defending.
- **Balance** — pick exactly `2 × team size` players (everyone else is benched) and the balancer
  splits them by overall, per-stat averages and position mix. Each side always gets a keeper —
  the best two goalkeepers, falling back to anyone who can also play there, then to the best
  defenders. **Reshuffle** re-runs it for a different split of equal quality.
- **Board** — a vertical dark tactics pitch with red and blue pins placed freeform near their
  position band. Drag a pin to reposition it; tap a pin then tap an opponent to swap the two
  between teams. **Stat labels** toggles the per-pin stat lines.
- **Balance readout** — balance score out of 100 and the average-OVR delta, team total and
  average, stat-by-stat comparison bars, strongest/weakest callouts, and the position mix.
- **Paste list** — paste a WhatsApp signup thread or numbered list. Numbering, timestamps,
  links and notes like `(GK)` are stripped, names are fuzzy-matched to the saved roster
  (correct any match from the dropdown), header lines and chatter come in pre-skipped, and
  unknown names are created at 60 across the board with the editor walking you through them
  one by one.
- **WhatsApp text** — a phone-width preview of the teams as chat-ready text (asterisks for
  bold, one short line per player) with copy to clipboard, plus a native share sheet on devices
  that have one.
- **Export PNG** — the board drawn to a canvas so the image matches what's on screen. On phones
  it goes to the share sheet when available, otherwise it downloads.

### Player stats

The whole roster as one editable table — every player down the side, every rating across the
top.

- **Edit in place** — name, primary position, the "can also play" chips and all six ratings are
  editable directly in their cells. OVR recomputes as you type, and the averages row at the
  bottom follows the rows currently shown. Editing a rating clears the current teams, since the
  split it produced is no longer the one those ratings give; re-balance to get it back.
- **Filter any column** — a filter row sits under the headers: substring search on name,
  dropdowns for primary position, "can also play" and squad status, and a `≥`/`≤` pair on each
  rating and on OVR. Filters combine, and **Clear filters** resets them.
- **Sort any column** — click a header to sort ascending, again for descending.
- The row's pencil opens the same full editor used elsewhere; the bin deletes.

On a phone the table scrolls sideways with the player name column pinned to the left edge, and
the header, filter and averages rows stay pinned while you scroll.

The roster, format and selection are saved to `localStorage` — there is no backend and no
account. Clearing site data resets to the twelve sample players.

## Layouts

- **Desktop (>1100px)** — three columns: squad, board, balance readout.
- **Tablet (761–1100px)** — squad and board side by side, balance readout full width below.
- **Phone (≤760px)** — one pane at a time with a bottom tab bar (Squad / Board / Balance /
  Table), a
  sticky header whose action row scrolls horizontally, 44px touch targets, and pins enlarged to
  44px. Balancing jumps you straight to the Board tab.

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
    whatsapp.js     teams -> chat-ready text
    exportBoard.js  board -> PNG
    storage.js      localStorage persistence
  components/   RosterPanel, PlayerCard, PlayerEditor, Pitch, Metrics, StatsTable,
                ImportDialog, ShareDialog
  styles/       design tokens + the shell's responsive layout
  App.jsx       state, balancing, pin drag/swap, view switching
```

Design tokens (color, type, spacing, radius, shadow) come from the FUFA design system and are
untouched; `--team-red` and `--team-blue` are additions for this surface, since the system has
no team palette. Fonts (Barlow Condensed, Inter, JetBrains Mono) load from Google Fonts.
