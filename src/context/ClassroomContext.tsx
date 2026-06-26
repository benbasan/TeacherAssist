import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useUser } from '@clerk/clerk-react';
import type { Classroom, InsightType } from '../types/game.types';
import { DEFAULT_CHORES } from '../types/game.types';

/** Max insights kept per student — guards Clerk's ~8KB `unsafeMetadata` limit. */
const MAX_INSIGHTS_PER_STUDENT = 15;

/** Max archived parent messages kept per class — same 8KB metadata guard. */
const MAX_WHATSAPP_HISTORY = 10;

// Re-exported for backward compatibility: `Classroom` now lives with the other
// domain types in `src/types/game.types.ts`.
export type { Classroom };

interface ClassroomContextValue {
  /** The teacher's saved classes (empty when signed out / not yet loaded). */
  classrooms: Classroom[];
  /** Whether Clerk has finished loading the user. */
  isLoaded: boolean;
  /** Whether a teacher is currently signed in. */
  isSignedIn: boolean;
  addClassroom: (name: string, students: string[]) => Promise<void>;
  updateClassroom: (id: string, updated: Partial<Classroom>) => Promise<void>;
  removeClassroom: (id: string) => Promise<void>;

  // --- Session state (in-memory only; not persisted to Clerk) ---------------
  /** Id of the class the teacher is currently teaching, or null (→ gateway). */
  activeClassroomId: string | null;
  /** The active classroom resolved from `activeClassroomId`, or null. */
  activeClassroom: Classroom | null;
  /** Names marked absent for the current session. */
  absentStudents: string[];
  /** Select (or clear) the active class. Clearing resets attendance. */
  setActiveClassroom: (id: string | null) => void;
  /** Toggle a student's attendance (present ⇆ absent) for this session. */
  toggleStudentAttendance: (studentName: string) => void;
  /** Append a game id to a class's `playedGames` (cloud-persisted, deduped). */
  markGameAsPlayedInClass: (classId: string, gameId: string) => Promise<void>;

  // --- Marble Jar tool (cloud-persisted per class) --------------------------
  /** Add/subtract marbles, clamped to [0, marblesTarget]. */
  updateMarbles: (classId: string, amount: number) => Promise<void>;
  /** Set the goal capacity + custom reward text (clamps count down if needed). */
  setMarbleGoal: (classId: string, target: number, reward: string) => Promise<void>;
  /** Reset the jar's `marblesCount` back to 0. */
  resetMarbleJar: (classId: string) => Promise<void>;

  // --- Smart Chore Board tool (cloud-persisted per class) -------------------
  /** Overwrite a class's chore roles (drops assignments for removed chores). */
  saveChoresConfig: (classId: string, choresList: string[]) => Promise<void>;
  /** Save the chore → students assignment map. */
  updateChoreAssignments: (
    classId: string,
    assignments: Record<string, string[]>,
  ) => Promise<void>;
  /** Reset the assignment map to empty. */
  clearChoreAssignments: (classId: string) => Promise<void>;

  // --- Student Insights tool (Teacher's Private Workspace; cloud-persisted) --
  /** Append a pedagogical insight for a student (capped to the most recent 15). */
  addStudentInsight: (
    classId: string,
    studentName: string,
    type: InsightType,
    tag: string,
    note: string,
  ) => Promise<void>;
  /** Remove a single insight entry by id. */
  deleteStudentInsight: (
    classId: string,
    studentName: string,
    insightId: string,
  ) => Promise<void>;

  // --- WhatsApp Generator tool (Teacher's Private Workspace; cloud-persisted) -
  /** Archive a sent parent message (capped to the most recent 10). */
  addWhatsappToHistory: (classId: string, text: string, tone: string) => Promise<void>;
  /** Remove a single archived message by id. */
  deleteWhatsappFromHistory: (classId: string, messageId: string) => Promise<void>;
}

const ClassroomContext = createContext<ClassroomContextValue | null>(null);

/**
 * Serverless cloud layer for Multi-Classroom Management.
 *
 * Classes are stored per-user in Clerk's client-writable `unsafeMetadata`, so
 * there is no backend. We derive `classrooms` directly from the live
 * `user.unsafeMetadata` (Clerk's `user` object is reactive and re-renders after
 * each `user.update`), which keeps the list from ever going stale.
 *
 * Session state — `activeClassroomId` and `absentStudents` — is deliberately
 * kept in React memory (not persisted), so every app entry re-prompts for the
 * class and starts attendance fresh.
 */
