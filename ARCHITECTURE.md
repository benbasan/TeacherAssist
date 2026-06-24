# ARCHITECTURE.md — TeacherAssist System Blueprint

This is the **living blueprint** of the system. It must always match the actual codebase.
Read it (and `CLAUDE.md`) before any change, and update it *first* for any structural,
routing, or architectural change. See **Decision Log** at the bottom for the "why/how"
behind significant choices.

---

## 1. Overview & Tech Stack

TeacherAssist is a data-driven catalog of small, self-contained educational games for the
classroom. The entire UI is **RTL / Hebrew**.

| Concern        | Choice |
| -------------- | ------ |
| Build tool     | Vite 8 |
| UI runtime     | React 19 (functional components only) |
| Language       | TypeScript 6 (`verbatimModuleSyntax` → `import type` for types) |
| UI library     | MUI v9 (`@mui/material`, `@mui/icons-material`) |
| Styling        | Emotion (`@emotion/react`, `@emotion/styled`) via MUI `sx`/theme |
| RTL            | `@emotion/cache` + `stylis` `prefixer` + `stylis-plugin-rtl` |
| Routing        | `react-router-dom` v7 (`BrowserRouter`) |
| Celebration FX | `canvas-confetti` |
| Auth + storage | **Clerk** (`@clerk/clerk-react`) — auth UI + per-user cloud data via `unsafeMetadata` |

Entry: `index.html` (`<html lang="he" dir="rtl">`) → `src/main.tsx` → `src/App.tsx`.

> **Env requirement:** Clerk needs `VITE_CLERK_PUBLISHABLE_KEY` (a `pk_…` key) in `.env`. The app
> *builds* without it but only *runs* once it is set.

---

## 2. Directory Map

```
src/
├── App.tsx                     # Application shell: providers + router (route table)
├── main.tsx                    # React root render
├── components/layout/
│   ├── AppLayout.tsx           # Shell: Navbar + AttendanceDrawer + <Outlet/>; owns drawer open state
│   ├── Navbar.tsx              # Sticky AppBar; nav links + Clerk auth + active-class widget + attendance toggle
│   ├── GameWrapper.tsx         # Shared frame around every game (title, chips, back button)
│   ├── ClassSelectionGateway.tsx # Entry gatekeeper: "עם איזה כיתה משחקים היום?" class-picker grid
│   ├── RequireActiveClass.tsx  # Gate: signed-in + no active class → render the gateway (wraps catalog/game)
│   └── AttendanceDrawer.tsx    # Right-anchored collapsible Drawer; per-student present/absent switches
├── context/
│   └── ClassroomContext.tsx    # Multi-classroom state/cloud layer (Clerk unsafeMetadata; see §8)
├── utils/
│   └── parseNames.ts           # Shared roster parser (textarea → clean name list)
├── data/
│   ├── games-registry.json     # SOURCE OF TRUTH: all games + metadata + componentName
│   ├── whats-new.json          # SOURCE OF TRUTH: "What's New" timeline entries
│   └── taxonomy.ts             # subject/targetAge → Hebrew labels + icon/color (catalog visuals)
├── games/
│   ├── ComplimentGamePack.tsx  # 3-mode game pack (internal state machine; see §4a)
│   ├── MathCodebreaker.tsx     # Math vault game (state machine: difficulty→game→unlocked; §4a)
│   ├── SocialDilemmas.tsx      # SEL dilemmas (topic→scenario→consequence→summary; §4a)
│   ├── FocusDetectivesGame.tsx # Focus capsule (intro→playing[memorize/blink/recall/feedback]→summary; §4a)
│   ├── SpotTheGlitch.tsx       # Hebrew "spot the error" game (topic→board→reveal→summary; §4a)
│   ├── WordPop.tsx             # English vocab arcade: float-up bubbles, pop the category (setup→playing→over; §4a)
│   ├── ComplimentTimeBomb.tsx  # Social bomb-countdown: tap "+1 פרגון!" to reach goal before time runs out (setup→playing→win/lose; §4a)
│   ├── SilentNinja.tsx         # Brain-break: movement command → random freeze → eliminate movers (setup→action→freeze→victory; §4a)
│   ├── WouldYouRather.tsx      # Split-screen vote dilemmas, teacher enters counts, animated result bars + class profile (setup→question→reveal→summary; §4a)
│   ├── TwoTruthsLie.tsx        # Teacher enters 2 truths + 1 lie; 60s consultation timer; reveal with stamp animation (setup→timer→reveal→victory; §4a)
│   ├── MindReaders.tsx         # Student picks secret answer; class votes; telepathy-meter summary (names→pick→transmit→class_vote→reveal→summary; §4a)
│   ├── EmotionGenerator.tsx    # Slot-machine spins emotion+action combo; student acts in pantomime; class guesses (names→pick_actor→spin→peek→acting→reveal→summary; §4a)
│   ├── SilentSyncTower.tsx     # Teacher-judged whole-class sync: N students must stand simultaneously; tower grows floor-by-floor, collapses on wrong count (setup→playing→victory; §4a)
│   ├── DigitalPassParcel.tsx   # Digital pass-the-parcel: built-in music plays then auto-stops randomly; holder gets a social task card (setup→playing→revealed→victory; §4a)
│   ├── HungryWordMonster.tsx   # Hebrew phonology: monster eats words matching the chosen letter focus; hunger meter fills per correct feed; 4 focuses × 3 rounds (setup→playing→victory; §4a)
│   ├── SentenceDetectives.tsx  # Hebrew sentence structure: scrambled word magnets clicked into order by teacher; green glow on correct, shake+reset on wrong; 2 difficulties × 3 sentences (setup→playing→victory; §4a)
│   ├── LetterBridge.tsx        # Hebrew spelling: koala crosses 5-plank bridge; each plank is a word with a missing homophonic letter (א/ע, ח/כ, ט/ת, ס/ש); two big letter buttons; wrong = plank shake (setup→playing→victory; §4a)
│   ├── PunctuationOrchestra.tsx # Hebrew reading expression: giant sign cycles . ? ! on teacher click; class reads sentence with matching tone; drama-meter LinearProgress fills to victory (setup→playing→victory; §4a)
│   └── RhymeExpress.tsx        # Hebrew phonology: locomotive shows target word; 6 shuffled platform tiles (3 rhymes + 3 distractors); click correct → loads into wagon with spring animation; wrong → fall animation; train departs on full load (setup→playing→victory; §4a)
├── pages/
│   ├── CatalogPage.tsx         # Grid of game cards; subject/targetAge filters
│   ├── GamePage.tsx            # Resolves a game by URL param → renders via Registry Map
│   ├── DashboardPage.tsx       # Teacher workspace: create/edit/delete saved classrooms (SignedIn)
│   └── WhatsNewPage.tsx        # Timeline rendered from whats-new.json
├── theme/
│   ├── educationalTheme.ts     # MUI theme (indigo/teal, Rubik, rtl, borderRadius 16)
│   └── rtlCache.ts             # Emotion cache for RTL CSS (key "muirtl")
└── types/
    └── game.types.ts           # EducationalGame, WhatsNewEntry, Classroom contracts
```

