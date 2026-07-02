# ARCHITECTURE.md — friendteach System Blueprint

This is the **living blueprint** of the system. It must always match the actual codebase.
Read it (and `CLAUDE.md`) before any change, and update it *first* for any structural,
routing, or architectural change. See **Decision Log** at the bottom for the "why/how"
behind significant choices.

---

## 1. Overview & Tech Stack

friendteach is a data-driven catalog of small, self-contained educational games for the
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
│   ├── AttendanceDrawer.tsx    # Right-anchored collapsible Drawer; per-student present/absent switches
│   └── TeacherWorkspaceLayout.tsx # Private-workspace shell: "do not project" banner + SignedIn gate (§10)
├── context/
│   └── ClassroomContext.tsx    # Multi-classroom state/cloud layer (Clerk unsafeMetadata; see §8)
├── utils/
│   └── parseNames.ts           # Shared roster parser (textarea → clean name list)
├── data/
│   ├── games-registry.json     # SOURCE OF TRUTH: all games + metadata + componentName
│   ├── tools-registry.json     # SOURCE OF TRUTH: Classroom Utilities (separate category; see §9)
│   ├── whats-new.json          # SOURCE OF TRUTH: "What's New" timeline entries (games only)
│   ├── taxonomy.ts             # subject/targetAge → Hebrew labels + icon/color (catalog visuals)
│   ├── lessonItems.ts          # Playlist resolver: game/tool id → {title,icon,Component} (§12)
│   └── content/                # Externalized game text pools, one per game (§11); also the brain-break tool pool
│       ├── brain-break-content.json         # BrainBreak tool: flat pool of 40+ exercises keyed by category (energize/calm), NOT age cohort (§9)
│       ├── social-speed-dating-content.json # ClassroomSpeedDating: age-cohort prompt packs + wrap-ups
│       ├── compliment-pack-content.json     # ComplimentGamePack: age-cohort solo + pair compliment prompts
│       ├── digital-pass-parcel-content.json # DigitalPassParcel: age-cohort social task cards
│       ├── emotion-generator-content.json    # EmotionGenerator: age-cohort emotion + action slot pools
│       ├── focus-detectives-content.json     # FocusDetectivesGame: age-cohort themed memory boards
│       ├── hungry-word-monster-content.json  # HungryWordMonster: 2 elementary cohorts of phonics/category focus sets
│       ├── letter-bridge-content.json        # LetterBridge: age-cohort homophone letter-pair word planks
│       ├── mind-readers-content.json         # MindReaders: age-cohort 3-option "what did they pick" questions
│       ├── punctuation-orchestra-content.json # PunctuationOrchestra: age-cohort readable sentence pool
│       ├── rhyme-express-content.json         # RhymeExpress: 2 elementary cohorts of rhyme rounds
│       ├── social-rumor-express-content.json  # RumorExpress: age-cohort story tiers (stories+facts) + reflection cards
│       ├── sentence-detectives-content.json   # SentenceDetectives: 2 elementary cohorts of scrambled-sentence pools
│       ├── silent-ninja-content.json          # SilentNinja: age-cohort movement-command pools
│       ├── social-dilemmas-content.json       # SocialDilemmas: age-cohort SEL topics → dilemmas → choices/consequences/questions
│       ├── spot-the-glitch-content.json       # SpotTheGlitch: age-cohort language-error topics (grammar/spelling/idioms)
│       ├── social-reflection-walk-content.json # StepByStepReflection: age-cohort SEL forward/backward statements + debrief cards
│       ├── two-truths-lie-content.json         # TwoTruthsLie: age-cohort example fact-set "inspiration bank"
│       ├── english-word-pop-content.json       # WordPop: age-cohort English→Hebrew vocab categories
│       └── would-you-rather-content.json       # WouldYouRather: age-cohort "this-or-that" dilemma packs
├── games/
│   ├── ComplimentGamePack.tsx  # 3-mode game pack (internal state machine; see §4a). Content externalized to data/content/compliment-pack-content.json (§11)
│   ├── MathCodebreaker.tsx     # Math vault game (state machine: difficulty→game→unlocked; §4a)
│   ├── SocialDilemmas.tsx      # SEL dilemmas (topic→scenario→consequence→summary; §4a). Topics/dilemmas externalized to data/content/social-dilemmas-content.json — 3 cohorts; icon names via ICON_MAP (§11)
│   ├── FocusDetectivesGame.tsx # Focus capsule (intro→playing[memorize/blink/recall/feedback]→summary; §4a). Memory boards externalized to data/content/focus-detectives-content.json; draws 3 random boards/play (§11)
│   ├── SpotTheGlitch.tsx       # Hebrew "spot the error" game (topic→board→reveal→summary; §4a). Topics/sentences externalized to data/content/spot-the-glitch-content.json — 3 cohorts; icon names via ICON_MAP (§11)
│   ├── WordPop.tsx             # English vocab arcade: float-up bubbles, pop the category (setup→playing→over; §4a). Vocab externalized to data/content/english-word-pop-content.json — 3 cohorts (§11)
│   ├── ComplimentTimeBomb.tsx  # Social bomb-countdown: tap "+1 פרגון!" to reach goal before time runs out (setup→playing→win/lose; §4a)
│   ├── SilentNinja.tsx         # Brain-break: movement command → random freeze → eliminate movers (setup→action→freeze→victory; §4a). Command pools externalized to data/content/silent-ninja-content.json — 3 cohorts (§11)
│   ├── WouldYouRather.tsx      # Split-screen vote dilemmas, teacher enters counts, animated result bars + class profile (setup→question→reveal→summary; §4a). Dilemma packs externalized to data/content/would-you-rather-content.json — 3 cohorts (§11)
│   ├── TwoTruthsLie.tsx        # Teacher enters 2 truths + 1 lie; 60s consultation timer; reveal with stamp animation (setup→timer→reveal→victory; §4a). Example "inspiration bank" externalized to data/content/two-truths-lie-content.json — 3 cohorts (§11)
│   ├── MindReaders.tsx         # Student picks secret answer; class votes; telepathy-meter summary (names→pick→transmit→class_vote→reveal→summary; §4a). Questions externalized to data/content/mind-readers-content.json — 3 cohorts, draws 6/play (§11)
│   ├── EmotionGenerator.tsx    # Slot-machine spins emotion+action combo; student acts in pantomime; class guesses (names→pick_actor→spin→peek→acting→reveal→summary; §4a). Slot pools externalized to data/content/emotion-generator-content.json (§11)
│   ├── SilentSyncTower.tsx     # Teacher-judged whole-class sync: N students must stand simultaneously; tower grows floor-by-floor, collapses on wrong count (setup→playing→victory; §4a)
│   ├── DigitalPassParcel.tsx   # Digital pass-the-parcel: built-in music plays then auto-stops randomly; holder gets a social task card (setup→playing→revealed→victory; §4a). Task cards externalized to data/content/digital-pass-parcel-content.json (§11)
│   ├── HungryWordMonster.tsx   # Hebrew phonology: monster eats words matching the chosen focus; hunger meter fills per correct feed (setup→playing→victory; §4a). Focus sets externalized to data/content/hungry-word-monster-content.json — 2 elementary cohorts, junior-high omitted (§11)
│   ├── SentenceDetectives.tsx  # Hebrew sentence structure: scrambled word magnets clicked into order; green glow on correct, shake+reset on wrong (setup→playing→victory; §4a). Sentence pools externalized to data/content/sentence-detectives-content.json — 2 cohorts, draws 3/play (§11)
│   ├── LetterBridge.tsx        # Hebrew spelling: koala crosses 5-plank bridge; each plank is a word with a missing homophonic letter; two big letter buttons; wrong = plank shake (setup→playing→victory; §4a). Letter pairs externalized to data/content/letter-bridge-content.json — 3 cohorts (§11)
│   ├── PunctuationOrchestra.tsx # Hebrew reading expression: giant sign cycles . ? ! on teacher click; class reads sentence with matching tone; drama-meter LinearProgress fills to victory (setup→playing→victory; §4a). Sentence pool externalized to data/content/punctuation-orchestra-content.json — 3 cohorts (§11)
│   ├── RhymeExpress.tsx        # Hebrew phonology: locomotive shows target word; 6 shuffled platform tiles (3 rhymes + 3 distractors); click correct → loads into wagon; train departs on full load (setup→playing→victory; §4a). Rhyme rounds externalized to data/content/rhyme-express-content.json — 2 cohorts, draws 3/play (§11)
│   ├── StepByStepReflection.tsx # SEL movement+reflection (Privilege-Walk adaptation): pick topic → forward "strengths" (emerald, ↑) → backward "challenges" (amber, ↓) → respectful debrief cards, NO confetti (setup→forward→backward→debrief; §4a). Statements/debrief externalized to data/content/social-reflection-walk-content.json — 3 cohorts (§11)
│   ├── ClassroomSpeedDating.tsx # Timed conversation+rotation icebreaker: pick age cohort + prompt pack + round duration → indigo countdown floor → teal "rotate one chair right" between 6 rounds → wrap-up discussion cards (setup→active→wrapup; §4a). Content externalized to data/content/social-speed-dating-content.json (§11)
│   └── RumorExpress.tsx        # Media-literacy/anti-rumor "telephone game": pick story tier → origin story with highlighted key facts → 45s transmission chain (3 reps, teacher peek) → Fact-Checker Lab split view + Information Integrity Meter → indigo/lavender fake-news debrief (setup→origin→chain→factcheck→reflection; §4a). Story tiers + reflection cards externalized to data/content/social-rumor-express-content.json — 3 cohorts (§11)
├── tools/                      # Classroom Utilities (NON-game tools; see §9)
│   ├── iconMap.tsx             # MUI icon-name string → icon component (tools' icon resolver)
│   ├── RosterPanel.tsx         # Shared hybrid-names ingestion (active roster ⊖ absent | manual)
│   ├── ToolWrapper.tsx         # Lightweight frame: title + description + back-to-/classroom (no chips)
│   ├── NameWheel.tsx           # Tool 1: Canvas wheel-of-fortune name picker
│   ├── TeamMaker.tsx           # Tool 2: shuffle + split class into groups/pairs
│   ├── MarbleJar.tsx           # Tool 3: cloud-persisted marble goal/reward tracker (§7, §9)
│   ├── ChoreBoard.tsx          # Tool 4: fair duty-roster board (cloud + guest fallback; §7, §9)
│   └── BrainBreak.tsx          # Tool 5: 2-min movement/mindfulness break generator; content in data/content/brain-break-content.json (§9)
├── teacher-tools/              # מרחב המורה — private, SignedIn-only back-office tools (§10)
│   ├── StudentInsights.tsx     # "תיק תלמיד": per-student pedagogical insight log + timeline
│   ├── CommunicationGenerator.tsx # WhatsApp summary generator + sent-message archive (§10)
│   └── LessonBuilder.tsx       # "אדריכל השיעור": build ordered game/tool playlists per class (§12)
├── pages/
│   ├── HomePage.tsx            # Landing gateway at "/": split-screen → /classroom | /teacher-workspace (§3)
│   ├── ClassroomWorkspacePage.tsx # מרחב הכיתה hub at /classroom: games catalog (subject + cohort ToggleButton filters) + STATIC utilities section (§3/§9)
│   ├── GamePage.tsx            # Resolves a game by URL param → renders via Registry Map (exports REGISTRY_MAP)
│   ├── ToolPage.tsx            # Resolves a tool by URL :toolId → renders via Tools Map (exports TOOLS_MAP; §9)
│   ├── PlaylistPlayerPage.tsx  # מרחב הכיתה playlist player at /classroom/play/:playlistId (§12)
│   ├── DashboardPage.tsx       # Teacher workspace: create/edit/delete saved classrooms (SignedIn)
│   ├── TeacherWorkspacePage.tsx # מרחב המורה dashboard: office-tool cards, dark corporate skin (§10)
│   └── WhatsNewPage.tsx        # Timeline rendered from whats-new.json
├── theme/
│   ├── educationalTheme.ts     # Default MUI theme (indigo/teal, Rubik, rtl, borderRadius 16) — gateway, navbar, classroom
│   ├── corporateTheme.ts       # Dark navy/slate theme for מרחב המורה (nested ThemeProvider; §10)
│   └── rtlCache.ts             # Emotion cache for RTL CSS (key "muirtl")
└── types/
    ├── game.types.ts           # EducationalGame, WhatsNewEntry, Classroom, LessonPlaylist contracts
    └── tool.types.ts           # ClassroomTool contract (utilities; §9)
