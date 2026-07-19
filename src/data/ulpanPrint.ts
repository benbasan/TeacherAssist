// Ulpan Accelerator — maps a GeneratedLesson onto the shared Print & Play
// engine (see ARCHITECTURE.md §10 / §13). Produces materialized `PrintableDoc`s
// that `PrintTemplate` renders as strict B&W A4 sheets, so the Ulpan worksheet
// reuses the same ink-saver renderer + `#print-mount` portal as the games.

import type { GeneratedLesson } from './ulpanLesson';
import type { MatchPair, PrintSection, PrintableDoc } from '../types/print.types';

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** A guaranteed-different shuffle so a picture never lands next to its word. */
function shuffleDifferent(items: string[]): string[] {
  if (items.length < 2) return [...items];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const next = shuffle(items);
    if (next.join('|') !== items.join('|')) return next;
  }
  return [...items].reverse();
}

/**
 * Student worksheet + auto teacher answer key (page 2, "🔑 דף תשובות למורה — חסוי"):
 * a word↔picture matching table, a copy/tracing block, and (level 2/3) sentence
 * frames to complete. All sourced from the lesson so it matches the live slides.
 */
export function buildUlpanWorksheetDoc(lesson: GeneratedLesson): PrintableDoc {
  const { chapter, profile } = lesson;
  const tokens = chapter.baseTokens;

  const pairs: MatchPair[] = tokens.map((t) => ({ right: t.word, left: t.emoji }));
  const sections: PrintSection[] = [
    {
      layout: 'match',
      heading: '🔗 מחברים מילה לתמונה',
      instruction: 'מתחו קו מכל מילה אל התמונה המתאימה לה.',
      pairs,
      shuffledLeft: shuffleDifferent(pairs.map((p) => p.left)),
    },
    {
      layout: 'open',
      heading: '🖊️ מתאמנים בכתיבה',
      instruction:
        profile.level === 'level_1'
          ? 'העתיקו כל מילה על השורה שלידה — לאט וברור.'
          : 'כתבו כל מילה מהזיכרון על השורה שלידה.',
      items: tokens.slice(0, 6).map((t) => ({
        prompt: `${t.emoji}  ${t.word}`,
        writingLines: 1,
        answer: t.word,
      })),
    },
  ];

  // Sentence frames only make pedagogical sense from level 2 up (level 1 = words only).
  if (profile.level !== 'level_1' && lesson.sentenceFrames.length > 0) {
    sections.push({
      layout: 'open',
      heading: '✏️ משלימים משפט',
      instruction: 'השלימו כל משפט במילה מתאימה מהשיעור.',
      items: lesson.sentenceFrames.map((frame) => ({ prompt: frame, writingLines: 1 })),
    });
  }

  return {
    kind: 'academic',
    gameTitle: `${chapter.icon} ${chapter.title}`,
    cohort: profile.ageGroup,
    cohortLabel: `${lesson.chapter.subtitle} · אולפן דינמי`,
    sections,
  };
}

/**
 * Reflection exit ticket — printed TWICE per A4 with a ✂️ cut line (paper saver):
 * a mood row + two short reflection prompts tied to the chapter.
 */
export function buildUlpanExitTicketDoc(lesson: GeneratedLesson): PrintableDoc {
  const { chapter, profile } = lesson;
  return {
    kind: 'exit_ticket',
    gameTitle: `${chapter.icon} ${chapter.title}`,
    cohort: profile.ageGroup,
    cohortLabel: `${lesson.chapter.subtitle} · אולפן דינמי`,
    questions: [
      { prompt: 'איך הרגשתי בשיעור העברית היום? (הקיפו בעיגול)', kind: 'mood' },
      { prompt: 'מילה אחת חדשה שאני לוקח/ת איתי מהיום...', kind: 'lines', writingLines: 1 },
      {
        prompt: 'איפה אנסה להשתמש בעברית שלי היום מחוץ לכיתה?',
        kind: 'lines',
        writingLines: 2,
      },
    ],
  };
}
