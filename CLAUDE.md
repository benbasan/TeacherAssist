# CLAUDE.md — TeacherAssist Architectural Manifesto

This file is the project's "brain". Read it before making any change.

## PROJECT MISSION
TeacherAssist is an automated repository for **daily educational games** that help teachers with
classroom engagement. Each game is a small, self-contained, plug-and-play experience that a teacher
can open and run in front of a class within seconds.

## DESIGN GUIDELINES
- **MUI (Material-UI) for all UI.** Build every screen from MUI components.
- **RTL first.** The entire app is right-to-left, in Hebrew. Layout, icons, and flows must read
  naturally from right to left.
- **Vibrant & child-friendly.** Playful, warm, and inviting — suitable for a classroom.
- **Rounded corners:** `borderRadius: 16` everywhere (set globally on the theme `shape`).
- **Palette:** warm **indigo** primary + **teal** secondary.
- **Font:** `Rubik` (loaded via Google Fonts, RTL-friendly).

## CODE STYLE
- **React + TypeScript.**
- **Strictly functional components** — no class components.
- **Prefer MUI over custom CSS.** Avoid hand-written CSS files and styled-components when MUI provides
  a solution (use the `sx` prop, theme, and MUI components instead).
- Type-only imports use `import type { ... }` (project enables `verbatimModuleSyntax`).

## DATA FLOW
- **All games are entries in `src/data/games-registry.json`.** This registry is the single source of
  truth for what games exist, their metadata (category, age range, color, icon), and their
  `componentKey`.
- A `componentKey` maps to a React component via the **Registry Map** in `src/pages/GamePage.tsx`.
- **Any new game MUST be added to BOTH** `games-registry.json` **and** `src/data/whats-new.json`.
- Pages render purely from this data — never hard-code a game list in a component.
- **See `ARCHITECTURE.md`** for the full system blueprint: the application shell, dynamic routing,
  the Registry Map component-resolution logic, and the decision log.

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