---

## 3. Application Shell & Dynamic Routing

`src/App.tsx` composes the app as nested providers around the router:

```
<ClerkProvider publishableKey={VITE_CLERK_PUBLISHABLE_KEY}>   // auth + per-user cloud storage
  <CacheProvider value={rtlCache}>      // RTL-correct CSS emission
    <ThemeProvider theme={educationalTheme}>
      <CssBaseline />
      <ClassroomProvider>               // classroom + session state, inside Clerk so it can read useUser() (§8)
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>      // Navbar + AttendanceDrawer + <Outlet/>
              "/"              → <RequireActiveClass><CatalogPage /></RequireActiveClass>
              "/game/:gameId"  → <RequireActiveClass><GamePage /></RequireActiveClass>
              "/dashboard"     → <DashboardPage />   // ungated: a class-less teacher can still reach it
              "/whats-new"     → <WhatsNewPage />
              "*"              → <Navigate to="/" replace />   // unknown path → catalog
            </Route>
          </Routes>
        </BrowserRouter>
      </ClassroomProvider>
    </ThemeProvider>
  </CacheProvider>
</ClerkProvider>
```

- **Why `ClassroomProvider` sits *inside* `ClerkProvider`:** the classroom layer calls Clerk's
  `useUser()` to read/write `unsafeMetadata`, so it must have a `ClerkProvider` ancestor.

- **Why `BrowserRouter`:** clean history-API URLs; routing is fully client-side.
- **Why a `:gameId` param:** games are data, not code-defined routes. A single dynamic
  route serves *every* game; the page looks the game up at render time (§4). Adding a game
  never requires adding a route.
- **Why the `*` fallback:** any unknown/stale URL redirects to the catalog instead of a
  blank screen.

### Entry session flow (AppLayout + gateway + attendance)
All routes now nest under a single **`AppLayout`** (`<Route element={<AppLayout/>}>`), which renders
the `Navbar`, the right-anchored collapsible **`AttendanceDrawer`**, and the routed content via
`<Outlet/>`. `AppLayout` owns the drawer's open/close state and hands a toggle to the `Navbar`.

