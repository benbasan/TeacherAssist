// Display taxonomy for the games registry.
// The registry stores compact keys (`subject`, `targetAge`); these maps turn them
// into warm Hebrew labels and give the catalog its visual identity (icon + accent
// color) without storing presentation data on each game entry.

interface SubjectMeta {
  label: string;
  icon: string;
  color: string;
}

/** Subject key → Hebrew label, emoji icon, and accent color. */
export const SUBJECTS: Record<string, SubjectMeta> = {
  social: { label: 'חברתי-רגשי', icon: '💛', color: '#26a69a' },
  language: { label: 'שפה', icon: '📚', color: '#5c6bc0' },
  hebrew: { label: 'עברית ושפה', icon: '📖', color: '#7e57c2' },
  thinking: { label: 'חשיבה', icon: '🧩', color: '#ab47bc' },
  math: { label: 'חשבון', icon: '🔢', color: '#ef5350' },
  science: { label: 'מדעים', icon: '🔬', color: '#42a5f5' },
  focus: { label: 'קשב ורוגע', icon: '🧘', color: '#10b981' },
  english: { label: 'אנגלית', icon: '🔤', color: '#ff9800' },
};

/** Fallback used when a subject key isn't in the map. */
const SUBJECT_FALLBACK: SubjectMeta = { label: 'כללי', icon: '🎲', color: '#7e57c2' };

export function subjectMeta(subject: string): SubjectMeta {
  return SUBJECTS[subject] ?? SUBJECT_FALLBACK;
}

/** Target-age key → Hebrew label. */
export const TARGET_AGE_LABELS: Record<string, string> = {
  preschool: 'גן',
  elementary_low: 'יסודי — שכבה צעירה',
  elementary_high: 'יסודי — שכבה בוגרת',
  elementary_high_and_junior_high: 'יסודי בוגר וחטיבת ביניים',
  elementary_to_high: 'יסודי עד תיכון',
  middle: 'חטיבת ביניים',
  high: 'תיכון',
};

export function targetAgeLabel(targetAge: string): string {
  return TARGET_AGE_LABELS[targetAge] ?? targetAge;
}

// ---------------------------------------------------------------------------
// Age-cohort bridge (classroom catalog filter)
// ---------------------------------------------------------------------------
// The classroom catalog filters games by three pedagogical cohorts. The games
// registry, however, stores finer/over-lapping `targetAge` keys (e.g.
// `elementary_to_high`). This bridge maps each registry key onto one or more
// cohorts so the 3-bucket filter can match games WITHOUT migrating the data.

export type CohortKey = 'lower_elementary' | 'upper_elementary' | 'junior_high_high';

/** The three filter cohorts, in display order, with their Hebrew labels. */
export const COHORTS: { key: CohortKey; label: string }[] = [
  { key: 'lower_elementary', label: "א'-ג'" },
  { key: 'upper_elementary', label: "ד'-ו'" },
  { key: 'junior_high_high', label: 'ז\'-י"ב' },
];

/** Registry `targetAge` key → the cohorts a game with that key belongs to. */
const TARGET_AGE_TO_COHORTS: Record<string, CohortKey[]> = {
  preschool: ['lower_elementary'],
  elementary_low: ['lower_elementary'],
  elementary_high: ['upper_elementary'],
  elementary_high_and_junior_high: ['upper_elementary', 'junior_high_high'],
  elementary_to_high: ['lower_elementary', 'upper_elementary', 'junior_high_high'],
  middle: ['junior_high_high'],
  high: ['junior_high_high'],
};

/**
 * Maps a registry `targetAge` value to the cohort buckets it should appear under
 * in the classroom catalog filter. Unknown keys fall back to all three cohorts
 * so a game is never hidden by a missing mapping.
 */
export function cohortsForTargetAge(targetAge: string): CohortKey[] {
  return (
    TARGET_AGE_TO_COHORTS[targetAge] ?? [
      'lower_elementary',
      'upper_elementary',
      'junior_high_high',
    ]
  );
}
