// Ulpan Accelerator — shared lesson-generation engine (see ARCHITECTURE.md §10).
//
// A pure, deterministic template engine (no backend/LLM) that composes the two
// content JSONs into a `GeneratedLesson`. All instructional copy is authored in
// a veteran-Ulpan / SLA-expert voice INSIDE the JSON — this module only selects
// and assembles it per {chapter, profile}. Shared by `UlpanWorkspace` (the
// "Brain" UI) and `LessonPlayer` (the full-screen "Screen").

import chaptersData from './content/ulpan-chapters.json';
import generatorData from './content/ulpan-generator-content.json';
import gamesRegistry from './games-registry.json';
import type { EducationalGame } from '../types/game.types';

// ---------------------------------------------------------------------------
// Types — shapes of the two content JSON files + the profile/lesson contracts
// ---------------------------------------------------------------------------

export type CohortKey = 'lower_elementary' | 'upper_elementary' | 'junior_high_high';
export type LevelKey = 'level_1' | 'level_2' | 'level_3';
export type NativeLangKey = 'english' | 'russian' | 'french' | 'spanish' | 'other';

export interface UlpanProfile {
  ageGroup: CohortKey;
  nativeLanguage: NativeLangKey;
  level: LevelKey;
}

export interface TokenItem {
  word: string;
  emoji: string;
}

export interface UlpanChapter {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  baseTokens: TokenItem[];
}

export interface UlpanPhase {
  key: string;
  label: string;
  blurb: string;
  chapters: UlpanChapter[];
}

interface ContrastiveNote {
  text: string;
  /** Optional chapter filter — a note without it applies to every chapter. */
  chapters?: number[];
}

interface ChapterCorpus {
  warmup: Record<CohortKey, string>;
  expansionTokens: { level_2: string[]; level_3: string[] };
  sentenceFrames: string[];
  game: {
    gameId: string;
    rationale: string;
    launchTip: Record<LevelKey, string>;
  };
  mission: Record<LevelKey, { title: string; challenge: string; success: string }>;
}

interface GeneratorContent {
  intro: { title: string; body: string };
  ageGroups: Record<CohortKey, string>;
  levels: Record<
    LevelKey,
    { label: string; vocabApproach: string; worksheetGuidance: string; closure: string }
  >;
  nativeLanguages: Record<NativeLangKey, { label: string; notes: ContrastiveNote[] }>;
  chapters: Record<string, ChapterCorpus>;
}

export interface GeneratedLesson {
  chapter: UlpanChapter;
  profile: UlpanProfile;
  warmup: string;
  /** Full teaching vocabulary: baseTokens + level-appropriate expansion tiers. */
  wordArray: string[];
  vocabApproach: string;
  contrastiveNotes: string[];
  game: { gameId: string; gameTitle: string; rationale: string; launchTip: string };
  /** Input-driven games get these as paste-ready generated sentences. */
  pasteSentences: string[];
  closure: string;
  sentenceFrames: string[];
  worksheetGuidance: string;
  mission: { title: string; challenge: string; success: string };
}

export const PHASES = (chaptersData as { phases: UlpanPhase[] }).phases;
export const CONTENT = generatorData as unknown as GeneratorContent;
const GAMES = gamesRegistry as EducationalGame[];

/** Games whose mechanics consume teacher-typed input — the generated sentences paste straight in. */
export const INPUT_DRIVEN_GAMES = new Set(['two-truths-lie', 'punctuation-orchestra']);

// ---------------------------------------------------------------------------
// The generation engine — a pure deterministic composition of the corpus.
// ---------------------------------------------------------------------------

export function buildLessonPlan(chapter: UlpanChapter, profile: UlpanProfile): GeneratedLesson {
  const corpus = CONTENT.chapters[String(chapter.id)];
  const levelMeta = CONTENT.levels[profile.level];

  const baseWords = chapter.baseTokens.map((t) => t.word);
  const expansion =
    profile.level === 'level_1'
      ? []
      : profile.level === 'level_2'
        ? corpus.expansionTokens.level_2
        : [...corpus.expansionTokens.level_2, ...corpus.expansionTokens.level_3];
  const wordArray = [...baseWords, ...expansion];

  const contrastiveNotes = CONTENT.nativeLanguages[profile.nativeLanguage].notes
    .filter((n) => !n.chapters || n.chapters.includes(chapter.id))
    .slice(0, 3)
    .map((n) => n.text);

  const gameTitle = GAMES.find((g) => g.id === corpus.game.gameId)?.title ?? corpus.game.gameId;

  return {
    chapter,
    profile,
    warmup: corpus.warmup[profile.ageGroup],
    wordArray,
    vocabApproach: levelMeta.vocabApproach,
    contrastiveNotes,
    game: {
      gameId: corpus.game.gameId,
      gameTitle,
      rationale: corpus.game.rationale,
      launchTip: corpus.game.launchTip[profile.level],
    },
    pasteSentences: corpus.expansionTokens.level_3,
    closure: levelMeta.closure,
    sentenceFrames: corpus.sentenceFrames,
    worksheetGuidance: levelMeta.worksheetGuidance,
    mission: corpus.mission[profile.level],
  };
}