The catalog and game routes are wrapped in **`RequireActiveClass`**, the **entry gatekeeper**:
- *Signed-in teacher, no active class selected* → render `ClassSelectionGateway` (a playful grid of
  the teacher's classes; clicking one calls `setActiveClassroom(id)` and unlocks the catalog). A
  teacher with **zero** classes sees a CTA into `/dashboard`.
- *Signed out* → render the route as-is (the catalog stays open to anonymous visitors, unchanged).

`/dashboard` and `/whats-new` are deliberately **left ungated** so a class-less teacher isn't
trapped away from the place they create classes. The `Navbar` shows a `כיתה: … 🔄` chip (click to
switch class → returns to the gateway) and an attendance toggle, both only when a class is active.
Active-class selection and attendance are **session-only** (in-memory) — see §7.

### Deployment / Routing (SPA rewrites)
Because routing is client-side (`BrowserRouter`), a hard refresh or direct visit to a deep URL
(e.g. `/game/math-codebreaker`) would otherwise hit the static host looking for a file that
doesn't exist → **404**. `vercel.json` (root, peer to `package.json`) rewrites **all** paths
back to `index.html` so the React router can resolve the route on the client:

```json
{ "rewrites": [ { "source": "/(.*)", "destination": "/index.html" } ] }
```

This is hosting config only — it does not affect the build or the route table above.

---

## 4. Component-Mapping Logic (Registry Map)

The bridge between **data** (a game entry) and **code** (a React component) lives in
`src/pages/GamePage.tsx`:

```ts
const REGISTRY_MAP: Record<string, ComponentType> = {
  ComplimentGamePack: ComplimentGamePack,
  // <componentName>: <ImportedComponent>
};
```

Resolution flow on `/game/:gameId`:
1. `useParams()` → `gameId`.
2. Find the entry in `games-registry.json` where `id === gameId`.
   - Not found → 404: *"אופס! לא מצאנו את המשחק הזה."*
3. Look up `REGISTRY_MAP[game.componentName]`.
   - Not found → 404: *"המשחק קיים בקטלוג אך עדיין לא חובר…"*
4. Render `<GameWrapper game={game}><GameComponent /></GameWrapper>`.

**Why two separate 404 stages (why/how):** the registry (data) and the Registry Map (code)
are decoupled on purpose — a game can be *announced/listed* in the registry before its
component is wired. The split lets the catalog show "coming soon" entries gracefully while
giving a distinct, honest message when the data exists but the code isn't connected yet.

**To register a new game's component:** import it in `GamePage.tsx` and add one
`componentName → Component` line to `REGISTRY_MAP`. The `componentName` string must match the
`componentName` field of the game's registry entry.

---

## 4a. Games as Internal State Machines (the Pack pattern)

A single registry entry / `componentName` maps to **one** React component, but that component
may itself contain several views. `ComplimentGamePack.tsx` is the reference example: it is a
**self-contained sub-router / state machine**, not three registry entries.

- It holds two pieces of shared state: `stage` (`'names' | 'modeSelect' | 'chain' | 'duo' |
  'slot'`) and `names: string[]` (the class roster, entered once and reused by every mode).
- A `switch (stage)` renders the matching inner view: a global **names input** (Phase 1) → a
  **mode-select** screen of 3 cards → one of three game views (**Chain**, **Duo**, **Slot**).
  Each mode receives `names` + an `onBack` to return to mode-select.
- Inner views own only their ephemeral game state (e.g. the Chain step index, the Slot
  `setInterval` spin). Timers are cleared via a `useEffect` cleanup so they never outlive the
  component.

*Why this pattern:* the three modes share one roster and one product identity ("the pack"), so
they belong behind one catalog card and one route. The outer registry stays simple (one entry);
intra-game navigation is a local concern handled by component state, not the URL router. New
multi-mode games should follow the same shape rather than leaking modes into the registry.

**Second example — `MathCodebreaker.tsx`** (math vault game) uses the same pattern with a
linear flow: `stage` is `'difficulty' | 'game' | 'unlocked'`. Difficulty selection seeds 4
single-digit riddles; the game screen reveals one vault digit per solved riddle (confetti per
digit, a shake on a wrong key); the 4th correct answer transitions to the unlocked screen
(big confetti). All riddle answers are constrained to 0–9 so they map cleanly onto the 0–9
keypad and the 4-digit vault code.

**Third example — `SocialDilemmas.tsx`** (SEL "what would you do?" game) carries scored state
across the loop: `stage` is `'topic' | 'scenario' | 'consequence' | 'summary'`. Picking a topic
loads its 3 dilemmas and resets a **Class Empathy Meter** (`empathy`, starts 50, clamped
0–100). The scenario screen offers 3 choices; choosing one carries the `Choice` to the
consequence screen, which gently animates the meter by `empathyDelta` (a local
`empathyBefore → after` glide committed back to the root on "next"), shows short/long-term
consequences, and an `Alert` with 2 teacher discussion questions. After the 3rd dilemma →
summary (message tiered by final empathy + confetti). All dilemma content is an in-component
constant (`TOPICS`); no data-registry change beyond the single game entry.

**Fourth example — `FocusDetectivesGame.tsx`** (smartboard "focus capsule") nests a per-round
step machine inside the top phase machine. `phase` is `'INTRO' | 'PLAYING' | 'SUMMARY'`; INTRO
offers an optional 15s silence countdown. PLAYING runs 3 rounds, each cycling a `step`
`'MEMORIZE' (5s) → 'BLINK' (1s) → 'RECALL' → 'FEEDBACK'`: a 3×3 emoji grid is shown to
memorize, hidden during a "blink," then re-shown with exactly one cell altered (emoji **or**
color — single-cell so the tap target is unambiguous). SUMMARY celebrates (confetti) and runs a
30s guided breathing animation (CSS `@keyframes` scale loop + alternating שואפים/נושפים text).
All timers use `useRef` + `useEffect` cleanup keyed on `(round, step)`. Round content is an
in-component `ROUNDS` constant.

**Fifth example — `SpotTheGlitch.tsx`** (Hebrew language-arts "spot the error" game) is a frontal
reading/listening game: the teacher reads a sentence and the class shouts "stop!" when they catch a
planted mistake. `stage` is `'topic' | 'board' | 'reveal' | 'summary'`. The **topic** screen offers
3 Hebrew sub-categories (`grammar` — זכר/נקבה ומספרים, `spelling` — בלשי כתיב, `idioms` — ניבים
משובשים); picking one loads its sentence list and resets the index. The **board** screen shows a
`LinearProgress` "משפט X מתוך N" indicator, a big-typography `Card` with the current sentence, and
two action buttons: "המשפט תקין 👍" and "עצור! יש טעות 🛑". Pressing "תקין" on a glitched sentence
shows a gentle inline tip and stays put; otherwise the choice moves to the **reveal** screen, which
uses an `Alert` to say whether the class was right and — for a correctly-caught glitch — renders the
`correction`, strikes the original with `textDecoration: 'line-through'`, and fires confetti via
`useEffect`. After the last sentence → **summary** (praises the class as "בלשי השפה העברית" +
confetti). All content is an in-component `TOPICS` constant; each item is a localized
`{ text, hasGlitch, correction }` record. Uses the new `hebrew` subject (see §5) — additive, no
schema change.

**Sixth example — `WordPop.tsx`** (English-vocabulary smartboard arcade) is the first **real-time
animated** game and the first to drive state from timers rather than discrete user steps. `stage` is
`'setup' | 'playing' | 'over'`. **setup** offers 3 category `Card`s (`animals` / `food` / `colors`,
content in an in-component `CATEGORIES` constant of `{ en, he }` word lists). **playing** runs three
loops set up in a single `useEffect` keyed on `[stage, category]` and torn down in its cleanup: a
~50ms **float tick** (`setInterval`) advancing each bubble's `progress` (`bottom %`), a 1s
**countdown** from 90, and a recursive `setTimeout` **spawner** (every 2–3s) that emits a bubble
whose word is ~50% from the target category (`isCorrect`) and ~50% a distractor from the other
categories. Bubbles live in a `bubbles: Bubble[]` state array —
`{ id, text, he, x (5–90%), speed, progress (0→100), isCorrect, color, status: 'floating'|'popped'|'rock' }`
— written through a single `writeBubbles` helper that keeps a `bubblesRef` mirror in sync so the tick
reads fresh state without re-subscribing the interval. The float tick removes bubbles crossing the
top and **deducts a life** for each *correct* one that escaped (a missed chance). Clicking a bubble:
correct → `popped` (scale-up/fade) + `+100` + a transient `DOG → כלב!` flash banner; incorrect →
`rock` (gray, drops) + `-1` life. The game ends when `timeLeft` or `lives` hit 0 → **over** (summary
`Paper` + `confetti`). Records the play via the shared `useMarkGamePlayed(gameId, stage === 'over')`
hook (§7). English text is wrapped in `dir="ltr"` inside the RTL shell. Uses the new `english` subject
(see §5) — additive, no schema change.

---

## 5. Data Flow (Single Source of Truth)

Type contracts in `src/types/game.types.ts`:
- **`EducationalGame`** — `id`, `title`, `description`, `targetAge`, `subject`,
  `estimatedTimeMinutes`, `componentName`.
- **`WhatsNewEntry`** — `id`, `date`, `title`, `shortDescription`, `gameId?`.
- **`Classroom`** — `id`, `name`, `students: string[]`, `playedGames: string[]` (cloud-persisted
  per-teacher via Clerk; see §7). Re-exported from `ClassroomContext` for back-compat.

The registry stores compact keys for `subject` and `targetAge`. `src/data/taxonomy.ts` maps
those to Hebrew labels and to the catalog's visual identity (`subjectMeta()` → `{ label, icon,
color }`; `targetAgeLabel()`). This keeps presentation out of the data file while letting the
catalog/wrapper render a per-subject emoji icon and accent color.

Consumers (all render purely from data — never hard-code a game list):
- **`CatalogPage.tsx`** imports `games-registry.json` as `EducationalGame[]`, derives the
  subject + targetAge option lists, filters by them, and renders a card grid (icon/color from
  `taxonomy`). Each card links to `/game/${game.id}`. When an active class has a game in its
  `playedGames`, the card shows a corner "שוחק כבר בכיתה זו 👍" `Chip` (emerald).
- **`GamePage.tsx`** consumes the registry for lookup + the Registry Map for resolution (§4).
- **`GameWrapper.tsx`** frames each game with the subject icon/label + estimated time.
- **`WhatsNewPage.tsx`** imports `whats-new.json` as `WhatsNewEntry[]`, sorts by `date`
  descending, and renders a timeline; entries with a `gameId` link to that game.

**Checklist — adding a game (keep in sync with `CLAUDE.md`):**
1. Create the component in `src/games/` (multi-mode games follow the §4a pack pattern).
2. Register it in `REGISTRY_MAP` (`src/pages/GamePage.tsx`).
3. Add an entry to `src/data/games-registry.json` (with a matching `componentName`).
4. Add an entry to `src/data/whats-new.json`.
5. If using a new `subject`/`targetAge` key, add it to `src/data/taxonomy.ts`.
6. Update this file if the change is architectural; run `npm run build` (0 errors).

---

## 6. Theming & RTL

- **`src/theme/rtlCache.ts`** — `createCache({ key: 'muirtl', stylisPlugins: [prefixer,
  rtlPlugin] })`, provided at the root via `<CacheProvider>` so MUI emits RTL-correct CSS.
- **`src/theme/educationalTheme.ts`** — `direction: 'rtl'`, `shape.borderRadius: 16`,
  palette **indigo** primary / **teal** secondary, font **Rubik**, component overrides for
  rounded `Button`/`Paper`/`Card`.
- **MUI v9 `Stack` constraint:** in MUI v9, `Stack`'s flex props `alignItems`,
  `justifyContent`, `flexWrap`, and `gap` are **no longer top-level props** — pass them
  through `sx` instead (e.g. `sx={{ alignItems: 'center' }}`). `direction`, `spacing`,
  `useFlexGap`, and `divider` remain top-level. Violating this is a compile error.

---

## 7. Serverless Cloud Data Flow (Clerk `unsafeMetadata`)

**Multi-Classroom Management** lets a signed-in teacher save named classes (each a list of student
names) and reuse them across roster-based games — with **no backend**. Clerk provides both auth and
per-user cloud storage:

- **Storage:** each teacher's classes live in `user.unsafeMetadata.classrooms` — an array of
  `Classroom { id, name, students: string[], playedGames: string[] }` (type in
  `src/types/game.types.ts`, re-exported from `ClassroomContext`). `playedGames` holds the ids of
  games this class has finished (catalog history badges, §5). `unsafeMetadata` is the
  **client-writable** Clerk metadata bucket (writable straight from the browser via
  `user.update(...)`), which is exactly why it fits a serverless model. It is "unsafe" only in that
  the client can write it; that is acceptable here because class rosters are non-sensitive. Legacy
  classrooms saved before `playedGames` existed are normalized to `[]` on read.
- **Single read/write layer:** `src/context/ClassroomContext.tsx` wraps `useUser()` and is the only
  place that touches the metadata. It **derives** `classrooms` from the live `user.unsafeMetadata`
  (Clerk's `user` is reactive and re-renders after each `user.update`, so no separate copy can go
  stale) and exposes async `addClassroom` / `updateClassroom` / `removeClassroom` /
  `markGameAsPlayedInClass`, each of which rewrites the whole `classrooms` array via
  `user.update({ unsafeMetadata: { ...user.unsafeMetadata, classrooms: next } })`.
  `markGameAsPlayedInClass(classId, gameId)` appends `gameId` (deduped) to that class's `playedGames`.
- **Session state (NOT persisted):** the same context also holds in-memory `activeClassroomId` and
  `absentStudents`, with `setActiveClassroom(id)` (clearing also resets attendance) and
  `toggleStudentAttendance(name)`. These are deliberately **not** written to Clerk, so every app
  entry re-prompts for the class (the gateway, §3) and starts attendance fresh. A `useMarkGamePlayed`
  hook (in the same module) lets a game record itself as played on victory: it fires
  `markGameAsPlayedInClass(activeClassroomId, gameId)` once, and is a no-op when signed out / no
  active class.
- **Consumers:** `DashboardPage` (full CRUD UI); `ClassSelectionGateway` + `AttendanceDrawer` +
  `Navbar` (session state); `CatalogPage` (history badges); and the games (`useMarkGamePlayed` in all
  five — `gameId` is threaded from `GamePage` via the Registry Map). **Only `ComplimentGamePack`
  consumes a roster**: it auto-loads the active class's students minus absentees (manual edit
  retained); `MathCodebreaker`, `SocialDilemmas`, `SpotTheGlitch`, and `FocusDetectivesGame` have no
  student-name input, so roster filtering is a no-op there. The former in-game "בחר כיתה" selector was
  removed — the active class is now chosen globally at the gateway, so an in-game picker would be
  redundant.
- **Auth UI:** the Navbar uses Clerk's `<SignedIn>/<SignedOut>`, `<SignInButton>`, and
  `<UserButton>`. `UserButton` is Clerk's own widget — the single deliberate exception to the
  "MUI for all UI" guideline (everything else stays MUI).

---

## 8. Decision Log ("Why / How")

Append a dated entry here for every significant technical decision.

- **Data-driven registry over hard-coded game lists.**
  *Why:* games are added daily; the catalog, routing, and "What's New" must scale without
  code edits to multiple components. *How:* `games-registry.json` + `whats-new.json` are the
  single source of truth; pages map over them; a single dynamic route (`/game/:gameId`)
  resolves any game.
- **Component resolution via a Registry Map (string `componentKey` → component).**
  *Why:* JSON can't hold React components, and we want data and code decoupled so a game can
  be listed before it's wired. *How:* `REGISTRY_MAP` in `GamePage.tsx`, with a two-stage 404
  distinguishing "no such game" from "not yet wired".
- **RTL via an Emotion cache (`stylis-plugin-rtl`) rather than manual flipping.**
  *Why:* the whole app is Hebrew/RTL; per-component manual direction handling is error-prone.
  *How:* one `rtlCache` at the root + `direction:'rtl'` in the theme flips the entire tree.
- **MUI v9 `Stack` flex props moved into `sx`.**
  *Why:* MUI v9 removed `alignItems`/`justifyContent`/`flexWrap`/`gap` as top-level `Stack`
  props (compile error otherwise). *How:* all such props were moved into `sx` across the
  layout/pages/games; documented in §6 as the standing convention.
- **2026-06-18 — Registry schema migrated to a taxonomy model.** Replaced
  `category`/`minAge`/`maxAge`/`icon`/`color` with `subject` + `targetAge` (compact keys) +
  `estimatedTimeMinutes`, and renamed `componentKey` → `componentName`; `WhatsNewEntry` now
  uses `shortDescription` and dropped `type`. *Why:* compact taxonomy keys are cleaner data and
  enable consistent labels/filters; presentation (icon/color/label) doesn't belong on each
  entry. *How:* `src/data/taxonomy.ts` maps keys → labels + visuals; all consumers (Catalog,
  GameWrapper, GamePage, WhatsNewPage) and `game.types.ts` were refactored to the new contract.
- **2026-06-18 — Multi-mode games use the internal-state-machine "pack" pattern (§4a).**
  *Why:* the 3 Compliment modes share one roster and one product identity, so they sit behind a
  single registry entry/route. *How:* `ComplimentGamePack` switches inner views off a `stage`
  state; the registry and URL router stay flat. Replaced the retired single-mode
  `DemoComplimentGame`.
- **2026-06-19 — Added `MathCodebreaker` (2nd game) with a single-digit-answer riddle model.**
  *Why:* the vault uses a 0–9 keypad and a 4-digit code, so each riddle must resolve to one
  digit (0–9). *How:* per-difficulty generator pools build riddles whose answer is always 0–9
  (e.g. `(d·v)÷v=d`, `1/k of d·k=d`, `p% of base=d`, precedence expressions); the curriculum
  topics (times-table, fractions, percentages, order of operations) are honored as flavor
  within that constraint. Follows the §4a pattern; reuses `taxonomy.ts` (`math` /
  `elementary_high`, already present) so no schema or taxonomy change was needed.
- **2026-06-20 — Added `SocialDilemmas` (3rd game) with a scored-state empathy meter.**
  *Why:* an SEL discussion game needs to carry a value (empathy) across a multi-step loop and
  surface teacher discussion prompts, not just branch screens. *How:* §4a state machine
  (topic→scenario→consequence→summary) with `empathy` clamped 0–100 and gently animated on the
  consequence screen; dilemma content lives in an in-component `TOPICS` constant (no data-file
  branching). Reuses `taxonomy.ts` (`social` / `elementary_high`) — additive, no schema change.
- **2026-06-19 — Added `FocusDetectivesGame` (4th game) + new `focus` subject.**
  *Why:* a smartboard calming/attention "capsule" doesn't fit any existing subject. *How:*
  added a `focus` subject (`קשב ורוגע`, 🧘, emerald) to `taxonomy.ts` — the §5-checklist
  "new subject" path, additive with no schema change. The game follows §4a with a nested
  per-round step machine and timer cleanup via `useEffect`; built for touch (large targets, no
  hover dependence) per the brief.
- **2026-06-21 — Added `SpotTheGlitch` (5th game) + new `hebrew` subject.**
  *Why:* a Hebrew language-arts game (spotting gender/number, spelling, and idiom errors) deserves
  its own subject identity in the catalog rather than being folded into the generic `language`
  bucket. *How:* added a `hebrew` subject (`עברית ושפה`, 📖, purple) to `taxonomy.ts` — the
  §5-checklist "new subject" path, additive with no schema change. The game follows §4a
  (topic→board→reveal→summary); all sentence content lives in an in-component `TOPICS` constant of
  localized `{ text, hasGlitch, correction }` records, so no data-file branching beyond the single
  registry entry.
- **2026-06-21 — Multi-Classroom Management via Clerk `unsafeMetadata` (serverless cloud data).**
  *Why:* teachers re-type rosters every session; we wanted saved, reusable classes with **zero
  backend**. Clerk provides auth + per-user storage out of the box, and `unsafeMetadata` is writable
  straight from the client — ideal for non-sensitive roster data, no API/DB to run. *How:* added
  `@clerk/clerk-react`; `ClerkProvider` wraps the app (key via `VITE_CLERK_PUBLISHABLE_KEY`), with
  `ClassroomProvider` nested inside it (§3, §7) as the single read/write layer over
  `user.unsafeMetadata.classrooms`; new `/dashboard` route for CRUD. *Scope choices:* the
  "בחר כיתה" selector is added **only** to `ComplimentGamePack` (the lone roster game) — the other
  three games have no roster concept, so a selector there would be dead UI. `UserButton` is the one
  accepted non-MUI widget. `parseNames` was extracted to `src/utils/parseNames.ts` so the dashboard
  and the game share one parser.
- **2026-06-21 — Added `WordPop` (6th game, "מפצחי בועות המילים") + new `english` subject.**
  *Why:* the catalog had no English-vocabulary game and no real-time/arcade format; a timed
  "pop the right category" game fits the smartboard and exercises fast recall. *How:* §4a state
  machine (`setup→playing→over`) but **timer-driven** — three loops (50ms float tick, 1s countdown,
  2–3s recursive spawner) set up/torn down in one `useEffect`, with a `bubbles[]` state array mirrored
  by a `bubblesRef` so the tick reads fresh state without re-subscribing (see §4a for the bubble
  shape). Records itself via the shared `useMarkGamePlayed` hook (§7) and fires `confetti` on game
  over. Added an `english` subject (`אנגלית`, 🔤, amber `#ff9800`) to `taxonomy.ts` — the §5-checklist
  "new subject" path, additive with no schema change. English copy is wrapped in `dir="ltr"`.
