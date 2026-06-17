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
│   ├── games-registry.json     # SOURCE OF TRUTH: all games + metadata + componentKey
│   └── whats-new.json          # SOURCE OF TRUTH: "What's New" timeline entries
├── games/
│   └── DemoComplimentGame.tsx  # A game component (confetti + MUI + Hebrew)
├── pages/
│   ├── CatalogPage.tsx         # Grid of game cards; category/age filters
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

---

## 4. Component-Mapping Logic (Registry Map)

The bridge between **data** (a game entry) and **code** (a React component) lives in
`src/pages/GamePage.tsx`:

```ts
const REGISTRY_MAP: Record<string, ComponentType> = {
  DemoComplimentGame: DemoComplimentGame,
  // <ComponentKey>: <ImportedComponent>
};
```

Resolution flow on `/game/:gameId`:
1. `useParams()` → `gameId`.
2. Find the entry in `games-registry.json` where `id === gameId`.
   - Not found → 404: *"אופס! לא מצאנו את המשחק הזה."*
3. Look up `REGISTRY_MAP[game.componentKey]`.
   - Not found → 404: *"המשחק קיים בקטלוג אך עדיין לא חובר…"*
4. Render `<GameWrapper game={game}><GameComponent /></GameWrapper>`.

**Why two separate 404 stages (why/how):** the registry (data) and the Registry Map (code)
are decoupled on purpose — a game can be *announced/listed* in the registry before its
component is wired. The split lets the catalog show "coming soon" entries gracefully while
giving a distinct, honest message when the data exists but the code isn't connected yet.

**To register a new game's component:** import it in `GamePage.tsx` and add one
`componentKey → Component` line to `REGISTRY_MAP`. The `componentKey` string must match the
`componentKey` field of the game's registry entry.

---

## 5. Data Flow (Single Source of Truth)

Type contracts in `src/types/game.types.ts`:
- **`EducationalGame`** — `id`, `componentKey`, `title`, `description`, `category`,
  `minAge`, `maxAge`, `icon`, `color`, `dateAdded`.
- **`WhatsNewEntry`** — `id`, `date`, `title`, `description`, `gameId?`, `type: 'new' | 'update'`.

Consumers (all render purely from data — never hard-code a game list):
- **`CatalogPage.tsx`** imports `games-registry.json` as `EducationalGame[]`, derives the
  category list, filters by category + age bucket, and renders a card grid. Each card links
  to `/game/${game.id}`.
- **`GamePage.tsx`** consumes the registry for lookup + the Registry Map for resolution (§4).
- **`WhatsNewPage.tsx`** imports `whats-new.json` as `WhatsNewEntry[]`, sorts by `date`
  descending, and renders a timeline; entries with a `gameId` link to that game.

**Checklist — adding a game (keep in sync with `CLAUDE.md`):**
1. Create the component in `src/games/`.
2. Register it in `REGISTRY_MAP` (`src/pages/GamePage.tsx`).
3. Add an entry to `src/data/games-registry.json` (with a matching `componentKey`).
4. Add an entry to `src/data/whats-new.json`.
5. Update this file if the change is architectural; run `npm run build` (0 errors).

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
