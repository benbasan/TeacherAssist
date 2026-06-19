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

Entry: `index.html` (`<html lang="he" dir="rtl">`) → `src/main.tsx` → `src/App.tsx`.

---

## 2. Directory Map

```
src/
├── App.tsx                     # Application shell: providers + router (route table)
├── main.tsx                    # React root render
├── components/layout/
│   ├── Navbar.tsx              # Sticky AppBar; links to "/" and "/whats-new"
│   └── GameWrapper.tsx         # Shared frame around every game (title, chips, back button)
├── data/
│   ├── games-registry.json     # SOURCE OF TRUTH: all games + metadata + componentName
│   ├── whats-new.json          # SOURCE OF TRUTH: "What's New" timeline entries
│   └── taxonomy.ts             # subject/targetAge → Hebrew labels + icon/color (catalog visuals)
├── games/
│   ├── ComplimentGamePack.tsx  # 3-mode game pack (internal state machine; see §4a)
│   ├── MathCodebreaker.tsx     # Math vault game (state machine: difficulty→game→unlocked; §4a)
│   ├── SocialDilemmas.tsx      # SEL dilemmas (topic→scenario→consequence→summary; §4a)
│   └── FocusDetectivesGame.tsx # Focus capsule (intro→playing[memorize/blink/recall/feedback]→summary; §4a)
├── pages/
│   ├── CatalogPage.tsx         # Grid of game cards; subject/targetAge filters
│   ├── GamePage.tsx            # Resolves a game by URL param → renders via Registry Map
│   └── WhatsNewPage.tsx        # Timeline rendered from whats-new.json
├── theme/
│   ├── educationalTheme.ts     # MUI theme (indigo/teal, Rubik, rtl, borderRadius 16)
│   └── rtlCache.ts             # Emotion cache for RTL CSS (key "muirtl")
└── types/
    └── game.types.ts           # EducationalGame, WhatsNewEntry contracts
```

---

## 3. Application Shell & Dynamic Routing

`src/App.tsx` composes the app as nested providers around the router:

```
<CacheProvider value={rtlCache}>        // RTL-correct CSS emission
  <ThemeProvider theme={educationalTheme}>
    <CssBaseline />
    <BrowserRouter>
      <Navbar />
      <Routes>
        "/"              → <CatalogPage />
        "/game/:gameId"  → <GamePage />
        "/whats-new"     → <WhatsNewPage />
        "*"              → <Navigate to="/" replace />   // unknown path → catalog
      </Routes>
    </BrowserRouter>
  </ThemeProvider>
</CacheProvider>
```

- **Why `BrowserRouter`:** clean history-API URLs; routing is fully client-side.
- **Why a `:gameId` param:** games are data, not code-defined routes. A single dynamic
  route serves *every* game; the page looks the game up at render time (§4). Adding a game
  never requires adding a route.
- **Why the `*` fallback:** any unknown/stale URL redirects to the catalog instead of a
  blank screen.

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

---

## 5. Data Flow (Single Source of Truth)

Type contracts in `src/types/game.types.ts`:
- **`EducationalGame`** — `id`, `title`, `description`, `targetAge`, `subject`,
  `estimatedTimeMinutes`, `componentName`.
- **`WhatsNewEntry`** — `id`, `date`, `title`, `shortDescription`, `gameId?`.

The registry stores compact keys for `subject` and `targetAge`. `src/data/taxonomy.ts` maps
those to Hebrew labels and to the catalog's visual identity (`subjectMeta()` → `{ label, icon,
color }`; `targetAgeLabel()`). This keeps presentation out of the data file while letting the
catalog/wrapper render a per-subject emoji icon and accent color.

Consumers (all render purely from data — never hard-code a game list):
- **`CatalogPage.tsx`** imports `games-registry.json` as `EducationalGame[]`, derives the
  subject + targetAge option lists, filters by them, and renders a card grid (icon/color from
  `taxonomy`). Each card links to `/game/${game.id}`.
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

## 7. Decision Log ("Why / How")

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