- **2026-06-21 — Classroom-first session flow (gateway + attendance sidebar + game history).**
  *Why:* the app should open around a **teaching session**, not a generic catalog — the teacher
  picks which class they're teaching first, manages live attendance, and sees which games a class
  already played. *How:* all routes nest under `AppLayout` (Navbar + right-anchored collapsible
  `AttendanceDrawer` + `<Outlet/>`); `RequireActiveClass` gates the catalog/game routes so a
  signed-in teacher without an active class sees `ClassSelectionGateway` first (dashboard/whats-new
  stay ungated to avoid trapping a class-less teacher). `ClassroomContext` gained **session-only**
  (un-persisted) `activeClassroomId` + `absentStudents` with `setActiveClassroom` /
  `toggleStudentAttendance`, plus a cloud-persisted `markGameAsPlayedInClass` and a `useMarkGamePlayed`
  hook. *Scope choices:* selection/attendance are session-only (re-prompt each entry); only
  `playedGames` persists. The `Classroom` type moved to `game.types.ts` (re-exported for back-compat)
  and gained `playedGames: string[]` (legacy rows normalized to `[]`). `gameId` is threaded to each
  game through the Registry Map (`GamePage`) so all **five** games self-record on victory. The
  redundant in-game class picker was removed; `ComplimentGamePack` now auto-loads the active roster
  minus absentees.
