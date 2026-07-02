// Shared resolver for Lesson Playlists (Session Builder / אדריכל השיעור).
// A playlist item id is either a games-registry id OR a tools-registry id; this
// module bridges an id to its display metadata + the React component to mount,
// reusing the same maps the single-activity pages use (REGISTRY_MAP / TOOLS_MAP).

import type { ComponentType } from 'react';
import type { EducationalGame } from '../types/game.types';
import type { ClassroomTool } from '../types/tool.types';
import gamesRegistry from './games-registry.json';
import toolsRegistry from './tools-registry.json';
import { subjectMeta } from './taxonomy';
import { REGISTRY_MAP } from '../pages/GamePage';
import { TOOLS_MAP } from '../pages/ToolPage';

const games = gamesRegistry as EducationalGame[];
const tools = toolsRegistry as ClassroomTool[];

/** Teal accent shared with the classroom utilities section. */
const TOOL_ACCENT = '#26a69a';

export type LessonItemKind = 'game' | 'tool';

/** A playlist item resolved to everything the builder/player need to render it. */
export interface ResolvedLessonItem {
  id: string;
  kind: LessonItemKind;
  title: string;
  description: string;
  /** Emoji icon (games — subject emoji). */
  emoji?: string;
  /** MUI icon name (tools — resolve via `toolIcon`). */
  iconName?: string;
  /** Accent color. */
  color: string;
  /** The React component to mount (undefined when the id isn't wired). */
  Component?: ComponentType<{ gameId?: string; toolId?: string }>;
}

/** Resolve a single game/tool id, or `null` if it belongs to neither registry. */
export function resolveLessonItem(id: string): ResolvedLessonItem | null {
  const game = games.find((g) => g.id === id);
  if (game) {
    const meta = subjectMeta(game.subject);
    return {
      id: game.id,
      kind: 'game',
      title: game.title,
      description: game.description,
      emoji: meta.icon,
      color: meta.color,
      Component: REGISTRY_MAP[game.componentName],
    };
  }
  const tool = tools.find((t) => t.id === id);
  if (tool) {
    return {
      id: tool.id,
      kind: 'tool',
      title: tool.title,
      description: tool.description,
      iconName: tool.icon,
      color: TOOL_ACCENT,
      Component: TOOLS_MAP[tool.id],
    };
  }
  return null;
}

/** All games followed by all utilities — the builder's "available activities" catalog. */
export const ALL_LESSON_ITEMS: ResolvedLessonItem[] = [
  ...games.map((g) => resolveLessonItem(g.id) as ResolvedLessonItem),
  ...tools.map((t) => resolveLessonItem(t.id) as ResolvedLessonItem),
];
