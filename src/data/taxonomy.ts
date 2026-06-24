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
  middle: 'חטיבת ביניים',
  high: 'תיכון',
};

export function targetAgeLabel(targetAge: string): string {
  return TARGET_AGE_LABELS[targetAge] ?? targetAge;
}
