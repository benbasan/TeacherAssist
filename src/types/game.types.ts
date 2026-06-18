// Core domain types for TeacherAssist.
// Every game in the platform is described by an `EducationalGame` entry in
// `src/data/games-registry.json`, and announced via a `WhatsNewEntry` in
// `src/data/whats-new.json`.

/** A single educational game, as stored in the games registry. */
export interface EducationalGame {
  /** Stable unique id, used in the URL (`/game/:gameId`). */
  id: string;
  /** Display name (Hebrew). */
  title: string;
  /** Short, warm description (Hebrew). */
  description: string;
  /** Target age band, e.g. "elementary_low" (see `TARGET_AGE_LABELS`). */
  targetAge: string;
  /** Pedagogical subject, e.g. "social" (see `SUBJECT_LABELS`). */
  subject: string;
  /** Rough duration in minutes, shown on the catalog card. */
  estimatedTimeMinutes: number;
  /** Key into the Registry Map (GamePage) that resolves the React component. */
  componentName: string;
}

/** A single entry on the "What's New" timeline. */
export interface WhatsNewEntry {
  /** Stable unique id. */
  id: string;
  /** ISO date (YYYY-MM-DD) of the update. */
  date: string;
  /** Headline (Hebrew). */
  title: string;
  /** Short summary of the update (Hebrew). */
  shortDescription: string;
  /** Related game id, if this entry announces or updates a specific game. */
  gameId?: string;
}