- **2026-06-24 — Added `ComplimentTimeBomb` (7th game, "הפצצה המתקתקת של הפרגונים") from idea-pool
  `social-001`.** *Why:* the catalog lacked a high-energy, whole-class cooperative "beat the clock"
  social opener; a ticking-bomb compliment race fits the smartboard and warms up the room. *How:* §4a
  state machine (`setup→playing→win/lose`), timer-driven via a single 1s countdown `useEffect`
  (cleaned up on stage change). Implements the **hybrid names** flow on the setup screen — Scenario A
  auto-loads the active roster (minus absentees) behind an emerald "כיתה {name}" badge with an inline
  "הוסף תלמיד אורח" field; Scenario B falls back to a paste-in `TextField` (`parseNames`) so the game
  stays 100% playable without a class. Records via `useMarkGamePlayed` on `win` and fires `confetti`.
  Juice is asset-free: bouncy counter + screen-shake/red-pulse under 10s + a tiny Web-Audio `Sfx`
  helper (ding/tick) lazily started on the first user gesture, all wrapped in try/catch. First idea-pool
  → game conversion (Game-Factory loop over `src/data/ideas-pool/`).
- **2026-06-24 — Added `SilentNinja` (8th game, "הנינג'ה השקט") from idea-pool `social-002`.**
  *Why:* the catalog needed a short, active "brain break" that releases energy and then snaps the
  class back to focus — ideal after recess or before a test. *How:* §4a state machine
  (`setup→action→freeze→victory`); the `action` stage arms a single random 3–7s `setTimeout` (cleaned
  up on stage change) that "snaps" to a flashing red `freeze` with a Web-Audio gong. Same **hybrid
  names** contract as `ComplimentTimeBomb` (Scenario A auto-roster + guest field; Scenario B paste-in
  `TextField`). Names drive an optional elimination variant — in `freeze` the teacher taps movers out
  via chips, ending when ≤3 ninjas remain or after `MAX_ROUNDS`; with no names it falls back to a fixed
  5-round counter. Records via `useMarkGamePlayed` on `victory`, fires `confetti`, and crowns the
  surviving champions. Reuses the asset-free try/catch `Sfx` helper pattern (gong/snap).
