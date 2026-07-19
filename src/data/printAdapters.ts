// Print & Play adapter registry — see ARCHITECTURE.md §13.
// Each adapter maps a game's EXISTING content JSON onto the generic printable
// section layouts (`PrintSection`), so games gain a paper companion with zero
// component changes. Every `build(cohort)` call samples a fresh random subset —
// calling it again IS the reshuffle; the returned doc is fully materialized
// (shuffles included) so the on-screen preview and the printed copy are
// guaranteed identical.

import type { CohortKey } from './taxonomy';
import type { EducationalGame } from '../types/game.types';
import type {
  CircleItem,
  ClozeItem,
  FixItem,
  OpenItem,
  PrintAdapter,
  PrintSection,
  PrintableDoc,
  ReorderItem,
} from '../types/print.types';

import glitchContent from './content/spot-the-glitch-content.json';
import wordPopContent from './content/english-word-pop-content.json';
import sentenceContent from './content/sentence-detectives-content.json';
import letterBridgeContent from './content/letter-bridge-content.json';
import rhymeContent from './content/rhyme-express-content.json';
import monsterContent from './content/hungry-word-monster-content.json';
import punctuationContent from './content/punctuation-orchestra-content.json';
import exitTicketContent from './content/print-exit-ticket-content.json';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

/** Shuffle that is guaranteed different from the original order (when possible). */
function shuffleDifferent(words: string[]): string[] {
  if (words.length < 2) return [...words];
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const shuffled = shuffle(words);
    if (shuffled.join('|') !== words.join('|')) return shuffled;
  }
  return [...words].reverse();
}

// ---------------------------------------------------------------------------
// Content shapes (minimal views over the game content JSONs)
// ---------------------------------------------------------------------------

interface GlitchCohort {
  label: string;
  topics: { sentences: { text: string; hasGlitch: boolean; correction: string }[] }[];
}

interface WordPopCohort {
  label: string;
  categories: Record<string, { en: string; he: string; emoji: string; words: { en: string; he: string }[] }>;
}

interface SentenceCohort {
  label: string;
  sentences: { words: string[]; emoji: string }[];
}

interface LetterBridgeCohort {
  label: string;
  letterPairs: {
    letters: string[];
    label: string;
    planks: { template: string; answer: number; full: string }[];
  }[];
}

interface RhymeCohort {
  label: string;
  rounds: { target: string; correct: string[]; wrong: string[] }[];
}

interface MonsterCohort {
  label: string;
  focusSets: { label: string; rounds: { words: { text: string; correct: boolean }[] }[] }[];
}

interface PunctuationCohort {
  label: string;
  sentences: string[];
}

interface ExitTicketCohort {
  label: string;
  moodPrompt: string;
  openQuestions: string[];
}

const GLITCH = glitchContent as Record<CohortKey, GlitchCohort>;
const WORD_POP = wordPopContent as Record<CohortKey, WordPopCohort>;
const SENTENCES = sentenceContent as unknown as Partial<Record<CohortKey, SentenceCohort>>;
const LETTER_BRIDGE = letterBridgeContent as Record<CohortKey, LetterBridgeCohort>;
const RHYMES = rhymeContent as unknown as Partial<Record<CohortKey, RhymeCohort>>;
const MONSTER = monsterContent as unknown as Partial<Record<CohortKey, MonsterCohort>>;
const PUNCTUATION = punctuationContent as Record<CohortKey, PunctuationCohort>;
const EXIT_TICKETS = exitTicketContent as Record<CohortKey, ExitTicketCohort>;

// ---------------------------------------------------------------------------
// Academic worksheet adapters (gameId → PrintAdapter)
// ---------------------------------------------------------------------------

