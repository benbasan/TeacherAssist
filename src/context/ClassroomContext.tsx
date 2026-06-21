import { createContext, useCallback, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useUser } from '@clerk/clerk-react';

/** A single saved class: a named roster of student names. */
export interface Classroom {
  id: string;
  name: string;
  students: string[];
}

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
}

const ClassroomContext = createContext<ClassroomContextValue | null>(null);

/**
 * Serverless cloud layer for Multi-Classroom Management.
 *
 * Classes are stored per-user in Clerk's client-writable `unsafeMetadata`, so
 * there is no backend. We derive `classrooms` directly from the live
 * `user.unsafeMetadata` (Clerk's `user` object is reactive and re-renders after
 * each `user.update`), which keeps the list from ever going stale.
 */
export function ClassroomProvider({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();

  const classrooms = useMemo<Classroom[]>(() => {
    return (user?.unsafeMetadata?.classrooms as Classroom[] | undefined) ?? [];
  }, [user?.unsafeMetadata]);

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
      const classroom: Classroom = { id: crypto.randomUUID(), name, students };
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

  const value = useMemo<ClassroomContextValue>(
    () => ({
      classrooms,
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      addClassroom,
      updateClassroom,
      removeClassroom,
    }),
    [classrooms, isLoaded, isSignedIn, addClassroom, updateClassroom, removeClassroom],
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
