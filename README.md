# FUFA · Team balancer

A web app for splitting a group of amateur footballers into two even 5-a-side or 6-a-side
teams and laying them out on a tactics board. Works on desktop and on a phone.

Built from the Claude Design handoff bundle (`Team Balancer.html` + the FUFA design system)
as a real Vite + React app.

One JSON document holds everything, and the copy on the server is the one that counts:
anyone with the link sees the same roster, the same ratings and the same drafted teams, and
anyone with the shared password can change them. See [DEPLOY.md](DEPLOY.md) for hosting it
on Netlify. Run without that backend — `npm run dev`, or `dist/` on any static host — and it
falls back to this-browser-only storage with no loss of function.

## What it does

The app has five pages, switched from the header on desktop and the bottom tab bar on a phone:
**Results**, the **Table** (the league table), the **Balancer** (squad, board, balance readout),
the **Player stats** table and the **Stat ladder**. A viewer opens on the Table; a device that
holds the password opens on Results, the organiser's working page. Wherever players are listed rather than ranked —
the squad, the stats table before you sort it, the line-ups — they read A–Z.

### Balancer

- **Squad** — a card grid of players with ten 0–100 stats each (PAC, SHO, PAS, DEF, PHY, DRI,
  STA for stamina, GKP for goalkeeping, VIS for vision, POS for positioning), a primary position
  and any number of "can also play" positions, plus any number of nicknames and, for fun, the
  club or country they **support** — any side in this season's Premier League, La Liga, Serie A, Bundesliga,
  Ligue 1 or Championship, or one of 89 national teams grouped by continent, picked in the player editor. The club's badge shows beside the
  name on the squad, the player stats table, the league table and the honours cards, and on each
  player's pin on the board and in the exported team sheet. Badges are
  fetched from the club's Wikipedia article the first time a browser needs them (one request for
  every club on screen, cached for a month) and fall back to a shield drawn in the club's colours
  until they arrive, or if Wikipedia can't be reached. Add, edit and delete
  anyone; **Deselect all** benches everyone at once for a clean start to a night's pick. Overall (OVR) is weighted by primary position: a striker's shooting, pace and
  positioning count for more than their defending, vision is weighted towards the players who
  create, and goalkeeping carries a keeper's rating while staying a token weight outfield.

  The squad reads A–Z by default; the **A–Z / 1–0** toggle switches it to overall, high to low —
  remembered per device, and only there when you can see the scores. The **card / mini** toggle
  beside it switches the grid between full cards and a mini view of name and overall only — denser for picking a squad from a long roster or scanning
  ratings at a glance. On a phone the mini view runs four to a row, names shortened to first
  name plus initial with the overall under them, each tile still a full 44px tap. Tapping
  still selects and benches; the choice is remembered.
- **Balance** — pick exactly `2 × team size` players (everyone else is benched) and the balancer
  splits them by overall, per-stat averages and position mix. Each side always gets a keeper —
  the best two goalkeepers, falling back to anyone who can also play there, then to the best
  goalkeeping rating in the pool. **Reshuffle** re-runs it for a different split of equal
  quality.
- **Swap colours** — appears in the header only once there are teams, since there is nothing to
  swap before that. The two sides keep exactly the players the balancer gave them and simply
  trade bibs: red becomes blue and blue becomes red, and the pins swap ends with them so each
  side still defends the goal it is drawn next to. The readout, the squad cards, the WhatsApp
  text and the PNG all follow. Swapping twice puts everything back.
- **Board** — a vertical dark tactics pitch with red and blue pins placed freeform near their
  position band. Drag a pin to reposition it; tap a pin then tap an opponent to swap the two
  between teams. **Stat labels** toggles the per-pin stat lines. Pins are labelled first name
  plus second initial ("Sam O"), so two players sharing a first name still read apart. The board
  is part of the shared document: it survives a reload, and everyone with the link is looking at
  the same one. It stays until something makes it stale — a rating or position change, a change
  to the squad or format — or until a result is recorded against it, which closes that night. A
  renamed player or a new nickname leaves it alone.
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

