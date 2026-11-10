import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Task } from './types/content';

export type TaskStatus = 'new' | 'attempted' | 'solved' | 'revealed';

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'Не розпочато',
  attempted: 'Є спроби',
  solved: 'Виконано',
  revealed: 'Переглянуто розбір',
};

export interface TaskProgress {
  status: TaskStatus;
  attempts: number;
  hintUsed: boolean;
  /** Скільки XP зараховано за завдання */
  xp: number;
}

interface ProgressData {
  tasks: Record<string, TaskProgress>;
}

const STORAGE_KEY = 'gamified-security.progress.v1';
export const XP_PER_LEVEL = 100;
const EMPTY: TaskProgress = { status: 'new', attempts: 0, hintUsed: false, xp: 0 };

const isFinal = (p: TaskProgress) => p.status === 'solved' || p.status === 'revealed';
const keyOf = (courseId: string, taskId: string) => `${courseId}/${taskId}`;

function load(): ProgressData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.tasks === 'object' && parsed.tasks) return parsed;
    }
  } catch {
    // пошкоджені дані або недоступне сховище — починаємо з нуля
  }
  return { tasks: {} };
}

interface ProgressApi {
  totalXp: number;
  level: number;
  /** XP, набрані в межах поточного рівня */
  levelXp: number;
  getTask(courseId: string, taskId: string): TaskProgress;
  /** Повертає кількість щойно нарахованих XP */
  recordAttempt(courseId: string, task: Task, correct: boolean): number;
  markHintUsed(courseId: string, taskId: string): void;
  reveal(courseId: string, taskId: string): void;
  reset(): void;
}

const ProgressContext = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ProgressData>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // сховище недоступне — прогрес живе лише до перезавантаження
    }
  }, [data]);

  const update = (courseId: string, taskId: string, fn: (p: TaskProgress) => TaskProgress) =>
    setData((d) => {
      const k = keyOf(courseId, taskId);
      return { tasks: { ...d.tasks, [k]: fn(d.tasks[k] ?? EMPTY) } };
    });

  const getTask = (courseId: string, taskId: string) => data.tasks[keyOf(courseId, taskId)] ?? EMPTY;

  const totalXp = Object.values(data.tasks).reduce((sum, p) => sum + p.xp, 0);

  const api: ProgressApi = {
    totalXp,
    level: Math.floor(totalXp / XP_PER_LEVEL) + 1,
    levelXp: totalXp % XP_PER_LEVEL,
    getTask,
    recordAttempt(courseId, task, correct) {
      const wasFinal = isFinal(getTask(courseId, task.id));
      update(courseId, task.id, (p) => {
        if (isFinal(p)) return p;
        return correct
          ? { ...p, attempts: p.attempts + 1, status: 'solved', xp: task.xp }
          : { ...p, attempts: p.attempts + 1, status: 'attempted' };
      });
      return !wasFinal && correct ? task.xp : 0;
    },
    markHintUsed(courseId, taskId) {
      update(courseId, taskId, (p) => ({ ...p, hintUsed: true }));
    },
    reveal(courseId, taskId) {
      update(courseId, taskId, (p) => (isFinal(p) ? p : { ...p, status: 'revealed' }));
    },
    reset() {
      setData({ tasks: {} });
    },
  };

  return <ProgressContext.Provider value={api}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressApi {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress поза ProgressProvider');
  return ctx;
}
