// Print & Play (דף מלווה לשיעור) contracts — see ARCHITECTURE.md §13.
// A `PrintableDoc` is a fully-materialized, shuffle-included description of one
// printable A4 document; `PrintTemplate` renders it, `printAdapters` builds it.

import type { CohortKey } from '../data/taxonomy';

/** One matching pair: `right` = Hebrew (RTL column), `left` = foreign/answer column. */
export interface MatchPair {
  right: string;
  left: string;
}

/** Cloze word: `template` contains exactly one '?' marking the missing letter. */
export interface ClozeItem {
  template: string;
  answerLetter: string;
  fullWord: string;
}

/** Circle-the-correct: the student circles every member of `correct` among `options`.
 *  An empty `correct` marks an open discussion item (no single right answer). */
export interface CircleItem {
  prompt: string;
  options: string[];
  correct: string[];
}

/** Fix-the-sentence: student marks תקין/טעות and rewrites; `correction` fills the key. */
export interface FixItem {
  sentence: string;
  hasGlitch: boolean;
  correction: string;
}

/** Reorder: `scrambled` printed as word tiles; `answer` is the correct sentence. */
export interface ReorderItem {
  scrambled: string[];
  answer: string;
}

/** Open question with dotted writing lines; `answer` optional (key shows a note otherwise). */
export interface OpenItem {
  prompt: string;
  writingLines: number;
  answer?: string;
}

interface SectionBase {
  heading: string;
  instruction: string;
}

/** The six generic worksheet layouts; every layout carries its own answers,
 *  so the teacher answer key is the same sections rendered in key mode. */
export type PrintSection =
  | (SectionBase & { layout: 'match'; pairs: MatchPair[]; shuffledLeft: string[] })
  | (SectionBase & { layout: 'cloze'; letterBank: string[]; items: ClozeItem[] })
  | (SectionBase & { layout: 'circle'; items: CircleItem[] })
  | (SectionBase & { layout: 'fix'; items: FixItem[] })
  | (SectionBase & { layout: 'reorder'; items: ReorderItem[] })
  | (SectionBase & { layout: 'open'; items: OpenItem[] });

/** One exit-ticket question: dotted writing lines, or the circle-a-mood emoji row. */
export interface ExitTicketQuestion {
  prompt: string;
  kind: 'lines' | 'mood';
  writingLines?: number;
}

export type PrintableDoc =
  | {
      kind: 'academic';
      gameTitle: string;
      cohort: CohortKey;
      cohortLabel: string;
      sections: PrintSection[];
    }
  | {
      kind: 'exit_ticket';
      gameTitle: string;
      cohort: CohortKey;
      cohortLabel: string;
      questions: ExitTicketQuestion[];
    };

/** A game's print adapter: which cohorts its content covers, and a doc builder.
 *  Calling `build` again with the same cohort yields a freshly-shuffled doc. */
export interface PrintAdapter {
  cohorts: CohortKey[];
  build: (cohort: CohortKey) => PrintableDoc;
}