```

---

## 3. Application Shell & Dynamic Routing

`src/App.tsx` composes the app as nested providers around the router:

```
<ClerkProvider publishableKey={VITE_CLERK_PUBLISHABLE_KEY}>   // auth + per-user cloud storage
  <CacheProvider value={rtlCache}>      // RTL-correct CSS emission
    <ThemeProvider theme={educationalTheme}>   // global (light) theme; teacher-workspace nests corporateTheme (§10)
      <CssBaseline />
      <ClassroomProvider>               // classroom + session state, inside Clerk so it can read useUser() (§8)
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>      // Navbar + AttendanceDrawer + <Outlet/>
              "/"              → <HomePage />     // split-screen landing gateway (ungated)
              "/classroom"     → <RequireActiveClass><ClassroomWorkspacePage /></RequireActiveClass>  // games + static utilities (§9)
              "/game/:gameId"  → <RequireActiveClass><GamePage /></RequireActiveClass>
              "/tools/:toolId" → <RequireActiveClass><ToolPage /></RequireActiveClass>          // gated; dynamic tool resolution (§9)
              "/classroom/play/:playlistId" → <RequireActiveClass><PlaylistPlayerPage /></RequireActiveClass>  // gated; lesson playlist player (§12)
              "/tools"         → <Navigate to="/classroom" replace />   // catalog merged into /classroom
              "/teacher-workspace" → <TeacherWorkspaceLayout/>   // ungated route, SignedIn-gated + dark corporateTheme inside (§10)
                  index               → <TeacherWorkspacePage/>     // office-tool dashboard
                  "student-insights"  → <StudentInsights/>          // private תיק תלמיד tool
                  "whatsapp-generator"→ <CommunicationGenerator/>   // parent summary + archive
                  "lesson-builder"    → <LessonBuilder/>            // Session Builder / אדריכל השיעור (§12)
              "/dashboard"     → <DashboardPage />   // ungated: a class-less teacher can still reach it
              "/whats-new"     → <WhatsNewPage />
              "*"              → <Navigate to="/" replace />   // unknown path → gateway
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
- **Why the `*` fallback:** any unknown/stale URL redirects to the landing gateway instead of a
  blank screen.

### Two environments (the split — §3a)
The root `/` is a **split-screen landing gateway** (`HomePage`) routing to two deliberately distinct
environments:
- **מרחב הכיתה** (`/classroom`, `ClassroomWorkspacePage`) — guest-open, playful pastel, smartboard-
  optimized. Merges the games catalog (filterable by `subject` + age **cohort**) with a permanent,
  filter-immune classroom-utilities section. Uses the default `educationalTheme`.
- **מרחב המורה** (`/teacher-workspace`) — Clerk-protected dark navy/slate dashboard (nested
  `corporateTheme`) with a sticky "do-not-project" privacy banner (§10).