- **2026-06-24 — Added `WouldYouRather` (9th game, "זה או זה? — משפט הכיתה") from idea-pool
  `social-003`.** *Why:* the catalog needed a low-prep physical-movement activity that surfaces
  classroom diversity and sparks discussion — "Would You Rather" is a classroom classic. *How:* §4a
  state machine (`setup→question→reveal→summary`). Split-screen `question` stage shows orange (A)
  and purple (B) panels; teacher uses ± steppers to enter vote counts. `reveal` shows animated
  `LinearProgress` bars (no chart library). After all dilemmas, `summary` builds a "class profile"
  label from the A-vs-B ratio across all rounds. Four content packs (humor / food / super-power /
  life dilemmas), each 5 dilemmas, shuffled per session. Same hybrid names contract (names serve as
  "total present" reference for percentage accuracy — physical-movement game so individual names don't
  drive mechanics). Pool's `targetAge: "junior_high"` mapped to taxonomy key `middle` (חטיבת ביניים).
  Records via `useMarkGamePlayed` on `summary` and fires `confetti` on summary transition.
- **2026-06-24 — Added `TwoTruthsLie` (10th game, "בלש השקרים של המורה") from idea-pool
  `social-004`.** *Why:* strengthens teacher-student bonds by making the teacher the "subject" —
  students feel they know an adult as a person. *How:* §4a state machine (`setup→timer→reveal→victory`).
  Setup screen has a teacher fact-entry form (3 TextFields) with a RadioGroup to secretly mark which
  is the lie. `timer` stage shows all 3 cards plus a `LinearProgress` countdown (60s, turns red under
  10s). `reveal` stage animates: truth cards flip to green, the lie card gets a CSS `@keyframes
  stampDrop` overlay (rotated red "שקר!" border box, scale bounce). Multi-round: after each reveal
  the teacher can enter a new set or go to victory. Records via `useMarkGamePlayed` on `victory`.
  Hybrid names present for class-badge context and guest additions but don't drive game mechanics.
