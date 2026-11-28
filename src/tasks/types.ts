import type { ComponentType } from 'react';
import type { Task } from '../types/content';

export interface WorkspaceProps<T extends Task, A> {
  task: T;
  answer: A;
  onChange: (answer: A) => void;
  disabled: boolean;
}

/** Опис типу завдання: компонент робочої зони + функція перевірки */
export interface TaskTypeDef<T extends Task, A> {
  /** Назва типу для інтерфейсу */
  label: string;
  initialAnswer: (task: T) => A;
  /** Чи можна вже натиснути «Перевірити» */
  isAnswered: (answer: A, task: T) => boolean;
  check: (task: T, answer: A) => boolean;
  /** Необов'язкова підказка після неправильної спроби (без розкриття відповіді) */
  feedback?: (task: T, answer: A) => string | undefined;
  Workspace: ComponentType<WorkspaceProps<T, A>>;
}

export function sameSet(a: number[], b: number[]): boolean {
  const A = new Set(a);
  const B = new Set(b);
  return A.size === B.size && [...A].every((x) => B.has(x));
}

/** Детерміноване перемішування індексів 0..n-1 (зерно – id завдання), гарантовано не в початковому порядку */
export function shuffledIndices(n: number, seed: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const rnd = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (n > 1 && a.every((x, i) => x === i)) a.push(a.shift()!);
  return a;
}

export function plural(n: number, one: string, few: string, many: string) {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}