- **Results in balancing** (signed in, top of the balance panel) — *Off*, *Light* or *Strong*.
  Off splits the sides on ratings alone. Light and Strong let each player count as up to 4 or 8
  points stronger or weaker by their results: their win–loss record, damped by six phantom even
  games so a lucky start doesn't count for much, blended with their last five. Ratings are never
  changed by this; it only affects how the sides are split, and the panel shows the balance as
  results see it ("With results: balance 82/100 · Red 71.4 v Blue 71.1"). The choice is kept
  per device. The balancer itself now tries a few dozen starting splits and keeps the best,
  picking at random among near-equal best splits so **Reshuffle** still gives a different one.
- **Rating suggestions** (signed in, top of Player stats) — for every match, the two sides'
  average ratings at the time give the chance each side was expected to win. A player whose
  sides keep beating that, or falling short of it, over at least 8 matches and by more than luck
  would explain, gets a suggested change: "Their sides won 83% of 12 matches; the ratings
  expected about 21%. Probably under-rated — try +8." **Apply** moves every stat by that amount,
  which moves OVR by exactly that much and keeps the player's shape; **Dismiss** hides it. Either
  way the suggestion stays hidden on that device until the player has played more matches.
- **Team formula** (in the shared-data dialog, signed in only, behind its own code —
  `TB_FORMULA_PASSWORD`, see [DEPLOY.md](DEPLOY.md)) — every number behind the above,
  laid out like the "How teams are made" sheet and editable: how each stat feeds each
  position's OVR (sliders that keep each position at 100%), how the balancer shares its
  attention between level, stat mix and positions (one bar, two handles), the results nudge,
  the search, and the rating suggestion thresholds. Four switches cover the known quirks:
  leave keepers out of the stat mix, let the results nudge move the stats too, credit results
  by how far they beat the odds rather than raw wins, and count FLEX (half a midfielder) and
  second positions (a third, shared). While editing, a preview shows this week's squad split
  under the saved formula and the edit, how often each would have picked the winner of every
  recorded match (results only counted from matches before each one), and — on request — the
  average and worst balance over every squad actually played plus 200 random ones. Saving
  lists whose OVR would move, asks for a reason for the change history, and takes a backup
  first; **Undo last save** swaps back, and **Start from the original** resets the edit to the
  formula as first shipped. The formula is part of the shared data, so every device balances
  the same way.
- **One formula per format.** 5-a-side and 6-a-side each have their own complete formula, picked
  with a switch at the top of the formula page (it opens on whichever format is on the board).
  The 5-a-side one leans on pace and stamina: five points more of each in every outfield
  position's OVR, taken from the other stats in proportion, and gaps in either counting double
  in the stat mix. A **Which stats matter most in the mix** set of sliders sets that emphasis for
  any stat; only the proportions matter, so leaning on one stat takes weight from the others
  rather than making the mix count for more. The ratings shown everywhere — cards, the stats
  table, the ladder, the team sheet — follow the format on the board, and past matches are judged
  by the formula for the format they were played in. Until the 5-a-side formula is first saved it
  is the 6-a-side one with that lean on top, so earlier changes carry over; after that the two are
  saved, undone and logged separately ("Changed the 5-a-side formula: …"), both behind the formula
  code.

### Match history

History is organised by **game week** — one session, typically a Friday, holding however many
matches you played that night.

- **Record result** on the Balancer logs the drafted teams against a date. A session is
  usually several games with the same two sides, so the dialog takes a **list** of scores:
  **Add another match** gives you another RED–BLUE row, the title and button count up
  ("Save 3 matches"), and the note says which matches of the session they will be. If a week
  already exists for that date they join it — record two now and three later and the session
  reads 1–5. **Match was played** off records the night as called off instead, teams kept and
  no score. Editing is always one match: the one you opened.
