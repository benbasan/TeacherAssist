# CLAUDE.md — friendteach Architectural Manifesto

This file is the project's "brain". Read it before making any change.

## PROJECT MISSION
friendteach is an automated repository for **daily educational games** that help teachers with
classroom engagement. Each game is a small, self-contained, plug-and-play experience that a teacher
can open and run in front of a class within seconds.

## DESIGN GUIDELINES
- **MUI (Material-UI) for all UI.** Build every screen from MUI components.
- **RTL first.** The entire app is right-to-left, in Hebrew. Layout, icons, and flows must read
  naturally from right to left.
- **Two environments, two skins.** The root `/` is a split-screen gateway into **מרחב הכיתה**
  (`/classroom`) and **מרחב המורה** (`/teacher-workspace`). See `ARCHITECTURE.md` §3/§10.
  - **מרחב הכיתה** — the student-facing smartboard surface: **vibrant & child-friendly**, playful
    pastel, oversized projector-legible typography. Uses the default `educationalTheme`.
  - **מרחב המורה** — the teacher's private back-office: a **dark navy/slate corporate** dashboard
    (`src/theme/corporateTheme.ts`, applied via a nested `ThemeProvider`) with a sticky
    "do-not-project" banner, thin crisp borders, and no playful animations.
- **Rounded corners:** `borderRadius: 16` on the default theme (`shape`); the corporate theme uses
  a tighter radius for a crisper, professional feel.
- **Palette:** classroom = warm **indigo** primary + **teal** secondary; teacher office = deep
  **navy** primary + **slate** secondary (dark mode).
- **Font:** `Rubik` (loaded via Google Fonts, RTL-friendly) — shared by both themes.

## CODE STYLE
- **React + TypeScript.**
- **Strictly functional components** — no class components.
- **Prefer MUI over custom CSS.** Avoid hand-written CSS files and styled-components when MUI provides
  a solution (use the `sx` prop, theme, and MUI components instead).
- Type-only imports use `import type { ... }` (project enables `verbatimModuleSyntax`).

## DATA FLOW
- **All games are entries in `src/data/games-registry.json`.** This registry is the single source of
  truth for what games exist, their metadata (`subject`, `targetAge`, `estimatedTimeMinutes`), and
  their `componentName`. Display labels/icons/colors for `subject`/`targetAge` live in
  `src/data/taxonomy.ts`, not on each entry.
- A `componentName` maps to a React component via the **Registry Map** in `src/pages/GamePage.tsx`.
- **Any new game MUST be added to BOTH** `games-registry.json` **and** `src/data/whats-new.json`.
- Pages render purely from this data — never hard-code a game list in a component.
- **See `ARCHITECTURE.md`** for the full system blueprint: the application shell, dynamic routing,
  the Registry Map component-resolution logic, and the decision log.

## Game Content & Architecture Rules
- **All text pools, prompts, or questions for games must NEVER be hardcoded inside components.**
  They must reside in `src/data/content/[game-id]-content.json` and must launch with a minimum
  density of 40 highly creative examples distributed across applicable age cohorts.
- **Age-cohort schema:** content JSON is keyed by `lower_elementary` (כיתות א'-ג'),
  `upper_elementary` (כיתות ד'-ו'), and `junior_high_high` (כיתות ז'-י"ב). Include a cohort tier
  ONLY where it is pedagogically applicable to the game's mechanics; omit tiers that don't fit, but
  pack the remaining ones so the grand total still exceeds 40 unique items.
- The component imports the JSON and renders the pool **dynamically based on the selected age
  category** — never re-introduce in-component content arrays.

## TONE OF VOICE
Warm, encouraging, professional, and accessible **Hebrew**. Speak to teachers with respect and to
children with kindness. Avoid jargon; keep copy short and uplifting.

## RULES
- **Always run `npm run build`** to verify integrity (0 errors) before finalizing any change.
- Keep components small and functional; reuse `GameWrapper` to frame every game.
- When adding a game: create the component in `src/games/`, register it in the Registry Map, and add
  entries to both JSON data files.

### Living Documentation (mandatory)
These docs are a **living blueprint** — they must always match the real codebase.
- **Review `CLAUDE.md` and `ARCHITECTURE.md` BEFORE finalizing any task.**
- If a change is **structural, routing, or architectural** (e.g. adding a game, adding/changing a
  route, changing the Registry Map, altering the data contracts or theme/RTL setup), **update these
  docs FIRST**, then implement.
- Record the **"Why" and "How"** of every significant technical decision in the **Decision Log** of
  `ARCHITECTURE.md`, so the blueprint stays perpetually up to date.
- After implementing, verify the docs still reflect reality (paths, routes, symbols) — keep them
  aligned with the actual code, never aspirational.