export const PRINT_ADAPTERS: Record<string, PrintAdapter> = {
  'spot-the-glitch': {
    cohorts: ['lower_elementary', 'upper_elementary', 'junior_high_high'],
    build: (cohort) => {
      const data = GLITCH[cohort];
      const all = data.topics.flatMap((t) => t.sentences);
      const glitched = all.filter((s) => s.hasGlitch);
      const clean = all.filter((s) => !s.hasGlitch);
      const items: FixItem[] = shuffle([...sample(glitched, 4), ...sample(clean, 2)]).map((s) => ({
        sentence: s.text,
        hasGlitch: s.hasGlitch,
        correction: s.correction,
      }));
      const sections: PrintSection[] = [
        {
          layout: 'fix',
          heading: 'בלשי השפה: תקין או שיש טעות?',
          instruction: 'קראו כל משפט בקול, סמנו אם הוא תקין או שגוי — ואם יש טעות, כתבו את התיקון על הקו.',
          items,
        },
      ];
      return { kind: 'academic', gameTitle: '', cohort, cohortLabel: data.label, sections };
    },
  },

  'english-word-pop': {
    cohorts: ['lower_elementary', 'upper_elementary', 'junior_high_high'],
    build: (cohort) => {
      const data = WORD_POP[cohort];
      const categories = Object.values(data.categories);
      const category = categories[Math.floor(Math.random() * categories.length)];
      const words = shuffle(category.words);
      // Leave at least 3 words out of the matching table so the circle
      // exercise below never re-tests the same pairs.
      const matchCount = Math.max(4, Math.min(8, words.length - 3));
      const matchWords = words.slice(0, matchCount);
      const circleWords = words.slice(matchCount, matchCount + 4);
      const pairs = matchWords.map((w) => ({ right: w.he, left: w.en }));
      const circleItems: CircleItem[] = circleWords.map((w) => {
        const distractors = sample(
          category.words.filter((other) => other.en !== w.en).map((other) => other.en),
          2,
        );
        return { prompt: w.he, options: shuffle([w.en, ...distractors]), correct: [w.en] };
      });
      const sections: PrintSection[] = [
        {
          layout: 'match',
          heading: `התאמת מילים: ${category.he} ${category.emoji}`,
          instruction: 'מתחו קו בין המילה בעברית לבין המילה המתאימה באנגלית.',
          pairs,
          shuffledLeft: shuffle(pairs.map((p) => p.left)),
        },
        {
          layout: 'circle',
          heading: 'הקיפו את התרגום הנכון',
          instruction: 'לכל מילה בעברית — הקיפו בעיגול את המילה הנכונה באנגלית.',
          items: circleItems,
        },
      ];
      return { kind: 'academic', gameTitle: '', cohort, cohortLabel: data.label, sections };
    },
  },

  'sentence-detectives': {
    cohorts: ['lower_elementary', 'upper_elementary'],
    build: (cohort) => {
      const data = SENTENCES[cohort];
      if (!data) throw new Error(`sentence-detectives has no content for cohort ${cohort}`);
      const items: ReorderItem[] = sample(data.sentences, 5).map((s) => ({
        scrambled: shuffleDifferent(s.words),
        answer: s.words.join(' '),
      }));
      const sections: PrintSection[] = [
        {
          layout: 'reorder',
          heading: 'בלשי המשפטים: סדרו את המילים',
          instruction: 'הסערה בלבלה את המילים! סדרו אותן מחדש וכתבו את המשפט הנכון על הקו.',
          items,
        },
      ];
      return { kind: 'academic', gameTitle: '', cohort, cohortLabel: data.label, sections };
    },
  },

  'letter-bridge': {
    cohorts: ['lower_elementary', 'upper_elementary', 'junior_high_high'],
    build: (cohort) => {
      const data = LETTER_BRIDGE[cohort];
      const pairs = sample(data.letterPairs, 2);
      const sections: PrintSection[] = pairs.map((pair) => {
        const items: ClozeItem[] = sample(pair.planks, 4).map((plank) => ({
          template: plank.template,
          answerLetter: pair.letters[plank.answer],
          fullWord: plank.full,
        }));
        return {
          layout: 'cloze',
          heading: `השלימו את האות החסרה: ${pair.label}`,
          instruction: `בכל מילה חסרה אות אחת. השלימו אותה מתוך בנק האותיות: ${pair.letters.join(' / ')}.`,
          letterBank: pair.letters,
          items,
        };
      });
      return { kind: 'academic', cohort, gameTitle: '', cohortLabel: data.label, sections };
    },
  },

  'rhyme-express': {
    cohorts: ['lower_elementary', 'upper_elementary'],
    build: (cohort) => {
      const data = RHYMES[cohort];
      if (!data) throw new Error(`rhyme-express has no content for cohort ${cohort}`);
      const items: CircleItem[] = sample(data.rounds, 5).map((round) => {
        const correct = sample(round.correct, 2);
        const wrong = sample(round.wrong, 2);
        return { prompt: round.target, options: shuffle([...correct, ...wrong]), correct };
      });
      const sections: PrintSection[] = [
        {
          layout: 'circle',
          heading: 'רכבת החרוזים: מי מתחרז?',
          instruction: 'לכל מילת קטר — הקיפו בעיגול את שתי המילים שמתחרזות איתה.',
          items,
        },
      ];
      return { kind: 'academic', gameTitle: '', cohort, cohortLabel: data.label, sections };
    },
  },

  'hungry-word-monster': {
    cohorts: ['lower_elementary', 'upper_elementary'],
    build: (cohort) => {
      const data = MONSTER[cohort];
      if (!data) throw new Error(`hungry-word-monster has no content for cohort ${cohort}`);
      const sets = sample(data.focusSets, Math.min(3, data.focusSets.length));
      // Merge each focus set's rounds into one rich circling bank (deduped).
      const items: CircleItem[] = sets.map((set) => {
        const seen = new Set<string>();
        const bank: { text: string; correct: boolean }[] = [];
        for (const round of set.rounds) {
          for (const word of round.words) {
            if (!seen.has(word.text)) {
              seen.add(word.text);
              bank.push(word);
            }
          }
        }
        const options = shuffle(bank).slice(0, 12);
        return {
          prompt: set.label,
          options: options.map((w) => w.text),
          correct: options.filter((w) => w.correct).map((w) => w.text),
        };
      });
      const sections: PrintSection[] = [
        {
          layout: 'circle',
          heading: 'האכילו את מפלצת המילים!',
          instruction: 'המפלצת רעבה רק לסוג אחד של מילים. הקיפו בעיגול את כל המילים שמתאימות לכלל.',
          items,
        },
      ];
      return { kind: 'academic', gameTitle: '', cohort, cohortLabel: data.label, sections };
    },
  },

  'punctuation-orchestra': {
    cohorts: ['lower_elementary', 'upper_elementary', 'junior_high_high'],
    build: (cohort) => {
      const data = PUNCTUATION[cohort];
      const chosen = sample(data.sentences, 5);
      const circleItems: CircleItem[] = chosen.map((sentence) => ({
        prompt: sentence,
        options: ['.', '?', '!'],
        // Deliberately empty: the game is about expression — any mark changes
        // the tone, so the answer key shows a discussion note instead.
        correct: [],
      }));
      const openItems: OpenItem[] = [
        { prompt: 'בחרו משפט אחד מהרשימה וכתבו אותו מחדש כשאלה (עם סימן שאלה).', writingLines: 2 },
        { prompt: 'עכשיו כתבו את אותו משפט כקריאה נרגשת (עם סימן קריאה).', writingLines: 2 },
      ];
      const sections: PrintSection[] = [
        {
          layout: 'circle',
          heading: 'תזמורת סימני הפיסוק',
          instruction: 'קראו כל משפט בקול שלוש פעמים — פעם כקביעה, פעם כשאלה ופעם כקריאה. הקיפו את הסימן שהכי מתאים לדעתכם.',
          items: circleItems,
        },
        {
          layout: 'open',
          heading: 'מלחינים צעירים',
          instruction: 'כתבו בעצמכם:',
          items: openItems,
        },
      ];
      return { kind: 'academic', gameTitle: '', cohort, cohortLabel: data.label, sections };
    },
  },
};

