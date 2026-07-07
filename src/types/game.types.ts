// Core domain types for friendteach.
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

/** Sentiment of a pedagogical insight (Teacher's Private Workspace → Student Insights). */
export type InsightType = 'positive' | 'neutral' | 'negative';

/** A single behavioral/pedagogical log entry for a student. */
export interface StudentInsight {
  /** Stable unique id (crypto.randomUUID). */
  id: string;
  /** ISO timestamp of when the insight was logged. */
  date: string;
  /** Sentiment, drives the color-coding. */
  type: InsightType;
  /** Short pedagogical tag, e.g. "השתתפות מעולה". */
  tag: string;
  /** Free-text teacher note. */
  note: string;
}

/**
 * Age tier for the Social Compass (מצפן חברתי) sociometric survey. The teacher
 * picks this when opening a survey (the app has no per-class grade field); it
 * selects the age-appropriate question wording. See ARCHITECTURE.md §10.
 */
export type SocialSurveyLevel = 'elementary' | 'junior_high';

/**
 * One student's three sociometric picks (Social Compass). Each value is the
 * name of a chosen classmate: q1 = space-mission/project partner,
 * q2 = emotional-support anchor, q3 = seating/trip buddy.
 */
export interface SocialSurveyAnswers {
  q1: string;
  q2: string;
  q3: string;
}

/** A single archived parent message (Teacher's Private Workspace → WhatsApp Generator). */
export interface WhatsappMessage {
  /** Stable unique id (crypto.randomUUID). */
  id: string;
  /** ISO timestamp of when the message was archived. */
  date: string;
  /** The full synthesized message text. */
  text: string;
  /** Tone label used when generating, e.g. "חגיגי" (drives the badge color). */
  tone: string;
}

/**
 * A saved lesson playlist (Session Builder → אדריכל השיעור): an ordered sequence
 * of activities the teacher pre-builds at home and runs in class 1-click at a
 * time. Each id is either a games-registry id OR a tools-registry id.
 */
export interface LessonPlaylist {
  /** Stable unique id (crypto.randomUUID). */
  id: string;
  /** Teacher-given lesson name, e.g. "שיעור פתיחת שנה". */
  title: string;
  /** Ordered mix of games-registry ids and tools-registry ids. */
  gameAndToolIds: string[];
}

/** Default chore roles seeded for a new class / guest board (Smart Chore Board tool). */
export const DEFAULT_CHORES: string[] = [
  'תורן/נית לוח',
  'תורן/נית חלוקת דפים',
  'תורן/נית אורות ומזגן',
  'תורן/נית סידור ספרייה',
];

/**
 * A single saved class: a named roster of student names plus the games this
 * class has already finished. Stored per-teacher in Clerk `unsafeMetadata`
 * (see `ClassroomContext`).
 */
export interface Classroom {
  /** Stable unique id (crypto.randomUUID). */
  id: string;
  /** Display name, e.g. "ג'1". */
  name: string;
  /** Roster of student names. */
  students: string[];
  /** Ids of games this class has already played (cloud-persisted history). */
  playedGames: string[];
  /** Marble Jar tool: current marbles earned (cloud-persisted; default 0). */
  marblesCount: number;
  /** Marble Jar tool: goal capacity (cloud-persisted; default 30). */
  marblesTarget: number;
  /** Marble Jar tool: custom reward text unlocked at the goal (default "צ'ופר כיתתי"). */
  marblesReward: string;
  /** Smart Chore Board tool: chore roles defined for this class (default `DEFAULT_CHORES`). */
  customChoresList: string[];
  /** Smart Chore Board tool: chore name → assigned student names (cloud-persisted). */
  currentChoreAssignments: Record<string, string[]>;
  /** Student Insights tool: student name → recent pedagogical logs (capped, cloud-persisted). */
  studentInsights?: Record<string, StudentInsight[]>;
  /** WhatsApp Generator tool: recent parent messages sent (capped to 10, cloud-persisted). */
  whatsappHistory?: WhatsappMessage[];
  /** Session Builder tool: saved lesson playlists (capped to 20, cloud-persisted). */
  savedPlaylists?: LessonPlaylist[];
  /** Social Compass tool: is the sociometric survey open for student entries (default false). */
  socialSurveyActive?: boolean;
  /** Social Compass tool: 4-digit entry PIN shown on the board (default ''). */
  socialSurveyPin?: string;
  /** Social Compass tool: question tier the teacher chose on open (default 'elementary'). */
  socialSurveyLevel?: SocialSurveyLevel;
  /** Social Compass tool: submitter student name → their 3 confidential picks (default {}). */
  socialSurveyData?: Record<string, SocialSurveyAnswers>;
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
