/**
 * Contract for a "Classroom Utility" — an everyday teaching tool that is NOT a
 * game (no score / win-lose / history). Source of truth: `tools-registry.json`.
 * See ARCHITECTURE.md §9.
 */
export interface ClassroomTool {
  /** Stable unique id — used in the URL (`/tools/:toolId`) AND as the Tools-Map key. */
  id: string;
  /** Display name (Hebrew). */
  title: string;
  /** Short, warm description (Hebrew). */
  description: string;
  /** MUI Material icon name, e.g. "auto_stories", "groups" (resolved via `tools/iconMap`). */
  icon: string;
}