- The date on a match is what decides its week, so editing a match's date moves it between
  weeks, and a week with no matches left disappears.
- **Talking points on the shared images.** Export PNG on the Balancer adds a **Pre-match**
  strip under the pitch, and Share on a Results week adds **Talking points** to the card: up to
  eight facts on the team sheet and four on the results card, the strongest from each kind first.
  The team sheet never gets taller than 2:3 (a tall phone photo), so WhatsApp shows it with
  little or no cropping: with talking points on, the pitch is drawn a little shorter and rows
  of talking points are added under it, strongest first, only while they still fit — usually
  six, fewer with the ratings summary strip turned on. The team sheet also carries a **favourite**
  meter in a column to the right of the (narrower) pitch: the favourite named in words —
  *slight favourites*, *favourites*, *clear favourites*, or *too close to call* — over a
  bar that runs the height of the pitch, Blue's end at the top and Red's at the bottom, split by
  each side's chance of winning. The chance
  comes from the sides' average strength, measured the way the balancer made them (ratings, plus
  results when those are counted), on the team formula's odds scale. Before kick-off: **head to head** (these exact
  sides, or sides with most of these players, and who leads), **in form** (the player on each side with the most wins in their last five this season — three or more to count, and left out when nobody qualifies), **partnerships** (each side's best duo on
  record, team-mates for the first time, and three or more on the same side who have won their
  last few together) and **milestones** (a first recorded match, a 10th/25th/50th… match,
  someone back after a few nights out, top v bottom of the table), **rivalry** (the most
  one-sided record between two players facing each other, four meetings or more),
  **honours** (player-of-the-match awards each side brings), **due a win** (the longest losing
  run on the pitch, three or more), **club colours** (a derby across the halfway line, fans of
  the same club split up, or three fans of one club on a side), **experience** (matches on
  record per side, when one side has clearly more) and the **table** (three or four of the top
  four on one side). After the night: **streaks**
  extended, ended or broken — for one player, or for three or more who shared the run — **records** (biggest win, highest-scoring game, most goals in a
  night), **table** movement (a new leader, the biggest climb or drop) and the **upset meter**.
  The images go to everyone, so no rating number ever appears: the upset meter compares the
  sides' ratings behind the scenes and says only that the lower-rated side won, with one to
  three pips for how big a surprise it was, and the favourite meter shows a bar and words but
  never a percentage. A **talking points** switch turns them off.
