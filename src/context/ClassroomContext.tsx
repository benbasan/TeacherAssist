import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useUser } from '@clerk/clerk-react';
import type { Classroom } from '../types/game.types';

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
    // Normalize legacy classrooms that predate `playedGames`.
    return raw.map((c) => ({ ...c, playedGames: c.playedGames ?? [] }));
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