- **2026-06-24 — Added `MindReaders` (11th game, "קריאת מחשבות כיתתית") from idea-pool
  `social-006` (batch-2).** *Why:* needed a "getting-to-know-you" game where student perspectives
  are genuinely surfaced — secrets create suspense; guessing builds empathy. *How:* §4a state machine
  with 6 stages (`names→pick_transmitter→transmit→class_vote→reveal→summary`). The "transmit" stage
  shows the question + 3 options; the transmitter secretly taps one — a 900ms `secretPulse` animation
  fires, then a `Fade` out hides their choice before the class sees. "Class vote" renders the same 3
  options for the class majority pick. Reveal stacks both labels (transmitter + class) on the same
  option chip when they match. Summary shows an animated `LinearProgress` telepathy meter + per-round
  breakdown. 8 shuffled questions, 3 per session. Hybrid names flow is load-bearing here (transmitter
  is always picked from the player list via name chips in `pick_transmitter`). Fires `confetti` on
  match reveals and celebrate() on summary if ≥66%.

- **2026-06-24 — Added `EmotionGenerator` (12th game, "מכונת הרגשות המשוגעת") from idea-pool
  `social-008` (batch-2). Skipped `social-007` (ConflictTimeMachine).** *Why:* needed a
  short, high-energy expressive game for emotional-regulation in a safe, humorous format. *How:*
  §4a state machine with 7 stages (`names→pick_actor→spin→peek→acting→reveal→summary`). The `spin`
  stage runs two independent slot-machine reels (`SlotReel`) via `setInterval` at 90ms cycling
  through their lists; after 2.2s they land on the pre-determined combo. The `peek` stage is
  actor-only: reveals the large emoji+label combo, then transitions to `acting`. Teacher triggers
  the reveal after watching the pantomime. 8 emotions × 10 actions (80 possible combos); combo
  picked at `pick_actor` time. Hybrid names drive the actor-selection chip grid; manual TextField
  fallback when no players listed.

- **2026-06-24 — Added `DigitalPassParcel` (14th game, "החבילה העוברת הדיגיטלית") from idea-pool
  `social-010` (batch-2).** *Why:* the catalog needed a physical/active icebreaker that also
  brings levity and peer encouragement — the classic pass-the-parcel mechanic is universally
  known and requires zero setup beyond a soft object. *How:* §4a state machine with 4 stages
  (`setup→playing→revealed→victory`). Three music styles (pop/circus/hip-hop) synthesized
  entirely via Web Audio `setInterval` note schedulers (no asset files) — each style has a
  distinct note pattern, tempo, and oscillator type (sine for pop/circus, square for hip-hop).
  A `MusicPlayer` singleton class handles `start(style)`, `stop()`, and a `rip()` method
  (white-noise burst via `createBuffer`) for the paper-rip SFX on task reveal. Auto-stop fires
  after a random 10–25s `setTimeout` stored in `autoStopRef`; the teacher can also manually
  press Stop at any time. `usedIndicesRef` (a ref, not state) tracks used tasks to avoid
  repeats without stale-closure issues in the timer callback. 5 rounds × 10 task cards
  (social/fun missions like making the teacher laugh, giving compliments, group movement).
  Gift box visual: colored `Box` with ribbon strips + 🎀 bow, pulsing `dppBounce` animation
  while music plays; wrap color cycles through 5 WRAP_COLORS per round. `Zoom` transition
  on task card reveal. Hybrid names: class badge + present-count (Scenario A) / paste-in
  TextField (Scenario B) — names are contextual, not mechanics-driving. Records via
  `useMarkGamePlayed` on `victory` + `celebrate()` confetti. Cleanup `useEffect` stops
  music and clears timer on unmount.

- **2026-06-24 — Added `RhymeExpress` (19th game, "רכבת החרוזים המהירה") from idea-pool
  `hebrew-015` (batch-3) — final game of batch-3.** *Why:* phonological awareness (the ability to
  hear and manipulate sound units in words) is foundational for reading; rhyme identification is a
  key early-literacy benchmark, and the train metaphor ("load the wagons with rhyming words")
  is concretely spatial and motivating for young children. *How:* §4a state machine
  (`setup→playing→victory`). Two difficulty presets — easy (simple ון/ה/ים rhyme families) and
  hard (ר/ור/ון) — each with 3 rounds. Each round has 1 target word displayed on the locomotive
  and 6 shuffled platform tiles (3 correct rhymes + 3 distractors). Teacher clicks platform tiles
  as students identify them: correct → tile greyed out + word appears in the next empty wagon
  with `@keyframes rrLoad` (spring scale-in); wrong → `@keyframes rrFall` (tumble-and-fade, 750ms
  timeout sets `failed: true`). When all 3 wagons fill (`loadedWords.every(w => w !== null)`), a
  train-whistle SFX fires + `@keyframes rrDepart` slides the whole train off-screen left (on the
  `dir="ltr"` train container), then after 1.4s advances to the next round or victory. Platform
  tiles are shuffled via Fisher-Yates in `initRound()` (called on round start). Victory screen:
  blue locomotive + 3 wagons emoji row + confetti. Hybrid names: class badge + present count
  (Scenario A) / paste-in TextField (Scenario B). Records via `useMarkGamePlayed` on `victory`.

- **2026-06-24 — Added `PunctuationOrchestra` (18th game, "תזמורת סימני הפיסוק") from idea-pool
  `hebrew-014` (batch-3).** *Why:* expressive oral reading is a core literacy skill; making it a
  whole-class "orchestra" with a conductor (the teacher) removes individual performance anxiety
  and makes vocal intonation practice fun and high-energy. *How:* §4a state machine
  (`setup→playing→victory`). The game has one piece of state that matters: `signIndex` — which
  of the 3 signs (`.` / `?` / `!`) is currently active. Each sign carries a `color`, `emoji`,
  and `instruction`. Teacher presses "החלף סימן" → `pickNextSign()` selects a different sign
  randomly, `TOTAL_ROUNDS (9)` counter increments, drama-meter `LinearProgress` fills. The
  `transitioning` flag (cleared after 450ms) drives `@keyframes poSwish` — a cubic-bezier
  spring bounce on the sign circle — and `@keyframes poPulse` (idle glow) when at rest. The
  sentence text is shown with the active sign appended in the matching color, giving the class
  a complete visual cue for how to read it. On the 9th change, a 700ms delay precedes confetti
  + victory transition. Setup offers 5 preset sentences and a custom-text TextField; the teacher
  can type any sentence in one second. No auto-timer — manual control lets the teacher pace
  according to class response. Hybrid names: class badge + present count (Scenario A) / paste-in
  TextField (Scenario B). Records via `useMarkGamePlayed` on `victory`.