export function ClassroomProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();

  const classrooms = useMemo<Classroom[]>(() => {
    const raw = (user?.unsafeMetadata?.classrooms as Classroom[] | undefined) ?? [];
    // Normalize legacy classrooms that predate `playedGames` / the Marble Jar fields.
    return raw.map((c) => ({
      ...c,
      playedGames: c.playedGames ?? [],
      marblesCount: c.marblesCount ?? 0,
      marblesTarget: c.marblesTarget ?? 30,
      marblesReward: c.marblesReward ?? "צ'ופר כיתתי",
      customChoresList: c.customChoresList ?? DEFAULT_CHORES,
      currentChoreAssignments: c.currentChoreAssignments ?? {},
      studentInsights: c.studentInsights ?? {},
      whatsappHistory: c.whatsappHistory ?? [],
    }));
  }, [user?.unsafeMetadata]);

  const [activeClassroomId, setActiveClassroomId] = useState<string | null>(null);
  const [absentStudents, setAbsentStudents] = useState<string[]>([]);

  const activeClassroom = useMemo<Classroom | null>(
    () => classrooms.find((c) => c.id === activeClassroomId) ?? null,
    [classrooms, activeClassroomId],
  );

  // Rewrites the whole classrooms array back to Clerk, preserving other metadata.
  const persist = useCallback(
    async (next: Classroom[]) => {
      if (!user) return;
      await user.update({
        unsafeMetadata: { ...user.unsafeMetadata, classrooms: next },
      });
    },
    [user],
  );

  const addClassroom = useCallback(
    async (name: string, students: string[]) => {
      const classroom: Classroom = {
        id: crypto.randomUUID(),
        name,
        students,
        playedGames: [],
        marblesCount: 0,
        marblesTarget: 30,
        marblesReward: "צ'ופר כיתתי",
        customChoresList: DEFAULT_CHORES,
        currentChoreAssignments: {},
        studentInsights: {},
        whatsappHistory: [],
      };
      await persist([...classrooms, classroom]);
    },
    [classrooms, persist],
  );

  const updateClassroom = useCallback(
    async (id: string, updated: Partial<Classroom>) => {
      await persist(
        classrooms.map((c) => (c.id === id ? { ...c, ...updated, id: c.id } : c)),
      );
    },
    [classrooms, persist],
  );

  const removeClassroom = useCallback(
    async (id: string) => {
      await persist(classrooms.filter((c) => c.id !== id));
    },
    [classrooms, persist],
  );

  const setActiveClassroom = useCallback((id: string | null) => {
    setActiveClassroomId(id);
    setAbsentStudents([]); // a fresh class starts with everyone present
  }, []);

  const toggleStudentAttendance = useCallback((studentName: string) => {
    setAbsentStudents((prev) =>
      prev.includes(studentName)
        ? prev.filter((n) => n !== studentName)
        : [...prev, studentName],
    );
  }, []);

  const markGameAsPlayedInClass = useCallback(
    async (classId: string, gameId: string) => {
      const target = classrooms.find((c) => c.id === classId);
      if (!target || target.playedGames.includes(gameId)) return; // dedupe
      await persist(
        classrooms.map((c) =>
          c.id === classId ? { ...c, playedGames: [...c.playedGames, gameId] } : c,
        ),
      );
    },
    [classrooms, persist],
  );

  const updateMarbles = useCallback(
    async (classId: string, amount: number) => {
      const target = classrooms.find((c) => c.id === classId);
      if (!target) return;
      const next = Math.max(0, Math.min(target.marblesTarget, target.marblesCount + amount));
      if (next === target.marblesCount) return; // no-op at the clamp boundary
      await persist(
        classrooms.map((c) => (c.id === classId ? { ...c, marblesCount: next } : c)),
      );
    },
    [classrooms, persist],
  );

  const setMarbleGoal = useCallback(
    async (classId: string, target: number, reward: string) => {
      await persist(
        classrooms.map((c) =>
          c.id === classId
            ? {
                ...c,
                marblesTarget: target,
                marblesReward: reward,
                // A lowered goal can't leave an over-full jar.
                marblesCount: Math.min(c.marblesCount, target),
              }
            : c,
        ),
      );
    },
    [classrooms, persist],
  );

  const resetMarbleJar = useCallback(
    async (classId: string) => {
      await persist(
        classrooms.map((c) => (c.id === classId ? { ...c, marblesCount: 0 } : c)),
      );
    },
    [classrooms, persist],
  );

  const saveChoresConfig = useCallback(
    async (classId: string, choresList: string[]) => {
      await persist(
        classrooms.map((c) => {
          if (c.id !== classId) return c;
          // Drop assignments for chores that no longer exist.
          const kept: Record<string, string[]> = {};
          for (const chore of choresList) {
            if (c.currentChoreAssignments[chore]) kept[chore] = c.currentChoreAssignments[chore];
          }
          return { ...c, customChoresList: choresList, currentChoreAssignments: kept };
        }),
      );
    },
    [classrooms, persist],
  );

  const updateChoreAssignments = useCallback(
    async (classId: string, assignments: Record<string, string[]>) => {
      await persist(
        classrooms.map((c) =>
          c.id === classId ? { ...c, currentChoreAssignments: assignments } : c,
        ),
      );
    },
    [classrooms, persist],
  );

  const clearChoreAssignments = useCallback(
    async (classId: string) => {
      await persist(
        classrooms.map((c) =>
          c.id === classId ? { ...c, currentChoreAssignments: {} } : c,
        ),
      );
    },
    [classrooms, persist],
  );

  const addStudentInsight = useCallback(
    async (
      classId: string,
      studentName: string,
      type: InsightType,
      tag: string,
      note: string,
    ) => {
      const insight = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        type,
        tag,
        note,
      };
      await persist(
        classrooms.map((c) => {
          if (c.id !== classId) return c;
          const all = c.studentInsights ?? {};
          const forStudent = all[studentName] ?? [];
          // Keep only the most recent 15 to stay under Clerk's metadata limit.
          const next = [...forStudent, insight].slice(-MAX_INSIGHTS_PER_STUDENT);
          return { ...c, studentInsights: { ...all, [studentName]: next } };
        }),
      );
    },
    [classrooms, persist],
  );

  const deleteStudentInsight = useCallback(
    async (classId: string, studentName: string, insightId: string) => {
      await persist(
        classrooms.map((c) => {
          if (c.id !== classId) return c;
          const all = c.studentInsights ?? {};
          const forStudent = all[studentName] ?? [];
          return {
            ...c,
            studentInsights: {
              ...all,
              [studentName]: forStudent.filter((entry) => entry.id !== insightId),
            },
          };
        }),
      );
    },
    [classrooms, persist],
  );

  const addWhatsappToHistory = useCallback(
    async (classId: string, text: string, tone: string) => {
      const message = { id: crypto.randomUUID(), date: new Date().toISOString(), text, tone };
      await persist(
        classrooms.map((c) => {
          if (c.id !== classId) return c;
          const history = c.whatsappHistory ?? [];
          // Keep only the most recent 10 to stay under Clerk's metadata limit.
          const next = [...history, message].slice(-MAX_WHATSAPP_HISTORY);
          return { ...c, whatsappHistory: next };
        }),
      );
    },
    [classrooms, persist],
  );

  const deleteWhatsappFromHistory = useCallback(
    async (classId: string, messageId: string) => {
      await persist(
        classrooms.map((c) =>
          c.id === classId
            ? { ...c, whatsappHistory: (c.whatsappHistory ?? []).filter((m) => m.id !== messageId) }
            : c,
        ),
      );
    },
    [classrooms, persist],
  );

  const value = useMemo<ClassroomContextValue>(
    () => ({
      classrooms,
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      addClassroom,
      updateClassroom,
      removeClassroom,
      activeClassroomId,
      activeClassroom,
      absentStudents,
      setActiveClassroom,
      toggleStudentAttendance,
      markGameAsPlayedInClass,
      updateMarbles,
      setMarbleGoal,
      resetMarbleJar,
      saveChoresConfig,
      updateChoreAssignments,
      clearChoreAssignments,
      addStudentInsight,
      deleteStudentInsight,
      addWhatsappToHistory,
      deleteWhatsappFromHistory,
    }),
    [
      classrooms,
      isLoaded,
      isSignedIn,
      addClassroom,
      updateClassroom,
      removeClassroom,
      activeClassroomId,
      activeClassroom,
      absentStudents,
      setActiveClassroom,
      toggleStudentAttendance,
      markGameAsPlayedInClass,
      updateMarbles,
      setMarbleGoal,
      resetMarbleJar,
      saveChoresConfig,
      updateChoreAssignments,
      clearChoreAssignments,
      addStudentInsight,
      deleteStudentInsight,
      addWhatsappToHistory,
      deleteWhatsappFromHistory,
    ],
  );

  return <ClassroomContext.Provider value={value}>{children}</ClassroomContext.Provider>;
}

/** Access the classroom cloud layer. Must be used inside a `ClassroomProvider`. */
export function useClassrooms(): ClassroomContextValue {
  const ctx = useContext(ClassroomContext);
  if (!ctx) {
    throw new Error('useClassrooms must be used within a ClassroomProvider');
  }
  return ctx;
}

/**
 * Record the current game as played by the active class the moment it reaches
 * its win state. Call from a game with its `gameId` and a `done` flag that
 * flips true exactly once on victory. No-op when signed out / no active class;
 * the write fires only once per mount (guarded by a ref).
 */
export function useMarkGamePlayed(gameId: string | undefined, done: boolean): void {
  const { activeClassroomId, markGameAsPlayedInClass } = useClassrooms();
  const markedRef = useRef(false);

  useEffect(() => {
    if (done && gameId && activeClassroomId && !markedRef.current) {
      markedRef.current = true;
      void markGameAsPlayedInClass(activeClassroomId, gameId);
    }
  }, [done, gameId, activeClassroomId, markGameAsPlayedInClass]);
}