The **age-cohort filter** shows three buckets (א'-ג' / ד'-ו' / ז'-י"ב). Because the registry's
`targetAge` keys are finer/overlapping, `taxonomy.ts` bridges them via `cohortsForTargetAge()` →
`CohortKey[]` (no data migration). The utilities section is rendered by a separate block with its own
state, so the game filters never touch it.

### Entry session flow (AppLayout + gateway + attendance)
All routes nest under a single **`AppLayout`** (`<Route element={<AppLayout/>}>`), which renders the
`Navbar`, the right-anchored collapsible **`AttendanceDrawer`**, and the routed content via `<Outlet/>`.
`AppLayout` owns the drawer's open/close state and hands a toggle to the `Navbar`.

The `/classroom`, `/game/:gameId`, and `/tools/:toolId` routes are wrapped in **`RequireActiveClass`**,
the **entry gatekeeper**:
- *Signed-in teacher, no active class selected* → render `ClassSelectionGateway` (a playful grid of
  the teacher's classes; clicking one calls `setActiveClassroom(id)` and unlocks the hub). A teacher
  with **zero** classes sees a CTA into `/dashboard`.
- *Signed out* → render the route as-is (the hub stays open to anonymous visitors / guests).

`/` (gateway), `/dashboard`, and `/whats-new` are deliberately **left ungated**. The `Navbar` shows a
`כיתה: … 🔄` chip (click to switch class → returns to the gateway) and an attendance toggle, both only
when a class is active. Active-class selection and attendance are **session-only** (in-memory) — see §7.

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
- **`Classroom`** — `id`, `name`, `students: string[]`, `playedGames: string[]`, plus the Marble Jar
  fields `marblesCount: number` (0), `marblesTarget: number` (30), `marblesReward: string`
  ("צ'ופר כיתתי"), and the Chore Board fields `customChoresList: string[]` (`DEFAULT_CHORES`) +
  `currentChoreAssignments: Record<string, string[]>` (`{}`), and the Student Insights field
  `studentInsights?: Record<string, StudentInsight[]>` (`{}`), the WhatsApp Generator field
  `whatsappHistory?: WhatsappMessage[]` (`[]`), and the Session Builder field
  `savedPlaylists?: LessonPlaylist[]` (`[]`) — all cloud-persisted per-teacher via Clerk; see §7.
  Re-exported from `ClassroomContext` for back-compat.
- **`LessonPlaylist`** — `id`, `title`, `gameAndToolIds: string[]` (ordered mix of games-registry
  and tools-registry ids; see §12).

The registry stores compact keys for `subject` and `targetAge`. `src/data/taxonomy.ts` maps
those to Hebrew labels and to the catalog's visual identity (`subjectMeta()` → `{ label, icon,
color }`; `targetAgeLabel()`). This keeps presentation out of the data file while letting the
catalog/wrapper render a per-subject emoji icon and accent color.

Consumers (all render purely from data — never hard-code a game list):
- **`ClassroomWorkspacePage.tsx`** (`/classroom`) imports `games-registry.json` as
  `EducationalGame[]`, derives the subject option list, filters by `subject` + age **cohort**
  (`cohortsForTargetAge`, §3), and renders a card grid (icon/color from `taxonomy`). Each card links
  to `/game/${game.id}`. When an active class has a game in its `playedGames`, the card shows a corner
  "שוחק כבר בכיתה זו 👍" `Chip` (emerald). The same page also renders the static utilities grid (§9).
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
  `Classroom { id, name, students: string[], playedGames: string[], marblesCount, marblesTarget,
  marblesReward, customChoresList, currentChoreAssignments, studentInsights, whatsappHistory, savedPlaylists }` (type in `src/types/game.types.ts`,
  re-exported from `ClassroomContext`). `playedGames` holds the ids of games this class has finished
  (catalog history badges, §5); the three `marbles*` fields hold the **Marble Jar** tool's per-class
  state and the two `chore*` fields hold the **Smart Chore Board** tool's roles + current assignments
  (§9) — *tool* state (not game history) persisted on a class. `unsafeMetadata` is the **client-writable** Clerk
  metadata bucket (writable straight from the browser via `user.update(...)`), which is exactly why it
  fits a serverless model. It is "unsafe" only in that the client can write it; that is acceptable here
  because class rosters are non-sensitive; the mildly-sensitive `studentInsights` is mitigated by being
  SignedIn-only, scoped to the teacher's own account, never projected (§10), and capped per student.
  Legacy classrooms are **normalized on read** in the
  `classrooms` `useMemo`: `playedGames` → `[]`, `marblesCount` → `0`, `marblesTarget` → `30`,
  `marblesReward` → `"צ'ופר כיתתי"`, `customChoresList` → `DEFAULT_CHORES`,
  `currentChoreAssignments` → `{}`, `studentInsights` → `{}`, `whatsappHistory` → `[]`,
  `savedPlaylists` → `[]`.
- **Single read/write layer:** `src/context/ClassroomContext.tsx` wraps `useUser()` and is the only
  place that touches the metadata. It **derives** `classrooms` from the live `user.unsafeMetadata`
  (Clerk's `user` is reactive and re-renders after each `user.update`, so no separate copy can go
  stale) and exposes async `addClassroom` / `updateClassroom` / `removeClassroom` /
  `markGameAsPlayedInClass`, each of which rewrites the whole `classrooms` array via
  `user.update({ unsafeMetadata: { ...user.unsafeMetadata, classrooms: next } })`.
  `markGameAsPlayedInClass(classId, gameId)` appends `gameId` (deduped) to that class's `playedGames`.
  The Marble Jar adds three more writers cut from the same cloth: `updateMarbles(classId, amount)`
  (clamps `marblesCount` to `[0, marblesTarget]`), `setMarbleGoal(classId, target, reward)` (sets the
  goal/reward and clamps a now-over-full count down to `target`), and `resetMarbleJar(classId)`
  (`marblesCount` → 0). The Smart Chore Board adds three more: `saveChoresConfig(classId, choresList)`
  (overwrites `customChoresList`, dropping assignments whose chore key was removed),
  `updateChoreAssignments(classId, assignments)` (overwrites the chore→students map), and
  `clearChoreAssignments(classId)` (→ `{}`). Student Insights adds two more:
  `addStudentInsight(classId, studentName, type, tag, note)` (appends `{id, date, type, tag, note}` and
  caps the student's array to the most recent **15** for the ~8KB metadata limit) and
  `deleteStudentInsight(classId, studentName, insightId)`. The WhatsApp Generator adds
  `addWhatsappToHistory(classId, text, tone)` (appends `{id, date, text, tone}`, capped to the most
  recent **10**) and `deleteWhatsappFromHistory(classId, messageId)`. The Session Builder adds
  `createPlaylist(classId, title, itemIds)` (appends `{id, title, gameAndToolIds}`, capped to the most
  recent **20**) and `deletePlaylist(classId, playlistId)`.
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

## 9. Classroom Utilities (כלים לניהול כיתה) — a separate, non-game category

Utilities are everyday teaching **tools** (pick a name, split into teams), **not** games. They have
**no score, no win/lose, no game-over, and no `playedGames` history** — they stay live on the board
until the teacher clicks "חזרה לקטלוג". The category deliberately mirrors the games architecture but
runs on its **own parallel contract** so the two domains stay decoupled:

| Concern        | Games                          | Utilities (this section) |
| -------------- | ------------------------------ | ------------------------ |
| Registry       | `data/games-registry.json`     | `data/tools-registry.json` |
| Type           | `EducationalGame`              | `ClassroomTool` (`types/tool.types.ts`) |
| Catalog surface | `ClassroomWorkspacePage` top section (`/classroom`) | same page, bottom static section (`/classroom`) |
| Dynamic route  | `/game/:gameId`                | `/tools/:toolId` |
| Resolver       | `REGISTRY_MAP[componentName]`  | `TOOLS_MAP[tool.id]` (`ToolPage.tsx`) |
| Frame          | `GameWrapper` (subject/time chips, records play) | `ToolWrapper` (title + description only) |
| Icon           | emoji via `taxonomy.ts`        | MUI icon **name** string via `tools/iconMap.tsx` |
| Gating         | `RequireActiveClass`           | `RequireActiveClass` (same as games) |
| "What's New"   | listed in `whats-new.json`     | **excluded** (see Decision Log) |

**`ClassroomTool`** = `{ id, title, description, icon }`. There is **no `componentName`** — a tool's
`id` doubles as both the URL param and the Tools-Map key (the registry is small and hand-curated, so
the extra indirection games need isn't worth it). `icon` is a **MUI Material icon name** (e.g.
`"auto_stories"`, `"groups"`); `tools/iconMap.tsx` resolves it to a component with a `BuildRounded`
fallback — the tools analogue of the games' emoji `taxonomy`.

**Resolution flow on `/tools/:toolId`** (`ToolPage.tsx`): `useParams()` → find entry in
`tools-registry.json` by `id` (not found → "הכלי לא נמצא") → `TOOLS_MAP[tool.id]` (not wired →
"הכלי קיים אך עדיין לא חובר") → render `<ToolWrapper tool={tool}><Component/></ToolWrapper>`. Same
two-stage 404 split as games (§4).

**Why gated (same as the games catalog):** utilities are class-centric — they operate on the active
roster — so a signed-in teacher must pick a class first. `/tools` and `/tools/:toolId` are wrapped in
`RequireActiveClass`, exactly like `/` and `/game/:gameId`: a signed-in teacher with no active class
sees the `ClassSelectionGateway` before reaching them. Because `RequireActiveClass` only gates
*signed-in* users, signed-out visitors still pass straight through and use the tools' manual
name-entry **guest mode** — identical to how the catalog stays open to anonymous visitors.

**Hybrid-names ingestion (shared `tools/RosterPanel.tsx`):** both tools take their roster the same way
recent games do (e.g. `ComplimentTimeBomb`): if a class is active, auto-load
`activeClassroom.students` minus `absentStudents` (+ an "add guest" field); otherwise a manual
paste-in `TextField` via `parseNames`. The logic is **extracted into one component** (rather than
inlined per tool as the games do) because the two tools share it verbatim; it renders the setup UI and
calls `onReady(names)` once `names.length >= min` (wheel `min=1`, team-maker `min=2`).

**The tools:**
- **`NameWheel.tsx`** (pure utility) — an HTML5 **Canvas** wheel-of-fortune. Sectors (one per present
  name) are drawn in the brand palette; "סובב את הגלגל! 🎡" spins via `requestAnimationFrame` with
  eased deceleration (~3–4s) onto a pre-picked random index. A winner `Dialog` (+ a small
  `canvas-confetti` burst) offers "הסר שם זה מהסיבובים הבאים" (drop from the pool so the same child
  isn't picked twice) and "סובב שוב".
- **`TeamMaker.tsx`** (pure utility) — Fisher-Yates shuffles the roster, then partitions by **Mode A**
  (target number of teams) or **Mode B** (students per team), chosen via a toggle + `Slider`. Renders
  a responsive grid of colored team cards (named "קבוצה N" or fun animal-team names); "ערבב מחדש 🔄"
  re-rolls.
- **`MarbleJar.tsx`** (**cloud-stateful** — the exception to the roster-only tools) — a positive-
  reinforcement goal tracker. Unlike tools 1–2 it reads/writes **per-class cloud state** via
  `updateMarbles` / `setMarbleGoal` / `resetMarbleJar` (§7), so progress survives reloads and shows in
  the navbar. Glass jar (`border:'4px solid #b2dfdb'`, `borderRadius:'0 0 40px 40px'`) fills with
  pastel marble circles (CSS `@keyframes mjDrop` animates only newly-mounted marbles); giant "+1"
  (teal) / "+3" (indigo) / "-1" controls; a collapsible config panel sets the goal (20/30/50) + reward
  text. At `marblesCount === marblesTarget` the controls are replaced by a celebratory view (confetti
  + success tone + "🏆 כל הכבוד! הצנצנת מלאה!" + reward + "התחל צנצנת חדשה 🔄" → reset). **Scenario A**
  (no active class — i.e. a signed-out guest, since `/tools` is gated) shows an `Alert` + a
  "בחרו או צרו כיתה" shortcut to `/dashboard`, because cloud persistence is the point of this tool. The
  `Navbar` shows a live `🫙 count/target` mini-indicator beside the active-class chip whenever a class
  is active.
- **`ChoreBoard.tsx`** (**cloud-stateful with a real guest fallback** — the first tool to do both) — a
  fair duty-roster board. In **class mode** it reads the present roster (students ⊖ absentees), and the
  class's `customChoresList` / `currentChoreAssignments`, persisting edits via `saveChoresConfig` /
  `updateChoreAssignments` / `clearChoreAssignments` (§7). In **guest mode** (signed out) it opens a
  split setup (names `TextField` + an editable chores `TextField` preloaded with `DEFAULT_CHORES`),
  then runs the same board on **local state** with no cloud writes. Both paths render one mode-agnostic
  `<Board>` fed by `{ names, chores, assignments }` + handlers. "סובב תורנויות! 🔄" validates
  `names ≥ chores`, runs a 2s name-flicker suspense (`setInterval`, cleaned up via refs), then
  Fisher-Yates-shuffles the present students and **round-robin** assigns them (`student[i] →
  chores[i % n]`) — even split, each student exactly once — and fires a `canvas-confetti` sparkle. A
  collapsible settings panel adds/deletes chore roles; "נקה לוח 🗑️" clears assignments; empty chores
  show "טרם שובצו תורנים ❓".
- **`BrainBreak.tsx`** (**content-driven, roster-free** — an "emergency context-reset") — the 2-Minute
  Brain Break Generator. Its pool lives in `data/content/brain-break-content.json` (§11-style
  externalization, but for a *tool*): a **flat array of 40+ exercises keyed by energy `category`
  (`energize`/`calm`), NOT by age cohort** — the teacher picks by the class's current *state*, so there
  is no age selector. Each item is `{ id, title, category, duration (60/90s), instructions: string[],
  icon }`; the `icon` string resolves via an in-component `ICON_MAP` (BuildRounded fallback). A
  `stage` machine (`setup → roulette → active → finish`): two oversized category `Card`s (amber
  ⚡ energize / lavender 🧘 calm) → a ~2s flicker "roulette" (`setInterval`, ref-cleaned) that lands on a
  random exercise → an **active** screen with a radial `CircularProgress` countdown (seconds centered,
  a per-second `bbTick` scale pulse), the instructions as big numbered bullets, and teacher
  **pause/resume** (a `running` flag gating the 1s interval, the ClassroomSpeedDating strategy) +
  **דלג/סיים** → **finish** (asset-free Web-Audio `chime()` + `canvas-confetti` +
  "🌟 מצוין! מאופסים ומרוכזים. חוזרים ללמידה!"). An optional **`onClose`** prop makes it embeddable: in
  the Playlist Player (§12) it renders inside a full-screen `Dialog` and swaps its return button /
  close-bar for a "חזרה לשיעור" action instead of navigating, so the paused game underneath is never
  reset. SFX is a small asset-free Web-Audio `Sfx` class (mirrors `ComplimentTimeBomb`/`SilentNinja`).

**Adding a utility:** (1) create the component in `src/tools/`; (2) add a `{ id, title, description,
icon }` entry to `tools-registry.json`; (3) register `id → Component` in `TOOLS_MAP` (`ToolPage.tsx`);
(4) if the entry uses a new icon name, add it to `tools/iconMap.tsx`. No `whats-new.json` entry, no
`taxonomy.ts` change.

---

## 10. Teacher's Private Workspace (מרחב המורה)

A **third top-level category**, separate from the student-facing smartboard games and `/tools`
utilities: a private teacher back-office that must **never be projected** in class. First tool: the
**Student Insights** log (`src/teacher-tools/StudentInsights.tsx`).

- **Routing:** a layout route `/teacher-workspace` (`TeacherWorkspaceLayout`) nested under `AppLayout`,
  with child routes `index` → `TeacherWorkspacePage` (office-tool dashboard) and `student-insights` →
  `StudentInsights`. Like `/dashboard` the route is **ungated by `RequireActiveClass`**, but the layout
  **gates its content behind Clerk `<SignedIn>`** (a `<SignedOut>` sign-in prompt otherwise) because it
  holds student data. The layout also renders a **sticky privacy banner** ("🔒 שולחן עבודה פרטי
  ומאובטח… אין להקרין אותו על הלוח החכם…", amber-accented, parks beneath the navbar) on every
  workspace page.
- **Dark corporate skin:** the layout nests `<ThemeProvider theme={corporateTheme}>` +
  `<ScopedCssBaseline>` (dark navy/slate, low radius, thin crisp borders) so this subtree is visually
  unmistakable from the playful classroom surface. The global app theme stays `educationalTheme`; the
  shared `Navbar` (rendered by `AppLayout`, outside this subtree) keeps its indigo skin.
- **Navbar:** a distinct, SignedIn-only "💼 מרחב המורה (פרטי)" **amber-accented** outlined link with a
  lock icon + Tooltip ("שולחן עבודה פרטי - לא להקרנה בכיתה"), active for
  `pathname.startsWith('/teacher-workspace')`.
- **Decoupled class selection (key design choice):** `StudentInsights` keeps a **local**
  `selectedClassId` (seeded from `activeClassroomId` but it **never calls `setActiveClassroom`**), so
  reviewing records — possibly at home — does not disturb the smartboard teaching session / attendance.
  No active class? It shows a class picker over the teacher's saved `classrooms` (or a link to
  `/dashboard` if none exist).
- **UI:** professional/crisp (plain `Paper`/`Divider`, no pastel gradients/confetti). RTL split via a
  `Box` CSS-grid `{ xs:'1fr', md:'300px 1fr' }` — first column renders on the right (student roster
  `List` with per-student insight-count chips); the left main pane is the selected student's profile:
  summary counts, a log form (type `ToggleButtonGroup` 👍/📝/⚠️ + a type-scoped tag `Select` + note),
  and a **custom vertical timeline** (newest first) with color-coded type icons, tag chip, note, date,
  and a delete button.
- **Persistence:** per-class via `studentInsights` on `Classroom` (§7), written with
  `addStudentInsight` (capped to the latest **15/student**) / `deleteStudentInsight`.
- **No `@mui/lab`:** the brief allowed "`@mui/lab/Timeline` **or** a vertical list"; since `@mui/lab`
  isn't a dependency, the timeline is hand-built from MUI core — no new dependency, no build risk.

**Second tool — `CommunicationGenerator.tsx` ("מחולל סיכומי וואטסאפ"):** generates a weekly parent
message and keeps a cloud archive of sent ones. Same local-class-selection pattern as `StudentInsights`.
A tone `ToggleButtonGroup` (חגיגי/ענייני/מעודד/רגוע) drives an **auto-drafted** Hebrew summary —
`generateDraft` pulls the class's recent **positive** `studentInsights` as highlight bullets (graceful
generic line if none) — shown in an editable `TextField` with a live **simulated WhatsApp phone
preview**. "שגר ישירות לוואטסאפ" opens the `wa.me` deep link **and** archives; "סמן כנשלח ושמור
בארכיון" archives only — both via `addWhatsappToHistory` (§7, capped to 10). The **"📜 ארכיון הודעות
שנשלחו"** section under the preview lists past messages newest-first as `Accordion`s (Hebrew date +
color-coded tone `Chip`), each with "העתק מחדש" (`navigator.clipboard` + `Snackbar`) and "מחק"
(`deleteWhatsappFromHistory`).

**Third tool — `LessonBuilder.tsx` ("אדריכל השיעור"):** the Session Builder — see §12.

**Adding a workspace tool:** create it under `src/teacher-tools/`, add a child route under
`/teacher-workspace`, and add a card to `TeacherWorkspacePage` (give it a `to` — the card auto-enables
when `to` is present, and shows a "בקרוב" chip otherwise).

---

## 11. Externalized Game Content (`data/content/`)

Game **text pools** (prompts, questions, statements) are moving out of the `.tsx` components and into
per-game JSON under `src/data/content/[game-id]-content.json`, where `game-id` is the game's registry
`id`. This decouples *content* from *mechanics*: an educator can enrich the pool without touching React
code, and the pool can be reviewed/translated/audited as plain data.

**Schema** — each content file is an object keyed by the three classical age cohorts:
- `lower_elementary` (כיתות א'-ג'), `upper_elementary` (כיתות ד'-ו'), `junior_high_high` (כיתות ז'-י"ב).

Each cohort holds the game-shaped content for that tier. A cohort is included **only where
pedagogically applicable** to the game's mechanics; omit a tier that doesn't fit but keep the grand
total above **40** unique items (the launch-density rule, see `CLAUDE.md` → "Game Content &
Architecture Rules").

**Component contract:** the game `import`s its JSON, casts it to a typed shape, lets the teacher pick
an **age cohort** at setup, and renders the pool for the selected cohort. No content arrays remain in
the component.

**First migration — `social-speed-dating-content.json`** (`ClassroomSpeedDating`): each cohort has
`{ label, packs: ConversationPack[], wrapup: string[] }`, where a `ConversationPack` is
`{ key, label, blurb, emoji, color, prompts: string[] }`. The setup screen gained an age-cohort
`ToggleButtonGroup` (default `upper_elementary`); selecting a cohort swaps the pack cards and resets
the pending pack pick. The wrap-up screen receives the cohort's `wrapup` array. 62 items total
(53 conversation prompts + 9 wrap-ups) across all three cohorts.

**Second migration — `compliment-pack-content.json`** (`ComplimentGamePack`): each cohort has
`{ label, solo: string[], pair: string[] }` — `solo` feeds the Chain and Slot modes (one student
compliments another), `pair` feeds the Duo mode (two students share mutually). The root state machine
holds the `ageGroup` (default `lower_elementary`, matching the game's `elementary_low` registry tier),
the `NamesInput` setup screen gained an age-cohort `ToggleButtonGroup`, and the pools are threaded into
the modes (`buildChain`/`buildGroups` now take the prompt pool as a parameter). 44 items total
(26 solo + 18 pair) across all three cohorts.

**Third migration — `digital-pass-parcel-content.json`** (`DigitalPassParcel`): each cohort has
`{ label, tasks: { emoji, text }[] }`. The hardcoded `TASKS` array was removed; the component holds an
`ageGroup` (default `lower_elementary`), the setup screen gained an age-cohort `ToggleButtonGroup`
(switching it clears the used-task ledger), and `pickTask` draws from `CONTENT[ageGroup].tasks`. 45
task cards total (16 lower / 15 upper / 14 junior-high-high, the older tier retuned away from juvenile
"dance/jumping" tasks toward connection + light reflection). Visual/audio config (`WRAP_COLORS`,
`MUSIC_STYLES`, `NOTE_PATTERNS`) stays in-component — it is mechanics, not pedagogical content.

**Fourth migration — `emotion-generator-content.json`** (`EmotionGenerator`): each cohort has
`{ label, emotions: SlotItem[], actions: SlotItem[] }` (`SlotItem = { label, emoji }`). The hardcoded
`EMOTIONS`/`ACTIONS` arrays were removed; `spinCombo` and the slot reels draw from
`CONTENT[ageGroup]`. The root now **always starts at the `names` setup screen** (previously it
auto-skipped to `pick_actor` when a class was active) so the age-cohort `ToggleButtonGroup` — added to
that screen — is always reachable. 50 slot items total (24 emotions + 26 actions), retuned per tier:
concrete everyday actions for the youngest, relatable teen scenarios (job interview, waiting on a text,
TikTok dance) and nuanced emotions (embarrassment, relief, nostalgia) for the oldest.

**Fifth migration — `focus-detectives-content.json`** (`FocusDetectivesGame`): each cohort has
`{ label, rounds: Round[] }` where `Round = { theme, emojis[9], pool[9] }`. The hardcoded 3-element
`ROUNDS` array was replaced by a per-cohort **pool of 6 themed memory boards** (18 boards total, ≈324
emoji tokens); each playthrough draws `ROUNDS_PER_GAME` (3) random boards via `shuffle().slice()`, so
replay value rose sharply. `buildRound` now takes a `Round` (not an index); `PlayingScreen` holds the
drawn `gameRounds` and reports its length as the score denominator; `SummaryScreen` takes a `total`
prop (its message thresholds switched from hardcoded `=== 3 / === 2` to `=== total / >= total-1`). The
INTRO screen gained the age `ToggleButtonGroup`. Older tiers use harder, more confusable sets (math
symbols, arrows, hand gestures) to push attention. `CARD_COLORS` stays in-component (mechanics).

**Sixth migration — `hungry-word-monster-content.json`** (`HungryWordMonster`): keyed by **only two**
cohorts (`lower_elementary`, `upper_elementary`); the `junior_high_high` tier is **omitted** because
"feed the monster words that start with ב" is inherently a beginning-literacy mechanic — the first
applied case of the §11 "omit a tier that doesn't fit" rule. Each cohort has
`{ label, focusSets: FocusSet[] }` (`FocusSet = { emoji, label, rounds }`, `RoundData = { cry, words }`,
`WordCard = { text, correct }`). The hardcoded `FOCUS_SETS` array was removed; the component holds an
`ageGroup` (default `lower_elementary`), the setup screen gained an age `ToggleButtonGroup` (resets the
selected focus on change), and `focusSets`/`currentFocusSet` resolve from `CONTENT[ageGroup]`. 135 word
items total across 9 focus sets / 27 rounds — lower tier is initial/final-sound sets (ב/מ/ש/א, ends-in-ה),
upper tier adds richer discrimination (category sorting "animals only" / "food only", final sofit
letters, words containing צ). `CARD_COLORS`/`CARD_BORDERS` stay in-component (mechanics).

**Seventh migration — `letter-bridge-content.json`** (`LetterBridge`): all three cohorts apply —
homophone-spelling discrimination stays relevant through high school with harder vocabulary. Each
cohort has `{ label, letterPairs: LetterPair[] }` (`LetterPair = { letters: [string,string], label,
emoji, planks }`, `PlankData = { template, answer: 0|1, full }`). The hardcoded `LETTER_PAIRS` array
was removed; the component holds an `ageGroup` (default `lower_elementary`), the setup screen gained an
age `ToggleButtonGroup` (resets the selected pair on change), and `letterPairs`/`currentPair` resolve
from `CONTENT[ageGroup]`. 55 word planks total across 11 letter-pairs: lower = basic pairs/common words
(א/ע, ח/כ, ט/ת, ס/ש), upper = harder words + the ק/כ homophone, junior = abstract vocabulary
(הערכה, אחריות, תכלית, קריטריון…). The JSON's `string[]`/`number` literals are narrowed to the tuple/
`0|1` types via the whole-object `as` cast (assignable in one direction, so the cast is legal).

**Eighth migration — `mind-readers-content.json`** (`MindReaders`): each cohort has
`{ label, questions: Question[] }` (`Question = { text, options: [string,string,string] }`). The
hardcoded 8-item `QUESTIONS` array was removed; the root holds an `ageGroup` (default
`upper_elementary`, matching the `elementary_high` registry tier) and — like `EmotionGenerator` — now
**always starts at the `names` screen** (it previously auto-skipped to `pick_transmitter` when a class
was active) so the age `ToggleButtonGroup` added there is reachable. `questions` became settable state,
filled in `confirmNames` via `shuffle(CONTENT[ageGroup].questions).slice(0, ROUNDS*2)`. 42 questions
total (14/cohort), tuned: concrete favorites for the youngest, identity/future/social reflection for
the oldest. The JSON `string[]` options are narrowed to the 3-tuple via `as unknown as`.

**Ninth migration — `punctuation-orchestra-content.json`** (`PunctuationOrchestra`): each cohort has
`{ label, sentences: string[] }`. The hardcoded 5-item `PRESET_SENTENCES` array was removed; the
component holds an `ageGroup` (default `lower_elementary`), the setup screen gained an age
`ToggleButtonGroup` (resets the selected preset + custom flag on change), and `presetSentences` resolves
from `CONTENT[ageGroup]`. 42 sentences total (14/cohort): concrete short statements for the youngest,
richer ones for upper, and **expressive/dramatic statements for the junior-high/high tier** so it reads
as a theatre/prosody warm-up rather than a juvenile exercise. The 3 punctuation `SIGNS` (., ?, !) stay
in-component — they are the fixed core mechanic, not an enrichable pool. The custom-sentence field is
unchanged (teachers can still type their own).

**Tenth migration — `rhyme-express-content.json`** (`RhymeExpress`): keyed by **only two** cohorts
(rhyming is a beginning-literacy skill; `junior_high_high` omitted). Each cohort has
`{ label, rounds: RoundData[] }` (`RoundData = { target, correct[3], wrong[3] }`). The hardcoded
`ROUNDS` object — which had keyed the game's own `easy`/`hard` **difficulty** — was removed and that
difficulty selector was **repurposed as the age-cohort selector** (lower = simple rhymes, upper =
harder), since the difficulty *was* the age tiering. Each cohort grew to a **6-round pool**; a play
draws `ROUNDS_PER_GAME` (3) at random via `shuffleArr().slice()`, stored in `gameRounds` state.
`initRound` now takes a `RoundData` (not an index+difficulty). 12 rounds total / 84 word tokens.
`TILE_COLORS`/`TILE_BORDERS` and SFX stay in-component (mechanics).

**Eleventh migration — `social-rumor-express-content.json`** (`RumorExpress`): the game's own three
tiers (`elementary`/`pre_teen`/`junior_high`) were **renamed to the standard cohort keys** and moved to
JSON. Each cohort has `{ label, blurb, emoji, color, stories: Story[], reflectionCards: ReflectionCard[] }`
(`Story = { text, facts }` where **every fact is a verbatim substring of `text`** — the `highlightFacts`
contract; `ReflectionCard = { emoji, color, body }`). The hardcoded `TIERS` map became
`CONTENT = contentData as Record<AgeGroupKey, TierContent>` plus a derived `TIERS: Tier[]` array
(`TIER_KEYS.map(k => ({key:k, ...CONTENT[k]}))`); `SetupScreen` now maps the array and `selected` is an
`AgeGroupKey`. `REFLECTION_CARDS` moved into each cohort (tuned by age) and is threaded to
`ReflectionScreen` via a `cards` prop. Stories grew 12→24 (8/cohort, ~130 tracked facts) and reflection
prompts 3→9. The story tier IS the age cohort, so no separate selector was added — the existing tier
picker serves. `highlightFacts` and the chain/fact-check mechanics stay in-component.

**Twelfth migration — `sentence-detectives-content.json`** (`SentenceDetectives`): keyed by **only two**
cohorts (sentence-building is beginning-grammar; `junior_high_high` omitted). Each cohort has
`{ label, desc, sentences: Sentence[] }` (`Sentence = { words: string[], emoji }`; the last word carries
a "." marker). The hardcoded `SENTENCES` object — which had keyed the game's own `easy`/`hard`
**difficulty** — was removed and that difficulty selector **repurposed as the age-cohort selector**
(lower = 3–4-word sentences, upper = 5–7), mirroring the `RhymeExpress` move. Each cohort grew to a
**7-sentence pool**; a play draws `ROUNDS_PER_GAME` (3) at random into `gameSentences` state. `shuffle`
was generalized to `<T>` to shuffle sentence objects, and a `if (!sentence) return null` guard sits
before the playing render (gameSentences is empty during setup). 14 sentences / 58 word tokens.
`CHIP_PALETTE`/SFX stay in-component.

**Thirteenth migration — `silent-ninja-content.json`** (`SilentNinja`): each cohort has
`{ label, actions: string[] }`. The hardcoded `ACTIONS` array was removed; the root holds an `ageGroup`
(default `lower_elementary`), the setup screen gained an age `ToggleButtonGroup`, and `nextAction` draws
from `CONTENT[ageGroup].actions`. 42 movement commands total (14/cohort): playful animal-imitation moves
for the youngest, coordination/sport moves for upper, and stretch/balance/energy-release moves for the
oldest (less childish). The initial `action` state seeds from `CONTENT.lower_elementary.actions[0]`. SFX
stays in-component.

**Fourteenth migration — `social-dilemmas-content.json`** (`SocialDilemmas`): each cohort has
`{ label, topics: Topic[] }`; `Topic = { key, label, icon, color, dilemmas }`,
`Dilemma = { headline, scenario, choices }`, `Choice = { label, color, empathyDelta, shortTerm,
longTerm, questions: [string,string] }`. **First migration where a non-serializable field had to be
transformed:** `Topic.icon` was a React component (`typeof ParkRoundedIcon`); it became an **icon-name
string** resolved at render via a new `ICON_MAP` (`park`/`smartphone`/`handshake`/`favorite` →
component), exactly the tools' `iconMap.tsx` pattern (§9). The hardcoded `TOPICS` array was removed; the
root holds an `ageGroup` (default `upper_elementary`, matching the `elementary_high` registry tier) and
passes `CONTENT[ageGroup].topics` to `TopicScreen`, which gained an age `ToggleButtonGroup`.
`upper_elementary` keeps the original 3 topics × 3 dilemmas; `lower_elementary` (2 topics × 2) and
`junior_high_high` (2 topics × 2) are new, age-tuned. 17 dilemmas / 51 choices / 102 discussion
questions total. `EmpathyMeter` and the meter-glide mechanics stay in-component.

**Fifteenth migration — `spot-the-glitch-content.json`** (`SpotTheGlitch`): each cohort has
`{ label, topics: GlitchTopic[] }`; `GlitchTopic = { key, label, blurb, icon, color, sentences }`,
`Sentence = { text, hasGlitch, correction }`. Like `SocialDilemmas`, `GlitchTopic.icon` was a React
component and became an **icon-name string** resolved via an `ICON_MAP`
(`spellcheck`/`menu_book`/`auto_stories`). The hardcoded `TOPICS` array was removed; the root holds an
`ageGroup` (default `lower_elementary`) and passes `CONTENT[ageGroup].topics` to `TopicScreen`, which
gained an age `ToggleButtonGroup`. Cohorts escalate: lower = grammar + spelling (gender/number,
sound-alike letters); upper adds idioms + harder words; junior = syntax agreement, precise spelling
(החליטה/החליתה, נדחתה), and idiom precision. 42 sentences total across 8 topic-instances.

**Sixteenth migration — `social-reflection-walk-content.json`** (`StepByStepReflection`): each cohort has
`{ label, topics: ReflectionTopic[], debrief: DebriefCard[] }`; `ReflectionTopic = { key, label, blurb,
emoji, color, forward[], backward[] }` (emoji is plain text, no icon-map needed), `DebriefCard =
{ emoji, title, body }`. The hardcoded `TOPICS` map + `DEBRIEF_QUESTIONS` were removed; the root dropped
the `topicKey` indirection and now stores the **selected `ReflectionTopic` object** directly. It holds an
`ageGroup` (default `upper_elementary`), passes `CONTENT[ageGroup].topics` to `SetupScreen` (which gained
an age `ToggleButtonGroup`) and `CONTENT[ageGroup].debrief` to `DebriefScreen` (now via a `cards` prop).
54 forward/backward statements (3 cohorts × 3 topics × 6) + 9 debrief cards. Cohorts escalate: concrete
home/play for the youngest → responsibility/pressure/belonging + identity for the oldest.

**Seventeenth migration — `two-truths-lie-content.json`** (`TwoTruthsLie`): this game is **input-driven**
(the teacher types their own 2 truths + 1 lie), so its only hardcoded text was the 3-item
`PLACEHOLDER_FACTS` hint array. Rather than skip it, that array was promoted to a genuinely useful
age-tiered **inspiration bank**: each cohort has `{ label, examples: ExampleSet[] }`
(`ExampleSet = { facts: [string,string,string], lieIndex: 0|1|2 }`). The age/example logic lives entirely
in `SetupScreen` (it isn't game-loop state): an age `ToggleButtonGroup` selects the cohort, the field
placeholders show `currentExample.facts[i]`, and a new **"מלאו דוגמה להשראה 💡"** button fills the three
fields + lie radio from the current example and advances to the next idea. 24 example sets / 72 fact
statements (8/cohort). The fact-entry, timer, and reveal mechanics are unchanged.

**Eighteenth migration — `english-word-pop-content.json`** (`WordPop`): each cohort has
`{ label, categories: Record<Category, CatData> }` (`CatData = { en, he, emoji, words: {en,he}[] }`).
The hardcoded `CATEGORIES` map + `CATEGORY_KEYS` were removed; `Category` widened from a literal union to
`string` (keys now differ per cohort). The root holds an `ageGroup` (default `lower_elementary`); the
real-time spawner reads `CONTENT[ageGroup].categories` (and `Object.keys` for distractor categories) —
`ageGroup` was added to the loop `useEffect` deps. `SetupScreen` gained an age `ToggleButtonGroup` and
maps the cohort's categories; `OverScreen` now takes the resolved `CatData` (not a key). 9 categories /
78 word pairs: lower = animals/food/colors (basic), upper = school/body/sports, junior =
feelings/technology/nature. `BUBBLE_COLORS` and the bubble physics stay in-component.

**Nineteenth migration — `would-you-rather-content.json`** (`WouldYouRather`): each cohort has
`{ label, packs: Record<string, PackData> }` (`PackData = { label, icon, dilemmas: {a,b}[] }`; `icon` is
a plain emoji string). The hardcoded `PACKS` map + `PACK_KEYS` were removed; the root holds an `ageGroup`
(default `upper_elementary`) and resolves `CONTENT[ageGroup].packs`. `SetupScreen` gained an age
`ToggleButtonGroup` and a validity guard (`activePackKey` falls back to the first key when the cohort
changes and the prior pack key no longer exists); `SummaryScreen` now takes the resolved `PackData`. 44
dilemmas / 88 statements: lower = silly/concrete, upper = the original 4 packs, junior = life/future/values.
`CLASS_PROFILES` (percentage-keyed result feedback) stays in-component — it's outcome logic, not a prompt
pool, like win/lose copy.

**This (§11) sweep is complete** — all 22 games in `src/games/` were processed: **19 migrated** to
`data/content/*.json`, and **3 deliberately skipped** because they have no externalizable text pool
(`ComplimentTimeBomb` — pure counter; `MathCodebreaker` — procedurally-generated riddles; `SilentSyncTower`
— numeric floor targets). Every migrated game gained an age-cohort selector and renders its pool from the
selected cohort.

**Migrating a game's content:** (1) create `src/data/content/[game-id]-content.json` with the
cohort-keyed schema; (2) remove the in-component arrays and `import` the JSON; (3) add an age-cohort
selector if the game lacks one; (4) render dynamically from the selected cohort. If a field is a React
component (e.g. an icon), store a **name string** in JSON and resolve it via an in-component map.
For input-driven games with no gameplay pool, externalize the **example/placeholder** hints as an
age-tiered inspiration bank instead of skipping. For real-time loops, add `ageGroup` to the loop's
`useEffect` deps. Requires `resolveJsonModule` (already enabled for the registry imports) — no
build-config change.

---

## 12. Lesson Playlists / Session Builder (אדריכל השיעור)

A **cross-environment** feature spanning both skins: the teacher **builds** an ordered sequence of
activities in the private מרחב המורה back-office, then **plays** it seamlessly in class from the
מרחב הכיתה smartboard surface — advancing between activities with a single top-bar click, never
returning to the catalog mid-lesson.

**Data model.** A playlist is a `LessonPlaylist { id, title, gameAndToolIds: string[] }`
(`src/types/game.types.ts`); `gameAndToolIds` is an **ordered mix of games-registry ids AND
tools-registry ids** (a playlist can interleave games and utilities). Playlists live per-class in
`Classroom.savedPlaylists`, Clerk-persisted like every other class field (§7) — no localStorage, no
new persistence layer. Written via `createPlaylist` / `deletePlaylist` (capped to 20/class).

**Shared resolver (`src/data/lessonItems.ts`).** `resolveLessonItem(id)` bridges an id to
`{ kind: 'game'|'tool', title, description, emoji|iconName, color, Component }` by looking it up in
`games-registry.json` (→ `REGISTRY_MAP[componentName]`) first, else `tools-registry.json` (→
`TOOLS_MAP[id]`), else `null`. It **reuses the exact maps** the single-activity pages use — hence
`REGISTRY_MAP` (`GamePage.tsx`) and `TOOLS_MAP` (`ToolPage.tsx`) are now **exported**.
`ALL_LESSON_ITEMS` (all games then all tools) is the builder's "available activities" catalog.

**Builder — `src/teacher-tools/LessonBuilder.tsx`** (dark corporate skin, SignedIn-gated by the
layout). Uses the same **local, session-decoupled class picker** as `StudentInsights` (seeds from
`activeClassroomId`, never calls `setActiveClassroom`, so building a lesson at home doesn't disturb a
live session). A name `TextField` + a two-column grid: right = `ALL_LESSON_ITEMS` with
"הוסף לשיעור ➕" (duplicates allowed); left = the ordered queue with ↑/↓ reorder + delete. Saves via
`createPlaylist`; an archive below lists saved playlists (item chips + delete).

**Player — `src/pages/PlaylistPlayerPage.tsx`** at `/classroom/play/:playlistId` (classroom pastel
skin, gated by `RequireActiveClass` like the rest of `/classroom`). Finds the playlist in
`activeClassroom.savedPlaylists` (friendly fallback for guest/stale ids). A sticky gradient **top bar**
(title · `פעילות N מתוך M` · giant "עבור לפעילות הבאה בשיעור ➡️" button) drives an `index` state; a
20%/80% split renders a **sidebar tracker** (✅ done / 🎯 current / ⏳ upcoming, click to jump) beside
the **active activity**, which mounts the resolved component **keyed on `index`** (`gameId` for games /
`toolId` for tools) so each transition fully remounts fresh state. Past the last item → a celebratory
"שיעור מושלם! כל הכבוד כיתה!" summary (`canvas-confetti`) + replay/back buttons. *Caveat:* a few games
have an internal `navigate('/')`; tapping it mid-lesson exits the player — acceptable for v1.

An **emergency "⚡ הפגת בזק!" `Fab`** (fixed bottom-right, red/amber) opens a full-screen `Dialog` that
mounts the `BrainBreak` tool (§9) over the running activity. Because the active activity stays mounted
(the Dialog is a portal sibling), the game keeps its exact state — the teacher runs a 60–90s break and
closes the modal to resume precisely where they left off. `BrainBreak` receives `onClose` so its
finish/close actions dismiss the modal instead of navigating.

**Entry points.** `TeacherWorkspacePage` — the formerly-"בקרוב" **אדריכל השיעור** card now links to
`/teacher-workspace/lesson-builder`. `ClassroomWorkspacePage` — a header **"📅 טען מערך שיעור מוכן"**
button opens a `Dialog` of the active class's `savedPlaylists`; selecting one navigates to the player.

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

- **2026-06-24 — Added `StepByStepReflection` (20th game, "צעד צעד: מרוץ המודעות").**
  *Why:* the catalog lacked a whole-class movement-and-reflection activity for homeroom/SEL time; a
  kid-friendly adaptation of the *Privilege Walk* lets students physically step forward (strengths)
  or backward (challenges) to value statements, then debrief — building self-awareness, empathy, and
  class cohesion. *How:* §4a state machine (`setup→forward→backward→debrief`). The teacher picks one
  of three reflection topics (`family` / `learning` / `social`); each carries `forward[]` (strengths)
  and `backward[]` (challenges) statement arrays in an in-component `TOPICS` constant. The `forward`
  phase shows a soft **emerald** screen with a gently-pulsing `ArrowUpwardIcon` and the cue "קחו צעד
  אחד קדימה!"; `backward` transitions (MUI `Fade`) to a soft **amber** screen with `ArrowDownwardIcon`
  and "קחו צעד אחד אחורה!". An MUI `Stepper` tracks progress per phase; the displayed count is
  **data-driven** — `היגד X מתוך {forward.length}` in the strengths phase, then a continuing
  `היגד {forward.length+i} מתוך {forward.length+backward.length}` in the challenges phase (the spec's
  literal "מתוך 4/8" was reconciled to the actual 3+3 content). The `debrief` screen deliberately uses
  **no confetti** — a calm `Fade` into 3 styled discussion-question `Card`s for a respectful
  reflection atmosphere; "סיום פעילות" records the play via `markGameAsPlayedInClass(activeClassroomId,
  'social-reflection-walk')` (only when a class is active) and `navigate('/')` back to the catalog
  (explicit record+navigate per spec, rather than the passive `useMarkGamePlayed` hook). *Content
  note:* `family`/`learning` statements are verbatim from the brief; `social` (חברים וחברה) had no
  pool in the brief and its statements were **authored** here (age-appropriate Hebrew matching the
  other topics' tone). Reuses `taxonomy.ts` (`social` / `elementary_high`, both already present) —
  additive, no schema or taxonomy change.
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

- **2026-06-26 — Added "Classroom Utilities" (כלים לניהול כיתה): a separate top-level category +
  first two tools (`NameWheel`, `TeamMaker`).** *Why:* teachers need everyday classroom *tools*
  (pick a name, split into teams) that are categorically **not** games — no score, no win/lose, no
  history. Folding them into the games registry with a `kind` flag would have polluted every game
  consumer (`CatalogPage` filters, `GameWrapper`'s subject/time chips, `useMarkGamePlayed`, the
  history badges) with "is this actually a game?" branches. *How:* a **parallel contract** that mirrors
  the proven games pipeline but in its own files (§9): `tools-registry.json` → `ToolsCatalogPage`
  (`/tools`) → `/tools/:toolId` → `TOOLS_MAP` in `ToolPage` → `ToolWrapper`. `ClassroomTool` has **no
  `componentName`** (the `id` is the Tools-Map key — the registry is small and hand-curated).
  *Scope choices:* (a) routes are **gated by `RequireActiveClass`, same as the games catalog** — a
  signed-in teacher picks an active class first (the tools operate on the active roster). *This
  reversed the initial "ungated" choice per user request, to match the games-catalog flow.* Signed-out
  **guest mode** is preserved because `RequireActiveClass` only gates signed-in users — anonymous
  visitors pass through to the tools' manual name entry. (b) **excluded from `whats-new.json`** because `WhatsNewEntry` deep-links
  to `/game/:id` and tools are a different category — announcing them there would 404 or require
  bending the games timeline contract; (c) hybrid-names ingestion **extracted** into a shared
  `RosterPanel` (the games inline it, but the two tools share it verbatim); (d) the wheel is an HTML5
  **Canvas** wheel-of-fortune (true to "גלגל המזל") rather than a CSS slot reel. Tools use **MUI icon
  names** (`tools/iconMap.tsx`) instead of the games' emoji `taxonomy`, per the registry's `icon`
  field. No changes to `games-registry.json`, `taxonomy.ts`, or `whats-new.json`.

- **2026-06-26 — Added Marble Jar (tool #3, "צנצנת השיש הדיגיטלית") — first cloud-persisted tool
  state.** *Why:* a goal/reward tracker must **remember** progress across reloads and sessions and be
  visible globally (navbar), so its state cannot be session/local like the wheel's removed-names or the
  team-maker's shuffle — it belongs on the class. *How:* extended the `Classroom` contract with
  `marblesCount` (0) / `marblesTarget` (30) / `marblesReward` ("צ'ופר כיתתי"), persisted in Clerk
  `unsafeMetadata` exactly like `playedGames`, with the same **normalize-on-read** safety for legacy
  rows (§7). Three new context writers — `updateMarbles` (clamped `[0, target]`), `setMarbleGoal`
  (sets goal+reward, clamps an over-full count down), `resetMarbleJar` — all modeled on
  `markGameAsPlayedInClass` (find target → rewrite whole array via `persist`). The component reads
  count/target/reward straight off `activeClassroom` (not local state) so the jar and the navbar
  `🫙 count/target` indicator stay in lock-step. *Scope choices:* (a) **Scenario A** (no active class)
  is effectively the signed-out path given `/tools` gating, so it shows an `Alert` + a
  "בחרו או צרו כיתה" shortcut rather than a local fallback — persistence is the whole point; (b) the
  victory view replaces the controls (rather than just disabling them) so a full jar can't be
  over-filled; (c) marble drop animation uses a CSS keyframe on stable-keyed marbles so only new
  marbles animate. No `whats-new.json` entry (tools-excluded, per the prior decision).

- **2026-06-26 — Added Smart Chore Board (tool #4, "לוח תורנויות כיתה חכם") — first tool that is both
  cloud-stateful and guest-capable.** *Why:* a duty roster must remember chore roles + the current
  draw per class (so it survives reloads), yet the brief also requires a working **guest** mode. *How:*
  extended `Classroom` with `customChoresList: string[]` (default `DEFAULT_CHORES`, exported from
  `game.types.ts`) and `currentChoreAssignments: Record<string, string[]>` (`{}`), persisted +
  normalized-on-read like the marble fields (§7); three writers `saveChoresConfig` /
  `updateChoreAssignments` / `clearChoreAssignments` modeled on the marble writers. `ChoreBoard`
  resolves a mode from `activeClassroom`: **class mode** reads the present roster (students ⊖
  absentees, reusing the `RosterPanel` filter idiom) and reads/writes cloud state; **guest mode**
  (signed-out, since `/tools` is gated) shows a split names/chores setup and runs on local `useState`.
  Both feed one presentational `<Board>` via handlers, so the UI isn't branched. *Scope choices:*
  (a) MarbleJar deliberately had no guest fallback (persistence was its whole point), but ChoreBoard
  ships one per the brief — the dispatch-to-cloud-or-local handler pattern keeps it clean;
  (b) **fair assignment** = Fisher-Yates shuffle + round-robin `i % chores.length`, which guarantees an
  even split (±1) and that no student gets two chores in one draw; (c) `saveChoresConfig` prunes
  assignments for deleted chores so the board can't render orphaned roles; (d) a spin is **blocked**
  (MUI `Alert`) when `present students < chores`, so every role gets at least one tornan; (e) the
  responsive board uses the repo's `Box` CSS-grid convention (as `TeamMaker`/`CatalogPage`), not MUI
  `Grid`. No `whats-new.json` entry (tools-excluded).

- **2026-06-26 — Added "מרחב המורה" (Teacher's Private Workspace) — a third, private top-level category
  + its first tool, Student Insights (תיק תלמיד).** *Why:* teachers need a back-office for sensitive,
  per-student pedagogical records that is categorically distinct from student-facing games/utilities and
  must never be projected. *How:* a `/teacher-workspace` layout route (`TeacherWorkspaceLayout`) nested
  under `AppLayout` with `index`→`TeacherWorkspacePage` and `student-insights`→`StudentInsights` (§10);
  `Classroom` gained `studentInsights?: Record<string, StudentInsight[]>` persisted in Clerk
  `unsafeMetadata` like the other tool state, with writers `addStudentInsight`/`deleteStudentInsight`.
  *Scope choices:* (a) **privacy posture** — route is ungated by `RequireActiveClass` but SignedIn-gated
  inside the layout, with a persistent "do not project" banner and a SignedIn-only, visually distinct
  navbar link; the UI is deliberately crisp/professional (no pastels/confetti) to differentiate from
  student-facing tools. (b) **class selection is local and decoupled** — the tool seeds from
  `activeClassroomId` but never calls `setActiveClassroom`, so reviewing records doesn't mutate the
  smartboard teaching session/attendance. (c) **15-insight cap per student** in `addStudentInsight`
  guards Clerk's ~8KB metadata limit. (d) **no `@mui/lab`** — the brief allowed a vertical list, so the
  timeline is hand-built from MUI core rather than adding a dependency. No `whats-new.json` /
  `tools-registry.json` / `games-registry.json` / `taxonomy.ts` changes (neither a game nor a `/tools`
  utility).

- **2026-06-26 — Added the WhatsApp Generator (2nd מרחב המורה tool) + a cloud sent-history archive.**
  *Why:* teachers wanted a quick parent-summary generator with a persistent log of what was sent. The
  brief framed it as "updating" an existing tool, but it **didn't exist** (only a "בקרוב" placeholder) —
  so it was built from scratch (confirmed with the user). *How:* `Classroom` gained
  `whatsappHistory?: WhatsappMessage[]` persisted in Clerk `unsafeMetadata`, with
  `addWhatsappToHistory`/`deleteWhatsappFromHistory` writers cut from the `addStudentInsight` cloth;
  `CommunicationGenerator` is the second tool under `/teacher-workspace` (§10). *Scope choices:*
  (a) the message **auto-drafts from `studentInsights`** (recent positives → highlight bullets), then is
  freely editable — chosen over a blank-template form so the §10 Insights tool pays off; (b) a **10-record
  cap** per class guards the ~8KB metadata limit; (c) "send" uses the public **`wa.me` deep link** (no
  WhatsApp API/backend) and archives in the same click; (d) reuses the §10 local, session-decoupled
  class selection + privacy posture; the previously-disabled dashboard card is now enabled. No new
  dependency; no registry/`whats-new`/`taxonomy` changes.- **2026-06-29 — Externalized game content to `data/content/` (§11); first migration: `ClassroomSpeedDating`.**
  *Why:* prompts/questions were hardcoded inside game components, so enriching the pool meant editing
  React and content couldn't be reviewed/audited as data. We want content decoupled from mechanics and
  a guaranteed launch density of high-quality, age-tiered material. *How:* introduced
  `src/data/content/[game-id]-content.json` keyed by the three age cohorts (`lower_elementary` /
  `upper_elementary` / `junior_high_high`); the component imports + types the JSON and renders the pool
  for a teacher-selected cohort. `ClassroomSpeedDating` lost its in-component `PACKS`/`WRAPUP_QUESTIONS`
  constants in favor of `social-speed-dating-content.json` (62 items: 53 prompts + 9 wrap-ups across all
  three cohorts), and its setup screen gained an age-cohort `ToggleButtonGroup`. Codified the standing
  rule in `CLAUDE.md` ("Game Content & Architecture Rules"): never hardcode text pools; min 40 creative
  items per game across applicable cohorts. No build-config change (`resolveJsonModule` already on).
- **2026-06-29 — Externalized `ComplimentGamePack` content (§11, second migration).**
  *Why:* continuing the content/mechanics decoupling; the pack's two prompt pools were hardcoded and
  shared across its three modes. *How:* moved the pools to `compliment-pack-content.json` keyed by age
  cohort as `{ label, solo, pair }` (44 items: 26 solo + 18 pair); `solo` drives Chain + Slot, `pair`
  drives Duo. The root tracks an `ageGroup` (default `lower_elementary`); the names-input setup screen
  gained an age `ToggleButtonGroup`; `buildChain`/`buildGroups` now take the prompt pool as a parameter
  and each mode receives its cohort pool from the root. No registry/`whats-new`/`taxonomy` change.
- **2026-06-29 — Externalized `DigitalPassParcel` task cards (§11, third migration).** *Why:* the
  social task cards were a hardcoded `TASKS` array; moving them to data lets an educator tune the tone
  per age and grows the pool past the 40-item launch-density rule. *How:* created
  `digital-pass-parcel-content.json` keyed by age cohort as `{ label, tasks: {emoji,text}[] }` (45 cards
  across three cohorts); the setup screen gained an age `ToggleButtonGroup` (clears the used-task
  ledger on change) and `pickTask` draws from the selected cohort's pool. The older cohort was retuned
  away from juvenile dance/jumping tasks toward connection and light reflection so the game suits teens.
  `WRAP_COLORS`/`MUSIC_STYLES`/`NOTE_PATTERNS` stay in-component (mechanics, not content). Note:
  `ComplimentTimeBomb` was scanned and **skipped** — it is a pure compliment *counter* with no prompt
  pool, so there was nothing to externalize. No registry/`whats-new`/`taxonomy` change.
- **2026-06-29 — Externalized `EmotionGenerator` slot pools (§11, fourth migration).** *Why:* the
  pantomime emotion + action pools were hardcoded `EMOTIONS`/`ACTIONS` arrays; moving them to data lets
  an educator tune difficulty per age and grows the pool past the 40-item rule. *How:* created
  `emotion-generator-content.json` keyed by age cohort as `{ label, emotions, actions }` of
  `{ label, emoji }` items (50 total: 24 emotions + 26 actions); `Combo` now references a shared
  `SlotItem` type, `spinCombo`/`SpinScreen`/`SlotReel` draw from the selected cohort. The root was
  changed to **always start at the `names` setup screen** (it previously auto-skipped to `pick_actor`
  when a class was active) so the new age `ToggleButtonGroup` on that screen is always reachable. Older
  tier retuned to teen-relatable scenarios + nuanced emotions. No registry/`whats-new`/`taxonomy` change.
- **2026-06-29 — Externalized `FocusDetectivesGame` memory boards (§11, fifth migration).** *Why:* the
  3 themed boards were a hardcoded `ROUNDS` array; with only 3 boards the game repeated identically
  every play. Externalizing both enriches the pool past the 40-item rule and lets the game pick a fresh
  random subset each round. *How:* created `focus-detectives-content.json` keyed by age cohort as
  `{ label, rounds }` (18 boards / 6 per cohort, ≈324 emoji tokens); `buildRound` takes a `Round`,
  `PlayingScreen` draws `ROUNDS_PER_GAME=3` boards via `shuffle().slice()` and threads the played count
  to `SummaryScreen` as `total` (message thresholds made relative to `total`). The INTRO screen gained
  an age `ToggleButtonGroup`; older tiers use deliberately confusable sets (math symbols, arrows, hand
  gestures). `CARD_COLORS` stays in-component (color-change mechanic). No registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `HungryWordMonster` focus sets (§11, sixth migration; first omitted tier).**
  *Why:* the phonics word pools were a hardcoded `FOCUS_SETS` array; externalizing enriches the pool and
  lets a teacher pick difficulty by age. *How:* created `hungry-word-monster-content.json` keyed by
  **only** `lower_elementary` + `upper_elementary` — `junior_high_high` is intentionally omitted (the
  "feed words that start with ב" mechanic is beginning-literacy, the first application of §11's
  omit-a-tier rule). 135 word items across 9 focus sets / 27 rounds; lower tier = initial/final-sound
  sets, upper tier = category sorting + final sofit letters + words containing צ. The setup screen gained
  an age `ToggleButtonGroup` (resets selected focus on change); `focusSets` resolves from
  `CONTENT[ageGroup]`. `CARD_COLORS`/`CARD_BORDERS` stay in-component (mechanics). No registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `LetterBridge` letter pairs (§11, seventh migration).** *Why:* the
  homophone word planks were a hardcoded `LETTER_PAIRS` array; externalizing enriches the pool and tiers
  it by age. *How:* created `letter-bridge-content.json` keyed by all three cohorts (homophone spelling
  stays hard into high school) as `{ label, letterPairs }`; 55 word planks across 11 pairs. Lower = basic
  pairs/common words, upper = harder words + the ק/כ homophone, junior = abstract vocabulary. The setup
  screen gained an age `ToggleButtonGroup` (resets selected pair on change); `letterPairs` resolves from
  `CONTENT[ageGroup]`. JSON `string[]`/`number` narrowed to tuple/`0|1` via whole-object `as` cast. SFX
  and bridge visuals stay in-component (mechanics). No registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `MindReaders` questions (§11, eighth migration); `MathCodebreaker` skipped.**
  *Why:* the 8 secret-answer questions were a hardcoded `QUESTIONS` array; externalizing enriches and
  age-tiers the pool. *How:* created `mind-readers-content.json` keyed by all three cohorts as
  `{ label, questions }` (42 questions, 14/cohort); the root always starts at `names` (was auto-skip when
  a class was active) so the new age `ToggleButtonGroup` is reachable, and `questions` became settable
  state filled in `confirmNames` from `shuffle(CONTENT[ageGroup].questions).slice(0, ROUNDS*2)`. Tuned by
  age (concrete favorites → identity/future reflection). *Skip note:* `MathCodebreaker` was scanned and
  **skipped** — its riddles are procedurally generated by `Gen` functions (`EASY/MEDIUM/HARD_GENS`), not a
  static text pool, so there is nothing to move to JSON (JSON can't hold generation logic). No
  registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `PunctuationOrchestra` sentence pool (§11, ninth migration).** *Why:* the
  readable sentences were a hardcoded 5-item `PRESET_SENTENCES` array; externalizing enriches and
  age-tiers the pool. *How:* created `punctuation-orchestra-content.json` keyed by all three cohorts as
  `{ label, sentences }` (42 sentences, 14/cohort); the setup screen gained an age `ToggleButtonGroup`
  (resets selected preset + custom flag on change), `presetSentences` resolves from `CONTENT[ageGroup]`.
  The junior-high/high tier uses expressive/dramatic statements so the prosody exercise suits teens. The
  3 punctuation `SIGNS` and SFX stay in-component (fixed mechanics); the custom-sentence field is
  unchanged. No registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `RhymeExpress` rhyme rounds (§11, tenth migration).** *Why:* the rhyme
  rounds were a hardcoded `ROUNDS` object; externalizing enriches the pool and ties the game's own
  difficulty to age. *How:* created `rhyme-express-content.json` keyed by `lower_elementary` +
  `upper_elementary` (junior omitted — rhyming is beginning-literacy) as `{ label, rounds }`; the
  existing easy/hard difficulty selector was **repurposed as the age-cohort selector** (the difficulty
  was the tiering). Each cohort grew to a 6-round pool; a play draws `ROUNDS_PER_GAME=3` at random
  (`shuffleArr().slice()`) into `gameRounds` state, and `initRound` now takes a `RoundData`. 12 rounds /
  84 word tokens. `TILE_COLORS`/`TILE_BORDERS`/SFX stay in-component (mechanics). No registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `RumorExpress` story tiers + reflection cards (§11, eleventh migration).**
  *Why:* the rumor stories and reflection prompts were a hardcoded `TIERS` map + `REFLECTION_CARDS`
  array; the tiers were already age-shaped, so externalization both enriches the pool and aligns it to
  the §11 cohort schema. *How:* created `social-rumor-express-content.json` keyed by the three cohorts
  (the old `elementary`/`pre_teen`/`junior_high` keys renamed), each `{ label, blurb, emoji, color,
  stories, reflectionCards }`; the verbatim-substring fact contract is preserved. The `TIERS` map became
  a derived array (`TIER_KEYS.map(k => ({key:k, ...CONTENT[k]}))`), `SetupScreen` maps it, and reflection
  cards are threaded to `ReflectionScreen` as a `cards` prop. Stories grew 12→24 (8/cohort, ~130 tracked
  facts), reflection prompts 3→9. No new age selector — the existing tier picker is the cohort selector.
  No registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `SentenceDetectives` sentence pools (§11, twelfth migration).** *Why:* the
  scrambled sentences were a hardcoded `SENTENCES` object; externalizing enriches the pool and ties the
  game's own difficulty to age. *How:* created `sentence-detectives-content.json` keyed by
  `lower_elementary` + `upper_elementary` (junior omitted — sentence-building is beginning-grammar) as
  `{ label, desc, sentences }`; the easy/hard difficulty selector was **repurposed as the age-cohort
  selector** (the difficulty was the tiering, as in RhymeExpress). Each cohort grew to a 7-sentence pool;
  a play draws `ROUNDS_PER_GAME=3` at random into `gameSentences` state. `shuffle` generalized to `<T>`;
  an `if (!sentence) return null` guard precedes the playing render (gameSentences empty during setup).
  14 sentences / 58 word tokens. `CHIP_PALETTE`/SFX stay in-component. No registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `SilentNinja` movement commands (§11, thirteenth migration).** *Why:* the
  brain-break commands were a hardcoded `ACTIONS` array; externalizing enriches and age-tiers the pool.
  *How:* created `silent-ninja-content.json` keyed by all three cohorts as `{ label, actions }` (42
  commands, 14/cohort); the setup screen gained an age `ToggleButtonGroup`, `nextAction` draws from
  `CONTENT[ageGroup].actions`, and the initial `action` seeds from the lower-cohort pool. Tone tiered:
  animal-imitation for the youngest, coordination/sport for upper, stretch/balance/energy-release for the
  oldest. SFX stays in-component. No registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `SocialDilemmas` topics/dilemmas (§11, fourteenth migration; first
  component-field transform).** *Why:* the SEL `TOPICS` map was the largest hardcoded pool; externalizing
  enriches it and age-tiers it. *How:* created `social-dilemmas-content.json` keyed by all three cohorts
  as `{ label, topics }` (Topic→Dilemma→Choice with consequences + paired discussion questions).
  `Topic.icon` was a React component, which JSON can't hold, so it became an **icon-name string** resolved
  by a new `ICON_MAP` (the §9 tools-iconMap pattern) — the first migration to transform a non-serializable
  field. The root holds an `ageGroup` (default `upper_elementary`); `TopicScreen` gained an age
  `ToggleButtonGroup` and maps `CONTENT[ageGroup].topics`. upper keeps the original 3×3; lower (2×2) and
  junior (2×2) are new and age-tuned. 17 dilemmas / 51 choices / 102 discussion questions. `EmpathyMeter`
  stays in-component. No registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `SpotTheGlitch` topics/sentences (§11, fifteenth migration).** *Why:* the
  language-error topics were a hardcoded `TOPICS` array (and sparse — 5 sentences); externalizing enriches
  and age-tiers them. *How:* created `spot-the-glitch-content.json` keyed by all three cohorts as
  `{ label, topics }` (GlitchTopic→Sentence with `hasGlitch`+`correction`); `GlitchTopic.icon` became an
  icon-name string resolved by an `ICON_MAP` (same pattern as SocialDilemmas). The root holds an
  `ageGroup` (default `lower_elementary`); `TopicScreen` gained an age `ToggleButtonGroup` and maps
  `CONTENT[ageGroup].topics`. Difficulty escalates by cohort (gender/number + sound-alike letters →
  idioms + harder words → syntax agreement + precise spelling + idiom precision). 42 sentences across 8
  topic-instances. No registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `StepByStepReflection` statements/debrief (§11, sixteenth migration).**
  *Why:* the Privilege-Walk statement pools + debrief cards were hardcoded (`TOPICS` + `DEBRIEF_QUESTIONS`);
  externalizing enriches and age-tiers them. *How:* created `social-reflection-walk-content.json` keyed by
  all three cohorts as `{ label, topics, debrief }`; emoji is plain text (no icon-map needed). The root
  dropped the `topicKey` indirection and stores the selected `ReflectionTopic` object directly; it holds an
  `ageGroup` (default `upper_elementary`), `SetupScreen` gained an age `ToggleButtonGroup` and maps
  `CONTENT[ageGroup].topics`, and `DebriefScreen` takes a `cards` prop. 54 statements + 9 debrief cards,
  escalating from concrete home/play to responsibility/pressure/belonging/identity. No registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `TwoTruthsLie` example bank (§11, seventeenth migration; input-driven game).**
  *Why:* this game has the teacher type their own facts, so its only hardcoded text was a 3-item
  `PLACEHOLDER_FACTS` hint array — rather than skip (as with the counter/numeric games), it was promoted to
  a useful age-tiered **inspiration bank**. *How:* created `two-truths-lie-content.json` keyed by all three
  cohorts as `{ label, examples }` (ExampleSet = facts[3] + lieIndex); 24 sets / 72 fact statements. The
  age + example logic is local to `SetupScreen` (not game-loop state): an age `ToggleButtonGroup`, field
  placeholders from `currentExample.facts[i]`, and a new "מלאו דוגמה להשראה 💡" button that fills the
  fields + lie radio and advances to the next idea. Mechanics unchanged. Establishes the §11 pattern for
  input-driven games: externalize the example/placeholder hints rather than skip. No registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `WordPop` vocabulary (§11, eighteenth migration).** *Why:* the English→Hebrew
  word dictionary was a hardcoded `CATEGORIES` map; externalizing enriches and age-tiers it. *How:* created
  `english-word-pop-content.json` keyed by all three cohorts → category → `{ en, he, emoji, words }`;
  `Category` widened to `string` (cohort keys differ). The root holds an `ageGroup` (default
  `lower_elementary`); the real-time bubble spawner reads `CONTENT[ageGroup].categories` and its
  `Object.keys` for distractors, with `ageGroup` added to the loop `useEffect` deps. `SetupScreen` gained
  an age `ToggleButtonGroup`; `OverScreen` takes the resolved `CatData`. 9 categories / 78 word pairs
  (animals/food/colors → school/body/sports → feelings/technology/nature). `BUBBLE_COLORS`/physics stay
  in-component. No registry/whats-new/taxonomy change.
- **2026-06-29 — Externalized `WouldYouRather` dilemma packs (§11, nineteenth migration; sweep complete).**
  *Why:* the "this-or-that" packs were a hardcoded `PACKS` map; externalizing enriches and age-tiers them.
  *How:* created `would-you-rather-content.json` keyed by all three cohorts → pack → `{ label, icon,
  dilemmas }` (icon is a plain emoji). The root holds an `ageGroup` (default `upper_elementary`) and
  resolves `CONTENT[ageGroup].packs`; `SetupScreen` gained an age `ToggleButtonGroup` + an `activePackKey`
  validity guard for cohort switches; `SummaryScreen` takes the resolved `PackData`. 44 dilemmas / 88
  statements (silly/concrete → original 4 packs → life/future/values). `CLASS_PROFILES` stays in-component
  (result feedback, not a prompt pool). **This completed the §11 content-externalization sweep:** of the 22
  games, 19 were migrated and 3 skipped (`ComplimentTimeBomb`, `MathCodebreaker`, `SilentSyncTower` — no
  externalizable text pool). No registry/whats-new/taxonomy change.
- **2026-06-29 — Two-environment split: landing gateway + מרחב הכיתה (`/classroom`) vs מרחב המורה (dark theme).**
  *Why:* the app opened straight onto the games catalog with one indigo/teal light theme everywhere, so
  the student-facing smartboard surface and the teacher's private back-office were visually identical —
  sensitive pedagogical data looked like a projectable game. We wanted a strict, professional separation.
  *How:* `/` is now a split-screen **`HomePage`** gateway → `/classroom` (playful pastel, guest-open) or
  `/teacher-workspace` (Clerk-protected). The new **`ClassroomWorkspacePage`** merges the old `CatalogPage`
  + `ToolsCatalogPage`: a games catalog filtered by `subject` + 3 age **cohorts** via `ToggleButtonGroup`,
  plus a permanent, **filter-immune** "🛠️ כלים מהירים" utilities section (separate block/state). The
  cohort filter bridges the registry's finer `targetAge` keys through a new `cohortsForTargetAge()` in
  `taxonomy.ts` — **no data migration** (the registry/content JSON are untouched; `elementary_to_high`
  maps to all three, `elementary_high_and_junior_high` to upper+junior, etc.). `TeacherWorkspaceLayout`
  nests a new dark **`corporateTheme`** (navy/slate, low radius, thin borders) via `ThemeProvider` +
  `ScopedCssBaseline` and a sticky amber privacy banner; the global theme stays `educationalTheme`.
  *Routing:* `/tools` (catalog) redirects to `/classroom`; `/game/:gameId` and `/tools/:toolId` keep their
  `RequireActiveClass` gate; `CatalogPage`/`ToolsCatalogPage` were deleted. *Navigation repointed:* every
  "back to catalog" / `navigate('/')` (GameWrapper, ToolWrapper, RumorExpress, ClassroomSpeedDating,
  StepByStepReflection) now targets `/classroom`; the Navbar replaced the catalog+tools links with one
  "ללוח החכם (מרחב הכיתה)" link + a SignedIn-only amber "💼 מרחב המורה (פרטי)" lock link. No
  registry/whats-new/taxonomy-data changes.
- **2026-07-02 — Lesson Playlists / Session Builder (אדריכל השיעור).**
  *Why:* teachers ran games/tools one at a time, returning to the catalog between each — friction
  mid-lesson. A pre-built, 1-click-advance playlist lets a lesson flow seamlessly on the smartboard.
  *How:* a `LessonPlaylist { id, title, gameAndToolIds }` on `Classroom.savedPlaylists`, Clerk-persisted
  like every other field via new `createPlaylist`/`deletePlaylist` (capped 20/class) — **Clerk-only, no** 
  **localStorage** (chosen for architectural consistency; guests simply see a fallback). A shared
  `src/data/lessonItems.ts` resolver bridges a mixed game/tool id → display meta + component, **reusing**
  the now-exported `REGISTRY_MAP` (`GamePage`) and `TOOLS_MAP` (`ToolPage`) rather than duplicating the
  import list. Builder (`teacher-tools/LessonBuilder.tsx`, dark skin) uses the **local session-decoupled**
  class picker (like `StudentInsights`) so home-planning never disturbs a live session. Player
  (`pages/PlaylistPlayerPage.tsx` at `/classroom/play/:playlistId`, pastel skin, `RequireActiveClass`)
  drives an `index` state from a top-bar "next" button and **remounts each activity via `key={index}`**
  for clean fresh state; a `canvas-confetti` completion summary closes the lesson. Entry points: the
  formerly-"בקרוב" `TeacherWorkspacePage` "אדריכל השיעור" card (now linked) + a "📅 טען מערך שיעור מוכן"
  dialog on `ClassroomWorkspacePage`. No registry/whats-new/taxonomy-data changes.
- **2026-07-02 — Classroom Utility #5: Brain Break Generator + emergency FAB in the Playlist Player.**
  *Why:* teachers needed an instant "context-reset" for classroom regulation — energize a tired class or
  calm a rowdy one in 60–90s — including the ability to interrupt a running game without losing its state.
  *How:* a roster-free, content-driven tool `src/tools/BrainBreak.tsx` (`tool-brain-break`) following the
  standard tools contract (§9): `tools-registry.json` entry (`icon: "bolt"`, added to `tools/iconMap.tsx`)
  + `TOOLS_MAP` registration in `ToolPage.tsx`. Its 45-exercise pool is externalized to
  `data/content/brain-break-content.json`, but — deliberately unlike game content (§11) — keyed by energy
  **category (`energize`/`calm`), not age cohort**, because the teacher picks by the class state, not
  grade (the tool has no age selector). Reuses the asset-free Web-Audio `Sfx` pattern, the state-gated
  pause/resume countdown, ref-cleaned roulette flicker, and `canvas-confetti`. An optional `onClose` prop
  makes it embeddable: `PlaylistPlayerPage` renders a fixed "⚡ הפגת בזק!" `Fab` that opens the tool in a
  full-screen `Dialog` over the active game; the game stays mounted (portal sibling) so closing the modal
  resumes it with state intact. Because tools auto-enroll into `lessonItems.ts`, the break is also usable
  as a normal playlist step. No whats-new/taxonomy change.
