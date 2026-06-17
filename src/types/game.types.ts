// Core domain types for TeacherAssist.
// Every game in the platform is described by an `EducationalGame` entry in
// `src/data/games-registry.json`, and announced via a `WhatsNewEntry` in
// `src/data/whats-new.json`.

/** A single educational game, as stored in the games registry. */
export interface EducationalGame {
  /** Stable unique id, used in the URL (`/game/:gameId`). */
  id: string;
  /** Key into the Registry Map (GamePage) that resolves the React component. */
  componentKey: string;
  /** Display name (Hebrew). */
  title: string;
  /** Short, warm description (Hebrew). */
  description: string;
  /** Pedagogical category, e.g. "חברתי-רגשי", "שפה", "חשיבה". */
  category: string;
  /** Recommended minimum age (years). */
  minAge: number;
  /** Recommended maximum age (years). */
  maxAge: number;
  /** Emoji or short string shown on the catalog card. */
  icon: string;
  /** Accent color (hex) used to theme the card. */
  color: string;
  /** ISO date (YYYY-MM-DD) the game was added. */
  dateAdded: string;
}

/** A single entry on the "What's New" timeline. */
export interface WhatsNewEntry {
  /** Stable unique id. */
  id: string;
  /** ISO date (YYYY-MM-DD) of the update. */
  date: string;
  /** Headline (Hebrew). */
  title: string;
  /** Details (Hebrew). */
  description: string;
  /** Related game id, if this entry announces or updates a specific game. */
  gameId?: string;
  /** Whether this is a brand-new game or an update to an existing one. */
  type: 'new' | 'update';
}