- **2026-06-24 — Added `LetterBridge` (17th game, "גשר האותיות הסודיות") from idea-pool
  `hebrew-013` (batch-3).** *Why:* needed a concrete, visual mechanic for the most common
  elementary spelling confusions in Hebrew — homophonic letter pairs (א/ע, ח/כ, ט/ת, ס/ש)
  that sound identical and are frequently confused in writing. *How:* §4a state machine
  (`setup→playing→victory`). A bridge-crossing narrative: a cute koala 🐨 advances one plank
  per correct answer across 5 planks. Setup offers 4 letter-pair presets, each with 5 word
  puzzles. Each puzzle shows the word template with `?` at the ambiguous position (e.g. `?רנב`)
  and two large colored letter buttons (amber for first option, violet for second). Correct →
  ascending two-note chord, plank turns green, koala advances after 900ms. Wrong → descending
  "splash" SFX, CSS `@keyframes lbShake` (bounce-rotate) on the current plank, re-ask same
  word. Word templates are rendered by a helper `WordDisplay` sub-component that splits on
  `?` and injects an inline colored chip showing both letter options side-by-side. On wrong,
  the full correct word is also briefly revealed in red to reinforce learning. Victory triggers
  confetti + a green certificate Paper. `dir="ltr"` is set on the bridge container so the
  koala always travels visually left-to-right regardless of the app's RTL direction. Hybrid
  names: class badge + present count (Scenario A) / paste-in TextField (Scenario B). Records
  via `useMarkGamePlayed` on `victory`.

- **2026-06-24 — Added `SentenceDetectives` (16th game, "בלשי המשפטים המבולבלים") from idea-pool
  `hebrew-012` (batch-3).** *Why:* the catalog needed a sentence-structure game where children
  actively reconstruct a scrambled sentence — reinforcing Hebrew word order (subject-verb-object),
  the role of the period-bearing last word, and logical sentence meaning. *How:* §4a state machine
  (`setup→playing→victory`). Two difficulty presets — easy (3-word sentences) and hard (5-word
  sentences) — each with 3 pre-defined sentences. The last word of each sentence carries a "." so
  students can visually identify it as the sentence-ending word. Words are presented as colorful
  magnet-style `Paper` chips in a scrambled pool area (re-scrambled on each round using a
  Fisher-Yates shuffle, with retry until order differs from the correct answer). Teacher clicks
  chips from the pool → they move to the build zone below. Clicking a built word removes it back
  to the pool. Submit compares `builtWords.join(' ')` to `sentence.words.join(' ')`: correct →
  green glow + 3-note SFX + 1.5s delay before advancing; wrong → CSS `@keyframes sdShake` on the
  built zone + red background + 1.3s delay before re-scrambling. An undo button (removes the last
  built word) aids teacher UX. Victory screen renders a gold-bordered "detective certificate" Paper.
  Hybrid names: class badge + present count (Scenario A) / paste-in TextField (Scenario B) — names
  are contextual only, not mechanics-driving. Records via `useMarkGamePlayed` on `victory` +
  `celebrate()` confetti. Uses existing `hebrew` subject and `elementary_low` targetAge.

- **2026-06-24 — Added `HungryWordMonster` (15th game, "מפלצת המילים הרעבה") from idea-pool
  `hebrew-011` (batch-3).** *Why:* the catalog needed a Hebrew phonological-awareness game for
  early elementary (כיתות א-ב) that targets starting/ending letters in a high-energy, whole-class
  format. *How:* §4a state machine (`setup→playing→victory`). Four letter-focus presets — ב (start),
  מ (start), ש (start), ה (end) — each with 3 rounds of 5 word cards (3 correct + 2 distractors
  per round). Teacher taps cards to "feed" the monster; correct cards disappear (eaten) and fill
  the hunger meter (3 🍖 slots); incorrect cards shake and gray out (spat back). Monster face
  cycles through emoji states: 🤤 idle, 😋 eating, 🤢 rejecting, 🥳 round-complete. Round
  advancement is handled by a `useEffect` keyed on `fedCorrect.size` — when it reaches
  `CORRECT_PER_ROUND (3)`, it sets the `complete` monster state, plays a 3-note chime, and fires
  a 1.6s timeout to advance the round index (or transition to `victory` on the last round). A ref
  flag pattern (`shakingCard` state + 650ms timeout) drives the CSS `@keyframes mwmShake` on
  rejected cards without stale-closure issues. Hybrid names: Scenario A auto-loads active roster
  + guest-add field; Scenario B paste-in TextField — names serve as class-badge context only and
  do not drive mechanics. Records via `useMarkGamePlayed` on `victory` + `celebrate()` confetti.
  Uses the existing `hebrew` subject and `elementary_low` targetAge (no taxonomy changes needed).

- **2026-06-24 — Added `SilentSyncTower` (13th game, "מגדל הסינכרון השקט") from idea-pool
  `social-009` (batch-2).** *Why:* needed a non-verbal whole-class coordination challenge that
  builds synchrony and group awareness — the "stand up exactly N students simultaneously" mechanic
  forces students to read each other's body language without any communication. Perfect for training
  classroom focus and calm, deliberate energy. *How:* §4a state machine (`setup→playing→victory`).
  Three floor-count modes (3/5/7 floors with fixed target sequences). Visual tower: floors rendered
  top-to-bottom, tapering narrower for future floors, gold+checkmark for completed floors, indigo
  with a pulsing number for the current floor. Collapse triggers a CSS `sstShake @keyframes` on the
  entire tower container + descending-sawtooth SFX; success plays an ascending-triad chord; victory
  plays a 4-note arpeggio + confetti. `collapses` counter displayed as an error `Chip`. Teacher is
  the sole judge: two large buttons "הצלחנו! 🎉" / "נפסלנו 💥" — both disabled during the 1s
  post-collapse animation. Pool's `targetAge: "junior_high"` mapped to taxonomy key `middle`
  (same convention as social-003/WouldYouRather). Hybrid names: Scenario A auto-loads active roster
  + guest-add field; Scenario B paste-in TextField — names are for class-badge context only and do
  not drive mechanics. Records via `useMarkGamePlayed` on `victory`.