- **Ask the results.** A question box at the top of Results answers in plain words, worked
  out from everything recorded as you type. It picks out **who** is named (players by first
  name, surname, "Jo R" or nickname; clubs — "Arsenal fans"; positions — "which defender"),
  **which slice** of the data is meant, and **what** is being asked for; the words in between
  don't matter. If a first name fits two players you're asked which. **Viewers can ask about
  anything they can see** — results, nights, awards, partners, clubs — and a question about
  ratings or stats answers "only shown when signed in", with no numbers behind it; a thread a
  viewer started fills in the ratings the moment they sign in. **Password holders get the
  lot**: a player's OVR, all ten stats, how they've moved since the earliest snapshot in the
  slice, two or more players' stats side by side ("Sam and Jo ratings"), rankings by any stat
  ("who has the highest pace?", "best goalkeeping among goalkeepers"), **who improved most** or
  **dropped most** since the first snapshot, and how each line-up on a night was rated.
  - *Who.* One name: nights, matches, record, nominations, who they line up with and against
    most, last played. Two or more ("Jo with Sam", "how many games have Jo, Sam and Priya played
    together?"): nights all turned out, same-side matches and the record in them, opposite-side
    matches, and for a pair the head-to-head. **vs**, **v** or **against** between names or groups
    ("Sam vs Jo", "Sam and Tom against Jo and Priya"): meetings and who won. **he / she / they**
    mean whoever was last asked about.
  - *Which slice.* A season by name, **this season**, **last season**, **all time**; **since
    September**, **in September**, **in 2026**, **before 4/9**; a night by date (**4/9**, **on 4th
    September**) or **last night**, **last 3 nights**; a venue (**at Goals**); **6-a-side**; the
    nights a player won an award (**scores where Karthi was best defender**, **how many times has
    Sam been POTM**); the matches someone **won** or **lost** ("how many games has Sam lost with
    Jo?"). Without any of these, answers follow the season picker, and the scope line under every
    headline says exactly what was counted.
  - *What.* The count by default. **streak / form**: current run, longest winning and losing
    runs, last five as W/L pips. **nights**: attendance — nights of the total, missed, current
    and longest run of consecutive nights, last turned out, nights since a date. **goals**: for
    and against, per match, clean sheets, biggest win, heaviest defeat. **awards**: every
    nomination with its nights. **ratings** (signed in): OVR, best and weakest stats, and how
    they've moved since the first snapshot in the slice. **partners / opponents** ("who does Sam
    win most with?", "who beats Sam most?", "Sam's best partner"): a table of everyone they've
    lined up with or against and the record with each. **scores** opens the match list.
  - *Everyone.* With no names the question is about the whole roster: **who has the most
    POTMs?**, **who has won the most?**, **which defender has the best record?**, **top 3 by
    wins**, **most clean sheets**, **who has played the fewest nights?**, **who hasn't played
    since September?**, **hottest streak**, **biggest win**, **who has the highest pace?**
    (signed in). **last night** or a date gives that night: scores, line-ups, nominations and,
    signed in, how the sides were rated. **who supports Arsenal?** and **goalkeepers** list
    people; **how many players** counts them; **how many nights have we played?** and a bare
    season or period give an overview; **who won Spring 26?** and **honours** give a season's
    honours, or its front runners while it's running.
- **Follow-ups.** Press Enter to keep an answer, and the next question builds on it: after
  "Sam with Jo since September", **and against?** is Sam vs Jo over the same period, **and
  together?** goes back, **what about with Priya?** adds her, **and against Tom?** pits the
  group against him, **streak?** is their run together, **scores when he was best defender**
  filters to those nights, and a plain new name or a "who has the most…" starts afresh. Earlier
  answers fold to a line you can tap open; **Start over** clears the thread. Chips under the
  latest answer offer the natural next questions, and example questions built from the real data
  sit under the box, with the last eight questions asked on this device.
- **Line-ups once, not per match.** A session is usually several games between the same two
  sides. When any line-up repeats, the week card states each distinct line-up once — "All 3
  matches", "Matches 1, 2, 4", "Match 3" — and the match rows below keep to the scores. A
  week where every match had different sides keeps the sides beside each score, as before.
  Swapped colours count as a different line-up, since the scores are red's and blue's.
- **Share** on a week draws the night as a PNG and hands it to the phone's share sheet, or
  downloads it on a desktop. It carries the date and pitch, every score with the winner
  marked, the night's goals and wins, the four nominations with the POTM picked out in gold,
  and the line-ups — stated once per distinct pair of sides, labelled with the matches they
  played. It is laid out at phone width in phone-sized type and rendered at 3×, so in a
  chat it reads at the size the phone's own screens use rather than as a shrunken desktop
  page. It is set entirely in Inter, the app's own body face, which is fetched before a
  pixel is drawn — canvas quietly substitutes a system font for one it has not loaded yet. It is the one image to drop in the group chat afterwards, and it needs no
  password — anyone looking at the history can share it.
- **Nominations** — after a week's first result is recorded, the app asks for **best
  attacker**, **best midfielder**, **best defender** and the **overall POTM**. Recording five
  matches at once asks once, not five times. Only players who
  turned out that week can be nominated, and nobody is filtered out by position — the lists are
  just ordered so the obvious candidates come first. Skip and come back to it from the week's
  Nominations button; editing a score later won't re-open the prompt.
- **Ratings that week** — creating a week snapshots every participating player's ten ratings and
  their OVR. Expand a week to see them, with anyone re-rated since shown as `81 › 70 −11` plus
  exactly what moved (`PAC 92→50 · SHO 86→70`, and a position change if there was one). Players
  nobody has touched read as a plain list of what they were rated on the day.
- **From** and **To** dates filter to a range of weeks, and the summary above — weeks, matches
  played, wins each side, goals — recomputes for whatever the range shows.

A history saved before weeks existed migrates automatically: flat matches sharing a date are
grouped into one week.

### Table

The season as a league table, **ranked by win ratio** — the `#` is each player's position by
PCT, ties sharing a number, anyone without a result yet at the bottom. Every match is played to
a winner: there are no draws, and a level score cannot be saved. One row per player,
grouped headers over three sets of columns —
**Nominations** (best attacker, midfielder, defender, the overall POTM, and a total), **Played**
(matches played — a called-off night counts for nobody; nights turned out show in the opened
row),
and **Results** (won and lost, counted from the side each player was on in every scored match,
and **PCT** — the win ratio the way the NBA prints it, wins over wins plus losses to three
places, `0.268`; a dash until there is a result to count). Tap any header to sort by it — numbers biggest-first, names A–Z, again to flip — and
the `#` stays the position by win ratio, so a player's rank travels with them whatever the
order. Results are not ratings, so viewers see all of it.

### Seasons

A season is a name and the date it starts, and runs until the next one starts; a week belongs
to the latest season that had begun by its date, so nothing is assigned by hand and nothing
overlaps. Results and the Table carry a **Season** picker that opens on the current season, with
*All time* and — if any weeks predate the first season — *Before …*. Signed in, **Seasons**
beside the picker creates, renames and re-dates them, and shows how many weeks each holds.
Removing a season deletes no results: its weeks fall to the season before. Seasons live in the
shared document like everything else.

### Honours

**Honours** on the Table opens the season honours page: for each season, the **winner**, **best
player**, **best attacker**, **best midfielder** and **best defender**, each on its own card — a
tone and a glyph for the honour, a medallion with the player's initials, and the number behind
it (the winner's record and ratio; a best attacker's nominations). **Best player** is not
picked: it is whoever won the most player-of-the-match awards that season, ties going to the
higher table position, and the card shows the count. Signed in, **Name honours** on a season
picks the other four from the players who turned out that season, every list leading with the
obvious choice. A season is finished once the next one has started, and that is when its
honours are shown to everyone. While a season is in progress the same cards show the **front
runners** instead — the table leader, the most POTMs, the most nominations in each line — with
what they lead by ("2 clear", "Level with Jo"); these come from the table, never from picks an
organiser has entered early, which stay out of sight. Most
awards first, POTM breaking ties since it is the one that counts for the whole night, then
nights played, then A–Z; equal rows share a rank. Everyone on the roster is in it, so a new
signing sits at the bottom on zero until they play, and someone no longer on the roster keeps
their row under the name the week recorded them by.

Tap a player and the row opens to show every night they turned out, newest first, with any
award won that night pinned to its date. On a phone the name column stays put while the
numbers scroll.

### Stat ladder

One stat at a time, everyone on the same 0–100 scale — the point being that "better than Ali,
worse than Sam" is easier to judge than a number in isolation.

On a desktop it is a plot: click a stat to switch to it, then drag a player up or down to rate
them against the others. Arrow keys nudge the focused player by 1, Page keys by 10, and the
dashed line marks the squad average. Benched players are dashed and dimmed. Chips fan into
columns when a band gets crowded so nothing overlaps.

On a phone it is a list, highest first: one row per player with a slider and a − / + pair,
each a full 44px, and the stat chosen from a native picker. A native slider gives a thumb a
real handle and never fights the page for the scroll gesture. The order holds still while a
slider is held, so a row never jumps out from under a finger, and re-sorts the moment you let
go. A green edge marks players above the squad average; a faint tick on each slider marks
where that average sits.

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

There is one document, and it holds the lot: every player with their nicknames and ten ratings,
every game week with its matches, nominations and ratings snapshots, the current squad, the
format, the fixture details and the drafted board. The same shape lives in three places — the
hosted store, this browser's cache, and any file you export — so they can't drift apart.

**The status chip** in the header (a row in the actions sheet on a phone) says where things
stand, and opens the shared-data dialog:

| | |
| --- | --- |
| **Saved** | everything is on the server |
| **Unsaved** / **Saving** | a change is on its way up |
| **View only** | signed out: showing the group's data, nothing editable |
| **Offline** | changes are queued and go up when the connection returns |
| **Clash** | somebody else saved first — pick which copy to keep |
| **On this device** | no shared store behind this copy; it runs on `localStorage` alone |

Signing in with the shared password unlocks editing on that device and is remembered until you
sign out. Signed out, the app is a window — and ratings are the organiser's working notes, not
something for the whole group to read, so **every player value is hidden**: the stat rows and
OVR on cards, the OVR on mini cards and pins, the balance readout (the position mix stays —
it's a headcount, not a rating), the rating columns and averages in the stats table, the whole
stat ladder, the ratings snapshots in history, the *Include ratings* switch on the WhatsApp
text, the ratings and summary strip on the board PNG, and the JSON export, which would carry
them all. Names, positions, nicknames, the board, the results, the nominations and the awards
table all read as normal; nothing can be changed and nothing is ever written. Signing in brings
the numbers back in place.

Saving is automatic about a second after you stop typing. Every write says which revision it
was based on, so two people editing at once can't quietly overwrite each other — the second
one is told, shown what is actually stored, and asked which to keep. Tabs re-check every 20
seconds and whenever they come back to the foreground, so a viewer's board updates itself
moments after the organiser balances.

**Data** on every page (in the actions sheet on a phone) is the manual half:

- **Export all data** — writes `fufa-backup-YYYY-MM-DD.json`: the live document, plus a note of
  when it was taken. Plain readable JSON, so it can be diffed, edited or kept in a repo. Signed
  in only — a backup is every rating in one file, which is the thing view-only hides, so the
  Data button is not there at all until you sign in.
- **Import data** — reads a file back and makes it the document. It also accepts a hand-written
  `{"players": [...]}` object or a plain array of players, for seeding a roster from somewhere
  else: missing stats are filled at 60, colliding or missing ids are re-issued, and nameless
  entries are dropped. Player ids survive a full backup intact, which is what keeps the squad
  selection, the board and every recorded week pointing at the right people. It replaces what's
  there, so it says what the file holds and confirms first.

**Backups & history** (in the shared-data dialog, signed in only) is the safety net:

- **Changes** lists every save, newest first, with who made it and what changed in words —
  "Added Ravi Shah", "Changed ratings for Sam O, Jo R", "Recorded 3 matches on Fri 04/09/26",
  "Named honours for 2026/27". Everyone shares one password, so each device is asked once for a
  name to put against its changes (it can be changed in the same dialog); without one the log
  says "Someone". Saves by the same person within ten minutes merge into one entry, so picking a
  squad tap by tap is one line, not twelve. The newest 300 entries are kept.
- **Backups** are taken automatically by the server: once a week, the first save keeps a copy
  of what was there before it. **Back up now** takes one on demand. The newest twelve are kept,
  each with its date, who triggered it, and how many players and nights it holds. **Restore**
  asks first, then makes that backup the shared data for everyone as a new revision — and backs
  up what was there beforehand, so a restore can itself be undone. The restore is logged.
  Saving a new team formula takes one too ("Before a formula change").

Both are behind the password on the server too, since they carry every rating.

**Theme** — light, dark, or follow the device (the default), from the button beside the status
chip, or the Theme row in the actions sheet on a phone. It is set before the page draws, so a
phone in dark mode never flashes white, and in follow-the-device it switches when the phone does.
The pitch, the honours cards and the shared images are dark in both themes.

The squad **view** (card or mini), the theme and the PNG switches belong to the browser, not the
group — flicking to mini view on a phone doesn't change what anyone else is looking at.

## Layouts

- **Desktop (>1100px)** — three columns: squad, board, balance readout. The whole app is capped
  at 1480px and centred, so an ultra-wide monitor gets gutters rather than a stretched spread.
- **Tablet (761–1100px)** — squad and board side by side, balance readout full width below.
- **Phone (≤760px)** — one pane at a time with a bottom tab bar (Squad / Board / Balance / Table
  / Ladder / History), 44px touch targets, and pins enlarged to 44px. Balancing jumps you
  straight to the Board tab.

  The header stays one row that never scrolls: the wordmark, a **…** button carrying the
  shared-data dot, and the one action worth a tap of its own — *Balance teams*, which becomes
  *Re-balance* once there are teams.
  Everything the desktop header spreads across its width moves into the **…** sheet, grouped and
  stacked full width: the format toggle, Paste list / Reshuffle / Swap team colours, WhatsApp
  text / Export PNG / Record result, the three board-and-image switches, and Export / Import
  data. Anything that needs teams is greyed out until there are teams, and every action is two
  taps from anywhere.

## Running it

```bash
npm install
npm run serve    # netlify dev: the app and the shared-data function together
npm run dev      # Vite alone — no function, so this-browser-only storage
npm run build    # production build into dist/
npm run preview  # serve the production build, again with no function
```

`npm run serve` needs a `TB_PASSWORD` in a `.env` file at the repo root to let you sign in;
see [DEPLOY.md](DEPLOY.md). `dist/` is a static bundle and still works served from anywhere,
including a subpath — without the function beside it the app keeps its data locally.

## Layout of the code

```
src/
  ds/           FUFA design system primitives (Button, Icon, Input, Select, Switch, Dialog…)
  lib/
    model.js        stats model, position-weighted OVR, balancing algorithm, pitch placement
    formula.js      the team formula: its defaults, cleaning, the active one, and editor helpers
    strength.js     results nudge, rating suggestions, and the past-results check
    parseList.js    WhatsApp signup-list parser and fuzzy roster matching
    whatsapp.js     teams + match details -> chat-ready text
    exportBoard.js  board -> PNG
    exportWeek.js   a game week -> a results PNG with the nominations on it
    doc.js          the shared document: building it, and reading one back
    backup.js       that document <-> a .json file
    remote.js       talking to /api/data
    useSync.js      load, debounced save, revision checks, polling, conflicts
    weeks.js        game weeks: grouping matches by date, award slots, ratings
                    snapshots and their diffs, and migrating pre-week history
    storage.js      localStorage persistence, and back-filling stats added since a
                    roster was last saved
  components/   RosterPanel, PlayerCard, PlayerEditor, Pitch, Metrics, StatsTable,
                StatLadder, History, ImportDialog, ShareDialog, RecordResultDialog,
                WeekAwardsDialog, FormulaPage
  styles/       design tokens + the shell's responsive layout
  App.jsx       state, balancing, pin drag/swap, view switching, the phone actions sheet
netlify/
  functions/
    data.js     GET/PUT the document, password-checked, stored in Netlify Blobs
netlify.toml  build, the /api/data route and the SPA fallback
```

Design tokens (color, type, spacing, radius, shadow) come from the FUFA design system and are
untouched; `--team-red` and `--team-blue` are additions for this surface, since the system has
no team palette. Fonts (Barlow Condensed, Inter, JetBrains Mono) load from Google Fonts.