// ---------------------------------------------------------------------------
// Social exit ticket (shared across all social games — no per-game adapter)
// ---------------------------------------------------------------------------

const EXIT_TICKET_COHORTS: CohortKey[] = ['lower_elementary', 'upper_elementary', 'junior_high_high'];

export function buildExitTicket(cohort: CohortKey, gameTitle: string): PrintableDoc {
  const data = EXIT_TICKETS[cohort];
  const writingLines = cohort === 'junior_high_high' ? 3 : 2;
  return {
    kind: 'exit_ticket',
    gameTitle,
    cohort,
    cohortLabel: data.label,
    questions: [
      ...sample(data.openQuestions, 2).map((prompt) => ({
        prompt,
        kind: 'lines' as const,
        writingLines,
      })),
      { prompt: data.moodPrompt, kind: 'mood' as const },
    ],
  };
}

// ---------------------------------------------------------------------------
// Dispatch helpers (used by PrintPreviewDialog)
// ---------------------------------------------------------------------------

/** The cohorts a printable game can produce a document for. */
export function availableCohortsForGame(game: EducationalGame): CohortKey[] {
  if (!game.printableInfo?.supported) return [];
  if (game.printableInfo.type === 'academic_worksheet') {
    return PRINT_ADAPTERS[game.id]?.cohorts ?? [];
  }
  if (game.printableInfo.type === 'social_exit_ticket') return EXIT_TICKET_COHORTS;
  return [];
}

/** Build the printable document for a game, or null when it isn't printable. */
export function buildDocForGame(game: EducationalGame, cohort: CohortKey): PrintableDoc | null {
  if (!game.printableInfo?.supported) return null;
  if (game.printableInfo.type === 'academic_worksheet') {
    const adapter = PRINT_ADAPTERS[game.id];
    if (!adapter || !adapter.cohorts.includes(cohort)) return null;
    return { ...adapter.build(cohort), gameTitle: game.title };
  }
  if (game.printableInfo.type === 'social_exit_ticket') {
    return buildExitTicket(cohort, game.title);
  }
  return null;
}
